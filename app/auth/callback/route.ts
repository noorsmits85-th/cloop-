import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/src/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const safeNext =
    next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
      ? next
      : '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Sync into Prisma User table
      try {
        const { prisma } = await import('@/src/lib/prisma');
        const userName =
          data.user.user_metadata?.name ||
          data.user.user_metadata?.full_name ||
          data.user.email?.split('@')[0] ||
          'Thành viên CLOOP';
        const existingUser =
          typeof prisma.user.findUnique === 'function'
            ? await prisma.user.findUnique({
                where: { id: data.user.id },
                select: { id: true, name: true, isVerified: true },
              })
            : null;
        // 🛡️ BẢO MẬT ĐỊNH DANH (IDENTITY BOUNDARY):
        // Tuyệt đối KHÔNG ghi đè User.name từ user_metadata khi tài khoản đã tồn tại tên hoặc đã xác thực (isVerified),
        // và KHÔNG tự động gán isVerified = true khi tạo tài khoản qua OAuth callback.
        const shouldSetInitialName =
          !existingUser?.isVerified && !existingUser?.name?.trim();
        await prisma.user.upsert({
          where: { id: data.user.id },
          update: {
            email: data.user.email || '',
            ...(shouldSetInitialName ? { name: userName } : {}),
          },
          create: {
            id: data.user.id,
            email: data.user.email || `${data.user.id}@cloop.vn`,
            password: 'oauth_managed',
            name: userName,
            walletBalance: 0,
            cloopCoins: 100,
            role: 'USER',
            isVerified: false,
          },
        });
      } catch (e) {
        // TODO: Tích hợp hệ thống tracking (Sentry/LogRocket) để giám sát lỗi đồng bộ OAuth user
        Sentry.captureException(e);
      }
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=InvalidToken`);
}
