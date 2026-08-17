"use server";

import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Zod schema for server-side validation
const createProductSchema = z.object({
  title: z.string().min(3, "Tên món đồ quá ngắn"),
  size: z.string(),
  material: z.string().min(1, "Chất liệu không được để trống"),
  color: z.string().min(1, "Màu sắc không được để trống"),
  condition: z.string(),
  province: z.string(),
  ward: z.string(),
  occasion: z.string(),
  bust: z.number().nullable().optional(),
  waist: z.number().nullable().optional(),
  hips: z.number().nullable().optional(),
  uploadedImages: z.array(z.object({
    url: z.string().url(),
    storageProvider: z.string(),
    publicId: z.string(),
    width: z.number(),
    height: z.number(),
    bytes: z.number(),
    format: z.string(),
  })).min(1, "Bắt buộc phải có ít nhất 1 ảnh"),
  listings: z.object({
    isRental: z.boolean(),
    rentalPrice: z.number(),
    depositPercent: z.number(),
    isSale: z.boolean(),
    salePrice: z.number(),
  }),
  description: z.string().optional(),
  storyText: z.string().optional(),
});

export async function createProductAction(data: any) {
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");

  // SERVER-SIDE VALIDATION
  const parsed = createProductSchema.safeParse(data);
  if (!parsed.success) {
    return { 
      success: false, 
      error: "Dữ liệu không hợp lệ: " + parsed.error.issues.map((e: any) => e.message).join(", ") 
    };
  }
  
  const v = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Create Product
      const product = await tx.product.create({
        data: {
          userId: user.id,
          title: v.title,
          size: v.size,
          material: v.material,
          color: v.color,
          condition: v.condition.includes("95") ? "GOOD" : "EXCELLENT",
          province: v.province,
          wardCode: v.ward,
          specificAddress: `${v.ward}, ${v.province}`,
          category: "UNISEX",
          occasion: v.occasion,
          bust: v.bust || null,
          waist: v.waist || null,
          hips: v.hips || null,
          description: v.description || null,
          status: "ON_MARKET"
        }
      });

      // 2. Create ProductImages
      if (v.uploadedImages.length > 0) {
        await tx.productImage.createMany({
          data: v.uploadedImages.map((img, idx) => ({
            productId: product.id,
            url: img.url,
            storageProvider: img.storageProvider,
            publicId: img.publicId,
            width: img.width,
            height: img.height,
            bytes: img.bytes,
            format: img.format,
            isPrimary: idx === 0,
            sortOrder: idx
          }))
        });
      }

      // 3. Create Listings
      if (v.listings.isRental) {
        await tx.listing.create({
          data: {
            productId: product.id,
            status: "AVAILABLE",
            listingType: "RENT",
            basePrice: v.listings.rentalPrice,
            deposit: v.listings.depositPercent,
            minDays: 3,
          }
        });
      }

      if (v.listings.isSale) {
        await tx.listing.create({
          data: {
            productId: product.id,
            status: "AVAILABLE",
            listingType: "SELL",
            basePrice: v.listings.salePrice,
            deposit: 0,
            minDays: 0,
          }
        });
      }

      // 4. Create Blog Post if story exists
      if (v.storyText && v.storyText.trim() !== "") {
        await tx.blogPost.create({
          data: {
            title: `Kỷ niệm cùng ${product.title}`,
            content: v.storyText.trim(),
            cover_image: v.uploadedImages[0]?.url,
            productId: product.id,
            userId: user.id,
            status: "PUBLIC",
            isPinned: false
          }
        });
      }
    });

    revalidatePath("/my-closet");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Lỗi khi lưu vào Database" };
  }
}
