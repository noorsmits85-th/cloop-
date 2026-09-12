import { prisma } from "@/src/lib/prisma";

export type TrustTier = "LEVEL_0_NEW" | "LEVEL_1_VERIFIED" | "LEVEL_2_TRUSTED" | "LEVEL_3_VIP";

export interface TrustTierConfig {
  tier: TrustTier;
  label: string;
  minScore: number;
  maxScore: number;
  depositRate: number; // Tỷ lệ cọc so với cọc gốc (1.0 = 100%, 0.5 = 50%, ...)
  exposureLimit: number; // Hạn mức tổng giá trị tài sản đang trong vòng thuê
  perks: string[];
  badgeColor: string;
}

export const TRUST_TIERS: Record<TrustTier, TrustTierConfig> = {
  LEVEL_0_NEW: {
    tier: "LEVEL_0_NEW",
    label: "Thành viên Mới (Khám phá)",
    minScore: 0,
    maxScore: 29,
    depositRate: 1.0, // Cọc 100%
    exposureLimit: 2000000, // Tối đa 2 triệu VNĐ tài sản đang thuê
    perks: ["Thanh toán VietQR Escrow bảo vệ 2 chiều", "Tự động tích lũy điểm uy tín sau mỗi đơn"],
    badgeColor: "bg-stone-100 text-stone-700 border-stone-300",
  },
  LEVEL_1_VERIFIED: {
    tier: "LEVEL_1_VERIFIED",
    label: "Đã Xác Thực (Tín nhiệm cơ bản)",
    minScore: 30,
    maxScore: 59,
    depositRate: 0.75, // Cọc 75%
    exposureLimit: 5000000, // Tối đa 5 triệu VNĐ
    perks: ["Giảm 25% tiền cọc niêm yết", "Hạn mức thuê nâng lên 5.000.000đ", "Ưu tiên ghép nối tủ đồ gần"],
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  LEVEL_2_TRUSTED: {
    tier: "LEVEL_2_TRUSTED",
    label: "Khách Quen Uy Tín (Đáng tin cậy)",
    minScore: 60,
    maxScore: 84,
    depositRate: 0.5, // Cọc 50%
    exposureLimit: 10000000, // Tối đa 10 triệu VNĐ
    perks: ["Giảm 50% tiền cọc", "Hạn mức thuê nâng lên 10.000.000đ", "Hỗ trợ giải quyết tranh chấp ưu tiên"],
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-300",
  },
  LEVEL_3_VIP: {
    tier: "LEVEL_3_VIP",
    label: "CLOOP VIP Club (Tín nhiệm tuyệt đối)",
    minScore: 85,
    maxScore: 100,
    depositRate: 0.25, // Cọc 25% (hoặc 0đ cho đồ < 1.000.000đ)
    exposureLimit: 25000000, // Tối đa 25 triệu VNĐ
    perks: [
      "Giảm tới 75% tiền cọc (Miễn cọc với đồ dưới 1 triệu)",
      "Hạn mức thuê cao cấp 25.000.000đ",
      "Đặc quyền mượn đồ thiết kế dạ hội VIP",
    ],
    badgeColor: "bg-amber-50 text-amber-900 border-amber-300",
  },
};

export interface TrustScoreBreakdown {
  score: number;
  tier: TrustTier;
  config: TrustTierConfig;
  factors: {
    emailVerified: boolean;
    emailPoints: number;
    phoneVerified: boolean;
    phonePoints: number;
    isStudent: boolean;
    studentPoints: number;
    completedOrders: number;
    orderPoints: number;
    fiveStarReviews: number;
    reviewPoints: number;
    disputeCount: number;
    disputePenalty: number;
    cancelCount: number;
    cancelPenalty: number;
  };
}

/**
 * 🧮 TÍNH TOÁN TRUST SCORE CỦA USER DỰA TRÊN DỮ LIỆU THỰC TẾ
 */
export async function calculateUserTrustScore(userId: string): Promise<TrustScoreBreakdown> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      isVerified: true,
      completedOrders: true,
      rentalHistory: {
        where: { isDeleted: false },
        select: {
          id: true,
          status: true,
          disputes: { select: { id: true } },
        },
      },
      reviewsGiven: {
        select: { id: true, rating: true },
      },
      reviewsReceived: {
        select: { id: true, rating: true },
      },
    },
  });

  if (!user) {
    const config = TRUST_TIERS.LEVEL_0_NEW;
    return {
      score: 10,
      tier: "LEVEL_0_NEW",
      config,
      factors: {
        emailVerified: false,
        emailPoints: 0,
        phoneVerified: false,
        phonePoints: 0,
        isStudent: false,
        studentPoints: 0,
        completedOrders: 0,
        orderPoints: 0,
        fiveStarReviews: 0,
        reviewPoints: 0,
        disputeCount: 0,
        disputePenalty: 0,
        cancelCount: 0,
        cancelPenalty: 0,
      },
    };
  }

  // 1. Account Proof Signals
  const emailVerified = true; // Supabase auth requires email
  const emailPoints = 10;

  const phoneVerified = user.isVerified || false;
  const phonePoints = phoneVerified ? 10 : 5;

  // Domain edu.vn / student indicator
  const isStudent = user.email.toLowerCase().includes(".edu.vn") || user.email.toLowerCase().includes("student");
  const studentPoints = isStudent ? 15 : 0;

  // 2. Transaction Trust Signals
  const completedOrdersCount = user.rentalHistory.filter(
    (r) => r.status === "LENDER_COMPLETED" || r.status === "BORROWER_RETURNED"
  ).length;
  const orderPoints = Math.min(40, completedOrdersCount * 10);

  // Reviews Received
  const fiveStarReviewsCount = user.reviewsReceived.filter((rev) => rev.rating >= 4.8).length;
  const reviewPoints = Math.min(20, fiveStarReviewsCount * 5);

  // 3. Penalties (Risk Signals)
  const disputeCount = user.rentalHistory.reduce((acc, r) => acc + (r.disputes?.length || 0), 0);
  const disputePenalty = disputeCount * 25;

  const cancelCount = user.rentalHistory.filter((r) => r.status === "CANCELLED").length;
  const cancelPenalty = cancelCount * 10;

  // Tổng hợp điểm và chặn biên [0, 100]
  const rawScore = 15 + emailPoints + phonePoints + studentPoints + orderPoints + reviewPoints - disputePenalty - cancelPenalty;
  const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Phân loại Tier
  let tier: TrustTier = "LEVEL_0_NEW";
  if (finalScore >= 85) {
    tier = "LEVEL_3_VIP";
  } else if (finalScore >= 60) {
    tier = "LEVEL_2_TRUSTED";
  } else if (finalScore >= 30) {
    tier = "LEVEL_1_VERIFIED";
  } else {
    tier = "LEVEL_0_NEW";
  }

  return {
    score: finalScore,
    tier,
    config: TRUST_TIERS[tier],
    factors: {
      emailVerified,
      emailPoints,
      phoneVerified,
      phonePoints,
      isStudent,
      studentPoints,
      completedOrders: completedOrdersCount,
      orderPoints,
      fiveStarReviews: fiveStarReviewsCount,
      reviewPoints,
      disputeCount,
      disputePenalty,
      cancelCount,
      cancelPenalty,
    },
  };
}

