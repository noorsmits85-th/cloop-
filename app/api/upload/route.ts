import { NextResponse } from "next/server";
import { requireUser } from "@/src/lib/auth";
import { assertUploadableImage, MAX_UPLOAD_BYTES, uploadImage } from "@/src/lib/upload-image";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    try {
      await requireUser();
    } catch {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để tải ảnh lên hệ thống." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const folder = String(formData.get("folder") || "cloop_uploads");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Không tìm thấy tệp tin ảnh tải lên." },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Ảnh vượt quá giới hạn 10MB hoặc tệp trống." },
        { status: 413 }
      );
    }

    assertUploadableImage(file);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uploadResult = await uploadImage(buffer, folder);

    return NextResponse.json(uploadResult);
  } catch (error: unknown) {
    // TODO: integrate Sentry/LogRocket tracking for upload anomalies
    console.error("Lỗi API Upload:", error);
    const errMsg = error instanceof Error ? error.message : "";
    if (
      errMsg === "UNSUPPORTED_MEDIA_TYPE" ||
      errMsg === "FORBIDDEN_MEDIA_SIGNATURE" ||
      errMsg.includes("định dạng ảnh")
    ) {
      return NextResponse.json(
        { error: "Định dạng tệp không hợp lệ. Chỉ chấp nhận ảnh JPG, PNG, WEBP, GIF." },
        { status: 415 }
      );
    }
    if (errMsg === "MEDIA_TOO_LARGE" || errMsg.includes("10MB")) {
      return NextResponse.json(
        { error: "Ảnh vượt quá giới hạn 10MB." },
        { status: 413 }
      );
    }
    return NextResponse.json(
      { error: "Không thể tải ảnh lên hệ thống lúc này. Vui lòng thử lại sau." },
      { status: 400 }
    );
  }
}
