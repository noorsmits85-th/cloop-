import * as crypto from "crypto";

export type EvidenceStorageProvider = "gcs" | "drive" | "supabase_private";

export interface SealedEvidencePayload {
  provider: EvidenceStorageProvider;
  rentalId: string;
  uploaderId: string;
  objectRef: string;
  mimeType: string;
  sizeBytes: number;
  checksumOrGeneration: string;
}

function getEvidenceSealSecret(): string {
  const secret = (
    process.env.WALLET_SEAL_SECRET ||
    process.env.PAYOS_CHECKSUM_KEY ||
    process.env.SHIPPING_QUOTE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();

  if (!secret || secret === "cloop-wallet-rollover-hmac-v1") {
    throw new Error(
      "CRITICAL_SECURITY_ERROR: Missing HMAC secret in environment variables for dispute evidence seal"
    );
  }

  return secret;
}

export function signDisputeEvidenceSeal(payload: SealedEvidencePayload): string {
  const canonical = [
    payload.provider,
    payload.rentalId.trim(),
    payload.uploaderId.trim(),
    payload.objectRef.trim(),
    payload.mimeType.trim().toLowerCase(),
    String(Math.floor(payload.sizeBytes)),
    payload.checksumOrGeneration.trim(),
  ].join("|");

  return crypto
    .createHmac("sha256", getEvidenceSealSecret())
    .update(canonical)
    .digest("hex")
    .slice(0, 24);
}

/**
 * Mỏ neo toàn vẹn (integrity anchor) bắt buộc theo từng provider.
 * Định dạng: "key=value;key=value". Không chấp nhận giá trị dự phòng giả như "verified" hoặc fileId.
 *  - drive:            rev=<headRevisionId>;md5=<md5 hex 32>
 *  - gcs:              gen=<generation số>;md5=<md5 base64>
 *  - supabase_private: md5=<md5 hex 32>;sha256=<sha256 hex 64>
 */
export function parseEvidenceIntegrityAnchor(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of String(raw || "").split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim().toLowerCase();
    const v = part.slice(idx + 1).trim();
    if (k && v) out[k] = v;
  }
  return out;
}

export function isValidIntegrityAnchor(provider: EvidenceStorageProvider, raw: string): boolean {
  const a = parseEvidenceIntegrityAnchor(raw);
  if (provider === "drive") {
    return /^[A-Za-z0-9_-]{6,200}$/.test(a.rev || "") && /^[a-f0-9]{32}$/i.test(a.md5 || "");
  }
  if (provider === "gcs") {
    return /^\d{1,30}$/.test(a.gen || "") && /^[A-Za-z0-9+/]{22}==$/.test(a.md5 || "");
  }
  if (provider === "supabase_private") {
    return /^[a-f0-9]{32}$/i.test(a.md5 || "") && /^[a-f0-9]{64}$/i.test(a.sha256 || "");
  }
  return false;
}

/**
 * Tạo URI bằng chứng nội bộ đã được Server ký xác thực (không công khai, gắn chặt với rentalId & uploaderId).
 */
export function buildSealedDisputeEvidenceUrl(payload: SealedEvidencePayload): string {
  const cleanSize = Math.floor(Number(payload.sizeBytes));
  if (!Number.isFinite(cleanSize) || cleanSize <= 0) {
    throw new Error("Invalid evidence file size");
  }
  if (!isValidIntegrityAnchor(payload.provider, payload.checksumOrGeneration)) {
    throw new Error("Missing or invalid integrity anchor (revision/generation/checksum) for evidence seal");
  }
  const normalizedMime = payload.mimeType.trim().toLowerCase();
  const seal = signDisputeEvidenceSeal({
    ...payload,
    mimeType: normalizedMime,
    sizeBytes: cleanSize,
  });

  const params = new URLSearchParams({
    provider: payload.provider,
    rentalId: payload.rentalId.trim(),
    uploaderId: payload.uploaderId.trim(),
    ref: payload.objectRef.trim(),
    mime: normalizedMime,
    size: String(cleanSize),
    gen: payload.checksumOrGeneration.trim(),
    seal,
  });

  const mediaHash = normalizedMime.startsWith("video/") ? "#video" : "#image";
  return `https://evidence.cloop.internal/v1/object?${params.toString()}${mediaHash}`;
}

