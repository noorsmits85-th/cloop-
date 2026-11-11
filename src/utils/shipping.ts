import * as crypto from "crypto";

const SECRET_KEY = process.env.SHIPPING_SECRET || process.env.PAYOS_CHECKSUM_KEY;

function requireShippingSecret(): string {
  const secret = SECRET_KEY || process.env.SHIPPING_SECRET || process.env.PAYOS_CHECKSUM_KEY;
  if (!secret) {
    throw new Error("Missing SHIPPING_SECRET configuration on server");
  }
  return secret;
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
  expectedDeliveryISODate?: string;
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

const ASCII_PROVINCE_MAP: Array<{ pattern: RegExp; display: string; canonical: string }> = [
  { pattern: /\b(ha\s*noi|hanoi)\b/i, display: "Hà Nội", canonical: "hà nội" },
  { pattern: /\b(ho\s*chi\s*minh|hcm|sai\s*gon|saigon)\b/i, display: "TP. Hồ Chí Minh", canonical: "hồ chí minh" },
  { pattern: /\b(da\s*nang|danang)\b/i, display: "Đà Nẵng", canonical: "đà nẵng" },
  { pattern: /\b(hai\s*phong|haiphong)\b/i, display: "Hải Phòng", canonical: "hải phòng" },
  { pattern: /\b(can\s*tho|cantho)\b/i, display: "Cần Thơ", canonical: "cần thơ" },
  { pattern: /\b(nghe\s*an|nghean|\bvinh\b)\b/i, display: "Nghệ An", canonical: "nghệ an" },
  { pattern: /\b(binh\s*duong)\b/i, display: "Bình Dương", canonical: "bình dương" },
  { pattern: /\b(dong\s*nai)\b/i, display: "Đồng Nai", canonical: "đồng nai" },
  { pattern: /\b(khanh\s*hoa|nha\s*trang)\b/i, display: "Khánh Hòa", canonical: "khánh hòa" },
  { pattern: /\b(lam\s*dong|da\s*lat)\b/i, display: "Lâm Đồng", canonical: "lâm đồng" },
  { pattern: /\b(thua\s*thien\s*hue|\bhue\b)\b/i, display: "Thừa Thiên Huế", canonical: "huế" },
  { pattern: /\b(quang\s*ninh)\b/i, display: "Quảng Ninh", canonical: "quảng ninh" },
  { pattern: /\b(bac\s*ninh)\b/i, display: "Bắc Ninh", canonical: "bắc ninh" },
  { pattern: /\b(thanh\s*hoa)\b/i, display: "Thanh Hóa", canonical: "thanh hóa" },
];

export function extractProvince(address: string): string {
  const norm = (address || "").toLowerCase();
  for (const prov of ALL_PROVINCES) {
    if (norm.includes(prov)) return prov;
  }
  for (const item of ASCII_PROVINCE_MAP) {
    if (item.pattern.test(norm)) return item.canonical;
  }
  return "";
}

const STREET_OR_PRIVATE_DETAIL_REGEX =
  /(\d+|số|ngõ|ngách|hẻm|đường|phố|phường|xã|thị\s*trấn|tổ|thôn|xóm|ấp|khu\s*phố|kp|tòa|căn|nhà|lô|kiệt|street|st\b|road|rd\b|avenue|ave\b|lane|ward|synthetic)/i;

/**
 * 🛡️ BẢO MẬT ĐỊA CHỈ TRẠM GIAO NHẬN (Ẩn số nhà, ngõ ngách, tên đường VÀ Phường/Xã riêng tư khi hiển thị công khai)
 * Chỉ công khai Quận/Huyện/Thị xã/Thành phố & Tỉnh (Ví dụ: "TP. Vinh, Nghệ An", "Quận Ba Đình, Hà Nội").
 * Ẩn hoàn toàn số nhà, ngõ ngách và Phường/Xã để tránh lộ vị trí cư trú cá nhân hoặc giao dịch ngoài sàn.
 */
export function maskPublicAddress(fullAddress?: string | null, fallback: string = "Chưa cập nhật"): string {
  if (!fullAddress || typeof fullAddress !== "string") return fallback;

  // 1. Loại bỏ các phần chú thích riêng tư trong ngoặc đơn và ẩn SĐT/Email nếu có
  let cleaned = fullAddress
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/(?:\+?84|0)[\s._\-()\/]*[35789](?:[\s._\-()\/]*\d){8}\b/g, "")
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "")
    .trim();
  if (!cleaned) return fallback;

  // 2. Tách các thành phần theo dấu phẩy
  const parts = cleaned.split(",").map(p => p.trim()).filter(Boolean);

  if (parts.length <= 1) {
    const single = parts[0] || cleaned;
    const lowerSingle = single.toLowerCase();
    // Nếu chỉ đúng tên một tỉnh/thành phố và không chứa số nhà/tên đường thì giữ nguyên
    if (ALL_PROVINCES.includes(lowerSingle) && !STREET_OR_PRIVATE_DETAIL_REGEX.test(single)) {
      return single;
    }
    for (const item of ASCII_PROVINCE_MAP) {
      if (item.pattern.test(single)) {
        return STREET_OR_PRIVATE_DETAIL_REGEX.test(single)
          ? `Khu vực ${item.display}`
          : item.display;
      }
    }
    const matchedProv = extractProvince(single);
    if (matchedProv) {
      return `Khu vực ${matchedProv.replace(/\b\w/g, (c) => c.toUpperCase())}`;
    }
    return "Khu vực bảo mật qua CLOOP";
  }

  // 3. Nếu có từ 3 phần trở lên -> Chỉ lấy 2 phần cuối và lọc bỏ các đoạn có số nhà/phường xã
  if (parts.length >= 3) {
    const tail = parts.slice(-2).filter(seg => !STREET_OR_PRIVATE_DETAIL_REGEX.test(seg));
    if (tail.length > 0) return tail.join(", ");
    return maskPublicAddress(parts[parts.length - 1], fallback);
  }

  // 4. Nếu có 2 phần
  if (parts.length === 2) {
    if (STREET_OR_PRIVATE_DETAIL_REGEX.test(parts[0])) {
      return STREET_OR_PRIVATE_DETAIL_REGEX.test(parts[1])
        ? maskPublicAddress(parts[1], fallback)
        : parts[1];
    }
    return parts.join(", ");
  }

  return "Khu vực bảo mật qua CLOOP";
}

