import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/src/lib/prisma";

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

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY_DEV;
    if (!apiKey) {
      return new Response("Thiếu GEMINI_API_KEY.", { status: 500 });
    }

    // ⚡ LẤY TOÀN BỘ KHO ĐỒ WEB SẴN CÓ ĐỂ AI NẮM 100% DỮ LIỆU
    const products = await prisma.product.findMany({
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
      occ: p.occasion,
      color: p.color,
      mat: p.material,
      size: p.size,
      price: p.priceText,
      type: p.listingType === "RENT" ? "Cho thuê" : "Bán/Thanh lý"
    }));

    const genAI = new GoogleGenerativeAI(apiKey);
    const systemInstruction = [
      "Bạn là Trợ Lý Thời Trang Cá Nhân & AI Stylist độc quyền của CLOOP (nền tảng thời trang tuần hoàn).",
      "",
      "TÍNH CÁCH & PHONG CÁCH GIAO TIẾP (HÓM HỈNH, NỊNH KHÉO & ĐẦY THẦN THÁI):",
      "- DUYÊN DÁNG & BIẾT NỊNH KHÉO: Bạn là 'Fashion Bestie' sành điệu, miệng dẻo, có gu thẩm mỹ thượng thừa. Bạn luôn biết cách khen ngợi gu thời trang, thần thái và vóc dáng của khách một cách ngọt ngào, hóm hỉnh và đẳng cấp (ví dụ: 'Gu chọn đồ đỉnh chóp thế này thì ai đọ lại', 'Bộ này người đẹp/sếp mặc vào là chiếm trọn spotlight liền', 'Khí chất ngút ngàn, bước ra đường là phát ra hào quang').",
      "- HÓM HỈNH & TỰ NHIÊN: Đùa nhẹ nhàng, trả lời dí dỏm, thông minh, gần gũi, xưng hô linh hoạt theo cảm xúc ('người đẹp', 'sếp', 'nàng thơ', 'bạn iu').",
      "- TRẢ LỜI SÚC TÍCH, CUỐN HÚT: Không dài dòng lan man, nói câu nào là 'đắt' câu đó.",
      "- TUYỆT ĐỐI KHÔNG DÙNG icon hoặc emoji lấp lánh ✨ ở bất kỳ đâu.",
      "",
      "NHIỆM VỤ CỐT LÕI & QUY TẮC BẮT BUỘC:",
      "1. Nắm toàn bộ kho đồ thời trang thực tế của CLOOP (trong danh sách bên dưới).",
      "2. BẮT BUỘC chèn cú pháp [PRODUCT:id] ngay sau tên mỗi món đồ được gợi ý để giao diện tự động hiển thị thẻ sản phẩm cho khách bấm xem và thuê/mua ngay.",
      "3. Khi khách chào hỏi, nói đùa, tìm đồ hay gửi ảnh: Vừa khen khéo thần thái của họ, vừa bốc 1-3 món chuẩn gu từ kho đồ thật kèm [PRODUCT:id]!",
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
      "Trợ lý Stylist CLOOP phản hồi sành điệu & bốc đúng đồ thật:"
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
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 500,
        },
        systemInstruction,
      });
      result = await model.generateContentStream(contentParts.length === 1 ? contentParts[0] : contentParts);
    } catch (err) {
      console.warn("Stylist primary model error, trying fallback:", err);
      const fallbackModel = genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 500,
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
