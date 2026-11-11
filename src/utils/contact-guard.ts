/**
 * 🛡️ BỘ CHẶN GIAO DỊCH NGOÀI SÀN & BẢO VỆ DỮ LIỆU LIÊN HỆ (ANTI-DISINTERMEDIATION GUARD)
 * Phát hiện và ẩn toàn bộ số điện thoại, email, liên kết ngoài, tài khoản mạng xã hội (Zalo, FB, IG, Telegram, TikTok)
 * và các cụm từ gạ gẫm giao dịch trực tiếp ngoài hệ thống CLOOP.
 */

const ZERO_WIDTH_REGEX = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;

function normalizeForContactDetection(raw: string): string {
  return raw
    .replace(ZERO_WIDTH_REGEX, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

// Bắt số điện thoại Việt Nam (03, 05, 07, 08, 09, +84, 84) kể cả khi chèn dấu chấm, gạch ngang, khoảng trắng
const PHONE_PATTERN =
  /(?:(?:\+?84|0)[\s._\-()\/]*[35789](?:[\s._\-()\/]*\d){8})\b/g;

// Chuỗi 9-11 chữ số liên tiếp hoặc cách nhau bởi ký tự ngắt
const GENERIC_DIGIT_RUN_PATTERN =
  /\b0\d(?:[\s._\-]*\d){8,9}\b/g;

// Chuỗi đọc số bằng chữ tiếng Việt (8-11 âm tiết số liên tiếp: khong chin mot hai ba bon nam sau bay tam)
const VIETNAMESE_SPOKEN_DIGITS_PATTERN =
  /\b(?:(?:khong|mot|hai|ba|bon|tu|nam|lam|sau|bay|tam|chin)\s*[\s._\-()\/]*){8,11}\b/i;

// Email (bao gồm cả dạng lách @ bằng (at), [at])
const EMAIL_PATTERN =
  /[a-zA-Z0-9._%+-]+\s*(?:@|\(at\)|\[at\])\s*[a-zA-Z0-9.-]+\s*(?:\.|\(dot\)|\[dot\])\s*[a-zA-Z]{2,}/gi;

// URL ngoài (trừ các miền lưu trữ media nội bộ hợp lệ)
const EXTERNAL_URL_PATTERN =
  /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;

const ALLOWED_MEDIA_HOSTS = [
  "res.cloudinary.com",
  "notxrjsuukrrxdlboavo.supabase.co",
  "storage.googleapis.com",
  "lh3.googleusercontent.com",
  "images.unsplash.com",
  "evidence.cloop.internal",
  "cloop.vn",
  "cloop-sable.vercel.app",
];

// Từ khóa lôi kéo liên hệ / giao dịch ngoài sàn (đã bỏ dấu qua normalizeForContactDetection)
const OFF_PLATFORM_KEYWORDS_NORMALIZED = [
  /\bz[\s._\-]*a[\s._\-]*l[\s._\-]*o\b/i,
  /\bzalo\.me\b/i,
  /\bt[\s._\-]*e[\s._\-]*l[\s._\-]*e[\s._\-]*g[\s._\-]*r[\s._\-]*a[\s._\-]*m\b/i,
  /\bt\.me\//i,
  /\bf[\s._\-]*a[\s._\-]*c[\s._\-]*e[\s._\-]*b[\s._\-]*o[\s._\-]*o[\s._\-]*k\b/i,
  /\bfb\.com\b/i,
  /\bi[\s._\-]*n[\s._\-]*s[\s._\-]*t[\s._\-]*a[\s._\-]*g[\s._\-]*r[\s._\-]*a[\s._\-]*m\b/i,
  /\b(?:ig|insta|zl|fb|tele)\s*[:=\-@]\s*[a-z0-9._]{3,}/i,
  /\b(?:thue\s+ngoai|giao\s+dich\s+ngoai|khong\s+qua\s+san|chuyen\s+khoan\s+rieng|ck\s+rieng|ck\s+truc\s+tiep|lien\s+he\s+rieng|ib\s+rieng|inbox\s+rieng|ket\s+ban\s+zalo|add\s+zalo)\b/i,
];

export function detectOffPlatformContact(raw?: string | null): {
  hasContact: boolean;
  reasons: string[];
} {
  if (!raw || typeof raw !== "string") {
    return { hasContact: false, reasons: [] };
  }

  const cleaned = raw.replace(ZERO_WIDTH_REGEX, "");
  const normalized = normalizeForContactDetection(cleaned);
  const reasons: string[] = [];

  if (
    PHONE_PATTERN.test(cleaned) ||
    GENERIC_DIGIT_RUN_PATTERN.test(cleaned) ||
    VIETNAMESE_SPOKEN_DIGITS_PATTERN.test(normalized)
  ) {
    reasons.push("PHONE_NUMBER");
  }
  PHONE_PATTERN.lastIndex = 0;
  GENERIC_DIGIT_RUN_PATTERN.lastIndex = 0;

  if (EMAIL_PATTERN.test(cleaned)) {
    reasons.push("EMAIL_ADDRESS");
  }
  EMAIL_PATTERN.lastIndex = 0;

  const urlMatches = cleaned.match(EXTERNAL_URL_PATTERN) || [];
  for (const u of urlMatches) {
    try {
      const parsed = new URL(u.startsWith("http") ? u : `https://${u}`);
      const host = parsed.hostname.toLowerCase();
      const isTrusted = ALLOWED_MEDIA_HOSTS.some(
        (d) => host === d || host.endsWith(`.${d}`)
      );
      if (!isTrusted) {
        reasons.push("EXTERNAL_LINK");
        break;
      }
    } catch {
      reasons.push("EXTERNAL_LINK");
      break;
    }
  }

  for (const kw of OFF_PLATFORM_KEYWORDS_NORMALIZED) {
    if (kw.test(normalized)) {
      reasons.push("OFF_PLATFORM_SOLICITATION");
      break;
    }
  }

  return {
    hasContact: reasons.length > 0,
    reasons,
  };
}

export function scrubOffPlatformContact(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "";

  let out = raw.replace(ZERO_WIDTH_REGEX, "");
  out = out.replace(EMAIL_PATTERN, "[Đã ẩn Email bảo mật]");
  out = out.replace(PHONE_PATTERN, "[Đã ẩn SĐT bảo mật]");
  out = out.replace(GENERIC_DIGIT_RUN_PATTERN, "[Đã ẩn SĐT bảo mật]");
  out = out.replace(EXTERNAL_URL_PATTERN, (match) => {
    try {
      const parsed = new URL(match.startsWith("http") ? match : `https://${match}`);
      const host = parsed.hostname.toLowerCase();
      const isTrusted = ALLOWED_MEDIA_HOSTS.some(
        (d) => host === d || host.endsWith(`.${d}`)
      );
      return isTrusted ? match : "[Đã ẩn liên kết ngoài]";
    } catch {
      return "[Đã ẩn liên kết ngoài]";
    }
  });

  // Thay thế các từ khóa gạ giao dịch ngoài sàn
  out = out.replace(
    /\b(z[\s._\-]*a[\s._\-]*l[\s._\-]*o|telegram|facebook|instagram|thuê\s+ngoài|thue\s+ngoai|giao\s+dịch\s+ngoài|giao\s+dich\s+ngoai|không\s+qua\s+sàn|khong\s+qua\s+san)\b/gi,
    "[Liên hệ qua CLOOP]"
  );

  return out;
}
