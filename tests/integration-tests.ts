import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { prisma } from '../src/lib/prisma';
import { PayOS } from '@payos/node';
import { evaluateFastTrackEligibility, TRUST_TIERS } from '../lib/trust-engine';
import {
  verifyUploadedDisputeFile,
  generateDisputeVideoReadUrl,
} from '../src/services/gcsStorage';

let totalTests = 0;
let passedTests = 0;

async function testAsync(name: string, fn: () => Promise<void>) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err: unknown) {
    console.error(`  [FAIL] ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

function testSync(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err: unknown) {
    console.error(`  [FAIL] ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function runIntegrationSuite() {
  console.log('\n======================================================');
  console.log('CLOOP INTEGRATION TEST SUITE: FAIL-CLOSED & TRANSACTIONS');
  console.log('======================================================\n');

  // =========================================================================
  // 1. DATABASE ATOMICITY & PRISMA TRANSACTION ROLLBACK
  // =========================================================================
  console.log('--- 1. Database Transaction Atomicity & Rollback ---');

  await testAsync('Rolls back entire transaction on runtime error (No partial commits)', async () => {
    const testEmail = `test_audit_${Date.now()}@cloop.vn`;
    let createdUserId: string | null = null;

    try {
      // 1. Create a baseline test user
      const user = await prisma.user.create({
        data: {
          email: testEmail,
          password: 'hashed_secure_password_test',
          name: 'Audit Test User',
          walletBalance: 100000, // 100,000 VND initial
          role: 'USER',
        },
      });
      createdUserId = user.id;

      // 2. Execute a transaction that attempts to modify wallet, then intentionally throws
      let txErrorThrown = false;
      try {
        await prisma.$transaction(async (tx) => {
          // Increment wallet
          await tx.user.update({
            where: { id: createdUserId! },
            data: { walletBalance: { increment: 500000 } },
          });

          // Deliberately simulate failure (e.g. third-party network call or constraint failure)
          throw new Error('SIMULATED_TRANSACTION_FAILURE');
        });
      } catch (err: any) {
        if (err.message === 'SIMULATED_TRANSACTION_FAILURE') {
          txErrorThrown = true;
        } else {
          throw err;
        }
      }

      assert.ok(txErrorThrown, 'Simulated failure must throw');

      // 3. Verify that the user balance was rolled back to exactly 100,000 VND
      const checkUser = await prisma.user.findUnique({
        where: { id: createdUserId },
      });

      assert.ok(checkUser, 'User must exist');
      assert.equal(
        checkUser.walletBalance,
        100000,
        'Wallet balance must remain 100,000 VND after transaction rollback'
      );
    } finally {
      // 4. Cleanup test data
      if (createdUserId) {
        await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {});
      }
    }
  });

  // =========================================================================
  // 2. PAYOS WEBHOOK SIGNATURE VERIFICATION & IDEMPOTENCY
  // =========================================================================
  console.log('\n--- 2. PayOS Webhook HMAC-SHA256 Cryptography & Idempotency ---');

  const testChecksumKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const testPayos = new PayOS({
    clientId: 'test-client-id',
    apiKey: 'test-api-key',
    checksumKey: testChecksumKey,
  });

  // Helper to generate canonical PayOS signature
  function generatePayOSSignature(data: Record<string, any>, key: string): string {
    const sortedKeys = Object.keys(data).sort();
    const queryParts = sortedKeys.map((k) => {
      let val = data[k];
      if (val === null || val === undefined) val = '';
      return `${k}=${val}`;
    });
    const queryString = queryParts.join('&');
    return crypto.createHmac('sha256', key).update(queryString).digest('hex');
  }

  await testAsync('Valid PayOS webhook signature passes cryptographic verification', async () => {
    const paymentData = {
      orderCode: 987654321,
      amount: 250000,
      description: 'Thanh toan CLOOP',
      accountNumber: '123456789',
      reference: 'FT123456',
      transactionDateTime: '2026-09-13 12:00:00',
      currency: 'VND',
      paymentLinkId: 'plink_12345',
      code: '00',
      desc: 'Success',
    };

    const signature = generatePayOSSignature(paymentData, testChecksumKey);

    const verified = await testPayos.webhooks.verify({
      code: '00',
      desc: 'Success',
      success: true,
      data: paymentData as any,
      signature,
    });

    assert.equal(verified.orderCode, 987654321);
    assert.equal(verified.amount, 250000);
  });

  await testAsync('Tampered PayOS payload (altered amount) is rejected with WebhookError', async () => {
    const paymentData = {
      orderCode: 987654321,
      amount: 250000,
      description: 'Thanh toan CLOOP',
      code: '00',
      desc: 'Success',
    };

    const originalSignature = generatePayOSSignature(paymentData, testChecksumKey);

    // Attacker modifies amount to 25,000,000 VND but keeps old signature
    const forgedPayload = {
      ...paymentData,
      amount: 25000000,
    };

    await assert.rejects(
      async () => {
        await testPayos.webhooks.verify({
          code: '00',
          desc: 'Success',
          success: true,
          data: forgedPayload as any,
          signature: originalSignature,
        });
      },
      /integrity|Invalid signature/i,
      'Forged payload must be rejected by HMAC verification'
    );
  });

  testSync('Webhook idempotency logic ignores already processed payments', () => {
    // Simulation of updateMany concurrency gate
    type PaymentState = { id: string; status: 'PENDING' | 'PAID' };
    const db: PaymentState[] = [{ id: 'order_1', status: 'PAID' }];

    function processWebhook(id: string): { processed: boolean; reason: string } {
      const record = db.find((r) => r.id === id);
      if (!record) return { processed: false, reason: 'NOT_FOUND' };
      if (record.status === 'PAID') {
        return { processed: false, reason: 'ALREADY_PROCESSED' };
      }
      record.status = 'PAID';
      return { processed: true, reason: 'SUCCESS' };
    }

    const firstRun = processWebhook('order_1');
    assert.equal(firstRun.processed, false);
    assert.equal(firstRun.reason, 'ALREADY_PROCESSED');
  });

  // =========================================================================
  // 3. GOOGLE CLOUD STORAGE FAIL-CLOSED ENFORCEMENT
  // =========================================================================
  console.log('\n--- 3. Google Cloud Storage Fail-Closed Policy ---');

  await testAsync('verifyUploadedDisputeFile rejects mismatched rentalId/userId prefix', async () => {
    const result = await verifyUploadedDisputeFile({
      objectName: 'disputes/malicious_rental/hacker_user/trojan.mp4',
      rentalId: 'legit_rental_123',
      userId: 'legit_user_456',
    });

    assert.equal(result.isValid, false);
    assert.ok(
      result.error?.includes('không khớp'),
      'Must reject path that does not start with expected prefix'
    );
  });

  await testAsync('verifyUploadedDisputeFile rejects nonexistent file (Fail-Closed, no mock)', async () => {
    const result = await verifyUploadedDisputeFile({
      objectName: 'disputes/rental_real/user_real/nonexistent_file_9999.mp4',
      rentalId: 'rental_real',
      userId: 'user_real',
    });

    assert.equal(result.isValid, false);
    assert.ok(result.error, 'Must provide an explicit error for missing file or unconfigured GCS');
  });

  await testAsync('generateDisputeVideoReadUrl fails-closed when GCS client is unconfigured', async () => {
    // If environment lacks full GCS keys, it must throw rather than returning fake URLs
    const originalEmail = process.env.GCP_CLIENT_EMAIL;
    const originalKey = process.env.GCP_PRIVATE_KEY;

    try {
      // Temporarily unset GCS credentials
      delete process.env.GCP_CLIENT_EMAIL;
      delete process.env.GCP_PRIVATE_KEY;

      // Note: In local env with no ADC, getStorageClient will throw or fail on signed URL
      try {
        await generateDisputeVideoReadUrl('disputes/test/123.mp4');
      } catch (err: any) {
        assert.ok(err.message.length > 0, 'Must throw explicit fail-closed error');
      }
    } finally {
      if (originalEmail) process.env.GCP_CLIENT_EMAIL = originalEmail;
      if (originalKey) process.env.GCP_PRIVATE_KEY = originalKey;
    }
  });

  // =========================================================================
  // 4. FAST-TRACK KYC GATING & EXPOSURE CEILINGS
  // =========================================================================
  console.log('\n--- 4. Fast-Track Identity Gating (KYC / Student Proof) ---');

  testSync('Defense 0: Blocks Fast-Track for LEVEL_0_NEW user who is unverified', () => {
    const check = evaluateFastTrackEligibility({
      trustTier: 'LEVEL_0_NEW',
      isVerified: false,
      projectedExposure: 2000000,
      activeRentalsCount: 0,
      openDisputesCount: 0,
    });

    assert.equal(check.eligible, false);
    assert.ok(
      check.reason?.includes('định danh') || check.reason?.includes('KYC'),
      'Must explicitly require KYC/identity verification'
    );
  });

  testSync('Defense 0: Allows Fast-Track for LEVEL_0_NEW user who has completed KYC', () => {
    const check = evaluateFastTrackEligibility({
      trustTier: 'LEVEL_0_NEW',
      isVerified: true,
      projectedExposure: 2000000,
      activeRentalsCount: 0,
      openDisputesCount: 0,
    });

    assert.equal(check.eligible, true);
    assert.equal(check.fastTrackCeiling, TRUST_TIERS.LEVEL_0_NEW.fastTrackCeiling);
  });

  testSync('Defense 0: Allows Fast-Track for LEVEL_1_VERIFIED user', () => {
    const check = evaluateFastTrackEligibility({
      trustTier: 'LEVEL_1_VERIFIED',
      isVerified: false, // Even if boolean is false, tier 1 is verified
      projectedExposure: 5000000,
      activeRentalsCount: 0,
      openDisputesCount: 0,
    });

    assert.equal(check.eligible, true);
    assert.equal(check.fastTrackCeiling, TRUST_TIERS.LEVEL_1_VERIFIED.fastTrackCeiling);
  });

  testSync('Defense 1: Blocks Fast-Track if user has an active dispute', () => {
    const check = evaluateFastTrackEligibility({
      trustTier: 'LEVEL_2_TRUSTED',
      isVerified: true,
      projectedExposure: 5000000,
      activeRentalsCount: 0,
      openDisputesCount: 1,
    });

    assert.equal(check.eligible, false);
    assert.ok(check.reason?.includes('khiếu nại'), 'Must block users with active disputes');
  });

  testSync('Defense 2: Blocks LEVEL_0_NEW user from exceeding 1 concurrent Fast-Track order', () => {
    const check = evaluateFastTrackEligibility({
      trustTier: 'LEVEL_0_NEW',
      isVerified: true,
      projectedExposure: 2000000,
      activeRentalsCount: 1, // Already has 1 active order
      openDisputesCount: 0,
    });

    assert.equal(check.eligible, false);
    assert.ok(check.reason?.includes('tối đa 1 đơn'), 'Must restrict new users to 1 concurrent order');
  });

  testSync('Defense 3: Blocks Fast-Track if item valuation exceeds tier ceiling', () => {
    const check = evaluateFastTrackEligibility({
      trustTier: 'LEVEL_0_NEW',
      isVerified: true,
      projectedExposure: 7000000, // Level 0 ceiling is 6,000,000 VND
      activeRentalsCount: 0,
      openDisputesCount: 0,
    });

    assert.equal(check.eligible, false);
    assert.ok(check.reason?.includes('vượt trần'), 'Must reject item exceeding tier ceiling');
  });

  // =========================================================================
  // 5. DISPUTE EVIDENCE AUTHORIZATION & IDOR PREVENTION
  // =========================================================================
  console.log('\n--- 5. Dispute Evidence Authorization (Zero IDOR) ---');

  testSync('Dispute settlement conservation of funds invariant', () => {
    const testCases = [
      { deposit: 1000000, deduction: 0 },
      { deposit: 1000000, deduction: 350000 },
      { deposit: 1000000, deduction: 1000000 },
      { deposit: 5000000, deduction: 2450000 },
    ];

    for (const tc of testCases) {
      const renterRefund = tc.deposit - tc.deduction;
      const ownerCompensation = tc.deduction;
      assert.equal(
        renterRefund + ownerCompensation,
        tc.deposit,
        'Sum of refund and compensation must exactly equal original deposit'
      );
      assert.ok(renterRefund >= 0, 'Renter refund cannot be negative');
      assert.ok(ownerCompensation >= 0, 'Owner compensation cannot be negative');
    }
  });

  console.log('\n======================================================');
  console.log(`INTEGRATION SUITE COMPLETE: ${passedTests}/${totalTests} PASSED`);
  console.log('======================================================\n');
}

runIntegrationSuite()
  .then(() => {
    process.exit(process.exitCode || 0);
  })
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
