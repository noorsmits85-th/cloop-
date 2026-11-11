# AUTH_MIDDLEWARE Security Report

## Status: CRITICAL

## Findings

Exhaustive inspection of `middleware.ts`, `src/utils/supabase/middleware.ts`, `src/lib/auth.ts`, all 32 Next.js App Router endpoints (`app/**/route.ts`), all 10 legacy serverless endpoints (`api/**/*.js`), all 10 `/admin` pages/layouts, and all 31 `"use server"` Server Action files revealed five systemic authentication architecture failures.

1. **CRITICAL — Unverified Cookie Trust via `supabase.auth.getSession()` Across Middleware & Core Auth (`src/utils/supabase/middleware.ts:44-53`, `src/lib/auth.ts:33-42`, `app/actions/admin.ts:11`)**
   - In `@supabase/ssr`, `getSession()` parses the `-auth-token` cookie payload without verifying its JWT cryptographic signature against Supabase Auth.
   - Both `updateSession()` and `requireUser()` call `getSession()` first and skip `supabase.auth.getUser()` whenever `session?.user` is present:
   ```ts
   // src/lib/auth.ts:33-42
   const { data: { session } } = await supabase.auth.getSession();
   let user = session?.user;

   if (!user) {
     const { data: { user: fetchedUser }, error } = await supabase.auth.getUser();
   ```
   - `app/actions/closet.ts:575-602`, `app/actions/product.ts:74-102`, and `middleware.ts:9-33` also manually Base64-decode JWT `sub` claims without signature verification.

2. **CRITICAL — `middleware.ts` Skips 29 of 31 API Routes, Never Checks `ADMIN` Role, and Excludes `/my-closet/create` (`middleware.ts:39-47, 155-189`)**
   - `isProtectedApi` (`lines 155-158`) only matches `/api/disputes`, `/api/user` (non-existent), and `/api/checkout`. All other 29 `/api/*` routes—and all Next.js Server Action `POST` RPCs invoked from public pages—bypass middleware authentication completely (`return NextResponse.next()`).
   - `isProtectedPage` (`lines 160-162`) checks `!user || error` on `/admin/*` without checking `role === "ADMIN"`, allowing any logged-in regular `USER` through middleware into `/admin/*` (and explicitly skips `/my-closet/create`).

3. **CRITICAL — Missing Admin & Auth Checks on `/admin` Pages and Backing Server Actions**
   - Because Next.js App Router layouts execute in parallel with child Server Components and do not re-run on soft RSC flight requests, `app/admin/layout.tsx` does not protect child pages or Server Actions that omit `requireAdmin()`:
     - `app/admin/identity/page.tsx:10-51` — Missing `requireAdminOrRedirect()`; queries 100 users' emails, phone numbers, and KYC transactions directly.
     - `app/admin/support/page.tsx:9-11` & `app/actions/support.ts:108-524` — **Zero authentication and zero admin checks** across all 8 exported support functions (`getAllSupportTickets`, `sendAdminMessage`, `updateTicketStatus`, `markTicketReadByAdmin`, `getAdminUnreadTotal`, `getTicketMessages`, `sendCustomerMessage`, `getOrCreateSupportTicket`).
     - `app/admin/stylist-logs/page.tsx:19-33` & `app/actions/ai-stylist-logs.ts:13-78` — **Zero authentication and zero admin checks** on `getAiStylistLogs` and `deleteAiStylistLog`.
     - `app/actions/ledger.ts:13-35` (`recordDepositIn`) — **Zero authentication and zero admin check**.

4. **CRITICAL — Admin Login Backdoor, Email-Confirmation Bypass & `clientUserId` Auth Fallbacks**
   - `fastLoginAction` (`app/(storefront)/login/actions.ts:354-443`) resets the password of `th4212044@gmail.com` (hardcoded in `ADMIN_EMAILS` at `src/lib/auth.ts:8`) and signs any anonymous caller into an `ADMIN` session.
   - `login` (`login/actions.ts:79-84`), `signup` (`login/actions.ts:287-290`), and unauthenticated `POST /api/auth/unlock-unconfirmed` (`app/api/auth/unlock-unconfirmed/route.ts:15-19`) execute raw SQL `UPDATE auth.users SET email_confirmed_at = NOW()`, bypassing email ownership verification.
   - ~15 Server Actions (`app/actions/closet.ts`, `withdrawal.ts`, `product.ts`, `boost.ts`, `notification.ts`, `getDisputeStats.ts`, `src/actions/create-outfit.ts`, `app/(dashboard)/my-closet/items/actions.ts`) swallow `requireUser()` errors and fall back to unauthenticated client-supplied `clientUserId` / `passedUserId` / `owner_id`.
   - `GET /api/cron/release-locks` (`app/api/cron/release-locks/route.ts:8`) fails open (`Bearer undefined`) when `process.env.CRON_SECRET` is unset.

