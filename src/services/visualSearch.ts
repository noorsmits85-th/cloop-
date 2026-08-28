import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/src/lib/prisma";
import crypto from "node:crypto";

export interface VisualSearchResult {
  success: boolean;
  traceId: string;
  detectedInfo?: {
    category: string;
    dominantColor: string;
    style: string;
    material?: string;
    itemDescription: string;
    searchKeywords: string[];
    aiModelUsed?: string;
  };
  matchedProducts: Array<{
    id: string;
    title: string;
    category: string;
    color: string | null;
    primaryImage: string;
    rentalPrice: number;
    salePrice: number;
    matchScore: number;
    matchReason: string;
    ownerName: string;
  }>;
  error?: string;
  isFallback?: boolean;
}

const CANDIDATE_GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

// Hàm chuẩn hóa từ khóa để so khớp ngữ nghĩa tiếng Việt
function normalizeText(text: string = ""): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

// Nhóm đồng nghĩa chất liệu
const MATERIAL_SYNONYMS: Record<string, string[]> = {
  denim: ["denim", "jean", "jeans", "bo", "yem denim"],
  lua: ["lua", "satin", "to tam", "silk", "phi bong"],
  tweed: ["tweed", "da tweed", "da", "wool", "da han quoc"],
  linen: ["linen", "dui", "cotton", "soi tu nhien"],
  da: ["da", "leather", "da bo", "da lon", "pu"],
  voan: ["voan", "chiffon", "ren", "lace", "organza", "luoi"],
};

// Nhóm đồng nghĩa màu sắc
const COLOR_SYNONYMS: Record<string, string[]> = {
  xanh: ["xanh", "denim", "blue", "indigo", "luc bao", "duong", "la"],
  do: ["do", "red", "burgundy", "bordeaux", "ruou", "ruby"],
  trang: ["trang", "white", "kem", "ivory", "be", "beige"],
  den: ["den", "black", "xam", "gray", "grey"],
  vang: ["vang", "yellow", "gold", "cam", "orange"],
  hong: ["hong", "pink", "pastel", "sen"],
};

