import { createBrowserClient } from '@supabase/ssr';
import type { Database } from "@/types/supabase";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (client) return client;

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        path: '/',
        sameSite: 'lax',
        maxAge: 365 * 24 * 60 * 60, // 1 năm lưu trữ phiên bền bỉ trên điện thoại & trình duyệt
      },
    }
  );

  return client;
}
