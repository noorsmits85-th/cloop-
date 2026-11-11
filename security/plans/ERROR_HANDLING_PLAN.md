# ERROR_HANDLING Fix Plan

## Changes

- `public/` — Delete `public/api/`, `public/scripts/`, `public/.vercel/`, `public/node_modules/`, `public/package.json`, `public/package-lock.json`, and `public/vercel.json` so `public/` contains strictly static frontend media/assets.
- `app/api/auth/unlock-unconfirmed/route.ts` — Delete this unauthenticated debug/helper route completely (or restrict strictly behind `requireAdmin()` if needed as an internal support tool).
- `app/(storefront)/login/actions.ts` — Remove `fastLoginAction` (`lines 354-443`) and any UI trigger referencing it.
- `app/api/tdv/used-keys/route.ts` & `api/tdv/used-keys.js` — Require authenticated session verification and restrict output so all redeemed license keys are never dumped publicly.
- `app/error.tsx` & `app/app/error.tsx` — Remove `{error.message}` rendering in production UI (display generic message + `error.digest` only) and call `Sentry.captureException(error)` inside `useEffect`.
- `app/(dashboard)/error.tsx`, `app/(storefront)/shop/error.tsx`, `app/admin/error.tsx` — Add `Sentry.captureException(error)` in `useEffect`.
- `sentry.client.config.ts` — Configure `Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })` to prevent capturing sensitive PII/OTP/bank inputs in error replays.
- `app/api/storage/drive-resumable/route.ts`, `app/api/products/route.ts`, `app/api/products/[id]/route.ts`, `app/api/analyze-fit/route.ts`, `app/api/shipping/quote/route.ts`, `app/api/upload-drive/route.ts`, `app/api/disputes/upload-url/route.ts`, `app/api/storage/webhook-dispatcher/route.ts`, `app/api/ai-story/route.ts`, `app/api/cron/escrow-sla/route.ts`, `app/api/cron/expire-leaf-coins/route.ts` — Replace raw `error.message`, `tokenErr`, and `initErr` in HTTP responses with `handleApiError(error, "Generic Vietnamese fallback message")`.
- `app/actions/*.ts`, `app/admin/payments/actions.ts`, `app/admin/deposit-vault/actions.ts` — Replace `{ success: false, error: error.message }` in `catch` blocks with `toSafeActionError(error, "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.")` so raw Prisma/SQL/network errors never reach the browser.

## New files

- `app/global-error.tsx` — Root-level Next.js App Router global error boundary calling `Sentry.captureException(error)` and rendering a generic black-and-white recovery screen without exposing `error.message` or stack traces.
- `src/lib/safe-error.ts` — Centralized server-side error handler (`PublicAppError`, `handleApiError`, `toSafeActionError`) that reports unexpected exceptions to Sentry with a correlation ID while returning only sanitized messages to clients.

## Verification goals

After implementation, ALL of these must be true:

- [ ] `app/global-error.tsx` exists and catches all unhandled root-level React rendering exceptions without displaying `error.message` or stack traces.
- [ ] All API `500` responses and Server Action error payloads contain only generic messages (or explicit `PublicAppError` domain validation messages)—no Prisma query details, SQL errors, Google OAuth payloads, stack traces, or file paths.
- [ ] Full error details are logged server-side and captured via `Sentry.captureException`.
- [ ] `public/` contains zero `.js` backend handlers, `.sql` scripts, `package.json`, `vercel.json`, or `.vercel/` metadata files.
- [ ] `/api/auth/unlock-unconfirmed`, `/api/lib/db.js`, `/scripts/audit_supabase.js`, Swagger/OpenAPI docs, and GraphQL playgrounds all return `404` in production.

## Manual verification (for the human)

- Immediately rotate the Supabase database password in Supabase Dashboard -> Project Settings -> Database, and update `DATABASE_URL` and `DIRECT_URL` in `.env` and Vercel Environment Variables.
- After deploying to Staging/Production, run `python .agents/skills/vibe-check/scripts/check.py <PRODUCTION_URL> --only errors,secrets` to verify no debug endpoints, stack traces, or leaked backend files return `200`.
