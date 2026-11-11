# Fifth scoped recheck

Date: 2026-11-11, Asia/Saigon. Review only, no application/database mutation.

## Result

TypeScript passes (exit 0); current suite passes 77/77. The four exact FOURTH_RECHECK cases now have relevant production-code changes and action tests: duplicate late refunds recheck processing under the product lock and conditionally claim LATE_REFUNDED, cancelled refunds enter reconciliation, released original wallet holds are retained for split receipts, and cron holds its product locks within an interactive transaction with cancellation-dependent inventory release. These are meaningful fixes. No new failure of those exact four cases was reproduced during this review. Real PostgreSQL/provider integration remains unverified.

## Remaining finding: MEDIUM — refund proof still fails open on missing SEAL/provider receipt

`src/lib/wallet-reconciliation.ts:147-160` verifies HMAC only if a SEAL regex match exists. With no SEAL at all, verifyLatePaymentRefundEntry returns valid:true at line 163, provided the description prefix, invoice and positive amount are present.

The cancelled-invoice reconciliation branch (`453-483`) accepts sealCheck.valid when transactions is empty. Thus an unsigned refund description with zero provider receipts becomes a verified wallet inflow. Conversely, when a PROCESSED receipt exists, this branch tests receipt amount but does not also require sealCheck.valid: the claimed requirement of matching provider evidence AND signature is not implemented.

Reproduced by executing the actual reconciliation module after TypeScript transpilation with mocked database results:

- Description: `[LATE_PAYMENT_REFUND] OrderCode 123 | INV:i1 | AMOUNT:10000` (no SEAL).
- verifyLatePaymentRefundEntry returns valid:true.
- A CANCELLED invoice with transactions:[] and that 10,000 REFUND_OUT yields verifiedMaxRemainingBalance=10000 and isReconciled=true for walletBalance=10000.

This is a defense-in-depth/reconciliation-integrity defect. No ordinary user's ability to insert or alter a server ledger row was demonstrated, and this is not evidence of a direct unauthenticated money-minting exploit. However, incomplete/legacy/corrupt records can be blessed as verified, contrary to the new proof contract. Test accommodations in the production branch (`477`: fallback when mock omits relations) must not weaken real validation.

Fix: require every identity/amount field and a correctly formatted SEAL; reject missing or invalid signatures. For cancelled refund credit proof, require a matching PROCESSED provider receipt AND a valid signature, with invoice/order/user binding and deduplication. Construct complete receipts in mocks rather than relaxing production checks. Add tests for absent/malformed SEAL, bad SEAL with a matching receipt, absent receipt with a valid SEAL, and duplicate valid entries. Do not remove reconciliation guards or change wallet balances to hide failures.

## Verification limits

The above reproduction used an inline isolated Node harness, actual transpiled exports and mocked Prisma inputs; no provider, database or wallet was touched. Existing 77 tests ran successfully; intentional simulated PayOS outage output belongs to the passing compensation test. No deployment readiness claim, live security scan or actual PostgreSQL concurrency result is made. This report follows the existing focused vibe-check review; the user's Argon waiver remains applicable.

Recommended closure: fix this proof predicate, test missing/invalid evidence and rollback against an isolated database, then freeze the review scope to these payment/booking invariants for acceptance. New unrelated feature/security work should be tracked separately rather than repeatedly claiming absolute completeness.
