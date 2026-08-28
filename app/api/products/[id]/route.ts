import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Thiếu mã sản phẩm" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: [
            { isPrimary: "desc" },
            { sortOrder: "asc" },
            { createdAt: "asc" },
          ],
        },
        listings: {
          where: { isDeleted: false },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            rating: true,
            reviewCount: true,
            isVerified: true,
          },
        },
        rentalHistory: {
          where: {
            status: { in: ["BORROWER_RECEIVED", "BORROWER_RETURNED"] },
          },
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!product || product.isDeleted) {
      return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 });
    }

    const images = product.images.map((img: any) => img.url);
    const rentalListing = product.listings.find((l: any) => l.listingType === "RENT");
    const saleListing = product.listings.find((l: any) => l.listingType === "SELL" || l.listingType === "RECYCLE");

    const rentalPrice = rentalListing?.basePrice ? Number(rentalListing.basePrice) : 0;
    const salePrice = saleListing?.basePrice ? Number(saleListing.basePrice) : 0;
    const isRental = !!rentalListing && rentalPrice > 0;
    const isSale = !!saleListing && salePrice > 0;

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        title: product.title,
        name: product.title,
        category: product.category,
        size: product.size,
        color: product.color,
        material: product.material,
        condition: product.condition,
        description: product.description,
        province: product.province,
        ward: product.wardCode,
        specificAddress: product.specificAddress,
        bust: product.bust,
        waist: product.waist,
        hips: product.hips,
        images: images.length > 0 ? images : ["https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600"],
        image: images[0] || "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600",
        rentalPrice,
        salePrice,
        isRental,
        isSale,
        depositPercent: rentalListing?.deposit ? Number(rentalListing.deposit) : 100,
        ownerId: product.user?.id,
        ownerRealName: product.user?.name || "Chủ tủ đồ CLOOP",
        ownerRealPhone: "098.765.4321",
        ownerAvatar: product.user?.avatar,
        hasActiveRentals: product.rentalHistory.length > 0,
        reviews: product.reviews,
        reviewCount: product.reviews.length,
        averageRating: product.user?.rating || 4.9,
      },
    });
  } catch (error: any) {
    console.error("Lỗi API lấy chi tiết sản phẩm:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
