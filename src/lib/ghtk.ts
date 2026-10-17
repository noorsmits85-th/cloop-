/**
 * CLOOP - GHTK (Giao Hàng Tiết Kiệm) Logistics Integration Service
 * Kết nối trực tiếp Gateway API của GHTK (/services/shipment/order):
 * - Ưu điểm vượt trội: Nhận trực tiếp địa chỉ dạng Text (province, district, ward, address)
 * - Tự động tạo vận đơn trực tiếp qua API GHTK
 * - Đóng vai trò Cứu tinh Auto-Failover khi GHN gặp lỗi từ điển mã Phường/Xã
 */

const GHTK_API_BASE = process.env.GHTK_API_URL || "https://services.giaohangtietkiem.vn";

function getGhtkHeaders() {
  const token = process.env.GHTK_API_TOKEN;

  if (!token) {
    throw new Error("Chưa cấu hình GHTK_API_TOKEN trong hệ thống.");
  }

  return {
    "Content-Type": "application/json",
    Token: token,
  };
}

/**
 * Chuẩn hóa số điện thoại Việt Nam cho API GHTK (10 số hợp lệ)
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

export type CreateGhtkOrderParams = {
  clientOrderCode: string;
  sender: {
    name: string;
    phone: string;
    province?: string | null;
    district?: string | null;
    ward?: string | null;
    specificAddress?: string | null;
  };
  receiver: {
    name: string;
    phone: string;
    province?: string | null;
    district?: string | null;
    ward?: string | null;
    specificAddress?: string | null;
  };
  product: {
    title: string;
    weightGram?: number;
    declaredValue?: number;
  };
  note?: string;
};

export type CreateGhtkOrderResult =
  | {
      success: true;
      trackingCode: string; // Mã vận đơn GHTK (ví dụ: S234567.MB...)
      orderCode: string;
      actualShippingFee: number;
      estimatedDeliveryTime?: string;
      raw: any;
    }
  | {
      success: false;
      error: string;
      code?: string | number;
    };

/**
 * Gửi yêu cầu tạo vận đơn GHTK chính thức qua Gateway API
 * Bọc Timeout Guard 6s chống treo mạng
 */
export async function createGhtkShippingOrder(params: CreateGhtkOrderParams): Promise<CreateGhtkOrderResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const headers = getGhtkHeaders();

    const weightKg = Math.max(0.2, (params.product.weightGram || 500) / 1000);

    // GHTK nhận trực tiếp địa chỉ dạng chữ (Text-based)
    const pickProvince = (params.sender.province || "Hà Nội").trim();
    const pickDistrict = (params.sender.district || "").trim() || "Quận Ba Đình";
    const pickWard = (params.sender.ward || "").trim();
    const pickAddress = (params.sender.specificAddress || `${pickWard}, ${pickDistrict}, ${pickProvince}`).trim();

    const destProvince = (params.receiver.province || "Hà Nội").trim();
    const destDistrict = (params.receiver.district || "").trim() || "Quận Ba Đình";
    const destWard = (params.receiver.ward || "").trim();
    const destAddress = (params.receiver.specificAddress || `${destWard}, ${destDistrict}, ${destProvince}`).trim();

    const payload = {
      products: [
        {
          name: params.product.title || "Trang phục thời trang tuần hoàn CLOOP",
          weight: weightKg,
          quantity: 1,
          product_code: params.clientOrderCode,
        },
      ],
      order: {
        id: params.clientOrderCode,
        pick_name: params.sender.name || "Chủ tủ CLOOP",
        pick_money: 0,
        pick_address: pickAddress,
        pick_province: pickProvince,
        pick_district: pickDistrict,
        pick_ward: pickWard || undefined,
        pick_tel: sanitizePhoneNumber(params.sender.phone),
        name: params.receiver.name || "Khách thuê CLOOP",
        address: destAddress,
        province: destProvince,
        district: destDistrict,
        ward: destWard || undefined,
        tel: sanitizePhoneNumber(params.receiver.phone),
        note: params.note || "Đơn hàng thuê đồ thời trang CLOOP Techfest - Cho xem hàng không cho thử",
        is_freeship: "1",
        value: params.product.declaredValue ? Math.min(5000000, params.product.declaredValue) : 0,
      },
    };

    const res = await fetch(`${GHTK_API_BASE}/services/shipment/order`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await res.json();

    if (!res.ok || !data.success) {
      const errorMsg = data.message || `Lỗi GHTK API (HTTP ${res.status})`;
      return {
        success: false,
        error: errorMsg,
        code: data.status_code || res.status,
      };
    }

    const orderData = data.order || {};
    const trackingCode = String(orderData.label || orderData.label_id || orderData.tracking_id || "").trim();
    const actualShippingFee = Number(orderData.fee || 0);

    if (!trackingCode) {
      return {
        success: false,
        error: "GHTK không trả về mã vận đơn (label).",
      };
    }

    return {
      success: true,
      trackingCode,
      orderCode: orderData.partner_id || params.clientOrderCode,
      actualShippingFee,
      estimatedDeliveryTime: orderData.estimated_deliver_time,
      raw: data,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error?.name === "AbortError") {
      return {
        success: false,
        error: "GHTK Gateway timeout sau 6 giây.",
      };
    }
    console.error("Lỗi gọi GHTK create shipping order:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Không thể kết nối đến máy chủ GHTK Gateway.",
    };
  }
}
