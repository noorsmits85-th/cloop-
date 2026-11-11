import * as crypto from "node:crypto";
import { cloudinary, hasCloudinaryConfig } from "./cloudinary";
import { validateBinaryMediaBuffer } from "./server-image-guard";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const PROVIDER_TIMEOUT_MS = 8_000;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_UPLOAD_FOLDERS = new Set([
  "cloop_products",
  "cloop_uploads",
  "outfits",
  "avatars",
  "reviews",
  "blog",
  "support_chat",
]);

export function sanitizeUploadFolder(folder?: string | null): string {
  const cleaned = (folder || "").trim();
  return ALLOWED_UPLOAD_FOLDERS.has(cleaned) ? cleaned : "cloop_uploads";
}

export type CloudinaryUploadResult = {
  url: string;
  storageProvider: "cloudinary" | "gcs" | "supabase";
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
};

function withProviderTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Đo kích thước thực tế (width, height) trực tiếp từ header nhị phân của ảnh (PNG, GIF, WEBP, JPEG)
 * thay vì trả về kích thước giả định cố định ở các tầng dự phòng.
 */
export function parseImageDimensions(
  buffer: Buffer,
  ext: string
): { width: number; height: number } {
  try {
    const fmt = ext.toLowerCase();
    // PNG: IHDR chunk starts at byte 16 (width: 4B BE, height: 4B BE)
    if (fmt === "png" && buffer.length >= 24) {
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
      };
    }
    // GIF:Logical Screen Descriptor at byte 6 (width: 2B LE, height: 2B LE)
    if (fmt === "gif" && buffer.length >= 10) {
      return {
        width: buffer.readUInt16LE(6),
        height: buffer.readUInt16LE(8),
      };
    }
    // WEBP: RIFF....WEBP
    if (fmt === "webp" && buffer.length >= 30) {
      const chunkHeader = buffer.toString("ascii", 12, 16);
      if (chunkHeader === "VP8 " && buffer.length >= 30) {
        return {
          width: buffer.readUInt16LE(26) & 0x3fff,
          height: buffer.readUInt16LE(28) & 0x3fff,
        };
      }
      if (chunkHeader === "VP8L" && buffer.length >= 25) {
        const b0 = buffer[21];
        const b1 = buffer[22];
        const b2 = buffer[23];
        const b3 = buffer[24];
        return {
          width: 1 + (((b1 & 0x3f) << 8) | b0),
          height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
        };
      }
      if (chunkHeader === "VP8X" && buffer.length >= 30) {
        return {
          width: 1 + buffer.readUIntLE(24, 3),
          height: 1 + buffer.readUIntLE(27, 3),
        };
      }
    }
    // JPEG: scan SOF0..SOF3/SOF5..SOF15 markers
    if ((fmt === "jpg" || fmt === "jpeg") && buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) {
          offset++;
          continue;
        }
        const marker = buffer[offset + 1];
        if (marker === 0xff) {
          offset++;
          continue;
        }
        if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
          offset += 2;
          continue;
        }
        const segLen = buffer.readUInt16BE(offset + 2);
        if (segLen < 2 || offset + 2 + segLen > buffer.length) break;
        const isSof =
          (marker >= 0xc0 && marker <= 0xc3) ||
          (marker >= 0xc5 && marker <= 0xc7) ||
          (marker >= 0xc9 && marker <= 0xcb) ||
          (marker >= 0xcd && marker <= 0xcf);
        if (isSof && offset + 8 < buffer.length) {
          return {
            height: buffer.readUInt16BE(offset + 5),
            width: buffer.readUInt16BE(offset + 7),
          };
        }
        offset += 2 + segLen;
      }
    }
  } catch {
    // Fallback to 0x0 if binary header is truncated
  }
  return { width: 0, height: 0 };
}

export const assertUploadableImage = (file: File) => {
  if (!file || typeof file.size !== "number" || file.size <= 0) {
    throw new Error("Tệp ảnh tải lên không hợp lệ.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Ảnh vượt quá 10MB. Vui lòng chọn ảnh nhẹ hơn để tải lên.");
  }

  const type = (file.type || "").toLowerCase().trim();
  if (!ALLOWED_IMAGE_TYPES.has(type)) {
    throw new Error("File không đúng định dạng ảnh. CLOOP chỉ hỗ trợ JPG, PNG, WEBP, GIF.");
  }
};

