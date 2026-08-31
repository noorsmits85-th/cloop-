import crypto from "crypto";

const SHIPPING_SECRET = process.env.SHIPPING_SECRET || "cloop-super-secret-2026-fallback";

export interface ShippingQuote {
  provider: string;
  serviceId: string;
  name: string;
  fee: number;
  originalFee?: number;
  discount?: number;
  estimatedDays: number;
  packagingNote?: string;
}

export interface SignedShippingQuote {
  quote: ShippingQuote;
  token: string; // Chữ ký HMAC chống giả mạo
}

/**
 * 1. Hàm tính phí ship GHN theo Mô hình San Sẻ Vận Chuyển 50/50 (Co-sharing Logistics & Block 5K)
 */
export async function getShippingQuotes(
  fromProvince: string,
  toProvince: string,
  weight: number = 500,
  isRental: boolean = true
): Promise<ShippingQuote[]> {
  const isSameProvince = fromProvince.trim().toLowerCase() === toProvince.trim().toLowerCase();
  const isRuralArea = /(huyện|xã|thôn|ấp|cần giờ|củ chi|ba vì|sóc sơn)/i.test(toProvince);

  // Cước 1 chiều tiêu chuẩn GHN (đã làm tròn Block 5K để tạo Quỹ dự phòng bảo vệ cước)
  let oneWayFee = isSameProvince ? (isRuralArea ? 25000 : 20000) : 25000;
  let originalFee = isSameProvince ? 30000 : 35000;
  let estimatedDays = isSameProvince ? 1 : 2;

  // Với đơn thuê đồ, áp dụng cơ chế 50/50: Khách trả chiều đi, Chủ tủ chịu chiều về cấn trừ Payout
  const quotes: ShippingQuote[] = [
    {
      provider: "DIRECT",
      serviceId: "direct_pickup",
      name: "🤝 Tự Giao Nhận Trực Tiếp (Gần nhau / Hẹn gặp)",
      fee: 0,
      originalFee: 0,
      discount: 0,
      estimatedDays: 0,
      packagingNote: "Hai bên tự hẹn gặp trao đổi và gửi trả đồ trực tiếp (Miễn phí 0đ)"
    },
    {
      provider: "GHN",
      serviceId: "standard",
      name: isRental 
        ? "🚚 Giao Tiêu Chuẩn GHN (San sẻ 50/50: Chiều đi)"
        : "🚚 Giao Tiêu Chuẩn GHN (1 Chiều)",
      fee: oneWayFee,
      originalFee: originalFee,
      discount: originalFee - oneWayFee,
      estimatedDays: estimatedDays,
      packagingNote: isRental 
        ? "Khách trả cước chiều đi lúc đặt. Chiều trả đồ về miễn phí 0đ (Chủ tủ chịu cước thu hồi tài sản)" 
        : "Giao nhận 1 chiều tiêu chuẩn bưu tá đến lấy tận nơi"
    }
  ];

  if (isSameProvince && !isRuralArea) {
    quotes.push({
      provider: "GHN",
      serviceId: "express",
      name: "⚡ Giao Hỏa Tốc (Trong Ngày)",
      fee: 35000,
      originalFee: 45000,
      discount: 10000,
      estimatedDays: 0,
      packagingNote: "Giao nhanh bằng xe máy nội thành"
    });
  }

  return quotes;
}

/**
 * 2. Hàm sinh "Signed Quote Token" (Chữ ký điện tử cho báo giá)
 */
export function signShippingQuote(quote: ShippingQuote, fromProvince: string, toProvince: string, weight: number): SignedShippingQuote {
  const payload = JSON.stringify({
    ...quote,
    fromProvince,
    toProvince,
    weight,
    expiresAt: Date.now() + 15 * 60 * 1000, // Token sống 15 phút
  });

  const hmac = crypto.createHmac("sha256", SHIPPING_SECRET);
  hmac.update(payload);
  const signature = hmac.digest("hex");

  const token = Buffer.from(JSON.stringify({ payload, signature })).toString("base64");

  return { quote, token };
}

/**
 * 3. Hàm xác thực "Signed Quote Token" lúc Checkout
 */
export function verifyShippingQuoteToken(tokenBase64: string, expectedFromProvince: string, expectedToProvince: string, expectedWeight: number): ShippingQuote {
  try {
    const decodedStr = Buffer.from(tokenBase64, "base64").toString("utf-8");
    const { payload, signature } = JSON.parse(decodedStr);

    const hmac = crypto.createHmac("sha256", SHIPPING_SECRET);
    hmac.update(payload);
    const expectedSig = hmac.digest("hex");

    if (signature !== expectedSig) {
      throw new Error("Chữ ký báo giá vận chuyển không hợp lệ");
    }

    const data = JSON.parse(payload);
    if (Date.now() > data.expiresAt) {
      throw new Error("Báo giá vận chuyển đã hết hạn (15 phút), vui lòng tải lại!");
    }

    return {
      provider: data.provider,
      serviceId: data.serviceId,
      name: data.name,
      fee: data.fee,
      originalFee: data.originalFee,
      discount: data.discount,
      estimatedDays: data.estimatedDays,
      packagingNote: data.packagingNote
    };
  } catch (err: any) {
    throw new Error(err.message || "Lỗi xác thực Token vận chuyển");
  }
}
