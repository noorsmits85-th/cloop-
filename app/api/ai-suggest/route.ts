import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { requireUser } from "@/src/lib/auth";
import { parseSafeBase64Image } from "@/src/lib/server-image-guard";
import { executeWithGeminiPool } from "@/src/utils/gemini-pool";

export async function POST(req: Request) {
  try {
    try {
      await requireUser();
    } catch {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để sử dụng tính năng gợi ý phối đồ AI." },
        { status: 401 }
      );
    }

    const { base64Image } = await req.json();
    if (!base64Image || typeof base64Image !== "string") {
      return NextResponse.json({ error: "Thiếu dữ liệu ảnh Lookbook" }, { status: 400 });
    }

    let safeImage;
    try {
      safeImage = parseSafeBase64Image(base64Image);
    } catch {
      return NextResponse.json(
        { error: "Dữ liệu ảnh không hợp lệ (chỉ hỗ trợ JPG, PNG, WEBP tối đa 5MB)." },
        { status: 400 }
      );
    }

    const imagePart = {
      inlineData: {
        data: safeImage.base64,
        mimeType: safeImage.mimeType,
      },
    };

    const prompt =
      "Bạn là chuyên gia stylist của CLOOP. Hãy phân tích ảnh lookbook này và bóc tách các item quần áo, gợi ý cách phối đồ ngắn gọn, chuyên nghiệp bằng tiếng Việt.";

    const responseText = await executeWithGeminiPool(async (apiKey) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        return result.response.text();
      } catch {
        const fallbackModel = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });
        const result = await fallbackModel.generateContent([prompt, imagePart]);
        return result.response.text();
      }
    });

    return NextResponse.json({ suggestion: responseText });
  } catch (error: unknown) {
    // TODO: integrate Sentry/LogRocket tracking for AI suggest errors
    console.error("Lỗi hệ thống AI ngầm:", error);
    return NextResponse.json(
      { error: "Bộ não AI đang bận xử lý, cậu thử lại sau nhé!" },
      { status: 500 }
    );
  }
}
