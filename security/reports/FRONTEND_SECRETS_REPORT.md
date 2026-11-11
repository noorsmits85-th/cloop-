# FRONTEND_SECRETS Security Report

## Status: CRITICAL

## Findings

Auditing all files under `app/`, `src/`, `components/`, `js/`, `public/`, root HTML files, `NEXT_PUBLIC_*` environment variables, and Next.js source map configurations confirmed that while `next.config.ts` disables Next.js browser source maps and keeps private `process.env` keys out of `NEXT_PUBLIC_*`, the `public/` static directory and vanilla JS frontend bundles currently ship critical secrets, 70 paid license codes, and 211 `.map` source map files directly to browsers.

1. **CRITICAL — Backend Database Credentials & Source Files Served Under `public/` (`public/api/lib/db.js:3`)**
   - `public/api/lib/db.js` sits inside Next.js's static webroot (`GET /api/lib/db.js`) and contains a hardcoded PostgreSQL superuser connection string (`postgresql://postgres.dkwlzsamdpgzbusakmmh:[REDACTED]@...`), alongside 11 other backend `.js` handlers in `public/api/**` and `public/scripts/audit_supabase.js`.

2. **HIGH — 70 Commercial Paid Activation Keys Embedded in Client Bundle (`js/config.js:33-118` & `public/js/config.js:33-118`)**
   - `PAYMENT_CONFIG.presetCodes` ships 70 single-use commercial activation codes (including 10 VIP `"all"` keys unlocking all 6 subjects) directly to every visitor's browser in `/js/config.js`.

3. **HIGH — Hardcoded Seed Admin Credentials & Direct Browser-to-Supabase Calls (`js/auth.js:18-27`, `public/js/auth.js:23-30`, `quiz-system.html:568-578`)**
   - `js/auth.js:18-21` hardcodes `student@gmail.com` and `admin@gmail.com` plaintext passwords in `DEFAULT_SEED_USERS`.
   - `js/auth.js` and `public/js/auth.js` hardcode `SUPABASE_URL` and `SUPABASE_ANON_KEY` and initialize `window.supabase.createClient` in the browser; `quiz-system.html:568-578` exposes an unauthenticated `openAdminModal()` storing Supabase credentials in `localStorage` (violating `AGENTS.md` Section 7 against sensitive `localStorage` usage).

4. **MEDIUM — 211 Public `.map` Source Map Files Inside `public/node_modules/**`**
   - Although `next.config.ts:7` (`productionBrowserSourceMaps: false`) and `next.config.ts:147-149` (`sourcemaps: { disable: true }`) properly disable Next.js application `.js.map` files, copying `node_modules` into `public/node_modules/` placed **211 `.map` files** (`@supabase/*`, `pg-protocol`, `pg-cloudflare`, etc.) directly under the public static webroot.

5. **MEDIUM — Missing `import "server-only"` Guards & Unpinned Third-Party CDN Scripts Without SRI**
   - `src/lib/env.ts` (reading `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_GEMINI_API_KEY`) and `src/lib/supabase.ts` (creating `supabaseAdmin`) lack `import "server-only"`, risking accidental client-component imports.
   - `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` (`src/lib/env.ts:33`) exposes an unsigned upload preset identifier if configured; uploads should proxy through authenticated server endpoints.
   - `index.html:347` and `public/index.html:347` load `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2` without exact version pinning or a Subresource Integrity (`integrity="sha384-..."`) hash, and `quiz-system.html:7` loads `https://cdn.tailwindcss.com` without SRI.

## What's at risk

- **Direct Database & License Compromise from Browser DevTools**: Viewing `/api/lib/db.js` reveals the PostgreSQL password; viewing `/js/config.js` reveals all 70 paid license codes.
- **Third-Party CDN Supply-Chain Script Injection**: Loading unpinned `@supabase/supabase-js@2` from `cdn.jsdelivr.net` without SRI executes arbitrary code in the origin if the CDN tag is compromised.

## What's already secure

- **All 8 `NEXT_PUBLIC_*` Variables Audited Safe by Design**:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SENTRY_DSN`, and `NEXT_PUBLIC_CRISP_WEBSITE_ID` hold only publishable identifiers/URLs—no `sk_`, `PAYOS_`, `GEMINI_`, `GOOGLE_PRIVATE_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` values use `NEXT_PUBLIC_`.
- **Next.js & Sentry Browser Source Maps Disabled (`next.config.ts:7, 147-149`)**: Production Next.js builds do not emit or serve application `.js.map` bundles.
- **AI, Payment & Shipping Credentials Proxied Server-Side**: Gemini, PayOS, GHN/GHTK, Cloudinary signed uploads, and GCS signed URLs execute on the server without exposing secret API keys to React components.

## Recommendations

1. **Remove `public/api/`, `public/scripts/`, `public/node_modules/`, and `presetCodes` immediately**: Eliminate all backend source files, all 211 `.map` files in `public/node_modules/`, and all 70 hardcoded license keys in `js/config.js` / `public/js/config.js`.
2. **Add `import "server-only"` to server config/client modules**: Guard `src/lib/env.ts`, `src/lib/supabase-admin.ts`, `src/lib/prisma.ts`, and `lib/payos.ts` with `import "server-only"` so Next.js fails the build immediately if a client component ever imports them.
3. **Remove browser Supabase SDK & `localStorage` auth/config from TDV HTML/JS**: Proxy all TDV operations through authenticated backend API routes using `HttpOnly` cookies, remove `cdn.jsdelivr.net/npm/@supabase/supabase-js@2` from `index.html` / `public/index.html` (or self-host / pin exact version with `integrity` + `crossorigin="anonymous"`), and delete/archive unused `quiz-system.html`.
4. **Disable unsigned Cloudinary presets**: Ensure all media uploads go through authenticated `/api/upload` rather than unsigned browser `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` calls.
