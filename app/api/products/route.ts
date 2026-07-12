// app/api/products/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { client_upload_id, ...productData } = body;

    // 🎯 CHỐNG TRÙNG LẶP: Nếu ID tạm thời đã tồn tại trong hệ thống, trả về kết quả cũ ngay lập tức
    if (client_upload_id) {
      const { data: existingProduct } = await supabase
        .from("products")
        .select("id")
        .eq("id", client_upload_id)
        .maybeSingle();

      if (existingProduct) {
        return NextResponse.json({ success: true, outfitId: existingProduct.id });
      }
    }

    // 🚀 BƯỚC TÍCH HỢP AI NÂNG CAO: Tự động trích xuất đặc trưng ảnh để phục vụ Visual Search
    let embeddingVector = null;
    const firstImageUrl = productData.images?.[0]; // Chỉ lấy duy nhất tấm ảnh đầu tiên trong mảng text[]

    if (firstImageUrl) {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        
        // 1. Fetch ảnh từ link Cloudinary vừa upload để chuyển đổi thành Buffer dữ liệu
        const imageResponse = await fetch(firstImageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString("base64");

        // 2. Gọi cổng Multimodal Embedding Production để số hóa ảnh thành chuỗi Vector 1408 chiều
        const googleResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/multimodal-embedding-001:embedContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: {
                parts: [
                  {
                    inlineData: {
                      mimeType: "image/jpeg",
                      data: base64Image,
                    },
                  },
                ],
              },
            }),
          }
        );

        if (googleResponse.ok) {
          const resData = await googleResponse.json();
          if (resData.embedding?.values) {
            embeddingVector = resData.embedding.values; // Mảng 1408 số thực sạch sẽ
          }
        } else {
          console.error("Cảnh báo: Google không thể sinh vector cho ảnh, sản phẩm sẽ lưu mà không có mã nhúng.");
        }
      } catch (embeddingError) {
        // Chặn lỗi ngầm của AI để đảm bảo form đăng bài chính của hệ thống vẫn hoạt động thông suốt
        console.error("Lỗi trong quá trình xử lý sinh mã nhúng ảnh:", embeddingError);
      }
    }

    // Ghi hạch toán dữ liệu sạch xuống cơ sở dữ liệu kèm theo cột embedding vừa sinh
    const { data, error } = await supabase
      .from("products")
      .insert([{ 
        id: client_upload_id, 
        ...productData, 
        embedding: embeddingVector // Thêm trường lưu vector vào DB ở đây
      }])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, outfitId: data[0].id });
  } catch (error: any) {
    console.error("Lỗi API Lưu Sản Phẩm:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}