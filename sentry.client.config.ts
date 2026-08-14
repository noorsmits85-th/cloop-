import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 1. SIẾT VAN QUOTA: Chỉ lấy 10% user thực tế để vẽ biểu đồ Performance
  tracesSampleRate: 0.1, 
  
  // 2. REPLAY: Quay video màn hình lúc bị lỗi (Rất xịn nhưng rất tốn Quota)
  replaysOnErrorSampleRate: 1.0, // Có lỗi thì quay 100%
  replaysSessionSampleRate: 0.0, // Bình thường thì tắt hẳn (0%)

  // 3. MÀNG LỌC CHỐNG NHIỄU (BỘ LỌC RÁC CỦA TRÌNH DUYỆT)
  ignoreErrors: [
    // Lỗi vớ vẩn của UI / React
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications.",
    "Non-Error promise rejection captured",
    
    // Lỗi mạng cục bộ của user (Tắt WiFi, 3G chập chờn)
    "Network Error",
    "Failed to fetch",
    "Load failed",
    "Request aborted",
    "fetch is not defined",
    
    // Lỗi do User chủ động chặn hoặc Extension trình duyệt
    "The play() request was interrupted",
    "User denied Geolocation",
  ],

  // 4. CHẶN ĐỨNG VIRUS & EXTENSION (Không bắt lỗi từ mã nguồn lạ)
  denyUrls: [
    // Tiêu diệt toàn bộ log từ các Extension (Chrome, Firefox, Safari)
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-web-extension:\/\//i,
    // Chặn các script nhúng của bên thứ 3 hay gây nhiễu (nếu có)
    /gtag\/js/i, 
  ],
});
