"use server";

import { PrismaClient, DamageSeverity } from "@prisma/client";
import { requireAdmin } from "@/src/lib/auth";

const prisma = new PrismaClient();

export async function createDispute(data: {
  rentalId: string;
  invoiceId?: string;
  description: string;
  severity: DamageSeverity;
  suggestedDeduction: number;
}) {
  try {
    // BẢO VỆ API BẰNG SERVER CHECK (RBAC)
    const { profile: admin } = await requireAdmin();

    // Dùng Transaction để đảm bảo tạo Dispute và Audit Log cùng lúc (Atomic)
    const result = await prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.create({
        data: {
          rentalId: data.rentalId,
          invoiceId: data.invoiceId,
          description: data.description,
          severity: data.severity,
          suggestedDeduction: data.suggestedDeduction,
          status: "PENDING_REVIEW",
        }
      });

      // LƯU VẾT KIỂM TOÁN (AUDIT LOG)
      await tx.auditLog.create({
        data: {
          adminId: admin.id,
          action: "CREATE_DISPUTE",
          targetType: "DISPUTE",
          targetId: dispute.id,
          afterStatus: "PENDING_REVIEW",
          metadata: JSON.stringify({
            severity: data.severity,
            deduction: data.suggestedDeduction
          })
        }
      });

      // Đồng thời cập nhật trạng thái Invoice nếu có
      if (data.invoiceId) {
        await tx.invoice.update({
          where: { id: data.invoiceId },
          data: { payosStatus: "DISPUTED" }
        });
      }

      return dispute;
    });

    return { success: true, dispute: result };
  } catch (error: any) {
    console.error("Lỗi tạo Dispute:", error);
    return { success: false, error: error.message };
  }
}

export async function resolveDispute(data: {
  disputeId: string;
  finalDeduction: number;
  adminNotes: string;
}) {
  try {
    const { profile: admin } = await requireAdmin();

    const result = await prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.update({
        where: { id: data.disputeId },
        data: {
          finalDeduction: data.finalDeduction,
          adminNotes: data.adminNotes,
          status: "APPROVED_DEDUCTION"
        }
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
            adminNotes: data.adminNotes
          })
        }
      });

      return dispute;
    });

    return { success: true, dispute: result };
  } catch (error: any) {
    console.error("Lỗi duyệt Dispute:", error);
    return { success: false, error: error.message };
  }
}
