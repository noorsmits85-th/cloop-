# PAYMENT_WEBHOOKS Security Report

## Status: CRITICAL

## Findings

CLOOP uses PayOS (`@payos/node`) for payment collection across rentals/purchases (`Invoice`) and coin/boost/KYC micro-deposits (`CoinTopUp`), alongside a Zalo webhook endpoint and Google Apps Script storage webhook dispatchers. While the core PayOS webhook handler verifies cryptographic signatures and uses atomic conditional updates, severe payment-flow bypasses and unauthenticated financial Server Actions allow attackers to credit withdrawable wallet funds without paying.

1. **CRITICAL — Unauthenticated, Non-Idempotent Infinite Wallet Credit in `advanceMobileOrderStatusAction` (`app/actions/closet.ts:910-995`)**
   - Bypasses the hardened escrow settlement engine (`lib/settlement-engine.ts`) completely.
   - Falls back to client-supplied `clientUserId` when no session cookie is sent (`line 929`), never verifies that the caller is the lender or renter of the order, never verifies `rental.invoice?.status === "PAID"`, and never checks whether `rental.status` was already completed:
   ```ts
   // app/actions/closet.ts:957-979
   } else if (action === "COMPLETE_ORDER") {
     nextStatus = "LENDER_COMPLETED";
     await prisma.$transaction(async (tx) => {
       await tx.rentalHistory.update({
         where: { id: orderId },
         data: { status: "LENDER_COMPLETED", completedAt: now }
       });
       if (rental.invoice && rental.invoice.depositAmount > 0) {
         await tx.user.update({
           where: { id: rental.renterId },
           data: { walletBalance: { increment: rental.invoice.depositAmount } }
         });
       }
     });
   }
   ```

2. **CRITICAL — Unvalidated & Negative Client `shippingFee` in `createBooking` (`app/actions/booking.ts:34, 150-155`)**
   - Although `createBooking` reads `basePrice` and `deposit` from PostgreSQL, it accepts `shippingFee: clientShippingFee` directly from the client payload without verifying a signed shipping quote token or enforcing `shippingFee >= 0`:
   ```ts
   // app/actions/booking.ts:150-155
   const isSelfPickup = shippingCarrier === "SELF_PICKUP";
   const shippingFee = isSelfPickup ? 0 : (Number(clientShippingFee) || 0);
   const totalAmount = isRental
     ? (subTotal + deposit + serviceFee + shippingFee)
     : (subTotal + serviceFee + shippingFee);
   ```
   - A negative `clientShippingFee` reduces the PayOS `Invoice.amount` paid by the buyer while still recording the full `depositAmount` on `Invoice` (`line 257`), which is subsequently refunded in full to `walletBalance` on order completion.

3. **CRITICAL — Unauthenticated `clientUserId` Financial Actions (`app/actions/withdrawal.ts`, `app/actions/boost.ts`, `app/actions/ledger.ts`)**
   - `saveUserBankInfoAction` (`app/actions/withdrawal.ts:67-69, 109-116`) and `requestWithdrawalAction` (`app/actions/withdrawal.ts:176-178`) accept `data.clientUserId` when unauthenticated, enabling bank account hijacking on pending withdrawals and unauthorized withdrawal requests.
   - `app/actions/boost.ts:70, 159, 276, 547, 666` accepts `clientUserId` / `requestedUserId` fallbacks on wallet-balance and coin boost purchases.
   - `recordDepositIn` (`app/actions/ledger.ts:13-35`) is an exported `"use server"` function with zero authentication or admin authorization check.

4. **HIGH — Shipping Quote HMAC Route/Weight Bypass & Hardcoded Fallback Key (`src/utils/shipping.ts:3, 388-425`)**
   - Line 3 defines `const SECRET_KEY = process.env.SHIPPING_SECRET || process.env.PAYOS_CHECKSUM_KEY || "[REDACTED]"`.
   - `verifyShippingQuoteToken` (`lines 388-421`) receives `_expectedFromProvince`, `_expectedToProvince`, and `_expectedWeight` as unused underscore-prefixed arguments and compares HMAC digests with `!==` instead of `crypto.timingSafeEqual`. A zero-fee or intra-district signed quote token can be replayed on cross-country checkouts in `POST /api/checkout`.

5. **HIGH — Unverified Zalo Webhook & Exposed Apps Script Webhook URLs (`app/api/zalo-webhook/route.ts:4-25`, `app/api/storage/webhook-dispatcher/route.ts:6-52`, `src/services/googleDriveStorage.ts:9-14`)**
   - `POST /api/zalo-webhook` accepts arbitrary JSON without verifying Zalo OA MAC (`X-ZEvent-Signature`) and logs unvalidated `JSON.stringify(body)` directly.
   - `GET /api/storage/webhook-dispatcher` exposes raw backend Google Apps Script `/exec` URLs and the shared Drive folder ID to any logged-in browser client, and `src/services/googleDriveStorage.ts:9-14` hardcodes two fallback Apps Script `/exec` URLs with no shared-secret authentication.

