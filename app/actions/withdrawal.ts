"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/auth";
import { computeUserWalletReconciliation } from "@/src/lib/wallet-reconciliation";
import { verifyBankKyc } from "@/src/utils/bank-kyc";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const DAILY_WITHDRAWAL_CAP_VND = 10_000_000;

const WithdrawalSchema = z.object({
  amount: z.number().int().min(10000).max(DAILY_WITHDRAWAL_CAP_VND),
  bankName: z.string().trim().min(2).max(80),
  bankAccountNumber: z.string().trim().regex(/^[0-9]{6,32}$/),
  bankAccountHolder: z.string().trim().min(2).max(80),
  password: z.string().optional(),
  clientUserId: z.string().optional(),
});

/**
 * 🏦 LIÊN KẾT & LƯU TÀI KHOẢN NGÂN HÀNG CHÍNH CHỦ
 * Đồng bộ hai chiều giữa Web & Mobile App vào auth.users.raw_user_meta_data
 */
export async function saveUserBankInfoAction(data: {
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  clientUserId?: string;
}) {
  try {
    let user;
    try {
      user = await requireUser();
    } catch {
      return { success: false, message: "Vui lòng đăng nhập để lưu tài khoản ngân hàng." };
    }
    const userId = user.id;

    if (!data.bankName?.trim() || !data.bankAccountNumber?.trim() || !data.bankAccountHolder?.trim()) {
      return { success: false, message: "Vui lòng điền đầy đủ tên ngân hàng, số tài khoản và tên chủ tài khoản." };
    }

    const cleanAccount = data.bankAccountNumber.trim().replace(/\s+/g, "");
    const cleanHolder = data.bankAccountHolder.trim().toUpperCase().slice(0, 80);
    const cleanBank = data.bankName.trim().slice(0, 80);

    if (!/^[0-9]{6,32}$/.test(cleanAccount)) {
      return { success: false, message: "Số tài khoản ngân hàng không hợp lệ (chỉ gồm 6-32 chữ số)." };
    }

    // 🔒 Kiểm tra đối chiếu tên thụ hưởng (FAIL-CLOSED & SERVER-CONTROLLED BENEFICIARY RECORD):
    // Tuyệt đối KHÔNG đọc verified_legal_name hay bank_owner từ raw_user_meta_data (vì client SDK có thể tự ghi vào user_metadata),
    // và KHÔNG dùng .catch(() => null) nuốt lỗi DB (phải fail-closed khi truy vấn lỗi).
    // Đối chiếu với: (1) prisma.user.name trên Server, (2) bản ghi định danh thụ hưởng đầu tiên khóa trong AuditLog (BENEFICIARY_KYC_LOCKED),
    // và (3) lịch sử rút tiền đã khóa trên Server (WithdrawalRequest).
    const [dbUser, priorWithdrawal, lockedBeneficiaryAudit] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, isVerified: true }
      }),
      prisma.withdrawalRequest?.findFirst
        ? prisma.withdrawalRequest.findFirst({
            where: {
              userId,
              status: { in: ["APPROVED", "COMPLETED", "PROCESSING", "PENDING"] }
            },
            orderBy: { createdAt: "asc" },
            select: { bankAccountHolder: true }
          })
        : Promise.resolve(null),
      prisma.auditLog?.findFirst
        ? prisma.auditLog.findFirst({
            where: {
              targetType: "USER_IDENTITY",
              targetId: userId,
              action: "BENEFICIARY_KYC_LOCKED"
            },
            orderBy: { createdAt: "asc" },
            select: { metadata: true }
          })
        : Promise.resolve(null)
    ]);

    const verifiedLegalName = (dbUser?.name || "").trim();
    let lockedBeneficiaryHolder = "";
    let lockedLegalName = "";
    if (lockedBeneficiaryAudit?.metadata) {
      try {
        const parsedMeta = JSON.parse(lockedBeneficiaryAudit.metadata);
        lockedBeneficiaryHolder = String(parsedMeta?.bankAccountHolder || "").trim();
        lockedLegalName = String(parsedMeta?.verifiedLegalName || "").trim();
      } catch (_) {}
    }

    if (!dbUser?.isVerified) {
      return {
        success: false,
        message: "Vui lòng hoàn tất định danh tài khoản trước khi liên kết tài khoản ngân hàng nhận tiền."
      };
    }

    if (!verifiedLegalName || !verifyBankKyc(verifiedLegalName, cleanHolder)) {
      return {
        success: false,
        message: `Quy tắc đối chiếu tên thụ hưởng (Bank-KYC): Tên chủ tài khoản ngân hàng ("${cleanHolder}") phải trùng khớp với họ tên hồ sơ đã khóa trên hệ thống ("${(verifiedLegalName || "CHƯA CẬP NHẬT").toUpperCase()}").`
      };
    }

    if (
      (lockedLegalName && !verifyBankKyc(lockedLegalName, cleanHolder)) ||
      (lockedBeneficiaryHolder && !verifyBankKyc(lockedBeneficiaryHolder, cleanHolder))
    ) {
      return {
        success: false,
        message: `Quy tắc đối chiếu tên thụ hưởng (Bank-KYC): Tên chủ tài khoản ngân hàng ("${cleanHolder}") không khớp với hồ sơ thụ hưởng gốc đã khóa bất biến trên máy chủ.`
      };
    }

    if (priorWithdrawal?.bankAccountHolder && !verifyBankKyc(priorWithdrawal.bankAccountHolder, cleanHolder)) {
      return {
        success: false,
        message: `Quy tắc đối chiếu tên thụ hưởng (Bank-KYC): Tên chủ tài khoản ngân hàng ("${cleanHolder}") không khớp với hồ sơ thụ hưởng đã xác thực trước đó.`
      };
    }

    // Ghi nhận bản ghi định danh thụ hưởng đầu tiên bất biến trên máy chủ (nếu chưa có)
    if (!lockedBeneficiaryAudit && typeof prisma.auditLog?.create === "function") {
      await prisma.auditLog.create({
        data: {
          adminId: userId,
          action: "BENEFICIARY_KYC_LOCKED",
          targetType: "USER_IDENTITY",
          targetId: userId,
          metadata: JSON.stringify({
            verifiedLegalName,
            bankAccountHolder: cleanHolder,
            bankAccountNumber: cleanAccount,
            bankName: cleanBank,
            provenance: "SERVER_BENEFICIARY_NAME_LOCK",
            lockedAt: new Date().toISOString()
          })
        }
      });
    }

    const bankPayload = {
      bank_name: cleanBank,
      bank_account: cleanAccount,
      bank_owner: cleanHolder,
      bankName: cleanBank,
      bankAccountNumber: cleanAccount,
      bankAccountHolder: cleanHolder
    };

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE auth.users SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || $1::jsonb WHERE id = $2::uuid;`,
        JSON.stringify(bankPayload),
        userId
      );
    } catch (e) {
      console.warn("Direct auth.users metadata update fallback for bank:", e);
    }

    try {
      const { createClient } = await import("@/src/utils/supabase/server");
      const supabase = await createClient();
      await supabase.auth.updateUser({
        data: bankPayload
      });
    } catch (_) {}

    // 🛡️ BẢO MẬT CHỐNG ĐÁNH TRÁO TÀI KHOẢN RÚT TIỀN (TOCTOU BANK SWAP LOCK):
    // Tuyệt đối KHÔNG ghi đè bankAccountNumber / bankAccountHolder của các lệnh rút tiền đang PENDING.
    // Lệnh rút tiền đã tạo phải giữ nguyên thông tin ngân hàng tại thời điểm khóa tiền.

    try {
      const { clearUserAuthCache } = await import("@/src/lib/auth");
      clearUserAuthCache(userId);
    } catch (_) {}

    revalidatePath("/my-closet/wallet");
    revalidatePath("/my-closet/settings");
    revalidatePath("/admin/payments");
    revalidatePath("/app");

    return {
      success: true,
      message: "Liên kết tài khoản ngân hàng thành công!",
      bankInfo: {
        bankName: cleanBank,
        bankAccount: cleanAccount,
        bankOwner: cleanHolder
      }
    };
  } catch (error: any) {
    console.error("Lỗi lưu tài khoản ngân hàng:", error);
    return { success: false, message: "Không thể lưu thông tin ngân hàng." };
  }
}

/**
 * 💳 YÊU CẦU RÚT TIỀN VỀ TÀI KHOẢN NGÂN HÀNG (ATOMIC HOLD TRANSACTION)
 * Hỗ trợ đồng thời cả phiên web SSR lẫn phiên mobile app ID Xanh
 */
export async function requestWithdrawalAction(data: {
  amount: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  password?: string;
  clientUserId?: string;
}) {
  try {
    let authUser;
    try {
      authUser = await requireUser();
    } catch {
      return { success: false, message: "Vui lòng đăng nhập bằng ID Xanh để thực hiện rút tiền." };
    }
    const userId = authUser.id;

    const parsed = WithdrawalSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, message: "Thông tin rút tiền không hợp lệ. Vui lòng kiểm tra số tiền (tối thiểu 10.000đ) và thông tin ngân hàng." };
    }

    const { amount, bankName, bankAccountNumber, bankAccountHolder } = parsed.data;

    if (!amount || amount < 10000) {
      return { success: false, message: "Số tiền rút tối thiểu là 10,000 VNĐ." };
    }

    if (!bankName || !bankAccountNumber || !bankAccountHolder) {
      return { success: false, message: "Vui lòng điền đầy đủ thông tin tài khoản ngân hàng nhận tiền." };
    }

    // 🔒 ĐỐI CHIẾU TÊN THỤ HƯỞNG (BANK-KYC ANTI-FRAUD VERIFICATION - FAIL CLOSED & SERVER-CONTROLLED)
    // Chỉ lấy họ tên từ bảng prisma.user.name và bản ghi thụ hưởng bất biến trên Server (không dùng .catch(() => null))
    const [currentUser, priorWithdrawal, lockedBeneficiaryAudit] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, isVerified: true, walletBalance: true, pendingWithdrawalBalance: true }
      }),
      prisma.withdrawalRequest?.findFirst
        ? prisma.withdrawalRequest.findFirst({
            where: {
              userId,
              status: { in: ["APPROVED", "COMPLETED", "PROCESSING", "PENDING"] }
            },
            orderBy: { createdAt: "asc" },
            select: { bankAccountHolder: true }
          })
        : Promise.resolve(null),
      prisma.auditLog?.findFirst
        ? prisma.auditLog.findFirst({
            where: {
              targetType: "USER_IDENTITY",
              targetId: userId,
              action: "BENEFICIARY_KYC_LOCKED"
            },
            orderBy: { createdAt: "asc" },
            select: { metadata: true }
          })
        : Promise.resolve(null)
    ]);

    const verifiedLegalName = (currentUser?.name || "").trim();
    let lockedBeneficiaryHolder = "";
    let lockedLegalName = "";
    if (lockedBeneficiaryAudit?.metadata) {
      try {
        const parsedMeta = JSON.parse(lockedBeneficiaryAudit.metadata);
        lockedBeneficiaryHolder = String(parsedMeta?.bankAccountHolder || "").trim();
        lockedLegalName = String(parsedMeta?.verifiedLegalName || "").trim();
      } catch (_) {}
    }

    if (!currentUser?.isVerified) {
      return {
        success: false,
        message: "Tài khoản chưa hoàn tất định danh. Vui lòng xác thực tài khoản trước khi rút tiền."
      };
    }

    if (!verifiedLegalName || !verifyBankKyc(verifiedLegalName, bankAccountHolder)) {
      return {
        success: false,
        message: `Quy tắc đối chiếu tên thụ hưởng (Bank-KYC): Tên chủ tài khoản ngân hàng ("${bankAccountHolder.toUpperCase()}") không khớp với họ tên hồ sơ đã khóa ("${(verifiedLegalName || "CHƯA CẬP NHẬT").toUpperCase()}").`
      };
    }

    if (
      (lockedLegalName && !verifyBankKyc(lockedLegalName, bankAccountHolder)) ||
      (lockedBeneficiaryHolder && !verifyBankKyc(lockedBeneficiaryHolder, bankAccountHolder))
    ) {
      return {
        success: false,
        message: `Quy tắc đối chiếu tên thụ hưởng (Bank-KYC): Tên chủ tài khoản ngân hàng ("${bankAccountHolder.toUpperCase()}") không khớp với hồ sơ thụ hưởng gốc đã khóa bất biến trên máy chủ.`
      };
    }

    if (priorWithdrawal?.bankAccountHolder && !verifyBankKyc(priorWithdrawal.bankAccountHolder, bankAccountHolder)) {
      return {
        success: false,
        message: `Quy tắc đối chiếu tên thụ hưởng (Bank-KYC): Tên chủ tài khoản ngân hàng ("${bankAccountHolder.toUpperCase()}") không khớp với hồ sơ thụ hưởng đã xác thực trước đó.`
      };
    }

    // 🛡️ BỘ ĐỐI SOÁT CHÉO 3 BÊN (3-WAY RECONCILIATION GUARD) TRƯỚC KHI KHÓA TIỀN
    const reconciliation = await computeUserWalletReconciliation(userId);
    if (!reconciliation.isReconciled || amount > reconciliation.verifiedMaxRemainingBalance + 2000) {
      await prisma.auditLog.create({
        data: {
          adminId: userId,
          action: "WITHDRAWAL_RECONCILIATION_BLOCKED",
          targetType: "USER_WALLET",
          targetId: userId,
          metadata: JSON.stringify({
            requestedAmount: amount,
            currentAvailableBalance: reconciliation.currentAvailableBalance,
            verifiedMaxRemainingBalance: reconciliation.verifiedMaxRemainingBalance,
            unexplainedDiscrepancy: reconciliation.unexplainedDiscrepancy,
            sourceOrderCodes: reconciliation.sourceOrderCodes,
            blockedAt: new Date().toISOString(),
          }),
        },
      }).catch(() => {});

      return {
        success: false,
        message: "Hệ thống đối soát phát hiện số dư ví chưa khớp với chứng từ thanh toán thực tế trên PayOS. Yêu cầu đã được chuyển sang bộ phận Kiểm toán viên để xác minh."
      };
    }

    // 🛡️ ATOMIC HOLD TRANSACTION: Trừ trực tiếp walletBalance chuyển sang pendingWithdrawalBalance
    const result = await prisma.$transaction(async (tx) => {
      // 0. Khóa tuần tự theo từng tài khoản (Per-user Serialization Lock) để chặn hoàn toàn Race Condition tạo nhiều lệnh PENDING hoặc vượt trần 24h
      if (typeof (tx as any).$executeRawUnsafe === "function") {
        await (tx as any).$executeRawUnsafe(
          `SELECT pg_advisory_xact_lock(hashtext($1));`,
          `cloop_withdrawal_user_lock:${userId}`
        );
      }

      // 0a. Chặn spam nhiều lệnh rút cùng lúc: Mỗi tài khoản chỉ được có tối đa 1 lệnh PENDING
      const existingPending = await tx.withdrawalRequest.count({
        where: { userId, status: "PENDING" }
      });
      if (existingPending > 0) {
        throw new Error("Bạn đang có 1 yêu cầu rút tiền chờ xử lý. Vui lòng đợi giải ngân hoàn tất trước khi tạo lệnh mới.");
      }

      // 0b. Giới hạn hạn mức rút tối đa trong 24 giờ (10.000.000 VNĐ/ngày)
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dailyStats = await tx.withdrawalRequest.aggregate({
        where: {
          userId,
          status: { in: ["PENDING", "APPROVED"] },
          createdAt: { gte: since24h }
        },
        _sum: { amount: true }
      });
      const withdrawnLast24h = Number(dailyStats?._sum?.amount || 0);
      if (withdrawnLast24h + amount > DAILY_WITHDRAWAL_CAP_VND) {
        throw new Error(`Hạn mức rút tiền tối đa trong 24 giờ là ${DAILY_WITHDRAWAL_CAP_VND.toLocaleString("vi-VN")}₫. Hôm nay bạn đã rút ${withdrawnLast24h.toLocaleString("vi-VN")}₫.`);
      }

      // 1. Kiểm tra số dư người dùng
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true, pendingWithdrawalBalance: true }
      });

      if (!user) {
        throw new Error("Không tìm thấy thông tin tài khoản.");
      }

      // 1b. Tái xác thực Đối Soát Chéo 3 Bên ngay bên trong Transaction (truyền tx trực tiếp) để triệt tiêu khe hở TOCTOU
      const txReconciliation = await computeUserWalletReconciliation(userId, tx);
      if (!txReconciliation.isReconciled || amount > txReconciliation.verifiedMaxRemainingBalance + 2000) {
        throw new Error("Phát hiện chênh lệch đối soát số dư ví với chứng từ PayOS. Yêu cầu rút tiền đã bị khóa để kiểm toán.");
      }

      if (user.walletBalance < amount) {
        throw new Error(`Số dư khả dụng không đủ. Bạn có: ${user.walletBalance.toLocaleString("vi-VN")}₫, muốn rút: ${amount.toLocaleString("vi-VN")}₫`);
      }

      // 2. Chuyển tiền từ khả dụng sang trạng thái HOLD nguyên tử (Atomic Update chống Race Condition)
      const chargeResult = await tx.user.updateMany({
        where: {
          id: userId,
          walletBalance: { gte: amount }
        },
        data: {
          walletBalance: { decrement: amount },
          pendingWithdrawalBalance: { increment: amount }
        }
      });

      if (chargeResult.count === 0) {
        throw new Error("Số dư không đủ hoặc giao dịch đang được xử lý trùng lặp.");
      }

      const updatedUser = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { walletBalance: true, pendingWithdrawalBalance: true }
      });

      // 3. Chốt chặn bảo mật: Kiểm tra số dư không bao giờ được âm
      if (updatedUser.walletBalance < 0) {
        throw new Error("Phát hiện xung đột số dư! Lệnh rút tiền bị hủy.");
      }

      // 4. Tạo bản ghi WithdrawalRequest PENDING
      const withdrawal = await tx.withdrawalRequest.create({
        data: {
          userId: userId,
          amount: amount,
          bankName: bankName,
          bankAccountNumber: bankAccountNumber,
          bankAccountHolder: bankAccountHolder.toUpperCase(),
          status: "PENDING"
        }
      });

      // 5. Ghi sổ cái kế toán WITHDRAWAL_HOLD
      await tx.ledgerTransaction.create({
        data: {
          type: "WITHDRAWAL_HOLD",
          amount: -amount,
          description: `Khóa ${amount.toLocaleString("vi-VN")}₫ chờ giải ngân về ${bankName} (${bankAccountNumber}) - Mã lệnh #${withdrawal.id.slice(0, 8)}`,
          status: "COMPLETED"
        }
      });

      return {
        withdrawalId: withdrawal.id,
        newAvailableBalance: updatedUser.walletBalance,
        newPendingBalance: updatedUser.pendingWithdrawalBalance
      };
    });

    // Tự động lưu tài khoản ngân hàng vào metadata để lần sau không cần nhập lại
    try {
      const bankPayload = {
        bank_name: bankName,
        bank_account: bankAccountNumber,
        bank_owner: bankAccountHolder.toUpperCase(),
      };
      await prisma.$executeRawUnsafe(
        `UPDATE auth.users SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || $1::jsonb WHERE id = $2::uuid;`,
        JSON.stringify(bankPayload),
        userId
      );
    } catch (_) {}

    revalidatePath("/my-closet/wallet");
    revalidatePath("/app");

    return {
      success: true,
      message: "Lệnh rút tiền đã được tạo thành công và số dư đã được khóa an toàn để chờ xử lý.",
      data: result
    };

  } catch (error: any) {
    console.error("❌ Lỗi tạo lệnh rút tiền:", error);
    return {
      success: false,
      message: error.message || "Không thể tạo lệnh rút tiền."
    };
  }
}
