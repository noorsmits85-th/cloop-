"use server";

import { LedgerType } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { createClient } from "@/src/utils/supabase/server";
import { requireAdmin } from "@/src/lib/auth";
const FLAT_FEE = 10000; // 10,000 VNĐ phí cố định mỗi lượt thuê

/**
 * Hành động: Ghi nhận Khách nạp tiền cọc + thuê vào Sổ cái
 * Được gọi khi thanh toán QR thành công hoặc admin duyệt nạp tiền tay
 */
export async function recordDepositIn(invoiceId: string, amount: number) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Trong môi trường Pilot, nếu admin tự chạy hoặc webhook chạy, có thể bỏ qua check Auth
    // Nhưng vì an toàn, ta ghi nhận adminId nếu có
    const adminId = user?.id;

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
 * Trả cọc cho người thuê, chuyển tiền cho chủ đồ, giữ lại 10.000đ
 */
export async function processReconciliation(
  invoiceId: string, 
  refundAmount: number, 
  payoutAmount: number,
  compensationAmount: number = 0 // Tiền bồi thường hư hỏng (lấy từ cọc khách)
) {
  try {
    // BẢO VỆ API BẰNG SERVER CHECK (RBAC)
    const { profile: admin } = await requireAdmin();

    // 1. Kiểm tra tổng số tiền đầu vào của Invoice này
    const depositIn = await prisma.ledgerTransaction.findFirst({
      where: { invoiceId, type: LedgerType.DEPOSIT_IN }
    });

    if (!depositIn) {
      return { success: false, error: "Không tìm thấy khoản thu tiền ban đầu của hóa đơn này." };
    }

    const totalIn = depositIn.amount;
    const totalOut = refundAmount + payoutAmount + FLAT_FEE + compensationAmount;

    // Kiểm tra tính cân bằng của Sổ cái (Kế toán kép)
    if (totalIn !== totalOut) {
      return { success: false, error: `Sổ cái mất cân bằng! Tổng thu (${totalIn}đ) khác Tổng chi (${totalOut}đ). Hãy kiểm tra lại số liệu hoàn trả và bồi thường.` };
    }

    // 2. Thực hiện Giao dịch Đối soát (ACID)
    await prisma.$transaction(async (tx) => {
      // 2.0. KIỂM TRA IDEMPOTENCY TRONG TRANSACTION (Tránh race condition)
      const existingFee = await tx.ledgerTransaction.findFirst({
        where: { invoiceId, type: LedgerType.FEE_RETAINED, status: "COMPLETED" }
      });
      if (existingFee) {
        throw new Error("LỖI IDEMPOTENCY: Hóa đơn này đã được đối soát trước đó! (Phát hiện dòng FEE_RETAINED).");
      }

      // 2.1 Hoàn cọc cho người thuê (đã trừ tiền bồi thường nếu có)
      if (refundAmount > 0) {
        await tx.ledgerTransaction.create({
          data: {
            invoiceId,
            type: LedgerType.REFUND_OUT,
            amount: refundAmount,
            description: "Hoàn tiền cọc giữ đồ cho Người thuê",
            adminId: admin.id,
            status: "COMPLETED",
          }
        });
      }
      
      // 2.2 Chuyển tiền thuê cho chủ đồ
      if (payoutAmount > 0) {
        await tx.ledgerTransaction.create({
          data: {
            invoiceId,
            type: LedgerType.PAYOUT_OUT,
            amount: payoutAmount,
            description: "Thanh toán tiền thuê cho Chủ đồ",
            adminId: admin.id,
            status: "COMPLETED",
          }
        });
      }

      // 2.3 Chuyển tiền Bồi thường (nếu có)
      if (compensationAmount > 0) {
        await tx.ledgerTransaction.create({
          data: {
            invoiceId,
            type: LedgerType.COMPENSATION_OUT,
            amount: compensationAmount,
            description: "Bồi thường hư hỏng (trích từ cọc người thuê)",
            adminId: admin.id,
            status: "COMPLETED",
          }
        });

        // Đánh dấu các Dispute liên quan là đã giải quyết xong
        await tx.dispute.updateMany({
          where: { invoiceId, status: "APPROVED_DEDUCTION" },
          data: { status: "RESOLVED" }
        });
      }
      
      // 2.4 Thu phí nền tảng
      await tx.ledgerTransaction.create({
        data: {
          invoiceId,
          type: LedgerType.FEE_RETAINED,
          amount: FLAT_FEE,
          description: "Phí dịch vụ nền tảng (Cố định 10.000đ)",
          adminId: admin.id,
          status: "COMPLETED",
        }
      });

      // LƯU VẾT KIỂM TOÁN (AUDIT LOG)
      await tx.auditLog.create({
        data: {
          adminId: admin.id,
          action: "PROCESS_RECONCILIATION",
          targetType: "INVOICE",
          targetId: invoiceId,
          metadata: JSON.stringify({
            totalIn,
            refundAmount,
            payoutAmount,
            compensationAmount,
            flatFee: FLAT_FEE
          })
        }
      });

      // Cập nhật trạng thái RentalHistory thành "LENDER_COMPLETED"
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (invoice) {
        await tx.rentalHistory.update({
          where: { id: invoice.rentalId },
          data: { status: "LENDER_COMPLETED" }
        });
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error("Lỗi đối soát Sổ cái:", err);
    return { success: false, error: err.message };
  }
}
