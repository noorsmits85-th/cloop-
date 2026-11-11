# Recheck of ten claimed business-logic fixes

Date: 2026-11-10 (Asia/Saigon). Scope: current working tree, including existing uncommitted changes. Review only; application code and database were not modified. The Argon bridge requirement was waived by the user.

## Verdict

The claim that all ten issues are fully closed is not supported. Several exact guards exist, but there are broken status checks, missing referral evidence, a reverse cross-flow payment bug, and concurrency gaps.

## Findings, ordered by impact

### High: normal top-ups can be consumed by the boost status action

`app/actions/boost.ts:390-530`: `checkBoostPaymentStatusAction` checks ownership but never requires a BOOST package or PRODUCT_BOOST payload. For a normal paid PACK top-up with null payload, it marks CoinTopUp PAID, skips the product branch, writes no ledger, and grants no coins. Subsequent coin polling and webhook processing skip the already-paid record. An authenticated user's accidental or manipulated call can therefore strand their own payment; this is not evidence of theft from another account.

Confirmed by executing the actual TypeScript module after transpilation with mocked Prisma, authentication, and PayOS: a PACK_10K record became PAID with zero ledger writes. No real provider or database was used.

Fix: enforce flow type in both polling actions before any mutation; centralize settlement and reject invalid/missing product metadata without consuming the payment. Verify ordinary top-ups cannot be processed by the boost endpoint and webhook/polling races grant exactly one entitlement.

### High: new paid orders cannot pass the mobile approval guard

`app/actions/closet.ts:867` requires PENDING, but `prisma/schema.prisma:445-453` defines PENDING_APPROVAL, not PENDING. Booking creates PENDING_APPROVAL (`app/actions/booking.ts:465`), and the webhook also uses PENDING_APPROVAL. The initial approval is consequently rejected. The handover/receipt branches also contain the wrong initial status. They additionally allow skipping intermediate steps; the claimed strict chain is not implemented.

State validation reads a snapshot and later updates by ID only (`closet.ts:821`, `871`, `880`, `889`, `899`). Concurrent requests can pass stale guards and overwrite a newer state. Transactions alone do not make those predicates atomic.

Fix: use actual enum values and conditional transitions (`id`, authorized actor, expected state), check affected count, and record an audit event in the same transaction. Verify valid initial approval, forbidden skips and concurrent conflicting transitions.

### Medium: referral reward guard does not validate a referral and uses invalid enum values

`app/actions/coin.ts:323-337` counts the claimant's own owner orders, not any referred user's first order. There is no referral relationship predicate. COMPLETED and LENDER_CONFIRMED do not exist in RentalStatus; Prisma/type checking rejects these values. Thus this is currently a broken reward flow, not a demonstrated successful free-coin exploit. Merely replacing the statuses would still leave unrelated owners with two completed orders eligible without referring anyone.

Fix: use trusted stored referral relationships and the referred account's eligible paid/settled first order; if that evidence does not exist, disable this quest. Verify unrelated owner orders never satisfy the referral quest. The claim table's unique user/quest constraint plus transactional grant is a useful existing duplicate-reward protection.

### Medium: bank-name matching still fails open and is not identity verification

`app/actions/withdrawal.ts:90` and `195` invoke verification only when the stored name is truthy. Null/empty names bypass the helper's fail-closed behavior. Also `app/actions/closet.ts:243-250` lets the user change the very name against which the submitted bank holder is compared. Matching two user-controlled strings cannot prove bank account ownership; no bank lookup is performed by this helper. Two shared name tokens also do not establish full identity.

Fix: require a verified immutable identity and verified bank beneficiary binding; reject missing identity unconditionally. Distinguish display names from verified identity. Verify null names and profile renaming cannot bypass beneficiary verification.

### Medium: booking lock does not revalidate availability

`app/actions/booking.ts:94` prefers any AVAILABLE listing regardless of requested RENT/SELL type, then falls back to the first listing. It does not enforce AVAILABLE at this point. Pending reservation checks occur before the product lock. After locking the product (`424`), the transaction does not re-read product/listing eligibility, and the overlap query (`439`) excludes PENDING_APPROVAL. The reservation update (`551-560`) ignores its affected count. Sequential transactions that read the same pre-lock availability can create a second pending order; NOWAIT only rejects lock contention while the lock is held.

Fix: select the requested listing type, revalidate visibility/availability after the shared product lock, and require a successful conditional reservation before creating an order. Verify concurrent same-item booking creates only one eligible hold, and RENT pricing cannot be used for a SELL order.

### Medium: deletion protection is incomplete under concurrent operations

