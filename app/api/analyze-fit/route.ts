import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireUser } from "@/src/lib/auth";
import { parseSafeBase64Image } from "@/src/lib/server-image-guard";
import { fetchSafeAllowedImage, isAllowedMediaUrl } from "@/src/lib/ssrf-guard";
import { executeWithGeminiPool } from "@/src/utils/gemini-pool";

export async function POST(req: Request) {
  try {
    try {
      await requireUser();
    } catch {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để sử dụng tính năng phân tích vóc dáng." },
        { status: 401 }
      );
    }

    const { userImageBase64, productImageUrl } = await req.json();

    if (!userImageBase64 || !productImageUrl) {
      return NextResponse.json({ error: "Thiếu dữ liệu ảnh" }, { status: 400 });
    }

    if (typeof productImageUrl !== "string" || !isAllowedMediaUrl(productImageUrl)) {
      return NextResponse.json(
        { error: "URL ảnh sản phẩm không thuộc kho lưu trữ hợp lệ của CLOOP." },
        { status: 400 }
      );
    }

    // 1. Validate userImageBase64 magic bytes & size
    let parsedUserImage;
    try {
      parsedUserImage = parseSafeBase64Image(userImageBase64);
    } catch (imgErr: unknown) {
      const code = imgErr instanceof Error ? imgErr.message : "";
      if (code === "IMAGE_TOO_LARGE") {
        return NextResponse.json(
          { error: "Ảnh tải lên quá lớn (tối đa 5MB)." },
          { status: 413 }
        );
      }
      return NextResponse.json(
        { error: "Định dạng ảnh người dùng không hợp lệ (chỉ hỗ trợ JPG, PNG, WEBP)." },
        { status: 400 }
      );
    }

    // 2. Fetch product image exclusively via SSRF guard
    let safeProductImage;
    try {
      safeProductImage = await fetchSafeAllowedImage(productImageUrl, 10 * 1024 * 1024);
    } catch {
      return NextResponse.json(
        { error: "Không thể tải ảnh sản phẩm hợp lệ để đối chiếu." },
        { status: 400 }
      );
    }

    const productBase64 = safeProductImage.buffer.toString("base64");
    const productMime = safeProductImage.mimeType;

    const prompt = `Bạn là một AI Stylist chuyên nghiệp của CLOOP (nền tảng thời trang tuần hoàn). 
Dưới đây là 2 bức ảnh: Ảnh 1 là người dùng, Ảnh 2 là trang phục. 
Hãy phân tích xem trang phục này có hợp với vóc dáng, tông màu hoặc phong cách của người dùng không. 
Trả về một đoạn nhận xét chuyên môn, đưa ra 1 lời khuyên phối đồ (mix & match) cụ thể. 
Chỉ trả về tối đa 3-4 câu ngắn gọn, súc tích, văn phong lịch sự, khen ngợi. Không sử dụng markdown bôi đậm.`;

    const imageParts = [
      {
        inlineData: {
          data: parsedUserImage.base64,
          mimeType: parsedUserImage.mimeType,
        },
      },
      {
        inlineData: {
          data: productBase64,
          mimeType: productMime,
        },
      },
    ];

    const text = await executeWithGeminiPool(async (apiKey) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        return response.text();
      } catch {
        const fallbackModel = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });
        const result = await fallbackModel.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        return response.text();
      }
    });

    return NextResponse.json({ feedback: text });
  } catch (error: unknown) {
    // TODO: integrate Sentry/LogRocket tracking for analyze-fit errors
    console.error("Lỗi Gemini API analyze-fit:", error);
    return NextResponse.json(
      { error: "Không thể phân tích ảnh lúc này. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
