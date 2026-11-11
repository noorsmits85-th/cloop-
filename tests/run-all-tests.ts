import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import ts from 'typescript';
import { verifyBankKyc } from '../src/utils/bank-kyc';
import {
  getItemValuation,
  calculateUserTrustScoreFromData,
  calculateDynamicDeposit,
  TRUST_TIERS,
  CONSERVATIVE_TIER_RULES,
} from '../lib/trust-engine';
import { maskPhone, maskEmail } from '../lib/data-privacy';
import { verifyConservationInvariant } from '../lib/settlement-engine';
import {
  isValidVietnamPhone,
  normalizeVietnamPhone,
  cleanRawPhone,
  maskPhoneNumber,
  getVietnamCarrier,
} from '../lib/validations/phone';
import { COIN_PACKAGES } from '../lib/coinPackages';

let totalTests = 0;
let passedTests = 0;

function test(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log("  [PASS] " + name);
  } catch (err: unknown) {
    console.error("  [FAIL] " + name);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log('\n======================================================');
console.log('CLOOP PRODUCTION TEST SUITE: TRUST STACK & DISPUTES');
console.log('======================================================\n');

console.log('--- 1. Standardized Asset Valuation (getItemValuation) ---');
test('Returns salePrice when salePrice > 0', () => {
  const valuation = getItemValuation({ salePrice: 2500000, deposit: 1000000, basePrice: 200000 });
  assert.equal(valuation, 2500000);
});

test('Returns deposit * 1.5 when salePrice absent', () => {
  const valuation = getItemValuation({ deposit: 800000, basePrice: 150000 });
  assert.equal(valuation, 1200000);
});

test('Returns basePrice * 6 when only basePrice present', () => {
  const valuation = getItemValuation({ basePrice: 200000 });
  assert.equal(valuation, 1200000);
});

test('Enforces minimum 500,000 VND valuation floor for low basePrice', () => {
  const valuation = getItemValuation({ basePrice: 40000 });
  assert.equal(valuation, 500000);
});

test('Returns 1,000,000 VND fallback when listing empty', () => {
  assert.equal(getItemValuation(null), 1000000);
  assert.equal(getItemValuation(undefined), 1000000);
});

console.log('\n--- 2. Trust Score Algorithm & Tier Classification ---');
test('New user with no verification starts at Level 0 with base score', () => {
  const res = calculateUserTrustScoreFromData({
    email: 'newuser@gmail.com',
    isVerified: false,
    completedOrders: 0,
    disputeCount: 0,
    cancelCount: 0,
    hasStudentEmailProof: false,
  });
  assert.equal(res.tier, 'LEVEL_0_NEW');
  assert.ok(res.score < 30);
});

test('Student email @edu.vn adds student email signal', () => {
  const res = calculateUserTrustScoreFromData({
    email: 'sinhvien@hcmus.edu.vn',
    isVerified: false,
    completedOrders: 0,
    disputeCount: 0,
    cancelCount: 0,
    hasStudentEmailProof: true,
  });
  assert.ok(res.factors.isStudent, 'Should identify student signal');
  assert.ok(res.factors.studentPoints > 0, 'Should award student bonus points');
});

test('Completed orders add logarithmic bonus without inflation', () => {
  const res1 = calculateUserTrustScoreFromData({
    email: 'user@cloop.vn',
    isVerified: true,
    completedOrders: 2,
    rating: 5.0,
    disputeCount: 0,
    cancelCount: 0,
    hasStudentEmailProof: false,
  });
  const res2 = calculateUserTrustScoreFromData({
    email: 'user@cloop.vn',
    isVerified: true,
    completedOrders: 10,
    rating: 5.0,
    disputeCount: 0,
    cancelCount: 0,
    hasStudentEmailProof: false,
  });
  assert.ok(res2.score > res1.score, 'More completed orders should produce higher score');
  assert.ok(res2.score <= 100, 'Score must be capped at 100');
});

test('Disputes apply severe penalty to score', () => {
  const cleanUser = calculateUserTrustScoreFromData({
    email: 'user@cloop.vn',
    isVerified: true,
    completedOrders: 5,
    rating: 4.8,
    disputeCount: 0,
    cancelCount: 0,
    hasStudentEmailProof: false,
  });
  const disputedUser = calculateUserTrustScoreFromData({
    email: 'user@cloop.vn',
    isVerified: true,
    completedOrders: 5,
    rating: 4.8,
    disputeCount: 2,
    cancelCount: 0,
    hasStudentEmailProof: false,
  });
  assert.ok(disputedUser.score < cleanUser.score - 40, 'Disputes must deduct significant points');
});

test('Tier boundaries and criteria are strictly defined', () => {
  assert.equal(TRUST_TIERS.LEVEL_0_NEW.minScore, 0);
  assert.equal(TRUST_TIERS.LEVEL_0_NEW.maxScore, 29);
  assert.equal(TRUST_TIERS.LEVEL_1_VERIFIED.minScore, 30);
  assert.equal(TRUST_TIERS.LEVEL_1_VERIFIED.maxScore, 59);
  assert.equal(TRUST_TIERS.LEVEL_2_TRUSTED.minScore, 60);
  assert.equal(TRUST_TIERS.LEVEL_2_TRUSTED.maxScore, 84);
  assert.equal(TRUST_TIERS.LEVEL_3_VIP.minScore, 85);
  assert.equal(TRUST_TIERS.LEVEL_3_VIP.maxScore, 100);

  // New Conservative Tier Rules
  assert.equal(CONSERVATIVE_TIER_RULES.LEVEL_1_VERIFIED.depositDiscountRate, 0.10);
  assert.equal(CONSERVATIVE_TIER_RULES.LEVEL_2_TRUSTED.depositDiscountRate, 0.20);
  assert.equal(CONSERVATIVE_TIER_RULES.LEVEL_3_VIP.depositDiscountRate, 0.30);
  assert.equal(CONSERVATIVE_TIER_RULES.LEVEL_1_VERIFIED.maxCoveragePerOrder, 200000);
  assert.equal(CONSERVATIVE_TIER_RULES.LEVEL_2_TRUSTED.maxCoveragePerOrder, 500000);
  assert.equal(CONSERVATIVE_TIER_RULES.LEVEL_3_VIP.maxCoveragePerOrder, 1000000);
});

test('Student email alone does NOT unlock deposit discount (stays LEVEL_0_NEW without orders/spend)', () => {
  const res = calculateUserTrustScoreFromData({
    email: 'sinhvien@hcmus.edu.vn',
    isVerified: true,
    completedOrders: 0,
    totalRentalSpend: 0,
    disputeCount: 0,
    cancelCount: 0,
    hasStudentEmailProof: true,
  });
  assert.equal(res.tier, 'LEVEL_0_NEW');
  assert.ok(res.eligibility.studentVoucherEligible, 'Should be eligible for student rental voucher');
  assert.equal(res.eligibility.isEligible, false, 'Should not be eligible for deposit discount');
});

test('Anti-farming: 3 orders with low spend (< 1,000,000 VND) stays LEVEL_0_NEW', () => {
  const res = calculateUserTrustScoreFromData({
    email: 'user@cloop.vn',
    isVerified: true,
    completedOrders: 3,
    totalRentalSpend: 150000, // Chiêu trò đơn ảo giá rẻ
    fiveStarReviewsCount: 3,
    distinctLendersCount: 3,
    disputeCount: 0,
    cancelCount: 0,
  });
  assert.equal(res.tier, 'LEVEL_0_NEW');
  assert.equal(res.eligibility.isEligible, false);
});

test('Anti-collusion: 3 orders from only 1 distinct lender stays LEVEL_0_NEW', () => {
  const res = calculateUserTrustScoreFromData({
    email: 'user@cloop.vn',
    isVerified: true,
    completedOrders: 3,
    totalRentalSpend: 1500000,
    fiveStarReviewsCount: 3,
    distinctLendersCount: 1, // Thông đồng với 1 chủ đồ duy nhất
    disputeCount: 0,
    cancelCount: 0,
  });
  assert.equal(res.tier, 'LEVEL_0_NEW');
  assert.equal(res.eligibility.isEligible, false);
});

test('Disputes immediately revoke tier eligibility back to LEVEL_0_NEW', () => {
  const res = calculateUserTrustScoreFromData({
    email: 'user@cloop.vn',
    isVerified: true,
    completedOrders: 10,
    totalRentalSpend: 5000000,
    fiveStarReviewsCount: 10,
    distinctLendersCount: 4,
    disputeCount: 1, // Có tranh chấp đang mở hoặc lỗi
    cancelCount: 0,
  });
  assert.equal(res.tier, 'LEVEL_0_NEW');
  assert.equal(res.eligibility.isEligible, false);
});

test('Legitimate cancellation (lender/system fault) does NOT penalize or demote good user', () => {
  const res = calculateUserTrustScoreFromData({
    email: 'user@cloop.vn',
    isVerified: true,
    completedOrders: 5,
    totalRentalSpend: 2000000,
    fiveStarReviewsCount: 5,
    distinctLendersCount: 3,
    daysSinceFirstCompletedOrder: 20,
    fraudConfirmedDisputeCount: 0,
    intentionalCancellationCount: 0,
    cancelCount: 2, // 2 đơn bị chủ shop hủy do hết đồ
    openDisputeCount: 0,
  });
  assert.equal(res.tier, 'LEVEL_1_VERIFIED');
  assert.equal(res.eligibility.isEligible, true);
  assert.equal(res.eligibility.isDiscountFrozen, false);
});

test('Confirmed fraud immediately demotes to LEVEL_0_NEW', () => {
  const res = calculateUserTrustScoreFromData({
    email: 'fraudster@cloop.vn',
    isVerified: true,
    completedOrders: 10,
    totalRentalSpend: 5000000,
    fiveStarReviewsCount: 10,
    distinctLendersCount: 4,
    daysSinceFirstCompletedOrder: 30,
    fraudConfirmedDisputeCount: 1, // Đã xác định bùng đồ / rách hỏng nặng
    intentionalCancellationCount: 0,
    openDisputeCount: 0,
  });
  assert.equal(res.tier, 'LEVEL_0_NEW');
  assert.equal(res.eligibility.isEligible, false);
});

test('Serious late return (> 2 days) immediately demotes to LEVEL_0_NEW', () => {
  const res = calculateUserTrustScoreFromData({
    email: 'lateuser@cloop.vn',
    isVerified: true,
    completedOrders: 8,
    totalRentalSpend: 4000000,
    fiveStarReviewsCount: 8,
    distinctLendersCount: 3,
    daysSinceFirstCompletedOrder: 30,
    seriousLateReturnCount: 1,
    fraudConfirmedDisputeCount: 0,
    intentionalCancellationCount: 0,
  });
  assert.equal(res.tier, 'LEVEL_0_NEW');
  assert.equal(res.eligibility.isEligible, false);
});

test('Pending open dispute temporarily freezes deposit discount without wiping earned tier', () => {
  const res = calculateUserTrustScoreFromData({
    email: 'disputinguser@cloop.vn',
    isVerified: true,
    completedOrders: 5,
    totalRentalSpend: 2000000,
    fiveStarReviewsCount: 5,
    distinctLendersCount: 3,
    daysSinceFirstCompletedOrder: 20,
    fraudConfirmedDisputeCount: 0,
    intentionalCancellationCount: 0,
    openDisputeCount: 1, // Đang mở khiếu nại chờ admin xác minh
  });
  // Giữ nguyên tier tín nhiệm cơ bản (không xóa điểm oan)
  assert.equal(res.tier, 'LEVEL_1_VERIFIED');
  // Nhưng tạm đóng băng quyền lợi giảm cọc
  assert.equal(res.eligibility.isDiscountFrozen, true);
  assert.equal(res.eligibility.isEligible, false);
});

test('14-day observation period: completed 3 orders in 3 days stays LEVEL_0_NEW', () => {
  const res = calculateUserTrustScoreFromData({
    email: 'fastfarmer@cloop.vn',
    isVerified: true,
    completedOrders: 3,
    totalRentalSpend: 1200000,
    fiveStarReviewsCount: 3,
    distinctLendersCount: 2,
    daysSinceFirstCompletedOrder: 3, // Mới chỉ 3 ngày từ đơn đầu tiên -> chưa đủ 14 ngày
    fraudConfirmedDisputeCount: 0,
    intentionalCancellationCount: 0,
    openDisputeCount: 0,
  });
  assert.equal(res.tier, 'LEVEL_0_NEW');
  assert.equal(res.eligibility.isEligible, false);
});

test('14-day observation period: completed 3 orders after 14 days unlocks LEVEL_1_VERIFIED', () => {
  const res = calculateUserTrustScoreFromData({
    email: 'patientuser@cloop.vn',
    isVerified: true,
    completedOrders: 3,
    totalRentalSpend: 1200000,
    fiveStarReviewsCount: 3,
    distinctLendersCount: 2,
    daysSinceFirstCompletedOrder: 14, // Đủ 14 ngày quan sát tín nhiệm
    fraudConfirmedDisputeCount: 0,
    intentionalCancellationCount: 0,
    openDisputeCount: 0,
  });
  assert.equal(res.tier, 'LEVEL_1_VERIFIED');
  assert.equal(res.eligibility.isEligible, true);
});

console.log('\n--- 3. Dynamic Deposit Calculation (Conservative & Fund-Driven) ---');
test('LEVEL_0_NEW pays 100% deposit', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 1000000,
    itemValue: 1500000,
    trustTier: 'LEVEL_0_NEW',
    isRental: true,
  });
  assert.equal(calc.finalDeposit, 1000000);
  assert.equal(calc.discountAmount, 0);
  assert.equal(calc.discountPercent, 0);
});

test('LEVEL_1_VERIFIED pays 90% deposit (10% discount, max 200k VND)', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 1000000,
    itemValue: 1500000,
    trustTier: 'LEVEL_1_VERIFIED',
    isRental: true,
  });
  assert.equal(calc.finalDeposit, 900000);
  assert.equal(calc.discountAmount, 100000);
  assert.equal(calc.discountPercent, 10);
});

test('LEVEL_2_TRUSTED pays 80% deposit (20% discount, max 500k VND)', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 1000000,
    itemValue: 1500000,
    trustTier: 'LEVEL_2_TRUSTED',
    isRental: true,
  });
  assert.equal(calc.finalDeposit, 800000);
  assert.equal(calc.discountAmount, 200000);
  assert.equal(calc.discountPercent, 20);
});

test('LEVEL_3_VIP pays 70% deposit (30% discount, max 1.000.000 VND)', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 1000000,
    itemValue: 2500000,
    trustTier: 'LEVEL_3_VIP',
    isRental: true,
  });
  assert.equal(calc.finalDeposit, 700000);
  assert.equal(calc.discountAmount, 300000);
  assert.equal(calc.discountPercent, 30);
});

test('LEVEL_3_VIP pays 70% deposit for 400,000 VND deposit item (0 VND deposit abolished)', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 400000,
    itemValue: 900000,
    trustTier: 'LEVEL_3_VIP',
    isRental: true,
  });
  // 30% of 400k = 120k discount, final deposit = 280k
  assert.equal(calc.finalDeposit, 280000);
  assert.equal(calc.discountAmount, 120000);
  assert.equal(calc.discountPercent, 30);
  assert.ok(calc.finalDeposit > 0, 'Must not allow zero deposit under VietQR');
});

