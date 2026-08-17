"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/auth";
import { revalidatePath } from "next/cache";


export async function completeOrderAction(orderId: string) {
  try {
    // 🛡️ 1. Authentication Check
    const userAuth = await requireUser();

    // 🛡️ 2. IDOR, Optimistic Locking & Partial Failure Prevention (ACID Transaction)
    // Sống cùng sống, chết cùng chết!
    let productIdToRevalidate: string | null = null;
    await prisma.$transaction(async (tx) => {
      // Fetch renterId and invoice to calculate dynamic refund amount
      const rental = await tx.rentalHistory.findUnique({
        where: { id: orderId },
        include: { invoice: true }
      });

      if (!rental) {
        throw new Error("Không tìm thấy đơn hàng.");
      }
      
      productIdToRevalidate = rental.product_id;

      // Atomic updateMany guarantees EXACTLY-ONCE execution.
      // Dùng cột ownerId đã phi chuẩn hóa, Prisma sẽ không báo lỗi!
      const updateResult = await tx.rentalHistory.updateMany({
        where: { 
          id: orderId,
          status: { in: ["BORROWER_RETURNED", "BORROWER_RECEIVED", "LENDER_SHIPPED"] },
          ownerId: userAuth.id 
        },
        data: { 
          status: "LENDER_COMPLETED",
          completedAt: new Date()
        }
      });

      if (updateResult.count === 0) {
        throw new Error("Giao dịch đã được hoàn tất trước đó, sai trạng thái, hoặc bạn không có quyền.");
      }

      const depositAmount = rental.invoice?.depositAmount || 0;
      const rentalFee = rental.invoice?.rentalFee || 0;

      // 💸 1. Hoàn Tiền Cọc (Refund Escrow) cho Khách Thuê:
      if (depositAmount > 0) {
        await tx.user.update({
          where: { id: rental.renterId },
          data: { cloopCoins: { increment: depositAmount } }
        });
      }

      // 💸 2. Thanh Toán Tiền Thuê (Rental Fee) cho Chủ Tủ (trừ 10% phí nền tảng):
      if (rentalFee > 0) {
        const platformFee = Math.floor(rentalFee * 0.1);
        const lenderEarnings = rentalFee - platformFee;

        await tx.user.update({
          where: { id: userAuth.id }, // userAuth is the owner according to our IDOR check
          data: { cloopCoins: { increment: lenderEarnings } }
        });
      }
    });

    try {
      revalidatePath("/my-closet/orders");
      if (productIdToRevalidate) {
        revalidatePath(`/product/${productIdToRevalidate}`);
      }
    } catch(e) {
      console.error("Cache purge failed:", e);
    }
    
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

    // 🛡️ 3. Atomic Dispute Creation & Optimistic Status Guard
    const isUpdated = await prisma.$transaction(async (tx: any) => {
      const updateCount = await tx.rentalHistory.updateMany({
        where: {
          id: orderId,
          status: { notIn: ["DISPUTE", "LENDER_COMPLETED"] }
        },
        data: { status: "DISPUTE" }
      });

      if (updateCount.count === 0) {
        return false;
      }

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

      return true;
    });

    if (!isUpdated) {
      return { success: false, error: "Đơn hàng đã được giải quyết hoặc đã có khiếu nại đang xử lý." };
    }

    try {
      revalidatePath("/my-closet/orders");
      if (rental?.product_id) {
        revalidatePath(`/product/${rental.product_id}`);
      }
    } catch(e) {
      console.error("Cache purge failed:", e);
    }

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

export async function submitReviewAction({
  rentalId,
  rating,
  comment,
  type
}: {
  rentalId: string;
  rating: number;
  comment: string;
  type: "RENTER_TO_OWNER" | "OWNER_TO_RENTER";
}) {
  try {
    const userAuth = await requireUser();

    return await prisma.$transaction(async (tx) => {
      // 1. Validate rental and permissions
      const rental = await tx.rentalHistory.findUnique({
        where: { id: rentalId }
      });

      if (!rental) {
        throw new Error("Không tìm thấy giao dịch.");
      }

      if (rental.status !== "LENDER_COMPLETED") {
        throw new Error("Chỉ có thể đánh giá khi giao dịch đã hoàn tất.");
      }

      const isRenter = rental.renterId === userAuth.id;
      const isOwner = rental.ownerId === userAuth.id;

      if (type === "RENTER_TO_OWNER" && !isRenter) {
        throw new Error("Forbidden: Bạn không phải Khách thuê của đơn này.");
      }
      if (type === "OWNER_TO_RENTER" && !isOwner) {
        throw new Error("Forbidden: Bạn không phải Chủ tủ của đơn này.");
      }

      const reviewerId = userAuth.id;
      const revieweeId = type === "RENTER_TO_OWNER" ? rental.ownerId! : rental.renterId;

      // 2. Kiểm tra xem user đã đánh giá chưa (tránh spam)
      const existingReview = await tx.review.findFirst({
        where: { rentalId, reviewerId, type }
      });

      if (existingReview) {
        throw new Error("Bạn đã đánh giá giao dịch này rồi.");
      }

      // 3. Tạo Review mới (Blind State)
      const newReview = await tx.review.create({
        data: {
          rentalId,
          reviewerId,
          revieweeId,
          rating,
          comment,
          type,
          isPublished: false
        }
      });

      // 4. Kiểm tra xem đối phương đã đánh giá chưa
      const oppositeType = type === "RENTER_TO_OWNER" ? "OWNER_TO_RENTER" : "RENTER_TO_OWNER";
      const oppositeReview = await tx.review.findFirst({
        where: { rentalId, type: oppositeType }
      });

      // Nếu đối phương đã đánh giá => Cả 2 đều nộp bài => LẬT BÀI NGỬA (Reveal)
      if (oppositeReview) {
        // Cập nhật isPublished = true cho cả 2
        await tx.review.updateMany({
          where: { rentalId },
          data: { isPublished: true }
        });

        // Hàm helper để update rating trung bình (O(1) Aggregation)
        const updateAvgRating = async (userId: string, newRating: number) => {
          const user = await tx.user.findUnique({ where: { id: userId }, select: { rating: true, reviewCount: true } });
          if (user) {
            const currentCount = user.reviewCount || 0;
            const currentTotal = user.rating * currentCount;
            const newCount = currentCount + 1;
            const newAvg = (currentTotal + newRating) / newCount;

            await tx.user.update({
              where: { id: userId },
              data: {
                rating: newAvg,
                reviewCount: newCount
              }
            });
          }
        };

        // Cập nhật cho CẢ HAI user
        await updateAvgRating(revieweeId, newReview.rating); // Update người vừa bị đánh giá
        await updateAvgRating(reviewerId, oppositeReview.rating); // Update người vừa đánh giá (từ bài review cũ của đối phương)
      }

      try {
        revalidatePath("/my-closet/orders");
        revalidatePath(`/closet/${revieweeId}`);
        if (rental?.product_id) {
          revalidatePath(`/product/${rental.product_id}`);
        }
      } catch(e) {
        console.error("Cache purge failed:", e);
      }
      return { success: true };
    });
  } catch (error: any) {
    console.error("Lỗi khi gửi đánh giá:", error);
    return { success: false, error: error.message || "Lỗi khi gửi đánh giá." };
  }
}

export async function getScrubbedReviewsAction(targetUserId: string, currentUserId?: string) {
  try {
    const rawReviews = await prisma.review.findMany({
      where: { revieweeId: targetUserId },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: { select: { id: true, name: true, avatar: true } },
        rental: { select: { id: true, product: { select: { title: true } } } }
      }
    });

    const scrubbed = rawReviews.map(review => {
      // THE BLIND LOGIC: Mask data if not published AND viewer is the reviewee
      if (!review.isPublished && review.revieweeId === currentUserId) {
        return {
          ...review,
          rating: null,
          comment: "HIDDEN_BY_SERVER", // Absolute server-side scrubbing
          isMasked: true
        };
      }
      return {
        ...review,
        isMasked: false
      };
    });

    return { success: true, reviews: scrubbed };
  } catch (error: any) {
    console.error("Lỗi fetch reviews:", error);
    return { success: false, error: "Không thể lấy đánh giá." };
  }
}
