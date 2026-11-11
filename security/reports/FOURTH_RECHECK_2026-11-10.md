# Fourth remediation recheck

Date: 2026-11-10 (Asia/Saigon). Scope: current code and the latest claims about THIRD_RECHECK remediation, including the new late-payment refund behavior. Direct review authorized by the user's earlier Argon-bridge waiver. Application/database unchanged by this review; only review artifacts added. This is a focused vibe-check follow-up, not a complete deployed audit.

## Verdict

Confirmed: TypeScript exits 0; the current suite passes 74/74; callback name freezing and checkout reservation compensation are present. The prior unconditional PAID-to-CANCELLED invoice update is now guarded. However, the new late-refund branch is not concurrency-idempotent, legitimate refund credits are omitted from wallet reconciliation, split-payment refunds can be rejected before handling, and the cron's row locks do not span its read/write transaction.

## 1. HIGH — Concurrent duplicate late-payment events credit the wallet twice

`app/api/webhooks/payos/route.ts:363-370` reads TransactionHistory and checks PROCESSED before acquiring the product lock (`385-386`). Two requests for the same signed successful event can both read an unprocessed transaction before either holds that lock.

After acquiring the lock, the late-refund branch does not recheck/conditionally claim processing. It upserts the same TransactionHistory row (`419-440`), increments walletBalance (`442-446`) and creates REFUND_OUT (`449-456`). A unique orderCode/eventId on the history row does not prevent this: the second upsert updates the existing row and then credits the wallet again. All operations can commit successfully, so wrapping them in transactions alone does not prevent duplicate credit.

Reproduced with actual transpiled webhook handler and a mock product mutex held until each transaction finishes: both handlers read null history first; one waits for the other's product lock; both return HTTP 200; one verified 10,000 payment yields 20,000 wallet credit and two refund ledger entries. No signature bypass was attempted: the fixture represents duplicate delivery of the same verified event. This is a controlled application interleaving, not a live database race test.

Fix: after taking the shared lock, atomically claim a unique refund/payment settlement state and credit only if that claim succeeds; or use a unique refund entitlement insert that rolls back losing attempts. Include the wallet increment and ledger entry in the same transaction. Recheck history under the lock and avoid unconditional update-as-claim. Verify concurrent duplicate webhook deliveries, retries and multiple server instances credit exactly once. Existing reconciliation may block spending/withdrawal of the duplicate credit; this review does not demonstrate actual cash extraction.

## 2. HIGH — Legitimate late-payment refunds cannot pass wallet reconciliation

The new late-refund path credits walletBalance and records a completed REFUND_OUT while leaving the original invoice CANCELLED. This is reasonable as a lifecycle choice, but the reconciliation source model was not extended.

`src/lib/wallet-reconciliation.ts:243-267` counts renter refunds only where the related invoice is PAID. Its other ledger query (`290-308`) recognizes wallet-rollover descriptions, not the new generic late-refund description. It does not use the new TransactionHistory.latePaymentRefundedToWallet evidence as another source.

Thus the newly credited amount is absent from verifiedMaxRemainingBalance. Actual reconciliation module execution with a 10,000 legitimate late refund and no unrelated sources returned verifiedMaxRemainingBalance=0 and isReconciled=false. Wallet checkout and withdrawal use this proof, so legitimate refunded money can appear in the UI while being blocked as an unexplained balance. The source allows 2,000 discrepancy; that tolerance does not solve larger legitimate refunds.

Fix: model late-payment refund entitlements explicitly in the reconciliation sources, backed by verified provider receipts and a unique completed credit. Do not simply disable reconciliation or mark a cancelled booking paid to bypass it. Verify one valid late refund is spendable/withdrawable exactly once, duplicate ledger records cannot inflate proof, and the provider amount matches the credited entitlement.

## 3. HIGH — Released wallet holds cause legitimate split late payments to be discarded

`app/api/webhooks/payos/route.ts:305-351` computes the expected PayOS amount from the currently active wallet hold before reaching the cancelled/archived refund branch.

For a 100,000 invoice with 40,000 wallet contribution and 60,000 PayOS contribution, checkout compensation or a cancellation can already have released/refunded the 40,000 hold. getActiveWalletHoldForInvoice then returns zero. The handler defaults expectedPayosAmount to the full 100,000 and classifies the actual 60,000 provider payment as AMOUNT_MISMATCH, returning HTTP 200 before executing late-refund handling. The provider money is therefore not credited/refunded by this new automatic flow; it requires manual reconciliation or another repair path.

