# SSRF Security Report

## Status: CRITICAL

## Findings

Auditing every server-side outbound HTTP request (`fetch`, `axios`, SDK calls) across `app/`, `src/`, `lib/`, and `api/` confirmed that **zero SSRF validation utilities exist in the codebase**, while two unauthenticated API endpoints and two product-creation Server Actions perform raw server-side `fetch()` calls against user-supplied URLs.

1. **CRITICAL — Unauthenticated Full-Read SSRF in `POST /api/analyze-fit` (`app/api/analyze-fit/route.ts:7-28`)**
   - Unauthenticated endpoint (`middleware.ts` skips `/api/analyze-fit` and the handler has no auth check) that calls `fetch(productImageUrl)` directly on raw client JSON input with no scheme check, no hostname allowlist, no private/loopback/metadata IP block, no timeout, no byte-size limit, and default `redirect: "follow"`:
   ```ts
   // app/api/analyze-fit/route.ts:8-17
   const { userImageBase64, productImageUrl } = await req.json();
   if (!userImageBase64 || !productImageUrl) {
     return NextResponse.json({ error: "Thiếu dữ liệu hình ảnh" }, { status: 400 });
   }
   const productRes = await fetch(productImageUrl);
   const productArrayBuffer = await productRes.arrayBuffer();
   const productBase64 = Buffer.from(productArrayBuffer).toString("base64");
   ```

2. **CRITICAL — Unauthenticated SSRF + HTTP Status/Content Oracle in `POST /api/moderate-image` (`app/api/moderate-image/route.ts:7-28` & `src/services/imageModeration.ts:65-95`)**
   - Unauthenticated endpoint validating `imageUrl` only with `z.string().url()` (which permits `http://127.0.0.1:...`, `http://169.254.169.254/...`, `http://[::1]/...`, and arbitrary internal hosts), fetching `imageUrl` server-side (`imageModeration.ts:66`), and returning the raw `auditDetails.reason` (including `Image fetch HTTP error ${response.status}` and Gemini's description of the response) directly in the JSON response (`route.ts:27`).

3. **HIGH — Server-Side Fetching of Arbitrary Image URLs in Product Creation Actions (`app/(dashboard)/my-closet/create/actions.ts:26-27, 61-63` & `app/actions/product.ts:305-307` -> `src/services/autoTagging.ts:11-18`)**
   - `my-closet/create/actions.ts:61` passes `validated.uploadedImages[0].url` (`z.string().url()`) to `moderateProductImage(url)` without checking that the URL belongs to CLOOP's media storage hosts.
   - `app/actions/product.ts:306` (which currently also allows unauthenticated calls via `product.userId` fallback) passes `uploadedImageUrls[0]` into `autoTagProductBackground`, where `src/services/autoTagging.ts:13` executes `const imgRes = await fetch(imageUrl);` with no host allowlist, IP check, timeout, or size cap.

## What's at risk

- **Cloud Metadata & Internal Network Probing**: An anonymous attacker can force the Next.js server / container runtime to connect to cloud instance metadata services (`169.254.169.254`), internal VPC services (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), or localhost admin ports (`127.0.0.1`, `::1`), using `/api/moderate-image`'s `HTTP error ${response.status}` message as a blind port/status scanner or exfiltrating responses via Gemini analysis.
- **Serverless Memory Exhaustion (DoS)**: Pointing `productImageUrl` or `autoTagProductBackground` at an infinite/multi-gigabyte stream crashes Lambda instances via `arrayBuffer()`.

## What's already secure

- **Base64-Only AI Endpoints**: `app/api/visual-search/route.ts:56`, `app/api/ai-autofill/route.ts:44`, `app/api/ai-suggest/route.ts:50`, and `app/api/stylist/route.ts:132` accept inline Base64 buffers rather than fetching user-supplied URLs.
- **Hardcoded Shipping & Payment Upstream Hosts**: `src/lib/ghn.ts`, `src/lib/ghtk.ts`, `app/api/shipping/address/route.ts`, and `lib/payos.ts` send requests exclusively to hardcoded gateway base URLs using numeric IDs or `encodeURIComponent`.

## Recommendations

1. **Create a centralized SSRF-safe fetcher (`src/lib/ssrf-guard.ts`)**:
   - Enforce `url.protocol === "https:"` (or `http:`/`https:` strictly if non-TLS external fetches are ever required, though CLOOP media hosts are 100% `https:`).
   - Enforce an explicit exact hostname allowlist for product media fetches: `res.cloudinary.com`, `<project>.supabase.co`, `storage.googleapis.com`, `lh3.googleusercontent.com`.
   - Resolve hostnames via `dns.lookup(hostname, { all: true })` prior to connecting and block all loopback (`127.0.0.0/8`, `::1`), RFC1918 private (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local / metadata (`169.254.0.0/16`, `fe80::/10`), carrier-grade NAT (`100.64.0.0/10`), unique-local (`fc00::/7`), and `0.0.0.0/8` addresses (preventing DNS-rebinding / custom domain CNAME bypasses).
   - Set `redirect: "error"` (never follow `301`/`302` redirects to internal IPs), enforce `AbortSignal.timeout(5000)`, cap response download size at `10 MB`, and verify image magic bytes on the downloaded buffer.
2. **Require authentication & strip internal fetch diagnostics**: Require `requireUser()` on `POST /api/analyze-fit` and `POST /api/moderate-image`, look up `productId` image URLs from PostgreSQL where possible instead of accepting raw `productImageUrl` from clients, and omit `auditDetails` HTTP status codes from `/api/moderate-image` client responses.
