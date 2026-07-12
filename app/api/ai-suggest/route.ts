import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { base64Image } = await req.json();
    if (!base64Image) {
      return NextResponse.json({ error: "Thiếu dữ liệu ảnh Lookbook" }, { status: 400 });
    }

    // 1. Lấy khóa API và cấu hình chuẩn tên thư viện đầy đủ
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey || "");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 2. Định dạng cấu trúc ảnh gửi lên Google
    const imagePart = {
      inlineData: {
        data: base64Image.split(",")[1],
        mimeType: "image/jpeg"
      }
    };

    // 3. Ra lệnh phân tích outfit
    const prompt = "Bạn là chuyên gia stylist của CLOOP. Hãy phân tích ảnh lookbook này và bóc tách các item quần áo, gợi ý cách phối đồ ngắn gọn, chuyên nghiệp bằng tiếng Việt.";
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();

    return NextResponse.json({ suggestion: responseText });
  } catch (error: any) {
    console.error("Lỗi hệ thống AI ngầm:", error);
    return NextResponse.json({ error: "Bộ não AI đang bận xử lý, cậu thử lại sau nhé Trang!" }, { status: 500 });
  }
}