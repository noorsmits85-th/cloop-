# Supabase access and media/evidence storage audit

Date: 2026-11-11, Asia/Saigon. Read-only inspection of the database configured by this workspace, current source, and local configuration presence. No cloud/database configuration was changed, no files uploaded/deleted, no real user content printed. The database may differ from a deployment using other environment settings.

## Outcome

CRITICAL: table RLS is enabled, but public compatibility views and storage.objects policies leave alternate access paths. Product image upload has validation but fallback configuration is incomplete. Dispute video storage mixes Google Drive/public-media paths with a separate private GCS implementation, and has concrete confidentiality, playback, and recovery gaps.

## Live metadata evidence

- `security/lockdown-metadata-result.json`: refreshed metadata, 2026-11-11T02:20:40Z. 28 public base tables all have RLS and FORCE RLS. No anon/authenticated table-level INSERT/UPDATE/DELETE grants on those tables; selected sensitive User/product/coin columns are not readable/updatable by these roles.
- `security/storage-access-metadata-2026-11-11.json`: column privileges, storage policies/buckets, executable public functions, and views.
- `security/view-metadata-2026-11-11.json`: actual public view definitions/owners and privileges.
- `security/anon-access-proof-2026-11-11.json`: role-anon boolean read probe plus effective storage/view privileges. No private blog text or actual image data selected.

Initial sandbox connection failed; the approved metadata-only network retry succeeded. Queries ran in READ ONLY transactions, including the SET LOCAL ROLE anon probe.

## CRITICAL — Public views bypass the intended table boundary

`public.blog_posts` and `public.product_images` are views owned by postgres with reloptions=null (no security_invoker option). Each is a direct unfiltered SELECT of its source BlogPost/ProductImage table. Both anon and authenticated have SELECT/INSERT/UPDATE privileges; anon also has DELETE. Column-grant inspection confirms write exposure as well.

Role anon read probe returned anon_can_read_nonpublic_blog=true. Thus private/deleted/nonpublic blog visibility is not merely theoretical: existence of a nonpublic/deleted record was visible through the view. View definitions have no ownership or publication predicate. Postgres-owned default views can use owner privileges against underlying tables; base-table FORCE RLS does not make a postgres/superuser-owned view safe. Write exploitability is supported by the effective privileges and simple updatable view definitions; no write/delete attack was executed, and underlying constraints/triggers may reject particular payloads.

Remediation priority: revoke anon/authenticated/PUBLIC writes on both views, including any independent column grants. If browser catalog reads are still necessary, expose explicit safe read projections with publication/visibility checks and suitable security-invoker/RLS behavior, or route them through the existing server API. Do not grant all base-table columns just to make the views work. Audit future migrations and aliases, not only ordinary tables.

`Listing` also has table SELECT with snapshot JSON exposed, and its policy allows any nondeleted status except HIDDEN without checking the parent product. Review snapshot contents and whether reserved/sold/private-parent listings should be public; no snapshot row contents were read in this audit.

## CRITICAL — products Storage bucket grants unauthenticated write/delete

Only one Supabase bucket exists in this database: products, public=true, file_size_limit=null, allowed_mime_types=null.

Four storage.objects policies target role PUBLIC for SELECT/INSERT/UPDATE/DELETE. Each tests only bucket_id='products'; none requires authentication, owner_id, or a user-prefixed path. The friendly policy name mentions JPG, but the actual SQL does not restrict MIME or extension. Effective grants on storage.objects confirm anon/authenticated can SELECT/INSERT/UPDATE/DELETE.

An anonymous Storage caller therefore has policy-level permission to insert, modify or delete objects in the products bucket, subject to normal Storage API mechanics. This is separate from RLS on the 28 application tables. No object mutation or deletion was attempted. Public image reads can be intentional; public image mutation is not.

Remediation: keep public reads only if products are public catalog assets; replace PUBLIC write policies with authenticated owner/path-scoped rules, or disallow all browser writes if the backend exclusively uploads with service role. Set explicit image MIME allowlist and size cap; keep service-role upload validation server-side. Protect existing images while changing policies; do not delete the bucket/data.

## Intended Supabase access matrix

