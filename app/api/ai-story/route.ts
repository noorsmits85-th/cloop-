import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { requireUser } from "@/src/lib/auth";
import { executeWithGeminiPool } from "@/src/utils/gemini-pool";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    try {
      await requireUser();
    } catch {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để sử dụng tính năng viết câu chuyện thời trang." },
        { status: 401 }
      );
    }

    const { title, category, location, productName } = await req.json();

    const safeTitle = typeof title === "string" ? title.slice(0, 120) : "Một ngày ngập nắng";
    const safeCategory = typeof category === "string" ? category.slice(0, 80) : "Dạ Hội & Tiệc Đêm";
    const safeLocation = typeof location === "string" ? location.slice(0, 80) : "Hà Nội";
    const safeProductName =
      typeof productName === "string" ? productName.slice(0, 120) : "Chiếc váy yêu thích";

    const prompt = `
Bạn là Nhà Biên Tập Thời Trang & Tác Giả Tản Văn Lãng Mạn của CLOOP (Nền tảng Thời Trang Tuần Hoàn).
Hãy viết một đoạn tản văn ngắn (khoảng 3 đoạn, 150-200 từ) kể về kỷ niệm gắn liền với bộ trang phục này.
- Tiêu đề dự kiến: ${safeTitle}
- Danh mục: ${safeCategory}
- Địa điểm: ${safeLocation}
- Tên món đồ: ${safeProductName}

Phong cách viết: Thơ mộng, hoài niệm, trân trọng từng đường kim mũi chỉ và tôn vinh triết lý thời trang tuần hoàn (mỗi bộ váy mang trong mình một linh hồn và một câu chuyện đáng được sống tiếp).
Không dùng emoji.
`;

    const text = await executeWithGeminiPool(async (apiKey) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      try {
        const model = genAI.getGenerativeModel({
          model: "gemini-3.6-flash",
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600,
          },
        });
        const res = await model.generateContent(prompt);
        return res.response.text();
      } catch {
        const fallbackModel = genAI.getGenerativeModel({
          model: "gemini-3.8-flash",
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
  } catch (err: unknown) {
    // TODO: integrate Sentry/LogRocket tracking for AI story errors
    console.error("AI Story generation error:", err);
    return NextResponse.json(
      { error: "Không thể tạo câu chuyện lúc này. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
