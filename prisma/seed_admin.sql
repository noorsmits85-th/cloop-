-- Script Cấp quyền Quản trị (Admin)
-- Chạy đoạn SQL này trong SQL Editor của Supabase Dashboard (app.supabase.com)
-- ⚠️ NHỚ THAY ĐỔI EMAIL THÀNH EMAIL ĐANG TEST CỦA BẠN

UPDATE "User"
SET role = 'ADMIN'
WHERE email = 'demo@cloop.vn'; -- Thay email của bro vào đây