/**
 * 🛡️ KIỂM TRA HẠN MỨC RỦI RO TÀI SẢN (TRANSACTION EXPOSURE LIMIT)
 * Giới hạn tổng giá trị tài sản mà một user được phép giữ đồng thời trên đường thuê.
 */
export async function checkExposureLimit({
  userId,
  newItemValue,
  trustTier,
  fastTrackOverride = false,
}: {
  userId: string;
  newItemValue: number;
  trustTier: TrustTier;
  fastTrackOverride?: boolean;
}): Promise<{
  allowed: boolean;
  currentExposure: number;
  exposureLimit: number;
  projectedExposure: number;
  requiresFastTrack: boolean;
  reason?: string;
}> {
  const config = TRUST_TIERS[trustTier];
  const exposureLimit = config.exposureLimit;

  // Tính tổng giá trị tài sản đang trong quá trình thuê của user
  const activeRentals = await prisma.rentalHistory.findMany({
    where: {
      renterId: userId,
      status: {
        in: ["PENDING_APPROVAL", "OWNER_PACKED", "LENDER_SHIPPED", "BORROWER_RECEIVED"],
      },
      isDeleted: false,
    },
    include: {
      product: {
        include: {
          listings: { take: 1 },
        },
      },
    },
  });

  const currentExposure = activeRentals.reduce((sum, r) => {
    const listing = r.product?.listings?.[0];
    const itemVal = listing?.salePrice || (listing?.basePrice ? listing.basePrice * 10 : 1000000);
    return sum + itemVal;
  }, 0);

  const projectedExposure = currentExposure + newItemValue;

  if (projectedExposure > exposureLimit) {
    if (fastTrackOverride) {
      return {
        allowed: true,
        currentExposure,
        exposureLimit,
        projectedExposure,
        requiresFastTrack: true,
        reason: "Vượt hạn mức tiêu chuẩn nhưng đã kích hoạt Fast-Track Trust (Cọc bảo chứng 100%).",
      };
    }

    return {
      allowed: false,
      currentExposure,
      exposureLimit,
      projectedExposure,
      requiresFastTrack: true,
      reason: `Món đồ này (hoặc tổng tài sản đang thuê: ${projectedExposure.toLocaleString()}đ) vượt hạn mức ${config.label} (${exposureLimit.toLocaleString()}đ). Bạn có thể kích hoạt Fast-Track Trust để tiếp tục.`,
    };
  }

  return {
    allowed: true,
    currentExposure,
    exposureLimit,
    projectedExposure,
    requiresFastTrack: false,
  };
}

