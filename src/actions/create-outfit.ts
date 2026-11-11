"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/auth";

interface OutfitPayload {
  name: string;
  description: string;
  category: string;
  brand: string;
  sizeGeneral: string;
  breast: string;
  waist: string;
  hip: string;
  material: string;
  location: string;
  specificAddress: string;
  lat: number;
  lng: number;
  listingType: "RENT" | "SELL" | "RECYCLE";
  pricePerDay: number;
  depositFee: number;
  minDuration: number;
  greenPoints?: number;
  images: Array<string | {
    url: string;
    storageProvider?: string;
    publicId?: string;
    width?: number;
    height?: number;
    bytes?: number;
    format?: string;
  }>;
  owner_id?: string;
}

export async function createOutfitAction(payload: OutfitPayload) {
  try {
    let authUser;
    try {
      authUser = await requireUser();
    } catch {
      return { success: false, message: "Lỗi xác thực: Phiên đăng nhập hợp lệ không tồn tại. Vui lòng đăng nhập lại!" };
    }

    const ownerId = authUser.id;
    const images = payload.images.map((image) => typeof image === "string" ? { url: image } : image);

    if (!payload.name.trim() || images.length === 0) {
      return { success: false, message: "Dữ liệu phục trang trống hoặc thiếu tệp tin lookbook." };
    }

    const userExists = await prisma.user.findUnique({
      where: { id: ownerId }
    });

    if (!userExists) {
      return { success: false, message: "Quyền truy cập bị từ chối: Tài khoản không có trong hệ thống dữ liệu cốt lõi." };
    }

    const newProduct = await prisma.product.create({
      data: {
        title: payload.name.trim(),
        description: payload.description.trim(),
        size: payload.sizeGeneral,
        bust: parseInt(payload.breast) || null,
        waist: parseInt(payload.waist) || null,
        hips: parseInt(payload.hip) || null,
        category: payload.category,
        brand: payload.brand,
        material: payload.material,
        province: payload.location,
        specificAddress: payload.specificAddress,
        latitude: payload.lat,
        longitude: payload.lng,
        userId: ownerId,
        condition: "GOOD",
        images: {
          create: images.map((image, index) => ({
            url: image.url,
            storageProvider: image.storageProvider || "cloudinary",
            publicId: image.publicId || null,
            width: image.width || null,
            height: image.height || null,
            bytes: image.bytes || null,
            format: image.format || null,
            isPrimary: index === 0,
            sortOrder: index,
          })),
        },
        listings: {
          create: [
            {
              listingType: payload.listingType,
              status: "AVAILABLE",
              basePrice: payload.pricePerDay,
              deposit: payload.listingType === "RENT" ? payload.depositFee : null,
              minDays: payload.listingType === "RENT" ? payload.minDuration : null,
              greenPoints: payload.listingType === "RECYCLE" ? (payload.greenPoints || 10) : null,
            },
          ],
        },
        lifecycles: {
          create: [
            {
              eventType: "CREATED",
              userId: ownerId,
              co2Saved: 0.0,
              notes: `Sản phẩm quần áo được kích hoạt thành công dưới phân hệ: ${payload.listingType}`,
            },
          ],
        },
      },
    });

    return {
      success: true,
      message: "Ghi nhận siêu dữ liệu tuần hoàn CLOOP thành công!",
      outfitId: newProduct.id,
    };

  } catch (error: any) {
    console.error("Lỗi hệ thống:", error);
    return {
      success: false,
      message: "Trục trặc kết nối cơ sở dữ liệu hệ thống.",
    };
  }
}
