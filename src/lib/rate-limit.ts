import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis only if tokens are provided (prevent crashing if .env is missing)
const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Search: 5 requests per second
export const searchRateLimit = redis 
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(5, "1 s"),
      analytics: true,
    })
  : null;

// Visual search calls external vision models, so keep this quota tighter than text search.
export const visualSearchRateLimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: true,
    })
  : null;

// Checkout: 1 request per 3 seconds
export const checkoutRateLimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(1, "3 s"),
      analytics: true,
    })
  : null;

// Auth routes (/login, /auth/*): 15 requests per minute
export const authRateLimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(15, "1 m"),
      analytics: true,
    })
  : null;

// Dashboard routes (/my-closet/*): 45 requests per minute
export const dashboardRateLimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(45, "1 m"),
      analytics: true,
    })
  : null;

// Shop / Product routes (/shop, /api/products): 60 requests per minute
export const shopRateLimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      analytics: true,
    })
  : null;

// General API routes (/api/*): 30 requests per minute
export const apiRateLimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      analytics: true,
    })
  : null;

/**
 * 🛡️ Kiểm tra Rate Limit ở Edge Middleware với triết lý Fail-Open tuyệt đối.
 * Nếu Redis gặp sự cố, hệ thống tự động cho qua để không chặn nhầm người dùng hợp lệ.
 */
export async function checkEdgeRateLimit(
  ip: string,
  type: "auth" | "dashboard" | "shop" | "api" = "shop"
): Promise<{ success: boolean; limit?: number; remaining?: number; reset?: number }> {
  if (!redis) return { success: true };

  let limiter: Ratelimit | null = null;
  if (type === "auth") limiter = authRateLimit;
  else if (type === "dashboard") limiter = dashboardRateLimit;
  else if (type === "api") limiter = apiRateLimit;
  else limiter = shopRateLimit;

  if (!limiter) return { success: true };

  try {
    const key = `cloop:rl:${type}:${ip}`;
    const result = await limiter.limit(key);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (err) {
    // 🛡️ FAIL-OPEN SAFETY: Không bao giờ block user nếu Redis timeout/chập chờn
    console.warn("⚠️ [RateLimit Fail-Open]:", err);
    return { success: true };
  }
}
