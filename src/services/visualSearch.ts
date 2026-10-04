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
  /** Màu chủ đạo đo trực tiếp từ pixel ảnh trên trình duyệt (canvas), dùng làm tín hiệu thị giác thật khi AI chậm. */
  colorHint?: string | null;
}

// Đo thực tế (10/2026): 3.5-flash-lite ~1.9s, flash-lite-latest ~1.9s, 3.6-flash ~2.9s, 3.8-flash hay 503.
// Chạy song song 2 model nhanh nhất, lấy kết quả về trước -> vừa nhanh vừa chống 503.
const FAST_VISION_MODELS = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest"];
const AI_TIMEOUT_MS = 7000;
const CATALOG_TTL_MS = 60_000;
const RESULT_TTL_MS = 10 * 60_000;
const MAX_CATALOG = 150;
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
  searchText: string; // văn bản đã chuẩn hóa để chấm điểm
};

type AiAnalysis = {
  category: string;
  dominantColor: string;
  style: string;
  material: string;
  itemDescription: string;
  searchKeywords: string[];
  matches: Array<{ idx: number; score: number; reason: string }>;
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

// Nhóm màu chuẩn (đã bỏ dấu). Dùng để so khớp màu giữa ảnh và tên/thuộc tính sản phẩm.
const COLOR_GROUPS: Record<string, string[]> = {
  trang: ["trang", "white", "ivory", "kem", "cream"],
  den: ["den", "black"],
  xam: ["xam", "ghi", "gray", "grey"],
  do: ["do", "red", "burgundy", "bordeaux", "do ruou", "ruby", "do do"],
  hong: ["hong", "pink", "pastel hong", "sen"],
  cam: ["cam", "orange", "dat nung"],
  vang: ["vang", "yellow", "mustard", "gold"],
  xanhla: ["xanh la", "xanh reu", "reu", "green", "olive", "luc"],
  xanhduong: ["xanh duong", "xanh navy", "navy", "blue", "denim", "jean", "xanh bien", "indigo"],
  nau: ["nau", "brown", "chocolate", "camel", "bo"],
  be: ["be", "beige", "nude", "kaki", "khaki"],
  tim: ["tim", "purple", "lavender", "tim than"],
};

// Nhóm loại trang phục: quan trọng nhất cho độ chính xác (áo khác quần khác váy).
const GARMENT_GROUPS: Record<string, string[]> = {
  vay: ["vay", "dam", "dress", "skirt", "chan vay", "baby doll", "babydoll", "dresses"],
  aodai: ["ao dai"],
  quan: ["quan", "jean", "pants", "trousers", "shorts", "jeans"],
  khoac: ["khoac", "jacket", "coat", "blazer", "cardigan", "vest", "da tweed", "tweed", "ao da"],
  aothun: ["ao thun", "t shirt", "tshirt", "tee", "croptop", "crop top", "sweater", "hoodie", "len"],
  somi: ["so mi", "shirt", "blouse", "kieu"],
  set: ["set", "bo", "do bo", "2 mon", "hai mon", "sweatsuit"],
  phukien: ["tui", "bag", "giay", "shoes", "boots", "mu", "hat", "phu kien"],
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
      const description = (p.description || "").slice(0, 160);
      return {
        id: p.id,
        title: p.title,
        category: p.category || "",
        occasion: p.occasion || "",
        color: p.color,
        description,
        primaryImage:
          p.images[0]?.url || "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600",
        rentalPrice: rent?.basePrice || 150000,
        salePrice: sell?.basePrice || 0,
        ownerName: p.user?.name || "Chủ Tủ CLOOP",
        searchText: normalizeText(
          // "Tự nhiên" là giá trị mặc định vô nghĩa trong DB -> bỏ qua khi so màu
          [p.title, p.category, p.occasion, p.color === "Tự nhiên" ? "" : p.color, description].join(" ")
        ),
      };
    });

  catalogCache = { at: Date.now(), items };
  return items;
}

