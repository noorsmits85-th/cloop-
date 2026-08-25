import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/src/lib/prisma";

export const runtime = "nodejs";

type CatalogProduct = {
  id: string;
  title: string;
  description: string;
  category: string;
  size: string;
  color: string;
  material: string;
  style: string;
  occasion: string;
  season: string;
  province: string;
  image: string;
  priceText: string;
  listingType: string;
};

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600";

// BẢN ĐỒ 34 ĐƠN VỊ HÀNH CHÍNH CẤP TỈNH / THÀNH PHỐ VIỆT NAM 2025/2026 (THEO NGHỊ QUYẾT QUỐC HỘI)
const VIETNAM_34_PROVINCES_KNOWLEDGE = `
BẢN ĐỒ 34 TỈNH THÀNH PHỐ TOÀN QUỐC 2025/2026:
1. 11 Tỉnh/Thành phố không sáp nhập:
   - TP. Hà Nội (Hà Nội, Cầu Giấy, Hoàn Kiếm, Tây Hồ, Ba Đình...)
   - Thanh Hóa (Thanh Hóa, Sầm Sơn, Bỉm Sơn...)
   - Lạng Sơn (Lạng Sơn, Đồng Đăng...)
   - TP. Huế (Huế, Hương Thủy, Hương Trà, Thuận An...)
   - Nghệ An (Vinh, Cửa Lò, Diễn Châu, Thái Hòa, Quỳnh Lưu...)
   - Hà Tĩnh (Hà Tĩnh, Kỳ Anh, Hồng Lĩnh...)
   - Lai Châu
   - Điện Biên (Điện Biên Phủ...)
   - Cao Bằng
   - Quảng Ninh (Hạ Long, Cẩm Phả, Móng Cái, Uông Bí, Bãi Cháy...)
   - Sơn La (Mộc Châu, Sơn La...)

2. 23 Tỉnh/Thành phố mới (đã sắp xếp sáp nhập):
   - Tuyên Quang (Tuyên Quang + Hà Giang, Đồng Văn, Mèo Vạc)
   - Lào Cai (Lào Cai + Yên Bái, Sa Pa, Mù Cang Chải)
   - Thái Nguyên (Thái Nguyên + Bắc Kạn, Sông Công, Ba Bể)
   - Phú Thọ (Phú Thọ + Vĩnh Phúc + Hòa Bình, Việt Trì, Vĩnh Yên, Tam Đảo)
   - Bắc Ninh (Bắc Ninh + Bắc Giang, Từ Sơn, Việt Yên)
   - Hưng Yên (Hưng Yên + Thái Bình, Phố Hiến)
   - TP. Hải Phòng (Hải Phòng + Hải Dương, Đồ Sơn, Cát Bà, Chí Linh)
   - Ninh Bình (Ninh Bình + Nam Định + Hà Nam, Tràng An, Phủ Lý)
   - Quảng Trị (Quảng Trị + Quảng Bình, Đồng Hới, Đông Hà, Phong Nha)
   - TP. Đà Nẵng (Đà Nẵng + Quảng Nam, Hội An, Tam Kỳ)
   - Quảng Ngãi (Quảng Ngãi + Kon Tum, Măng Đen, Lý Sơn)
   - Gia Lai (Gia Lai + Bình Định, Pleiku, Quy Nhơn, An Nhơn)
   - Khánh Hòa (Khánh Hòa + Ninh Thuận, Nha Trang, Cam Ranh, Phan Rang)
   - Lâm Đồng (Lâm Đồng + Bình Thuận + Đắk Nông, Đà Lạt, Bảo Lộc, Phan Thiết, Mũi Né, Gia Nghĩa)
   - Đắk Lắk (Đắk Lắk + Phú Yên, Buôn Ma Thuột, Tuy Hòa)
   - TP. Hồ Chí Minh (TP.HCM + Bình Dương + Bà Rịa Vũng Tàu, Sài Gòn, Thủ Đức, Thủ Dầu Một, Dĩ An, Vũng Tàu, Hồ Tràm)
   - Đồng Nai (Đồng Nai + Bình Phước, Biên Hòa, Long Khánh, Đồng Xoài)
   - Tây Ninh (Tây Ninh + Long An, Tân An, Bến Lức)
   - TP. Cần Thơ (Cần Thơ + Sóc Trăng + Hậu Giang, Ninh Kiều, Cái Răng, Vị Thanh)
   - Vĩnh Long (Vĩnh Long + Bến Tre + Trà Vinh)
   - Đồng Tháp (Đồng Tháp + Tiền Giang, Cao Lãnh, Sa Đéc, Mỹ Tho)
   - Cà Mau (Cà Mau + Bạc Liêu)
   - An Giang (An Giang + Kiên Giang, Long Xuyên, Châu Đốc, Rạch Giá, Phú Quốc, Hà Tiên)
`;

function formatPrice(value?: number | null, listingType?: string | null) {
  if (!value || value <= 0) return "Liên hệ";
  const suffix = listingType === "RENT" ? " / ngày" : "";
  return `${value.toLocaleString("vi-VN")}đ${suffix}`;
}

function pickPrimaryListing(
  listings: Array<{ listingType: string; status: string; salePrice: number | null; basePrice: number | null }>
) {
  return (
    listings.find((listing) => listing.status === "AVAILABLE" && listing.listingType === "RENT") ||
    listings.find((listing) => listing.status === "AVAILABLE" && listing.listingType === "SELL") ||
    listings.find((listing) => listing.status === "AVAILABLE") ||
    listings[0]
  );
}

