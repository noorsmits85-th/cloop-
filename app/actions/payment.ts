"use server";

import { prisma } from "@/src/lib/prisma";
import { payos } from "@/src/utils/payos";
import { requireUser } from "@/src/lib/auth";
import { toSafeErrorMessage } from "@/src/lib/safe-error";
import {
  computeUserWalletReconciliation,
  getActiveWalletHoldForInvoice,
  releasePendingWalletHoldForInvoice,
  verifyWalletRolloverEntry,
} from "@/src/lib/wallet-reconciliation";

/**
 * @deprecated Luồng tạo link thanh toán đã được chuyển sang `/api/checkout`
 * để áp dụng tính cọc linh hoạt (Dynamic Deposit), kiểm tra Quỹ bảo chứng thực tế và Trust Score.
 */
export async function createPayOSPaymentLink(_rentalId: string) {
  return {
    success: false,
    error: "Phương thức này đã ngừng hoạt động. Vui lòng thanh toán qua luồng checkout chuẩn của CLOOP.",
  };
}

/**
 * Truy vấn Số dư Ví khả dụng đã qua đối soát 3 bên (3-Way Reconciliation) để hiển thị tại Checkout
 */
export async function getUserVerifiedCheckoutWalletAction() {
  try {
    const authUser = await requireUser();
    const recon = await computeUserWalletReconciliation(authUser.id);
    const verifiedBalance = recon.isReconciled
      ? Math.max(0, Math.min(recon.currentAvailableBalance, recon.verifiedMaxRemainingBalance))
      : 0;
    return {
      success: true,
      walletBalance: verifiedBalance,
      rawWalletBalance: recon.currentAvailableBalance,
      isReconciled: recon.isReconciled,
      sourceOrderCodes: recon.sourceOrderCodes,
    };
  } catch {
    return {
      success: false,
      walletBalance: 0,
      rawWalletBalance: 0,
      isReconciled: false,
      sourceOrderCodes: [] as string[],
    };
  }
}

/**
 * Hủy đơn PENDING và hoàn trả ngay lập tức số dư Ví đã tạm khóa khi khách đóng hộp thoại QR
 */
export async function cancelPendingCheckoutOrderAction(orderCode: number | string) {
  try {
    const authUser = await requireUser();
    const numericOrderCode = typeof orderCode === "string" ? Number(orderCode) : orderCode;
    if (!Number.isSafeInteger(numericOrderCode) || numericOrderCode <= 0) {
      return { success: false, error: "Mã đơn hàng không hợp lệ" };
    }

    const invoice = await prisma.invoice.findUnique({
      where: { orderCode: BigInt(numericOrderCode) },
      include: { rental: true },
    });

    if (!invoice) {
      return { success: false, error: "Không tìm thấy hóa đơn" };
    }

    if (invoice.rental?.renterId !== authUser.id && authUser.role !== "ADMIN") {
      return { success: false, error: "Bạn không có quyền hủy hóa đơn này." };
    }

    if (invoice.status === "PAID") {
      return { success: false, alreadyPaid: true, error: "Đơn hàng đã được thanh toán." };
    }

    // Kiểm tra nhanh trên PayOS phòng trường hợp khách vừa chuyển khoản xong lại bấm đóng
    if (payos) {
      try {
        const paymentInfo = await payos.paymentRequests.get(numericOrderCode);
        if (paymentInfo && paymentInfo.status === "PAID") {
          return await checkAndSyncPaymentStatusAction(numericOrderCode);
        }
        if (paymentInfo && paymentInfo.status === "PENDING") {
          await payos.paymentRequests.cancel(numericOrderCode, "Khach hang dong cua so thanh toan QR").catch(() => {});
        }
      } catch (_) {}
    }

    let refundedWalletAmount = 0;
    await prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.updateMany({
        where: { id: invoice.id, status: "PENDING" },
        data: { status: "CANCELLED", payosStatus: "USER_CANCELLED" },
      });

      if (updated.count === 0) return;

      if (invoice.rental?.renterId) {
        refundedWalletAmount = await releasePendingWalletHoldForInvoice(tx, {
          invoiceId: invoice.id,
          renterId: invoice.rental.renterId,
          orderCode: numericOrderCode,
          reason: "Khách chủ động đóng hộp thoại thanh toán QR",
        });
      }

      if (invoice.rentalId) {
        await tx.rentalHistory.update({
          where: { id: invoice.rentalId },
          data: { status: "CANCELLED" },
        });
      }
    });

    const recon = await computeUserWalletReconciliation(authUser.id);
    const verifiedBalance = recon.isReconciled
      ? Math.max(0, Math.min(recon.currentAvailableBalance, recon.verifiedMaxRemainingBalance))
      : 0;

    return {
      success: true,
      cancelled: true,
      refundedWalletAmount,
      updatedWalletBalance: verifiedBalance,
    };
  } catch (error: any) {
    return { success: false, error: toSafeErrorMessage(error, "Lỗi hủy đơn tạm thời.") };
  }
}

