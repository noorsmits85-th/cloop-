import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/src/lib/prisma";
import { executeWithGeminiPool, getAllGeminiKeys } from "@/src/utils/gemini-pool";

export const runtime = "nodejs";

type CatalogProduct = {
  id: string;
  title: string;
  category: string;
  occasion: string;
  size: string;
  color: string;
  material: string;
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

// 🛡️ SLIDING WINDOW RATE LIMITER: Tối đa 25 request / phút / IP chống spam làm cạn token AI
const ipRequestMap = new Map<string, number[]>();

function checkRateLimit(ip: string, limit = 25, windowMs = 60000): boolean {
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

    if (!checkRateLimit(ip, 25, 60000)) {
      return new Response(
        JSON.stringify({ 
          reply: "Bạn đang gửi tin nhắn quá nhanh. Vui lòng chờ 30 giây để tiếp tục trò chuyện cùng Trợ lý nhé!", 
          catalog: [] 
        }), 
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const { message, image, history = [] } = await request.json();

    if ((!message && !image) || (message && typeof message !== "string")) {
      return new Response("Thiếu nội dung chat hoặc ảnh.", { status: 400 });
    }

    if (getAllGeminiKeys().length === 0) {
      return new Response("Thiếu cấu hình GEMINI_API_KEY trong hệ thống.", { status: 500 });
    }

    // ⚡ LẤY TOÀN BỘ KHO ĐỒ THỰC TẾ TRÊN WEB (LỌC BỎ DỮ LIỆU TEST/MOCK)
    const products = await prisma.product.findMany({
      where: {
        isDeleted: false,
        NOT: {
          title: { contains: "Mock", mode: "insensitive" }
        }
      },
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        occasion: true,
        size: true,
        color: true,
        material: true,
        province: true,
        images: { select: { url: true }, take: 1 },
        listings: { select: { listingType: true, status: true, salePrice: true, basePrice: true } },
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
          occasion: product.occasion || "Dạo phố",
          size: product.size || "",
          color: product.color || "",
          material: product.material || "",
          province: (product.province || "Toàn quốc").trim(),
          image: product.images[0]?.url || PLACEHOLDER_IMAGE,
          priceText: formatPrice(price, listing?.listingType),
          listingType: listing?.listingType || "RENT",
        };
      })
      .filter((product) => product.title && product.id);

    // Bổ sung rõ trường "loc" (Tỉnh/Thành phố) để AI lọc chuẩn xác theo địa phương của khách
    const compactCatalog = catalog.map(p => ({
      id: p.id,
      title: p.title,
      loc: p.province,
      cat: p.category,
      occ: p.occasion,
      color: p.color,
      mat: p.material,
      size: p.size,
      price: p.priceText,
      type: p.listingType === "RENT" ? "Cho thuê" : "Bán/Thanh lý"
    }));

    const systemInstruction = [
      "Bạn là Trợ Lý Thời Trang & AI Stylist độc quyền của nền tảng thời trang tuần hoàn CLOOP.",
      "",
      "QUY TẮC XƯNG HÔ & PHONG CÁCH GIAO TIẾP (CHUẨN MỰC, TINH TẾ & ĐỒNG BỘ 100%):",
      "- XƯNG HÔ NHẤT QUÁN: Bạn tự xưng là 'mình' hoặc 'CLOOP', và gọi khách hàng là 'bạn'.",
      "- TUYỆT ĐỐI CẤM: Không gọi khách là 'sếp', không gọi 'bạn iu', không gọi 'nàng thơ' hay 'người đẹp' bừa bãi. Tuyệt đối KHÔNG trộn lẫn nhiều kiểu xưng hô trong cùng một câu hay một đoạn chat. Giữ cách xưng hô văn minh, thanh lịch, gần gũi và chuẩn mực.",
      "- GIỌNG ĐIỆU: Nhã nhặn, am hiểu thời trang, tư vấn đúng gu, hiện đại và hữu ích. Không nịnh bợ lố lăng, không dùng văn phong sến súa.",
      "- TRẢ LỜI SÚC TÍCH, NHANH GỌN: Đi thẳng vào trọng tâm trong 2-3 câu ngắn gọn, rồi gợi ý ngay món đồ phù hợp.",
      "- TUYỆT ĐỐI KHÔNG DÙNG icon hoặc emoji lấp lánh ✨ ở bất kỳ đâu.",
      "",
      "QUY TẮC LỌC ĐỊA ĐIỂM / TỈNH THÀNH (BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT):",
      "- Mỗi sản phẩm trong kho đều có trường 'loc' ghi rõ tỉnh/thành phố (ví dụ: 'Nghệ An', 'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng'...).",
      "- Khi khách yêu cầu tìm đồ ở tỉnh/thành cụ thể (ví dụ: Nghệ An, Hà Nội, Đà Nẵng, v.v.):",
      "  + Bạn BẮT BUỘC chỉ lọc và bốc các món đồ có 'loc' trùng khớp với tỉnh/thành mà khách yêu cầu!",
      "  + TUYỆT ĐỐI KHÔNG bốc sản phẩm ở tỉnh khác rồi nói sai là ở tỉnh khách tìm.",
      "  + Nếu kho đồ tại tỉnh đó chưa có món đúng loại khách muốn, hãy trả lời trung thực: 'Hiện tại tủ đồ ở [Tỉnh/thành] chưa có mẫu này, nhưng mình có mẫu tương tự ở [Tỉnh khác] có thể giao hỏa tốc toàn quốc cho bạn nhé' rồi mới gợi ý.",
      "",
      "QUY TẮC GỢI Ý SẢN PHẨM:",
      "1. Nắm toàn bộ kho đồ thời trang thực tế của CLOOP (trong danh sách JSON bên dưới).",
      "2. BẮT BUỘC chèn cú pháp [PRODUCT:id] ngay sau tên mỗi món đồ được gợi ý để giao diện tự động hiển thị thẻ sản phẩm cho khách bấm xem và thuê/mua ngay.",
      "3. Chỉ gợi ý 1 đến 3 món đồ thực sự phù hợp từ kho đồ có thật, không bịa đặt sản phẩm không tồn tại.",
    ].join("\n");

    const recentHistory = Array.isArray(history)
      ? history
          .slice(-6)
          .filter((item) => item?.role && item?.text)
          .map((item) => `${item.role === "user" ? "Khách" : "Trợ lý"}: ${String(item.text).replace(/\[PRODUCT:[^\]]+\]/g, "").trim()}`)
          .join("\n")
      : "";

    const userPromptText = message || (image ? "Nhờ bạn xem giúp bức ảnh này và tìm trang phục tương tự trong kho CLOOP giúp mình nhé!" : "");

    const promptText = [
      `Kho đồ CLOOP sẵn sàng (${compactCatalog.length} món có thật trên web): ${JSON.stringify(compactCatalog)}`,
      recentHistory ? `Lịch sử hội thoại gần đây:\n${recentHistory}` : "",
      `Khách hàng: ${userPromptText}`,
      "Trợ lý Stylist CLOOP phản hồi chuẩn mực, nhanh gọn & bốc đúng đồ theo địa phương:"
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

    // ⚡ MODEL SIÊU TỐC: DÙNG GEMINI-3.6-FLASH CHO PHẢN HỒI TỨC THÌ TRONG 1-2S
    const result = await executeWithGeminiPool(async (apiKey) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      try {
        const model = genAI.getGenerativeModel({
          model: "gemini-3.6-flash",
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 800,
          },
          systemInstruction,
        });
        return await model.generateContentStream(contentParts.length === 1 ? contentParts[0] : contentParts);
      } catch (err) {
        console.warn("Stylist primary model gemini-3.6-flash error, trying fallback gemini-3.8-flash:", err);
        const fallbackModel = genAI.getGenerativeModel({
          model: "gemini-3.8-flash",
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 800,
          },
          systemInstruction,
        });
        return await fallbackModel.generateContentStream(contentParts.length === 1 ? contentParts[0] : contentParts);
      }
    });

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
          controller.enqueue(encoder.encode("\nMình đang cập nhật kho đồ một chút, bạn gửi lại câu hỏi giúp mình nhé!"));
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
    return new Response("Trợ lý CLOOP đang kết nối kho đồ, bạn thử lại sau ít giây nhé.", { status: 500 });
  }
}
