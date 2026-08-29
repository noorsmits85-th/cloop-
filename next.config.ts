import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
      allowedOrigins: ["192.168.1.5:3000", "localhost:3000"],
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
