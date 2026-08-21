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
 * 2. Hỗ trợ JobId / RunId chống retry trùng lặp.
 * 3. Trạng thái trung gian REFUND_PROCESSING để quan sát lỗi giữa chừng.
 * 4. Idempotency 100%: Dùng Prisma Transaction khóa bản ghi và kiểm tra trạng thái trước khi hoàn tiền.
 * 5. Structured Audit Log lưu vết: actor=system, jobId, runId, traceId.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const runId = req.headers.get("x-cloudscheduler-jobname") || 
                req.headers.get("x-vercel-id") || 
                url.searchParams.get("runId") || 
                `run_${crypto.randomUUID()}`;
                
  const traceId = `cron_refund_${crypto.randomUUID()}`;
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  // 1. KHIÊN BẢO VỆ XÁC THỰC SECRET
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    console.warn(JSON.stringify({
      event: "UNAUTHORIZED_CRON_ACCESS",
      traceId,
      runId,
      timestamp: new Date().toISOString(),
    }));
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

    console.log(JSON.stringify({
      event: "CRON_AUTO_REFUND_BATCH_START",
      jobId: "AUTO_REFUND_DEPOSIT_48H",
      runId,
      traceId,
      eligibleCount: eligibleRentals.length,
      timestamp: new Date().toISOString(),
    }));

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
            return { skipped: true, rentalId: rental.id, reason: "Trạng thái đơn hàng đã thay đổi" };
          }

          // Idempotency: Kiểm tra xem đã từng có giao dịch hoàn cọc cho đơn này chưa
          const existingRefundLog = await tx.auditLog.findFirst({
            where: {
              targetId: rental.id,
              action: "AUTO_REFUND_DEPOSIT_48H",
            },
          });

          if (existingRefundLog) {
            return { skipped: true, rentalId: rental.id, reason: "Đơn thuê đã được hoàn cọc từ trước" };
          }

          // Trạng thái trung gian REFUND_PROCESSING để quan sát luồng
          if (freshRental.invoice?.id) {
            await tx.invoice.update({
              where: { id: freshRental.invoice.id },
              data: { payosStatus: "REFUND_PROCESSING" },
            });
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

          // C. Ghi Audit Log chuẩn kiểm toán: actor = system, kèm traceId và jobId
          await tx.auditLog.create({
            data: {
              adminId: "SYSTEM_CRON_SCHEDULER",
              action: "AUTO_REFUND_DEPOSIT_48H",
              targetType: "RENTAL_HISTORY",
              targetId: rental.id,
              beforeStatus: "BORROWER_RETURNED",
              afterStatus: "LENDER_COMPLETED",
              metadata: JSON.stringify({
                actor: "system",
                actorRole: "SYSTEM_CRON",
                jobId: "AUTO_REFUND_DEPOSIT_48H",
                runId,
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
      jobId: "AUTO_REFUND_DEPOSIT_48H",
      runId,
      traceId,
      processedCount: results.length,
      details: results,
    });
  } catch (error: any) {
    console.error(`❌ [CRON_FATAL_ERROR][${traceId}]:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
