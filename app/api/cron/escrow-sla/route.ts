import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { settleCompletedRentalOrder } from "@/lib/settlement-engine";
import { evaluateEscrowSlaForOrders } from "@/lib/escrow-sla-checker";

export const dynamic = "force-dynamic";

/**
 * VERCEL CRONJOB: ESCROW SLA SCANNER & AUTOMATED SETTLEMENT
 * Tự động quét và xử lý các đơn hàng vi phạm hoặc đạt mốc thời gian SLA:
 * 1. Tự động giải ngân (Payout) cho Chủ tủ & Hoàn cọc cho Khách thuê sau 24h trả đồ (nếu không có khiếu nại).
 * 2. Tự động hủy đơn & Hoàn 100% tiền cho Khách thuê nếu Chủ tủ quá 48h không chuẩn bị/giao hàng.
 * 3. Tự động giải phóng khóa giữ đồ tạm thời (RESERVED > 15 phút).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  // Fail-Closed: Thiếu CRON_SECRET trong env hoặc sai bearer token đều bị chặn 401 Unauthorized ngay lập tức
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const results = {
    autoCompletedCount: 0,
    autoCancelledCount: 0,
    releasedLocksCount: 0,
    errors: [] as string[]
  };

  const now = new Date();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  try {
    // =========================================================================
    // NHÁNH 1: TỰ ĐỘNG GIẢI NGÂN (AUTO-PAYOUT & REFUND ESCROW) SAU 24H TRẢ ĐỒ (SLA 2 TẦNG)
    // =========================================================================
    const slaResult = await evaluateEscrowSlaForOrders({ limit: 20 });
    results.autoCompletedCount += slaResult.settledOrders.length;
    if (slaResult.errors.length > 0) {
      results.errors.push(...slaResult.errors);
    }

    // =========================================================================
    // NHÁNH 2: TỰ ĐỘNG HỦY ĐƠN & HOÀN 100% TIỀN NẾU CHỦ TỦ QUÁ 48H KHÔNG GIAO
    // =========================================================================
    const expiredUnshippedOrders = await prisma.rentalHistory.findMany({
      where: {
        status: { in: ["PENDING_APPROVAL", "OWNER_PACKED"] },
        createdAt: { lte: fortyEightHoursAgo },
        invoice: { status: "PAID" }
      },
      include: {
        invoice: true
      },
      take: 20
    });

    for (const rental of expiredUnshippedOrders) {
      try {
        await prisma.$transaction(async (tx) => {
          const fresh = await tx.rentalHistory.findUnique({
            where: { id: rental.id },
            include: { invoice: true }
          });

          if (!fresh || !["PENDING_APPROVAL", "OWNER_PACKED"].includes(fresh.status) || !fresh.invoice) {
            return;
          }

          const invoiceId = fresh.invoice.id;
          const totalPaid = fresh.invoice.amount; // Hoàn toàn bộ số tiền khách đã thanh toán

          await tx.rentalHistory.update({
            where: { id: rental.id },
            data: { status: "CANCELLED" }
          });

          // Hoàn 100% về ví khách thuê
          if (totalPaid > 0) {
            await tx.user.update({
              where: { id: fresh.renterId },
              data: { walletBalance: { increment: totalPaid } }
            });

            await tx.ledgerTransaction.create({
              data: {
                invoiceId,
                type: "REFUND_OUT",
                amount: totalPaid,
                description: `[Tự động SLA 48h] Hoàn 100% tiền đơn do Chủ tủ không giao đồ #${rental.id}`
              }
            });
          }

          if (fresh.product_id) {
            await tx.listing.updateMany({
              where: { productId: fresh.product_id, isDeleted: false },
              data: { status: "AVAILABLE" }
            });
          }
        });

        results.autoCancelledCount++;
      } catch (err: any) {
        Sentry.captureException(err, { extra: { orderId: rental.id, context: "CRON_AUTO_CANCEL_SLA" } });
        results.errors.push(`Auto-cancel ${rental.id}: ${err.message}`);
      }
    }

    // =========================================================================
    // NHÁNH 3: GIẢI PHÓNG KHÓA ĐỒ TẠM THỜI (PENDING > 15 PHÚT)
    // =========================================================================
    const expiredPendingRentals = await prisma.rentalHistory.findMany({
      where: {
        status: "PENDING_APPROVAL",
        createdAt: { lte: fifteenMinutesAgo },
        invoice: {
          status: "PENDING"
        }
      },
      select: { id: true, product_id: true, invoice: { select: { id: true } } }
    });

    if (expiredPendingRentals.length > 0) {
      const rentalIds = expiredPendingRentals.map(r => r.id);
      const invoiceIds = expiredPendingRentals.map(r => r.invoice?.id).filter(Boolean) as string[];
      const productIds = Array.from(new Set(expiredPendingRentals.map(r => r.product_id)));

      // 🛡️ CHỐT CHẶN BẢO VỆ: Loại trừ bất kỳ sản phẩm nào ĐÃ CÓ ĐƠN THANH TOÁN (PAID) HOẶC ĐANG GIAO NHẬN
      const paidRentals = await prisma.rentalHistory.findMany({
        where: {
          product_id: { in: productIds },
          OR: [
            { status: { in: ["OWNER_PACKED", "LENDER_SHIPPED", "BORROWER_RECEIVED"] } },
            { invoice: { status: "PAID" } }
          ]
        },
        select: { product_id: true }
      });
      const paidProductIds = new Set(paidRentals.map(p => p.product_id));
      const safeToReleaseProductIds = productIds.filter(id => !paidProductIds.has(id));

      await prisma.$transaction([
        prisma.rentalHistory.updateMany({
          where: { id: { in: rentalIds } },
          data: { status: "CANCELLED" }
        }),
        prisma.invoice.updateMany({
          where: { id: { in: invoiceIds } },
          data: { status: "CANCELLED" }
        }),
        prisma.listing.updateMany({
          where: {
            productId: { in: safeToReleaseProductIds },
            status: "RESERVED"
          },
          data: { status: "AVAILABLE" }
        })
      ]);
      results.releasedLocksCount = safeToReleaseProductIds.length;
    } else {
      results.releasedLocksCount = 0;
    }

    if (results.autoCompletedCount > 0 || results.autoCancelledCount > 0 || results.releasedLocksCount > 0) {
      revalidatePath("/shop");
      revalidatePath("/my-closet/orders");
      revalidatePath("/my-closet/wallet");
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results
    });
  } catch (error: any) {
    Sentry.captureException(error);
    console.error("Cron SLA execution failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
