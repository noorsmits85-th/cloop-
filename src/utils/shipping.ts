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
 * 1. Hàm tính phí ship GHN kết hợp Chiến thuật B2B Shipping Arbitrage & Safety Margin
 */
export async function getShippingQuotes(
  fromProvince: string,
  toProvince: string,
  weight: number = 500
): Promise<ShippingQuote[]> {
  const isSameProvince = fromProvince.trim().toLowerCase() === toProvince.trim().toLowerCase();
  const isRuralArea = /(huyện|xã|thôn|ấp|cần giờ|củ chi|ba vì|sóc sơn)/i.test(toProvince);

  // Cước niêm yết bán lẻ gốc của hãng GHN
  let originalRetailFee = 35000;
  let b2bDiscount = 10000; // Mức trợ giá B2B hợp đồng số lượng lớn
  let estimatedDays = 3;

  if (isSameProvince) {
    originalRetailFee = isRuralArea ? 32000 : 25000;
    b2bDiscount = 7000;
    estimatedDays = isRuralArea ? 2 : 1;
  }

  // Cước thực tế khách phải trả sau khi trợ giá
  const finalFee = Math.max(18000, originalRetailFee - b2bDiscount + (Math.max(0, weight - 500) * 10));

  const quotes: ShippingQuote[] = [
    {
      provider: "DIRECT",
      serviceId: "direct_pickup",
      name: "🤝 Tự Giao Nhận Trực Tiếp (Gần nhau / Team nội bộ)",
      fee: 0,
      originalFee: 0,
      discount: 0,
      estimatedDays: 0,
      packagingNote: "Hai bên tự hẹn gặp trao đổi đồ trực tiếp (Miễn phí 0đ)"
    },
    {
      provider: "GHN",
      serviceId: "standard",
      name: "🚚 Giao Tiêu Chuẩn (GHN Express)",
      fee: finalFee,
      originalFee: originalRetailFee,
      discount: b2bDiscount,
      estimatedDays: estimatedDays,
      packagingNote: "Quy cách chuẩn: Túi niêm phong PE dẻo (<500g)"
    }
  ];

  if (isSameProvince && !isRuralArea) {
    quotes.push({
      provider: "GHN",
      serviceId: "express",
      name: "Giao Hỏa Tốc (Trong Ngày)",
      fee: 38000,
      originalFee: 50000,
      discount: 12000,
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
