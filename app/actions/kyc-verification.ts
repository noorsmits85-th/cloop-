"use server";

import { prisma } from "@/src/lib/prisma";
import { payos } from "@/lib/payos";
import { requireUser } from "@/src/lib/auth";
import { isValidVietnamPhone, normalizeVietnamPhone, maskPhoneNumber } from "@/lib/validations/phone";
import { generatePayOSOrderCode } from "@/src/utils/order-code";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseServerClient } from "@/src/utils/supabase/server";

export interface CreateMicroKycPaymentInput {
  phone: string;
}

export interface MicroKycPaymentResult {
  success: boolean;
  orderCode?: number;
  checkoutUrl?: string;
  qrCode?: string;
  accountNumber?: string;
  accountName?: string;
  bin?: string;
  amount?: number;
  phone?: string;
  error?: string;
}

/**
 * Khởi tạo giao dịch VietQR 1.000đ để định danh tài khoản ngân hàng chính chủ (Micro-Deposit eKYC).
 * Khách nạp 1.000đ sẽ nhận lại 20 Xu Xanh (trị giá 2.000đ) nạp thẳng vào Ví CLOOP.
 */
export async function createMicroKycPaymentAction(
  input: CreateMicroKycPaymentInput
): Promise<MicroKycPaymentResult> {
  try {
    let authUser;
    try {
      authUser = await requireUser();
    } catch {
      return { success: false, error: "Vui lòng đăng nhập để thực hiện định danh tài khoản." };
    }

    const rawPhone = input.phone?.trim() || "";
    if (!rawPhone) {
      return { success: false, error: "Vui lòng nhập số điện thoại liên hệ chính chủ." };
    }

    if (!isValidVietnamPhone(rawPhone)) {
      return {
        success: false,
        error: "Số điện thoại không đúng định dạng di động 10 chữ số tại Việt Nam (Viettel, VinaPhone, MobiFone, Vietnamobile, Wintel).",
      };
    }

    const normalizedPhone = normalizeVietnamPhone(rawPhone);

    // 🛡️ CHỐNG TẤN CÔNG SYBIL: Kiểm tra xem SĐT này đã được tài khoản nào khác xác thực chưa
    const existingVerifiedRental = await prisma.rentalHistory.findFirst({
      where: {
        OR: [
          { renter_phone: normalizedPhone, renterId: { not: authUser.id } },
          { owner_phone: normalizedPhone, ownerId: { not: authUser.id } },
        ],
      },
      select: { id: true },
    });

    if (existingVerifiedRental) {
      return {
        success: false,
        error: "Số điện thoại này đã được liên kết với một tài khoản khác trong hệ thống. Mỗi số điện thoại chỉ liên kết với 1 tài khoản duy nhất.",
      };
    }

    if (!payos) {
      return {
        success: false,
        error: "Cấu hình cổng thanh toán VietQR / PayOS chưa sẵn sàng trên máy chủ.",
      };
    }

    const orderCode = generatePayOSOrderCode();

    // Tạo bản ghi CoinTopUp với gói KYC_2K (2.000đ -> hoàn 2.000đ vào ví có thể rút)
    const topUp = await prisma.coinTopUp.create({
      data: {
        userId: authUser.id,
        packageCode: "KYC_2K",
        orderCode: BigInt(orderCode),
        amountVnd: 2000,
        baseCoins: 20,
        bonusCoins: 0,
        totalCoins: 20,
        status: "PENDING",
        rawPayload: { phone: normalizedPhone, purpose: "EKYC_MICRO_DEPOSIT" },
      },
    });

    const DOMAIN =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://cloop-sable.vercel.app");

    // Giới hạn mô tả PayOS tối đa 25 ký tự, không dấu
    const shortOrderSuffix = orderCode.toString().slice(-6);
    const payosDescription = `KYC CLOOP ${shortOrderSuffix}`;

    const body = {
      orderCode: orderCode,
      amount: 2000,
      description: payosDescription,
      returnUrl: `${DOMAIN}/my-closet/profile?status=kyc_success&orderCode=${orderCode}`,
      cancelUrl: `${DOMAIN}/my-closet/profile?status=kyc_cancel&orderCode=${orderCode}`,
    };

    const paymentLink = await payos.paymentRequests.create(body);

    if (paymentLink?.paymentLinkId) {
      await prisma.coinTopUp.update({
        where: { id: topUp.id },
        data: { paymentLinkId: paymentLink.paymentLinkId },
      });
    }

    return {
      success: true,
      orderCode,
      checkoutUrl: paymentLink.checkoutUrl,
      qrCode: paymentLink.qrCode,
      accountNumber: paymentLink.accountNumber,
      accountName: paymentLink.accountName,
      bin: paymentLink.bin,
      amount: 1000,
      phone: normalizedPhone,
    };
  } catch (error: any) {
    console.error("❌ Lỗi khi khởi tạo VietQR eKYC:", error);
    return {
      success: false,
      error: error?.message || "Không thể tạo liên kết thanh toán VietQR. Vui lòng thử lại sau.",
    };
  }
}

