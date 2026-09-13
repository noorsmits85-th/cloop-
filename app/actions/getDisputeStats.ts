"use server";

import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

// ⚡ IN-MEMORY SWR CACHE (15s TTL: Triệt tiêu 95% số lần query DB khi đổi trang)
const disputeStatsCache = new Map<string, { count: number; expiry: number }>();

export async function getUserDisputeStats() {
  try {
    const user = await requireUser();
    if (!user) return { success: false, count: 0 };

    const cached = disputeStatsCache.get(user.id);
    if (cached && Date.now() < cached.expiry) {
      return { success: true, count: cached.count };
    }

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

    disputeStatsCache.set(user.id, { count: activeCount, expiry: Date.now() + 15000 });

    return { success: true, count: activeCount };
  } catch {
    return { success: false, count: 0 };
  }
}