function encodeCatalog(products: CatalogProduct[]) {
  return Buffer.from(JSON.stringify(products), "utf8").toString("base64");
}

export async function POST(request: Request) {
  try {
    const { message, history = [] } = await request.json();

    if (!message || typeof message !== "string") {
      return new Response("Thiếu nội dung chat.", { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY_DEV;
    if (!apiKey) {
      return new Response("Thiếu GEMINI_API_KEY.", { status: 500 });
    }

    const products = await prisma.product.findMany({
      take: 60,
      orderBy: { createdAt: "desc" },
      include: {
        images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
        listings: true,
      },
    });

    const catalog: CatalogProduct[] = products
      .map((product) => {
        const listing = pickPrimaryListing(product.listings);
        const price = listing?.salePrice || listing?.basePrice;

        return {
          id: product.id,
          title: product.title,
          description: product.description || "",
          category: product.category || "",
          size: product.size || "",
          color: product.color || "",
          material: product.material || "",
          style: product.style || "",
          occasion: product.occasion || "",
          season: product.season || "",
          province: product.province || "Toàn quốc",
          image: product.images[0]?.url || PLACEHOLDER_IMAGE,
          priceText: formatPrice(price, listing?.listingType),
          listingType: listing?.listingType || "RENT",
        };
      })
      .filter((product) => product.title && product.id);

    // Sử dụng Model Gemini 3.6 Flash / 3.5 Flash-Lite
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Fallback models nếu endpoint cần tương thích
    const candidateModels = ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash-lite"];
    let model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction: [
        "Bạn là CLOOP AI Stylist & Chuyên Viên Tư Vấn Thời Trang Tuần Hoàn 24/7 bằng tiếng Việt.",
        VIETNAM_34_PROVINCES_KNOWLEDGE,
        "QUY TẮC ĐỊA LÝ & 34 TỈNH THÀNH:",
        "- Khi khách nhắn tên bất kỳ địa danh, thành phố, thị xã hoặc quận huyện nào (ví dụ: Vinh, Nha Trang, Đà Lạt, Sa Pa, Vũng Tàu, Hội An, Quy Nhơn, Hạ Long, Mộc Châu, Cần Thơ, Phú Quốc...), hãy tự động 'đọc vị' chính xác tỉnh thành tương ứng trong 34 tỉnh thành 2025/2026.",
        "- Ưu tiên gợi ý các sản phẩm có cùng tỉnh/thành phố hoặc khu vực gần nhất để giao nhận hỏa tốc 2H.",
        "",
        "QUY TẮC TƯ VẤN THỜI TRANG:",
        "- Bạn chỉ được gợi ý sản phẩm có trong danh sách kho đồ JSON được cung cấp.",
        "- Khi nhắc tới sản phẩm, bắt buộc chèn đúng cú pháp [PRODUCT:id] ngay sau câu giới thiệu món đồ đó.",
        "- Không tự bịa ID, không bịa giá tiền.",
        "- Văn phong thân thiện, sành điệu, ấm áp, ngắn gọn và hữu ích. Nêu rõ lý do gợi ý (theo dịp, màu sắc, vóc dáng, chất liệu, thời tiết).",
        "- HỖ TRỢ KHÁCH HÀNG: Nếu khách hỏi về vấn đề đơn hàng, thanh toán, đổi size hoặc khiếu nại, hãy hướng dẫn khách có thể bấm nút 'Gặp CSKH 24/7' ở góc trên khung chat hoặc liên hệ Hotline/Zalo CSKH CLOOP để được hỗ trợ trực tiếp ngay tức thì.",
      ].join("\n"),
    });

    const recentHistory = Array.isArray(history)
      ? history
          .slice(-8)
          .filter((item) => item?.role && item?.text)
          .map((item) => `${item.role === "user" ? "Khách" : "Stylist"}: ${String(item.text).replace(/\[PRODUCT:[^\]]+\]/g, "").trim()}`)
          .join("\n")
      : "";

    const prompt = [
      "Kho đồ CLOOP hiện có (JSON):",
      JSON.stringify(catalog),
      "",
      recentHistory ? `Lịch sử chat gần nhất:\n${recentHistory}\n` : "",
      `Yêu cầu mới của khách hàng: ${message}`,
      "",
      "Hãy đọc vị địa điểm (34 tỉnh thành), gu ăn mặc, sự kiện và tư vấn ngắn gọn, chuẩn xác. Chèn mã [PRODUCT:id] cho từng sản phẩm gợi ý.",
    ].join("\n");

    let result;
    try {
      result = await model.generateContentStream(prompt);
    } catch (e) {
      // Fallback model nếu 3.6-flash đang update
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      result = await fallbackModel.generateContentStream(prompt);
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`[[CATALOG:${encodeCatalog(catalog)}]]\n`));

        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) controller.enqueue(encoder.encode(text));
          }
        } catch (error) {
          console.error("Lỗi streaming AI Stylist:", error);
          controller.enqueue(encoder.encode("\nMình đang bị nghẽn kết nối AI một chút, bạn thử gửi lại giúp mình nhé."));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    console.error("Lỗi API AI Stylist:", error);
    return new Response("Bộ não AI Stylist đang bận xử lý, bạn thử lại sau nhé.", { status: 500 });
  }
}
