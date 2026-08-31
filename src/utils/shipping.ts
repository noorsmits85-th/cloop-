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
 * 1. Hàm tính phí ship GHN kết hợp Khứ hồi 2 chiều & Block 5K Buffer
 */
export async function getShippingQuotes(
  fromProvince: string,
  toProvince: string,
  weight: number = 500,
  isTwoWay: boolean = true
): Promise<ShippingQuote[]> {
  const isSameProvince = fromProvince.trim().toLowerCase() === toProvince.trim().toLowerCase();
  const isRuralArea = /(huyện|xã|thôn|ấp|cần giờ|củ chi|ba vì|sóc sơn)/i.test(toProvince);

  // Cước 1 chiều tiêu chuẩn GHN (đã trừ chiết khấu B2B sản lượng lớn)
  let oneWayFee = isSameProvince ? (isRuralArea ? 20000 : 18000) : 25000;
  let estimatedDays = isSameProvince ? 1 : 2;

  // Cước khứ hồi 2 chiều (Giao tận nơi + Thu hồi đồ về cho chủ tủ)
  const multiplier = isTwoWay ? 2 : 1;
  const rawRoundTripFee = oneWayFee * multiplier + (Math.max(0, weight - 500) * 10);
  
  // Làm tròn theo Block 5K để tạo Quỹ dự phòng bảo vệ cước vận chuyển
  const roundTripFee = Math.ceil(rawRoundTripFee / 5000) * 5000;
  const originalFee = roundTripFee + (isTwoWay ? 15000 : 10000);

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
      name: isTwoWay 
        ? "🚚 GHN Khứ Hồi 2 Chiều (Giao đồ + Trả đồ)"
        : "🚚 Giao Tiêu Chuẩn GHN (1 Chiều)",
      fee: roundTripFee,
      originalFee: originalFee,
      discount: originalFee - roundTripFee,
      estimatedDays: estimatedDays,
      packagingNote: isTwoWay 
        ? "Trọn gói 2 chiều: Đã bao gồm cước gửi đến & cước bưu tá đến lấy trả về chủ tủ" 
        : "Giao nhận 1 chiều tiêu chuẩn"
    }
  ];

  if (isSameProvince && !isRuralArea) {
    quotes.push({
      provider: "GHN",
      serviceId: "express",
      name: isTwoWay ? "⚡ Hỏa Tốc Khứ Hồi 2 Chiều" : "⚡ Giao Hỏa Tốc (Trong Ngày)",
      fee: isTwoWay ? 65000 : 38000,
      originalFee: isTwoWay ? 80000 : 50000,
      discount: 15000,
      estimatedDays: 0,
      packagingNote: "Giao nhận nhanh bằng xe máy nội thành 2 chiều"
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
