"use server";

import { LedgerType } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { createClient } from "@/src/utils/supabase/server";
import { requireAdmin } from "@/src/lib/auth";
import { settleCompletedRentalOrder, settleDisputedRentalOrder } from "@/lib/settlement-engine";

/**
 * Hành động: Ghi nhận Khách nạp tiền cọc + thuê vào Sổ cái
 * Được gọi khi thanh toán QR thành công hoặc admin duyệt nạp tiền tay
 */
export async function recordDepositIn(invoiceId: string, amount: number) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const adminId = session?.user?.id;

    await prisma.ledgerTransaction.create({
      data: {
        invoiceId,
        type: LedgerType.DEPOSIT_IN,
        amount,
        description: "Thu tiền ký cược và tiền thuê",
        adminId,
        status: "COMPLETED",
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error("Lỗi ghi Sổ cái (Deposit):", err);
    return { success: false, error: err.message };
  }
}

/**
 * Hành động: Admin thực hiện ĐỐI SOÁT (Reconciliation) kết thúc hợp đồng
 * ĐÃ ĐƯỢC CHUẨN HÓA: Ủy quyền toàn diện cho Unified Settlement Engine (lib/settlement-engine.ts)
 * Loại bỏ hoàn toàn việc nhận số tiền tự do từ Client, bảo đảm 100% Invariant Sổ cái kép.
 */
export async function processReconciliation(
  invoiceId: string,
  _deprecatedRefund?: number,
  _deprecatedPayout?: number,
  _deprecatedCompensation?: number
) {
  try {
    const { profile: admin } = await requireAdmin();

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        rental: {
          include: {
            disputes: {
              where: { status: { in: ["PENDING_REVIEW", "DISPUTED", "APPROVED_DEDUCTION"] } },
            },
          },
        },
      },
    });

    if (!invoice || !invoice.rental) {
      return { success: false, error: "Không tìm thấy hợp đồng thuê liên kết với hóa đơn này." };
    }

    const rental = invoice.rental;

    // Nếu có khiếu nại đang mở hoặc đã duyệt trừ cọc -> Quyết toán tranh chấp
    if (rental.disputes.length > 0) {
      const dispute = rental.disputes[0];
      const res = await settleDisputedRentalOrder(
        {
          disputeId: dispute.id,
          finalDeduction: dispute.finalDeduction || 0,
          adminId: admin.id,
          adminNotes: "Admin quyết toán đối soát qua Sổ cái Admin.",
        },
        { actorId: admin.id, actorRole: "ADMIN" }
      );
      return { success: true, settlement: res };
    }

    // Đơn hoàn tất chuẩn
    const res = await settleCompletedRentalOrder(rental.id, {
      actorId: admin.id,
      actorRole: "ADMIN",
    });

    return { success: true, settlement: res };
  } catch (err: any) {
    console.error("Lỗi đối soát Sổ cái:", err);
    return { success: false, error: err.message || "Lỗi đối soát Sổ cái" };
  }
}
