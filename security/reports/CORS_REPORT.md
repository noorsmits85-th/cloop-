# CORS Security Report

## Status: HIGH

## Findings

Inspecting `next.config.ts`, `middleware.ts`, `vercel.json`, `public/vercel.json`, all 32 `app/**/route.ts` handlers, and all 14 legacy/TDV handlers (`api/tdv/**` and `public/api/tdv/**`) identified wildcard `Access-Control-Allow-Origin: *` across all 14 TDV authentication and license endpoints—including endpoints accepting session headers—plus unvalidated `Origin` forwarding to Google Drive's resumable upload API.

1. **HIGH — Wildcard `Access-Control-Allow-Origin: *` on Auth, OTP & Token-Bearing TDV Endpoints (`api/tdv/**` & `public/api/tdv/**`)**
   - Every handler in `api/tdv/` (`login.js:5`, `register.js:5`, `redeem.js:4`, `used-keys.js:4`, `forgot-password/send-otp.js:5`, `forgot-password/verify-otp.js:7`) and `public/api/tdv/` (`login.js:27`, `register.js:27`, `redeem.js:7`, `used-keys.js:4`, `sync-unlocks.js:5`, `verify-session.js:5`, `forgot-password/send-otp.js:5`, `forgot-password/verify-otp.js:7`) hardcodes wildcard CORS:
   ```js
   // public/api/tdv/redeem.js:7-13
   res.setHeader('Access-Control-Allow-Origin', '*');
   res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
   res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-device-session-token');
   if (req.method === 'OPTIONS') {
     return res.status(200).end();
   }
   ```
   - Allowing `*` alongside `x-device-session-token` and state-mutating auth/OTP/key-redemption endpoints lets any malicious external website execute cross-origin API calls against TDV endpoints directly from victim browsers.

2. **MEDIUM — Unvalidated `Origin` Reflection to Google Drive Resumable Upload API (`app/api/storage/drive-resumable/route.ts:78-94`)**
   - `POST /api/storage/drive-resumable` reads `request.headers.get("origin") || request.headers.get("referer")` without checking an allowlist and forwards `Origin: cleanOrigin` directly to `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable`, instructing Google Drive to grant browser CORS upload permissions on the minted upload session URL to whatever origin the caller supplied.

3. **NOTE — Public Storage Bucket & CDN Headers Require Live Verification**
   - Supabase Storage public buckets (`cloop-media`), Cloudinary, and Vercel static asset edges frequently attach `Access-Control-Allow-Origin: *` at the CDN layer independently of Next.js code; once the confirmed production URL is scanned with `check.py`, CDN-added CORS headers on API vs static routes must be verified.

## What's at risk

- **Cross-Origin API Abuse & Brute-Force Relay**: Any malicious website visited by a user can silently invoke `api/tdv/*` login, OTP reset, `used-keys` enumeration, or `verify-session` / `sync-unlocks` endpoints across origins and read the JSON responses directly.
- **Unauthorized Cross-Origin Resumable Uploads**: Reflecting arbitrary `Origin` values to Google Drive's resumable upload initializer weakens browser origin isolation on minted 5TB Drive upload URLs.

## What's already secure

- **Main CLOOP Next.js App Router Endpoints (`app/api/**`) Enforce Same-Origin Policy**: None of the 32 `app/**/route.ts` files, `middleware.ts`, or `next.config.ts` set wildcard `Access-Control-Allow-Origin: *` or combine `Access-Control-Allow-Credentials: true` with reflected origins.

## Recommendations

1. **Replace `Access-Control-Allow-Origin: *` with a strict explicit origin allowlist**: Remove `public/api/**` completely, and in any active `api/tdv/**` / `app/api/tdv/**` routes either omit CORS headers entirely (when served same-origin) or validate `req.headers.origin` against an explicit `Set` of production domains (`https://cloop-sable.vercel.app` and your confirmed custom domain), setting `Vary: Origin` and declaring only the exact HTTP methods used (`POST, OPTIONS` or `GET, OPTIONS`).
2. **Validate `Origin` against the site allowlist in `POST /api/storage/drive-resumable`**: Reject requests whose `Origin` is not in the explicit CLOOP domain allowlist instead of forwarding arbitrary `cleanOrigin` values to Google Drive.
