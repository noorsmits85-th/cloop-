"use server";

import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/auth";

const OPEN_RENTAL_STATUSES = [
  "PENDING_APPROVAL",
  "OWNER_PACKED",
  "LENDER_SHIPPED",
  "BORROWER_RECEIVED",
  "BORROWER_RETURNED",
  "DISPUTE",
] as const;

export async function getDepositVaultMetricsAction() {
  try {
    await requireAdmin();

    const today = new Date();
    const rentalHistory = await prisma.rentalHistory.findMany({
      where: {
        status: { in: [...OPEN_RENTAL_STATUSES] },
        invoice: { status: "PAID" },
      },
      select: {
        id: true,
        end_date: true,
        status: true,
        product: { select: { title: true } },
        invoice: {
          select: {
            depositAmount: true,
            rentalFee: true,
            shippingFeeCollected: true,
            amount: true,
          },
        },
      },
      orderBy: { end_date: "asc" },
    });

    let totalVault = 0;
    let pendingReturn = 0;

    const formattedTx = rentalHistory.map((rent) => {
      const depositAmount = rent.invoice?.depositAmount || 0;
      const expectedReturnDate = rent.end_date;
      const daysUntilReturn = Math.ceil(
        (expectedReturnDate.getTime() - today.getTime()) / (1000 * 3600 * 24)
      );

      totalVault += depositAmount;
      if (daysUntilReturn >= 0 && daysUntilReturn <= 7) {
        pendingReturn += depositAmount;
      }

      return {
        id: rent.id,
        item: rent.product?.title || "San pham CLOOP",
        deposit: depositAmount,
        status: "HOLDING",
        expectedReturn: expectedReturnDate,
        isOverdue: today > expectedReturnDate,
        invoiceAmount: rent.invoice?.amount || 0,
        rentalFee: rent.invoice?.rentalFee || 0,
        shippingFeeCollected: rent.invoice?.shippingFeeCollected || 0,
      };
    });

    const availableLiquidity = totalVault - pendingReturn;
    const estimatedInterest = (availableLiquidity * 0.05) / 365 * 30;

    return {
      success: true,
      data: {
        vaultSummary: {
          totalVault,
          pendingReturn,
          availableLiquidity,
          estimatedInterest,
        },
        transactions: formattedTx,
      },
    };
  } catch (error: any) {
    // TODO: Tich hop Sentry/LogRocket de tracking loi admin vault that.
    return { success: false, error: error.message };
  }
}
