import { NextResponse } from "next/server";
import { getShippingQuotes, signShippingQuote } from "@/src/utils/shipping";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      fromProvince, 
      toProvince, 
      fromDistrictId, 
      fromWardCode, 
      toDistrictId, 
      toWardCode, 
      weight = 500,
      isRental = true
    } = body;

    if (!fromProvince || !toProvince) {
      return NextResponse.json({ error: "Thiếu thông tin địa chỉ giao nhận" }, { status: 400 });
    }

    const GHN_TOKEN = process.env.GHN_API_TOKEN;
    const GHN_FEE_URL = "https://online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee";
    
    let quotes: any[] = [];

    // 1. NẾU CÓ TOKEN GHN & CÓ MÃ QUẬN HUYỆN -> THỬ GỌI TRỰC TIẾP TỪ GHN GATEWAY
    if (GHN_TOKEN && toDistrictId) {
      try {
        const ghnBody: any = {
          from_district_id: Number(fromDistrictId) || 1442,
          service_type_id: 2,
          to_district_id: Number(toDistrictId),
          height: 10, 
          length: 10, 
          weight: weight, 
          width: 10,
          insurance_value: 0,
        };

        if (fromWardCode) ghnBody.from_ward_code = String(fromWardCode);
        if (toWardCode) ghnBody.to_ward_code = String(toWardCode);

        const res = await fetch(GHN_FEE_URL, {
          method: "POST",
          headers: { 
            "Token": GHN_TOKEN, 
            ...(process.env.GHN_SHOP_ID ? { "ShopId": String(process.env.GHN_SHOP_ID) } : {}),
            "Content-Type": "application/json" 
          },
          body: JSON.stringify(ghnBody)
        });
        const data = await res.json();
        
        if (data.code === 200 && data.data?.total) {
          const rawOneWayFee = data.data.total;
          // Áp dụng 5% buffer an toàn và nâng lên Block 5K
          const safeOneWayFee = rawOneWayFee * 1.05;
          const normalizedFee = Math.ceil(safeOneWayFee / 5000) * 5000;

          quotes = [
            {
              provider: "GHN",
              serviceId: "standard",
              name: isRental ? "🚚 Giao Tiêu Chuẩn GHN (San sẻ 50/50: Chiều đi)" : "🚚 Giao Tiêu Chuẩn GHN (1 Chiều)",
              fee: normalizedFee,
              originalFee: normalizedFee + 10000,
              discount: 10000,
              estimatedDays: 2,
              packagingNote: isRental 
                ? `Khách trả cước chiều đi lúc đặt (${normalizedFee.toLocaleString('vi-VN')}đ - Block 5K). Chiều trả đồ về miễn phí 0đ (Chủ tủ chịu cước thu hồi tài sản)` 
                : "Bưu tá GHN đến lấy và giao tận nơi"
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
        }
      } catch (ghnErr) {
        console.warn("⚠️ [GHN Fee Warning]:", ghnErr);
      }
    }

    // 2. NẾU CHƯA CÓ QUOTES TỪ GHN GATEWAY (HOẶC SHOP INFO CHƯA SETUP) -> CHẠY ĐỘNG CƠ CƯỚC GHN ĐỘNG THEO APP & BLOCK 5K
    if (quotes.length === 0) {
      quotes = await getShippingQuotes(fromProvince, toProvince, weight, isRental);
    }

    // Ký (Sign) từng báo giá để trả về cho Frontend
    const signedQuotes = quotes.map(quote => signShippingQuote(quote, fromProvince, toProvince, weight));

    return NextResponse.json({ success: true, options: signedQuotes }, { status: 200 });

  } catch (error: any) {
    console.error("Lỗi tính phí ship:", error);
    return NextResponse.json({ error: "Không thể tính phí vận chuyển lúc này" }, { status: 500 });
  }
}
