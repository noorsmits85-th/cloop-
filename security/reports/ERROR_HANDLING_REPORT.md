# ERROR_HANDLING Security Report

## Status: CRITICAL

## Findings

While Next.js production source maps and `X-Powered-By` headers are disabled in `next.config.ts`, the workspace currently contains catastrophic static exposure of backend files under `public/`, an unauthenticated account-unlock debug endpoint, missing global error boundaries, UI rendering of raw `error.message`, and over 25 API routes and Server Actions returning raw server/database exception strings to clients.

1. **CRITICAL — Backend Source Code, Scripts, Configs & Hardcoded DB Credentials Inside Next.js `public/`**
   - Because Next.js serves every file in `public/` directly at `/` over static HTTP, copying the `on-thi-tdv` project into `public/` makes backend code and secrets publicly downloadable:
     - `public/api/lib/db.js:3` (`GET /api/lib/db.js`) — Exposes backend database connection code containing a hardcoded production Supabase PostgreSQL connection string (`postgresql://postgres.[REDACTED]:[REDACTED]@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres`).
     - `public/api/lib/mailer.js`, `public/api/lib/security.js`, `public/api/lib/supabase.js`, and `public/api/tdv/**` — Exposes full auth/OTP/mailer implementation source.
     - `public/scripts/audit_supabase.js` (`GET /scripts/audit_supabase.js`), `public/.vercel/project.json` (`GET /.vercel/project.json` leaking `orgId` and `projectId`), `public/package.json`, `public/package-lock.json`, `public/vercel.json`, and `public/node_modules/**`.

2. **CRITICAL — Unauthenticated Debug/Helper Endpoints & Demo Admin Backdoor in Production Code**
   - `POST /api/auth/unlock-unconfirmed` (`app/api/auth/unlock-unconfirmed/route.ts:4-57`): Unauthenticated helper endpoint that accepts `{ email }`, executes raw SQL `UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = $1`, upserts `public.User` (`isVerified: true`), and returns raw `err?.message || String(err)` on failure (`line 55`).
   - `fastLoginAction` (`app/(storefront)/login/actions.ts:354-443`): Exported `"use server"` pilot/demo helper that resets the password of an `ADMIN_EMAILS` account (`th4212044@gmail.com`) and grants an authenticated admin session to any anonymous caller.
   - `GET /api/tdv/used-keys` (`app/api/tdv/used-keys/route.ts:4-16` & `api/tdv/used-keys.js:3-22`): Unauthenticated endpoint dumping all redeemed license keys from `public.tdv_license_keys`.

3. **HIGH — API Routes & Server Actions Leaking Raw Upstream OAuth, Drive & Prisma Error Messages**
   - `app/api/storage/drive-resumable/route.ts:68-71, 103-106, 122` returns raw Google Cloud OAuth2 token error payloads (`details: tokenErr`), raw Google Drive API error responses (`details: initErr`), and raw `error.message` directly to HTTP clients:
   ```ts
   // app/api/storage/drive-resumable/route.ts:68-71
   return NextResponse.json(
     { error: "Lỗi xác thực OAuth2 với Google Cloud", details: tokenErr },
     { status: 500 }
   );
   ```
   - Raw `error.message` (which in Prisma includes model names, SQL constraint names, column names, and connection pool diagnostics) is returned directly in HTTP `500` JSON responses across:
     - `app/api/products/route.ts:78` & `app/api/products/[id]/route.ts:28`
     - `app/api/analyze-fit/route.ts:68` & `app/api/shipping/quote/route.ts:358`
     - `app/api/upload-drive/route.ts:84`, `app/api/disputes/upload-url/route.ts:91`, `app/api/storage/webhook-dispatcher/route.ts:50`, `app/api/ai-story/route.ts:51`
     - `app/api/cron/escrow-sla/route.ts:192` & `app/api/cron/expire-leaf-coins/route.ts:48`
   - Server Actions returning raw `error.message` to browser clients include `app/actions/payment.ts:132`, `app/actions/coin.ts:94,293,355`, `app/actions/ledger.ts:33,94`, `app/actions/product.ts:659,788`, `app/actions/closet.ts:256,395,509,903,1015`, `app/actions/support.ts:199,215,281,326,461,483,500`, `app/actions/shipment.ts:580,586,645,745,808`, `app/admin/payments/actions.ts:136,176,210,337,416`, and `app/admin/deposit-vault/actions.ts:230`.

