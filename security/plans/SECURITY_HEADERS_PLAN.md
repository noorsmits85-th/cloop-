# SECURITY_HEADERS Fix Plan

## Changes

- `middleware.ts` — Generate a per-request CSP `nonce`, attach `x-nonce` to forwarded request headers so Next.js automatically applies `nonce` to framework inline scripts, and set enforced `Content-Security-Policy` (without `'unsafe-inline'`, `'unsafe-eval'`, `https://cdn.jsdelivr.net`, or `frame-ancestors *`; scoping `connect-src` to explicit Supabase, Cloudinary, GCS, PayOS, Sentry, and Crisp origins), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and `Strict-Transport-Security` (`max-age=63072000; includeSubDomains`).
- `app/layout.tsx` — Read `const nonce = (await headers()).get("x-nonce") ?? undefined;` and pass `nonce={nonce}` to the inline `<script>` at `lines 86-100`.
- `next.config.ts` — Update `headers()` fallback for static/ISR responses: replace `frame-ancestors *` with `frame-ancestors 'none'`, add `X-Frame-Options: DENY`, remove `https://cdn.jsdelivr.net` and `'unsafe-eval'` in production, tighten `connect-src`, replace `X-XSS-Protection: 1; mode=block` with `X-XSS-Protection: 0` (or omit), and confirm with domain owner before keeping HSTS `preload`.
- `vercel.json` — Restore CLOOP `vercel.json` (`crons`) and add a global `"headers"` block on `"source": "/(.*)"` setting `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy` on all CDN/static asset responses.

## New files

- None.

## Verification goals

After implementation, ALL of these must be true:

- [ ] All five core headers (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) are present on every HTML, API, and static asset response.
- [ ] Headers are set centrally via `middleware.ts` + `next.config.ts` and mirrored in `vercel.json` for static CDN assets.
- [ ] `Content-Security-Policy` explicitly declares `default-src 'self'`, `script-src` (nonce-based), `object-src 'none'`, `base-uri 'self'`, `form-action 'self' https://*.payos.vn`, and `frame-ancestors 'none'`.
- [ ] Production `script-src` contains zero `'unsafe-inline'`, `'unsafe-eval'`, `*`, or `https://cdn.jsdelivr.net`, and `connect-src` contains zero bare `https:`/`wss:`/`*` wildcards.
- [ ] `Strict-Transport-Security` has `max-age>=31536000; includeSubDomains`.
- [ ] Core CLOOP pages (`/`, `/shop`, `/login`, `/my-closet`, `/checkout`, `/admin`) load and operate with zero browser Console CSP violations.

## Manual verification (for the human)

- Confirm whether every subdomain of your production domain is HTTPS-only before including `preload` in `Strict-Transport-Security`.
- Open `/`, `/shop`, `/my-closet`, and `/checkout` on Staging with DevTools Console open to verify Crisp Chat, Cloudinary images, and PayOS redirects trigger zero CSP violations (you may deploy the new nonce `script-src` as `Content-Security-Policy-Report-Only` for 24 hours first while immediately enforcing `frame-ancestors 'none'` and `X-Frame-Options: DENY`).
- Run `python .agents/skills/vibe-check/scripts/check.py <PRODUCTION_URL> --only headers` after deployment and confirm 0 FAILs.
