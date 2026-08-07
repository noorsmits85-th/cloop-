import { NextResponse } from "next/server";
import { getShippingQuotes, signShippingQuote } from "@/src/utils/shipping";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fromProvince, toProvince, weight = 500 } = body;

    if (!fromProvince || !toProvince) {
      return NextResponse.json({ error: "Thiếu thông tin địa chỉ giao nhận" }, { status: 400 });
    }

    const GHN_TOKEN = process.env.GHN_API_TOKEN;
    const GHN_FEE_URL = "https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee";
    
    let quotes = [];

    // NẾU CÓ TOKEN GHN THẬT -> GỌI API GHN
    if (GHN_TOKEN) {
      // Tách chuỗi fromProvince và toProvince ra (Vì từ Frontend nó gửi lên chuỗi ghép)
      // Tạm thời để gọi GHN cần district_id, ward_code, lúc này ta giả lập truyền ID vào fromProvince, toProvince hoặc fix tạm
      // Vì Frontend hiện tại gửi chuỗi ghép "Phường, Quận, Tỉnh", ta sẽ mock bằng ID giả nếu không parse được
      const res = await fetch(GHN_FEE_URL, {
        method: "POST",
        headers: { "Token": GHN_TOKEN, "Content-Type": "application/json" },
        body: JSON.stringify({
          from_district_id: 1442, // Fix cứng tạm Kho hàng ở Quận Hoàn Kiếm (Hoặc lấy từ Product)
          from_ward_code: "20101",
          service_id: 53320,
          service_type_id: 2,
          to_district_id: 1442, // TODO: Bóc tách ID từ payload
          to_ward_code: "20101",
          height: 10, length: 10, weight: weight, width: 10,
          insurance_value: 0,
        })
      });
      const data = await res.json();
      if (data.code === 200) {
        quotes = [{
          provider: "GHN",
          serviceId: "standard",
          name: "Giao Tiêu Chuẩn (GHN)",
          fee: data.data.total,
          estimatedDays: 3,
        }];
      }
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
