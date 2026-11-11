# ACCESS_CONTROL Fix Plan

## Changes

- `app/actions/product.ts` — In `updateProductFromAppAction`, enforce `const user = await requireUser()` (remove `clientUserId`), verify `existingProduct.userId === user.id || user.role === "ADMIN"` (throw `403` otherwise); in `createProductAction`, remove unsigned JWT decoding and `product.userId` fallback, deriving `userId` strictly from `requireUser()`.
- `app/(dashboard)/my-closet/items/actions.ts` — Remove `clientUserId` parameter from `deleteProductAction` and `toggleProductHideAction`; derive `userId` solely from `await requireUser()` and include `where: { id: productId, userId: user.id }` in Prisma mutations.
- `src/actions/create-outfit.ts` — Enforce `const user = await requireUser()` and replace `payload.owner_id` with `user.id`.
- `app/actions/closet.ts` — Remove `clientUserId` / `data.userId` / unsigned JWT `sub` fallbacks in `updateClosetProfileAction`, `saveUnifiedUserAddressAction`, `getMyClosetMobileDataAction`, and `advanceMobileOrderStatusAction`; enforce `requireUser()` and explicit `ownerId`/`renterId` role checks on every order state transition; strip `specificAddress` from public `getClosetProducts`.
- `app/actions/notification.ts` & `app/actions/getDisputeStats.ts` — Remove `passedUserId` override (or allow `passedUserId !== user.id` strictly when `user.role === "ADMIN"`), always authenticating via `requireUser()` first.
- `app/actions/withdrawal.ts` & `app/actions/boost.ts` — Remove `clientUserId` / `requestedUserId` fallbacks; add `product.userId === user.id` ownership verification in `purchaseBoostPackage` (`boost.ts:685`) and `checkBoostPaymentStatusAction`.
- `app/actions/support.ts` — Require `requireAdmin()` on admin functions; for customer ticket functions, bind tickets to `user.id` (from `requireUser()`) or an HMAC-signed `HttpOnly` guest ticket token, verify ownership on `getTicketMessages` and `sendCustomerMessage`, and remove the `userId` overwrite in `sendCustomerMessage`.
- `app/api/products/route.ts` — Parse `POST` body through a strict Zod schema (rejecting `boostScore`, `boostExpiresAt`, `isHighlighted`, `likeCount`, `id`, `userId`); assign `id: crypto.randomUUID()` and `userId: user.id` server-side via Prisma.
- `src/lib/product-service.ts`, `app/api/products/[id]/route.ts`, `app/actions/favorite.ts` — Hide `IN_CLOSET` and `isShopHidden` items from non-owners (`404`), and omit `specificAddress` from all public product payloads.
- `app/actions/dispute.ts`, `app/actions/blog.ts`, `app/actions/booking.ts`, `app/(dashboard)/my-closet/orders/actions.ts`, `app/api/stylist/route.ts`, `app/api/tdv/redeem/route.ts` — Derive `invoiceId` strictly from `rental.invoice?.id` in `createDispute`; verify `product.userId === user.id` in `createBlogPostAction`; scope pending booking lookup strictly to `renterId: user.id`; derive `currentUserId` from server session in `getScrubbedReviewsAction`; derive `resolvedUserId` from server session in `/api/stylist`; verify authenticated TDV session user in `/api/tdv/redeem`.

## New files

- `tests/idor-access-control.test.ts` — Automated integration tests asserting that User A receives `403` when attempting to read notifications, closet mobile data, support tickets, or modify/delete products, orders, bank accounts, or boosts belonging to User B.

## Verification goals

After implementation, ALL of these must be true:

- [ ] Every API route and Server Action taking a resource ID verifies `current_user.id === resource.owner_id` (or authorized counterparty / DB-verified `ADMIN`).
- [ ] Ownership checks exist on both read (`GET` / query actions) and write (`POST` / `PUT` / `PATCH` / `DELETE` / mutation actions) operations.
- [ ] Failing an ownership check returns `403 Forbidden` (while unauthenticated calls return `401 Unauthorized`).
- [ ] Authentication (`requireUser()`) and ownership verification are strictly separate checks, and zero endpoints trust client-supplied `clientUserId`, `passedUserId`, or `owner_id`.
- [ ] `POST /api/products` uses strict Zod schema allowlisting with zero `...productData` mass assignment, and public product endpoints do not expose seller `specificAddress`.

## Manual verification (for the human)

- Create two test accounts (`User A` and `User B`). Log in as `User A` and verify via browser DevTools that attempting to edit/delete `User B`'s product or view `User B`'s support ticket/order returns `403`.
- Open `GET /api/products/<any-public-product-id>` in an incognito window and verify `specificAddress` is excluded from the JSON payload and `IN_CLOSET` items return `404`.
