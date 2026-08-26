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

    // ⚡ Lấy kho đồ 20 món mới nhất để sẵn sàng khi khách cần tìm đồ
    const productsPromise = prisma.product.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        size: true,
        color: true,
        province: true,
        images: { select: { url: true }, take: 1 },
        listings: { select: { listingType: true, status: true, salePrice: true, basePrice: true } },
      },
    });

    const products = await productsPromise;

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

    const compactCatalog = catalog.map(p => ({
      id: p.id,
      title: p.title,
      cat: p.category,
      size: p.size,
      color: p.color,
      prov: p.province,
      price: p.priceText
    }));

    const genAI = new GoogleGenerativeAI(apiKey);
    const systemInstruction = [
      "Bạn là Trợ Lý Thời Trang & Stylist Thông Minh của CLOOP (nền tảng thời trang tuần hoàn).",
      "",
      "TÍNH CÁCH & PHONG CÁCH GIAO TIẾP:",
      "- Vui vẻ, tự nhiên, dí dỏm, thân thiện như một người bạn sành điệu nói chuyện đời thường.",
      "- Trả lời nhanh gọn, ấm áp, có cảm xúc.",
      "",
      "QUY TẮC XỬ LÝ:",
      "1. NẾU KHÁCH NÓI CHUYỆN PHIẾM, CHÀO HỎI, ĐÙA VUI, HỎI THĂM: Trả lời tự nhiên, hài hước, đời thường như người bạn (KHÔNG cần gợi ý sản phẩm).",
      "2. KHI NÀO KHÁCH CÓ NHU CẦU TÌM ĐỒ / PHỐI OUTFIT / HỎI TRANG PHỤC ĐI ĐÂU (đi tiệc, đi biển, đi làm, tìm áo/váy...): Lúc này hãy tư vấn 1-2 món chuẩn gu từ kho đồ CLOOP và BẮT BUỘC chèn token [PRODUCT:id] ngay sau tên món đồ đó.",
    ].join("\n");

    const recentHistory = Array.isArray(history)
      ? history
          .slice(-4)
          .filter((item) => item?.role && item?.text)
          .map((item) => `${item.role === "user" ? "Khách" : "Trợ lý"}: ${String(item.text).replace(/\[PRODUCT:[^\]]+\]/g, "").trim()}`)
          .join("\n")
      : "";

    const prompt = [
      `Kho đồ CLOOP sẵn sàng: ${JSON.stringify(compactCatalog)}`,
      recentHistory ? `Lịch sử chat:\n${recentHistory}` : "",
      `Khách: ${message}`,
      "Trợ lý CLOOP trả lời tự nhiên:"
    ].filter(Boolean).join("\n");

    let result;
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-3.5-flash-lite",
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 400,
        },
        systemInstruction,
      });
      result = await model.generateContentStream(prompt);
    } catch (err) {
      // Fallback model nếu cần
      const fallbackModel = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite",
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 400,
        },
        systemInstruction,
      });
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
          controller.enqueue(encoder.encode("\nMình đang nghẽn mạng một xíu, bạn gửi lại nhé!"));
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
    return new Response("Trợ lý CLOOP đang bận, bạn thử lại sau nhé.", { status: 500 });
  }
}
