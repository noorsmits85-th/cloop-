# Third remediation recheck

Date: 2026-11-10, Asia/Saigon. Scope: new pasted remediation claims, current application code, related authentication/payment/expiry paths. Review only: no application code or database changes. The user's Argon-bridge waiver remains applicable. This is a focused vibe-check follow-up, not a complete deployed security audit.

## Verdict

Confirmed: TypeScript has zero errors; existing suite passes 70/70; it now executes actual action/route modules. Most exact paths from SECOND_RECHECK are patched. However the legal-name boundary still has an authentication callback bypass, the expiry cron can overwrite a successful payment, and checkout's newly introduced reservation is not released on provider creation failure. The claim of fully resolving the business/security risks is premature.

## Findings

### HIGH — Auth callback still overwrites the purported server-controlled legal name

`app/auth/callback/route.ts:21-28` reads `data.user.user_metadata.name/full_name` and unconditionally upserts `User.name` for an existing account. There is no isVerified check or independently verified legal identity. This bypasses the freezes added to profile/address actions.

`app/actions/withdrawal.ts:72-81`, `206-215` now trusts User.name instead of raw metadata. That fixes the direct metadata read, but the callback still copies user metadata into the trusted field. Existing payout-holder checks can restrict users with prior withdrawals; they do not establish identity for a first beneficiary, and query errors are converted to null (`withdrawal.ts:68`, `202`).

Reproduced with real transpiled modules and mocked external dependencies:
1. Fixture: existing verified user named TRAN THI BINH, no prior withdrawal.
2. A successful mocked Auth code exchange returns that same user with metadata name LE VAN CUONG.
3. Actual callback GET updates the verified User.name to LE VAN CUONG.
4. Actual saveUserBankInfoAction accepts LE VAN CUONG as the bank holder.

This is a source/action-level reproduction, not a live Auth-server attack or real withdrawal. It shows that the verification guard still depends on editable metadata flowing through a different write path.

There is an additional identity-provenance problem even without that overwrite: callback account creation sets isVerified true (`callback/route.ts:37`), and password-login profile creation uses email confirmation to set isVerified (`app/(storefront)/login/actions.ts:128`), while User.name originates from signup/provider metadata. Email confirmation, phone OTP or receipt of a micro-payment does not verify a legal name/account-number pair. A server-stored display name is not automatically a verified legal identity. Submitted bank account numbers are format-checked but not bound to the holder by a trusted beneficiary lookup in these actions.

Fix plan: introduce a separate server-controlled identity/beneficiary record with explicit verification provenance. Never overwrite it from signup/login callbacks, public profile updates or delivery names. Distinguish email/phone verification from legal identity verification. Until then, describe this as name comparison, not verified bank ownership. Add callback-to-bank and first-beneficiary tests. Database reconciliation still applies; no bypass of eligible cash balance was demonstrated.

### HIGH — Expiry cron can cancel an invoice after a successful payment

`app/api/cron/release-locks/route.ts:17-27` selects expired pending rentals before the mutation transaction. A successful webhook can commit between that read and the cron update. The cron's later paid-product query (`35-46`) only filters which listings will be released.

The subsequent rental and invoice updates (`49-56`) filter by IDs only, not current invoice/rental status. They cancel all previously selected rows even if the paid-product query just observed the invoice as PAID. There is no common product lock with the new webhook path. The new webhook lock therefore does not eliminate this competing writer.

Reproduced by invoking the actual authorized cron handler with mocked Prisma under a controlled interleaving: initial expired selection sees PENDING; simulated webhook commits PAID; the second query sees the paid product; cron still returns success and changes both rental and invoice to CANCELLED. No real database/payment was touched.

Impact: successful payment evidence/ledger can disagree with a CANCELLED invoice/rental; fulfillment and subsequent reconciliation are disrupted. This does not prove theft or a real production incident.

Fix plan: under the same product lock used by payment/booking, reread each invoice/rental and cancel only eligible PENDING holds using conditional writes and affected-count checks. Coordinate provider link cancellation and late-payment reconciliation/refund. Verify webhook-before-cron, cron-before-webhook and mixed concurrent ordering preserve every received payment and produce a defined final state. Similar preselected-ID expiry/release logic in booking should use this common routine.

