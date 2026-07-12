import { createClient } from "@supabase/supabase-js";

// 1. Đọc cấu hình bảo mật từ file .env của dự án
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 2. Chặn lỗi từ vòng gửi xe nếu quên chưa cấu hình môi trường
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ LỖI: Thiếu cấu hình NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY trong file .env!");
}

// 3. Khởi tạo và export thực thể supabase xịn đét toàn hệ thống
// Cấu hình thêm bộ persistSession để trình duyệt tự găm token, không bao giờ out app bậy bạ
export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});