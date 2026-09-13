export type TrustTier = "LEVEL_0_NEW" | "LEVEL_1_VERIFIED" | "LEVEL_2_TRUSTED" | "LEVEL_3_VIP";

export interface TierCriteria {
  tier: TrustTier;
  label: string;
  minCompletedOrders: number;
  minRentalSpend: number; // Tổng chi tiêu thuê thành công tối thiểu (VNĐ)
  minOwnerReviews: number; // Số đánh giá từ chủ đồ
  minAverageRating: number; // Điểm đánh giá trung bình tối thiểu (sao)
  minDistinctLenders: number; // Số chủ đồ khác nhau đã giao dịch (chống thông đồng cày đơn)
  minDaysObservationPeriod?: number; // Thời gian quan sát tín nhiệm từ đơn đầu tiên (14 ngày đối với Level 1)
  minDaysSinceFirstOrder?: number; // Backward-compatibility alias
  depositDiscountRate: number; // 0.0, 0.10, 0.20, 0.30
  depositRate: number; // 1.0, 0.90, 0.80, 0.70
  maxCoveragePerOrder: number; // Giới hạn quỹ bảo lãnh tối đa trên mỗi đơn (VNĐ)
  maxActiveGuaranteePerUser: number; // Hạn mức bảo lãnh đang mở tối đa theo từng tài khoản (VNĐ)
  maxConcurrentDiscountedOrders: number; // Số đơn giảm cọc tối đa đồng thời theo tài khoản
  fundThresholdRequired: number; // Ngưỡng số dư quỹ bảo chứng khả dụng tối thiểu để mở quyền lợi (VNĐ)
}

export const CONSERVATIVE_TIER_RULES: Record<TrustTier, TierCriteria> = {
  LEVEL_0_NEW: {
    tier: "LEVEL_0_NEW",
    label: "Thành viên Mới (Khám phá)",
    minCompletedOrders: 0,
    minRentalSpend: 0,
    minOwnerReviews: 0,
    minAverageRating: 0,
    minDistinctLenders: 0,
    depositDiscountRate: 0.0,
    depositRate: 1.0,
    maxCoveragePerOrder: 0,
    maxActiveGuaranteePerUser: 0,
    maxConcurrentDiscountedOrders: 0,
    fundThresholdRequired: 0,
  },
  LEVEL_1_VERIFIED: {
    tier: "LEVEL_1_VERIFIED",
    label: "Đã Xác Thực (Tín nhiệm cơ bản)",
    minCompletedOrders: 3,
    minRentalSpend: 1000000,
    minOwnerReviews: 3,
    minAverageRating: 4.0,
    minDistinctLenders: 2,
    minDaysObservationPeriod: 14,
    minDaysSinceFirstOrder: 14,
    depositDiscountRate: 0.10, // 10%
    depositRate: 0.90,
    maxCoveragePerOrder: 200000, // Trần 200.000đ/đơn
    maxActiveGuaranteePerUser: 500000, // Trần 500.000đ nợ bảo lãnh mở toàn tài khoản
    maxConcurrentDiscountedOrders: 2, // Tối đa 2 đơn giảm cọc đồng thời
    fundThresholdRequired: 5000000, // Quỹ khả dụng từ 5 triệu VNĐ
  },
  LEVEL_2_TRUSTED: {
    tier: "LEVEL_2_TRUSTED",
    label: "Khách Quen Uy Tín (Đáng tin cậy)",
    minCompletedOrders: 8,
    minRentalSpend: 3000000,
    minOwnerReviews: 8,
    minAverageRating: 4.0,
    minDistinctLenders: 3,
    minDaysObservationPeriod: 14,
    minDaysSinceFirstOrder: 14,
    depositDiscountRate: 0.20, // 20%
    depositRate: 0.80,
    maxCoveragePerOrder: 500000, // Trần 500.000đ/đơn
    maxActiveGuaranteePerUser: 1500000, // Trần 1.500.000đ nợ bảo lãnh mở toàn tài khoản
    maxConcurrentDiscountedOrders: 4, // Tối đa 4 đơn giảm cọc đồng thời
    fundThresholdRequired: 15000000, // Quỹ khả dụng từ 15 triệu VNĐ
  },
  LEVEL_3_VIP: {
    tier: "LEVEL_3_VIP",
    label: "CLOOP VIP Club (Tín nhiệm cao cấp)",
    minCompletedOrders: 12,
    minRentalSpend: 8000000,
    minOwnerReviews: 12,
    minAverageRating: 4.5,
    minDistinctLenders: 5,
    minDaysObservationPeriod: 14,
    minDaysSinceFirstOrder: 14,
    depositDiscountRate: 0.30, // 30% - tuyệt đối không có 0 đồng!
    depositRate: 0.70,
    maxCoveragePerOrder: 1000000, // Trần 1.000.000đ/đơn
    maxActiveGuaranteePerUser: 3000000, // Trần 3.000.000đ nợ bảo lãnh mở toàn tài khoản
    maxConcurrentDiscountedOrders: 6, // Tối đa 6 đơn giảm cọc đồng thời
    fundThresholdRequired: 30000000, // Quỹ khả dụng từ 30 triệu VNĐ
  },
};

