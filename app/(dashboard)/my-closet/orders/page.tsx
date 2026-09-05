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

  let escrowRaw: any[] = [];
  let rentedRaw: any[] = [];

  try {
    const results = await Promise.all([
      // 1. Escrow (Yêu cầu ký quỹ) - Người khác thuê đồ của tôi
      prisma.rentalHistory.findMany({
        where: {
          product: { userId }
        },
        take: 21,
        select: {
          id: true,
          renterId: true,
          ownerId: true,
          start_date: true,
          end_date: true,
          status: true,
          createdAt: true,
          product: {
            select: {
              id: true,
              title: true,
              province: true,
              userId: true,
              images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
              user: { select: { id: true, name: true, rating: true, reviewCount: true } }
            }
          },
          invoice: {
            select: {
              id: true,
              amount: true,
              rentalFee: true,
              depositAmount: true,
              shippingFeeCollected: true,
              platformFee: true,
              status: true,
              orderCode: true,
              payosStatus: true
            }
          },
          disputes: { orderBy: { createdAt: 'desc' } },
          shipments: {
            select: {
              id: true,
              direction: true,
              status: true,
              trackingCode: true,
              shippingFeeCollected: true,
              actualShippingFee: true,
              pickupAddress: true,
              deliveryAddress: true,
              providerRawPayload: true,
            }
          },
          renter: {
            select: {
              id: true,
              name: true,
              avatar: true,
              rating: true,
              reviewCount: true,
              reviewsReceived: {
                select: { rating: true },
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
        select: {
          id: true,
          renterId: true,
          ownerId: true,
          start_date: true,
          end_date: true,
          status: true,
          createdAt: true,
          invoice: {
            select: {
              id: true,
              amount: true,
              rentalFee: true,
              depositAmount: true,
              shippingFeeCollected: true,
              platformFee: true,
              status: true,
              orderCode: true,
              payosStatus: true
            }
          },
          disputes: { orderBy: { createdAt: 'desc' } },
          shipments: {
            select: {
              id: true,
              direction: true,
              status: true,
              trackingCode: true,
              shippingFeeCollected: true,
              actualShippingFee: true,
              pickupAddress: true,
              deliveryAddress: true,
              providerRawPayload: true,
            }
          },
          product: {
            select: {
              id: true,
              title: true,
              province: true,
              userId: true,
              images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
              user: {
                select: {
                  id: true,
                  name: true,
                  rating: true,
                  reviewCount: true,
                  reviewsReceived: {
                    select: { rating: true },
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
    escrowRaw = results[0];
    rentedRaw = results[1];
  } catch (err) {
    console.error("⚠️ [OrdersPage Fetch Error]:", err);
  }

  // Function to calculate average review score
  const getReviewStats = (reviews: any[]) => {
    if (!reviews || reviews.length === 0) return { avg: "5.0", count: 0 };
    const total = reviews.reduce((acc, rev) => acc + rev.rating, 0);
    return { avg: (total / reviews.length).toFixed(1), count: reviews.length };
  };

  function serializeData(data: any) {
    return JSON.parse(
      JSON.stringify(data, (key, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );
  }

  const hasMoreEscrow = escrowRaw.length > 20;
  const pagedEscrow = hasMoreEscrow ? escrowRaw.slice(0, 20) : escrowRaw;

  const hasMoreRented = rentedRaw.length > 20;
  const pagedRented = hasMoreRented ? rentedRaw.slice(0, 20) : rentedRaw;

  const initialEscrow = pagedEscrow.map(order => {
    const renterStats = getReviewStats(order.renter?.reviewsReceived || []);
    const serialized = serializeData(order);
    return {
      ...serialized,
      startDate: order.start_date,
      endDate: order.end_date,
      renter_name: order.renter?.name || order.renter_name || order.renterId || "Người thuê",
      renterAvg: renterStats.avg,
      renterReviewCount: renterStats.count,
      products: {
        title: order.product?.title || "Trang phục CLOOP",
        image_url: order.product?.images?.[0]?.url || "/1.1.jpg"
      }
    };
  });

  const initialRented = pagedRented.map(order => {
    const ownerStats = getReviewStats(order.product?.user?.reviewsReceived || []);
    const serialized = serializeData(order);
    return {
      ...serialized,
      startDate: order.start_date,
      endDate: order.end_date,
      owner_name: order.product?.user?.name || order.owner_name || "Chủ tủ đồ",
      ownerAvg: ownerStats.avg,
      ownerReviewCount: ownerStats.count,
      products: {
        title: order.product?.title || "Trang phục CLOOP",
        image_url: order.product?.images?.[0]?.url || "/1.1.jpg"
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

