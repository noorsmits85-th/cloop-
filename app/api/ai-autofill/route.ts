import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { base64Image } = await req.json();
    if (!base64Image) {
      return NextResponse.json({ error: "Thiếu dữ liệu ảnh" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY_DEV;
    if (!apiKey) {
      return NextResponse.json({ error: "Thiếu GEMINI_API_KEY" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Sử dụng Gemini 3.5 Flash-Lite để bóc tách thông số siêu tốc (< 500ms)
    let model = genAI.getGenerativeModel({ 
      model: "gemini-3.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      }
    });

    const mimeType = base64Image.match(/:(.*?);/)?.[1] || "image/jpeg";
    const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType
      }
    };

    const prompt = `
Bạn là AI Stylist & Chuyên gia Giám định Trang phục của nền tảng thời trang tuần hoàn CLOOP.
Hãy nhìn bức ảnh này và bóc tách tự động các thông số trang phục để điền thẳng vào form đăng tủ đồ.

Trả về đúng cấu trúc JSON sau:
{
  "name": string (Tên sản phẩm thời trang sang trọng, ví dụ: "Đầm Dạ Hội Lụa Satin Đỏ Rượu", "Áo Dài Gấm Hoa Dáng Xưa", "Set Blazer Dạ Tweed"),
  "category": string (Chọn 1: "Dạ hội", "Đi tiệc", "Áo dài", "Vintage", "Áo khoác", "Váy thiết kế", "Công sở", "Casual", "Set đồ"),
  "color": string (Tông màu nổi bật, ví dụ: "Đỏ Bordeaux", "Đen tuyền", "Trắng kem", "Xanh lục bảo", "Hồng pastel"),
  "material": string (Chất liệu ước tính, ví dụ: "Lụa Satin", "Dạ Tweed", "Linen hữu cơ", "Voan tơ", "Denim", "Da tổng hợp"),
  "occasion": string (Dịp phù hợp nhất, ví dụ: "Đi tiệc, Dạ hội", "Cưới hỏi, Sự kiện", "Dạo phố, Cà phê", "Công sở, Hội thảo"),
  "condition": string (Độ mới ước tính, ví dụ: "Mới 98%", "Mới 95%", "Như mới"),
  "size": string (Gợi ý size S, M, L hoặc XL),
  "rentalPrice": number (Giá thuê đề xuất VNĐ/ngày, ví dụ: 150000, 220000, 350000),
  "salePrice": number (Giá bán/thanh lý đề xuất VNĐ, ví dụ: 750000, 1200000),
  "description": string (Đoạn mô tả ngắn 2 câu sành điệu, tôn dáng, nêu bật vẻ đẹp của trang phục)
}
`;

    let result;
    try {
      result = await model.generateContent([prompt, imagePart]);
    } catch (e) {
      const fallbackModel = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite",
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      });
      result = await fallbackModel.generateContent([prompt, imagePart]);
    }

    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText);

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Lỗi AI Auto-fill:", error);
    return NextResponse.json({ error: "Không thể nhận diện ảnh tự động" }, { status: 500 });
  }
}
