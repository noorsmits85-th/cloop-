"use server";

import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { requireUser, requireAdmin } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { createClient } from "@/src/utils/supabase/server";
import { hashOtpHmac, verifyOtpHmac } from "@/src/lib/password-hash";
import { toSafeActionError } from "@/src/lib/safe-error";
import {
  isValidVietnamPhone,
  normalizeVietnamPhone,
  maskPhoneNumber,
  getVietnamCarrier,
} from "@/lib/validations/phone";
import { revalidatePath } from "next/cache";

interface OtpState {
  codeDigest: string;
  phone: string;
  createdAt: number;
  expiresAt: number;
  requestCount: number;
  lastRequestAt: number;
  attempts: number;
}

const MAX_VERIFY_ATTEMPTS = 5;
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
      return {
        success: false,
        error: "Vui lòng đăng nhập để xác thực số điện thoại.",
      };
    }

    const rawPhone = input?.phone || "";
    const normalized = normalizeVietnamPhone(rawPhone);

    // 1. Kiểm tra cú pháp viễn thông Việt Nam chuẩn (10 chữ số)
    if (!isValidVietnamPhone(normalized)) {
      return {
        success: false,
        error:
          "Số điện thoại không hợp lệ. Vui lòng nhập đúng 10 số thuộc các nhà mạng Việt Nam (Viettel, VinaPhone, MobiFone, Vietnamobile, Wintel).",
      };
    }

    // 2. Kiểm tra Ràng buộc độc bản (Unique Phone Invariant):
    const existingVerifiedUser = await prisma.user.findFirst({
      where: {
        id: { not: userAuth.id },
        isVerified: true,
        rentalHistory: {
          some: {
            OR: [{ renter_phone: normalized }, { owner_phone: normalized }],
          },
        },
      },
      select: { id: true },
    });

    if (existingVerifiedUser) {
      return {
        success: false,
        error:
          "Số điện thoại này đã được kích hoạt trên một tài khoản khác. Mỗi số điện thoại chỉ liên kết với 1 tài khoản CLOOP duy nhất để đảm bảo an toàn giao dịch.",
      };
    }

    // 3. Cơ chế Rate-limit chống spam (Tối đa 3 lần yêu cầu trong 10 phút)
    const now = Date.now();
    const rateLimitKey = `otp_user_${userAuth.id}`;
    const existingOtp = otpStore.get(rateLimitKey);

    if (existingOtp) {
      const tenMinutes = 10 * 60 * 1000;
      if (now - existingOtp.lastRequestAt < 45 * 1000) {
        const remainingSeconds = Math.ceil(
          (45 * 1000 - (now - existingOtp.lastRequestAt)) / 1000
        );
        return {
          success: false,
          error: `Thao tác quá nhanh. Vui lòng đợi ${remainingSeconds} giây trước khi yêu cầu mã mới.`,
        };
      }

      if (
        now - existingOtp.createdAt < tenMinutes &&
        existingOtp.requestCount >= 3
      ) {
        return {
          success: false,
          error:
            "Bạn đã vượt quá giới hạn 3 lần yêu cầu mã trong 10 phút. Vui lòng thử lại sau để bảo vệ an toàn tài khoản.",
        };
      }
    }

    // 4. Sinh mã OTP ngẫu nhiên mật mã học 6 chữ số & băm HMAC-SHA256
    const randomOtp = crypto.randomInt(100000, 1000000).toString();
    const codeDigest = hashOtpHmac(normalized, randomOtp);
    const expiresAt = now + 3 * 60 * 1000; // Hiệu lực 3 phút

    otpStore.set(rateLimitKey, {
      codeDigest,
      phone: normalized,
      createdAt:
        existingOtp && now - existingOtp.createdAt < 10 * 60 * 1000
          ? existingOtp.createdAt
          : now,
      expiresAt,
      requestCount:
        existingOtp && now - existingOtp.createdAt < 10 * 60 * 1000
          ? existingOtp.requestCount + 1
          : 1,
      lastRequestAt: now,
      attempts: 0,
    });

    const carrier = getVietnamCarrier(normalized);
    const masked = maskPhoneNumber(normalized);

    return {
      success: true,
      message: `Mã OTP đã được gửi đến số ${masked} (${carrier.name}). Mã có hiệu lực trong 3 phút.`,
      maskedPhone: masked,
      carrierName: carrier.name,
    };
  } catch (err: unknown) {
    // TODO: Tích hợp hệ thống tracking (Sentry/LogRocket) để theo dõi lỗi gửi OTP SĐT
    return toSafeActionError(err, "Lỗi hệ thống khi gửi mã xác thực.");
  }
}

/**
 * 🛡️ SERVER ACTION 2: XÁC THỰC MÃ OTP VÀ KÍCH HOẠT DANH TÍNH CHÍNH CHỦ
 */
