"use server";

import { prisma } from "@/src/lib/prisma";
import { createClient } from "@/src/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Toggle Like or Save for a product with atomic increment/decrement and unique constraints
 */
export async function toggleProductInteractionAction(productId: string, type: "LIKE" | "SAVE") {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "AUTH_REQUIRED", message: "Vui lòng đăng nhập để lưu hoặc thả tim sản phẩm." };
    }

    const userId = user.id;

    // Check if interaction already exists
    const existing = await prisma.productFavorite.findUnique({
      where: {
        userId_productId_type: {
          userId,
          productId,
          type
        }
      }
    });

    let isFavorited = false;
    let newCount = 0;

    await prisma.$transaction(async (tx) => {
      if (existing) {
        // 1. Remove Favorite
        await tx.productFavorite.delete({
          where: { id: existing.id }
        });

        // 2. Atomic Decrement with Math.max safeguard
        const updated = await tx.product.update({
          where: { id: productId },
          data: type === "LIKE" 
            ? { likeCount: { decrement: 1 } }
            : { saveCount: { decrement: 1 } },
          select: { likeCount: true, saveCount: true }
        });

        // Ensure non-negative count
        newCount = type === "LIKE" ? Math.max(0, updated.likeCount) : Math.max(0, updated.saveCount);
        if ((type === "LIKE" && updated.likeCount < 0) || (type === "SAVE" && updated.saveCount < 0)) {
          await tx.product.update({
            where: { id: productId },
            data: type === "LIKE" ? { likeCount: 0 } : { saveCount: 0 }
          });
        }
        isFavorited = false;
      } else {
        // 1. Create Favorite
        await tx.productFavorite.create({
          data: {
            userId,
            productId,
            type
          }
        });

        // 2. Atomic Increment
        const updated = await tx.product.update({
          where: { id: productId },
          data: type === "LIKE"
            ? { likeCount: { increment: 1 } }
            : { saveCount: { increment: 1 } },
          select: { likeCount: true, saveCount: true }
        });

        newCount = type === "LIKE" ? updated.likeCount : updated.saveCount;
        isFavorited = true;
      }
    });

    try {
      revalidatePath(`/product/${productId}`);
      revalidatePath("/my-closet/wishlist");
      revalidatePath("/");
    } catch (e) {}

    return { 
      success: true, 
      isFavorited, 
      newCount,
      type 
    };
  } catch (error: any) {
    console.error("Lỗi toggle favorite:", error);
    return { success: false, error: error.message || "Lỗi xử lý tương tác." };
  }
}

/**
 * Get current interaction status for a product for the active user
 */
export async function getProductInteractionStatusAction(productId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { likeCount: true, saveCount: true }
    });

    let isLiked = false;
    let isSaved = false;

    if (user) {
      const favorites = await prisma.productFavorite.findMany({
        where: {
          userId: user.id,
          productId
        }
      });
      isLiked = favorites.some(f => f.type === "LIKE");
      isSaved = favorites.some(f => f.type === "SAVE");
    }

    return {
      success: true,
      isLiked,
      isSaved,
      likeCount: product?.likeCount || 0,
      saveCount: product?.saveCount || 0
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get User Wishlist / Saved Items with detailed Availability State (Airbnb/Shopee standards)
 */
export async function getUserWishlistAction(filter: "ALL" | "SAVE" | "LIKE" = "SAVE") {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "AUTH_REQUIRED", items: [], counts: { all: 0, save: 0, like: 0 } };
    }

    const whereType = filter === "ALL" ? undefined : filter;

    const [favorites, allUserFavorites] = await Promise.all([
      prisma.productFavorite.findMany({
        where: {
          userId: user.id,
          type: whereType
        },
        orderBy: { createdAt: "desc" },
        include: {
          product: {
            include: {
              images: { orderBy: { sortOrder: "asc" } },
              user: { select: { id: true, name: true, avatar: true, rating: true } },
              listings: { where: { isDeleted: false } },
              rentalHistory: {
                where: {
                  status: { in: ["PENDING_APPROVAL", "OWNER_PACKED", "LENDER_SHIPPED", "BORROWER_RECEIVED", "BORROWER_RETURNED"] }
                },
                orderBy: { end_date: "desc" },
                take: 1
              }
            }
          }
        }
      }),
      prisma.productFavorite.findMany({
        where: { userId: user.id },
        select: { type: true }
      })
    ]);

    const counts = {
      all: allUserFavorites.length,
      save: allUserFavorites.filter(f => f.type === "SAVE").length,
      like: allUserFavorites.filter(f => f.type === "LIKE").length,
    };

    // Map and calculate availability
    const items = favorites.map(fav => {
      const p = fav.product;
      const primaryListing = p.listings?.[0];
      const activeRental = p.rentalHistory?.[0];
      
      const isAvailable = !activeRental && primaryListing?.status === "AVAILABLE" && p.status === "IN_CLOSET" && !p.isDeleted;
      const busyUntil = activeRental ? activeRental.end_date : null;

      return {
        favoriteId: fav.id,
        type: fav.type,
        savedAt: fav.createdAt,
        product: {
          id: p.id,
          title: p.title,
          size: p.size,
          category: p.category,
          brand: p.brand,
          province: p.province,
          likeCount: p.likeCount,
          saveCount: p.saveCount,
          image: p.images?.[0]?.url || "/placeholder-clothing.png",
          basePrice: primaryListing?.basePrice || 0,
          deposit: primaryListing?.deposit || 0,
          owner: p.user,
          isAvailable,
          busyUntil
        }
      };
    });

    return {
      success: true,
      items,
      counts
    };
  } catch (error: any) {
    console.error("Lỗi lấy danh sách Wishlist:", error);
    return { success: false, error: error.message, items: [], counts: { all: 0, save: 0, like: 0 } };
  }
}

/**
 * Big Tech HackerNews Time-Decay Gravity Trending Algorithm:
 * Score = (Likes + Saves * 2 + BoostWeight) / (Hours_Old + 2)^1.2
 */
export async function getTrendingProductsAction(limit: number = 10) {
  try {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const products = await prisma.product.findMany({
      where: {
        isDeleted: false,
        status: "IN_CLOSET",
        createdAt: { gte: sixtyDaysAgo }
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        user: { select: { id: true, name: true, avatar: true } },
        listings: { where: { status: "AVAILABLE" } }
      },
      take: 60
    });

    const now = Date.now();

    const scoredProducts = products.map(p => {
      const hoursOld = Math.max(0, (now - new Date(p.createdAt).getTime()) / (1000 * 60 * 60));
      const isBoosted = p.boostExpiresAt && new Date(p.boostExpiresAt) > new Date();
      const boostBonus = isBoosted ? 30 : p.isHighlighted ? 15 : 0;
      
      const rawPoints = (p.likeCount || 0) + ((p.saveCount || 0) * 2) + boostBonus;
      const gravity = 1.2;
      const score = (rawPoints + 1) / Math.pow(hoursOld + 2, gravity);

      return {
        ...p,
        trendingScore: score,
        isBoosted
      };
    });

    // Sort by Trending Score Descending
    scoredProducts.sort((a, b) => b.trendingScore - a.trendingScore);

    return {
      success: true,
      products: scoredProducts.slice(0, limit)
    };
  } catch (error: any) {
    console.error("Lỗi tính điểm Trending:", error);
    return { success: false, error: error.message, products: [] };
  }
}
