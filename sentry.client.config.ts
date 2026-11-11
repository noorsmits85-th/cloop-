import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 1. SIẾT VAN QUOTA: Chỉ lấy 10% user thực tế để vẽ biểu đồ Performance
  tracesSampleRate: 0.1,

  // 2. REPLAY: Quay video màn hình lúc bị lỗi (Che toàn bộ text/media nhạy cảm để bảo vệ PII/OTP/Tài khoản ngân hàng)
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // 3. MÀNG LỌC CHỐNG NHIỄU (BỘ LỌC RÁC CỦA TRÌNH DUYỆT)
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications.",
    "Non-Error promise rejection captured",
    "Network Error",
    "Failed to fetch",
    "Load failed",
    "Request aborted",
    "fetch is not defined",
    "The play() request was interrupted",
    "User denied Geolocation",
  ],

  // 4. CHẶN ĐỨNG VIRUS & EXTENSION (Không bắt lỗi từ mã nguồn lạ)
  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-web-extension:\/\//i,
    /gtag\/js/i,
  ],
});
