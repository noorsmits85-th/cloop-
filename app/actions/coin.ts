"use server";

import { prisma } from "@/src/lib/prisma";
import { payos } from "@/lib/payos";
import { requireUser } from "@/src/lib/auth";
import { COIN_PACKAGES, QUEST_DEFINITIONS } from "@/lib/coinPackages";
import { revalidatePath } from "next/cache";
import { generatePayOSOrderCode } from "@/src/utils/order-code";
import { checkRateLimit } from "@/src/utils/rate-limit";

// 1. Tạo thanh toán mua gói Điểm Lá qua PayOS
export async function createCoinTopUpPayment(packageCode: string) {
  try {
    // 🛡️ CHỐT CHẶN BẢO MẬT: Không cho phép gọi trực tiếp gói nội bộ KYC_* hoặc BOOST_* qua cổng nạp Xu thường
    if (!packageCode || packageCode.startsWith("KYC_") || packageCode.startsWith("BOOST_")) {
      return { success: false, message: "Gói nạp không hợp lệ." };
    }

    const pkg = COIN_PACKAGES[packageCode];
    if (!pkg) {
      return { success: false, message: "Gói nạp không hợp lệ." };
    }

    if (!payos) {
      return { success: false, message: "Cấu hình PayOS chưa sẵn sàng trên máy chủ." };
    }

    let authUser;
    try {
      authUser = await requireUser();
    } catch {
      return { success: false, message: "Vui lòng đăng nhập để nạp Lá." };
    }
    const userId = authUser.id;

    // 🛡️ CHỐNG SPAM TẠO MÃ NẠP XU (Max 5 requests / phút / User)
    const rateLimit = checkRateLimit(`coin_topup_${userId}`, 5, 60 * 1000);
    if (!rateLimit.success) {
      return {
        success: false,
        message: `Bạn đang tạo yêu cầu quá nhanh. Vui lòng thử lại sau ${rateLimit.resetInSec} giây.`
      };
    }

    // Sinh orderCode ngẫu nhiên hoặc dùng code client đã phát sinh
    const orderCode = generatePayOSOrderCode();

    // Tạo bản ghi CoinTopUp PENDING trong DB trước
    const topUp = await prisma.coinTopUp.create({
      data: {
        userId: userId,
        packageCode: pkg.code,
        orderCode: BigInt(orderCode),
        amountVnd: pkg.amountVnd,
        baseCoins: pkg.baseCoins,
        bonusCoins: pkg.bonusCoins,
        totalCoins: pkg.totalCoins,
        status: "PENDING"
      }
    });

    const DOMAIN = process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://cloop-sable.vercel.app");

    const body = {
      orderCode: orderCode,
      amount: pkg.amountVnd,
      description: `NAP LA ${pkg.totalCoins}`,
      returnUrl: `${DOMAIN}/my-closet/wallet?status=coin_success&orderCode=${orderCode}`,
      cancelUrl: `${DOMAIN}/my-closet/wallet?status=coin_cancel&orderCode=${orderCode}`
    };

    const paymentLink = await payos.paymentRequests.create(body);

    if (paymentLink?.paymentLinkId) {
      await prisma.coinTopUp.update({
        where: { id: topUp.id },
        data: { paymentLinkId: paymentLink.paymentLinkId }
      });
    }

    return {
      success: true,
      checkoutUrl: paymentLink.checkoutUrl,
      orderCode: orderCode,
      qrCode: paymentLink.qrCode,
      description: paymentLink.description,
      accountNumber: paymentLink.accountNumber,
      accountName: paymentLink.accountName,
      bin: paymentLink.bin,
      amount: pkg.amountVnd,
      totalCoins: pkg.totalCoins
    };

  } catch (error: any) {
    console.error("❌ Lỗi khi tạo link mua gói Lá:", error);
    return {
      success: false,
      message: error.message || "Không thể khởi tạo thanh toán mua Lá."
    };
  }
}

