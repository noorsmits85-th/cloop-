import * as crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import {
  parseEvidenceIntegrityAnchor,
  verifySignedEvidenceStreamRequest,
} from "@/src/lib/dispute-evidence-seal";
import {
  generateDisputeVideoReadUrl,
  verifyUploadedDisputeFile,
} from "@/src/services/gcsStorage";
import { getDriveAccessToken } from "@/src/services/googleDriveStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RANGE_CHUNK_BYTES = 8 * 1024 * 1024; // 8 MiB bounded range chunk

function parseByteRange(
  rangeHeader: string | null,
  totalLength: number
): { hasRange: false } | { hasRange: true; valid: false } | { hasRange: true; valid: true; start: number; end: number } {
  if (!rangeHeader || !rangeHeader.trim()) {
    return { hasRange: false };
  }
  const m = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!m || totalLength <= 0) {
    return { hasRange: true, valid: false };
  }
  const rawStart = m[1];
  const rawEnd = m[2];
  if (!rawStart && !rawEnd) {
    return { hasRange: true, valid: false };
  }

  let start: number;
  let end: number;

  if (!rawStart) {
    // Suffix byte-range-spec: bytes=-500
    const suffixLength = Number(rawEnd);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return { hasRange: true, valid: false };
    }
    start = Math.max(0, totalLength - suffixLength);
    end = totalLength - 1;
  } else {
    start = Number(rawStart);
    if (!Number.isFinite(start) || start < 0 || start >= totalLength) {
      return { hasRange: true, valid: false };
    }
    if (rawEnd) {
      const parsedEnd = Number(rawEnd);
      if (!Number.isFinite(parsedEnd) || parsedEnd < start) {
        return { hasRange: true, valid: false };
      }
      end = Math.min(totalLength - 1, parsedEnd);
    } else {
      end = Math.min(totalLength - 1, start + MAX_RANGE_CHUNK_BYTES - 1);
    }
  }

  return { hasRange: true, valid: true, start, end };
}

