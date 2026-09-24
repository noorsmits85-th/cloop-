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

// BẢN ĐỒ CHUYỂN ĐỔI MÃ QUẬN HUYỆN TỪ MOCK SANG MÃ CHÍNH THỨC CỦA GHN GATEWAY
const MOCK_TO_GHN_DISTRICT_MAP: Record<number, number> = {
  // Hà Nội
  20101: 1482, // Hoàn Kiếm
  20102: 1484, // Ba Đình
  20103: 1486, // Đống Đa
  20104: 1483, // Hai Bà Trưng
  20105: 1485, // Cầu Giấy
  20106: 1488, // Tây Hồ
  20107: 1490, // Thanh Xuân
  20108: 1489, // Hoàng Mai
  20109: 1491, // Long Biên
  20110: 1493, // Nam Từ Liêm
  20111: 1492, // Bắc Từ Liêm
  20112: 1494, // Hà Đông
  // TP. Hồ Chí Minh
  20201: 1442, // Quận 1
  20202: 1444, // Quận 3
  20203: 1446, // Quận 4
  20204: 1443, // Quận 5
  20205: 1450, // Quận 6
  20206: 1452, // Quận 7
  20207: 1453, // Quận 8
  20208: 1448, // Quận 10
  20209: 1451, // Quận 11
  20210: 1454, // Quận 12
  20211: 1449, // TP Thủ Đức
  20212: 1447, // Bình Thạnh
  20213: 1456, // Gò Vấp
  20214: 1455, // Phú Nhuận
  20215: 1445, // Tân Bình
  20216: 1457, // Tân Phú
  20217: 1458, // Bình Tân
  // Đà Nẵng
  20301: 1530, // Hải Châu
  20302: 1531, // Thanh Khê
  20303: 1532, // Sơn Trà
  20304: 1533, // Ngũ Hành Sơn
  20305: 1534, // Liên Chiểu
  20306: 1535, // Cẩm Lệ
  // Nghệ An
  20601: 1536, // TP Vinh
  20602: 1572, // TX Cửa Lò
  20605: 1570, // Diễn Châu
  20606: 1571, // Quỳnh Lưu
  20609: 1568, // Nghi Lộc
  20610: 1569, // Nam Đàn
  // Thanh Hóa
  20701: 1538, // TP Thanh Hóa
  20702: 1576, // Sầm Sơn
  // Hà Tĩnh
  20801: 1539, // TP Hà Tĩnh
  // Thừa Thiên Huế
  20901: 1560, // TP Huế
};

// ĐỊNH TUYẾN MẶC ĐỊNH CHO TỪNG TỈNH KHI THIẾU MÃ QUẬN HUYỆN (TRÁNH BỊ ÉP VỀ HÀ NỘI)
const PROVINCE_DEFAULT_DISTRICT_MAP: Record<string, { districtId: number; wardCode: string }> = {
  "hà nội": { districtId: 1484, wardCode: "1A0101" }, // Ba Đình
  "hồ chí minh": { districtId: 1442, wardCode: "20101" }, // Quận 1
  "sài gòn": { districtId: 1442, wardCode: "20101" }, // Quận 1
  "tp. hồ chí minh": { districtId: 1442, wardCode: "20101" }, // Quận 1
  "đà nẵng": { districtId: 1530, wardCode: "040101" }, // Hải Châu
  "hải phòng": { districtId: 1542, wardCode: "020101" }, // Hồng Bàng
  "cần thơ": { districtId: 1552, wardCode: "550101" }, // Ninh Kiều
  "nghệ an": { districtId: 1536, wardCode: "290101" }, // TP Vinh
  "thanh hóa": { districtId: 1538, wardCode: "280101" }, // TP Thanh Hóa
  "hà tĩnh": { districtId: 1539, wardCode: "300101" }, // TP Hà Tĩnh
  "thừa thiên huế": { districtId: 1560, wardCode: "330101" }, // TP Huế
  "huế": { districtId: 1560, wardCode: "330101" }, // TP Huế
  "quảng ninh": { districtId: 1545, wardCode: "140101" }, // Hạ Long
  "bắc ninh": { districtId: 1544, wardCode: "180101" }, // TP Bắc Ninh
  "hải dương": { districtId: 1546, wardCode: "190101" }, // TP Hải Dương
  "bình dương": { districtId: 1537, wardCode: "460101" }, // Thủ Dầu Một
  "đồng nai": { districtId: 1547, wardCode: "480101" }, // Biên Hòa
  "khánh hòa": { districtId: 1549, wardCode: "370101" }, // Nha Trang
  "nha trang": { districtId: 1549, wardCode: "370101" }, // Nha Trang
  "lâm đồng": { districtId: 1548, wardCode: "420101" }, // Đà Lạt
  "đà lạt": { districtId: 1548, wardCode: "420101" }, // Đà Lạt
};

