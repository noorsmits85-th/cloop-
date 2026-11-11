import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

// Endpoint tiếp nhận webhook từ Zalo Mini App (xử lý rút lại quyền và xoá dữ liệu người dùng)
export async function POST(req: NextRequest) {
  const oaSecret = process.env.ZALO_OA_SECRET_KEY;
  if (!oaSecret) {
    return NextResponse.json({ error: 1, message: "Webhook secret is not configured" }, { status: 401 });
  }

  try {
    const rawBody = await req.text();
    const signatureHeader =
      req.headers.get("x-zevent-signature") ||
      req.headers.get("x-zalo-signature") ||
      "";
    const macMatch = signatureHeader.match(/mac=([a-fA-F0-9]{64})/);
    const providedMac = macMatch ? macMatch[1].toLowerCase() : signatureHeader.trim().toLowerCase();

    if (!/^[a-f0-9]{64}$/.test(providedMac)) {
      return NextResponse.json({ error: 1, message: "Missing or invalid webhook signature" }, { status: 401 });
    }

    let body: Record<string, any> = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return NextResponse.json({ error: 1, message: "Invalid JSON body" }, { status: 400 });
    }

    const appId = String(body.app_id ?? "");
    const timestamp = String(body.timestamp ?? "");

    // Zalo OA Webhook signature can be SHA256(appId + rawBody + timestamp + oaSecret) or HMAC-SHA256(rawBody, oaSecret)
    const sha256Candidate = crypto
      .createHash("sha256")
      .update(`${appId}${rawBody}${timestamp}${oaSecret}`, "utf8")
      .digest("hex");
    const hmacCandidate = crypto
      .createHmac("sha256", oaSecret)
      .update(rawBody, "utf8")
      .digest("hex");

    const providedBuf = Buffer.from(providedMac, "hex");
    const sha256Buf = Buffer.from(sha256Candidate, "hex");
    const hmacBuf = Buffer.from(hmacCandidate, "hex");

    const isValid =
      (providedBuf.length === sha256Buf.length && crypto.timingSafeEqual(providedBuf, sha256Buf)) ||
      (providedBuf.length === hmacBuf.length && crypto.timingSafeEqual(providedBuf, hmacBuf));

    if (!isValid) {
      return NextResponse.json({ error: 1, message: "Invalid webhook signature" }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: 0,
        message: "Webhook processed successfully",
        data: {
          eventName: typeof body.event_name === "string" ? body.event_name : "unknown",
          receivedAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[Zalo Webhook Error]:", err?.message || "Unexpected error");
    return NextResponse.json({ error: 1, message: "Webhook processing failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    {
      status: "active",
      message: "CLOOP Zalo Mini App Webhook Service is running.",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