function buildPrompt(catalog: CatalogItem[], colorHint?: string | null): string {
  const lines = catalog
    .map((p, i) => {
      const color = p.color && p.color !== "Tự nhiên" ? ` | màu: ${p.color}` : "";
      const desc = p.description ? ` | mô tả: ${p.description.replace(/\s+/g, " ").slice(0, 70)}` : "";
      return `${i + 1}. ${p.title} | loại: ${p.category}${color} | dịp: ${p.occasion}${desc}`;
    })
    .join("\n");

  return `Bạn là chuyên gia thời trang của CLOOP. Nhìn ảnh, xác định MÓN ĐỒ CHÍNH (nổi bật nhất, ở trung tâm ảnh),
rồi chọn các sản phẩm GIỐNG NHẤT trong kho dưới đây.

Tiêu chí ưu tiên: (1) cùng loại trang phục (váy/đầm, áo, quần, áo khoác, set, áo dài...) là bắt buộc để điểm cao;
(2) cùng màu; (3) cùng phom dáng/chi tiết (trễ vai, dáng dài, thắt eo, sọc, hoa...); (4) cùng phong cách/dịp.
Khác loại trang phục thì điểm tối đa 45. Không bịa sản phẩm ngoài danh sách.
${colorHint ? `Gợi ý: đo pixel vùng trung tâm ảnh cho màu chủ đạo ~ "${colorHint}".` : ""}

KHO CLOOP:
${lines}

Trả về JSON đúng cấu trúc:
{
  "category": "loại món đồ chính, tiếng Việt",
  "dominantColor": "màu chủ đạo, tiếng Việt",
  "style": "phong cách, tiếng Việt",
  "material": "chất liệu dự đoán, tiếng Việt",
  "itemDescription": "1 câu mô tả món đồ chính",
  "searchKeywords": ["4-6 từ khóa tiếng Việt"],
  "matches": [{"idx": số thứ tự trong kho, "score": 0-100, "reason": "lý do ngắn <= 8 từ"}]
}
"matches" gồm tối đa ${MAX_RESULTS} sản phẩm, sắp xếp điểm giảm dần.`;
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
        generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 900 },
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
    matches: Array.isArray(parsed.matches)
      ? parsed.matches
          .map((m: any) => ({
            idx: Number(m?.idx),
            score: Number(m?.score),
            reason: String(m?.reason || "").slice(0, 80),
          }))
          .filter((m: any) => Number.isFinite(m.idx) && Number.isFinite(m.score))
      : [],
    model,
  };
}

/** Chạy song song các model nhanh, trả về kết quả hợp lệ đầu tiên; huỷ các request còn lại. */
async function analyzeWithAi(
  image: SafeImagePayload,
  catalog: CatalogItem[],
  colorHint?: string | null
): Promise<AiAnalysis | null> {
  const prompt = buildPrompt(catalog, colorHint);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const attempts = FAST_VISION_MODELS.map((model) => {
      const key = getNextGeminiKey();
      if (!key) return Promise.reject(new Error("NO_GEMINI_KEY"));
      return callVisionModel(model, key, image, prompt, controller.signal);
    });
    const winner = await Promise.any(attempts);
    return winner;
  } catch (err: any) {
    const reasons = err instanceof AggregateError ? err.errors.map((e: any) => e?.message) : [err?.message];
    console.warn("[Visual Search] AI unavailable, using visual-color fallback:", reasons.join(" | "));
    return null;
  } finally {
    clearTimeout(timer);
    controller.abort(); // dừng request còn chạy để không tốn quota
  }
}

