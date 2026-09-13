import { prisma } from "@/src/lib/prisma";

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

/**
 * 🧮 TÍNH TOÁN TRUST SCORE CỦA USER DỰA TRÊN DỮ LIỆU THỰC TẾ (DATABASE RUNTIME)
 */
export async function calculateUserTrustScore(userId: string): Promise<TrustScoreBreakdown> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      isVerified: true,
      rentalHistory: {
        where: { isDeleted: false },
        select: {
          id: true,
          status: true,
          ownerId: true,
          createdAt: true,
          invoice: {
            select: { rentalFee: true, amount: true },
          },
          disputes: { select: { id: true, status: true } },
        },
      },
      reviewsReceived: {
        select: { id: true, rating: true },
      },
    },
  });

  if (!user) {
    const config = TRUST_TIERS.LEVEL_0_NEW;
    const criteria = CONSERVATIVE_TIER_RULES.LEVEL_0_NEW;
    return {
      score: 10,
      tier: "LEVEL_0_NEW",
      config,
      criteria,
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
        totalRentalSpend: 0,
        averageRating: 0,
        distinctLenders: 0,
        daysSinceFirstOrder: 0,
        daysSinceFirstCompletedOrder: 0,
        disputeCount: 0,
        disputePenalty: 0,
        cancelCount: 0,
        cancelPenalty: 0,
        fraudConfirmedDisputeCount: 0,
        seriousLateReturnCount: 0,
        intentionalCancellationCount: 0,
        openDisputeCount: 0,
      },
      eligibility: {
        isEligible: false,
        isDiscountFrozen: false,
        unmetCriteria: ["Tài khoản không tồn tại"],
        studentVoucherEligible: false,
      },
    };
  }

  // 1. Transaction Trust Signals
  const completedRentals = user.rentalHistory.filter(
    (r) => r.status === "LENDER_COMPLETED" || r.status === "BORROWER_RETURNED"
  );
  const completedOrdersCount = completedRentals.length;
  const totalRentalSpend = completedRentals.reduce((sum, r) => sum + (r.invoice?.rentalFee || 0), 0);

  // Distinct Lenders count (chống thông đồng cày đơn)
  const distinctLendersCount = new Set(
    completedRentals.map((r) => r.ownerId).filter((id): id is string => Boolean(id))
  ).size;

  // Days since first completed rental (Thời gian quan sát tín nhiệm)
  let daysSinceFirstCompletedOrder = 0;
  if (completedRentals.length > 0) {
    const sortedRentals = [...completedRentals].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const firstDate = sortedRentals[0].createdAt;
    daysSinceFirstCompletedOrder = Math.max(0, Math.floor((Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
  }

  // Reviews Received
  const ownerReviews = user.reviewsReceived || [];
  const ownerReviewsCount = ownerReviews.length;
  const averageRating = ownerReviewsCount > 0
    ? ownerReviews.reduce((acc, rev) => acc + rev.rating, 0) / ownerReviewsCount
    : 0;
  const fiveStarReviewsCount = ownerReviews.filter((rev) => rev.rating >= 4.0).length;

  // 3. Penalties (Phân tách lỗi đã xác nhận vs khiếu nại đang mở)
  const openDisputeCount = user.rentalHistory.reduce(
    (acc, r) => acc + (r.disputes?.filter((d) => d.status === "PENDING_REVIEW" || d.status === "DISPUTED").length || 0),
    0
  );
  const fraudConfirmedDisputeCount = user.rentalHistory.reduce(
    (acc, r) => acc + (r.disputes?.filter((d) => d.status === "APPROVED_DEDUCTION").length || 0),
    0
  );
  const disputeCount = user.rentalHistory.reduce((acc, r) => acc + (r.disputes?.length || 0), 0);
  const cancelCount = user.rentalHistory.filter((r) => r.status === "CANCELLED").length;

  return calculateUserTrustScoreFromData({
    email: user.email,
    isVerified: user.isVerified,
    completedOrdersCount,
    totalRentalSpend,
    distinctLendersCount,
    daysSinceFirstCompletedOrder,
    daysSinceFirstOrder: daysSinceFirstCompletedOrder,
    ownerReviewsCount,
    averageRating,
    fiveStarReviewsCount,
    disputeCount,
    cancelCount,
    fraudConfirmedDisputeCount,
    seriousLateReturnCount: 0,
    intentionalCancellationCount: 0,
    openDisputeCount,
    hasStudentEmailProof: false,
  });
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
      reasons.push(`Điểm đánh giá trung bình (${avgRating.toFixed(1)} sao) chưa đạt chuẩn (${rule.minAverageRating.toFixed(1)} sao)`);
    }
    if (distinctLenders < rule.minDistinctLenders) {
      reasons.push(`Số chủ đồ khác nhau đã giao dịch (${distinctLenders}) chưa đạt yêu cầu (${rule.minDistinctLenders} chủ đồ)`);
    }
    const minObsPeriod = rule.minDaysObservationPeriod ?? rule.minDaysSinceFirstOrder;
    if (minObsPeriod && observationDays < minObsPeriod) {
      reasons.push(`Thời gian quan sát tín nhiệm từ đơn hoàn tất đầu tiên (${observationDays} ngày) chưa đủ ${minObsPeriod} ngày`);
    }

    return {
      eligible: reasons.length === 0,
      unmetReasons: reasons,
    };
  }

  // Đánh giá thăng hạng từ cao xuống thấp
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

export interface ReserveFundStatus {
  openingReserveFundBalance: number; // Số dư đầu tháng của Quỹ bảo chứng (VNĐ)
  currentReserveFundBalance: number; // Số dư sổ sách/khả dụng hiện tại (VNĐ)
  committedClaims?: number; // legacy field: tổng đã chi + cam kết
  paidClaims?: number; // Các khoản bồi thường đã chi trả trong tháng (VNĐ)
  pendingClaims?: number; // Các yêu cầu bồi thường đang chờ thẩm định/xử lý (VNĐ)
  committedActiveGuarantees?: number; // Tổng số tiền bảo lãnh đang lưu hành trên các đơn thuê chưa hoàn tất (VNĐ)
  lockedFunds?: number; // Tiền quỹ đang bị phong tỏa/giữ chỗ (VNĐ)
}

export const DEFAULT_RESERVE_FUND_STATUS: ReserveFundStatus = {
  openingReserveFundBalance: 50000000,
  currentReserveFundBalance: 50000000,
  committedClaims: 0,
};

/**
 * 🧮 TÍNH QUỸ DỰ PHÒNG KHẢ DỤNG (AVAILABLE RESERVE)
 * availableReserve = currentReserveFundBalance - (paidClaims + pendingClaims + committedActiveGuarantees + lockedFunds)
 */
export function calculateAvailableReserve(status: ReserveFundStatus): number {
  const paid = status.paidClaims ?? status.committedClaims ?? 0;
  const pending = status.pendingClaims ?? 0;
  const committedGuarantees = status.committedActiveGuarantees ?? 0;
  const locked = status.lockedFunds ?? 0;
  return Math.max(0, status.currentReserveFundBalance - (paid + pending + committedGuarantees + locked));
}

export interface UserGuaranteeStatus {
  currentActiveGuarantees?: number; // Tổng số tiền sàn đang bảo lãnh mở cho tài khoản này (VNĐ)
  activeDiscountedOrdersCount?: number; // Số đơn đang được hưởng giảm cọc đồng thời
  hasOpenDispute?: boolean; // Tài khoản đang có tranh chấp chờ xử lý
}

export interface DynamicDepositResult {
  finalDeposit: number;
  originalDeposit: number;
  discountAmount: number;
  discountPercent: number;
  explanation: string;
  nextTierGoal: string;
  circuitBreakerTriggered?: boolean;
  effectiveCoverageCap?: number;
  platformLiabilityLimit: number; // Trách nhiệm bồi thường tối đa minh bạch = min(baseDeposit, finalDeposit + approvedGuarantee)
  availableReserve: number; // Quỹ bảo chứng khả dụng thực tế
}

/**
 * TÍNH TIỀN CỌC ĐỘNG BẢO TOÀN NGUỒN VỐN (FUND-CAPACITY CONSTRAINED GUARANTEE)
 * 1. Circuit Breaker: Trần bảo lãnh/bồi thường tối đa trong tháng là 30% số dư đầu kỳ hoặc availableReserve <= 0.
 * 2. Ngưỡng số dư quỹ: Tính theo Quỹ Dự Phòng Khả Dụng (availableReserve):
 *    < 5M cọc 100% toàn sàn; >= 5M mở Level 1; >= 15M mở Level 2; >= 30M mở Level 3.
 * 3. Hạn mức rủi ro theo từng tài khoản (Per-Account Exposure Limit):
 *    - Level 1: Tối đa 500k bảo lãnh mở, tối đa 2 đơn giảm cọc đồng thời.
 *    - Level 2: Tối đa 1.5M bảo lãnh mở, tối đa 4 đơn giảm cọc đồng thời.
 *    - Level 3: Tối đa 3M bảo lãnh mở, tối đa 6 đơn giảm cọc đồng thời.
 * 4. Tạm khóa ưu đãi giảm cọc khi tài khoản đang có khiếu nại tranh chấp chờ xử lý (openDisputeFreeze).
 * 5. Giới hạn trách nhiệm bồi thường minh bạch: platformLiabilityLimit = min(baseDeposit, finalDeposit + approvedGuarantee).
 * 6. Tuyệt đối không có cọc 0đ trong thanh toán nội địa VietQR.
 */
export function calculateDynamicDeposit({
  baseDeposit,
  itemValue,
  trustTier,
  isRental = true,
  fastTrackActive = false,
  fundStatus = DEFAULT_RESERVE_FUND_STATUS,
  userGuaranteeStatus,
}: {
  baseDeposit: number;
  itemValue: number;
  trustTier: TrustTier;
  isRental?: boolean;
  fastTrackActive?: boolean;
  fundStatus?: ReserveFundStatus;
  userGuaranteeStatus?: UserGuaranteeStatus;
}): DynamicDepositResult {
  const availableReserve = calculateAvailableReserve(fundStatus);

  if (!isRental) {
    return {
      finalDeposit: 0,
      originalDeposit: 0,
      discountAmount: 0,
      discountPercent: 0,
      explanation: "Đơn mua đứt tuần hoàn không áp dụng tiền cọc.",
      nextTierGoal: "",
      platformLiabilityLimit: 0,
      availableReserve,
    };
  }

  // Fast-Track Trust Mode: Bắt buộc thu 100% tiền cọc qua PayOS (không chiết khấu cọc)
  if (fastTrackActive) {
    return {
      finalDeposit: baseDeposit,
      originalDeposit: baseDeposit,
      discountAmount: 0,
      discountPercent: 0,
      explanation: "Chế độ Fast-Track: Thu đủ 100% tiền cọc bảo chứng qua Cổng thanh toán PayOS để mở khóa thuê trang phục giá trị cao ngay lập tức.",
      nextTierGoal: "Trả đồ đúng hạn đơn này để tích lũy điểm tín nhiệm và hưởng ưu đãi giảm cọc ở lần thuê kế tiếp!",
      platformLiabilityLimit: baseDeposit,
      availableReserve,
    };
  }

  // 1. CIRCUIT BREAKER CHECK (NGẮT MẠCH TỰ ĐỘNG BẢO VỆ NGUỒN VỐN SÀN)
  // Tổng các khoản bồi thường đã chi + đang khiếu nại + bảo lãnh đang cam kết
  const totalMonthCommitments =
    (fundStatus.paidClaims ?? fundStatus.committedClaims ?? 0) +
    (fundStatus.pendingClaims ?? 0) +
    (fundStatus.committedActiveGuarantees ?? 0);
  const monthlyClaimCeiling = Math.round(fundStatus.openingReserveFundBalance * 0.30);
  const remainingMonthQuota = Math.max(0, monthlyClaimCeiling - totalMonthCommitments);

  if (totalMonthCommitments >= monthlyClaimCeiling || availableReserve <= 0) {
    return {
      finalDeposit: baseDeposit,
      originalDeposit: baseDeposit,
      discountAmount: 0,
      discountPercent: 0,
      circuitBreakerTriggered: true,
      explanation: "Cơ chế Circuit Breaker tự động kích hoạt bảo toàn Quỹ Rủi Ro (đã chạm trần bồi thường 30% tháng hoặc quỹ khả dụng cạn): Tạm thời áp dụng cọc 100% cho mọi giao dịch mới.",
      nextTierGoal: "Hạn mức bảo lãnh ưu đãi sẽ tự động mở lại vào chu kỳ đầu tháng tiếp theo khi quỹ được trích lập mới.",
      platformLiabilityLimit: baseDeposit,
      availableReserve,
    };
  }

  // 2. KHÓA TẠM THỜI NẾU TÀI KHOẢN ĐANG CÓ TRANH CHẤP CHỜ XỬ LÝ (OPEN DISPUTE FREEZE)
  if (userGuaranteeStatus?.hasOpenDispute) {
    return {
      finalDeposit: baseDeposit,
      originalDeposit: baseDeposit,
      discountAmount: 0,
      discountPercent: 0,
      explanation: "Tài khoản hiện có khiếu nại tranh chấp đang chờ xử lý: Quyền lợi giảm cọc tạm thời bị đóng băng trong thời gian thụ lý.",
      nextTierGoal: "Sau khi khiếu nại được giải quyết minh bạch, quyền lợi giảm cọc sẽ tự động khôi phục theo thứ hạng hiện tại.",
      platformLiabilityLimit: baseDeposit,
      availableReserve,
    };
  }

  // 3. FUND THRESHOLD CHECK (ĐIỀU KIỆN SỐ DƯ QUỸ KHẢ DỤNG: AVAILABLE RESERVE)
  let effectiveTier: TrustTier = trustTier;

  if (availableReserve < CONSERVATIVE_TIER_RULES.LEVEL_1_VERIFIED.fundThresholdRequired) {
    // Quỹ khả dụng dưới 5 triệu: Cọc 100% toàn sàn bảo toàn vốn
    effectiveTier = "LEVEL_0_NEW";
  } else if (effectiveTier === "LEVEL_3_VIP" && availableReserve < CONSERVATIVE_TIER_RULES.LEVEL_3_VIP.fundThresholdRequired) {
    effectiveTier = availableReserve >= CONSERVATIVE_TIER_RULES.LEVEL_2_TRUSTED.fundThresholdRequired ? "LEVEL_2_TRUSTED" : "LEVEL_1_VERIFIED";
  } else if (effectiveTier === "LEVEL_2_TRUSTED" && availableReserve < CONSERVATIVE_TIER_RULES.LEVEL_2_TRUSTED.fundThresholdRequired) {
    effectiveTier = "LEVEL_1_VERIFIED";
  }

  const tierRule = CONSERVATIVE_TIER_RULES[effectiveTier];

  // 4. PER-ACCOUNT EXPOSURE LIMIT CHECK (HẠN MỨC RỦI RO THEO TỪNG TÀI KHOẢN)
  const userActiveGuarantee = userGuaranteeStatus?.currentActiveGuarantees ?? 0;
  const userActiveOrders = userGuaranteeStatus?.activeDiscountedOrdersCount ?? 0;
  const remainingUserQuota = Math.max(0, tierRule.maxActiveGuaranteePerUser - userActiveGuarantee);

  if (
    effectiveTier !== "LEVEL_0_NEW" &&
    (userActiveOrders >= tierRule.maxConcurrentDiscountedOrders || remainingUserQuota <= 0)
  ) {
    return {
      finalDeposit: baseDeposit,
      originalDeposit: baseDeposit,
      discountAmount: 0,
      discountPercent: 0,
      explanation: `Tài khoản đã chạm trần hạn mức rủi ro của ${tierRule.label} (tối đa ${tierRule.maxActiveGuaranteePerUser.toLocaleString("vi-VN")}đ bảo lãnh hoặc ${tierRule.maxConcurrentDiscountedOrders} đơn đồng thời): Đơn tiếp theo áp dụng mức cọc tiêu chuẩn 100%.`,
      nextTierGoal: "Hoàn tất và trả đồ các đơn đang thuê để giải phóng hạn mức bảo lãnh tài khoản của bạn!",
      platformLiabilityLimit: baseDeposit,
      availableReserve,
    };
  }

  const requestedGuarantee = Math.round(baseDeposit * tierRule.depositDiscountRate);

  // Bảo lãnh phê duyệt bị chặn bởi 4 phòng tuyến:
  // 1. Tỷ lệ giảm theo hạng (depositDiscountRate)
  // 2. Hạn mức bảo lãnh tối đa trên 1 đơn (maxCoveragePerOrder)
  // 3. Hạn ngạch còn lại của tháng theo Circuit Breaker (remainingMonthQuota)
  // 4. Hạn mức nợ bảo lãnh khả dụng còn lại của tài khoản (remainingUserQuota)
  const approvedGuarantee = Math.min(
    requestedGuarantee,
    tierRule.maxCoveragePerOrder,
    remainingMonthQuota,
    remainingUserQuota
  );

  const finalDeposit = Math.max(0, baseDeposit - approvedGuarantee);
  const discountAmount = approvedGuarantee;
  const discountPercent = baseDeposit > 0 ? Math.round((discountAmount / baseDeposit) * 100) : 0;

  // GIỚI HẠN TRÁCH NHIỆM BỒI THƯỜNG MINH BẠCH (LIMIT OF LIABILITY)
  // Trách nhiệm tối đa của sàn = Tiền cọc thực tế đã thu + Khoản bảo lãnh được duyệt của đơn
  const platformLiabilityLimit = Math.min(baseDeposit, finalDeposit + approvedGuarantee);

  let explanation = "";
  let nextTierGoal = "";

  if (effectiveTier === "LEVEL_0_NEW") {
    if (trustTier !== "LEVEL_0_NEW" && availableReserve < CONSERVATIVE_TIER_RULES.LEVEL_1_VERIFIED.fundThresholdRequired) {
      explanation = "Quỹ Dự phòng Khả dụng đang trong giai đoạn tích lũy vốn ban đầu (< 5.000.000đ): Áp dụng cọc tiêu chuẩn 100% để bảo đảm an toàn thanh khoản sàn.";
    } else {
      explanation = "Mức cọc tiêu chuẩn 100% cho thành viên mới để đảm bảo an toàn giao dịch 2 chiều.";
    }
    nextTierGoal = "Hoàn tất tối thiểu 3 đơn thuê với tổng chi tiêu từ 1.000.000đ và đánh giá tốt để mở khóa Level 1 Verified!";
  } else if (effectiveTier === "LEVEL_1_VERIFIED") {
    explanation = `Đặc quyền Tín nhiệm Cơ bản: Sàn bảo lãnh giảm 10% tiền cọc (tiết kiệm ${discountAmount.toLocaleString("vi-VN")}đ, trần 200.000đ/đơn).`;
    nextTierGoal = "Tích lũy đủ 8 đơn với tổng chi tiêu 3.000.000đ từ 3 chủ đồ khác nhau để lên Hạng Khách Quen (giảm 20% cọc)!";
  } else if (effectiveTier === "LEVEL_2_TRUSTED") {
    explanation = `Đặc quyền Khách Quen Uy Tín: Sàn bảo lãnh giảm 20% tiền cọc (tiết kiệm ${discountAmount.toLocaleString("vi-VN")}đ, trần 500.000đ/đơn).`;
    nextTierGoal = "Tích lũy đủ 12 đơn với tổng chi tiêu 8.000.000đ và đánh giá 4.5 sao để gia nhập CLOOP VIP Club (giảm 30% cọc)!";
  } else {
    explanation = `Đặc quyền CLOOP VIP Club: Sàn bảo lãnh giảm 30% tiền cọc (tiết kiệm ${discountAmount.toLocaleString("vi-VN")}đ, trần 1.000.000đ/đơn, giữ lại 70% cọc đối ứng).`;
    nextTierGoal = "Bạn đang ở cấp bậc tín nhiệm cao nhất của cộng đồng CLOOP.";
  }

  return {
    finalDeposit,
    originalDeposit: baseDeposit,
    discountAmount,
    discountPercent,
    explanation,
    nextTierGoal,
    circuitBreakerTriggered: false,
    effectiveCoverageCap: tierRule.maxCoveragePerOrder,
    platformLiabilityLimit,
    availableReserve,
  };
}
