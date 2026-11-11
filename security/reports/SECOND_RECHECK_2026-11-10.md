# Second verification of the claimed business-logic remediation

Date: 2026-11-10, Asia/Saigon. Scope: current working tree and the newly supplied remediation report. The user authorized direct analysis without the Argon bridge. Application files/database were not changed by this review. This is a scoped recheck using the vibe-check workflow, not a complete 17-category or deployed audit.

## Verdict

TypeScript now passes and the existing suite reports 63/63. Several original defects are fixed. The claim that every business/security issue is fully resolved is still unsupported: the identity boundary remains user-controlled, alternative checkout bypasses visibility checks, and other boost payment paths still lose purchased duration under concurrency.

## Findings

### 1. HIGH — Bank identity remains writable by the user; profile-name freeze has a bypass

Locations:
- `app/actions/withdrawal.ts:98`, `220`: trusted name falls back from raw_user_meta_data.verified_legal_name to raw_user_meta_data.bank_owner to User.name.
- `app/actions/withdrawal.ts:121`: first bank link promotes submitted cleanHolder to verified_legal_name, written into raw_user_meta_data and through supabase.auth.updateUser.
- `app/actions/user.ts:182-238`: updateUserSettingsAction accepts bank_owner without any identity comparison, even for a verified account.
- `app/actions/closet.ts:346-410`: saveUnifiedUserAddressAction updates User.name unconditionally if a name is supplied; there is no isVerified freeze.
- `app/actions/user.ts:80-85` and `app/actions/closet.ts:302`: Supabase metadata names can still change independently of the guarded Prisma update.

Confirmed with actual transpiled action execution and mocked storage: a verified user named TRAN THI BINH calls updateUserSettingsAction with bank_owner LE VAN CUONG, then saveUserBankInfoAction with the latter holder. Both succeed and verified_legal_name becomes LE VAN CUONG while User.name remains TRAN THI BINH. Separately, the actual address action changes the verified User.name to a third name.

The stronger problem is the storage boundary itself: verified_legal_name lives in user metadata. The installed Supabase SDK explicitly documents UserAttributes.data as mapping to auth.users.raw_user_meta_data (`node_modules/@supabase/auth-js/src/lib/types.ts`, UserAttributes), and exposes authenticated updateUser for it. Protecting a subset of application profile buttons/actions cannot make this field immutable. Unless the live Auth service has an independently verified custom restriction, this field must be treated as user-controlled. No such live restriction was tested.

The isVerified flag also does not establish a legal bank identity: existing phone OTP and micro-payment flows set it without binding a verified legal beneficiary name to an account number. This review did not execute any actual withdrawal, and does not claim the balance reconciliation can be bypassed. The defect is the beneficiary identity control on an otherwise eligible user's payout.

Fix: store legal identity and beneficiary verification in a server-controlled table/field, populated only from trusted verification; remove all fallback to user-editable names; separate delivery contact names from legal identity. Check every write path, not only profile forms. Verify direct Auth metadata edits, settings edits, address edits and pre-verification naming cannot change the verified beneficiary.

### 2. HIGH — The storefront checkout endpoint bypasses the new product/listing gate

`app/api/checkout/route.ts:82-99` fetches a product by id/isDeleted only, and listings by AVAILABLE only. It does not require product.status ON_MARKET, listing.isDeleted false, or a RENT listing. It chooses product.listings[0]. Product/listing eligibility is not reloaded after the product lock at line 213. The storefront actually invokes this endpoint (`app/(storefront)/checkout/[productId]/CheckoutClient.tsx:676`).

Thus the strengthened checks in createBooking do not apply to this independent entry point. An authenticated renter with a valid shipping quote can target an IN_CLOSET product that still has an AVAILABLE listing, or a SELL-only listing, without being rejected by these eligibility checks. Database/provider integration was not run; this finding is supported by the handler's source and call site, not a completed live checkout.

