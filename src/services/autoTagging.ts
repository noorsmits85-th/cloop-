import { prisma } from "@/src/lib/prisma";
import { getNextGeminiKey, markKeyCooldown } from "@/src/utils/gemini-pool";

export async function autoTagProductBackground(productId: string, imageUrl: string) {
  try {
    const apiKey = getNextGeminiKey();
    if (!apiKey) {
      console.warn("No Gemini API key available for auto-tagging");
      return;
    }

    // 1. Tải ảnh từ URL về dạng base64
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("Failed to fetch image");
    const arrayBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = imgRes.headers.get("content-type") || "image/jpeg";

    // 2. Yêu cầu AI phân tích ảnh
    const prompt = `Bạn là chuyên gia thời trang của CLOOP. Nhìn ảnh món đồ này, hãy điền các thông tin phân loại tự động vào JSON.
    Trả về ĐÚNG cấu trúc JSON sau, không kèm giải thích:
    {
      "aiCategory": "loại trang phục (Váy/Đầm, Áo thun, Áo sơ mi, Áo khoác, Quần jean, Set bộ, Phụ kiện, v.v.)",
      "aiColor": "màu chủ đạo chính (tiếng Việt)",
      "aiMaterial": "chất liệu dự đoán",
      "aiStyle": "phong cách hoặc phom dáng (trễ vai, dáng dài, dạo phố, vintage...)",
      "aiKeywords": ["từ khóa 1", "từ khóa 2", "từ khóa 3", "từ khóa 4"]
    }`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }, { inlineData: { mimeType, data: base64 } }],
            },
          ],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 300 },
        }),
      }
    );

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 429) markKeyCooldown(apiKey, 60_000);
      throw new Error(data?.error?.message || "AI failed");
    }

    const raw: string = (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
    const jsonText = raw.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonText) throw new Error("Empty response");
    
    const parsed = JSON.parse(jsonText);

    // 3. Cập nhật vào Database (Phase A)
    await prisma.product.update({
      where: { id: productId },
      data: {
        aiCategory: parsed.aiCategory || null,
        aiColor: parsed.aiColor || null,
        aiMaterial: parsed.aiMaterial || null,
        aiStyle: parsed.aiStyle || null,
        aiKeywords: Array.isArray(parsed.aiKeywords) ? parsed.aiKeywords : [],
      }
    });
    
    console.log(`[Auto-Tagging] Successfully tagged product ${productId}:`, parsed);
  } catch (error) {
    console.error(`[Auto-Tagging] Failed for product ${productId}:`, error);
  }
}
