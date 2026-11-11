import { Storage } from "@google-cloud/storage";
import * as crypto from "node:crypto";
import { validateBinaryMediaBuffer } from "@/src/lib/server-image-guard";

const BUCKET_NAME = process.env.GCP_STORAGE_BUCKET || "cloop-disputes";
export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100MB cho video bằng chứng
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB cho ảnh chụp chi tiết

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

function getStorageClient(): Storage | null {
  const projectId = process.env.GCP_PROJECT_ID || "ethereal-orb-506208-j3";
  const clientEmail = process.env.GCP_CLIENT_EMAIL;
  const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (clientEmail && privateKey) {
    return new Storage({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });
  }

  try {
    return new Storage({ projectId });
  } catch {
    return null;
  }
}

export interface SignedUploadUrlResult {
  uploadUrl: string;
  objectName: string;
  expiresAt: string;
  traceId: string;
  maxSizeBytes: number;
  requiredHeaders: Record<string, string>;
  isMock?: boolean;
}

/**
 * Sinh V4 Signed URL với ràng buộc nghiêm ngặt:
 * 1. Tên đường dẫn (objectName) hoàn toàn do Server sinh: disputes/{rentalId}/{userId}/{timestamp}_{traceId}.ext
 * 2. Ràng buộc Content-Type, Content-Length tối đa và trả về requiredHeaders để Client gửi đúng các header đã ký.
 * 3. Hạn sử dụng ngắn 15 phút.
 */
