# SECRETS_EXPOSURE Fix Plan

## Changes

- `.gitignore` — Restore complete Next.js `.gitignore` from `HEAD` (`git checkout HEAD -- .gitignore`) and ensure `.env`, `.env.*`, `!.env.example`, `/node_modules`, `/.next/`, `*.pem`, `*.key`, `*.sql.bak`, and `/scratch/` are excluded.
- `.vercelignore` — Add `.env`, `.env.*`, `!.env.example`, and `security/` so local environment files and internal audit notes are never uploaded during CLI deploys.
- `public/` — Delete `public/api/`, `public/scripts/`, `public/.vercel/`, `public/node_modules/`, `public/package.json`, `public/package-lock.json`, `public/vercel.json`, and `public/.gitignore`.
- `api/lib/db.js` — Remove the hardcoded `postgresql://...` fallback URI on line 3 (fail closed if `process.env.TDV_DATABASE_URL` / `process.env.DATABASE_URL` is unset) and remove `rejectUnauthorized: false` (use standard TLS CA verification).
- `api/lib/supabase.js`, `src/lib/supabase.ts`, `lib/supabase.ts` — Remove hardcoded Supabase URL / anon key / `"temporary-placeholder-key"` fallbacks; add `import "server-only"` to any module initializing `SUPABASE_SERVICE_ROLE_KEY`.
- `src/utils/shipping.ts` — Remove hardcoded fallback string in `SECRET_KEY` (`line 3`); throw an error if `process.env.SHIPPING_SECRET` is missing.
- `src/services/googleDriveStorage.ts` — Remove hardcoded `script.google.com/macros/s/.../exec` URLs (`lines 9-14`); read strictly from `process.env.GOOGLE_DRIVE_WEBHOOK_URL` / `GOOGLE_DRIVE_WEBHOOK_URL_2`.
- `js/config.js` & `public/js/config.js` — Delete `presetCodes` array (`lines 33-118`) so license keys exist exclusively as hashed/server-side records in PostgreSQL.
- `js/auth.js` — Remove `DEFAULT_SEED_USERS` (`lines 18-21`) and direct Supabase anon credentials (`lines 26-27`).
- `app/(storefront)/login/actions.ts`, `scripts/grant_admin.ts`, `prisma/seed.ts`, `seed_mock.js` — Remove hardcoded fallback passwords; require explicit environment variables in local dev/seed scripts only.

## New files

- `.env.example` — Template listing all required environment variable names (`DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `SHIPPING_SECRET`, `CRON_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CLOUDINARY_*`, `GEMINI_API_KEY`, `GHN_*`, `GOOGLE_*`) with safe placeholder values only (`YOUR_VALUE_HERE`).

## Verification goals

After implementation, ALL of these must be true:

- [ ] `git ls-files ".env*"` returns only `.env.example` (never `.env` or `.env.local`), and `git status -s` no longer lists `.env` or `.env.local` as untracked.
- [ ] Searching across all source files (`app/`, `src/`, `lib/`, `api/`, `js/`, `public/`, `scripts/`) for `postgresql://`, `sk_live_`, `sk_test_`, `AKIA`, hardcoded `TDV-` license keys, or fallback secret keys returns nothing.
- [ ] No environment variable prefixed with `NEXT_PUBLIC_`, `VITE_`, or `REACT_APP_` holds a private/secret key.
- [ ] `.env.example` exists with placeholder values only.
- [ ] `/.env`, `/.git/config`, `/api/lib/db.js`, `/scripts/audit_supabase.js`, `/.vercel/project.json`, and common backup/dump paths return `404` or `403` on the deployed app.
- [ ] Directory listing is disabled across static paths (`/uploads/`, `/static/`, `/public/`).

## Manual verification (for the human)

- **Mandatory Credential Rotation**:
  1. Rotate the PostgreSQL password for Supabase project `dkwlzsamdpgzbusakmmh` immediately (and CLOOP project `notxrjsuukrrxdlboavo` if credentials were ever reused).
  2. Rotate `SHIPPING_SECRET` and redeploy Google Apps Script Drive webhooks.
  3. Mark all 70 legacy `TDV-*` preset keys in `public.tdv_license_keys` as revoked/expired and generate fresh cryptographically random keys server-side (Hãy chạy thử script này ở môi trường Local trước khi đẩy lên Staging/Production).
- Install `gitleaks` (`winget install Gitleaks.Gitleaks`) and run `gitleaks detect --source . --verbose` to verify git commit history is clean.
