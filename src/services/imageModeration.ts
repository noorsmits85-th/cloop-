import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "node:crypto";

export type ModerationDecision = "APPROVED" | "PENDING_REVIEW" | "REJECTED";

export interface ModerationAuditDetails {
  traceId: string;
  decision: ModerationDecision;
  confidence: number;
  reason: string;
  fallbackUsed: boolean;
  detectedCategory?: string;
  detectedColor?: string;
  detectedStyle?: string;
}

export interface ModerationResult {
  decision: ModerationDecision;
  isApproved: boolean; // true cho APPROVED và PENDING_REVIEW (không chặn flow user)
  isClothing: boolean;
  confidence: number;
  detectedCategory?: string;
  detectedColor?: string;
  detectedStyle?: string;
  userMessage?: string; // Thông điệp lịch sự, sạch sẽ cho khách hàng
  adminAuditLog: string; // Chuỗi log chi tiết cho server console
  auditDetails: ModerationAuditDetails; // Cấu trúc JSON chuẩn cho hệ thống quan sát (Observability/Sentry)
  isFallback: boolean; // True nếu AI timeout/lỗi và kích hoạt cứu hộ
  traceId: string;
}

/**
 * AI Vision Moderation Engine (Server-Side - 3-Tier Decision Model)
 * - APPROVED: Ảnh hợp lệ (người mặc, OOTD, flatlay, ngoại cảnh, thú cưng...) -> Lên sàn ngay.
 * - PENDING_REVIEW: Ảnh biên, góc chụp khó, hoặc AI Timeout -> Cho lưu vào tủ, không chặn user.
 * - REJECTED: Chỉ chặn khi 100% là ảnh rác, spam, đĩa thức ăn, meme, văn bản, đồi trụy.
 */
