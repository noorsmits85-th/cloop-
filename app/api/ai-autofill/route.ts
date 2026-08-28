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
    
    let model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
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