export async function GET(request: Request) {
  try {
    let user;
    try {
      user = await requireUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const disputeId = (url.searchParams.get("disputeId") || "").trim();
    const evidenceUrl = (url.searchParams.get("evidence") || "").trim();
    const exp = Number(url.searchParams.get("exp") || "0");
    const sig = (url.searchParams.get("sig") || "").trim();

    if (!disputeId || !evidenceUrl || !exp || !sig) {
      return NextResponse.json({ error: "Missing stream parameters" }, { status: 400 });
    }

    const verified = verifySignedEvidenceStreamRequest({
      disputeId,
      evidenceUrl,
      viewerId: user.id,
      exp,
      sig,
    });

    if (!verified.valid || !verified.payload) {
      return NextResponse.json({ error: verified.error || "Forbidden" }, { status: 403 });
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        rental: {
          include: {
            product: { select: { userId: true } },
          },
        },
      },
    });

    if (!dispute || !dispute.rental) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    const isRenter = dispute.rental.renterId === user.id;
    const isOwner = dispute.rental.ownerId === user.id || dispute.rental.product?.userId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isRenter && !isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (
      verified.payload.rentalId !== dispute.rentalId ||
      !Array.isArray(dispute.images) ||
      !dispute.images.includes(evidenceUrl)
    ) {
      return NextResponse.json({ error: "Evidence does not belong to this dispute" }, { status: 403 });
    }

    const rangeHeader = request.headers.get("range");
    const { provider, objectRef, mimeType, sizeBytes, checksumOrGeneration, rentalId, uploaderId } =
      verified.payload;
    const anchor = parseEvidenceIntegrityAnchor(checksumOrGeneration);

    if (provider === "drive") {
      const accessToken = await getDriveAccessToken();
      if (!accessToken) {
        return NextResponse.json({ error: "Drive storage unavailable" }, { status: 503 });
      }

      // 1. Đối chiếu trực tiếp metadata hiện tại với mỏ neo đã ký (headRevisionId + md5Checksum + size)
      const metaController = new AbortController();
      const metaTimeout = setTimeout(() => metaController.abort(), 10000);
      const metaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(objectRef)}?supportsAllDrives=true&fields=id,size,md5Checksum,headRevisionId`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: metaController.signal,
        }
      ).finally(() => clearTimeout(metaTimeout));

      if (!metaRes.ok) {
        return NextResponse.json({ error: "Evidence object not found on Drive" }, { status: 404 });
      }

      const liveMeta = await metaRes.json();
      const liveRev = String(liveMeta?.headRevisionId || "").trim();
      const liveMd5 = String(liveMeta?.md5Checksum || "").trim().toLowerCase();
      const liveSize = Number(liveMeta?.size || 0);

      if (
        liveRev !== anchor.rev ||
        liveMd5 !== (anchor.md5 || "").toLowerCase() ||
        liveSize !== sizeBytes
      ) {
        return NextResponse.json(
          { error: "Evidence integrity mismatch: remote Drive object does not match signed revision/checksum" },
          { status: 409 }
        );
      }

      const upstreamHeaders: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
      };
      if (rangeHeader) {
        const parsedRange = parseByteRange(rangeHeader, sizeBytes);
        if (parsedRange.hasRange && !parsedRange.valid) {
          return new Response(null, {
            status: 416,
            headers: {
              "Content-Range": `bytes */${sizeBytes}`,
              "Accept-Ranges": "bytes",
              "Cache-Control": "private, no-store, max-age=0",
            },
          });
        }
        if (parsedRange.hasRange && parsedRange.valid) {
          upstreamHeaders["Range"] = `bytes=${parsedRange.start}-${parsedRange.end}`;
        }
      }

      // Đọc trực tiếp từ revision đã khóa (hoặc file đã kiểm tra khớp headRevisionId)
      const streamController = new AbortController();
      const streamTimeout = setTimeout(() => streamController.abort(), 25000);
      const driveRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(objectRef)}/revisions/${encodeURIComponent(anchor.rev)}?alt=media`,
        {
          headers: upstreamHeaders,
          signal: streamController.signal,
        }
      ).finally(() => clearTimeout(streamTimeout));

      if (!driveRes.ok && driveRes.status !== 206) {
        return NextResponse.json({ error: "Unable to stream evidence revision from Drive" }, { status: 502 });
      }

      const resHeaders = new Headers();
      resHeaders.set("Content-Type", mimeType);
      resHeaders.set("Cache-Control", "private, no-store, max-age=0");
      resHeaders.set("X-Content-Type-Options", "nosniff");
      resHeaders.set("Accept-Ranges", "bytes");

      const contentLength = driveRes.headers.get("content-length");
      if (contentLength) resHeaders.set("Content-Length", contentLength);
      const contentRange = driveRes.headers.get("content-range");
      if (contentRange) resHeaders.set("Content-Range", contentRange);

      return new Response(driveRes.body, {
        status: driveRes.status,
        headers: resHeaders,
      });
    }

    if (provider === "supabase_private") {
      const { supabaseAdmin } = await import("@/src/lib/supabase");
      if (!supabaseAdmin) {
        return NextResponse.json({ error: "Supabase storage unavailable" }, { status: 503 });
      }

      const { data, error } = await supabaseAdmin.storage
        .from("cloop-disputes-private")
        .download(objectRef);

      if (error || !data) {
        return NextResponse.json({ error: "Evidence object not found" }, { status: 404 });
      }

      const fullBuf = Buffer.from(await data.arrayBuffer());
      const actualMd5 = crypto.createHash("md5").update(fullBuf).digest("hex").toLowerCase();
      const actualSha256 = crypto.createHash("sha256").update(fullBuf).digest("hex").toLowerCase();

      if (
        fullBuf.byteLength !== sizeBytes ||
        actualMd5 !== (anchor.md5 || "").toLowerCase() ||
        actualSha256 !== (anchor.sha256 || "").toLowerCase()
      ) {
        return NextResponse.json(
          { error: "Evidence integrity mismatch: Supabase private object checksum or size changed" },
          { status: 409 }
        );
      }

      const parsedRange = parseByteRange(rangeHeader, fullBuf.byteLength);
      if (parsedRange.hasRange && !parsedRange.valid) {
        return new Response(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fullBuf.byteLength}`,
            "Accept-Ranges": "bytes",
            "Cache-Control": "private, no-store, max-age=0",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }

      if (parsedRange.hasRange && parsedRange.valid) {
        const slice = fullBuf.subarray(parsedRange.start, parsedRange.end + 1);
        return new Response(slice, {
          status: 206,
          headers: {
            "Content-Type": mimeType,
            "Content-Length": String(slice.byteLength),
            "Content-Range": `bytes ${parsedRange.start}-${parsedRange.end}/${fullBuf.byteLength}`,
            "Accept-Ranges": "bytes",
            "Cache-Control": "private, no-store, max-age=0",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }

      return new Response(fullBuf, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Length": String(fullBuf.byteLength),
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    if (provider === "gcs") {
      const gcsCheck = await verifyUploadedDisputeFile({
        objectName: objectRef,
        rentalId,
        userId: uploaderId,
      });
      if (
        !gcsCheck.isValid ||
        gcsCheck.generation !== anchor.gen ||
        gcsCheck.md5Hash !== anchor.md5 ||
        gcsCheck.size !== sizeBytes
      ) {
        return NextResponse.json(
          { error: "Evidence integrity mismatch: GCS object generation or checksum does not match seal" },
          { status: 409 }
        );
      }

      const signedReadUrl = await generateDisputeVideoReadUrl(objectRef, anchor.gen);
      return NextResponse.redirect(signedReadUrl, { status: 302 });
    }

    return NextResponse.json({ error: "Unsupported evidence provider" }, { status: 400 });
  } catch (error: unknown) {
    // TODO: integrate Sentry/LogRocket tracking for evidence stream errors
    console.error("[evidence-stream route error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
