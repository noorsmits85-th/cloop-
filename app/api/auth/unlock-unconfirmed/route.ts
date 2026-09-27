import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const userId = body.userId ? String(body.userId) : null;

    if (!email) {
      return NextResponse.json({ success: false, error: "Missing email" }, { status: 400 });
    }

    // 1. Tự động kích hoạt email_confirmed_at trong Postgres auth.users nếu đang bị NULL
    const updatedCount = await prisma.$executeRawUnsafe(
      `UPDATE auth.users SET email_confirmed_at = NOW() WHERE LOWER(email) = LOWER($1) AND email_confirmed_at IS NULL;`,
      email
    );

    // 2. Tìm ID thực tế của user trong auth.users nếu chưa có userId
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const rows: any = await prisma.$queryRawUnsafe(
        `SELECT id, email FROM auth.users WHERE LOWER(email) = LOWER($1) LIMIT 1;`,
        email
      );
      if (rows && rows.length > 0) {
        resolvedUserId = rows[0].id;
      }
    }

    // 3. Đồng bộ với bảng User của Prisma để bảo đảm không bị lỗi Foreign Key khi tạo sản phẩm
    if (resolvedUserId) {
      const displayName = name || email.split("@")[0] || "Thành viên CLOOP";
      await prisma.user.upsert({
        where: { id: resolvedUserId },
        update: { email },
        create: {
          id: resolvedUserId,
          email,
          password: "supabase_auth_managed",
          name: displayName,
          walletBalance: 0,
          cloopCoins: 100,
          role: "USER",
          isVerified: true
        }
      });
    }

    return NextResponse.json({ success: true, unlocked: updatedCount > 0, userId: resolvedUserId });
  } catch (err: any) {
    console.error("Lỗi unlock-unconfirmed API:", err);
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
