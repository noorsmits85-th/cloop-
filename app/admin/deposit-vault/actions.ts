"use server";

import { prisma } from "@/src/lib/prisma";
import { supabaseAdmin } from "@/src/lib/supabase";

export async function getDepositVaultMetricsAction() {
  try {
    const rentalHistory = await prisma.rentalHistory.findMany({
      include: { product: { select: { title: true } } }
    });
    const listingsData = await prisma.listing.findMany();

    let totalVault = 0;
    let pendingReturn = 0;
    const today = new Date();

    const formattedTx = rentalHistory.map((rent: any) => {
      const listing = listingsData.find((l: any) => String(l.productId) === String(rent.productId));
      const rentPrice = listing?.basePrice || 0;
      const depositPercent = listing?.deposit || 100;
      const depositAmount = (rentPrice * depositPercent) / 100;

      let status = "HOLDING";
      let expectedReturnDate = new Date(rent.endDate);
      const isOverdue = today > expectedReturnDate;
      const daysUntilReturn = Math.ceil((expectedReturnDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

      if (["CANCELLED", "COMPLETED_AND_RATED", "DISPUTED"].includes(rent.status)) {
        status = "RELEASED";
      } else {
        totalVault += depositAmount;
        if (daysUntilReturn >= 0 && daysUntilReturn <= 7) {
          pendingReturn += depositAmount;
        }
      }

      return {
        id: rent.id,
        item: rent.product?.title || "Sản phẩm ẩn",
        deposit: depositAmount,
        status,
        expectedReturn: rent.endDate,
        isOverdue: isOverdue && status === "HOLDING"
      };
    });

    const availableLiquidity = totalVault - pendingReturn;
    const estimatedInterest = (availableLiquidity * 0.05) / 365 * 30; // 5%/năm trong 30 ngày

    return {
      success: true,
      data: {
        vaultSummary: {
          totalVault,
          pendingReturn,
          availableLiquidity,
          estimatedInterest
        },
        transactions: formattedTx
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