export interface TrustTierConfig {
  tier: TrustTier;
  label: string;
  minScore: number;
  maxScore: number;
  depositRate: number; // Tỷ lệ cọc thực tế (1.0 = 100%, 0.9 = 90%, ...)
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
    fastTrackCeiling: 6000000, // Trần Fast-Track tối đa: 6 triệu VNĐ
    perks: ["Thanh toán PayOS bảo vệ 2 chiều", "Tự động tích lũy điểm uy tín sau mỗi đơn"],
    badgeColor: "bg-stone-100 text-stone-700 border-stone-300",
  },
  LEVEL_1_VERIFIED: {
    tier: "LEVEL_1_VERIFIED",
    label: "Đã Xác Thực (Tín nhiệm cơ bản)",
    minScore: 30,
    maxScore: 59,
    depositRate: 0.9, // Cọc 90% (giảm 10%, trần 200k)
    exposureLimit: 5000000, // Tiêu chuẩn: 5 triệu VNĐ
    fastTrackCeiling: 12000000, // Trần Fast-Track: 12 triệu VNĐ
    perks: [
      "Bảo lãnh giảm 10% tiền cọc (tối đa 200.000đ/đơn)",
      "Hạn mức thuê nâng lên 5.000.000đ",
      "Ưu tiên ghép nối tủ đồ gần",
    ],
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  LEVEL_2_TRUSTED: {
    tier: "LEVEL_2_TRUSTED",
    label: "Khách Quen Uy Tín (Đáng tin cậy)",
    minScore: 60,
    maxScore: 84,
    depositRate: 0.8, // Cọc 80% (giảm 20%, trần 500k)
    exposureLimit: 10000000, // Tiêu chuẩn: 10 triệu VNĐ
    fastTrackCeiling: 20000000, // Trần Fast-Track: 20 triệu VNĐ
    perks: [
      "Bảo lãnh giảm 20% tiền cọc (tối đa 500.000đ/đơn)",
      "Hạn mức thuê nâng lên 10.000.000đ",
      "Hỗ trợ giải quyết tranh chấp ưu tiên",
    ],
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-300",
  },
  LEVEL_3_VIP: {
    tier: "LEVEL_3_VIP",
    label: "CLOOP VIP Club (Tín nhiệm cao cấp)",
    minScore: 85,
    maxScore: 100,
    depositRate: 0.7, // Cọc 70% (giảm 30%, trần 1.000.000đ - loại bỏ hoàn toàn 0đ)
    exposureLimit: 25000000, // Tiêu chuẩn: 25 triệu VNĐ
    fastTrackCeiling: 35000000, // Trần Fast-Track: 35 triệu VNĐ
    perks: [
      "Bảo lãnh giảm 30% tiền cọc (tối đa 1.000.000đ/đơn, không miễn cọc 0đ)",
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
  criteria: TierCriteria;
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
    totalRentalSpend: number;
    averageRating: number;
    distinctLenders: number;
    daysSinceFirstOrder?: number;
    daysSinceFirstCompletedOrder?: number;
    disputeCount: number;
    disputePenalty: number;
    cancelCount: number;
    cancelPenalty: number;
    fraudConfirmedDisputeCount: number;
    seriousLateReturnCount: number;
    intentionalCancellationCount: number;
    openDisputeCount: number;
  };
  eligibility: {
    isEligible: boolean;
    isDiscountFrozen?: boolean;
    unmetCriteria: string[];
    studentVoucherEligible: boolean;
  };
}

export interface TrustScoreInput {
  email?: string | null;
  isVerified?: boolean | null;
  completedOrders?: number;
  completedOrdersCount?: number;
  totalRentalSpend?: number;
  rating?: number;
  averageRating?: number;
  fiveStarReviewsCount?: number;
  ownerReviewsCount?: number;
  distinctLendersCount?: number;
  daysSinceFirstOrder?: number;
  daysSinceFirstCompletedOrder?: number;
  disputeCount?: number; // legacy fallback: xem như vi phạm nếu fraudConfirmedDisputeCount không truyền
  cancelCount?: number;  // tổng số lần hủy đơn (bao gồm lỗi khách quan từ phía chủ đồ/hệ thống)
  fraudConfirmedDisputeCount?: number; // Tranh chấp đã xác định lỗi vi phạm (bùng đồ, rách hỏng nặng) -> phạt hạ Level 0
  seriousLateReturnCount?: number;     // Trả trễ hạn nghiêm trọng (> 2 ngày) -> phạt hạ Level 0
  intentionalCancellationCount?: number; // Hủy đơn cố ý hoặc spam đơn ảo -> phạt hạ Level 0
  openDisputeCount?: number;           // Khiếu nại đang mở chờ xử lý -> tạm khóa quyền giảm cọc, không xóa điểm vĩnh viễn
  hasStudentEmailProof?: boolean;
}

/**
 * 🧮 HÀM TÍNH TOÁN PURE FUNCTION (DÙNG CHO CẢ RUNTIME VÀ UNIT TEST)
 * Ràng buộc điều kiện đa yếu tố chuẩn mực:
 * 1. Phân biệt Lỗi Đã Xác Định (Fault-Confirmed) vs Hủy Đơn Khách Quan (Lender/System fault).
 * 2. Thời gian quan sát tín nhiệm 14 ngày (daysSinceFirstCompletedOrder >= 14).
 * 3. Khiếu nại đang mở (openDisputeCount > 0): Tạm khóa ưu đãi giảm cọc mà không trừ điểm oan hoặc hạ cấp vĩnh viễn.
 */
export function calculateUserTrustScoreFromData(data: TrustScoreInput): TrustScoreBreakdown {
  // 1. Account Proof Signals
  const emailVerified = Boolean(data.email && data.email.includes("@"));
  const emailPoints = emailVerified ? 10 : 0;

  const phoneVerified = Boolean(data.isVerified);
  const phonePoints = phoneVerified ? 10 : 0;

  // Tín hiệu email trường học (Student Email Signal)
  // Quy định rủi ro: Sinh viên được cấp huy hiệu & voucher thuê 10%, TUYỆT ĐỐI KHÔNG tự động giảm cọc.
  const emailLower = (data.email || "").toLowerCase();
  const isStudent = Boolean(data.hasStudentEmailProof) || emailLower.includes(".edu.vn") || emailLower.includes("student");
  const studentPoints = isStudent ? 10 : 0;

  // 2. Transaction Trust Signals
  const orders = data.completedOrdersCount ?? data.completedOrders ?? 0;
  const orderPoints = Math.min(40, orders * 5);

  const totalSpend = data.totalRentalSpend ?? (orders > 0 ? orders * 350000 : 0);
  const spendPoints = Math.min(10, Math.floor(totalSpend / 1000000) * 2);

  const reviews = data.fiveStarReviewsCount ?? data.ownerReviewsCount ?? (data.rating && data.rating >= 4.0 ? orders : 0);
  const reviewPoints = Math.min(20, reviews * 2.5);

  // 3. Penalties & Granular Fault Signals
  const fraudConfirmed = data.fraudConfirmedDisputeCount !== undefined
    ? data.fraudConfirmedDisputeCount
    : (data.disputeCount || 0); // fallback nếu test cũ chỉ truyền disputeCount
  const seriousLate = data.seriousLateReturnCount || 0;
  const intentionalCancel = data.intentionalCancellationCount !== undefined
    ? data.intentionalCancellationCount
    : (data.fraudConfirmedDisputeCount !== undefined ? 0 : (data.cancelCount || 0));
  const openDisputes = data.openDisputeCount || 0;

  // Điểm trừ: Vi phạm nặng trừ 25đ/vụ, hủy cố ý trừ 10đ/lần, khiếu nại đang mở tạm giữ 5đ
  const disputePenalty = (fraudConfirmed + seriousLate) * 25 + openDisputes * 5;
  const cancelPenalty = intentionalCancel * 10;

  // Điểm cơ bản ban đầu là 10 (tài khoản đã đăng ký hợp lệ)
  const rawScore = 10 + emailPoints + phonePoints + studentPoints + orderPoints + spendPoints + reviewPoints - disputePenalty - cancelPenalty;
  const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  // 4. KIỂM TRA ĐIỀU KIỆN ĐA YẾU TỐ (MULTI-FACTOR CONSERVATIVE ELIGIBILITY)
  const avgRating = data.averageRating ?? data.rating ?? (reviews > 0 ? 5.0 : 0);
  const distinctLenders = data.distinctLendersCount !== undefined
    ? data.distinctLendersCount
    : (orders >= 2 ? Math.min(orders, 5) : orders);
  const observationDays = data.daysSinceFirstCompletedOrder ?? data.daysSinceFirstOrder ?? 14;

  function evaluateTierEligibility(tier: TrustTier): { eligible: boolean; unmetReasons: string[] } {
    const rule = CONSERVATIVE_TIER_RULES[tier];
    const reasons: string[] = [];

    // Kiểm tra lỗi đã xác định (Fault-confirmed)
    if (fraudConfirmed > 0) {
      reasons.push(`Tài khoản có ${fraudConfirmed} vi phạm/tranh chấp đã xác định lỗi (yêu cầu 0 vi phạm)`);
    }
    if (seriousLate > 0) {
      reasons.push(`Tài khoản có ${seriousLate} lần trả đồ trễ hạn nghiêm trọng (yêu cầu 0 lần)`);
    }
    if (intentionalCancel > 0) {
      reasons.push(`Tài khoản có ${intentionalCancel} lần hủy đơn cố ý (yêu cầu 0 lần)`);
    }

    if (orders < rule.minCompletedOrders) {
      reasons.push(`Số đơn hoàn tất (${orders}) chưa đạt tối thiểu (${rule.minCompletedOrders} đơn)`);
    }
    if (totalSpend < rule.minRentalSpend) {
      reasons.push(`Tổng chi tiêu thuê (${totalSpend.toLocaleString("vi-VN")}đ) chưa đạt tối thiểu (${rule.minRentalSpend.toLocaleString("vi-VN")}đ)`);
    }
    if (reviews < rule.minOwnerReviews) {
      reasons.push(`Số đánh giá từ chủ đồ (${reviews}) chưa đạt tối thiểu (${rule.minOwnerReviews} đánh giá)`);
    }
    if (avgRating < rule.minAverageRating) {
      reasons.push(`Điểm đánh giá trung bình (${avgRating.toFixed(1)}⭐) chưa đạt tối thiểu (${rule.minAverageRating}⭐)`);
    }
    if (distinctLenders < rule.minDistinctLenders) {
      reasons.push(`Số chủ đồ khác nhau đã giao dịch (${distinctLenders}) chưa đạt tối thiểu (${rule.minDistinctLenders} chủ đồ)`);
    }
    if (rule.minDaysObservationPeriod && observationDays < rule.minDaysObservationPeriod) {
      reasons.push(`Thời gian quan sát tín nhiệm (${observationDays} ngày) chưa đủ ${rule.minDaysObservationPeriod} ngày`);
    }

    return {
      eligible: reasons.length === 0,
      unmetReasons: reasons,
    };
  }

  let finalTier: TrustTier = "LEVEL_0_NEW";
  let unmetCriteria: string[] = [];

  if (finalScore >= 85) {
    const l3Check = evaluateTierEligibility("LEVEL_3_VIP");
    if (l3Check.eligible) {
      finalTier = "LEVEL_3_VIP";
    } else {
      unmetCriteria = l3Check.unmetReasons;
      const l2Check = evaluateTierEligibility("LEVEL_2_TRUSTED");
      if (l2Check.eligible) {
        finalTier = "LEVEL_2_TRUSTED";
      } else {
        const l1Check = evaluateTierEligibility("LEVEL_1_VERIFIED");
        if (l1Check.eligible) {
          finalTier = "LEVEL_1_VERIFIED";
        } else {
          finalTier = "LEVEL_0_NEW";
        }
      }
    }
  } else if (finalScore >= 60) {
    const l2Check = evaluateTierEligibility("LEVEL_2_TRUSTED");
    if (l2Check.eligible) {
      finalTier = "LEVEL_2_TRUSTED";
    } else {
      unmetCriteria = l2Check.unmetReasons;
      const l1Check = evaluateTierEligibility("LEVEL_1_VERIFIED");
      if (l1Check.eligible) {
        finalTier = "LEVEL_1_VERIFIED";
      } else {
        finalTier = "LEVEL_0_NEW";
      }
    }
  } else if (finalScore >= 30) {
    const l1Check = evaluateTierEligibility("LEVEL_1_VERIFIED");
    if (l1Check.eligible) {
      finalTier = "LEVEL_1_VERIFIED";
    } else {
      unmetCriteria = l1Check.unmetReasons;
      finalTier = "LEVEL_0_NEW";
    }
  } else {
    finalTier = "LEVEL_0_NEW";
  }

  // Nếu tài khoản có tranh chấp đang mở, tạm đóng băng ưu đãi giảm cọc
  const isDiscountFrozen = openDisputes > 0;
  if (isDiscountFrozen) {
    unmetCriteria.push(`Tài khoản hiện có ${openDisputes} khiếu nại tranh chấp đang chờ giải quyết: Tạm khóa ưu đãi bảo lãnh giảm cọc.`);
  }

  return {
    score: finalScore,
    tier: finalTier,
    config: TRUST_TIERS[finalTier],
    criteria: CONSERVATIVE_TIER_RULES[finalTier],
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
      totalRentalSpend: totalSpend,
      averageRating: avgRating,
      distinctLenders,
      daysSinceFirstOrder: observationDays,
      daysSinceFirstCompletedOrder: observationDays,
      disputeCount: data.disputeCount || (fraudConfirmed + openDisputes),
      disputePenalty,
      cancelCount: data.cancelCount || intentionalCancel,
      cancelPenalty,
      fraudConfirmedDisputeCount: fraudConfirmed,
      seriousLateReturnCount: seriousLate,
      intentionalCancellationCount: intentionalCancel,
      openDisputeCount: openDisputes,
    },
    eligibility: {
      isEligible: finalTier !== "LEVEL_0_NEW" && !isDiscountFrozen,
      isDiscountFrozen,
      unmetCriteria,
      studentVoucherEligible: isStudent,
    },
  };
}
