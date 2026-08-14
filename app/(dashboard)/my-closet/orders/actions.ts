"use server";

import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/src/lib/supabase";

export async function submitReviewAction({
  rentalHistoryId,
  reviewerId,
  revieweeId,
  rating,
  type,
  comment,
  updateField // e.g. { renterRatedAt: Date } or { ownerRatedAt: Date }
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
    // 1. Dùng prisma thực thi transaction để vừa insert review vừa update rental history an toàn
    await prisma.$transaction(async (tx: any) => {
      // Create Review
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
      
      // Update Rental History
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
    console.error("L?i khi ho�n t?t don:", error);
    return { success: false, error: error.message };
  }
}

export async function raiseDisputeAction(orderId: string, description: string, images: string[]) {
  try {
    await prisma.$transaction(async (tx: any) => {
      // Create Dispute
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
      
      // Update Rental History status
      await tx.rentalHistory.update({
        where: { id: orderId },
        data: { status: "DISPUTE" }
      });
    });

    revalidatePath("/my-closet/orders");
    return { success: true };
  } catch (error: any) {
    console.error("L?i khi b�o c�o s? c?:", error);
    return { success: false, error: error.message };
  }
}
