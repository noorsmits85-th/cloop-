import { NextResponse } from "next/server";
import { requireUser } from "@/src/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    //  Auth guard
    let userAuth: any = null;
    try {
      userAuth = await requireUser();
    } catch {
      const { createClient } = await import("@/src/utils/supabase/server");
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        userAuth = user;
      }
    }

    if (!userAuth) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để lấy cấu hình kho lưu trữ." },
        { status: 401 }
      );
    }

    const webhooks = [
      process.env.GOOGLE_DRIVE_WEBHOOK_URL,
      process.env.GOOGLE_DRIVE_WEBHOOK_URL_2,
    ].filter(Boolean) as string[];

    if (webhooks.length === 0) {
      return NextResponse.json(
        { error: "Chưa cấu hình GOOGLE_DRIVE_WEBHOOK_URL trên hệ thống." },
        { status: 500 }
      );
    }

    // Cân bằng tải tự động giữa Kho 1 (5TB) và Kho 2 (5TB)
    const selectedWebhookUrl = webhooks[Math.floor(Math.random() * webhooks.length)];
    const targetFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID_5TB || process.env.GOOGLE_DRIVE_FOLDER_ID || "";

    return NextResponse.json({
      success: true,
      webhookUrl: selectedWebhookUrl,
      folderId: targetFolderId,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi máy chủ nội bộ." }, { status: 500 });
  }
}
