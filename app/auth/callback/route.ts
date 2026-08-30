import { NextResponse } from 'next/server';
import { createClient } from '@/src/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Sync into Prisma User table
      try {
        const { prisma } = await import('@/src/lib/prisma');
        const userName = data.user.user_metadata?.name || data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || "Thành viên CLOOP";
        await prisma.user.upsert({
          where: { id: data.user.id },
          update: { name: userName, email: data.user.email || "" },
          create: {
            id: data.user.id,
            email: data.user.email || `${data.user.id}@cloop.vn`,
            password: 'oauth_managed',
            name: userName,
            walletBalance: 0,
            cloopCoins: 100,
            role: 'USER',
            isVerified: true
          }
        });
      } catch (e) {
        console.error('Error syncing OAuth user to Prisma:', e);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=InvalidToken`);
}
