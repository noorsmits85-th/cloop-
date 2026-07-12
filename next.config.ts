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
};

export default nextConfig;