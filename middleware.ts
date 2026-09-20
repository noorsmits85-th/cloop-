import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from './src/utils/supabase/middleware';
import { checkEdgeRateLimit } from './src/lib/rate-limit';

// Danh sách định dạng tệp tĩnh cần bỏ qua
const STATIC_ASSET_REGEX = /\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)$/i;

// Helper trích xuất nhanh User ID từ session cookie mà không cần gọi mạng
function getUserIdFromRequest(request: NextRequest): string | null {
  try {
    const cookies = request.cookies.getAll();
    const authCookies = cookies
      .filter(c => c.name.includes('-auth-token'))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    if (authCookies.length === 0) return null;
    let rawVal = authCookies.map(c => c.value).join('');
    if (rawVal.startsWith('base64-')) {
      rawVal = Buffer.from(rawVal.slice(7), 'base64').toString('utf-8');
    }
    const parsed = JSON.parse(rawVal);
    const token = parsed?.access_token || (Array.isArray(parsed) ? parsed[0] : null);
    if (typeof token === 'string' && token.includes('.')) {
      const parts = token.split('.');
      if (parts.length >= 2) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        if (payload?.sub) return payload.sub;
      }
    }
    if (parsed?.user?.id) return parsed.user.id;
  } catch {}
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Bỏ qua các file tĩnh và Cronjob nội bộ (Tối ưu tốc độ tải trang)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/zalo-webhook') ||
    pathname === '/favicon.ico' ||
    STATIC_ASSET_REGEX.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 📱 1.1 ĐIỀU HƯỚNG THÔNG MINH THEO THIẾT BỊ (Mobile -> Giao diện App, Laptop -> Giữ nguyên bản Web)
  const userAgent = request.headers.get('user-agent') || '';
  const isMobileOrZalo = /Android|iPhone|iPad|iPod|Zalo|MiniApp|Mobile/i.test(userAgent);
  const isWebOldRoute = pathname === '/' || pathname === '/ai-stylist' || pathname === '/blog';

  // CHỈ chuyển hướng sang /app khi truy cập từ ĐIỆN THOẠI (Mobile / Zalo)
  // Trên Laptop / Máy tính: Giữ nguyên 100% giao diện Web rộng lớn ban đầu!
  if (isMobileOrZalo && isWebOldRoute) {
    const appUrl = new URL('/app', request.url);
    if (search) {
      appUrl.search = search;
    }
    return NextResponse.redirect(appUrl);
  }

  // ⚡ 1.2 PHÒNG THỦ CỔNG VÀO: Edge Rate Limiting với Fail-Open
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                   request.headers.get('x-real-ip') ||
                   '127.0.0.1';

  let rlType: "auth" | "dashboard" | "shop" | "api" | null = null;
  if (pathname.startsWith('/login') || pathname.startsWith('/auth/')) {
    rlType = 'auth';
  } else if (pathname.startsWith('/my-closet')) {
    rlType = 'dashboard';
  } else if (pathname.startsWith('/shop') || pathname.startsWith('/api/products')) {
    rlType = 'shop';
  } else if (pathname.startsWith('/api/')) {
    rlType = 'api';
  }

  if (rlType) {
    // 1. Kiểm tra rate limit theo IP
    let rlRes = await checkEdgeRateLimit(clientIp, rlType);

    // 2. Chống bot xoay IP/Proxy: Nếu là route dashboard hoặc API và đã đăng nhập, kiểm tra thêm theo User ID
    if (rlRes.success && (rlType === 'dashboard' || rlType === 'api')) {
      const authUserId = getUserIdFromRequest(request);
      if (authUserId) {
        const userRlRes = await checkEdgeRateLimit(`usr_${authUserId}`, rlType);
        if (!userRlRes.success) {
          rlRes = userRlRes;
        }
      }
    }
    if (!rlRes.success) {
      const resetSec = rlRes.reset ? Math.max(1, Math.ceil((rlRes.reset - Date.now()) / 1000)) : 60;
      
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          {
            success: false,
            error: "Hệ thống đang tiếp nhận quá nhiều yêu cầu từ thiết bị của bạn. Vui lòng thử lại sau.",
            retryAfter: resetSec,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(resetSec),
              'X-RateLimit-Limit': String(rlRes.limit || 0),
              'X-RateLimit-Remaining': '0',
            }
          }
        );
      }

      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>429 - Hệ thống đang tiếp nhận quá nhiều yêu cầu | CLOOP</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #FAF9F5; color: #183A2D; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
            .card { background: white; padding: 40px; border-radius: 24px; border: 1px solid #E9E2D8; box-shadow: 0 10px 30px rgba(0,0,0,0.05); max-width: 440px; text-align: center; }
            h1 { font-size: 20px; margin-bottom: 12px; }
            p { font-size: 13px; color: #666; line-height: 1.6; margin-bottom: 24px; }
            .btn { background: #183A2D; color: white; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Hệ thống đang tiếp nhận quá nhiều yêu cầu</h1>
            <p>Vui lòng đợi <strong>${resetSec} giây</strong> trước khi tải lại trang để bảo vệ an toàn cho hệ sinh thái thời trang tuần hoàn CLOOP.</p>
            <a href="/" class="btn">Quay về Trang chủ</a>
          </div>
        </body>
        </html>`,
        {
          status: 429,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Retry-After': String(resetSec),
            'X-RateLimit-Limit': String(rlRes.limit || 0),
            'X-RateLimit-Remaining': '0',
          }
        }
      );
    }
  }

  // 2. Xác định các route yêu cầu bắt buộc đăng nhập (Auth-Protected)
  const isProtectedApi = 
    pathname.startsWith('/api/disputes') ||
    pathname.startsWith('/api/user') ||
    pathname.startsWith('/api/checkout');

  const isProtectedPage = 
    (pathname.startsWith('/my-closet') && !pathname.startsWith('/my-closet/create')) ||
    pathname.startsWith('/admin');

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
        const loginUrl = new URL('/login', request.url);
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

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$).*)',
  ],
};
