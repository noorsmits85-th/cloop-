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
      weight = 500 
    } = body;

    if (!fromProvince || !toProvince) {
      return NextResponse.json({ error: "Thiếu thông tin địa chỉ giao nhận" }, { status: 400 });
    }

    const GHN_TOKEN = process.env.GHN_API_TOKEN;
    const GHN_FEE_URL = "https://online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee";
    
    let quotes: any[] = [];

    // NẾU CÓ TOKEN GHN THẬT -> GỌI API GHN THEO ĐỊNH VỊ CHÍNH XÁC
    if (GHN_TOKEN) {
      const ghnBody: any = {
        from_district_id: Number(fromDistrictId) || 1442,
        service_type_id: 2,
        to_district_id: Number(toDistrictId) || 1442,
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
        headers: { "Token": GHN_TOKEN, "Content-Type": "application/json" },
        body: JSON.stringify(ghnBody)
      });
      const data = await res.json();
      const rawFee = (data.code === 200 && data.data?.total) ? data.data.total : 21000;
      const safeFee = rawFee * 1.1;
      const normalizedFee = Math.ceil(safeFee / 5000) * 5000;

      quotes = [
        {
          provider: "DIRECT",
          serviceId: "direct_pickup",
          name: "🤝 Tự Giao Nhận Trực Tiếp (Gần nhau / Team nội bộ)",
          fee: 0,
          originalFee: 0,
          discount: 0,
          estimatedDays: 0,
          packagingNote: "Hai bên tự hẹn gặp trao đổi đồ trực tiếp (Miễn phí vận chuyển 0đ)"
        },
        {
          provider: "GHN",
          serviceId: "standard",
          name: "🚚 Giao Tiêu Chuẩn (GHN Express)",
          fee: normalizedFee,
          originalFee: normalizedFee + 10000,
          discount: 10000,
          estimatedDays: 2,
          packagingNote: "Bưu tá GHN đến lấy và giao tận nơi 2 chiều"
        }
      ];
    } else {
      // NẾU KHÔNG CÓ TOKEN -> CHẠY MOCK LOGIC THÔNG MINH
      quotes = await getShippingQuotes(fromProvince, toProvince, weight);
    }

    // Ký (Sign) từng báo giá để trả về cho Frontend
    const signedQuotes = quotes.map(quote => signShippingQuote(quote, fromProvince, toProvince, weight));

    return NextResponse.json({ success: true, options: signedQuotes }, { status: 200 });

  } catch (error: any) {
    console.error("Lỗi tính phí ship:", error);
    return NextResponse.json({ error: "Không thể tính phí vận chuyển lúc này" }, { status: 500 });
  }
}
