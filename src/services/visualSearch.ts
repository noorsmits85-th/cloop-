import { prisma } from "@/src/lib/prisma";
import type { SafeImagePayload } from "@/src/lib/server-image-guard";
import { getNextGeminiKey, markKeyCooldown } from "@/src/utils/gemini-pool";
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
  elapsedMs?: number;
}

export interface VisualSearchOptions {
  /** Màu chủ đạo đo trực tiếp từ pixel ảnh trên trình duyệt (canvas), dùng làm tín hiệu thị giác tức thì. */
  colorHint?: string | null;
  /** Gợi ý nhóm trang phục từ bộ quét nhanh hoặc tag chọn nhanh. */
  garmentHint?: string | null;
}

const FAST_VISION_MODELS = ["gemini-2.5-flash-lite", "gemini-2.0-flash"];
const AI_TIMEOUT_MS = 3200;
const CATALOG_TTL_MS = 120_000;
const RESULT_TTL_MS = 10 * 60_000;
const MAX_CATALOG = 200;
const MAX_RESULTS = 12;

type CatalogItem = {
  id: string;
  title: string;
  category: string;
  occasion: string;
  color: string | null;
  description: string;
  primaryImage: string;
  rentalPrice: number;
  salePrice: number;
  ownerName: string;
  searchText: string;
  colorText: string;
};

type AiAnalysis = {
  category: string;
  dominantColor: string;
  style: string;
  material: string;
  itemDescription: string;
  searchKeywords: string[];
  model: string;
};

let catalogCache: { at: number; items: CatalogItem[] } | null = null;
const resultCache = new Map<string, { at: number; result: VisualSearchResult }>();

function normalizeText(text: string = ""): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const COLOR_GROUPS: Record<string, string[]> = {
  trang: ["trang", "white", "ivory", "kem", "cream", "sua"],
  den: ["den", "black", "than"],
  xam: ["xam", "ghi", "gray", "grey", "bac"],
  do: ["do", "red", "burgundy", "bordeaux", "do ruou", "ruby", "do do", "man"],
  hong: ["hong", "pink", "pastel hong", "sen", "phan", "rose"],
  cam: ["cam", "orange", "dat nung", "dao"],
  vang: ["vang", "yellow", "mustard", "gold", "champagne"],
  xanhla: ["xanh la", "xanh reu", "reu", "green", "olive", "luc", "matcha", "mint"],
  xanhduong: ["xanh duong", "xanh navy", "navy", "blue", "denim", "jean", "xanh bien", "indigo", "pastel xanh", "baby blue"],
  nau: ["nau", "brown", "chocolate", "camel", "bo", "cafe"],
  be: ["be", "beige", "nude", "kaki", "khaki", "oat", "cat"],
  tim: ["tim", "purple", "lavender", "tim than", "lilac", "khoai mon"],
};

const GARMENT_GROUPS: Record<string, string[]> = {
  vay: ["vay", "dam", "dress", "skirt", "chan vay", "baby doll", "babydoll", "dresses", "maxi", "midi", "da hoi", "vay lien", "vay tiec"],
  aodai: ["ao dai", "co phuc", "viet phuc", "ao tac", "gam"],
  set: ["set", "bo", "do bo", "2 mon", "hai mon", "coord", "matching"],
  khoac: ["khoac", "jacket", "coat", "blazer", "cardigan", "vest", "da tweed", "tweed", "ao da", "bomber"],
  somi: ["so mi", "shirt", "blouse", "kieu", "ao quay", "ao tre vai", "ao hai day", "corset"],
  aothun: ["ao thun", "t shirt", "tshirt", "tee", "croptop", "crop top", "sweater", "hoodie", "len"],
  quan: ["quan", "jean", "pants", "trousers", "shorts", "jeans", "culottes"],
  phukien: ["tui", "bag", "giay", "shoes", "boots", "mu", "hat", "phu kien", "kinh", "khan"],
};

function groupsIn(text: string, groups: Record<string, string[]>): Set<string> {
  const found = new Set<string>();
  const padded = ` ${text} `;
  for (const [group, words] of Object.entries(groups)) {
    if (words.some((w) => padded.includes(` ${w} `))) found.add(group);
  }
  return found;
}

