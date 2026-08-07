import crypto from "crypto";

// Secret dùng để tạo chữ ký báo giá. 
// Đáng lý để trong .env nhưng tạm thời hardcode hoặc dùng fallback an toàn cho MVP.
const SHIPPING_SECRET = process.env.SHIPPING_SECRET || "cloop-super-secret-2026-fallback";

export interface ShippingQuote {
  provider: string;
  serviceId: string;
  name: string;
  fee: number;
  estimatedDays: number;
}

export interface SignedShippingQuote {
  quote: ShippingQuote;
  token: string; // Chữ ký HMAC chống giả mạo
}

/**
 * 1. Hàm giả lập tính phí ship từ GHN (Sau này thay bằng API GHN thật)
 */
export async function getShippingQuotes(
  fromProvince: string,
  toProvince: string,
  weight: number = 500
): Promise<ShippingQuote[]> {
  const isSameProvince = fromProvince.trim().toLowerCase() === toProvince.trim().toLowerCase();
  
  // Phát hiện vùng ven / huyện xã xa xôi dựa trên keyword
  const isRuralArea = /(huyện|xã|thôn|ấp|cần giờ|củ chi|ba vì|sóc sơn)/i.test(toProvince);

  // Logic giá:
  // Nội tỉnh (Nội thành): 20k
  // Nội tỉnh (Ngoại thành/Vùng xa): 30k
  // Khác tỉnh: 35k
  let baseFee = 35000;
  let estimatedDays = 3;

  if (isSameProvince) {
    baseFee = isRuralArea ? 30000 : 20000;
    estimatedDays = isRuralArea ? 2 : 1;
  }

  const quotes: ShippingQuote[] = [
    {
      provider: "GHN",
      serviceId: "standard",
      name: "Giao Tiêu Chuẩn",
      fee: baseFee + (Math.max(0, weight - 500) * 10), // Trọng lượng lố tính 10đ/gram
      estimatedDays: estimatedDays,
    }
  ];

  // Hỏa tốc chỉ áp dụng cho nội tỉnh & nội thành (không áp dụng vùng xa)
  if (isSameProvince && !isRuralArea) {
    quotes.push({
      provider: "GHN",
      serviceId: "express",
      name: "Giao Hỏa Tốc (Trong ngày)",
      fee: 40000 + (Math.max(0, weight - 500) * 15),
      estimatedDays: 0,
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

  // Mã hóa Base64 cho dễ truyền qua HTTP Header/Body
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

    // Xác thực chữ ký
    const hmac = crypto.createHmac("sha256", SHIPPING_SECRET);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    if (signature !== expectedSignature) {
      throw new Error("Chữ ký vận chuyển không hợp lệ hoặc đã bị chỉnh sửa!");
    }

    const data = JSON.parse(payload);

    // Xác thực thời gian sống (15 phút)
    if (Date.now() > data.expiresAt) {
      throw new Error("Báo giá vận chuyển đã hết hạn. Vui lòng tải lại trang.");
    }

    // Xác thực Data toàn vẹn (Chống lấy token đơn 15k đập vào đơn 50k)
    if (
      data.fromProvince !== expectedFromProvince ||
      data.toProvince !== expectedToProvince ||
      data.weight !== expectedWeight
    ) {
      throw new Error("Thông tin vận chuyển không khớp với báo giá ban đầu. Vui lòng thử lại.");
    }

    return {
      provider: data.provider,
      serviceId: data.serviceId,
      name: data.name,
      fee: data.fee,
      estimatedDays: data.estimatedDays,
    };
  } catch (error: any) {
    throw new Error(error.message || "Xác thực báo giá vận chuyển thất bại");
  }
}