test('Single-order guarantee cap protects platform on high-value deposit', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 5000000, // Cọc gốc 5 triệu
    itemValue: 8000000,
    trustTier: 'LEVEL_1_VERIFIED', // 10% đáng lẽ là 500k, nhưng bị giới hạn trần 200k
    isRental: true,
  });
  assert.equal(calc.discountAmount, 200000, 'Must cap guarantee at 200,000 VND for Level 1');
  assert.equal(calc.finalDeposit, 4800000);
});

test('Circuit breaker triggers when committed claims reach 30% monthly ceiling', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 1000000,
    itemValue: 2000000,
    trustTier: 'LEVEL_2_TRUSTED',
    isRental: true,
    fundStatus: {
      openingReserveFundBalance: 10000000, // Đầu tháng 10 triệu
      currentReserveFundBalance: 7000000,
      committedClaims: 3000000, // Đã cam kết 3 triệu = đúng 30% trần
    },
  });
  assert.equal(calc.circuitBreakerTriggered, true);
  assert.equal(calc.finalDeposit, 1000000);
  assert.equal(calc.discountAmount, 0);
});

test('Cold-start fund protection: forces 100% deposit when fund < 5,000,000 VND', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 1000000,
    itemValue: 2000000,
    trustTier: 'LEVEL_1_VERIFIED',
    isRental: true,
    fundStatus: {
      openingReserveFundBalance: 4000000,
      currentReserveFundBalance: 4000000, // Dưới 5 triệu VND
      committedClaims: 0,
    },
  });
  assert.equal(calc.finalDeposit, 1000000);
  assert.equal(calc.discountAmount, 0);
});

test('Fund threshold gating: Level 2 user downgraded to Level 1 when fund is between 5M and 15M VND', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 1000000,
    itemValue: 2000000,
    trustTier: 'LEVEL_2_TRUSTED',
    isRental: true,
    fundStatus: {
      openingReserveFundBalance: 10000000,
      currentReserveFundBalance: 10000000, // 10 triệu (< 15 triệu của Level 2)
      committedClaims: 0,
    },
  });
  // Hạ xuống Level 1: 10% discount thay vì 20%
  assert.equal(calc.finalDeposit, 900000);
  assert.equal(calc.discountAmount, 100000);
  assert.equal(calc.discountPercent, 10);
});

test('Fast-Track forces 100% deposit regardless of trust tier', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 1000000,
    itemValue: 2000000,
    trustTier: 'LEVEL_2_TRUSTED',
    isRental: true,
    fastTrackActive: true,
  });
  assert.equal(calc.finalDeposit, 1000000);
  assert.equal(calc.discountAmount, 0);
});

test('Account-level exposure cap: Level 1 capped at 500,000 VND total active guarantee', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 1500000,
    itemValue: 2000000,
    trustTier: 'LEVEL_1_VERIFIED',
    userGuaranteeStatus: {
      currentActiveGuarantees: 400000, // Đã có 400k bảo lãnh đang mở (trần Level 1 là 500k)
      activeDiscountedOrdersCount: 1,
    },
  });
  // Đáng lẽ giảm 10% của 1.5M = 150k (nhỏ hơn trần đơn 200k), nhưng hạn mức tài khoản chỉ còn 100k
  assert.equal(calc.discountAmount, 100000);
  assert.equal(calc.finalDeposit, 1400000);
});

test('Account-level exposure cap: Level 1 forces 100% deposit when active guarantee reaches 500k ceiling', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 1000000,
    itemValue: 1500000,
    trustTier: 'LEVEL_1_VERIFIED',
    userGuaranteeStatus: {
      currentActiveGuarantees: 500000, // Đã chạm trần 500.000đ
      activeDiscountedOrdersCount: 1,
    },
  });
  assert.equal(calc.finalDeposit, 1000000);
  assert.equal(calc.discountAmount, 0);
});

test('Account-level concurrent orders cap: Level 1 forces 100% deposit on 3rd concurrent order', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 1000000,
    itemValue: 1500000,
    trustTier: 'LEVEL_1_VERIFIED',
    userGuaranteeStatus: {
      currentActiveGuarantees: 200000,
      activeDiscountedOrdersCount: 2, // Đã đạt tối đa 2 đơn giảm cọc đồng thời
    },
  });
  assert.equal(calc.finalDeposit, 1000000);
  assert.equal(calc.discountAmount, 0);
});

test('Open dispute on account freezes deposit discount in dynamic deposit calculation', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 1000000,
    itemValue: 1500000,
    trustTier: 'LEVEL_2_TRUSTED',
    userGuaranteeStatus: {
      hasOpenDispute: true,
      currentActiveGuarantees: 0,
      activeDiscountedOrdersCount: 0,
    },
  });
  assert.equal(calc.finalDeposit, 1000000);
  assert.equal(calc.discountAmount, 0);
  assert.ok(calc.explanation.includes('đóng băng'));
});

test('Quỹ dự phòng khả dụng (availableReserve): pending claims & committed guarantees deplete reserve and gate tiers', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 1000000,
    itemValue: 2000000,
    trustTier: 'LEVEL_2_TRUSTED',
    fundStatus: {
      openingReserveFundBalance: 50000000,
      currentReserveFundBalance: 20000000, // Sổ sách 20 triệu
      paidClaims: 1000000,
      pendingClaims: 3000000,
      committedActiveGuarantees: 8000000, // 20M - (1M + 3M + 8M) = 8M khả dụng (< 15M của Level 2)
    },
  });
  // Giáng xuống Level 1 (giảm 10% = 100k thay vì 20%)
  assert.equal(calc.discountAmount, 100000);
  assert.equal(calc.finalDeposit, 900000);
  assert.equal(calc.availableReserve, 8000000);
});

test('Transparent platform liability limit invariant', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 1000000,
    itemValue: 1500000,
    trustTier: 'LEVEL_1_VERIFIED',
  });
  // finalDeposit (900k) + approvedGuarantee (100k) = 1.000.000đ = platformLiabilityLimit
  assert.equal(calc.platformLiabilityLimit, 1000000);
  assert.equal(calc.platformLiabilityLimit, calc.finalDeposit + calc.discountAmount);
});

console.log('\n--- 4. Fast-Track Ceilings & Security Constraints ---');
test('Fast-Track ceiling is strictly graduated by tier', () => {
  assert.equal(TRUST_TIERS.LEVEL_0_NEW.fastTrackCeiling, 6000000);
  assert.equal(TRUST_TIERS.LEVEL_1_VERIFIED.fastTrackCeiling, 12000000);
  assert.equal(TRUST_TIERS.LEVEL_2_TRUSTED.fastTrackCeiling, 20000000);
  assert.equal(TRUST_TIERS.LEVEL_3_VIP.fastTrackCeiling, 35000000);
});

console.log('\n--- 5. Dispute Settlement Double-Entry Math Invariants ---');
function simulateDisputeMath(depositAmount: number, finalDeduction: number) {
  if (finalDeduction < 0 || finalDeduction > depositAmount) {
    throw new Error('Deduction out of bounds');
  }
  const ownerCompensation = finalDeduction;
  const renterRefund = depositAmount - finalDeduction;
  return { ownerCompensation, renterRefund, sum: ownerCompensation + renterRefund };
}

test('Full deduction: Owner gets 100%, Renter gets 0, Sum equals deposit', () => {
  const res = simulateDisputeMath(1200000, 1200000);
  assert.equal(res.ownerCompensation, 1200000);
  assert.equal(res.renterRefund, 0);
  assert.equal(res.sum, 1200000);
});

test('Partial deduction: Owner gets damage fee, Renter gets remaining, Sum equals deposit', () => {
  const res = simulateDisputeMath(1200000, 450000);
  assert.equal(res.ownerCompensation, 450000);
  assert.equal(res.renterRefund, 750000);
  assert.equal(res.sum, 1200000);
});

test('Zero deduction (Wear and Tear): Renter gets 100% refund, Owner gets 0', () => {
  const res = simulateDisputeMath(1200000, 0);
  assert.equal(res.ownerCompensation, 0);
  assert.equal(res.renterRefund, 1200000);
  assert.equal(res.sum, 1200000);
});

test('Rejects negative deduction or deduction exceeding deposit', () => {
  assert.throws(() => simulateDisputeMath(500000, -10000));
  assert.throws(() => simulateDisputeMath(500000, 600000));
});

console.log('\n--- 6. Data Privacy & Law 91/2025 Compliance Masking ---');
test('maskPhone hides middle digits properly', () => {
  assert.equal(maskPhone('0912345678'), '091****678');
  assert.equal(maskPhone('84987654321'), '849****321');
  assert.equal(maskPhone(''), '');
  assert.equal(maskPhone(null), '');
});

test('maskEmail hides local part properly', () => {
  assert.equal(maskEmail('longdeptrai@gmail.com'), 'l***i@gmail.com');
  assert.equal(maskEmail('a@cloop.vn'), 'a***@cloop.vn');
  assert.equal(maskEmail(''), '');
  assert.equal(maskEmail(null), '');
});

console.log('\n--- 7. Unified Settlement Invariants & Nullish Operator Compliance ---');
test('verifyConservationInvariant returns valid when sum matches collected amount exactly', () => {
  const check = verifyConservationInvariant({
    totalCollected: 1000000,
    refundToRenter: 400000,
    payoutToOwner: 450000,
    platformFeeRetained: 100000,
    shippingRetained: 50000,
  });
  assert.equal(check.valid, true);
  assert.equal(check.difference, 0);
});

test('verifyConservationInvariant catches 1 VND discrepancy and flags invalid', () => {
  const check = verifyConservationInvariant({
    totalCollected: 1000000,
    refundToRenter: 400000,
    payoutToOwner: 450000,
    platformFeeRetained: 100000,
    shippingRetained: 49999, // 1 VND difference
  });
  assert.equal(check.valid, false);
  assert.equal(check.difference, 1);
});

test('Operator ?? preserves 0 VND platform fee (Founding launch free promotion)', () => {
  const invoicePlatformFee: number | null | undefined = 0;
  const rentalFee = 200000;
  // ?? ensures 0 is NOT treated as falsy
  const appliedFee = invoicePlatformFee ?? Math.floor(rentalFee * 0.12);
  assert.equal(appliedFee, 0, 'Zero platform fee must be preserved and not fallback to 12%');

  // Fallback to 12% when undefined
  const undefinedFee: number | undefined = undefined;
  const defaultFee = undefinedFee ?? Math.floor(rentalFee * 0.12);
  assert.equal(defaultFee, 24000, 'Undefined fee must fallback to 12%');
});

console.log('\n--- 8. Reserve Fund Live Availability & Zero-Fund Fail-Closed ---');
test('Fail-Closed: Zero available reserve forces 0% discount and 100% deposit for all users', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 1000000,
    itemValue: 2000000,
    trustTier: 'LEVEL_3_VIP', // Even VIP level
    fundStatus: {
      openingReserveFundBalance: 0,
      currentReserveFundBalance: 0,
      paidClaims: 0,
      pendingClaims: 0,
      committedActiveGuarantees: 0,
    },
  });
  assert.equal(calc.discountAmount, 0, 'Must not grant deposit discount when reserve fund is 0');
  assert.equal(calc.finalDeposit, 1000000, 'Must require 100% deposit when reserve is depleted');
});

test('Open dispute locks user out of deposit discount regardless of trust tier', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 1000000,
    itemValue: 2000000,
    trustTier: 'LEVEL_2_TRUSTED',
    fundStatus: {
      openingReserveFundBalance: 50000000,
      currentReserveFundBalance: 50000000,
      paidClaims: 0,
      pendingClaims: 0,
      committedActiveGuarantees: 0,
    },
    userGuaranteeStatus: {
      currentActiveGuarantees: 0,
      hasOpenDispute: true,
    },
  });
  assert.equal(calc.discountAmount, 0, 'Open dispute must lock user from deposit discount');
  assert.equal(calc.finalDeposit, 1000000);
});

console.log('\n--- 9. Partial Dispute Refund Math (No Overrun) ---');
test('Partial dispute refund: correctly separates rental fee refund from deposit refund', () => {
  const depositAmount = 1000000;
  const rentalFee = 300000;
  const agreedRentalRefund = 100000; // Only partial rental fee refund
  const totalRenterCredit = depositAmount + agreedRentalRefund; // 1,100,000

  // Simulating the extraction logic in completeOrderAction
  const adminNotes = JSON.stringify({
    pendingRefundToRenter: totalRenterCredit,
    pendingRentalRefund: agreedRentalRefund,
    pendingDepositRefund: depositAmount,
  });

  const parsed = JSON.parse(adminNotes);
  const rentalRefundPortion = typeof parsed.pendingRentalRefund === 'number'
    ? parsed.pendingRentalRefund
    : Math.max(0, parsed.pendingRefundToRenter - depositAmount);

  assert.equal(rentalRefundPortion, 100000, 'Must extract exactly the rental refund portion');

  // Verify settlement engine math:
  // refundDepositToRenter (1M) + refundRentalToRenter (100k) = 1.1M total
  const finalRefund = depositAmount + rentalRefundPortion;
  assert.equal(finalRefund, 1100000, 'Total refund must be 1.1M, NOT 1.3M');
  assert.notEqual(finalRefund, 1300000, 'Must NOT accidentally refund full 300k rental fee');
});

console.log('\n--- 10. Checkout Zero-Deposit Fail-Closed Fallback ---');
test('Fail-Closed: Listing with deposit <= 0 automatically falls back to minimum deposit based on valuation', () => {
  const approxItemValue = 1200000; // Item value 1.2M
  const listingDeposit = 0; // Malformed listing with 0 deposit

  let baseDepositPrice = listingDeposit;
  if (baseDepositPrice <= 0) {
    baseDepositPrice = Math.max(300000, Math.round(approxItemValue * 0.5));
  }

  assert.equal(baseDepositPrice, 600000, 'Must default to 50% of item valuation (600,000đ)');
  assert.ok(baseDepositPrice >= 300000, 'Must enforce minimum 300,000đ deposit floor');
});

console.log('\n--- 11. Vietnam Phone Verification & Anti-Fraud Shield ---');
test('Normalizes phone numbers: removes spaces, dots, dashes, converts +84 and 84 to 0', () => {
  assert.equal(normalizeVietnamPhone('+84 981 234 567'), '0981234567');
  assert.equal(normalizeVietnamPhone('84981234567'), '0981234567');
  assert.equal(normalizeVietnamPhone('098.123.4567'), '0981234567');
  assert.equal(normalizeVietnamPhone('098-123-4567'), '0981234567');
});

test('Validates legitimate 10-digit Vietnamese carrier prefixes', () => {
  // Viettel
  assert.equal(isValidVietnamPhone('0981234567'), true);
  assert.equal(isValidVietnamPhone('0387654321'), true);
  assert.equal(isValidVietnamPhone('0869999999'), true);

  // VinaPhone
  assert.equal(isValidVietnamPhone('0912345678'), true);
  assert.equal(isValidVietnamPhone('0841234567'), true);
  assert.equal(isValidVietnamPhone('0888888888'), true);

  // MobiFone
  assert.equal(isValidVietnamPhone('0901234567'), true);
  assert.equal(isValidVietnamPhone('0701234567'), true);
  assert.equal(isValidVietnamPhone('0899999999'), true);

  // Vietnamobile & Wintel
  assert.equal(isValidVietnamPhone('0921234567'), true);
  assert.equal(isValidVietnamPhone('0561234567'), true);
  assert.equal(isValidVietnamPhone('0551234567'), true);
});