4. **MEDIUM — UI Error Boundaries Render Raw `{error.message}` & Omit `app/global-error.tsx` / Sentry Capture**
   - `app/error.tsx:34-40` and `app/app/error.tsx:47-53` render `{error.message}` in a monospace box to end users.
   - `app/global-error.tsx` is missing, and none of the 5 `error.tsx` boundaries invoke `Sentry.captureException(error)` (only `console.error`).
   - `next.config.ts:136` sets `typescript: { ignoreBuildErrors: true }`, masking compile-time type errors in production builds.

## What's at risk

- **Complete Database Compromise via Static Source Leak**: Any visitor requesting `/api/lib/db.js` from a deployment containing the dirty `public/` folder receives the production PostgreSQL connection URI and password, plus full source code of `/api/tdv/*` and `/scripts/audit_supabase.js`.
- **Account Verification Bypass & Admin Takeover**: Exposed helper endpoints (`/api/auth/unlock-unconfirmed` and `fastLoginAction`) allow bypassing email confirmation on arbitrary accounts and logging straight into an administrator account.
- **Schema & Cloud Architecture Reconnaissance**: Returning raw Prisma `error.message` and Google OAuth `tokenErr` bodies leaks table/column names, constraint rules, Supavisor pool states, and Google service-account details to attackers probing malformed inputs.

## What's already secure

- **Source Maps & Server Fingerprinting Disabled (`next.config.ts:6-7, 147-149`)**: Sets `poweredByHeader: false`, `productionBrowserSourceMaps: false`, and `sourcemaps: { disable: true }` in `withSentryConfig`.
- **No Framework API Docs / Debug Consoles Exposed**: Swagger UI, OpenAPI `/docs`, `/redoc`, GraphiQL/GraphQL introspection, and `/api/products/embedding` (`HTTP 410 Gone`) are either absent or explicitly disabled.
- **Scoped Dashboard Error Boundaries (`app/(dashboard)/error.tsx`, `app/(storefront)/shop/error.tsx`, `app/admin/error.tsx`)**: Display safe generic messages and `error.digest` rather than raw exception strings.

## Recommendations

1. **Purge all backend code, scripts, and configs from `public/` immediately & rotate leaked credentials**: Delete `public/api/`, `public/scripts/`, `public/.vercel/`, `public/node_modules/`, `public/package.json`, `public/package-lock.json`, and `public/vercel.json`, and rotate the Supabase PostgreSQL password immediately.
2. **Delete or hard-disable debug/demo endpoints**: Delete `app/api/auth/unlock-unconfirmed/route.ts` and `fastLoginAction` in `app/(storefront)/login/actions.ts`, and require admin authentication (or remove) `GET /api/tdv/used-keys`.
3. **Introduce a centralized safe error serializer (`toPublicError`)**: Log full exceptions server-side via `Sentry.captureException(err)` + `console.error`, and return only generic user-safe messages (plus an opaque `requestId` / `digest`) across all `app/api/**` routes and `app/actions/**` Server Actions—only surfacing explicitly allowlisted `AppValidationError` messages.
4. **Harden React Error Boundaries & Build Config**: Create `app/global-error.tsx` with `Sentry.captureException(error)`, remove `{error.message}` rendering from `app/error.tsx` and `app/app/error.tsx` (show `error.digest` only), configure explicit PII masking in `sentry.client.config.ts` `replayIntegration`, and re-enable TypeScript build checks (`ignoreBuildErrors: false`) once type errors are resolved.
