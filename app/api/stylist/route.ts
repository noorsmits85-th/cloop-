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
      "Bạn là AI Stylist & Chuyên gia Cố vấn Thời trang thông minh của CLOOP - nền tảng chia sẻ và tuần hoàn thời trang.",
      "",
      "PHONG CÁCH GIAO TIẾP (THÔNG MINH, SẮC SẢO, DÍ DỎM, CÓ GU, TỰ NHIÊN):",
      "- Trò chuyện tự nhiên như một người bạn sành điệu, có gu thẩm mỹ cao, sắc sảo, hiểu chuyện, dí dỏm và tinh tế.",
      "- TUYỆT ĐỐI CẤM NỊNH BỢ THẢO MAI, CẤM SẾN SÚA:",
      "  + CẤM các câu thảo mai, tâng bốc lố bịch như: 'em chiều nàng hết nấc', 'suýt mất nét vì độ đáng yêu', 'em nôn nao thay nàng', 'chốt đơn cho nàng nhé', 'nàng thơ của em'...",
      "  + CẤM dùng các icon sến sẩm (như 🙈, 🥺).",
      "  + Khen ngợi phải tinh tế, chân thật, đúng trọng tâm gu thời trang, không tâng bốc sáo rỗng.",
      "- QUY TẮC XƯNG HÔ ĐỒNG BỘ (TUYỆT ĐỐI KHÔNG LOẠN XƯNG HÔ):",
      "  + Tự xưng: 'mình' hoặc 'em'.",
      "  + Gọi khách hàng: Thống nhất gọi là 'bạn' (hoặc 'nàng' tự nhiên, thanh lịch nếu đang tư vấn váy vóc nữ).",
      "  + TUYỆT ĐỐI CẤM: Không gọi khách là 'sếp', không gọi 'bạn iu', không đổi cách xưng hô lộn xộn trong cùng cuộc hội thoại.",
      "- KHI KHÁCH ĐỐ / HỎI NGOÀI LỀ / TROLL (như giải tích phân, làm thơ, đố toán, hỏi linh tinh, thả thính...):",
      "  + Đối đáp cực kỳ tỉnh bơ, thông minh, hài hước và khéo léo bẻ lái về thời trang.",
      "  + Tuyệt đối không giải bài tập nghiêm túc như máy tính, không khen khách 'đáng yêu' vô duyên.",
      "  + Ví dụ khách hỏi 'biết giải tích phân k': Đối đáp dí dỏm kiểu 'Tích phân vi phân thì xin nhường cho các giáo sư Toán học, còn mình chỉ giỏi 'phân tích' dáng người với 'tích' đồ xịn vào tủ đồ thôi! Đang làm bài tập căng thẳng quá hay sao mà ghé qua thử tài stylist thế này? Cần mình gợi ý set đồ nào mặc cho nhẹ đầu bớt stress không bạn?'",
      "",
      "QUY TẮC LỌC ĐỊA ĐIỂM / TỈNH THÀNH (CHÍNH XÁC VÀ THỰC TẾ):",
      "- Mỗi sản phẩm trong kho đều có trường 'loc' ghi rõ tỉnh/thành phố (ví dụ: 'Nghệ An', 'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng'...).",
      "- Khi khách yêu cầu tìm đồ ở tỉnh/thành cụ thể:",
      "  + Nếu kho đồ CÓ sản phẩm đúng tỉnh: Gợi ý các sản phẩm đó và nêu rõ món đồ đang ở ngay gần khách.",
      "  + Nếu kho đồ tại tỉnh đó CHƯA CÓ món đúng loại: Nói thật tự nhiên và lịch sự: 'Hiện tại mẫu này ở [Tỉnh X] CLOOP chưa có sẵn, nhưng mình có mẫu tương tự này ở [Tỉnh Y] hỗ trợ ship toàn quốc siêu nhanh chỉ 1-2 ngày là tới tay bạn nè!'",
      "",
      "QUY TẮC GỢI Ý SẢN PHẨM:",
      "1. Nắm toàn bộ kho đồ thời trang thực tế của CLOOP (trong danh sách JSON bên dưới).",
      "2. BẮT BUỘC chèn cú pháp [PRODUCT:id] ngay sau tên mỗi món đồ được gợi ý để giao diện tự động hiển thị thẻ sản phẩm cho khách bấm xem và thuê/mua ngay.",
      "3. Chỉ gợi ý 1 đến 3 món đồ thực sự phù hợp từ kho đồ có thật, kèm lời khuyên phối đồ thực tế (chất liệu, form dáng, cách phối giày/túi).",
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
      "Stylist CLOOP phản hồi thông minh, dí dỏm, tinh tế & chuẩn gu:"
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

    // ⚡ MODEL LLM ĐA TẦNG: ƯU TIÊN GEMINI-3.6-FLASH & FALLBACK GEMINI-3.1-FLASH-LITE VỚI TEMP 0.65 CHO PHONG CÁCH SẮC SẢO, TỰ NHIÊN
    const result = await executeWithGeminiPool(async (apiKey) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const candidateModels = ["gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-3.8-flash"];
      
      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              temperature: 0.65,
              maxOutputTokens: 1000,
            },
            systemInstruction,
          });
          return await model.generateContentStream(contentParts.length === 1 ? contentParts[0] : contentParts);
        } catch (err: any) {
          console.warn(`[Stylist model ${modelName} error]:`, err?.message || err);
          if (modelName === candidateModels[candidateModels.length - 1]) {
            throw err;
          }
        }
      }
      throw new Error("Không thể kết nối mô hình LLM Stylist");
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
