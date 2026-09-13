import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { response: supabaseResponse, user: null, error: new Error("Missing Supabase credentials") };
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // ⚡ SIÊU TỐI ƯU: Đọc session từ cookie trước (0ms) thay vì luôn gửi request HTTPS sang server Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    let user = session?.user || null;
    let error = sessionError;

    // Chỉ gọi getUser() qua mạng khi không có session hoặc token sắp hết hạn (< 60s) để refresh token
    if (!user || (session?.expires_at && session.expires_at * 1000 < Date.now() + 60000)) {
      const { data: { user: fetchedUser }, error: fetchError } = await supabase.auth.getUser();
      user = fetchedUser;
      error = fetchError;
    }

    return { response: supabaseResponse, user, error };
  } catch (err: any) {
    console.error("⚠️ [Middleware Supabase Error]:", err?.message || err);
    return { response: supabaseResponse, user: null, error: err };
  }
}
