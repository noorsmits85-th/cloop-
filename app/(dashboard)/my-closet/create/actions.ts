"use server";

import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { moderateProductImage } from "@/src/services/imageModeration";
import { indexProductImageEmbedding } from "@/src/services/visualSearch";

// Zod schema for server-side validation
const createProductSchema = z.object({
  title: z.string().min(3, "Tên món đồ quá ngắn"),
  category: z.string().optional(),
  size: z.string(),
  targetHeight: z.string().optional(),
  targetWeight: z.string().optional(),
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

  // 1. SERVER-SIDE VALIDATION
  const parsed = createProductSchema.safeParse(data);
  if (!parsed.success) {
    return { 
      success: false, 
      error: "Dữ liệu không hợp lệ: " + parsed.error.issues.map((e: any) => e.message).join(", ") 
    };
  }
  
  const v = parsed.data;

  // 2. AI VISION MODERATION (Kiểm duyệt ảnh đồ thật server-side)
  const primaryImage = v.uploadedImages[0];
  const modResult = await moderateProductImage(primaryImage.url);

  // Ghi Audit Log sạch sẽ phía Server cho Admin theo dõi
  console.log(`[AUDIT_LOG][USER:${user.id}] ${modResult.adminAuditLog}`);

  // Tầng 3: Chỉ từ chối khi là REJECTED (Rác/Spam 100%)
  if (modResult.decision === "REJECTED") {
    return {
      success: false,
      error: modResult.userMessage || "Ảnh tải lên chưa thấy rõ trang phục hoặc phụ kiện thời trang. Bạn vui lòng chụp rõ món đồ hơn giúp CLOOP nhé!"
    };
  }

  try {
    let createdProductId: string | null = null;
    let primaryImageRecord: { id: string; url: string } | null = null;

    const styleMeta = (v.targetHeight || v.targetWeight)
      ? JSON.stringify({ height: v.targetHeight || "", weight: v.targetWeight || "" })
      : null;

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
          category: v.category || "Dạ hội & Sự kiện",
          occasion: v.occasion,
          style: styleMeta,
          bust: v.bust || null,
          waist: v.waist || null,
          hips: v.hips || null,
          description: v.description || null,
          status: "ON_MARKET"
        }
      });
      createdProductId = product.id;

      // 2. Create ProductImages
      if (v.uploadedImages.length > 0) {
        for (let idx = 0; idx < v.uploadedImages.length; idx++) {
          const img = v.uploadedImages[idx];
          const created = await tx.productImage.create({
            data: {
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
            }
          });
          if (idx === 0) {
            primaryImageRecord = { id: created.id, url: created.url };
          }
        }
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

    // ⚡ ASYNC BACKGROUND EMBEDDING: Không chặn UI, chạy ngầm sau khi lưu DB thành công
    const pId: string | null = createdProductId;
    const imgId: string | null = primaryImageRecord ? (primaryImageRecord as any).id : null;
    const imgUrl: string | null = primaryImageRecord ? (primaryImageRecord as any).url : null;

    if (pId && imgId && imgUrl) {
      setTimeout(() => {
        indexProductImageEmbedding(pId, imgId, imgUrl).catch((err: any) => {
          console.warn("[Background Embedding Failed]:", err?.message || err);
        });
      }, 100);
    }

    try {
      revalidatePath("/my-closet");
      revalidatePath("/my-closet/items");
      revalidatePath("/shop");
      revalidatePath("/");
    } catch(e) {
      console.error("Cache purge failed:", e);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Lỗi khi lưu vào Database" };
  }
}

