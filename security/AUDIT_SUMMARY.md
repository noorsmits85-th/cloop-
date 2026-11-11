# Security Audit Summary

## Latest focused recheck — 2026-11-11

Owner-authorized direct adversarial review: [report](reports/ADVERSARIAL_REVIEW_2026-11-11.md), [plan](plans/ADVERSARIAL_REVIEW_2026-11-11_PLAN.md), [isolated evidence](reports/adversarial-local-2026-11-11.json), [live read-only evidence](reports/adversarial-http-2026-11-11.json).

Unresolved: public closet hidden-record/coordinate projection, guest-ticket authorization, weak beneficiary-name verification, missing application MFA requirement, spoofable middleware rate-limit exemption, sensitive localStorage persistence, and deployed permissive CSP/framing. The first four are rated HIGH in this focused report; remaining three MEDIUM. Dependency review adds an eighth group with HIGH remediation priority: [npm audit evidence](reports/npm-audit-2026-11-11.json) reports 32 affected package entries (2 critical/14 high/15 moderate/1 low); conditional exploitability is not demonstrated. No money theft or complete account compromise was demonstrated. Existing isolated suite is 80/82; TypeScript passes. Live probe used 10 read-only GETs. Current database/provider integration and the full 17-category scope were not revalidated. Historical claims below must not be read as current deployment clearance.

Date: 2026-11-05
Target Workspace: `c:\Users\Yoga gen 3\Downloads\CLOOP_Techfest\cloop-app`
Live Target URL: `https://cloop-sable.vercel.app`
Audit Framework: `vibe-check` (`AI-CHECKLIST.md` — 17 Categories + `scripts/check.py` Live HTTP Scanner + `npm audit`)

## Live HTTP Scan Results (`https://cloop-sable.vercel.app`)

Command executed:
```bash
python .agents/skills/vibe-check/scripts/check.py https://cloop-sable.vercel.app --json
```
- **Total HTTP Requests Sent**: `80`
- **Overall Live Scan Summary**: `14 PASS`, `1 INFO`, `1 WARN`, `5 FAIL`
- **Live Categories Passing**:
  - `SECRETS_EXPOSURE`: PASS (20 sensitive paths + 12 directory listing checks returned 404/non-sensitive responses on the currently deployed commit)
  - `FRONTEND_SECRETS`: PASS (15 script `.map` checks returned 404; no leaked `sk_live_`/`service_role` tokens in live HTML/JS bundles)
  - `CORS`: PASS (malicious `Origin: https://evil-vibe-check.example` not reflected; no `Access-Control-Allow-Origin: *` with credentials)
  - `ERROR_HANDLING`: PASS (no stack traces or framework debug pages leaked on 404/malformed query probes)
- **Live Findings Flagged on `https://cloop-sable.vercel.app` (All in Category 8 — `SECURITY_HEADERS`)**:
  1. `FAIL`: `CSP does not stop injected scripts (script-src)` (`'unsafe-eval'`, `'unsafe-inline'`, no nonce/hash)
  2. `FAIL`: `CSP form-action is missing or allows any origin` (`https://*.payos.vn` wildcard)
  3. `FAIL`: `CSP frame-ancestors is missing` (`frame-ancestors *`)
  4. `FAIL`: `CSP leaves these unrestricted: connect-src, frame-src, img-src, media-src` (bare `https:`, `wss:`, `https://*.payos.vn`)
  5. `FAIL`: `No clickjacking protection` (`X-Frame-Options` missing and `frame-ancestors *`)
  6. `WARN`: `Static files are missing headers: X-Content-Type-Options: nosniff, Strict-Transport-Security` (on `/_next/static/chunks/*.js`)

*(All 5 FAILs and 1 WARN above have been remediated in the local codebase across `middleware.ts`, `next.config.ts`, `vercel.json`, and `app/layout.tsx`, and will turn PASS once deployed to Vercel.)*

## Results Across All 17 Categories

