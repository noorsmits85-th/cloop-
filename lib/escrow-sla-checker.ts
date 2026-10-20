import { prisma } from "@/src/lib/prisma";
import { settleCompletedRentalOrder } from "@/lib/settlement-engine";
import { getGhnOrderDetail } from "@/src/lib/ghn";
import { getGhtkOrderDetail } from "@/src/lib/ghtk";

export interface SlaEvaluationResult {
  settledOrders: string[];
  flaggedOverdueOrders: string[];
  logisticAlertOrders: string[];
  errors: string[];
}

/**
 * [SECURITY ARCHITECTURE] 4-GUARD ESCROW SLA EVALUATION & AUTOMATIC SETTLEMENT
 *
 * Chốt chặn 1: Đồng bộ trạng thái thời gian thực qua Gateway API vận chuyển (GHN / GHTK)
 *   - Nếu đơn hàng gửi qua ship (có returnShipment):
 *     TUYỆT ĐỐI KHÔNG TỰ ĐỘNG GIẢI NGÂN hay coi là đã giao sau 72h!
 *     Tiền cọc nằm im 100% trong Két Escrow để chống hành vi bấm trả đồ ảo.
 *     Hệ thống chủ động gọi Gateway API (GHN / GHTK) để cập nhật trạng thái thực tế.
 *     Nếu bưu cục báo giao thành công (delivered), tự động chuyển sang DELIVERED và ghi nhận mốc thời gian.
 *     Nếu bưu cục báo có sự cố (thất lạc, hư hỏng, hủy), kích hoạt LOGISTIC_ALERT để đội ngũ can thiệp.
 *
 * Chốt chặn 2: Kép hóa điều kiện "Nhả tiền" (Double-Check Guard)
 *   - Chỉ bắt đầu đếm ngược 24h khi hàng ĐÃ THẬT SỰ TỚI TAY CHỦ TỦ:
 *     (a) Chủ tủ chủ động bấm "Đã nhận lại kiện hàng" (confirmReturnDeliveredAction).
 *     (b) Webhook / Gateway hãng vận chuyển xác thực trạng thái DELIVERED.
 *     (c) Đơn trả trực tiếp tại trạm (SELF_PICKUP) với actual_return_date được ghi nhận.
 *   - Sau khi hàng đã về tới tay Chủ tủ đủ 24h mà không có khiếu nại (disputes.none):
 *     Kích hoạt settleCompletedRentalOrder hoàn cọc và tiền thuê vào Ví nội bộ CLOOP.
 *
 * Chặng 1 vs Chặng 2 (Phân định dòng tiền):
 *   - Chặng 1: Két Escrow -> Ví nội bộ CLOOP (Tự động sau 24h hoặc Cả 2 cùng xác nhận).
 *   - Chặng 2: Ví nội bộ CLOOP -> Tài khoản Ngân hàng (Bắt buộc Quản trị viên duyệt sau khi đối soát).
 */