Fix: share the booking eligibility and pricing service between both entry points; select the exact intended listing, recheck product/listing eligibility inside the common lock, and reserve it conditionally. Verify direct POST requests for nonmarket products, deleted listings, and SELL-only products fail before invoice/payment creation.

### 3. MEDIUM — Purchased boost duration is still lost outside the coin action

The fresh-product lock was added only to boostWithCoinsAction (`app/actions/boost.ts:612-624`).

- Cash-wallet boost still uses the product snapshot read outside its transaction (`boost.ts:291-294`, `334-342`).
- QR polling reads expiry inside the transaction but does not acquire a product lock before that read (`boost.ts:458-485`). Two distinct top-up rows do not serialize one another through the CoinTopUp status guard.
- The PayOS webhook boost branch also reads expiry before any product lock and assigns a calculated timestamp (`app/api/webhooks/payos/route.ts:165-180`). It lacks the poller's isDeleted validation and can consume payment even when its target branch grants no usable boost.

Confirmed with actual checkBoostPaymentStatusAction execution under a controlled mock interleaving: two different 24-hour PAID provider orders both succeed and both top-up records are consumed, but expiry advances only 24 hours instead of 48. This proves the action computes from stale concurrent snapshots; it is not a real PostgreSQL stress test. A row lock on the eventual UPDATE does not refresh the timestamp previously calculated in application code.

Fix: use one fulfillment routine across coin, cash-wallet, polling and webhook paths, locking the product before reading expiry (or using an atomic database expression), and validate the live target before consuming payment. Do not silently swallow lock failures. Verify mixed-channel concurrent purchases accumulate all paid duration exactly once.

### 4. MEDIUM — Booking retry/expiry recovery is unreachable; completed history blocks rebooking

`app/actions/booking.ts:94-104` immediately rejects any product without an AVAILABLE listing. A successful pending booking makes that listing RESERVED. Consequently the later same-user pending-order recovery (`236-256`) and expired-reservation release code cannot run for the normal RENT-only item on a retry. Actual createBooking execution with a RESERVED RENT fixture returns failure before pending-order lookup.

Separately, the pre-transaction activePaidRental predicate (`217-224`) considers any PAID invoice active, including LENDER_COMPLETED historical rentals. The inner transaction now excludes terminal statuses for this test, but the earlier predicate rejects the request before it reaches that corrected code. A completed item's PAID rental history can therefore block subsequent rentals indefinitely while isDeleted is false.

Fix: recover/reconcile a legitimate pending reservation before rejecting it; distinguish valid holds, expired holds and active lifecycle states under the same lock. Apply the terminal-state exclusion to all eligibility checks. Verify retries return the same pending order, expired holds recover, and completed/paid historical rentals allow new bookings.

### 5. MEDIUM — Product lock does not serialize deletion with payment confirmation

`app/(dashboard)/my-closet/items/actions.ts:48-57` permits archival for PENDING_APPROVAL with a PENDING invoice. It leaves that invoice and its provider payment link payable. The product lock now serializes this action with createBooking, but not with webhook fulfillment.

The invoice webhook (`app/api/webhooks/payos/route.ts:355-421`) can subsequently mark the invoice PAID and approve a rental without checking or locking the product's deletion status. Sequence: create pending invoice; owner archives the product; renter pays the still-valid payment link; webhook creates a PAID rental against an archived product. It also permits a narrower simultaneous-payment race. Soft deletion preserves the evidence, so this is a fulfillment/lifecycle inconsistency rather than destruction of all historical records.

Fix: coordinate pending invoices and their provider links with archival and late-payment handling. Reject archival while a live payment hold exists, or provide a documented cancellation/refund flow that safely handles late provider payments. Verify payment before/during/after archival never silently yields an unfulfillable paid order.

### Verification gap — Five new tests duplicate implementation instead of invoking actions

