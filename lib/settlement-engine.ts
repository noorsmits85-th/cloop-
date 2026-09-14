import { Prisma } from "@prisma/client";
import { prisma as defaultPrisma } from "@/src/lib/prisma";

export interface StandardSettlementResult {
  success: boolean;
  rentalId: string;
  depositRefunded: number;
  lenderEarnings: number;
  platformFeeRetained: number;
  shippingRetained: number;
  error?: string;
}

export interface DisputedSettlementParams {
  disputeId: string;
  finalDeduction: number; // Tiền bồi thường hư hỏng trích từ cọc trả cho chủ đồ
  refundRentalToRenter?: number; // Tiền hoàn phí thuê cho khách (trường hợp đồ lỗi/sai mẫu)
  adminId?: string;
  adminNotes?: string;
  isItemDefect?: boolean; // Nếu do đồ lỗi của chủ tủ: miễn phí sàn 100%
  returnShippingFee?: number; // Mặc định 25.000đ nếu có vận chuyển trả hàng
}

export interface DisputedSettlementResult {
  success: boolean;
  rentalId: string;
  disputeId: string;
  totalRefundToRenter: number;
  totalPayoutToOwner: number;
  compensationToOwner: number;
  ownerRentalEarnings: number;
  platformFeeRetained: number;
  shippingRetained: number;
  error?: string;
}

/**
 * ⚖️ KIỂM TRA BẢO TOÀN DÒNG TIỀN (DOUBLE-ENTRY CONSERVATION INVARIANT)
 * Tổng chi trả + giữ lại bắt buộc phải bằng đúng tổng tiền thu được từ hóa đơn.
 */
export function verifyConservationInvariant(params: {
  totalCollected: number;
  refundToRenter: number;
  payoutToOwner: number;
  platformFeeRetained: number;
  shippingRetained: number;
}): { valid: boolean; difference: number } {
  const totalAllocated =
    params.refundToRenter +
    params.payoutToOwner +
    params.platformFeeRetained +
    params.shippingRetained;
  const difference = params.totalCollected - totalAllocated;
  return {
    valid: difference === 0,
    difference,
  };
}

/**
 * 🌟 UNIFIED SETTLEMENT ENGINE: QUYẾT TOÁN ĐƠN THUÊ CHUẨN (STANDARD COMPLETION)
 * Được gọi khi:
 * 1. Chủ tủ bấm "Xác nhận nhận đồ & Nghiệm thu hoàn tất" (`completeOrderAction`).
 * 2. Cronjob Escrow SLA tự động giải ngân sau 24h trả đồ không có khiếu nại (`app/api/cron/escrow-sla/route.ts`).
 * 3. Quản trị viên kích hoạt giải ngân đơn lẻ (`releaseSingleEscrowOrderAction`).
 */
