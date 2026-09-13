import { cache } from "react";
import { prisma } from "@/src/lib/prisma";
export * from "./trust-types";
import {
  TrustTier,
  TierCriteria,
  CONSERVATIVE_TIER_RULES,
  TrustTierConfig,
  TRUST_TIERS,
  getItemValuation,
  TrustScoreBreakdown,
  TrustScoreInput,
  calculateUserTrustScoreFromData,
} from "./trust-types";

/**
 * 🧮 TÍNH TOÁN TRUST SCORE CỦA USER DỰA TRÊN DỮ LIỆU THỰC TẾ (DATABASE RUNTIME)
 * ⚡ TỐI ƯU HÓA: Dùng React cache() để gom và chia sẻ kết quả giữa các components trong cùng 1 request
 */
export const calculateUserTrustScore = cache(async (userId: string): Promise<TrustScoreBreakdown> => {
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
});


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

/**
 * 🏦 LẤY SỐ LIỆU QUỸ DỰ PHÒNG THỰC TẾ TỪ CƠ SỞ DỮ LIỆU
 * Nếu nền tảng chưa được cấp vốn dự phòng thực tế trong cấu hình/DB,
 * số dư khả dụng mặc định là 0đ -> kích hoạt cơ chế phòng vệ Cold-start thu 100% cọc.
 */
export async function getLiveReserveFundStatus(): Promise<ReserveFundStatus> {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const paidClaimsAgg = await prisma.ledgerTransaction.aggregate({
      where: {
        type: "COMPENSATION_OUT",
        status: "COMPLETED",
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });
    const paidClaims = paidClaimsAgg._sum.amount || 0;

    const pendingDisputesAgg = await prisma.dispute.aggregate({
      where: {
        status: "PENDING_REVIEW",
      },
      _sum: { suggestedDeduction: true },
    });
    const pendingClaims = pendingDisputesAgg._sum.suggestedDeduction || 0;

    const activeRentals = await prisma.rentalHistory.findMany({
      where: {
        status: { in: ["PENDING_APPROVAL", "OWNER_PACKED", "LENDER_SHIPPED", "BORROWER_RECEIVED", "BORROWER_RETURNED", "DISPUTE"] },
        isDeleted: false,
      },
      include: {
        invoice: { select: { depositAmount: true } },
        product: {
          include: {
            listings: { where: { status: "AVAILABLE" } },
          },
        },
      },
    });

    let committedActiveGuarantees = 0;
    for (const r of activeRentals) {
      const baseDeposit = r.product?.listings?.[0]?.deposit || 0;
      const actualDeposit = r.invoice?.depositAmount || 0;
      if (baseDeposit > actualDeposit) {
        committedActiveGuarantees += (baseDeposit - actualDeposit);
      }
    }

    // Lấy số dư vốn cấp từ biến môi trường nếu có
    const configuredOpeningBalance = Number(process.env.RESERVE_FUND_OPENING_BALANCE) || 0;
    const configuredCurrentBalance = Number(process.env.RESERVE_FUND_CURRENT_BALANCE) || configuredOpeningBalance;

    return {
      openingReserveFundBalance: configuredOpeningBalance,
      currentReserveFundBalance: configuredCurrentBalance,
      paidClaims,
      pendingClaims,
      committedActiveGuarantees,
      lockedFunds: 0,
    };
  } catch (err) {
    console.warn("[TrustEngine] Lỗi lấy số dư Quỹ dự phòng thực tế từ DB, fallback an toàn về 0đ:", err);
    return {
      openingReserveFundBalance: 0,
      currentReserveFundBalance: 0,
      paidClaims: 0,
      pendingClaims: 0,
      committedActiveGuarantees: 0,
      lockedFunds: 0,
    };
  }
}

/**
 * 🛡️ LẤY HẠN MỨC BẢO LÃNH VÀ ĐƠN ACTIVE THỰC TẾ CỦA USER TỪ DB
 */
export async function getUserActiveGuaranteeStatus(userId: string): Promise<UserGuaranteeStatus> {
  try {
    const activeRentals = await prisma.rentalHistory.findMany({
      where: {
        renterId: userId,
        status: { in: ["PENDING_APPROVAL", "OWNER_PACKED", "LENDER_SHIPPED", "BORROWER_RECEIVED", "BORROWER_RETURNED", "DISPUTE"] },
        isDeleted: false,
      },
      include: {
        invoice: { select: { depositAmount: true } },
        product: {
          include: {
            listings: { where: { status: "AVAILABLE" } },
          },
        },
        disputes: {
          where: { status: { in: ["PENDING_REVIEW", "DISPUTED"] } },
          select: { id: true },
        },
      },
    });

    let currentActiveGuarantees = 0;
    let activeDiscountedOrdersCount = 0;
    let hasOpenDispute = false;

    for (const r of activeRentals) {
      if (r.disputes && r.disputes.length > 0) {
        hasOpenDispute = true;
      }
      const baseDeposit = r.product?.listings?.[0]?.deposit || 0;
      const actualDeposit = r.invoice?.depositAmount || 0;
      if (baseDeposit > actualDeposit) {
        currentActiveGuarantees += (baseDeposit - actualDeposit);
        activeDiscountedOrdersCount++;
      }
    }

    if (!hasOpenDispute) {
      const openDisputeCount = await prisma.dispute.count({
        where: {
          rental: { renterId: userId },
          status: { in: ["PENDING_REVIEW", "DISPUTED"] },
        },
      });
      if (openDisputeCount > 0) {
        hasOpenDispute = true;
      }
    }

    return {
      currentActiveGuarantees,
      activeDiscountedOrdersCount,
      hasOpenDispute,
    };
  } catch (err) {
    console.warn("[TrustEngine] Lỗi lấy hạn mức bảo lãnh của user, fallback an toàn:", err);
    return {
      currentActiveGuarantees: 0,
      activeDiscountedOrdersCount: 0,
      hasOpenDispute: false,
    };
  }
}