// Kiểm tra trạng thái nạp Lá thời gian thực (Active Polling + Direct PayOS Fallback)
export async function checkCoinTopUpStatusAction(orderCode: number) {
  try {
    let authUser;
    try {
      authUser = await requireUser();
    } catch {
      return { success: false, status: "UNAUTHORIZED" };
    }

    const topUp = await prisma.coinTopUp.findUnique({
      where: { orderCode: BigInt(orderCode) },
      include: { user: { select: { cloopCoins: true } } }
    });

    if (!topUp) {
      return { success: false, status: "NOT_FOUND" };
    }

    if (topUp.userId !== authUser.id) {
      return { success: false, status: "FORBIDDEN" };
    }

    // 🛡️ CHỐT CHẶN CROSS-FLOW EXPLOIT: Đơn Đẩy Top (BOOST_*) phải xử lý qua checkBoostPayOSStatusAction
    const rawPayloadObj = (topUp.rawPayload as Record<string, any>) || {};
    if (topUp.packageCode.startsWith("BOOST_") || rawPayloadObj.type === "PRODUCT_BOOST") {
      return { success: false, status: "INVALID_FLOW" };
    }

    // Nếu DB vẫn là PENDING -> Chủ động hỏi PayOS API trực tiếp để phòng ngừa webhook bị delay
    if (topUp.status === "PENDING" && payos) {
      try {
        const payosInfo = await payos.paymentRequests.get(orderCode);
        if (payosInfo && (payosInfo.status === "CANCELLED" || payosInfo.status === "EXPIRED")) {
          await prisma.coinTopUp.updateMany({
            where: { id: topUp.id, status: "PENDING" },
            data: { status: "CANCELLED", payosStatus: payosInfo.status }
          });
          return {
            success: true,
            status: "CANCELLED",
            totalCoins: topUp.totalCoins,
            newBalance: topUp.user?.cloopCoins || 0
          };
        }

        if (
          payosInfo &&
          payosInfo.status === "PAID" &&
          Number(payosInfo.amountPaid ?? topUp.amountVnd) >= topUp.amountVnd
        ) {
          await prisma.$transaction(async (tx) => {
            // 🛡️ CHỐT CHẶN NGUYÊN TỬ: Chỉ cập nhật nếu CoinTopUp VẪN ĐANG LÀ PENDING
            const updateResult = await tx.coinTopUp.updateMany({
              where: { id: topUp.id, status: "PENDING" },
              data: { status: "PAID", paidAt: new Date() }
            });

            // Nếu updateResult.count === 0, luồng khác (Webhook) đã xử lý xong -> DỪNG NGAY!
            if (updateResult.count === 0) {
              return;
            }

            // Kiểm tra xem Sổ cái đã có bản ghi này chưa (Idempotency kép)
            const existingLedger = await tx.coinLedgerEntry.findFirst({
              where: { topUpId: topUp.id, type: "TOP_UP_IN" }
            });
            if (existingLedger) {
              return;
            }

            const isKycPackage = topUp.packageCode === "KYC_1K" || topUp.packageCode === "KYC_2K";
            const updatedUser = await tx.user.update({
              where: { id: topUp.userId },
              data: {
                cloopCoins: { increment: topUp.totalCoins },
                ...(isKycPackage
                  ? {
                      isVerified: true,
                      walletBalance: { increment: topUp.amountVnd }
                    }
                  : {})
              },
              select: { cloopCoins: true, walletBalance: true }
            });

            if (isKycPackage) {
              const savedPhone = (topUp.rawPayload as any)?.phone;
              if (savedPhone) {
                try {
                  await tx.$executeRawUnsafe(
                    `UPDATE auth.users
                     SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
                       'phone', $1::text,
                       'phone_verified', true,
                       'kyc_method', 'VIETQR_EKYC_2K',
                       'kyc_verified_at', $2::text
                     )
                     WHERE id = $3::uuid;`,
                    String(savedPhone),
                    new Date().toISOString(),
                    topUp.userId
                  );
                } catch (_) {}
              }
            }

            await tx.coinLedgerEntry.create({
              data: {
                userId: topUp.userId,
                type: "TOP_UP_IN",
                topUpId: topUp.id,
                amount: topUp.totalCoins,
                balanceAfter: updatedUser.cloopCoins,
                description: `Nạp gói ${topUp.packageCode} (+${topUp.totalCoins.toLocaleString("vi-VN")} Lá)`
              }
            });
          });

          const refreshedUser = await prisma.user.findUnique({
            where: { id: topUp.userId },
            select: { cloopCoins: true }
          });

          return {
            success: true,
            status: "PAID",
            totalCoins: topUp.totalCoins,
            newBalance: refreshedUser?.cloopCoins || 0
          };
        }
      } catch (payosErr) {
        console.warn("PayOS direct check info:", payosErr);
      }
    }

    return {
      success: true,
      status: topUp.status, // "PAID" | "PENDING" | "FAILED" | "CANCELLED"
      totalCoins: topUp.totalCoins,
      newBalance: topUp.user?.cloopCoins || 0
    };
  } catch (err: any) {
    return { success: false, status: "ERROR" };
  }
}

