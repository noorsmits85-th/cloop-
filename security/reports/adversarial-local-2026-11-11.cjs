// Read-only reproduction: actual TypeScript exports, synthetic records, no network/DB.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const crypto = require('node:crypto');

function load(file, mocks = {}, env = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, console, Buffer, URL, URLSearchParams, Headers, Request, Response,
    crypto: crypto.webcrypto, process: { env }, setTimeout, clearTimeout,
    setInterval() {},
    require(id) {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id === 'server-only') return {};
      throw Error(`Unmocked import: ${id}`);
    },
  }, { filename: file });
  return exports;
}

(async () => {
  const evidence = [];
  const bank = load('src/utils/bank-kyc.ts');
  assert.equal(bank.verifyBankKyc('NGUYEN VAN AN', 'NGUYEN VAN BINH'), true);
  evidence.push({ check: 'bank-name-two-token-collision', observed: 'Different full names accepted', reproduced: true });

  const ip = load('src/lib/request-ip.ts');
  const ipA = ip.getTrustedClientIp(new Request('https://example.invalid', { headers: { 'x-vercel-forwarded-for': '192.0.2.10', 'cf-connecting-ip': '198.51.100.10' } }));
  const ipB = ip.getTrustedClientIp(new Request('https://example.invalid', { headers: { 'cf-connecting-ip': '198.51.100.11', 'x-forwarded-for': '192.0.2.10' } }));
  assert.equal(ipA, '192.0.2.10');
  assert.equal(ipB, '198.51.100.11');
  evidence.push({ check: 'proxy-header-trust', observed: 'Unverified CF header takes precedence over x-forwarded-for when Vercel header absent', deploymentDependent: true });

  let rateCalls = 0;
  const deny = async () => { rateCalls++; return { success: false, reset: Date.now() + 60000 }; };
  const response = (status, kind) => ({ status, kind, headers: new Headers() });
  const mw = load('middleware.ts', {
    'next/server': { NextResponse: { next: () => response(200, 'next'), json: (_, options) => response(options.status, 'json'), redirect: () => response(307, 'redirect') } },
    './src/utils/supabase/middleware': { updateSession: async () => { throw Error('Unexpected auth call'); } },
    './src/lib/rate-limit': { checkEdgeRateLimit: deny, checkLocalMemoryRateLimit: deny },
    './src/lib/request-ip': ip,
    './src/lib/csrf': { verifySameOriginRequest: () => true },
  }, { NODE_ENV: 'production' });
  const req = (headers = {}) => ({ nextUrl: { pathname: '/api/pricing/suggest-tiers', search: '' }, url: 'https://example.invalid/api/pricing/suggest-tiers', method: 'GET', headers: new Headers(headers), cookies: { getAll: () => [] } });
  assert.equal((await mw.middleware(req())).status, 429);
  for (const h of [{ purpose: 'prefetch' }, { 'next-router-prefetch': '1' }]) {
    const before = rateCalls;
    assert.equal((await mw.middleware(req(h))).kind, 'next');
    assert.equal(rateCalls, before);
  }
  evidence.push({ check: 'middleware-rate-limit-prefetch', normal: 429, forgedPrefetch: 200, rateLimiterInvokedForForgedPrefetch: false });

  let query;
  const closet = load('app/actions/closet.ts', {
    '@/src/lib/prisma': { prisma: { product: {
      findMany: async (q) => { query = q; return [{ id: 'private-item', userId: 'victim', status: 'IN_CLOSET', specificAddress: 'synthetic street', latitude: 10.123456, longitude: 106.123456, images: [], listings: [{ status: 'HIDDEN', snapshot: { specificAddress: 'synthetic street' } }] }]; },
      count: async () => 1,
    } } },
    '@/src/lib/auth': { requireUser: async () => { throw Error('Unauthenticated'); } },
    'next/cache': { revalidatePath() {} },
    '@/src/utils/shipping': { maskPublicAddress: () => 'masked' },
    '@/lib/settlement-engine': {},
  });
  const leaked = await closet.getClosetProducts('victim', 1, 1000000);
  assert.equal(leaked.products[0].specificAddress, undefined);
  assert.equal(leaked.products[0].latitude, 10.123456);
  assert.equal(leaked.products[0].listings[0].snapshot.specificAddress, 'synthetic street');
  assert.equal(query.where.status, undefined);
  assert.equal(query.take, 1000000);
  evidence.push({ check: 'public-closet-private-record-projection', authRequired: false, productStatusFilter: false, hiddenListingsExcluded: false, coordinatesReturned: true, snapshotReturned: true, unboundedTake: query.take, note: 'Synthetic DB returned a record consistent with the captured query; no real user data accessed.' });

  let assuranceChecks = 0;
  const auth = load('src/lib/auth.ts', {
    react: { cache: (fn) => fn },
    'next/headers': { cookies: async () => ({ getAll: () => [{ name: 'sb-test-auth-token' }] }) },
    '@sentry/nextjs': { captureException() {} },
    '@/src/utils/supabase/server': { createClient: async () => ({ auth: {
      getUser: async () => ({ data: { user: { id: 'admin-test', email: 'admin@example.invalid', aal: 'aal1', user_metadata: {} } }, error: null }),
      mfa: { getAuthenticatorAssuranceLevel: async () => { assuranceChecks++; return { data: { currentLevel: 'aal1' } }; } },
    } }) },
    '@/src/lib/prisma': { prisma: { user: { findUnique: async () => ({ id: 'admin-test', role: 'ADMIN' }) } } },
    'next/navigation': { redirect() { throw Error('redirect'); } },
  });
  assert.equal((await auth.requireAdmin()).profile.role, 'ADMIN');
  assert.equal(assuranceChecks, 0);
  evidence.push({ check: 'admin-mfa-enforcement', validSessionWithDbAdminRoleAccepted: true, assuranceChecks, note: 'Application helper does not require MFA; external identity-provider enforcement was not tested.' });

  const guestTicket = { id: 'synthetic-guest-ticket', userId: null, customerPhone: 'synthetic-phone', customerEmail: 'guest@example.invalid' };
  const supportDb = {
    supportTicket: { findUnique: async () => guestTicket, update: async ({ data }) => Object.assign(guestTicket, data) },
    supportMessage: { findMany: async () => [{ content: 'synthetic private conversation' }], create: async ({ data }) => data },
  };
  const support = load('app/actions/support.ts', {
    '@/src/lib/prisma': { prismaAdmin: supportDb },
    '@prisma/client': { SupportTicketStatus: { OPEN: 'OPEN' }, SupportSenderType: { USER: 'USER' } },
    'next/cache': { revalidatePath() {} },
    '@/src/utils/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) },
    '@/src/lib/auth': { requireAdmin: async () => { throw Error('Unauthorized'); } },
  });
  assert.equal((await support.getTicketMessages(guestTicket.id)).messages[0].content, 'synthetic private conversation');
  assert.equal((await support.sendCustomerMessage({ ticketId: guestTicket.id, content: 'synthetic injected message' })).success, true);
  assert.equal((await support.getOrCreateSupportTicket({ ticketId: guestTicket.id })).ticket.customerEmail, 'guest@example.invalid');
  evidence.push({ check: 'guest-support-ticket-authorization', anonymousRead: true, anonymousWrite: true, anonymousTicketContactDisclosure: true, prerequisite: 'Knowledge of another guest ticket ID; no ID discovery demonstrated' });

  // Negative control: missing refund HMAC is now rejected (old finding is fixed).
  const wallet = load('src/lib/wallet-reconciliation.ts', {
    crypto, '@/src/lib/prisma': { prismaAdmin: {} },
  });
  assert.equal(wallet.verifyLatePaymentRefundEntry({ description: '[LATE_PAYMENT_REFUND] OrderCode 123 | INV:i1 | AMOUNT:10000', userId: 'u1', invoiceId: 'i1', orderCode: 123, amount: 10000 }).valid, false);
  evidence.push({ check: 'unsigned-late-refund', rejected: true });

  const output = { date: '2026-11-11', mode: 'isolated actual-code execution; all database/auth/network dependencies mocked', evidence };
  fs.writeFileSync('security/reports/adversarial-local-2026-11-11.json', JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify(output, null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; });
