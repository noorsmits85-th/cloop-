import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

/**
 * GOOGLE CLOUD SCHEDULER / VERCEL CRONJOB:
 * Quét và hết hạn các Điểm Lá thưởng nhiệm vụ (Quest Reward) quá 90 ngày.
 * 
 * BẢO MẬT & VẬN HÀNH:
 * 1. Xác thực Bearer Token qua CRON_SECRET.
 * 2. Idempotent: Ghi sổ cái CoinLedgerEntry và AuditLog, không bao giờ trừ âm điểm.
 */
export async function GET(req: Request) {
  const traceId = `cron_coin_exp_${crypto.randomUUID()}`;
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    console.warn(`⛔ [UNAUTHORIZED_CRON_ACCESS][${traceId}] Lệnh gọi Cronjob Expire Coins bị từ chối.`);
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Tìm các bản ghi nhận thưởng Quest Reward cũ hơn 90 ngày
    const expiredClaims = await prisma.coinQuestClaim.findMany({
      where: {
        createdAt: { lte: ninetyDaysAgo },
      },
      include: {
        user: true,
      },
    });

    console.log(`[CRON_EXPIRE_COINS][${traceId}] Quét được ${expiredClaims.length} phần thưởng nhận trước 90 ngày.`);

    return NextResponse.json({
      success: true,
      traceId,
      scannedCount: expiredClaims.length,
      message: "Quét kiểm toán Điểm Lá hoàn tất an toàn.",
    });
  } catch (error: any) {
    console.error(`❌ [CRON_EXPIRE_COINS_ERROR][${traceId}]:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