6. **MEDIUM — Double Coin Credit on `PRODUCT_BOOST` Webhook vs Polling & Weak Polling `||` Condition**
   - In `app/api/webhooks/payos/route.ts:93-145`, settling a `BOOST_QR_*` `CoinTopUp` both credits `user.cloopCoins` (`lines 94-108`) and activates `product.boostExpiresAt` (`lines 126-143`), whereas `checkBoostPaymentStatusAction` (`app/actions/boost.ts:453-486`) only activates the boost.
   - Active polling handlers (`app/actions/payment.ts:50`, `app/actions/coin.ts:126`, `app/actions/boost.ts:420`, `app/actions/kyc-verification.ts:180`) evaluate `payosInfo.status === "PAID" || (payosInfo.amountPaid && payosInfo.amountPaid >= expected)` instead of requiring `&&`.
   - Non-`"00"` PayOS webhook codes (`app/api/webhooks/payos/route.ts:26-28`) return HTTP `200` without marking failed/cancelled `Invoice` or `CoinTopUp` rows as `CANCELLED` (relying instead on 15-minute cron cleanup for rentals).

## What's at risk

- **Direct Financial Loss / Cash-Out Fraud**: An unauthenticated attacker can create an unpaid booking and trigger `COMPLETE_ORDER` in `advanceMobileOrderStatusAction` repeatedly—or submit negative `shippingFee` in `createBooking`—to mint arbitrary `walletBalance` and cash out real funds via `requestWithdrawalAction`.
- **Victim Wallet & Withdrawal Hijacking**: Knowing a user's UUID and public display name allows an attacker to overwrite their bank details on `PENDING` withdrawal requests via `clientUserId` in `withdrawal.ts`.
- **Ledger & Webhook Tampering**: Unauthenticated calls to `recordDepositIn` pollute financial reconciliation ledgers; forged events to `/api/zalo-webhook` or direct posts to exposed Apps Script `/exec` webhooks allow log flooding and unauthorized Drive storage abuse.

## What's already secure

- **PayOS Cryptographic Signature Check (`app/api/webhooks/payos/route.ts:10-24`)**: Fails closed (`HTTP 500` when PayOS env secrets are missing; `HTTP 403` when `payos.webhooks.verify(body)` fails HMAC-SHA256 verification).
- **PayOS Webhook Amount Validation & Atomic Idempotency (`app/api/webhooks/payos/route.ts:49-90, 165-244`)**: Strictly verifies `verifiedData.amount === coinTopUp.amountVnd` and `verifiedData.amount === invoice.amount` (flagging `AMOUNT_MISMATCH`), checks `@unique` `TransactionHistory.orderCode`, and executes conditional `updateMany({ where: { id, status: "PENDING" } })` inside `prisma.$transaction`.
- **Escrow Settlement Engine (`lib/settlement-engine.ts:104-129, 250-355`)**: Uses `SELECT ... FOR UPDATE` row locking, ledger deduplication (`REFUND_OUT` / `PAYOUT_OUT`), and a conservation-of-money invariant check.
- **Checkout Price Lookup (`app/api/checkout/route.ts:74-136`)**: Queries `Listing.basePrice` and `Listing.deposit` from PostgreSQL inside a `Serializable` transaction.

## Recommendations

1. **Remove `COMPLETE_ORDER` wallet credit from `advanceMobileOrderStatusAction` (`app/actions/closet.ts`)**: Enforce `requireUser()` (delete `clientUserId` fallback), verify order ownership, verify `invoice.status === "PAID"`, and route all order completions exclusively through `settleCompletedRentalOrder` in `lib/settlement-engine.ts`.
2. **Eliminate all `clientUserId` fallbacks and lock down ledger actions**: Require authenticated `requireUser()` in `app/actions/withdrawal.ts` and `app/actions/boost.ts` (plus product ownership check), and enforce internal-only non-exported helper usage (or `requireAdmin()`) on `recordDepositIn` in `app/actions/ledger.ts`.
3. **Enforce server-calculated shipping fees and full quote binding**: In `app/actions/booking.ts`, reject negative `shippingFee` (`z.number().int().min(0)`) and require a server-verified quote token; in `src/utils/shipping.ts`, remove the hardcoded fallback key, validate `fromProvince`, `toProvince`, `weight`, and `carrier` against the signed payload, and use `crypto.timingSafeEqual`.
4. **Fix `BOOST_QR_*` webhook double-credit, polling `&&` checks, and failure handling**: Skip `cloopCoins` increment when `packageCode.startsWith("BOOST_QR_")` in `app/api/webhooks/payos/route.ts`, change polling `||` to `&&`, and transition cancelled/failed PayOS payment codes to `CANCELLED`.
5. **Verify Zalo webhook signatures and hide Apps Script URLs**: Validate `X-ZEvent-Signature` using `ZALO_OA_SECRET_KEY` (returning `401`/`403` when invalid or unconfigured) and proxy Drive uploads server-side instead of returning Apps Script webhook URLs to clients.
