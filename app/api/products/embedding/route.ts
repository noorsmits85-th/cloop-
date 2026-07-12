import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return NextResponse.json({ error: "Thiếu link ảnh sản phẩm để sinh vector" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    // 1. Tải ảnh từ link Cloudinary về dưới dạng Buffer dòng lệnh
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");

    // 2. Bắn trực tiếp lên cổng Multimodal Embedding v1 Production của Google
    const googleResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/multimodal-embedding-001:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: {
            parts: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Image,
                },
              },
            ],
          },
        }),
      }
    );

    const resData = await googleResponse.json();
    
    if (!googleResponse.ok) {
      console.error("Lỗi sinh Vector từ Google:", resData);
      return NextResponse.json({ error: "Google không thể số hóa ảnh này" }, { status: googleResponse.status });
    }

    // 3. Trích xuất mảng số thực (1408 số) trả về cho hệ thống
    const embeddingVector = resData.embedding?.values;

    if (!embeddingVector || embeddingVector.length !== 1408) {
      return NextResponse.json({ error: "Cấu trúc vector trả về không hợp lệ" }, { status: 500 });
    }

    return NextResponse.json({ success: true, embedding: embeddingVector });
  } catch (error: any) {
    console.error("Lỗi hệ thống tạo mã nhúng:", error);
    return NextResponse.json({ error: error.message || "Sự cố tầng xử lý AI nhúng" }, { status: 500 });
  }
}