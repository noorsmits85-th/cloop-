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

const REVIEW_ZERO_WIDTH_REGEX = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;
const REVIEW_PHONE_REGEX = /(?:(?:\+?84|0)[\s._\-()\/]*[35789](?:[\s._\-()\/]*\d){8})\b|\b0\d(?:[\s._\-]*\d){8,9}\b/g;
const REVIEW_EMAIL_REGEX = /[a-zA-Z0-9._%+-]+\s*(?:@|\(at\)|\[at\])\s*[a-zA-Z0-9.-]+\s*(?:\.|\(dot\)|\[dot\])\s*[a-zA-Z]{2,}/gi;
const REVIEW_SOLICIT_NORM_REGEX = /\b(z[\s._\-]*a[\s._\-]*l[\s._\-]*o|zalo\.me|telegram|t\.me\/|facebook|fb\.com|instagram|thue\s+ngoai|giao\s+dich\s+ngoai|khong\s+qua\s+san|chuyen\s+khoan\s+rieng|ck\s+rieng|lien\s+he\s+rieng|ket\s+ban\s+zalo|add\s+zalo)\b/i;

function hasReviewOffPlatformContact(raw?: string | null): boolean {
  if (!raw || typeof raw !== "string") return false;
  const cleaned = raw.replace(REVIEW_ZERO_WIDTH_REGEX, "");
  const norm = cleaned
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
  REVIEW_PHONE_REGEX.lastIndex = 0;
  REVIEW_EMAIL_REGEX.lastIndex = 0;
  if (REVIEW_PHONE_REGEX.test(cleaned)) return true;
  if (REVIEW_EMAIL_REGEX.test(cleaned)) return true;
  if (REVIEW_SOLICIT_NORM_REGEX.test(norm)) return true;
  return false;
}

function scrubReviewContactText(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .replace(REVIEW_ZERO_WIDTH_REGEX, "")
    .replace(REVIEW_EMAIL_REGEX, "[Đã ẩn Email bảo mật]")
    .replace(REVIEW_PHONE_REGEX, "[Đã ẩn SĐT bảo mật]")
    .replace(/\b(z[\s._\-]*a[\s._\-]*l[\s._\-]*o|telegram|facebook|instagram|thuê\s+ngoài|thue\s+ngoai|giao\s+dịch\s+ngoài|giao\s+dich\s+ngoai|không\s+qua\s+sàn|khong\s+qua\s+san)\b/gi, "[Liên hệ qua CLOOP]");
}

/**
 * 🛡️ SERVER ACTION: GỬI ĐÁNH GIÁ SẢN PHẨM XÁC THỰC (CHỐNG SPAM & CHỐNG LÔI KÉO NGOÀI SÀN)
 * Điều kiện:
 * 1. Bắt buộc người dùng phải đăng nhập
 * 2. Bắt buộc người dùng PHẢI TỪNG THUÊ trang phục này
 * 3. Đơn thuê PHẢI Ở TRẠNG THÁI HOÀN TẤT (LENDER_COMPLETED hoặc BORROWER_RETURNED)
 * 4. Không được đánh giá trùng lặp cùng một đơn hàng
 * 5. Tuyệt đối không cho phép đăng số điện thoại, email, Zalo hoặc thông tin giao dịch ngoài sàn
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

    if (
      hasReviewOffPlatformContact(comment) ||
      hasReviewOffPlatformContact(input.materialFeedback) ||
      hasReviewOffPlatformContact(input.accuracyFeedback) ||
      (Array.isArray(tags) && tags.some((t) => hasReviewOffPlatformContact(t)))
    ) {
      return {
        success: false,
        error:
          "Chính sách An toàn CLOOP: Đánh giá không được chứa số điện thoại, email, Zalo hoặc nội dung lôi kéo giao dịch ngoài sàn.",
      };
    }

    // 1. Kiểm tra đăng nhập
    let authUser;
    try {
      authUser = await requireUser();
    } catch {
      return { success: false, error: "Vui lòng đăng nhập để viết đánh giá cho trang phục này." };
    }

    // 2. Tìm đơn thuê ĐÃ HOÀN TẤT và ĐÃ THANH TOÁN của user này cho món đồ này
    const eligibleRental = await prisma.rentalHistory.findFirst({
      where: {
        product_id: productId,
        renterId: authUser.id,
        isDeleted: false,
        status: { in: ["LENDER_COMPLETED", "BORROWER_RETURNED"] },
        invoice: { status: "PAID" },
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
      // 🛡️ CHỐT CHẶN CHỐNG ĐUA LỆNH (RACE CONDITION): Kiểm tra lại trong Transaction xem đã có review cho đơn thuê này chưa
      const existingReviewInTx = await tx.review.findFirst({
        where: {
          rentalId: eligibleRental.id,
          reviewerId: authUser.id,
          type: "RENTER_TO_OWNER",
        },
        select: { id: true },
      });

      if (existingReviewInTx) {
        throw new Error("DUPLICATE_REVIEW: Bạn đã gửi đánh giá cho đơn thuê trang phục này rồi.");
      }

      const safeComment = scrubReviewContactText(
        (comment?.trim() || "Trang phục chất lượng, giao nhận và đóng gói chu đáo!").slice(0, 1000)
      );

      const review = await tx.review.create({
        data: {
          rentalId: eligibleRental.id,
          productId: productId,
          reviewerId: authUser.id,
          revieweeId: revieweeId,
          rating: Math.min(5, Math.max(1, Math.round(rating))),
          comment: safeComment,
          type: "RENTER_TO_OWNER",
          isPublished: true, // Hiển thị ngay trên trang sản phẩm sau khi đã qua kiểm duyệt liên hệ
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
