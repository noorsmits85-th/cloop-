"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/auth";
import { clearProductDetailCache } from "@/src/lib/product-service";
import { revalidatePath } from "next/cache";

interface SubmitProductReviewInput {
  productId: string;
  rating: number;
  comment: string;
  images?: string[];
  videos?: Array<{ url: string; thumbnailUrl?: string; duration?: string }>;
  tags?: string[];
  materialFeedback?: string;
  accuracyFeedback?: string;
}

/**
 * 🛡️ SERVER ACTION: GỬI ĐÁNH GIÁ SẢN PHẨM XÁC THỰC (CHỐNG SPAM)
 * Điều kiện:
 * 1. Bắt buộc người dùng phải đăng nhập
 * 2. Bắt buộc người dùng PHẢI TỪNG THUÊ trang phục này
 * 3. Đơn thuê PHẢI Ở TRẠNG THÁI HOÀN TẤT (LENDER_COMPLETED hoặc BORROWER_RETURNED)
 * 4. Không được đánh giá trùng lặp cùng một đơn hàng
 */
export async function submitVerifiedProductReviewAction(input: SubmitProductReviewInput) {
  try {
    const { productId, rating, comment, images = [], videos = [], tags = [] } = input;

    if (!productId) {
      return { success: false, error: "Thiếu mã sản phẩm." };
    }

    if (!rating || rating < 1 || rating > 5) {
      return { success: false, error: "Số sao đánh giá phải từ 1 đến 5 sao." };
    }

    // 1. Kiểm tra đăng nhập
    let authUser;
    try {
      authUser = await requireUser();
    } catch {
      return { success: false, error: "Vui lòng đăng nhập để viết đánh giá cho trang phục này." };
    }

    // 2. Tìm đơn thuê ĐÃ HOÀN TẤT của user này cho món đồ này
    const eligibleRental = await prisma.rentalHistory.findFirst({
      where: {
        product_id: productId,
        renterId: authUser.id,
        isDeleted: false,
        status: { in: ["LENDER_COMPLETED", "BORROWER_RETURNED"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            userId: true,
          },
        },
        reviews: {
          where: {
            reviewerId: authUser.id,
            type: "RENTER_TO_OWNER",
          },
        },
      },
    });

    // 3. Nếu không tìm thấy đơn hoàn tất, kiểm tra xem có đơn nào chưa hoàn tất không
    if (!eligibleRental) {
      const activeRental = await prisma.rentalHistory.findFirst({
        where: {
          product_id: productId,
          renterId: authUser.id,
          isDeleted: false,
        },
      });

      if (activeRental) {
        return {
          success: false,
          error: "Đơn thuê của bạn hiện chưa hoàn tất trả đồ. Bạn sẽ có thể đánh giá sau khi hoàn tất trải nghiệm nhé!",
        };
      }

      return {
        success: false,
        error: "Chỉ khách hàng đã từng thuê và hoàn tất đơn hàng mới có thể đánh giá trang phục này nhằm bảo đảm xác thực và chống spam.",
      };
    }

    // 4. Kiểm tra xem đơn hoàn tất này đã được đánh giá chưa
    if (eligibleRental.reviews.length > 0) {
      return {
        success: false,
        error: "Bạn đã gửi đánh giá cho đơn thuê trang phục này rồi.",
      };
    }

    const revieweeId = eligibleRental.ownerId || eligibleRental.product?.userId || authUser.id;

    // 5. Thực hiện tạo Review và thưởng 50 Leaf Coins trong một transaction
    const newReview = await prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          rentalId: eligibleRental.id,
          productId: productId,
          reviewerId: authUser.id,
          revieweeId: revieweeId,
          rating: Math.min(5, Math.max(1, Math.round(rating))),
          comment: comment?.trim() || "Trang phục chất lượng, giao nhận và đóng gói chu đáo!",
          type: "RENTER_TO_OWNER",
          isPublished: true, // Hiển thị ngay trên trang sản phẩm
        },
      });

      // Thưởng +50 Leaf Coins cho khách hàng để khuyến khích feedback
      const updatedUser = await tx.user.update({
        where: { id: authUser.id },
        data: {
          cloopCoins: { increment: 50 },
        },
        select: { cloopCoins: true },
      });

      await tx.coinLedgerEntry.create({
        data: {
          userId: authUser.id,
          type: "QUEST_REWARD",
          amount: 50,
          balanceAfter: updatedUser.cloopCoins,
          description: `Thưởng đánh giá trang phục: ${eligibleRental.product?.title || "CLOOP"}`,
          metadata: { productId, rentalId: eligibleRental.id, reviewId: review.id },
        },
      });

      return review;
    });

    // 6. Xóa cache và revalidate
    clearProductDetailCache(productId);
    revalidatePath(`/product/${productId}`);

    const reviewerName = authUser.name || "Khách hàng CLOOP";
    const masked = reviewerName.length > 2
      ? reviewerName.charAt(0) + "*****" + reviewerName.charAt(reviewerName.length - 1)
      : reviewerName;

    return {
      success: true,
      message: "Đánh giá của bạn đã được xuất bản thành công! Bạn nhận được +50 Leaf Coins vào ví!",
      review: {
        id: newReview.id,
        userName: `${masked} (Bạn)`,
        userAvatar: authUser.avatar || null,
        rating: newReview.rating,
        date: "Vừa xong",
        comment: newReview.comment || "",
        images: images,
        videos: videos,
        tags: tags.length > 0 ? tags : ["Chất vải đẹp", "Đúng với mô tả"],
        shopResponse: "Dạ CLOOP Closet cảm ơn bạn đã gửi đánh giá tuyệt vời này! Chúc bạn diện đồ thật xinh đẹp nha ❤️",
        helpfulCount: 0,
      },
    };
  } catch (error: any) {
    console.error("Lỗi gửi đánh giá sản phẩm:", error);
    return {
      success: false,
      error: error?.message || "Không thể gửi đánh giá lúc này. Vui lòng thử lại sau.",
    };
  }
}
