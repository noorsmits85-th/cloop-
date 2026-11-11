import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    try {
      await requireAdmin();
    } catch (authError: unknown) {
      const msg = authError instanceof Error ? authError.message : "";
      if (msg.startsWith("Forbidden")) {
        return NextResponse.json(
          { error: "Bạn không có quyền truy cập cấu hình kho lưu trữ nội bộ." },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: "Vui lòng đăng nhập tài khoản Quản trị viên." },
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

    const selectedWebhookUrl = webhooks[Math.floor(Math.random() * webhooks.length)];
    const targetFolderId =
      process.env.GOOGLE_DRIVE_FOLDER_ID_5TB || process.env.GOOGLE_DRIVE_FOLDER_ID || "";

    return NextResponse.json({
      success: true,
      webhookUrl: selectedWebhookUrl,
      folderId: targetFolderId,
    });
  } catch (error: unknown) {
    // TODO: integrate Sentry/LogRocket tracking for storage dispatcher errors
    console.error("Webhook dispatcher error:", error);
    return NextResponse.json(
      { error: "Lỗi máy chủ nội bộ." },
      { status: 500 }
    );
  }
}
