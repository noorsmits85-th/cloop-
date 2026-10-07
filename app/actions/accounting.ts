"use server";

import { AccountingPeriodStatus, LedgerType } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/auth";

/**
 * Tính toán mốc thời gian chuẩn xác theo Múi giờ Việt Nam (UTC+7, Asia/Ho_Chi_Minh)
 * Đảm bảo từ 00:00:00 ngày đầu tháng đến 00:00:00 ngày đầu tháng sau (không sai lệch giây nào)
 */
function getVietnamMonthDateRange(month: number, year: number) {
  const periodStart = new Date(Date.UTC(year, month - 1, 1, -7, 0, 0, 0));
  const nextPeriodStart = new Date(Date.UTC(year, month, 1, -7, 0, 0, 0));
  return { periodStart, nextPeriodStart };
}

export async function executeMonthlyClosing(month: number, year: number, allowInterimClosing = false) {
  try {
    // 1. Kiểm tra quyền Admin
    const { profile: admin } = await requireAdmin();

    // 2. Lấy thời gian hiện tại
    const now = new Date();
    
    // 3. Tính toán mốc thời gian chuẩn xác theo giờ Việt Nam
    const { periodStart, nextPeriodStart } = getVietnamMonthDateRange(month, year);

    // 4. Kiểm tra logic Thời gian chốt sổ
    if (periodStart > now) {
      throw new Error(`Không thể chốt sổ cho tháng tương lai (${month}/${year}).`);
    }

    const isCurrentPeriod = now < nextPeriodStart;
    if (isCurrentPeriod && !allowInterimClosing) {
      throw new Error(`Kỳ kế toán ${month}/${year} chưa kết thúc (Hạn kết thúc: 00:00 ngày 01/${month === 12 ? 1 : month + 1}/${month === 12 ? year + 1 : year}). Vui lòng xác nhận chốt sổ tạm tính nếu muốn chốt số liệu hiện tại.`);
    }

    // 5. Giao dịch Kế toán Bất biến (ACID Transaction)
    const result = await prisma.$transaction(async (tx) => {
      // 5.1. Kiểm tra Idempotency: Kỳ này đã chốt chưa?
      const existingPeriod = await tx.accountingPeriod.findUnique({
        where: { month_year: { month, year } }
      });

      if (existingPeriod) {
        throw new Error(`Kỳ kế toán tháng ${month}/${year} đã được chốt trước đó vào lúc ${existingPeriod.closedAt.toLocaleString('vi-VN')}! Không thể chốt trùng.`);
      }

      // 5.2. Tổng hợp Doanh thu phí dịch vụ sàn (FEE_RETAINED) & Phí phạt (PENALTY_FEE_RETAINED)
      const platformFeeAgg = await tx.ledgerTransaction.aggregate({
        _sum: { amount: true },
        where: {
          type: {
            in: [LedgerType.FEE_RETAINED, LedgerType.PENALTY_FEE_RETAINED]
          },
          status: "COMPLETED",
          createdAt: {
            gte: periodStart,
            lt: nextPeriodStart
          }
        }
      });
      const feeRevenue = platformFeeAgg._sum.amount || 0;

      // 5.3. Tổng hợp Doanh thu bán Xu Lá thực tế (tiền VND khách thanh toán nạp ví qua VietQR / PayOS)
      const coinTopUpAgg = await tx.coinTopUp.aggregate({
        _sum: { amountVnd: true },
        where: {
          status: "PAID",
          createdAt: {
            gte: periodStart,
            lt: nextPeriodStart
          }
        }
      });
      const coinRevenue = coinTopUpAgg._sum.amountVnd || 0;

      // 5.4. Tổng hợp Chênh lệch cước vận chuyển thực tế từ các đơn hàng trong kỳ
      const shipments = await tx.shipment.findMany({
        where: {
          createdAt: {
            gte: periodStart,
            lt: nextPeriodStart
          },
          actualShippingFee: { not: null }
        },
        select: {
          shippingFeeCollected: true,
          actualShippingFee: true
        }
      });

      let shippingRevenue = 0;
      let shippingExpense = 0;
      for (const s of shipments) {
        const collected = s.shippingFeeCollected || 0;
        const actual = s.actualShippingFee || 0;
        if (collected > actual) {
          shippingRevenue += (collected - actual);
        } else if (actual > collected) {
          shippingExpense += (actual - collected);
        }
      }

      // 5.5. Tính toán chuẩn xác từng đồng Doanh Thu, Chi Phí và Lợi Nhuận Gộp
      const revenueTotal = feeRevenue + coinRevenue + shippingRevenue;
      const expenseTotal = shippingExpense;
      const netProfit = revenueTotal - expenseTotal;

      // 5.6. Tạo Bút toán Kết chuyển Doanh thu vào Sổ cái (invoiceId: null vì là bút toán tổng hợp)
      if (revenueTotal > 0) {
        await tx.ledgerTransaction.create({
          data: {
            invoiceId: null,
            type: LedgerType.MONTHLY_CLOSING_REVENUE,
            amount: revenueTotal,
            description: `Kết chuyển Tổng Doanh thu tháng ${month}/${year} (Phí sàn: ${feeRevenue.toLocaleString('vi-VN')}₫, Nạp Xu: ${coinRevenue.toLocaleString('vi-VN')}₫, Thặng dư cước: ${shippingRevenue.toLocaleString('vi-VN')}₫)`,
            adminId: admin.id,
            status: "COMPLETED",
          }
        });
      }

      // 5.7. Tạo Bút toán Kết chuyển Chi phí nếu có phát sinh chi phí vận hành
      if (expenseTotal > 0) {
        await tx.ledgerTransaction.create({
          data: {
            invoiceId: null,
            type: LedgerType.MONTHLY_CLOSING_EXPENSE,
            amount: expenseTotal,
            description: `Kết chuyển Chi phí bù cước vận chuyển tháng ${month}/${year}`,
            adminId: admin.id,
            status: "COMPLETED",
          }
        });
      }

      // 5.8. Tạo Bản ghi Kỳ Kế toán chính thức
      const breakdownMetadata = {
        feeRevenue,
        coinRevenue,
        shippingRevenue,
        shippingExpense,
        shipmentsProcessed: shipments.length,
        isInterim: isCurrentPeriod,
        closedAt: now.toISOString()
      };

      const period = await tx.accountingPeriod.create({
        data: {
          month,
          year,
          periodStart,
          nextPeriodStart,
          status: AccountingPeriodStatus.CLOSED,
          revenueTotal,
          expenseTotal,
          netProfit,
          closedByAdminId: admin.id,
          metadata: JSON.stringify(breakdownMetadata)
        }
      });

      // 5.9. Lưu Nhật ký Kiểm toán bất biến (Audit Log)
      await tx.auditLog.create({
        data: {
          adminId: admin.id,
          action: "CLOSE_ACCOUNTING_PERIOD",
          targetType: "ACCOUNTING_PERIOD",
          targetId: period.id,
          metadata: JSON.stringify({
            month,
            year,
            revenueTotal,
            expenseTotal,
            netProfit,
            breakdown: breakdownMetadata
          })
        }
      });

      return period;
    });

    return { success: true, data: result };

  } catch (error: any) {
    console.error("Lỗi chốt sổ kế toán:", error);
    return { success: false, error: error.message || "Đã xảy ra lỗi hệ thống khi chốt sổ." };
  }
}