export async function checkAndSyncPaymentStatusAction(orderCode: number | string) {
  try {
    let authUser;
    try {
      authUser = await requireUser();
    } catch {
      return { success: false, error: "Vui lòng đăng nhập để kiểm tra trạng thái thanh toán." };
    }

    if (!orderCode) {
      return { success: false, error: "Mã đơn hàng không hợp lệ" };
    }

    if (!payos) {
      return { success: false, error: "Cấu hình PayOS chưa sẵn sàng trên server." };
    }

    const numericOrderCode = typeof orderCode === "string" ? Number(orderCode) : orderCode;
    if (!Number.isSafeInteger(numericOrderCode) || numericOrderCode <= 0) {
      return { success: false, error: "Mã đơn hàng không hợp lệ" };
    }

    const invoice = await prisma.invoice.findUnique({
      where: { orderCode: BigInt(numericOrderCode) },
      include: { rental: true }
    });

    if (!invoice) {
      return { success: false, error: "Không tìm thấy hóa đơn" };
    }

    const isOwnerOrRenter =
      authUser.role === "ADMIN" ||
      invoice.rental?.renterId === authUser.id ||
      invoice.rental?.ownerId === authUser.id;
    if (!isOwnerOrRenter) {
      return { success: false, error: "Bạn không có quyền truy cập hóa đơn này." };
    }

    // Nếu DB đã PAID rồi thì trả về ngay
    if (invoice.status === "PAID") {
      return { success: true, isPaid: true, status: "PAID" };
    }

    const { walletHoldAmount, holdDescription } = await getActiveWalletHoldForInvoice(invoice.id);
    let expectedPayosAmount = invoice.amount;
    if (walletHoldAmount > 0 && invoice.rental?.renterId) {
      const sealCheck = verifyWalletRolloverEntry({
        description: holdDescription,
        userId: invoice.rental.renterId,
        invoiceId: invoice.id,
        orderCode: BigInt(numericOrderCode),
        walletUsedAmount: walletHoldAmount,
        invoiceTotalAmount: invoice.amount,
      });
      if (sealCheck.valid) {
        expectedPayosAmount = sealCheck.payosAmountToCollect;
      }
    }

    // Webhook Fallback: Gọi trực tiếp PayOS API để hỏi thăm trạng thái
    try {
      const paymentInfo = await payos.paymentRequests.get(numericOrderCode);

      if (paymentInfo && (paymentInfo.status === "CANCELLED" || paymentInfo.status === "EXPIRED")) {
        await prisma.$transaction(async (tx) => {
          const updated = await tx.invoice.updateMany({
            where: { id: invoice.id, status: "PENDING" },
            data: { status: "CANCELLED", payosStatus: paymentInfo.status }
          });
          if (updated.count > 0) {
            if (invoice.rental?.renterId) {
              await releasePendingWalletHoldForInvoice(tx, {
                invoiceId: invoice.id,
                renterId: invoice.rental.renterId,
                orderCode: numericOrderCode,
                reason: `Mã QR PayOS ${paymentInfo.status}`,
              });
            }
            if (invoice.rentalId) {
              await tx.rentalHistory.update({
                where: { id: invoice.rentalId },
                data: { status: "CANCELLED" },
              });
            }
          }
        });
        return { success: true, isPaid: false, status: "CANCELLED" };
      }

      const isActuallyPaid = Boolean(
        paymentInfo &&
          paymentInfo.status === "PAID" &&
          Number(paymentInfo.amountPaid ?? expectedPayosAmount) >= expectedPayosAmount
      );

      if (isActuallyPaid) {
        const paidCashAmount = Number(paymentInfo.amountPaid ?? expectedPayosAmount);
        // Thực thi Atomic Settlement Inflow giống Webhook
        await prisma.$transaction(async (tx) => {
          const updateResult = await tx.invoice.updateMany({
            where: { id: invoice.id, status: "PENDING" },
            data: { status: "PAID", payosStatus: "success" }
          });

          if (updateResult.count === 0) return;

          const depositDesc =
            walletHoldAmount > 0
              ? `Tiền nạp Két bảo chứng qua Fallback Sync (PayOS: ${paidCashAmount.toLocaleString("vi-VN")}đ + Ví nội bộ: ${walletHoldAmount.toLocaleString("vi-VN")}đ) - OrderCode ${numericOrderCode}`
              : `Tiền nạp qua Webhook Fallback Sync - OrderCode ${numericOrderCode}`;

          await tx.ledgerTransaction.create({
            data: {
              invoiceId: invoice.id,
              type: "DEPOSIT_IN",
              amount: invoice.amount,
              description: depositDesc,
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
              amount: paidCashAmount,
              invoiceAmount: invoice.amount,
              status: "PROCESSED",
              rawPayload: paymentInfo as any,
              processedAt: new Date()
            },
            update: {
              status: "PROCESSED",
              amount: paidCashAmount,
              invoiceAmount: invoice.amount,
              rawPayload: paymentInfo as any,
              processedAt: new Date()
            }
          });
        });

        // Dọn dẹp cache đồng bộ ngay lập tức cho /shop, /app, và /my-closet/orders
        try {
          const { revalidatePath, revalidateTag } = require("next/cache");
          revalidateTag("products");
          revalidateTag("shop-products");
          revalidatePath("/shop");
          revalidatePath("/");
          revalidatePath("/app");
          revalidatePath("/my-closet/orders");
          revalidatePath("/my-closet/wallet");
        } catch (_) {}

        return { success: true, isPaid: true, status: "PAID" };
      }

      return { 
        success: true, 
        isPaid: false, 
        status: paymentInfo?.status || "PENDING",
        amountPaid: paymentInfo?.amountPaid || 0,
        amountRemaining: paymentInfo?.amountRemaining ?? expectedPayosAmount
      };
    } catch (payosErr: any) {
      console.warn("PayOS status check query error:", payosErr.message);
      return { success: true, isPaid: false, status: invoice.status };
    }
  } catch (error: any) {
    console.error("Lỗi đồng bộ thanh toán:", error);
    return { success: false, error: toSafeErrorMessage(error, "Lỗi đồng bộ thanh toán.") };
  }
}
