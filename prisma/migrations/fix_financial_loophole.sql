-- 1. Thêm Enum Sổ cái
ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'SHIPPING_RETAINED';

-- 2. Chỉ tạo thêm ví tiền thật (walletBalance) dùng cho Settlement.
-- Giữ nguyên cloopCoins làm ví/coin cũ đang chạy (Điểm Lá), tránh Downtime.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "walletBalance" INTEGER NOT NULL DEFAULT 0;