| # | Category | Initial Status | Remediation Status | Report | Plan |
|---|----------|----------------|--------------------|--------|------|
| 1 | SECRETS_EXPOSURE | CRITICAL | REMEDIATED IN CODE (Pending Key Rotation) | [report](reports/SECRETS_EXPOSURE_REPORT.md) | [plan](plans/SECRETS_EXPOSURE_PLAN.md) |
| 2 | DATABASE_ACCESS | CRITICAL | REMEDIATED IN CODE (Pending SQL Execution) | [report](reports/DATABASE_ACCESS_REPORT.md) | [plan](plans/DATABASE_ACCESS_PLAN.md) |
| 3 | AUTH_MIDDLEWARE | CRITICAL | REMEDIATED IN CODE | [report](reports/AUTH_MIDDLEWARE_REPORT.md) | [plan](plans/AUTH_MIDDLEWARE_PLAN.md) |
| 4 | ACCESS_CONTROL | CRITICAL | REMEDIATED IN CODE | [report](reports/ACCESS_CONTROL_REPORT.md) | [plan](plans/ACCESS_CONTROL_PLAN.md) |
| 5 | FRONTEND_SECRETS | CRITICAL | REMEDIATED IN CODE | [report](reports/FRONTEND_SECRETS_REPORT.md) | [plan](plans/FRONTEND_SECRETS_PLAN.md) |
| 6 | SSRF | CRITICAL | REMEDIATED IN CODE | [report](reports/SSRF_REPORT.md) | [plan](plans/SSRF_PLAN.md) |
| 7 | CSRF | HIGH | REMEDIATED IN CODE | [report](reports/CSRF_REPORT.md) | [plan](plans/CSRF_PLAN.md) |
| 8 | SECURITY_HEADERS | HIGH | REMEDIATED IN CODE (Pending Vercel Deploy) | [report](reports/SECURITY_HEADERS_REPORT.md) | [plan](plans/SECURITY_HEADERS_PLAN.md) |
| 9 | CORS | HIGH | REMEDIATED IN CODE | [report](reports/CORS_REPORT.md) | [plan](plans/CORS_PLAN.md) |
| 10 | RATE_LIMITING | HIGH | REMEDIATED IN CODE | [report](reports/RATE_LIMITING_REPORT.md) | [plan](plans/RATE_LIMITING_PLAN.md) |
| 11 | SQL_INJECTION | HIGH | REMEDIATED IN CODE | [report](reports/SQL_INJECTION_REPORT.md) | [plan](plans/SQL_INJECTION_PLAN.md) |
| 12 | XSS | HIGH | REMEDIATED IN CODE | [report](reports/XSS_REPORT.md) | [plan](plans/XSS_PLAN.md) |
| 13 | PAYMENT_WEBHOOKS | CRITICAL | REMEDIATED IN CODE | [report](reports/PAYMENT_WEBHOOKS_REPORT.md) | [plan](plans/PAYMENT_WEBHOOKS_PLAN.md) |
| 14 | FILE_UPLOADS | CRITICAL | REMEDIATED IN CODE | [report](reports/FILE_UPLOADS_REPORT.md) | [plan](plans/FILE_UPLOADS_PLAN.md) |
| 15 | ERROR_HANDLING | CRITICAL | REMEDIATED IN CODE | [report](reports/ERROR_HANDLING_REPORT.md) | [plan](plans/ERROR_HANDLING_PLAN.md) |
| 16 | PASSWORD_HASHING | CRITICAL | REMEDIATED IN CODE (Pending SQL Migration) | [report](reports/PASSWORD_HASHING_REPORT.md) | [plan](plans/PASSWORD_HASHING_PLAN.md) |
| 17 | DEPENDENCIES | CRITICAL | REMEDIATED IN CODE | [report](reports/DEPENDENCIES_REPORT.md) | [plan](plans/DEPENDENCIES_PLAN.md) |

## Summary of Codebase Remediations Applied

1. **Workspace Manifests Restored & Static `public/` Leaks Purged (`SECRETS_EXPOSURE`, `FRONTEND_SECRETS`, `DEPENDENCIES`)**:
   - Restored `.gitignore`, `package.json`, `package-lock.json`, and `vercel.json` to CLOOP's baseline and hardened them (`.env*` ignore rules, `productionBrowserSourceMaps: false`, `poweredByHeader: false`, dependency `overrides` for `next`, `postcss`, `sharp`, `zod`, and `.npmrc` + `.github/dependabot.yml`).
   - Deleted all leaked backend and build artifacts inside `public/`: `public/api/`, `public/scripts/`, `public/.vercel/`, `public/node_modules/`, `public/package.json`, `public/package-lock.json`, `public/vercel.json`, and `public/.gitignore`.
   - Removed hardcoded PostgreSQL credentials in `api/lib/db.js`, hardcoded `SHIPPING_SECRET` fallback in `src/utils/shipping.ts`, hardcoded `ADMIN_EMAILS` in `src/lib/auth.ts`, and 70 hardcoded `TDV-*` license keys in `js/config.js` / `public/js/config.js`.
2. **Authentication, Session Verification & Admin RBAC Hardened (`AUTH_MIDDLEWARE`, `PASSWORD_HASHING`)**:
   - Deleted the unauthenticated account-takeover route `app/api/auth/unlock-unconfirmed/route.ts` and removed the `fastLoginAction` admin backdoor from `app/(storefront)/login/actions.ts`.
   - Replaced unverified `supabase.auth.getSession()` calls with `supabase.auth.getUser()` in `src/lib/auth.ts` and `src/utils/supabase/middleware.ts`, and re-enabled Next.js edge middleware across all routes in `middleware.ts`.
   - Enforced `requireAdmin()` across `/admin/identity`, `/admin/support`, `/admin/stylist-logs`, `/admin/shipments`, `app/actions/support.ts`, `app/actions/ai-stylist-logs.ts`, `app/actions/getDisputeStats.ts`, and moved internal deposit recording to `src/lib/ledger-internal.ts` (`import "server-only"`).
   - Replaced plaintext password storage in `app/api/tdv/register/route.ts` and `app/api/tdv/login/route.ts` with `crypto.scrypt` (`src/lib/password-hash.ts`), removed `console.log` OTP leaks and `Math.random()` OTP generation in `app/actions/phone-verification.ts`, and added HMAC-SHA256 OTP hashing with attempt lockouts.
