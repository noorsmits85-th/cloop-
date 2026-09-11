import { NextResponse } from "next/server";
import { uploadToGoogleDrive } from "@/src/services/googleDriveStorage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const targetKho = (formData.get("targetKho") as "kho1" | "kho2" | "auto") || "auto";

    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy tệp tin cần tải lên." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadToGoogleDrive({
      fileName: file.name || `review_media_${Date.now()}`,
      mimeType: file.type || "application/octet-stream",
      buffer: buffer,
      targetKho: targetKho,
      isPublic: true,
    });

    if (!result) {
      return NextResponse.json({ error: "Lỗi tải tệp lên kho lưu trữ 10TB." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      url: result.viewUrl,
      downloadUrl: result.downloadUrl,
      storageWarehouse: result.storageWarehouse,
      name: result.name,
      isVideo: (file.type || "").startsWith("video/"),
    });
  } catch (error: any) {
    console.error("Lỗi API Upload 10TB Drive:", error);
    return NextResponse.json({ error: error.message || "Lỗi không xác định khi tải tệp." }, { status: 500 });
  }
}