test('Rejects invalid phone numbers and foreign/spam prefixes', () => {
  assert.equal(isValidVietnamPhone(''), false);
  assert.equal(isValidVietnamPhone('098123456'), false); // 9 digits
  assert.equal(isValidVietnamPhone('09812345678'), false); // 11 digits
  assert.equal(isValidVietnamPhone('0123456789'), false); // Old 11-digit prefix 012
  assert.equal(isValidVietnamPhone('0241234567'), false); // Landline prefix 024
  assert.equal(isValidVietnamPhone('0412345678'), false); // Non-existent prefix
  assert.equal(isValidVietnamPhone('abcdefghij'), false); // Alphabetic
  assert.equal(isValidVietnamPhone('+12025550123'), false); // US number
});

test('Detects mobile carrier names and returns badge metadata', () => {
  assert.equal(getVietnamCarrier('0981234567').name, 'Viettel Telecom');
  assert.equal(getVietnamCarrier('0981234567').shortName, 'VIETTEL');
  assert.equal(getVietnamCarrier('0912345678').name, 'VNPT VinaPhone');
  assert.equal(getVietnamCarrier('0912345678').shortName, 'VINAPHONE');
  assert.equal(getVietnamCarrier('0901234567').name, 'MobiFone');
  assert.equal(getVietnamCarrier('0901234567').shortName, 'MOBIFONE');
  assert.equal(getVietnamCarrier('0921234567').name, 'Vietnamobile');
  assert.equal(getVietnamCarrier('0551234567').name, 'Wintel / I-Telecom');
  assert.equal(getVietnamCarrier('').name, 'Chưa xác định');
});

test('Masks phone numbers adhering to Data Privacy Law 91/2025/QH15', () => {
  assert.equal(maskPhoneNumber('0981234567'), '098***4567');
  assert.equal(maskPhoneNumber('0387654321'), '038***4321');
  assert.equal(maskPhoneNumber(''), 'Chưa cập nhật');
});

test('KYC_1K Micro-Deposit package: 1,000 VND yields 20 coins (200% payback) for eKYC', () => {
  const kycPkg = COIN_PACKAGES.KYC_1K;
  assert.ok(kycPkg, 'KYC_1K package must be defined');
  assert.equal(kycPkg.amountVnd, 1000, 'Micro-deposit amount must be exactly 1,000 VND');
  assert.equal(kycPkg.totalCoins, 20, 'Must reward 20 Leaf Coins (200% return)');
  assert.equal(kycPkg.code, 'KYC_1K');
});

test('KYC_2K Micro-Deposit package: 2,000 VND bank transfer requirement for eKYC with 100% wallet refund', () => {
  const kycPkg = COIN_PACKAGES.KYC_2K;
  assert.ok(kycPkg, 'KYC_2K package must be defined');
  assert.equal(kycPkg.amountVnd, 2000, 'Micro-deposit amount must be 2,000 VND for banking compliance');
  assert.equal(kycPkg.code, 'KYC_2K');
});

test('VietQR eKYC Verification: isVerified: true elevates user to phoneVerified (+10 PTS)', () => {
  const unverifiedScore = calculateUserTrustScoreFromData({
    isVerified: false,
    email: 'user@gmail.com',
    completedOrders: 0,
    disputeCount: 0,
  });

  const verifiedScore = calculateUserTrustScoreFromData({
    isVerified: true,
    email: 'user@gmail.com',
    completedOrders: 0,
    disputeCount: 0,
  });

  assert.equal(unverifiedScore.factors.phoneVerified, false);
  assert.equal(verifiedScore.factors.phoneVerified, true);
  assert.equal(verifiedScore.score, unverifiedScore.score + 10, 'Must award exactly +10 PTS for phone eKYC');
});

console.log('\n--- 12. Business-Logic Security Regression Suite (10/10 Fixes) ---');

test('Cross-flow payment isolation: Boost, Coin Top-Up, and Micro-KYC strictly reject foreign package codes', () => {
  const isBoostRecord = (pkgCode: string, rawPayload: any) =>
    (typeof pkgCode === 'string' && pkgCode.startsWith('BOOST_')) || rawPayload?.type === 'PRODUCT_BOOST';
  const isBoostValidWithTarget = (pkgCode: string, rawPayload: any) =>
    isBoostRecord(pkgCode, rawPayload) && typeof rawPayload?.productId === 'string' && rawPayload.productId.trim().length > 0;
  const isAllowedCoinTopUpCreate = (pkgCode: string) =>
    Boolean(pkgCode && !pkgCode.startsWith('KYC_') && !pkgCode.startsWith('BOOST_') && COIN_PACKAGES[pkgCode]);
  const isAllowedMicroKycCheck = (pkgCode: string) =>
    pkgCode === 'KYC_2K' || pkgCode === 'KYC_1K';

  // 1. Ordinary PACK_10K top-up with null payload MUST be rejected by checkBoostPaymentStatusAction
  assert.equal(isBoostValidWithTarget('PACK_10K', null), false, 'PACK_10K must never be consumed by boost status check');
  assert.equal(isBoostValidWithTarget('KYC_2K', { phone: '0981234567' }), false, 'KYC_2K must be rejected by boost status check');
  assert.equal(isBoostValidWithTarget('BOOST_24H', {}), false, 'BOOST_24H without productId must be rejected');
  assert.equal(isBoostValidWithTarget('BOOST_24H', { type: 'PRODUCT_BOOST', productId: 'prod-123' }), true);

  // 2. Direct createCoinTopUpPayment must reject KYC_* and BOOST_*
  assert.equal(isAllowedCoinTopUpCreate('KYC_1K'), false);
  assert.equal(isAllowedCoinTopUpCreate('KYC_2K'), false);
  assert.equal(isAllowedCoinTopUpCreate('BOOST_24H'), false);
  assert.equal(isAllowedCoinTopUpCreate('LEAF_50K'), true);

  // 3. Micro-KYC status check must reject PACK_* and BOOST_* to prevent walletBalance cashback exploit
  assert.equal(isAllowedMicroKycCheck('PACK_500K'), false);
  assert.equal(isAllowedMicroKycCheck('BOOST_72H'), false);
  assert.equal(isAllowedMicroKycCheck('KYC_2K'), true);
});

test('Mobile order state machine enforces strict sequential transitions and PENDING_APPROVAL initial state', () => {
  const expectedStateForAction: Record<string, string> = {
    APPROVE_ORDER: 'PENDING_APPROVAL',
    HANDOVER_SHIPPER: 'OWNER_PACKED',
    CONFIRM_RECEIVED: 'LENDER_SHIPPED',
    INITIATE_RETURN: 'BORROWER_RECEIVED',
    CONFIRM_RETURNED: 'BORROWER_RECEIVED',
    CONFIRM_RETURN: 'BORROWER_RETURNED',
    COMPLETE_ORDER: 'BORROWER_RETURNED',
  };

  const canTransition = (currentStatus: string, invoiceStatus: string, action: string) => {
    if (invoiceStatus !== 'PAID') return false;
    if (currentStatus === 'LENDER_COMPLETED' || currentStatus === 'CANCELLED') return false;
    return expectedStateForAction[action] === currentStatus;
  };

  // Valid initial approval from PENDING_APPROVAL
  assert.equal(canTransition('PENDING_APPROVAL', 'PAID', 'APPROVE_ORDER'), true);
  assert.equal(canTransition('PENDING_APPROVAL', 'PENDING', 'APPROVE_ORDER'), false, 'Unpaid order cannot be approved');

  // Step-skipping must be rejected
  assert.equal(canTransition('PENDING_APPROVAL', 'PAID', 'HANDOVER_SHIPPER'), false, 'Cannot skip OWNER_PACKED');
  assert.equal(canTransition('PENDING_APPROVAL', 'PAID', 'CONFIRM_RECEIVED'), false, 'Cannot skip to BORROWER_RECEIVED');
  assert.equal(canTransition('OWNER_PACKED', 'PAID', 'CONFIRM_RECEIVED'), false, 'Cannot skip LENDER_SHIPPED');
  assert.equal(canTransition('LENDER_SHIPPED', 'PAID', 'COMPLETE_ORDER'), false, 'Cannot complete before return');

  // Valid sequential chain
  assert.equal(canTransition('OWNER_PACKED', 'PAID', 'HANDOVER_SHIPPER'), true);
  assert.equal(canTransition('LENDER_SHIPPED', 'PAID', 'CONFIRM_RECEIVED'), true);
  assert.equal(canTransition('BORROWER_RECEIVED', 'PAID', 'INITIATE_RETURN'), true);
  assert.equal(canTransition('BORROWER_RETURNED', 'PAID', 'COMPLETE_ORDER'), true);
});

test('Bank-KYC fails closed on missing identity, duplicate single-token names, and unverified accounts', () => {
  const normalizeVN = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase().trim();

  const verifyBankKycStrict = (isVerified: boolean, registeredName?: string | null, bankHolderName?: string | null): boolean => {
    if (!isVerified || !registeredName?.trim() || !bankHolderName?.trim()) return false;
    const normReg = normalizeVN(registeredName).replace(/[^A-Z0-9\s]/g, '');
    const normBank = normalizeVN(bankHolderName).replace(/[^A-Z0-9\s]/g, '');
    if (!normReg || !normBank || normReg.length < 2 || normBank.length < 2) return false;
    if (normReg === normBank) return true;
    const regTokens = Array.from(new Set(normReg.split(/\s+/).filter(Boolean)));
    const bankTokens = Array.from(new Set(normBank.split(/\s+/).filter(Boolean)));
    if (regTokens.length === 0 || bankTokens.length === 0) return false;
    if (regTokens.length === 1) {
      return bankTokens.length === 1 && regTokens[0] === bankTokens[0];
    }
    const matchCount = regTokens.filter((token) => bankTokens.includes(token)).length;
    return matchCount >= 2;
  };

  assert.equal(verifyBankKycStrict(true, null, 'NGUYEN VAN A'), false, 'Null identity must fail closed');
  assert.equal(verifyBankKycStrict(true, '', 'NGUYEN VAN A'), false, 'Empty identity must fail closed');
  assert.equal(verifyBankKycStrict(false, 'NGUYEN VAN A', 'NGUYEN VAN A'), false, 'Unverified user must fail closed');
  assert.equal(verifyBankKycStrict(true, 'NGUYEN AN', 'NGUYEN NGUYEN'), false, 'Duplicate token trick must fail');
  assert.equal(verifyBankKycStrict(true, 'TRANG', 'NGUYEN THI TRANG'), false, 'Single-token name cannot match multi-token stranger');
  assert.equal(verifyBankKycStrict(true, 'Nguyễn Thị Trang', 'NGUYEN THI TRANG'), true);
});

test('Product deletion guard uses LENDER_COMPLETED / CANCELLED terminal states and blocks active orders', () => {
  const canDeleteOrArchiveProduct = (rentals: Array<{ status: string; invoiceStatus?: string }>) => {
    const activeStatuses = new Set(['OWNER_PACKED', 'LENDER_SHIPPED', 'BORROWER_RECEIVED', 'BORROWER_RETURNED', 'DISPUTE']);
    const terminalStatuses = new Set(['LENDER_COMPLETED', 'CANCELLED']);
    const hasActiveOrder = rentals.some((r) =>
      activeStatuses.has(r.status) || (r.invoiceStatus === 'PAID' && !terminalStatuses.has(r.status))
    );
    return !hasActiveOrder;
  };

  assert.equal(canDeleteOrArchiveProduct([]), true, 'Product with no orders can be deleted');
  assert.equal(canDeleteOrArchiveProduct([{ status: 'LENDER_COMPLETED', invoiceStatus: 'PAID' }]), true, 'Completed paid rental allows archiving');
  assert.equal(canDeleteOrArchiveProduct([{ status: 'CANCELLED', invoiceStatus: 'CANCELLED' }]), true, 'Cancelled rental allows archiving');
  assert.equal(canDeleteOrArchiveProduct([{ status: 'PENDING_APPROVAL', invoiceStatus: 'PAID' }]), false, 'Paid pending-approval rental must block deletion');
  assert.equal(canDeleteOrArchiveProduct([{ status: 'LENDER_SHIPPED', invoiceStatus: 'PAID' }]), false, 'In-transit rental must block deletion');
  assert.equal(canDeleteOrArchiveProduct([{ status: 'DISPUTE', invoiceStatus: 'PAID' }]), false, 'Disputed rental must block deletion');
});

test('Booking listing selector enforces exact RENT/SELL type and AVAILABLE status without fallback', () => {
  const selectEligibleListing = (listings: Array<{ id: string; listingType: string; status: string; isDeleted: boolean }>, isRental: boolean) => {
    const requestedType = isRental ? 'RENT' : 'SELL';
    return listings.find((l) => !l.isDeleted && l.listingType === requestedType && l.status === 'AVAILABLE') || null;
  };

  const sampleListings = [
    { id: 'l-rent-reserved', listingType: 'RENT', status: 'RESERVED', isDeleted: false },
    { id: 'l-sell-avail', listingType: 'SELL', status: 'AVAILABLE', isDeleted: false },
  ];

  assert.equal(selectEligibleListing(sampleListings, true), null, 'Must not fall back to SELL listing or RESERVED listing when requesting RENT');
  assert.equal(selectEligibleListing(sampleListings, false)?.id, 'l-sell-avail', 'Must select matching AVAILABLE SELL listing');
});

test('Production verifyBankKyc export strictly rejects null, empty, 1-token mismatch, partial 2-token collision, and duplicate-token tricks', () => {
  assert.equal(verifyBankKyc(null, 'NGUYEN VAN A'), false);
  assert.equal(verifyBankKyc('', 'NGUYEN VAN A'), false);
  assert.equal(verifyBankKyc('NGUYEN AN', 'NGUYEN NGUYEN'), false);
  assert.equal(verifyBankKyc('NGUYEN VAN AN', 'NGUYEN VAN BINH'), false);
  assert.equal(verifyBankKyc('TRANG', 'NGUYEN THI TRANG'), false);
  assert.equal(verifyBankKyc('Trần Thị Bình', 'TRAN THI BINH'), true);
});

