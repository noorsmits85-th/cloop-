interface KeyState {
  key: string;
  cooldownUntil: number;
  totalCalls: number;
}

let keyPool: KeyState[] = [];
let currentIndex = 0;

function initializePool(): KeyState[] {
  const rawKeys: string[] = [];

  // 1. Phân tách danh sách chuỗi ngăn cách bằng dấu phẩy
  if (process.env.GEMINI_API_KEYS) {
    const list = process.env.GEMINI_API_KEYS.split(/[,\s\n]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 10);
    rawKeys.push(...list);
  }

  // 2. Thu thập các key đánh số thứ tự (GEMINI_API_KEY_1, GEMINI_API_KEY_2, ...)
  for (let i = 1; i <= 20; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`]?.trim();
    if (k && k.length > 10) rawKeys.push(k);
  }

  // 3. Thu thập các key mặc định
  const defaultKeys = [
    process.env.GEMINI_API_KEY?.trim(),
    process.env.GOOGLE_GEMINI_API_KEY?.trim(),
    process.env.GEMINI_API_KEY_DEV?.trim(),
  ].filter((k): k is string => Boolean(k && k.length > 10));

  rawKeys.push(...defaultKeys);

  // Loại bỏ trùng lặp
  const uniqueKeys = Array.from(new Set(rawKeys));

  return uniqueKeys.map((key) => ({
    key,
    cooldownUntil: 0,
    totalCalls: 0,
  }));
}

export function getAllGeminiKeys(): string[] {
  if (keyPool.length === 0) {
    keyPool = initializePool();
  }
  return keyPool.map((k) => k.key);
}

export function getNextGeminiKey(): string | null {
  if (keyPool.length === 0) {
    keyPool = initializePool();
  }

  if (keyPool.length === 0) return null;

  const now = Date.now();
  // Tìm key khả dụng không bị cooldown
  for (let attempt = 0; attempt < keyPool.length; attempt++) {
    const idx = (currentIndex + attempt) % keyPool.length;
    const item = keyPool[idx];

    if (now >= item.cooldownUntil) {
      currentIndex = (idx + 1) % keyPool.length;
      item.totalCalls += 1;
      return item.key;
    }
  }

  // Nếu tất cả đều đang cooldown, lấy key có cooldown ngắn nhất
  const sorted = [...keyPool].sort((a, b) => a.cooldownUntil - b.cooldownUntil);
  sorted[0].totalCalls += 1;
  return sorted[0].key;
}

export function markKeyCooldown(key: string, cooldownMs = 60000) {
  const item = keyPool.find((k) => k.key === key);
  if (item) {
    item.cooldownUntil = Date.now() + cooldownMs;
    console.warn(`⚠️ [Gemini Key Pool] Key ...${key.slice(-6)} vừa chạm quota/rate-limit. Tạm dừng ${cooldownMs / 1000}s, tự động chuyển key tiếp theo.`);
  }
}

/**
 * THỰC THI HÀM VỚI CƠ CHẾ TỰ ĐỘNG LUÂN CHUYỂN & FAILOVER TOÀN BỘ KEY POOL:
 * Nếu Key 1 gặp lỗi Quota (429) hoặc Network -> Tự động thử tiếp Key 2, Key 3...
 */
export async function executeWithGeminiPool<T>(
  operation: (apiKey: string) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  if (keyPool.length === 0) {
    keyPool = initializePool();
  }

  if (keyPool.length === 0) {
    throw new Error("Không tìm thấy GEMINI_API_KEY nào trong biến môi trường.");
  }

  const attempts = Math.min(maxRetries, keyPool.length);
  let lastError: any = null;

  for (let i = 0; i < attempts; i++) {
    const currentKey = getNextGeminiKey();
    if (!currentKey) break;

    try {
      return await operation(currentKey);
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || "").toLowerCase();

      // Kiểm tra lỗi Rate limit hoặc Quota từ Google
      if (
        errMsg.includes("429") ||
        errMsg.includes("quota") ||
        errMsg.includes("rate limit") ||
        errMsg.includes("resource_exhausted")
      ) {
        markKeyCooldown(currentKey, 60000); // Cooldown 1 phút
        continue; // Thử ngay lập tức với key kế tiếp
      }

      // Các lỗi khác vẫn thử với key khác nếu có
      console.warn(`[Gemini Pool] Lỗi khi gọi API với key ...${currentKey.slice(-6)}: ${err.message}. Thử key khác...`);
    }
  }

  throw lastError || new Error("Tất cả các API Key trong pool đều không thể phản hồi.");
}
