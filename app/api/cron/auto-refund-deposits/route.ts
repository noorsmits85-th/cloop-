import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * DEPRECATED & CONSOLIDATED ROUTE:
 * Toàn bộ logic giải ngân và hoàn cọc đã được hợp nhất duy nhất vào:
 * /api/cron/escrow-sla (Sử dụng Unified Settlement Engine: lib/settlement-engine.ts).
 * 
 * Endpoint này được khóa lại để tránh xung đột race condition, trùng lặp hoàn tiền
 * hoặc trường hợp hoàn cọc cho khách nhưng quên payout cho chủ tủ.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    deprecated: true,
    message: "Endpoint /api/cron/auto-refund-deposits đã được hợp nhất vào /api/cron/escrow-sla theo Settlement Engine chuẩn kế toán kép.",
  });
}


