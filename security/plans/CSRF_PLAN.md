# CSRF Fix Plan

## Changes

- `next.config.ts` — Remove `"*.vercel.app"`, `"192.168.1.8:3000"`, `"192.168.1.8"`, and `"192.168.1.5:3000"` from `experimental.serverActions.allowedOrigins`; allowlist only exact production origins (`"cloop-sable.vercel.app"`, plus `process.env.NEXT_PUBLIC_SITE_URL` hostname) and include `"localhost:3000"` only when `process.env.NODE_ENV === "development"`.
- `middleware.ts` — Add global CSRF `Origin` / `Sec-Fetch-Site` enforcement for all `POST`, `PUT`, `PATCH`, and `DELETE` requests to `/api/*` (exempting `/api/webhooks/payos` and `/api/zalo-webhook`, which use cryptographic webhook signatures), returning `403 Forbidden` when `Origin` does not match the explicit site allowlist.
- `src/utils/supabase/server.ts`, `src/utils/supabase/middleware.ts`, `src/utils/supabase/client.ts` — Explicitly set `secure: process.env.NODE_ENV === "production"` and `sameSite: "lax"`, and reduce `maxAge` from 365 days (`31536000`) to `14 * 24 * 60 * 60` (14 days) for standard users (and enforce short session age verification in `requireAdmin()`).
- `app/api/checkout/route.ts` — Remove `req.headers.get("origin")` and `x-forwarded-host` from `YOUR_DOMAIN` (`lines 234-237`); construct `returnUrl` and `cancelUrl` strictly from validated `process.env.NEXT_PUBLIC_SITE_URL` / `process.env.NEXT_PUBLIC_APP_URL`.
- `app/auth/callback/route.ts` — Sanitize `next` (`const safeNext = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";`) before calling `NextResponse.redirect`.
- `app/admin/shipments/page.tsx` — Remove automatic `prisma.shipment.create` database writes during `GET` page rendering (`lines 30-55`); move shipment record initialization into an authenticated `POST` Server Action.
- `app/api/tdv/**` & `api/tdv/**` — Set custom TDV session cookies with `HttpOnly; Secure; SameSite=Lax; Path=/` and validate `Origin` on all state-changing `POST` endpoints.

## New files

- `src/lib/csrf.ts` — Reusable `verifySameOriginRequest(request: Request)` helper checking `Origin` and `Sec-Fetch-Site` against the canonical application origin allowlist.

## Verification goals

After implementation, ALL of these must be true:

- [ ] Every session/auth cookie is configured with `SameSite=Lax` (or `Strict`) and `Secure` in production, and custom session cookies also enforce `HttpOnly`.
- [ ] `experimental.serverActions.allowedOrigins` contains zero wildcard domains (`*.vercel.app`) and zero private LAN IPs in production.
- [ ] All state-changing `/api/*` endpoints (`POST`, `PUT`, `PATCH`, `DELETE`, excluding cryptographic external webhooks) reject cross-origin requests (`Origin: https://evil.example` or `Origin: https://attacker.vercel.app`) with `403`.
- [ ] Zero user-reachable `GET` routes mutate application database state, and `/auth/callback?next=//evil.example` safely redirects to `/`.
- [ ] PayOS `returnUrl` and `cancelUrl` in `POST /api/checkout` cannot be altered by spoofing `Origin` or `X-Forwarded-Host`.

## Manual verification (for the human)

- After deploying to Staging/Production, open browser DevTools -> Application -> Cookies after signing in and verify every auth cookie shows `Secure: true` and `SameSite: Lax`.
- Run `python .agents/skills/vibe-check/scripts/check.py <PRODUCTION_URL> --only csrf` to verify landing/session cookie attributes from outside.
