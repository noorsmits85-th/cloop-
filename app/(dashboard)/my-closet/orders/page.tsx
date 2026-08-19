import React, { Suspense } from "react";
import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { redirect } from "next/navigation";
import { OrdersClient } from "../_components/OrdersClient";

export default async function MyClosetOrdersPage() {
  let userAuth;
  try {
    userAuth = await requireUser();
  } catch (error) {
    redirect("/login");
  }

  const userId = userAuth.id;

  // 1. Escrow (Yêu cầu ký quỹ) - Người khác thuê đồ của tôi
  const escrowRaw = await prisma.rentalHistory.findMany({
    where: { 
      product: { userId } 
    },
    take: 21,
    include: {
      product: { include: { images: true } },
      invoice: true,
      disputes: { orderBy: { createdAt: 'desc' } },
      renter: {
        include: {
          reviewsReceived: {
            where: { type: "OWNER_TO_RENTER" }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // 2. Rented (Trang phục đi thuê) - Tôi đi thuê đồ người khác
  const rentedRaw = await prisma.rentalHistory.findMany({
    where: { 
      renterId: userId 
    },
    take: 21,
    include: {
      invoice: true,
      disputes: { orderBy: { createdAt: 'desc' } },
      product: { 
        include: { 
          images: true,
          user: {
            include: {
              reviewsReceived: {
                where: { type: "RENTER_TO_OWNER" }
              }
            }
          }
        }
      },
    },
    orderBy: { createdAt: 'desc' }
  });

  // Function to calculate average review score
  const getReviewStats = (reviews: any[]) => {
    if (!reviews || reviews.length === 0) return { avg: "5.0", count: 0 };
    const total = reviews.reduce((acc, rev) => acc + rev.rating, 0);
    return { avg: (total / reviews.length).toFixed(1), count: reviews.length };
  };

  const hasMoreEscrow = escrowRaw.length > 20;
  const pagedEscrow = hasMoreEscrow ? escrowRaw.slice(0, 20) : escrowRaw;

  const hasMoreRented = rentedRaw.length > 20;
  const pagedRented = hasMoreRented ? rentedRaw.slice(0, 20) : rentedRaw;

  const initialEscrow = pagedEscrow.map(order => {
    const renterStats = getReviewStats(order.renter?.reviewsReceived || []);
    return {
      ...order,
      renter_name: order.renter?.name || order.renterId,
      renterAvg: renterStats.avg,
      renterReviewCount: renterStats.count,
      products: {
        title: order.product.title,
        image_url: order.product.images?.[0]?.url
      }
    };
  });

  const initialRented = pagedRented.map(order => {
    const ownerStats = getReviewStats(order.product.user?.reviewsReceived || []);
    return {
      ...order,
      owner_name: order.product.user?.name || order.product.userId,
      ownerAvg: ownerStats.avg,
      ownerReviewCount: ownerStats.count,
      products: {
        title: order.product.title,
        image_url: order.product.images?.[0]?.url
      }
    };
  });

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-10 px-4 sm:px-8 text-stone-800 antialiased">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap" />
      <style>{`body, h1, h2, h3, h4, table, th, td, button, span, p, label, input { font-family: 'Be Vietnam Pro', sans-serif !important; }`}</style>
      
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end border-b border-stone-200/60 pb-6 gap-4">
          <div className="text-left space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-[#183A2D]">Quản lý Giao dịch</h1>
            <p className="text-stone-400 text-xs font-medium tracking-wide">Quản lý các yêu cầu thuê đồ và theo dõi đơn thuê của bạn.</p>
          </div>
        </div>
        
        <Suspense fallback={<div className="p-8 text-center text-stone-400">Đang tải dữ liệu...</div>}>
          <OrdersClient 
            initialEscrow={initialEscrow} 
            initialRented={initialRented} 
            initialHasMoreEscrow={hasMoreEscrow}
            initialHasMoreRented={hasMoreRented}
          />
        </Suspense>
      </div>
    </div>
  );
}
