# SECURITY_HEADERS Security Report

## Status: HIGH (Remediated in Local Codebase — Pending Vercel Deployment)

## Live HTTP Scan Results (`https://cloop-sable.vercel.app`)

Executing `python .agents/skills/vibe-check/scripts/check.py https://cloop-sable.vercel.app --json` (80 HTTP requests) against the currently deployed site reported **14 PASS, 1 INFO, 1 WARN, 5 FAIL**. All 5 FAILs and 1 WARN on the live deployment were in `SECURITY_HEADERS`:

1. **FAIL — `CSP does not stop injected scripts (script-src)`**:
   - Live `Content-Security-Policy` contained `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://res.cloudinary.com https://challenges.cloudflare.com https://cdn.jsdelivr.net https://vercel.live` with no nonce or hash.
2. **FAIL — `CSP form-action is missing or allows any origin`**:
   - Live `form-action 'self' https://*.payos.vn` used a subdomain wildcard (`https://*.payos.vn`) flagged by `check.py`.
3. **FAIL — `CSP frame-ancestors is missing`**:
   - Live `Content-Security-Policy` set `frame-ancestors *`, allowing arbitrary cross-origin framing.
4. **FAIL — `CSP leaves these unrestricted: connect-src, frame-src, img-src, media-src`**:
   - Live `connect-src` allowed bare `https: wss:`, `img-src` allowed `https:`, `media-src` allowed `https:`, and `frame-src` used `https://*.payos.vn`.
5. **FAIL — `No clickjacking protection`**:
   - Live responses omitted `X-Frame-Options` completely while setting `frame-ancestors *`.
6. **WARN — `Static files are missing headers: X-Content-Type-Options: nosniff, Strict-Transport-Security`**:
   - Live `/_next/static/chunks/*.js` responses lacked `X-Content-Type-Options: nosniff` and `Strict-Transport-Security` because `next.config.ts` used a route regex that excluded `_next/static`.

## Codebase Findings (Pre-Remediation)

Inspecting `next.config.ts`, `middleware.ts`, `vercel.json`, and `public/vercel.json` showed that while `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` were configured for dynamic routes in `next.config.ts`, the application explicitly allowed arbitrary cross-origin framing (`frame-ancestors *` with no `X-Frame-Options`), disabled XSS protection in `Content-Security-Policy` via `'unsafe-inline'`, `'unsafe-eval'`, and `https://cdn.jsdelivr.net`, left `connect-src` and `img-src` wide open (`https: wss:`), and omitted headers on `/_next/static` and in `vercel.json`.

1. **HIGH — Complete Lack of Clickjacking Protection (`frame-ancestors *` + Missing `X-Frame-Options` in `next.config.ts:91, 99-105`)**
   - `next.config.ts:91` set `frame-ancestors *;` inside `Content-Security-Policy` and omitted `X-Frame-Options`.
   - Every sensitive route in CLOOP (`/admin`, `/my-closet/wallet`, `/checkout`, `/login`) could be embedded inside an invisible `<iframe>` on any attacker-controlled domain.

2. **HIGH — Weak `Content-Security-Policy` `script-src`, `connect-src`, `img-src`, `media-src`, `frame-src`, and `form-action` Directives (`next.config.ts:79-93`)**
   - **`script-src`**: Included `'unsafe-inline'`, `'unsafe-eval'`, and `https://cdn.jsdelivr.net`.
   - **`connect-src` / `img-src` / `media-src`**: Allowed bare scheme wildcards `https:` and `wss:`.
   - **`form-action` / `frame-src`**: Used `https://*.payos.vn` instead of explicit hosts (`https://pay.payos.vn`, `https://my.payos.vn`, `https://api-merchant.payos.vn`).

3. **MEDIUM — Missing Static Asset & Edge Header Mirroring (`next.config.ts`, `vercel.json`)**
   - `next.config.ts` excluded `_next/static` from the header source pattern, causing static chunks to miss `X-Content-Type-Options: nosniff` and `Strict-Transport-Security`.
   - `vercel.json` lacked global `/(.*)` security headers.

## Remediation Applied in Codebase

1. **Per-Request Nonce CSP & Full Header Suite in `middleware.ts` & `app/layout.tsx`**:
   - `middleware.ts` now generates a cryptographic per-request nonce (`btoa(crypto.randomUUID())`), forwards `x-nonce` to Next.js Server Components (`app/layout.tsx` reads `x-nonce` and attaches `nonce={nonce}` to the theme script), and sets a strict `Content-Security-Policy` (`script-src 'self' 'nonce-...' 'strict-dynamic' ...`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self' https://pay.payos.vn https://my.payos.vn`, and explicit host allowlists for `connect-src`, `img-src`, `media-src`, and `frame-src` with zero bare scheme or `*.` wildcards).
2. **Static & Edge Header Coverage in `next.config.ts` & `vercel.json`**:
   - Updated `next.config.ts` (`source: "/:path*"`) and `vercel.json` (`source: "/(.*)"`) to apply `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `Permissions-Policy`, and `Content-Security-Policy` across all dynamic and `/_next/static` responses.
