"use server";

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// ✨ ĐỒNG BỘ TUYỆT ĐỐI: Để trống trơn để triệt tiêu toàn bộ gạch đỏ dòng 9!
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

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
  images: string[];
  owner_id: string; 
}

export async function createOutfitAction(payload: OutfitPayload) {
  try {
    if (!payload.owner_id || payload.owner_id === "user-test-uuid-123") {
      return { success: false, message: "🚨 Lỗi xác thực: Phiên đăng nhập hợp lệ không tồn tại. Vui lòng đăng nhập lại!" };
    }

    if (!payload.name.trim() || payload.images.length === 0) {
      return { success: false, message: "❌ Dữ liệu phục trang trống hoặc thiếu tệp tin lookbook." };
    }

    const userExists = await prisma.user.findUnique({
      where: { id: payload.owner_id }
    });

    if (!userExists) {
      return { success: false, message: "🚨 Quyền truy cập bị từ chối: Tài khoản không có trong hệ thống dữ liệu cốt lõi." };
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
        userId: payload.owner_id, 
        condition: "GOOD",       
        images: {
          create: payload.images.map((url, index) => ({
            url: url,
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
              userId: payload.owner_id, 
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
      message: "Trục trặc kết nối cơ sở dữ liệu PostgreSQL hệ thống.",
    };
  }
}