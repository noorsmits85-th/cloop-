-- Thêm enum value SHIPPING_RETAINED vào LedgerType một cách an toàn
ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'SHIPPING_RETAINED';

-- Đổi tên cột cloopCoins thành cloopLeaves và đặt default là 1500 (Điểm thưởng Gamification)
-- Lưu ý: Dùng ALTER TABLE RENAME để bảo toàn số liệu cũ thay vì Drop
ALTER TABLE "User" RENAME COLUMN "cloopCoins" TO "cloopLeaves";
ALTER TABLE "User" ALTER COLUMN "cloopLeaves" SET DEFAULT 1500;

-- Thêm cột mới walletBalance (Ví Tiền Thật)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "walletBalance" INTEGER NOT NULL DEFAULT 0;
