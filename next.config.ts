import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  allowedDevOrigins: ["192.168.1.8", "192.168.1.8:3000", "localhost:3000", "127.0.0.1:3000", "192.168.1.5:3000"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
      allowedOrigins: ["192.168.1.8:3000", "192.168.1.8", "localhost:3000", "127.0.0.1:3000", "192.168.1.5:3000", "cloop-sable.vercel.app", "*.vercel.app"],
    },
  },
  // ⚡ GIẢM KÍCH THƯỚC SERVERLESS FUNCTIONS VERCEL: Loại bỏ các file không dùng khỏi bundle
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@swc/core-win32-x64-msvc",
      "node_modules/@esbuild",
      "node_modules/webpack",
      "node_modules/terser",
      "scripts/**",
      "tests/**",
      "scratch/**",
      "docs/**",
      "prisma/seed.ts",
      ".git/**",
      "**/*.md",
      "**/*.docx",
      "**/*.sql",
      "**/*.py",
    ],
  },
  // 📸 GIẢI PHÓNG 100% QUOTA IMAGE OPTIMIZATION VERCEL (Xóa bỏ cảnh báo đỏ 1.000 ảnh/tháng)
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "notxrjsuukrrxdlboavo.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "drive.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  // 🛡️ BẢO MẬT HTTP HEADERS BỌC THÉP CHUẨN OWASP / A+ SECURITY RATING (REQ-026)
  async headers() {
    // ⚡ Trong môi trường development (chạy HTTP qua LAN/localhost), tắt HSTS & upgrade-insecure-requests để điện thoại tải CSS/JS bình thường
    if (process.env.NODE_ENV === "development") {
      return [];
    }

    const cspDirectives = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://res.cloudinary.com https://challenges.cloudflare.com https://cdn.jsdelivr.net https://vercel.live;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      img-src 'self' blob: data: https:;
      font-src 'self' https://fonts.gstatic.com data:;
      connect-src 'self' https: wss:;
      frame-src 'self' https://challenges.cloudflare.com https://*.payos.vn https://res.cloudinary.com;
      media-src 'self' blob: data: https://res.cloudinary.com https:;
      object-src 'none';
      base-uri 'self';
      form-action 'self' https://*.payos.vn;
      frame-ancestors 'self' https://zalo.me https://*.zalo.me https://*.zadn.vn https://*.zaloplatforms.com;
      upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim();

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspDirectives },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), browsing-topics=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

// ⚡ TỐI ƯU HÓA DUNG LƯỢNG VERCEL FUNCTION STORAGE: Tắt sourcemaps không cần thiết
export default withSentryConfig(
  nextConfig,
  {
    silent: true,
    org: "cloop-tech",
    project: "cloop-app",
    sourcemaps: {
      disable: true, // Tiết kiệm hàng chục GB Functions Storage trên Vercel
    },
    disableLogger: true,
  }
);
