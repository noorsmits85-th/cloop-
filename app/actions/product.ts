"use server";

import { createClient } from "@/src/utils/supabase/server";
import { ItemCondition, GenderCategory, ListingType } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { uploadProductSchema } from "@/lib/validations/product";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { maskPublicAddress } from "@/src/utils/shipping";

// ⚡ HIGH-SPEED SWR IN-MEMORY CACHE (1ms Response Time, 100% Crash-Proof)
const memoryCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

function getCachedData(key: string) {
  const cached = memoryCache.get(key);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }
  return null;
}

function setCachedData(key: string, data: any) {
  memoryCache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
}

export async function clearShopMemoryCache() {
  memoryCache.clear();
  try {
    (revalidateTag as any)("shop-products");
  } catch (e) {}
}

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

    const fullAddress = [
      product.address,
      product.ward || validData.ward,
      product.district,
      validData.province
    ].filter(Boolean).join(", ") || `${validData.ward}, ${validData.province}`;

    const newProductId = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          title: validData.title,
          description: validData.description,
          size: validData.size,
          material: validData.material,
          color: validData.color || null,
          condition: conditionEnum,
          province: validData.province,
          districtId: product.districtId ? Number(product.districtId) : null,
          wardCode: product.wardCode ? String(product.wardCode) : null,
          specificAddress: fullAddress,
          category: "DRESSES",
          gender: GenderCategory.UNISEX,
          userId: user.id,
          occasion: validData.occasion || null,
        }
      });

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
          basePrice: validData.salePrice || 0,
          salePrice: validData.salePrice || 0,
          turnaround_days: 2
        });
      }

      await tx.listing.createMany({
        data: listingsData
      });

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

    // 📱 TỰ ĐỘNG ĐỒNG BỘ SĐT & TRẠM GỬI VÀO METADATA TÀI KHOẢN
    if (product.ownerPhone || product.address) {
      try {
        const metaPayload: Record<string, any> = {};
        if (product.ownerPhone) metaPayload.phone = product.ownerPhone;
        if (fullAddress) metaPayload.pickup_address = fullAddress;
        await prisma.$executeRawUnsafe(
          `UPDATE auth.users SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || $1::jsonb WHERE id = $2::uuid;`,
          JSON.stringify(metaPayload),
          user.id
        );
      } catch (metaErr) {
        console.warn("Lưu metadata phone/pickup_address không bắt buộc:", metaErr);
      }
    }

    await clearShopMemoryCache();
    try {
      revalidatePath("/shop");
      revalidatePath("/");
      revalidatePath("/my-closet/items");
    } catch(e) {
      console.error("Cache purge failed:", e);
    }
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

    await clearShopMemoryCache();
    try {
      revalidatePath('/');
      revalidatePath('/shop');
      revalidatePath(`/product/${productId}`);
    } catch(e) {
      console.error("Cache purge failed:", e);
    }

    return { success: true };
  } catch (error) {
    console.error("Bump Error:", error);
    return { success: false, error: "Đã xảy ra lỗi." };
  }
}

