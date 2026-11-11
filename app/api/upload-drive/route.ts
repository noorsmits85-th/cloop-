import * as crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { validateBinaryMediaBuffer } from "@/src/lib/server-image-guard";
import { buildSealedDisputeEvidenceUrl } from "@/src/lib/dispute-evidence-seal";
import { uploadToGoogleDrive } from "@/src/services/googleDriveStorage";

export const runtime = "nodejs";

const MAX_DRIVE_UPLOAD_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    let user;
    try {
      user = await requireUser();
    } catch {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để tải tệp tin lên." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const rentalId = String(formData.get("rentalId") || "").trim();
    const rawTargetKho = String(formData.get("targetKho") || "auto");
    const targetKho: "kho1" | "kho2" | "auto" =
      rawTargetKho === "kho1" || rawTargetKho === "kho2" ? rawTargetKho : "auto";

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Không tìm thấy tệp tin cần tải lên." },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_DRIVE_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Tệp tin vượt quá giới hạn 15MB cho luồng dự phòng hoặc tệp trống." },
        { status: 413 }
      );
    }

    // Nếu có rentalId (luồng bằng chứng đơn thuê / khiếu nại), bắt buộc kiểm tra quyền đương sự
    if (rentalId) {
      const rental = await prisma.rentalHistory.findUnique({
        where: { id: rentalId },
        include: { product: { select: { userId: true } } },
      });

      if (!rental) {
        return NextResponse.json(
          { error: "Không tìm thấy đơn thuê cần đính kèm bằng chứng." },
          { status: 404 }
        );
      }

      const isRenter = rental.renterId === user.id;
      const isOwner = rental.ownerId === user.id || rental.product?.userId === user.id;
      const isAdmin = user.role === "ADMIN";

      if (!isRenter && !isOwner && !isAdmin) {
        return NextResponse.json(
          { error: "Bạn không có quyền tải bằng chứng cho đơn thuê này." },
          { status: 403 }
        );
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let canonicalMimeType: string;
    let canonicalExt: string;
    try {
      const validated = validateBinaryMediaBuffer(buffer, {
        allowVideo: true,
        maxBytes: MAX_DRIVE_UPLOAD_BYTES,
      });
      canonicalMimeType = validated.mimeType;
      canonicalExt = validated.extension;
    } catch {
      return NextResponse.json(
        { error: "Định dạng tệp không hợp lệ. Chỉ chấp nhận ảnh (JPG, PNG, WEBP, GIF) hoặc video (MP4, WEBM, MOV)." },
        { status: 415 }
      );
    }

    const isVideo = canonicalMimeType.startsWith("video/");
    if (isVideo && !rentalId) {
      return NextResponse.json(
        { error: "Tải video bằng chứng bắt buộc phải gắn kèm mã đơn thuê (rentalId)." },
        { status: 400 }
      );
    }

    const safeFileName = `${crypto.randomUUID()}.${canonicalExt}`;
    const md5Checksum = crypto.createHash("md5").update(buffer).digest("hex").toLowerCase();
    const sha256Checksum = crypto.createHash("sha256").update(buffer).digest("hex").toLowerCase();
    const isPrivateDisputeEvidence = Boolean(rentalId);

    // 1. Tải lên Google Drive ở chế độ RIÊNG TƯ (isPublic: false) cho bằng chứng khiếu nại
    const result = await uploadToGoogleDrive({
      fileName: safeFileName,
      mimeType: canonicalMimeType,
      buffer,
      targetKho,
      isPublic: !isPrivateDisputeEvidence,
    });

    if (result && result.fileId) {
      if (isPrivateDisputeEvidence) {
        const driveMd5 =
          result.md5Checksum && /^[a-f0-9]{32}$/i.test(result.md5Checksum)
            ? result.md5Checksum.toLowerCase()
            : md5Checksum;
        if (result.headRevisionId && /^[A-Za-z0-9_-]{6,200}$/.test(result.headRevisionId)) {
          const sealedUrl = buildSealedDisputeEvidenceUrl({
            provider: "drive",
            rentalId,
            uploaderId: user.id,
            objectRef: result.fileId,
            mimeType: canonicalMimeType,
            sizeBytes: buffer.length,
            checksumOrGeneration: `rev=${result.headRevisionId};md5=${driveMd5}`,
          });

          return NextResponse.json({
            success: true,
            fileId: result.fileId,
            url: sealedUrl,
            viewUrl: sealedUrl,
            evidenceUrl: sealedUrl,
            storageWarehouse: "Google Drive (Private Evidence)",
            name: safeFileName,
            isVideo,
            sizeBytes: buffer.length,
            mimeType: canonicalMimeType,
          });
        }
        // Nếu thiếu headRevisionId hợp lệ, chuyển xuống kho dự phòng Private Supabase bên dưới
      } else {
        const displayUrl = result.thumbnailUrl || `https://lh3.googleusercontent.com/d/${result.fileId}=w1000`;
        return NextResponse.json({
          success: true,
          fileId: result.fileId,
          url: displayUrl,
          viewUrl: result.viewUrl,
          downloadUrl: result.downloadUrl,
          thumbnailUrl: displayUrl,
          storageWarehouse: "Google Drive",
          name: safeFileName,
          isVideo: false,
        });
      }
    }

    // 2. Dự phòng an toàn: Supabase Storage
    // - Nếu là bằng chứng khiếu nại (rentalId): Lưu vào bucket PRIVATE 'cloop-disputes-private' và trả về chứng từ SEAL (TUYỆT ĐỐI không mở public)
    // - Nếu là ảnh đính kèm hỗ trợ thông thường: Lưu vào bucket 'cloop-media'
    try {
      const { supabaseAdmin } = await import("@/src/lib/supabase");
      if (supabaseAdmin) {
        if (isPrivateDisputeEvidence) {
          const privatePath = `disputes/${rentalId}/${user.id}/${safeFileName}`;
          const { data: sbData, error: sbError } = await supabaseAdmin.storage
            .from("cloop-disputes-private")
            .upload(privatePath, buffer, {
              contentType: canonicalMimeType,
              upsert: false,
            });

          if (!sbError && sbData) {
            const sealedUrl = buildSealedDisputeEvidenceUrl({
              provider: "supabase_private",
              rentalId,
              uploaderId: user.id,
              objectRef: privatePath,
              mimeType: canonicalMimeType,
              sizeBytes: buffer.length,
              checksumOrGeneration: `md5=${md5Checksum};sha256=${sha256Checksum}`,
            });

            return NextResponse.json({
              success: true,
              url: sealedUrl,
              viewUrl: sealedUrl,
              evidenceUrl: sealedUrl,
              storageWarehouse: "Kho Bằng Chứng Bảo Mật (Private)",
              name: safeFileName,
              isVideo,
              sizeBytes: buffer.length,
              mimeType: canonicalMimeType,
            });
          }
        } else {
          const storagePath = `support_chat/${safeFileName}`;
          const { data: sbData, error: sbError } = await supabaseAdmin.storage
            .from("cloop-media")
            .upload(storagePath, buffer, {
              contentType: canonicalMimeType,
              upsert: false,
            });

          if (!sbError && sbData) {
            const { data: publicData } = supabaseAdmin.storage
              .from("cloop-media")
              .getPublicUrl(storagePath);

            return NextResponse.json({
              success: true,
              url: publicData.publicUrl,
              viewUrl: publicData.publicUrl,
              downloadUrl: publicData.publicUrl,
              storageWarehouse: "Kho Lưu Trữ Dự Phòng",
              name: safeFileName,
              isVideo: false,
            });
          }
        }
      }
    } catch (sbErr) {
      console.warn("⚠️ [Storage] Supabase fallback không khả dụng:", sbErr);
    }

    return NextResponse.json(
      { error: "Lỗi tải tệp lên kho lưu trữ." },
      { status: 500 }
    );
  } catch (error: unknown) {
    // TODO: integrate Sentry/LogRocket tracking for drive upload failures
    console.error("Lỗi API Upload Media:", error);
    return NextResponse.json(
      { error: "Không thể tải tệp lên lúc này. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
