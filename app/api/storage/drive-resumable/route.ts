import { NextResponse } from "next/server";
import { requireUser } from "@/src/lib/auth";

export const runtime = "nodejs";

/**
 * 🚀 DIRECT BROWSER-TO-DRIVE RESUMABLE UPLOAD SESSION ENDPOINT
 * 1. Xác thực người dùng (Auth Guard chống spam bộ nhớ 5TB).
 * 2. Dùng OAuth2 Refresh Token của tài khoản Google 5TB xin Access Token vĩnh viễn (không dùng Service Account).
 * 3. Khởi tạo Resumable Upload Session URI với Google Drive API có đính kèm header Origin để mở khóa CORS cho trình duyệt.
 * 4. Trình duyệt sau đó PUT thẳng file video 50-150MB lên máy chủ Google mà không đi qua máy chủ Vercel (Bypass 4.5MB Payload limit!).
 */
export async function POST(request: Request) {
  try {
    // 🛡️ 1. Auth Guard: Bắt buộc đăng nhập
    let userAuth: any = null;
    try {
      userAuth = await requireUser();
    } catch {
      // Fallback kiểm tra qua Supabase Session nếu request từ client
      const { createClient } = await import("@/src/utils/supabase/server");
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        userAuth = user;
      }
    }

    if (!userAuth) {
      return NextResponse.json({ error: "Vui lòng đăng nhập để tải lên tệp tin bằng chứng." }, { status: 401 });
    }

    const body = await request.json();
    const { filename, mimeType, fileSize } = body;

    if (!filename || !fileSize) {
      return NextResponse.json({ error: "Thông tin tệp tin không hợp lệ." }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Kiểm tra cấu hình OAuth 5TB
    if (!clientId || !clientSecret || !refreshToken) {
      return NextResponse.json({
        error: "Google Drive OAuth 5TB chưa được cấu hình đầy đủ (thiếu GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET hoặc GOOGLE_REFRESH_TOKEN).",
        needsConfig: true,
      }, { status: 503 });
    }

    // 🔑 2. Lấy Access Token từ Refresh Token của tài khoản 5TB
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) {
      const tokenErr = await tokenResponse.text();
      console.error("❌ [GoogleDrive OAuth] Lỗi lấy Access Token:", tokenErr);
      return NextResponse.json({
        error: "Không thể làm mới Access Token từ Google. Hãy kiểm tra lại REFRESH_TOKEN.",
        details: tokenErr,
      }, { status: 502 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 🌐 3. Nhận diện Origin của trình duyệt để cấp phép CORS
    const origin = request.headers.get("origin") || request.headers.get("referer") || "https://cloop-sable.vercel.app";
    const cleanOrigin = origin.replace(/\/$/, "");

    const isVideo = (mimeType || "").startsWith("video/");
    const safeFileName = `CLOOP_Evidence_${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    // 📤 4. Khởi tạo Resumable Session URI với Google Drive API (có gắn Origin CORS)
    const driveInitResponse = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
        "X-Upload-Content-Length": fileSize.toString(),
        Origin: cleanOrigin, // ⚡ CHỐT CHẶN CORS CỐT LÕI
      },
      body: JSON.stringify({
        name: safeFileName,
        parents: folderId ? [folderId] : undefined,
      }),
    });

    if (!driveInitResponse.ok) {
      const initErr = await driveInitResponse.text();
      console.error("❌ [GoogleDrive Resumable] Lỗi tạo session upload:", initErr);
      return NextResponse.json({
        error: "Google Drive từ chối tạo phiên tải lên trực tiếp.",
        details: initErr,
      }, { status: 502 });
    }

    const sessionUri = driveInitResponse.headers.get("location");
    if (!sessionUri) {
      return NextResponse.json({ error: "Không tìm thấy sessionUri từ phản hồi của Google Drive." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sessionUri,
      fileName: safeFileName,
      isVideo,
    });
  } catch (error: any) {
    console.error("❌ [drive-resumable route error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ nội bộ." }, { status: 500 });
  }
}
