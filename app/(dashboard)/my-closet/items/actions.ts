"use server";

import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteProductAction(productId: string) {
  try {
    const user = await requireUser();
    if (!user) {
      return { success: false, error: "Bạn chưa đăng nhập" };
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, userId: true }
    });

    if (!product || product.userId !== user.id) {
      return { success: false, error: "Không tìm thấy sản phẩm hoặc bạn không có quyền xóa" };
    }

    // Soft delete product & listings
    await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: { isDeleted: true }
      }),
      prisma.listing.updateMany({
        where: { productId },
        data: { isDeleted: true, status: "HIDDEN" }
      })
    ]);

    revalidatePath("/my-closet");
    revalidatePath("/my-closet/items");
    revalidatePath("/shop");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("Delete product error:", error);
    return { success: false, error: error.message || "Lỗi khi xóa sản phẩm" };
  }
}

export async function toggleProductHideAction(productId: string, currentIsHidden: boolean) {
  try {
    const user = await requireUser();
    if (!user) {
      return { success: false, error: "Bạn chưa đăng nhập" };
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, userId: true }
    });

    if (!product || product.userId !== user.id) {
      return { success: false, error: "Không tìm thấy sản phẩm" };
    }

    const nextStatus = currentIsHidden ? "AVAILABLE" : "HIDDEN";

    await prisma.listing.updateMany({
      where: { productId, isDeleted: false },
      data: { status: nextStatus }
    });

    revalidatePath("/my-closet");
    revalidatePath("/my-closet/items");
    revalidatePath("/shop");
    revalidatePath("/");

    return { success: true, isHidden: !currentIsHidden };
  } catch (error: any) {
    console.error("Toggle hide error:", error);
    return { success: false, error: error.message || "Lỗi khi đổi trạng thái hiển thị" };
  }
}