export function verifySealedDisputeEvidenceUrl(
  rawUrl: string,
  expected?: { rentalId?: string; uploaderId?: string; allowAdminUploader?: boolean }
): {
  valid: boolean;
  isVideo: boolean;
  payload?: SealedEvidencePayload;
  error?: string;
} {
  try {
    if (!rawUrl || typeof rawUrl !== "string") {
      return { valid: false, isVideo: false, error: "URL bằng chứng rỗng" };
    }

    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" || parsed.hostname !== "evidence.cloop.internal" || parsed.pathname !== "/v1/object") {
      return { valid: false, isVideo: false, error: "Bằng chứng không phải chứng từ đã được máy chủ CLOOP xác thực" };
    }

    const provider = (parsed.searchParams.get("provider") || "").trim() as EvidenceStorageProvider;
    const rentalId = (parsed.searchParams.get("rentalId") || "").trim();
    const uploaderId = (parsed.searchParams.get("uploaderId") || "").trim();
    const objectRef = (parsed.searchParams.get("ref") || "").trim();
    const mimeType = (parsed.searchParams.get("mime") || "").trim().toLowerCase();
    const sizeBytes = Math.floor(Number(parsed.searchParams.get("size") || "0"));
    const checksumOrGeneration = (parsed.searchParams.get("gen") || "").trim();
    const seal = (parsed.searchParams.get("seal") || "").trim().toLowerCase();

    if (
      !["gcs", "drive", "supabase_private"].includes(provider) ||
      !rentalId ||
      !uploaderId ||
      !objectRef ||
      !mimeType ||
      !Number.isFinite(sizeBytes) ||
      sizeBytes <= 0 ||
      !checksumOrGeneration ||
      !/^[a-f0-9]{24}$/.test(seal)
    ) {
      return { valid: false, isVideo: false, error: "Thiếu thông tin định danh hoặc chữ ký SEAL trên bằng chứng" };
    }

    if (!isValidIntegrityAnchor(provider, checksumOrGeneration)) {
      return { valid: false, isVideo: false, error: "Bằng chứng thiếu mỏ neo toàn vẹn (revision/generation/checksum) hợp lệ" };
    }

    const allowedMimes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ]);
    if (!allowedMimes.has(mimeType)) {
      return { valid: false, isVideo: false, error: "Định dạng MIME của bằng chứng không được phép" };
    }

    const maxBytes = mimeType.startsWith("video/") ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (sizeBytes > maxBytes) {
      return { valid: false, isVideo: false, error: "Dung lượng bằng chứng vượt giới hạn cho phép" };
    }

    if (expected?.rentalId && rentalId !== expected.rentalId.trim()) {
      return { valid: false, isVideo: false, error: "Bằng chứng không thuộc đơn thuê hiện tại (chặn IDOR)" };
    }

    if (expected?.uploaderId && !expected.allowAdminUploader && uploaderId !== expected.uploaderId.trim()) {
      return { valid: false, isVideo: false, error: "Bằng chứng không thuộc người tải lên hiện tại" };
    }

    const payload: SealedEvidencePayload = {
      provider,
      rentalId,
      uploaderId,
      objectRef,
      mimeType,
      sizeBytes,
      checksumOrGeneration,
    };

    const expectedSeal = signDisputeEvidenceSeal(payload).toLowerCase();
    const a = Buffer.from(seal, "utf8");
    const b = Buffer.from(expectedSeal, "utf8");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { valid: false, isVideo: false, error: "Chữ ký HMAC của bằng chứng không hợp lệ" };
    }

    return {
      valid: true,
      isVideo: mimeType.startsWith("video/"),
      payload,
    };
  } catch {
    return { valid: false, isVideo: false, error: "Không thể xác thực chứng từ bằng chứng" };
  }
}

export function buildSignedEvidenceStreamPath(params: {
  disputeId: string;
  evidenceUrl: string;
  viewerId: string;
  expiresInMs?: number;
}): string {
  const verified = verifySealedDisputeEvidenceUrl(params.evidenceUrl);
  if (!verified.valid || !verified.payload) {
    throw new Error(verified.error || "Bằng chứng không hợp lệ");
  }

  const exp = Date.now() + (params.expiresInMs ?? 15 * 60 * 1000);
  const sigPayload = `${params.disputeId}|${params.viewerId}|${exp}|${params.evidenceUrl}`;
  const sig = crypto
    .createHmac("sha256", getEvidenceSealSecret())
    .update(sigPayload)
    .digest("hex")
    .slice(0, 24);

  const query = new URLSearchParams({
    disputeId: params.disputeId,
    evidence: params.evidenceUrl,
    exp: String(exp),
    sig,
  });

  const ext = verified.payload.mimeType.startsWith("video/") ? "mp4" : "jpg";
  return `/api/disputes/evidence-stream?${query.toString()}&ext=.${ext}`;
}

export function verifySignedEvidenceStreamRequest(params: {
  disputeId: string;
  evidenceUrl: string;
  viewerId: string;
  exp: number;
  sig: string;
}): { valid: boolean; payload?: SealedEvidencePayload; error?: string } {
  try {
    if (!Number.isFinite(params.exp) || Date.now() > params.exp) {
      return { valid: false, error: "Link phát bằng chứng đã hết hạn (15 phút)" };
    }
    if (!/^[a-f0-9]{24}$/i.test(params.sig || "")) {
      return { valid: false, error: "Chữ ký phát bằng chứng không hợp lệ" };
    }

    const sigPayload = `${params.disputeId}|${params.viewerId}|${params.exp}|${params.evidenceUrl}`;
    const expectedSig = crypto
      .createHmac("sha256", getEvidenceSealSecret())
      .update(sigPayload)
      .digest("hex")
      .slice(0, 24)
      .toLowerCase();

    const a = Buffer.from(params.sig.toLowerCase(), "utf8");
    const b = Buffer.from(expectedSig, "utf8");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { valid: false, error: "Chữ ký phát bằng chứng không khớp" };
    }

    const verified = verifySealedDisputeEvidenceUrl(params.evidenceUrl);
    if (!verified.valid || !verified.payload) {
      return { valid: false, error: verified.error || "Chứng từ gốc không hợp lệ" };
    }

    return { valid: true, payload: verified.payload };
  } catch {
    return { valid: false, error: "Lỗi xác thực yêu cầu phát bằng chứng" };
  }
}

