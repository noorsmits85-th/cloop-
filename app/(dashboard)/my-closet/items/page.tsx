import React from "react";
import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { redirect } from "next/navigation";
import { ItemsClient } from "../_components/ItemsClient";

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=120";

export default async function MyClosetItemsPage() {
  let userAuth;
  try {
    userAuth = await requireUser();
  } catch (error) {
    redirect("/login");
  }

  const userId = userAuth.id;

  const products = await prisma.product.findMany({
    where: { userId },
    include: {
      listings: true,
      blogs: true,
      rentalHistory: {
        where: {
          status: { in: ["BORROWER_RECEIVED", "BORROWER_RETURNED"] }
        }
      },
      images: {
        where: { isPrimary: true },
        take: 1
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const formattedItems = products.map((item) => {
    let currentImage = item.images?.[0]?.url || PLACEHOLDER_IMG;
    const rentalListing = item.listings.find((l: any) => l.listingType === "RENT");
    const saleListing = item.listings.find((l: any) => l.listingType === "SELL" || l.listingType === "RECYCLE");

    const rentPrice = rentalListing ? Number(rentalListing.basePrice) : 0;
    const sellPrice = saleListing ? Number(saleListing.basePrice) : 0;

    const listingIds = [rentalListing?.id, saleListing?.id].filter(Boolean);
    const isShopHidden = item.listings.length > 0 && item.listings.every((l: any) => l.status === "HIDDEN");

    const matchedBlog = item.blogs?.[0];
    const hasBlog = !!matchedBlog;
    const blogTitle = matchedBlog ? matchedBlog.title : "Chưa cấu hình câu chuyện";
    const isBlogHidden = matchedBlog ? matchedBlog.status === "HIDDEN" : false;

    return {
      id: item.id,
      name: item.title,
      size: item.size || "M",
      image: currentImage,
      isRentalActive: rentPrice > 0,
      rentalPrice: rentPrice,
      activeRentals: item.rentalHistory,
      isCurrentlyRenting: item.rentalHistory.length > 0,
      isSaleActive: sellPrice > 0,
      salePrice: sellPrice,
      listingIds,
      isShopHidden,
      hasBlog,
      blogTitle,
      isBlogHidden
    };
  });

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-8 px-4 sm:px-8 text-stone-800 antialiased">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50/90 px-3 py-0.5 rounded-full border border-emerald-200/60 font-ui">
              KHO TÀI SẢN THỜI TRANG
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-normal text-[#183A2D] mt-2">
            Tủ Đồ Của Tôi
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1.5 font-body">
            Quản lý kho sản phẩm, trạng thái cho thuê, đăng bán và bài viết Lookbook.
          </p>
        </div>

        <ItemsClient initialItems={formattedItems} />
      </div>
    </div>
  );
}
