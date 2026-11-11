# SQL_INJECTION Security Report

## Status: HIGH

## Findings

Every database query across the repository was audited, including Prisma ORM queries, **all 41** `prisma.$queryRaw` / `$queryRawUnsafe` / `$executeRaw` / `$executeRawUnsafe` call sites, all `pg` `db.query(...)` calls in `api/tdv/**`, and all Supabase PostgREST client filters. While 100% of server-side Prisma and `pg` raw SQL queries properly bind user inputs via positional `$1, $2` placeholders, **5 PostgREST `.or()` filter injection vulnerabilities** were found in `js/auth.js`.

1. **HIGH — PostgREST `.or()` Filter String Concatenation Injection in `js/auth.js` (`lines 232, 276, 346, 627, 717`)**
   - `js/auth.js` concatenates unsanitized `cleanEmail` directly into 5 PostgREST `.or(...)` filter expressions across `SELECT` (including the `password` column) and `UPDATE` queries on `tdv_users`:
   ```js
   // js/auth.js:274-276 (UPDATE query)
   await client
     .from('tdv_users')
     .update({ unlocked_subjects: merged, updated_at: new Date().toISOString() })
     .or('username.ilike.' + cleanEmail + ',email.ilike.' + cleanEmail);

   // js/auth.js:625-628 (SELECT query including password!)
   var res = await client
     .from('tdv_users')
     .select('id, username, email, password, unlocked_subjects')
     .or('username.ilike.' + cleanEmail + ',email.ilike.' + cleanEmail)
     .limit(1);
   ```
   - Because PostgREST uses `,`, `.`, `(`, and `)` as filter syntax delimiters (and `isValidEmail` `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` allows `,` and `.` in the local part of an email address), unquoted concatenation injects arbitrary boolean filter clauses into the PostgREST query.

2. **LOW / DEFENSE-IN-DEPTH — Widespread Use of `$queryRawUnsafe` / `$executeRawUnsafe` API Instead of Tagged Template `$queryRaw` / `$executeRaw`**
   - Although all 41 raw SQL calls in `app/**` and `src/**` currently pass user values safely as separate `$1, $2` positional parameters (e.g., `prisma.$queryRawUnsafe("SELECT ... WHERE id = $1", userId)`), using the `*Unsafe` methods bypasses Prisma's compile-time `Prisma.sql` tagged-template safeguard—meaning a future developer interpolating `${input}` inside `$queryRawUnsafe` would immediately introduce SQL injection.
   - In `public/api/tdv/verify-session.js:44-53, 69-72`, `${activeTokenField}` and `${activeField}` are interpolated into SQL template strings, though currently constrained via a strict boolean ternary to hardcoded column names (`'mobile_session_token'` vs `'desktop_session_token'`).

## What's at risk

- **PostgREST Filter Bypass & Mass Record Tampering on `tdv_users`**: Injecting PostgREST filter operators via `cleanEmail` in `js/auth.js` (while `allow_all_tdv_users` RLS is active) allows extracting arbitrary `tdv_users` rows (including `password`) at `line 627` or updating `unlocked_subjects` across arbitrary rows at `line 276`.

## What's already secure

- **All 41 Server-Side Prisma Raw SQL Calls Parameterized**: Every `$queryRaw`, `$queryRawUnsafe`, `$executeRaw`, and `$executeRawUnsafe` call across `app/(storefront)/login/actions.ts`, `app/admin/payments/actions.ts`, `app/actions/{booking,closet,product,support,user,withdrawal}.ts`, `app/api/checkout/route.ts`, `app/api/tdv/**`, `lib/settlement-engine.ts`, and `src/services/visualSearch.ts` uses positional `$1, $2` placeholders or `Prisma.sql` tagged templates with zero user-string concatenation.
- **All `pg` Pool Queries Parameterized (`api/tdv/**`)**: Every `db.query(sql, [params])` call uses parameterized `$1, $2` arrays.

## Recommendations

1. **Remove direct client-side PostgREST `.or()` queries in `js/auth.js`**: Delete browser-to-PostgREST `tdv_users` queries from `js/auth.js` altogether and route all TDV auth/unlock operations through parameterized server-side endpoints (`WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)`). Wherever PostgREST `.or()` is ever used in TypeScript/JS, strictly validate inputs against an alphanumeric/email regex forbidding `,`, `(`, `)`, `"` and wrap literal values in escaped double quotes.
2. **Migrate `$queryRawUnsafe` / `$executeRawUnsafe` to tagged-template `$queryRaw` / `$executeRaw`**: Refactor positional raw queries across `app/actions/**`, `app/api/**`, and `src/services/visualSearch.ts` to use tagged templates (`prisma.$queryRaw\`SELECT ... WHERE id = ${id}\``) so TypeScript/Prisma prevents future string interpolation bugs at compile time.
