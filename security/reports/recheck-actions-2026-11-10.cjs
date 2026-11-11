// Isolated execution of current application modules. No network or real database.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const path = require('node:path');
process.chdir(path.resolve(__dirname, '../..'));

function load(file, overrides = {}) {
  const source = fs.readFileSync(file, 'utf8');
  const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(m => m[1]);
  const mocks = Object.fromEntries(imports.map(id => [id, {}]));
  Object.assign(mocks, {
    '@/src/lib/auth': { requireUser: async () => ({ id: 'u1', role: 'USER', isVerified: true }) },
    'next/cache': { revalidatePath() {} },
    '@/app/actions/product': { clearShopMemoryCache: async () => {} },
    zod: require('zod'),
  }, overrides);
  const exports = {};
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, Date, console,
    process: { env: {} },
    require(id) {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      throw Error(`Unmocked dependency: ${id}`);
    },
  }, { filename: file });
  return exports;
}

async function main() {
  let transactions = 0;
  const ordinary = load('app/actions/boost.ts', {
    '@/src/lib/prisma': { prisma: {
      coinTopUp: { findUnique: async () => ({ userId: 'u1', packageCode: 'PACK_10K', rawPayload: null }) },
      $transaction: async () => { transactions++; },
    } },
  });
  assert.equal((await ordinary.checkBoostPaymentStatusAction(123)).status, 'INVALID_FLOW');
  assert.equal(transactions, 0);
  console.log('PASS: original reverse-flow exploit is now rejected by actual boost action.');

  const metadata = {};
  const user = { name: 'TRAN THI BINH', isVerified: true };
  const identityDb = {
    user: {
      findUnique: async () => ({ ...user }),
      update: async ({ data }) => Object.assign(user, data),
    },
    $queryRawUnsafe: async () => [{ raw_user_meta_data: { ...metadata } }],
    $executeRawUnsafe: async (_sql, payload) => { Object.assign(metadata, JSON.parse(payload)); return 1; },
  };
  const identityMocks = {
    '@/src/lib/prisma': { prisma: identityDb },
    '@/src/utils/supabase/server': { createClient: async () => ({ auth: { updateUser: async () => ({}) } }) },
  };
  const settings = load('app/actions/user.ts', identityMocks);
  assert.equal((await settings.updateUserSettingsAction({ bank_owner: 'LE VAN CUONG' })).success, true);
  const withdrawal = load('app/actions/withdrawal.ts', identityMocks);
  const bank = await withdrawal.saveUserBankInfoAction({
    bankName: 'TEST BANK', bankAccountNumber: '123456789', bankAccountHolder: 'LE VAN CUONG',
  });
  assert.equal(bank.success, true);
  assert.equal(user.name, 'TRAN THI BINH');
  assert.equal(metadata.verified_legal_name, 'LE VAN CUONG');
  console.log('REPRODUCED: settings bank_owner overrides different frozen profile name and becomes verified_legal_name.');

  const closet = load('app/actions/closet.ts', identityMocks);
  const address = await closet.saveUnifiedUserAddressAction({
    name: 'NGUYEN VAN AN', provinceId: 1, districtId: 2, wardCode: '3',
    province: 'TEST', district: 'TEST', ward: 'TEST', specificAddress: 'TEST',
  });
  assert.equal(address.success, true);
  assert.equal(user.name, 'NGUYEN VAN AN');
  assert.equal(user.isVerified, true);
  console.log('REPRODUCED: actual address action changes verified user name.');

  let writes = 0;
  const stateDb = {
    rentalHistory: { findUnique: async () => ({
      id: 'r1', ownerId: 'u1', renterId: 'renter', status: 'PENDING_APPROVAL',
      product: { userId: 'u1' }, invoice: { status: 'PAID' },
    }) },
    $transaction: async fn => fn({
      rentalHistory: { updateMany: async ({ where, data }) => {
        assert.equal(where.status, 'PENDING_APPROVAL');
        assert.equal(data.status, 'OWNER_PACKED');
        writes++;
        return { count: 1 };
      } },
      auditLog: { create: async () => { writes++; } },
    }),
  };
  const transitions = load('app/actions/closet.ts', { '@/src/lib/prisma': { prisma: stateDb } });
  assert.equal((await transitions.advanceMobileOrderStatusAction({ orderId: 'r1', action: 'HANDOVER_SHIPPER' })).success, false);
  assert.equal(writes, 0);
  assert.equal((await transitions.advanceMobileOrderStatusAction({ orderId: 'r1', action: 'APPROVE_ORDER' })).success, true);
  assert.equal(writes, 2);
  console.log('PASS: actual mobile action rejects skipped handover and atomically approves initial state with audit write.');

  const originalExpiry = new Date(Date.now() + 86400000);
  let expiry = originalExpiry;
  let reads = 0;
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  const paidOrders = new Set();
  const boostDb = {
    coinTopUp: { findUnique: async ({ where }) => ({
      id: String(where.orderCode), userId: 'u1', packageCode: 'BOOST_24H',
      status: 'PENDING', amountVnd: 10000, totalCoins: 20,
      rawPayload: { type: 'PRODUCT_BOOST', productId: 'p1', hours: 24, coins: 20 },
      user: { cloopCoins: 0 },
    }) },
    $transaction: async fn => fn({
      product: {
        findUnique: async () => {
          const snapshot = new Date(expiry);
          if (++reads === 2) release();
          await barrier;
          return { id: 'p1', userId: 'u1', isDeleted: false, title: 'Test', boostExpiresAt: snapshot };
        },
        update: async ({ data }) => { expiry = data.boostExpiresAt; return { boostScore: 40 }; },
      },
      coinTopUp: { updateMany: async ({ where }) => { paidOrders.add(where.id); return { count: 1 }; } },
      listing: { updateMany: async () => ({ count: 0 }) },
      coinLedgerEntry: { create: async () => ({}) },
    }),
  };
  const boosts = load('app/actions/boost.ts', {
    '@/src/lib/prisma': { prisma: boostDb },
    '@/lib/payos': { payos: { paymentRequests: { get: async () => ({ status: 'PAID', amountPaid: 10000 }) } } },
  });
  const results = await Promise.all([
    boosts.checkBoostPaymentStatusAction(101), boosts.checkBoostPaymentStatusAction(102),
  ]);
  assert(results.every(r => r.success && r.status === 'PAID'));
  assert.equal(paidOrders.size, 2);
  assert.equal(expiry.getTime() - originalExpiry.getTime(), 24 * 3600000);
  console.log('REPRODUCED (controlled interleaving): two different paid QR orders extend expiry by only 24h instead of 48h.');

  const booking = load('app/actions/booking.ts', {
    '@/src/utils/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } }) },
    'next-axiom': { Logger: class { info() {} } },
    '@/src/lib/prisma': { prisma: {
      product: { findUnique: async () => ({ id: 'p1', userId: 'owner', status: 'ON_MARKET', isDeleted: false,
        listings: [{ id: 'l1', listingType: 'RENT', status: 'RESERVED', isDeleted: false }] }) },
      user: { findUnique: async () => ({ name: 'Test' }) },
    } },
  });
  const retry = await booking.createBooking({ productId: 'p1', isRental: true });
  assert.equal(retry.success, false);
  console.log('REPRODUCED: normal RESERVED booking retry is rejected before existing pending-order recovery can run.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
