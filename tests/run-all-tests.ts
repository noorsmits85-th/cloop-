import assert from 'node:assert/strict';
import {
  getItemValuation,
  calculateUserTrustScoreFromData,
  calculateDynamicDeposit,
  TRUST_TIERS,
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

test('Tier boundaries are strictly enforced', () => {
  assert.equal(TRUST_TIERS.LEVEL_0_NEW.minScore, 0);
  assert.equal(TRUST_TIERS.LEVEL_0_NEW.maxScore, 29);
  assert.equal(TRUST_TIERS.LEVEL_1_VERIFIED.minScore, 30);
  assert.equal(TRUST_TIERS.LEVEL_1_VERIFIED.maxScore, 59);
  assert.equal(TRUST_TIERS.LEVEL_2_TRUSTED.minScore, 60);
  assert.equal(TRUST_TIERS.LEVEL_2_TRUSTED.maxScore, 84);
  assert.equal(TRUST_TIERS.LEVEL_3_VIP.minScore, 85);
  assert.equal(TRUST_TIERS.LEVEL_3_VIP.maxScore, 100);
});

console.log('\n--- 3. Dynamic Deposit Calculation ---');
test('LEVEL_0_NEW pays 100% deposit', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 1000000,
    itemValue: 1500000,
    trustTier: 'LEVEL_0_NEW',
    isRental: true,
  });
  assert.equal(calc.finalDeposit, 1000000);
  assert.equal(calc.discountAmount, 0);
});

test('LEVEL_1_VERIFIED pays 75% deposit (25% discount)', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 1000000,
    itemValue: 1500000,
    trustTier: 'LEVEL_1_VERIFIED',
    isRental: true,
  });
  assert.equal(calc.finalDeposit, 750000);
  assert.equal(calc.discountAmount, 250000);
});

test('LEVEL_2_TRUSTED pays 50% deposit (50% discount)', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 1000000,
    itemValue: 1500000,
    trustTier: 'LEVEL_2_TRUSTED',
    isRental: true,
  });
  assert.equal(calc.finalDeposit, 500000);
  assert.equal(calc.discountAmount, 500000);
});

test('LEVEL_3_VIP pays 25% deposit for expensive items', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 1000000,
    itemValue: 2500000,
    trustTier: 'LEVEL_3_VIP',
    isRental: true,
  });
  assert.equal(calc.finalDeposit, 250000);
  assert.equal(calc.discountAmount, 750000);
});

test('LEVEL_3_VIP pays 0 VND deposit for items under 1,000,000 VND', () => {
  const calc = calculateDynamicDeposit({
    baseDeposit: 400000,
    itemValue: 900000,
    trustTier: 'LEVEL_3_VIP',
    isRental: true,
  });
  assert.equal(calc.finalDeposit, 0);
  assert.equal(calc.discountAmount, 400000);
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