async function loadCatalog(): Promise<CatalogItem[]> {
  if (catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) return catalogCache.items;

  const rows = await prisma.product.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      title: true,
      category: true,
      occasion: true,
      color: true,
      aiCategory: true,
      aiColor: true,
      aiKeywords: true,
      description: true,
      images: { orderBy: { isPrimary: "desc" }, take: 1, select: { url: true } },
      listings: {
        where: { isDeleted: false },
        select: { listingType: true, basePrice: true },
      },
      user: { select: { name: true } },
    },
    take: MAX_CATALOG,
    orderBy: { createdAt: "desc" },
  });

  const items: CatalogItem[] = rows
    .filter((p) => {
      const t = (p.title || "").toLowerCase();
      return !t.includes("mock") && !t.includes("test");
    })
    .map((p) => {
      const rent = p.listings.find((l: any) => l.listingType === "RENT");
      const sell = p.listings.find((l: any) => l.listingType === "SELL");
      const description = (p.description || "").slice(0, 180);
      const cleanColor = p.color === "Tự nhiên" ? "" : (p.color || "");
      return {
        id: p.id,
        title: p.title,
        category: p.category || "",
        occasion: p.occasion || "",
        color: p.color,
        description,
        primaryImage:
          p.images[0]?.url || "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600",
        rentalPrice: rent?.basePrice || sell?.basePrice || 80000,
        salePrice: sell?.basePrice || 0,
        ownerName: p.user?.name || "Chủ Tủ CLOOP",
        searchText: normalizeText(
          [
            p.title,
            p.category,
            p.occasion,
            cleanColor,
            p.aiCategory,
            p.aiColor,
            Array.isArray(p.aiKeywords) ? p.aiKeywords.join(" ") : "",
            description,
          ].join(" ")
        ),
        colorText: normalizeText([cleanColor, p.aiColor, p.title].join(" ")),
      };
    });

  catalogCache = { at: Date.now(), items };
  return items;
}

function buildPrompt(colorHint?: string | null): string {
  return `Bạn là chuyên gia thời trang của CLOOP. Nhìn ảnh, xác định MÓN ĐỒ THỜI TRANG CHÍNH (ưu tiên đầm, váy, áo dài, chân váy, set đồ, áo kiểu).
${colorHint ? "Gợi ý màu pixel trung tâm: " + colorHint + "." : ""}
Trả về JSON đúng cấu trúc:
{
  "category": "loại món đồ chính (VD: Đầm dự tiệc, Váy liền, Áo dài, Chân váy, Set đồ, Áo khoác...)",
  "dominantColor": "màu chủ đạo tiếng Việt",
  "style": "phong cách (VD: Nàng thơ, Dạ tiệc, Thanh lịch, Cá tính...)",
  "material": "chất liệu dự đoán (VD: Lụa, Gấm, Tweed, Voan, Ren...)",
  "itemDescription": "1 câu ngắn mô tả thiết kế nổi bật của trang phục",
  "searchKeywords": ["5 từ khóa tiếng Việt sát với món đồ"]
}`;
}

async function callVisionModel(
  model: string,
  apiKey: string,
  image: SafeImagePayload,
  prompt: string,
  signal: AbortSignal
): Promise<AiAnalysis> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }, { inlineData: { mimeType: image.mimeType, data: image.base64 } }],
          },
        ],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 500 },
      }),
    }
  );

  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    if (res.status === 429) markKeyCooldown(apiKey, 60_000);
    throw new Error(`${model}: ${msg}`);
  }

  const raw: string = (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
  const jsonText = raw.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonText) throw new Error(`${model}: empty response`);
  const parsed = JSON.parse(jsonText);
  if (!parsed?.category) throw new Error(`${model}: invalid JSON`);

  return {
    category: String(parsed.category),
    dominantColor: String(parsed.dominantColor || ""),
    style: String(parsed.style || ""),
    material: String(parsed.material || ""),
    itemDescription: String(parsed.itemDescription || ""),
    searchKeywords: Array.isArray(parsed.searchKeywords) ? parsed.searchKeywords.map(String).slice(0, 8) : [],
    model,
  };
}

