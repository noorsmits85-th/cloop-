const fs = require('fs');
let content = fs.readFileSync('src/services/visualSearch.ts', 'utf8');

// 1. Remove matches from AiAnalysis type
content = content.replace(/matches:\s*Array<\{[^}]+\}>;/g, '');

// 2. Replace buildPrompt
content = content.replace(/function buildPrompt[\s\S]*?\}\n/m, `function buildPrompt(colorHint?: string | null): string {
  return \`Bạn là chuyên gia thời trang của CLOOP. Nhìn ảnh, xác định MÓN ĐỒ CHÍNH (nổi bật nhất, ở trung tâm ảnh).
  
\${colorHint ? \\\`Gợi ý: đo pixel vùng trung tâm ảnh cho màu chủ đạo ~ "\${colorHint}".\\\` : ""}

Trả về JSON đúng cấu trúc:
{
  "category": "loại món đồ chính, tiếng Việt",
  "dominantColor": "màu chủ đạo, tiếng Việt",
  "style": "phong cách, tiếng Việt",
  "material": "chất liệu dự đoán, tiếng Việt",
  "itemDescription": "1 câu mô tả món đồ chính",
  "searchKeywords": ["4-6 từ khóa tiếng Việt"]
}\`;
}
`);

// 3. Update analyzeWithAi signature
content = content.replace(/async function analyzeWithAi\(\s*image: SafeImagePayload,\s*catalog: CatalogItem\[\],\s*colorHint[\s\S]*?\)\s*:\s*Promise<AiAnalysis\s*\|\s*null>\s*\{/m, 
  'async function analyzeWithAi(image: SafeImagePayload, colorHint?: string | null): Promise<AiAnalysis | null> {');
content = content.replace(/const prompt = buildPrompt\(catalog, colorHint\);/, 'const prompt = buildPrompt(colorHint);');

// 4. Update searchByValidatedOutfitImage to fetch from DB instead of loadCatalog
content = content.replace(/try \{\s*const catalog = await loadCatalog\(\);\s*if \(catalog.length === 0\) \{[\s\S]*?return result;\s*\}/m, 
`try {
    const ai = await analyzeWithAi(image, colorHint);
    
    // Tìm kiếm trong Prisma bằng AI tags và Keywords
    let dbQuery: any = { isDeleted: false, status: { in: ["IN_CLOSET", "ON_MARKET"] } };
    
    if (ai) {
      dbQuery.OR = [
        { aiCategory: { contains: ai.category, mode: 'insensitive' } },
        { title: { contains: ai.category, mode: 'insensitive' } },
        { category: { contains: ai.category, mode: 'insensitive' } },
      ];
    } else if (colorHint) {
       // Nếu AI xịt, tìm tạm theo colorHint
       dbQuery.OR = [
         { color: { contains: colorHint, mode: 'insensitive' } },
         { aiColor: { contains: colorHint, mode: 'insensitive' } },
       ];
    }

    const rawProducts = await prisma.product.findMany({
      where: dbQuery,
      take: 40,
      include: {
        images: { orderBy: { isPrimary: 'desc' }, take: 1 },
        listings: { where: { isDeleted: false, status: 'AVAILABLE' } },
        user: { select: { name: true } }
      }
    });

    const queryGarments = groupsIn(normalizeText(ai?.category || ''), GARMENT_GROUPS);
    const queryColors = groupsIn(normalizeText([ai?.dominantColor, colorHint].filter(Boolean).join(" ")), COLOR_GROUPS);
    const keywords = ai ? ai.searchKeywords.map(normalizeText).filter(Boolean) : [];

    const scored = rawProducts.map(p => {
       const rent = p.listings.find((l: any) => l.listingType === "RENT");
       const sell = p.listings.find((l: any) => l.listingType === "SELL");
       
       const itemStr = normalizeText([p.title, p.category, p.occasion, p.aiCategory, p.aiKeywords?.join(' ')].join(" "));
       const itemColorsStr = normalizeText([p.color, p.aiColor].join(" "));
       
       let score = 30;
       const itemGarments = groupsIn(itemStr, GARMENT_GROUPS);
       const itemColors = groupsIn(itemColorsStr, COLOR_GROUPS);

       let reasons = [];
       if (queryGarments.size > 0 && [...queryGarments].some(g => itemGarments.has(g))) {
         score += 40; reasons.push("cùng loại đồ");
       } else if (itemGarments.size > 0) score -= 10;

       if (queryColors.size > 0 && [...queryColors].some(c => itemColors.has(c))) {
         score += 20; reasons.push("cùng tông màu");
       }

       let kwHits = 0;
       for (const kw of keywords) {
         if (kw.length >= 3 && itemStr.includes(kw)) kwHits++;
       }
       if (kwHits > 0) {
         score += Math.min(kwHits * 5, 15); reasons.push("tương đồng chi tiết");
       }

       if (p.aiCategory === ai?.category) score += 5; // boost nếu ai match đúng

       return {
         id: p.id,
         title: p.title,
         category: p.category || '',
         color: p.color,
         primaryImage: p.images[0]?.url || "",
         rentalPrice: rent?.basePrice || 0,
         salePrice: sell?.basePrice || 0,
         matchScore: Math.min(score, 99),
         matchReason: reasons.length ? "Gần giống: " + reasons.join(", ") : "Gợi ý tương tự",
         ownerName: p.user?.name || "CLOOP"
       };
    }).sort((a, b) => b.matchScore - a.matchScore).slice(0, MAX_RESULTS);

    const result = {
      success: true,
      traceId,
      detectedInfo: {
        category: ai?.category || "Chưa xác định",
        dominantColor: ai?.dominantColor || colorHint || "Chưa xác định",
        style: ai?.style || "",
        material: ai?.material || undefined,
        itemDescription: ai?.itemDescription || "AI đang bận, dùng tìm kiếm mở rộng.",
        searchKeywords: ai?.searchKeywords || [],
        aiModelUsed: ai?.model || "db-search",
      },
      matchedProducts: scored,
      isFallback: !ai,
      elapsedMs: Date.now() - startedAt,
    };

    if (ai) {
      if (resultCache.size > 100) resultCache.delete(resultCache.keys().next().value as string);
      resultCache.set(cacheKey, { at: Date.now(), result });
    }
    return result;
`);

fs.writeFileSync('src/services/visualSearch.ts', content);
