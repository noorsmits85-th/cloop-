"use server";

import { prisma } from "@/src/lib/prisma";
import { payos } from "@/src/utils/payos";
import { generatePayOSOrderCode } from "@/src/utils/order-code";

import { createClient } from "@/src/utils/supabase/server";

/**
 * @deprecated Luồng tạo link thanh toán đã được chuyển sang `/api/checkout`
 * để áp dụng tính cọc linh hoạt (Dynamic Deposit), kiểm tra Quỹ bảo chứng thực tế và Trust Score.
 */
export async function createPayOSPaymentLink(rentalId: string) {
  return {
    success: false,
    error: "Phương thức này đã ngừng hoạt động. Vui lòng thanh toán qua luồng checkout chuẩn của CLOOP.",
  };
}

export async function checkAndSyncPaymentStatusAction(orderCode: number | string) {
  try {
    if (!orderCode) {
      return { success: false, error: "Mã đơn hàng không hợp lệ" };
    }

    if (!payos) {
      return { success: false, error: "Cau hinh PayOS chua san sang tren server." };
    }

    const numericOrderCode = typeof orderCode === "string" ? Number(orderCode) : orderCode;

    const invoice = await prisma.invoice.findUnique({
      where: { orderCode: BigInt(numericOrderCode) },
      include: { rental: true }
    });

    if (!invoice) {
      return { success: false, error: "Không tìm thấy hóa đơn" };
    }

    // Nếu DB đã PAID rồi thì trả về ngay
    if (invoice.status === "PAID") {
      return { success: true, isPaid: true, status: "PAID" };
    }

    // 🛡️ Webhook Fallback: Gọi trực tiếp PayOS API để hỏi thăm trạng thái
    try {
      const paymentInfo = await payos.paymentRequests.get(numericOrderCode);

      const isActuallyPaid = Boolean(
        paymentInfo && (
          paymentInfo.status === "PAID" || 
          (typeof paymentInfo.amountPaid === "number" && paymentInfo.amountPaid >= invoice.amount)
        )
      );

      if (isActuallyPaid) {
        // Thực thi Atomic Settlement Inflow giống Webhook
        await prisma.$transaction(async (tx) => {
          const updateResult = await tx.invoice.updateMany({
            where: { id: invoice.id, status: "PENDING" },
            data: { status: "PAID", payosStatus: "success" }
          });

          if (updateResult.count === 0) return;

          await tx.ledgerTransaction.create({
            data: {
              invoiceId: invoice.id,
              type: "DEPOSIT_IN",
              amount: invoice.amount,
              description: `Tiền nạp qua Webhook Fallback Sync - OrderCode ${numericOrderCode}`,
              status: "COMPLETED"
            }
          });

          if (invoice.rentalId) {
            await tx.rentalHistory.update({
              where: { id: invoice.rentalId },
              data: { status: "PENDING_APPROVAL" }
            });
          }

          await tx.transactionHistory.upsert({
            where: { orderCode: BigInt(numericOrderCode) },
            create: {
              orderCode: BigInt(numericOrderCode),
              invoiceId: invoice.id,
              amount: invoice.amount,
              invoiceAmount: invoice.amount,
              status: "PROCESSED",
              rawPayload: paymentInfo as any,
              processedAt: new Date()
            },
            update: {
              status: "PROCESSED",
              amount: invoice.amount,
              invoiceAmount: invoice.amount,
              rawPayload: paymentInfo as any,
              processedAt: new Date()
            }
          });
        });

        return { success: true, isPaid: true, status: "PAID" };
      }

      return { 
        success: true, 
        isPaid: false, 
        status: paymentInfo?.status || "PENDING",
        amountPaid: paymentInfo?.amountPaid || 0,
        amountRemaining: paymentInfo?.amountRemaining ?? invoice.amount
      };
    } catch (payosErr: any) {
      console.warn("PayOS status check query error:", payosErr.message);
      return { success: true, isPaid: false, status: invoice.status };
    }
  } catch (error: any) {
    console.error("Lỗi đồng bộ thanh toán:", error);
    return { success: false, error: error.message || "Lỗi đồng bộ" };
  }
}

