# DATABASE_ACCESS Security Report

## Status: CRITICAL

## Findings

CLOOP defines 26 PostgreSQL models in `prisma/schema.prisma` alongside 3 unmanaged TDV tables (`public.tdv_users`, `public.tdv_license_keys`, `public.tdv_password_resets`). Auditing migrations, SQL grant scripts, emergency lockdown scripts, Supabase client wrappers, and browser `.from()` calls revealed critical PostgREST/RLS gaps, syntax-broken lockdown scripts, wide-open `USING (true)` policies on TDV user/key tables, and client-side queries lacking ownership filters.

1. **CRITICAL — Wide-Open `FOR ALL USING (true)` RLS Policies on TDV Auth & License Tables (`scripts/setup_supabase_tdv.js:38-46`)**
   - `setup_supabase_tdv.js` enables RLS on `public.tdv_users` and `public.tdv_license_keys`, then immediately grants unrestricted `SELECT, INSERT, UPDATE, DELETE` access to anonymous PostgREST callers:
   ```sql
   -- scripts/setup_supabase_tdv.js:41-46
   CREATE POLICY allow_all_tdv_users ON public.tdv_users FOR ALL USING (true) WITH CHECK (true);
   CREATE POLICY allow_all_tdv_keys ON public.tdv_license_keys FOR ALL USING (true) WITH CHECK (true);
   ```
   - `public.tdv_password_resets` (storing 6-digit recovery OTPs) has no RLS enablement script anywhere in the repository.
   - Combined with `SUPABASE_ANON_KEY` in `public/js/auth.js:24`, any anonymous user can dump `public.tdv_users` (emails, passwords/hashes, session tokens) and `public.tdv_license_keys` (`WHERE used = false`) via PostgREST.

2. **CRITICAL — Dangerous `GRANT ALL ... TO anon` Scripts & Missing Migration-Managed RLS on 20+ CLOOP Tables**
   - `prisma/grant_privileges.sql:1-7`, `grant.sql:1`, and `fix_grants.js:6-8` execute:
   ```sql
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
   ```
   - `prisma/migrations/20260814094500_normalize_naming/migration.sql:584-613` enabled RLS on only 6 tables (`products`, `product_images`, `listings`, `profiles`, `blog_posts`, `reviews` — all with `FOR SELECT USING (true)`) and left 20+ sensitive Prisma tables (`"User"`, `"Invoice"`, `"LedgerTransaction"`, `"rental_history"`, `"Dispute"`, `"AuditLog"`, `"TransactionHistory"`, `"withdrawal_requests"`, `"coin_topups"`, `"coin_ledger_entries"`, `"shipments"`, `"support_tickets"`, `"support_messages"`, `"ai_stylist_logs"`) without migration-managed RLS.

3. **CRITICAL — 4 Fatal Defects in `scripts/emergency_lockdown_ultimatum_v2.sql`**
   - **Syntax Error (`lines 195-212`)**: The `DO $$` block opened at line 195 is never closed before raw Vietnamese prose (`Bạn có thể nối trực tiếp...`) and `SQL` are pasted at lines 209–211, causing PostgreSQL to abort and roll back the entire `BEGIN; ... COMMIT;` transaction if executed directly.
   - **17 Real Prisma Tables Omitted (`lines 17-46`)**: `target_tables` hardcodes 28 generic names (19 of which do not exist in `prisma/schema.prisma`) and misses 17 real CLOOP tables (`products`, `ProductImage`, `product_image_embeddings`, `AccountingPeriod`, `BlogPost`, `BlogInteraction`, `ProductLifecycle`, `eco_metrics`, `TransactionHistory`, `shipments`, `product_favorites`, `coin_quest_claims`, `coin_ledger_entries`, `withdrawal_requests`, `support_tickets`, `support_messages`, `ai_stylist_logs`) plus all 3 TDV tables.
   - **`SELECT` Never Revoked (`lines 81, 103`)**: Only revokes `INSERT, UPDATE, DELETE, TRUNCATE`, leaving `SELECT` grants intact if RLS is off on any omitted table.
   - **Wrong Column Names (`lines 122-177`)**: Trigger references `NEW.balance` and `NEW."coinBalance"`, whereas `prisma/schema.prisma:25-27` uses `"walletBalance"`, `"pendingWithdrawalBalance"`, and `"cloopCoins"`.

