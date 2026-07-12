// app/api/upload/route.ts
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy tệp tin upload." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Truyền trực tiếp luồng stream sang Cloudinary không qua trung gian tuần hoàn dữ liệu
    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: "cloop_marketplace" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    return NextResponse.json({ url: uploadResult.secure_url });
  } catch (error: any) {
    console.error("Lỗi API Upload:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}