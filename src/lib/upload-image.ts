import { cloudinary } from "./cloudinary";

export type CloudinaryUploadResult = {
  url: string;
  publicId: string; // Đồng bộ camelCase để tạo DB không lỗi
  width: number;
  height: number;
  bytes: number;
  format: string;
};

/**
 * Helper upload ảnh lên Cloudinary từ luồng Buffer Stream
 * Trả về đầy đủ Metadata khớp 100% với cấu trúc bảng OutfitImage
 */
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
        },
        (error, result) => {
          if (error || !result) {
            return reject(error ?? new Error("Lỗi upload ảnh lên Cloudinary"));
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id, // Đổi từ snake_case của API sang camelCase cho hệ thống
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