import { cloudinary } from "./cloudinary";

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
  return new Promise((resolve, reject) => {
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
            const message = error?.message?.toLowerCase().includes("quota")
              ? "Kho anh Cloudinary dang cham gioi han. Hay thu lai sau hoac bao admin CLOOP."
              : error?.message || "Loi upload anh len Cloudinary";
            return reject(new Error(message));
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
};
