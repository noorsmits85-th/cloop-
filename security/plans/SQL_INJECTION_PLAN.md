# SQL_INJECTION Fix Plan

## Changes

- `js/auth.js` — Remove all 5 direct client-side Supabase `.from('tdv_users')` queries using `.or('username.ilike.' + cleanEmail + ...)` (`lines 232, 276, 346, 627, 717`), delegating authentication and subject-unlock synchronization exclusively to parameterized server-side API endpoints.
- `public/api/` — Delete duplicate static files (including `public/api/tdv/verify-session.js`).
- `app/actions/booking.ts`, `app/actions/closet.ts`, `app/actions/product.ts`, `app/actions/support.ts`, `app/actions/user.ts`, `app/actions/withdrawal.ts`, `app/admin/payments/actions.ts`, `app/api/checkout/route.ts`, `src/services/visualSearch.ts` — Refactor `$queryRawUnsafe` and `$executeRawUnsafe` calls to Prisma tagged-template `prisma.$queryRaw\`...\`` and `prisma.$executeRaw\`...\`` (preserving parameterized pgvector casts where needed).

## New files

- None.

## Verification goals

After implementation, ALL of these must be true:

- [ ] Every database query across Prisma, `pg`, and Supabase clients uses parameterized placeholders (`$1`, `Prisma.sql` tagged templates, or `.eq()` methods).
- [ ] Zero string concatenation or template-literal interpolation of user input exists inside SQL strings or PostgREST `.or()` filter strings.
- [ ] Searching the codebase for `.or(` with `+` / `${` and `$queryRawUnsafe` / `$executeRawUnsafe` with interpolated variables returns nothing.

## Manual verification (for the human)

- Run existing integration tests (`npm test`) on a local database after refactoring `$queryRawUnsafe` -> `$queryRaw` to confirm pgvector visual search and row-locking (`FOR UPDATE`) queries behave identically.