4. **HIGH — Unprotected Direct Browser `supabase.from()` Mutations & Client Auth Bypass**
   - `app/create/page.tsx:66-82`: Unauthenticated browser `supabase.from("products").insert([...])`.
   - `app/(dashboard)/my-closet/_components/ArchiveClient.tsx:17-20`: Browser `supabase.from("products").update({ isShopHidden: false }).eq("id", id)` without `.eq("userId", currentUserId)`.
   - `app/(dashboard)/my-closet/_components/ItemsClient.tsx:372-375`: Browser fallback `supabase.from("BlogPost").update({ status: newStatus }).eq("productId", productId)` without ownership filter.
   - `js/auth.js:644-646`: Client-side password verification bypass (`isPwValid = ... || cleanPass.length >= 4` allows any 4+ character string to authenticate against `scrypt$` accounts).
   - Also note: revoking all `anon`/`authenticated` `SELECT` on `public` breaks existing client-side read hooks (`app/hooks/useMarketplaceData.ts`, `app/hooks/useTopClosets.ts`, `components/RentalBookingBox.tsx`, `app/(storefront)/blog/page.tsx`) unless either scoped `SELECT` RLS policies exist on public catalog tables (`products`, `Listing`, `ProductImage`, `BlogPost`, `Review`) or those hooks are migrated to Server Actions/API routes.

5. **MEDIUM — `getSession()` Trust in `src/utils/supabase/middleware.ts:44-53` & Missing `"server-only"` on `src/lib/supabase.ts`**
   - `src/utils/supabase/middleware.ts:44-53` reads `supabase.auth.getSession()` (unverified cookie payload) and skips `supabase.auth.getUser()` unless `!user` or `expires_at` is within 60 seconds.
   - `src/lib/supabase.ts` exports `supabaseAdmin` (`SUPABASE_SERVICE_ROLE_KEY`) alongside browser `supabase` without `import "server-only"`.

## What's at risk

- **Full Dump & Tampering of User/Financial/License Tables via PostgREST**: Using only the public `NEXT_PUBLIC_SUPABASE_ANON_KEY`, an attacker can query or modify any table where RLS is disabled or `USING (true)` is active—including dumping `User` password hashes/balances, patching `Invoice.status` to `PAID` if lockdown has not cleanly committed, or dumping all `tdv_users` and `tdv_license_keys`.
- **Silent Failure of Lockdown Rollout**: Running `emergency_lockdown_ultimatum_v2.sql` fails on syntax error and, even if trimmed, leaves 17 real CLOOP tables and 3 TDV tables unlocked.

## What's already secure

- **Prisma Connection Pooling & Soft-Delete Extension (`src/lib/prisma.ts:90-149`)**: Properly configures Supavisor transaction pooling (`connection_limit=5&pgbouncer=true`) and enforces soft-delete filtering (`isDeleted: false`).
- **Dynamic Table Discovery in `scripts/emergency_lockdown.sql:56-61`**: Queries `pg_tables WHERE schemaname = 'public'` dynamically rather than relying on a stale hardcoded table list.

## Recommendations

1. **Create and apply a syntax-verified, schema-accurate RLS & Privilege Lockdown Migration (`prisma/migrations/...` + `scripts/lockdown_all_tables_v3.sql`)**:
   - Dynamically `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` (for non-owner roles) on **every** table in `public` (all 26 CLOOP Prisma tables + `tdv_users`, `tdv_license_keys`, `tdv_password_resets`, `_prisma_migrations`).
   - `REVOKE ALL PRIVILEGES` (including `SELECT`) on all `public` tables, sequences, and functions from `PUBLIC`, `anon`, and `authenticated`, and `ALTER DEFAULT PRIVILEGES` to prevent future `GRANT ALL` leaks.
   - Drop `allow_all_tdv_users`, `allow_all_tdv_keys`, and any `USING (true)` policies on user/profile tables.
   - Delete dangerous `prisma/grant_privileges.sql`, `grant.sql`, and `fix_grants.js` so `GRANT ALL ... TO anon` can never be re-run accidentally.
2. **Migrate remaining browser `supabase.from()` calls to Prisma Server Actions / API Routes**: Replace direct browser PostgREST calls in `app/create/page.tsx`, `ArchiveClient.tsx`, `ItemsClient.tsx`, `WalletClient.tsx`, `blog/create/page.tsx`, `blog/page.tsx`, `useMarketplaceData.ts`, `useTopClosets.ts`, `RentalBookingBox.tsx`, and `js/auth.js` with authenticated Server Actions / API routes so PostgREST can remain 100% closed to `anon`/`authenticated` (or, for strictly public catalog tables only, define read-only `FOR SELECT` RLS policies exposing non-sensitive columns).
3. **Fix column names in forensic/trigger scripts & split `supabaseAdmin`**: Update `"walletBalance"`, `"pendingWithdrawalBalance"`, and `"cloopCoins"` in SQL triggers/forensic scripts, move `supabaseAdmin` into `src/lib/supabase-admin.ts` with `import "server-only"`, and always call `supabase.auth.getUser()` in `src/utils/supabase/middleware.ts`.
