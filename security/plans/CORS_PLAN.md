# CORS Fix Plan

## Changes

- `public/api/` — Delete completely so duplicate TDV handlers with `Access-Control-Allow-Origin: *` are removed from the static webroot.
- `api/tdv/login.js`, `api/tdv/register.js`, `api/tdv/redeem.js`, `api/tdv/used-keys.js`, `api/tdv/forgot-password/send-otp.js`, `api/tdv/forgot-password/verify-otp.js` — Replace hardcoded `res.setHeader('Access-Control-Allow-Origin', '*')` with `applyStrictCors(req, res, ['POST', 'OPTIONS'])` from `api/lib/cors.js` (checking an explicit allowlist of production origins, adding `Vary: Origin`, and returning `403` on disallowed cross-origin preflights).
- `app/api/storage/drive-resumable/route.ts` — Validate `cleanOrigin` against the explicit `ALLOWED_ORIGINS` set (`process.env.NEXT_PUBLIC_SITE_URL`, `https://cloop-sable.vercel.app`, and `http://localhost:3000` in development only); reject unrecognized origins with `403` before requesting a Google Drive resumable upload URI.

## New files

- `src/lib/cors.ts` & `api/lib/cors.js` — Centralized strict CORS allowlist helper ensuring `Access-Control-Allow-Origin` is never `*`, never echoes unverified `Origin` headers, always sets `Vary: Origin`, pairs `Access-Control-Allow-Credentials: true` solely with exact allowlisted origins, and restricts `Access-Control-Allow-Methods` to the endpoint's exact methods.

## Verification goals

After implementation, ALL of these must be true:

- [ ] CORS `Access-Control-Allow-Origin` uses an explicit allowlist of actual production domains (or omits CORS headers for strictly same-origin endpoints).
- [ ] Zero API routes in `app/api/**` or `api/**` emit `Access-Control-Allow-Origin: *`.
- [ ] Request `Origin` is never echoed back unless it matches the explicit allowlist (`Vary: Origin` is included whenever dynamic allowlist matching is used).
- [ ] `Access-Control-Allow-Credentials: true` is only ever paired with specific allowlisted origins.
- [ ] `Access-Control-Allow-Methods` lists only the exact HTTP methods implemented by each route.

## Manual verification (for the human)

- Run `python .agents/skills/vibe-check/scripts/check.py <PRODUCTION_URL> --only cors` after deployment to verify that neither Vercel nor any API route reflects `Origin: https://evil.example` or serves `Access-Control-Allow-Origin: *` on authenticated API endpoints.
