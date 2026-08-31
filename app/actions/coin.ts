"use server";

import { prisma } from "@/src/lib/prisma";
import { payos } from "@/lib/payos";
import { requireUser } from "@/src/lib/auth";
import { COIN_PACKAGES, QUEST_DEFINITIONS } from "@/lib/coinPackages";
import { revalidatePath } from "next/cache";
import { generatePayOSOrderCode } from "@/src/utils/order-code";

// 1. Tạo thanh toán mua gói Điểm Lá qua PayOS
export async function createCoinTopUpPayment(packageCode: string) {
  try {
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

    // Nếu DB vẫn là PENDING -> Chủ động hỏi PayOS API trực tiếp để phòng ngừa webhook bị delay
    if (topUp.status === "PENDING" && payos) {
      try {
        const payosInfo = await payos.paymentRequests.get(orderCode);
        if (payosInfo && (payosInfo.status === "PAID" || (payosInfo.amountPaid && payosInfo.amountPaid >= topUp.amountVnd))) {
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

            const updatedUser = await tx.user.update({
              where: { id: topUp.userId },
              data: { cloopCoins: { increment: topUp.totalCoins } },
              select: { cloopCoins: true }
            });

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
    if (questCode === "FIRST_LISTING") {
      const productCount = await prisma.product.count({
        where: { userId: userId, isDeleted: false }
      });
      if (productCount < 1) {
        return { success: false, message: "Bạn cần đăng tải ít nhất 1 món đồ lên tủ đồ trước khi nhận thưởng." };
      }
    } else if (questCode === "WEEKLY_LISTING_1") {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentProducts = await prisma.product.count({
        where: { userId: userId, isDeleted: false, createdAt: { gte: oneWeekAgo } }
      });
      if (recentProducts < 1) {
        return { success: false, message: "Bạn chưa đăng món đồ nào trong tuần này." };
      }
    } else if (questCode === "FIVE_STAR_ORDER") {
      const fiveStarReviews = await prisma.review.count({
        where: { revieweeId: userId, rating: { gte: 5 } }
      });
      if (fiveStarReviews < 1) {
        return { success: false, message: "Bạn cần có ít nhất 1 đánh giá 5 sao từ đơn cho thuê thành công." };
      }
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
