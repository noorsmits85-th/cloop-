import { prisma } from "@/src/lib/prisma";

export type TrustTier = "LEVEL_0_NEW" | "LEVEL_1_VERIFIED" | "LEVEL_2_TRUSTED" | "LEVEL_3_VIP";

export interface TrustTierConfig {
  tier: TrustTier;
  label: string;
  minScore: number;
  maxScore: number;
  depositRate: number; // Tỷ lệ cọc so với cọc gốc (1.0 = 100%, 0.5 = 50%, ...)
  exposureLimit: number; // Hạn mức tổng giá trị tài sản đang trong vòng thuê
  fastTrackCeiling: number; // Trần tối đa khi kích hoạt Fast-Track (thu 100% cọc qua PayOS)
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
    exposureLimit: 2000000, // Tiêu chuẩn: 2 triệu VNĐ
    fastTrackCeiling: 6000000, // Trần Fast-Track tối đa: 6 triệu VNĐ (chặn attacker gom đồ chục triệu)
    perks: ["Thanh toán PayOS bảo vệ 2 chiều", "Tự động tích lũy điểm uy tín sau mỗi đơn"],
    badgeColor: "bg-stone-100 text-stone-700 border-stone-300",
  },
  LEVEL_1_VERIFIED: {
    tier: "LEVEL_1_VERIFIED",
    label: "Đã Xác Thực (Tín nhiệm cơ bản)",
    minScore: 30,
    maxScore: 59,
    depositRate: 0.75, // Cọc 75%
    exposureLimit: 5000000, // Tiêu chuẩn: 5 triệu VNĐ
    fastTrackCeiling: 12000000, // Trần Fast-Track: 12 triệu VNĐ
    perks: ["Giảm 25% tiền cọc niêm yết", "Hạn mức thuê nâng lên 5.000.000đ", "Ưu tiên ghép nối tủ đồ gần"],
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  LEVEL_2_TRUSTED: {
    tier: "LEVEL_2_TRUSTED",
    label: "Khách Quen Uy Tín (Đáng tin cậy)",
    minScore: 60,
    maxScore: 84,
    depositRate: 0.5, // Cọc 50%
    exposureLimit: 10000000, // Tiêu chuẩn: 10 triệu VNĐ
    fastTrackCeiling: 20000000, // Trần Fast-Track: 20 triệu VNĐ
    perks: ["Giảm 50% tiền cọc", "Hạn mức thuê nâng lên 10.000.000đ", "Hỗ trợ giải quyết tranh chấp ưu tiên"],
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-300",
  },
  LEVEL_3_VIP: {
    tier: "LEVEL_3_VIP",
    label: "CLOOP VIP Club (Tín nhiệm tuyệt đối)",
    minScore: 85,
    maxScore: 100,
    depositRate: 0.25, // Cọc 25% (hoặc 0đ cho đồ < 1.000.000đ)
    exposureLimit: 25000000, // Tiêu chuẩn: 25 triệu VNĐ
    fastTrackCeiling: 35000000, // Trần Fast-Track: 35 triệu VNĐ
    perks: [
      "Giảm tới 75% tiền cọc (Miễn cọc với đồ dưới 1 triệu)",
      "Hạn mức thuê cao cấp 25.000.000đ",
      "Đặc quyền mượn đồ thiết kế dạ hội VIP",
    ],
    badgeColor: "bg-amber-50 text-amber-900 border-amber-300",
  },
};

/**
 * 📐 HÀM ĐỊNH GIÁ TÀI SẢN CHUẨN HÓA (STANDARDIZED ASSET VALUATION)
 * Tính toán giá trị ước lượng của sản phẩm để quản trị rủi ro Exposure Limit.
 */
export function getItemValuation(listing?: {
  salePrice?: number | null;
  deposit?: number | null;
  basePrice?: number | null;
} | null): number {
  if (!listing) return 1000000;

  if (listing.salePrice && listing.salePrice > 0) {
    return listing.salePrice;
  }
  if (listing.deposit && listing.deposit > 0) {
    return Math.round(listing.deposit * 1.5);
  }
  if (listing.basePrice && listing.basePrice > 0) {
    return Math.max(500000, listing.basePrice * 6);
  }
  return 1000000;
}

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

  // 1. Transaction Trust Signals
  const completedOrdersCount = user.rentalHistory.filter(
    (r) => r.status === "LENDER_COMPLETED" || r.status === "BORROWER_RETURNED"
  ).length;

  // Reviews Received
  const fiveStarReviewsCount = user.reviewsReceived.filter((rev) => rev.rating >= 4.8).length;

  // 3. Penalties (Risk Signals)
  const disputeCount = user.rentalHistory.reduce((acc, r) => acc + (r.disputes?.length || 0), 0);
  const cancelCount = user.rentalHistory.filter((r) => r.status === "CANCELLED").length;

  return calculateUserTrustScoreFromData({
    email: user.email,
    isVerified: user.isVerified,
    completedOrdersCount,
    fiveStarReviewsCount,
    disputeCount,
    cancelCount,
    hasStudentEmailProof: false,
  });
}

