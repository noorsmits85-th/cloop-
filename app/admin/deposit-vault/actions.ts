"use server";

import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/auth";

const OPEN_RENTAL_STATUSES = [
  "PENDING_APPROVAL",
  "OWNER_PACKED",
  "LENDER_SHIPPED",
  "BORROWER_RECEIVED",
  "BORROWER_RETURNED",
  "DISPUTE",
] as const;

function getStatusLabel(status: string): string {
  switch (status) {
    case "PENDING_APPROVAL":
      return "Chờ xác nhận";
    case "OWNER_PACKED":
      return "Chủ tủ đã đóng gói";
    case "LENDER_SHIPPED":
      return "Đang giao hàng";
    case "BORROWER_RECEIVED":
      return "Khách đang sử dụng";
    case "BORROWER_RETURNED":
      return "Khách đã gửi trả đồ";
    case "DISPUTE":
      return "Đang khiếu nại";
    case "LENDER_COMPLETED":
      return "Đã hoàn cọc / Hoàn tất";
    default:
      return status;
  }
}

export async function getDepositVaultMetricsAction() {
  try {
    await requireAdmin();

    const today = new Date();

    const formatDate = (d: Date | null) => {
      if (!d) return "—";
      return new Date(d).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
      });
    };

    // 1. CÁC ĐƠN HÀNG ĐANG TẠM GIỮ TIỀN CỌC THỰC TẾ (HÓA ĐƠN ĐÃ THANH TOÁN VÀ ĐƠN ĐANG TRONG QUÁ TRÌNH THUÊ)
    const activeRentals = await prisma.rentalHistory.findMany({
      where: {
        status: { in: [...OPEN_RENTAL_STATUSES] },
        invoice: {
          status: "PAID",
          depositAmount: { gt: 0 },
        },
      },
      select: {
        id: true,
        start_date: true,
        end_date: true,
        status: true,
        renter_name: true,
        renter_phone: true,
        owner_name: true,
        owner_phone: true,
        product: { select: { title: true } },
        invoice: {
          select: {
            depositAmount: true,
            rentalFee: true,
            shippingFeeCollected: true,
            amount: true,
            status: true,
          },
        },
      },
      orderBy: { end_date: "asc" },
      take: 100,
    });

    let totalVault = 0;
    let pendingReturn = 0;
    let activeRentalDeposit = 0;

    const formattedActive = activeRentals.map((rent) => {
      const depositAmount = rent.invoice?.depositAmount || 0;
      const expectedReturnDate = rent.end_date;
      const daysUntilReturn = Math.ceil(
        (expectedReturnDate.getTime() - today.getTime()) / (1000 * 3600 * 24)
      );

      totalVault += depositAmount;

      if (rent.status === "BORROWER_RETURNED" || (daysUntilReturn >= 0 && daysUntilReturn <= 3)) {
        pendingReturn += depositAmount;
      } else {
        activeRentalDeposit += depositAmount;
      }

      return {
        id: rent.id,
        orderCode: `CLP-${rent.id.slice(0, 8).toUpperCase()}`,
        productTitle: rent.product?.title || "Sản phẩm thời trang",
        renterName: rent.renter_name || "Khách thuê",
        renterPhone: rent.renter_phone || "—",
        ownerName: rent.owner_name || "Chủ tủ",
        ownerPhone: rent.owner_phone || "—",
        depositAmount,
        status: rent.status,
        statusLabel: getStatusLabel(rent.status),
        startDate: formatDate(rent.start_date),
        endDate: formatDate(rent.end_date),
        invoiceAmount: rent.invoice?.amount || 0,
        rentalFee: rent.invoice?.rentalFee || 0,
        shippingFeeCollected: rent.invoice?.shippingFeeCollected || 0,
        isSettled: false,
      };
    });

    // 2. LỊCH SỬ TIỀN CỌC ĐÃ HOÀN TRẢ / GIẢI NGÂN HOÀN TẤT
    const settledRentals = await prisma.rentalHistory.findMany({
      where: {
        status: "LENDER_COMPLETED",
        invoice: {
          status: "PAID",
          depositAmount: { gt: 0 },
        },
      },
      select: {
        id: true,
        start_date: true,
        end_date: true,
        status: true,
        renter_name: true,
        renter_phone: true,
        owner_name: true,
        owner_phone: true,
        product: { select: { title: true } },
        invoice: {
          select: {
            depositAmount: true,
            rentalFee: true,
            shippingFeeCollected: true,
            amount: true,
            status: true,
          },
        },
      },
      orderBy: { end_date: "desc" },
      take: 50,
    });

    let totalHistoricalSettled = 0;
    const formattedSettled = settledRentals.map((rent) => {
      const depositAmount = rent.invoice?.depositAmount || 0;
      totalHistoricalSettled += depositAmount;

      return {
        id: rent.id,
        orderCode: `CLP-${rent.id.slice(0, 8).toUpperCase()}`,
        productTitle: rent.product?.title || "Sản phẩm thời trang",
        renterName: rent.renter_name || "Khách thuê",
        renterPhone: rent.renter_phone || "—",
        ownerName: rent.owner_name || "Chủ tủ",
        ownerPhone: rent.owner_phone || "—",
        depositAmount,
        status: rent.status,
        statusLabel: "Đã hoàn cọc / Đóng đơn",
        startDate: formatDate(rent.start_date),
        endDate: formatDate(rent.end_date),
        invoiceAmount: rent.invoice?.amount || 0,
        rentalFee: rent.invoice?.rentalFee || 0,
        shippingFeeCollected: rent.invoice?.shippingFeeCollected || 0,
        isSettled: true,
      };
    });

    // 3. CHIẾN LƯỢC QUẢN TRỊ NGUỒN VỐN KÝ QUỸ FLOAT 70/30 (LẤY NGẮN NUÔI DÀI)
    const liquidityBuffer = Math.round(totalVault * 0.3); // 30% Thanh khoản tức thời T+0
    const flexibleInvestment = Math.round(totalVault * 0.45); // 45% Sinh lời ngắn hạn linh hoạt T+1 (~4.8%/năm)
    const fixedInvestment = Math.round(totalVault * 0.25); // 25% Kỳ hạn 1 tháng T+30 (~6.2%/năm)
    const totalInvesting = flexibleInvestment + fixedInvestment; // 70% Tổng vốn đầu tư sinh lời

    const estimatedAnnualYield = Math.round(flexibleInvestment * 0.048 + fixedInvestment * 0.062);
    const estimatedMonthlyYield = Math.round(estimatedAnnualYield / 12);

    const reinvestmentBreakdown = {
      reserveFund: Math.round(estimatedAnnualYield * 0.5), // 50% Bồi đắp Quỹ Bảo Chứng Tín Nhiệm
      paymentFeeOffset: Math.round(estimatedAnnualYield * 0.25), // 25% Bù phí PayOS
      greenRewards: Math.round(estimatedAnnualYield * 0.15), // 15% Xu xanh Leaf Coins
      techBuffer: Math.round(estimatedAnnualYield * 0.1), // 10% Dự phòng công nghệ
    };

    const liquiditySafetyRatio = pendingReturn > 0
      ? Math.round((liquidityBuffer / pendingReturn) * 100)
      : 100;

    return {
      success: true,
      data: {
        vaultSummary: {
          totalVault,
          pendingReturn,
          activeRentalDeposit,
          activeCount: formattedActive.length,
          totalHistoricalSettled,
          settledCount: formattedSettled.length,
        },
        floatStrategy: {
          totalVault,
          liquidityBuffer,
          totalInvesting,
          flexibleInvestment,
          fixedInvestment,
          estimatedAnnualYield,
          estimatedMonthlyYield,
          reinvestmentBreakdown,
          liquiditySafetyRatio,
        },
        activeTransactions: formattedActive,
        settledTransactions: formattedSettled,
      },
    };
  } catch (error: any) {
    console.error("Lỗi getDepositVaultMetricsAction:", error);
    return { success: false, error: error.message };
  }
}