| Resource | anon | authenticated user | backend/admin |
| --- | --- | --- | --- |
| Public product catalog | Safe public columns/visible rows only, if required | Same public projection | Authenticated ownership checks for changes |
| Public product images | Read intentionally public objects | Create/change/delete own files only, or use backend exclusively | Service role scoped by validated application logic |
| Orders/invoices/wallet/ledgers/withdrawals/identity/audit | No direct access | Own data through server APIs; never client changes to balances/roles/payment status | Authentication, authorization, validation, atomic settlement and audit |
| Published reviews/blog | Safe published fields only | Own-content mutation through validated action or ownership RLS | Moderation/admin permissions |
| Dispute videos/support attachments | None | Authorized order/dispute parties, short-lived private read access | Authorized review; no public-anyone permissions |
| RPC/functions | Explicitly required safe functions only | Explicitly required authorized functions only | Internal operations not exposed to browser roles |

One executable SECURITY DEFINER function surfaced: fn_auto_enable_rls_on_new_table (event-trigger related). Do not assume every executable extension function is a financial RPC; review callable application functions and revoke unnecessary EXECUTE, particularly on privileged functions. No arbitrary-RPC exploit was established here.

## Image uploads

Positive: `/api/upload` requires requireUser; upload-image validates magic bytes, image size up to 10MB, generated UUID filenames and allowed folders. It rejects executable/HTML/SVG signatures and uses server credentials. Middleware has API auth/rate-limit defenses. These controls do not apply to direct anonymous Supabase Storage access described above.

Concrete availability gaps:

1. Local Cloudinary configuration is present, but GCP_PUBLIC_MEDIA_BUCKET and GCP-specific credentials are absent. The GCS fallback returns null without a public bucket. ADC/environment-specific configuration was not validated.
2. Supabase fallback writes bucket cloop-media; live metadata lists only products. Therefore this fallback cannot succeed against the inspected project as configured. Do not redirect sensitive evidence to a public bucket to conceal this error.
3. Fallback results always claim storageProvider='cloudinary', including GCS/Supabase results (`src/lib/upload-image.ts`). If future cleanup/transformation uses this field it may call the wrong provider; dimensions are also hardcoded rather than measured in fallback paths.
4. `/api/upload` accepts 10MB and `/api/upload-drive` 15MB through request.formData, i.e. through the application function. Repository comments themselves acknowledge a 4.5MB Vercel request limit. If deployed under that platform limit, files above the gateway cap fail before route-level limits/fallback run. Live provider docs could not be fetched in this session (web gateway returned 404); hosting limit was not independently reverified.
5. No explicit per-provider timeout/abort in upload-image fallback chain; a stalled provider can delay fallback until request/platform timeout. Provider SDK defaults may exist but there is no application end-to-end deadline or durable retry job demonstrated.

## Dispute video storage: actual Drive path differs from private GCS path

The active dashboard uploader is `OrdersClient.tsx:201-322`:
1. Requests `/api/storage/drive-resumable` and uploads with one XHR PUT.
2. Tries `/api/storage/webhook-dispatcher` for Apps Script.
3. Falls back to `/api/upload-drive`.

The private GCS signed upload endpoint `/api/disputes/upload-url` exists, checks order ownership, and creates server-chosen keys, but no UI caller was found. The active Drive route does not receive rentalId or require order-specific ownership; any logged-in user with an allowed Origin can request uploads into the central folder. Origin is not an authorization boundary against Python/scripts; those headers can be supplied by a nonbrowser client. Global rate limits do not replace per-user byte quotas/order ownership.

### HIGH — Evidence confidentiality/integrity is not end-to-end