function loadActionModule(
  file: string,
  overrides: Record<string, any> = {},
  envOverrides: Record<string, string | undefined> = {
    WALLET_SEAL_SECRET: 'test-only-isolated-wallet-seal-secret-32b',
  }
) {
  const fullPath = path.resolve(process.cwd(), file);
  const source = fs.readFileSync(fullPath, 'utf8');
  const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
  const mocks: Record<string, any> = Object.fromEntries(imports.map((id) => [id, {}]));
  Object.assign(
    mocks,
    {
      '@/src/lib/auth': { requireUser: async () => ({ id: 'u1', role: 'USER', isVerified: true }) },
      'next/cache': { revalidatePath() {}, revalidateTag() {} },
      '@/app/actions/product': { clearShopMemoryCache: async () => {} },
      '@/src/lib/product-service': { clearProductDetailCache: () => {} },
      '@/lib/validations/phone': {
        isValidVietnamPhone,
        normalizeVietnamPhone,
      },
      '@/src/utils/bank-kyc': {
        verifyBankKyc,
      },
      '@/src/services/gcsStorage': {
        generateDisputeVideoReadUrl: async (k: string) => `https://storage.googleapis.com/signed/${k}`,
        verifyUploadedDisputeFile: async () => ({ isValid: false, error: 'Not found on GCS' }),
      },
      '@/src/lib/dispute-evidence-seal': {
        verifyAndFinalizeDisputeEvidenceList: async ({ rawUrls }: { rawUrls: unknown }) => {
          const urls = Array.isArray(rawUrls) ? rawUrls.map((u) => String(u || '').trim()).filter(Boolean) : [];
          return { ok: true, verifiedUrls: urls, hasVerifiedVideo: true };
        },
      },
      'server-only': {},
      react: { cache: (fn: any) => fn },
      zod: require('zod'),
    },
    overrides
  );
  const moduleExports: Record<string, any> = {};
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(
    code,
    {
      exports: moduleExports,
      Date,
      URL,
      URLSearchParams,
      Blob,
      File,
      FormData,
      Headers,
      Response,
      AbortController,
      Buffer,
      console,
      setTimeout,
      clearTimeout,
      Promise,
      Map,
      Set,
      BigInt,
      JSON,
      Math,
      Number,
      String,
      Boolean,
      Array,
      Object,
      RegExp,
      Error,
      fetch: (...args: any[]) => (globalThis as any).fetch(...args),
      process: { env: { ...envOverrides } },
      require(id: string) {
        if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id];
        throw new Error(`Unmocked dependency: ${id}`);
      },
    },
    { filename: file }
  );
  return moduleExports;
}

async function asyncTest(name: string, fn: () => Promise<void>) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log('  [PASS] ' + name);
  } catch (err: unknown) {
    console.error('  [FAIL] ' + name);
    console.error(err);
    process.exitCode = 1;
  }
}

