# PASSWORD_HASHING Security Report

## Status: CRITICAL

## Findings

CLOOP's main storefront delegates customer password storage to Supabase Auth (`auth.users.encrypted_password` using bcrypt), storing only a static placeholder (`"supabase_auth_managed"` / `"oauth_managed"`) in `public.User.password`. However, the repository also contains active custom TDV authentication endpoints (`app/api/tdv/*` and `api/tdv/*`), a demo admin login action, and two custom OTP subsystems—all of which exhibit critical password-hashing, session-token, and OTP storage flaws.

1. **CRITICAL — Active Next.js TDV Endpoints Store and Compare Passwords in Raw PLAINTEXT (`app/api/tdv/register/route.ts:31-37` & `app/api/tdv/login/route.ts:17-23`)**
   - In Next.js App Router, `app/api/tdv/*` handles `/api/tdv/*` requests. `app/api/tdv/register/route.ts` inserts raw user passwords directly into `public.tdv_users.password` with zero hashing and no minimum length requirement:
   ```ts
   // app/api/tdv/register/route.ts:31-37
   const created: any[] = await prismaAdmin.$queryRawUnsafe(
     `INSERT INTO public.tdv_users (username, password, unlocked_subjects)
      VALUES ($1, $2, '{}'::text[])
      RETURNING username, unlocked_subjects;`,
     username,
     password
   );
   ```
   - `app/api/tdv/login/route.ts:17-23` authenticates via plaintext SQL comparison (`WHERE LOWER(username) = LOWER($1) AND password = $2`).

2. **HIGH — Legacy Plaintext Fallback & Weak 4-Character Password Policy in `api/lib/security.js:76-81` & `api/tdv/register.js:30`**
   - While `api/lib/security.js:6-35, 55-74` implements `crypto.scrypt` (`N: 16384, r: 8, p: 1`, 16-byte random salt, `crypto.timingSafeEqual`), lines `76-81` retain a plaintext fallback comparison (`const matches = stored === raw;`) for any `public.tdv_users` row not matching the `scrypt$...` prefix—leaving unmigrated accounts and accounts created via `app/api/tdv/register` stored in plaintext.
   - `api/tdv/register.js:30` and `api/tdv/forgot-password/verify-otp.js:33` permit 4-character passwords (`password.length < 4`).

3. **CRITICAL — Unauthenticated Demo Admin Password Reset & Login Backdoor (`app/(storefront)/login/actions.ts:354-443`)**
   - `fastLoginAction` hardcodes `email = process.env.DEMO_PILOT_EMAIL || "th4212044@gmail.com"` (which is configured in `ADMIN_EMAILS` in `src/lib/auth.ts:8`!) and a hardcoded fallback password (`line 356`), resets `auth.users.encrypted_password` on demand via raw SQL (`lines 382-386`), and signs the caller into a live **ADMIN** session.

4. **CRITICAL — Insecure PRNG (`Math.random()`), Plaintext OTP Storage, Production Console OTP Leak & `"123456"` Backdoor**
   - **CLOOP Phone OTP (`app/actions/phone-verification.ts:25, 108-132, 165-175`)**:
     - Generates 6-digit OTPs with `Math.random()` (`line 108`) and stores them in plaintext in an in-memory `Map` (`otpStore`).
     - **Unconditionally prints plaintext OTPs to production server logs** (`line 124`):
       ```ts
       // app/actions/phone-verification.ts:124
       console.log(`[PHONE_OTP_DISPATCH] User ${userAuth.id} requested OTP for ${masked} (${carrier.name}). Code: ${randomOtp}`);
       ```
     - Exposes `demoOtp: randomOtp` in the response and accepts universal bypass code `"123456"` whenever `process.env.ENABLE_DEMO_OTP === "true"` (`lines 132, 165-167`), and imposes no failed-attempt lockout in `verifyPhoneOtpAction`.
   - **TDV Password Reset OTP (`api/tdv/forgot-password/send-otp.js:40, 48-51` & `verify-otp.js:58-73`)**:
     - Generates recovery OTPs with `Math.random()`, stores raw plaintext `otp` in `public.tdv_password_resets`, logs OTPs when `SMTP_PASS` is unset (`api/lib/mailer.js:69`), and has zero rate-limiting or failed-attempt invalidation on `verify-otp.js` (allowing 6-digit OTP brute-force to reset any password).

