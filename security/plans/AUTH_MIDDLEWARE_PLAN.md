# AUTH_MIDDLEWARE Fix Plan

## Changes

- `src/lib/auth.ts` — Replace `supabase.auth.getSession()` with `await supabase.auth.getUser()`; remove `ADMIN_EMAILS` auto-promotion (`lines 6-12, 69-75`); remove the `catch (syncErr)` email-based `prisma.user.update({ where: { email }, data: { id: user.id } })` reassignment block (`lines 122-161`); remove module-level 30s `userAuthCache` across requests (use React `cache()` per-request memoization instead).
- `src/utils/supabase/middleware.ts` — Always validate the session token via `await supabase.auth.getUser()` (`lines 44-53`).
- `middleware.ts` — Switch `/api/*` protection from a 3-route opt-in list (`isProtectedApi`) to a **default-deny middleware policy** with an explicit public allowlist (`GET /api/products*`, `GET /api/shipping/address`, `POST /api/shipping/quote`, `GET /api/pricing/suggest-tiers`, `POST /api/webhooks/payos`, `POST /api/zalo-webhook`, `GET /api/cron/*`); include `/my-closet/create` in `isProtectedPage`; return JSON `401` for unauthenticated `/api/*` requests and `403` for non-admin `/admin/*` requests.
- `app/(storefront)/login/actions.ts` — Delete `fastLoginAction` (`lines 354-443`) and delete raw SQL `UPDATE auth.users SET email_confirmed_at = NOW()` in `login` (`lines 79-84`) and `signup` (`lines 287-290`).
- `app/api/auth/unlock-unconfirmed/route.ts` — Delete file completely.
- `app/admin/identity/page.tsx`, `app/admin/support/page.tsx`, `app/admin/stylist-logs/page.tsx` — Add `await requireAdminOrRedirect();` as line 1 of each Server Component.
- `app/actions/admin.ts` — Remove `"use server"` export from `requireAdmin` helper (import from `src/lib/auth.ts` instead) and replace `getSession()` with `requireAdmin()`.
- `app/actions/ai-stylist-logs.ts` — Enforce `await requireAdmin()` at the start of `getAiStylistLogs` and `deleteAiStylistLog`.
- `app/actions/support.ts` — Enforce `await requireAdmin()` on `getAllSupportTickets`, `sendAdminMessage`, `markTicketReadByAdmin`, `updateTicketStatus`, and `getAdminUnreadTotal`; enforce authenticated user/signed-ticket session verification on `getOrCreateSupportTicket`, `getTicketMessages`, and `sendCustomerMessage`.
- `app/api/upload/route.ts`, `app/api/upload-drive/route.ts`, `app/api/ai-autofill/route.ts`, `app/api/ai-story/route.ts`, `app/api/ai-suggest/route.ts`, `app/api/analyze-fit/route.ts`, `app/api/moderate-image/route.ts`, `app/api/stylist/route.ts` — Enforce `await requireUser()` before handler execution, returning `401` if unauthenticated.
- `app/api/cron/release-locks/route.ts`, `app/api/cron/escrow-sla/route.ts`, `app/api/cron/expire-leaf-coins/route.ts` — Validate `CRON_SECRET` via a shared constant-time `verifyCronRequest(req)` helper that fails closed (`401`/`500`) whenever `process.env.CRON_SECRET` is empty or mismatched.
- `app/api/tdv/redeem/route.ts`, `app/api/tdv/used-keys/route.ts`, `api/tdv/**` — Enforce server-verified session cookie authentication before executing handler logic.

## New files

- `src/lib/cron-auth.ts` — Fail-closed `verifyCronSecret(request: Request)` helper using `crypto.timingSafeEqual`.

## Verification goals

After implementation, ALL of these must be true:

- [ ] Every API route and Server Action that reads or modifies user/admin data verifies authentication via `supabase.auth.getUser()` (zero `getSession()`-only trust and zero `clientUserId` fallbacks).
- [ ] `middleware.ts` enforces authentication before route handlers execute across all non-public `/api/*` and `/my-closet/*` endpoints.
- [ ] Unauthenticated requests to any protected `/api/*` endpoint return `401`.
- [ ] Authenticated non-admin (`role === "USER"`) requests to any `/admin/*` page or admin Server Action return `403` (or redirect away before any Prisma admin query runs).
- [ ] `fastLoginAction` and `/api/auth/unlock-unconfirmed` no longer exist, and `GET /api/cron/release-locks` rejects requests when `CRON_SECRET` is missing or invalid.

## Manual verification (for the human)

- Log in as a normal non-admin customer (`role = 'USER'`) and attempt to visit `/admin`, `/admin/identity`, `/admin/support`, and `/admin/stylist-logs` directly—confirm immediate redirect/403 with zero user/ticket data in browser Network RSC payloads.
- Test unauthenticated `POST` requests to `/api/upload`, `/api/upload-drive`, `/api/analyze-fit`, and `/api/checkout` and confirm every single one returns `401 Unauthorized`.
