import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";

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

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
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
    // NHÁNH 1: TỰ ĐỘNG GIẢI NGÂN (AUTO-PAYOUT & REFUND ESCROW) SAU 24H TRẢ ĐỒ
    // =========================================================================
    const returnedOrders = await prisma.rentalHistory.findMany({
      where: {
        status: "BORROWER_RETURNED",
        updatedAt: { lte: twentyFourHoursAgo },
        disputes: {
          none: {
            status: { in: ["PENDING_REVIEW", "DISPUTED"] }
          }
        },
        invoice: {
          status: "PAID"
        }
      },
      include: {
        invoice: true,
        product: true
      },
      take: 20
    });

    for (const rental of returnedOrders) {
      try {
        await prisma.$transaction(async (tx) => {
          const fresh = await tx.rentalHistory.findUnique({
            where: { id: rental.id },
            include: { invoice: true, product: true }
          });

          if (!fresh || fresh.status !== "BORROWER_RETURNED" || !fresh.invoice || fresh.invoice.status !== "PAID") {
            return;
          }

          const invoiceId = fresh.invoice.id;
          const existingSettlement = await tx.ledgerTransaction.findFirst({
            where: {
              invoiceId,
              type: { in: ["REFUND_OUT", "PAYOUT_OUT"] },
              status: "COMPLETED"
            }
          });

          if (existingSettlement) return;

          // Cập nhật trạng thái LENDER_COMPLETED
          const updated = await tx.rentalHistory.updateMany({
            where: { id: rental.id, status: "BORROWER_RETURNED" },
            data: {
              status: "LENDER_COMPLETED",
              completedAt: now
            }
          });

          if (updated.count === 0) return;

          const depositAmount = fresh.invoice.depositAmount || 0;
          const rentalFee = fresh.invoice.rentalFee || 0;
          const rawPlatformFee = fresh.invoice.platformFee || Math.floor(rentalFee * 0.12);
          const platformFee = Math.min(rawPlatformFee, rentalFee);
          const shippingFee = fresh.invoice.shippingFeeCollected || 0;
          const returnShippingFee = 25000;
          const ownerBonusCoins = 25;

          const returnShippingRetained = Math.min(returnShippingFee, Math.max(0, rentalFee - platformFee));
          const lenderEarnings = Math.max(0, rentalFee - platformFee - returnShippingRetained);

          // 1. Hoàn cọc cho khách thuê + Thưởng 15 Xu
          const updatedRenter = await tx.user.update({
            where: { id: fresh.renterId },
            data: {
              walletBalance: depositAmount > 0 ? { increment: depositAmount } : undefined,
              cloopCoins: { increment: 15 }
            },
            select: { cloopCoins: true }
          });

          await tx.coinLedgerEntry.create({
            data: {
              userId: fresh.renterId,
              type: "QUEST_REWARD",
              amount: 15,
              balanceAfter: updatedRenter.cloopCoins,
              description: `🎁 [Tự động] Thưởng 15 Xu Lá hoàn tất đơn thuê #${rental.id.slice(0, 8).toUpperCase()}`,
              metadata: { orderId: rental.id, autoSettled: true }
            }
          });

          if (depositAmount > 0) {
            await tx.ledgerTransaction.create({
              data: {
                invoiceId,
                type: "REFUND_OUT",
                amount: depositAmount,
                description: `[Tự động SLA 24h] Hoàn cọc đơn ${rental.id}`
              }
            });
          }

          // 2. Payout cho chủ tủ + Thưởng 25 Xu
          const ownerId = fresh.ownerId || fresh.product?.userId;
          if (ownerId) {
            const updatedOwner = await tx.user.update({
              where: { id: ownerId },
              data: {
                walletBalance: lenderEarnings > 0 ? { increment: lenderEarnings } : undefined,
                cloopCoins: { increment: ownerBonusCoins }
              },
              select: { cloopCoins: true }
            });

            await tx.coinLedgerEntry.create({
              data: {
                userId: ownerId,
                type: "QUEST_REWARD",
                amount: ownerBonusCoins,
                balanceAfter: updatedOwner.cloopCoins,
                description: `🎁 [Tự động] Thưởng +${ownerBonusCoins} Xu Lá cho Chủ tủ đơn #${rental.id.slice(0, 8).toUpperCase()}`,
                metadata: { orderId: rental.id, autoSettled: true }
              }
            });

            if (lenderEarnings > 0) {
              await tx.ledgerTransaction.create({
                data: {
                  invoiceId,
                  type: "PAYOUT_OUT",
                  amount: lenderEarnings,
                  description: `[Tự động SLA 24h] Payout tiền thuê đơn ${rental.id}`
                }
              });
            }
          }

          if (platformFee > 0) {
            await tx.ledgerTransaction.create({
              data: { invoiceId, type: "FEE_RETAINED", amount: platformFee, description: `Phí nền tảng đơn ${rental.id}` }
            });
          }

          if (returnShippingRetained > 0) {
            await tx.ledgerTransaction.create({
              data: { invoiceId, type: "SHIPPING_RETAINED", amount: returnShippingRetained, description: `Phí ship chiều về giữ lại đơn ${rental.id}` }
            });
          }

          if (shippingFee > 0) {
            await tx.ledgerTransaction.create({
              data: { invoiceId, type: "SHIPPING_RETAINED", amount: shippingFee, description: `Phí ship chiều đi giữ lại đơn ${rental.id}` }
            });
          }

          // Kích hoạt lại trạng thái Sẵn Sàng
          if (fresh.product_id) {
            await tx.listing.updateMany({
              where: { productId: fresh.product_id, isDeleted: false },
              data: { status: "AVAILABLE" }
            });
            await tx.product.update({
              where: { id: fresh.product_id },
              data: { status: "ON_MARKET" }
            });
          }
        });

        results.autoCompletedCount++;
      } catch (err: any) {
        Sentry.captureException(err, { extra: { orderId: rental.id, context: "CRON_AUTO_SETTLEMENT" } });
        results.errors.push(`Auto-settle ${rental.id}: ${err.message}`);
      }
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
    // NHÁNH 3: GIẢI PHÓNG KHÓA ĐỒ TẠM THỜI (RESERVED > 15 PHÚT)
    // =========================================================================
    const released = await prisma.listing.updateMany({
      where: {
        status: "RESERVED",
        updatedAt: { lte: fifteenMinutesAgo }
      },
      data: {
        status: "AVAILABLE"
      }
    });
    results.releasedLocksCount = released.count;

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
