/**
 * DANH MỤC 34 TỈNH THÀNH CHUẨN HÓA VIỆT NAM (THEO QUY HOẠCH SÁP NHẬP HÀNH CHÍNH)
 * Dùng cho quản trị quyền riêng tư (Privacy by Design - Luật 91/2025/QH15)
 * và chuẩn hóa định vị tính cước giao vận thông minh GHN/GHTK.
 */

export interface ProvinceItem {
  id: number;
  name: string;
  mergerNote?: string;
  region: "NORTH" | "CENTRAL" | "SOUTH";
}

export const VIETNAM_34_PROVINCES: ProvinceItem[] = [
  { id: 1, name: "TP Hà Nội", region: "NORTH" },
  { id: 2, name: "TP Huế", region: "CENTRAL" },
  { id: 3, name: "Quảng Ninh", region: "NORTH" },
  { id: 4, name: "Cao Bằng", region: "NORTH" },
  { id: 5, name: "Lạng Sơn", region: "NORTH" },
  { id: 6, name: "Lai Châu", region: "NORTH" },
  { id: 7, name: "Điện Biên", region: "NORTH" },
  { id: 8, name: "Sơn La", region: "NORTH" },
  { id: 9, name: "Thanh Hóa", region: "NORTH" },
  { id: 10, name: "Nghệ An", region: "CENTRAL" },
  { id: 11, name: "Hà Tĩnh", region: "CENTRAL" },
  { id: 12, name: "Tuyên Quang", mergerNote: "Sáp nhập Hà Giang và Tuyên Quang", region: "NORTH" },
  { id: 13, name: "Lào Cai", mergerNote: "Sáp nhập Lào Cai và Yên Bái", region: "NORTH" },
  { id: 14, name: "Thái Nguyên", mergerNote: "Sáp nhập Thái Nguyên và Bắc Kạn", region: "NORTH" },
  { id: 15, name: "Phú Thọ", mergerNote: "Sáp nhập Hòa Bình, Vĩnh Phúc, Phú Thọ", region: "NORTH" },
  { id: 16, name: "Bắc Ninh", mergerNote: "Sáp nhập Bắc Ninh và Bắc Giang", region: "NORTH" },
  { id: 17, name: "Hưng Yên", mergerNote: "Sáp nhập Hưng Yên và Thái Bình", region: "NORTH" },
  { id: 18, name: "TP Hải Phòng", mergerNote: "Sáp nhập TP Hải Phòng và Hải Dương", region: "NORTH" },
  { id: 19, name: "Ninh Bình", mergerNote: "Sáp nhập Hà Nam, Nam Định và tỉnh Ninh Bình", region: "NORTH" },
  { id: 20, name: "Quảng Trị", mergerNote: "Sáp nhập Quảng Bình và Quảng Trị", region: "CENTRAL" },
  { id: 21, name: "TP Đà Nẵng", mergerNote: "Sáp nhập Quảng Nam và TP Đà Nẵng", region: "CENTRAL" },
  { id: 22, name: "Quảng Ngãi", mergerNote: "Sáp nhập Kon Tum và Quảng Ngãi", region: "CENTRAL" },
  { id: 23, name: "Gia Lai", mergerNote: "Sáp nhập Gia Lai và Bình Định", region: "CENTRAL" },
  { id: 24, name: "Khánh Hòa", mergerNote: "Sáp nhập Ninh Thuận và Khánh Hòa", region: "CENTRAL" },
  { id: 25, name: "Lâm Đồng", mergerNote: "Sáp nhập Đắk Nông, Bình Thuận và Lâm Đồng", region: "CENTRAL" },
  { id: 26, name: "Đắk Lắk", mergerNote: "Sáp nhập Phú Yên và Đắk Lắk", region: "CENTRAL" },
  { id: 27, name: "TPHCM", mergerNote: "Sáp nhập Bà Rịa - Vũng Tàu, Bình Dương và TPHCM", region: "SOUTH" },
  { id: 28, name: "Đồng Nai", mergerNote: "Sáp nhập Bình Phước và Đồng Nai", region: "SOUTH" },
  { id: 29, name: "Tây Ninh", mergerNote: "Sáp nhập Tây Ninh và Long An", region: "SOUTH" },
  { id: 30, name: "TP Cần Thơ", mergerNote: "Sáp nhập Sóc Trăng, Hậu Giang và TP Cần Thơ", region: "SOUTH" },
  { id: 31, name: "Vĩnh Long", mergerNote: "Sáp nhập Bến Tre, Vĩnh Long và Trà Vinh", region: "SOUTH" },
  { id: 32, name: "Đồng Tháp", mergerNote: "Sáp nhập Tiền Giang và Đồng Tháp", region: "SOUTH" },
  { id: 33, name: "Cà Mau", mergerNote: "Sáp nhập Bạc Liêu và Cà Mau", region: "SOUTH" },
  { id: 34, name: "An Giang", mergerNote: "Sáp nhập Kiên Giang và An Giang", region: "SOUTH" },
];

/**
 * Chuẩn hóa input tự do (ví dụ "Hưng Lĩnh, Việt Nam", "hà nội", "Sài Gòn")
 * về tên 1 trong 34 Tỉnh/Thành phố chuẩn
 */
