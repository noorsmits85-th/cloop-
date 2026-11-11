# FILE_UPLOADS Fix Plan

## Changes

- `src/lib/server-image-guard.ts` — Add `validateBinaryMediaBuffer(buffer: Buffer, options)` that inspects magic bytes for JPEG (`FF D8 FF`), PNG (`89 50 4E 47 0D 0A 1A 0A`), WEBP (`RIFF....WEBP`), and (optionally for dispute/chat evidence) MP4 (`ftyp`) / WEBM (`1A 45 DF A3`), returning the canonical `{ mimeType, extension }` and rejecting `.svg`, `.html`, `.js`, PDFs, and executables.
- `app/api/upload/route.ts` — Enforce `requireUser()`; validate `folder` against an explicit enum (`cloop_products`, `outfits`, `avatars`, `reviews`); reject files exceeding `10 MB` before buffering.
- `src/lib/upload-image.ts` — Remove `type.startsWith("image/")` and client-extension trust; validate `buffer` with `validateBinaryMediaBuffer`; generate object keys strictly via `${allowedFolder}/${crypto.randomUUID()}.${canonicalExt}`; set `contentType: canonicalMimeType` and `upsert: false` on Supabase Storage.
- `app/api/upload-drive/route.ts` — Enforce `requireUser()`; enforce a `15 MB` server-side file size limit before `file.arrayBuffer()`; validate magic bytes with `validateBinaryMediaBuffer`; rename stored objects to `${crypto.randomUUID()}.${canonicalExt}` with `upsert: false` and canonical `contentType`.
- `app/api/storage/drive-resumable/route.ts` — Enforce a strict allowlist of `mimeType` (`image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `video/webm`, `video/quicktime`), cap `fileSize` at `100 * 1024 * 1024` (100 MB), and replace user-supplied filenames with `CLOOP_Evidence_${crypto.randomUUID()}.${canonicalExt}`.
- `app/api/disputes/upload-url/route.ts` & `src/services/gcsStorage.ts` — Replace `ct.startsWith("image/")` in Zod schema with explicit MIME enum (`image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `video/webm`, `video/quicktime`); add `extensionHeaders: { "x-goog-content-length-range": \`0,${maxSizeBytes}\` }` to `file.getSignedUrl`; invoke `verifyUploadedDisputeFile` when recording dispute evidence; change `uploadImageToGCS` to use `process.env.GCP_PUBLIC_MEDIA_BUCKET` (never `"cloop-disputes"`).
- `next.config.ts` — Reduce `experimental.serverActions.bodySizeLimit` from `"50mb"` to `"12mb"` (large videos already use direct GCS/Drive signed resumable URLs).

## New files

- `tests/upload-security.test.ts` — Unit tests verifying magic-byte detection, `.svg` / `.html` / spoofed-MIME rejection, folder allowlist enforcement, UUID filename generation, and size limit rejection.

## Verification goals

After implementation, ALL of these must be true:

- [ ] Unauthenticated requests to `POST /api/upload`, `POST /api/upload-drive`, `POST /api/storage/drive-resumable`, and `POST /api/disputes/upload-url` return `401`.
- [ ] File type is validated by server-side magic bytes on all direct upload routes, not client `Content-Type` or filename extension; uploading an `.svg` or `.html` renamed to `.png` is rejected with `400`.
- [ ] All uploaded files are renamed server-side using `crypto.randomUUID()` with a canonical extension derived from magic bytes and `upsert: false`.
- [ ] Files are stored on dedicated external storage domains/buckets (Cloudinary, Supabase Storage `cloop-media`, GCS), with private dispute evidence strictly isolated in private GCS bucket `cloop-disputes` (never shared with public uploads).
- [ ] Server-side size limits (`10 MB` images, `100 MB` signed video evidence via `x-goog-content-length-range`, `12mb` Server Action body cap) are enforced before full buffering or storage.

## Manual verification (for the human)

- Check the GCS Console for bucket `cloop-disputes` to confirm "Prevent public access" is enforced and `allUsers` / `allAuthenticatedUsers` IAM bindings do not exist.
- Audit existing objects in Supabase Storage bucket `cloop-media` (`support_chat/` and root prefixes) and remove any unexpected `.html`, `.svg`, or non-image files uploaded prior to adding authentication.
- Test uploading a valid `.jpg` product photo (`< 10 MB`), an oversized file (`> 15 MB`), and an `.svg` file on Staging to confirm valid images succeed and `.svg`/oversized uploads fail with `400`/`413`.
