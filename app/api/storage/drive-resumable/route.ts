import * as crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { ALLOWED_ORIGINS, isAllowedOrigin } from "@/src/lib/csrf";
import { validateBinaryMediaBuffer } from "@/src/lib/server-image-guard";
import { buildSealedDisputeEvidenceUrl } from "@/src/lib/dispute-evidence-seal";
import { ensureDriveFilePrivate, getDriveAccessToken } from "@/src/services/googleDriveStorage";

export const runtime = "nodejs";

const ALLOWED_RESUMABLE_MIMES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const MAX_RESUMABLE_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_RESUMABLE_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

async function authorizeRentalParty(rentalId: string, user: { id: string; role?: string }) {
  if (!rentalId) return { ok: false as const, status: 400, error: "Thiếu mã đơn thuê (rentalId) để xác thực quyền tải bằng chứng." };

  const rental = await prisma.rentalHistory.findUnique({
    where: { id: rentalId },
    include: { product: { select: { userId: true } } },
  });

  if (!rental) {
    return { ok: false as const, status: 404, error: "Không tìm thấy đơn thuê." };
  }

  const isRenter = rental.renterId === user.id;
  const isOwner = rental.ownerId === user.id || rental.product?.userId === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isRenter && !isOwner && !isAdmin) {
    return { ok: false as const, status: 403, error: "Bạn không có quyền tải bằng chứng cho đơn thuê này." };
  }

  return { ok: true as const, rental };
}

function getValidatedOrigin(request: Request): string | null {
  const rawOrigin = request.headers.get("origin")?.trim().replace(/\/$/, "") || "";
  let cleanOrigin = rawOrigin;
  if (!cleanOrigin) {
    const referer = request.headers.get("referer");
    if (referer) {
      try {
        cleanOrigin = new URL(referer).origin;
      } catch {
        cleanOrigin = "";
      }
    }
  }
  if (!cleanOrigin || !isAllowedOrigin(cleanOrigin) || !ALLOWED_ORIGINS.includes(cleanOrigin)) {
    return null;
  }
  return cleanOrigin;
}

export async function POST(request: Request) {
  try {
    let user;
    try {
      user = await requireUser();
    } catch {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để tải lên tệp tin bằng chứng." },
        { status: 401 }
      );
    }

    const cleanOrigin = getValidatedOrigin(request);
    if (!cleanOrigin) {
      return NextResponse.json(
        { error: "Origin không được phép khởi tạo phiên tải lên." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const rentalId = typeof body?.rentalId === "string" ? body.rentalId.trim() : "";
    const mimeType = typeof body?.mimeType === "string" ? body.mimeType.trim().toLowerCase() : "";
    const fileSize = Number(body?.fileSize);

    // 🔒 Chặn IDOR & Upload chùa: Bắt buộc kiểm tra người dùng là đương sự của rentalId
    const authCheck = await authorizeRentalParty(rentalId, user);
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const ext = ALLOWED_RESUMABLE_MIMES[mimeType];
    if (!ext) {
      return NextResponse.json(
        {
          error:
            "Định dạng tệp không hợp lệ. Chỉ chấp nhận ảnh (JPG, PNG, WEBP) hoặc video (MP4, WEBM, MOV).",
        },
        { status: 415 }
      );
    }

    const isVideo = mimeType.startsWith("video/");
    const maxBytes = isVideo ? MAX_RESUMABLE_VIDEO_BYTES : MAX_RESUMABLE_IMAGE_BYTES;
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > maxBytes) {
      return NextResponse.json(
        { error: `Kích thước tệp tin không hợp lệ (tối đa ${isVideo ? "100MB" : "10MB"}).` },
        { status: 413 }
      );
    }

    const accessToken = await getDriveAccessToken();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID_5TB || process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Dịch vụ lưu trữ đám mây chưa sẵn sàng.",
          needsConfig: true,
        },
        { status: 503 }
      );
    }

    const traceId = crypto.randomUUID();
    const safeFileName = `CLOOP_Evidence_${rentalId}_${user.id}_${traceId}.${ext}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const driveInitResponse = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": mimeType,
          "X-Upload-Content-Length": String(Math.floor(fileSize)),
          Origin: cleanOrigin,
        },
        body: JSON.stringify({
          name: safeFileName,
          parents: folderId ? [folderId] : undefined,
          appProperties: {
            rentalId,
            uploaderId: user.id,
            expectedMime: mimeType,
            traceId,
          },
        }),
        signal: controller.signal,
      }
    ).finally(() => clearTimeout(timeout));

    if (!driveInitResponse.ok) {
      const initErr = await driveInitResponse.text();
      console.error("[GoogleDrive Resumable] Lỗi tạo session upload:", initErr);
      return NextResponse.json(
        { error: "Google Drive từ chối tạo phiên tải lên trực tiếp." },
        { status: 502 }
      );
    }

    const sessionUri = driveInitResponse.headers.get("location");
    if (!sessionUri) {
      return NextResponse.json(
        { error: "Không tìm thấy sessionUri từ phản hồi của Google Drive." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionUri,
      fileName: safeFileName,
      rentalId,
      isVideo,
      maxSizeBytes: maxBytes,
    });
  } catch (error: unknown) {
    // TODO: integrate Sentry/LogRocket tracking for drive-resumable errors
    console.error("[drive-resumable route error]:", error);
    return NextResponse.json(
      { error: "Lỗi máy chủ nội bộ." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/storage/drive-resumable
 * Nghiệm thu (Finalize) tệp sau khi Resumable Upload hoàn tất:
 * - Xác minh người dùng có quyền với rentalId.
 * - Kiểm tra tệp thật trên Google Drive (appProperties.rentalId, appProperties.uploaderId, size, md5Checksum).
 * - Tải 64 bytes đầu tiên để kiểm tra chữ ký nhị phân (magic bytes).
 * - Đảm bảo tệp ở chế độ RIÊNG TƯ (thu hồi mọi quyền anyone/public nếu có).
 * - Trả về chứng từ SEAL nội bộ (`https://evidence.cloop.internal/v1/object?...#video`) để lưu vào Dispute.
 */
