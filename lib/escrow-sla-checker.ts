import { prisma } from "@/src/lib/prisma";
import { settleCompletedRentalOrder } from "@/lib/settlement-engine";

export interface SlaEvaluationResult {
  settledOrders: string[];
  flaggedOverdueOrders: string[];
  errors: string[];
}

/**
 * 🛡️ 2-TIER ESCROW SLA EVALUATION & AUTOMATIC SETTLEMENT (CHỐNG SCAM 100%)
 *
 * Tầng 1 (Vận chuyển chiều về):
 *   - Nếu đơn hàng gửi qua ship (có returnShipment status = IN_TRANSIT hoặc actual_return_date === null):
 *     TUYỆT ĐỐI KHÔNG TỰ ĐỘNG GIẢI NGÂN hay coi là đã giao sau 72h!
 *     Tiền cọc nằm im 100% trong Két Escrow để chống scammer bấm trả đồ ảo cuỗm áo.
 *     Nếu quá 72h (3 ngày) vận chuyển liên tỉnh chưa có xác nhận:
 *     Hệ thống ghi nhận cờ cảnh báo để Admin tra cứu mã vận đơn bưu cục thực tế.
 *
 * Tầng 2 (Kiểm tra đồ 24h tại trạm/tủ):
 *   - Chỉ bắt đầu đếm ngược 24h khi hàng ĐÃ THẬT SỰ TỚI TAY CHỦ TỦ:
 *     (a) Chủ tủ chủ động bấm "Đã nhận lại kiện hàng" (confirmReturnDeliveredAction).
 *     (b) Webhook hãng vận chuyển (GHN/GHTK) xác thực trạng thái DELIVERED.
 *     (c) Đơn trả trực tiếp tại trạm (SELF_PICKUP) với actual_return_date được ghi nhận.
 *   - Sau khi hàng đã về tới tay Chủ tủ đủ 24h mà không có khiếu nại (disputes.none):
 *     Kích hoạt settleCompletedRentalOrder giải ngân và hoàn 100% cọc vào Ví nội bộ!
 */
export async function evaluateEscrowSlaForOrders(options?: {
  userId?: string;
  limit?: number;
}): Promise<SlaEvaluationResult> {
  const result: SlaEvaluationResult = {
    settledOrders: [],
    flaggedOverdueOrders: [],
    errors: [],
  };

  const now = new Date();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);

  const whereClause: any = {
    status: "BORROWER_RETURNED",
    disputes: {
      none: {
        status: { in: ["PENDING_REVIEW", "DISPUTED"] },
      },
    },
    invoice: {
      status: "PAID",
    },
  };

  if (options?.userId) {
    whereClause.OR = [
      { renterId: options.userId },
      { ownerId: options.userId },
      { product: { userId: options.userId } },
    ];
  }

  try {
    const returnedOrders = await prisma.rentalHistory.findMany({
      where: whereClause,
      include: {
        invoice: true,
        product: true,
        shipments: {
          where: { direction: "RETURN" },
        },
      },
      take: options?.limit || 20,
    });

    for (const rental of returnedOrders) {
      try {
        const returnShipment = rental.shipments?.[0];

        // =====================================================================
        // TẦNG 1: XỬ LÝ VẬN CHUYỂN CHIỀU VỀ (CHỐNG SCAMMER BẤM TRẢ ĐỒ ẢO)
        // =====================================================================
        if (returnShipment && returnShipment.status === "IN_TRANSIT") {
          // TUYỆT ĐỐI KHÔNG TỰ ĐỘNG AUTO-DELIVER SAU 72H!
          // Hàng đang trên đường chuyển hoặc khách khai báo mã vận đơn gửi ship,
          // tiền cọc phải được khóa an toàn 100% trong két Escrow.
          if (returnShipment.createdAt <= seventyTwoHoursAgo) {
            // Ghi nhận cảnh báo đơn quá 72h vận chuyển để Admin theo dõi tra cứu
            result.flaggedOverdueOrders.push(rental.id);
          }
          continue; // Khóa chặt, không bao giờ nhả cọc khi chủ tủ chưa nhận được đồ!
        }

        // =====================================================================
        // TẦNG 2: 24H KIỂM TRA ĐỒ (CHỈ TÍNH TỪ KHI HÀNG VỀ TẬN TAY CHỦ TỦ)
        // =====================================================================
        // 1. Phải có mốc actual_return_date (do Chủ tủ bấm nhận hàng hoặc bưu tá giao xong)
        if (!rental.actual_return_date) {
          continue; // Chưa nhận lại đồ thực tế -> Không bao giờ đếm ngược
        }

        // 2. Nếu có shipment chiều về, bắt buộc shipment phải ở trạng thái DELIVERED
        if (returnShipment && returnShipment.status !== "DELIVERED") {
          continue; // Vận chuyển chưa kết thúc -> Không đếm ngược
        }

        const deliveredAt = rental.actual_return_date;
        if (deliveredAt > twentyFourHoursAgo) {
          // Chưa đủ 24h kiểm tra đồ kể từ thời điểm nhận lại hàng
          continue;
        }

        // 3. Đã đủ 24h kể từ khi hàng về tới tủ và KHÔNG có tranh chấp:
        // Giải ngân doanh thu cho Chủ tủ và Hoàn 100% tiền cọc vào Ví cho Khách thuê
        await settleCompletedRentalOrder(rental.id, {
          actorId: options?.userId ? "LAZY_SLA_PAGE" : "SYSTEM_CRON",
          actorRole: "SYSTEM_CRON",
        });

        result.settledOrders.push(rental.id);
      } catch (err: any) {
        result.errors.push(`Order #${rental.id}: ${err.message}`);
      }
    }
  } catch (globalErr: any) {
    result.errors.push(`Global query error: ${globalErr.message}`);
  }

  return result;
}
