# XSS Fix Plan

## Changes

- `lib/support-utils.ts` — Harden `cleanMediaUrl` and `parseMediaContent` (`lines 8-60`) using `new URL(candidate)`: reject any URL whose `protocol !== "https:"` (blocking `javascript:`, `data:`, `vbscript:`, `blob:`, `http:`) and restrict rendered media cards to trusted storage domains using exact or dot-anchored matching (`hostname === d || hostname.endsWith("." + d)`).
- `app/actions/Support.ts` (`app/actions/support.ts`) — Validate incoming `mediaUrls` / message `[IMAGE:...]` tags server-side with the same strict `https://` + dot-anchored storage hostname validator before saving to `SupportMessage`.
- `app/actions/dispute.ts` — Fix `line 301-311` to require `parsed.protocol === "https:"` and `trustedDomains.some((d) => parsed.hostname === d || parsed.hostname.endsWith("." + d))`.
- `js/quiz-engine.js` & `public/js/quiz-engine.js` — Add `.replace(/"/g, '&quot;').replace(/'/g, '&#39;')` to `escapeHtml()` (`lines 12-18`) and wrap `t.id` (`line 158`/`165`) and all attribute/text interpolations in `escapeHtml()`.
- `js/navigation.js` & `public/js/navigation.js` — Escape `s.id`, `s.phase`, `s.name`, `s.description`, and `s.tags[t]` via `escapeHtml()` (or refactor `grid.innerHTML` at `lines 86-146` to `document.createElement` + `textContent`).
- `app/layout.tsx` — Pass per-request CSP `nonce` to the static inline `<script>` (`lines 86-100`) so `'unsafe-inline'` can be removed from CSP `script-src`.

## New files

- `tests/xss-url-sanitization.test.ts` — Unit tests verifying that `parseMediaContent` and dispute evidence URL validators strip `javascript:`, `JaVaScRiPt:`, `data:text/html`, and `https://evilgoogleapis.com/...` while preserving valid Cloudinary/Supabase/GCS `https://` URLs.

## Verification goals

After implementation, ALL of these must be true:

- [ ] Zero `dangerouslySetInnerHTML` or `innerHTML` sinks render unsanitized user or database content.
- [ ] All user-supplied URLs rendered into `<a href>`, `<img src>`, or `<video src>` enforce `https:` protocol and dot-anchored trusted domain validation (`javascript:` and `data:` URIs are stripped at both write and render time).
- [ ] All vanilla JS `escapeHtml()` helpers escape `&`, `<`, `>`, `"`, and `'`, and every attribute interpolation is quoted and escaped.
- [ ] `.svg` and `.html` uploads are rejected server-side via magic-byte checks so Stored XSS cannot be hosted on CLOOP storage buckets.

## Manual verification (for the human)

- Run `npx tsx tests/xss-url-sanitization.test.ts` locally and confirm all malicious scheme and domain-suffix test cases are rejected.
- Send a test support chat message containing a valid Cloudinary image and verify it renders normally in `/admin/support`, while non-HTTPS `[IMAGE:...]` strings render safely as inert plain text without crashing React 19.
