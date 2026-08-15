"use server";

import { prisma } from "@/src/lib/prisma";
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
    return { success: false, error: error.message };
  }
}

export async function completeOrderAction(orderId: string) {
  try {
    await prisma.rentalHistory.update({
      where: { id: orderId },
      data: { status: "LENDER_COMPLETED" }
    });
    revalidatePath("/my-closet/orders");
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi khi hoàn tất đơn:", error);
    return { success: false, error: error.message };
  }
}

export async function raiseDisputeAction(orderId: string, description: string, images: string[]) {
  try {
    await prisma.$transaction(async (tx: any) => {
      await tx.dispute.create({
        data: {
          rentalId: orderId,
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
    return { success: false, error: error.message };
  }
}

