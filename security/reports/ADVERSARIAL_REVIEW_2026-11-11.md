# CLOOP adversarial security review

Date: 2026-11-11 (Asia/Saigon). Scope: current working tree and read-only HTTP requests to the user-provided https://cloop-sable.vercel.app/. Review requested by owner; direct-analysis waiver granted. Skill: `.agents/skills/vibe-check/SKILL.md`.

## Result and evidence quality

Eight finding groups remain, including dependency advisories requiring applicability triage. No wallet theft, account takeover, database dump, or complete exploit chain was demonstrated. Five groups were reproduced with actual TypeScript exports in an isolated VM and synthetic database/auth responses; one is directly observable in client code; one is confirmed on the deployment; dependency metadata comes from npm's advisory service. The harness is deliberately offline and fails on unmocked imports. It proves local code behavior, not that the same code is deployed or that unknown IDs can be discovered.

- Reproduce local cases: `node security/reports/adversarial-local-2026-11-11.cjs`.
- Local evidence: `adversarial-local-2026-11-11.json`.
- HTTP evidence: `adversarial-http-2026-11-11.json`; 10 GET requests, no bodies retained, no authentication or state changes. Initial sandbox network failure was resolved using authorized network execution.
- Existing isolated suite: **80/82 pass**, exit 1. Action 17 and Action 18 fail because video evidence fixtures lack the revision/generation/checksum integrity anchor; Action 18 observes 500 instead of 200. These failures are not proof of an authorization bypass and must not be repaired by weakening the seal contract.
- `tsc --noEmit --incremental false`: exit 0.

## F1 — HIGH: public closet action returns hidden records and excessive fields

`app/actions/closet.ts:473-500`: exported Server Action `getClosetProducts(userId, page, take)` requires no authenticated user. Its filter is only `{ userId, isDeleted: false }`, includes all `listings`, and removes only the top-level `specificAddress` from each returned record.

Reproduction: an anonymous caller targeting a different synthetic owner receives a product with `status: IN_CLOSET`, a HIDDEN listing, latitude/longitude, and arbitrary listing snapshot content. The query accepts `take: 1000000` unchanged. The mock returned a record that satisfies the captured query; no real private product was retrieved. Snapshot address disclosure depends on whether a real snapshot contains an address; precise coordinates are disclosed when populated.

Impact: knowledge of a public owner ID can expose unpublished closet items and location data. Unbounded pagination enables costly reads. Existing auth/RLS on unrelated APIs does not protect this privileged server query.

Fix: define an explicit public DTO with `select`, exclude coordinates and snapshots, filter publishable products and visible non-deleted listings, clamp integer pagination. Put owner-only reads behind `requireUser()` with owner ID from session. Verify with two synthetic users and hidden/deleted/visible records.

## F2 — HIGH: guest support ticket access has no independent ownership proof

`app/actions/support.ts:131-163,216-318`: `getTicketMessages` and `sendCustomerMessage` only reject an unauthorized caller when `ticket.userId` is non-null. `getOrCreateSupportTicket` accepts any existing guest ticket and can return contact fields or attach it to the caller's account.

Reproduction: unauthenticated synthetic user, guest ticket ID known, reads messages, injects a message, and receives `customerEmail` from the ticket. No guest session secret is checked. No ticket ID enumeration or discovery was demonstrated; high-entropy IDs reduce guessing but do not bind access to a guest session. The application currently treats the ticket ID itself as a bearer capability.

Impact: a leaked guest ticket ID permits conversation disclosure and impersonation; authenticated callers may claim a guest ticket. Account-bound tickets do have ownership checks.

Fix: require authenticated ownership or an independent random guest credential stored hashed server-side and carried in a protected cookie, and require that credential for read, write, resume, and claim. Never return contact fields to a caller without ownership proof. Bound message size and apply durable per-principal limits. Test guest A/guest B and account A/account B isolation.

## F3 — HIGH: claimed bank identity check accepts different people

`src/utils/bank-kyc.ts:14-32`; called by `app/actions/withdrawal.ts` for saving bank details and requesting withdrawal. `app/actions/user.ts` also implements a similar two-token rule.

Reproduction: `verifyBankKyc('NGUYEN VAN AN', 'NGUYEN VAN BINH')` returns true. The bank account number and holder string are client inputs; the comparison alone does not establish that a bank reports that name for that account number. Micro-KYC in `app/actions/kyc-verification.ts` marks `isVerified` after a paid 2,000 VND order without establishing a provider-attested legal-name/account binding in that path.

