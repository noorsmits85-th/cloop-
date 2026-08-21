import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from './src/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bỏ qua middleware cho file tĩnh, ảnh và public routes để tăng tốc độ tải trang lên tối đa
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/cron') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Chỉ chạy updateSession cho các route cần phiên đăng nhập
  const isAuthProtected = 
    pathname.startsWith('/my-closet') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/api/disputes') ||
    pathname.startsWith('/api/user');

  if (!isAuthProtected) {
    return NextResponse.next();
  }

  try {
    return await updateSession(request);
  } catch (error) {
    console.error("⚠️ [Middleware Fallback]:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