/**
 * Dịch vụ dùng chung để xác thực & chuẩn hóa danh sách bằng chứng khiếu nại / phản tố phía Server.
 * - Tuyệt đối KHÔNG chấp nhận URL tự nhập (#video, https://drive.google.com/..., https://example.invalid/...).
 * - Chỉ chấp nhận:
 *   1. Mã đối tượng GCS `disputes/{rentalId}/{uploaderId}/...` sau khi gọi `verifyGcsObject` thành công (và đóng dấu SEAL kèm integrityAnchor `gen=...;md5=...`).
 *   2. Chứng từ SEAL `https://evidence.cloop.internal/v1/object?...` hợp lệ, khớp `rentalId`, khớp `uploaderId` và có mỏ neo toàn vẹn hợp lệ.
 */
export async function verifyAndFinalizeDisputeEvidenceList(params: {
  rawUrls: unknown[];
  rentalId: string;
  uploaderId: string;
  allowAdminUploader?: boolean;
  maxItems?: number;
  verifyGcsObject?: (args: {
    objectName: string;
    rentalId: string;
    userId: string;
  }) => Promise<{
    isValid: boolean;
    size?: number;
    contentType?: string;
    generation?: string;
    md5Hash?: string;
    integrityAnchor?: string;
    error?: string;
  }>;
}): Promise<{
  ok: boolean;
  verifiedUrls: string[];
  hasVerifiedVideo: boolean;
  error?: string;
}> {
  const maxItems = params.maxItems ?? 10;
  const rawInputs = (Array.isArray(params.rawUrls) ? params.rawUrls : [])
    .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    .slice(0, maxItems);

  const verifiedUrls: string[] = [];
  let hasVerifiedVideo = false;

  for (const item of rawInputs) {
    const trimmed = item.trim();

    if (trimmed.startsWith("disputes/")) {
      if (typeof params.verifyGcsObject !== "function") {
        return {
          ok: false,
          verifiedUrls: [],
          hasVerifiedVideo: false,
          error: "Dịch vụ nghiệm thu Google Cloud Storage chưa sẵn sàng.",
        };
      }

      const gcsCheck = await params.verifyGcsObject({
        objectName: trimmed,
        rentalId: params.rentalId,
        userId: params.uploaderId,
      });

      const anchor =
        gcsCheck.integrityAnchor ||
        (gcsCheck.generation && gcsCheck.md5Hash
          ? `gen=${gcsCheck.generation};md5=${gcsCheck.md5Hash}`
          : gcsCheck.generation || "");

      if (!gcsCheck.isValid || !gcsCheck.contentType || !gcsCheck.size || !anchor) {
        return {
          ok: false,
          verifiedUrls: [],
          hasVerifiedVideo: false,
          error:
            gcsCheck.error ||
            "Tệp bằng chứng chưa được nghiệm thu hợp lệ trên kho bảo mật.",
        };
      }

      let sealedGcs: string;
      try {
        sealedGcs = buildSealedDisputeEvidenceUrl({
          provider: "gcs",
          rentalId: params.rentalId,
          uploaderId: params.uploaderId,
          objectRef: trimmed,
          mimeType: gcsCheck.contentType,
          sizeBytes: gcsCheck.size,
          checksumOrGeneration: anchor,
        });
      } catch (err: any) {
        return {
          ok: false,
          verifiedUrls: [],
          hasVerifiedVideo: false,
          error: err?.message || "Không thể đóng dấu toàn vẹn cho tệp bằng chứng GCS.",
        };
      }

      verifiedUrls.push(sealedGcs);
      if (gcsCheck.contentType.startsWith("video/")) {
        hasVerifiedVideo = true;
      }
      continue;
    }

    const sealCheck = verifySealedDisputeEvidenceUrl(trimmed, {
      rentalId: params.rentalId,
      uploaderId: params.uploaderId,
      allowAdminUploader: params.allowAdminUploader,
    });

    if (!sealCheck.valid || !sealCheck.payload) {
      return {
        ok: false,
        verifiedUrls: [],
        hasVerifiedVideo: false,
        error:
          sealCheck.error ||
          "Bằng chứng đính kèm không hợp lệ, chưa được máy chủ nghiệm thu hoặc không thuộc đơn thuê này.",
      };
    }

    verifiedUrls.push(trimmed);
    if (sealCheck.isVideo) {
      hasVerifiedVideo = true;
    }
  }

  return {
    ok: true,
    verifiedUrls,
    hasVerifiedVideo,
  };
}
