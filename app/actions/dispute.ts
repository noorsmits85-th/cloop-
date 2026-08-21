"use server";

import { DamageSeverity } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { requireUser, requireAdmin } from "@/src/lib/auth";
import { generateDisputeVideoReadUrl } from "@/src/services/gcsStorage";

export async function createDispute(data: {
  rentalId: string;
  invoiceId?: string;
  description: string;
  severity: DamageSeverity;
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
            deduction: data.suggestedDeduction,
            evidenceCount: (data.evidenceUrls || []).length,
            creatorRole: isAdmin ? "ADMIN" : isOwner ? "OWNER" : "RENTER",
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
      const dispute = await tx.dispute.update({
        where: { id: data.disputeId },
        data: {
          finalDeduction: data.finalDeduction,
          adminNotes: data.adminNotes,
          status: "APPROVED_DEDUCTION",
        },
      });

      // LƯU VẾT KIỂM TOÁN (AUDIT LOG)
      await tx.auditLog.create({
        data: {
          adminId: admin.id,
          action: "RESOLVE_DISPUTE",
          targetType: "DISPUTE",
          targetId: dispute.id,
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
