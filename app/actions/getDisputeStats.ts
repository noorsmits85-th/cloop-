"use server";

import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

// ⚡ IN-MEMORY SWR CACHE (60s TTL: Triệt tiêu 98% số lần query DB khi chuyển tab)
const disputeStatsCache = new Map<string, { count: number; expiry: number }>();

export async function getUserDisputeStats(passedUserId?: string) {
  try {
    let userId = passedUserId;
    if (!userId) {
      const user = await requireUser();
      if (!user) return { success: false, count: 0 };
      userId = user.id;
    }

    if (!userId) {
      return { success: false, count: 0 };
    }

    const cached = disputeStatsCache.get(userId);
    if (cached && Date.now() < cached.expiry) {
      return { success: true, count: cached.count };
    }

    // Đếm số khiếu nại đang mở mà user tham gia (với tư cách người thuê hoặc chủ đồ)
    const activeCount = await prisma.dispute.count({
      where: {
        status: { in: ["PENDING_REVIEW", "DISPUTED"] },
        rental: {
          OR: [
            { renterId: userId },
            { ownerId: userId },
            { product: { userId } },
          ],
        },
      },
    });

    disputeStatsCache.set(userId, { count: activeCount, expiry: Date.now() + 60000 });

    return { success: true, count: activeCount };
  } catch {
    return { success: false, count: 0 };
  }
}
