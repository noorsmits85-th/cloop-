"use server";

import { createClient } from "@/src/utils/supabase/server";
import { PrismaClient, ItemCondition, GenderCategory } from "@prisma/client";

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

    const formattedCondition = product.condition.includes("95") ? ItemCondition.GOOD : ItemCondition.EXCELLENT;

    // Sử dụng Prisma Transaction để đảm bảo toàn vẹn dữ liệu
    const newProductId = await prisma.$transaction(async (tx) => {
      // 1. Tạo Product
      const newProduct = await tx.product.create({
        data: {
          title: product.name,
          size: product.size,
          material: product.material,
          color: product.color, 
          condition: formattedCondition,
          province: product.province,
          specificAddress: `${product.ward}, ${product.province}`,
          category: "DRESSES", // Tạm thời hardcode theo UI cũ (UNISEX -> DRESSES)
          gender: GenderCategory.UNISEX,
          // targetHeight: String(product.targetHeight),
          // targetWeight: String(product.targetWeight),
          bust: product.bust || null,
          waist: product.waist || null,
          hips: product.hips || null,
          // image_url: uploadedImageUrls[0],
          // is_recycle: listings.isRecycle,
          // original_price: Number(product.originalPrice),
          userId: user.id, 
          // owner_phone: product.ownerPhone,
          occasion: product.occasion,
        }
      });

      // 2. Tạo ProductImage
      if (uploadedImageUrls.length > 0) {
        await tx.productImage.createMany({
          data: uploadedImageUrls.map((url, index) => ({
            productId: newProduct.id,
            url: url,
            isPrimary: index === 0,
            sortOrder: index,
          }))
        });
      }

      // 3. Tạo Listings
      const listingsData = [];
      if (listings.isRental) {
        listingsData.push({
          productId: newProduct.id,
          listingType: "RENT",
          basePrice: Number(listings.rentalPrice),
          deposit: Number(listings.depositPercent), 
          minDays: 3,
        });
      }
      
      if (listings.isSale) {
        listingsData.push({
          productId: newProduct.id,
          listingType: "SELL",
          basePrice: Number(listings.salePrice),
          deposit: 0,
          minDays: 0,
        });
      }

      if (listingsData.length > 0) {
        // Prisma không hỗ trợ enum kiểu string lỏng trong createMany nếu không ép kiểu chính xác
        // Dùng create từng cái hoặc cast.
        for (const l of listingsData) {
          await tx.listing.create({
            data: {
              productId: l.productId,
              listingType: l.listingType as any,
              basePrice: l.basePrice,
              deposit: l.deposit,
              minDays: l.minDays
            }
          });
        }
      }

      // 4. Tạo BlogPost (Story)
      if (hasStory && storyText && storyText.trim() !== "") {
        await tx.blogPost.create({
          data: {
            title: `Kỷ niệm cùng ${newProduct.title}`,
            content: storyText.trim(),
            coverImage: uploadedImageUrls[0] || null,
            productId: newProduct.id, 
            userId: user.id,
            status: "PUBLIC",   
            isPinned: false, 
          }
        });
      }

      return newProduct.id;
    });

    return { success: true, productId: newProductId };
  } catch (err: any) {
    console.error("Lỗi khi tạo sản phẩm:", err);
    return { success: false, error: err.message || "Đã xảy ra lỗi trên máy chủ." };
  }
}