// Lấy dữ liệu sản phẩm để sửa
export async function getProductForEditAction(productId: string) {
  try {
    const user = await requireUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        listings: true,
        images: true
      }
    });

    if (!product) {
      return { success: false, error: "Không tìm thấy món đồ" };
    }

    if (product.userId !== user.id && user.role !== "ADMIN") {
      return { success: false, error: "Bạn không có quyền chỉnh sửa món đồ này" };
    }

    const rentalListing = product.listings.find(l => l.listingType === "RENT");
    const saleListing = product.listings.find(l => l.listingType === "SELL");

    let styleData: any = {};
    try {
      if (product.style) styleData = JSON.parse(product.style);
    } catch {}

    return {
      success: true,
      product: {
        id: product.id,
        title: product.title,
        category: product.category,
        size: product.size,
        material: product.material || "",
        color: product.color || "",
        condition: product.condition === "GOOD" ? "Độ mới 95%" : "Độ mới 99% (Như mới)",
        occasion: product.occasion || "",
        description: product.description || "",
        province: product.province || "",
        ward: product.wardCode || "",
        bust: product.bust ? String(product.bust) : "",
        waist: product.waist ? String(product.waist) : "",
        hips: product.hips ? String(product.hips) : "",
        targetHeight: styleData.height || "",
        targetWeight: styleData.weight || "",
        images: (product.images || []).map(img => img.url),
        listings: {
          isRental: !!rentalListing,
          rentalPrice: rentalListing?.basePrice || 0,
          depositPercent: rentalListing?.deposit || 70,
          isSale: !!saleListing,
          salePrice: saleListing?.basePrice || 0,
        }
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Lỗi khi lấy thông tin sản phẩm" };
  }
}

// Cập nhật sản phẩm
export async function updateProductAction(productId: string, data: any) {
  try {
    const user = await requireUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { listings: true }
    });

    if (!existingProduct) {
      return { success: false, error: "Không tìm thấy món đồ" };
    }

    if (existingProduct.userId !== user.id && user.role !== "ADMIN") {
      return { success: false, error: "Bạn không có quyền chỉnh sửa món đồ này" };
    }

    const styleMeta = (data.targetHeight || data.targetWeight)
      ? JSON.stringify({ height: data.targetHeight || "", weight: data.targetWeight || "" })
      : existingProduct.style;

    await prisma.$transaction(async (tx) => {
      // 1. Cập nhật thông tin cơ bản
      await tx.product.update({
        where: { id: productId },
        data: {
          title: data.title || existingProduct.title,
          category: data.category || existingProduct.category,
          size: data.size || existingProduct.size,
          material: data.material || existingProduct.material,
          color: data.color || existingProduct.color,
          condition: data.condition?.includes("95") ? "GOOD" : "EXCELLENT",
          description: data.description ?? existingProduct.description,
          occasion: data.occasion || existingProduct.occasion,
          style: styleMeta,
          bust: data.bust ? Number(data.bust) : null,
          waist: data.waist ? Number(data.waist) : null,
          hips: data.hips ? Number(data.hips) : null
        }
      });

      // 2. Cập nhật listing thuê & bán
      if (data.listings) {
        if (data.listings.isRental) {
          const rentalListing = existingProduct.listings.find(l => l.listingType === "RENT");
          if (rentalListing) {
            await tx.listing.update({
              where: { id: rentalListing.id },
              data: {
                basePrice: data.listings.rentalPrice,
                deposit: data.listings.depositPercent
              }
            });
          } else {
            await tx.listing.create({
              data: {
                productId: productId,
                status: "AVAILABLE",
                listingType: "RENT",
                basePrice: data.listings.rentalPrice,
                deposit: data.listings.depositPercent,
                minDays: 3
              }
            });
          }
        }

        if (data.listings.isSale) {
          const saleListing = existingProduct.listings.find(l => l.listingType === "SELL");
          if (saleListing) {
            await tx.listing.update({
              where: { id: saleListing.id },
              data: {
                basePrice: data.listings.salePrice
              }
            });
          } else {
            await tx.listing.create({
              data: {
                productId: productId,
                status: "AVAILABLE",
                listingType: "SELL",
                basePrice: data.listings.salePrice,
                deposit: 0,
                minDays: 0
              }
            });
          }
        }
      }
    });

    revalidatePath("/my-closet");
    revalidatePath("/my-closet/items");
    revalidatePath(`/product/${productId}`);
    revalidatePath("/shop");
    revalidatePath("/");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Lỗi khi cập nhật sản phẩm" };
  }
}
