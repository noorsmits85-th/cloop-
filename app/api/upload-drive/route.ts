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
    const isVideo = (file.type || "").startsWith("video/");
    const fileName = file.name || `${isVideo ? "video" : "media"}_${Date.now()}`;

    // 1. Tải lên Google Drive qua Webhooks (Không tốn Cloudinary, tiết kiệm tài nguyên tối đa)
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
        storageWarehouse: "Google Drive",
        name: result.name,
        isVideo,
      });
    }

    // 2. Dự phòng an toàn: Supabase Storage (Tuyệt đối KHÔNG dùng Cloudinary)
    try {
      const { supabaseAdmin } = await import("@/src/lib/supabase");
      if (supabaseAdmin) {
        const safeName = `support_chat/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { data: sbData, error: sbError } = await supabaseAdmin.storage
          .from("cloop-media")
          .upload(safeName, buffer, {
            contentType: file.type || (isVideo ? "video/mp4" : "image/jpeg"),
            upsert: true,
          });

        if (!sbError && sbData) {
          const { data: publicData } = supabaseAdmin.storage
            .from("cloop-media")
            .getPublicUrl(safeName);

          return NextResponse.json({
            success: true,
            url: publicData.publicUrl,
            viewUrl: publicData.publicUrl,
            downloadUrl: publicData.publicUrl,
            storageWarehouse: "Kho Lưu Trữ Dự Phòng",
            name: fileName,
            isVideo,
          });
        }
      }
    } catch (sbErr) {
      console.warn("⚠️ [Storage] Supabase fallback không khả dụng:", sbErr);
    }

    return NextResponse.json({ error: "Lỗi tải tệp lên kho lưu trữ Google Drive." }, { status: 500 });
  } catch (error: any) {
    console.error("Lỗi API Upload Media:", error);
    return NextResponse.json({ error: error.message || "Lỗi không xác định khi tải tệp." }, { status: 500 });
  }
}
