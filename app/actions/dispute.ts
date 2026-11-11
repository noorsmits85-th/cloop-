"use server";

import { DamageSeverity } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { requireUser, requireAdmin } from "@/src/lib/auth";
import {
  generateDisputeVideoReadUrl,
  verifyUploadedDisputeFile,
} from "@/src/services/gcsStorage";
import {
  buildSealedDisputeEvidenceUrl,
  buildSignedEvidenceStreamPath,
  parseEvidenceIntegrityAnchor,
  verifyAndFinalizeDisputeEvidenceList,
  verifySealedDisputeEvidenceUrl,
} from "@/src/lib/dispute-evidence-seal";
import { settleDisputedRentalOrder } from "@/lib/settlement-engine";

export type DamageCategory = "WEAR_AND_TEAR" | "REPAIRABLE_DAMAGE" | "TOTAL_LOSS";

export async function createDispute(data: {
  rentalId: string;
  invoiceId?: string;
  description: string;
  severity: DamageSeverity;
  damageCategory?: DamageCategory;
  suggestedDeduction: number;
  evidenceUrls?: string[];
  idempotencyKey?: string;
}) {
  try {
    const user = await requireUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Kiểm tra đơn thuê và quyền hạn (Authorization)
    const rental = await prisma.rentalHistory.findUnique({
      where: { id: data.rentalId },
      include: {
        product: true,
        invoice: true,
      },
    });

    if (!rental) {
      return { success: false, error: "Không tìm thấy đơn thuê" };
    }

    if (!rental.invoice || rental.invoice.status !== "PAID") {
      return { success: false, error: "Đơn thuê không có hóa đơn hợp lệ hoặc chưa được thanh toán thành công, không thể mở khiếu nại tài chính." };
    }

    const isRenter = rental.renterId === user.id;
    const isOwner = rental.ownerId === user.id || rental.product?.userId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isRenter && !isOwner && !isAdmin) {
      return { success: false, error: "Bạn không có quyền khiếu nại cho đơn thuê này" };
    }

    // 🛡️ CHỐT CHẶN BẢO MẬT SỐ TIỀN KHẤU TRỪ: Không chấp nhận số âm hoặc NaN
    if (!Number.isFinite(data.suggestedDeduction) || data.suggestedDeduction < 0) {
      return { success: false, error: "Số tiền đề xuất khấu trừ không hợp lệ." };
    }
    const safeSuggestedDeduction = Math.round(data.suggestedDeduction);

    // 1b. DIGITAL DAMAGE PROTOCOL: Chặn đứng hành vi đòi cọc với Hao mòn thông thường (Wear & Tear)
    const category: DamageCategory = data.damageCategory || 
      (data.severity === "LOW" ? "WEAR_AND_TEAR" : data.severity === "MEDIUM" ? "REPAIRABLE_DAMAGE" : "TOTAL_LOSS");

    const depositAmount = rental.invoice?.depositAmount || 0;
    // Khung đền bù linh hoạt: Tối đa 50% tiền cọc (hoặc trần sàn 500.000đ với đồ phổ thông) và không vượt quá cọc thực tế
    const maxRepairableDeduction = Math.min(depositAmount, Math.max(500000, Math.round(depositAmount * 0.5)));

    if (category === "WEAR_AND_TEAR") {
      if (safeSuggestedDeduction > 0) {
        return {
          success: false,
          error: "Theo Chính Sách Vận Hành CLOOP: Vết bẩn bề mặt (son môi, phấn trang điểm nhẹ, mồ hôi, nếp nhăn) thuộc phạm vi Hao Mòn Thông Thường (Wear & Tear) đã được tính trong giá thuê. Chủ tủ tự xử lý giặt ủi, không được khấu trừ tiền cọc của khách!",
        };
      }
    } else if (category === "REPAIRABLE_DAMAGE") {
      if (safeSuggestedDeduction > maxRepairableDeduction) {
        return {
          success: false,
          error: `Đối với Hư hỏng có thể khắc phục (Repairable Damage), mức khấu trừ tối đa là ${maxRepairableDeduction.toLocaleString("vi-VN")}đ (theo khung đền bù tối đa 50% tiền cọc hoặc hạn mức sửa chữa), không được yêu cầu tịch thu toàn bộ tiền cọc!`,
        };
      }
    } else if (category === "TOTAL_LOSS") {
      if (safeSuggestedDeduction > depositAmount) {
        return {
          success: false,
          error: `Đối với trường hợp Hỏng hoàn toàn / Mất đồ (Total Loss), số tiền khấu trừ (${safeSuggestedDeduction.toLocaleString("vi-VN")}đ) không được vượt quá số tiền cọc thực tế (${depositAmount.toLocaleString("vi-VN")}đ) được ký quỹ trong đơn hàng!`,
        };
      }
    }

    // 1c. XÁC THỰC CHỨNG TỪ BẰNG CHỨNG TỪ MÁY CHỦ & NGUYÊN TẮC NGHĨA VỤ CHỨNG MINH (BURDEN OF PROOF):
    // Tuyệt đối không tin chuỗi URL tự nhập (#video, drive.google.com/file...).
    // Mọi bằng chứng phải đi qua dịch vụ xác thực & nghiệm thu dùng chung (verifyAndFinalizeDisputeEvidenceList).
    const evidenceCheck = await verifyAndFinalizeDisputeEvidenceList({
      rawUrls: data.evidenceUrls || [],
      rentalId: data.rentalId,
      uploaderId: user.id,
      allowAdminUploader: isAdmin,
      maxItems: 10,
      verifyGcsObject: verifyUploadedDisputeFile,
    });

    if (!evidenceCheck.ok) {
      return {
        success: false,
        error:
          evidenceCheck.error ||
          "Bằng chứng đính kèm không hợp lệ, chưa được máy chủ nghiệm thu hoặc không thuộc đơn thuê này.",
      };
    }

    const verifiedEvidenceList = evidenceCheck.verifiedUrls;
    const hasVerifiedUnboxingVideo = evidenceCheck.hasVerifiedVideo;

    if (isOwner && safeSuggestedDeduction > 0 && !hasVerifiedUnboxingVideo) {
      return {
        success: false,
        error: "Theo Nguyên Tắc Nghĩa Vụ Chứng Minh (Burden of Proof): Chủ tủ bắt buộc phải tải lên video mở hộp đối soát niêm phong đã được máy chủ CLOOP nghiệm thu cho đúng đơn thuê này. Không có video mở hộp hợp lệ = Chủ tủ tự chịu toàn bộ trách nhiệm, hệ thống từ chối mở khiếu nại trừ cọc!",
      };
    }

    // 1d. OWNER RISK ENGINE: Soi xét tần suất khiếu nại của Chủ tủ (Phát hiện Moral Hazard)
    let isHighDisputeOwner = false;
    let ownerDisputeRate = 0;
    if (isOwner) {
      const ownerId = rental.ownerId || rental.product?.userId;
      if (ownerId) {
        const pastRentals = await prisma.rentalHistory.findMany({
          where: { ownerId },
          take: 10,
          select: { id: true },
        });
        if (pastRentals.length >= 3) {
          const pastRentalIds = pastRentals.map((r) => r.id);
          const pastDisputes = await prisma.dispute.count({
            where: { rentalId: { in: pastRentalIds } },
          });
          ownerDisputeRate = Math.round((pastDisputes / pastRentals.length) * 100);
          if (ownerDisputeRate >= 25) {
            isHighDisputeOwner = true;
          }
        }
      }
    }

    // 2. IDEMPOTENCY CHECK: Chặn tạo khiếu nại trùng lặp khi đang có khiếu nại chưa xử lý
    const existingDispute = await prisma.dispute.findFirst({
      where: {
        rentalId: data.rentalId,
        status: { in: ["PENDING_REVIEW", "DISPUTED"] },
      },
    });

    if (existingDispute) {
      return {
        success: false,
        error: "Đơn thuê này hiện đã có khiếu nại đang chờ Admin giải quyết. Vui lòng không gửi trùng lặp!",
      };
    }

    // Chặn IDOR: Chỉ sử dụng rental.invoice.id từ DB, tuyệt đối không nhận data.invoiceId tùy ý từ client
    const targetInvoiceId = rental.invoice?.id;

    // 3. Dùng Transaction để đảm bảo tạo Dispute và Audit Log cùng lúc (Atomic)
    const result = await prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.create({
        data: {
          rentalId: data.rentalId,
          invoiceId: targetInvoiceId || null,
          description: String(data.description || "").slice(0, 2000),
          severity: data.severity,
          suggestedDeduction: safeSuggestedDeduction,
          images: verifiedEvidenceList,
          status: "PENDING_REVIEW",
          adminNotes: JSON.stringify({
            damageCategory: category,
            initiatorId: user.id,
            initiatorRole: isAdmin ? "ADMIN" : isOwner ? "OWNER" : "RENTER",
            proposedAt: new Date().toISOString(),
          }),
        },
      });

      // LƯU VẾT KIỂM TOÁN (AUDIT LOG)
      await tx.auditLog.create({
        data: {
          adminId: user.id,
          action: "CREATE_DISPUTE",
          targetType: "DISPUTE",
          targetId: dispute.id,
          afterStatus: "PENDING_REVIEW",
          metadata: JSON.stringify({
            severity: data.severity,
            damageCategory: category,
            deduction: data.suggestedDeduction,
            evidenceCount: verifiedEvidenceList.length,
            hasVerifiedUnboxingVideo,
            creatorRole: isAdmin ? "ADMIN" : isOwner ? "OWNER" : "RENTER",
            isHighDisputeOwner,
            ownerDisputeRate: `${ownerDisputeRate}%`,
            idempotencyKey: data.idempotencyKey,
          }),
        },
      });

      // Cập nhật trạng thái Invoice nếu có
      if (targetInvoiceId) {
        await tx.invoice.update({
          where: { id: targetInvoiceId },
          data: { payosStatus: "DISPUTED" },
        });
      }

      // Cập nhật trạng thái Đơn thuê sang DISPUTE
      await tx.rentalHistory.update({
        where: { id: data.rentalId },
        data: { status: "DISPUTE" },
      });

      return dispute;
    });

    return { success: true, dispute: result };
  } catch (error: unknown) {
    // TODO: integrate Sentry/LogRocket tracking for dispute creation errors
    const message = error instanceof Error ? error.message : "Lỗi xử lý khiếu nại";
    console.error("Lỗi tạo Dispute:", message);
    return { success: false, error: message };
  }
}