`app/(dashboard)/my-closet/items/actions.ts:19-47` checks orders outside the deletion transaction. Booking/payment can change eligibility between the check and deletion. The check filters out isDeleted rental history, so it is not literally all history. Terminal status strings COMPLETED/LENDER_CONFIRMED differ from actual LENDER_COMPLETED: a completed PAID rental unnecessarily blocks ordinary-owner deletion. Admins explicitly bypass the active-order guard.

Fix: use actual lifecycle states and serialize eligibility checks/deletion with booking using the same product lock; preserve evidence regardless of UI archival flags. Verify completed rentals can be archived and active paid rentals cannot be deleted during races.

## Comparison with all ten claims

| Claim | Code evidence and result |
| --- | --- |
| 1. Pending withdrawal bank swap | The two reported profile/bank actions no longer update pending withdrawal bank fields. Admin payment rendering prefers the withdrawal snapshot (`app/admin/payments/actions.ts:70`). Exact reported path is closed by inspection; no payout was executed. |
| 2. Bank token bypass | Deduplication and single-token exact matching exist, but missing-name caller bypass and mutable identity remain. |
| 3. Leaf double spend | Both coin debit paths use conditional balance updates inside transactions and throw on zero count (`boost.ts:613`, `739`). Exact negative-balance race is addressed by inspection. Boost expiry is still read before the transaction (`591-594`), so concurrent successful purchases can overwrite purchased duration (`633-640`). |
| 4. Hours manipulation | Price and expiry use normalized safeHours. Actual helper execution confirmed finite integer output in 1..720 for NaN, Infinity, negative, fractional and excessive values. Invalid inputs are normalized, not rejected. |
| 5. Pre-payment phone disclosure | Both mobile order projections require invoice PAID and not CANCELLED (`closet.ts:734-783`). PENDING_PAYMENT comparisons use a nonexistent rental status; the PAID condition remains meaningful, but TypeScript fails. This is evidence only for these projections, not every possible PII route. |
| 6. Public closet / state machine | Email-prefix lookup removed, product query filters ON_MARKET. However listings only filter isDeleted (`closet.ts:87`), and a product with only HIDDEN listings still appears via the fallback display card (`149-160`). State machine has the issues above. |
| 7. Quest rewards | FIRST_LISTING/WEEKLY_LISTING_1 require ON_MARKET + AVAILABLE. Unknown quest branches reject. Referral proof is missing and status filter is invalid. |
| 8. Payment cross-flow | Coin creation blocks KYC_/BOOST_; coin polling rejects BOOST_/PRODUCT_BOOST. Reverse direction in boost polling is unguarded, as reproduced above. |
| 9. Product deletion | A paid/active check exists; incorrect terminal statuses and TOCTOU remain. |
| 10. Dates / hidden bookings | Invalid/reversed rental dates, rental length 1..60 and nonpositive/nonfinite item prices are checked. Deleted/nonmarket products and HIDDEN selected listings are rejected. Listing-type selection, fallback and transaction availability issues remain. |

## Validation and limits

- `npx.cmd tsc --noEmit --incremental false`: failed with 15 errors in closet.ts, coin.ts and review.ts. Errors include invalid lifecycle enums and review query inference failures.
- `node --conditions=react-server --import tsx tests/run-all-tests.ts`: 58/58 passed. These existing tests do not validate the ten complete action flows. Direct tsx invocation initially failed on server-only imports; the server condition resolves that runner issue.
- Isolated execution of boost.ts with mocked external dependencies reproduced reverse payment flow consumption; helper bounds and schema enum assertions passed.
- No database integration, actual PayOS call, withdrawal, checkout or mutation was executed. Concurrency findings are source-level interleaving analysis, not measured database race tests.
- No deployment URL was supplied; no live scan or deployed-header/security claim is made. This scoped review is not a full 17-category audit.
- `npm.cmd audit --json` could not reach the advisory endpoint. Offline audit returned zero cached findings, which is not evidence that dependencies are vulnerability-free.
- Gitleaks is not installed (`Get-Command gitleaks` returned no result); history scanning was not performed. Install separately if needed: `winget install Gitleaks.Gitleaks`.

## Recommended order

1. Fix the reverse payment flow and invalid lifecycle enum checks; restore type-checking.
2. Disable referral rewards until actual referral evidence is implemented.
3. Bind bank details to verified identity, removing the missing-name bypass.
4. Make lifecycle transitions, booking eligibility, deletion and boost-expiry extension atomic.
5. Add action-level regression tests using isolated fixtures before any deployment.