// 2. Nhận thưởng nhiệm vụ (Quest Claim)
export async function claimQuestRewardAction(questCode: string) {
  try {
    const quest = QUEST_DEFINITIONS[questCode];
    if (!quest) {
      return { success: false, message: "Nhiệm vụ không tồn tại." };
    }

    let authUser;
    try {
      authUser = await requireUser();
    } catch {
      return { success: false, message: "Vui lòng đăng nhập." };
    }
    const userId = authUser.id;

    // 1. Kiểm tra xem đã nhận trước đó chưa (Idempotency)
    const existingClaim = await prisma.coinQuestClaim.findUnique({
      where: {
        userId_questCode: {
          userId: userId,
          questCode: questCode
        }
      }
    });

    if (existingClaim) {
      return { success: false, message: "Bạn đã nhận phần thưởng nhiệm vụ này rồi." };
    }

    // 2. Kiểm tra điều kiện hoàn thành nhiệm vụ thực tế trong DB
    if (questCode === "WELCOME_ACTIVATION") {
      const userProfile = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true }
      });
      if (!userProfile || !userProfile.name) {
        return { success: false, message: "Vui lòng cập nhật tên hiển thị trong hồ sơ trước khi nhận thưởng." };
      }
    } else if (questCode === "FIRST_LISTING") {
      const productCount = await prisma.product.count({
        where: {
          userId: userId,
          isDeleted: false,
          status: "ON_MARKET",
          listings: { some: { isDeleted: false, status: "AVAILABLE" } }
        }
      });
      if (productCount < 1) {
        return { success: false, message: "Bạn cần đăng tải ít nhất 1 món đồ đang mở bán/cho thuê trên sàn trước khi nhận thưởng." };
      }
    } else if (questCode === "WEEKLY_LISTING_1") {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentProducts = await prisma.product.count({
        where: {
          userId: userId,
          isDeleted: false,
          status: "ON_MARKET",
          createdAt: { gte: oneWeekAgo },
          listings: { some: { isDeleted: false, status: "AVAILABLE" } }
        }
      });
      if (recentProducts < 1) {
        return { success: false, message: "Bạn chưa đăng món đồ hợp lệ nào lên sàn trong tuần này." };
      }
    } else if (questCode === "FIVE_STAR_ORDER") {
      const fiveStarReviews = await prisma.review.count({
        where: { revieweeId: userId, rating: { gte: 5 } }
      });
      if (fiveStarReviews < 1) {
        return { success: false, message: "Bạn cần có ít nhất 1 đánh giá 5 sao từ đơn cho thuê thành công." };
      }
    } else if (questCode === "REFERRAL_FIRST_ORDER") {
      // 🛡️ CHỐT CHẶN BẢO MẬT (FAIL-CLOSED):
      // Không dùng số đơn của chính chủ tủ để tránh nhận thưởng sai đối tượng.
      // Yêu cầu phải có bản ghi đối soát giới thiệu đã được xác thực trong Sổ cái nhiệm vụ / hệ thống đối soát.
      const verifiedReferralEvidence = await prisma.coinLedgerEntry.findFirst({
        where: {
          userId: userId,
          type: "ADMIN_ADJUSTMENT",
          metadata: {
            path: ["verifiedReferralForQuest"],
            equals: "REFERRAL_FIRST_ORDER"
          }
        },
        select: { id: true }
      });

      if (!verifiedReferralEvidence) {
        return {
          success: false,
          message: "Chưa tìm thấy dữ liệu người được bạn giới thiệu hoàn tất đơn thuê đã thanh toán. Phần thưởng sẽ mở khóa sau khi hệ thống xác thực quan hệ giới thiệu và đơn hàng đầu tiên của người được mời."
        };
      }
    } else {
      return { success: false, message: "Nhiệm vụ không hợp lệ hoặc chưa mở." };
    }

    // 3. Thực thi Atomic Transaction: Tạo Claim + Cộng Điểm Lá + Ghi Sổ Cái CoinLedgerEntry
    let newCoins = 0;
    await prisma.$transaction(async (tx) => {
      await tx.coinQuestClaim.create({
        data: {
          userId: userId,
          questCode: questCode,
          coins: quest.rewardCoins
        }
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          cloopCoins: { increment: quest.rewardCoins }
        },
        select: { cloopCoins: true }
      });

      newCoins = updatedUser.cloopCoins;

      await tx.coinLedgerEntry.create({
        data: {
          userId: userId,
          type: "QUEST_REWARD",
          amount: quest.rewardCoins,
          balanceAfter: updatedUser.cloopCoins,
          description: `Thưởng nhiệm vụ: ${quest.title}`,
          metadata: { questCode: quest.code }
        }
      });
    });

    revalidatePath("/my-closet/wallet");
    return {
      success: true,
      message: `Chúc mừng! Bạn đã nhận thành công +${quest.rewardCoins} Lá! 🍃`,
      rewardCoins: quest.rewardCoins,
      newBalance: newCoins
    };

  } catch (error: any) {
    console.error("❌ Lỗi khi nhận thưởng nhiệm vụ:", error);
    return {
      success: false,
      message: error.message || "Có lỗi xảy ra khi nhận thưởng."
    };
  }
}

