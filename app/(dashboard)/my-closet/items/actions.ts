"use server";

import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from "next/cache";
import { clearShopMemoryCache } from "@/app/actions/product";
import { clearProductDetailCache } from "@/src/lib/product-service";

export async function deleteProductAction(productId: string, _clientUserId?: string) {
  try {
    let authUser;
    try {
      authUser = await requireUser();
    } catch {
      return { success: false, error: "Bạn chưa đăng nhập" };
    }
    const userId = authUser.id;

    const txCheck = await prisma.$transaction(async (tx) => {
      // 🛡️ KHÓA DÒNG SẢN PHẨM ĐỒNG BỘ VỚI LUỒNG BOOKING CHỐNG ĐUA LỆNH (TOCTOU)
      try {
        await tx.$queryRaw`SELECT id FROM "products" WHERE id = ${productId} FOR UPDATE;`;
      } catch (_) {}

      const product = await tx.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          userId: true,
          // Lấy TOÀN BỘ lịch sử đơn (kể cả đã đánh dấu ẩn) để bảo toàn bằng chứng & ràng buộc khóa ngoại
          rentalHistory: {
            select: {
              id: true,
              status: true,
              invoice: { select: { status: true } }
            }
          }
        }
      });

      if (!product || (product.userId !== userId && authUser.role !== "ADMIN")) {
        return { allowed: false, error: "Không tìm thấy sản phẩm hoặc bạn không có quyền xóa" };
      }

      // 🛡️ CHỐT CHẶN BẢO MẬT ĐỒNG BỘ VỚI ĐƠN CHỜ & WEBHOOK:
      // Cấm xóa/lưu trữ sản phẩm khi có BẤT KỲ đơn hàng nào chưa kết thúc (bao gồm cả PENDING_APPROVAL đang mở link thanh toán lẫn đơn đã PAID/đang giao).
      // Chỉ cho phép xóa/lưu trữ khi mọi đơn trong lịch sử đều đã ở trạng thái kết thúc (LENDER_COMPLETED hoặc CANCELLED).
      const terminalStatuses = new Set(["LENDER_COMPLETED", "CANCELLED"]);
      const hasActiveOrPendingOrder = product.rentalHistory.some((r) => {
        return !terminalStatuses.has(r.status) || r.invoice?.status === "PENDING";
      });

      if (hasActiveOrPendingOrder) {
        return {
          allowed: false,
          error: "Không thể xóa hoặc lưu trữ sản phẩm đang có khách giữ chỗ thanh toán hoặc đang trong quá trình giao nhận/khiếu nại."
        };
      }

      // Nếu sản phẩm chưa từng phát sinh bất kỳ đơn thuê nào trong lịch sử, xóa vĩnh viễn (Hard Delete)
      if (!product.rentalHistory || product.rentalHistory.length === 0) {
        await tx.productImage.deleteMany({ where: { productId } });
        await tx.listing.deleteMany({ where: { productId } });
        await tx.productFavorite.deleteMany({ where: { productId } });
        await tx.blogPost.deleteMany({ where: { productId } });
        await tx.productLifecycle.deleteMany({ where: { productId } });
        await tx.product.delete({ where: { id: productId } });
      } else {
        // Nếu đã có đơn thuê trong quá khứ (đã LENDER_COMPLETED / CANCELLED), lưu trữ mềm để bảo toàn lịch sử đối soát
        await tx.product.update({
          where: { id: productId },
          data: { isDeleted: true, status: "IN_CLOSET" }
        });
        await tx.listing.updateMany({
          where: { productId },
          data: { isDeleted: true, status: "HIDDEN" }
        });
      }

      return { allowed: true };
    });

    if (!txCheck.allowed) {
      return { success: false, error: txCheck.error };
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
    return { success: false, error: "Lỗi khi xóa sản phẩm" };
  }
}

export async function toggleProductHideAction(productId: string, currentIsHidden: boolean, _clientUserId?: string) {
  try {
    let authUser;
    try {
      authUser = await requireUser();
    } catch {
      return { success: false, error: "Bạn chưa đăng nhập" };
    }
    const userId = authUser.id;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, userId: true }
    });

    if (!product || (product.userId !== userId && authUser.role !== "ADMIN")) {
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
    return { success: false, error: "Lỗi khi đổi trạng thái hiển thị" };
  }
}
