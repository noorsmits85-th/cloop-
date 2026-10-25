import { NextResponse } from "next/server";
import { prismaAdmin } from "@/src/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawKey = (body.key || "").trim().toUpperCase();
    const scope = (body.scope || "").trim();
    const targetSub = (body.subject || "").trim();
    const username = (body.username || "").trim();

    if (!rawKey) {
      return NextResponse.json(
        { success: false, message: "Thiếu mã kích hoạt!" },
        { status: 400 }
      );
    }

    // 1. Check license key state in Supabase
    const keyRecords: any[] = await prismaAdmin.$queryRawUnsafe(
      `SELECT key, scope, used FROM public.tdv_license_keys WHERE UPPER(key) = $1 LIMIT 1;`,
      rawKey
    );

    if (keyRecords.length === 0) {
      return NextResponse.json(
        { success: false, message: "Mã kích hoạt không tồn tại trên hệ thống!" },
        { status: 404 }
      );
    }

    const keyRecord = keyRecords[0];

    // STRICT 1-TIME USE RULE
    if (keyRecord.used) {
      return NextResponse.json(
        {
          success: false,
          message:
            "⚠️ Mã kích hoạt này đã được sử dụng rồi! Mỗi mã chỉ được kích hoạt 1 lần duy nhất.",
        },
        { status: 400 }
      );
    }

    // 2. Mark key as used
    await prismaAdmin.$executeRawUnsafe(
      `UPDATE public.tdv_license_keys 
       SET used = true, used_at = now(), used_by = $1 
       WHERE UPPER(key) = $2;`,
      username || "guest",
      rawKey
    );

    // 3. If user is logged in, attach unlocked course permanently to their account in Supabase
    const subToAdd = keyRecord.scope === "all" ? "all" : targetSub;
    if (username) {
      await prismaAdmin.$executeRawUnsafe(
        `UPDATE public.tdv_users
         SET unlocked_subjects = array_append(unlocked_subjects, $1),
             updated_at = now()
         WHERE LOWER(username) = LOWER($2) 
           AND NOT ($1 = ANY(unlocked_subjects));`,
        subToAdd,
        username
      );
    }

    return NextResponse.json({
      success: true,
      key: rawKey,
      subject: targetSub,
      unlockedSubject: subToAdd,
    });
  } catch (error: any) {
    console.error("[TDV Redeem Key] Error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi kích hoạt mã." },
      { status: 500 }
    );
  }
}
