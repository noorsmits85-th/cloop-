# RATE_LIMITING Security Report

## Status: HIGH

## Findings

Inspecting `middleware.ts`, `src/lib/rate-limit.ts`, `src/utils/rate-limit.ts`, `app/(storefront)/login/actions.ts`, `app/actions/phone-verification.ts`, AI endpoints, and `api/tdv/**` uncovered four major rate-limiting vulnerabilities: trivial `X-Forwarded-For` spoofing across all IP limiters, fail-open/ephemeral in-memory rate limiters in Serverless functions, Server Action path bypasses, and zero brute-force rate limits on signup and 6-digit OTP verification endpoints.

1. **HIGH — Global `X-Forwarded-For` Leftmost IP Spoofing Bypass (`middleware.ts:65-67`, `app/api/visual-search/route.ts:12`, `app/api/voice-transcribe/route.ts:19`, `app/api/stylist/route.ts:110`)**
   - Every IP extractor reads the **first** (`split(',')[0]`) entry of `x-forwarded-for`:
   ```ts
   // middleware.ts:65-67
   const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
     || request.headers.get('x-real-ip')
     || '127.0.0.1';
   ```
   - Additionally, `middleware.ts:9-33` builds user rate-limit keys (`usr_${authUserId}`) by Base64-decoding `-auth-token` cookies without verifying JWT signatures. Rotating fake `X-Forwarded-For` headers (where upstream proxies append to `X-Forwarded-For`) or rotating unverified cookie `sub` values rotates rate-limit buckets arbitrarily.

2. **HIGH — Zero Brute-Force Protection on Signup, Password Recovery & 6-Digit OTP Verification Endpoints**
   - **Next.js Auth Server Actions (`app/(storefront)/login/actions.ts`)**:
     - When `AuthModal` submits `login`, `signup`, `verifyOtp`, or `verifyRecoveryOtp` from `/`, `/shop`, or `/product/[id]`, the POST request URL is that storefront path rather than `/login`—bypassing `middleware.ts`'s `/login` 10-req/min tier completely.
     - `signup` (`lines 247-335`, which also mints `100 cloopCoins` per account at `line 318`), `loginWithOtp` (`line 144`), **`verifyOtp` (`line 166`)**, `resetPasswordForEmail` (`line 193`), **`verifyRecoveryOtp` (`line 212`)**, and `fastLoginAction` (`line 354`) have **zero application-level rate limiting**.
     - `login` (`line 41`) calls in-memory `checkRateLimit(\`login_${email}\`, 5, 60_000)` keyed only by `email` (no per-IP limit against distributed credential stuffing).
   - **Phone Verification OTP (`app/actions/phone-verification.ts:143-222`)**: `verifyPhoneOtpAction` enforces **zero rate limit and zero failed-attempt counter** on 6-digit OTP guesses.
   - **TDV Auth & Password Reset OTP (`api/tdv/login.js`, `register.js`, `forgot-password/send-otp.js`, `forgot-password/verify-otp.js`, `app/api/tdv/*`)**: Bypass `middleware.ts` and implement **zero rate limiting or failed-attempt lockout** (allowing automated brute-force of any 6-digit password reset OTP in `verify-otp.js`).

3. **HIGH — Fail-Open & Ephemeral In-Memory Serverless Rate Limiters (`src/lib/rate-limit.ts`, `src/utils/rate-limit.ts`, `app/api/visual-search/route.ts:26-38`, `app/api/voice-transcribe/route.ts:55-67`)**
   - `middleware.ts:78` skips `/api/visual-search` and `/api/voice-transcribe`, delegating to `visualSearchRateLimit` / `voiceTranscribeRateLimit` (`src/lib/rate-limit.ts:79-105`), which are `null` whenever Upstash Redis env vars are absent and fail open (`allowed = true`) with no fallback whenever Upstash takes `> 800ms`.
   - `src/utils/rate-limit.ts` (used by `login` and `POST /api/checkout`), `app/api/stylist/route.ts:92`, and `app/actions/phone-verification.ts:25` store counters in per-instance Node.js `new Map()` memory, which resets on every Vercel cold start and does not share counts across parallel Lambda instances.
   - `/admin/*` and `/checkout/*` evaluate to `rlType = null` in `middleware.ts:69-82` (no middleware rate limit), while unauthenticated Gemini AI endpoints (`/api/ai-autofill`, `/api/ai-story`, `/api/ai-suggest`, `/api/analyze-fit`, `/api/moderate-image`) expose `GEMINI_API_KEY` to rapid quota/wallet exhaustion.

## What's at risk

- **6-Digit OTP Brute-Force & Account Takeover**: Without per-OTP attempt lockouts and distributed rate limiting on `verifyOtp`, `verifyRecoveryOtp`, `verifyPhoneOtpAction`, and `api/tdv/forgot-password/verify-otp.js`, an attacker can exhaust `10^6` combinations to reset passwords or spoof phone KYC.
- **Automated Coin Farming & Denial-of-Wallet**: Unthrottled `signup` (minting `100 cloopCoins` per registration) and unauthenticated/fail-open Gemini AI routes allow botnets to farm coins or exhaust paid Google Gemini API quotas.

## What's already secure

- **Upstash Redis Sliding-Window Infrastructure Configured (`src/lib/rate-limit.ts:1-77`)**: `@upstash/ratelimit` and `@upstash/redis` are already integrated in the project with `429 Too Many Requests` + `Retry-After` headers in `middleware.ts:105-143`.
- **TDV License Redemption Attempt Counter (`public/api/tdv/redeem.js`)**: Tracks failed license key attempts in PostgreSQL with a lockout threshold.

## Recommendations

1. **Extract non-spoofable platform client IP (`src/lib/request-ip.ts`)**: On Vercel, read `request.headers.get("x-vercel-forwarded-for")` or `request.ip` (or the rightmost trusted proxy hop when self-hosted) instead of trusting user-controlled leftmost `x-forwarded-for.split(",")[0]`, and never trust unsigned JWT `sub` claims to separate rate-limit buckets.
2. **Enforce distributed Upstash Redis rate limiting on all Auth, Signup, Password Reset & OTP endpoints**:
   - Apply dual-key (`ip` + `normalizedEmail`/`phone`) Upstash sliding-window limits directly inside `login`, `signup`, `loginWithOtp`, `verifyOtp`, `resetPasswordForEmail`, `verifyRecoveryOtp` (`app/(storefront)/login/actions.ts`), `requestPhoneOtpAction` & `verifyPhoneOtpAction` (`app/actions/phone-verification.ts`), `POST /api/checkout`, and all `api/tdv/*` auth/OTP endpoints (e.g., max `10` login/register attempts per 15 minutes per IP/account; max `5` OTP verification attempts before invalidating the OTP; `429` status on limit breach).
3. **Fail closed on high-risk Auth/OTP/Checkout/AI endpoints & cover `/admin` + `/checkout`**: When Upstash Redis errors or times out on OTP verification, password reset, checkout, or expensive AI routes, fail closed (or fall back to a shared PostgreSQL counter / strict bounded local limiter rather than `allowed = true`), and include `/admin` and `/checkout` in `middleware.ts` rate-limit tiers.