/**
 * ⚖️ RESOLVE DISPUTE WITH FULL DOUBLE-ENTRY FINANCIAL SETTLEMENT
 * Kiểm tra chặt chẽ tiền cọc, ghi sổ cái LedgerTransaction, cập nhật ví chủ đồ và hoàn cọc cho khách qua Settlement Engine.
 */
export async function resolveDispute(data: {
  disputeId: string;
  finalDeduction: number;
  adminNotes: string;
}) {
  try {
    const { profile: admin } = await requireAdmin();
    if (!admin) throw new Error("Unauthorized Admin");

    if (!Number.isFinite(data.finalDeduction) || data.finalDeduction < 0) {
      return { success: false, error: "Số tiền khấu trừ quyết toán không hợp lệ." };
    }
    const safeFinalDeduction = Math.round(data.finalDeduction);

    // Kiểm tra xem khiếu nại này xuất phát từ Khách thuê (RENTER - hàng lỗi/sai mẫu) hay Chủ tủ (OWNER - hư hỏng khi trả đồ)
    const existingDispute = await prisma.dispute.findUnique({
      where: { id: data.disputeId },
      select: { adminNotes: true, rental: { select: { invoice: { select: { rentalFee: true } } } } },
    });

    let isItemDefect = false;
    let refundRentalToRenter: number | undefined = undefined;
    try {
      if (existingDispute?.adminNotes) {
        const parsedNotes = JSON.parse(existingDispute.adminNotes);
        if (parsedNotes.initiatorRole === "RENTER" || parsedNotes.isItemDefect === true) {
          isItemDefect = true;
          const rentalFee = existingDispute.rental?.invoice?.rentalFee || 0;
          refundRentalToRenter = safeFinalDeduction > 0 ? Math.min(safeFinalDeduction, rentalFee) : rentalFee;
        }
      }
    } catch (_) {}

    const result = await settleDisputedRentalOrder(
      {
        disputeId: data.disputeId,
        finalDeduction: isItemDefect ? 0 : safeFinalDeduction,
        isItemDefect,
        refundRentalToRenter,
        adminId: admin.id,
        adminNotes: data.adminNotes,
      },
      {
        actorId: admin.id,
        actorRole: "ADMIN",
      }
    );

    return { success: true, dispute: result };
  } catch (error: unknown) {
    // TODO: integrate Sentry/LogRocket tracking for dispute settlement errors
    const message = error instanceof Error ? error.message : "Lỗi giải quyết khiếu nại";
    console.error("Lỗi giải quyết Dispute:", message);
    return { success: false, error: message };
  }
}

