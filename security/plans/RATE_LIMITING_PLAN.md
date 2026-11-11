# RATE_LIMITING Fix Plan

## Changes

- `src/lib/rate-limit.ts` — Add dedicated Upstash Redis sliding-window limiters for `authLoginLimiter` (`10 req / 15 m`), `authRegisterLimiter` (`5 req / 15 m`), `otpSendLimiter` (`3 req / 10 m`), `otpVerifyLimiter` (`5 req / 10 m`), `checkoutLimiter` (`10 req / 1 m`), and `aiGenerationLimiter` (`10 req / 1 m`); ensure `/api/visual-search` and `/api/voice-transcribe` fall back to bounded limiter enforcement (or fail closed `429`/`503`) rather than `allowed = true`.
- `src/utils/rate-limit.ts` — Deprecate standalone per-Lambda `Map` rate limiting in favor of `src/lib/rate-limit.ts` backed by Upstash Redis.
- `middleware.ts` — Replace `x-forwarded-for.split(',')[0]` with `getTrustedClientIp(request)` (`x-vercel-forwarded-for` / platform IP); remove unsigned JWT Base64 `sub` bucket rotation; add rate-limit tier coverage for `/admin/*`, `/checkout/*`, and `/api/tdv/*`; return `429` with `Retry-After` on all rate-limited API paths.
- `app/(storefront)/login/actions.ts` — Enforce `authLoginLimiter`, `authRegisterLimiter`, `otpSendLimiter`, and `otpVerifyLimiter` (keyed by both `trustedIp` and `email`) inside `login`, `signup`, `loginWithOtp`, `verifyOtp`, `resetPasswordForEmail`, and `verifyRecoveryOtp`.
- `app/actions/phone-verification.ts` — Enforce `otpSendLimiter` on `requestPhoneOtpAction` and `otpVerifyLimiter` + hard 5-attempt OTP invalidation on `verifyPhoneOtpAction` in Upstash Redis.
- `app/api/tdv/**` & `api/tdv/**` — Enforce per-IP and per-account rate limiting (`10 req / 15 m` on `login`/`register`, `3 req / 15 m` on `send-otp`, `5` max attempts per OTP on `verify-otp`) returning HTTP `429`.
- `app/api/visual-search/route.ts`, `app/api/voice-transcribe/route.ts`, `app/api/stylist/route.ts`, `app/api/ai-autofill/route.ts`, `app/api/ai-story/route.ts`, `app/api/ai-suggest/route.ts`, `app/api/analyze-fit/route.ts`, `app/api/moderate-image/route.ts` — Use `getTrustedClientIp(req)` and enforce `aiGenerationLimiter` returning `429`.

## New files

- `src/lib/request-ip.ts` — Platform-aware trusted IP extraction utility (`x-vercel-forwarded-for` on Vercel, preventing client `X-Forwarded-For` header spoofing).

## Verification goals

After implementation, ALL of these must be true:

- [ ] Login, registration, password reset, and all 6-digit OTP verification flows enforce distributed rate limiting (<= 10 login/register attempts per 15 minutes; <= 5 guesses per OTP).
- [ ] Rate limiters cannot be bypassed by spoofing `X-Forwarded-For` headers or calling Server Actions from non-`/login` pages.
- [ ] Exceeding any rate limit returns HTTP `429` (or `{ error: "...", retryAfter }` with `429` semantics on Server Actions) and `Retry-After`.
- [ ] Expensive AI endpoints, checkout, uploads, and `/admin` routes are all covered by non-bypassable rate limiters.

## Manual verification (for the human)

- Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set in Vercel Production & Preview Environment Variables.
- Submit 11 rapid failed login attempts on Staging while sending randomized `X-Forwarded-For: 1.2.3.X` headers and confirm attempt #11 is blocked with `429`.