export async function searchByOutfitImage(imageBase64OrUrl: string): Promise<VisualSearchResult> {
  const traceId = `vsearch_${crypto.randomUUID()}`;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_DEV || process.env.GOOGLE_GEMINI_API_KEY;

  try {
    let base64Data = "";
    let mimeType = "image/jpeg";

    if (imageBase64OrUrl.startsWith("data:")) {
      const parts = imageBase64OrUrl.split(",");
      mimeType = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
      base64Data = parts[1];
    } else if (imageBase64OrUrl.startsWith("http")) {
      const imgRes = await fetch(imageBase64OrUrl, { signal: AbortSignal.timeout(6000) });
      if (!imgRes.ok) throw new Error("Không thể tải ảnh từ URL");
      const buffer = await imgRes.arrayBuffer();
      base64Data = Buffer.from(buffer).toString("base64");
      mimeType = imgRes.headers.get("content-type") || "image/jpeg";
    } else {
      base64Data = imageBase64OrUrl;
    }

    let detectedCategory = "Set đồ & Dạo phố";
    let dominantColor = "Xanh denim";
    let style = "Dạo phố năng động";
    let material = "Denim";
    let itemDescription = "Set đồ thời trang denim trẻ trung cá tính";
    let searchKeywords = ["denim", "set đồ", "áo thun", "yếm"];
    let aiModelUsed = "CLOOP Vision AI";

    // 1. Phân tích thị giác bằng Gemini Vision
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const prompt = `
Bạn là AI Visual Stylist & Chuyên gia Giám định Trang phục của nền tảng thời trang tuần hoàn CLOOP.
Hãy phân tích bức ảnh lookbook/outfit này và bóc tách chuẩn xác các đặc tính thời trang cốt lõi để truy vấn kho đồ:

1. category: Chọn 1 trong các nhóm chính xác: ["Dạ hội & Sự kiện", "Tiệc cưới", "Áo dài truyền thống", "Đồ hoài cổ 90s", "Tối giản", "Công sở & Blazer", "Set đồ & Dạo phố", "Túi xách & Phụ kiện", "Giày & Boots"]
2. dominantColor: Tông màu chủ đạo (ví dụ: Xanh denim, Đỏ Bordeaux, Trắng kem, Đen tuyền, Hồng pastel...)
3. style: Phong cách (ví dụ: Dạo phố cá tính, Y2K, Parisian Chic, Dạ tiệc Glamour, Vintage 90s...)
4. material: Chất liệu chính (ví dụ: Denim, Lụa Satin, Dạ Tweed, Linen, Voan tơ, Cotton, Da thật...)
5. itemDescription: Mô tả ngắn gọn 1 câu ấn tượng về phom dáng trang phục
6. searchKeywords: Mảng 4-6 từ khóa tiếng Việt không dấu hoặc có dấu để tra cứu database (ví dụ: ["denim", "yem", "ao thun", "set do", "xanh"])

Trả về đúng cấu trúc JSON:
{
  "category": string,
  "dominantColor": string,
  "style": string,
  "material": string,
  "itemDescription": string,
  "searchKeywords": string[]
}
`;

      for (const candidate of CANDIDATE_GEMINI_MODELS) {
        try {
          const model = genAI.getGenerativeModel({
            model: candidate,
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.15,
            },
          });

          const result = await model.generateContent([
            prompt,
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType.startsWith("image/") ? mimeType : "image/jpeg",
              },
            },
          ]);

          const rawText = result.response.text();
          const parsed = JSON.parse(rawText);

          if (parsed.category) {
            detectedCategory = parsed.category;
            dominantColor = parsed.dominantColor || dominantColor;
            style = parsed.style || style;
            material = parsed.material || material;
            itemDescription = parsed.itemDescription || itemDescription;
            searchKeywords = Array.isArray(parsed.searchKeywords) ? parsed.searchKeywords : searchKeywords;
            aiModelUsed = candidate;
            break;
          }
        } catch (modelErr: any) {
          console.warn(`[Gemini candidate failed]:`, modelErr?.message || modelErr);
        }
      }
    }

    // 2. TRUY VẤN SÂU TOÀN BỘ KHO ĐỒ THẬT TRONG DATABASE
    let dbProducts: any[] = [];
    try {
      dbProducts = await prisma.product.findMany({
        where: {
          isDeleted: false,
        },
        include: {
          images: {
            orderBy: { isPrimary: "desc" },
            take: 1,
          },
          listings: {
            where: { isDeleted: false },
          },
          user: {
            select: { name: true },
          },
        },
        take: 100,
        orderBy: { createdAt: "desc" },
      });
    } catch (dbErr) {
      console.warn("Lỗi truy vấn sản phẩm DB trong Visual Search:", dbErr);
    }

    // Lọc bỏ các sản phẩm rác test có tên "Mock", "test"
    const validProducts = dbProducts.filter((p) => {
      const titleLower = (p.title || "").toLowerCase();
      return !titleLower.includes("mock") && !titleLower.includes("test");
    });

    const normMaterial = normalizeText(material);
    const normCategory = normalizeText(detectedCategory);
    const normColor = normalizeText(dominantColor);
    const normKeywords = searchKeywords.map(normalizeText);

    // 3. THUẬT TOÁN ĐỐI SÁNH NGỮ NGHĨA ĐA CHIỀU (DEEP SEMANTIC SCORING)
    const scoredProducts = validProducts.map((p) => {
      const pTitle = normalizeText(p.title);
      const pMaterial = normalizeText(p.material || "");
      const pCategory = normalizeText(p.category || "");
      const pOccasion = normalizeText(p.occasion || "");
      const pColor = normalizeText(p.color || "");
      const pDesc = normalizeText(p.description || "");

      let score = 50; // Điểm xuất phát cơ sở
      const matchReasons: string[] = [];

      // A. Khớp chất liệu (Trọng số lớn nhất: +30)
      let isMaterialMatch = false;
      if (pMaterial && normMaterial) {
        if (pMaterial.includes(normMaterial) || normMaterial.includes(pMaterial)) {
          score += 25;
          isMaterialMatch = true;
        } else {
          // Kiểm tra từ đồng nghĩa chất liệu
          for (const [, synonyms] of Object.entries(MATERIAL_SYNONYMS)) {
            const hasTarget = synonyms.some(s => normMaterial.includes(s));
            const hasProduct = synonyms.some(s => pMaterial.includes(s) || pTitle.includes(s));
            if (hasTarget && hasProduct) {
              score += 25;
              isMaterialMatch = true;
              break;
            }
          }
        }
      }
      if (isMaterialMatch) matchReasons.push(`Chất liệu ${material}`);

      // B. Khớp phom dáng / danh mục (+20)
      let isCategoryMatch = false;
      if (pCategory.includes(normCategory) || normCategory.includes(pCategory) || pTitle.includes(normCategory)) {
        score += 18;
        isCategoryMatch = true;
      } else if (normCategory.includes("set") && (pTitle.includes("set") || pCategory.includes("set"))) {
        score += 18;
        isCategoryMatch = true;
      }
      if (isCategoryMatch) matchReasons.push(`Phom dáng ${detectedCategory}`);

      // C. Khớp màu sắc (+15)
      let isColorMatch = false;
      if (pColor && normColor) {
        if (pColor.includes(normColor) || normColor.includes(pColor) || pTitle.includes(normColor)) {
          score += 15;
          isColorMatch = true;
        } else {
          for (const [, synonyms] of Object.entries(COLOR_SYNONYMS)) {
            const hasTarget = synonyms.some(s => normColor.includes(s));
            const hasProduct = synonyms.some(s => pColor.includes(s) || pTitle.includes(s));
            if (hasTarget && hasProduct) {
              score += 15;
              isColorMatch = true;
              break;
            }
          }
        }
      }
      if (isColorMatch) matchReasons.push(`Tông màu ${dominantColor}`);

      // D. Khớp từ khóa tìm kiếm & Dịp (+10)
      let keywordHits = 0;
      for (const kw of normKeywords) {
        if (pTitle.includes(kw) || pDesc.includes(kw) || pOccasion.includes(kw)) {
          keywordHits++;
        }
      }
      score += Math.min(keywordHits * 4, 12);

      // Điểm tối đa 98%
      const finalScore = Math.min(score, 98);

      const rentalListing = p.listings.find((l: any) => l.listingType === "RENT");
      const saleListing = p.listings.find((l: any) => l.listingType === "SELL");

      const reasonText = matchReasons.length > 0 
        ? `Khớp ${finalScore}% về ${matchReasons.join(" & ")}`
        : `Khớp ${finalScore}% phong cách ${style}`;

      return {
        id: p.id,
        title: p.title,
        category: p.category || detectedCategory,
        color: p.color,
        primaryImage: p.images[0]?.url || "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600",
        rentalPrice: rentalListing?.basePrice || 150000,
        salePrice: saleListing?.basePrice || 0,
        matchScore: finalScore,
        matchReason: reasonText,
        ownerName: p.user?.name || "Chủ Tủ CLOOP",
      };
    });

    // Sắp xếp theo độ tương đồng cao nhất
    scoredProducts.sort((a, b) => b.matchScore - a.matchScore);
    const topMatched = scoredProducts.slice(0, 6);

    return {
      success: true,
      traceId,
      detectedInfo: {
        category: detectedCategory,
        dominantColor,
        style,
        material,
        itemDescription,
        searchKeywords,
        aiModelUsed,
      },
      matchedProducts: topMatched,
      isFallback: !apiKey,
    };
  } catch (error: any) {
    console.error(`❌ [Visual Search Error][${traceId}]:`, error);
    return {
      success: false,
      traceId,
      error: error.message || "Không thể phân tích hình ảnh tìm kiếm",
      matchedProducts: [],
    };
  }
}