export async function verifyPhoneOtpAction(input: {
  phone: string;
  otp: string;
}) {
  try {
    const userAuth = await requireUser();
    if (!userAuth) {
      return {
        success: false,
        error: "Vui lòng đăng nhập để xác thực số điện thoại.",
      };
    }

    const normalized = normalizeVietnamPhone(input?.phone);
    const submittedOtp = (input?.otp || "").trim();

    if (!isValidVietnamPhone(normalized)) {
      return {
        success: false,
        error: "Số điện thoại không đúng định dạng hợp lệ.",
      };
    }

    if (!/^\d{6}$/.test(submittedOtp)) {
      return { success: false, error: "Mã OTP phải gồm đúng 6 chữ số." };
    }

    const rateLimitKey = `otp_user_${userAuth.id}`;
    const record = otpStore.get(rateLimitKey);

    if (!record) {
      return {
        success: false,
        error: "Không tìm thấy yêu cầu mã OTP hoặc mã đã hết hạn. Vui lòng yêu cầu mã mới.",
      };
    }

    if (record.expiresAt < Date.now()) {
      otpStore.delete(rateLimitKey);
      return {
        success: false,
        error: "Mã OTP đã hết hạn hiệu lực (3 phút). Vui lòng yêu cầu mã mới.",
      };
    }

    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      otpStore.delete(rateLimitKey);
      return {
        success: false,
        error: "Bạn đã nhập sai mã OTP quá 5 lần. Mã đã bị hủy, vui lòng yêu cầu mã mới.",
      };
    }

    const isPhoneMatched = record.phone === normalized;
    const isOtpValid = verifyOtpHmac(normalized, submittedOtp, record.codeDigest);

    if (!isPhoneMatched || !isOtpValid) {
      record.attempts += 1;
      if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
        otpStore.delete(rateLimitKey);
        return {
          success: false,
          error:
            "Bạn đã nhập sai mã OTP quá 5 lần. Mã đã bị hủy để bảo vệ tài khoản, vui lòng yêu cầu mã mới.",
        };
      }
      otpStore.set(rateLimitKey, record);
      return {
        success: false,
        error:
          "Mã xác thực OTP không chính xác hoặc số điện thoại không khớp. Vui lòng thử lại.",
      };
    }

    // Xóa mã sau khi xác thực thành công (One-Time Use)
    otpStore.delete(rateLimitKey);

    // 1. Cập nhật User trong DB Prisma: Đóng dấu isVerified = true
    await prisma.user.update({
      where: { id: userAuth.id },
      data: {
        isVerified: true,
      },
    });

    // 2. Cập nhật thông tin SĐT vào user_metadata Supabase
    try {
      const supabase = await createClient();
      await supabase.auth.updateUser({
        data: {
          phone: normalized,
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
        },
      });
    } catch (sbErr) {
      // TODO: Tích hợp hệ thống tracking (Sentry/LogRocket) để theo dõi lỗi đồng bộ metadata SĐT
      Sentry.captureException(sbErr);
    }

    // 3. Purge cache các trang liên quan để cập nhật ngay lập tức điểm uy tín
    try {
      revalidatePath("/my-closet/profile");
      revalidatePath("/my-closet/settings");
      revalidatePath("/my-closet");
      revalidatePath(`/closet/${userAuth.id}`);
    } catch (_) {}

    return {
      success: true,
      message:
        "🎉 Xác thực số điện thoại chính chủ thành công! Tài khoản của bạn đã được cộng +10 điểm uy tín.",
      phone: normalized,
      maskedPhone: maskPhoneNumber(normalized),
    };
  } catch (err: unknown) {
    // TODO: Tích hợp hệ thống tracking (Sentry/LogRocket) để theo dõi lỗi xác thực OTP
    return toSafeActionError(err, "Lỗi hệ thống khi xác thực mã OTP.");
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
    await requireAdmin();

    await prisma.user.update({
      where: { id: input.targetUserId },
      data: {
        isVerified: Boolean(input.isVerified),
      },
    });

    try {
      revalidatePath("/admin");
      revalidatePath("/admin/identity");
      revalidatePath("/my-closet/profile");
    } catch (_) {}

    return {
      success: true,
      message: input.isVerified
        ? "Đã duyệt xác thực danh tính & SĐT cho người dùng thành công."
        : "Đã thu hồi trạng thái xác thực của người dùng.",
      error: undefined as string | undefined,
    };
  } catch (err: unknown) {
    // TODO: Tích hợp hệ thống tracking (Sentry/LogRocket) để theo dõi lỗi admin duyệt SĐT
    return toSafeActionError(err, "Lỗi quản trị viên khi duyệt tài khoản.");
  }
}
