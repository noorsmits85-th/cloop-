import "server-only";
import { LedgerType } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";

export async function recordDepositInInternal(
  invoiceId: string,
  amount: number,
  adminId?: string | null
) {
  return prisma.ledgerTransaction.create({
    data: {
      invoiceId,
      type: LedgerType.DEPOSIT_IN,
      amount,
      description: "Thu tiền ký cược và tiền thuê",
      adminId: adminId || undefined,
      status: "COMPLETED",
    },
  });
}
