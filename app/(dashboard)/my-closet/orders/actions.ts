"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/auth";
import { revalidatePath } from "next/cache";

export async function submitReviewAction({
  rentalHistoryId,
  reviewerId,
  revieweeId,
  rating,
  type,
  comment,
  updateField
}: {
  rentalHistoryId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  type: string;
  comment: string;
  updateField: Record<string, any>;
}) {
  try {
    // 🛡️ 1. Authentication Check
    const userAuth = await requireUser();
    if (userAuth.id !== reviewerId) {
      return { success: false, error: "Unauthorized: Định danh người đánh giá không hợp lệ." };
    }

    // 🛡️ 2. IDOR / Authorization Check
    const rental = await prisma.rentalHistory.findUnique({
      where: { id: rentalHistoryId },
      include: { product: true }
    });

    if (!rental) {
      return { success: false, error: "Không tìm thấy thông tin đơn hàng." };
    }

    const isRenter = rental.renterId === userAuth.id;
    const isOwner = rental.product.userId === userAuth.id;

    if (!isRenter && !isOwner) {
      return { success: false, error: "Forbidden: Bạn không tham gia vào giao dịch này." };
    }

    // 🛡️ 3. Atomic Transaction
    await prisma.$transaction(async (tx: any) => {
      await tx.review.create({
        data: {
          rentalHistoryId,
          reviewerId,
          revieweeId,
          rating,
          type: type as any,
          comment
        }
      });
      
      await tx.rentalHistory.update({
        where: { id: rentalHistoryId },
        data: updateField
      });
    });

    revalidatePath("/my-closet/orders");
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi khi gửi đánh giá:", error);
    return { success: false, error: error.message || "Lỗi xử lý đánh giá." };
  }
}

export async function completeOrderAction(orderId: string) {
  try {
    // 🛡️ 1. Authentication Check
    const userAuth = await requireUser();

    // 🛡️ 2. IDOR Protection: Verify ownership
    const rental = await prisma.rentalHistory.findUnique({
      where: { id: orderId },
      include: { product: true }
    });

    if (!rental) {
      return { success: false, error: "Không tìm thấy đơn hàng." };
    }

    if (rental.product.userId !== userAuth.id) {
      return { success: false, error: "Forbidden: Bạn không phải chủ sở hữu món đồ này để xác nhận nhận lại đồ." };
    }

    // 🛡️ 3. Update Order Status
    await prisma.rentalHistory.update({
      where: { id: orderId },
      data: { status: "LENDER_COMPLETED" }
    });

    revalidatePath("/my-closet/orders");
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi khi hoàn tất đơn:", error);
    return { success: false, error: error.message || "Lỗi khi hoàn tất đơn hàng." };
  }
}

export async function raiseDisputeAction(orderId: string, description: string, images: string[]) {
  try {
    // 🛡️ 1. Authentication Check
    const userAuth = await requireUser();

    // 🛡️ 2. IDOR & Relation Verification
    const rental = await prisma.rentalHistory.findUnique({
      where: { id: orderId },
      include: { product: true, invoice: true }
    });

    if (!rental) {
      return { success: false, error: "Không tìm thấy đơn hàng." };
    }

    const isPartyInvolved = rental.renterId === userAuth.id || rental.product.userId === userAuth.id;
    if (!isPartyInvolved) {
      return { success: false, error: "Forbidden: Bạn không có quyền khiếu nại cho đơn hàng này." };
    }

    // 🛡️ 3. Atomic Dispute Creation & Escrow Lock Binding
    await prisma.$transaction(async (tx: any) => {
      await tx.dispute.create({
        data: {
          rentalId: orderId,
          invoiceId: rental.invoice?.id || null,
          description: description,
          images: images,
          severity: "MEDIUM",
          suggestedDeduction: 0,
          status: "PENDING_REVIEW"
        }
      });
      
      await tx.rentalHistory.update({
        where: { id: orderId },
        data: { status: "DISPUTE" }
      });
    });

    revalidatePath("/my-closet/orders");
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi khi báo cáo sự cố:", error);
    return { success: false, error: error.message || "Lỗi khi báo cáo sự cố." };
  }
}

export async function loadMoreOrdersAction({
  mode,
  cursor,
  limit = 20
}: {
  mode: "owner" | "renter";
  cursor?: string | null;
  limit?: number;
}) {
  try {
    const userAuth = await requireUser();
    const isOwner = mode === "owner";

    const getReviewStats = (reviews: any[]) => {
      if (!reviews || reviews.length === 0) return { avg: "5.0", count: 0 };
      const total = reviews.reduce((acc, rev) => acc + rev.rating, 0);
      return { avg: (total / reviews.length).toFixed(1), count: reviews.length };
    };

    const rawOrders = await prisma.rentalHistory.findMany({
      where: isOwner
        ? { product: { userId: userAuth.id } }
        : { renterId: userAuth.id },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: isOwner
        ? {
            product: { include: { images: true } },
            renter: {
              include: {
                reviewsReceived: { where: { type: "OWNER_TO_RENTER" } }
              }
            }
          }
        : {
            product: {
              include: {
                images: true,
                user: {
                  include: {
                    reviewsReceived: { where: { type: "RENTER_TO_OWNER" } }
                  }
                }
              }
            }
          }
    });

    const hasMore = rawOrders.length > limit;
    const pagedOrders = hasMore ? rawOrders.slice(0, limit) : rawOrders;

    const mapped = pagedOrders.map((order: any) => {
      if (isOwner) {
        const renterStats = getReviewStats(order.renter?.reviewsReceived || []);
        return {
          ...order,
          renter_name: order.renter?.name || order.renterId,
          renterAvg: renterStats.avg,
          renterReviewCount: renterStats.count,
          products: {
            title: order.product?.title,
            image_url: order.product?.images?.[0]?.url
          }
        };
      } else {
        const ownerStats = getReviewStats(order.product?.user?.reviewsReceived || []);
        return {
          ...order,
          owner_name: order.product?.user?.name || order.product?.userId,
          ownerAvg: ownerStats.avg,
          ownerReviewCount: ownerStats.count,
          products: {
            title: order.product?.title,
            image_url: order.product?.images?.[0]?.url
          }
        };
      }
    });

    return {
      success: true,
      orders: mapped,
      hasMore,
      nextCursor: mapped.length > 0 ? mapped[mapped.length - 1].id : null
    };
  } catch (error: any) {
    console.error("Lỗi khi tải thêm đơn hàng:", error);
    return { success: false, error: error.message || "Lỗi khi tải thêm đơn hàng." };
  }
}