// 3. Lấy dữ liệu tổng quan ví Điểm Lá & Nhiệm vụ của User
export async function getUserCoinDashboardAction() {
  try {
    let authUser;
    try {
      authUser = await requireUser();
    } catch {
      return { success: false, message: "Chưa đăng nhập" };
    }
    const userId = authUser.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { cloopCoins: true, walletBalance: true }
    });

    const claims = await prisma.coinQuestClaim.findMany({
      where: { userId: userId },
      select: { questCode: true, createdAt: true }
    });
    const claimedCodes = new Set(claims.map(c => c.questCode));

    const productCount = await prisma.product.count({
      where: { userId: userId, isDeleted: false }
    });

    const fiveStarCount = await prisma.review.count({
      where: { revieweeId: userId, rating: { gte: 5 } }
    });

    const ledgerHistory = await prisma.coinLedgerEntry.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" },
      take: 10
    });

    return {
      success: true,
      coins: user?.cloopCoins || 0,
      walletBalance: user?.walletBalance || 0,
      claimedCodes: Array.from(claimedCodes),
      stats: {
        productCount,
        fiveStarCount
      },
      ledgerHistory: ledgerHistory.map(entry => ({
        id: entry.id,
        type: entry.type,
        amount: entry.amount,
        balanceAfter: entry.balanceAfter,
        description: entry.description,
        createdAt: entry.createdAt.toISOString()
      }))
    };

  } catch (error: any) {
    console.error("❌ Lỗi khi tải dữ liệu Ví Điểm Lá:", error);
    return { success: false, message: error.message };
  }
}
