import assert from 'node:assert/strict';
import {
  getItemValuation,
  calculateUserTrustScoreFromData,
  calculateDynamicDeposit,
  TRUST_TIERS,
  CONSERVATIVE_TIER_RULES,
} from '../lib/trust-engine';
import { maskPhone, maskEmail } from '../lib/data-privacy';

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

console.log('\n======================================================');
console.log('ALL TESTS COMPLETE: ' + passedTests + '/' + totalTests + ' PASSED');
console.log('======================================================\n');