Reproduced with actual webhook module, a CANCELLED 100,000 invoice, released wallet hold, and verified 60,000 receipt: AMOUNT_MISMATCH is recorded, no refund transaction is entered, and response is 200.

Fix: preserve the immutable original checkout funding split/provider-link expected amount separately from the currently active hold. Validate late receipts against that original payment obligation, and distinguish returning the wallet hold from refunding the external receipt. Verify both cancellation orderings, mixed funding, amount mismatch and late success without losing or double-returning either funding component.

## 4. MEDIUM — Cron lock is released before cancellation; listing mutation ignores cancellation outcome

`app/api/cron/release-locks/route.ts:33-39` issues SELECT FOR UPDATE through the global prisma client outside an explicit transaction. PostgreSQL releases that lock when that standalone statement's transaction finishes; it does not protect the later paid-product query or the separate `$transaction([...])`. Exceptions are also silently swallowed.

If payment commits after paidRentals is read but before the mutation transaction, the new status predicates can correctly yield zero cancelled rentals/invoices. However, the listing update (`83-88`) still executes unconditionally for safeToReleaseProductIds computed earlier. `cancelledInvoicesCount` is checked only after all writes commit (`91-92`); setting releasedCount=0 does not undo the listing mutation.

Reproduced with actual cron handler and lazy mock operations: a webhook commits PAID between the eligibility read and mutation transaction; invoice remains PAID and rental remains PENDING_APPROVAL, but listing becomes AVAILABLE despite response releasedCount=0. This fixes the original invoice overwrite but leaves inventory/hold consistency broken. The separate booking expiry release path has the same array-transaction/listing-before-count pattern (`app/actions/booking.ts:407-433`).

Fix: use an interactive transaction, acquire the product lock through tx, reread eligibility inside that transaction, and release only listings belonging to successfully cancelled holds with no other live reservation. Abort on lock failure. Count checks must control whether mutation occurs, not merely change a response after commit. Verify payment immediately before/after the eligibility read, per-item outcomes in multi-product batches, and completed historical paid orders do not indefinitely prevent future hold expiry.

## What is fixed / limitations of identity claim

- Auth callback no longer overwrites an existing/nonempty or verified name from metadata; new OAuth/password-created profiles no longer inherit isVerified=true merely from email/OAuth.
- Prior beneficiary query failures are no longer swallowed with catch-to-null.
- BENEFICIARY_KYC_LOCKED audit records are consulted by bank linkage/withdrawal, and first bank linkage creates one when absent.
- This is still a name-consistency record, not independent verification of legal identity or account ownership: first linkage trusts User.name plus isVerified, the latter is still granted by phone/micro-payment flows, and comparison accepts two common name tokens. The stored account number is not enforced as an immutable beneficiary account by these comparisons. Do not describe this audit record as proof that the bank verified that name/account-number pair. No new callback overwrite was reproduced after this patch.
- Checkout's provider-error compensation now locks the product, conditionally cancels a pending invoice, releases wallet hold and conditionally restores the listing. The earlier missing-listing-compensation defect is addressed in this handler by source inspection and the existing failure-path test.

## Executed verification

- `npx.cmd tsc --noEmit --incremental false`: exit 0, no diagnostics.
- `node --conditions=react-server --import tsx tests/run-all-tests.ts`: 74/74 passed. The logged simulated PayOS outage is intentional in the compensation test.
- `node security/reports/fourth-recheck-actions-2026-11-10.cjs`: exit 0, reproduces all four findings above with actual transpiled production modules and mocked external dependencies.
- Existing Action 8 simulates payment before the paid-product query and returns the paid product from that query. It does not cover payment after that query or assert listing remains RESERVED when invoice cancellation affects zero rows.
- The 74-test suite contains no actual invocation of the new invoice late-refund webhook branch for concurrent duplicate deliveries or mixed-funding late success. Passing existing tests does not validate these new credit paths.

No production/staging scan, live provider signature exchange, real database lock test, cash withdrawal or real payment was performed. The harness assumes verified provider fixtures and models lock ordering explicitly; it does not emulate all PostgreSQL/Prisma behavior. Application changes and existing user work were preserved. Dependency/history audits were not repeated in this focused review.

## Priority

1. Make late-payment wallet credits atomically idempotent.
2. Align refund entitlement evidence with wallet reconciliation and original split-payment amounts.
3. Move expiry locks/read/write decisions into a single transaction and condition inventory release on cancellation success.
4. Add these missing action cases, then verify rollback/locking/idempotency using an isolated real database before deployment.