5. **CRITICAL — Plaintext Session Tokens & Empty-Token Session Leak (`public/api/tdv/verify-session.js:45-57`, `sync-unlocks.js:54-84`)**
   - `desktop_session_token` and `mobile_session_token` are stored unhashed in `public.tdv_users` and compared with `!==`. When a request sends an empty `session_token` alongside a victim's `email`, `verify-session.js` and `sync-unlocks.js` return the victim's active plaintext `session_token` in the JSON response.

## What's at risk

- **Instant Credential Disclosure**: Anyone with read access to `public.tdv_users` (via leaked DB credentials or PostgREST exposure) obtains raw plaintext user passwords and active session tokens; password reuse compromises users across external services.
- **Full Admin Account Takeover**: Calling `fastLoginAction` grants immediate administrator privileges on CLOOP.
- **Account Takeover & Phone KYC Spoofing via OTP Brute-Force**: Because neither `verify-otp.js` nor `verifyPhoneOtpAction` caps failed guesses, an attacker can brute-force 6-digit OTPs or exploit `ENABLE_DEMO_OTP` / leaked server logs to hijack accounts and forge verified phone numbers.

## What's already secure

- **Main CLOOP Customer Auth Uses Supabase Auth (bcrypt)**: Regular customer signup/login (`app/(storefront)/login/actions.ts`, `src/lib/auth.ts`, `app/auth/callback/route.ts`) delegates password hashing and verification entirely to Supabase Auth (`auth.users.encrypted_password` bcrypt) and never stores real customer passwords in `public.User.password`.
- **Scrypt Implementation in `api/lib/security.js:6-35`**: The `hashPassword` helper itself uses `crypto.scrypt` (`N=16384, r=8, p=1`) with a 16-byte `crypto.randomBytes` salt and `crypto.timingSafeEqual` verification.

## Recommendations

1. **Eliminate plaintext passwords in `app/api/tdv/*` & migrate `public.tdv_users`**: Unify or remove duplicate TDV endpoints so all TDV registration and login paths hash passwords exclusively with `crypto.scrypt` (or `Argon2id` / `bcrypt` cost >= 12), remove the plaintext comparison fallback in `api/lib/security.js:76-81`, enforce a minimum 8-character password policy, and hash/invalidate all existing plaintext rows in `public.tdv_users`.
2. **Delete `fastLoginAction` & drop redundant `public.User.password` / `prisma/seed.ts` literals**: Remove `fastLoginAction` (`app/(storefront)/login/actions.ts:354-443`), replace hardcoded seed passwords in `prisma/seed.ts` with environment-gated dev-only random hashes, and make `public.User.password` optional (`String?`) so placeholder strings are unnecessary.
3. **Harden OTP generation, hashing, logging, and attempt lockouts**:
   - Replace `Math.random()` with `crypto.randomInt(100000, 1000000)`.
   - Store only `HMAC-SHA256(SERVER_OTP_SECRET, `${target}:${otp}`)` in Upstash Redis / PostgreSQL (never plaintext and never in Lambda RAM `Map`), and verify digests using `crypto.timingSafeEqual`.
   - Delete `console.log(... randomOtp)` and `ENABLE_DEMO_OTP` / `"123456"` from `app/actions/phone-verification.ts`.
   - Enforce a hard maximum of 5 failed verification attempts per issued OTP before immediate invalidation.
4. **Hash TDV session tokens & fix empty-token bypass**: Require a non-empty `HttpOnly; Secure; SameSite=Lax` cookie or `Authorization: Bearer` token, store only `SHA-256(token)` in `public.tdv_users`, and never echo active session tokens back in API responses.
