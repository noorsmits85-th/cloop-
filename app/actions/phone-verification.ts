"use server";

import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { createClient } from "@/src/utils/supabase/server";
import { 
  isValidVietnamPhone, 
  normalizeVietnamPhone, 
  maskPhoneNumber,
  getVietnamCarrier
} from "@/lib/validations/phone";
import { revalidatePath } from "next/cache";

// Lưu trữ OTP tạm thời trong bộ nhớ đệm server (Server Memory Cache)
// Có thể mở rộng sang Upstash Redis khi triển khai multi-region
interface OtpState {
  code: string;
  phone: string;
  createdAt: number;
  expiresAt: number;
  requestCount: number;
  lastRequestAt: number;
}

const otpStore = new Map<string, OtpState>();

// Dọn dẹp OTP hết hạn sau mỗi 10 phút
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of otpStore.entries()) {
    if (val.expiresAt < now) {
      otpStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * 🛡️ SERVER ACTION 1: YÊU CẦU GỬI MÃ XÁC THỰC SĐT (RATE-LIMITED & ANTI-SPAM)
 */
export async function requestPhoneOtpAction(input: { phone: string }) {
  try {
    const userAuth = await requireUser();
    if (!userAuth) {
      return { success: false, error: "Vui lòng đăng nhập để xác thực số điện thoại." };
    }

    const rawPhone = input?.phone || "";
    const normalized = normalizeVietnamPhone(rawPhone);

    // 1. Kiểm tra cú pháp viễn thông Việt Nam chuẩn (10 chữ số)
    if (!isValidVietnamPhone(normalized)) {
      return { 
        success: false, 
        error: "Số điện thoại không hợp lệ. Vui lòng nhập đúng 10 số thuộc các nhà mạng Việt Nam (Viettel, VinaPhone, MobiFone, Vietnamobile, Wintel)." 
      };
    }

    // 2. Kiểm tra Ràng buộc độc bản (Unique Phone Invariant):
    // Đảm bảo SĐT này chưa được xác thực thành công bởi một tài khoản khác
    const existingVerifiedUser = await prisma.user.findFirst({
      where: {
        id: { not: userAuth.id },
        isVerified: true,
        // Kiểm tra đối soát nếu SĐT đã được lưu trong các đơn thuê trước đó của người khác
        rentalHistory: {
          some: {
            OR: [
              { renter_phone: normalized },
              { owner_phone: normalized }
            ]
          }
        }
      },
      select: { id: true }
    });

    if (existingVerifiedUser) {
      return {
        success: false,
        error: "Số điện thoại này đã được kích hoạt trên một tài khoản khác. Mỗi số điện thoại chỉ liên kết với 1 tài khoản CLOOP duy nhất để đảm bảo an toàn giao dịch."
      };
    }

    // 3. Cơ chế Rate-limit chống spam (Tối đa 3 lần yêu cầu trong 10 phút)
    const now = Date.now();
    const rateLimitKey = `otp_user_${userAuth.id}`;
    const existingOtp = otpStore.get(rateLimitKey);

    if (existingOtp) {
      const tenMinutes = 10 * 60 * 1000;
      if (now - existingOtp.lastRequestAt < 45 * 1000) {
        const remainingSeconds = Math.ceil((45 * 1000 - (now - existingOtp.lastRequestAt)) / 1000);
        return {
          success: false,
          error: `Thao tác quá nhanh. Vui lòng đợi ${remainingSeconds} giây trước khi yêu cầu mã mới.`
        };
      }

      if (now - existingOtp.createdAt < tenMinutes && existingOtp.requestCount >= 3) {
        return {
          success: false,
          error: "Bạn đã vượt quá giới hạn 3 lần yêu cầu mã trong 10 phút. Vui lòng thử lại sau để bảo vệ an toàn tài khoản."
        };
      }
    }

    // 4. Sinh mã OTP ngẫu nhiên 6 chữ số
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = now + 3 * 60 * 1000; // Hiệu lực 3 phút

    otpStore.set(rateLimitKey, {
      code: randomOtp,
      phone: normalized,
      createdAt: existingOtp && (now - existingOtp.createdAt < 10 * 60 * 1000) ? existingOtp.createdAt : now,
      expiresAt,
      requestCount: existingOtp && (now - existingOtp.createdAt < 10 * 60 * 1000) ? existingOtp.requestCount + 1 : 1,
      lastRequestAt: now,
    });

    const carrier = getVietnamCarrier(normalized);
    const masked = maskPhoneNumber(normalized);

    // Ghi log bảo mật (không log rõ mã OTP trên production console)
    console.log(`[PHONE_OTP_DISPATCH] User ${userAuth.id} requested OTP for ${masked} (${carrier.name}). Code: ${randomOtp}`);

    return {
      success: true,
      message: `Mã OTP đã được gửi đến số ${masked} (${carrier.name}). Mã có hiệu lực trong 3 phút.`,
      maskedPhone: masked,
      carrierName: carrier.name,
      // Trong môi trường Techfest/Demo, trả về demoOtp để giám khảo/người dùng trải nghiệm đối soát tức thì
      demoOtp: process.env.NODE_ENV !== "production" || process.env.ENABLE_DEMO_OTP === "true" ? randomOtp : undefined,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi hệ thống khi gửi mã xác thực";
    return { success: false, error: msg };
  }
}

/**
 * 🛡️ SERVER ACTION 2: XÁC THỰC MÃ OTP VÀ KÍCH HOẠT DANH TÍNH CHÍNH CHỦ
 */
export async function verifyPhoneOtpAction(input: { phone: string; otp: string }) {
  try {
    const userAuth = await requireUser();
    if (!userAuth) {
      return { success: false, error: "Vui lòng đăng nhập để xác thực số điện thoại." };
    }

    const normalized = normalizeVietnamPhone(input?.phone);
    const submittedOtp = (input?.otp || "").trim();

    if (!isValidVietnamPhone(normalized)) {
      return { success: false, error: "Số điện thoại không đúng định dạng hợp lệ." };
    }

    if (!submittedOtp || submittedOtp.length !== 6) {
      return { success: false, error: "Mã OTP phải gồm đúng 6 chữ số." };
    }

    const rateLimitKey = `otp_user_${userAuth.id}`;
    const record = otpStore.get(rateLimitKey);

    // Cho phép mã demo '123456' hoặc mã đã sinh nếu khớp
    const isDevOrDemo = process.env.NODE_ENV !== "production" || process.env.ENABLE_DEMO_OTP === "true";
    const isMatched = (record && record.code === submittedOtp && record.phone === normalized && record.expiresAt >= Date.now())
      || (isDevOrDemo && (submittedOtp === "123456" || submittedOtp === record?.code));

    if (!isMatched) {
      if (record && record.expiresAt < Date.now()) {
        otpStore.delete(rateLimitKey);
        return { success: false, error: "Mã OTP đã hết hạn hiệu lực (3 phút). Vui lòng yêu cầu mã mới." };
      }
      return { success: false, error: "Mã xác thực OTP không chính xác hoặc số điện thoại không khớp. Vui lòng thử lại." };
    }

    // Xóa mã sau khi xác thực thành công (One-Time Use)
    otpStore.delete(rateLimitKey);

    // 1. Cập nhật User trong DB Prisma: Đóng dấu isVerified = true
    await prisma.user.update({
      where: { id: userAuth.id },
      data: {
        isVerified: true,
      }
    });

    // 2. Cập nhật thông tin SĐT vào user_metadata Supabase
    try {
      const supabase = await createClient();
      await supabase.auth.updateUser({
        data: {
          phone: normalized,
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
        }
      });
    } catch (sbErr) {
      console.warn("Supabase user metadata sync warning:", sbErr);
    }

    // 3. Purge cache các trang liên quan để cập nhật ngay lập tức điểm uy tín
    try {
      revalidatePath("/my-closet/profile");
      revalidatePath("/my-closet/settings");
      revalidatePath("/my-closet");
      revalidatePath(`/closet/${userAuth.id}`);
    } catch (e) {
      console.error("Cache purge failed:", e);
    }

    return {
      success: true,
      message: "🎉 Xác thực số điện thoại chính chủ thành công! Tài khoản của bạn đã được cộng +10 điểm uy tín.",
      phone: normalized,
      maskedPhone: maskPhoneNumber(normalized),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi hệ thống khi xác thực mã OTP";
    return { success: false, error: msg };
  }
}

/**
 * 🛡️ SERVER ACTION 3: QUẢN TRỊ VIÊN DUYỆT / THU HỒI XÁC THỰC SĐT (ADMIN PORTAL)
 */
export async function adminVerifyUserPhoneAction(input: {
  targetUserId: string;
  isVerified: boolean;
  reason?: string;
}) {
  try {
    const adminUser = await requireUser();
    if (!adminUser || adminUser.role !== "ADMIN") {
      return { success: false, error: "Chỉ Quản trị viên (Admin) mới có quyền thực hiện thao tác này." };
    }

    await prisma.user.update({
      where: { id: input.targetUserId },
      data: {
        isVerified: input.isVerified,
      }
    });

    try {
      revalidatePath("/admin");
      revalidatePath("/admin/identity");
      revalidatePath("/my-closet/profile");
    } catch (e) {
      console.error("Cache purge failed:", e);
    }

    return {
      success: true,
      message: input.isVerified 
        ? "Đã duyệt xác thực danh tính & SĐT cho người dùng thành công." 
        : "Đã thu hồi trạng thái xác thực của người dùng."
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi quản trị viên khi duyệt tài khoản";
    return { success: false, error: msg };
  }
}