/**
 * 🛡️ MASK SỐ ĐIỆN THOẠI (Chỉ giữ lại 3 số đầu và 3 số cuối)
 * Ví dụ: "0912345678" -> "091****678"
 */
export function maskPhone(phone?: string | null): string {
  if (!phone || typeof phone !== "string") return "";
  const cleaned = phone.trim();
  if (cleaned.length < 7) return "***";
  return cleaned.slice(0, 3) + "****" + cleaned.slice(-3);
}

export const ACTIVE_LIFECYCLE_STATUSES = new Set(["OWNER_PACKED", "LENDER_SHIPPED", "BORROWER_RECEIVED"]);

function sanitizeShipmentAddressObject(addr: any): any {
  if (!addr || typeof addr !== "object") return null;
  const cloned = { ...addr };
  const rawAddr = cloned.specificAddress || cloned.fullAddress || cloned.address || cloned.province || "";
  const masked = rawAddr ? maskPublicAddress(String(rawAddr), "Khu vực bảo mật qua CLOOP") : "Khu vực bảo mật qua CLOOP";
  if ("specificAddress" in cloned) cloned.specificAddress = masked;
  if ("fullAddress" in cloned) cloned.fullAddress = masked;
  if ("address" in cloned) cloned.address = masked;
  if ("phone" in cloned && cloned.phone) cloned.phone = maskPhone(String(cloned.phone));
  if ("email" in cloned && cloned.email) delete cloned.email;
  return cloned;
}

function sanitizeProviderRawPayload(payload: any): any {
  if (!payload || typeof payload !== "object") return null;
  const safeKeys = new Set([
    "paymentSide",
    "estimatedFee",
    "zoneLabel",
    "estimatedDays",
    "fromProvince",
    "toProvince",
    "status",
    "serviceId",
  ]);
  const sanitized: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (safeKeys.has(k)) {
      sanitized[k] = v;
    } else if (/phone|tel|mobile/i.test(k) && typeof v === "string") {
      sanitized[k] = maskPhone(v);
    } else if (/address|street|location/i.test(k) && typeof v === "string") {
      sanitized[k] = maskPublicAddress(v);
    }
  }
  return sanitized;
}

/**
 * 🛡️ PII DATA MASKING & ANTI-DISINTERMEDIATION POLICY (Chính sách khóa chặt liên hệ ngoài sàn)
 * LUÔN LUÔN mask số điện thoại, email, địa chỉ chi tiết và providerRawPayload giữa Khách thuê và Chủ tủ
 * ở TẤT CẢ các trạng thái đơn hàng (kể cả PAID, OWNER_PACKED, LENDER_SHIPPED, BORROWER_RECEIVED, LENDER_COMPLETED, DISPUTE).
 * Mọi hoạt động giao nhận đều được điều phối trung gian qua CLOOP và đơn vị vận chuyển.
 */