/**
 * 🧮 HÀM TÍNH TOÁN PURE FUNCTION (DÙNG CHO CẢ RUNTIME VÀ UNIT TEST)
 */
export function calculateUserTrustScoreFromData(data: {
  email?: string | null;
  isVerified?: boolean | null;
  completedOrders?: number;
  completedOrdersCount?: number;
  rating?: number;
  fiveStarReviewsCount?: number;
  disputeCount?: number;
  cancelCount?: number;
  hasStudentEmailProof?: boolean;
}): TrustScoreBreakdown {
  // 1. Account Proof Signals (Xác thực thực tế)
  const emailVerified = Boolean(data.email && data.email.includes("@"));
  const emailPoints = emailVerified ? 10 : 0;

  const phoneVerified = data.isVerified || false;
  const phonePoints = phoneVerified ? 10 : 0;

  // Tín hiệu email trường học (Student Email Signal)
  const emailLower = (data.email || "").toLowerCase();
  const isStudent = Boolean(data.hasStudentEmailProof) || emailLower.includes(".edu.vn") || emailLower.includes("student");
  const studentPoints = isStudent ? 10 : 0;

  // 2. Transaction Trust Signals
  const orders = data.completedOrdersCount ?? data.completedOrders ?? 0;
  const orderPoints = Math.min(40, orders * 10);

  // Reviews Received
  const reviews = data.fiveStarReviewsCount ?? (data.rating && data.rating >= 4.8 ? 2 : 0);
  const reviewPoints = Math.min(20, reviews * 5);

  // 3. Penalties (Risk Signals)
  const disputeCount = data.disputeCount || 0;
  const disputePenalty = disputeCount * 25;

  const cancelCount = data.cancelCount || 0;
  const cancelPenalty = cancelCount * 10;

  // Điểm cơ bản ban đầu là 10 (tài khoản đã đăng ký hợp lệ)
  const rawScore = 10 + emailPoints + phonePoints + studentPoints + orderPoints + reviewPoints - disputePenalty - cancelPenalty;
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
      completedOrders: orders,
      orderPoints,
      fiveStarReviews: reviews,
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
 * Khóa chặt luồng Fast-Track: Bắt buộc tuân thủ điều kiện rủi ro & trần Fast-Track.
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
  const fastTrackCeiling = config.fastTrackCeiling;

  // Lấy các đơn thuê đang hoạt động của user để tính tổng exposure
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
      disputes: {
        select: { id: true, status: true },
      },
    },
  });

  const currentExposure = activeRentals.reduce((sum, r) => {
    const listing = r.product?.listings?.[0];
    return sum + getItemValuation(listing);
  }, 0);

  const projectedExposure = currentExposure + newItemValue;

  // Nếu trong hạn mức tiêu chuẩn -> Cho phép giao dịch bình thường
  if (projectedExposure <= exposureLimit) {
    return {
      allowed: true,
      currentExposure,
      exposureLimit,
      projectedExposure,
      requiresFastTrack: false,
    };
  }

  // VƯỢT HẠN MỨC TIÊU CHUẨN -> XÉT DUYỆT FAST-TRACK TRUST
  if (fastTrackOverride) {
    // 🛡️ PHÒNG TUYẾN 0: Bắt buộc xác minh danh tính (eKYC / SĐT / Level 1+)
    // Chặn tài khoản mới tạo chưa xác thực (Level 0 unverified) kích hoạt Fast-Track
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isVerified: true },
    });

    const openDisputes = activeRentals.reduce(
      (acc, r) => acc + r.disputes.filter((d) => d.status === "PENDING_REVIEW" || d.status === "DISPUTED").length,
      0
    );

    const evaluation = evaluateFastTrackEligibility({
      trustTier,
      isVerified: user?.isVerified === true,
      activeRentalsCount: activeRentals.length,
      openDisputesCount: openDisputes,
      projectedExposure,
    });

    if (!evaluation.eligible) {
      return {
        allowed: false,
        currentExposure,
        exposureLimit,
        projectedExposure,
        requiresFastTrack: true,
        reason: evaluation.reason,
      };
    }

    // Đạt đủ điều kiện an toàn -> Chấp thuận Fast-Track
    return {
      allowed: true,
      currentExposure,
      exposureLimit,
      projectedExposure,
      requiresFastTrack: true,
      reason: "Đã kích hoạt Fast-Track Trust hợp lệ (thu 100% tiền cọc bảo chứng qua PayOS).",
    };
  }

  // Nếu vượt hạn mức và CHƯA bật Fast-Track -> Yêu cầu bật Fast-Track
  return {
    allowed: false,
    currentExposure,
    exposureLimit,
    projectedExposure,
    requiresFastTrack: true,
    reason: `Tổng giá trị đồ thuê vượt hạn mức tín nhiệm hiện tại của ${config.label} (${exposureLimit.toLocaleString()}đ). Bạn có thể kích hoạt Chế độ Fast-Track (thu 100% tiền cọc bảo chứng) để thuê món đồ này ngay lập tức!`,
  };
}