5. **Exhaustive HTTP API Route Protection Summary (32 App Router Routes + Legacy `api/tdv/*`)**
   - **Protected by Middleware + Handler (`requireUser`)**: `POST /api/checkout`, `POST /api/disputes/upload-url`.
   - **Protected in Handler Only (`requireUser`)**: `POST /api/products`, `POST /api/storage/drive-resumable`, `GET /api/storage/webhook-dispatcher` (leaks internal webhook URLs to regular users).
   - **Protected by Secret / Signature**: `POST /api/webhooks/payos` (HMAC verified), `GET /api/cron/escrow-sla` (`CRON_SECRET` fail-closed), `GET /api/cron/expire-leaf-coins` (`CRON_SECRET` fail-closed).
   - **Broken Secret / Token Check**: `GET /api/cron/release-locks` (fail-open `CRON_SECRET`), `public/api/tdv/verify-session.js` & `sync-unlocks.js` (skip token check when `session_token` is empty).
   - **Intentionally Public Read/Auth Endpoints**: `GET /auth/callback`, `GET /api/products`, `GET /api/products/[id]`, `GET /api/pricing/suggest-tiers`, `GET /api/shipping/address`, `POST /api/shipping/quote`, `POST /api/tdv/login`, `POST /api/tdv/register`, `GET /api/cron/auto-refund-deposits` (no-op), `POST /api/products/embedding` (`410 Gone`).
   - **Unprotected Endpoints Missing Required Auth**: `POST /api/auth/unlock-unconfirmed`, `POST /api/upload`, `POST /api/upload-drive`, `POST /api/ai-autofill`, `POST /api/ai-story`, `POST /api/ai-suggest`, `POST /api/analyze-fit`, `POST /api/moderate-image`, `POST /api/stylist`, `POST /api/visual-search`, `POST /api/voice-transcribe`, `POST /api/zalo-webhook` (missing Zalo signature check), `POST /api/tdv/redeem`, `GET /api/tdv/used-keys`, `POST api/tdv/forgot-password/{send-otp,verify-otp}.js`.

## What's at risk

- **Instant Unauthenticated `ADMIN` Compromise**: Attackers can obtain full administrator access either by invoking `fastLoginAction`, forging an unverified `-auth-token` cookie read by `getSession()`, or chaining `/api/auth/unlock-unconfirmed` with `src/lib/auth.ts:125`.
- **Unauthenticated Data Breach & Marketplace Destruction**: Anonymous callers can dump all customer support tickets (with customer emails, phone numbers, home addresses, and wallet balances), read/delete AI stylist logs, upload files, exhaust Gemini API quotas, and modify or delete any product via unauthenticated Server Actions.

## What's already secure

- **Admin Financial Actions Check DB Role**: `app/admin/payments/actions.ts` (all 4 payout/reconciliation actions), `app/admin/deposit-vault/actions.ts`, `app/actions/accounting.ts`, and `resolveDispute` (`app/actions/dispute.ts:229`) query `prisma.user` for `role === "ADMIN"` (never trusting client role claims).
- **`bumpProductAction` (`app/actions/product.ts:319`)**: Directly calls `supabase.auth.getUser()` and verifies `product.userId === user.id`.
- **Fail-Closed Cron Guards (`escrow-sla` & `expire-leaf-coins`)**: Check `if (!expectedSecret || authHeader !== ...)` before executing.

## Recommendations

1. **Replace every `getSession()` call with `supabase.auth.getUser()`**: Remove `getSession()` and manual JWT Base64 `sub` decoding across `src/utils/supabase/middleware.ts`, `src/lib/auth.ts`, `middleware.ts`, `app/actions/admin.ts`, `app/actions/booking.ts`, `app/actions/favorite.ts`, `app/actions/withdrawal.ts`, `app/actions/closet.ts`, and `app/actions/product.ts`.
2. **Enforce default-deny API authentication in `middleware.ts`**: Require verified authentication in `middleware.ts` for all `/api/*` and `/my-closet/*` paths except an explicit public allowlist (`/api/webhooks/payos`, `/api/zalo-webhook`, `/api/cron/*`, `GET /api/products*`, `/api/shipping/*`, `/api/pricing/suggest-tiers`), and enforce DB/verified admin role gating on `/admin/*`.
3. **Remove `fastLoginAction`, `/api/auth/unlock-unconfirmed`, `ADMIN_EMAILS` auto-promotion, and force-confirmation SQL**: Manage `ADMIN` roles strictly via manual database migration + MFA, and require real email confirmation via Supabase Auth.
4. **Add `requireAdminOrRedirect()` / `requireAdmin()` to every `/admin` page and admin Server Action**: Lock down `app/admin/identity/page.tsx`, `app/admin/support/page.tsx`, `app/admin/stylist-logs/page.tsx`, `app/actions/support.ts`, `app/actions/ai-stylist-logs.ts`, and `app/actions/ledger.ts`.
5. **Delete all `clientUserId` / `passedUserId` / `owner_id` fallbacks**: Every user-scoped Server Action must fail with `401` when `requireUser()` throws.
