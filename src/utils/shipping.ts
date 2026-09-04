import crypto from "crypto";

const SHIPPING_SECRET = process.env.SHIPPING_SECRET || process.env.PAYOS_CHECKSUM_KEY || "cloop_shipping_secret_2026_super_secure";

function requireShippingSecret() {
  return SHIPPING_SECRET;
}

export interface ShippingQuote {
  provider: string;
  serviceId: string;
  name: string;
  fee: number;
  originalFee?: number;
  discount?: number;
  estimatedDays: number;
  packagingNote?: string;
  expectedDeliveryDate?: string;
  expectedDeliveryRange?: string;
  leadtimeTimestamp?: number;
  deliverySource?: "GHN_GATEWAY" | "ESTIMATED";
}

export interface SignedShippingQuote {
  quote: ShippingQuote;
  token: string; // Chữ ký HMAC chống giả mạo
}

// 🇻🇳 BẢNG PHÂN VÙNG BƯU CHÍNH GIAO HÀNG NHANH (GHN LOGISTICS 2026)
const NORTH_PROVINCES = [
  "hà nội", "hải phòng", "quảng ninh", "bắc ninh", "bắc giang", "hải dương", "hưng yên",
  "hà nam", "nam định", "thái bình", "ninh bình", "vĩnh phúc", "phú thọ", "thái nguyên",
  "lạng sơn", "tuyên quang", "hà giang", "cao bằng", "bắc kạn", "yên bái", "lào cai",
  "hòa bình", "sơn la", "điện biên", "lai châu"
];

const CENTRAL_PROVINCES = [
  "thanh hóa", "nghệ an", "hà tĩnh", "quảng bình", "quảng trị", "thừa thiên huế", "huế",
  "đà nẵng", "quảng nam", "quảng ngãi", "bình định", "phú yên", "khánh hòa", "nha trang",
  "ninh thuận", "bình thuận", "kon tum", "gia lai", "đắk lắk", "đắc lắc", "đắk nông", "lâm đồng", "đà lạt"
];

const SOUTH_PROVINCES = [
  "hồ chí minh", "sài gòn", "bình dương", "đồng nai", "bà rịa", "vũng tàu", "long an",
  "tiền giang", "bến tre", "trà vinh", "vĩnh long", "đồng tháp", "an giang", "kiên giang",
  "cần thơ", "hậu giang", "sóc trăng", "bạc liêu", "cà mau", "tây ninh", "bình phước"
];

// 🇻🇳 DANH SÁCH 63 TỈNH THÀNH VIỆT NAM CHUẨN ĐỊA LÝ
const ALL_PROVINCES = [
  "an giang", "bà rịa - vũng tàu", "bà rịa", "vũng tàu", "bắc giang", "bắc kạn", "bạc liêu", "bắc ninh", "bến tre",
  "bình định", "bình dương", "bình phước", "bình thuận", "cà mau", "cần thơ", "cao bằng",
  "đà nẵng", "đắk lắk", "đắc lắc", "đắk nông", "điện biên", "đồng nai", "đồng tháp", "gia lai", "hà giang",
  "hà nam", "hà nội", "hà tĩnh", "hải dương", "hải phòng", "hậu giang", "hòa bình", "hưng yên",
  "khánh hòa", "nha trang", "kiên giang", "kon tum", "lai châu", "lâm đồng", "đà lạt", "lạng sơn", "lào cai", "long an",
  "nam định", "nghệ an", "ninh bình", "ninh thuận", "phú thọ", "phú yên", "quảng bình",
  "quảng nam", "quảng ngãi", "quảng ninh", "quảng trị", "sóc trăng", "sơn la", "tây ninh",
  "thái bình", "thái nguyên", "thanh hóa", "thừa thiên huế", "huế", "tiền giang", "tp. hồ chí minh",
  "hồ chí minh", "sài gòn", "trà vinh", "tuyên quang", "vĩnh long", "vĩnh phúc", "yên bái"
];

export function extractProvince(address: string): string {
  const norm = (address || "").toLowerCase();
  for (const prov of ALL_PROVINCES) {
    if (norm.includes(prov)) return prov;
  }
  return "";
}

export function getRegion(provinceName: string): "NORTH" | "CENTRAL" | "SOUTH" {
  const p = (provinceName || "").toLowerCase();
  if (NORTH_PROVINCES.some(prov => p.includes(prov))) return "NORTH";
  if (CENTRAL_PROVINCES.some(prov => p.includes(prov))) return "CENTRAL";
  if (SOUTH_PROVINCES.some(prov => p.includes(prov))) return "SOUTH";
  return "NORTH"; // Default fallback
}