/**
 * Kiểm tra trạng thái thanh toán VietQR eKYC thời gian thực (Polling / PayOS Fallback).
 * Khi thành công: Kích hoạt isVerified = true, cộng 20 Xu Xanh và lưu số điện thoại.
 */
export async function checkMicroKycStatusAction(orderCode: number, phone?: string) {
  try {
    let authUser;
    try {
      authUser = await requireUser();
    } catch {
      return { success: false, status: "UNAUTHORIZED", isPaid: false };
    }

    const topUp = await prisma.coinTopUp.findUnique({
      where: { orderCode: BigInt(orderCode) },
      include: { user: { select: { cloopCoins: true, isVerified: true } } },
    });

    if (!topUp) {
      return { success: false, status: "NOT_FOUND", isPaid: false };
    }

    if (topUp.userId !== authUser.id) {
      return { success: false, status: "FORBIDDEN", isPaid: false };
    }

    // Nếu đã PAID từ Webhook
    if (topUp.status === "PAID") {
      return { success: true, isPaid: true, status: "PAID" };
    }

    // Nếu vẫn là PENDING -> Hỏi trực tiếp cổng PayOS để xác nhận tức thời
    if (topUp.status === "PENDING" && payos) {
      try {
        const payosInfo = await payos.paymentRequests.get(orderCode);
        const isActuallyPaid = Boolean(
          payosInfo &&
            (payosInfo.status === "PAID" ||
              (typeof payosInfo.amountPaid === "number" && payosInfo.amountPaid >= topUp.amountVnd))
        );

        if (isActuallyPaid) {
          // Thực thi Atomic Transaction cập nhật trạng thái
          await prisma.$transaction(async (tx) => {
            const updateResult = await tx.coinTopUp.updateMany({
              where: { id: topUp.id, status: "PENDING" },
              data: {
                status: "PAID",
                payosStatus: "success",
                paidAt: new Date(),
              },
            });

            if (updateResult.count === 0) return;

            // Nâng hạng xác thực và cộng 2.000đ vào Số dư Ví (rút được)
            const updatedUser = await tx.user.update({
              where: { id: topUp.userId },
              data: {
                isVerified: true,
                walletBalance: { increment: topUp.amountVnd },
                cloopCoins: { increment: topUp.totalCoins },
              },
              select: { cloopCoins: true, walletBalance: true },
            });

            // Ghi chép vào Sổ cái Xu minh bạch
            await tx.coinLedgerEntry.create({
              data: {
                userId: topUp.userId,
                topUpId: topUp.id,
                type: "TOP_UP_IN",
                amount: topUp.totalCoins,
                balanceAfter: updatedUser.cloopCoins,
                description: `Hoàn 100% Phí Định danh VietQR eKYC vào Ví (+${topUp.amountVnd.toLocaleString("vi-VN")}₫)`,
                metadata: {
                  orderCode: orderCode,
                  amountVnd: topUp.amountVnd,
                  packageCode: topUp.packageCode,
                  phone: phone || (topUp.rawPayload as any)?.phone,
                },
              },
            });
          });

          // Cập nhật SĐT vào Supabase Metadata
          const savedPhone = phone || (topUp.rawPayload as any)?.phone;
          if (savedPhone) {
            try {
              const supabase = await createSupabaseServerClient();
              await supabase.auth.updateUser({
                data: {
                  phone: normalizeVietnamPhone(savedPhone),
                  phone_verified: true,
                  kyc_method: "VIETQR_EKYC_2K",
                  kyc_verified_at: new Date().toISOString(),
                },
              });
            } catch (sbErr) {
              console.warn("⚠️ Không thể đồng bộ metadata Supabase:", sbErr);
            }
          }

          revalidatePath("/my-closet/profile");
          revalidatePath("/my-closet/wallet");
          revalidatePath("/admin/identity");

          return { success: true, isPaid: true, status: "PAID" };
        }
      } catch (pollErr) {
        console.warn("⚠️ Không thể kết nối PayOS Polling:", pollErr);
      }
    }

    return { success: true, isPaid: false, status: topUp.status };
  } catch (error: any) {
    console.error("❌ Lỗi kiểm tra trạng thái eKYC:", error);
    return { success: false, isPaid: false, error: error?.message || "Lỗi máy chủ" };
  }
}
