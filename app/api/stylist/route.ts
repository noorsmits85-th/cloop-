import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/src/lib/prisma";
import { executeWithGeminiPool, getAllGeminiKeys } from "@/src/utils/gemini-pool";
import { createClient } from "@/src/utils/supabase/server";

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

/**
 * Chuẩn hóa tên Tỉnh / Thành phố
 * Gom triệt để các biến thể nhập liệu trong DB ("Nghệ an", "Nghệ An ", "Vinh", "HCM", "TP. Hồ Chí Minh"...)
 */
function normalizeLocation(rawLocation?: string | null): string {
  if (!rawLocation) return "Toàn quốc";
  const text = rawLocation.trim().toLowerCase();
  if (
    text.includes("hồ chí minh") ||
    text.includes("hcm") ||
    text.includes("sài gòn") ||
    text.includes("saigon") ||
    text.includes("tphcm")
  ) {
    return "TP. Hồ Chí Minh";
  }
  if (
    text.includes("nghệ an") ||
    text.includes("nghe an") ||
    text.includes("vinh") ||
    text.includes("tp vinh")
  ) {
    return "Nghệ An";
  }
  if (text.includes("hà nội") || text.includes("ha noi") || text.includes("hn")) {
    return "Hà Nội";
  }
  if (text.includes("đà nẵng") || text.includes("da nang")) {
    return "Đà Nẵng";
  }
  if (text.includes("cần thơ") || text.includes("can tho")) {
    return "Cần Thơ";
  }
  if (text.includes("hải phòng") || text.includes("hai phong")) {
    return "Hải Phòng";
  }

  // Viết hoa chữ cái đầu cho các tỉnh khác
  return rawLocation
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// 🛡️ SLIDING WINDOW RATE LIMITER: Tối đa 25 request / phút / IP
const ipRequestMap = new Map<string, number[]>();

function checkRateLimit(ip: string, limit = 25, windowMs = 60000): boolean {
  const now = Date.now();
  const timestamps = ipRequestMap.get(ip) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

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

    const { message, image, history = [], sessionId, userId, userName } = await request.json();

    // Thu thập danh tính người dùng nếu đã đăng nhập
    let resolvedUserId = userId || null;
    let resolvedUserName = userName || null;
    if (!resolvedUserId) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          resolvedUserId = user.id;
          resolvedUserName = user.user_metadata?.name || user.email || "Thành viên CLOOP";
        }
      } catch {
        // Khách vãng lai
      }
    }

    if ((!message && !image) || (message && typeof message !== "string")) {
      return new Response("Thiếu nội dung chat hoặc ảnh.", { status: 400 });
    }

    if (getAllGeminiKeys().length === 0) {
      return new Response("Thiếu cấu hình GEMINI_API_KEY trong hệ thống.", { status: 500 });
    }

    // ⚡ LẤY TOÀN BỘ KHO ĐỒ THỰC TẾ TRÊN WEB (LỌC BỎ DỮ LIỆU ĐÃ XÓA / MOCK)
    const products = await prisma.product.findMany({
      where: {
        isDeleted: false,
        NOT: {
          title: { contains: "Mock", mode: "insensitive" }
        }
      },
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
          province: normalizeLocation(product.province),
          image: product.images[0]?.url || PLACEHOLDER_IMAGE,
          priceText: formatPrice(price, listing?.listingType),
          listingType: listing?.listingType || "RENT",
        };
      })
      .filter((product) => product.title && product.id);

    // Phân nhóm kho hàng theo từng khu vực tỉnh thành để AI định vị tức thì
    const groupedByLocation: Record<string, CatalogProduct[]> = {};
    for (const p of catalog) {
      const loc = p.province;
      if (!groupedByLocation[loc]) groupedByLocation[loc] = [];
      groupedByLocation[loc].push(p);
    }

    const locationSummary = Object.entries(groupedByLocation)
      .map(([loc, items]) => `${loc} (${items.length} mẫu)`)
      .join(", ");

    const catalogSections = Object.entries(groupedByLocation)
      .map(([loc, items]) => {
        const itemLines = items.map(
          (p) => `- [PRODUCT:${p.id}] Tên: "${p.title}" | Loại: ${p.category || "Váy/Đầm"} | Dịp: ${p.occasion} | Size: ${p.size || "Freesize"} | Màu: ${p.color || "Đa dạng"} | Giá thuê: ${p.priceText}`
        );
        return `=== KHO ĐỒ TẠI KHU VỰC: ${loc.toUpperCase()} (${items.length} MẪU) ===\n${itemLines.join("\n")}`;
      })
      .join("\n\n");

    const systemInstruction = [
      `Bạn là Trợ lý Thời trang Cá nhân nữ (Personal Stylist) của thương hiệu CLOOP — nền tảng chia sẻ, cho thuê và mua sắm váy dạ hội, đầm thiết kế, đồ đi tiệc và dạo phố cao cấp.`,
      "",
      `1. CÁCH XƯNG HÔ & PHONG THÁI GIAO TIẾP (CỰC KỲ QUAN TRỌNG):`,
      `- QUY TẮC CẤM TIỆT: TUYỆT ĐỐI KHÔNG BAO GIỜ dùng từ "nàng" trong mọi hoàn cảnh (vì nghe sến sẩm, kiểu cách và xa cách).`,
      `- Cách xưng hô: Xưng "em" hoặc "mình". Gọi khách là "người đẹp", "bạn", "chị", hoặc xưng hô linh hoạt theo đúng tần số của khách.`,
      `- Phong thái: Hãy đóng vai một cô bạn thân sành điệu, có gu ăn mặc cực đỉnh đi lựa đồ cùng khách. Nói chuyện gần gũi, đời thường, tếu táo nhẹ nhàng, lém lỉnh và có duyên:`,
      `  + Nếu khách hỏi ngắn gọn, nghiêm túc -> Tư vấn nhanh gọn, chuẩn trọng tâm, tinh tế.`,
      `  + Nếu khách nói chuyện vui vẻ, thoải mái, hơi "lầy" hoặc than thở chuyện vóc dáng/không có đồ mặc -> Bắt nhịp ngay, đối đáp tếu táo, hài hước để khách thấy dễ chịu (ví dụ: "Khúc này để em lo, giấu nhẹm vòng 2 luôn người đẹp ơi", "Đi đám cưới người yêu cũ hay sao mà tìm đầm chặt chém dữ vậy bạn mình ơi...").`,
      `  + Tuyệt đối không đố toán tích phân, không nói nhảm lạc đề ngoài thời trang và nhu cầu thực tế của khách.`,
      "",
      `2. LOGIC VỊ TRÍ & THỜI GIAN NHẬN ĐỒ (CHÍNH XÁC THEO KHO):`,
      `Hiện tại kho CLOOP có tổng cộng ${catalog.length} sản phẩm phân bổ tại: ${locationSummary}.`,
      `- TRƯỜNG HỢP 1 (Khách CHƯA cho biết đang ở tỉnh/thành nào):`,
      `  + Vẫn gợi ý 1 - 2 mẫu hợp gu cho khách xem trước.`,
      `  + Cuối tin nhắn, khéo léo hỏi một câu tự nhiên: "Mà người đẹp đang ở khu vực/tỉnh thành nào và đi tiệc ngày mấy đó? Nhắn mình check kho sát vách ship liền trong ngày cho kịp thử đồ nha!"`,
      `- TRƯỜNG HỢP 2 (Khách ĐÃ cho biết vị trí, ví dụ: Vinh/Nghệ An, Sài Gòn/TP.HCM, Hà Nội, Đà Nẵng...):`,
      `  + ƯU TIÊN SỐ 1 (Đồ có sẵn CÙNG TỈNH với khách): Lọc ngay các mẫu nằm trong khu vực đó. Báo rõ: "Tin vui là mẫu này đang sẵn ngay ở [Tên Tỉnh/TP] luôn người đẹp ơi, đặt là nhận ship hỏa tốc trong ngày thử liền tay nha!"`,
      `  + ƯU TIÊN SỐ 2 (Đồ nằm ở TỈNH KHÁC): Nếu tỉnh của khách chưa có mẫu đúng ý hoặc khách ở tỉnh khác, hãy gợi ý mẫu đẹp nhất ở khu vực khác và nói rõ: "Mẫu này hiện đang ở kho [Tên Tỉnh có đồ], bên mình hỗ trợ ship nhanh toàn quốc chỉ 1 - 2 ngày là đồ được ủi thơm tho giao tới tận tay bạn rồi ạ!"`,
      `- Tuyệt đối không bịa đặt vị trí sản phẩm trái với dữ liệu kho bên dưới.`,
      "",
      `3. KỸ NĂNG TƯ VẤN FORM DÁNG, SIZE & PHỐI ĐỒ:`,
      `- Tinh ý nắm bắt chiều cao, cân nặng, số đo để tư vấn chuẩn size:`,
      `  + Size S: Thường hợp dưới 48kg - 50kg (eo dưới 66cm).`,
      `  + Size M: Thường hợp 50kg - 55kg (eo 67cm - 72cm).`,
      `  + Size L: Thường hợp 55kg - 62kg (eo 73cm - 78cm).`,
      `- Phân tích điểm cộng tôn dáng của từng mẫu (hack chân dài, giấu bắp tay, chiết eo thon, tôn xương quai xanh...).`,
      `- Gợi ý cách phối phụ kiện đi kèm như một Stylist thực thụ: giày cao gót màu gì (nude, ánh bạc, đen...), kiểu túi clutch nào, kiểu tóc (búi cao sang chảnh, uốn sóng lơi nhẹ nhàng...) để người đẹp nổi bật nhất sự kiện.`,
      "",
      `4. QUY TẮC HIỂN THỊ THẺ SẢN PHẨM:`,
      `- BẮT BUỘC chèn đúng cú pháp [PRODUCT:id] ngay sau tên mỗi món đồ được giới thiệu (Ví dụ: [PRODUCT:abc-123]) để giao diện tự động hiển thị thẻ sản phẩm cho khách bấm xem và thuê/mua ngay.`,
      `- Mỗi lượt phản hồi chỉ nên giới thiệu từ 1 đến tối đa 3 mẫu phù hợp nhất để khách dễ lựa chọn.`,
      "",
      `5. DỮ LIỆU TOÀN BỘ KHO ĐỒ THỰC TẾ CLOOP (ĐÃ PHÂN THEO KHU VỰC):`,
      catalogSections,
    ].join("\n");

    const recentHistory = Array.isArray(history)
      ? history
          .slice(-6)
          .filter((item) => item?.role && item?.text)
          .map((item) => `${item.role === "user" ? "Khách" : "Stylist"}: ${String(item.text).replace(/\[PRODUCT:[^\]]+\]/g, "").trim()}`)
          .join("\n")
      : "";

    const userPromptText = message || (image ? "Nhờ em xem giúp bức ảnh này và tìm trang phục tương tự trong kho CLOOP giúp mình nhé!" : "");

    const promptText = [
      recentHistory ? `Lịch sử trao đổi trước đó:\n${recentHistory}` : "",
      `Khách hàng: ${userPromptText}`,
      `Nữ Stylist CLOOP phản hồi gần gũi, tếu táo có duyên, chuẩn gu & nắm bắt vị trí:`
    ].filter(Boolean).join("\n");

    // Xử lý ảnh nếu khách gửi
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

    // ⚡ MODEL LLM ĐA TẦNG: ƯU TIÊN GEMINI-3.5-FLASH-LITE (TIẾT KIỆM TOKEN, PHẢN HỒI SIÊU TỐC) & FALLBACK FLASH
    const result = await executeWithGeminiPool(async (apiKey) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const candidateModels = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.6-flash"];
      
      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: 2048,
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
        // Enqueue catalog chunk cho client render card
        controller.enqueue(encoder.encode(`[[CATALOG:${encodeCatalog(catalog)}]]\n`));

        let fullAiResponse = "";
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              fullAiResponse += text;
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (error) {
          console.error("Lỗi streaming AI Stylist:", error);
          controller.enqueue(encoder.encode("\nDạ em đang kiểm tra lại kho đồ một chút xíu, người đẹp gửi lại câu hỏi giúp em nha!"));
        } finally {
          controller.close();
          // 🛡️ Lưu log bất đồng bộ (Fire-and-Forget): KHÔNG chặn stream của khách hàng
          if (message && fullAiResponse.trim()) {
            const finalSessionId = sessionId || `sess_${Date.now()}`;
            prisma.aiStylistLog
              .create({
                data: {
                  sessionId: String(finalSessionId),
                  userId: resolvedUserId ? String(resolvedUserId) : null,
                  userName: resolvedUserName ? String(resolvedUserName) : "Khách vãng lai",
                  prompt: String(message).trim(),
                  response: fullAiResponse.trim(),
                },
              })
              .catch((dbErr) => {
                console.error("[AI_STYLIST_LOG_DB_ERROR]:", dbErr);
              });
          }
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
