import React from "react";
import LedgerClient, { InvoiceData } from "./LedgerClient";
import { prisma } from "@/src/lib/prisma";
import { requireAdminOrRedirect } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLedgerPage() {
  await requireAdminOrRedirect();

  // 1. Fetch dữ liệu thực tế từ Database
  const [invoices, ledgerStats] = await Promise.all([
    prisma.invoice.findMany({
      where: { isDeleted: false },
      take: 50,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rentalId: true,
        amount: true,
        depositAmount: true,
        rentalFee: true,
        platformFee: true,
        shippingFeeCollected: true,
        createdAt: true,
        rental: {
          select: {
            renter_name: true,
            owner_name: true,
            product: {
              select: {
                title: true,
                listings: {
                  where: { isDeleted: false },
                  take: 2,
                  select: { listingType: true, deposit: true, basePrice: true }
                }
              }
            }
          }
        },
        ledgerEntries: {
          select: { type: true, status: true }
        }
      }
    }),
    prisma.ledgerTransaction.groupBy({
      by: ['type'],
      where: { status: "COMPLETED" },
      _sum: { amount: true }
    })
  ]);

  // 2. Chuyển đổi dữ liệu từ Prisma model sang format UI
  const mappedInvoices: InvoiceData[] = invoices.map(inv => {
    const isCompleted = inv.ledgerEntries.some(entry => entry.type === "FEE_RETAINED" && entry.status === "COMPLETED");
    
    const rentalListing = inv.rental?.product?.listings?.find(l => l.listingType === "RENT") || inv.rental?.product?.listings?.[0];
    const depositRefund = inv.depositAmount > 0 ? inv.depositAmount : (rentalListing?.deposit || 0);
    const rentalFee = inv.rentalFee > 0 ? inv.rentalFee : (rentalListing?.basePrice || 0);
    const platformFee = inv.platformFee ?? Math.floor(rentalFee * 0.12);
    const shippingFeeCollected = inv.shippingFeeCollected || 0;

    const dateObj = new Date(inv.createdAt);
    const timeString = dateObj.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
    const dateString = dateObj.toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });

    return {
      id: inv.id,
      rentalId: inv.rentalId,
      productName: inv.rental?.product?.title || "Trang phục CLOOP",
      renter: inv.rental?.renter_name || "Khách thuê",
      owner: inv.rental?.owner_name || "Chủ tủ",
      totalDepositIn: inv.amount,
      depositRefund: depositRefund,
      rentalFee: rentalFee,
      platformFee: platformFee,
      shippingFeeCollected: shippingFeeCollected,
      status: isCompleted ? "COMPLETED" : "PENDING_RECONCILIATION",
      createdAt: `${timeString} - ${dateString}`
    };
  });

  // 3. Tính toán Thống kê Tổng từ kết quả groupBy (Chính xác từng đồng, không giả định)
  const sumByType: Record<string, number> = {};
  for (const item of ledgerStats) {
    sumByType[item.type] = item._sum.amount || 0;
  }

  const totalIn = sumByType["DEPOSIT_IN"] || 0;
  const totalRefundOut = sumByType["REFUND_OUT"] || 0;
  const totalPayoutOut = sumByType["PAYOUT_OUT"] || 0;
  const totalCompensationOut = sumByType["COMPENSATION_OUT"] || 0;
  const totalPlatformFee = sumByType["FEE_RETAINED"] || 0;
  const totalOut = totalRefundOut + totalPayoutOut + totalCompensationOut;

  return (
    <LedgerClient 
      initialInvoices={mappedInvoices} 
      totalPlatformFee={totalPlatformFee}
      totalIn={totalIn}
      totalOut={totalOut}
    />
  );
}