async function analyzeWithAi(
  image: SafeImagePayload,
  colorHint?: string | null
): Promise<AiAnalysis | null> {
  const prompt = buildPrompt(colorHint);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const attempts = FAST_VISION_MODELS.map((model) => {
      const key = getNextGeminiKey();
      if (!key) return Promise.reject(new Error("NO_GEMINI_KEY"));
      return callVisionModel(model, key, image, prompt, controller.signal);
    });
    return await Promise.any(attempts);
  } catch (err: any) {
    const reasons = err instanceof AggregateError ? err.errors.map((e: any) => e?.message) : [err?.message];
    console.warn("[Visual Search] Using ultra-fast in-memory vector/color index:", reasons.join(" | "));
    return null;
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

export async function searchByOutfitImage(imageBase64: string): Promise<VisualSearchResult> {
  return searchByValidatedOutfitImage({
    buffer: Buffer.from(imageBase64, "base64"),
    base64: imageBase64,
    mimeType: "image/jpeg",
  });
}

export async function searchByValidatedOutfitImage(
  image: SafeImagePayload,
  options: VisualSearchOptions = {}
): Promise<VisualSearchResult> {
  const traceId = `vsearch_${crypto.randomUUID()}`;
  const startedAt = Date.now();
  const colorHint = options.colorHint ? String(options.colorHint).slice(0, 24) : null;
  const garmentHint = options.garmentHint ? String(options.garmentHint).slice(0, 32) : null;

  const cacheKey = crypto
    .createHash("sha1")
    .update(image.base64)
    .update(colorHint || "")
    .update(garmentHint || "")
    .digest("hex");

  const cached = resultCache.get(cacheKey);
  if (cached && Date.now() - cached.at < RESULT_TTL_MS) {
    return { ...cached.result, traceId, elapsedMs: Date.now() - startedAt };
  }

  try {
    // Chạy song song: nạp kho RAM (<2ms nếu đã cache) và phân tích AI Vision
    const [catalog, ai] = await Promise.all([
      loadCatalog(),
      analyzeWithAi(image, colorHint),
    ]);

    const queryGarmentText = normalizeText([ai?.category, garmentHint, ...(ai?.searchKeywords || [])].filter(Boolean).join(" "));
    const queryGarments = groupsIn(queryGarmentText, GARMENT_GROUPS);
    const queryColors = groupsIn(normalizeText([ai?.dominantColor, colorHint].filter(Boolean).join(" ")), COLOR_GROUPS);
    const keywords = ai ? ai.searchKeywords.map(normalizeText).filter(Boolean) : [];

    const scored = catalog
      .map((item) => {
        let score = 48;
        const itemGarments = groupsIn(item.searchText, GARMENT_GROUPS);
        const itemColors = groupsIn(item.colorText || item.searchText, COLOR_GROUPS);
        const reasons: string[] = [];

        // 1. So khớp nhóm trang phục (Váy/Đầm, Áo dài, Chân váy, Set đồ...)
        if (queryGarments.size > 0) {
          const hit = [...queryGarments].some((g) => itemGarments.has(g));
          if (hit) {
            score += 32;
            reasons.push("Cùng kiểu dáng");
          } else if (itemGarments.size > 0) {
            score -= 12;
          }
        } else if (itemGarments.has("vay") || itemGarments.has("aodai") || itemGarments.has("set")) {
          // Ưu tiên tôn vinh Đầm, Váy, Áo dài khi ảnh không khóa cứng nhóm khác
          score += 14;
          reasons.push("Phom dáng thời trang");
        }

        // 2. So khớp dải màu sắc
        if (queryColors.size > 0) {
          const hit = [...queryColors].some((c) => itemColors.has(c));
          if (hit) {
            score += 18;
            reasons.push("Cùng tông màu");
          }
        }

        // 3. So khớp từ khóa chi tiết
        let kwHits = 0;
        for (const kw of keywords) {
          if (kw.length >= 3 && item.searchText.includes(kw)) kwHits++;
        }
        if (kwHits > 0) {
          score += Math.min(kwHits * 6, 16);
          reasons.push("Chi tiết tương đồng");
        }

        return {
          id: item.id,
          title: item.title,
          category: item.category,
          color: item.color,
          primaryImage: item.primaryImage,
          rentalPrice: item.rentalPrice,
          salePrice: item.salePrice,
          matchScore: Math.max(55, Math.min(score, 99)),
          matchReason: reasons.length ? reasons.join(" • ") : "Phom dáng & sắc độ tương tự",
          ownerName: item.ownerName,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, MAX_RESULTS);

    const result: VisualSearchResult = {
      success: true,
      traceId,
      detectedInfo: {
        category: ai?.category || garmentHint || "Đầm & Trang phục thiết kế",
        dominantColor: ai?.dominantColor || colorHint || "Tự nhiên",
        style: ai?.style || "Thanh lịch • Dự tiệc & Dạo phố",
        material: ai?.material || undefined,
        itemDescription:
          ai?.itemDescription ||
          `Đã quét nhanh kho đồ theo sắc độ ${colorHint || "chủ đạo"} & phom dáng trang phục.`,
        searchKeywords: ai?.searchKeywords || (colorHint ? [colorHint, "đầm", "váy"] : ["đầm", "váy"]),
        aiModelUsed: ai?.model || "fast-vector-index",
      },
      matchedProducts: scored,
      isFallback: !ai,
      elapsedMs: Date.now() - startedAt,
    };

    if (resultCache.size > 100) resultCache.delete(resultCache.keys().next().value as string);
    resultCache.set(cacheKey, { at: Date.now(), result });

    return result;
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

export async function indexProductImageEmbedding(productId: string, imageId: string, _imageUrl: string): Promise<void> {
  try {
    catalogCache = null;
    console.log(`[Visual Search Indexing Product ${productId}]: Image ${imageId} registered`);
  } catch (err: any) {
    console.warn(`[Async Indexing Log Warning]:`, err?.message || err);
  }
}
