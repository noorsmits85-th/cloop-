import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { userImageBase64, productImageUrl } = await req.json();

    if (!userImageBase64 || !productImageUrl) {
      return NextResponse.json({ error: "Thiếu dữ liệu ảnh" }, { status: 400 });
    }

    // 1. Tải ảnh sản phẩm về và chuyển sang Base64
    const productRes = await fetch(productImageUrl);
    const productBuffer = await productRes.arrayBuffer();
    const productBase64 = Buffer.from(productBuffer).toString("base64");
    const productMime = productRes.headers.get("content-type") || "image/jpeg";

    // 2. Tách phần header của userImageBase64 (nếu có data:image/png;base64,...)
    let userBase64 = userImageBase64;
    let userMime = "image/jpeg";
    if (userImageBase64.includes(";base64,")) {
      const parts = userImageBase64.split(";base64,");
      userMime = parts[0].split(":")[1];
      userBase64 = parts[1];
    }

    // 3. Khởi tạo Gemini Vision model
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `Bạn là một AI Stylist chuyên nghiệp của CLOOP (nền tảng thời trang tuần hoàn). 
Dưới đây là 2 bức ảnh: Ảnh 1 là người dùng, Ảnh 2 là trang phục. 
Hãy phân tích xem trang phục này có hợp với vóc dáng, tông màu hoặc phong cách của người dùng không. 
Trả về một đoạn nhận xét chuyên môn, đưa ra 1 lời khuyên phối đồ (mix & match) cụ thể. 
Chỉ trả về tối đa 3-4 câu ngắn gọn, súc tích, văn phong lịch sự, khen ngợi. Không sử dụng markdown bôi đậm.`;

    const imageParts = [
      {
        inlineData: {
          data: userBase64,
          mimeType: userMime,
        },
      },
      {
        inlineData: {
          data: productBase64,
          mimeType: productMime,
        },
      },
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ feedback: text });
  } catch (error: any) {
    console.error("Lỗi Gemini API:", error);
    return NextResponse.json(
      { error: "Không thể phân tích ảnh lúc này. Vui lòng thử lại sau.", details: error.message },
      { status: 500 }
    );
  }
}
