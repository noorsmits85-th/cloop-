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

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return new Response("Thiếu GEMINI_API_KEY hoặc GOOGLE_GEMINI_API_KEY.", { status: 500 });
    }

    const products = await prisma.product.findMany({
      take: 50,
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
          province: product.province || "",
          image: product.images[0]?.url || PLACEHOLDER_IMAGE,
          priceText: formatPrice(price, listing?.listingType),
          listingType: listing?.listingType || "RENT",
        };
      })
      .filter((product) => product.title && product.id);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: [
        "Bạn là CLOOP AI Stylist, một cố vấn thời trang cá nhân bằng tiếng Việt.",
        "Bạn chỉ được gợi ý sản phẩm có trong kho dữ liệu được cung cấp.",
        "Khi nhắc tới sản phẩm, bắt buộc chèn đúng token [PRODUCT:id] ngay sau câu giới thiệu sản phẩm đó.",
        "Không bịa ID, không bịa giá, không nói sản phẩm không có trong kho là đang có.",
        "Hãy tư vấn tự nhiên, ấm áp, ngắn gọn. Ưu tiên 1-2 sản phẩm phù hợp nhất, nêu lý do theo dịp, màu, size, chất liệu, địa điểm nếu có.",
        "Nếu kho không có món phù hợp, hãy nói thật và đề xuất người dùng đổi dịp, màu, size hoặc khu vực.",
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
      "Kho đồ CLOOP hiện có, dạng JSON:",
      JSON.stringify(catalog),
      "",
      recentHistory ? `Lịch sử chat gần nhất:\n${recentHistory}\n` : "",
      `Nhu cầu mới của khách: ${message}`,
      "",
      "Hãy trả lời bằng tiếng Việt. Chèn token [PRODUCT:id] cho từng món được chọn.",
    ].join("\n");

    const result = await model.generateContentStream(prompt);
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
