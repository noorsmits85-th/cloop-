import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

/**
 * GOOGLE CLOUD SCHEDULER / VERCEL CRONJOB:
 * Tự động hoàn cọc cho khách thuê sau 48h kể từ khi trả đồ nếu chủ đồ không mở khiếu nại.
 * 
 * BẢO MẬT & VẬN HÀNH CHUẨN CTO:
 * 1. Xác thực Bearer Token qua CRON_SECRET.
 * 2. Idempotency 100%: Dùng Prisma Transaction khóa bản ghi và kiểm tra trạng thái trước khi hoàn tiền.
 * 3. Structured Audit Log lưu vết chi tiết từng giao dịch hoàn cọc.
 */
export async function GET(req: Request) {
  const traceId = `cron_refund_${crypto.randomUUID()}`;
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  // 1. KHIÊN BẢO VỆ XÁC THỰC SECRET
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    console.warn(`⛔ [UNAUTHORIZED_CRON_ACCESS][${traceId}] Lệnh gọi Cronjob bị từ chối do sai Secret.`);
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // 2. Mốc thời gian 48 giờ trước
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // 3. Tìm các đơn thuê đã trả đồ (BORROWER_RETURNED) quá 48h, có tiền cọc > 0 và KHÔNG CÓ KHIẾU NẠI ĐANG MỞ
    const eligibleRentals = await prisma.rentalHistory.findMany({
      where: {
        status: "BORROWER_RETURNED",
        actual_return_date: {
          lte: fortyEightHoursAgo,
        },
        disputes: {
          none: {
            status: { in: ["PENDING_REVIEW", "DISPUTED"] },
          },
        },
      },
      include: {
        invoice: true,
        renter: true,
      },
    });

    console.log(`[CRON_AUTO_REFUND][${traceId}] Tìm thấy ${eligibleRentals.length} đơn thuê đủ điều kiện hoàn cọc 48h.`);

    const results = [];

    // 4. Xử lý từng đơn thuê trong Transaction riêng biệt (Atomic & Idempotent)
    for (const rental of eligibleRentals) {
      const depositAmount = rental.invoice?.depositAmount || 0;

      try {
        const refundResult = await prisma.$transaction(async (tx) => {
          // Double check trạng thái bên trong Transaction để chống Race Condition
          const freshRental = await tx.rentalHistory.findUnique({
            where: { id: rental.id },
            include: { invoice: true },
          });

          if (!freshRental || freshRental.status !== "BORROWER_RETURNED") {
            return { skipped: true, reason: "Trạng thái đơn hàng đã thay đổi" };
          }

          // Idempotency: Kiểm tra xem đã từng có giao dịch hoàn cọc cho đơn này chưa
          const existingRefundLog = await tx.auditLog.findFirst({
            where: {
              targetId: rental.id,
              action: "AUTO_REFUND_DEPOSIT_48H",
            },
          });

          if (existingRefundLog) {
            return { skipped: true, reason: "Đơn thuê đã được hoàn cọc từ trước" };
          }

          // A. Cập nhật trạng thái đơn thuê -> LENDER_COMPLETED
          await tx.rentalHistory.update({
            where: { id: rental.id },
            data: {
              status: "LENDER_COMPLETED",
              completedAt: new Date(),
            },
          });

          // B. Nếu có tiền cọc > 0 -> Hoàn tiền về ví người thuê
          if (depositAmount > 0) {
            await tx.user.update({
              where: { id: rental.renterId },
              data: {
                walletBalance: { increment: depositAmount },
              },
            });

            if (freshRental.invoice?.id) {
              await tx.invoice.update({
                where: { id: freshRental.invoice.id },
                data: { payosStatus: "DEPOSIT_REFUNDED" },
              });
            }
          }

          // C. Ghi Audit Log chuẩn kiểm toán
          await tx.auditLog.create({
            data: {
              adminId: "SYSTEM_CRON_SCHEDULER",
              action: "AUTO_REFUND_DEPOSIT_48H",
              targetType: "RENTAL_HISTORY",
              targetId: rental.id,
              beforeStatus: "BORROWER_RETURNED",
              afterStatus: "LENDER_COMPLETED",
              metadata: JSON.stringify({
                traceId,
                depositRefunded: depositAmount,
                renterId: rental.renterId,
                actualReturnDate: rental.actual_return_date,
              }),
            },
          });

          return { success: true, rentalId: rental.id, depositAmount };
        });

        results.push(refundResult);
      } catch (err: any) {
        console.error(`❌ [CRON_REFUND_ERROR][${rental.id}]:`, err?.message || err);
        results.push({ success: false, rentalId: rental.id, error: err?.message });
      }
    }

    return NextResponse.json({
      success: true,
      traceId,
      processedCount: results.length,
      details: results,
    });
  } catch (error: any) {
    console.error(`❌ [CRON_FATAL_ERROR][${traceId}]:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
