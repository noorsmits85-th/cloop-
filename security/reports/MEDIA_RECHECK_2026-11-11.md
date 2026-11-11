# Media/Supabase remediation recheck

Date: 2026-11-11, Asia/Saigon. Current workspace database inspected read-only; no application files or DB/cloud permissions changed. Evidence: security/media-recheck-metadata-2026-11-11.json plus refreshed lockdown-metadata-result.json. This is a scoped follow-up, not proof of all deployed behavior.

## Verified improvements

- 28 public base tables retain RLS/FORCE RLS.
- Both compatibility views have security_invoker=true and security_barrier=true; anon INSERT/UPDATE/DELETE are false; no anon/authenticated column INSERT/UPDATE grants returned.
- Storage policy set now contains only SELECT for products/cloop-media; no public write policy remains. Both public image buckets exist with 10MiB/image MIME limits; cloop-disputes-private exists, public=false, 100MiB/media allowlist.
- Inspected internal fn_* functions no longer grant anon EXECUTE.
- Image fallbacks now return actual provider, parse dimensions, and set provider timeouts. Timeout wrappers do not necessarily cancel the underlying upload; orphan files may still require cleanup.
- New evidence SEALs bind rental/uploader/provider/reference/MIME/size/checksum, fail closed without secret, and new stream endpoint checks logged-in user, dispute parties and exact membership in dispute.images.
- Dashboard now attempts GCS with required headers, has Drive chunk/retry/finalization and consistent UI limits. These are substantive changes.
- TypeScript exited 0; existing action suite passed 82/82. No real Google upload/playback/ACL mutation was executed.

## HIGH — Actual dashboard complaint action still accepts fake video URLs

The hardened createDispute in app/actions/dispute.ts is not the only entry point. OrdersClient imports/calls raiseDisputeWithProposalAction from app/(dashboard)/my-closet/orders/actions.ts (import line 8, call around 902).

That action permits any HTTPS or relative URL (lines 386-395), accepts video via isEvidenceVideo substring checks including #video (351-365, 438-439), and stores the submitted list directly (474). rejectAndEscalateDisputeAction also uses the old predicate for renter counter-evidence (860). It does not verify evidence SEAL, storage ownership, or file existence.

Reproduced by executing the actual transpiled dashboard module with isolated authenticated-owner/paid-rental fixtures: https://example.invalid/not-a-video#video was stored in a newly created dispute proposing 10,000 deduction. No real dispute/database write occurred. This is an evidence-validation bypass; automatic financial theft was not demonstrated. The new tests exercise createDispute, not this active dashboard path.

Fix: route every complaint/counter-evidence write through one shared authorization/finalization service. Add tests calling the exact dashboard actions with fake, cross-order and cross-uploader evidence. Ensure the GCS key returned by the new uploader is accepted only after server verification by this same service; the old action currently also rejects that raw disputes/... key, causing an integration failure for successful GCS uploads.

## HIGH — Drive privacy enforcement silently succeeds when Google refuses it

src/services/googleDriveStorage.ts:133-160: ensureDriveFilePrivate returns normally if token is missing, permission listing fails, deletion fails, or an exception is thrown. It ignores DELETE HTTP status, only considers type=anyone, and does not verify resulting ACL or inherited/domain access.

drive-resumable PUT awaits this void helper and then signs evidence as private. Actual helper execution with mocked Google API listing anyone permission and returning HTTP 403 on DELETE resolved successfully. Thus a public file can still receive a private-evidence SEAL when the ACL operation fails. Live Drive folder inheritance was not inspected.

Fix: return verified privacy evidence or throw on any failure, reject/sequester files if privacy cannot be established, and handle inherited sharing through a dedicated restricted parent/location. Explicitly define permitted principals; validate domain/inherited sharing and recheck final ACL. Do not remove others' permissions during a read-only audit.

## MEDIUM — Signed checksum/generation does not lock retrieved evidence bytes

The SEAL includes checksumOrGeneration, but evidence-stream never compares it with live object metadata or uses it to request a fixed revision. Drive fetches /files/{id}?alt=media, GCS signs a read of the bare object name, and Supabase downloads the current path. GCS verification collects generation but does not apply a write precondition or copy evidence to immutable storage; its still-valid PUT URL can overwrite the same object. The signed token remains valid while the stream can return later content. This does not show unauthorized users can edit files; it means integrity against later mutation is not enforced as claimed.

Fix: finalize to an immutable evidence object or bind reads to the verified generation/revision; verify hashes as appropriate and set retention/write restrictions. Require genuine generation/hash values instead of fallback strings such as "verified" or fileId. Test overwrite-after-finalization and stale-generation reads with isolated cloud fixtures.

## MEDIUM — Stream endpoint is not uniformly streaming/range-capable

app/api/disputes/evidence-stream/route.ts:
- Drive proxies Range/stream as intended, but no timeout/cancellation/renewal behavior is demonstrated. App functions now carry the video bandwidth/duration rather than only upload authorization.
- Supabase branch calls download, then arrayBuffer and returns entire object with status 200; it ignores Range. Up to 100MiB is buffered per request and byte-range seeking/resume is not implemented for this provider.
- GCS branch redirects to a signed cloud URL rather than streaming same-origin. That can work with current storage.googleapis.com CSP, but the claim that every provider streams under self with Accept-Ranges is inaccurate.

Fix: implement bounded Range forwarding for private Supabase objects and propagate Content-Range/206/416; avoid buffering whole evidence files. Test initial play, seeking, 15-minute expiry renewal, interrupted connections and multiple viewers against actual staging/storage. Provider/platform transfer limits were not independently checked in this run.

## Functional mismatch — Blog policy uses PUBLISHED while application writes PUBLIC

Live view definition/policy filters BlogPost.status='PUBLISHED'. app/actions/blog.ts creates/publishes entries as PUBLIC (lines 125,150,285), and closet logic also reads PUBLIC. Therefore the new public view can hide legitimate currently published app articles. The absence of nonpublic rows alone is not a sufficient positive test: verify a real intended public fixture is visible and a draft is not. Align to the actual status contract without weakening draft/deleted filtering.

## Remaining acceptance checks

Use staging/isolated fixtures for actual cloud upload/finalize/stream, ACL failure, object replacement, private nonparty access, range playback and provider outages. Mock tests alone do not prove CORS, credentials, Drive inheritance, Google account storage ownership/quota, deployed timeouts or backup/restore. The live Supabase grant fixes are confirmed for the configured project; Google privacy and complete evidence workflow are not ready to be described as fully verified.
