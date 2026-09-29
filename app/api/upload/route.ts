// app/api/upload/route.ts
import { NextResponse } from "next/server";
import { assertUploadableImage, uploadImage } from "@/src/lib/upload-image";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = String(formData.get("folder") || "cloop_marketplace");

    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy tệp tin ảnh tải lên." }, { status: 400 });
    }

    assertUploadableImage(file);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uploadResult = await uploadImage(buffer, folder);

    return NextResponse.json(uploadResult);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Không thể tải ảnh lên hệ thống.";
    console.error("Lỗi API Upload:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
