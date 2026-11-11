"use server";

import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/auth";
import { computeUserWalletReconciliation, WalletReconciliationProof } from "@/src/lib/wallet-reconciliation";
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
  reconciliation?: WalletReconciliationProof;
}

export async function getPendingPayoutsAction() {
  try {
    await requireAdmin();

    // 1. Lấy các yêu cầu rút tiền đang chờ duyệt (WithdrawalRequest PENDING) - nguồn chi trả tiền mặt thực tế duy nhất ra ngân hàng
    const withdrawalRequests = await prisma.withdrawalRequest.findMany({
      where: { status: "PENDING" },
      take: 30,
      include: {
        user: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    const items: PayoutItem[] = [];

    // Lấy thông tin metadata (SĐT, STK mới nhất) từ auth.users và đối soát chéo 3 bên song song cho các chủ tài khoản rút tiền
    const withdrawalUserIds = Array.from(new Set(withdrawalRequests.map(r => r.userId)));
    const [authMetas, reconciliationEntries] = await Promise.all([
      withdrawalUserIds.length > 0
        ? prisma.$queryRawUnsafe<any[]>(
            `SELECT id, raw_user_meta_data FROM auth.users WHERE id = ANY($1::uuid[]);`,
            withdrawalUserIds
          ).catch(() => [])
        : Promise.resolve([]),
      Promise.all(
        withdrawalUserIds.map(async (uid) => {
          const proof = await computeUserWalletReconciliation(uid);
          return [uid, proof] as const;
        })
      ),
    ]);
    const metaMap = new Map<string, any>();
    authMetas.forEach(m => metaMap.set(m.id, m.raw_user_meta_data || {}));
    const reconciliationMap = new Map<string, WalletReconciliationProof>(reconciliationEntries);

    // Map withdrawal requests (Ưu tiên hiển thị đầu tiên)
    withdrawalRequests.forEach(req => {
      const uMeta = metaMap.get(req.userId) || {};
      const latestPhone = uMeta.phone || "—";
      const latestHolder = req.bankAccountHolder || uMeta.bank_owner || uMeta.bankAccountHolder || req.user?.name || "Chủ tủ CLOOP";
      const latestBank = req.bankName || uMeta.bank_name || uMeta.bankName || "—";
      const latestAccount = req.bankAccountNumber || uMeta.bank_account || uMeta.bankAccountNumber || "—";

      items.push({
        id: req.id,
        orderCode: `WD-${req.id.substring(0, 8).toUpperCase()}`,
        ownerName: latestHolder,
        ownerPhone: latestPhone,
        bankName: latestBank,
        bankAccount: latestAccount,
        bankHolder: latestHolder,
        rentalFee: req.amount,
        platformFee: 0,
        returnShippingFee: 0,
        netPayoutAmount: req.amount,
        status: "PENDING",
        productTitle: "Yêu cầu rút tiền từ Ví người dùng CLOOP",
        completedAt: req.createdAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
        type: "WITHDRAWAL",
        reconciliation: reconciliationMap.get(req.userId)
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
        // 🛡️ CHỐT CHẶN NGUYÊN TỬ: Chỉ duyệt nếu status ĐANG LÀ PENDING (Chống double-approval khi click đúp)
        const lockResult = await tx.withdrawalRequest.updateMany({
          where: { id: payoutId, status: "PENDING" },
          data: {
            status: "APPROVED",
            adminNote: `[FT: ${cleanRefCode}] ${note?.trim() || "Chuyển khoản ngân hàng thành công"}`,
            processedBy: admin.id,
            processedAt: new Date()
          }
        });

        if (lockResult.count === 0) {
          throw new Error("Yêu cầu rút tiền này đã được xử lý bởi tiến trình khác.");
        }

        // 🛡️ CHỐT CHẶN NGUYÊN TỬ: Chỉ trừ tiền đóng băng nếu pendingWithdrawalBalance >= wr.amount
        const userResult = await tx.user.updateMany({
          where: { id: wr.userId, pendingWithdrawalBalance: { gte: wr.amount } },
          data: {
            pendingWithdrawalBalance: { decrement: wr.amount }
          }
        });

        if (userResult.count === 0) {
          throw new Error("Lỗi đối soát: Số dư đóng băng không đủ để tất toán!");
        }

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

/**
 * ❌ ADMIN TỪ CHỐI LỆNH RÚT TIỀN (ATOMIC REFUND LOCK)
 * Hoàn trả tiền từ pendingWithdrawalBalance về walletBalance an toàn, chống double-refund
 */
export async function rejectWithdrawalAction(withdrawalId: string, reason?: string) {
  try {
    const { authUser: adminUser, profile: admin } = await requireAdmin();

    return await prisma.$transaction(async (tx) => {
      const request = await tx.withdrawalRequest.findUnique({
        where: { id: withdrawalId },
      });

      if (!request || request.status !== "PENDING") {
        throw new Error("Yêu cầu rút tiền không tồn tại hoặc đã được xử lý trước đó.");
      }

      // 🛡️ KHÓA NGUYÊN TỬ TRẠNG THÁI: Chỉ chuyển sang REJECTED nếu hiện tại ĐANG LÀ PENDING
      const statusLock = await tx.withdrawalRequest.updateMany({
        where: {
          id: withdrawalId,
          status: "PENDING", // Chặn đứng request thứ 2 nếu Admin click đúp!
        },
        data: {
          status: "REJECTED",
          rejectionReason: reason?.trim() || "Từ chối yêu cầu rút tiền",
          processedBy: admin.id,
          processedAt: new Date(),
        },
      });

      if (statusLock.count === 0) {
        throw new Error("Giao dịch đang được xử lý bởi một tiến trình khác.");
      }

      // 🛡️ HOÀN TRẢ TIỀN: pendingWithdrawalBalance về lại walletBalance (kèm điều kiện gte an toàn)
      const refundResult = await tx.user.updateMany({
        where: {
          id: request.userId,
          pendingWithdrawalBalance: { gte: request.amount },
        },
        data: {
          pendingWithdrawalBalance: { decrement: request.amount },
          walletBalance: { increment: request.amount },
        },
      });

      if (refundResult.count === 0) {
        throw new Error("Phát hiện bất thường số dư đóng băng, hủy bỏ thao tác hoàn tiền!");
      }

      await tx.auditLog.create({
        data: {
          adminId: admin.id,
          action: "WITHDRAWAL_REJECTED_AND_REFUNDED",
          targetType: "WITHDRAWAL_REQUEST",
          targetId: withdrawalId,
          metadata: JSON.stringify({
            refundedUserId: request.userId,
            amount: request.amount,
            reason: reason?.trim() || "",
            adminEmail: adminUser.email,
            processedAt: new Date().toISOString()
          })
        },
      });

      revalidatePath("/admin/payments");
      revalidatePath("/admin/ledger");
      revalidatePath("/my-closet/wallet");

      return { success: true };
    });
  } catch (error: any) {
    console.error("Lỗi từ chối lệnh rút tiền:", error);
    return { success: false, error: error.message };
  }
}
