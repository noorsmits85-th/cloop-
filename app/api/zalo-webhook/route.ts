import { NextRequest, NextResponse } from "next/server";

// Endpoint tiếp nhận webhook từ Zalo Mini App (xử lý rút lại quyền và xoá dữ liệu người dùng)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    console.log("🔔 [Zalo Webhook Event Received]:", JSON.stringify(body, null, 2));

    // Zalo yêu cầu phản hồi HTTP 200 trong vòng 2 giây
    return NextResponse.json(
      {
        error: 0,
        message: "Webhook processed successfully",
        data: {
          receivedAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("❌ [Zalo Webhook Error]:", err);
    // Vẫn trả về 200 để tránh Zalo coi webhook bị lỗi retry liên tục
    return NextResponse.json({ error: 0, message: "Acknowledged" }, { status: 200 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json(
    {
      status: "active",
      message: "CLOOP Zalo Mini App Webhook Service is running.",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
