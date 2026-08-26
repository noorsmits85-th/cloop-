"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/auth";
import { revalidatePath } from "next/cache";

function normalizeVietnamese(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .trim();
}

function verifyBankKyc(registeredName?: string | null, bankHolderName?: string | null): boolean {
  if (!registeredName || !bankHolderName) return true; // Nếu chưa có tên thì cho phép cập nhật lần đầu
  const normReg = normalizeVietnamese(registeredName);
  const normBank = normalizeVietnamese(bankHolderName);

  if (!normReg || !normBank) return true;
  if (normReg === normBank) return true;

  const regTokens = normReg.split(/\s+/).filter(Boolean);
  const bankTokens = normBank.split(/\s+/).filter(Boolean);

  // Khớp toàn bộ token tên hoặc có ít nhất 2 từ trùng lặp (ví dụ: Trang Hoàng & Hoàng Thị Thu Trang)
  const matchCount = regTokens.filter((token) => bankTokens.includes(token)).length;
  return matchCount >= Math.min(2, regTokens.length);
}

export async function requestWithdrawalAction(data: {
  amount: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  password?: string;
}) {
  try {
    let authUser;
    try {
      authUser = await requireUser();
    } catch {
      return { success: false, message: "Vui lòng đăng nhập để thực hiện rút tiền." };
    }
    const userId = authUser.id;

    const { amount, bankName, bankAccountNumber, bankAccountHolder } = data;

    if (!amount || amount < 50000) {
      return { success: false, message: "Số tiền rút tối thiểu là 50,000 VNĐ." };
    }

    if (!bankName || !bankAccountNumber || !bankAccountHolder) {
      return { success: false, message: "Vui lòng điền đầy đủ thông tin tài khoản ngân hàng nhận tiền." };
    }

    // 🔒 ĐỊNH DANH CHÉO QUA NGÂN HÀNG (BANK-KYC ANTI-FRAUD VERIFICATION)
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, walletBalance: true, pendingWithdrawalBalance: true }
    });

    if (currentUser?.name && !verifyBankKyc(currentUser.name, bankAccountHolder)) {
      return {
        success: false,
        message: `Quy tắc Bank-KYC: Tên chủ tài khoản ngân hàng ("${bankAccountHolder.toUpperCase()}") không khớp với tên tài khoản CLOOP ("${currentUser.name.toUpperCase()}"). Bạn chỉ được rút tiền về tài khoản ngân hàng chính chủ.`
      };
    }

    // 🛡️ ATOMIC HOLD TRANSACTION: Trừ trực tiếp walletBalance chuyển sang pendingWithdrawalBalance
    const result = await prisma.$transaction(async (tx) => {
      // 1. Kiểm tra số dư người dùng
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true, pendingWithdrawalBalance: true }
      });

      if (!user) {
        throw new Error("Không tìm thấy thông tin tài khoản.");
      }

      if (user.walletBalance < amount) {
        throw new Error(`Số dư khả dụng không đủ. Bạn có: ${user.walletBalance.toLocaleString()}₫, muốn rút: ${amount.toLocaleString()}₫`);
      }

      // 2. Chuyển tiền từ khả dụng sang trạng thái HOLD
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          walletBalance: { decrement: amount },
          pendingWithdrawalBalance: { increment: amount }
        },
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
          description: `Khóa ${amount.toLocaleString()}₫ chờ giải ngân về ${bankName} (${bankAccountNumber}) - Mã lệnh #${withdrawal.id.slice(0, 8)}`,
          status: "COMPLETED"
        }
      });

      return {
        withdrawalId: withdrawal.id,
        newAvailableBalance: updatedUser.walletBalance,
        newPendingBalance: updatedUser.pendingWithdrawalBalance
      };
    });

    revalidatePath("/my-closet/wallet");
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