export function normalizeProvince(input?: string | null): string {
  if (!input) return "Nghệ An";
  const raw = input.toLowerCase().trim();

  // Kiểm tra so khớp trực tiếp theo tên
  for (const prov of VIETNAM_34_PROVINCES) {
    const provLower = prov.name.toLowerCase();
    if (raw.includes(provLower) || provLower.includes(raw)) {
      return prov.name;
    }
  }

  // So khớp địa danh cũ / từ khóa phổ biến sang tỉnh mới
  if (raw.includes("hưng lĩnh") || raw.includes("vinh") || raw.includes("nghệ an") || raw.includes("cửa lò") || raw.includes("nam đàn") || raw.includes("hưng nguyên")) {
    return "Nghệ An";
  }
  if (raw.includes("hà nội") || raw.includes("ha noi")) {
    return "TP Hà Nội";
  }
  if (raw.includes("hồ chí minh") || raw.includes("hcm") || raw.includes("sài gòn") || raw.includes("bình dương") || raw.includes("vũng tàu") || raw.includes("bà rịa")) {
    return "TPHCM";
  }
  if (raw.includes("đà nẵng") || raw.includes("quảng nam") || raw.includes("hội an")) {
    return "TP Đà Nẵng";
  }
  if (raw.includes("huế") || raw.includes("thừa thiên")) {
    return "TP Huế";
  }
  if (raw.includes("hải phòng") || raw.includes("hải dương")) {
    return "TP Hải Phòng";
  }
  if (raw.includes("hà nam") || raw.includes("nam định") || raw.includes("ninh bình")) {
    return "Ninh Bình";
  }
  if (raw.includes("thái bình") || raw.includes("hưng yên")) {
    return "Hưng Yên";
  }
  if (raw.includes("bắc giang") || raw.includes("bắc ninh")) {
    return "Bắc Ninh";
  }
  if (raw.includes("hòa bình") || raw.includes("vĩnh phúc") || raw.includes("phú thọ")) {
    return "Phú Thọ";
  }
  if (raw.includes("hà giang") || raw.includes("tuyên quang")) {
    return "Tuyên Quang";
  }
  if (raw.includes("yên bái") || raw.includes("lào cai") || raw.includes("sa pa")) {
    return "Lào Cai";
  }
  if (raw.includes("bắc kạn") || raw.includes("thái nguyên")) {
    return "Thái Nguyên";
  }
  if (raw.includes("quảng bình") || raw.includes("quảng trị") || raw.includes("đông hà")) {
    return "Quảng Trị";
  }
  if (raw.includes("kon tum") || raw.includes("quảng ngãi")) {
    return "Quảng Ngãi";
  }
  if (raw.includes("bình định") || raw.includes("quy nhơn") || raw.includes("gia lai") || raw.includes("pleiku")) {
    return "Gia Lai";
  }
  if (raw.includes("ninh thuận") || raw.includes("khánh hòa") || raw.includes("nha trang") || raw.includes("phan rang")) {
    return "Khánh Hòa";
  }
  if (raw.includes("đắk nông") || raw.includes("bình thuận") || raw.includes("phan thiết") || raw.includes("lâm đồng") || raw.includes("đà lạt")) {
    return "Lâm Đồng";
  }
  if (raw.includes("phú yên") || raw.includes("tuy hòa") || raw.includes("đắk lắk") || raw.includes("buôn ma thuột")) {
    return "Đắk Lắk";
  }
  if (raw.includes("bình phước") || raw.includes("đồng nai") || raw.includes("biên hòa")) {
    return "Đồng Nai";
  }
  if (raw.includes("long an") || raw.includes("tân an") || raw.includes("tây ninh")) {
    return "Tây Ninh";
  }
  if (raw.includes("sóc trăng") || raw.includes("hậu giang") || raw.includes("cần thơ")) {
    return "TP Cần Thơ";
  }
  if (raw.includes("bến tre") || raw.includes("trà vinh") || raw.includes("vĩnh long")) {
    return "Vĩnh Long";
  }
  if (raw.includes("tiền giang") || raw.includes("mỹ tho") || raw.includes("đồng tháp") || raw.includes("cao lãnh")) {
    return "Đồng Tháp";
  }
  if (raw.includes("bạc liêu") || raw.includes("cà mau")) {
    return "Cà Mau";
  }
  if (raw.includes("kiên giang") || raw.includes("phú quốc") || raw.includes("an giang") || raw.includes("long xuyên") || raw.includes("châu đốc")) {
    return "An Giang";
  }

  return "Nghệ An";
}

/**
 * Tạo mã ký hiệu Clooper ID cố định, duy nhất dựa trên User UUID.
 * Ví dụ: CLOOP-6E27DB
 */
export function formatClooperCode(userId?: string | null): string {
  if (!userId) return "CLOOP-MEMBER";
  const cleanId = userId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const suffix = cleanId.length >= 6 ? cleanId.slice(-6) : cleanId.padEnd(6, "0");
  return `CLOOP-${suffix}`;
}

/**
 * Chuẩn hóa tên tài khoản username (chỉ cho phép a-z, 0-9, dấu gạch dưới và dấu chấm)
 */
export function formatCleanUsername(input?: string | null): string {
  if (!input) return "clooper";
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Bỏ dấu tiếng Việt
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9_.]/g, "") // Chỉ giữ a-z, 0-9, _, .
    .slice(0, 30);
}
