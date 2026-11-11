# SECRETS_EXPOSURE Security Report

## Status: CRITICAL

## Findings

Investigation across `.gitignore`, `.vercelignore`, git history, static `public/` assets, server routes, scripts, and frontend files uncovered multiple critical secret exposures—including a live PostgreSQL superuser password hardcoded in source code and placed inside Next.js's static `public/` webroot, an overwritten `.gitignore` leaving live `.env` and `.env.local` unignored, and 70 hardcoded commercial license keys.

1. **CRITICAL — Hardcoded Production PostgreSQL Password Served Over Static HTTP (`api/lib/db.js:3` & `public/api/lib/db.js:3`)**
   - Both `api/lib/db.js:3` and `public/api/lib/db.js:3` hardcode a Supabase PostgreSQL pooler `postgres` superuser connection string with a plaintext password as a fallback, and disable TLS certificate validation (`ssl: { rejectUnauthorized: false }` at `lines 9-11`):
   ```js
   // api/lib/db.js:3 & public/api/lib/db.js:3
   let connectionString = process.env.DATABASE_URL || 'postgresql://postgres.dkwlzsamdpgzbusakmmh:[REDACTED]@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres';
   ```
   - Because Next.js serves every file under `public/` directly at `/`, `public/api/lib/db.js` is publicly downloadable as raw source code at `GET /api/lib/db.js`.

2. **CRITICAL — `.gitignore` Overwritten to Single Line, Leaving `.env` & `.env.local` Unprotected (`/.gitignore:1`)**
   - In `HEAD`, `.gitignore` had 52 standard Next.js exclusion rules (`.env*`, `/node_modules`, `/.next/`, `*.pem`). In the current working tree, `.gitignore` was overwritten to a single line:
   ```gitignore
   .vercel
   ```
   - Live `.env` (containing 25 variables including `DATABASE_URL`, `DIRECT_URL`, `CLOUDINARY_API_SECRET`, `GEMINI_API_KEY`, `GEMINI_API_KEYS`, `CRON_SECRET`, `UPSTASH_REDIS_REST_TOKEN`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `GHN_API_TOKEN`, `SHIPPING_SECRET`, and `GOOGLE_PRIVATE_KEY`) and `.env.local` (`VERCEL_OIDC_TOKEN`) appear as untracked (`?? .env`, `?? .env.local`) in `git status`. Running `git add .` will commit all 26 production secrets to Git.
   - `.env.example` does **not** exist in the repository.

3. **CRITICAL — Backend Source Tree, Audit Scripts & Metadata Exposed Under `public/`**
   - Static HTTP exposure inside `public/` currently includes:
     - `public/api/lib/{db,mailer,security,supabase}.js` and `public/api/tdv/**` (12 backend files)
     - `public/scripts/audit_supabase.js`
     - `public/.vercel/project.json` (exposing Vercel `orgId` and `projectId`)
     - `public/package.json`, `public/package-lock.json`, `public/vercel.json`, and `public/node_modules/**` (878 files).
   - `.vercelignore` excludes root `scripts/` and `*.sql`, **but does NOT exclude `.env`, `.env.local`, `public/api/**`, `public/scripts/**`, or `public/node_modules/**`**.

4. **HIGH — Hardcoded Fallback Secrets, License Keys & Seed Admin Passwords in Source Files**
   - `src/utils/shipping.ts:3` hardcodes a fallback HMAC key (`process.env.SHIPPING_SECRET || process.env.PAYOS_CHECKSUM_KEY || "[REDACTED]"`).
   - `src/services/googleDriveStorage.ts:9-14` hardcodes two live Google Apps Script `/exec` webhook URLs.
   - `app/(storefront)/login/actions.ts:355-356` hardcodes `th4212044@gmail.com` (`ADMIN_EMAILS`) and a fallback password in `fastLoginAction`.
   - `js/config.js:33-118` and `public/js/config.js:33-118` hardcode **70 commercial single-use license activation keys** (`TDV-[REDACTED]`), matching `scripts/seed_supabase_keys.js:14-47`.
   - `js/auth.js:18-21` hardcodes `DEFAULT_SEED_USERS` (`student@gmail.com` and `admin@gmail.com` with plaintext passwords), and `api/lib/supabase.js:3-4` / `js/auth.js:26-27` / `public/js/auth.js:23-24` hardcode Supabase URL and publishable key literals.
   - `scripts/grant_admin.ts:28`, `prisma/seed.ts:25,36`, `seed_mock.js:11`, and `scripts/test_*.ts` contain hardcoded default/test passwords.

