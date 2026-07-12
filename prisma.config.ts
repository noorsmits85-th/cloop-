import { defineConfig } from '@prisma/config';
import "dotenv/config"; // 🚀 NẠP THƯ VIỆN ĐỂ BỐC TỰ ĐỘNG LINK SUPABASE THẬT

export default defineConfig({
  engine: 'classic', // ✨ THÊM DÒNG NÀY VÀO ĐỂ SỬA LỖI HIỆN TẠI NÈ TRANG
  datasource: {
    url: process.env.DATABASE_URL || '',
  },
});