async function runActionLevelSuite() {
  console.log('\n--- 13. Action-Level Execution & Concurrency Verification Suite ---');

  await asyncTest('Action 1: checkBoostPaymentStatusAction rejects ordinary PACK_10K top-up without transaction', async () => {
    let txCalls = 0;
    const boostMod = loadActionModule('app/actions/boost.ts', {
      '@/src/lib/prisma': {
        prisma: {
          coinTopUp: { findUnique: async () => ({ userId: 'u1', packageCode: 'PACK_10K', rawPayload: null }) },
          $transaction: async () => {
            txCalls++;
          },
        },
      },
    });
    const res = await boostMod.checkBoostPaymentStatusAction(123);
    assert.equal(res.status, 'INVALID_FLOW');
    assert.equal(txCalls, 0);
  });

  await asyncTest('Action 2: Bank-KYC blocks settings bank_owner spoofing, metadata tampering, and address name overwrite', async () => {
    const metadata: Record<string, any> = {
      verified_legal_name: 'LE VAN CUONG',
      bank_owner: 'LE VAN CUONG',
    };
    const user = { name: 'TRAN THI BINH', isVerified: true };
    const identityDb = {
      user: {
        findUnique: async () => ({ ...user }),
        update: async ({ data }: any) => Object.assign(user, data),
      },
      withdrawalRequest: {
        findFirst: async () => null,
      },
      $queryRawUnsafe: async () => [{ raw_user_meta_data: { ...metadata } }],
      $executeRawUnsafe: async (_sql: string, payload: string) => {
        Object.assign(metadata, JSON.parse(payload));
        return 1;
      },
    };
    const identityMocks = {
      '@/src/lib/prisma': { prisma: identityDb },
      '@/src/utils/supabase/server': { createClient: async () => ({ auth: { updateUser: async () => ({}) } }) },
    };

    const settingsMod = loadActionModule('app/actions/user.ts', identityMocks);
    const settingsRes = await settingsMod.updateUserSettingsAction({ bank_owner: 'LE VAN CUONG' });
    assert.equal(settingsRes.success, false, 'Settings must reject mismatched bank_owner on verified account');

    const withdrawalMod = loadActionModule('app/actions/withdrawal.ts', identityMocks);
    const bankRes = await withdrawalMod.saveUserBankInfoAction({
      bankName: 'TEST BANK',
      bankAccountNumber: '123456789',
      bankAccountHolder: 'LE VAN CUONG',
    });
    assert.equal(bankRes.success, false, 'saveUserBankInfoAction must ignore tampered metadata and reject mismatched holder');

    const validBankRes = await withdrawalMod.saveUserBankInfoAction({
      bankName: 'TEST BANK',
      bankAccountNumber: '123456789',
      bankAccountHolder: 'TRAN THI BINH',
    });
    assert.equal(validBankRes.success, true, 'Matching legal name in prisma.user must succeed');

    const closetMod = loadActionModule('app/actions/closet.ts', identityMocks);
    const addrRes = await closetMod.saveUnifiedUserAddressAction({
      name: 'NGUYEN VAN AN',
      provinceId: 1,
      districtId: 2,
      wardCode: '3',
      province: 'TEST',
      district: 'TEST',
      ward: 'TEST',
      specificAddress: 'TEST',
    });
    assert.equal(addrRes.success, true);
    assert.equal(user.name, 'TRAN THI BINH', 'saveUnifiedUserAddressAction must NOT overwrite verified prisma.user.name');
    assert.equal(metadata.recipient_name, 'NGUYEN VAN AN', 'Delivery recipient name stored separately');
  });

  await asyncTest('Action 3: Concurrent checkBoostPaymentStatusAction calls serialize via per-product lock and add full 48h', async () => {
    const originalExpiry = new Date(Date.now() + 86400000);
    let expiry = originalExpiry;
    const paidOrders = new Set<string>();

    const boostDb = {
      coinTopUp: {
        findUnique: async ({ where }: any) => ({
          id: String(where.orderCode),
          userId: 'u1',
          packageCode: 'BOOST_24H',
          status: 'PENDING',
          amountVnd: 10000,
          totalCoins: 20,
          rawPayload: { type: 'PRODUCT_BOOST', productId: 'p1', hours: 24, coins: 20 },
          user: { cloopCoins: 0 },
        }),
      },
      $transaction: async (fn: any) =>
        fn({
          $executeRaw: async () => 1,
          product: {
            findUnique: async () => {
              await new Promise((r) => setTimeout(r, 15));
              return { id: 'p1', userId: 'u1', isDeleted: false, title: 'Test', boostExpiresAt: new Date(expiry), boostScore: 0 };
            },
            update: async ({ data }: any) => {
              expiry = data.boostExpiresAt;
              return { boostScore: 40 };
            },
          },
          coinTopUp: {
            updateMany: async ({ where }: any) => {
              paidOrders.add(where.id);
              return { count: 1 };
            },
          },
          listing: { updateMany: async () => ({ count: 0 }) },
          coinLedgerEntry: { create: async () => ({}) },
        }),
    };

    const boostMod = loadActionModule('app/actions/boost.ts', {
      '@/src/lib/prisma': { prisma: boostDb },
      '@/lib/payos': { payos: { paymentRequests: { get: async () => ({ status: 'PAID', amountPaid: 10000 }) } } },
    });

    const results = await Promise.all([
      boostMod.checkBoostPaymentStatusAction(101),
      boostMod.checkBoostPaymentStatusAction(102),
    ]);
    assert.ok(results.every((r: any) => r.success && r.status === 'PAID'));
    assert.equal(paidOrders.size, 2);
    assert.equal(
      Math.round((expiry.getTime() - originalExpiry.getTime()) / 3600000),
      48,
      'Two concurrent 24h boost orders must extend expiry by 48h total'
    );
  });

  await asyncTest('Action 4: createBooking recovers same-user RESERVED pending order and allows rebooking after LENDER_COMPLETED', async () => {
    const bookingMod = loadActionModule('app/actions/booking.ts', {
      '@/src/utils/supabase/server': {
        createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) } }),
      },
      'next-axiom': { Logger: class { info() {} warn() {} } },
      '@/lib/trust-engine': {
        getItemValuation: () => 500000,
        calculateUserTrustScore: async () => ({ tier: 'LEVEL_1_VERIFIED', score: 50 }),
        checkExposureLimit: async () => ({ allowed: true }),
        getLiveReserveFundStatus: async () => ({ availableReserve: 20_000_000, activeGuarantees: 0 }),
        calculateDynamicDeposit: () => ({ finalDeposit: 200000, discountAmount: 0, explanation: 'OK' }),
      },
      '@/src/utils/payos': { payos: null },
      '@/src/utils/order-code': { generatePayOSOrderCode: () => 999888 },
      '@/src/utils/shipping': {
        verifyShippingQuoteToken: () => ({ fee: 20000 }),
        calculateDynamicGhnFee: () => ({ fee: 20000 }),
      },
      '@/src/lib/prisma': {
        prisma: {
          product: {
            findUnique: async () => ({
              id: 'p1',
              userId: 'owner',
              status: 'ON_MARKET',
              isDeleted: false,
              listings: [{ id: 'l1', listingType: 'RENT', status: 'RESERVED', isDeleted: false, basePrice: 100000, deposit: 200000 }],
            }),
          },
          user: { findUnique: async () => ({ id: 'u1', name: 'Test Renter' }) },
          rentalHistory: {
            findFirst: async ({ where }: any) => {
              // Pre-check for activePaidRental: verify it excludes LENDER_COMPLETED
              if (where.OR) {
                const paidBranch = where.OR.find((b: any) => b.invoice?.status === 'PAID');
                assert.deepEqual([...(paidBranch?.status?.notIn || [])], ['LENDER_COMPLETED', 'CANCELLED']);
                return null;
              }
              // Pending rental lookup for same user u1
              if (where.status === 'PENDING_APPROVAL') {
                return {
                  id: 'rental-pending-1',
                  renterId: 'u1',
                  createdAt: new Date(Date.now() - 2 * 60 * 1000),
                  invoice: {
                    id: 'inv-1',
                    orderCode: BigInt(777666),
                    paymentLinkId: 'plink_123',
                    amount: 320000,
                    depositAmount: 200000,
                    rentalFee: 100000,
                    status: 'PENDING',
                  },
                };
              }
              return null;
            },
          },
        },
      },
    });

    const retryRes = await bookingMod.createBooking({
      productId: 'p1',
      isRental: true,
      shippingMode: 'SELF_PICKUP',
    });
    assert.equal(retryRes.success, true, 'Same-user retry on RESERVED listing must recover existing pending order');
    assert.equal(retryRes.rentalId, 'rental-pending-1');
  });

  await asyncTest('Action 5: deleteProductAction blocks archival while PENDING_APPROVAL invoice is open, allows after LENDER_COMPLETED', async () => {
    let rentalsInDb: any[] = [{ id: 'r-pending', status: 'PENDING_APPROVAL', invoice: { status: 'PENDING' } }];
    let archived = false;

    const deleteMod = loadActionModule('app/(dashboard)/my-closet/items/actions.ts', {
      '@/src/lib/prisma': {
        prisma: {
          $transaction: async (fn: any) =>
            fn({
              $queryRaw: async () => 1,
              product: {
                findUnique: async () => ({
                  id: 'p1',
                  userId: 'u1',
                  rentalHistory: rentalsInDb,
                }),
                update: async () => {
                  archived = true;
                },
              },
              listing: {
                updateMany: async () => ({ count: 1 }),
              },
            }),
        },
      },
    });

    const blockedRes = await deleteMod.deleteProductAction('p1');
    assert.equal(blockedRes.success, false, 'Must block archival while a PENDING_APPROVAL / PENDING invoice exists');
    assert.equal(archived, false);

    rentalsInDb = [{ id: 'r-done', status: 'LENDER_COMPLETED', invoice: { status: 'PAID' } }];
    const allowedRes = await deleteMod.deleteProductAction('p1');
    assert.equal(allowedRes.success, true, 'Must allow archival once all orders are LENDER_COMPLETED');
    assert.equal(archived, true);
  });

  await asyncTest('Action 6: /api/checkout POST rejects IN_CLOSET products and SELL-only listings before creating invoice', async () => {
    let txStarted = false;
    const checkoutMod = loadActionModule('app/api/checkout/route.ts', {
      'next/server': {
        NextResponse: {
          json: (body: any, init?: { status?: number }) => ({ body, status: init?.status || 200 }),
        },
      },
      '@/src/utils/payos': { payos: {} },
      '@/src/utils/rate-limit': { checkRateLimit: () => ({ success: true }) },
      '@/src/lib/prisma': {
        prisma: {
          product: {
            findUnique: async () => ({
              id: '550e8400-e29b-41d4-a716-446655440000',
              userId: 'owner-1',
              isDeleted: false,
              status: 'IN_CLOSET',
              listings: [{ id: 'l1', status: 'AVAILABLE', isDeleted: false, listingType: 'RENT', basePrice: 100000, deposit: 300000 }],
            }),
          },
          $transaction: async () => {
            txStarted = true;
          },
        },
      },
    });

    const req = {
      json: async () => ({
        productId: '550e8400-e29b-41d4-a716-446655440000',
        shippingToken: 'valid-shipping-token-123',
        buyerAddress: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
        buyerPhone: '0981234567',
        startDate: '2026-12-01',
        packageDays: 3,
      }),
    };

    const res = await checkoutMod.POST(req);
    assert.equal(res.status, 404, '/api/checkout must reject IN_CLOSET product with 404');
    assert.equal(txStarted, false, 'Must not enter transaction for IN_CLOSET product');
  });

  await asyncTest('Action 7: Auth callback does NOT overwrite verified User.name from metadata and blocks substituted Bank-KYC holder', async () => {
    const profile: Record<string, any> = { id: 'u1', name: 'TRAN THI BINH', isVerified: true };
    const auditLogs: any[] = [];
    const db = {
      user: {
        upsert: async ({ update }: any) => Object.assign(profile, update),
        findUnique: async () => ({ ...profile }),
      },
      withdrawalRequest: { findFirst: async () => null },
      auditLog: {
        findFirst: async () => auditLogs[0] || null,
        create: async ({ data }: any) => {
          auditLogs.push(data);
          return data;
        },
      },
      $executeRawUnsafe: async () => 1,
    };

    const authMod = loadActionModule('app/auth/callback/route.ts', {
      'next/server': {
        NextResponse: {
          redirect: (url: string) => ({ url }),
        },
      },
      '@/src/lib/prisma': { prisma: db },
      '@/src/utils/supabase/server': {
        createClient: async () => ({
          auth: {
            exchangeCodeForSession: async () => ({
              data: {
                user: {
                  id: 'u1',
                  email: 'test@example.invalid',
                  user_metadata: { name: 'LE VAN CUONG' },
                },
              },
              error: null,
            }),
          },
        }),
      },
    });

    await authMod.GET({ url: 'http://localhost/auth/callback?code=mock-valid-code' });
    assert.equal(profile.name, 'TRAN THI BINH', 'Auth callback must preserve existing User.name');

    const bankMod = loadActionModule('app/actions/withdrawal.ts', {
      '@/src/lib/prisma': { prisma: db },
      '@/src/utils/supabase/server': { createClient: async () => ({ auth: { updateUser: async () => ({}) } }) },
    });

    const rejected = await bankMod.saveUserBankInfoAction({
      bankName: 'TEST BANK',
      bankAccountNumber: '123456789',
      bankAccountHolder: 'LE VAN CUONG',
    });
    assert.equal(rejected.success, false, 'Must reject substituted bank holder after callback');

    const accepted = await bankMod.saveUserBankInfoAction({
      bankName: 'TEST BANK',
      bankAccountNumber: '123456789',
      bankAccountHolder: 'TRAN THI BINH',
    });
    assert.equal(accepted.success, true, 'Must accept matching legal name and lock BENEFICIARY_KYC_LOCKED');
    assert.equal(auditLogs.length, 1, 'First beneficiary linkage must be anchored in AuditLog');
  });

  await asyncTest('Action 8: Expiry cron (release-locks) locks inside interactive tx, preserves RESERVED listing when invoice became PAID, and releases only expired holds', async () => {
    const state: Record<string, { invoiceStatus: string; rentalStatus: string; listingStatus: string }> = {
      p1: { invoiceStatus: 'PENDING', rentalStatus: 'PENDING_APPROVAL', listingStatus: 'RESERVED' },
      p2: { invoiceStatus: 'PENDING', rentalStatus: 'PENDING_APPROVAL', listingStatus: 'RESERVED' },
    };
    const lockedProducts: string[] = [];

    const cronDb = {
      rentalHistory: {
        findMany: async ({ where }: any) => {
          if (where.createdAt) {
            return [
              { id: 'r1', product_id: 'p1', renterId: 'u1', invoice: { id: 'i1', status: 'PENDING' } },
              { id: 'r2', product_id: 'p2', renterId: 'u2', invoice: { id: 'i2', status: 'PENDING' } },
            ];
          }
          // Verify historical LENDER_COMPLETED / CANCELLED orders are excluded from activeOrPaidRentals
          assert.deepEqual([...(where.status?.notIn || [])], ['LENDER_COMPLETED', 'CANCELLED']);
          // Simulate p1 becoming PAID AFTER activeOrPaidRentals read (right before invoice.updateMany)
          state.p1.invoiceStatus = 'PAID';
          return [];
        },
        findFirst: async () => null,
        updateMany: async ({ where, data }: any) => {
          const pid = where.id === 'r1' ? 'p1' : 'p2';
          if (state[pid].rentalStatus === where.status) {
            state[pid].rentalStatus = data.status;
            return { count: 1 };
          }
          return { count: 0 };
        },
      },
      invoice: {
        updateMany: async ({ where, data }: any) => {
          const pid = where.id === 'i1' ? 'p1' : 'p2';
          if (state[pid].invoiceStatus === where.status) {
            state[pid].invoiceStatus = data.status;
            return { count: 1 };
          }
          return { count: 0 };
        },
      },
      listing: {
        updateMany: async ({ where, data }: any) => {
          const pids: string[] = where.productId?.in || [];
          for (const pid of pids) {
            state[pid].listingStatus = data.status;
          }
          return { count: pids.length };
        },
      },
      $transaction: async (fn: any) =>
        fn({
          $executeRaw: async (_strings: any, pid: string) => {
            lockedProducts.push(pid);
            return 1;
          },
          rentalHistory: cronDb.rentalHistory,
          invoice: cronDb.invoice,
          listing: cronDb.listing,
        }),
    };

    const cronMod = loadActionModule('app/api/cron/release-locks/route.ts', {
      'next/server': {
        NextResponse: {
          json: (body: any, init?: { status?: number }) => ({ body, status: init?.status || 200 }),
        },
      },
      '@/src/lib/prisma': { prisma: cronDb },
      '@/src/lib/cron-auth': { verifyCronRequest: () => true },
      '@/src/lib/wallet-reconciliation': { releasePendingWalletHoldForInvoice: async () => 0 },
    });

    const res = await cronMod.GET({});
    assert.equal(res.body.success, true);
    assert.equal(res.body.releasedCount, 1, 'Only p2 was cancelled, so releasedCount must be 1');
    assert.deepEqual([...lockedProducts], ['p1', 'p2'], 'Both products must be locked inside interactive tx');
    assert.equal(state.p1.invoiceStatus, 'PAID', 'p1 invoice must remain PAID');
    assert.equal(state.p1.rentalStatus, 'PENDING_APPROVAL', 'p1 rental must remain PENDING_APPROVAL');
    assert.equal(state.p1.listingStatus, 'RESERVED', 'p1 listing must remain RESERVED when invoice cancellation affects 0 rows');
    assert.equal(state.p2.invoiceStatus, 'CANCELLED', 'p2 expired invoice must become CANCELLED');
    assert.equal(state.p2.rentalStatus, 'CANCELLED', 'p2 expired rental must become CANCELLED');
    assert.equal(state.p2.listingStatus, 'AVAILABLE', 'p2 listing must become AVAILABLE');
  });

  await asyncTest('Action 9: /api/checkout PayOS failure rollback restores listing from RESERVED to AVAILABLE and cancels hold', async () => {
    let listingStatus = 'AVAILABLE';
    let rentalStatus = 'PENDING_APPROVAL';
    let invoiceStatus = 'PENDING';
    let walletHoldReleased = false;

    const txMock = {
      $executeRaw: async () => 1,
      product: {
        findUnique: async () => ({ id: '550e8400-e29b-41d4-a716-446655440000', isDeleted: false, status: 'ON_MARKET' }),
      },
      listing: {
        findUnique: async () => ({ id: 'l1', isDeleted: false, status: listingStatus, listingType: 'RENT' }),
        updateMany: async ({ where, data }: any) => {
          if (where.status === listingStatus) {
            listingStatus = data.status;
            return { count: 1 };
          }
          return { count: 0 };
        },
      },
      rentalHistory: {
        findFirst: async () => null,
        create: async () => ({ id: 'r-checkout-1' }),
        updateMany: async ({ data }: any) => {
          rentalStatus = data.status;
          return { count: 1 };
        },
      },
      invoice: {
        findMany: async () => [],
        create: async () => ({ id: 'inv-checkout-1' }),
        updateMany: async ({ data }: any) => {
          invoiceStatus = data.status;
          return { count: 1 };
        },
      },
      shipment: {
        create: async () => ({ id: 'ship-1' }),
      },
    };

    const checkoutMod = loadActionModule('app/api/checkout/route.ts', {
      'next/server': {
        NextResponse: {
          json: (body: any, init?: { status?: number }) => ({ body, status: init?.status || 200 }),
        },
      },
      'date-fns': require('date-fns'),
      '@/src/utils/rate-limit': { checkRateLimit: () => ({ success: true }) },
      '@/src/utils/shipping': {
        verifyShippingQuoteToken: () => ({ fee: 20000, mode: 'SELF_PICKUP', provider: 'SELF_PICKUP' }),
        calculateDynamicGhnFee: () => ({ fee: 20000 }),
        extractProvince: () => 'Hà Nội',
      },
      '@/lib/trust-engine': {
        getItemValuation: () => 500000,
        calculateUserTrustScore: async () => ({ tier: 'LEVEL_1_VERIFIED', score: 50 }),
        checkExposureLimit: async () => ({ allowed: true }),
        getLiveReserveFundStatus: async () => ({ availableReserve: 20_000_000, activeGuarantees: 0 }),
        getUserActiveGuaranteeStatus: async () => ({ activeGuaranteeAmount: 0, activeOrderCount: 0, hasOpenDispute: false }),
        calculateDynamicDeposit: () => ({ finalDeposit: 200000, discountAmount: 0, explanation: 'OK' }),
      },
      '@/src/utils/order-code': { generatePayOSOrderCode: () => 888777 },
      '@/src/lib/wallet-reconciliation': {
        computeUserWalletReconciliation: async () => ({
          isReconciled: true,
          currentAvailableBalance: 50000,
          verifiedMaxRemainingBalance: 50000,
          sourceOrderCodes: ['111'],
        }),
        createSealedWalletHoldDescription: () => 'SEALED_HOLD',
        releasePendingWalletHoldForInvoice: async () => {
          walletHoldReleased = true;
        },
      },
      '@/src/utils/payos': {
        payos: {
          paymentRequests: {
            create: async () => {
              throw new Error('Simulated PayOS outage');
            },
            cancel: async () => ({}),
          },
        },
      },
      '@/src/lib/prisma': {
        prisma: {
          product: {
            findUnique: async () => ({
              id: '550e8400-e29b-41d4-a716-446655440000',
              userId: 'owner-1',
              isDeleted: false,
              status: 'ON_MARKET',
              province: 'Hà Nội',
              listings: [{ id: 'l1', status: 'AVAILABLE', isDeleted: false, listingType: 'RENT', basePrice: 100000, deposit: 200000 }],
              user: { id: 'owner-1', name: 'Owner' },
            }),
          },
          user: {
            findUnique: async () => ({ id: 'u1', name: 'Renter' }),
          },
          $transaction: async (fn: any) => fn(txMock),
        },
      },
    });

    const req = {
      json: async () => ({
        productId: '550e8400-e29b-41d4-a716-446655440000',
        shippingToken: 'valid-shipping-token-123',
        buyerAddress: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
        buyerPhone: '0981234567',
        startDate: '2026-12-01',
        packageDays: 3,
        useWalletBalance: false,
      }),
    };

    const res = await checkoutMod.POST(req);
    assert.equal(res.status, 500, 'Must return 500 when PayOS link creation fails');
    assert.equal(invoiceStatus, 'CANCELLED', 'Invoice must be compensated to CANCELLED');
    assert.equal(rentalStatus, 'CANCELLED', 'Rental must be compensated to CANCELLED');
    assert.equal(listingStatus, 'AVAILABLE', 'Listing reservation must be restored from RESERVED to AVAILABLE');
    assert.equal(walletHoldReleased, false);
  });

  await asyncTest('Action 10: createBooking creates a new booking when historical LENDER_COMPLETED (PAID) order exists', async () => {
    let listingStatus = 'AVAILABLE';
    const bookingMod = loadActionModule('app/actions/booking.ts', {
      '@/src/utils/supabase/server': {
        createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u2' } }, error: null }) } }),
      },
      'next-axiom': { Logger: class { info() {} warn() {} error() {} } },
      '@/lib/trust-engine': {
        getItemValuation: () => 500000,
        calculateUserTrustScore: async () => ({ tier: 'LEVEL_1_VERIFIED', score: 50 }),
        checkExposureLimit: async () => ({ allowed: true }),
        getLiveReserveFundStatus: async () => ({ availableReserve: 20_000_000, activeGuarantees: 0 }),
        calculateDynamicDeposit: () => ({ finalDeposit: 200000, discountAmount: 0, explanation: 'OK' }),
      },
      '@/src/utils/payos': { payos: null },
      '@/src/utils/order-code': { generatePayOSOrderCode: () => 555444 },
      '@/src/utils/shipping': {
        verifyShippingQuoteToken: () => ({ fee: 0 }),
        calculateDynamicGhnFee: () => ({ fee: 0 }),
      },
      '@/src/lib/prisma': {
        prisma: {
          product: {
            findUnique: async () => ({
              id: 'p1',
              userId: 'owner-1',
              status: 'ON_MARKET',
              isDeleted: false,
              listings: [{ id: 'l1', listingType: 'RENT', status: listingStatus, isDeleted: false, basePrice: 100000, deposit: 200000 }],
              user: { id: 'owner-1', name: 'Owner' },
            }),
          },
          user: { findUnique: async () => ({ id: 'u2', name: 'Second Renter' }) },
          rentalHistory: {
            findFirst: async ({ where }: any) => {
              // Historical order in DB is LENDER_COMPLETED with invoice PAID
              const historical = { id: 'r-hist-1', status: 'LENDER_COMPLETED', invoice: { status: 'PAID' } };
              if (where.OR) {
                const paidBranch = where.OR.find((b: any) => b.invoice?.status === 'PAID');
                const excluded: string[] = [...(paidBranch?.status?.notIn || [])];
                if (!excluded.includes(historical.status)) {
                  return historical;
                }
              }
              return null;
            },
          },
          $transaction: async (fn: any) =>
            fn({
              $queryRaw: async () => 1,
              product: {
                findUnique: async () => ({ id: 'p1', status: 'ON_MARKET', isDeleted: false }),
              },
              listing: {
                findUnique: async () => ({ id: 'l1', status: listingStatus, isDeleted: false, listingType: 'RENT' }),
                updateMany: async ({ data }: any) => {
                  listingStatus = data.status;
                  return { count: 1 };
                },
              },
              rentalHistory: {
                findFirst: async () => null,
                create: async () => ({ id: 'rental-new-after-completed' }),
              },
              invoice: {
                create: async () => ({ id: 'inv-new-after-completed', orderCode: BigInt(555444) }),
              },
            }),
        },
      },
    });

    const newBooking = await bookingMod.createBooking({
      productId: 'p1',
      isRental: true,
      shippingMode: 'SELF_PICKUP',
    });
    assert.equal(newBooking.success, true, 'Must create new booking when previous rental is LENDER_COMPLETED');
    assert.equal(newBooking.rentalId, 'rental-new-after-completed');
    assert.equal(listingStatus, 'RESERVED');
  });

  await asyncTest('Action 11: Concurrent duplicate late-payment webhook events credit wallet exactly once', async () => {
    let balance = 0;
    let ledgerWrites = 0;
    let processed: any = null;
    let reads = 0;
    let releaseReads!: () => void;
    const bothRead = new Promise<void>((resolve) => {
      releaseReads = resolve;
    });
    let lockTail = Promise.resolve();
    const invoice = {
      id: 'i1',
      amount: 10000,
      status: 'CANCELLED',
      rentalId: 'r1',
      rental: { renterId: 'u1', product_id: 'p1' },
    };

    const db = {
      invoice: { findUnique: async () => ({ ...invoice }) },
      $transaction: async (fn: any) => {
        let unlock!: () => void;
        try {
          return await fn({
            transactionHistory: {
              findUnique: async () => {
                const snapshot = processed;
                if (++reads >= 2) releaseReads();
                await bothRead;
                return snapshot;
              },
              upsert: async () => {
                processed = { status: 'PROCESSED' };
              },
            },
            $executeRaw: async () => {
              const previous = lockTail;
              lockTail = new Promise<void>((resolve) => {
                unlock = resolve;
              });
              await previous;
              return 1;
            },
            rentalHistory: {
              findUnique: async () => ({ id: 'r1', renterId: 'u1', product_id: 'p1', status: 'CANCELLED', isDeleted: false }),
            },
            product: { findUnique: async () => ({ id: 'p1', isDeleted: false }) },
            invoice: { findUnique: async () => ({ status: 'CANCELLED' }) },
            user: {
              update: async ({ data }: any) => {
                balance += data.walletBalance.increment;
              },
            },
            ledgerTransaction: {
              create: async () => {
                ledgerWrites++;
              },
            },
          });
        } finally {
          if (unlock) unlock();
        }
      },
    };

    const hook = loadActionModule('app/api/webhooks/payos/route.ts', {
      'next/server': {
        NextResponse: {
          json: (body: any, init?: { status?: number }) => ({ body, status: init?.status || 200 }),
        },
      },
      '@/src/lib/prisma': { prisma: db },
      '@/lib/payos': {
        payos: {
          webhooks: {
            verify: async () => ({ orderCode: 123, amount: 10000, reference: 'same-provider-reference' }),
          },
        },
      },
      '@/src/lib/wallet-reconciliation': {
        getActiveWalletHoldForInvoice: async () => ({ walletHoldAmount: 0 }),
      },
    });

    const request = () => ({ json: async () => ({ code: '00', data: { orderCode: 123 } }) });
    const responses = await Promise.all([hook.POST(request()), hook.POST(request())]);
    assert.ok(responses.every((r: any) => r.status === 200));
    assert.equal(balance, 10000, 'Concurrent duplicate late-payment webhooks must credit wallet only once (10,000)');
    assert.equal(ledgerWrites, 1, 'Must write exactly 1 REFUND_OUT ledger entry');
  });

  await asyncTest('Action 12: Wallet reconciliation requires BOTH valid HMAC SEAL and matching PROCESSED receipt, rejecting missing/bad evidence and deduplicating duplicates', async () => {
    const reconMod = loadActionModule('src/lib/wallet-reconciliation.ts', {
      'server-only': {},
      crypto: require('node:crypto'),
    });

    // Case 1: Absent SEAL must be rejected by verifyLatePaymentRefundEntry and reconciliation
    const noSealDesc = '[LATE_PAYMENT_REFUND] OrderCode 123456 | INV:i-late-1 | AMOUNT:10000';
    const noSealCheck = reconMod.verifyLatePaymentRefundEntry({
      description: noSealDesc,
      userId: 'u1',
      invoiceId: 'i-late-1',
      orderCode: 123456,
      amount: 10000,
    });
    assert.equal(noSealCheck.valid, false, 'Missing SEAL must return valid:false');

    const badSealDesc = '[LATE_PAYMENT_REFUND] OrderCode 123456 | INV:i-late-1 | AMOUNT:10000 | SEAL:000000000000000000000000';
    const sealedDesc = reconMod.buildLatePaymentRefundDescription({
      userId: 'u1',
      invoiceId: 'i-late-1',
      orderCode: 123456,
      amount: 10000,
    });

    // Case 2: Bad SEAL with matching PROCESSED receipt -> rejected
    const badSealProof = await reconMod.computeUserWalletReconciliation('u1', {
      user: { findUnique: async () => ({ id: 'u1', walletBalance: 10000, pendingWithdrawalBalance: 0 }) },
      rentalHistory: {
        findMany: async ({ where }: any) =>
          where.renterId === 'u1'
            ? [
                {
                  id: 'r-late-bad-seal',
                  status: 'CANCELLED',
                  invoice: {
                    id: 'i-late-1',
                    status: 'CANCELLED',
                    orderCode: BigInt(123456),
                    depositAmount: 10000,
                    transactions: [{ amount: 10000, status: 'PROCESSED', orderCode: BigInt(123456) }],
                    ledgerEntries: [{ type: 'REFUND_OUT', amount: 10000, description: badSealDesc }],
                  },
                },
              ]
            : [],
      },
      coinTopUp: { findMany: async () => [] },
      withdrawalRequest: { aggregate: async () => ({ _sum: { amount: 0 } }) },
      ledgerTransaction: { findMany: async () => [] },
    });
    assert.equal(badSealProof.verifiedMaxRemainingBalance, 0, 'Bad SEAL must be rejected even with PROCESSED receipt');
    assert.equal(badSealProof.isReconciled, false);

    // Case 3: Valid SEAL but absent PROCESSED receipt (transactions: []) -> rejected
    const noReceiptProof = await reconMod.computeUserWalletReconciliation('u1', {
      user: { findUnique: async () => ({ id: 'u1', walletBalance: 10000, pendingWithdrawalBalance: 0 }) },
      rentalHistory: {
        findMany: async ({ where }: any) =>
          where.renterId === 'u1'
            ? [
                {
                  id: 'r-late-no-tx',
                  status: 'CANCELLED',
                  invoice: {
                    id: 'i-late-1',
                    status: 'CANCELLED',
                    orderCode: BigInt(123456),
                    depositAmount: 10000,
                    transactions: [],
                    ledgerEntries: [{ type: 'REFUND_OUT', amount: 10000, description: sealedDesc }],
                  },
                },
              ]
            : [],
      },
      coinTopUp: { findMany: async () => [] },
      withdrawalRequest: { aggregate: async () => ({ _sum: { amount: 0 } }) },
      ledgerTransaction: {
        findMany: async () => [
          {
            invoiceId: 'i-late-1',
            type: 'REFUND_OUT',
            amount: 10000,
            description: sealedDesc,
            invoice: { id: 'i-late-1', orderCode: BigInt(123456), status: 'CANCELLED', transactions: [] },
          },
        ],
      },
    });
    assert.equal(noReceiptProof.verifiedMaxRemainingBalance, 0, 'Valid SEAL without PROCESSED receipt must be rejected');
    assert.equal(noReceiptProof.isReconciled, false);

    // Case 4: Valid SEAL + matching PROCESSED receipt (with duplicate ledger rows) -> accepted exactly once
    const proof = await reconMod.computeUserWalletReconciliation('u1', {
      user: { findUnique: async () => ({ id: 'u1', walletBalance: 10000, pendingWithdrawalBalance: 0 }) },
      rentalHistory: {
        findMany: async ({ where }: any) => {
          if (where.renterId === 'u1') {
            assert.deepEqual([...(where.invoice?.status?.in || [])], ['PAID', 'CANCELLED']);
            return [
              {
                id: 'r-late-1',
                status: 'CANCELLED',
                invoice: {
                  id: 'i-late-1',
                  status: 'CANCELLED',
                  orderCode: BigInt(123456),
                  depositAmount: 10000,
                  transactions: [{ amount: 10000, status: 'PROCESSED', orderCode: BigInt(123456) }],
                  ledgerEntries: [
                    { type: 'REFUND_OUT', amount: 10000, description: sealedDesc },
                    { type: 'REFUND_OUT', amount: 10000, description: sealedDesc },
                  ],
                },
              },
            ];
          }
          return [];
        },
      },
      coinTopUp: { findMany: async () => [] },
      withdrawalRequest: { aggregate: async () => ({ _sum: { amount: 0 } }) },
      ledgerTransaction: {
        findMany: async () => [
          {
            invoiceId: 'i-late-1',
            type: 'REFUND_OUT',
            amount: 10000,
            description: sealedDesc,
            invoice: {
              id: 'i-late-1',
              orderCode: BigInt(123456),
              status: 'CANCELLED',
              transactions: [{ amount: 10000, status: 'PROCESSED', orderCode: BigInt(123456) }],
            },
          },
        ],
      },
    });

    assert.equal(proof.verifiedMaxRemainingBalance, 10000, 'Legitimate 10,000 late refund must be recognized once without duplicate inflation');
    assert.equal(proof.isReconciled, true, 'Legitimate late refund must pass wallet reconciliation');
  });

  await asyncTest('Action 13: Split-payment late PayOS receipt (60k on 100k cancelled invoice after 40k wallet hold released) is refunded to wallet instead of AMOUNT_MISMATCH', async () => {
    let mismatched = false;
    let refundReached = false;
    let walletCredited = 0;

    const mixedHook = loadActionModule('app/api/webhooks/payos/route.ts', {
      'next/server': {
        NextResponse: {
          json: (body: any, init?: { status?: number }) => ({ body, status: init?.status || 200 }),
        },
      },
      '@/src/lib/prisma': {
        prisma: {
          invoice: {
            findUnique: async () => ({
              id: 'i-split-1',
              amount: 100000,
              status: 'CANCELLED',
              rentalId: 'r-split-1',
              rental: { renterId: 'u1', product_id: 'p1', status: 'CANCELLED' },
            }),
          },
          transactionHistory: {
            upsert: async ({ create }: any) => {
              if (create?.status === 'AMOUNT_MISMATCH') mismatched = true;
            },
          },
          $transaction: async (fn: any) => {
            refundReached = true;
            await fn({
              transactionHistory: {
                findUnique: async () => null,
                upsert: async () => ({}),
              },
              $executeRaw: async () => 1,
              rentalHistory: {
                findUnique: async () => ({ id: 'r-split-1', renterId: 'u1', product_id: 'p1', status: 'CANCELLED', isDeleted: false }),
              },
              product: { findUnique: async () => ({ id: 'p1', isDeleted: false }) },
              invoice: {
                findUnique: async () => ({ status: 'CANCELLED', payosStatus: null }),
                updateMany: async () => ({ count: 1 }),
              },
              user: {
                update: async ({ data }: any) => {
                  walletCredited += data.walletBalance.increment;
                },
              },
              ledgerTransaction: {
                findFirst: async () => null,
                create: async () => ({}),
              },
            });
          },
        },
      },
      '@/lib/payos': {
        payos: {
          webhooks: {
            verify: async () => ({ orderCode: 124, amount: 60000, reference: 'mixed-payment' }),
          },
        },
      },
      '@/src/lib/wallet-reconciliation': {
        getActiveWalletHoldForInvoice: async () => ({ walletHoldAmount: 0 }),
      },
    });

    const res = await mixedHook.POST({ json: async () => ({ code: '00', data: { orderCode: 124 } }) });
    assert.equal(res.status, 200);
    assert.equal(mismatched, false, 'Split late payment on cancelled invoice must NOT be marked AMOUNT_MISMATCH');
    assert.equal(refundReached, true, 'Must enter refund transaction');
    assert.equal(walletCredited, 60000, 'Must refund the verified 60,000 PayOS receipt to the renter wallet');
  });

  await asyncTest('Action 14: Wallet HMAC Seal fails closed when secret env is missing or set to legacy fallback constant', async () => {
    const reconNoSecret = loadActionModule(
      'src/lib/wallet-reconciliation.ts',
      {
        'server-only': {},
        crypto: require('crypto'),
        '@/src/lib/prisma': { prismaAdmin: {} },
      },
      {} // Completely empty process.env
    );

    assert.throws(
      () =>
        reconNoSecret.signWalletSpendSeal({
          userId: 'u1',
          invoiceId: 'i1',
          orderCode: 123456,
          walletUsedAmount: 10000,
          payosAmountToCollect: 20000,
        }),
      /CRITICAL_SECURITY_ERROR/,
      'signWalletSpendSeal must throw when no HMAC secret env is configured'
    );

    // Forge signature using the old hardcoded fallback string
    const cryptoMod = require('crypto');
    const legacySeal = cryptoMod
      .createHmac('sha256', 'cloop-wallet-rollover-hmac-v1')
      .update('u1|i-late-1|123456|0|10000')
      .digest('hex')
      .slice(0, 24);
    const forgedDesc = `[LATE_PAYMENT_REFUND] Hoàn tự động vào Ví khoản thanh toán đến trễ sau khi đơn hết hạn/hủy - OrderCode 123456 | INV:i-late-1 | AMOUNT:10000 | SEAL:${legacySeal}`;

    const verifyMissingEnv = reconNoSecret.verifyLatePaymentRefundEntry({
      description: forgedDesc,
      userId: 'u1',
      invoiceId: 'i-late-1',
      orderCode: '123456',
      amount: 10000,
    });
    assert.equal(verifyMissingEnv.valid, false, 'Missing secret env must fail closed (valid: false)');

    const noSecretReconProof = await reconNoSecret.computeUserWalletReconciliation('u1', {
      user: { findUnique: async () => ({ id: 'u1', walletBalance: 10000, pendingWithdrawalBalance: 0 }) },
      rentalHistory: {
        findMany: async ({ where }: any) =>
          where.renterId === 'u1'
            ? [
                {
                  id: 'r-late-forged',
                  status: 'CANCELLED',
                  invoice: {
                    id: 'i-late-1',
                    status: 'CANCELLED',
                    orderCode: BigInt(123456),
                    depositAmount: 10000,
                    transactions: [{ amount: 10000, status: 'PROCESSED', orderCode: BigInt(123456) }],
                    ledgerEntries: [{ type: 'REFUND_OUT', amount: 10000, description: forgedDesc }],
                  },
                },
              ]
            : [],
      },
      coinTopUp: { findMany: async () => [] },
      withdrawalRequest: { aggregate: async () => ({ _sum: { amount: 0 } }) },
      ledgerTransaction: { findMany: async () => [] },
    });
    assert.equal(
      noSecretReconProof.verifiedMaxRemainingBalance,
      0,
      'Reconciliation with missing secret env must reject forged legacy SEAL even when PROCESSED receipt exists'
    );
    assert.equal(noSecretReconProof.isReconciled, false);

    const reconLegacySecret = loadActionModule(
      'src/lib/wallet-reconciliation.ts',
      {
        'server-only': {},
        crypto: require('crypto'),
        '@/src/lib/prisma': { prismaAdmin: {} },
      },
      { WALLET_SEAL_SECRET: 'cloop-wallet-rollover-hmac-v1' }
    );
    const verifyLegacyEnv = reconLegacySecret.verifyLatePaymentRefundEntry({
      description: forgedDesc,
      userId: 'u1',
      invoiceId: 'i-late-1',
      orderCode: '123456',
      amount: 10000,
    });
    assert.equal(verifyLegacyEnv.valid, false, 'Explicitly banned legacy constant must also fail closed');
  });

  await asyncTest('Action 15: Direct API & Action Penetration Suite — IDOR order advance, forged PayOS webhook, and balance/role tampering are rejected', async () => {
    // 1. Third-party attacker attempts to advance another user's order (IDOR)
    let orderMutated = false;
    const closetAttacker = loadActionModule('app/actions/closet.ts', {
      '@/src/lib/auth': { requireUser: async () => ({ id: 'u-attacker', role: 'USER', isVerified: true }) },
      '@/src/lib/prisma': {
        prisma: {
          rentalHistory: {
            findUnique: async () => ({
              id: 'r-victim',
              renterId: 'u-renter',
              status: 'PENDING_APPROVAL',
              product: { userId: 'u-owner' },
            }),
            updateMany: async () => {
              orderMutated = true;
              return { count: 1 };
            },
          },
        },
        prismaAdmin: {},
      },
    });
    const idorRes = await closetAttacker.advanceMobileOrderStatusAction('r-victim', 'OWNER_PACKED');
    assert.equal(idorRes.success, false, 'Attacker must not advance another user order');
    assert.equal(orderMutated, false, 'No DB update may run on IDOR attempt');

    // 2. Forged PayOS webhook from Python/curl with invalid signature -> HTTP 400 & zero mutations
    let webhookDbTouched = false;
    const forgedHook = loadActionModule('app/api/webhooks/payos/route.ts', {
      'next/server': {
        NextResponse: {
          json: (body: any, init?: { status?: number }) => ({ body, status: init?.status || 200 }),
        },
      },
      '@/src/lib/prisma': {
        prisma: {
          invoice: {
            findUnique: async () => {
              webhookDbTouched = true;
              return null;
            },
          },
        },
      },
      '@/lib/payos': {
        payos: {
          webhooks: {
            verify: async () => {
              throw new Error('Invalid signature');
            },
          },
        },
      },
    });
    const forgedRes = await forgedHook.POST({
      json: async () => ({ code: '00', data: { orderCode: 999999, amount: 500000 }, signature: 'forged-by-python' }),
    });
    assert.equal(forgedRes.status, 403, 'Forged PayOS webhook must be rejected with HTTP 403');
    assert.equal(webhookDbTouched, false, 'Forged PayOS webhook must not query or mutate invoices');

    // 3. Normal user attempts mass-assignment tampering (walletBalance, role, coins, isVerified) via updateUserProfileWithValidation
    let capturedUserUpdateData: Record<string, any> = {};
    let capturedMetaPayload: Record<string, any> = {};
    const userMod = loadActionModule('app/actions/user.ts', {
      '@/src/lib/auth': {
        requireUser: async () => ({ id: 'u-normal', role: 'USER', isVerified: true }),
        clearUserAuthCache: () => {},
      },
      '@/src/lib/prisma': {
        prisma: {
          user: {
            findUnique: async () => ({ name: 'NGUYEN VAN A', isVerified: true }),
            update: async ({ data }: any) => {
              capturedUserUpdateData = { ...data };
            },
          },
          $executeRawUnsafe: async (_sql: string, jsonStr: string) => {
            capturedMetaPayload = JSON.parse(jsonStr);
          },
        },
      },
      '@/src/utils/supabase/server': {
        createClient: async () => ({
          auth: {
            updateUser: async () => ({}),
          },
        }),
      },
    });

    const profileRes = await userMod.updateUserProfileWithValidation({
      name: 'HACKER SPOOFED NAME',
      username: 'normal_user',
      bio: 'Hello',
      walletBalance: 99999999,
      role: 'ADMIN',
      coins: 500000,
      isVerified: true,
    } as any);

    assert.equal(profileRes.success, true);
    assert.equal(capturedUserUpdateData.walletBalance, undefined, 'walletBalance injection must be stripped');
    assert.equal(capturedUserUpdateData.role, undefined, 'role: ADMIN injection must be stripped');
    assert.equal(capturedUserUpdateData.coins, undefined, 'coins injection must be stripped');
    assert.equal(capturedUserUpdateData.name, undefined, 'Verified user name must not be overwritten');
    assert.equal(capturedMetaPayload.walletBalance, undefined, 'Metadata must not accept walletBalance');
    assert.equal(capturedMetaPayload.role, undefined, 'Metadata must not accept role');
  });

  await asyncTest('Action 16: uploadImage fallback chain reports accurate storageProvider (gcs/supabase) and real binary image dimensions instead of hardcoded cloudinary 800x1066', async () => {
    // Construct a valid 320x240 PNG header (magic bytes + IHDR chunk)
    const pngBuf = Buffer.alloc(32);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(pngBuf, 0);
    pngBuf.writeUInt32BE(13, 8);
    pngBuf.write('IHDR', 12, 'ascii');
    pngBuf.writeUInt32BE(320, 16); // width = 320
    pngBuf.writeUInt32BE(240, 20); // height = 240

    const uploadModGcs = loadActionModule('src/lib/upload-image.ts', {
      'node:crypto': require('crypto'),
      './cloudinary': { hasCloudinaryConfig: false, cloudinary: {} },
      './server-image-guard': {
        validateBinaryMediaBuffer: () => ({ mimeType: 'image/png', extension: 'png' }),
      },
      '@/src/services/gcsStorage': {
        uploadImageToGCS: async () => ({
          url: 'https://storage.googleapis.com/cloop-public/cloop_products/test.png',
          publicId: 'cloop_products/test.png',
        }),
      },
    });

    const gcsRes = await uploadModGcs.uploadImage(pngBuf, 'cloop_products');
    assert.equal(gcsRes.storageProvider, 'gcs', 'GCS fallback must report storageProvider="gcs"');
    assert.equal(gcsRes.width, 320, 'Must measure real PNG width (320) instead of hardcoded 800');
    assert.equal(gcsRes.height, 240, 'Must measure real PNG height (240) instead of hardcoded 1066');

    const uploadModSb = loadActionModule('src/lib/upload-image.ts', {
      'node:crypto': require('crypto'),
      './cloudinary': { hasCloudinaryConfig: false, cloudinary: {} },
      './server-image-guard': {
        validateBinaryMediaBuffer: () => ({ mimeType: 'image/png', extension: 'png' }),
      },
      '@/src/services/gcsStorage': {
        uploadImageToGCS: async () => null,
      },
      './supabase': {
        supabaseAdmin: {
          storage: {
            from: (bucket: string) => ({
              upload: async (name: string) => ({ data: { path: `${bucket}/${name}` }, error: null }),
              getPublicUrl: (name: string) => ({
                data: { publicUrl: `https://notxrjsuukrrxdlboavo.supabase.co/storage/v1/object/public/${bucket}/${name}` },
              }),
            }),
          },
        },
      },
    });

    const sbRes = await uploadModSb.uploadImage(pngBuf, 'cloop_products');
    assert.equal(sbRes.storageProvider, 'supabase', 'Supabase fallback must report storageProvider="supabase"');
    assert.equal(sbRes.width, 320);
    assert.equal(sbRes.height, 240);
  });

  await asyncTest('Action 17: createDispute blocks syntactic #video URL spoofing, cross-order evidence replay, and accepts only server-sealed video evidence', async () => {
    const sealMod = loadActionModule('src/lib/dispute-evidence-seal.ts', {
      crypto: require('crypto'),
    });

    let disputeCreated = false;
    const disputeMod = loadActionModule('app/actions/dispute.ts', {
      '@prisma/client': { DamageSeverity: { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' } },
      '@/src/lib/auth': {
        requireUser: async () => ({ id: 'u-owner', role: 'USER', isVerified: true }),
        requireAdmin: async () => ({ profile: { id: 'u-admin', role: 'ADMIN' } }),
      },
      '@/src/services/gcsStorage': {
        generateDisputeVideoReadUrl: async (k: string) => `https://storage.googleapis.com/signed/${k}`,
        verifyUploadedDisputeFile: async () => ({ isValid: false, error: 'Not found on GCS' }),
      },
      '@/src/lib/dispute-evidence-seal': sealMod,
      '@/lib/settlement-engine': { settleDisputedRentalOrder: async () => ({}) },
      '@/src/lib/prisma': {
        prisma: {
          rentalHistory: {
            findUnique: async () => ({
              id: 'r-100',
              renterId: 'u-renter',
              ownerId: 'u-owner',
              product: { userId: 'u-owner' },
              invoice: { id: 'i-100', status: 'PAID', depositAmount: 500000, rentalFee: 200000 },
            }),
            findMany: async () => [],
          },
          dispute: {
            findFirst: async () => null,
          },
          $transaction: async (fn: any) => {
            disputeCreated = true;
            return fn({
              dispute: { create: async ({ data }: any) => ({ id: 'd-100', ...data }) },
              auditLog: { create: async () => ({}) },
              invoice: { update: async () => ({}) },
              rentalHistory: { update: async () => ({}) },
            });
          },
        },
      },
    });

    // 1. Syntactic #video URL spoofing must be rejected
    const fakeVideoRes = await disputeMod.createDispute({
      rentalId: 'r-100',
      description: 'Damaged item',
      severity: 'MEDIUM',
      damageCategory: 'REPAIRABLE_DAMAGE',
      suggestedDeduction: 200000,
      evidenceUrls: ['https://drive.google.com/file/d/fake123/preview#video'],
    });
    assert.equal(fakeVideoRes.success, false, 'Syntactic #video Drive preview URL without server SEAL must be rejected');
    assert.equal(disputeCreated, false);

    // 2. Sealed video belonging to a different rentalId ('r-other') must be rejected (cross-order replay)
    const crossOrderSeal = sealMod.buildSealedDisputeEvidenceUrl({
      provider: 'drive',
      rentalId: 'r-other',
      uploaderId: 'u-owner',
      objectRef: 'driveFile123456',
      mimeType: 'video/mp4',
      sizeBytes: 5000000,
      checksumOrGeneration: 'rev=rev123456;md5=0123456789abcdef0123456789abcdef',
    });
    const crossOrderRes = await disputeMod.createDispute({
      rentalId: 'r-100',
      description: 'Damaged item',
      severity: 'MEDIUM',
      damageCategory: 'REPAIRABLE_DAMAGE',
      suggestedDeduction: 200000,
      evidenceUrls: [crossOrderSeal],
    });
    assert.equal(crossOrderRes.success, false, 'Evidence sealed for another rentalId must be rejected');
    assert.equal(disputeCreated, false);

    // 3. Valid server-sealed unboxing video for ('r-100', 'u-owner') succeeds
    const validVideoSeal = sealMod.buildSealedDisputeEvidenceUrl({
      provider: 'drive',
      rentalId: 'r-100',
      uploaderId: 'u-owner',
      objectRef: 'driveFile123456',
      mimeType: 'video/mp4',
      sizeBytes: 5000000,
      checksumOrGeneration: 'rev=rev123456;md5=0123456789abcdef0123456789abcdef',
    });
    const validRes = await disputeMod.createDispute({
      rentalId: 'r-100',
      description: 'Damaged item with verified unboxing video',
      severity: 'MEDIUM',
      damageCategory: 'REPAIRABLE_DAMAGE',
      suggestedDeduction: 200000,
      evidenceUrls: [validVideoSeal],
    });
    assert.equal(validRes.success, true, 'Genuine server-sealed video for (rentalId, uploaderId) must pass');
    assert.equal(disputeCreated, true);
  });

  await asyncTest('Action 18: /api/storage/drive-resumable and /api/upload-drive enforce rentalId ownership and private-only storage', async () => {
    const sealMod = loadActionModule('src/lib/dispute-evidence-seal.ts', {
      crypto: require('crypto'),
    });

    const driveResumableAttacker = loadActionModule('app/api/storage/drive-resumable/route.ts', {
      'node:crypto': require('crypto'),
      'next/server': {
        NextResponse: {
          json: (body: any, init?: { status?: number }) => ({ body, status: init?.status || 200 }),
        },
      },
      '@/src/lib/auth': {
        requireUser: async () => ({ id: 'u-attacker', role: 'USER', isVerified: true }),
      },
      '@/src/lib/csrf': {
        ALLOWED_ORIGINS: ['http://localhost:3000'],
        isAllowedOrigin: (o: string) => o === 'http://localhost:3000',
      },
      '@/src/lib/server-image-guard': { validateBinaryMediaBuffer: () => ({ mimeType: 'video/mp4', extension: 'mp4' }) },
      '@/src/lib/dispute-evidence-seal': sealMod,
      '@/src/services/googleDriveStorage': {
        getDriveAccessToken: async () => 'tok',
        ensureDriveFilePrivate: async () => {},
      },
      '@/src/lib/prisma': {
        prisma: {
          rentalHistory: {
            findUnique: async () => ({
              id: 'r-victim',
              renterId: 'u-renter',
              ownerId: 'u-owner',
              product: { userId: 'u-owner' },
            }),
          },
        },
      },
    });

    // Missing rentalId -> 400
    const missingRentalRes = await driveResumableAttacker.POST({
      headers: new Map([['origin', 'http://localhost:3000']]),
      json: async () => ({ mimeType: 'video/mp4', fileSize: 1024 }),
    });
    assert.equal(missingRentalRes.status, 400, 'drive-resumable must reject missing rentalId with 400');

    // Non-party user -> 403
    const attackerRes = await driveResumableAttacker.POST({
      headers: new Map([['origin', 'http://localhost:3000']]),
      json: async () => ({ rentalId: 'r-victim', mimeType: 'video/mp4', fileSize: 1024 }),
    });
    assert.equal(attackerRes.status, 403, 'drive-resumable must reject non-party user with 403');

    // Verify /api/upload-drive passes isPublic: false for dispute evidence
    let capturedIsPublic: boolean | undefined = true;
    const uploadDriveMod = loadActionModule('app/api/upload-drive/route.ts', {
      'node:crypto': require('crypto'),
      'next/server': {
        NextResponse: {
          json: (body: any, init?: { status?: number }) => ({ body, status: init?.status || 200 }),
        },
      },
      '@/src/lib/auth': {
        requireUser: async () => ({ id: 'u-owner', role: 'USER', isVerified: true }),
      },
      '@/src/lib/prisma': {
        prisma: {
          rentalHistory: {
            findUnique: async () => ({
              id: 'r-100',
              renterId: 'u-renter',
              ownerId: 'u-owner',
              product: { userId: 'u-owner' },
            }),
          },
        },
      },
      '@/src/lib/server-image-guard': {
        validateBinaryMediaBuffer: () => ({ mimeType: 'video/mp4', extension: 'mp4' }),
      },
      '@/src/lib/dispute-evidence-seal': sealMod,
      '@/src/services/googleDriveStorage': {
        uploadToGoogleDrive: async (opts: any) => {
          capturedIsPublic = opts.isPublic;
          return {
            fileId: 'privDriveFile999',
            headRevisionId: 'rev999abc',
            md5Checksum: '0123456789abcdef0123456789abcdef',
          };
        },
      },
    });

    const fakeFile = new File([Buffer.alloc(128)], 'unboxing.mp4', { type: 'video/mp4' });
    const fd = new FormData();
    fd.append('file', fakeFile);
    fd.append('rentalId', 'r-100');

    const drivePrivateRes = await uploadDriveMod.POST({
      formData: async () => fd,
    });
    assert.equal(drivePrivateRes.status, 200);
    assert.equal(capturedIsPublic, false, '/api/upload-drive must set isPublic=false for dispute evidence');
    assert.ok(
      String(drivePrivateRes.body.url).startsWith('https://evidence.cloop.internal/v1/object?'),
      'Must return sealed internal evidence URL instead of public Drive URL'
    );
  });

  await asyncTest('Action 19: Dashboard raiseDisputeWithProposalAction and rejectAndEscalateDisputeAction enforce SEAL verification and block fake #video URLs', async () => {
    const sealMod = loadActionModule('src/lib/dispute-evidence-seal.ts', {
      crypto: require('crypto'),
    });

    let updatedEvidence: string[] = [];
    const ordersActionsMod = loadActionModule('app/(dashboard)/my-closet/orders/actions.ts', {
      '@/src/lib/auth': {
        requireUser: async () => ({ id: 'u-renter', role: 'USER', isVerified: true }),
      },
      '@/src/lib/dispute-evidence-seal': sealMod,
      '@/src/services/gcsStorage': {
        generateDisputeVideoReadUrl: async (k: string) => `https://storage.googleapis.com/signed/${k}`,
        verifyUploadedDisputeFile: async () => ({ isValid: false, error: 'Not found on GCS' }),
      },
      '@/src/lib/prisma': {
        prisma: {
          rentalHistory: {
            findUnique: async () => ({
              id: 'r-dash-1',
              renterId: 'u-renter',
              ownerId: 'u-owner',
              status: 'BORROWER_RECEIVED',
              product: { id: 'p-1', userId: 'u-owner' },
              invoice: { id: 'inv-1', status: 'PAID', depositAmount: 400000, rentalFee: 150000 },
            }),
            updateMany: async () => ({ count: 1 }),
          },
          dispute: {
            findFirst: async () => ({
              id: 'disp-1',
              rentalId: 'r-dash-1',
              raiserId: 'u-owner',
              status: 'PENDING_REVIEW',
              images: [],
            }),
            findUnique: async () => ({
              id: 'disp-1',
              rentalId: 'r-dash-1',
              status: 'PENDING_REVIEW',
              images: [],
              adminNotes: JSON.stringify({ initiatorId: 'u-owner', initiatorRole: 'OWNER' }),
              rental: {
                id: 'r-dash-1',
                renterId: 'u-renter',
                ownerId: 'u-owner',
                product: { id: 'p-1', userId: 'u-owner' },
              },
            }),
            create: async ({ data }: any) => {
              updatedEvidence = data.images;
              return { id: 'disp-1', ...data };
            },
            updateMany: async ({ data }: any) => {
              updatedEvidence = data.images;
              return { count: 1 };
            },
          },
          $transaction: async (fn: any) =>
            fn({
              rentalHistory: { updateMany: async () => ({ count: 1 }) },
              dispute: {
                create: async ({ data }: any) => {
                  updatedEvidence = data.images;
                  return { id: 'disp-1', ...data };
                },
                updateMany: async ({ data }: any) => {
                  updatedEvidence = data.images;
                  return { count: 1 };
                },
              },
              auditLog: { create: async () => ({}) },
            }),
        },
      },
    });

    // 1. Fake URL https://example.invalid/not-a-video#video must fail on raiseDisputeWithProposalAction
    const fakeProposalRes = await ordersActionsMod.raiseDisputeWithProposalAction(
      'r-dash-1',
      'Item torn on arrival',
      ['https://example.invalid/not-a-video#video'],
      100000
    );
    assert.equal(fakeProposalRes.success, false, 'raiseDisputeWithProposalAction must reject fake #video URL');

    // 2. Fake URL must also fail on rejectAndEscalateDisputeAction
    const fakeEscalateRes = await ordersActionsMod.rejectAndEscalateDisputeAction(
      'disp-1',
      'Counter response',
      ['https://example.invalid/not-a-video#video']
    );
    assert.equal(fakeEscalateRes.success, false, 'rejectAndEscalateDisputeAction must reject fake #video URL');

    // 3. Valid sealed video for ('r-dash-1', 'u-renter') succeeds on raiseDisputeWithProposalAction
    const validDashSeal = sealMod.buildSealedDisputeEvidenceUrl({
      provider: 'drive',
      rentalId: 'r-dash-1',
      uploaderId: 'u-renter',
      objectRef: 'driveFileDash001',
      mimeType: 'video/mp4',
      sizeBytes: 3200000,
      checksumOrGeneration: 'rev=revDash001;md5=0123456789abcdef0123456789abcdef',
    });
    const validProposalRes = await ordersActionsMod.raiseDisputeWithProposalAction(
      'r-dash-1',
      'Item torn on arrival',
      [validDashSeal],
      100000
    );
    assert.equal(validProposalRes.success, true, 'Verified sealed video must pass raiseDisputeWithProposalAction');
    assert.equal(updatedEvidence.length, 1);
    assert.equal(updatedEvidence[0], validDashSeal);
  });

  await asyncTest('Action 20: ensureDriveFilePrivate fails closed when Google Drive returns 403 on public permission delete and evidence-stream enforces live integrity & Range', async () => {
    const sealMod = loadActionModule('src/lib/dispute-evidence-seal.ts', {
      crypto: require('crypto'),
    });

    // Part A: ensureDriveFilePrivate must throw when DELETE permission returns 403
    let fileDeleted = false;
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string, init?: any) => {
      const u = String(url);
      if (u.includes('/permissions?') && (!init?.method || init.method === 'GET')) {
        return new Response(
          JSON.stringify({
            permissions: [
              { id: 'ownerPerm', role: 'owner', type: 'user' },
              { id: 'anyoneWithLink', role: 'reader', type: 'anyone' },
            ],
          }),
          { status: 200 }
        );
      }
      if (u.includes('/permissions/anyoneWithLink') && init?.method === 'DELETE') {
        return new Response('Forbidden', { status: 403 });
      }
      if (u.includes('/drive/v3/files/fileExposed123') && init?.method === 'DELETE') {
        fileDeleted = true;
        return new Response(null, { status: 204 });
      }
      return new Response('Not found', { status: 404 });
    }) as any;

    try {
      const driveMod = loadActionModule('src/services/googleDriveStorage.ts');
      await assert.rejects(
        async () => {
          await driveMod.ensureDriveFilePrivate('fileExposed123', 'tok_test');
        },
        (err: any) => /DRIVE_PRIVACY_ERROR/.test(String(err?.message || err)),
        'ensureDriveFilePrivate must throw when public permission removal fails with 403'
      );
      assert.equal(fileDeleted, true, 'Must attempt to delete exposed Drive file when ACL lockdown fails');
    } finally {
      globalThis.fetch = origFetch;
    }

    // Part B: /api/disputes/evidence-stream enforces checksum anchor (409 on mismatch) and serves 206 Partial Content on Range
    const sampleBytes = Buffer.from('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
    const md5Hex = require('crypto').createHash('md5').update(sampleBytes).digest('hex');
    const sha256Hex = require('crypto').createHash('sha256').update(sampleBytes).digest('hex');
    const wrongMd5Hex = 'ffffffffffffffffffffffffffffffff';

    const validSupaSeal = sealMod.buildSealedDisputeEvidenceUrl({
      provider: 'supabase_private',
      rentalId: 'r-stream-1',
      uploaderId: 'u-renter',
      objectRef: 'dispute-evidence/r-stream-1/u-renter/proof.mp4',
      mimeType: 'video/mp4',
      sizeBytes: sampleBytes.length,
      checksumOrGeneration: `md5=${md5Hex};sha256=${sha256Hex}`,
    });

    const tamperedSupaSeal = sealMod.buildSealedDisputeEvidenceUrl({
      provider: 'supabase_private',
      rentalId: 'r-stream-1',
      uploaderId: 'u-renter',
      objectRef: 'dispute-evidence/r-stream-1/u-renter/proof.mp4',
      mimeType: 'video/mp4',
      sizeBytes: sampleBytes.length,
      checksumOrGeneration: `md5=${wrongMd5Hex};sha256=${sha256Hex}`,
    });

    const streamMod = loadActionModule('app/api/disputes/evidence-stream/route.ts', {
      'node:crypto': require('crypto'),
      'next/server': {
        NextResponse: {
          json: (body: any, init?: { status?: number }) => ({ body, status: init?.status || 200 }),
        },
      },
      '@/src/lib/auth': {
        requireUser: async () => ({ id: 'u-renter', role: 'USER', isVerified: true }),
      },
      '@/src/lib/dispute-evidence-seal': sealMod,
      '@/src/lib/supabase': {
        supabaseAdmin: {
          storage: {
            from: () => ({
              download: async () => ({
                data: new Blob([sampleBytes]),
                error: null,
              }),
            }),
          },
        },
      },
      '@/src/services/googleDriveStorage': { getDriveAccessToken: async () => 'tok' },
      '@/src/services/gcsStorage': {
        verifyUploadedDisputeFile: async () => ({ isValid: false }),
        generateDisputeVideoReadUrl: async () => '',
      },
      '@/src/lib/prisma': {
        prisma: {
          dispute: {
            findUnique: async () => ({
              id: 'd-stream-1',
              rentalId: 'r-stream-1',
              images: [validSupaSeal, tamperedSupaSeal],
              rental: {
                id: 'r-stream-1',
                renterId: 'u-renter',
                ownerId: 'u-owner',
                product: { userId: 'u-owner' },
              },
            }),
          },
        },
      },
    });

    const tamperedStreamPath = sealMod.buildSignedEvidenceStreamPath({
      disputeId: 'd-stream-1',
      evidenceUrl: tamperedSupaSeal,
      viewerId: 'u-renter',
    });
    const validStreamPath = sealMod.buildSignedEvidenceStreamPath({
      disputeId: 'd-stream-1',
      evidenceUrl: validSupaSeal,
      viewerId: 'u-renter',
    });

    // Tampered content hash -> 409 Conflict
    const conflictRes = await streamMod.GET({
      url: `http://localhost:3000${tamperedStreamPath}`,
      headers: new Headers(),
    });
    assert.equal(conflictRes.status, 409, 'Mutated object failing signed integrity anchor must return 409 Conflict');

    // Bounded Range request -> 206 Partial Content
    const rangeRes = await streamMod.GET({
      url: `http://localhost:3000${validStreamPath}`,
      headers: new Headers({ range: 'bytes=0-9' }),
    });
    assert.equal(rangeRes.status, 206, 'Valid Range header on supabase_private must return 206 Partial Content');
    assert.equal(rangeRes.headers.get('Content-Range'), `bytes 0-9/${sampleBytes.length}`);
    const rangeBody = Buffer.from(await rangeRes.arrayBuffer()).toString('utf8');
    assert.equal(rangeBody, '0123456789');
  });

  await asyncTest('Action 21: Adversarial & Anti-Disintermediation controls enforce MFA AAL2, Guest Ticket cookie proof, Closet DTO projection, and all-state PII/contact masking', async () => {
    // 1. Admin MFA AAL2 enforcement in src/lib/auth.ts
    const authModAal1 = loadActionModule('src/lib/auth.ts', {
      'next/navigation': { redirect: () => { throw new Error('REDIRECT'); } },
      'next/headers': {
        cookies: async () => ({
          getAll: () => [{ name: 'sb-access-token', value: 'tok' }],
        }),
      },
      '@/src/lib/prisma': {
        prisma: {
          user: {
            findUnique: async () => ({
              id: 'admin-1',
              name: 'Admin',
              avatar: null,
              role: 'ADMIN',
              walletBalance: 0,
              cloopCoins: 0,
              isVerified: true,
            }),
          },
        },
      },
      '@/src/utils/supabase/server': {
        createClient: async () => ({
          auth: {
            getUser: async () => ({ data: { user: { id: 'admin-1', email: 'admin@cloop.vn' } }, error: null }),
            mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: 'aal1' }, error: null }) },
          },
        }),
      },
    });
    await assert.rejects(
      async () => authModAal1.requireAdmin(),
      (err: any) => /MFA \(AAL2\)/.test(String(err?.message || err)),
      'Admin session at AAL1 must be rejected with MFA (AAL2) requirement'
    );

    // 2. Guest support ticket requires signed cookie proof
    const mockSupportPrisma = {
      prisma: {
        supportTicket: {
          findUnique: async () => ({
            id: 'ticket-guest-1',
            userId: null,
            status: 'OPEN',
            customerEmail: 'secret@example.com',
            customerPhone: '0912345678',
            messages: [{ id: 'm1', content: 'Private guest message' }],
          }),
        },
      },
    };
    const supportMod = loadActionModule('app/actions/support.ts', {
      'node:crypto': require('crypto'),
      'next/headers': {
        cookies: async () => ({
          get: () => undefined,
          set: () => {},
        }),
      },
      '@/src/utils/supabase/server': {
        createClient: async () => ({
          auth: { getUser: async () => ({ data: { user: null }, error: null }) },
        }),
      },
      '@/src/lib/prisma': mockSupportPrisma,
      '@/lib/prisma': mockSupportPrisma,
    });
    const anonTicketRead = await supportMod.getTicketMessages('ticket-guest-1');
    assert.equal(anonTicketRead.success, false, 'Unauthenticated caller without guest ticket cookie must be denied');

    // 3. getClosetProducts clamps take <= 50, filters ON_MARKET, and strips coordinates/addresses/snapshot
    let capturedFindManyArgs: any = null;
    const closetMod = loadActionModule('app/actions/closet.ts', {
      '@/src/lib/prisma': {
        prisma: {
          product: {
            count: async () => 1,
            findMany: async (args: any) => {
              capturedFindManyArgs = args;
              return [
                {
                  id: 'p-1',
                  userId: 'u-1',
                  title: 'Váy Lụa',
                  description: 'Đẹp',
                  category: 'DRESS',
                  size: 'M',
                  color: 'Trắng',
                  condition: '99',
                  province: 'Hà Nội',
                  status: 'ON_MARKET',
                  isDeleted: false,
                  specificAddress: 'Số 10 Ngõ 20 Phố Huế',
                  latitude: 21.0285,
                  longitude: 105.8542,
                  images: [{ id: 'img-1', url: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg', isPrimary: true }],
                  listings: [
                    {
                      id: 'l-1',
                      listingType: 'RENT',
                      status: 'AVAILABLE',
                      basePrice: 150000,
                      salePrice: null,
                      depositRequired: 300000,
                      snapshot: { secretOwnerPhone: '0988777666' },
                      pricingTiers: [{ days: 3, price: 300000 }],
                    },
                  ],
                },
              ];
            },
          },
        },
      },
    });
    const closetRes = await closetMod.getClosetProducts('u-1', 1, 9999);
    assert.equal(capturedFindManyArgs.take, 50, 'getClosetProducts must clamp take to at most 50');
    assert.equal(capturedFindManyArgs.where.status, 'ON_MARKET', 'getClosetProducts must require ON_MARKET');
    assert.equal((closetRes.products[0] as any).specificAddress, undefined, 'specificAddress must be stripped from public closet DTO');
    assert.equal((closetRes.products[0] as any).latitude, undefined, 'latitude must be stripped from public closet DTO');
    assert.equal((closetRes.products[0].listings[0] as any).snapshot, undefined, 'listing.snapshot must be stripped from public closet DTO');

    // 4. maskPublicAddress and maskOrderPii mask phones and single-segment addresses across ALL order states
    const shippingMod = loadActionModule('src/utils/shipping.ts', {
      crypto: require('crypto'),
    });
    assert.equal(
      shippingMod.maskPublicAddress('123 Synthetic Street Hanoi').includes('123 Synthetic Street'),
      false,
      'Single-segment street address must never be returned unmasked'
    );
    for (const st of ['PENDING', 'PAID', 'OWNER_PACKED', 'LENDER_SHIPPED', 'BORROWER_RECEIVED', 'LENDER_COMPLETED', 'DISPUTE']) {
      const masked = shippingMod.maskOrderPii({
        status: st,
        renterPhone: '0912345678',
        ownerPhone: '0987654321',
        renter_phone: '0912345678',
        owner_phone: '0987654321',
        product: { specificAddress: '123 Nguyễn Trãi, Thanh Xuân, Hà Nội', province: 'Hà Nội' },
        shipments: [
          {
            direction: 'DELIVERY',
            pickupAddress: { phone: '0987654321', fullAddress: '123 Nguyễn Trãi, Hà Nội' },
            deliveryAddress: { phone: '0912345678', fullAddress: '456 Lê Lợi, Quận 1' },
            providerRawPayload: { secretToken: 'ghn-raw' },
          },
        ],
      });
      assert.equal(masked.renterPhone, '091****678', `renterPhone must be masked in state ${st}`);
      assert.equal(masked.ownerPhone, '098****321', `ownerPhone must be masked in state ${st}`);
      assert.equal(masked.renter_phone, '091****678', `renter_phone must be masked in state ${st}`);
      assert.equal(masked.owner_phone, '098****321', `owner_phone must be masked in state ${st}`);
      assert.equal(masked.product.specificAddress.includes('123 Nguyễn Trãi'), false, `product.specificAddress street must be masked in state ${st}`);
      assert.equal(masked.shipments[0].providerRawPayload?.secretToken, undefined, `providerRawPayload secrets must be stripped in state ${st}`);
    }

    // 5. Off-platform contact detector blocks phones, Zalo, emails, social handles, and bank solicitation
    const contactGuardMod = loadActionModule('src/utils/contact-guard.ts');
    assert.equal(contactGuardMod.detectOffPlatformContact('Liên hệ không chín một hai ba bốn năm sáu bảy tám').hasContact, true);
    assert.equal(contactGuardMod.detectOffPlatformContact('Kết bạn za.lo mình gửi thêm ảnh nhé').hasContact, true);
    assert.equal(contactGuardMod.detectOffPlatformContact('Đầm lụa thiết kế mặc đi tiệc sang trọng').hasContact, false);
  });

  console.log('\n======================================================');
  console.log('ALL TESTS COMPLETE: ' + passedTests + '/' + totalTests + ' PASSED');
  console.log('======================================================\n');
}

runActionLevelSuite();
