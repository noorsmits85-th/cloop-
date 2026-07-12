import { defineConfig } from '@prisma/config';
import "dotenv/config"; // 🚀 NẠP THƯ VIỆN ĐỂ BỐC TỰ ĐỘNG LINK SUPABASE THẬT

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});