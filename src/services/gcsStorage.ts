import { Storage } from "@google-cloud/storage";
import crypto from "node:crypto";

const BUCKET_NAME = process.env.GCP_STORAGE_BUCKET || "cloop-disputes";

// Khởi tạo Storage Client nếu có credentials
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

  // Fallback: Default client (nếu chạy trong môi trường GCP hoặc gcloud auth)
  try {
    return new Storage({ projectId });
  } catch {
    return null;
  }
}

export interface SignedUploadUrlResult {
  uploadUrl: string;
  fileKey: string;
  publicViewUrl?: string;
  expiresAt: string;
  traceId: string;
  isMock?: boolean;
}

/**
 * Sinh V4 Signed URL để Client tải Video khiếu nại trực tiếp lên Google Cloud Storage.
 * - Bảo mật: Không thông qua server Next.js (tiết kiệm 100% RAM/CPU và băng thông Vercel).
 * - TTL: Khóa truy cập sau 15 phút nếu không upload.
 */
export async function generateDisputeVideoUploadUrl(params: {
  rentalId: string;
  fileName: string;
  contentType: string;
  userId: string;
}): Promise<SignedUploadUrlResult> {
  const traceId = `gcs_${crypto.randomUUID()}`;
  const sanitizedFileName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileKey = `disputes/${params.rentalId}/${Date.now()}_${traceId}_${sanitizedFileName}`;

  const storage = getStorageClient();

  if (!storage) {
    console.warn(`⚠️ [GCS Storage][${traceId}] Chưa cấu hình Service Account JSON, tạo mock URL cho dev.`);
    return {
      uploadUrl: `https://storage.googleapis.com/${BUCKET_NAME}/${fileKey}?mock=true`,
      fileKey,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      traceId,
      isMock: true,
    };
  }

  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(fileKey);

    // Sinh V4 Signed URL cho phép PUT file trong 15 phút
    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 phút
      contentType: params.contentType,
      extensionHeaders: {
        "x-goog-meta-uploader-id": params.userId,
        "x-goog-meta-rental-id": params.rentalId,
        "x-goog-meta-trace-id": traceId,
      },
    });

    console.log(`[GCS_SIGNED_URL_GENERATED][${traceId}] FileKey: ${fileKey} for Rental: ${params.rentalId}`);

    return {
      uploadUrl,
      fileKey,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      traceId,
      isMock: false,
    };
  } catch (error: any) {
    console.error(`❌ [GCS Error][${traceId}]:`, error?.message || error);
    return {
      uploadUrl: `https://storage.googleapis.com/${BUCKET_NAME}/${fileKey}?fallback=true`,
      fileKey,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      traceId,
      isMock: true,
    };
  }
}

/**
 * Sinh Signed Read URL (Thời hạn 1 giờ) để xem Video khiếu nại riêng tư (Private).
 * Chỉ Admin, Người thuê (Tenant), và Chủ đồ (Owner) mới có quyền lấy link này.
 */
export async function generateDisputeVideoReadUrl(fileKey: string): Promise<string> {
  const storage = getStorageClient();
  if (!storage) {
    return `https://storage.googleapis.com/${BUCKET_NAME}/${fileKey}`;
  }

  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(fileKey);

    const [readUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 giờ
    });

    return readUrl;
  } catch (error: any) {
    console.error("❌ [GCS Read Error]:", error?.message || error);
    return `https://storage.googleapis.com/${BUCKET_NAME}/${fileKey}`;
  }
}