export const uploadImage = async (
  fileBuffer: Buffer,
  folder: string = "cloop_uploads"
): Promise<CloudinaryUploadResult> => {
  const { mimeType: canonicalMimeType, extension: canonicalExt } =
    validateBinaryMediaBuffer(fileBuffer, {
      allowVideo: false,
      maxBytes: MAX_UPLOAD_BYTES,
    });

  const safeFolder = sanitizeUploadFolder(folder);
  const generatedId = crypto.randomUUID();
  const measuredDims = parseImageDimensions(fileBuffer, canonicalExt);

  if (hasCloudinaryConfig) {
    try {
      const res = await withProviderTimeout(
        new Promise<CloudinaryUploadResult>((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                folder: safeFolder,
                public_id: generatedId,
                overwrite: false,
                resource_type: "image",
                quality: "auto:eco",
                fetch_format: "auto",
                transformation: [{ width: 1600, height: 2134, crop: "limit" }],
              },
              (error, result) => {
                if (error || !result) {
                  return reject(new Error(error?.message || "Loi upload Cloudinary"));
                }
                resolve({
                  url: result.secure_url,
                  storageProvider: "cloudinary",
                  publicId: result.public_id,
                  width: result.width || measuredDims.width,
                  height: result.height || measuredDims.height,
                  bytes: result.bytes || fileBuffer.length,
                  format: result.format || canonicalExt,
                });
              }
            )
            .end(fileBuffer);
        }),
        PROVIDER_TIMEOUT_MS,
        "Cloudinary upload"
      );
      return res;
    } catch (e) {
      console.warn("Cloudinary upload failed, falling back to Google Cloud Storage / Supabase:", e);
    }
  }

  // 🌟 Tầng 2: Google Cloud Storage (Public Media Bucket)
  try {
    const { uploadImageToGCS } = await import("@/src/services/gcsStorage");
    const gcsResult = await withProviderTimeout(
      uploadImageToGCS(fileBuffer, safeFolder, canonicalMimeType, canonicalExt),
      PROVIDER_TIMEOUT_MS,
      "GCS upload"
    );
    if (gcsResult) {
      return {
        url: gcsResult.url,
        storageProvider: "gcs",
        publicId: gcsResult.publicId,
        width: measuredDims.width,
        height: measuredDims.height,
        bytes: fileBuffer.length,
        format: canonicalExt,
      };
    }
  } catch (gcsErr) {
    console.warn("GCS Storage upload failed, falling back to Supabase:", gcsErr);
  }

  // 🌿 Tầng 3: Supabase Public Media Storage ('cloop-media' -> fallback 'products')
  try {
    const { supabaseAdmin } = await import("./supabase");
    if (supabaseAdmin) {
      const fileName = `${safeFolder}/${crypto.randomUUID()}.${canonicalExt}`;
      const candidateBuckets = ["cloop-media", "products"] as const;

      for (const bucketName of candidateBuckets) {
        const { data, error } = await withProviderTimeout(
          supabaseAdmin.storage.from(bucketName).upload(fileName, fileBuffer, {
            contentType: canonicalMimeType,
            upsert: false,
          }),
          PROVIDER_TIMEOUT_MS,
          `Supabase (${bucketName}) upload`
        );

        if (!error && data) {
          const { data: publicData } = supabaseAdmin.storage
            .from(bucketName)
            .getPublicUrl(fileName);

          return {
            url: publicData.publicUrl,
            storageProvider: "supabase",
            publicId: `${bucketName}/${fileName}`,
            width: measuredDims.width,
            height: measuredDims.height,
            bytes: fileBuffer.length,
            format: canonicalExt,
          };
        }
      }
    }
  } catch (sbErr) {
    console.warn("Supabase Storage fallback failed:", sbErr);
  }

  throw new Error("Dịch vụ lưu trữ hình ảnh đang bận. Quý khách vui lòng thử lại sau giây lát.");
};