Impact: the beneficiary-name guard is weaker than its stated purpose, including its immutable original-beneficiary check. A valid session and spendable funds are still required; no withdrawal or theft was performed. Severity reflects its use as a financial fraud control, not an unauthenticated money exploit.

Fix: separate phone/payment confirmation from legal-identity verification. Use a trusted beneficiary verification service and persist the attested account/name binding server-side. Reject different complete normalized names; exact string matching is only an interim check and still does not prove account ownership. Require recent reauthentication for beneficiary changes and withdrawals.

## F4 — HIGH: admin authorization does not enforce MFA

`src/lib/auth.ts:182-213`: both admin guards verify DB role, but do not verify authentication assurance level, second-factor completion, or admin-specific session age. Search of app/src/lib found no MFA assurance check.

Reproduction: valid mocked identity session and DB ADMIN role are accepted by `requireAdmin`; the available mocked MFA assurance API is never called. Unauthenticated callers and ordinary USER roles are not thereby promoted. Identity-provider-side mandatory MFA is unverified.

Impact: absent external enforcement, a stolen first-factor admin session gets administrative authority, including financial operations.

Fix: require verified AAL2 in both guard paths, recent step-up for money/role mutations, shorter admin sessions, and durable audit records. Test AAL1 ADMIN denied, AAL2 USER denied, recent AAL2 ADMIN allowed.

## F5 — MEDIUM: spoofable prefetch headers skip middleware rate limiting

`middleware.ts:85-87,117`: any request with `purpose: prefetch` or `next-router-prefetch: 1` skips the global limiter, including API requests and state-changing requests. Reproduction uses a limiter configured to deny: normal request returns 429; each spoofed header forwards without consulting the limiter. Mock forwarding status 200 means middleware continuation, not proof that a real handler succeeded.

Scope: this does not bypass session verification, CSRF, or endpoint-specific per-user limits such as checkout's own limiter. It affects routes relying solely on the global limiter.

Additional deployment-dependent concern: `src/lib/request-ip.ts` accepts several proxy headers without a trusted-ingress policy. Whether an attacker controls them depends on the host stripping/overwriting them. Redis failure/unconfigured mode falls back to per-process memory, so limits are not global across serverless instances. Login actions separately derive their key from the first X-Forwarded-For value.

Fix: never exempt sensitive requests based solely on client-controlled prefetch headers; limit at the handler by authenticated principal, use a durable distributed store, and use only headers guaranteed by the configured trusted ingress. Verify on staging behind the actual proxy.

## F6 — MEDIUM: contact and bank data persisted in localStorage

`app/app/MobileAppClient.tsx` stores `cloop_saved_bank_info` containing bank name/account/holder and multiple address/phone caches. `app/(storefront)/checkout/[productId]/CheckoutClient.tsx` persists recipient address history. These writes violate the project's explicit sensitive-localStorage rule.

Impact: same-origin scripts and a later user of a shared browser can read persistent personal data. This is not proof of an existing XSS or server authorization bypass. Supabase browser auth cookies are also JavaScript-accessible by design in the current browser-client architecture; migrating to HttpOnly sessions requires an authentication architecture decision, not merely toggling a flag.

Fix: persist sensitive preferences on the authenticated server; remove existing sensitive browser keys on migration and logout. Keep only non-sensitive UI preferences client-side. Do not use cached display identity as authorization.

## F7 — MEDIUM: deployed CSP and framing controls remain permissive

HTTP GET `/` returned 200 with `script-src 'unsafe-inline' 'unsafe-eval'`, broad `https:`/`wss:` sources, `frame-ancestors *`, and no X-Frame-Options. Same pattern appears on checked API and protected-page redirect responses. This differs from the stricter current `middleware.ts`/`next.config.ts`. Deployment/source mismatch is observed; its cause and deployed commit are not established.

Impact: framing is allowed and CSP offers weak protection if an injection bug exists. No XSS or successful clickjacking transaction was demonstrated.

Positive HTTP checks: `/.env`, `/.git/config`, `/backup.sql`, `/api-docs` return 404; storage dispatcher and evidence-stream return 401 without auth; admin/wallet return 307 to login. No wildcard/reflected CORS observed for the single tested hostile Origin. HSTS, nosniff, Referrer-Policy and Permissions-Policy are present on these responses. These checks do not prove absence of secrets, IDOR, or CORS problems elsewhere.