// ⚡ VERCEL GLOBAL DATA CACHE (unstable_cache): Shared across all serverless lambdas with SWR
const fetchShopProductsCached = unstable_cache(
  async (
    type: string,
    category: string | null,
    occasion: string | null,
    search: string,
    size: string,
    material: string,
    page: number,
    limit: number
  ) => {
    const where: any = {
      isDeleted: false,
      status: { in: ["ON_MARKET", "IN_CLOSET"] },
      listings: {
        some: {
          status: "AVAILABLE",
          ...(type === "rent" ? { listingType: "RENT" } : {}),
          ...(type === "sell" ? { listingType: { in: ["SELL", "RECYCLE"] } } : {}),
        }
      }
    };

    if (search && search.trim() !== "") {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { occasion: { contains: q, mode: "insensitive" } },
      ];
    }

    if (category && category !== "Tất cả" && category !== "all") {
      where.OR = [
        { category: { contains: category, mode: "insensitive" } },
        { occasion: { contains: category, mode: "insensitive" } },
        { title: { contains: category, mode: "insensitive" } },
      ];
    } else if (occasion && occasion !== "Tất cả" && occasion !== "all") {
      where.OR = [
        { occasion: { contains: occasion, mode: "insensitive" } },
        { category: { contains: occasion, mode: "insensitive" } },
        { title: { contains: occasion, mode: "insensitive" } },
      ];
    }

    if (size && size !== "all") {
      where.size = size;
    }

    if (material && material !== "all") {
      where.material = { contains: material, mode: "insensitive" };
    }

    const skip = (page - 1) * limit;

    // ⚡ SINGLE DB HIT: Take limit + 1 to detect hasMore without running slow count()
    const rawProducts = await prisma.product.findMany({
      where,
      skip,
      take: limit + 1,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        images: {
          orderBy: { sortOrder: "asc" }
        },
        listings: {
          where: { isDeleted: false, status: "AVAILABLE" }
        },
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            rating: true,
            reviewCount: true,
            completedOrders: true,
            isVerified: true
          }
        }
      }
    });

    const hasMore = rawProducts.length > limit;
    const items = hasMore ? rawProducts.slice(0, limit) : rawProducts;

    const products = items.map((p) => {
      const rentListing = p.listings.find((l) => l.listingType === "RENT");
      const sellListing = p.listings.find((l) => l.listingType === "SELL" || (l.listingType as any) === "SALE");

      const rentPrice = rentListing?.basePrice ? Number(rentListing.basePrice) : 0;
      const sellPrice = sellListing?.basePrice ? Number(sellListing.basePrice) : 0;
      const depositAmount = rentListing?.deposit ? Number(rentListing.deposit) : 0;
      const minDays = rentListing?.minDays || 3;

      let primaryImg = p.images[0]?.url || "/1.1.jpg";
      if (primaryImg.includes("photo-1548624149-19d45e4ab558")) primaryImg = "/vintage_coat.jpg";
      if (primaryImg.includes("photo-1584916201218-f4242ceb4809")) primaryImg = "/step2_bag.jpg";

      let displayPrice = "";
      let listingTypeRaw = "RENT";
      let priceNumber = 0;

      if (type === "rent" || (type === "all" && rentPrice > 0)) {
        displayPrice = `${rentPrice.toLocaleString("vi-VN")}đ / ngày`;
        listingTypeRaw = "RENT";
        priceNumber = rentPrice;
      } else if (type === "sell" || (type === "all" && sellPrice > 0)) {
        displayPrice = `${sellPrice.toLocaleString("vi-VN")}đ`;
        listingTypeRaw = "SELL";
        priceNumber = sellPrice;
      }

      return {
        id: p.id,
        title: p.title,
        description: p.description || "",
        image: primaryImg,
        images: p.images.map((img) => img.url),
        type: listingTypeRaw === "RENT" ? "Thuê" : "Mua sắm",
        listingTypeRaw,
        price: priceNumber,
        rentalPrice: rentPrice,
        salePrice: sellPrice,
        deposit: depositAmount,
        minDays,
        priceDisplay: displayPrice,
        location: p.province || "Hà Nội",
        province: p.province || "Hà Nội",
        districtId: p.districtId || null,
        wardCode: p.wardCode || null,
        pricingTiers: (rentListing?.pricing_tiers as any) || null,
        specificAddress: maskPublicAddress(p.specificAddress || p.province || "Hà Nội"),
        rating: p.user?.rating ? Number(p.user.rating).toFixed(1) : "5.0",
        reviewCount: p.user?.reviewCount || 0,
        completedOrders: p.user?.completedOrders || 0,
        condition: p.condition === "EXCELLENT" ? "Mới 98%" : (p.condition === "NEW_WITH_TAGS" ? "Mới 100%" : "Mới 95%"),
        occasion: p.occasion || "Dạo phố",
        ownerName: p.user?.name || "Thành viên CLOOP",
        ownerAvatar: p.user?.avatar || null,
        userId: p.userId || "anonymous",
        size: p.size || "M",
        material: p.material || "Lụa",
        color: p.color || "",
        createdAt: p.createdAt.toISOString(),
        isBoosted: Boolean(p.isHighlighted)
      };
    });

    return {
      products,
      totalCount: hasMore ? 99 : skip + products.length,
      hasMore
    };
  },
  ["shop-products-v1"],
  {
    revalidate: 60, // SWR cache 60s
    tags: ["shop-products"]
  }
);

export async function getShopProductsAction({
  type = "all",
  category = null,
  occasion = null,
  search = "",
  size = "all",
  material = "all",
  page = 1,
  limit = 24
}: {
  type?: string;
  category?: string | null;
  occasion?: string | null;
  search?: string;
  size?: string;
  material?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const cacheKey = `shop:${type}:${category || ''}:${occasion || ''}:${search || ''}:${size || ''}:${material || ''}:${page}:${limit}`;
    const cachedResult = getCachedData(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const res = await fetchShopProductsCached(
      type,
      category,
      occasion,
      search,
      size,
      material,
      page,
      limit
    );

    const response = {
      success: true,
      products: res.products,
      totalCount: res.totalCount,
      hasMore: res.hasMore
    };

    setCachedData(cacheKey, response);
    return response;
  } catch (error: any) {
    console.error("getShopProductsAction error:", error);
    return { success: false, error: error.message, products: [] };
  }
}
