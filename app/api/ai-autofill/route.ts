import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { requireUser } from "@/src/lib/auth";
import { parseSafeBase64Image } from "@/src/lib/server-image-guard";
import { executeWithGeminiPool } from "@/src/utils/gemini-pool";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    try {
      await requireUser();
    } catch {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để sử dụng tính năng AI tự động điền thông tin." },
        { status: 401 }
      );
    }

    const { base64Image } = await req.json();
    if (!base64Image || typeof base64Image !== "string") {
      return NextResponse.json({ error: "Thiếu dữ liệu ảnh" }, { status: 400 });
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

    const prompt = `
Bạn là AI Trí Tuệ Thị Giác & Stylist Giám định của nền tảng thời trang tuần hoàn CLOOP.
Hãy nhìn bức ảnh này và bóc tách toàn bộ thông số trang phục để điền thẳng vào form đăng tủ đồ.

QUY TẮC ĐẶC BIỆT:
- occasion BẮT BUỘC chọn chính xác 1 trong các giá trị sau: "Dạo phố", "Tiệc cưới", "Dạ hội", "Áo dài", "Đi biển", "Kỷ yếu", "Lễ hội", "Công sở", "Vintage & Hoài cổ", "Tối giản".
- category BẮT BUỘC chọn chính xác 1 trong các giá trị sau: "Dạ hội & Sự kiện", "Tiệc cưới", "Áo dài truyền thống", "Đồ hoài cổ 90s", "Tối giản", "Công sở & Blazer", "Set đồ & Dạo phố", "Túi xách & Phụ kiện", "Giày & Boots".
- size BẮT BUỘC chọn: "S", "M", "L", hoặc "XL".

Trả về đúng cấu trúc JSON sau:
{
  "name": string (Tên sản phẩm thời trang sang trọng, ví dụ: "Đầm Dạ Hội Lụa Satin Đỏ Rượu", "Áo Dài Gấm Hoa Dáng Xưa", "Set Yếm Denim Phối Áo Thun Trẻ Trung", "Blazer Dạ Tweed Thanh Lịch"),
  "category": string (Chọn 1 trong các danh mục quy định ở trên),
  "color": string (Tông màu nổi bật, ví dụ: "Xanh Denim", "Đỏ Bordeaux", "Đen tuyền", "Trắng kem", "Hồng pastel"),
  "material": string (Chất liệu chính, ví dụ: "Denim", "Lụa Satin", "Dạ Tweed", "Linen hữu cơ", "Voan tơ", "Cotton cao cấp"),
  "occasion": string (Chọn 1 trong các dịp quy định ở trên),
  "condition": string (Độ mới, ví dụ: "Mới 98%", "Mới 95%", "Như mới"),
  "size": string ("S" | "M" | "L" | "XL"),
  "originalPrice": number (Ước tính giá mua ban đầu lúc mới VNĐ, ví dụ: 500000, 1200000, 3500000),
  "rentalPrice": number (Giá thuê đề xuất VNĐ/ngày, khoảng 10-15% giá gốc, ví dụ: 120000, 250000, 350000),
  "salePrice": number (Giá bán thanh lý đề xuất VNĐ, khoảng 50-70% giá gốc, ví dụ: 300000, 800000, 2000000),
  "description": string (Đoạn mô tả ngắn 2 câu sành điệu, tôn dáng, nêu bật vẻ đẹp và cách phối đồ)
}
`;

    const result = await executeWithGeminiPool(async (apiKey) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      try {
        const model = genAI.getGenerativeModel({
          model: "gemini-3.6-flash",
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        });
        return await model.generateContent([prompt, imagePart]);
      } catch (e) {
        console.warn("Autofill primary model error, trying fallback:", e);
        const fallbackModel = genAI.getGenerativeModel({
          model: "gemini-3.8-flash",
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        });
        return await fallbackModel.generateContent([prompt, imagePart]);
      }
    });

    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText);

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: unknown) {
    // TODO: integrate Sentry/LogRocket tracking for AI autofill errors
    console.error("Lỗi AI Auto-fill:", error);
    return NextResponse.json({ error: "Không thể nhận diện ảnh tự động" }, { status: 500 });
  }
}
