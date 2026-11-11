# FILE_UPLOADS Security Report

## Status: CRITICAL

## Findings

CLOOP exposes multiple file upload endpoints and Server Actions across Cloudinary, Google Cloud Storage (GCS), Google Drive, and Supabase Storage (`cloop-media`), with a global `experimental.serverActions.bodySizeLimit: "50mb"` in `next.config.ts:10-13`. Only one endpoint (`/api/visual-search`) validates magic bytes; the main upload endpoints allow unauthenticated uploads, `.svg`/`.html` Stored XSS, path traversal in storage keys, and unbounded memory buffering.

1. **CRITICAL — Unauthenticated Arbitrary File Upload & Stored XSS (`app/api/upload-drive/route.ts:6-67`)**
   - Requires **zero authentication**, enforces **zero file size limit**, and performs **zero MIME type, extension, or magic-byte validation**.
   - Buffers the entire uploaded file into Lambda RAM (`await file.arrayBuffer()` + Base64 encoding).
   - Uploads files to a public Google Drive folder (`role: "reader", type: "anyone"`) and falls back to the **public** Supabase Storage bucket `cloop-media` while preserving the client-supplied `file.type` and sanitized filename (`upsert: true`):
   ```ts
   // app/api/upload-drive/route.ts:47-55
   const filePath = `support_chat/${Date.now()}_${sanitizedFileName}`;
   const { error: supaError } = await supabaseAdmin.storage
     .from("cloop-media")
     .upload(filePath, buffer, {
       contentType: file.type || "application/octet-stream",
       upsert: true,
     });
   ```

2. **CRITICAL — Unauthenticated Upload, `.svg` Stored XSS & `folder` Path Traversal (`app/api/upload/route.ts:8-22` & `src/lib/upload-image.ts:26-38, 102-111`)**
   - `POST /api/upload` has **no authentication check** and passes client-controlled `formData.get("folder")` directly into `uploadImageFile(file, folder)`.
   - `src/lib/upload-image.ts:31` checks `!ALLOWED_IMAGE_TYPES.has(type) && !isAllowedExt && !type.startsWith("image/")` without inspecting magic bytes:
     - `type.startsWith("image/")` explicitly permits `image/svg+xml` (`.svg` files containing embedded `<script>` tags execute JavaScript when opened directly from the public Supabase Storage / GCS URL).
     - Spoofing `Content-Type: image/png` bypasses the check for arbitrary binary or HTML payloads.
   - `src/lib/upload-image.ts:102` constructs `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}` without sanitizing `folder` against `../` or arbitrary prefix injection, uses predictable `Math.random()` instead of `crypto.randomUUID()`, and sets `upsert: true` on public bucket `cloop-media`.

3. **HIGH — GCS Signed URL Missing Size Enforcement & Private/Public Bucket Mixing (`app/api/disputes/upload-url/route.ts` & `src/services/gcsStorage.ts:61-86, 191-209`)**
   - `generateDisputeUploadSignedUrl` computes `maxSizeBytes` (100 MB for video, 10 MB for image at `line 61`), **but omits `x-goog-content-length-range` from the signed URL parameters** (`lines 76-86`), allowing an authenticated user to upload multi-gigabyte blobs directly to GCS via the signed PUT URL.
   - `upload-url/route.ts:17` allows any `contentType` starting with `image/` (including `image/svg+xml`), and `verifyUploadedDisputeFile` in `gcsStorage.ts` is never called after upload.
   - `uploadImageToGCS` (`gcsStorage.ts:191`) defaults to `process.env.GCP_STORAGE_BUCKET || "cloop-disputes"` and serves public URLs from it (`line 208`), mixing public product fallback images into the same bucket intended for private dispute evidence.

