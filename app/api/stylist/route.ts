import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/src/lib/prisma";

export const runtime = "nodejs";

type CatalogProduct = {
  id: string;
  title: string;
  category: string;
  size: string;
  color: string;
  province: string;
  image: string;
  priceText: string;
  listingType: string;
};

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600";

// BẢN ĐỒ 34 ĐƠN VỊ HÀNH CHÍNH 2025/2026 TỔNG QUAN
const VIETNAM_PROVINCES_GEO = `
Quy đổi địa danh: Vinh/Cửa Lò -> Nghệ An; Nha Trang/Cam Ranh -> Khánh Hòa; Đà Lạt/Bảo Lộc/Phan Thiết -> Lâm Đồng; Sa Pa/Yên Bái -> Lào Cai; Hội An/Tam Kỳ -> TP. Đà Nẵng; Sài Gòn/Bình Dương/Vũng Tàu -> TP. Hồ Chí Minh; Cần Thơ/Hậu Giang/Sóc Trăng -> TP. Cần Thơ; Quy Nhơn -> Gia Lai/Bình Định; Hải Phòng/Hải Dương -> TP. Hải Phòng; Hà Nội -> TP. Hà Nội; Hạ Long -> Quảng Ninh.
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

    // ⚡ Tối ưu truy vấn DB nhanh: Lấy 24 sản phẩm mới nhất với các trường cần thiết
    const products = await prisma.product.findMany({
      take: 24,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        size: true,
        color: true,
        province: true,
        images: {
          select: { url: true, isPrimary: true },
          take: 1,
        },
        listings: {
          select: { listingType: true, status: true, salePrice: true, basePrice: true },
        },
      },
    });

    const catalog: CatalogProduct[] = products
      .map((product) => {
        const listing = pickPrimaryListing(product.listings);
        const price = listing?.salePrice || listing?.basePrice;

        return {
          id: product.id,
          title: product.title,
          category: product.category || "",
          size: product.size || "",
          color: product.color || "",
          province: product.province || "Toàn quốc",
          image: product.images[0]?.url || PLACEHOLDER_IMAGE,
          priceText: formatPrice(price, listing?.listingType),
          listingType: listing?.listingType || "RENT",
        };
      })
      .filter((product) => product.title && product.id);

    // ⚡ Sử dụng Gemini 3.5 Flash-Lite mới nhất (Google's fastest 3.5-class model)
    const genAI = new GoogleGenerativeAI(apiKey);
    const systemInstruction = [
      "Bạn là CLOOP AI Stylist, cố vấn thời trang tuần hoàn thông minh, ngắn gọn, siêu nhanh.",
      VIETNAM_PROVINCES_GEO,
      "QUY TẮC PHẢN HỒI:",
      "- Chỉ gợi ý 1-2 món phù hợp nhất từ kho đồ.",
      "- BẮT BUỘC chèn cú pháp [PRODUCT:id] ngay sau câu giới thiệu món đồ.",
      "- Trả lời ngắn gọn 2-3 câu, sành điệu, ấm áp, nêu lý do theo dịp/màu/vóc dáng.",
    ].join("\n");

    let model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 450,
      },
      systemInstruction,
    });

    const recentHistory = Array.isArray(history)
      ? history
          .slice(-4)
          .filter((item) => item?.role && item?.text)
          .map((item) => `${item.role === "user" ? "Khách" : "Stylist"}: ${String(item.text).replace(/\[PRODUCT:[^\]]+\]/g, "").trim()}`)
          .join("\n")
      : "";

    // Prompt siêu tinh gọn để inference siêu tốc
    const compactCatalog = catalog.map(p => ({
      id: p.id,
      title: p.title,
      cat: p.category,
      size: p.size,
      color: p.color,
      prov: p.province,
      price: p.priceText
    }));

    const prompt = [
      `Kho đồ CLOOP: ${JSON.stringify(compactCatalog)}`,
      recentHistory ? `Lịch sử:\n${recentHistory}` : "",
      `Khách: ${message}`,
      "Tư vấn 1-2 món chuẩn nhất kèm [PRODUCT:id]:"
    ].filter(Boolean).join("\n");

    let result;
    try {
      result = await model.generateContentStream(prompt);
    } catch (err) {
      // Fallback model nếu endpoint 3.5 cần tương thích
      const fallbackModel = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite",
        generationConfig: { temperature: 0.3, maxOutputTokens: 450 },
        systemInstruction,
      });
      result = await fallbackModel.generateContentStream(prompt);
    }
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Gửi catalog ngay lập tức
        controller.enqueue(encoder.encode(`[[CATALOG:${encodeCatalog(catalog)}]]\n`));

        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) controller.enqueue(encoder.encode(text));
          }
        } catch (error) {
          console.error("Lỗi streaming AI Stylist:", error);
          controller.enqueue(encoder.encode("\nMình đang nghẽn mạng một chút, bạn gửi lại nhé!"));
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
    return new Response("Bộ não AI Stylist đang bận, bạn thử lại sau nhé.", { status: 500 });
  }
}
