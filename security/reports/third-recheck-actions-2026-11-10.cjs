// Source-module checks with isolated dependencies; no real database/Auth/PayOS.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
process.chdir(path.resolve(__dirname, '../..'));
function load(file, overrides = {}) {
  const source = fs.readFileSync(file, 'utf8');
  const mocks = Object.fromEntries([...source.matchAll(/from\s+["']([^"']+)["']/g)].map(m => [m[1], {}]));
  Object.assign(mocks, {
    'next/cache': { revalidatePath() {} },
    '@/src/lib/auth': { requireUser: async () => ({ id: 'u1', isVerified: true, role: 'USER' }) },
    'next/server': { NextResponse: { json: (body, options) => ({ body, ...options }), redirect: url => ({ url }) } },
    zod: require('zod'),
  }, overrides);
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    exports, Date, URL, console, process: { env: {} },
    require(id) {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      throw Error(`Unmocked dependency: ${id}`);
    },
  }, { filename: file });
  return exports;
}
async function main() {
  const profile = { id: 'u1', name: 'TRAN THI BINH', isVerified: true };
  const db = {
    user: {
      upsert: async ({ update }) => Object.assign(profile, update),
      findUnique: async () => ({ ...profile }),
    },
    withdrawalRequest: { findFirst: async () => null },
    $executeRawUnsafe: async () => 1,
  };
  const auth = load('app/auth/callback/route.ts', {
    '@/src/lib/prisma': { prisma: db },
    '@/src/utils/supabase/server': { createClient: async () => ({ auth: {
      exchangeCodeForSession: async () => ({ data: { user: {
        id: 'u1', email: 'test@example.invalid', user_metadata: { name: 'LE VAN CUONG' },
      } }, error: null }),
    } }) },
  });
  await auth.GET({ url: 'http://localhost/auth/callback?code=mock-valid-code' });
  assert.equal(profile.isVerified, true);
  assert.equal(profile.name, 'LE VAN CUONG');
  const bank = load('app/actions/withdrawal.ts', {
    '@/src/lib/prisma': { prisma: db },
    '@/src/utils/bank-kyc': load('src/utils/bank-kyc.ts'),
  });
  const linked = await bank.saveUserBankInfoAction({
    bankName: 'TEST BANK', bankAccountNumber: '123456789', bankAccountHolder: 'LE VAN CUONG',
  });
  assert.equal(linked.success, true);
  console.log('REPRODUCED: actual Auth callback overwrites verified User.name from metadata; actual bank action accepts substituted holder for first linkage.');

  let rentalStatus = 'PENDING_APPROVAL';
  let invoiceStatus = 'PENDING';
  const cronDb = {
    rentalHistory: {
      findMany: async ({ where }) => {
        if (where.createdAt) return [{ id: 'r1', product_id: 'p1', invoice: { id: 'i1' } }];
        // Simulate successful provider webhook committing after cron selected expired rows.
        invoiceStatus = 'PAID';
        return [{ product_id: 'p1' }];
      },
      updateMany: async ({ where, data }) => {
        assert(!where.status, 'Reproduction depends on missing current-status predicate');
        rentalStatus = data.status;
        return { count: 1 };
      },
    },
    invoice: { updateMany: async ({ where, data }) => {
      assert(!where.status, 'Reproduction depends on missing PENDING predicate');
      assert.equal(invoiceStatus, 'PAID');
      invoiceStatus = data.status;
      return { count: 1 };
    } },
    listing: { updateMany: async () => ({ count: 0 }) },
    $transaction: async operations => Promise.all(operations),
  };
  const cron = load('app/api/cron/release-locks/route.ts', {
    '@/src/lib/prisma': { prisma: cronDb },
    '@/src/lib/cron-auth': { verifyCronRequest: () => true },
  });
  const result = await cron.GET({});
  assert.equal(result.status, undefined); // default 200 in the real NextResponse.json
  assert.equal(result.body.success, true);
  assert.equal(invoiceStatus, 'CANCELLED');
  assert.equal(rentalStatus, 'CANCELLED');
  console.log('REPRODUCED: actual authorized expiry cron cancels an invoice that became PAID after its initial read, even when the paid-product guard sees it.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
