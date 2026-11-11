import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const allowedServerActionOrigins = [
  "cloop-sable.vercel.app",
  ...(process.env.NEXT_PUBLIC_SITE_URL
    ? [process.env.NEXT_PUBLIC_SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "")]
    : []),
  ...(isDev ? ["localhost:3000", "127.0.0.1:3000"] : []),
];

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  allowedDevOrigins: ["localhost:3000", "127.0.0.1:3000"],
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
      allowedOrigins: Array.from(new Set(allowedServerActionOrigins)),
    },
  },
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
      "security/**",
      "prisma/seed.ts",
      ".git/**",
      "**/*.md",
      "**/*.docx",
      "**/*.sql",
      "**/*.py",
    ],
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "notxrjsuukrrxdlboavo.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "drive.googleusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    if (process.env.NODE_ENV === "development") {
      return [];
    }

    const staticCspDirectives = [
      "default-src 'self'",
      "script-src 'self' https://res.cloudinary.com https://challenges.cloudflare.com https://client.crisp.chat https://vercel.live",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://client.crisp.chat",
      "img-src 'self' blob: data: https://res.cloudinary.com https://notxrjsuukrrxdlboavo.supabase.co https://storage.googleapis.com https://lh3.googleusercontent.com https://drive.googleusercontent.com https://images.unsplash.com https://img.vietqr.io https://vietqr.net https://image.crisp.chat https://client.crisp.chat",
      "font-src 'self' https://fonts.gstatic.com https://client.crisp.chat data:",
      "connect-src 'self' https://notxrjsuukrrxdlboavo.supabase.co wss://notxrjsuukrrxdlboavo.supabase.co https://api.cloudinary.com https://res.cloudinary.com https://storage.googleapis.com https://www.googleapis.com https://pay.payos.vn https://api-merchant.payos.vn https://online-gateway.ghn.vn https://client.crisp.chat wss://client.relay.crisp.chat https://storage.crisp.chat",
      "frame-src 'self' https://challenges.cloudflare.com https://pay.payos.vn https://res.cloudinary.com https://game.crisp.chat",
      "media-src 'self' blob: data: https://res.cloudinary.com https://notxrjsuukrrxdlboavo.supabase.co https://storage.googleapis.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://pay.payos.vn",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: staticCspDirectives },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), browsing-topics=()" },
          { key: "X-XSS-Protection", value: "0" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/amin", destination: "/admin", permanent: true },
      { source: "/amin/:path*", destination: "/admin/:path*", permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: "/on-thi-tdv", destination: "/index.html" },
      { source: "/tdv", destination: "/index.html" },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: "cloop-tech",
  project: "cloop-app",
  sourcemaps: {
    disable: true,
  },
  disableLogger: true,
});