export async function settleCompletedRentalOrder(
  rentalId: string,
  options?: {
    actorId?: string;
    actorRole?: "OWNER" | "ADMIN" | "SYSTEM_CRON";
    customPrismaTx?: any;
  }
): Promise<StandardSettlementResult> {
  const actorId = options?.actorId || "SYSTEM";
  const actorRole = options?.actorRole || "SYSTEM_CRON";

  const executeSettlement = async (tx: any): Promise<StandardSettlementResult> => {
    // 1. Lấy thông tin đơn thuê kèm hóa đơn và sản phẩm (Khóa bi quan hoặc fetch mới nhất)
    const rental = await tx.rentalHistory.findUnique({
      where: { id: rentalId },
      include: {
        invoice: true,
        product: { select: { id: true, userId: true, title: true } },
        disputes: {
          where: { status: { in: ["PENDING_REVIEW", "DISPUTED"] } },
        },
      },
    });

    if (!rental) {
      throw new Error(`[Settlement] Không tìm thấy đơn hàng #${rentalId}`);
    }

    const invoice = rental.invoice;
    if (!invoice) {
      throw new Error(`[Settlement] Đơn hàng #${rentalId} không có dữ liệu hóa đơn (Invoice missing). Fail-Closed.`);
    }

    if (invoice.status !== "PAID") {
      throw new Error(`[Settlement] Hóa đơn #${invoice.id} chưa thanh toán thành công (Status: ${invoice.status}). Từ chối quyết toán.`);
    }

    // Chỉ cho phép quyết toán đơn chuẩn khi khách ĐÃ TRẢ ĐỒ (BORROWER_RETURNED)
    if (rental.status !== "BORROWER_RETURNED") {
      throw new Error(`[Settlement] Đơn hàng đang ở trạng thái "${rental.status}", chỉ được quyết toán khi khách đã trả đồ (BORROWER_RETURNED).`);
    }

    // Không được giải ngân tự động nếu có khiếu nại đang mở
    if (rental.disputes.length > 0) {
      throw new Error(`[Settlement] Đơn hàng đang có ${rental.disputes.length} khiếu nại chưa giải quyết. Phải xử lý tranh chấp trước.`);
    }

    // 2. Chống lặp giao dịch trên Sổ cái (Ledger Idempotency Check)
    const existingSettlement = await tx.ledgerTransaction.findFirst({
      where: {
        invoiceId: invoice.id,
        type: { in: ["REFUND_OUT", "PAYOUT_OUT"] },
        status: "COMPLETED",
      },
    });

    if (existingSettlement) {
      throw new Error(`[Settlement] Hóa đơn #${invoice.id} đã được quyết toán từ trước trên sổ cái.`);
    }

    // 3. Cập nhật trạng thái đơn thuê sang LENDER_COMPLETED
    const updateCount = await tx.rentalHistory.updateMany({
      where: { id: rentalId, status: "BORROWER_RETURNED" },
      data: {
        status: "LENDER_COMPLETED",
        completedAt: new Date(),
        actual_return_date: rental.actual_return_date || new Date(),
      },
    });

    if (updateCount.count === 0) {
      throw new Error(`[Settlement] Race condition: Trạng thái đơn hàng #${rentalId} đã bị thay đổi đồng thời.`);
    }

    // 4. Tính toán dòng tiền kế toán kép (Double-entry Math)
    const totalCollected = invoice.amount;
    const depositAmount = invoice.depositAmount || 0;
    const rentalFee = invoice.rentalFee || 0;

    // SỬ DỤNG TOÁN TỬ ?? ĐỂ KHÔNG ĐÈ PHÍ SÀN 0%
    const rawPlatformFee = invoice.platformFee ?? Math.floor(rentalFee * 0.12);
    const platformFee = Math.min(rawPlatformFee, rentalFee);

    const shippingFeeCollected = invoice.shippingFeeCollected || 0;
    const returnShippingFee = rental.shippingCode ? 25000 : 0;
    const returnShippingRetained = Math.min(returnShippingFee, Math.max(0, rentalFee - platformFee));

    const lenderEarnings = Math.max(0, rentalFee - platformFee - returnShippingRetained);
    const depositRefund = depositAmount;
    const totalShippingRetained = shippingFeeCollected + returnShippingRetained;

    // Kiểm tra tính cân bằng sổ cái
    const invariant = verifyConservationInvariant({
      totalCollected,
      refundToRenter: depositRefund,
      payoutToOwner: lenderEarnings,
      platformFeeRetained: platformFee,
      shippingRetained: totalShippingRetained,
    });

    if (!invariant.valid) {
      throw new Error(
        `[Settlement Invariant Error] Sổ cái mất cân bằng (Lệch: ${invariant.difference}đ). Thu: ${totalCollected}đ != Chi: ${
          depositRefund + lenderEarnings + platformFee + totalShippingRetained
        }đ`
      );
    }

    // 5. CẬP NHẬT SỐ DƯ VÍ & GHI SỔ CÁI KẾ TOÁN
    // 5a. Hoàn cọc cho khách thuê
    if (depositRefund > 0) {
      await tx.user.update({
        where: { id: rental.renterId },
        data: {
          walletBalance: { increment: depositRefund },
          cloopCoins: { increment: 15 },
        },
      });

      await tx.ledgerTransaction.create({
        data: {
          invoiceId: invoice.id,
          type: "REFUND_OUT",
          amount: depositRefund,
          description: `[Settlement] Hoàn 100% tiền cọc đơn thuê #${rental.id.slice(0, 8)}`,
          status: "COMPLETED",
          adminId: actorRole === "ADMIN" ? actorId : undefined,
        },
      });
    }

    // 5b. Giải ngân doanh thu cho chủ tủ
    const ownerId = rental.ownerId || rental.product?.userId;
    if (ownerId && lenderEarnings > 0) {
      await tx.user.update({
        where: { id: ownerId },
        data: {
          walletBalance: { increment: lenderEarnings },
          cloopCoins: { increment: 25 },
        },
      });

      await tx.ledgerTransaction.create({
        data: {
          invoiceId: invoice.id,
          type: "PAYOUT_OUT",
          amount: lenderEarnings,
          description: `[Settlement] Doanh thu cho thuê đơn #${rental.id.slice(0, 8)} (đã trừ phí sàn và cước vận chuyển hoàn đồ)`,
          status: "COMPLETED",
          adminId: actorRole === "ADMIN" ? actorId : undefined,
        },
      });
    }

    // 5c. Ghi nhận phí sàn giữ lại
    if (platformFee > 0) {
      await tx.ledgerTransaction.create({
        data: {
          invoiceId: invoice.id,
          type: "FEE_RETAINED",
          amount: platformFee,
          description: `[Settlement] Phí dịch vụ sàn (${platformFee.toLocaleString("vi-VN")}đ) đơn #${rental.id.slice(0, 8)}`,
          status: "COMPLETED",
          adminId: actorRole === "ADMIN" ? actorId : undefined,
        },
      });
    }

    // 5d. Ghi nhận phí vận chuyển giữ lại
    if (totalShippingRetained > 0) {
      await tx.ledgerTransaction.create({
        data: {
          invoiceId: invoice.id,
          type: "SHIPPING_RETAINED",
          amount: totalShippingRetained,
          description: `[Settlement] Cước vận chuyển giữ lại đối soát đối tác giao hàng đơn #${rental.id.slice(0, 8)}`,
          status: "COMPLETED",
          adminId: actorRole === "ADMIN" ? actorId : undefined,
        },
      });
    }

    // 6. Kích hoạt lại trạng thái Sẵn Sàng Cho Thuê (AVAILABLE / ON_MARKET)
    if (rental.product_id) {
      await tx.listing.updateMany({
        where: { productId: rental.product_id, isDeleted: false },
        data: { status: "AVAILABLE" },
      });
      await tx.product.update({
        where: { id: rental.product_id },
        data: { status: "ON_MARKET" },
      });
    }

    // 7. Cập nhật trạng thái Invoice và ghi Audit Log
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { payosStatus: "RESOLVED" },
    });

    await tx.auditLog.create({
      data: {
        adminId: actorId,
        action: "SETTLE_COMPLETED_ORDER",
        targetType: "RENTAL",
        targetId: rental.id,
        beforeStatus: "BORROWER_RETURNED",
        afterStatus: "LENDER_COMPLETED",
        metadata: JSON.stringify({
          actorRole,
          totalCollected,
          depositRefund,
          lenderEarnings,
          platformFee,
          totalShippingRetained,
          renterId: rental.renterId,
          ownerId,
        }),
      },
    });

    return {
      success: true,
      rentalId: rental.id,
      depositRefunded: depositRefund,
      lenderEarnings,
      platformFeeRetained: platformFee,
      shippingRetained: totalShippingRetained,
    };
  };

  if (options?.customPrismaTx) {
    return executeSettlement(options.customPrismaTx);
  }

  return (defaultPrisma as any).$transaction(executeSettlement, {
    maxWait: 15000,
    timeout: 30000,
  });
}