5. **Tooling Note (`gitleaks` / `semgrep`)**
   - `git ls-files ".env*"` and `git log --all --full-history -- ".env" ".env.*" "*.pem" "*.key"` confirmed `.env*` files have never been committed to git history.
   - `gitleaks` and `semgrep` are not installed on this Windows host (install commands: `winget install Gitleaks.Gitleaks` and `pip install semgrep`). Note that `HEAD:index.html:762` previously contained `DEFAULT_KEYS` in git history, so those 70 TDV license keys must be invalidated in the database.

## What's at risk

- **Total Database Takeover**: Anyone downloading `/api/lib/db.js` or reading the repository obtains the `postgres` superuser password for `dkwlzsamdpgzbusakmmh`, granting unrestricted read/write/delete access bypassing all RLS policies.
- **Accidental Full Secret Leak to GitHub**: With `.gitignore` stripped to `.vercel`, a single `git add . && git commit` exposes PayOS checksum keys, Google Cloud private keys, Cloudinary API secrets, Upstash Redis tokens, and CLOOP's main `DATABASE_URL`.
- **Revenue Theft**: Anyone inspecting `/js/config.js` can extract all 70 paid TDV VIP activation codes without paying.

## What's already secure

- **`.env` Never Committed in Git History**: `git ls-files ".env*"` and `git log --all --full-history` return empty for `.env` and `.env.local`.
- **Clean `NEXT_PUBLIC_*` Separation**: None of the 8 `NEXT_PUBLIC_*` variables in `.env` or source code contain private server keys (`SUPABASE_SERVICE_ROLE_KEY`, `PAYOS_CHECKSUM_KEY`, `GOOGLE_PRIVATE_KEY`, `CLOUDINARY_API_SECRET`, etc. all lack the `NEXT_PUBLIC_` prefix).

## Recommendations

1. **Rotate compromised credentials immediately**: Rotate the PostgreSQL database password for project `dkwlzsamdpgzbusakmmh` (and CLOOP's main Supabase DB password if shared), rotate `SHIPPING_SECRET`, redeploy the two Google Apps Script Drive webhooks with new URLs, and revoke/regenerate the 70 hardcoded `TDV-*` license keys in `public.tdv_license_keys`.
2. **Restore `.gitignore` & harden `.vercelignore` immediately**: Restore full `.env*`, `/node_modules`, `/.next/`, `*.pem`, `*.key`, `security/` (if reports should stay local) exclusions in `.gitignore` before running any `git add` command, and add `.env*` and `public/api` guards to `.vercelignore`.
3. **Purge backend files from `public/` & remove all hardcoded fallbacks**: Delete `public/api/`, `public/scripts/`, `public/.vercel/`, `public/node_modules/`, `public/package*.json`, and `public/vercel.json`; remove hardcoded connection strings, keys, passwords, and `presetCodes` from `api/lib/db.js`, `api/lib/supabase.js`, `src/utils/shipping.ts`, `src/services/googleDriveStorage.ts`, `js/config.js`, `public/js/config.js`, `js/auth.js`, `app/(storefront)/login/actions.ts`, and `scripts/grant_admin.ts`.
4. **Create `.env.example` with safe placeholders**: Document all required environment variables using placeholder values only.
