import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { title, category, location, productName } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Thiếu GEMINI_API_KEY" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 600
      }
    });

    const prompt = `
Bạn là Nhà Biên Tập Thời Trang & Tác Giả Tản Văn Lãng Mạn của CLOOP (Nền tảng Thời Trang Tuần Hoàn).
Hãy viết một đoạn tản văn ngắn (khoảng 3 đoạn, 150-200 từ) kể về kỷ niệm gắn liền với bộ trang phục này.
- Tiêu đề dự kiến: ${title || "Một ngày ngập nắng"}
- Danh mục: ${category || "Dạ Hội & Tiệc Đêm"}
- Địa điểm: ${location || "Hà Nội"}
- Tên món đồ: ${productName || "Chiếc váy yêu thích"}

Phong cách viết: Thơ mộng, hoài niệm, trân trọng từng đường kim mũi chỉ và tôn vinh triết lý thời trang tuần hoàn (mỗi bộ váy mang trong mình một linh hồn và một câu chuyện đáng được sống tiếp).
Không dùng emoji lấp lánh ✨.
`;

    const res = await model.generateContent(prompt);
    const text = res.response.text();

    return NextResponse.json({ success: true, story: text });
  } catch (err: any) {
    console.error("AI Story generation error:", err);
    return NextResponse.json({ error: err.message || "Lỗi khi tạo câu chuyện" }, { status: 500 });
  }
}