/** Chấm điểm dựa trên loại đồ + màu + từ khóa. Dùng để bổ sung/thay thế khi AI không trả lời. */
function heuristicScore(
  item: CatalogItem,
  queryGarments: Set<string>,
  queryColors: Set<string>,
  keywords: string[]
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 30;

  const itemGarments = groupsIn(item.searchText, GARMENT_GROUPS);
  const itemColors = groupsIn(item.searchText, COLOR_GROUPS);

  if (queryGarments.size > 0) {
    const hit = [...queryGarments].some((g) => itemGarments.has(g));
    if (hit) {
      score += 30;
      reasons.push("cùng loại đồ");
    } else if (itemGarments.size > 0) {
      score -= 10;
    }
  }

  if (queryColors.size > 0) {
    const hit = [...queryColors].some((c) => itemColors.has(c));
    if (hit) {
      score += 20;
      reasons.push("cùng tông màu");
    } else if (itemColors.size > 0) {
      score -= 5;
    }
  }

  let kwHits = 0;
  for (const kw of keywords) {
    if (kw.length >= 3 && item.searchText.includes(kw)) kwHits++;
  }
  if (kwHits > 0) {
    score += Math.min(kwHits * 5, 15);
    reasons.push("chi tiết tương tự");
  }

  return { score: Math.max(5, Math.min(score, 85)), reasons };
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

  // Cache theo nội dung ảnh: cùng một ảnh/vùng crop -> trả về tức thì
  const cacheKey = crypto.createHash("sha1").update(image.base64).digest("hex");
  const cached = resultCache.get(cacheKey);
  if (cached && Date.now() - cached.at < RESULT_TTL_MS) {
    return { ...cached.result, traceId, elapsedMs: Date.now() - startedAt };
  }

  try {
    const catalog = await loadCatalog();
    if (catalog.length === 0) {
      return { success: true, traceId, matchedProducts: [], isFallback: true, elapsedMs: Date.now() - startedAt };
    }

    const ai = await analyzeWithAi(image, catalog, colorHint);

    const queryText = normalizeText(
      ai ? [ai.category, ai.dominantColor, ai.itemDescription, ...ai.searchKeywords].join(" ") : colorHint || ""
    );
    const queryGarments = groupsIn(queryText, GARMENT_GROUPS);
    const queryColors = groupsIn(normalizeText([ai?.dominantColor, colorHint].filter(Boolean).join(" ")), COLOR_GROUPS);
    const keywords = ai ? ai.searchKeywords.map(normalizeText).filter(Boolean) : [];

    const scored = new Map<string, { item: CatalogItem; score: number; reason: string }>();
    const aiPicks = new Map<string, { score: number; reason: string }>();
    if (ai) {
      for (const m of ai.matches) {
        const item = catalog[m.idx - 1];
        if (!item || aiPicks.has(item.id)) continue;
        aiPicks.set(item.id, {
          score: Math.max(1, Math.min(m.score, 99)),
          reason: m.reason || `Tương đồng ${ai.category}`,
        });
      }
    }

    // Chấm điểm toàn bộ kho:
    // - Món AI chọn: 70% điểm AI (đã nhìn ảnh) + 30% điểm loại đồ/màu đo được.
    // - Món AI không chọn: tối đa ~50% điểm loại đồ/màu -> chỉ vượt được các lựa chọn AI yếu.
    // - Khi AI lỗi: dùng 100% điểm loại đồ/màu (màu đo từ pixel ảnh).
    for (const item of catalog) {
      const h = heuristicScore(item, queryGarments, queryColors, keywords);
      const pick = aiPicks.get(item.id);
      let score: number;
      let reason: string;
      if (pick) {
        score = 0.7 * pick.score + 0.3 * h.score;
        reason = pick.reason;
      } else {
        score = ai ? 0.6 * h.score : h.score;
        reason = h.reasons.length ? `Gần giống: ${h.reasons.join(", ")}` : "Gợi ý cùng phong cách";
      }
      scored.set(item.id, { item, score: Math.round(Math.max(1, Math.min(score, 99))), reason });
    }

    const matchedProducts = [...scored.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)
      .map(({ item, score, reason }) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        color: item.color,
        primaryImage: item.primaryImage,
        rentalPrice: item.rentalPrice,
        salePrice: item.salePrice,
        matchScore: score,
        matchReason: reason,
        ownerName: item.ownerName,
      }));

    const result: VisualSearchResult = {
      success: true,
      traceId,
      detectedInfo: {
        category: ai?.category || "Chưa xác định",
        dominantColor: ai?.dominantColor || colorHint || "Chưa xác định",
        style: ai?.style || "",
        material: ai?.material || undefined,
        itemDescription: ai?.itemDescription || "AI đang bận, kết quả dựa trên màu sắc đo từ ảnh.",
        searchKeywords: ai?.searchKeywords || [],
        aiModelUsed: ai?.model || "color-fallback",
      },
      matchedProducts,
      isFallback: !ai,
      elapsedMs: Date.now() - startedAt,
    };

    // Chỉ cache khi AI trả lời thật, để lần sau AI còn cơ hội cho kết quả tốt hơn
    if (ai) {
      if (resultCache.size > 100) resultCache.delete(resultCache.keys().next().value as string);
      resultCache.set(cacheKey, { at: Date.now(), result });
    }

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

export async function indexProductImageEmbedding(productId: string, imageId: string, imageUrl: string): Promise<void> {
  // Safe fire-and-forget background indexing hook
  try {
    // Xoá cache kho để sản phẩm mới xuất hiện ngay trong tìm kiếm hình ảnh
    catalogCache = null;
    console.log(`[Visual Search Indexing Product ${productId}]: Image ${imageId} registered`);
  } catch (err: any) {
    console.warn(`[Async Indexing Log Warning]:`, err?.message || err);
  }
}
