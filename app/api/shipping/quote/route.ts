import { NextResponse } from "next/server";
import { getShippingQuotes, signShippingQuote } from "@/src/utils/shipping";
import { z } from "zod";

const QuoteSchema = z.object({
  fromProvince: z.string().min(1).default("Hà Nội"),
  toProvince: z.string().min(1),
  fromDistrictId: z.union([z.string(), z.number()]).nullable().optional(),
  fromWardCode: z.string().nullable().optional(),
  toDistrictId: z.union([z.string(), z.number()]).nullable().optional(),
  toWardCode: z.string().nullable().optional(),
  weight: z.coerce.number().int().min(50).max(50000).default(500),
  isRental: z.boolean().default(true),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = QuoteSchema.safeParse(body);

    if (!parsed.success) {
      console.warn("⚠️ [Shipping Quote Validation Failed]:", parsed.error.issues);
      return NextResponse.json({ error: "Dữ liệu tính phí vận chuyển chưa hợp lệ" }, { status: 400 });
    }

    const {
      fromProvince,
      toProvince,
      fromDistrictId,
      fromWardCode,
      toDistrictId,
      toWardCode,
      weight,
      isRental,
    } = parsed.data;

    if (!fromProvince || !toProvince) {
      return NextResponse.json({ error: "Thiếu thông tin địa chỉ giao nhận" }, { status: 400 });
    }

    const GHN_TOKEN = process.env.GHN_API_TOKEN;
    const GHN_SHOP_ID = process.env.GHN_SHOP_ID || "6591755";
    const GHN_FEE_URL = "https://online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee";
    const GHN_LEADTIME_URL = "https://online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/leadtime";
    
    let quotes: Awaited<ReturnType<typeof getShippingQuotes>> = [];

    // 1. NẾU CÓ TOKEN GHN & CÓ MÃ QUẬN HUYỆN -> GỌI TRỰC TIẾP CẢ CƯỚC PHÍ & DỰ KIẾN GIAO TỪ GHN GATEWAY
    if (GHN_TOKEN && toDistrictId) {
      try {
        const fromDistrict = Number(fromDistrictId) || 1484; // 1484 = Ba Đình, Hà Nội (kho điều phối chính CLOOP)
        const fromWard = fromWardCode ? String(fromWardCode) : "1A0101"; // 1A0101 = Phường Cống Vị, Ba Đình
        const toDistrict = Number(toDistrictId);
        const toWard = toWardCode ? String(toWardCode) : undefined;

        // Tự động xác định service_id tối ưu từ GHN available-services cho tuyến đường này
        let selectedServiceId: number = 53321;
        try {
          const availRes = await fetch("https://online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/available-services", {
            method: "POST",
            headers: {
              "Token": GHN_TOKEN,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              shop_id: Number(GHN_SHOP_ID) || 6591755,
              from_district: fromDistrict,
              to_district: toDistrict
            })
          });
          if (availRes.ok) {
            const availData = await availRes.json();
            if (availData.data && availData.data.length > 0) {
              const lightService = availData.data.find((s: any) => s.service_type_id === 2);
              selectedServiceId = lightService ? lightService.service_id : availData.data[0].service_id;
            }
          }
        } catch (_) {}

        // Gọi song song cả Tính Cước & Leadtime Thời Gian Giao Dự Kiến chính thức từ hãng GHN
        const [feeRes, leadtimeRes] = await Promise.all([
          fetch(GHN_FEE_URL, {
            method: "POST",
            headers: { 
              "Token": GHN_TOKEN, 
              "ShopId": String(GHN_SHOP_ID),
              "Content-Type": "application/json" 
            },
            body: JSON.stringify({
              from_district_id: fromDistrict,
              from_ward_code: fromWard,
              service_id: selectedServiceId,
              to_district_id: toDistrict,
              to_ward_code: toWard,
              height: 10, 
              length: 10, 
              weight: weight, 
              width: 10,
              insurance_value: 0,
            })
          }),
          toWard ? fetch(GHN_LEADTIME_URL, {
            method: "POST",
            headers: { 
              "Token": GHN_TOKEN, 
              "ShopId": String(GHN_SHOP_ID),
              "Content-Type": "application/json" 
            },
            body: JSON.stringify({
              from_district_id: fromDistrict,
              from_ward_code: fromWard,
              to_district_id: toDistrict,
              to_ward_code: toWard,
              service_id: selectedServiceId
            })
          }) : Promise.resolve(null)
        ]);

        const data = await feeRes.json();
        let leadtimeData: any = null;
        if (leadtimeRes) {
          try {
            leadtimeData = await leadtimeRes.json();
          } catch (_) {}
        }

        // Trích xuất ngày giao dự kiến chính thức từ kết quả GHN trả về
        let expectedDeliveryDate: string | undefined;
        let expectedDeliveryRange: string | undefined;
        let leadtimeTimestamp: number | undefined;
        let estimatedDays = 2;

        if (leadtimeData?.code === 200 && leadtimeData.data) {
          const lt = leadtimeData.data;
          leadtimeTimestamp = lt.leadtime || undefined;

          const formatDateStr = (d: Date) => {
            const dd = String(d.getDate()).padStart(2, "0");
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const yyyy = d.getFullYear();
            return `${dd}/${mm}/${yyyy}`;
          };

          if (lt.leadtime_order?.from_estimate_date && lt.leadtime_order?.to_estimate_date) {
            const fromD = new Date(lt.leadtime_order.from_estimate_date);
            const toD = new Date(lt.leadtime_order.to_estimate_date);
            expectedDeliveryDate = formatDateStr(toD);
            expectedDeliveryRange = `${formatDateStr(fromD)} - ${formatDateStr(toD)}`;
            estimatedDays = Math.max(1, Math.round((toD.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
          } else if (lt.leadtime) {
            const d = new Date(lt.leadtime * 1000);
            expectedDeliveryDate = formatDateStr(d);
            expectedDeliveryRange = formatDateStr(d);
          }
        }
        
        if (data.code === 200 && data.data?.total) {
          const rawOneWayFee = data.data.total;
          // Áp dụng 5% buffer an toàn và nâng lên Block 5K
          const safeOneWayFee = rawOneWayFee * 1.05;
          const normalizedFee = Math.max(5000, Math.ceil(safeOneWayFee / 5000) * 5000);

          quotes = [
            {
              provider: "GHN",
              serviceId: "standard",
              name: isRental ? "Giao Tiêu Chuẩn GHN (San sẻ 50/50: Chiều đi)" : "Giao Tiêu Chuẩn GHN (1 Chiều)",
              fee: normalizedFee,
              originalFee: normalizedFee + 10000,
              discount: 10000,
              estimatedDays,
              expectedDeliveryDate,
              expectedDeliveryRange,
              leadtimeTimestamp,
              deliverySource: "GHN_GATEWAY",
              packagingNote: isRental 
                ? `Cần đồ nhanh (1-2 ngày). Cước chiều đi (${normalizedFee.toLocaleString('vi-VN')}đ). Chiều trả về miễn phí 0đ` 
                : "Bưu tá GHN đến lấy và giao nhanh tận nơi"
            },
            {
              provider: "DIRECT",
              serviceId: "direct_pickup",
              name: "Tự Giao Nhận Trực Tiếp (Hẹn gặp linh hoạt)",
              fee: 0,
              originalFee: 0,
              discount: 0,
              estimatedDays: 0,
              expectedDeliveryDate: "Trong ngày",
              expectedDeliveryRange: "Trong ngày",
              deliverySource: "GHN_GATEWAY",
              packagingNote: "Hai bên tự hẹn gặp trao đổi và gửi trả đồ trực tiếp (Miễn phí 0đ)"
            }
          ];
        }
      } catch (ghnErr) {
        console.warn("⚠️ [GHN Fee Warning]:", ghnErr);
      }
    }

    // 2. NẾU CHƯA CÓ QUOTES TỪ GHN GATEWAY -> CHẠY ĐỘNG CƠ CƯỚC GHN ĐỘNG THEO APP & BLOCK 5K
    if (quotes.length === 0) {
      quotes = await getShippingQuotes(fromProvince, toProvince, weight, isRental);
    }

    // Ký (Sign) từng báo giá để trả về cho Frontend
    const signedQuotes = quotes.map(quote => signShippingQuote(quote, fromProvince, toProvince, weight));

    return NextResponse.json({ success: true, options: signedQuotes }, { status: 200 });

  } catch (error: any) {
    console.error("Lỗi tính phí ship:", error);
    return NextResponse.json({ error: "Không thể tính phí vận chuyển lúc này", details: error?.message }, { status: 500 });
  }
}
