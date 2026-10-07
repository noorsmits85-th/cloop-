/**
 * CLOOP - GHN (Giao Hàng Nhanh) Logistics Integration Service
 * Kết nối trực tiếp Gateway API của GHN:
 * - Chuẩn hóa địa chỉ qua Master-Data API (Tỉnh/Thành -> Quận/Huyện -> Phường/Xã)
 * - Tự động tạo vận đơn trực tiếp qua API v2/shipping-order/create
 * - Lấy Mã vận đơn thực tế và Cước phí thực tế từng đồng từ GHN
 */

const GHN_API_BASE = "https://online-gateway.ghn.vn/shiip/public-api";

function getGhnHeaders() {
  const token = process.env.GHN_API_TOKEN;
  const shopId = process.env.GHN_SHOP_ID;

  if (!token) {
    throw new Error("Chưa cấu hình GHN_API_TOKEN trong hệ thống.");
  }

  return {
    "Content-Type": "application/json",
    Token: token,
    ShopId: String(shopId || ""),
  };
}

// In-memory cache cho Master Data GHN để tối ưu tốc độ và giảm tải API
let provinceCache: any[] | null = null;
const districtCache = new Map<number, any[]>();
const wardCache = new Map<number, any[]>();

function normalizeVietnamese(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Chuẩn hóa số điện thoại Việt Nam cho API GHN (bắt buộc 10 số hợp lệ)
 */
function sanitizePhoneNumber(phone?: string | null): string {
  if (!phone) return "0912345678";
  const clean = phone.replace(/[^0-9]/g, "");
  if (clean.length === 10 && clean.startsWith("0")) return clean;
  if (clean.length === 9 && !clean.startsWith("0")) return `0${clean}`;
  if (clean.length === 11 && clean.startsWith("84")) return `0${clean.slice(2)}`;
  if (clean.length >= 10) return clean.slice(0, 10);
  return "0912345678";
}

export async function fetchGhnProvinces(): Promise<any[]> {
  if (provinceCache && provinceCache.length > 0) return provinceCache;

  const res = await fetch(`${GHN_API_BASE}/master-data/province`, {
    headers: { Token: process.env.GHN_API_TOKEN || "" },
    next: { revalidate: 86400 }, // Cache 24 giờ
  });

  if (!res.ok) {
    throw new Error(`Lỗi tải danh mục Tỉnh/Thành từ GHN: HTTP ${res.status}`);
  }

  const json = await res.json();
  provinceCache = json.data || [];
  return provinceCache!;
}

export async function fetchGhnDistricts(provinceId: number): Promise<any[]> {
  if (districtCache.has(provinceId)) return districtCache.get(provinceId)!;

  const res = await fetch(`${GHN_API_BASE}/master-data/district?province_id=${provinceId}`, {
    headers: { Token: process.env.GHN_API_TOKEN || "" },
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    return [];
  }

  const json = await res.json();
  const list = json.data || [];
  districtCache.set(provinceId, list);
  return list;
}

export async function fetchGhnWards(districtId: number): Promise<any[]> {
  if (wardCache.has(districtId)) return wardCache.get(districtId)!;

  const res = await fetch(`${GHN_API_BASE}/master-data/ward?district_id=${districtId}`, {
    headers: { Token: process.env.GHN_API_TOKEN || "" },
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    return [];
  }

  const json = await res.json();
  const list = json.data || [];
  wardCache.set(districtId, list);
  return list;
}

export type ResolvedGhnAddress = {
  provinceId: number;
  provinceName: string;
  districtId: number;
  districtName: string;
  wardCode: string;
  wardName: string;
  fullAddressText: string;
};

/**
 * Tự động phân giải địa chỉ văn bản thành ID Quận/Huyện và Mã Phường/Xã chuẩn GHN
 */
export async function resolveGhnAddress(input: {
  province?: string | null;
  districtId?: number | null;
  wardCode?: string | null;
  specificAddress?: string | null;
  fullText?: string | null;
}): Promise<ResolvedGhnAddress> {
  const combinedText = [
    input.specificAddress,
    input.wardCode,
    input.province,
    input.fullText,
  ]
    .filter(Boolean)
    .join(", ");

  const normCombined = normalizeVietnamese(combinedText);
  const provinces = await fetchGhnProvinces();

  // 1. Phân giải Tỉnh / Thành
  let matchedProv: any = null;
  if (input.province) {
    const normProv = normalizeVietnamese(input.province);
    matchedProv = provinces.find((p: any) => {
      const pNorm = normalizeVietnamese(p.ProvinceName);
      return pNorm.includes(normProv) || normProv.includes(pNorm);
    });
  }

  if (!matchedProv) {
    matchedProv = provinces.find((p: any) => {
      const pNorm = normalizeVietnamese(p.ProvinceName);
      return normCombined.includes(pNorm);
    });
  }

  if (!matchedProv) {
    // Mặc định Hà Nội nếu hoàn toàn không xác định được
    matchedProv = provinces.find((p: any) => normalizeVietnamese(p.ProvinceName).includes("ha noi")) || provinces[0];
  }

  // 2. Phân giải Quận / Huyện
  const districts = await fetchGhnDistricts(matchedProv.ProvinceID);
  let matchedDist: any = null;

  if (input.districtId) {
    matchedDist = districts.find((d: any) => d.DistrictID === input.districtId);
  }

  if (!matchedDist) {
    matchedDist = districts.find((d: any) => {
      const dNorm = normalizeVietnamese(d.DistrictName);
      return normCombined.includes(dNorm);
    });
  }

  if (!matchedDist) {
    matchedDist = districts.find((d: any) => {
      if (Array.isArray(d.NameExtension)) {
        return d.NameExtension.some((ext: string) => normCombined.includes(normalizeVietnamese(ext)));
      }
      return false;
    });
  }

  if (!matchedDist) {
    matchedDist = districts[0];
  }

  // 3. Phân giải Phường / Xã
  const wards = await fetchGhnWards(matchedDist.DistrictID);
  let matchedWard: any = null;

  if (input.wardCode) {
    const cleanWardCode = String(input.wardCode).trim();
    matchedWard = wards.find((w: any) => String(w.WardCode) === cleanWardCode);
  }

  if (!matchedWard) {
    matchedWard = wards.find((w: any) => {
      const wNorm = normalizeVietnamese(w.WardName);
      return normCombined.includes(wNorm);
    });
  }

  if (!matchedWard) {
    matchedWard = wards.find((w: any) => {
      if (Array.isArray(w.NameExtension)) {
        return w.NameExtension.some((ext: string) => normCombined.includes(normalizeVietnamese(ext)));
      }
      return false;
    });
  }

  if (!matchedWard) {
    matchedWard = wards[0];
  }

  const finalAddressText = input.specificAddress || `${matchedWard.WardName}, ${matchedDist.DistrictName}, ${matchedProv.ProvinceName}`;

  return {
    provinceId: matchedProv.ProvinceID,
    provinceName: matchedProv.ProvinceName,
    districtId: matchedDist.DistrictID,
    districtName: matchedDist.DistrictName,
    wardCode: String(matchedWard.WardCode),
    wardName: matchedWard.WardName,
    fullAddressText: finalAddressText,
  };
}

export type CreateGhnOrderParams = {
  clientOrderCode: string;
  sender: {
    name: string;
    phone: string;
    province?: string | null;
    districtId?: number | null;
    wardCode?: string | null;
    specificAddress?: string | null;
  };
  receiver: {
    name: string;
    phone: string;
    province?: string | null;
    districtId?: number | null;
    wardCode?: string | null;
    specificAddress?: string | null;
  };
  product: {
    title: string;
    weightGram?: number;
    declaredValue?: number;
  };
  note?: string;
};

export type CreateGhnOrderResult =
  | {
      success: true;
      trackingCode: string;
      orderCode: string;
      actualShippingFee: number;
      expectedDeliveryTime?: string;
      raw: any;
    }
  | {
      success: false;
      error: string;
      code?: string | number;
    };

/**
 * Gửi yêu cầu tạo vận đơn GHN chính thức qua Gateway API
 */
export async function createGhnShippingOrder(params: CreateGhnOrderParams): Promise<CreateGhnOrderResult> {
  try {
    const headers = getGhnHeaders();

    // 1. Phân giải địa chỉ người gửi và người nhận
    const [fromLoc, toLoc] = await Promise.all([
      resolveGhnAddress({
        province: params.sender.province,
        districtId: params.sender.districtId,
        wardCode: params.sender.wardCode,
        specificAddress: params.sender.specificAddress,
      }),
      resolveGhnAddress({
        province: params.receiver.province,
        districtId: params.receiver.districtId,
        wardCode: params.receiver.wardCode,
        specificAddress: params.receiver.specificAddress,
      }),
    ]);

    const weight = Math.max(200, params.product.weightGram || 500);

    const payload = {
      payment_type_id: 1, // 1: Bên gửi trả cước (CLOOP thanh toán với GHN qua hợp đồng)
      note: params.note || "Đơn hàng thuê đồ thời trang CLOOP Techfest - Cho xem hàng không cho thử",
      required_note: "CHOXEMHANGKHONGTHU",
      client_order_code: params.clientOrderCode,
      from_name: params.sender.name || "Chủ tủ CLOOP",
      from_phone: sanitizePhoneNumber(params.sender.phone),
      from_address: fromLoc.fullAddressText,
      from_district_id: fromLoc.districtId,
      from_ward_code: fromLoc.wardCode,
      to_name: params.receiver.name || "Khách thuê CLOOP",
      to_phone: sanitizePhoneNumber(params.receiver.phone),
      to_address: toLoc.fullAddressText,
      to_district_id: toLoc.districtId,
      to_ward_code: toLoc.wardCode,
      weight,
      length: 25,
      width: 20,
      height: 10,
      service_type_id: 2, // Giao chuẩn E-Commerce
      insurance_value: params.product.declaredValue ? Math.min(5000000, params.product.declaredValue) : 0,
      cod_amount: 0,
      items: [
        {
          name: params.product.title || "Sản phẩm thời trang CLOOP",
          code: params.clientOrderCode,
          quantity: 1,
          weight,
        },
      ],
    };

    const res = await fetch(`${GHN_API_BASE}/v2/shipping-order/create`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || data.code !== 200 || !data.data) {
      const errorMsg = data.message_display || data.message || `Lỗi GHN API (Mã: ${data.code})`;
      return {
        success: false,
        error: errorMsg,
        code: data.code,
      };
    }

    const orderData = data.data;
    const trackingCode = orderData.order_code;
    const actualShippingFee = Number(orderData.total_fee || orderData.fee?.main_service || 0);

    return {
      success: true,
      trackingCode,
      orderCode: trackingCode,
      actualShippingFee,
      expectedDeliveryTime: orderData.expected_delivery_time,
      raw: orderData,
    };
  } catch (error: any) {
    console.error("Lỗi gọi GHN create shipping order:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Không thể kết nối đến máy chủ GHN Gateway.",
    };
  }
}
