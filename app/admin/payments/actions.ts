"use server";

import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/auth";
import { revalidatePath } from "next/cache";
import { payos } from "@/src/utils/payos";

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

/**
 * Kiểm tra trạng thái giao dịch trực tiếp với cổng PayOS
 */
export async function syncPayosTransactionStatusAction(payoutId: string) {
  try {
    await requireAdmin();
    if (!payos) {
      return { 
        success: false, 
        error: "Cấu hình cổng PayOS chưa được khởi tạo trên máy chủ." 
      };
    }

    // Trường hợp 1: Yêu cầu rút tiền từ Ví (Withdrawal Request)
    const wr = await prisma.withdrawalRequest.findUnique({ where: { id: payoutId } });
    if (wr) {
      try {
        const payoutInfo = await (payos as any).payouts?.get(payoutId);
        if (payoutInfo && payoutInfo.approvalState === "COMPLETED") {
          return {
            success: true,
            isPaid: true,
            source: "PAYOS_PAYOUT",
            referenceId: payoutInfo.referenceId,
            message: "PayOS đã xác nhận giải ngân thành công qua cổng chi hộ tự động."
          };
        }
      } catch (payosErr: any) {
        const errMsg = payosErr?.message || "";
        return {
          success: false,
          isPaid: false,
          source: "PAYOS_DISBURSEMENT_CHECK",
          code: payosErr?.code || 601,
          message: errMsg.includes("601") || errMsg.includes("không tồn tại")
            ? "Tài khoản PayOS hiện tại là cổng Merchant thu tiền (Inflow), chưa kích hoạt gói Doanh nghiệp Chi Hộ B2C (Mã 601). Quỹ sàn chuyển khoản ngân hàng 24/7 trực tiếp cho người nhận và nhập Mã giao dịch ngân hàng (FT Code) để đối soát vào Sổ Cái."
            : `Phản hồi từ PayOS: ${errMsg}`
        };
      }
    }

    // Trường hợp 2: Đơn thuê (Rental History) liên kết với Invoice PayOS
    const rental = await prisma.rentalHistory.findUnique({
      where: { id: payoutId },
      include: { invoice: true }
    });

    if (rental && rental.invoice?.orderCode) {
      const orderCodeNum = Number(rental.invoice.orderCode);
      const paymentInfo = await payos.paymentRequests.get(orderCodeNum);
      const isPaid = paymentInfo?.status === "PAID";
      return {
        success: true,
        isPaid,
        source: "PAYOS_PAYMENT",
        orderCode: orderCodeNum,
        status: paymentInfo?.status,
        amountPaid: paymentInfo?.amountPaid,
        message: isPaid
          ? `PayOS đã ghi nhận thanh toán thành công cho đơn #${orderCodeNum}.`
          : `Đơn #${orderCodeNum} trên cổng PayOS đang ở trạng thái: ${paymentInfo?.status || "PENDING"}.`
      };
    }

    return {
      success: false,
      message: "Không tìm thấy thông tin đơn hàng trên cổng PayOS."
    };
  } catch (error: any) {
    console.error("Lỗi đồng bộ PayOS:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Xác nhận giải ngân chi trả kèm Mã giao dịch ngân hàng thực tế (FT Code)
 * Ngăn chặn tuyệt đối việc bấm duyệt ảo không có vết kế toán ngân hàng
 */
export async function markPayoutCompletedAction(
  payoutId: string,
  bankRefCode: string,
  note?: string
) {
  try {
    const { authUser: adminUser, profile: admin } = await requireAdmin();

    const cleanRefCode = (bankRefCode || "").trim().toUpperCase();
    if (!cleanRefCode || cleanRefCode.length < 5) {
      return {
        success: false,
        error: "Vui lòng nhập Mã giao dịch ngân hàng thực tế (FT Code - tối thiểu 5 ký tự) để hoàn tất đối soát kế toán."
      };
    }

    // Kiểm tra xem mã FT này đã từng được sử dụng chưa (chống gian lận/chùng lặp)
    const existingAudit = await prisma.auditLog.findFirst({
      where: {
        action: { in: ["WITHDRAWAL_APPROVED", "PAYOUT_TRANSFER_CONFIRMED"] },
        metadata: { contains: cleanRefCode }
      }
    });

    if (existingAudit) {
      return {
        success: false,
        error: `Mã giao dịch ngân hàng ${cleanRefCode} đã được dùng cho giao dịch trước đó. Vui lòng kiểm tra lại sao kê ngân hàng.`
      };
    }

    // 1. Nếu là WithdrawalRequest
    const wr = await prisma.withdrawalRequest.findUnique({ where: { id: payoutId } });
    if (wr && wr.status === "PENDING") {
      await prisma.$transaction(async (tx) => {
        await tx.withdrawalRequest.update({
          where: { id: payoutId },
          data: {
            status: "APPROVED",
            adminNote: `[FT: ${cleanRefCode}] ${note?.trim() || "Chuyển khoản ngân hàng thành công"}`,
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
            adminId: admin.id,
            description: `[Mã GD: ${cleanRefCode}] Giải ngân chuyển khoản thành công ${wr.amount.toLocaleString('vi-VN')}₫ về ${wr.bankName} (${wr.bankAccountNumber}) cho ${wr.bankAccountHolder}`,
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
              bankRefCode: cleanRefCode,
              note: note?.trim() || "",
              amount: wr.amount,
              bankName: wr.bankName,
              bankAccountNumber: wr.bankAccountNumber,
              bankAccountHolder: wr.bankAccountHolder,
              adminEmail: adminUser.email,
              processedAt: new Date().toISOString()
            })
          }
        });
      });
    }

    // 2. Nếu là đơn thuê
    const rental = await prisma.rentalHistory.findUnique({ where: { id: payoutId } });
    if (rental) {
      await prisma.auditLog.create({
        data: {
          adminId: admin.id,
          action: "PAYOUT_TRANSFER_CONFIRMED",
          targetType: "RENTAL",
          targetId: rental.id,
          metadata: JSON.stringify({
            bankRefCode: cleanRefCode,
            note: note?.trim() || "",
            adminEmail: adminUser.email,
            payoutConfirmedAt: new Date().toISOString()
          })
        }
      });
    }

    revalidatePath("/admin/payments");
    revalidatePath("/admin/ledger");
    revalidatePath("/admin");

    return { success: true, bankRefCode: cleanRefCode };
  } catch (error: any) {
    console.error("Lỗi xác nhận giải ngân:", error);
    return { success: false, error: error.message };
  }
}