3. **Wallet Settlement, Payment Webhooks & IDOR Eliminated (`PAYMENT_WEBHOOKS`, `ACCESS_CONTROL`)**:
   - Fixed `advanceMobileOrderStatusAction` (`app/actions/closet.ts`) to require `requireAuth()`, verify borrower/lender ownership, require `invoice.status === "PAID"` before pickup, and delegate `COMPLETE_ORDER` to idempotent `settleCompletedRentalOrder` (`lib/settlement-engine.ts`).
   - Hardened `createBooking` (`app/actions/booking.ts`) and `POST /api/checkout` (`app/api/checkout/route.ts`) to verify `verifyShippingToken()` HMAC tokens and reject negative/forged shipping fees, require `Math.round(Number(payosData.amount)) >= expectedAmount` on PayOS webhook verification (`app/api/webhooks/payos/route.ts`), verify Zalo `mac` signatures (`app/api/zalo-webhook/route.ts`), and enforce timing-safe `verifyCronRequest` (`src/lib/cron-auth.ts`) across all `/api/cron/*` endpoints.
   - Removed client-supplied `userId`/`passedUserId` trust across all Server Actions (`withdrawal.ts`, `boost.ts`, `coin.ts`, `kyc-verification.ts`, `product.ts`, `notification.ts`, `support.ts`, `dispute.ts`, `blog.ts`, `shipment.ts`, `favorite.ts`, `my-closet/items/actions.ts`, `my-closet/orders/actions.ts`, `create-outfit.ts`) and stripped seller `pickupAddress`/`phoneNumber` PII from public product queries (`src/lib/product-service.ts`).
4. **SSRF, File Uploads, CSRF, CORS, Rate Limiting, SQLi, XSS & Error Handling (`SSRF`, `FILE_UPLOADS`, `CSRF`, `CORS`, `RATE_LIMITING`, `SQL_INJECTION`, `XSS`, `ERROR_HANDLING`)**:
   - Added `src/lib/ssrf-guard.ts` (`fetchSafeAllowedImage`) and magic-byte validation (`src/lib/server-image-guard.ts`) to all upload and AI image routes, blocking `.svg`/`.html` uploads and arbitrary URL fetches.
   - Added `src/lib/csrf.ts` (`verifySameOriginRequest`), `src/lib/cors.ts` / `api/lib/cors.js`, and trusted-IP extraction (`src/lib/request-ip.ts`) with fail-closed Redis rate limiting (`src/lib/rate-limit.ts`) for sensitive endpoints.
   - Removed browser-side direct `supabaseClient.from('tdv_users')` queries in `js/auth.js` / `public/js/auth.js`, parameterized SQL scripts, sanitized HTML/DOM XSS sinks (`escapeHtml`, safe URL validation), and replaced raw `error.message` disclosures across API routes, Server Actions, and React error boundaries with `src/lib/safe-error.ts`.
5. **Database RLS Lockdown Scripts (`DATABASE_ACCESS`)**:
   - Fixed the syntax error and column names in `scripts/emergency_lockdown_ultimatum_v2.sql`, locked down `scripts/setup_supabase_tdv.js`, and created `scripts/lockdown_all_tables_v3.sql` and `scripts/migrate_tdv_plaintext_passwords.sql` covering all 26 CLOOP Prisma tables + 3 TDV tables.

## Remaining Manual Actions Before Production Deploy

1. **Rotate Compromised Secrets Immediately**:
   - Rotate the PostgreSQL password in Supabase Dashboard (`Project Settings -> Database`) for `dkwlzsamdpgzbusakmmh`, update `DATABASE_URL` and `DIRECT_URL` in `.env` and Vercel, rotate `SHIPPING_SECRET` and `OTP_HMAC_SECRET`, redeploy Google Apps Script Drive webhooks, reset passwords + enable MFA on admin accounts, and revoke the 70 `TDV-*` license keys.
2. **Test Database Scripts Locally Before Staging/Production**:
   - Hãy chạy thử script này ở môi trường Local trước khi đẩy lên Staging/Production: `scripts/lockdown_all_tables_v3.sql`, `scripts/emergency_lockdown_ultimatum_v2.sql`, `scripts/migrate_tdv_plaintext_passwords.sql`, and `scripts/audit_cross_check_forensics.sql`.
3. **Deploy to Vercel & Re-Run `check.py`**:
   - Verify `.vercel/project.json` points to the CLOOP project, deploy the updated codebase, and re-run `python .agents/skills/vibe-check/scripts/check.py https://cloop-sable.vercel.app` to confirm all 5 `SECURITY_HEADERS` FAILs and 1 WARN resolve to `PASS`.
