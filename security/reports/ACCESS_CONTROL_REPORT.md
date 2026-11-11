# ACCESS_CONTROL Security Report

## Status: CRITICAL

## Findings

Auditing every route and Server Action accepting resource identifiers (`userId`, `clientUserId`, `passedUserId`, `owner_id`, `productId`, `orderId`, `rentalId`, `invoiceId`, `ticketId`, `id`) uncovered severe Insecure Direct Object Reference (IDOR), Mass Assignment, and broken ownership checks across both read and write operations.

1. **CRITICAL — Unauthenticated / Cross-User IDOR on Marketplace Products (`app/actions/product.ts:667-790`, `app/(dashboard)/my-closet/items/actions.ts:9-134`, `src/actions/create-outfit.ts:42-130`)**
   - `updateProductFromAppAction(productId, data, clientUserId)` (`app/actions/product.ts:667-790`) fetches `existingProduct` by `productId` and immediately overwrites its `title`, `description`, `images`, `specificAddress`, `basePrice`, `deposit`, and `salePrice` with **zero authentication check and zero `existingProduct.userId === authUser.id` ownership check**:
   ```ts
   // app/actions/product.ts:688-693
   const existingProduct = await prisma.product.findUnique({
     where: { id: productId }, include: { listings: true, images: true },
   });
   if (!existingProduct) return { success: false, error: "Không tìm thấy sản phẩm cần chỉnh sửa." };
   // Directly proceeds to prisma.$transaction(...) updating product & listings!
   ```
   - `deleteProductAction(productId, clientUserId)` and `toggleProductHideAction(productId, currentIsHidden, clientUserId)` (`app/(dashboard)/my-closet/items/actions.ts:12-36, 87-104`) compare `product.userId !== userId` against client-supplied `clientUserId` when unauthenticated—because both `productId` and `product.userId` are public on every shop listing, anyone can pass `clientUserId = product.userId` to delete or hide **any seller's product**.
   - `createProductAction` (`app/actions/product.ts:105-115, 274-289`) and `createOutfitAction` (`src/actions/create-outfit.ts:44, 77`) trust client `product.userId` / `payload.owner_id` to insert listings into another user's closet and overwrite their `phone`/`pickup_address` in `auth.users`.

2. **CRITICAL — Full PII, Bank Account, Notification & Order IDOR Reads/Writes (`app/actions/closet.ts`, `app/actions/notification.ts`, `app/actions/withdrawal.ts`, `app/actions/boost.ts`, `app/actions/getDisputeStats.ts`)**
   - `getUserNotificationsAction(passedUserId)` (`app/actions/notification.ts:71-94`) sets `let userId = passedUserId;` *before* checking the session—allowing any caller to pass any victim's UUID and read private notifications containing bank account numbers, withdrawal amounts, unmasked pickup addresses, and phone numbers.
   - `getMyClosetMobileDataAction(clientUserId)` (`app/actions/closet.ts:554-905`) dumps any victim's `email`, `phone`, `specificAddress`, `walletBalance`, `cloopCoins`, `bankName`, `bankAccount`, `bankOwner`, `withdrawals`, and 40 orders via `clientUserId`.
   - `updateClosetProfileAction` (`closet.ts:281-289`), `saveUnifiedUserAddressAction` (`closet.ts:421-429`), `saveUserBankInfoAction` (`withdrawal.ts:61-69, 109-116`), `requestWithdrawalAction` (`withdrawal.ts:170-178`), `advanceMobileOrderStatusAction` (`closet.ts:924-995`), and `boost.ts` (`lines 70, 149, 265, 536, 658`) all trust client-supplied `userId`/`clientUserId` (and `purchaseBoostPackage` at `boost.ts:685` omits `product.userId === userId`).
   - `getUserDisputeStats(passedUserId)` (`app/actions/getDisputeStats.ts:11`) prioritizes `passedUserId` over `requireUser()`.

3. **CRITICAL — Customer Support Ticket Hijacking & Arbitrary Account Email Overwrite (`app/actions/support.ts`, `app/api/auth/unlock-unconfirmed/route.ts`)**
   - `getTicketMessages(ticketId)` (`app/actions/support.ts:206`) returns all messages for any `ticketId` with zero ownership check; `sendCustomerMessage` (`lines 257-273`) overwrites the ticket's `userId` and contact metadata with caller-supplied values.
   - `POST /api/auth/unlock-unconfirmed` (`app/api/auth/unlock-unconfirmed/route.ts:36-38`) accepts `{ userId, email }` and runs `prisma.user.upsert({ where: { id: resolvedUserId }, update: { email } })`, overwriting any victim's email in `public.User`.

4. **HIGH — Mass Assignment via `supabaseAdmin` in `POST /api/products` (`app/api/products/route.ts:32-40`)**
   - Spreads unvalidated client JSON (`id: client_upload_id, ...productData`) directly into `supabaseAdmin.from("products").insert(...)`, allowing an authenticated user to inject privileged columns (`boostScore`, `boostExpiresAt`, `isHighlighted`, `likeCount`, `status`) or collide arbitrary UUIDs.