function resolveDistrictAndWard(
  districtId: string | number | null | undefined,
  wardCode: string | null | undefined,
  province: string
): { districtId: number; wardCode?: string } {
  let dId = districtId ? Number(districtId) : 0;
  if (dId && MOCK_TO_GHN_DISTRICT_MAP[dId]) {
    dId = MOCK_TO_GHN_DISTRICT_MAP[dId];
  }
  
  if (dId > 0 && dId < 10000) {
    return { districtId: dId, wardCode: wardCode || undefined };
  }

  // Nếu không có districtId hoặc là mã không hợp lệ, tra cứu theo Tỉnh / Thành
  const normProv = (province || "").toLowerCase();
  for (const [key, mapping] of Object.entries(PROVINCE_DEFAULT_DISTRICT_MAP)) {
    if (normProv.includes(key)) {
      return { districtId: mapping.districtId, wardCode: wardCode || mapping.wardCode };
    }
  }

  // Mặc định an toàn: Kho trung tâm Ba Đình, Hà Nội
  return { districtId: 1484, wardCode: wardCode || "1A0101" };
}

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

    // 1. NẾU CÓ TOKEN GHN -> ĐỊNH TUYẾN CHÍNH XÁC VÀ GỌI GHN GATEWAY
    if (GHN_TOKEN) {
      try {
        const { districtId: fromDistrict, wardCode: fromWard } = resolveDistrictAndWard(fromDistrictId, fromWardCode, fromProvince);
        const { districtId: toDistrict, wardCode: toWard } = resolveDistrictAndWard(toDistrictId, toWardCode, toProvince);

        // Tự động xác định service_id tối ưu từ GHN available-services cho tuyến đường này
        let selectedServiceId: number = 53321;
        let selectedServiceTypeId: number = 2;
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
              if (lightService) {
                selectedServiceId = lightService.service_id;
                selectedServiceTypeId = 2;
              } else {
                selectedServiceId = availData.data[0].service_id;
                selectedServiceTypeId = availData.data[0].service_type_id || 2;
              }
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
              service_id: selectedServiceId,
              service_type_id: selectedServiceTypeId
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
        let expectedDeliveryISODate: string | undefined;
        let leadtimeTimestamp: number | undefined;
        let estimatedDays = 2;

        // Hàm tính khoảng cách số ngày lịch chuẩn theo múi giờ Việt Nam (Asia/Ho_Chi_Minh - UTC+7)
        const getCalendarDaysDiffVN = (targetDate: Date): number => {
          const formatter = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Ho_Chi_Minh",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
          const nowVN = formatter.format(new Date());
          const targetVN = formatter.format(targetDate);
          const nowTime = new Date(`${nowVN}T00:00:00+07:00`).getTime();
          const targetTime = new Date(`${targetVN}T00:00:00+07:00`).getTime();
          const diffDays = Math.round((targetTime - nowTime) / (1000 * 60 * 60 * 24));
          return Math.max(1, diffDays);
        };

        if (leadtimeData?.code === 200 && leadtimeData.data) {
          const lt = leadtimeData.data;
          leadtimeTimestamp = lt.leadtime || undefined;

          const formatDateStr = (d: Date) => {
            const formatter = new Intl.DateTimeFormat("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            });
            return formatter.format(d);
          };

          if (lt.leadtime_order?.from_estimate_date && lt.leadtime_order?.to_estimate_date) {
            const fromD = new Date(lt.leadtime_order.from_estimate_date);
            const toD = new Date(lt.leadtime_order.to_estimate_date);
            expectedDeliveryDate = formatDateStr(toD);
            expectedDeliveryRange = `${formatDateStr(fromD)} - ${formatDateStr(toD)}`;
            expectedDeliveryISODate = toD.toISOString();
            estimatedDays = getCalendarDaysDiffVN(toD);
          } else if (lt.leadtime) {
            const d = new Date(lt.leadtime * 1000);
            expectedDeliveryDate = formatDateStr(d);
            expectedDeliveryRange = formatDateStr(d);
            expectedDeliveryISODate = d.toISOString();
            estimatedDays = getCalendarDaysDiffVN(d);
          }
        }
        
        if (data.code === 200 && data.data?.total) {
          const rawOneWayFee = data.data.total;
          // Áp dụng 5% buffer an toàn và nâng lên Block 5K
          const safeOneWayFee = rawOneWayFee * 1.05;
          let normalizedFee = Math.max(5000, Math.ceil(safeOneWayFee / 5000) * 5000);

          // 🛡️ BẢO VỆ CHỐNG TÍNH SAI CƯỚC NỘI TỈNH:
          // Nếu cả điểm gửi và nhận cùng thuộc 1 tỉnh/thành (VD: cùng Nghệ An, cùng Hà Nội, cùng TP.HCM)
          // thì cước GHN thực tế không bao giờ vượt quá 25.000đ (chuẩn nội tỉnh GHN 16.5k - 22k)
          const normFrom = (fromProvince || "").trim().toLowerCase();
          const normTo = (toProvince || "").trim().toLowerCase();
          const isSameProv = normFrom.length > 2 && (normTo.includes(normFrom) || normFrom.includes(normTo));
          if (isSameProv && normalizedFee > 25000) {
            normalizedFee = 25000;
          }

          quotes = [
            {
              provider: "GHN",
              serviceId: "standard",
              name: "Giao Hàng Tiêu Chuẩn (Tận nơi)",
              fee: normalizedFee,
              originalFee: normalizedFee + 10000,
              discount: 10000,
              estimatedDays,
              expectedDeliveryDate,
              expectedDeliveryRange,
              expectedDeliveryISODate,
              leadtimeTimestamp,
              deliverySource: "GHN_GATEWAY",
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
              deliverySource: "GHN_GATEWAY",
              packagingNote: "Hai bên hẹn gặp trao đổi và bàn giao trực tiếp (Miễn phí)"
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