### MEDIUM — Checkout provider failure leaves the new listing reservation stranded

`app/api/checkout/route.ts:305-320` now correctly transitions the eligible listing to RESERVED inside the booking transaction. After that transaction commits, provider link creation occurs outside it.

On provider failure, the compensation block (`631-651`) releases a wallet hold and cancels rental/invoice but never returns the associated listing to AVAILABLE. The next storefront request filters only AVAILABLE listings (`85-89`) and rejects the product. The expiry cron also will not select the already-CANCELLED rental, so that cron cannot repair this reservation. Another independent repair path or manual intervention might restore it; the storefront flow itself does not.

Evidence: source-level control-flow inspection, not a live PayOS failure injection.

Fix plan: compensate the listing reservation as well, under the shared product lock and only if still owned by this failed checkout/there is no other live entitlement. Verify provider creation failure, timeout and a late provider success cannot strand inventory or overwrite a valid paid order. Include a failure-path test asserting listing AVAILABLE, rental/invoice CANCELLED, and correct wallet hold disposition.

## Claimed fixes verified

| Claimed fix | Current assessment |
| --- | --- |
| Direct metadata-as-legal-name read | Removed from bank actions. Callback still feeds metadata into User.name, so the overall trust boundary remains open. |
| Settings bank_owner spoof | Settings now checks isVerified and compares holder to User.name. The earlier direct settings-to-bank spoof is blocked. |
| Address/booking overwrite of verified profile name | Address uses guarded name update and recipient_name; booking no longer writes recipient name into legal/display User.name. |
| Storefront checkout hidden/wrong listing bypass | ON_MARKET check, exact RENT/nondeleted/AVAILABLE selection, in-lock reread and conditional reservation exist. Provider compensation was not updated for the new reservation. |
| Boost expiry loss | Shared helper now locks the product before reading its expiry and is used by coin, wallet, QR polling and webhook paths. A local mutex supplements the DB lock; only the DB lock can coordinate separate server instances. No real PostgreSQL concurrency test was performed. |
| Same-user RESERVED retry | Precheck now allows RESERVED and existing action test executes pending-order recovery. |
| Completed rental blocking new bookings | Precheck PAID branch excludes LENDER_COMPLETED/CANCELLED. |
| Archival while an invoice is pending | Deletion blocks unfinished rentals/pending invoices; webhook checks rental/product under product lock. These exact paths are improved. Expiry cron is still an unsynchronized competing writer. |

## Validation

- `npx.cmd tsc --noEmit --incremental false`: exit 0, no diagnostics.
- `node --conditions=react-server --import tsx tests/run-all-tests.ts`: 70/70 passed.
- `node security/reports/third-recheck-actions-2026-11-10.cjs`: exit 0; reproduces callback-to-bank identity substitution and PAID-to-CANCELLED expiry race using the actual transpiled action/route code.
- Reviewed the new action-level suite: these tests now execute production modules instead of only copied predicates. The mock transactions do not implement real rollback or database row locks. The boost concurrency test exercises one module instance/local mutex and two distinct orders, so it does not independently prove distributed locking, same-order idempotency or rollback.
- The test named rebooking after LENDER_COMPLETED checks the query exclusion and recovers a pending reservation; it does not create a new booking against a completed-order database fixture.
- No live Auth exchange, PayOS request, payout, real database integration or production scan was executed. Only new review artifacts were written; pre-existing working tree changes were preserved. Prior recheck scripts that assert earlier vulnerabilities are historical reproductions and are not expected to remain passing after fixes.

## Recommended next steps

1. Close the callback/initial-identity provenance gap; independently verify beneficiary identity.
2. Serialize conditional expiry/cancellation with payment fulfillment and define late-payment handling.
3. Complete checkout reservation compensation.
4. Add the missing failure-path and Auth callback tests, then run real isolated DB tests for distributed concurrency, idempotency and rollback.
