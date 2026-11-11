# PASSWORD_HASHING Fix Plan

## Changes

- `app/(storefront)/login/actions.ts` — Remove `fastLoginAction` (`lines 354-443`) and any hardcoded `DEMO_PILOT_EMAIL` / `DEMO_PILOT_PASSWORD` credentials.
- `app/api/tdv/register/route.ts` & `app/api/tdv/login/route.ts` — Replace raw plaintext password SQL insert/select with `scrypt` password hashing and `crypto.timingSafeEqual` verification (`src/lib/password-hash.ts`), enforce minimum password length `>= 8` (max `128`), and issue signed/hashed `HttpOnly` session cookies rather than trusting client `username`.
- `api/lib/security.js`, `api/tdv/register.js`, `api/tdv/login.js`, `api/tdv/forgot-password/verify-otp.js` — Remove legacy plaintext fallback comparison (`stored === raw` at `api/lib/security.js:76-81`); raise minimum password length from `4` to `8`; hash `desktop_session_token` / `mobile_session_token` with SHA-256 before storing in DB; reject missing/empty `session_token` with `401` and never return stored tokens in responses.
- `app/actions/phone-verification.ts` — Replace `Math.random()` with `crypto.randomInt(100000, 1000000)`; remove `console.log` printing `randomOtp` (`line 124`); remove `ENABLE_DEMO_OTP`, `demoOtp` response field, and `"123456"` bypass (`lines 132, 165-167`); store HMAC-SHA256 hashed OTP + `attempts` counter in Upstash Redis (or PostgreSQL) with 3-minute TTL, `crypto.timingSafeEqual` verification, and automatic deletion after 5 failed guesses.
- `api/tdv/forgot-password/send-otp.js`, `api/tdv/forgot-password/verify-otp.js`, `api/lib/mailer.js` — Generate OTP via `crypto.randomInt(100000, 1000000)`; store HMAC-SHA256 digest of OTP in `public.tdv_password_resets` plus `attempt_count` column (max 5 attempts); add IP + email rate limiting; remove plaintext OTP `console.log` fallback in `mailer.js`.
- `prisma/seed.ts` — Guard execution behind `if (process.env.NODE_ENV === "production") throw new Error(...)` and replace literal password strings with generated random values.

## New files

- `src/lib/password-hash.ts` — TypeScript `scrypt` (`N=16384, r=8, p=1`, 16-byte random salt, 64-byte derived key, `crypto.timingSafeEqual`) password and OTP HMAC utility shared by Next.js routes/actions.
- `scripts/migrate_tdv_plaintext_passwords.sql` — Safe migration script (no `DROP TABLE` or `TRUNCATE`) that adds `attempt_count INT NOT NULL DEFAULT 0` to `public.tdv_password_resets`, clears unhashed session tokens, and flags or hashes any remaining non-`scrypt$` rows in `public.tdv_users` for mandatory password reset. *(Lưu ý: Hãy chạy thử script này ở môi trường Local trước khi đẩy lên Staging/Production.)*

## Verification goals

After implementation, ALL of these must be true:

- [ ] Passwords in custom auth (`tdv_users`) are hashed exclusively with `scrypt` (or bcrypt/Argon2), while main CLOOP accounts authenticate solely via Supabase Auth bcrypt (`auth.users`).
- [ ] Zero plaintext, MD5, SHA-1, or unsalted SHA-256 password comparisons exist anywhere in `app/`, `api/`, or `src/`.
- [ ] Existing plaintext rows in `public.tdv_users` are migrated or invalidated requiring password reset.
- [ ] `fastLoginAction` and `ENABLE_DEMO_OTP` / `"123456"` backdoors no longer exist in the codebase.
- [ ] All OTPs use `crypto.randomInt`, store only HMAC-SHA256 hashes, never appear in `console.log` or API responses, and lock/invalidate after 5 failed verification attempts.

## Manual verification (for the human)

- Run `scripts/migrate_tdv_plaintext_passwords.sql` on a local database backup first ("Hãy chạy thử script này ở môi trường Local trước khi đẩy lên Staging/Production"), then inspect `SELECT COUNT(*) FROM public.tdv_users WHERE password NOT LIKE 'scrypt$%';` to confirm `0` plaintext passwords remain.
- Reset the password of `th4212044@gmail.com` in Supabase Auth Dashboard and verify MFA is enabled on all admin accounts (`ADMIN_EMAILS`).
- Check Vercel Environment Variables to ensure `ENABLE_DEMO_OTP`, `DEMO_PILOT_EMAIL`, and `DEMO_PILOT_PASSWORD` are deleted.