/**
 * ⚡ ĐỘNG CƠ TÍNH CƯỚC GHN ĐỘNG THEO APP THỰC TẾ & NÂNG LÊN BLOCK 5.000Đ
 * Chuẩn biểu phí GHN 2026: Phân chia 4 cấp cự ly (Nội tỉnh, Nội miền, Liên miền cận, Liên miền Bắc-Nam)
 * và tự động làm tròn Block 5K (VD: 17.5k -> 20k, 22.5k -> 25k, 27.5k -> 30k, 32.5k -> 35k, 37.5k -> 40k)
 */
export function calculateDynamicGhnFee(
  fromProvince: string,
  toProvince: string,
  weight: number = 500
): { fee: number; originalFee: number; estimatedDays: number; zoneLabel: string } {
  const normFrom = (fromProvince || "").trim().toLowerCase();
  const normTo = (toProvince || "").trim().toLowerCase();

  const provFrom = extractProvince(normFrom);
  const provTo = extractProvince(normTo);

  // So khớp tỉnh chuẩn xác
  const isSameProvince = provFrom && provTo ? (
    provFrom === provTo ||
    ((provFrom === "hồ chí minh" || provFrom === "sài gòn" || provFrom === "tp. hồ chí minh") &&
     (provTo === "hồ chí minh" || provTo === "sài gòn" || provTo === "tp. hồ chí minh"))
  ) : false;

  const isRemoteOrIsland = /(phú quốc|côn đảo|bạch long vĩ|lý sơn|kỳ sơn|tương dương|mèo vạc|đồng văn|mường nhé)/i.test(normTo);
  const isRuralOrSuburban = /(huyện|xã|thôn|ấp|cần giờ|củ chi|ba vì|sóc sơn|mê linh|diễn châu|quỳnh lưu|nam đàn|nghi lộc|yên thành|đô lương|nghĩa đàn|quỳ hợp|thanh chương|tân kỳ)/i.test(normTo);

  let rawFee = 22000;
  let estimatedDays = 2;
  let zoneLabel = "Liên tỉnh Tiêu chuẩn";

  if (isRemoteOrIsland) {
    // Tuyến huyện đảo, vùng cao đặc thù
    rawFee = 42000;
    estimatedDays = 4;
    zoneLabel = "Huyện đảo / Vùng cao";
  } else if (isSameProvince) {
    // 1. Nội tỉnh
    if (isRuralOrSuburban) {
      rawFee = 22500;
      estimatedDays = 1;
      zoneLabel = "Nội tỉnh (Tuyến huyện)";
    } else {
      rawFee = 17500;
      estimatedDays = 1;
      zoneLabel = "Nội thành";
    }
  } else {
    // 2. Khác tỉnh (Liên tỉnh)
    const regionFrom = getRegion(normFrom);
    const regionTo = getRegion(normTo);

    if (regionFrom === regionTo) {
      // Cùng miền (Ví dụ: Nghệ An - Hà Tĩnh, hoặc Hà Nội - Hải Phòng)
      rawFee = 27500;
      estimatedDays = 2;
      zoneLabel = "Nội miền";
    } else if (
      (regionFrom === "NORTH" && regionTo === "CENTRAL") ||
      (regionFrom === "CENTRAL" && regionTo === "NORTH") ||
      (regionFrom === "CENTRAL" && regionTo === "SOUTH") ||
      (regionFrom === "SOUTH" && regionTo === "CENTRAL")
    ) {
      // Cận miền (Bắc - Trung hoặc Trung - Nam, Ví dụ: Hà Nội - Nghệ An, Đà Nẵng - TP.HCM)
      rawFee = 32500;
      estimatedDays = 2;
      zoneLabel = "Liên miền cận kề";
    } else {
      // Cách xa 2 đầu đất nước (Bắc - Nam, Ví dụ: Hà Nội - TP.HCM, Hải Phòng - Cần Thơ)
      rawFee = 37500;
      estimatedDays = 3;
      zoneLabel = "Liên miền Bắc - Nam";
    }

    if (isRuralOrSuburban) {
      rawFee += 3000; // Phụ phí giao tuyến huyện liên tỉnh
    }
  }

  // Phụ phí cân nặng: Vượt 1kg (1000g), mỗi 500g cộng 5.000đ
  if (weight > 1000) {
    const excessWeight = weight - 1000;
    const weightSteps = Math.ceil(excessWeight / 500);
    rawFee += weightSteps * 5000;
  }

  // 🛡️ NÂNG LÊN BLOCK 5.000đ (CEIL TO 5K BLOCK)
  // Công thức: Math.ceil(rawFee / 5000) * 5000
  // Ví dụ: 17.500đ -> 20.000đ | 22.500đ -> 25.000đ | 27.500đ -> 30.000đ | 32.500đ -> 35.000đ | 37.500đ -> 40.000đ
  const normalizedFee = Math.max(5000, Math.ceil(rawFee / 5000) * 5000);
  const originalMarketFee = normalizedFee + 10000; // Giá thị trường bưu cục ngoài

  return {
    fee: normalizedFee,
    originalFee: originalMarketFee,
    estimatedDays,
    zoneLabel
  };
}

