import { prisma } from "@/src/lib/prisma";
import { unstable_cache } from "next/cache";
import { maskPublicAddress } from "@/src/utils/shipping";

export interface ShopProductItem {
  id: string;
  title: string;
  description: string;
  image: string;
  images: string[];
  type: string;
  listingTypeRaw: string;
  price: number;
  rentalPrice: number;
  salePrice: number;
  deposit: number;
  minDays: number;
  priceDisplay: string;
  location: string;
  province: string;
  districtId: number | null;
  wardCode: string | null;
  pricingTiers: any;
  specificAddress: string;
  rating: string;
  reviewCount: number;
  completedOrders: number;
  condition: string;
  occasion: string;
  category: string;
  ownerName: string;
  ownerAvatar: string | null;
  userId: string;
  size: string;
  material: string;
  color: string;
  style: string;
  bust: number | null;
  waist: number | null;
  hips: number | null;
  createdAt: string;
  isBoosted: boolean;
  boostExpiresAt: string | null;
  boostScore: number;
  storeRetailPrice: number;
}

export interface ShopQueryResult {
  products: ShopProductItem[];
  totalCount: number;
  hasMore: boolean;
}

export interface ShopFilterParams {
  type?: string;
  category?: string | null;
  occasion?: string | null;
  search?: string;
  size?: string;
  material?: string;
  page?: number;
  limit?: number;
}

async function fetchShopProductsFromDb(
  type: string = "all",
  category: string | null = null,
  occasion: string | null = null,
  search: string = "",
  size: string = "all",
  material: string = "all",
  page: number = 1,
  limit: number = 24
): Promise<ShopQueryResult> {
  const where: any = {
    isDeleted: false,
    status: { in: ["ON_MARKET", "IN_CLOSET"] },
    listings: {
      some: {
        isDeleted: false,
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

  // Single DB query: find matching products with relations
  const rawProducts = await prisma.product.findMany({
    where,
    skip,
    take: limit + 1,
    orderBy: [
      { lastBumpedAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
      { id: "desc" }
    ],
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

  // ⚡ THUẬT TOÁN ĐUA TOP SÀN (Competitive Boost Racing):
  const now = new Date();
  rawProducts.sort((a, b) => {
    const aActive = Boolean(a.boostExpiresAt && new Date(a.boostExpiresAt) > now);
    const bActive = Boolean(b.boostExpiresAt && new Date(b.boostExpiresAt) > now);

    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;

    if (aActive && bActive) {
      const aScore = (a as any).boostScore || 0;
      const bScore = (b as any).boostScore || 0;
      if (bScore !== aScore) return bScore - aScore;

      const aTime = new Date(a.boostExpiresAt!).getTime();
      const bTime = new Date(b.boostExpiresAt!).getTime();
      if (bTime !== aTime) return bTime - aTime;
    }

    const aBump = (a.lastBumpedAt ? new Date(a.lastBumpedAt) : new Date(a.createdAt)).getTime();
    const bBump = (b.lastBumpedAt ? new Date(b.lastBumpedAt) : new Date(b.createdAt)).getTime();
    if (bBump !== aBump) return bBump - aBump;
    // ⚡ DETERMINISTIC TIE-BREAKER: Chống lệch trang và trùng lặp sản phẩm khi phân trang
    return b.id.localeCompare(a.id);
  });

  const hasMore = rawProducts.length > limit;
  const items = hasMore ? rawProducts.slice(0, limit) : rawProducts;

  const products: ShopProductItem[] = items.map((p) => {
    const rentListing = p.listings.find((l) => l.listingType === "RENT");
    const sellListing = p.listings.find((l) => l.listingType === "SELL" || (l.listingType as any) === "SALE");

    const rentPrice = rentListing?.basePrice ? Number(rentListing.basePrice) : 0;
    const sellPrice = sellListing?.basePrice ? Number(sellListing.basePrice) : 0;
    const depositAmount = rentListing?.deposit ? Number(rentListing.deposit) : 0;
    const minDays = rentListing?.minDays || 3;

    let primaryImg = p.images[0]?.url || "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790530424/cloop_mobile_closet/pt4xccwmvrjsrnhrgnib.png";

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
      location: maskPublicAddress(p.specificAddress || p.province, "Toàn quốc"),
      province: p.province || "Toàn quốc",
      districtId: p.districtId || null,
      wardCode: p.wardCode || null,
      pricingTiers: (rentListing?.pricing_tiers as any) || null,
      specificAddress: maskPublicAddress(p.specificAddress || p.province, "Toàn quốc"),
      rating: p.user?.rating ? Number(p.user.rating).toFixed(1) : "5.0",
      reviewCount: p.user?.reviewCount || 0,
      completedOrders: p.user?.completedOrders || 0,
      condition: p.condition === "EXCELLENT" ? "Mới 98%" : (p.condition === "NEW_WITH_TAGS" ? "Mới 100%" : "Mới 95%"),
      occasion: p.occasion || "Dạo phố",
      category: p.category || "Áo",
      ownerName: p.user?.name || "Thành viên CLOOP",
      ownerAvatar: p.user?.avatar || null,
      userId: p.userId || "anonymous",
      size: p.size || "M",
      material: p.material || "Lụa",
      color: p.color || "",
      style: p.style || "",
      bust: p.bust || null,
      waist: p.waist || null,
      hips: p.hips || null,
      createdAt: p.createdAt.toISOString(),
      isBoosted: Boolean(p.isHighlighted || (p.boostExpiresAt && new Date(p.boostExpiresAt) > new Date())),
      boostExpiresAt: p.boostExpiresAt?.toISOString() || null,
      boostScore: (p as any).boostScore || 0,
      storeRetailPrice: Number(p.originalPrice || 0)
    };
  });

  return {
    products,
    totalCount: hasMore ? 99 : skip + products.length,
    hasMore
  };
}

// ⚡ VERCEL GLOBAL DATA CACHE: 30 seconds SWR on global edge network
const fetchShopProductsCached = unstable_cache(
  fetchShopProductsFromDb,
  ["cloop-shop-products-v3"],
  {
    revalidate: 30,
    tags: ["products", "shop-products"]
  }
);

/**
 * Server Query cho sàn đồ CLOOP (Clean Server Function, KHÔNG PHẢI Server Action)
 * Được gọi trực tiếp từ Server Component (page.tsx)
 */
export async function getShopProducts(params: ShopFilterParams): Promise<ShopQueryResult> {
  // ⚡ HỢP NHẤT VÀ CHUẨN HÓA CATEGORY / OCCASION:
  // Dù URL truyền ?category= hay ?occasion=, đều được quy về 1 giá trị duy nhất
  // giúp unstable_cache luôn trúng 100% Cache Key duy nhất cho cùng một danh mục lọc
  const type = (params.type || "all").trim().toLowerCase();
  const unifiedCategory = (params.category || params.occasion || "").trim();
  const category = unifiedCategory && unifiedCategory !== "Tất cả" && unifiedCategory !== "all"
    ? unifiedCategory
    : null;
  const occasion = null;
  const search = params.search ? params.search.trim().toLowerCase() : "";
  const size = (params.size || "all").trim();
  const material = (params.material || "all").trim().toLowerCase();
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Number(params.limit) || 24);

  try {
    return await fetchShopProductsCached(
      type,
      category,
      occasion,
      search,
      size,
      material,
      page,
      limit
    );
  } catch (error) {
    console.error("fetchShopProductsCached fallback to direct DB:", error);
    return await fetchShopProductsFromDb(
      type,
      category,
      occasion,
      search,
      size,
      material,
      page,
      limit
    );
  }
}
