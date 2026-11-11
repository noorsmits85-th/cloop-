# CSRF Security Report

## Status: HIGH

## Findings

Inspecting `next.config.ts`, Supabase SSR cookie handlers (`src/utils/supabase/*`), all state-changing `POST`/`PUT`/`PATCH`/`DELETE` REST routes (`app/api/**` and `api/tdv/**`), and `GET` handlers revealed a wildcard Server Action CSRF bypass in `next.config.ts`, 1-year non-`HttpOnly` cookies without explicit `Secure`, missing `Origin` checks on custom REST endpoints (including `Origin` reflection into PayOS URLs), a state-mutating `GET` endpoint, and an OAuth callback open redirect.

1. **HIGH — Wildcard `"*.vercel.app"` & Private LAN IPs in `serverActions.allowedOrigins` (`next.config.ts:8-15`)**
   - Next.js blocks cross-site Server Action `POST` requests by matching the `Origin` header against `Host` and `experimental.serverActions.allowedOrigins`. `next.config.ts` currently sets:
   ```ts
   // next.config.ts:10-13
   allowedOrigins: [
     "192.168.1.8:3000", "192.168.1.8", "localhost:3000", "127.0.0.1:3000",
     "192.168.1.5:3000",
     "cloop-sable.vercel.app", "*.vercel.app"
   ],
   ```
   - Whitelisting `"*.vercel.app"` trusts **every** third-party `.vercel.app` subdomain on the internet as an authorized origin to invoke CLOOP Server Actions using a logged-in user's cookies.

2. **HIGH — Cookie Attributes Missing `HttpOnly`, Explicit `Secure`, and Using 365-Day `maxAge` (`src/utils/supabase/server.ts:18-25`, `middleware.ts:30-37`, `client.ts:13-17`)**
   - While `sameSite: 'lax'` is explicitly set across all three Supabase wrappers, `secure: process.env.NODE_ENV === 'production'` is **not** enforced, `httpOnly` is **not** set (`@supabase/ssr` leaves auth cookies readable via `document.cookie`), and `maxAge` is hardcoded to **1 full year (`365 * 24 * 60 * 60`)** even for Admin accounts.

3. **HIGH — Missing `Origin` Validation on Cookie-Authenticated REST Routes & `Origin` Poisoning in `POST /api/checkout` (`app/api/checkout/route.ts:234-243`)**
   - Custom cookie-authenticated `POST` routes (`POST /api/checkout`, `POST /api/products`, `POST /api/disputes/upload-url`, `POST /api/storage/drive-resumable`) and unauthenticated `multipart/form-data` routes (`POST /api/upload`, `POST /api/upload-drive`) do not verify `Origin` / `Referer` or a CSRF token.
   - Worse, `POST /api/checkout` (`lines 234-243`) reflects an unvalidated `Origin` or `X-Forwarded-Host` header straight into PayOS's `returnUrl` and `cancelUrl`:
   ```ts
   // app/api/checkout/route.ts:234-242
   const origin = req.headers.get("origin");
   const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
   const YOUR_DOMAIN = origin || (host ? `${protocol}://${host}` : null) || process.env.NEXT_PUBLIC_SITE_URL;
   ...
   returnUrl: `${YOUR_DOMAIN}/checkout/success?orderCode=${orderCode}`,
   ```

4. **MEDIUM/HIGH — State-Mutating `GET` Routes & OAuth Callback Open Redirect**
   - `GET /api/cron/release-locks` (`app/api/cron/release-locks/route.ts:5-11`) cancels rentals and unlocks products on `GET`, and fails to check `!process.env.CRON_SECRET` before comparing `Bearer ${process.env.CRON_SECRET}`.
   - `app/admin/shipments/page.tsx:30-55` creates `Shipment` rows in PostgreSQL during a `GET` page render.
   - `GET /auth/callback` (`app/auth/callback/route.ts:7, 34`) redirects to `${origin}${next}` without verifying `next.startsWith("/") && !next.startsWith("//")`, enabling an open redirect (`?next=@attacker.example` or `?next=//attacker.example`) immediately after OAuth authentication.

## What's at risk

- **Cross-Site Server Action Forgery from Any `.vercel.app` Domain**: An attacker hosting a page on `any-subdomain.vercel.app` can submit cross-origin Server Action requests (when cookies are sent, e.g., top-level navigation or same-site/browser quirks) without Next.js blocking the `Origin`.
- **Year-Long Session Theft & Checkout Phishing**: Non-`HttpOnly` 365-day cookies maximize XSS session-hijack impact, and `Origin` reflection in `/api/checkout` redirects buyers after PayOS payment to an attacker-controlled phishing domain.

## What's already secure

- **`SameSite=Lax` Set on Auth Cookies**: `src/utils/supabase/{server,middleware,client}.ts` all specify `sameSite: 'lax'`, preventing cross-site subresource `fetch`/`XHR` cookie transmission in modern browsers.
- **Built-In Next.js Server Action `Origin` Check Active**: Once `"*.vercel.app"` and LAN IPs are removed from `allowedOrigins`, Next.js automatically enforces strict `Origin === Host` verification on every Server Action.

## Recommendations

1. **Remove `"*.vercel.app"` and hardcoded LAN IPs from `next.config.ts`**: Restrict `experimental.serverActions.allowedOrigins` in production strictly to your exact production domain(s) (`cloop-sable.vercel.app` and your custom domain, if any), gating `localhost:3000` behind `process.env.NODE_ENV === "development"`.
2. **Enforce `Origin` / `Sec-Fetch-Site` CSRF validation in `middleware.ts` for all state-changing requests**: Reject any browser `POST`/`PUT`/`PATCH`/`DELETE` request to `/api/*` (excluding signature-verified external webhooks `/api/webhooks/payos` and `/api/zalo-webhook`) whose `Origin` header is missing or not in the strict site origin allowlist.
3. **Harden cookie flags & session lifetimes**: Enforce `secure: process.env.NODE_ENV === "production"` and `sameSite: "lax"` across Supabase SSR cookie writers, reduce customer cookie `maxAge` from 365 days to a reasonable window (e.g., 7–30 days, with strict short re-auth TTL for `/admin`), and ensure any custom session cookies (`tdv_session`) set `HttpOnly; Secure; SameSite=Lax`.
4. **Fix PayOS `YOUR_DOMAIN`, `GET` mutations, and `/auth/callback` redirect**: Build PayOS `returnUrl`/`cancelUrl` strictly from `process.env.NEXT_PUBLIC_SITE_URL` (never `req.headers.get("origin")` or `x-forwarded-host`), move shipment creation out of `app/admin/shipments/page.tsx` `GET` render into an explicit `POST` Server Action, fix `!process.env.CRON_SECRET` in `/api/cron/release-locks`, and validate `next` in `/auth/callback` (`/^\/(?!\/|\\)/.test(next)`).
