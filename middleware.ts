import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from './src/utils/supabase/middleware';
import { checkoutRateLimit, searchRateLimit } from '@/src/lib/rate-limit';

export async function middleware(request: NextRequest) {
  // Bỏ qua nếu ko có config Rate Limit (Fallback an toàn)
  if (checkoutRateLimit || searchRateLimit) {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const pathname = request.nextUrl.pathname;

    // Rate limit checkout
    if (pathname.startsWith('/api/checkout') && checkoutRateLimit) {
      const { success } = await checkoutRateLimit.limit(ip);
      if (!success) {
        return new NextResponse("Mọi người đang xếp hàng dài quá, bro đợi 3 giây nhé!", { status: 429 });
      }
    }

    // Rate limit search
    if ((pathname.startsWith('/api/search') || pathname.startsWith('/api/visual-search')) && searchRateLimit) {
      const { success } = await searchRateLimit.limit(ip);
      if (!success) {
        return new NextResponse("Tìm kiếm chậm lại chút bro, chống cháy server!", { status: 429 });
      }
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