export async function generateDisputeVideoUploadUrl(params: {
  rentalId: string;
  fileName: string;
  contentType: string;
  userId: string;
}): Promise<SignedUploadUrlResult> {
  const traceId = `gcs_${crypto.randomUUID()}`;
  const normalizedMime = params.contentType.trim().toLowerCase();
  const extension = MIME_TO_EXT[normalizedMime];

  if (!extension) {
    throw new Error("Định dạng tệp tải lên không được hỗ trợ.");
  }

  const isVideo = normalizedMime.startsWith("video/");
  const maxSizeBytes = isVideo ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;

  // Cấu trúc đường dẫn server-controlled: disputes/{rentalId}/{userId}/{time}_{traceId}.{ext}
  const objectName = `disputes/${params.rentalId}/${params.userId}/${Date.now()}_${traceId}.${extension}`;

  const storage = getStorageClient();

  if (!storage) {
    throw new Error("Dịch vụ Google Cloud Storage chưa được cấu hình (thiếu Service Account hoặc Private Key).");
  }

  const extensionHeaders: Record<string, string> = {
    "x-goog-content-length-range": `0,${maxSizeBytes}`,
    "x-goog-if-generation-match": "0",
    "x-goog-meta-uploader-id": params.userId,
    "x-goog-meta-rental-id": params.rentalId,
    "x-goog-meta-trace-id": traceId,
  };

  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(objectName);

    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 phút
      contentType: normalizedMime,
      extensionHeaders,
    });

    // Chỉ log objectName và traceId (TUYỆT ĐỐI KHÔNG LOG signed URL đầy đủ)
    console.log(`[GCS_SIGNED_URL_CREATED][${traceId}] Object: ${objectName} | MaxSize: ${maxSizeBytes} bytes`);

    return {
      uploadUrl,
      objectName,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      traceId,
      maxSizeBytes,
      requiredHeaders: {
        "Content-Type": normalizedMime,
        ...extensionHeaders,
      },
      isMock: false,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ [GCS Error][${traceId}]:`, message);
    throw new Error("Không thể khởi tạo phiên tải tệp lên Google Cloud Storage.");
  }
}

/**
 * Sinh Signed Read URL (Thời hạn ngắn 15 phút) để xem video nhạy cảm an toàn, khóa theo generation nếu có.
 */
export async function generateDisputeVideoReadUrl(
  objectName: string,
  expectedGeneration?: string
): Promise<string> {
  const storage = getStorageClient();
  if (!storage) {
    throw new Error("Không thể tạo link xem bằng chứng: Dịch vụ Google Cloud Storage chưa được cấu hình.");
  }

  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const file =
      expectedGeneration && /^\d+$/.test(expectedGeneration)
        ? bucket.file(objectName, { generation: Number(expectedGeneration) })
        : bucket.file(objectName);

    const [readUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 15 * 60 * 1000, // Rút ngắn xuống 15 phút
    });

    return readUrl;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ [GCS Read Error]:", message);
    throw new Error("Không thể đọc tệp từ Google Cloud Storage.");
  }
}

/**
 * Xác thực Metadata + Magic Bytes phía Server sau khi Client upload xong:
 * - Kiểm tra file có tồn tại trên GCS thật không.
 * - Kiểm tra kích thước, MIME type và chữ ký byte đầu (magic bytes) thật của tệp.
 * - Kiểm tra objectName có đúng format của rentalId và userId không, và khóa generation + md5Hash thật (không chấp nhận chuỗi giả).
 */
export async function verifyUploadedDisputeFile(params: {
  objectName: string;
  rentalId: string;
  userId: string;
}): Promise<{
  isValid: boolean;
  size?: number;
  contentType?: string;
  generation?: string;
  md5Hash?: string;
  integrityAnchor?: string;
  error?: string;
}> {
  // 1. Kiểm tra prefix an toàn
  const expectedPrefix = `disputes/${params.rentalId}/${params.userId}/`;
  if (!params.objectName.startsWith(expectedPrefix) || params.objectName.includes("..")) {
    return { isValid: false, error: "Đường dẫn tệp không khớp với đơn thuê hoặc người dùng" };
  }

  const storage = getStorageClient();
  if (!storage) {
    // Fail-Closed: Không tự động xác nhận hợp lệ khi thiếu storage client
    return {
      isValid: false,
      error: "Hệ thống lưu trữ Google Cloud Storage chưa được cấu hình hoặc không khả dụng. Không thể nghiệm thu tệp.",
    };
  }

  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(params.objectName);
    const [exists] = await file.exists();

    if (!exists) {
      return { isValid: false, error: "Tệp chưa được tải lên Google Cloud Storage" };
    }

    const [metadata] = await file.getMetadata();
    const size = Number(metadata.size || 0);
    const contentType = (metadata.contentType || "").toLowerCase();

    if (!MIME_TO_EXT[contentType]) {
      return { isValid: false, error: "Định dạng tệp tải lên không hợp lệ" };
    }

    const maxAllowed = contentType.startsWith("video/") ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
    if (size <= 0 || size > maxAllowed) {
      return { isValid: false, error: `Kích thước tệp không hợp lệ (${size} bytes)` };
    }

    const rawGen = String(metadata.generation || "").trim();
    const rawMd5 = String(metadata.md5Hash || "").trim();
    if (!/^\d{1,30}$/.test(rawGen) || !/^[A-Za-z0-9+/]{22}==$/.test(rawMd5)) {
      return {
        isValid: false,
        error: "Tệp trên GCS thiếu thông tin generation hoặc md5Hash hợp lệ để khóa toàn vẹn",
      };
    }

    // 2. Kiểm tra chữ ký nhị phân (magic bytes) trên 64 bytes đầu tiên nếu SDK hỗ trợ download range
    if (typeof file.download === "function") {
      const [headBuf] = await file.download({ start: 0, end: Math.min(size - 1, 63) });
      if (Buffer.isBuffer(headBuf) && headBuf.length >= 12) {
        const detected = validateBinaryMediaBuffer(headBuf, {
          allowVideo: true,
          maxBytes: maxAllowed,
        });
        const expectedIsVideo = contentType.startsWith("video/");
        const detectedIsVideo = detected.mimeType.startsWith("video/");
        if (expectedIsVideo !== detectedIsVideo) {
          return { isValid: false, error: "Chữ ký nhị phân (magic bytes) không khớp với loại tệp khai báo" };
        }
      }
    }

    const integrityAnchor = `gen=${rawGen};md5=${rawMd5}`;
    return {
      isValid: true,
      size,
      contentType,
      generation: rawGen,
      md5Hash: rawMd5,
      integrityAnchor,
    };
  } catch (error: any) {
    console.error("❌ [GCS Verify Error]:", error?.message || error);
    return { isValid: false, error: "Không thể xác minh tệp từ máy chủ Google Cloud" };
  }
}

/**
 * Upload ảnh sản phẩm công khai lên Google Cloud Storage (chỉ dùng bucket công khai GCP_PUBLIC_MEDIA_BUCKET,
 * TUYỆT ĐỐI không dùng chung bucket nhạy cảm cloop-disputes).
 */
export async function uploadImageToGCS(
  fileBuffer: Buffer,
  folder: string = "cloop_products",
  mimeType: string = "image/jpeg",
  extension: string = "jpg"
): Promise<{ url: string; publicId: string } | null> {
  const publicBucketName = process.env.GCP_PUBLIC_MEDIA_BUCKET;
  if (!publicBucketName || publicBucketName === "cloop-disputes") {
    return null;
  }

  const safeExt = /^[a-z0-9]{2,5}$/.test(extension) ? extension : "jpg";
  const fileName = `${folder}/${crypto.randomUUID()}.${safeExt}`;

  const storage = getStorageClient();
  if (storage) {
    try {
      const bucket = storage.bucket(publicBucketName);
      const file = bucket.file(fileName);

      await file.save(fileBuffer, {
        contentType: mimeType,
        resumable: false,
        metadata: {
          cacheControl: "public, max-age=31536000",
        },
      });

      const publicUrl = `https://storage.googleapis.com/${publicBucketName}/${fileName}`;
      return {
        url: publicUrl,
        publicId: fileName,
      };
    } catch (sdkErr) {
      console.warn("⚠️ GCS SDK direct save failed:", sdkErr);
    }
  }

  return null;
}