Fix: deploy the reviewed nonce CSP and deny framing; confirm actual document, API, error, redirect and static-asset responses. Test core flows for CSP violations before enforcing. No deployment was performed.

## F8 — HIGH remediation priority: vulnerable dependency versions, including vendor CRITICAL advisories

Network-enabled `npm audit --json --cache ./scratch/npm-audit-cache` completed, exit 1 (advisories found). Full response is retained in `npm-audit-2026-11-11.json`. npm reports **32 affected package entries: 2 critical, 14 high, 15 moderate, 1 low**. Counts include transitive effects; they are not 32 independently demonstrated exploits or necessarily 32 unique advisories.

Installed direct packages include Next 16.2.9 and @sentry/nextjs 10.70.0; npm flags both package entries CRITICAL. The response recommends Next 16.4.6 for the current aggregated set; review official release/migration notes and the installed Next guides before upgrading. Other flagged packages include zod, cloudinary/next-cloudinary, Prisma tooling and transitive build dependencies. Some proposed fixes are major upgrades; do not run a force fix blindly.

Applicability matters: Sentry's reported middleware-bypass advisory [GHSA-mchm-gjx6-7h55](https://github.com/advisories/GHSA-mchm-gjx6-7h55) is explicitly about tunnel routes; no `tunnelRoute` setting was found. Next's critical image optimizer advisories are conditional on the affected image processing path; this app config has `images.unoptimized: true`. No `next/og`, `ImageResponse` or `use cache` usage was found in app/src/lib searches for other named critical advisory prerequisites. These observations narrow risk but do not replace framework/provider verification. Server Actions are widely used, so the separately reported Server Actions DoS advisories deserve priority. No remote-code-execution or DoS attempt was made.

Fix: update supported patched versions and lockfile together after compatibility review, triage production and build-only reachability, run audit/build/type/tests, and redeploy then verify actual deployed versions. A clean audit would not close the application findings above.

## Wallet concurrency concern — not yet confirmed against PostgreSQL

`app/actions/withdrawal.ts:338-373`: pending-request count and daily aggregate occur before the conditional wallet decrement without a per-user serialization lock or visible partial unique pending-request constraint in `prisma/schema.prisma`. Two Read Committed transactions may both see no pending request before serializing on the later balance update. Atomic decrement still protects against a negative balance, but not necessarily the one-pending rule or daily cap. Also `computeUserWalletReconciliation(userId)` inside the transaction omits `tx`, so the stated in-transaction reconciliation uses the default client rather than the transaction client.

Do not count this as a proven money-loss exploit. Verify with two concurrent withdrawal calls against a disposable PostgreSQL database with sufficient synthetic balance. Check lifecycle statuses included in the daily aggregate. Fix by serializing on the user row before eligibility reads, using `tx` throughout, and enforcing DB invariants/idempotency with non-destructive migrations where needed.

## Controls that held in isolated tests

Existing Action 15 passes forged PayOS signature rejection, cross-user order advance rejection, and product balance/role mass-assignment protection. Action 11 passes duplicate late-webhook handling. Action 12 passes required refund HMAC plus provider receipt and duplicate rejection. The fresh harness rejects the previously reported unsigned late refund. These are mocked behavior tests, not provider/PostgreSQL integration proof.

## Coverage and limits

This is a focused adversarial recheck, not a replacement claim that all 17 categories are complete. Historical category reports remain separate. Current RLS/storage deployment was not queried; previous metadata artifacts were read only as historical context. No credential rotation was verified. No source-map crawl, full git-history secret scan, authenticated two-account live IDOR test, SSRF network test, file-provider integration, SQL injection exploit, or production concurrency test was conducted. No app, database, payment, permission or deployment settings were changed.

Python/py are inaccessible application aliases, so the skill's full Python scanner could not execute; the checked HTTP subset is explicitly smaller. Gitleaks and Semgrep are not installed (optional install commands for a developer: `winget install Gitleaks.Gitleaks`; `pip install semgrep`). No tools were installed. Initial npm audit could not reach its advisory endpoint; the network-enabled retry succeeded and its findings are recorded in F8. Direct advisory-page browsing was unavailable; advisory titles/ranges/links above are from the saved npm response and their exploit prerequisites were not independently reviewed against the full advisory text.
