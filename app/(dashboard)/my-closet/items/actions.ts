"use server";

import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from "next/cache";
import { clearShopMemoryCache } from "@/app/actions/product";
import { clearProductDetailCache } from "@/src/lib/product-service";

export async function deleteProductAction(productId: string, clientUserId?: string) {
  try {
    let userId: string | null = null;
    try {
      const user = await requireUser();
      if (user?.id) userId = user.id;
    } catch (_) {}

    if (!userId && clientUserId) {
      userId = clientUserId;
    }

    if (!userId) {
      return { success: false, error: "Bạn chưa đăng nhập" };
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        userId: true,
        rentalHistory: {
          select: { id: true }
        }
      }
    });

    if (!product || product.userId !== userId) {
      return { success: false, error: "Không tìm thấy sản phẩm hoặc bạn không có quyền xóa" };
    }

    // Nếu sản phẩm chưa từng phát sinh đơn thuê, xóa vĩnh viễn (Hard Delete) cùng các liên kết
    if (!product.rentalHistory || product.rentalHistory.length === 0) {
      await prisma.$transaction([
        prisma.productImage.deleteMany({ where: { productId } }),
        prisma.listing.deleteMany({ where: { productId } }),
        prisma.productFavorite.deleteMany({ where: { productId } }),
        prisma.blogPost.deleteMany({ where: { productId } }),
        prisma.productLifecycle.deleteMany({ where: { productId } }),
        prisma.product.delete({ where: { id: productId } })
      ]);
    } else {
      // Nếu đã có đơn thuê trong quá khứ, đánh dấu lưu trữ và ẩn hoàn toàn khỏi sàn
      await prisma.$transaction([
        prisma.product.update({
          where: { id: productId },
          data: { isDeleted: true, status: "IN_CLOSET" }
        }),
        prisma.listing.updateMany({
          where: { productId },
          data: { isDeleted: true, status: "HIDDEN" }
        })
      ]);
    }

    // Xóa sạch toàn bộ In-Memory Cache và Next.js Cache của Sàn ngay lập tức
    clearProductDetailCache(productId);
    await clearShopMemoryCache();

    try {
      revalidatePath("/my-closet");
      revalidatePath("/my-closet/items");
      revalidatePath("/shop");
      revalidatePath("/app");
      revalidatePath("/");
      revalidatePath(`/product/${productId}`);
    } catch (e) {}

    return { success: true };
  } catch (error: any) {
    console.error("Delete product error:", error);
    return { success: false, error: error.message || "Lỗi khi xóa sản phẩm" };
  }
}

export async function toggleProductHideAction(productId: string, currentIsHidden: boolean, clientUserId?: string) {
  try {
    let userId: string | null = null;
    try {
      const user = await requireUser();
      if (user?.id) userId = user.id;
    } catch (_) {}

    if (!userId && clientUserId) {
      userId = clientUserId;
    }

    if (!userId) {
      return { success: false, error: "Bạn chưa đăng nhập" };
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, userId: true }
    });

    if (!product || product.userId !== userId) {
      return { success: false, error: "Không tìm thấy sản phẩm" };
    }

    const nextStatus = currentIsHidden ? "AVAILABLE" : "HIDDEN";

    await prisma.listing.updateMany({
      where: { productId, isDeleted: false },
      data: { status: nextStatus }
    });

    // Xóa sạch toàn bộ In-Memory Cache và Next.js Cache của Sàn
    clearProductDetailCache(productId);
    await clearShopMemoryCache();

    try {
      revalidatePath("/my-closet");
      revalidatePath("/my-closet/items");
      revalidatePath("/shop");
      revalidatePath("/app");
      revalidatePath("/");
      revalidatePath(`/product/${productId}`);
    } catch (e) {}

    return { success: true, isHidden: !currentIsHidden };
  } catch (error: any) {
    console.error("Toggle hide error:", error);
    return { success: false, error: error.message || "Lỗi khi đổi trạng thái hiển thị" };
  }
}
