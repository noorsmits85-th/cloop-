"use server";

import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

export async function getUserDisputeStats() {
  try {
    const user = await requireUser();
    if (!user) return { success: false, count: 0 };

    // Đếm số khiếu nại đang mở mà user tham gia (với tư cách người thuê hoặc chủ đồ)
    const activeCount = await prisma.dispute.count({
      where: {
        status: { in: ["PENDING_REVIEW", "DISPUTED"] },
        rental: {
          OR: [
            { renterId: user.id },
            { ownerId: user.id },
            { product: { userId: user.id } },
          ],
        },
      },
    });

    return { success: true, count: activeCount };
  } catch {
    return { success: false, count: 0 };
  }
}
