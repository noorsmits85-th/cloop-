import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { executeWithGeminiPool } from "@/src/utils/gemini-pool";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { title, category, location, productName } = await req.json();

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

    const text = await executeWithGeminiPool(async (apiKey) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      try {
        const model = genAI.getGenerativeModel({
          model: "gemini-3.5-flash-lite",
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600,
          },
        });
        const res = await model.generateContent(prompt);
        return res.response.text();
      } catch (err) {
        const fallbackModel = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600,
          },
        });
        const res = await fallbackModel.generateContent(prompt);
        return res.response.text();
      }
    });

    return NextResponse.json({ success: true, story: text });
  } catch (err: any) {
    console.error("AI Story generation error:", err);
    return NextResponse.json({ error: err.message || "Lỗi khi tạo câu chuyện" }, { status: 500 });
  }
}
