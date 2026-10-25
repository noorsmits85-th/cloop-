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

    const users: any[] = await prismaAdmin.$queryRawUnsafe(
      `SELECT username, unlocked_subjects FROM public.tdv_users 
       WHERE LOWER(username) = LOWER($1) AND password = $2 
       LIMIT 1;`,
      username,
      password
    );

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, message: "Sai tên đăng nhập hoặc mật khẩu!" },
        { status: 401 }
      );
    }

    const user = users[0];
    return NextResponse.json({
      success: true,
      user: {
        username: user.username,
        unlockedSubjects: user.unlocked_subjects || [],
      },
    });
  } catch (error: any) {
    console.error("[TDV Auth Login] Error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi kết nối cơ sở dữ liệu." },
      { status: 500 }
    );
  }
}
