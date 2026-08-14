"use server";

import { createClient } from "@/src/utils/supabase/server";
import { PrismaClient, ItemCondition, GenderCategory, ListingType } from "@prisma/client";
import { uploadProductSchema } from "@/lib/validations/product";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function createProductAction({
  product,
  listings,
  uploadedImageUrls,
  hasStory,
  storyText
}: {
  product: any;
  listings: any;
  uploadedImageUrls: string[];
  hasStory: boolean;
  storyText: string;
}) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Cậu nhớ đăng nhập trước khi gửi đồ vào tủ nhé!" };
    }

    if (!uploadedImageUrls || uploadedImageUrls.length === 0) {
      return { success: false, error: "Chưa có ảnh món đồ mất rồi!" };
    }

    // Tái cấu trúc data để parse Zod ở phía Server chống Hacker
    const payloadToValidate = {
      title: product.name,
      description: product.description,
      size: product.size,
      material: product.material,
      color: product.color,
      condition: product.condition,
      province: product.province,
      ward: product.ward,
      occasion: product.occasion,
      isRental: listings.isRental,
      isSale: listings.isSale,
      rentalPrice: listings.rentalPrice,
      salePrice: listings.salePrice,
      deposit: listings.deposit,
      minDays: listings.minDays,
      images: uploadedImageUrls
    };

    const parsed = uploadProductSchema.safeParse(payloadToValidate);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const validData = parsed.data;

    let conditionEnum: ItemCondition = ItemCondition.GOOD;
    if (validData.condition === "99") conditionEnum = ItemCondition.EXCELLENT;
    if (validData.condition === "NEW") conditionEnum = ItemCondition.NEW_WITH_TAGS;

    // Sử dụng Prisma Transaction để đảm bảo toàn vẹn dữ liệu
    const newProductId = await prisma.$transaction(async (tx) => {
      // 1. Tạo Product
      const newProduct = await tx.product.create({
        data: {
          title: validData.title,
          description: validData.description,
          size: validData.size,
          material: validData.material,
          color: validData.color || null,
          condition: conditionEnum,
          province: validData.province,
          specificAddress: `${validData.ward}, ${validData.province}`,
          category: "DRESSES", // Default fallback
          gender: GenderCategory.UNISEX,
          userId: user.id,
          occasion: validData.occasion || null,
        }
      });

      // 2. Tạo Listings
      const listingsData = [];
      if (validData.isRental) {
        listingsData.push({
          productId: newProduct.id,
          listingType: ListingType.RENT,
          basePrice: validData.rentalPrice || 0,
          deposit: validData.deposit || null,
          minDays: validData.minDays,
          turnaround_days: 2
        });
      }
      
      if (validData.isSale) {
        listingsData.push({
          productId: newProduct.id,
          listingType: ListingType.SELL,
          basePrice: validData.salePrice || 0, // Dùng basePrice cho giá bán
          salePrice: validData.salePrice || 0,
          turnaround_days: 2
        });
      }

      await tx.listing.createMany({
        data: listingsData
      });

      // 3. Tạo Product Images
      const imageRecords = validData.images.map((url, idx) => ({
        productId: newProduct.id,
        url: url,
        isPrimary: idx === 0,
        sortOrder: idx,
        storageProvider: "cloudinary"
      }));

      await tx.productImage.createMany({
        data: imageRecords
      });

      return newProduct.id;
    });

    return { success: true, productId: newProductId };
  } catch (error: any) {
    console.error("Create Product Error:", error);
    return { success: false, error: "Đã xảy ra lỗi hệ thống khi lưu sản phẩm." };
  }
}

export async function bumpProductAction(productId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Bạn cần đăng nhập để thực hiện hành động này." };
    }

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return { success: false, error: "Không tìm thấy sản phẩm." };
    }

    if (product.userId !== user.id) {
      return { success: false, error: "Bạn không có quyền đẩy sản phẩm này." };
    }

    const now = new Date();
    const lastBumped = product.lastBumpedAt ? new Date(product.lastBumpedAt) : new Date(0);
    const diffInHours = (now.getTime() - lastBumped.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return { success: false, error: "Chưa hồi chiêu xong, cất tool đi hacker!" };
    }

    await prisma.product.update({
      where: { id: productId },
      data: { lastBumpedAt: now }
    });

    revalidatePath('/');
    revalidatePath('/shop');

    return { success: true };
  } catch (error) {
    console.error("Bump Error:", error);
    return { success: false, error: "Đã xảy ra lỗi." };
  }
}
