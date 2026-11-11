# SSRF Fix Plan

## Changes

- `app/api/analyze-fit/route.ts` — Require `await requireUser()`; accept `productId` (looking up the trusted image URL from `prisma.productImage`) or validate `productImageUrl` through `fetchSafeAllowedImage(productImageUrl)` (`src/lib/ssrf-guard.ts`) with magic-byte verification and a `10 MB` cap.
- `src/services/imageModeration.ts` & `app/api/moderate-image/route.ts` — Require `await requireUser()` on `POST /api/moderate-image`; replace raw `fetch(imageUrl)` in `moderateProductImage` with `fetchSafeAllowedImage(imageUrl)`; do not expose internal `auditDetails.reason` HTTP status strings in the client JSON response.
- `src/services/autoTagging.ts` — Replace raw `fetch(imageUrl)` (`line 13`) with `fetchSafeAllowedImage(imageUrl)`.
- `app/(dashboard)/my-closet/create/actions.ts` & `lib/validations/product.ts` — Restrict `uploadedImages[].url` / `imageUrls` in Zod schemas to trusted `https://` CLOOP storage hostnames (`isAllowedMediaUrl`).

## New files

- `src/lib/ssrf-guard.ts` — Centralized URL validator and `fetchSafeAllowedImage(rawUrl)` utility enforcing `https:` scheme, strict media hostname allowlist (`res.cloudinary.com`, `notxrjsuukrrxdlboavo.supabase.co`, `storage.googleapis.com`, `lh3.googleusercontent.com`), `dns.lookup(..., { all: true })` private/loopback/link-local IPv4+IPv6 blocking (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `100.64.0.0/10`, `0.0.0.0/8`, `::1`, `fc00::/7`, `fe80::/10`, IPv4-mapped IPv6 `::ffff:...`), `redirect: "error"`, `5000ms` timeout, `10 MB` stream size limit, and JPEG/PNG/WEBP magic-byte verification.
- `tests/ssrf-guard.test.ts` — Unit tests covering loopback, RFC1918, `169.254.169.254`, IPv6 `::1` / `::ffff:127.0.0.1`, `file://` / `gopher://` schemes, untrusted domains, and `302` redirects.

## Verification goals

After implementation, ALL of these must be true:

- [ ] Every server-side `fetch()` of a user-influenced URL validates the URL via `src/lib/ssrf-guard.ts` before requesting.
- [ ] All private, loopback, link-local, and metadata IP ranges (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1`, `fc00::/7`, `fe80::/10`) are blocked after DNS resolution.
- [ ] Only `https:` URLs on allowlisted CLOOP media storage hosts are permitted (`http:` and non-HTTP schemes like `file:`, `ftp:`, `data:` are rejected).
- [ ] HTTP redirects (`redirect: "error"`) are blocked so allowlisted URLs cannot redirect to internal hosts.
- [ ] `POST /api/analyze-fit` and `POST /api/moderate-image` reject unauthenticated requests with `401` and reject disallowed URLs with `400`.

## Manual verification (for the human)

- Run `npx tsx tests/ssrf-guard.test.ts` locally to verify all private IP, metadata IP, and redirect test cases fail closed.
- On Staging, verify that AI Analyze-Fit and Product Image Moderation still function normally with genuine Cloudinary and Supabase Storage product image URLs.
