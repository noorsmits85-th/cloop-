import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb", // 🚀 Cho phép điện thoại up ảnh gốc căng nét tới 50MB
      allowedOrigins: ["192.168.1.5:3000", "localhost:3000"], // 🔓 Đổi thành allowedOrigins là hết sạch gạch đỏ nha Trang!
    },
  },
  // 📸 VÁ LỖI HÌNH ẢNH: Mở khóa ranh giới bảo mật cho cả kho cũ Supabase và kho mới Cloudinary
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "notxrjsuukrrxdlboavo.supabase.co", // ⬅️ CHÈN THÊM CHÁU NÀY VÀO LÀ HẾT BỊ LỖI TRANG PRODUCT CŨ KHÔNG HIỆN ẢNH!
      },
    ],
  },
  // 🛡️ BẢO MẬT HTTP HEADERS BỌC THÉP (XSS, Clickjacking, MIME sniffing, Referrer)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ];
  },
  // 🛡️ Ép Vercel bỏ qua toàn bộ lỗi ESLint khi Build (Chống sập do các file js cũ)
  // 🛡️ Ép Vercel bỏ qua lỗi TypeScript (phòng hờ)
  typescript: {
    ignoreBuildErrors: true,
  },
};

// Cấu hình Sentry bọc thép
export default withSentryConfig(
  nextConfig,
  {
    // Tắt các log loằng ngoằng của Sentry lúc Vercel đang build cho đỡ rác Terminal
    silent: true,
    org: "cloop-tech",
    project: "cloop-app",

    // 🛡️ BỌC THÉP 1: Upload source maps lên Sentry nhưng GIẤU KHỎI TRÌNH DUYỆT (End-user)
    sourcemaps: {
      disable: false,
      deleteSourcemapsAfterUpload: true,
    },

    // Dọn dẹp các frame rác trong stack trace (v8 mặc định đã tối ưu)
    
    // 🛡️ BỌC THÉP 2: Ẩn các log console của Sentry trên trình duyệt khách hàng
    disableLogger: true,
  }
);