4. **HIGH — Uncapped Resumable Drive Upload & Unauthenticated AI Upload Routes**
   - `POST /api/storage/drive-resumable` (`app/api/storage/drive-resumable/route.ts:12-90`) authenticates the user, but imposes **no maximum `fileSize` cap** and **no MIME allowlist**, passing arbitrary client `mimeType` to Google Drive (`X-Upload-Content-Type`) and preserving user extensions.
   - `createMobileProductAction` (`app/actions/product.ts:116`) accepts unauthenticated `clientUserId` and arbitrary external `imageUrls`.
   - Base64 upload endpoints `/api/ai-autofill`, `/api/ai-suggest`, `/api/analyze-fit`, `/api/stylist`, and `/api/voice-transcribe` require no authentication and (unlike `/api/visual-search`) do not run magic-byte validation via `parseSafeBase64Image`.

## What's at risk

- **Stored XSS & Phishing Hosting on Trusted Storage Origins**: Any anonymous attacker can upload `.html` or `.svg` files containing malicious JavaScript to `POST /api/upload-drive` or `POST /api/upload`, obtaining a legitimate `*.supabase.co/storage/v1/object/public/cloop-media/...` or Google Drive link to phish CLOOP users or steal tokens.
- **Storage Quota Exhaustion, Cost Spike & Serverless DoS**: Unauthenticated callers can flood Cloudinary, GCS, Supabase Storage, and 5TB Google Drive, or crash Vercel Serverless Functions via unbounded `arrayBuffer()` memory allocation in `/api/upload-drive` and `50mb` `bodySizeLimit` Server Actions.
- **Dispute Evidence Bucket Pollution**: Sharing `"cloop-disputes"` as a fallback public image bucket risks accidental public ACL exposure of sensitive dispute videos/photos.

## What's already secure

- **Magic-Byte Validation Helper Exists (`src/lib/server-image-guard.ts:10-71`)**: `parseSafeBase64Image` properly inspects raw buffer magic bytes for JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), and WEBP (`RIFF....WEBP`) and enforces a 5 MB cap in `POST /api/visual-search` (`app/api/visual-search/route.ts:56`).
- **Dispute Signed URL Authorization & UUID Naming (`app/api/disputes/upload-url/route.ts:28-55` & `src/services/gcsStorage.ts:64`)**: Authenticates caller via `requireUser()`, verifies rental participant/admin authorization in DB, renames files using `crypto.randomUUID()`, and serves dispute read URLs via short-lived 15-minute V4 Signed URLs (`app/actions/dispute.ts:257-322`).

## Recommendations

1. **Require authentication (`requireUser()`) on every upload and AI media endpoint**: Protect `POST /api/upload`, `POST /api/upload-drive`, and all `/api/ai-*`, `/api/analyze-fit`, `/api/stylist`, and `/api/voice-transcribe` routes.
2. **Enforce strict server-side magic-byte validation & block active content**: Inspect buffer header bytes on all uploads (extending `src/lib/server-image-guard.ts` to `Buffer`/`File` inputs for JPEG, PNG, WEBP, GIF, and MP4/WEBM where needed). Remove `type.startsWith("image/")` so `image/svg+xml`, `text/html`, `application/javascript`, and executables are unconditionally rejected, and derive the outgoing `Content-Type` and file extension strictly from the detected magic bytes.
3. **Rename all uploaded files to `crypto.randomUUID()` & allowlist folders**: Replace `file.name` and `Math.random()` with `crypto.randomUUID()`, set `upsert: false`, and validate `folder` against a strict static allowlist (`["cloop_products", "outfits", "avatars", "support_chat"]`).
4. **Enforce hard server-side size limits everywhere**: Cap image uploads at `10 MB` (check `content-length` and `file.size` before `file.arrayBuffer()`), cap `drive-resumable` video evidence at `100 MB`, lower `next.config.ts` `bodySizeLimit` from `"50mb"` to `"12mb"`, and enforce `extensionHeaders: { "x-goog-content-length-range": \`0,${maxSizeBytes}\` }` on GCS V4 signed upload URLs.
5. **Isolate private vs public storage buckets**: Never fall back to `"cloop-disputes"` for public product images (`uploadImageToGCS` must require a dedicated public bucket `GCP_PUBLIC_MEDIA_BUCKET` or fail safely), ensuring `cloop-disputes` remains 100% private.
