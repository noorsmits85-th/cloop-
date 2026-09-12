/**
 * 🔒 CLOOP DATA PRIVACY BY DESIGN MODULE
 * Tuân thủ Luật Bảo vệ Dữ liệu Cá nhân số 91/2025/QH15 (hiệu lực từ 01/01/2026)
 * và Nghị định 356/2025/NĐ-CP hướng dẫn thi hành.
 * 
 * Nguyên tắc cốt lõi: "Collect less → Verify smarter"
 * Không lưu trữ dữ liệu sinh trắc học / ảnh giấy tờ tùy thân bừa bãi.
 */

export type DataClassificationLevel = 
  | "PUBLIC"              // Cấp 1: Thông tin công khai (Tên hiển thị, Tủ đồ, Đánh giá, Story)
  | "ACCOUNT"             // Cấp 2: Thông tin tài khoản (Email, SĐT, User ID - Phục vụ đăng nhập)
  | "TRANSACTION"         // Cấp 3: Dữ liệu giao dịch (Giá thuê, Tiền cọc, Địa chỉ giao hàng, Mã vận đơn)
  | "SENSITIVE_IDENTITY"  // Cấp 4: Dữ liệu định danh nhạy cảm (Xác thực email sinh viên @edu.vn)
  | "EVIDENCE";           // Cấp 5: Bằng chứng giao dịch (Video niêm phong, Video unboxing, Timeline tranh chấp)

export interface DataCategoryPolicy {
  level: DataClassificationLevel;
  description: string;
  retentionPeriodMonths: number;
  accessControl: "PUBLIC" | "USER_ONLY" | "COUNTERPART_LIMITED" | "ADMIN_AUDIT";
  encryptionRequired: boolean;
  legalBasis: string;
}

export const DATA_PRIVACY_POLICIES: Record<DataClassificationLevel, DataCategoryPolicy> = {
  PUBLIC: {
    level: "PUBLIC",
    description: "Thông tin hồ sơ công khai, sản phẩm và đánh giá giao dịch",
    retentionPeriodMonths: 60,
    accessControl: "PUBLIC",
    encryptionRequired: false,
    legalBasis: "Sự đồng ý của chủ thể dữ liệu (Điều 11 Luật 91/2025/QH15)",
  },
  ACCOUNT: {
    level: "ACCOUNT",
    description: "Thông tin xác thực tài khoản và liên lạc cơ bản",
    retentionPeriodMonths: 36,
    accessControl: "USER_ONLY",
    encryptionRequired: true,
    legalBasis: "Thực hiện hợp đồng cung cấp dịch vụ nền tảng",
  },
  TRANSACTION: {
    level: "TRANSACTION",
    description: "Chứng từ kế toán, trạng thái thanh toán và địa chỉ giao hàng",
    retentionPeriodMonths: 60, // Theo Luật Kế toán và Nghị định 52/2024
    accessControl: "COUNTERPART_LIMITED",
    encryptionRequired: true,
    legalBasis: "Nghĩa vụ pháp lý theo Luật Kế toán & Nghị định 52/2024/NĐ-CP",
  },
  SENSITIVE_IDENTITY: {
    level: "SENSITIVE_IDENTITY",
    description: "Chứng thực quyền sở hữu email trường học (@edu.vn) và cấp độ tín nhiệm",
    retentionPeriodMonths: 12, // Tối thiểu hóa thời gian lưu trữ
    accessControl: "ADMIN_AUDIT",
    encryptionRequired: true,
    legalBasis: "Đánh giá rủi ro giao dịch (Điều 17 Luật 91/2025/QH15)",
  },
  EVIDENCE: {
    level: "EVIDENCE",
    description: "Video niêm phong, unboxing và nhật ký đối soát hư hại",
    retentionPeriodMonths: 6, // Xóa sau 6 tháng kể từ khi hoàn tất đơn không tranh chấp
    accessControl: "ADMIN_AUDIT",
    encryptionRequired: true,
    legalBasis: "Giải quyết khiếu nại, tranh chấp theo Bộ luật Dân sự",
  },
};

/**
 * Ẩn thông tin số điện thoại khi hiển thị trên giao diện công cộng
 * Ví dụ: 0912345678 -> 091****678
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[\s.-]+/g, "");
  if (cleaned.length < 8) return "******";
  return cleaned.substring(0, 3) + "****" + cleaned.substring(cleaned.length - 3);
}

/**
 * Ẩn thông tin email
 * Ví dụ: nguyenvana@gmail.com -> n***a@gmail.com
 */
export function maskEmail(email?: string | null): string {
  if (!email || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Sinh metadata kiểm toán bảo mật dữ liệu cho Audit Log
 */
export function createDataPrivacyAuditRecord(
  action: string,
  level: DataClassificationLevel,
  userId: string,
  details: Record<string, any>
) {
  return {
    privacyStandard: "LAW_91_2025_QH15",
    decree: "ND_356_2025_ND_CP",
    action,
    dataLevel: level,
    userId,
    timestamp: new Date().toISOString(),
    retentionUntil: new Date(
      Date.now() + DATA_PRIVACY_POLICIES[level].retentionPeriodMonths * 30 * 24 * 60 * 60 * 1000
    ).toISOString(),
    details,
  };
}