export async function PUT(request: Request) {
  try {
    let user;
    try {
      user = await requireUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cleanOrigin = getValidatedOrigin(request);
    if (!cleanOrigin) {
      return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
    }

    const body = await request.json();
    const rentalId = typeof body?.rentalId === "string" ? body.rentalId.trim() : "";
    const fileId = typeof body?.fileId === "string" ? body.fileId.trim() : "";

    if (!rentalId || !fileId || !/^[a-zA-Z0-9_-]{10,120}$/.test(fileId)) {
      return NextResponse.json({ error: "Thông tin nghiệm thu tệp không hợp lệ." }, { status: 400 });
    }

    const authCheck = await authorizeRentalParty(rentalId, user);
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const accessToken = await getDriveAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Dịch vụ lưu trữ chưa sẵn sàng để nghiệm thu." }, { status: 503 });
    }

    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=id,name,mimeType,size,md5Checksum,headRevisionId,appProperties`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!metaRes.ok) {
      return NextResponse.json({ error: "Không tìm thấy tệp tin đã tải lên trên kho lưu trữ." }, { status: 404 });
    }

    const meta = await metaRes.json();
    const fileProps = meta?.appProperties || {};
    if (fileProps.rentalId !== rentalId || fileProps.uploaderId !== user.id) {
      return NextResponse.json(
        { error: "Tệp bằng chứng không khớp với đơn thuê hoặc người tải lên." },
        { status: 403 }
      );
    }

    const sizeBytes = Number(meta?.size || 0);
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_RESUMABLE_VIDEO_BYTES) {
      return NextResponse.json({ error: "Dung lượng tệp nghiệm thu không hợp lệ." }, { status: 413 });
    }

    const headRevisionId = typeof meta?.headRevisionId === "string" ? meta.headRevisionId.trim() : "";
    const md5Checksum = typeof meta?.md5Checksum === "string" ? meta.md5Checksum.trim().toLowerCase() : "";
    if (!/^[A-Za-z0-9_-]{6,200}$/.test(headRevisionId) || !/^[a-f0-9]{32}$/.test(md5Checksum)) {
      return NextResponse.json(
        { error: "Tệp trên Google Drive thiếu mỏ neo toàn vẹn (headRevisionId hoặc md5Checksum)." },
        { status: 422 }
      );
    }

    // Kiểm tra 64 bytes đầu tiên để xác thực magic bytes
    const headRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Range: `bytes=0-${Math.min(sizeBytes - 1, 63)}`,
        },
      }
    );

    if (!headRes.ok) {
      return NextResponse.json({ error: "Không thể đọc dữ liệu tệp để kiểm tra chữ ký nhị phân." }, { status: 502 });
    }

    const headBuf = Buffer.from(await headRes.arrayBuffer());
    let canonicalMimeType: string;
    try {
      const detected = validateBinaryMediaBuffer(headBuf, {
        allowVideo: true,
        maxBytes: MAX_RESUMABLE_VIDEO_BYTES,
      });
      canonicalMimeType = detected.mimeType;
    } catch {
      return NextResponse.json(
        { error: "Tệp tải lên không vượt qua kiểm định chữ ký nhị phân (magic bytes)." },
        { status: 415 }
      );
    }

    // Đảm bảo tệp riêng tư tuyệt đối (Fail-Closed: nếu thu hồi quyền public thất bại sẽ trả lỗi ngay)
    try {
      await ensureDriveFilePrivate(fileId, accessToken);
    } catch (privacyErr: any) {
      return NextResponse.json(
        {
          error:
            privacyErr?.message ||
            "Không thể khóa quyền riêng tư cho tệp bằng chứng trên Google Drive.",
        },
        { status: 502 }
      );
    }

    const sealedEvidenceUrl = buildSealedDisputeEvidenceUrl({
      provider: "drive",
      rentalId,
      uploaderId: user.id,
      objectRef: fileId,
      mimeType: canonicalMimeType,
      sizeBytes,
      checksumOrGeneration: `rev=${headRevisionId};md5=${md5Checksum}`,
    });

    return NextResponse.json({
      success: true,
      url: sealedEvidenceUrl,
      evidenceUrl: sealedEvidenceUrl,
      isVideo: canonicalMimeType.startsWith("video/"),
      sizeBytes,
      mimeType: canonicalMimeType,
    });
  } catch (error: unknown) {
    // TODO: integrate Sentry/LogRocket tracking for drive-resumable finalize errors
    console.error("[drive-resumable finalize error]:", error);
    return NextResponse.json({ error: "Lỗi máy chủ khi nghiệm thu bằng chứng." }, { status: 500 });
  }
}