- `/api/upload-drive` always sets isPublic:true. googleDriveStorage can grant anyone/reader. Its Supabase fallback also returns a public URL. If these are used for dispute media, anyone with the resulting link can access evidence outside the app's dispute authorization. Apps Script server implementation was not available to audit; its privacy/auth behavior is unknown.
- Resumable Drive initialization does not set explicit per-party read permissions or finalize/verify ownership afterward. A private folder may make the resulting preview inaccessible to the other party/admin; an inherited public folder may expose evidence. Live Drive folder ACLs were not queried.
- `createDispute` stores arbitrary https URLs and recognizes an unboxing video by strings such as #video or drive.google.com/file (`app/actions/dispute.ts:93-108`, `168`). A fake URL ending #video can satisfy that syntactic guard; neither existence, real video bytes nor uploader ownership is verified in this action. This opens a complaint-evidence bypass, not automatic financial settlement: admin settlement checks still apply.
- `verifyUploadedDisputeFile` validates object prefix, metadata size/type for GCS, but it has no caller in the actual dispute action. Metadata Content-Type alone is not a byte-level video check. Signed uploads can be overwritten during their validity unless generation/precondition/version protection is added; store the verified immutable object generation/checksum for evidence.

### Concrete playback and interruption bugs

- Resumable client returns `https://drive.google.com/file/d/{id}/preview#video`; AdminDisputesClient renders recognized videos as `<video src={url}>`. A Drive preview page is an HTML player URL, not the raw video stream.
- middleware/next.config CSP media-src excludes Drive/googleusercontent; frame-src excludes drive.google.com. Therefore current policy does not support either embedding path as written. Do not fix this by broadly allowing all origins; use private media and narrowly scoped delivery.
- UI allows files through 200MB (`OrdersClient.tsx:333`), but resumable route caps 100MB and final server fallback caps 15MB. The middle Apps Script fallback is admin-only (`webhook-dispatcher` requires requireAdmin), so ordinary users cannot use it. Files between 100–200MB have no supported route in this flow.
- Although the API initiates a resumable session, client performs one whole-file PUT without persisted upload offset/session, chunk retry, status query, timeout or onabort/ontimeout handling. A broken mobile connection can require a restart; it does not implement effective resumable recovery.
- Local GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN are absent, so the first route returns 503 locally. GOOGLE_CLIENT_EMAIL/PRIVATE_KEY, Drive folder and two Apps Script URLs exist, but presence is not proof of valid credentials/quota/permissions. Production settings were not read.
- Apps Script uploads expand video into base64 and send redundant data/base64 fields in browser fallback; large payloads increase memory/network cost. There are no explicit deadlines or idempotent upload jobs, so retries can create orphan/duplicate files.
- `/api/disputes/upload-url` signs x-goog metadata headers but returns no explicit requiredHeaders object; a future client must send every signed extension header or GCS can reject the PUT. Browser CORS/bucket IAM remain unverified.

## Will Google storage go down?

No external storage can guarantee zero interruptions. Current app-level failure/recovery/privacy gaps are already sufficient to disrupt uploads/playback even while Google is healthy. Two folders/accounts labeled 5TB are capacity, not evidence of automatic failover, independent disaster recovery or backups. Google Drive/Apps Script, Google Cloud Storage and Supabase Storage are different services with different credentials/permissions; current fallback chains mix them without verified end-to-end recovery.

Recommended target: keep public product images on Cloudinary/public media with correct provider metadata; use one private evidence object store (the existing GCS design can be adapted) with direct resumable uploads, order-scoped tickets, expiry/byte quotas, server-side finalization, checksum/generation lock, and authorized short-lived downloads. Add retries/deadlines, upload status, orphan cleanup and a tested retention/backup policy. Store object keys and durable evidence metadata rather than public Drive preview URLs. Verify Google bucket IAM, public access prevention, CORS, version/retention settings and service-account least privilege before switching.

## Priority and limits

1. Close anonymous write/delete access on views and products Storage immediately; preserve all existing data.
2. Remove public sharing of private evidence; make finalization prove the file belongs to the authorized order/uploader.
3. Fix playable delivery/CSP and align actual file limits; repair fallback configuration.
4. Test real small image/video, a large video, interrupted/retried upload, unauthorized read/delete, expired session and provider outage on isolated staging fixtures. No such upload/destructive probes were executed during this read-only review.

No SQL remediation was executed. Database/schema/storage IAM changes require a concrete reviewed migration and staging verification. Read-only inspection establishes live grants/policies and anonymous nonpublic-view visibility, but not all cloud-runtime behavior. GCS IAM, Drive ACL, Apps Script deployment code, Vercel settings and backup restore were not available or exercised. Web documentation lookup was attempted twice and failed at the tool gateway; no claim of current provider quota/SLA verification is made.
