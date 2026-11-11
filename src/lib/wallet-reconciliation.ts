import "server-only";
import * as crypto from "crypto";
import { prismaAdmin } from "@/src/lib/prisma";

export interface WalletReconciliationProof {
  userId: string;
  currentAvailableBalance: number;
  currentPendingBalance: number;
  totalRentalOwnerInflow: number;
  totalRentalRefundInflow: number;
  totalKycTopUpInflow: number;
  totalVerifiedInflow: number;
  totalApprovedWithdrawals: number;
  totalWalletCheckoutSpent: number;
  verifiedMaxRemainingBalance: number;
  unexplainedDiscrepancy: number;
  isReconciled: boolean;
  sourceOrderCodes: string[];
}

function getWalletSealSecret(): string {
  const secret = (
    process.env.WALLET_SEAL_SECRET ||
    process.env.PAYOS_CHECKSUM_KEY ||
    process.env.SHIPPING_QUOTE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();

  if (!secret || secret === "cloop-wallet-rollover-hmac-v1") {
    throw new Error(
      "CRITICAL_SECURITY_ERROR: Missing wallet HMAC seal secret in environment variables"
    );
  }

  return secret;
}

/**
 * Lớp Giáp 1: Ký chữ ký số HMAC-SHA256 cho bút toán khấu trừ số dư Ví tại Checkout
 */
export function signWalletSpendSeal(params: {
  userId: string;
  invoiceId: string;
  orderCode: number | string | bigint;
  walletUsedAmount: number;
  payosAmountToCollect: number;
}): string {
  const payload = [
    params.userId,
    params.invoiceId,
    String(params.orderCode),
    String(Math.floor(params.walletUsedAmount)),
    String(Math.floor(params.payosAmountToCollect)),
  ].join("|");

  return crypto
    .createHmac("sha256", getWalletSealSecret())
    .update(payload)
    .digest("hex")
    .slice(0, 24);
}

export function buildWalletRolloverOutDescription(params: {
  userId: string;
  invoiceId: string;
  orderCode: number | string | bigint;
  walletUsedAmount: number;
  payosAmountToCollect: number;
  sourceOrderCodes?: string[];
}): string {
  const seal = signWalletSpendSeal(params);
  const srcTag =
    params.sourceOrderCodes && params.sourceOrderCodes.length > 0
      ? params.sourceOrderCodes.slice(0, 3).join(",")
      : "VERIFIED_WALLET";
  return `[WALLET_ROLLOVER_OUT] Khấu trừ Ví đặt đơn #${String(params.orderCode)} | WALLET:${params.walletUsedAmount} | PAYOS_DIFF:${params.payosAmountToCollect} | SRC:${srcTag} | SEAL:${seal}`;
}

export function verifyWalletRolloverEntry(params: {
  description: string | null | undefined;
  userId: string;
  invoiceId: string;
  orderCode: number | string | bigint;
  walletUsedAmount: number;
  invoiceTotalAmount: number;
}): { valid: boolean; payosAmountToCollect: number } {
  const desc = params.description || "";
  const payosAmountToCollect = Math.max(0, params.invoiceTotalAmount - params.walletUsedAmount);
  const sealMatch = desc.match(/SEAL:([a-f0-9]{24})/i);
  if (!sealMatch) {
    return { valid: false, payosAmountToCollect };
  }
  let expectedSeal: string;
  try {
    expectedSeal = signWalletSpendSeal({
      userId: params.userId,
      invoiceId: params.invoiceId,
      orderCode: params.orderCode,
      walletUsedAmount: params.walletUsedAmount,
      payosAmountToCollect,
    });
  } catch {
    return { valid: false, payosAmountToCollect };
  }

  const a = Buffer.from(sealMatch[1].toLowerCase(), "utf8");
  const b = Buffer.from(expectedSeal.toLowerCase(), "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, payosAmountToCollect };
  }
  return { valid: true, payosAmountToCollect };
}

export function buildLatePaymentRefundDescription(params: {
  userId: string;
  invoiceId: string;
  orderCode: number | string | bigint;
  amount: number;
}): string {
  const cleanAmount = Math.max(0, Math.floor(Number(params.amount || 0)));
  const seal = signWalletSpendSeal({
    userId: params.userId,
    invoiceId: params.invoiceId,
    orderCode: params.orderCode,
    walletUsedAmount: 0,
    payosAmountToCollect: cleanAmount,
  });
  return `[LATE_PAYMENT_REFUND] Hoàn tự động vào Ví khoản thanh toán đến trễ sau khi đơn hết hạn/hủy - OrderCode ${String(params.orderCode)} | INV:${params.invoiceId} | AMOUNT:${cleanAmount} | SEAL:${seal}`;
}

export function verifyLatePaymentRefundEntry(params: {
  description: string | null | undefined;
  userId: string;
  invoiceId?: string | null;
  orderCode?: number | string | bigint | null;
  amount: number;
}): { valid: boolean; invoiceKey: string; orderCodeStr: string; amount: number } {
  const desc = params.description || "";
  const cleanUserId = String(params.userId || "").trim();
  if (!desc.startsWith("[LATE_PAYMENT_REFUND]") || !cleanUserId) {
    return { valid: false, invoiceKey: "", orderCodeStr: "", amount: 0 };
  }
  const orderMatch = desc.match(/OrderCode\s+(\d+)\b/i);
  const invMatch = desc.match(/INV:([^\s|]+)/i);
  const amountMatch = desc.match(/AMOUNT:(\d+)\b/i);
  const sealMatch = desc.match(/SEAL:([a-f0-9]{24})(?:\s|\||$)/i);

  // 🔒 FAIL-CLOSED: Bắt buộc phải có đầy đủ OrderCode, INV, AMOUNT và chữ ký HMAC 24 ký tự hex (SEAL)
  if (!orderMatch || !invMatch || !amountMatch || !sealMatch) {
    return { valid: false, invoiceKey: "", orderCodeStr: "", amount: 0 };
  }

  const descOrderCode = orderMatch[1].trim();
  const descInvoiceId = invMatch[1].trim();
  const descAmount = Number(amountMatch[1]);
  const passedAmount = Math.floor(Number(params.amount));

  if (
    !descOrderCode ||
    !descInvoiceId ||
    !Number.isFinite(descAmount) ||
    descAmount <= 0 ||
    !Number.isFinite(passedAmount) ||
    passedAmount <= 0 ||
    descAmount !== passedAmount
  ) {
    return { valid: false, invoiceKey: "", orderCodeStr: "", amount: 0 };
  }

  if (params.invoiceId != null && String(params.invoiceId).trim() !== "" && String(params.invoiceId).trim() !== descInvoiceId) {
    return { valid: false, invoiceKey: "", orderCodeStr: "", amount: 0 };
  }

  if (params.orderCode != null && String(params.orderCode).trim() !== "" && String(params.orderCode).trim() !== descOrderCode) {
    return { valid: false, invoiceKey: "", orderCodeStr: "", amount: 0 };
  }

  let expectedSeal: string;
  try {
    expectedSeal = signWalletSpendSeal({
      userId: cleanUserId,
      invoiceId: descInvoiceId,
      orderCode: descOrderCode,
      walletUsedAmount: 0,
      payosAmountToCollect: descAmount,
    });
  } catch {
    return { valid: false, invoiceKey: descInvoiceId, orderCodeStr: descOrderCode, amount: 0 };
  }
  const a = Buffer.from(sealMatch[1].toLowerCase(), "utf8");
  const b = Buffer.from(expectedSeal.toLowerCase(), "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, invoiceKey: descInvoiceId, orderCodeStr: descOrderCode, amount: 0 };
  }

  return {
    valid: true,
    invoiceKey: descInvoiceId,
    orderCodeStr: descOrderCode,
    amount: descAmount,
  };
}

/**
 * Trích xuất số tiền Ví đang tạm khóa hợp lệ trên một Invoice (đã trừ phần hoàn lại nếu có),
 * đồng thời bảo toàn số tiền giữ Ví ban đầu (originalHoldAmount) để đối chiếu thanh toán kết hợp (split payment) đến trễ.
 */
export async function getActiveWalletHoldForInvoice(
  invoiceId: string,
  txClient: any = prismaAdmin
): Promise<{
  walletHoldAmount: number;
  originalHoldAmount: number;
  holdDescription: string | null;
  alreadyRefunded: boolean;
}> {
  const entries = await txClient.ledgerTransaction.findMany({
    where: {
      invoiceId,
      status: "COMPLETED",
      OR: [
        { type: "WITHDRAWAL_HOLD" },
        {
          type: "REFUND_OUT",
          description: { startsWith: "[WALLET_ROLLOVER_REFUND]" },
        },
      ],
    },
    select: {
      type: true,
      amount: true,
      description: true,
    },
  });

  let totalHold = 0;
  let totalRefunded = 0;
  let holdDescription: string | null = null;

  for (const e of entries) {
    if (e.type === "WITHDRAWAL_HOLD" && (e.description || "").startsWith("[WALLET_ROLLOVER_OUT]")) {
      totalHold += Math.abs(Number(e.amount || 0));
      holdDescription = e.description || null;
    } else if (e.type === "REFUND_OUT" && (e.description || "").startsWith("[WALLET_ROLLOVER_REFUND]")) {
      totalRefunded += Math.max(0, Number(e.amount || 0));
    }
  }

  const netHold = Math.max(0, totalHold - totalRefunded);
  return {
    walletHoldAmount: netHold,
    originalHoldAmount: totalHold,
    holdDescription,
    alreadyRefunded: totalHold > 0 && netHold === 0,
  };
}

/**
 * Hoàn trả nguyên tử số dư Ví đã tạm khóa khi đơn PENDING bị hủy (khách đóng QR / hết hạn 15 phút / lỗi cổng PayOS)
 */
export async function releasePendingWalletHoldForInvoice(
  txClient: any,
  params: {
    invoiceId: string;
    renterId: string;
    orderCode?: number | string | bigint | null;
    reason: string;
  }
): Promise<number> {
  const { walletHoldAmount } = await getActiveWalletHoldForInvoice(params.invoiceId, txClient);
  if (walletHoldAmount <= 0) {
    return 0;
  }

  await txClient.ledgerTransaction.create({
    data: {
      invoiceId: params.invoiceId,
      type: "REFUND_OUT",
      amount: walletHoldAmount,
      status: "COMPLETED",
      description: `[WALLET_ROLLOVER_REFUND] Hoàn lại số dư Ví tạm khóa đơn #${String(params.orderCode || params.invoiceId.slice(0, 8))} (${params.reason})`,
    },
  });

  await txClient.user.update({
    where: { id: params.renterId },
    data: {
      walletBalance: { increment: walletHoldAmount },
    },
  });

  return walletHoldAmount;
}

/**
 * Bộ Đối Soát Chéo 3 Bên (3-Way Wallet Reconciliation Engine):
 * Đối chiếu Số dư Ví người dùng (User.walletBalance + pendingWithdrawalBalance)
 * với Tổng dòng tiền thực thu đã thanh toán qua PayOS (Invoice PAID + Sổ cái LedgerTransaction + KYC TopUp PAID)
 * trừ đi Tổng số tiền đã rút thành công (WithdrawalRequest APPROVED)
 * và trừ đi Tổng số dư Ví đã tái sử dụng để đặt đơn thuê mới (netWalletCheckoutSpent).
 */
export async function computeUserWalletReconciliation(
  userId: string,
  txClient: any = prismaAdmin
): Promise<WalletReconciliationProof> {
  const [
    user,
    completedOwnerRentals,
    completedRenterRentals,
    paidKycTopUps,
    approvedWithdrawals,
    walletRolloverEntries,
  ] = await Promise.all([
    txClient.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        walletBalance: true,
        pendingWithdrawalBalance: true,
      },
    }),
    // 1. Doanh thu cho thuê đồ (vai trò Chủ tủ - Owner) từ các đơn đã hoàn tất và có Invoice PAID
    txClient.rentalHistory.findMany({
      where: {
        status: "LENDER_COMPLETED",
        OR: [{ ownerId: userId }, { product: { userId } }],
        invoice: { status: "PAID" },
      },
      select: {
        id: true,
        shippingCode: true,
        invoice: {
          select: {
            id: true,
            orderCode: true,
            rentalFee: true,
            platformFee: true,
            ledgerEntries: {
              where: {
                type: { in: ["PAYOUT_OUT", "COMPENSATION_OUT"] },
                status: "COMPLETED",
              },
              select: { type: true, amount: true },
            },
          },
        },
      },
    }),
    // 2. Tiền hoàn cọc / hoàn tiền thuê / hoàn tiền hủy đơn SLA 48h / hoàn tiền thanh toán trễ (vai trò Khách thuê - Renter)
    txClient.rentalHistory.findMany({
      where: {
        status: { in: ["LENDER_COMPLETED", "CANCELLED"] },
        renterId: userId,
        invoice: {
          status: { in: ["PAID", "CANCELLED"] },
        },
      },
      select: {
        id: true,
        status: true,
        invoice: {
          select: {
            id: true,
            status: true,
            orderCode: true,
            depositAmount: true,
            transactions: {
              where: { status: "PROCESSED" },
              select: { amount: true, status: true, orderCode: true, rawPayload: true },
            },
            ledgerEntries: {
              where: {
                type: "REFUND_OUT",
                status: "COMPLETED",
              },
              select: { type: true, amount: true, description: true },
            },
          },
        },
      },
    }),
    // 3. Tiền nạp định danh KYC 1K/2K đã thanh toán qua PayOS
    txClient.coinTopUp.findMany({
      where: {
        userId,
        status: "PAID",
        packageCode: { in: ["KYC_1K", "KYC_2K"] },
      },
      select: {
        id: true,
        orderCode: true,
        amountVnd: true,
      },
    }),
    // 4. Tổng tiền đã rút thành công (APPROVED)
    txClient.withdrawalRequest.aggregate({
      where: {
        userId,
        status: "APPROVED",
      },
      _sum: { amount: true },
    }),
    // 5. Tổng số dư Ví đã khấu trừ để đặt đơn mới ([WALLET_ROLLOVER_OUT]), hoàn lại khi hủy QR ([WALLET_ROLLOVER_REFUND]), và hoàn tiền thanh toán trễ ([LATE_PAYMENT_REFUND])
    txClient.ledgerTransaction.findMany({
      where: {
        status: "COMPLETED",
        invoice: {
          rental: {
            renterId: userId,
          },
        },
        OR: [
          {
            type: "WITHDRAWAL_HOLD",
            description: { startsWith: "[WALLET_ROLLOVER_OUT]" },
          },
          {
            type: "REFUND_OUT",
            description: { startsWith: "[WALLET_ROLLOVER_REFUND]" },
          },
          {
            type: "REFUND_OUT",
            description: { startsWith: "[LATE_PAYMENT_REFUND]" },
          },
        ],
      },
      select: {
        invoiceId: true,
        type: true,
        amount: true,
        description: true,
        invoice: {
          select: {
            id: true,
            orderCode: true,
            status: true,
            transactions: {
              where: { status: "PROCESSED" },
              select: { amount: true, status: true, orderCode: true },
            },
          },
        },
      },
    }),
  ]);

  const sourceOrderCodeSet = new Set<string>();
  const seenLateRefundInvoices = new Set<string>();

  let totalRentalOwnerInflow = 0;
  for (const rent of completedOwnerRentals) {
    const inv = rent.invoice;
    if (!inv) continue;
    if (inv.orderCode) {
      sourceOrderCodeSet.add(`PAYOS#${inv.orderCode.toString()}`);
    } else {
      sourceOrderCodeSet.add(`ORD#${rent.id.slice(0, 8).toUpperCase()}`);
    }

    const ledgerSum = (inv.ledgerEntries || []).reduce(
      (sum: number, e: any) => sum + Math.max(0, Number(e.amount || 0)),
      0
    );

    if (ledgerSum > 0) {
      totalRentalOwnerInflow += ledgerSum;
    } else {
      const rentalFee = Number(inv.rentalFee || 0);
      const platformFee = Number(inv.platformFee ?? Math.floor(rentalFee * 0.12));
      const returnShip = rent.shippingCode ? 25000 : 0;
      totalRentalOwnerInflow += Math.max(0, rentalFee - platformFee - returnShip);
    }
  }

  let totalRentalRefundInflow = 0;
  for (const rent of completedRenterRentals) {
    const inv = rent.invoice;
    if (!inv) continue;

    // Nhánh A: Hóa đơn CANCELLED nhưng có khoản thanh toán đến trễ đã được xác thực & hoàn vào Ví
    if (inv.status === "CANCELLED") {
      const invKey = String(inv.id || (inv.orderCode ? `ORD_${inv.orderCode.toString()}` : rent.id));
      if (seenLateRefundInvoices.has(invKey)) {
        continue;
      }

      const lateRefundEntries = (inv.ledgerEntries || []).filter(
        (e: any) =>
          !(e.description || "").startsWith("[WALLET_ROLLOVER_REFUND]") &&
          Math.max(0, Number(e.amount || 0)) > 0
      );
      if (lateRefundEntries.length === 0) {
        continue;
      }

      const firstEntry = lateRefundEntries[0];
      const ledgerAmount = Math.max(0, Math.floor(Number(firstEntry.amount || 0)));
      const sealCheck = verifyLatePaymentRefundEntry({
        description: firstEntry.description,
        userId,
        invoiceId: inv.id,
        orderCode: inv.orderCode,
        amount: ledgerAmount,
      });

      if (!sealCheck.valid) {
        continue;
      }

      const processedTxs = Array.isArray((inv as any).transactions)
        ? (inv as any).transactions.filter(
            (t: any) =>
              t &&
              t.status === "PROCESSED" &&
              Math.floor(Number(t.amount || 0)) === ledgerAmount &&
              (!t.orderCode || String(t.orderCode) === sealCheck.orderCodeStr)
          )
        : [];

      // 🔒 FAIL-CLOSED: Bắt buộc PHẢI CÓ CẢ chữ ký SEAL hợp lệ LẪN chứng từ thanh toán PayOS PROCESSED khớp số tiền & mã đơn
      if (processedTxs.length > 0 && ledgerAmount > 0) {
        seenLateRefundInvoices.add(invKey);
        seenLateRefundInvoices.add(sealCheck.invoiceKey);
        if (sealCheck.orderCodeStr) {
          seenLateRefundInvoices.add(`ORD_${sealCheck.orderCodeStr}`);
          sourceOrderCodeSet.add(`PAYOS_LATE#${sealCheck.orderCodeStr}`);
        } else {
          sourceOrderCodeSet.add(`REF_LATE#${rent.id.slice(0, 8).toUpperCase()}`);
        }
        totalRentalRefundInflow += ledgerAmount;
      }
      continue;
    }

    // Nhánh B: Hóa đơn PAID thông thường
    if (inv.orderCode) {
      sourceOrderCodeSet.add(`PAYOS#${inv.orderCode.toString()}`);
    } else {
      sourceOrderCodeSet.add(`REF#${rent.id.slice(0, 8).toUpperCase()}`);
    }

    const settlementRefundEntries = (inv.ledgerEntries || []).filter(
      (e: any) =>
        !(e.description || "").startsWith("[WALLET_ROLLOVER_REFUND]") &&
        !(e.description || "").startsWith("[LATE_PAYMENT_REFUND]")
    );

    const ledgerRefund = settlementRefundEntries.reduce(
      (sum: number, e: any) => sum + Math.max(0, Number(e.amount || 0)),
      0
    );

    if (ledgerRefund > 0) {
      totalRentalRefundInflow += ledgerRefund;
    } else if (rent.status === "LENDER_COMPLETED") {
      totalRentalRefundInflow += Math.max(0, Number(inv.depositAmount || 0));
    }
  }

  let totalKycTopUpInflow = 0;
  for (const kyc of paidKycTopUps) {
    totalKycTopUpInflow += Math.max(0, Number(kyc.amountVnd || 0));
    if (kyc.orderCode) {
      sourceOrderCodeSet.add(`KYC#${kyc.orderCode.toString()}`);
    }
  }

  let totalRolloverOut = 0;
  let totalRolloverRefunded = 0;
  for (const entry of walletRolloverEntries || []) {
    const desc = entry.description || "";
    if (entry.type === "WITHDRAWAL_HOLD" && desc.startsWith("[WALLET_ROLLOVER_OUT]")) {
      totalRolloverOut += Math.abs(Number(entry.amount || 0));
    } else if (entry.type === "REFUND_OUT" && desc.startsWith("[WALLET_ROLLOVER_REFUND]")) {
      totalRolloverRefunded += Math.max(0, Number(entry.amount || 0));
    } else if (entry.type === "REFUND_OUT" && desc.startsWith("[LATE_PAYMENT_REFUND]")) {
      const entryAmount = Math.max(0, Math.floor(Number(entry.amount || 0)));
      const invObj = (entry as any).invoice;
      const sealCheck = verifyLatePaymentRefundEntry({
        description: desc,
        userId,
        invoiceId: (entry as any).invoiceId || invObj?.id,
        orderCode: invObj?.orderCode,
        amount: entryAmount,
      });
      if (!sealCheck.valid) {
        continue;
      }
      const dedupKey = sealCheck.invoiceKey;
      const orderDedupKey = sealCheck.orderCodeStr ? `ORD_${sealCheck.orderCodeStr}` : "";
      if (
        seenLateRefundInvoices.has(dedupKey) ||
        (orderDedupKey && seenLateRefundInvoices.has(orderDedupKey))
      ) {
        continue;
      }

      const processedTxs = Array.isArray(invObj?.transactions)
        ? invObj.transactions.filter(
            (t: any) =>
              t &&
              t.status === "PROCESSED" &&
              Math.floor(Number(t.amount || 0)) === entryAmount &&
              (!t.orderCode || String(t.orderCode) === sealCheck.orderCodeStr)
          )
        : [];

      // 🔒 FAIL-CLOSED: Bắt buộc PHẢI CÓ chứng từ thanh toán PayOS PROCESSED khớp số tiền & mã đơn đi kèm chữ ký SEAL hợp lệ
      if (processedTxs.length === 0) {
        continue;
      }

      seenLateRefundInvoices.add(dedupKey);
      if (orderDedupKey) {
        seenLateRefundInvoices.add(orderDedupKey);
      }
      if (sealCheck.orderCodeStr) {
        sourceOrderCodeSet.add(`PAYOS_LATE#${sealCheck.orderCodeStr}`);
      }
      totalRentalRefundInflow += entryAmount;
    }
  }
  const totalWalletCheckoutSpent = Math.max(0, totalRolloverOut - totalRolloverRefunded);

  const totalVerifiedInflow =
    totalRentalOwnerInflow + totalRentalRefundInflow + totalKycTopUpInflow;
  const totalApprovedWithdrawals = Number(approvedWithdrawals?._sum?.amount || 0);
  const verifiedMaxRemainingBalance = Math.max(
    0,
    totalVerifiedInflow - totalApprovedWithdrawals - totalWalletCheckoutSpent
  );

  const currentAvailableBalance = Number(user?.walletBalance || 0);
  const currentPendingBalance = Number(user?.pendingWithdrawalBalance || 0);
  const totalCurrentClaimed = currentAvailableBalance + currentPendingBalance;

  // Sai số cho phép tối đa 2.000đ (do làm tròn phí hoặc thưởng KYC nhỏ)
  const unexplainedDiscrepancy = Math.max(
    0,
    totalCurrentClaimed - verifiedMaxRemainingBalance
  );
  const isReconciled = unexplainedDiscrepancy <= 2000;

  return {
    userId,
    currentAvailableBalance,
    currentPendingBalance,
    totalRentalOwnerInflow,
    totalRentalRefundInflow,
    totalKycTopUpInflow,
    totalVerifiedInflow,
    totalApprovedWithdrawals,
    totalWalletCheckoutSpent,
    verifiedMaxRemainingBalance,
    unexplainedDiscrepancy,
    isReconciled,
    sourceOrderCodes: Array.from(sourceOrderCodeSet).slice(0, 8),
  };
}
