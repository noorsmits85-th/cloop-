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

// 🛡️ SLIDING WINDOW RATE LIMITER: Tối đa 15 request / phút / IP chống spam làm cạn token AI
const ipRequestMap = new Map<string, number[]>();

function checkRateLimit(ip: string, limit = 15, windowMs = 60000): boolean {
  const now = Date.now();
  const timestamps = ipRequestMap.get(ip) || [];
  const validTimestamps = timestamps.filter(t => now - t < windowMs);

  if (validTimestamps.length >= limit) {
    return false;
  }

  validTimestamps.push(now);
  ipRequestMap.set(ip, validTimestamps);
  return true;
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous-client";

    if (!checkRateLimit(ip, 15, 60000)) {
      return new Response(
        JSON.stringify({ 
          reply: "⚠️ Bạn đang gửi tin nhắn quá nhanh. Vui lòng chờ 30 giây để tiếp tục trò chuyện cùng Trợ lý nhé!", 
          catalog: [] 
        }), 
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const { message, image, history = [] } = await request.json();

    if ((!message && !image) || (message && typeof message !== "string")) {
      return new Response("Thiếu nội dung chat hoặc ảnh.", { status: 400 });
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
      "- TUYỆT ĐỐI KHÔNG DÙNG icon hoặc emoji lấp lánh ✨ ở bất kỳ đâu.",
      "",
      "QUY TẮC XỬ LÝ:",
      "1. NẾU KHÁCH GỬI ẢNH OUTFIT / VÁY / ÁO / PHỤ KIỆN: Hãy phân tích mắt nhìn (màu sắc, phong cách, kiểu dáng) và tìm ngay trong 'Kho đồ CLOOP sẵn sàng' 1-2 món tương đồng nhất, sau đó gợi ý kèm mã [PRODUCT:id].",
      "2. NẾU KHÁCH NÓI CHUYỆN PHIẾM, CHÀO HỎI, ĐÙA VUI: Trả lời tự nhiên, hài hước, đời thường như người bạn (KHÔNG cần gợi ý sản phẩm).",
      "3. KHI NÀO KHÁCH CÓ NHU CẦU TÌM ĐỒ / PHỐI OUTFIT / HỎI TRANG PHỤC ĐI ĐÂU (đi tiệc, đi biển, đi làm, tìm áo/váy...): Lúc này hãy tư vấn 1-2 món chuẩn gu từ kho đồ CLOOP và BẮT BUỘC chèn token [PRODUCT:id] ngay sau tên món đồ đó.",
    ].join("\n");

    const recentHistory = Array.isArray(history)
      ? history
          .slice(-4)
          .filter((item) => item?.role && item?.text)
          .map((item) => `${item.role === "user" ? "Khách" : "Trợ lý"}: ${String(item.text).replace(/\[PRODUCT:[^\]]+\]/g, "").trim()}`)
          .join("\n")
      : "";

    const userPromptText = message || (image ? "Nhờ bạn xem giúp bức ảnh này và tìm đồ tương tự trong kho CLOOP giúp mình nhé!" : "");

    const promptText = [
      `Kho đồ CLOOP sẵn sàng: ${JSON.stringify(compactCatalog)}`,
      recentHistory ? `Lịch sử chat:\n${recentHistory}` : "",
      `Khách: ${userPromptText}`,
      "Trợ lý CLOOP trả lời tự nhiên & gợi ý:"
    ].filter(Boolean).join("\n");

    // Hỗ trợ xử lý đa phương thức (Ảnh + Text)
    const contentParts: any[] = [];
    if (image && typeof image === "string" && image.includes("base64")) {
      try {
        const mimeType = image.match(/:(.*?);/)?.[1] || "image/jpeg";
        const base64Data = image.split(",")[1] || image;
        contentParts.push({
          inlineData: {
            data: base64Data,
            mimeType,
          },
        });
      } catch (imgErr) {
        console.warn("Lỗi trích xuất Base64 ảnh trong chat:", imgErr);
      }
    }
    contentParts.push(promptText);

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
      result = await model.generateContentStream(contentParts.length === 1 ? contentParts[0] : contentParts);
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
      result = await fallbackModel.generateContentStream(contentParts.length === 1 ? contentParts[0] : contentParts);
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
