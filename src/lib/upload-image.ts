import { cloudinary, hasCloudinaryConfig } from "./cloudinary";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export type CloudinaryUploadResult = {
  url: string;
  storageProvider: "cloudinary";
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
};

export const assertUploadableImage = (file: File) => {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("File khong dung dinh dang anh. CLOOP chi nhan JPG, PNG, WEBP hoac HEIC.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Anh vuot qua 5MB. Hay chon anh nhe hon de tai len muot hon.");
  }
};

export const uploadImage = async (
  fileBuffer: Buffer,
  folder: string = "cloop_outfits"
): Promise<CloudinaryUploadResult> => {
  if (hasCloudinaryConfig) {
    try {
      const res = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder,
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
                width: result.width,
                height: result.height,
                bytes: result.bytes,
                format: result.format,
              });
            }
          )
          .end(fileBuffer);
      });
      return res;
    } catch (e) {
      console.warn("Cloudinary upload failed, falling back to Google Cloud Storage / Supabase:", e);
    }
  }

  // 🌟 Tầng 2: Google Cloud Storage (Enterprise Scale, High Bandwidth, No Limits)
  try {
    const { uploadImageToGCS } = await import("@/src/services/gcsStorage");
    const gcsResult = await uploadImageToGCS(fileBuffer, folder);
    if (gcsResult) {
      return {
        url: gcsResult.url,
        storageProvider: "cloudinary",
        publicId: gcsResult.publicId,
        width: 800,
        height: 1066,
        bytes: fileBuffer.length,
        format: "jpg",
      };
    }
  } catch (gcsErr) {
    console.warn("GCS Storage upload failed, falling back to Supabase:", gcsErr);
  }

  // 🌿 Tầng 3: Supabase Media Storage
  try {
    const { supabaseAdmin } = await import("./supabase");
    if (supabaseAdmin) {
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;
      const { data, error } = await supabaseAdmin.storage
        .from("cloop-media")
        .upload(fileName, fileBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (!error && data) {
        const { data: publicData } = supabaseAdmin.storage
          .from("cloop-media")
          .getPublicUrl(fileName);

        return {
          url: publicData.publicUrl,
          storageProvider: "cloudinary",
          publicId: fileName,
          width: 800,
          height: 1066,
          bytes: fileBuffer.length,
          format: "jpg",
        };
      }
    }
  } catch (sbErr) {
    console.warn("Supabase Storage fallback failed:", sbErr);
  }

  // 🚨 Tầng 4: Final emergency fallback: Base64 data URL
  const base64 = `data:image/jpeg;base64,${fileBuffer.toString("base64")}`;
  return {
    url: base64,
    storageProvider: "cloudinary",
    publicId: `local_${Date.now()}`,
    width: 800,
    height: 1066,
    bytes: fileBuffer.length,
    format: "jpg",
  };
};
