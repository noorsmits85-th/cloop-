import { NextResponse } from "next/server";
import { prismaAdmin } from "@/src/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = (body.username || "").trim();
    const password = (body.password || "").trim();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tên đăng nhập và mật khẩu!" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing: any[] = await prismaAdmin.$queryRawUnsafe(
      `SELECT id FROM public.tdv_users WHERE LOWER(username) = LOWER($1) LIMIT 1;`,
      username
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, message: "Tên đăng nhập / Số điện thoại này đã tồn tại!" },
        { status: 400 }
      );
    }

    // Create user in Supabase
    const created: any[] = await prismaAdmin.$queryRawUnsafe(
      `INSERT INTO public.tdv_users (username, password, unlocked_subjects)
       VALUES ($1, $2, '{}'::text[])
       RETURNING username, unlocked_subjects;`,
      username,
      password
    );

    const user = created[0];
    return NextResponse.json({
      success: true,
      user: {
        username: user.username,
        unlockedSubjects: user.unlocked_subjects || [],
      },
    });
  } catch (error: any) {
    console.error("[TDV Auth Register] Error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi đăng ký tài khoản." },
      { status: 500 }
    );
  }
}
