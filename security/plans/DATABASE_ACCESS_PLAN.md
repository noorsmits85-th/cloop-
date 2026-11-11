# DATABASE_ACCESS Fix Plan

## Changes

- `prisma/grant_privileges.sql`, `grant.sql`, `fix_grants.js` — Delete or replace these dangerous `GRANT ALL ... TO anon` scripts so anonymous PostgREST privileges can never be re-granted.
- `scripts/setup_supabase_tdv.js` — Remove `allow_all_tdv_users` and `allow_all_tdv_keys` (`USING (true) WITH CHECK (true)`); add `CREATE TABLE IF NOT EXISTS public.tdv_password_resets`, enable RLS on all 3 TDV tables (`tdv_users`, `tdv_license_keys`, `tdv_password_resets`), and revoke all `anon`/`authenticated` privileges so TDV tables are accessed solely via server-side API routes.
- `scripts/emergency_lockdown_ultimatum_v2.sql`, `scripts/audit_cross_check_forensics.sql`, `scripts/remediate_and_ban_e2e_accounts.sql` — Fix unclosed `DO $$` syntax error at lines 195–212, replace hardcoded hallucinated table names with dynamic `pg_tables WHERE schemaname = 'public'` iteration covering all 26 Prisma tables + 3 TDV tables, include `REVOKE ALL` (including `SELECT`), and fix `"User"` column names (`"walletBalance"`, `"pendingWithdrawalBalance"`, `"cloopCoins"`). *(Lưu ý: Hãy chạy thử script này ở môi trường Local trước khi đẩy lên Staging/Production — tuyệt đối không chứa `DROP TABLE` hay `TRUNCATE`.)*
- `src/lib/supabase.ts` — Split `supabaseAdmin` into a dedicated `src/lib/supabase-admin.ts` protected by `import "server-only"`.
- `src/utils/supabase/middleware.ts` — Always verify sessions via `await supabase.auth.getUser()` rather than trusting unverified `getSession()` cookie data.
- `app/create/page.tsx`, `app/(dashboard)/my-closet/_components/ArchiveClient.tsx`, `app/(dashboard)/my-closet/_components/ItemsClient.tsx`, `app/(dashboard)/my-closet/_components/WalletClient.tsx`, `app/(storefront)/blog/create/page.tsx`, `app/(storefront)/blog/page.tsx`, `app/hooks/useMarketplaceData.ts`, `app/hooks/useTopClosets.ts`, `components/RentalBookingBox.tsx`, `js/auth.js` — Replace direct browser `supabase.from(...)` reads/writes with Prisma Server Actions / API routes enforcing server-side authentication and `userId` ownership checks.

## New files

- `scripts/lockdown_all_tables_v3.sql` — Syntax-validated, idempotent PostgreSQL RLS & privilege lockdown script dynamically enabling RLS across 100% of `public` tables, revoking `anon`/`authenticated` access on all sensitive tables, dropping `USING (true)` policies on user/key tables, and updating default privileges (zero `DROP TABLE` or `TRUNCATE`). *(Hãy chạy thử script này ở môi trường Local trước khi đẩy lên Staging/Production.)*
- `src/lib/supabase-admin.ts` — Server-only (`import "server-only"`) Supabase service-role client.

## Verification goals

After implementation, ALL of these must be true:

- [ ] Every table in `public` (all 26 CLOOP Prisma tables + `_prisma_migrations` + all TDV tables) has `rowsecurity = true` in `pg_tables`.
- [ ] Every table either denies PostgREST `anon`/`authenticated` completely (zero grants + default-deny RLS for Prisma-managed tables) or has explicit least-privilege policies scoped to `auth.uid()` (never `FOR ALL USING (true)`).
- [ ] No policy on user, order, invoice, wallet, dispute, message, or license-key tables uses `USING (true)`.
- [ ] Unauthenticated PostgREST requests with only `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `/rest/v1/User`, `/rest/v1/Invoice`, `/rest/v1/tdv_users`, and `/rest/v1/tdv_license_keys` return `401`/`403` or empty denied responses.
- [ ] Zero client components perform unguarded `supabase.from(...).insert/update/delete` calls from the browser.

## Manual verification (for the human)

- Test `scripts/lockdown_all_tables_v3.sql` on your Local database first ("Hãy chạy thử script này ở môi trường Local trước khi đẩy lên Staging/Production"), then execute it in Supabase SQL Editor on Staging/Production (for both CLOOP and TDV Supabase projects if separate).
- Run `scripts/verify_28_tables_lockdown_status.sql` (updated to check all tables in `pg_tables WHERE schemaname = 'public'`) in Supabase SQL Editor and confirm 0 tables have `rowsecurity = false` or `anon` write/read grants on private tables.
- Verify from an unauthenticated terminal that `GET https://<project>.supabase.co/rest/v1/User?select=*` with header `apikey: <NEXT_PUBLIC_SUPABASE_ANON_KEY>` returns `401`/`403` (`permission denied`).
