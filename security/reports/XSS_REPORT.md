# XSS Security Report

## Status: HIGH

## Findings

Auditing all React components (`app/`, `components/`, `src/`), vanilla JS/HTML files (`index.html`, `public/index.html`, `quiz-system.html`, `js/`, `public/js/`), URL parsers, and file-upload render paths revealed multiple Stored XSS, Stored Admin Console crash/phishing link injection, domain-allowlist bypass, and incomplete HTML-escaping vulnerabilities. No HTML sanitization library (`DOMPurify`) is currently installed.

1. **HIGH — Stored XSS via Unauthenticated `.svg` / `.html` Uploads on Public Storage (`app/api/upload-drive/route.ts:47-55` & `src/lib/upload-image.ts:31, 102-110`)**
   - As detailed in `FILE_UPLOADS_REPORT.md`, `POST /api/upload-drive` (zero MIME filter) and `POST /api/upload` (`type.startsWith("image/")` allowing `image/svg+xml`) store active `.html` and `.svg` payloads with client-supplied `Content-Type` inside the public `cloop-media` bucket and Google Drive. When a user or admin opens an attachment link in a new tab (`target="_blank"`), embedded `<script>` inside the `.svg`/`.html` executes immediately in that storage origin.

2. **HIGH — Unvalidated URL Schemes in Support Chat Media Parser (`lib/support-utils.ts:22-34` -> `app/admin/support/AdminSupportClient.tsx:676-695` & `app/components/AiStylistChat.tsx:982-1001`)**
   - `parseMediaContent` in `lib/support-utils.ts:22-34` extracts URLs from `[IMAGE:...]` and `[VIDEO:...]` tags **without checking for `https?://`**:
   ```ts
   // lib/support-utils.ts:22-26
   text = text.replace(/\[\s*(?:IMAGE|IMG)\s*:\s*([^\]]+)\]/gi, (_, url) => {
     const clean = cleanMediaUrl(url);
     if (clean && !images.includes(clean)) images.push(clean);
     return "";
   });
   ```
   - Those extracted strings are rendered directly into `<a href={imgUrl} target="_blank">` inside `AdminSupportClient.tsx:679` and `AiStylistChat.tsx:985`.
   - Submitting `[IMAGE:javascript:...]` via unauthenticated `sendCustomerMessage` triggers a fatal React 19 client render exception whenever an admin opens that ticket in `/admin/support` (persistent Stored Denial-of-Service against the Admin Support Console, and direct Stored XSS in any non-React-19 link consumer), while `data:text/html;base64,...` or external phishing URLs render as trusted clickable attachment cards for CSKH admins.

3. **MEDIUM — Unanchored `.endsWith()` Domain Allowlist Bypass on Dispute Evidence Links (`app/actions/dispute.ts:303-311` -> `app/admin/disputes/AdminDisputesClient.tsx:310`)**
   - `app/actions/dispute.ts:311` checks `trustedDomains.some((d) => parsed.hostname.endsWith(d))` without requiring a leading dot:
   ```ts
   const trustedDomains = [
     "storage.googleapis.com", "drive.google.com", "googleusercontent.com",
     "googleapis.com", "res.cloudinary.com", "supabase.co",
   ];
   const isTrusted = trustedDomains.some((d) => parsed.hostname.endsWith(d));
   ```
   - Any attacker-owned domain ending in those suffixes (e.g., `attacker-supabase.co` or `evilgoogleapis.com`) passes validation and renders as a trusted clickable evidence link in `AdminDisputesClient.tsx:310`.

4. **MEDIUM — Incomplete `escapeHtml()` & Unescaped `innerHTML` Sinks in Vanilla JS (`js/quiz-engine.js:12-18, 158`, `public/js/quiz-engine.js:12-18, 165`, `js/navigation.js:86-146`, `public/js/navigation.js:86-146`)**
   - `escapeHtml()` in `quiz-engine.js` escapes `&`, `<`, `>` **but omits `"` (`&quot;`) and `'` (`&#39;`)**, leaving HTML attribute interpolations vulnerable to attribute breakout, while `data-tab-id="' + t.id + '"` (`line 158`) and subject card fields in `navigation.js:86-146` (`grid.innerHTML = html`) are concatenated into `innerHTML` without escaping.

## What's at risk

- **Admin Support Console Persistent Crash & Phishing/Script Execution**: Any anonymous visitor can send a crafted `[IMAGE:...]` support message that either crashes `/admin/support` on click or lures an admin into opening a malicious `data:` / `.svg` / phishing payload.
- **DOM XSS in TDV Frontend**: Any dynamic/database-sourced quiz category or subject metadata containing `"` or `<img onerror=...>` injected into `navigation.js` / `quiz-engine.js` `innerHTML` executes arbitrary JavaScript in the user's browser (stealing `localStorage` data and non-`HttpOnly` Supabase auth cookies).

## What's already secure

- **React JSX Autoescaping Across Storefront & Dashboard**: Only a single `dangerouslySetInnerHTML` exists in the entire React codebase (`app/layout.tsx:86-100`), and it renders a 100% static hardcoded script literal with zero user input.
- **Safe Integer Interpolation in `middleware.ts` & `mailer.js`**: `middleware.ts:118-140` (`429` HTML page) and `api/lib/mailer.js:30` interpolate only server-computed integers (`resetSec` and 6-digit `otpCode`).

## Recommendations

1. **Enforce strict `https:` + anchored hostname validation on all rendered media/evidence links**:
   - In `lib/support-utils.ts` (`cleanMediaUrl` / `parseMediaContent`), parse candidate URLs with `new URL()`, require `parsed.protocol === "https:"`, and restrict hostnames via exact or dot-anchored matching (`parsed.hostname === d || parsed.hostname.endsWith("." + d)`).
   - Fix `app/actions/dispute.ts:311` to use `parsed.hostname === d || parsed.hostname.endsWith("." + d)` and require `parsed.protocol === "https:"`.
2. **Block `.svg` and `.html` uploads at ingestion**: Enforce binary magic-byte validation (`JPEG`/`PNG`/`WEBP`/`MP4`/`WEBM` only) across all upload routes (`FILE_UPLOADS_PLAN.md`) so active HTML/SVG documents can never be hosted on CLOOP storage buckets.
3. **Fix `escapeHtml()` & eliminate raw `innerHTML` in `js/` and `public/js/`**: Add `.replace(/"/g, '&quot;').replace(/'/g, '&#39;')` to `escapeHtml()`, wrap every interpolated field (including `t.id` and all `navigation.js` subject fields) in `escapeHtml()`—or build DOM nodes safely using `document.createElement` and `textContent`. Install `dompurify` (`isomorphic-dompurify`) if rich HTML rendering is ever introduced.
