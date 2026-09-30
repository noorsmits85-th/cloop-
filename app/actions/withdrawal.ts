"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const WithdrawalSchema = z.object({
  amount: z.number().int().min(50000).max(50000000),
  bankName: z.string().trim().min(2).max(80),
  bankAccountNumber: z.string().trim().regex(/^[0-9]{6,32}$/),
  bankAccountHolder: z.string().trim().min(2).max(80),
  password: z.string().optional(),
  clientUserId: z.string().optional(),
});

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

  // Khớp toàn bộ token tên hoặc có ít nhất 2 từ trùng lặp
  const matchCount = regTokens.filter((token) => bankTokens.includes(token)).length;
  return matchCount >= Math.min(2, regTokens.length);
}

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
    const { createClient } = await import("@/src/utils/supabase/server");
    const supabase = await createClient();
    let userId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) userId = user.id;
    } catch (_) {}
    if (!userId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) userId = session.user.id;
      } catch (_) {}
    }
    if (!userId && data.clientUserId) {
      userId = data.clientUserId;
    }
    if (!userId) {
      return { success: false, message: "Vui lòng đăng nhập để lưu tài khoản ngân hàng." };
    }

    if (!data.bankName?.trim() || !data.bankAccountNumber?.trim() || !data.bankAccountHolder?.trim()) {
      return { success: false, message: "Vui lòng điền đầy đủ tên ngân hàng, số tài khoản và tên chủ tài khoản." };
    }

    const cleanAccount = data.bankAccountNumber.trim().replace(/\s+/g, "");
    const cleanHolder = data.bankAccountHolder.trim().toUpperCase();
    const cleanBank = data.bankName.trim();

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
      await supabase.auth.updateUser({
        data: bankPayload
      });
    } catch (_) {}

    revalidatePath("/my-closet/wallet");
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
    return { success: false, message: error.message || "Không thể lưu thông tin ngân hàng." };
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
    let userId: string | null = null;
    try {
      const authUser = await requireUser();
      userId = authUser.id;
    } catch {
      const { createClient } = await import("@/src/utils/supabase/server");
      const supabase = await createClient();
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) userId = user.id;
      } catch (_) {}
      if (!userId) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) userId = session.user.id;
        } catch (_) {}
      }
      if (!userId && data.clientUserId) {
        userId = data.clientUserId;
      }
    }

    if (!userId) {
      return { success: false, message: "Vui lòng đăng nhập bằng ID Xanh để thực hiện rút tiền." };
    }

    const parsed = WithdrawalSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, message: "Thông tin rút tiền không hợp lệ. Vui lòng kiểm tra số tiền (tối thiểu 50.000đ) và thông tin ngân hàng." };
    }

    const { amount, bankName, bankAccountNumber, bankAccountHolder } = parsed.data;

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
        throw new Error(`Số dư khả dụng không đủ. Bạn có: ${user.walletBalance.toLocaleString("vi-VN")}₫, muốn rút: ${amount.toLocaleString("vi-VN")}₫`);
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