/**
 * 🛡️ HÀM ĐÁNH GIÁ ĐIỀU KIỆN FAST-TRACK (DÙNG CHO CẢ LOGIC LÕI VÀ TEST TỰ ĐỘNG)
 */
export function evaluateFastTrackEligibility(params: {
  trustTier: TrustTier;
  isVerified: boolean;
  activeRentalsCount: number;
  openDisputesCount: number;
  projectedExposure: number;
}): { eligible: boolean; reason?: string; fastTrackCeiling: number } {
  const config = TRUST_TIERS[params.trustTier];
  if (!params.isVerified && params.trustTier === "LEVEL_0_NEW") {
    return {
      eligible: false,
      reason: "Tính năng Fast-Track bảo chứng chỉ áp dụng cho tài khoản đã xác minh danh tính (từ Level 1 Verified trở lên hoặc đã hoàn tất eKYC/SĐT). Vui lòng xác thực tài khoản để mở khóa.",
      fastTrackCeiling: config.fastTrackCeiling,
    };
  }
  if (params.openDisputesCount > 0) {
    return {
      eligible: false,
      reason: "Tài khoản hiện có khiếu nại tranh chấp đang chờ xử lý. Không đủ điều kiện kích hoạt Fast-Track Trust.",
      fastTrackCeiling: config.fastTrackCeiling,
    };
  }
  if (params.trustTier === "LEVEL_0_NEW" && params.activeRentalsCount >= 1) {
    return {
      eligible: false,
      reason: "Thành viên mới chỉ được kích hoạt tối đa 1 đơn Fast-Track đồng thời. Vui lòng hoàn tất đơn thuê hiện tại trước khi đặt thêm món đồ giá trị cao.",
      fastTrackCeiling: config.fastTrackCeiling,
    };
  }
  if (params.projectedExposure > config.fastTrackCeiling) {
    return {
      eligible: false,
      reason: `Món đồ này (Tổng rủi ro: ${params.projectedExposure.toLocaleString("vi-VN")}đ) vượt trần tối đa của chế độ Fast-Track cho ${config.label} (${config.fastTrackCeiling.toLocaleString("vi-VN")}đ). Vui lòng tích lũy thêm đơn hoàn tất để tăng hạng tín nhiệm hoặc liên hệ Quản trị viên.`,
      fastTrackCeiling: config.fastTrackCeiling,
    };
  }
  return { eligible: true, fastTrackCeiling: config.fastTrackCeiling };
}

/**
 * 💎 TÍNH TIỀN CỌC ĐỘNG VÀ THÔNG ĐIỆP GIẢI THÍCH (EXPLAINABLE DEPOSIT)
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

  // Fast-Track Trust Mode: Bắt buộc thu 100% tiền cọc qua PayOS (không chiết khấu cọc)
  if (fastTrackActive) {
    return {
      finalDeposit: baseDeposit,
      originalDeposit: baseDeposit,
      discountAmount: 0,
      discountPercent: 0,
      explanation: "⚡ Chế độ Fast-Track: Thu đủ 100% tiền cọc bảo chứng qua Cổng thanh toán PayOS để mở khóa thuê trang phục giá trị cao ngay lập tức.",
      nextTierGoal: "Trả đồ đúng hạn đơn này để được thăng hạng tín nhiệm và hưởng ưu đãi giảm cọc ở lần thuê kế tiếp!",
    };
  }

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
