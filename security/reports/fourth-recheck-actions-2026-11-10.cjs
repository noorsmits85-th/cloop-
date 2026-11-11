// Isolated current-module executions. No real PayOS/Auth/database operations.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
process.chdir(path.resolve(__dirname, '../..'));
function load(file, overrides) {
  const source = fs.readFileSync(file, 'utf8');
  const mocks = Object.fromEntries([...source.matchAll(/from\s+["']([^"']+)["']/g)].map(m => [m[1], {}]));
  Object.assign(mocks, {
    'server-only': {}, crypto: require('node:crypto'),
    'next/cache': { revalidatePath() {}, revalidateTag() {} },
    'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } },
    '@sentry/nextjs': { captureException() {} },
  }, overrides);
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, Date, console, process: { env: {} }, require(id) {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    throw Error(`Unmocked dependency ${id}`);
  } }, { filename: file });
  return exports;
}

async function main() {
  let balance = 0, ledgerWrites = 0, processed = null, reads = 0;
  let releaseReads;
  const bothRead = new Promise(resolve => { releaseReads = resolve; });
  let lockTail = Promise.resolve();
  const invoice = { id: 'i1', amount: 10000, status: 'CANCELLED', rentalId: 'r1', rental: { renterId: 'u1', product_id: 'p1' } };
  const db = {
    invoice: { findUnique: async () => ({ ...invoice }) },
    $transaction: async fn => {
      let unlock;
      try {
        return await fn({
          transactionHistory: {
            findUnique: async () => {
              const snapshot = processed;
              if (++reads === 2) releaseReads();
              await bothRead;
              return snapshot;
            },
            upsert: async () => { processed = { status: 'PROCESSED' }; },
          },
          $executeRaw: async () => {
            const previous = lockTail;
            lockTail = new Promise(resolve => { unlock = resolve; });
            await previous;
            return 1;
          },
          rentalHistory: { findUnique: async () => ({ id: 'r1', renterId: 'u1', product_id: 'p1', status: 'CANCELLED', isDeleted: false }) },
          product: { findUnique: async () => ({ id: 'p1', isDeleted: false }) },
          invoice: { findUnique: async () => ({ status: 'CANCELLED' }) },
          user: { update: async ({ data }) => { balance += data.walletBalance.increment; } },
          ledgerTransaction: { create: async () => { ledgerWrites++; } },
        });
      } finally { if (unlock) unlock(); }
    },
  };
  const walletMock = { getActiveWalletHoldForInvoice: async () => ({ walletHoldAmount: 0 }) };
  const hook = load('app/api/webhooks/payos/route.ts', {
    '@/src/lib/prisma': { prisma: db },
    '@/lib/payos': { payos: { webhooks: { verify: async () => ({ orderCode: 123, amount: 10000, reference: 'same-provider-reference' }) } } },
    '@/src/lib/wallet-reconciliation': walletMock,
  });
  const request = () => ({ json: async () => ({ code: '00', data: { orderCode: 123 } }) });
  const responses = await Promise.all([hook.POST(request()), hook.POST(request())]);
  assert(responses.every(r => r.status === 200));
  assert.equal(balance, 20000);
  assert.equal(ledgerWrites, 2);
  console.log('REPRODUCED: same verified late-payment event credits 20,000 for a 10,000 payment despite a product lock held to transaction end.');

  let mismatched = false, refundReached = false;
  const mixed = load('app/api/webhooks/payos/route.ts', {
    '@/src/lib/prisma': { prisma: {
      invoice: { findUnique: async () => ({ ...invoice, amount: 100000 }) },
      transactionHistory: { upsert: async ({ create }) => { mismatched = create.status === 'AMOUNT_MISMATCH'; } },
      $transaction: async () => { refundReached = true; },
    } },
    '@/lib/payos': { payos: { webhooks: { verify: async () => ({ orderCode: 124, amount: 60000, reference: 'mixed-payment' }) } } },
    // The original 40,000 wallet hold has already been refunded by checkout compensation/cancellation.
    '@/src/lib/wallet-reconciliation': walletMock,
  });
  assert.equal((await mixed.POST(request())).status, 200);
  assert.equal(mismatched, true);
  assert.equal(refundReached, false);
  console.log('REPRODUCED: cancelled 100,000 invoice with released 40,000 wallet hold rejects late 60,000 PayOS payment before refund handling.');

  const recon = load('src/lib/wallet-reconciliation.ts', {});
  const proof = await recon.computeUserWalletReconciliation('u1', {
    user: { findUnique: async () => ({ walletBalance: 10000, pendingWithdrawalBalance: 0 }) },
    rentalHistory: { findMany: async ({ where }) => {
      assert.equal(where.invoice.status, 'PAID');
      // The refunded cancelled invoice remains CANCELLED, and thus cannot match this query.
      return [];
    } },
    coinTopUp: { findMany: async () => [] },
    withdrawalRequest: { aggregate: async () => ({ _sum: { amount: 0 } }) },
    ledgerTransaction: { findMany: async () => [] },
  });
  assert.equal(proof.verifiedMaxRemainingBalance, 0);
  assert.equal(proof.isReconciled, false);
  console.log('REPRODUCED: a legitimate 10,000 late-payment wallet refund is excluded by actual reconciliation and marked unreconciled.');

  let invoiceStatus = 'PENDING', rentalStatus = 'PENDING_APPROVAL', listingStatus = 'RESERVED';
  const cron = load('app/api/cron/release-locks/route.ts', {
    '@/src/lib/cron-auth': { verifyCronRequest: () => true },
    '@/src/lib/prisma': { prisma: {
      $executeRaw: async () => 1, // standalone statement/autocommit, not a held transaction lock
      rentalHistory: {
        findMany: async ({ where }) => where.createdAt ? [{ id: 'r1', product_id: 'p1', invoice: { id: 'i1' } }] : [],
        updateMany: ({ data }) => ({ run: async () => {
          if (invoiceStatus !== 'PENDING') return { count: 0 };
          rentalStatus = data.status; return { count: 1 };
        } }),
      },
      invoice: { updateMany: ({ data }) => ({ run: async () => {
        if (invoiceStatus !== 'PENDING') return { count: 0 };
        invoiceStatus = data.status; return { count: 1 };
      } }) },
      listing: { updateMany: ({ data }) => ({ run: async () => { listingStatus = data.status; return { count: 1 }; } }) },
      $transaction: async operations => {
        // Webhook commits after the cron's paid-product query but before cancellation.
        invoiceStatus = 'PAID';
        const results = [];
        for (const operation of operations) results.push(await operation.run());
        return results;
      },
    } },
  });
  const cronResult = await cron.GET({});
  assert.equal(cronResult.body.releasedCount, 0);
  assert.equal(invoiceStatus, 'PAID');
  assert.equal(rentalStatus, 'PENDING_APPROVAL');
  assert.equal(listingStatus, 'AVAILABLE');
  console.log('REPRODUCED: cron reports zero cancelled invoices but still opens RESERVED listing of a newly paid rental.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