export async function moderateProductImage(imageUrl: string, customTraceId?: string): Promise<ModerationResult> {
  const traceId = customTraceId || `mod_${crypto.randomUUID()}`;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_DEV;

  // 1. FALLBACK CỨU HỘ KHI THIẾU KEY: Cho lưu dạng PENDING_REVIEW
  if (!apiKey) {
    const auditDetails: ModerationAuditDetails = {
      traceId,
      decision: "PENDING_REVIEW",
      confidence: 0.5,
      reason: "Missing GEMINI_API_KEY, gracefully routed to PENDING_REVIEW",
      fallbackUsed: true,
    };
    return {
      traceId,
      decision: "PENDING_REVIEW",
      isApproved: true,
      isClothing: true,
      confidence: 0.5,
      isFallback: true,
      adminAuditLog: JSON.stringify(auditDetails),
      auditDetails,
      userMessage: undefined,
    };
  }

  try {
    // 2. Tải dữ liệu ảnh từ URL với Timeout an toàn 6 giây
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      const auditDetails: ModerationAuditDetails = {
        traceId,
        decision: "PENDING_REVIEW",
        confidence: 0.5,
        reason: `Image fetch HTTP error ${response.status}`,
        fallbackUsed: true,
      };
      return {
        traceId,
        decision: "PENDING_REVIEW",
        isApproved: true,
        isClothing: true,
        confidence: 0.5,
        isFallback: true,
        adminAuditLog: JSON.stringify(auditDetails),
        auditDetails,
        userMessage: undefined,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = response.headers.get("content-type") || "image/jpeg";

    // 3. Khởi tạo Gemini AI Model (Gemini 3.5 Flash-Lite / 3.6 Flash)
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const prompt = `
Bạn là Hệ thống Thẩm định Hình ảnh Thời trang AI (CLOOP AI Vision Moderation).
Nhiệm vụ của bạn là kiểm tra xem bức ảnh có chứa TRANG PHỤC / PHỤ KIỆN THỜI TRANG HỢP LỆ hay không.

TIÊU CHÍ (ALLOW BY DEFAULT):
1. isClothing = TRUE (Mặc định cho qua):
   - Mọi bức ảnh có người mặc trang phục (kể cả chụp ngoại cảnh, quán cafe, đường phố, ngồi xe máy/ô tô, bế thú cưng).
   - Ảnh chụp đồ trải sàn (flatlay), treo móc, ma-nơ-canh, phụ kiện túi/giày/nón/trang sức.
   - Ảnh lookbook nghệ thuật, street style, ảnh OOTD đời thường.
   => Miễn là CÓ XUẤT HIỆN trang phục/phụ kiện thì LUÔN đánh giá isClothing = true.

2. isClothing = FALSE (Chỉ khi rõ ràng 100% là rác/spam):
   - Ảnh hoàn toàn KHÔNG CÓ người hay quần áo (chỉ chụp cận cảnh đĩa thức ăn/ly nước, cận cảnh động vật không có đồ, màn hình điện thoại chụp chữ/hóa đơn, ảnh meme, ảnh rác).
   - Ảnh tối đen hoàn toàn.
   - Ảnh khiêu dâm, đồi trụy, vi phạm thuần phong mỹ tục.

Hãy trả về JSON theo schema:
{
  "isClothing": boolean,
  "confidence": number, // Từ 0.0 đến 1.0
  "detectedCategory": "DRESS" | "TOP" | "BOTTOM" | "OUTERWEAR" | "BAG" | "SHOES" | "ACCESSORY" | "TRADITIONAL" | "OTHER",
  "detectedColor": "string",
  "detectedStyle": "string",
  "reasonDescription": "string (mô tả ngắn gọn khách quan đối tượng trong ảnh)"
}
`;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType.startsWith("image/") ? mimeType : "image/jpeg",
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    const isClothing = Boolean(parsed.isClothing);
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.85;

    // 4. ÁP DỤNG MÔ HÌNH 3 TẦNG QUYẾT ĐỊNH (3-TIER DECISION MODEL)
    let decision: ModerationDecision = "APPROVED";
    let isApproved = true;
    let userMessage: string | undefined = undefined;

    if (isClothing && confidence >= 0.60) {
      // Tầng 1: Đồ rõ ràng -> APPROVED (Allow by default)
      decision = "APPROVED";
      isApproved = true;
    } else if (!isClothing && confidence >= 0.90) {
      // Tầng 3: Rác / Spam 100% rõ ràng không còn nghi ngờ -> REJECTED
      decision = "REJECTED";
      isApproved = false;
      userMessage = "Ảnh tải lên chưa thấy rõ trang phục hoặc phụ kiện thời trang. Bạn vui lòng chụp rõ món đồ hơn giúp CLOOP nhé! ✨";
    } else {
      // Tầng 2: Ảnh biên, góc chụp khó, lấn cấn hoặc confidence thấp -> PENDING_REVIEW (Không chặn user)
      decision = "PENDING_REVIEW";
      isApproved = true;
    }

    const auditDetails: ModerationAuditDetails = {
      traceId,
      decision,
      confidence,
      reason: parsed.reasonDescription || (isClothing ? "Valid clothing detected" : "Non-clothing detected"),
      fallbackUsed: false,
      detectedCategory: parsed.detectedCategory,
      detectedColor: parsed.detectedColor,
      detectedStyle: parsed.detectedStyle,
    };

    return {
      traceId,
      decision,
      isApproved,
      isClothing,
      confidence,
      detectedCategory: parsed.detectedCategory || "OTHER",
      detectedColor: parsed.detectedColor || "Tự nhiên",
      detectedStyle: parsed.detectedStyle || "Thời trang",
      userMessage,
      adminAuditLog: JSON.stringify(auditDetails),
      auditDetails,
      isFallback: false,
    };

  } catch (error: any) {
    console.warn(`⚠️ [AI Moderation Fallback][${traceId}]:`, error?.message || error);
    // FALLBACK AN TOÀN TUYỆT ĐỐI: Lỗi mạng hoặc AI timeout -> PENDING_REVIEW, không bao giờ làm hỏng flow user
    const auditDetails: ModerationAuditDetails = {
      traceId,
      decision: "PENDING_REVIEW",
      confidence: 0.5,
      reason: `AI_TIMEOUT_OR_NETWORK_ERROR: ${error?.message || "Timeout"}`,
      fallbackUsed: true,
    };
    return {
      traceId,
      decision: "PENDING_REVIEW",
      isApproved: true,
      isClothing: true,
      confidence: 0.5,
      isFallback: true,
      adminAuditLog: JSON.stringify(auditDetails),
      auditDetails,
      userMessage: undefined,
    };
  }
}
