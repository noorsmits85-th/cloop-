import { NextResponse } from "next/server";

const GHN_API_URL = "https://dev-online-gateway.ghn.vn/shiip/public-api/master-data";
const GHN_TOKEN = process.env.GHN_API_TOKEN;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // province, district, ward
  const province_id = searchParams.get("province_id");
  const district_id = searchParams.get("district_id");

  // XỬ LÝ MOCK DATA (Khi chưa có Token GHN)
  if (!GHN_TOKEN) {
    if (type === "province") {
      // Cập nhật theo Nghị quyết 125/NQ-CP năm 2025: 34 Tỉnh/Thành phố mới
      const newProvinces = [
        "Hà Nội", "Hải Phòng", "Huế", "Đà Nẵng", "Cần Thơ", "TPHCM",
        "Lai Châu", "Điện Biên", "Sơn La", "Lạng Sơn", "Cao Bằng", "Tuyên Quang", "Lào Cai", 
        "Thái Nguyên", "Phú Thọ", "Bắc Ninh", "Hưng Yên", "Ninh Bình", "Quảng Ninh", 
        "Thanh Hóa", "Nghệ An", "Hà Tĩnh", "Quảng Trị", "Quảng Ngãi", "Gia Lai", 
        "Khánh Hòa", "Lâm Đồng", "Đắk Lắk", "Đồng Nai", "Tây Ninh", "Vĩnh Long", 
        "Đồng Tháp", "Cà Mau", "An Giang"
      ];
      
      const provinceData = newProvinces.map((name, index) => ({
        ProvinceID: 201 + index,
        ProvinceName: name
      }));

      return NextResponse.json({
        code: 200,
        data: provinceData
      });
    }
    if (type === "district") {
      // 201 = Hà Nội
      if (province_id === "201") return NextResponse.json({ code: 200, data: [{ DistrictID: 1442, DistrictName: "Quận Hoàn Kiếm" }, { DistrictID: 1443, DistrictName: "Quận Ba Đình" }, { DistrictID: 1444, DistrictName: "Huyện Ba Vì" }] });
      // 206 = TPHCM
      if (province_id === "206") return NextResponse.json({ code: 200, data: [{ DistrictID: 1445, DistrictName: "Quận 1" }, { DistrictID: 1446, DistrictName: "Quận 3" }, { DistrictID: 1447, DistrictName: "Huyện Cần Giờ" }] });
      return NextResponse.json({ code: 200, data: [] });
    }
    if (type === "ward") {
      if (district_id === "1442") return NextResponse.json({ code: 200, data: [{ WardCode: "20101", WardName: "Phường Hàng Bạc" }, { WardCode: "20102", WardName: "Phường Hàng Gai" }] });
      if (district_id === "1445") return NextResponse.json({ code: 200, data: [{ WardCode: "20103", WardName: "Phường Bến Nghé" }, { WardCode: "20104", WardName: "Phường Bến Thành" }] });
      return NextResponse.json({ code: 200, data: [{ WardCode: "9999", WardName: "Phường/Xã Mock" }] });
    }
  }

  // GỌI GHN API THẬT
  try {
    let endpoint = "";
    if (type === "province") {
      endpoint = `${GHN_API_URL}/province`;
    } else if (type === "district") {
      endpoint = `${GHN_API_URL}/district?province_id=${province_id}`;
    } else if (type === "ward") {
      endpoint = `${GHN_API_URL}/ward?district_id=${district_id}`;
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Token": GHN_TOKEN,
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) {
      console.error("GHN API Error:", res.statusText);
      return NextResponse.json({ error: "Lỗi kết nối GHN API" }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Lỗi get address:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
