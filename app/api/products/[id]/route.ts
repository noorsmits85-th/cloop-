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

    let targetHeight = "";
    let targetWeight = "";

    if (product.style) {
      try {
        if (product.style.startsWith("{")) {
          const parsedStyle = JSON.parse(product.style);
          targetHeight = parsedStyle.height || "";
          targetWeight = parsedStyle.weight || "";
        } else if (product.style.startsWith("H:")) {
          const parts = product.style.split("|");
          targetHeight = parts[0]?.replace("H:", "") || "";
          targetWeight = parts[1]?.replace("W:", "") || "";
        }
      } catch (e) {}
    }

    // Default smart suggestion based on size if not explicitly set
    if (!targetHeight && !targetWeight) {
      const sz = (product.size || "").toUpperCase();
      if (sz === "XS" || sz === "S") {
        targetHeight = "150 - 160";
        targetWeight = "42 - 48";
      } else if (sz === "M") {
        targetHeight = "155 - 165";
        targetWeight = "48 - 56";
      } else if (sz === "L") {
        targetHeight = "162 - 172";
        targetWeight = "55 - 64";
      } else if (sz === "XL") {
        targetHeight = "168 - 180";
        targetWeight = "63 - 75";
      } else {
        targetHeight = "155 - 168";
        targetWeight = "46 - 58";
      }
    }

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
        targetHeight,
        targetWeight,
        chest: product.bust,
        bust: product.bust,
        waist: product.waist,
        hips: product.hips,
        images: images.map((img: string) => {
          if (img.includes("photo-1548624149-19d45e4ab558")) return "/vintage_coat.jpg";
          if (img.includes("photo-1584916201218-f4242ceb4809")) return "/step2_bag.jpg";
          return img;
        }).filter(Boolean),
        image: (images[0]?.includes("photo-1548624149-19d45e4ab558") ? "/vintage_coat.jpg" : (images[0]?.includes("photo-1584916201218-f4242ceb4809") ? "/step2_bag.jpg" : images[0])) || "/vintage_coat.jpg",
        rentalPrice,
        salePrice,
        isRental,
        isSale,
        depositAmount: rentalListing?.deposit ? Number(rentalListing.deposit) : 0,
        depositPercent: rentalListing?.deposit ? Number(rentalListing.deposit) : 0,
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