/**
 * 💎 TÍNH TIỀN CỌC ĐỘNG VÀ THÔNG ĐIỆP GAMIFICATION (EXPLAINABLE DEPOSIT)
 * Formula: Deposit = f(Item Value, Trust Score, Transaction History, FastTrack)
 */
export function calculateDynamicDeposit({
  baseDeposit,
  itemValue,
  trustTier,
  isRental = true,
  fastTrackActive = false,
}: {
  baseDeposit: number;
  itemValue: number;
  trustTier: TrustTier;
  isRental?: boolean;
  fastTrackActive?: boolean;
}): {
  finalDeposit: number;
  originalDeposit: number;
  discountAmount: number;
  discountPercent: number;
  explanation: string;
  nextTierGoal: string;
} {
  if (!isRental) {
    return {
      finalDeposit: 0,
      originalDeposit: 0,
      discountAmount: 0,
      discountPercent: 0,
      explanation: "Đơn mua đứt tuần hoàn không áp dụng tiền cọc.",
      nextTierGoal: "",
    };
  }

  // Fast-Track Trust Mode (Khách hàng VIP mới muốn thuê đồ giá trị cao vượt hạn mức)
  if (fastTrackActive) {
    return {
      finalDeposit: baseDeposit,
      originalDeposit: baseDeposit,
      discountAmount: 0,
      discountPercent: 0,
      explanation: "⚡ Chế độ Fast-Track Trust: Áp dụng cọc 100% bảo chứng qua Escrow để mở khóa thuê trang phục giá trị cao ngay lập tức.",
      nextTierGoal: "Trả đồ đúng hạn đơn này để được thăng hạng và giảm tiền cọc ở lần thuê kế tiếp!",
    };
  }

  const config = TRUST_TIERS[trustTier];
  let discountPercent = 0;

  switch (trustTier) {
    case "LEVEL_0_NEW":
      discountPercent = 0;
      break;
    case "LEVEL_1_VERIFIED":
      discountPercent = 25;
      break;
    case "LEVEL_2_TRUSTED":
      discountPercent = 50;
      break;
    case "LEVEL_3_VIP":
      discountPercent = itemValue <= 1000000 ? 100 : 75;
      break;
  }

  const discountAmount = Math.round((baseDeposit * discountPercent) / 100);
  const finalDeposit = Math.max(0, baseDeposit - discountAmount);

  let explanation = "";
  let nextTierGoal = "";

  if (trustTier === "LEVEL_0_NEW") {
    explanation = "Mức cọc tiêu chuẩn cho thành viên mới để đảm bảo an toàn giao dịch 2 chiều.";
    nextTierGoal = "🌟 Hoàn tất đơn đầu tiên an toàn để mở khóa Hạng Tín Nhiệm và giảm 25% - 50% tiền cọc!";
  } else if (trustTier === "LEVEL_1_VERIFIED") {
    explanation = `🌟 Đặc quyền Tín nhiệm Cơ bản: Bạn được giảm 25% tiền cọc (tiết kiệm ${discountAmount.toLocaleString()}đ).`;
    nextTierGoal = "Hoàn tất thêm 2 đơn thành công để thăng hạng Khách Quen và được giảm 50% tiền cọc!";
  } else if (trustTier === "LEVEL_2_TRUSTED") {
    explanation = `🌟 Đặc quyền Khách Quen Uy Tín: Bạn được giảm 50% tiền cọc (tiết kiệm ${discountAmount.toLocaleString()}đ).`;
    nextTierGoal = "Đạt trên 85 điểm tín nhiệm để gia nhập VIP Club và hưởng đặc quyền miễn cọc!";
  } else {
    if (finalDeposit === 0) {
      explanation = `👑 Đặc quyền CLOOP VIP Club: Miễn 100% tiền cọc cho trang phục này (tiết kiệm ${(baseDeposit || 0).toLocaleString()}đ)!`;
    } else {
      explanation = `👑 Đặc quyền CLOOP VIP Club: Giảm 75% tiền cọc (tiết kiệm ${discountAmount.toLocaleString()}đ).`;
    }
    nextTierGoal = "Bạn đang ở cấp bậc tín nhiệm cao nhất của cộng đồng CLOOP.";
  }

  return {
    finalDeposit,
    originalDeposit: baseDeposit,
    discountAmount,
    discountPercent,
    explanation,
    nextTierGoal,
  };
}
