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

  // ⚡ TỐI ƯU SIÊU TỐC: Gom 2 truy vấn Escrow & Rented chạy song song (Parallel Fetching)
  const [escrowRaw, rentedRaw] = await Promise.all([
    // 1. Escrow (Yêu cầu ký quỹ) - Người khác thuê đồ của tôi
    prisma.rentalHistory.findMany({
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
    }),

    // 2. Rented (Trang phục đi thuê) - Tôi đi thuê đồ người khác
    prisma.rentalHistory.findMany({
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
    })
  ]);

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
    <div className="min-h-screen bg-[#FAF9F5] py-8 px-4 sm:px-8 text-stone-800 antialiased">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50/90 px-3 py-0.5 rounded-full border border-emerald-200/60 font-ui">
              QUẢN LÝ ĐƠN HÀNG & GIAO DỊCH
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-normal text-[#183A2D] mt-2">
            Đơn Hàng & Giao Dịch
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1.5 font-body">
            Theo dõi tiến trình cho thuê, nhận đồ, đối soát ký quỹ và xử lý khiếu nại.
          </p>
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
