import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "node:crypto";
import { fetchSafeAllowedImage } from "@/src/lib/ssrf-guard";

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

  // 1. FALLBACK KHI THIẾU KEY: Chuyển về PENDING_REVIEW và KHÔNG tự động mở bán công khai (fail-closed cho kiểm duyệt chống chèn SĐT/QR)
  if (!apiKey) {
    const auditDetails: ModerationAuditDetails = {
      traceId,
      decision: "PENDING_REVIEW",
      confidence: 0,
      reason: "Missing GEMINI_API_KEY, routed to PENDING_REVIEW (fail-closed)",
      fallbackUsed: true,
    };
    return {
      traceId,
      decision: "PENDING_REVIEW",
      isApproved: false,
      isClothing: false,
      confidence: 0,
      isFallback: true,
      adminAuditLog: JSON.stringify(auditDetails),
      auditDetails,
      userMessage: "Hệ thống kiểm duyệt ảnh tự động đang bảo trì hoặc chờ xác thực. Vui lòng thử lại sau ít phút.",
    };
  }

  try {
    // 2. Tải dữ liệu ảnh an toàn qua SSRF Guard (chỉ cho phép domain media của CLOOP, chặn IP nội bộ, kiểm tra magic bytes)
    const { buffer, mimeType } = await fetchSafeAllowedImage(imageUrl, 10 * 1024 * 1024);
    const base64Data = buffer.toString("base64");

    // 3. Khởi tạo Gemini AI Model (Gemini 3.6 Flash siêu tốc)
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const prompt = `
Bạn là Hệ thống Thẩm định Hình ảnh Thời trang AI (CLOOP AI Vision Moderation).
Nhiệm vụ của bạn là kiểm tra xem bức ảnh có chứa TRANG PHỤC / PHỤ KIỆN THỜI TRANG HỢP LỆ hay không, đồng thời PHÁT HIỆN MỌI THÔNG TIN LIÊN HỆ TRÁ HÌNH (số điện thoại, mã QR, Zalo, Facebook, Instagram, Telegram, địa chỉ nhà, tài khoản ngân hàng) chèn trên ảnh.

TIÊU CHÍ:
1. isClothing = TRUE:
   - Bức ảnh có người mặc trang phục, đồ trải sàn (flatlay), treo móc, ma-nơ-canh, phụ kiện túi/giày/nón/trang sức.
2. isClothing = FALSE:
   - Ảnh hoàn toàn KHÔNG CÓ quần áo/phụ kiện, ảnh tối đen, meme, văn bản, hóa đơn, đồi trụy.
3. hasContactOverlay = TRUE:
   - Ảnh có chèn chữ số điện thoại, mã QR code, tên tài khoản Zalo/Facebook/Instagram/TikTok, địa chỉ nhà, hoặc lời mời gọi giao dịch ngoài sàn CLOOP.

Hãy trả về JSON theo schema:
{
  "isClothing": boolean,
  "hasContactOverlay": boolean,
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
    const hasContactOverlay = Boolean(parsed.hasContactOverlay);
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.85;

    // 4. ÁP DỤNG MÔ HÌNH QUYẾT ĐỊNH CHẶT CHẼ (CHẶN MỌI ẢNH CHỨA SĐT / QR CODE)
    let decision: ModerationDecision = "APPROVED";
    let isApproved = true;
    let userMessage: string | undefined = undefined;

    if (hasContactOverlay) {
      decision = "REJECTED";
      isApproved = false;
      userMessage = "Ảnh sản phẩm không được chứa số điện thoại, mã QR hoặc thông tin liên hệ ngoài sàn CLOOP.";
    } else if (isClothing && confidence >= 0.60) {
      decision = "APPROVED";
      isApproved = true;
    } else if (!isClothing && confidence >= 0.90) {
      decision = "REJECTED";
      isApproved = false;
      userMessage = "Ảnh tải lên chưa thấy rõ trang phục hoặc phụ kiện thời trang. Bạn vui lòng chụp rõ món đồ hơn giúp CLOOP nhé!";
    } else {
      decision = "PENDING_REVIEW";
      isApproved = false;
      userMessage = "Ảnh đang cần kiểm duyệt thêm để đảm bảo đúng chuẩn trang phục và không chứa thông tin liên hệ ngoài sàn.";
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
    const auditDetails: ModerationAuditDetails = {
      traceId,
      decision: "PENDING_REVIEW",
      confidence: 0,
      reason: "AI_MODERATION_FALLBACK",
      fallbackUsed: true,
    };
    return {
      traceId,
      decision: "PENDING_REVIEW",
      isApproved: false,
      isClothing: false,
      confidence: 0,
      isFallback: true,
      adminAuditLog: JSON.stringify(auditDetails),
      auditDetails,
      userMessage: "Không thể xác thực ảnh tự động lúc này. Vui lòng kiểm tra lại ảnh và thử lại.",
    };
  }
}
