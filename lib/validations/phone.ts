/**
 * 🛡️ BỘ LỌC & CHUẨN HÓA SỐ ĐIỆN THOẠI VIỆT NAM (VIETNAM TELECOM ANTI-FRAUD FILTER)
 * Tuân thủ quy chuẩn viễn thông Việt Nam (10 chữ số) & Luật Bảo vệ Dữ liệu Cá nhân số 91/2025/QH15.
 */

// Regex kiểm tra 10 chữ số với tất cả các đầu số di động hợp lệ tại Việt Nam:
// - Viettel: 032-039, 086, 096, 097, 098
// - VinaPhone: 081-085, 088, 091, 094
// - MobiFone: 070, 076, 077, 078, 079, 089, 090, 093
// - Vietnamobile: 052, 056, 058, 092
// - Wintel / I-Telecom / FPT: 055, 087, 0775
export const VIETNAM_PHONE_REGEX = /^(?:(?:\+84)|(?:84)|0)(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])([0-9]{7})$/;

/**
 * Làm sạch chuỗi số điện thoại: loại bỏ dấu cách, gạch nối, dấu chấm, ngoặc đơn
 */
export function cleanRawPhone(input?: string | null): string {
  if (!input) return "";
  return input.replace(/[\s.\-()]/g, "").trim();
}

/**
 * Chuẩn hóa số điện thoại về định dạng nội địa 10 số (bắt đầu bằng 0)
 * Ví dụ: "+84987654321" -> "0987654321", "84987654321" -> "0987654321"
 */
export function normalizeVietnamPhone(input?: string | null): string {
  const cleaned = cleanRawPhone(input);
  if (!cleaned) return "";

  if (cleaned.startsWith("+84")) {
    return "0" + cleaned.slice(3);
  }
  if (cleaned.startsWith("84") && cleaned.length === 11) {
    return "0" + cleaned.slice(2);
  }
  return cleaned;
}

/**
 * Kiểm tra xem chuỗi có phải là số điện thoại di động Việt Nam hợp lệ hay không
 */
export function isValidVietnamPhone(input?: string | null): boolean {
  const normalized = normalizeVietnamPhone(input);
  return VIETNAM_PHONE_REGEX.test(normalized) && normalized.length === 10;
}

/**
 * Che dấu số điện thoại để hiển thị công khai (Masking theo Luật 91/2025/QH15)
 * Ví dụ: "0987654321" -> "098***4321"
 */
export function maskPhoneNumber(input?: string | null): string {
  const normalized = normalizeVietnamPhone(input);
  if (!normalized || normalized.length < 10) {
    return "Chưa cập nhật";
  }
  const prefix = normalized.slice(0, 3);
  const suffix = normalized.slice(-4);
  return `${prefix}***${suffix}`;
}

export interface CarrierInfo {
  name: string;
  shortName: string;
  badgeColor: string;
}

/**
 * Nhận diện nhà mạng viễn thông từ đầu số
 */
export function getVietnamCarrier(input?: string | null): CarrierInfo {
  const phone = normalizeVietnamPhone(input);
  if (!phone || phone.length < 3) {
    return { name: "Chưa xác định", shortName: "UNKNOWN", badgeColor: "bg-stone-100 text-stone-600" };
  }

  const prefix3 = phone.slice(0, 3);

  // Viettel: 032-039, 086, 096, 097, 098
  if (
    ["032", "033", "034", "035", "036", "037", "038", "039", "086", "096", "097", "098"].includes(prefix3)
  ) {
    return { name: "Viettel Telecom", shortName: "VIETTEL", badgeColor: "bg-red-50 text-red-700 border-red-200" };
  }

  // VinaPhone: 081-085, 088, 091, 094
  if (
    ["081", "082", "083", "084", "085", "088", "091", "094"].includes(prefix3)
  ) {
    return { name: "VNPT VinaPhone", shortName: "VINAPHONE", badgeColor: "bg-blue-50 text-blue-700 border-blue-200" };
  }

  // MobiFone: 070, 076, 077, 078, 079, 089, 090, 093
  if (
    ["070", "076", "077", "078", "079", "089", "090", "093"].includes(prefix3)
  ) {
    return { name: "MobiFone", shortName: "MOBIFONE", badgeColor: "bg-sky-50 text-sky-700 border-sky-200" };
  }

  // Vietnamobile: 052, 056, 058, 092
  if (["052", "056", "058", "092"].includes(prefix3)) {
    return { name: "Vietnamobile", shortName: "VNMOBILE", badgeColor: "bg-orange-50 text-orange-700 border-orange-200" };
  }

  // Wintel / FPT / I-Telecom: 055, 087
  if (["055", "087"].includes(prefix3)) {
    return { name: "Wintel / I-Telecom", shortName: "MVNO", badgeColor: "bg-purple-50 text-purple-700 border-purple-200" };
  }

  return { name: "Di động Việt Nam", shortName: "VN-TEL", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200" };
}