/**
 * 🔒 LẤY LINK BẰNG CHỨNG TRANH CHẤP CÓ PHÂN QUYỀN CHẶT CHẼ
 * Chỉ cho phép Renter, Owner hoặc Admin của đúng hồ sơ đó xem video/ảnh qua luồng stream nội bộ có chữ ký 15 phút.
 */
export async function getDisputeEvidenceUrls(params: {
  disputeId: string;
  evidenceKeys?: string[];
}): Promise<string[]> {
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");

  if (!params || !params.disputeId) {
    throw new Error("Missing disputeId: Yêu cầu mã hồ sơ tranh chấp để xác thực quyền truy cập.");
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id: params.disputeId },
    include: {
      rental: {
        include: { product: true },
      },
    },
  });

  if (!dispute) {
    throw new Error("Không tìm thấy hồ sơ khiếu nại.");
  }

  const isRenter = dispute.rental.renterId === user.id;
  const isOwner = dispute.rental.ownerId === user.id || dispute.rental.product?.userId === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isRenter && !isOwner && !isAdmin) {
    throw new Error("Forbidden: Bạn không có quyền truy cập bằng chứng của hồ sơ tranh chấp này.");
  }

  // Nếu không truyền evidenceKeys thì lấy toàn bộ ảnh/video của dispute
  let requestedKeys = params.evidenceKeys || [];
  if (requestedKeys.length === 0) {
    requestedKeys = dispute.images;
  } else {
    // Chỉ cho phép lấy các key nằm trong dispute.images của chính hồ sơ này (chặn IDOR)
    requestedKeys = requestedKeys.filter((k) => dispute.images.includes(k));
  }

  const urls = await Promise.all(
    requestedKeys.map(async (key) => {
      // 1. Chứng từ SEAL nội bộ (`https://evidence.cloop.internal/v1/object?...`) -> sinh đường dẫn stream '/api/disputes/evidence-stream?...'
      if (key.startsWith("https://evidence.cloop.internal/v1/object")) {
        const verified = verifySealedDisputeEvidenceUrl(key, {
          rentalId: dispute.rentalId,
          allowAdminUploader: true,
        });
        if (!verified.valid || !verified.payload) {
          throw new Error(verified.error || "Chứng từ bằng chứng không hợp lệ.");
        }
        if (verified.payload.provider === "gcs") {
          const anchor = parseEvidenceIntegrityAnchor(verified.payload.checksumOrGeneration);
          return generateDisputeVideoReadUrl(verified.payload.objectRef, anchor.gen);
        }
        return buildSignedEvidenceStreamPath({
          disputeId: dispute.id,
          evidenceUrl: key,
          viewerId: user.id,
        });
      }

      // 2. Đường dẫn GCS trực tiếp (`disputes/...`)
      if (key.startsWith("disputes/")) {
        return generateDisputeVideoReadUrl(key);
      }

      // 3. Nếu là URL lịch sử trực tiếp, chỉ cho phép các domain lưu trữ được phép trong CSP media-src/img-src
      if (key.startsWith("https://")) {
        const parsed = new URL(key);
        const trustedDomains = [
          "storage.googleapis.com",
          "res.cloudinary.com",
          "notxrjsuukrrxdlboavo.supabase.co",
        ];
        const isTrusted =
          parsed.protocol === "https:" &&
          trustedDomains.some((d) => parsed.hostname === d || parsed.hostname.endsWith("." + d));
        if (!isTrusted) {
          throw new Error("Bằng chứng chứa liên kết từ nguồn không được phép phát trực tiếp.");
        }
        return key;
      }

      return generateDisputeVideoReadUrl(key);
    })
  );

  return urls;
}
