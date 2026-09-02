import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { executeWithGeminiPool } from "@/src/utils/gemini-pool";

export async function POST(req: Request) {
  try {
    const { base64Image } = await req.json();
    if (!base64Image) {
      return NextResponse.json({ error: "Thiếu dữ liệu ảnh Lookbook" }, { status: 400 });
    }

    const imagePart = {
      inlineData: {
        data: base64Image.split(",")[1],
        mimeType: "image/jpeg"
      }
    };

    const prompt = "Bạn là chuyên gia stylist của CLOOP. Hãy phân tích ảnh lookbook này và bóc tách các item quần áo, gợi ý cách phối đồ ngắn gọn, chuyên nghiệp bằng tiếng Việt.";

    const responseText = await executeWithGeminiPool(async (apiKey) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
        const result = await model.generateContent([prompt, imagePart]);
        return result.response.text();
      } catch (err) {
        const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await fallbackModel.generateContent([prompt, imagePart]);
        return result.response.text();
      }
    });

    return NextResponse.json({ suggestion: responseText });
  } catch (error: any) {
    console.error("Lỗi hệ thống AI ngầm:", error);
    return NextResponse.json({ error: "Bộ não AI đang bận xử lý, cậu thử lại sau nhé!" }, { status: 500 });
  }
}