export async function evaluateEscrowSlaForOrders(options?: {
  userId?: string;
  limit?: number;
}): Promise<SlaEvaluationResult> {
  const result: SlaEvaluationResult = {
    settledOrders: [],
    flaggedOverdueOrders: [],
    logisticAlertOrders: [],
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
        // CHỐT CHẶN 1: ĐỒNG BỘ TRẠNG THÁI THỜI GIAN THỰC QUA VẬN CHUYỂN
        // =====================================================================
        if (returnShipment) {
          // 1.1. Sự cố vận chuyển (thất lạc, hư hại, trả hàng lỗi, hủy đơn)
          if (["FAILED", "RETURNING", "CANCELLED"].includes(returnShipment.status)) {
            result.logisticAlertOrders.push(rental.id);
            continue; // Phong tỏa két Escrow tuyệt đối, chờ đội ngũ sàn can thiệp bảo hiểm
          }

          // 1.2. Đang trên đường vận chuyển: chủ động kiểm tra Gateway API của GHN / GHTK
          if (returnShipment.status === "IN_TRANSIT" && returnShipment.trackingCode) {
            let carrierDelivered = false;
            let carrierProblem = false;
            let deliveredAtTimestamp: Date | null = null;

            if (returnShipment.provider === "GHN") {
              try {
                const ghnRes = await getGhnOrderDetail(returnShipment.trackingCode);
                if (ghnRes.success && ghnRes.status) {
                  const st = ghnRes.status.toLowerCase();
                  if (st === "delivered") {
                    carrierDelivered = true;
                    deliveredAtTimestamp = ghnRes.deliveredDate ? new Date(ghnRes.deliveredDate) : new Date();
                  } else if (["damage", "lost", "delivery_fail", "return", "returned", "cancel"].includes(st)) {
                    carrierProblem = true;
                  }
                }
              } catch (_) {
                // Fail-closed an toàn nếu gián đoạn kết nối
              }
            } else if (returnShipment.provider === "GHTK") {
              try {
                const ghtkRes = await getGhtkOrderDetail(returnShipment.trackingCode);
                if (ghtkRes.success) {
                  if (ghtkRes.isDelivered) {
                    carrierDelivered = true;
                    deliveredAtTimestamp = new Date();
                  } else if (ghtkRes.isProblem) {
                    carrierProblem = true;
                  }
                }
              } catch (_) {
                // Fail-closed an toàn
              }
            }

            if (carrierDelivered) {
              await prisma.shipment.update({
                where: { id: returnShipment.id },
                data: { status: "DELIVERED" },
              });
              returnShipment.status = "DELIVERED";

              if (!rental.actual_return_date) {
                const finalDelivery = deliveredAtTimestamp || new Date();
                await prisma.rentalHistory.update({
                  where: { id: rental.id },
                  data: { actual_return_date: finalDelivery },
                });
                rental.actual_return_date = finalDelivery;
              }
            } else if (carrierProblem) {
              await prisma.shipment.update({
                where: { id: returnShipment.id },
                data: { status: "FAILED" },
              });
              result.logisticAlertOrders.push(rental.id);
              continue;
            } else {
              // Hàng vẫn đang an toàn trên đường chuyển phát
              if (returnShipment.createdAt <= seventyTwoHoursAgo) {
                result.flaggedOverdueOrders.push(rental.id);
              }
              continue; // Khóa chặt, không nhả cọc khi chủ tủ chưa nhận được kiện hàng
            }
          }

          // 1.3. Nếu shipment vẫn chưa DELIVERED -> Không bắt đầu đếm ngược
          if (returnShipment.status !== "DELIVERED") {
            continue;
          }
        }

        // =====================================================================
        // CHỐT CHẶN 2: KÉP HÓA ĐIỀU KIỆN NHẢ TIỀN (DOUBLE-CHECK GUARD)
        // =====================================================================
        // 2.1. Phải có mốc thời gian nhận hàng thực tế
        if (!rental.actual_return_date) {
          continue; // Chưa nhận lại đồ thực tế -> Không bao giờ đếm ngược
        }

        const deliveredAt = rental.actual_return_date;
        if (deliveredAt > twentyFourHoursAgo) {
          // Chưa đủ 24 giờ SLA kiểm tra đồ kể từ thời điểm nhận lại hàng
          continue;
        }

        // 2.2. Kiểm tra lại tranh chấp một lần nữa trước khi giải ngân
        const activeDisputes = await prisma.dispute.count({
          where: {
            rentalId: rental.id,
            status: { in: ["PENDING_REVIEW", "DISPUTED"] },
          },
        });

        if (activeDisputes > 0) {
          continue; // Có tranh chấp phát sinh -> Tiếp tục đóng băng két Escrow
        }

        // =====================================================================
        // CHẶNG 1: GIẢI NGÂN VÀO VÍ NỘI BỘ CLOOP (ESCROW -> WALLET)
        // =====================================================================
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
