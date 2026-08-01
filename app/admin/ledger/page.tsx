import React from "react";
import LedgerClient, { InvoiceData } from "./LedgerClient";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic"; // Tắt cache, luôn lấy dữ liệu mới nhất từ Sổ cái

export default async function AdminLedgerPage() {
  // 1. Fetch dữ liệu thực tế từ Database
  // Lấy các Hóa đơn (Invoices) đã thanh toán (PAID) hoặc có liên quan đến hợp đồng
  const invoices = await prisma.invoice.findMany({
    include: {
      rental: {
        include: {
          product: {
            include: {
              listings: true // Lấy listings để biết tiền cọc và giá thuê
            }
          }
        }
      },
      ledgerEntries: true // Để biết invoice này đã đối soát xong chưa
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // 2. Chuyển đổi dữ liệu (Mapping) từ Prisma model sang format UI cần
  const mappedInvoices: InvoiceData[] = invoices.map(inv => {
    const isCompleted = inv.ledgerEntries.some(entry => entry.type === "FEE_RETAINED" && entry.status === "COMPLETED");
    
    // Tìm Listing kiểu RENT để lấy giá thuê và cọc
    const rentalListing = inv.rental.product.listings.find(l => l.listingType === "RENT");
    const depositRefund = rentalListing?.deposit || 0;
    const rentalFee = rentalListing?.basePrice || 0;

    // Định dạng thời gian giao dịch chuyên nghiệp (VD: 14:30:45 - 25/10/2026)
    const dateObj = new Date(inv.createdAt);
    const timeString = dateObj.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateString = dateObj.toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' });

    return {
      id: inv.id,
      rentalId: inv.rentalId,
      productName: inv.rental.product.title,
      renter: inv.rental.renter_name || "Unknown Renter",
      owner: inv.rental.owner_name || "Unknown Owner",
      totalDepositIn: inv.amount,
      depositRefund: depositRefund,
      rentalFee: rentalFee,
      status: isCompleted ? "COMPLETED" : "PENDING_RECONCILIATION",
      createdAt: `${timeString} - ${dateString}`
    };
  });

  // NẾU DATABASE TRỐNG, ta bơm 1 dòng dữ liệu mẫu (Mock) để test giao diện
  if (mappedInvoices.length === 0) {
    mappedInvoices.push({
      id: "MOCK-1A2B3C",
      rentalId: "rent-123",
      productName: "Váy dạ hội đỏ đun (MOCK)",
      renter: "Trang Hoàng",
      owner: "Linh Nguyễn",
      totalDepositIn: 1150000,
      depositRefund: 1000000,
      rentalFee: 150000,
      status: "PENDING_RECONCILIATION",
      createdAt: "14:05:32 - 25/07/2026"
    });
  }

  // 3. Tính toán Thống kê Tổng (Stats)
  const totalIn = await prisma.ledgerTransaction.aggregate({
    where: { type: "DEPOSIT_IN", status: "COMPLETED" },
    _sum: { amount: true }
  }).then(res => res._sum.amount || 0);

  const totalRefundOut = await prisma.ledgerTransaction.aggregate({
    where: { type: "REFUND_OUT", status: "COMPLETED" },
    _sum: { amount: true }
  }).then(res => res._sum.amount || 0);

  const totalPayoutOut = await prisma.ledgerTransaction.aggregate({
    where: { type: "PAYOUT_OUT", status: "COMPLETED" },
    _sum: { amount: true }
  }).then(res => res._sum.amount || 0);

  const totalPlatformFee = await prisma.ledgerTransaction.aggregate({
    where: { type: "FEE_RETAINED", status: "COMPLETED" },
    _sum: { amount: true }
  }).then(res => res._sum.amount || 0);

  const totalOut = totalRefundOut + totalPayoutOut;

  return (
    <LedgerClient 
      initialInvoices={mappedInvoices} 
      totalPlatformFee={totalPlatformFee}
      totalIn={totalIn}
      totalOut={totalOut}
    />
  );
}
