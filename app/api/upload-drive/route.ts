import { NextResponse } from "next/server";
import { uploadToGoogleDrive } from "@/src/services/googleDriveStorage";
import { uploadImage } from "@/src/lib/upload-image";

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
    const isVideo = (file.type || "").startsWith("video/");
    const fileName = file.name || `${isVideo ? "video" : "media"}_${Date.now()}`;

    // 1. Ưu tiên 1: Tải lên Google Drive 10TB (Không tốn Cloudinary, tiết kiệm tài nguyên)
    const result = await uploadToGoogleDrive({
      fileName,
      mimeType: file.type || (isVideo ? "video/mp4" : "image/jpeg"),
      buffer: buffer,
      targetKho: targetKho,
      isPublic: true,
    });

    if (result && result.fileId) {
      const displayUrl = isVideo
        ? (result.downloadUrl || `https://drive.google.com/uc?id=${result.fileId}&export=download`)
        : (result.thumbnailUrl || `https://lh3.googleusercontent.com/d/${result.fileId}=w1000`);

      return NextResponse.json({
        success: true,
        fileId: result.fileId,
        url: displayUrl,
        viewUrl: result.viewUrl,
        downloadUrl: result.downloadUrl || `https://drive.google.com/uc?id=${result.fileId}&export=download`,
        previewUrl: `https://drive.google.com/file/d/${result.fileId}/preview`,
        thumbnailUrl: result.thumbnailUrl || `https://lh3.googleusercontent.com/d/${result.fileId}=w1000`,
        storageWarehouse: result.storageWarehouse || "Kho Google Drive (10TB)",
        name: result.name,
        isVideo,
      });
    }

    // 2. Dự phòng khẩn cấp: Nếu Google Drive tạm thời nghẽn mạng và tệp là ảnh, fallback an toàn
    if (!isVideo) {
      console.warn("⚠️ [Storage] Google Drive chưa phản hồi, chuyển sang lưu trữ dự phòng...");
      try {
        const fallbackRes = await uploadImage(buffer, "support_chat");
        return NextResponse.json({
          success: true,
          url: fallbackRes.url,
          viewUrl: fallbackRes.url,
          downloadUrl: fallbackRes.url,
          storageWarehouse: "Kho Lưu Trữ Dự Phòng",
          name: fileName,
          isVideo: false,
        });
      } catch (fbErr: any) {
        console.error("Lỗi fallback upload:", fbErr);
      }
    }

    return NextResponse.json({ error: "Lỗi tải tệp lên kho lưu trữ." }, { status: 500 });
  } catch (error: any) {
    console.error("Lỗi API Upload Media:", error);
    return NextResponse.json({ error: error.message || "Lỗi không xác định khi tải tệp." }, { status: 500 });
  }
}
