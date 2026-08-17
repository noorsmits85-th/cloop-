import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// 1. Đọc cấu hình bảo mật từ file .env của dự án
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasSupabasePublicConfig = Boolean(supabaseUrl && supabaseAnonKey);

// 2. Chặn lỗi từ vòng gửi xe nếu quên chưa cấu hình môi trường
if (!hasSupabasePublicConfig) {
  console.error("❌ LỖI: Thiếu cấu hình NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY trong file .env!");
}

// 3. Khởi tạo và export thực thể supabase xịn đét toàn hệ thống
// Cấu hình thêm bộ persistSession để trình duyệt tự găm token, không bao giờ out app bậy bạ
export const supabase = createClient<Database>(supabaseUrl || "https://placeholder.supabase.co", supabaseAnonKey || "placeholder-anon-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// 4. Client Quyền Lực (Dành riêng cho Server/API)
// TẮT hoàn toàn auth để vượt qua RLS. Phải tuyệt đối bảo mật!
export const supabaseAdmin = hasSupabasePublicConfig && supabaseServiceKey
  ? createClient<Database>(supabaseUrl!, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;