/**
 * ⚖️ UNIFIED SETTLEMENT ENGINE: QUYẾT TOÁN TRANH CHẤP (DISPUTE SETTLEMENT)
 * Hợp nhất cả 2 luồng:
 * 1. Chủ tủ và Khách thuê tự thỏa thuận thành công (`acceptDisputeProposalAction`).
 * 2. Quản trị viên phân xử khiếu nại (`resolveDispute`).
 */
export async function settleDisputedRentalOrder(
  params: DisputedSettlementParams,
  options?: {
    actorId?: string;
    actorRole?: "RENTER" | "OWNER" | "ADMIN";
    customPrismaTx?: any;
  }
): Promise<DisputedSettlementResult> {
  const actorId = options?.actorId || params.adminId || "ADMIN";
  const actorRole = options?.actorRole || "ADMIN";

  const executeDisputeSettlement = async (tx: any): Promise<DisputedSettlementResult> => {
    // 1. Tìm hồ sơ tranh chấp kèm đơn thuê và hóa đơn
    const dispute = await tx.dispute.findUnique({
      where: { id: params.disputeId },
      include: {
        rental: {
          include: {
            invoice: true,
            product: { select: { id: true, userId: true } },
          },
        },
      },
    });

    if (!dispute || !dispute.rental) {
      throw new Error(`[Dispute Settlement] Không tìm thấy hồ sơ khiếu nại #${params.disputeId}`);
    }

    const rental = dispute.rental;
    const invoice = rental.invoice;

    if (!invoice) {
      throw new Error(`[Dispute Settlement] Đơn thuê #${rental.id} không có hóa đơn thanh toán. Fail-Closed.`);
    }

    if (invoice.status !== "PAID") {
      throw new Error(`[Dispute Settlement] Hóa đơn #${invoice.id} chưa thanh toán. Không thể quyết toán.`);
    }

    // 2. Chống lặp quyết toán trên sổ cái
    const existingPayout = await tx.ledgerTransaction.findFirst({
      where: {
        invoiceId: invoice.id,
        type: { in: ["REFUND_OUT", "PAYOUT_OUT"] },
        status: "COMPLETED",
      },
    });

    if (existingPayout) {
      throw new Error(`[Dispute Settlement] Hóa đơn #${invoice.id} đã được quyết toán từ trước.`);
    }

    // 3. Tính toán dòng tiền tranh chấp kế toán kép
    const totalCollected = invoice.amount;
    const depositAmount = invoice.depositAmount || 0;
    const rentalFee = invoice.rentalFee || 0;
    const shippingFeeCollected = invoice.shippingFeeCollected || 0;

    // Giới hạn số tiền bồi thường không vượt quá cọc
    const finalDeduction = Math.min(Math.max(0, params.finalDeduction), depositAmount);
    const refundDepositToRenter = Math.max(0, depositAmount - finalDeduction);

    let refundRentalToRenter = 0;
    let platformFeeRetained = 0;
    let returnShippingRetained = 0;
    let ownerRentalEarnings = 0;

    if (params.isItemDefect) {
      // TRƯỜNG HỢP 1: LỖI DO CHỦ TỦ (Hàng hỏng, sai mẫu)
      // Khách được hoàn 100% tiền thuê và 100% tiền cọc
      refundRentalToRenter = params.refundRentalToRenter !== undefined
        ? Math.min(params.refundRentalToRenter, rentalFee)
        : rentalFee;
      platformFeeRetained = 0; // Miễn phí sàn khi hàng lỗi
      returnShippingRetained = 0;
      ownerRentalEarnings = Math.max(0, rentalFee - refundRentalToRenter);
    } else {
      // TRƯỜNG HỢP 2: LỖI DO KHÁCH THUÊ (Làm bẩn, rách, hỏng đồ)
      refundRentalToRenter = 0;
      // Dùng ?? để không đè phí sàn 0%
      const rawPlatformFee = invoice.platformFee ?? Math.floor(rentalFee * 0.12);
      platformFeeRetained = Math.min(rawPlatformFee, rentalFee);
      const returnShippingFee = params.returnShippingFee ?? (rental.shippingCode ? 25000 : 0);
      returnShippingRetained = Math.min(returnShippingFee, Math.max(0, rentalFee - platformFeeRetained));
      ownerRentalEarnings = Math.max(0, rentalFee - platformFeeRetained - returnShippingRetained);
    }

    const totalRefundToRenter = refundDepositToRenter + refundRentalToRenter;
    const totalPayoutToOwner = finalDeduction + ownerRentalEarnings;
    const totalShippingRetained = shippingFeeCollected + returnShippingRetained;

    // Kiểm tra Invariant bảo toàn tiền
    const invariant = verifyConservationInvariant({
      totalCollected,
      refundToRenter: totalRefundToRenter,
      payoutToOwner: totalPayoutToOwner,
      platformFeeRetained,
      shippingRetained: totalShippingRetained,
    });

    if (!invariant.valid) {
      throw new Error(
        `[Dispute Invariant Error] Sổ cái mất cân bằng (Lệch: ${invariant.difference}đ). Thu: ${totalCollected}đ != Chi: ${
          totalRefundToRenter + totalPayoutToOwner + platformFeeRetained + totalShippingRetained
        }đ`
      );
    }

    // 4. CẬP NHẬT VÍ & GHI SỔ CÁI
    // 4a. CỘNG VÍ CHO KHÁCH THUÊ (Khắc phục lỗi trước đó chỉ ghi ledger mà không cộng ví)
    if (totalRefundToRenter > 0) {
      await tx.user.update({
        where: { id: rental.renterId },
        data: {
          walletBalance: { increment: totalRefundToRenter },
        },
      });

      await tx.ledgerTransaction.create({
        data: {
          invoiceId: invoice.id,
          type: "REFUND_OUT",
          amount: totalRefundToRenter,
          description: `[Dispute Settlement] Hoàn ${totalRefundToRenter.toLocaleString("vi-VN")}đ (Cọc: ${refundDepositToRenter.toLocaleString("vi-VN")}đ, Thuê: ${refundRentalToRenter.toLocaleString("vi-VN")}đ) cho khách thuê đơn #${rental.id.slice(0, 8)}`,
          status: "COMPLETED",
          adminId: actorRole === "ADMIN" ? actorId : undefined,
        },
      });
    }

    // 4b. CỘNG VÍ CHO CHỦ TỦ (Bồi thường + Tiền thuê ròng)
    const ownerId = rental.ownerId || rental.product?.userId;
    if (ownerId && totalPayoutToOwner > 0) {
      await tx.user.update({
        where: { id: ownerId },
        data: {
          walletBalance: { increment: totalPayoutToOwner },
        },
      });

      if (finalDeduction > 0) {
        await tx.ledgerTransaction.create({
          data: {
            invoiceId: invoice.id,
            type: "COMPENSATION_OUT",
            amount: finalDeduction,
            description: `[Dispute Settlement] Bồi thường thiệt hại ${finalDeduction.toLocaleString("vi-VN")}đ từ tiền cọc cho chủ tủ đơn #${rental.id.slice(0, 8)}`,
            status: "COMPLETED",
            adminId: actorRole === "ADMIN" ? actorId : undefined,
          },
        });
      }

      if (ownerRentalEarnings > 0) {
        await tx.ledgerTransaction.create({
          data: {
            invoiceId: invoice.id,
            type: "PAYOUT_OUT",
            amount: ownerRentalEarnings,
            description: `[Dispute Settlement] Giải ngân doanh thu thuê ${ownerRentalEarnings.toLocaleString("vi-VN")}đ cho chủ tủ đơn #${rental.id.slice(0, 8)}`,
            status: "COMPLETED",
            adminId: actorRole === "ADMIN" ? actorId : undefined,
          },
        });
      }
    }

    // 4c. Phí sàn giữ lại
    if (platformFeeRetained > 0) {
      await tx.ledgerTransaction.create({
        data: {
          invoiceId: invoice.id,
          type: "FEE_RETAINED",
          amount: platformFeeRetained,
          description: `[Dispute Settlement] Phí dịch vụ sàn (${platformFeeRetained.toLocaleString("vi-VN")}đ) đơn #${rental.id.slice(0, 8)}`,
          status: "COMPLETED",
          adminId: actorRole === "ADMIN" ? actorId : undefined,
        },
      });
    }

    // 4d. Phí vận chuyển giữ lại
    if (totalShippingRetained > 0) {
      await tx.ledgerTransaction.create({
        data: {
          invoiceId: invoice.id,
          type: "SHIPPING_RETAINED",
          amount: totalShippingRetained,
          description: `[Dispute Settlement] Cước vận chuyển giữ lại (${totalShippingRetained.toLocaleString("vi-VN")}đ) đơn #${rental.id.slice(0, 8)}`,
          status: "COMPLETED",
          adminId: actorRole === "ADMIN" ? actorId : undefined,
        },
      });
    }

    // 5. Cập nhật trạng thái Dispute, Rental và Invoice
    await tx.dispute.update({
      where: { id: dispute.id },
      data: {
        status: "RESOLVED",
        finalDeduction,
        adminNotes: params.adminNotes || dispute.adminNotes || "Đã quyết toán thành công qua Settlement Engine.",
      },
    });

    await tx.rentalHistory.update({
      where: { id: rental.id },
      data: {
        status: "LENDER_COMPLETED",
        completedAt: new Date(),
      },
    });

    await tx.invoice.update({
      where: { id: invoice.id },
      data: { payosStatus: "RESOLVED" },
    });

    // Kích hoạt lại trạng thái Sẵn Sàng Cho Thuê (AVAILABLE / ON_MARKET)
    if (rental.product_id) {
      await tx.listing.updateMany({
        where: { productId: rental.product_id, isDeleted: false },
        data: { status: "AVAILABLE" },
      });
      await tx.product.update({
        where: { id: rental.product_id },
        data: { status: "ON_MARKET" },
      });
    }

    await tx.auditLog.create({
      data: {
        adminId: actorId,
        action: "RESOLVE_DISPUTE_SETTLEMENT",
        targetType: "DISPUTE",
        targetId: dispute.id,
        beforeStatus: dispute.status,
        afterStatus: "RESOLVED",
        metadata: JSON.stringify({
          actorRole,
          finalDeduction,
          totalRefundToRenter,
          totalPayoutToOwner,
          compensationToOwner: finalDeduction,
          ownerRentalEarnings,
          platformFeeRetained,
          totalShippingRetained,
          renterId: rental.renterId,
          ownerId,
        }),
      },
    });

    return {
      success: true,
      rentalId: rental.id,
      disputeId: dispute.id,
      totalRefundToRenter,
      totalPayoutToOwner,
      compensationToOwner: finalDeduction,
      ownerRentalEarnings,
      platformFeeRetained,
      shippingRetained: totalShippingRetained,
    };
  };

  if (options?.customPrismaTx) {
    return executeDisputeSettlement(options.customPrismaTx);
  }

  return (defaultPrisma as any).$transaction(executeDisputeSettlement, {
    maxWait: 15000,
    timeout: 30000,
  });
}
