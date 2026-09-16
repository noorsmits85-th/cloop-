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
      analytics: false,
    })
  : null;

// Visual search calls external vision models, so keep this quota tighter than text search.
export const visualSearchRateLimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: false,
    })
  : null;

// Checkout: 1 request per 3 seconds
export const checkoutRateLimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(1, "3 s"),
      analytics: false,
    })
  : null;

// Auth routes (/login, /auth/*): 15 requests per minute
export const authRateLimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(15, "1 m"),
      analytics: false,
    })
  : null;

// Dashboard routes (/my-closet/*): 45 requests per minute
export const dashboardRateLimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(45, "1 m"),
      analytics: false,
    })
  : null;

// Shop / Product routes (/shop, /api/products): 60 requests per minute
export const shopRateLimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      analytics: false,
    })
  : null;

// General API routes (/api/*): 30 requests per minute
export const apiRateLimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      analytics: false,
    })
  : null;

// 🛡️ Bộ nhớ đệm cục bộ (In-Memory Sliding Window) đóng vai trò lá chắn dự phòng
// Đảm bảo Rate Limiting VẪN HOẠT ĐỘNG CHẶN SPAM ngay cả khi Upstash Redis timeout/DNS lỗi/chưa có token
const localMemoryStore = new Map<string, number[]>();

function checkLocalMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = (localMemoryStore.get(key) || []).filter(t => t > windowStart);

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

  // Dọn rác định kỳ nếu bộ nhớ vượt 10,000 keys
  if (localMemoryStore.size > 10000) {
    for (const [k, ts] of localMemoryStore.entries()) {
      if (ts.every(t => t <= windowStart)) {
        localMemoryStore.delete(k);
      }
    }
  }

  return {
    success: true,
    limit,
    remaining: limit - timestamps.length,
    reset: now + windowMs,
  };
}

const RL_CONFIGS: Record<string, { limit: number; windowMs: number }> = {
  auth: { limit: 15, windowMs: 60 * 1000 },
  dashboard: { limit: 45, windowMs: 60 * 1000 },
  shop: { limit: 60, windowMs: 60 * 1000 },
  api: { limit: 30, windowMs: 60 * 1000 },
};

/**
 * 🛡️ Kiểm tra Rate Limit ở Edge Middleware:
 * 1. Thử qua Upstash Redis phân tán (Edge/Global).
 * 2. Nếu Redis gặp sự cố (DNS, timeout), tự động rơi vào lớp phòng thủ In-Memory Sliding Window (KHÔNG thả cửa cho bot).
 * 3. Bắt mọi ngoại lệ bất ngờ để duy trì tính sẵn sàng (Fail-Open) không bao giờ crash 500.
 */
export async function checkEdgeRateLimit(
  identifier: string,
  type: "auth" | "dashboard" | "shop" | "api" = "shop"
): Promise<{ success: boolean; limit?: number; remaining?: number; reset?: number }> {
  const config = RL_CONFIGS[type] || RL_CONFIGS.shop;
  const key = `cloop:rl:${type}:${identifier}`;

  // 1. Thử kiểm tra qua Redis nếu có cấu hình
  if (redis) {
    let limiter: Ratelimit | null = null;
    if (type === "auth") limiter = authRateLimit;
    else if (type === "dashboard") limiter = dashboardRateLimit;
    else if (type === "api") limiter = apiRateLimit;
    else limiter = shopRateLimit;

    if (limiter) {
      try {
        const result = await limiter.limit(key);
        return {
          success: result.success,
          limit: result.limit,
          remaining: result.remaining,
          reset: result.reset,
        };
      } catch (err) {
        // Redis không phản hồi -> Chuyển ngay sang lớp phòng thủ bộ nhớ đệm cục bộ
        console.warn("⚠️ [RateLimit Upstash Error -> Fallback Local Memory]:", (err as any)?.message || err);
      }
    }
  }

  // 2. Fallback In-Memory Sliding Window (Luôn chặn spam chuẩn xác theo ngưỡng)
  try {
    return checkLocalMemoryRateLimit(key, config.limit, config.windowMs);
  } catch (err) {
    console.error("⚠️ [RateLimit Final Fail-Open]:", err);
    return { success: true, limit: config.limit, remaining: 1, reset: Date.now() + config.windowMs };
  }
}
