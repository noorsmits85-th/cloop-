import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis only if tokens are provided
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

export type RateLimitCheckResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

// 🛡️ Bounded In-Memory Sliding Window Fallback
// Ensures rate limiting NEVER fails open when Upstash Redis is unconfigured or times out.
const MAX_LOCAL_KEYS = 10000;
const localMemoryStore = new Map<string, number[]>();

export function checkLocalMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitCheckResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = (localMemoryStore.get(key) || []).filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    const oldest = timestamps[0];
    const reset = oldest + windowMs;
    return {
      success: false,
      limit,
      remaining: 0,
      reset,
    };
  }

  timestamps.push(now);
  localMemoryStore.set(key, timestamps);

  if (localMemoryStore.size > MAX_LOCAL_KEYS) {
    for (const [k, ts] of localMemoryStore.entries()) {
      if (ts.every((t) => t <= windowStart)) {
        localMemoryStore.delete(k);
      }
      if (localMemoryStore.size <= MAX_LOCAL_KEYS * 0.8) {
        break;
      }
    }
    if (localMemoryStore.size > MAX_LOCAL_KEYS) {
      const oldestKey = localMemoryStore.keys().next().value;
      if (oldestKey) localMemoryStore.delete(oldestKey);
    }
  }

  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - timestamps.length),
    reset: now + windowMs,
  };
}

function createResilientLimiter(
  prefix: string,
  limit: number,
  windowDuration: Parameters<typeof Ratelimit.slidingWindow>[1],
  windowMs: number
) {
  const upstashLimiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, windowDuration),
        analytics: false,
      })
    : null;

  return {
    async limit(identifier: string): Promise<RateLimitCheckResult> {
      const fullKey = `${prefix}:${identifier}`;
      if (upstashLimiter) {
        try {
          const res = await Promise.race([
            upstashLimiter.limit(fullKey),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("UPSTASH_TIMEOUT")), 800)
            ),
          ]);
          return {
            success: res.success,
            limit: res.limit,
            remaining: res.remaining,
            reset: res.reset,
          };
        } catch (err) {
          console.warn(
            `⚠️ [RateLimit ${prefix} Redis Fallback -> In-Memory]:`,
            (err as Error)?.message || err
          );
        }
      }
      return checkLocalMemoryRateLimit(fullKey, limit, windowMs);
    },
  };
}

// Search / Voice STT: 5 requests per second (or 20 per minute burst protection)
export const searchRateLimit = createResilientLimiter("cloop:search", 5, "1 s", 1000);

// Visual search calls external vision models: 10 requests per minute
export const visualSearchRateLimit = createResilientLimiter("cloop:visual-search", 10, "1 m", 60 * 1000);

// Checkout: 1 request per 3 seconds
export const checkoutRateLimit = createResilientLimiter("cloop:checkout", 1, "3 s", 3000);

// Auth routes (/login, /auth/*): 15 requests per minute
export const authRateLimit = createResilientLimiter("cloop:auth", 15, "1 m", 60 * 1000);

// Admin routes (/admin/*): 30 requests per minute
export const adminRateLimit = createResilientLimiter("cloop:admin", 30, "1 m", 60 * 1000);

// Dashboard routes (/my-closet/*): 45 requests per minute
export const dashboardRateLimit = createResilientLimiter("cloop:dashboard", 45, "1 m", 60 * 1000);

// Shop / Product routes (/shop, /api/products): 60 requests per minute
export const shopRateLimit = createResilientLimiter("cloop:shop", 60, "1 m", 60 * 1000);

// General API routes (/api/*): 30 requests per minute
export const apiRateLimit = createResilientLimiter("cloop:api", 30, "1 m", 60 * 1000);

export type EdgeRateLimitType =
  | "auth"
  | "admin"
  | "checkout"
  | "dashboard"
  | "shop"
  | "api";

const RL_CONFIGS: Record<EdgeRateLimitType, { limit: number; windowMs: number }> = {
  auth: { limit: 15, windowMs: 60 * 1000 },
  admin: { limit: 30, windowMs: 60 * 1000 },
  checkout: { limit: 10, windowMs: 60 * 1000 },
  dashboard: { limit: 45, windowMs: 60 * 1000 },
  shop: { limit: 60, windowMs: 60 * 1000 },
  api: { limit: 30, windowMs: 60 * 1000 },
};

export async function checkEdgeRateLimit(
  identifier: string,
  type: EdgeRateLimitType = "shop"
): Promise<{ success: boolean; limit?: number; remaining?: number; reset?: number }> {
  const config = RL_CONFIGS[type] || RL_CONFIGS.shop;

  try {
    if (type === "auth") return await authRateLimit.limit(identifier);
    if (type === "admin") return await adminRateLimit.limit(identifier);
    if (type === "checkout") {
      return checkLocalMemoryRateLimit(`cloop:rl:checkout:${identifier}`, config.limit, config.windowMs);
    }
    if (type === "dashboard") return await dashboardRateLimit.limit(identifier);
    if (type === "api") return await apiRateLimit.limit(identifier);
    return await shopRateLimit.limit(identifier);
  } catch (err) {
    console.warn("⚠️ [RateLimit Fallback Local Memory]:", err);
    return checkLocalMemoryRateLimit(`cloop:rl:${type}:${identifier}`, config.limit, config.windowMs);
  }
}
