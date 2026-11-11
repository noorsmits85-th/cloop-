// Actual application exports, synthetic records, no network or database access.
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
function load(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, console, Buffer, URL, Headers, Date, process: { env: {} },
    require(id) {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      throw Error(`Unmocked dependency: ${id}`);
    },
  }, { filename: file });
  return exports;
}
(async () => {
  const evidence = [];
  const shipping = load('src/utils/shipping.ts', { crypto });
  const street = '123 Synthetic Street Hanoi';
  assert.equal(shipping.maskPublicAddress(street), street);
  evidence.push({ check: 'single-component-address', privateAddressReturnedUnchanged: true });

  const hiddenOrder = shipping.maskOrderPii({ status: 'PENDING_APPROVAL', invoice: { status: 'PENDING' }, owner_phone: '0900000000', shipments: [{ pickupAddress: { phone: '0900000000', specificAddress: street, fullAddress: 'synthetic-full-address' }, providerRawPayload: { senderPhone: '0900000000', senderAddress: street } }] });
  assert.notEqual(hiddenOrder.owner_phone, '0900000000');
  assert.equal(hiddenOrder.shipments[0].providerRawPayload.senderPhone, '0900000000');
  assert.equal(hiddenOrder.shipments[0].pickupAddress.fullAddress, 'synthetic-full-address');
  evidence.push({ check: 'pending-order-mask', topLevelPhoneMasked: true, providerPayloadPhoneRetained: true, pickupFullAddressAliasRetained: true, note: 'Actual disclosure depends on which keys provider payloads contain.' });
  assert.equal(shipping.maskOrderPii({ status: 'OWNER_PACKED', invoice: { status: 'PENDING' }, owner_phone: '0900000000' }).owner_phone, '0900000000');
  evidence.push({ check: 'active-order-mask', invoicePaymentNotRequiredByMask: true, note: 'Does not demonstrate an attacker can transition an unpaid order into OWNER_PACKED.' });

  const contact = 'Lien he Zalo 0900000000 hoac seller@example.invalid de thue ngoai';
  let storedPost;
  const blog = load('app/actions/blog.ts', {
    '@/src/lib/prisma': { prisma: { blogPost: {
      create: async ({ data }) => { storedPost = { id: 'post-test', createdAt: new Date(), ...data }; return storedPost; },
      findMany: async () => [storedPost],
    } } },
    '@/src/lib/auth': { requireUser: async () => ({ id: 'owner-test' }) },
    'next/cache': { revalidatePath() {} },
  });
  assert.equal((await blog.createBlogPostAction({ title: contact, content: contact, coverImage: 'https://example.invalid/synthetic.jpg' })).success, true);
  assert.equal((await blog.getPublicBlogFeedAction()).posts[0].content, contact);
  evidence.push({ check: 'blog-contact-round-trip', storedAsPublic: storedPost.status === 'PUBLIC', contactReturnedInPublicFeed: true });

  let storedReview;
  const txReview = {
    review: { findFirst: async () => null, create: async ({ data }) => { storedReview = data; return { id: 'review-test' }; } },
    user: { update: async () => ({ cloopCoins: 50 }) },
    coinLedgerEntry: { create: async () => ({}) },
  };
  const review = load('app/actions/review.ts', {
    '@/src/lib/prisma': { prisma: {
      rentalHistory: { findFirst: async () => ({ id: 'r-test', ownerId: 'owner-test', product: { title: 'synthetic dress' }, reviews: [] }) },
      $transaction: async (fn) => fn(txReview),
    } },
    '@/src/lib/auth': { requireUser: async () => ({ id: 'renter-test' }) },
    '@/src/lib/product-service': { clearProductDetailCache() {} },
    'next/cache': { revalidatePath() {} },
  });
  const reviewResult = await review.submitVerifiedProductReviewAction({ productId: 'p-test', rating: 5, comment: contact });
  assert.equal(storedReview.comment, contact);
  assert.equal(storedReview.isPublished, true);
  evidence.push({ check: 'review-contact-publication', contactStored: true, isPublished: true, actionSuccess: reviewResult.success });

  let queryIndex = 0;
  const order = (status, paid = true) => ({ id: 'r-test', status, invoice: { status: paid ? 'PAID' : 'PENDING' }, renter_phone: '0900000001', owner_phone: '0900000000', product: { images: [], province: 'Hanoi' } });
  const mobile = load('app/actions/closet.ts', {
    '@/src/lib/prisma': { prisma: {
      user: { findUnique: async () => ({ id: 'renter-test', name: 'Synthetic User' }) },
      product: { findMany: async () => [] },
      rentalHistory: { findMany: async () => (++queryIndex % 2 === 1 ? [] : [order('PENDING_APPROVAL', false), order('PENDING_APPROVAL'), order('LENDER_COMPLETED'), order('DISPUTE'), order('CANCELLED')]) },
      $queryRawUnsafe: async () => [], withdrawalRequest: { findMany: async () => [] },
    } },
    '@/src/lib/auth': { requireUser: async () => ({ id: 'renter-test' }) },
    'next/cache': { revalidatePath() {} },
    '@/src/utils/shipping': shipping, '@/lib/settlement-engine': {},
  });
  const mobileData = await mobile.getMyClosetMobileDataAction();
  assert.equal(mobileData.success, true);
  const rows = mobileData.ordersAsRenter;
  assert.notEqual(rows[0].ownerPhone, '0900000000');
  assert.equal(rows[1].ownerPhone, '0900000000');
  assert.equal(rows[2].ownerPhone, '0900000000');
  assert.equal(rows[3].ownerPhone, '0900000000');
  assert.notEqual(rows[4].ownerPhone, '0900000000');
  evidence.push({ check: 'mobile-counterparty-phone', unpaidHidden: true, paidPendingRevealed: true, completedRevealed: true, disputedRevealed: true, cancelledHidden: true });

  const output = { date: '2026-11-11', mode: 'offline actual-code execution with synthetic data; no live writes', evidence };
  fs.writeFileSync('security/reports/off-platform-local-2026-11-11.json', JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify(output, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; });
