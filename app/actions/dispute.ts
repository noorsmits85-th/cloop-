"use server";

import { DamageSeverity } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { requireUser, requireAdmin } from "@/src/lib/auth";
import { generateDisputeVideoReadUrl } from "@/src/services/gcsStorage";

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

    const isRenter = rental.renterId === user.id;
    const isOwner = rental.ownerId === user.id || rental.product?.userId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isRenter && !isOwner && !isAdmin) {
      return { success: false, error: "Bạn không có quyền khiếu nại cho đơn thuê này" };
    }

    // 1b. DIGITAL DAMAGE PROTOCOL: Chặn đứng hành vi đòi cọc với Hao mòn thông thường (Wear & Tear)
    const category: DamageCategory = data.damageCategory || 
      (data.severity === "LOW" ? "WEAR_AND_TEAR" : data.severity === "MEDIUM" ? "REPAIRABLE_DAMAGE" : "TOTAL_LOSS");

    if (category === "WEAR_AND_TEAR" && data.suggestedDeduction > 0) {
      return {
        success: false,
        error: "Theo Chính Sách Vận Hành CLOOP: Vết bẩn bề mặt (son môi, phấn trang điểm nhẹ, mồ hôi, nếp nhăn) thuộc phạm vi Hao Mòn Thông Thường (Wear & Tear) đã được tính trong giá thuê. Chủ tủ tự xử lý giặt ủi, không được khấu trừ tiền cọc của khách!",
      };
    }

    if (category === "REPAIRABLE_DAMAGE" && data.suggestedDeduction > 500000) {
      return {
        success: false,
        error: "Đối với Hư hỏng có thể khắc phục (Repairable Damage), mức khấu trừ tối đa là 500.000đ theo chi phí giặt hấp/khâu vá thực tế, không được yêu cầu tịch thu toàn bộ tiền cọc!",
      };
    }

    // 1c. OWNER RISK ENGINE: Soi xét tần suất khiếu nại của Chủ tủ (Phát hiện Moral Hazard)
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

    const targetInvoiceId = data.invoiceId || rental.invoice?.id;

    // 3. Dùng Transaction để đảm bảo tạo Dispute và Audit Log cùng lúc (Atomic)
    const result = await prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.create({
        data: {
          rentalId: data.rentalId,
          invoiceId: targetInvoiceId || null,
          description: data.description,
          severity: data.severity,
          suggestedDeduction: data.suggestedDeduction,
          images: data.evidenceUrls || [],
          status: "PENDING_REVIEW",
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
            evidenceCount: (data.evidenceUrls || []).length,
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

      return dispute;
    });

    return { success: true, dispute: result };
  } catch (error: any) {
    console.error("Lỗi tạo Dispute:", error);
    return { success: false, error: error.message || "Lỗi xử lý khiếu nại" };
  }
}

export async function resolveDispute(data: {
  disputeId: string;
  finalDeduction: number;
  adminNotes: string;
}) {
  try {
    const { profile: admin } = await requireAdmin();
    if (!admin) throw new Error("Unauthorized Admin");

    const result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.dispute.updateMany({
        where: { id: data.disputeId, status: { in: ["PENDING_REVIEW", "DISPUTED"] } },
        data: {
          finalDeduction: data.finalDeduction,
          adminNotes: data.adminNotes,
          status: "APPROVED_DEDUCTION",
        },
      });

      if (updateResult.count === 0) {
        throw new Error("Khiếu nại này đã được xử lý hoặc không hợp lệ.");
      }

      const dispute = await tx.dispute.findUnique({
        where: { id: data.disputeId },
      });

      // LƯU VẾT KIỂM TOÁN (AUDIT LOG)
      await tx.auditLog.create({
        data: {
          adminId: admin.id,
          action: "RESOLVE_DISPUTE",
          targetType: "DISPUTE",
          targetId: data.disputeId,
          beforeStatus: "PENDING_REVIEW",
          afterStatus: "APPROVED_DEDUCTION",
          metadata: JSON.stringify({
            finalDeduction: data.finalDeduction,
            adminNotes: data.adminNotes,
          }),
        },
      });

      return dispute;
    });

    return { success: true, dispute: result };
  } catch (error: any) {
    console.error("Lỗi giải quyết Dispute:", error);
    return { success: false, error: error.message || "Lỗi giải quyết khiếu nại" };
  }
}

/**
 * Lấy Signed URLs an toàn để Admin hoặc Bên liên quan xem video/ảnh bằng chứng
 */
export async function getDisputeEvidenceUrls(evidenceKeys: string[]): Promise<string[]> {
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");

  const urls = await Promise.all(
    evidenceKeys.map(async (key) => {
      if (key.startsWith("http://") || key.startsWith("https://")) {
        return key;
      }
      return generateDisputeVideoReadUrl(key);
    })
  );

  return urls;
}
