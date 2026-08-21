import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from './src/utils/supabase/middleware';

// Danh sách định dạng tệp tĩnh cần bỏ qua
const STATIC_ASSET_REGEX = /\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)$/i;

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Bỏ qua các file tĩnh và Cronjob nội bộ (Tối ưu tốc độ tải trang)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/cron') ||
    pathname === '/favicon.ico' ||
    STATIC_ASSET_REGEX.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 2. Xác định các route yêu cầu bắt buộc đăng nhập (Auth-Protected)
  const isProtectedApi = 
    pathname.startsWith('/api/disputes') ||
    pathname.startsWith('/api/user') ||
    pathname.startsWith('/api/checkout');

  const isProtectedPage = 
    pathname.startsWith('/my-closet') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/checkout');

  // Route công khai (Homepage, Shop, Product detail, Blog...) -> Cho qua tức thì
  if (!isProtectedApi && !isProtectedPage) {
    return NextResponse.next();
  }

  // 3. FAIL-CLOSED ENFORCEMENT: Xử lý bảo mật cho route được bảo vệ
  try {
    const { response, user, error } = await updateSession(request);

    // Nếu không có phiên đăng nhập hợp lệ hoặc Supabase gặp sự cố -> Chặn ngay lập tức (Fail-Closed)
    if (!user || error) {
      if (isProtectedApi) {
        return NextResponse.json(
          { success: false, error: "Unauthorized: Yêu cầu đăng nhập để truy cập tài nguyên này" },
          { status: 401 }
        );
      }

      if (isProtectedPage) {
        const loginUrl = new URL('/', request.url);
        loginUrl.searchParams.set('auth', 'login');
        loginUrl.searchParams.set('redirectTo', `${pathname}${search}`);
        return NextResponse.redirect(loginUrl);
      }
    }

    return response;
  } catch (error) {
    console.error("⛔ [Middleware Auth Failure - Fail Closed]:", error);
    
    if (isProtectedApi) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Không thể xác thực phiên người dùng" },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('auth', 'login');
    loginUrl.searchParams.set('redirectTo', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$).*)',
  ],
};