`tests/run-all-tests.ts:824-945` declares local helpers such as isBoostValidWithTarget, canTransition, verifyBankKycStrict, canDeleteOrArchiveProduct and selectEligibleListing. Assertions call those local helpers, not imported application actions. The Bank-KYC helper receives an already-trusted name and therefore misses both the metadata fallback and the address/settings write paths. These five tests cannot validate authentication, real query predicates, transaction rollback, provider behavior, locking or the correspondence between helpers and deployed code.

Keep useful pure logic tests, but extract shared production functions or invoke actual handlers/actions with dependency isolation. Add real isolated database tests for locking/rollback and fixture cleanup. A passing copied rule is not proof that a Server Action enforces it.

## Changes verified as present

| Earlier issue | Current result |
| --- | --- |
| Normal coin top-up consumed by boost polling | Fixed for the original ordinary/null-payload case. Actual action returns INVALID_FLOW before any transaction. |
| Missing/deleted boost target in polling | Polling checks live target/owner/isDeleted before consuming the top-up. Webhook path is not equivalent. |
| Mobile initial approval uses invalid enum | Fixed: PENDING_APPROVAL is accepted. Actual action execution produces OWNER_PACKED plus audit write. |
| Mobile skipping and stale writes | Initial/intermediate branches now use expected-state updateMany predicates and audit records in a transaction. Actual action rejects PENDING_APPROVAL -> HANDOVER_SHIPPER without writes. Settlement retains its own conditional transition. CONFIRM_RETURN keeps the same state, so its count guard does not make repeated confirmations idempotent. |
| Public closet HIDDEN-only fallback card | Product query requires an AVAILABLE nondeleted listing; the old fallback card was removed. |
| Referral self-order criterion and invalid enums | Removed; now requires server ledger ADMIN_ADJUSTMENT evidence with verifiedReferralForQuest. No writer for this evidence was found in app/src/lib, so ordinary self-service referral completion is effectively disabled pending a trusted evidence producer. This is fail-closed rather than a complete referral implementation. |
| Missing bank identity check | Empty/unverified guards exist, but their purported trusted identity source is insecure as described above. |
| Coin boost concurrent expiry extension | Product lock and fresh expiry read were added to this action only. No live lock test performed. |
| createBooking wrong listing and stale reservation | Exact listing type, in-lock reread and conditional reservation count are present; alternative API and retry/precheck issues remain. |
| Deletion enum/admin/history defects | Correct terminal states, unfiltered historical rentals and role-independent active-order block are present inside a transaction with a product lock; pending-payment lifecycle remains uncoordinated. |

## Executed checks

- `npx.cmd tsc --noEmit --incremental false`: exit 0, no errors.
- `node --conditions=react-server --import tsx tests/run-all-tests.ts`: 63/63 passed.
- `node security/reports/recheck-actions-2026-11-10.cjs`: exit 0. Executes actual transpiled modules with mocked dependencies. Confirms fixed cross-flow rejection and initial approval/skip rejection; reproduces settings-to-bank identity substitution, verified-name address overwrite, QR expiry loss and reserved retry rejection.
- GET `http://localhost:3000/app`: HTTP 200. This checks page availability only, not authenticated workflows/security headers.

The isolated harness performs no real database mutation or PayOS request. It verifies application control flow; it does not emulate all PostgreSQL semantics. No production/staging deployment was scanned, no actual payout/payment was attempted, and no claim of complete financial or security correctness is made. Existing uncommitted user changes were preserved. Dependencies/history were not re-audited in this focused follow-up.

## Priority

1. Move verified identity out of user-writable metadata and close all name/beneficiary write paths.
2. Apply the same product/listing rules to the actively used /api/checkout endpoint.
3. Unify boost fulfillment and synchronize pending-payment archival.
4. Restore pending-booking recovery and completed-item rebooking.
5. Replace duplicated-rule regression checks with action/handler tests and isolated database concurrency tests.
