"use server";

import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/auth";
import { revalidatePath } from "next/cache";

export interface PayoutItem {
  id: string;
  orderCode: string;
  ownerName: string;
  ownerPhone: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  rentalFee: number;
  platformFee: number;
  returnShippingFee: number;
  netPayoutAmount: number;
  status: "PENDING" | "PAID";
  productTitle: string;
  completedAt: string;
  type?: "WITHDRAWAL" | "RENTAL";
}

export async function getPendingPayoutsAction() {
  try {
    await requireAdmin();

    // 1, 2 & 3. Lấy đồng thời yêu cầu rút tiền, đơn hoàn tất và các đơn đã xác nhận chi trả
    const [withdrawalRequests, completedRentals, confirmedAuditLogs] = await Promise.all([
      prisma.withdrawalRequest.findMany({
        where: { status: "PENDING" },
        take: 20,
        include: {
          user: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.rentalHistory.findMany({
        where: {
          status: "LENDER_COMPLETED",
        },
        take: 20,
        select: {
          id: true,
          updatedAt: true,
          owner_name: true,
          owner_phone: true,
          product: { select: { title: true, user: { select: { name: true } } } },
          invoice: {
            select: {
              rentalFee: true,
              platformFee: true,
            }
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.auditLog.findMany({
        where: { action: "PAYOUT_TRANSFER_CONFIRMED" },
        select: { targetId: true }
      })
    ]);

    const confirmedRentalIds = new Set(confirmedAuditLogs.map(a => a.targetId));
    const items: PayoutItem[] = [];

    // Map withdrawal requests (Ưu tiên hiển thị đầu tiên)
    withdrawalRequests.forEach(req => {
      items.push({
        id: req.id,
        orderCode: `WD-${req.id.substring(0, 8).toUpperCase()}`,
        ownerName: req.bankAccountHolder || req.user?.name || "Chủ tủ CLOOP",
        ownerPhone: "—",
        bankName: req.bankName || "—",
        bankAccount: req.bankAccountNumber || "—",
        bankHolder: req.bankAccountHolder || req.user?.name || "—",
        rentalFee: req.amount,
        platformFee: 0,
        returnShippingFee: 0,
        netPayoutAmount: req.amount,
        status: "PENDING",
        productTitle: "Yêu cầu rút tiền từ Ví người dùng CLOOP",
        completedAt: req.createdAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
        type: "WITHDRAWAL"
      });
    });

    // Map completed rentals (chưa xác nhận chi trả)
    completedRentals.filter(rent => !confirmedRentalIds.has(rent.id)).forEach(rent => {
      const rentalFee = rent.invoice?.rentalFee || 0;
      const platformFee = rent.invoice?.platformFee || Math.floor(rentalFee * 0.12);
      const returnShipping = 0;
      const netPayout = Math.max(0, rentalFee - platformFee - returnShipping);

      items.push({
        id: rent.id,
        orderCode: `ORD-${rent.id.substring(0, 8).toUpperCase()}`,
        ownerName: rent.owner_name || rent.product?.user?.name || "Chủ tủ",
        ownerPhone: rent.owner_phone || "—",
        bankName: "Ví CLOOP (Đã ghi nhận số dư)",
        bankAccount: "—",
        bankHolder: (rent.owner_name || rent.product?.user?.name || "CHỦ TỦ").toUpperCase(),
        rentalFee: rentalFee,
        platformFee: platformFee,
        returnShippingFee: returnShipping,
        netPayoutAmount: netPayout,
        status: "PENDING",
        productTitle: rent.product?.title || "Trang phục CLOOP",
        completedAt: rent.updatedAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
        type: "RENTAL"
      });
    });

    return { success: true, items };
  } catch (error: any) {
    console.error("Lỗi lấy danh sách Payouts:", error);
    return { success: false, error: error.message };
  }
}

export async function markPayoutCompletedAction(payoutId: string) {
  try {
    const { profile: admin } = await requireAdmin();

    // Nếu là WithdrawalRequest
    const wr = await prisma.withdrawalRequest.findUnique({ where: { id: payoutId } });
    if (wr && wr.status === "PENDING") {
      await prisma.$transaction(async (tx) => {
        await tx.withdrawalRequest.update({
          where: { id: payoutId },
          data: {
            status: "APPROVED",
            processedBy: admin.id,
            processedAt: new Date()
          }
        });

        await tx.user.update({
          where: { id: wr.userId },
          data: {
            pendingWithdrawalBalance: { decrement: wr.amount }
          }
        });

        await tx.ledgerTransaction.create({
          data: {
            type: "WITHDRAWAL_PAYOUT",
            amount: -wr.amount,
            description: `Giải ngân chuyển khoản thành công ${wr.amount.toLocaleString('vi-VN')}₫ về ${wr.bankName} (${wr.bankAccountNumber}) cho ${wr.bankAccountHolder}`,
            status: "COMPLETED"
          }
        });

        await tx.auditLog.create({
          data: {
            adminId: admin.id,
            action: "WITHDRAWAL_APPROVED",
            targetType: "WITHDRAWAL_REQUEST",
            targetId: wr.id,
            metadata: JSON.stringify({
              amount: wr.amount,
              bankName: wr.bankName,
              bankAccountNumber: wr.bankAccountNumber,
              bankAccountHolder: wr.bankAccountHolder,
              processedAt: new Date().toISOString()
            })
          }
        });
      });
    }

    // Nếu là đơn thuê
    const rental = await prisma.rentalHistory.findUnique({ where: { id: payoutId } });
    if (rental) {
      await prisma.auditLog.create({
        data: {
          adminId: admin.id,
          action: "PAYOUT_TRANSFER_CONFIRMED",
          targetType: "RENTAL",
          targetId: rental.id,
          metadata: JSON.stringify({ payoutConfirmedAt: new Date().toISOString() })
        }
      });
    }

    revalidatePath("/admin/payments");
    revalidatePath("/admin/ledger");
    revalidatePath("/admin");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