/**
 * 1. Hàm tính phí ship GHN theo Mô hình San Sẻ Vận Chuyển 50/50 & Block 5K
 */
export async function getShippingQuotes(
  fromProvince: string,
  toProvince: string,
  weight: number = 500,
  isRental: boolean = true
): Promise<ShippingQuote[]> {
  const dynamicResult = calculateDynamicGhnFee(fromProvince, toProvince, weight);
  const normFrom = (fromProvince || "").trim().toLowerCase();
  const normTo = (toProvince || "").trim().toLowerCase();
  const isSameProvince = normFrom.length > 2 && (normTo.includes(normFrom) || normFrom.includes(normTo));
  const isRuralArea = /(huyện|xã|thôn|ấp)/i.test(normTo);

  const quotes: ShippingQuote[] = [
    {
      provider: "GHN",
      serviceId: "standard",
      name: isRental 
        ? `🚚 Giao Tiêu Chuẩn GHN (San sẻ 50/50: Chiều đi - ${dynamicResult.zoneLabel})`
        : `🚚 Giao Tiêu Chuẩn GHN (${dynamicResult.zoneLabel})`,
      fee: dynamicResult.fee,
      originalFee: dynamicResult.originalFee,
      discount: dynamicResult.originalFee - dynamicResult.fee,
      estimatedDays: dynamicResult.estimatedDays,
      packagingNote: isRental 
        ? `Khách trả cước chiều đi lúc đặt (${dynamicResult.fee.toLocaleString('vi-VN')}đ - Block 5K). Chiều trả đồ về miễn phí 0đ (Chủ tủ chịu cước thu hồi tài sản)` 
        : "Giao nhận tiêu chuẩn GHN bưu tá đến lấy tận nơi"
    },
    {
      provider: "DIRECT",
      serviceId: "direct_pickup",
      name: "🤝 Tự Giao Nhận Trực Tiếp (Gần nhau / Hẹn gặp)",
      fee: 0,
      originalFee: 0,
      discount: 0,
      estimatedDays: 0,
      packagingNote: "Hai bên tự hẹn gặp trao đổi và gửi trả đồ trực tiếp (Miễn phí 0đ)"
    }
  ];

  if (isSameProvince && !isRuralArea) {
    quotes.push({
      provider: "GHN",
      serviceId: "express",
      name: "⚡ Giao Hỏa Tốc GHN (Trong Ngày)",
      fee: 35000,
      originalFee: 45000,
      discount: 10000,
      estimatedDays: 0,
      packagingNote: "Giao nhanh bằng xe máy nội thành trong 4 giờ"
    });
  }

  return quotes;
}

/**
 * 2. Hàm sinh "Signed Quote Token" (Chữ ký điện tử cho báo giá)
 */
export function signShippingQuote(quote: ShippingQuote, fromProvince: string, toProvince: string, weight: number): SignedShippingQuote {
  const shippingSecret = requireShippingSecret();
  const payload = JSON.stringify({
    ...quote,
    fromProvince,
    toProvince,
    weight,
    expiresAt: Date.now() + 15 * 60 * 1000, // Token sống 15 phút
  });

  const hmac = crypto.createHmac("sha256", shippingSecret);
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
    const shippingSecret = requireShippingSecret();
    const decodedStr = Buffer.from(tokenBase64, "base64").toString("utf-8");
    const { payload, signature } = JSON.parse(decodedStr);

    const hmac = crypto.createHmac("sha256", shippingSecret);
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
      packagingNote: data.packagingNote,
      expectedDeliveryDate: data.expectedDeliveryDate,
      expectedDeliveryRange: data.expectedDeliveryRange,
      leadtimeTimestamp: data.leadtimeTimestamp,
      deliverySource: data.deliverySource
    };
  } catch (err: any) {
    throw new Error(err.message || "Lỗi xác thực Token vận chuyển");
  }
}