5. **MEDIUM/HIGH — Targeted Secondary IDOR & Data Over-Exposure Issues**
   - `getScrubbedReviewsAction` (`app/(dashboard)/my-closet/orders/actions.ts:1247-1307`): Uses client-passed `currentUserId` (`line 1288`) to decide whether to mask unpublished blind reviews—omitting `currentUserId` reveals unpublished blind review ratings and comments.
   - `createDispute` (`app/actions/dispute.ts:151, 195-200`): Trusts optional `data.invoiceId` from the client without verifying `data.invoiceId === rental.invoice?.id`, allowing an order party to mark an unrelated `Invoice` as `DISPUTED`.
   - `createBlogPostAction` (`app/actions/blog.ts:107-115`): Attaches a blog post to `input.productId` without checking `product.userId === userId`.
   - `createBooking` (`app/actions/booking.ts:195-196`): Matches pending order resumption by `renter_phone` across accounts rather than strictly `renterId === user.id`.
   - `POST /api/tdv/redeem` (`app/api/tdv/redeem/route.ts:10, 47-67`) & `api/tdv/redeem.js`: Mutates `unlocked_subjects` for any client-supplied `username` without verifying ownership.
   - `POST /api/stylist` (`app/api/stylist/route.ts:122-125, 334-343`): Writes `AiStylistLog` under client-supplied `userId`.
   - Seller PII Over-Exposure: `getProductDetail` (`src/lib/product-service.ts:84, 202` via `GET /api/products/[id]`), `getClosetProducts` (`app/actions/closet.ts:528`), and `getTrendingProductsAction` (`app/actions/favorite.ts:278`) return private `IN_CLOSET`/`HIDDEN` items or unmasked seller `specificAddress` (exact street/house address) to anonymous viewers prior to confirmed rental booking.

## What's at risk

- **Total Marketplace Tampering & Sabotage**: Any attacker can change prices of every item on CLOOP to `1,000 VND`, deface titles/images, or hard-delete every competitor's listings.
- **Mass Customer PII & Financial Theft**: Enumerating or reading public seller `userId`s lets an attacker dump full home addresses, phone numbers, emails, bank accounts, notifications, and orders—and hijack pending withdrawal bank accounts.

## What's already secure

- **Dashboard Order Lifecycle Actions (`app/(dashboard)/my-closet/orders/actions.ts:10-1240`)**: All 10 rental state-transition and dispute-proposal actions (`renterReceivedAction`, `renterReturnAction`, `confirmReturnDeliveredAction`, `completeOrderAction`, `raiseDisputeWithProposalAction`, `acceptDisputeProposalAction`, `rejectAndEscalateDisputeAction`, `loadMoreOrdersAction`, `submitReviewAction`) separate authentication from authorization and strictly verify `rental.renterId === user.id` or `rental.ownerId === user.id`.
- **Dispute Evidence & Upload URL Checks (`app/api/disputes/upload-url/route.ts:41-61`, `app/actions/dispute.ts:283-289`)**: Verify `isRenter || isOwner || isAdmin` on `prisma.rentalHistory` and return `403` on mismatch.
- **Coin, KYC, Archive & Dashboard Create/Edit Actions**: `app/actions/coin.ts`, `app/actions/kyc-verification.ts`, `app/(dashboard)/my-closet/archive/actions.ts`, and `app/(dashboard)/my-closet/create/actions.ts` properly scope queries to `user.id` (or `user.role === "ADMIN"`).

## Recommendations

1. **Enforce `sessionUser.id` as the single source of truth & delete all client ID parameters**: Remove `clientUserId`, `passedUserId`, `requestedUserId`, and `owner_id` from all Server Actions and API payloads (`closet.ts`, `withdrawal.ts`, `product.ts`, `boost.ts`, `notification.ts`, `getDisputeStats.ts`, `items/actions.ts`, `create-outfit.ts`, `orders/actions.ts:getScrubbedReviewsAction`, `stylist/route.ts`).
2. **Add explicit ownership checks (`resource.userId === user.id`) returning `403` on every read/write operation**:
   - In `updateProductFromAppAction` (`app/actions/product.ts`), require `authUser` via `requireUser()` and reject if `existingProduct.userId !== authUser.id && authUser.role !== "ADMIN"`.
   - In `advanceMobileOrderStatusAction` (`app/actions/closet.ts`), verify `rental.ownerId === user.id` / `rental.renterId === user.id` per action transition.
   - In `app/actions/support.ts`, scope customer ticket reads/messages strictly to `ticket.userId === user.id` (or a cryptographically signed guest ticket cookie), and restrict admin operations to `requireAdmin()`.
   - Fix `createDispute` (derive `invoiceId` strictly from `rental.invoice?.id`), `createBlogPostAction` (verify `product.userId === user.id`), and `createBooking` (scope pending rental lookup strictly to `renterId: user.id`).
3. **Eliminate Mass Assignment in `POST /api/products`**: Validate the request body with a strict Zod schema allowlisting only user-editable product fields (`title`, `description`, `category`, `size`, `condition`, `province`, etc.), generate `id` server-side with `crypto.randomUUID()`, and force `userId: user.id`, `boostScore: 0`, `isHighlighted: false`.
4. **Redact Seller Street Addresses (`specificAddress`) & Filter Private Closet Items**: Only expose `province`/`district` on public product listings (`src/lib/product-service.ts`, `favorite.ts`, `closet.ts`), revealing full `specificAddress` solely to confirmed counterparties on `PAID` rentals, and return `404` on `GET /api/products/[id]` when a product is `IN_CLOSET`/`isShopHidden` unless requested by its owner or an admin.