export function maskOrderPii<T extends Record<string, any>>(order: T): T {
  if (!order || typeof order !== "object") return order;

  const cloned: any = { ...order };

  if (cloned.product && typeof cloned.product === "object") {
    cloned.product = {
      ...cloned.product,
      specificAddress: maskPublicAddress(cloned.product.specificAddress),
    };
  }

  if (cloned.renter_phone) {
    cloned.renter_phone = maskPhone(cloned.renter_phone);
  }
  if (cloned.renterPhone) {
    cloned.renterPhone = maskPhone(cloned.renterPhone);
  }

  if (cloned.owner_phone) {
    cloned.owner_phone = maskPhone(cloned.owner_phone);
  }
  if (cloned.ownerPhone) {
    cloned.ownerPhone = maskPhone(cloned.ownerPhone);
  }

  if (Array.isArray(cloned.shipments)) {
    cloned.shipments = cloned.shipments.map((s: any) => {
      const p = sanitizeShipmentAddressObject(s.pickupAddress);
      const d = sanitizeShipmentAddressObject(s.deliveryAddress);
      const safePayload = sanitizeProviderRawPayload(s.providerRawPayload);
      return {
        ...s,
        pickupAddress: p,
        deliveryAddress: d,
        providerRawPayload: safePayload,
      };
    });
  }

  return cloned;
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

  const now = Date.now();
  const deliveryDateObj = new Date(now + Math.max(1, dynamicResult.estimatedDays) * 86400000);
  const formatDateStr = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };
  const expectedDeliveryDate = formatDateStr(deliveryDateObj);
  const fromEstObj = new Date(now + Math.max(1, dynamicResult.estimatedDays - 1) * 86400000);
  const expectedDeliveryRange = `${formatDateStr(fromEstObj)} - ${formatDateStr(deliveryDateObj)}`;

  const quotes: ShippingQuote[] = [
    {
      provider: "GHN",
      serviceId: "standard",
      name: "Giao Hàng Tiêu Chuẩn (Tận nơi)",
      fee: dynamicResult.fee,
      originalFee: dynamicResult.originalFee,
      discount: dynamicResult.originalFee - dynamicResult.fee,
      estimatedDays: dynamicResult.estimatedDays,
      expectedDeliveryDate,
      expectedDeliveryRange,
      deliverySource: "ESTIMATED",
      packagingNote: "Giao nhanh 1–2 ngày tận nơi. Miễn phí chiều gửi trả đồ."
    },
    {
      provider: "DIRECT",
      serviceId: "direct_pickup",
      name: "Tự Giao Nhận Trực Tiếp",
      fee: 0,
      originalFee: 0,
      discount: 0,
      estimatedDays: 0,
      expectedDeliveryDate: "Trong ngày",
      expectedDeliveryRange: "Trong ngày",
      deliverySource: "ESTIMATED",
      packagingNote: "Hai bên hẹn gặp trao đổi và bàn giao trực tiếp (Miễn phí)"
    }
  ];

  if (isSameProvince && !isRuralArea) {
    quotes.push({
      provider: "GHN",
      serviceId: "express",
      name: "Giao Hỏa Tốc GHN (Trong ngày)",
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
export function verifyShippingQuoteToken(tokenBase64: string, expectedFromProvince?: string, expectedToProvince?: string, expectedWeight?: number): ShippingQuote {
  try {
    const shippingSecret = requireShippingSecret();
    const decodedStr = Buffer.from(tokenBase64, "base64").toString("utf-8");
    const { payload, signature } = JSON.parse(decodedStr);

    const hmac = crypto.createHmac("sha256", shippingSecret);
    hmac.update(payload);
    const expectedSig = hmac.digest("hex");

    const sigBuf = Buffer.from(String(signature || ""), "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      throw new Error("Chữ ký báo giá vận chuyển không hợp lệ");
    }

    const data = JSON.parse(payload);
    if (Date.now() > data.expiresAt) {
      throw new Error("Báo giá vận chuyển đã hết hạn (15 phút), vui lòng tải lại!");
    }

    if (expectedFromProvince && data.fromProvince) {
      const normExpectedFrom = extractProvince(expectedFromProvince) || expectedFromProvince.trim().toLowerCase();
      const normTokenFrom = extractProvince(String(data.fromProvince)) || String(data.fromProvince).trim().toLowerCase();
      if (normExpectedFrom && normTokenFrom && normExpectedFrom !== normTokenFrom) {
        throw new Error("Tỉnh gửi hàng trong báo giá vận chuyển không khớp");
      }
    }

    if (expectedToProvince && data.toProvince) {
      const normExpectedTo = extractProvince(expectedToProvince) || expectedToProvince.trim().toLowerCase();
      const normTokenTo = extractProvince(String(data.toProvince)) || String(data.toProvince).trim().toLowerCase();
      if (normExpectedTo && normTokenTo && normExpectedTo !== normTokenTo) {
        throw new Error("Tỉnh nhận hàng trong báo giá vận chuyển không khớp");
      }
    }

    if (typeof expectedWeight === "number" && expectedWeight > 0 && typeof data.weight === "number" && data.weight > 0) {
      if (data.weight !== expectedWeight) {
        throw new Error("Khối lượng đơn hàng trong báo giá vận chuyển không khớp");
      }
    }

    if (typeof data.fee !== "number" || !Number.isFinite(data.fee) || data.fee < 0) {
      throw new Error("Phí vận chuyển trong báo giá không hợp lệ");
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
      expectedDeliveryISODate: data.expectedDeliveryISODate,
      leadtimeTimestamp: data.leadtimeTimestamp,
      deliverySource: data.deliverySource
    };
  } catch (err: any) {
    throw new Error(err.message || "Lỗi xác thực Token vận chuyển");
  }
}
