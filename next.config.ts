import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
      allowedOrigins: ["192.168.1.5:3000", "localhost:3000", "cloop-sable.vercel.app", "*.vercel.app"],
    },
  },
  // 📸 VÁ LỖI HÌNH ẢNH: Mở khóa ranh giới bảo mật cho Cloudinary, Supabase, Google Storage, Unsplash
  images: {
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
      frame-ancestors 'none';
      upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim();

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspDirectives },
          { key: "X-Frame-Options", value: "DENY" },
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

// Cấu hình Sentry bọc thép
export default withSentryConfig(
  nextConfig,
  {
    silent: true,
    org: "cloop-tech",
    project: "cloop-app",
    sourcemaps: {
      disable: false,
      deleteSourcemapsAfterUpload: true,
    },
    disableLogger: true,
  }
);
