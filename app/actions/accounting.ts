"use server";

import { AccountingPeriodStatus, LedgerType } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/auth";

export async function executeMonthlyClosing(month: number, year: number, forceDemoMode = false) {
  try {
    // 1. Kiểm tra quyền Admin
    const { profile: admin } = await requireAdmin();

    // 2. Lấy thời gian hiện tại
    const now = new Date();
    
    // Tính toán mốc thời gian kỳ kế toán
    // periodStart: Đầu tháng (mùng 1, 00:00:00)
    const periodStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    // nextPeriodStart: Đầu tháng sau (Exclusive upperBound)
    const nextPeriodStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

    // 3. Kiểm tra logic Thời gian chốt sổ
    if (periodStart > now) {
      throw new Error(`Không thể chốt sổ cho tháng tương lai (${month}/${year}).`);
    }

    if (!forceDemoMode && now < nextPeriodStart) {
      throw new Error(`Kỳ kế toán ${month}/${year} chưa kết thúc. Chỉ được chốt sổ khi đã qua tháng mới (Hoặc bật chế độ Demo).`);
    }

    // 4. Giao dịch Kế toán (ACID)
    const result = await prisma.$transaction(async (tx) => {
      // 4.1. Kiểm tra Idempotency: Kỳ này đã chốt chưa?
      const existingPeriod = await tx.accountingPeriod.findUnique({
        where: { month_year: { month, year } }
      });

      if (existingPeriod) {
        throw new Error(`Kỳ kế toán tháng ${month}/${year} đã được chốt trước đó vào lúc ${existingPeriod.closedAt.toLocaleString('vi-VN')}! Không thể chốt trùng.`);
      }

      // 4.2. Aggregate Tổng Doanh Thu (FEE_RETAINED, PENALTY_FEE_RETAINED)
      // Chú ý: Lọc theo thời gian createdAt >= periodStart VÀ createdAt < nextPeriodStart
      const revenues = await tx.ledgerTransaction.aggregate({
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

      const revenueTotal = revenues._sum.amount || 0;
      const expenseTotal = 0; // Demo: Chưa có module chi phí
      const netProfit = revenueTotal - expenseTotal;

      // 4.3. Tạo Bút toán Kết chuyển Doanh thu
      if (revenueTotal > 0) {
        await tx.ledgerTransaction.create({
          data: {
            invoiceId: "MONTHLY_CLOSING", // ID ảo cho bút toán hệ thống
            type: LedgerType.MONTHLY_CLOSING_REVENUE,
            amount: revenueTotal,
            description: `Kết chuyển Doanh thu tháng ${month}/${year}`,
            adminId: admin.id,
            status: "COMPLETED",
          }
        });
      }

      // 4.4. Tạo Kỳ Kế toán đã đóng
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
          metadata: JSON.stringify({ isDemo: forceDemoMode })
        }
      });

      // 4.5. Lưu Audit Log
      await tx.auditLog.create({
        data: {
          adminId: admin.id,
          action: "CLOSE_ACCOUNTING_PERIOD",
          targetType: "ACCOUNTING_PERIOD",
          targetId: period.id,
          metadata: JSON.stringify({ month, year, netProfit, forceDemoMode })
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
