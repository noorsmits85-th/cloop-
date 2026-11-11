# PAYMENT_WEBHOOKS Fix Plan

## Changes

- `app/actions/closet.ts` — Remove `clientUserId` parameter and fallback in `advanceMobileOrderStatusAction`; enforce `requireUser()` and strict lender/renter ownership checks; require `rental.invoice?.status === "PAID"` before advancing past `PENDING`; replace inline `walletBalance` increment in `COMPLETE_ORDER` with a call to `settleCompletedRentalOrder` (`lib/settlement-engine.ts`).
- `app/actions/booking.ts` — Enforce Zod validation `shippingFee >= 0` and verify server-issued shipping quote token (`verifyShippingQuoteToken`) or recalculate shipping server-side from DB product weight and validated addresses instead of trusting `clientShippingFee`.
- `src/utils/shipping.ts` — Remove hardcoded fallback string in `SECRET_KEY` (throw server configuration error if `SHIPPING_SECRET` is unset); bind and verify `expectedFromProvince`, `expectedToProvince`, `expectedWeight`, and `carrier` inside `verifyShippingQuoteToken`; replace `!==` digest check with `crypto.timingSafeEqual`.
- `app/actions/withdrawal.ts` — Remove `clientUserId` from `saveUserBankInfoAction` and `requestWithdrawalAction`; derive `userId` exclusively from `requireUser()`.
- `app/actions/boost.ts` — Remove `clientUserId` and `requestedUserId` fallbacks across all exported actions; verify `product.ownerId === user.id` before deducting wallet balance or coins.
- `app/actions/ledger.ts` — Remove `"use server"` public action exposure for internal ledger helpers (move `recordDepositIn` to `src/lib/ledger-internal.ts` without `"use server"` or guard exported admin ledger queries with `requireAdmin()`).
- `app/api/webhooks/payos/route.ts` — Add `crypto.timingSafeEqual` secondary verification or strict SDK signature validation returning HTTP `400`/`403` on missing/invalid signature; when `coinTopUp.packageCode.startsWith("BOOST_QR_")`, activate the product boost without also crediting `user.cloopCoins`; handle explicit cancellation/failure status codes by marking `PENDING` `Invoice` / `CoinTopUp` rows as `CANCELLED`.
- `app/actions/payment.ts`, `app/actions/coin.ts`, `app/actions/boost.ts`, `app/actions/kyc-verification.ts` — Replace `||` with `&&` (`payosInfo.status === "PAID" && Number(payosInfo.amountPaid) >= expectedAmount`) and mark `CANCELLED`/`EXPIRED` `CoinTopUp` rows as `CANCELLED`.
- `app/api/zalo-webhook/route.ts` — Verify Zalo OA MAC signature (`X-ZEvent-Signature`) with `crypto.timingSafeEqual` against `process.env.ZALO_OA_SECRET_KEY`; return `401` on invalid signature and fail closed if `ZALO_OA_SECRET_KEY` is missing; avoid logging raw unverified request bodies.
- `app/api/storage/webhook-dispatcher/route.ts` & `src/services/googleDriveStorage.ts` — Remove hardcoded Apps Script `/exec` URLs from source code and stop returning raw webhook URLs to browser clients; proxy uploads through an authenticated server endpoint with shared-secret verification.

## New files

- `src/lib/ledger-internal.ts` — Server-only (`import "server-only"`) ledger mutation module so `recordDepositIn` cannot be invoked directly as a public Next.js Server Action RPC.

## Verification goals

After implementation, ALL of these must be true:

- [ ] `payos.webhooks.verify` validates cryptographic HMAC-SHA256 signatures on every PayOS webhook request, and missing/invalid signatures return `400` or `403`.
- [ ] `POST /api/zalo-webhook` validates `X-ZEvent-Signature` on every request and rejects unsigned requests with `401`/`403`.
- [ ] Processed PayOS `orderCode` / `topUpId` events are tracked atomically inside `prisma.$transaction` (`updateMany` where `status === "PENDING"`), and duplicate deliveries are skipped with zero double-crediting (including `BOOST_QR_*` orders).
- [ ] `advanceMobileOrderStatusAction` rejects unauthenticated calls (`401`), rejects non-owners (`403`), rejects unpaid bookings, and delegates completion settlement to `lib/settlement-engine.ts` idempotently.
- [ ] `createBooking` and `POST /api/checkout` reject negative or tampered `shippingFee` values and bind shipping quotes to exact route and weight.
- [ ] `withdrawal.ts`, `boost.ts`, and `ledger.ts` contain zero `clientUserId` fallbacks and cannot be invoked without a valid authenticated session.
- [ ] Cancelled/expired PayOS payment states cleanly transition `PENDING` `Invoice` and `CoinTopUp` records to `CANCELLED` and release locked inventory.

## Manual verification (for the human)

- Rotate `SHIPPING_SECRET` in Vercel and `.env`, and redeploy the Google Apps Script Drive webhooks with new URLs stored strictly in server-only environment variables (`GOOGLE_DRIVE_WEBHOOK_URL`, `GOOGLE_DRIVE_WEBHOOK_URL_2`).
- Run `scripts/audit_cross_check_forensics.sql` (Hãy chạy thử script này ở môi trường Local trước khi đẩy lên Staging/Production) to verify that no `Invoice` or `RentalHistory` in production was previously completed or credited to `walletBalance` without a matching `TransactionHistory` PayOS webhook receipt.
- Trigger a test PayOS payment and duplicate webhook replay in PayOS sandbox/staging to confirm single credit and `200` idempotent skip on replay.
