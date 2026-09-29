import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dfqbxmgqi";
const apiKey = process.env.CLOUDINARY_API_KEY || "381733176871525";
const apiSecret = process.env.CLOUDINARY_API_SECRET || "cS9pNSgsFpiJn6F6SNn-JjiRxF4";

export const hasCloudinaryConfig = Boolean(cloudName && apiKey && apiSecret);

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export { cloudinary };
