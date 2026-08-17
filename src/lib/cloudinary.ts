import { v2 as cloudinary } from "cloudinary";

export const hasCloudinaryConfig = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "placeholder",
  api_key: process.env.CLOUDINARY_API_KEY || "placeholder",
  api_secret: process.env.CLOUDINARY_API_SECRET || "placeholder",
  secure: true,
});

export { cloudinary };
