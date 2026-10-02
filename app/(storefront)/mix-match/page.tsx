import { Metadata } from "next";
import { prisma } from "@/src/lib/prisma";
import MixMatchClient, { StudioProduct } from "./MixMatchClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mix & Match Studio | Tự Do Phối Đồ Tuần Hoàn CLOOP",
  description: "Trải nghiệm bảng phối đồ kéo thả trực tiếp trên kho đồ tuần hoàn CLOOP. Phối áo, váy, đầm và phụ kiện thành set outfit hoàn hảo với ưu đãi combo 10%.",
};

interface PageProps {
  searchParams: Promise<{ productId?: string }>;
}

export default async function MixMatchPage({ searchParams }: PageProps) {
  const { productId } = await searchParams;

  // Truy vấn trực tiếp các sản phẩm thực tế đang hoạt động trong database CLOOP
  const dbProducts = await prisma.product.findMany({
    where: {
      isDeleted: false,
    },
    select: {
      id: true,
      title: true,
      category: true,
      color: true,
      images: {
        orderBy: { isPrimary: "desc" },
        take: 1,
        select: { url: true },
      },
      listings: {
        where: { isDeleted: false },
        select: { listingType: true, basePrice: true },
      },
      user: {
        select: { name: true },
      },
    },
    take: 80,
    orderBy: { createdAt: "desc" },
  });

  const formattedProducts: StudioProduct[] = dbProducts.map((p) => {
    const rentalListing = p.listings.find((l) => l.listingType === "RENT");
    const rawPrice = rentalListing?.basePrice ? Number(rentalListing.basePrice) : 80000;
    const imgUrl = p.images[0]?.url || "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600";

    return {
      id: p.id,
      title: p.title || "Trang phục CLOOP",
      category: p.category || "Áo",
      color: p.color,
      image: imgUrl,
      price: rawPrice,
      ownerName: p.user?.name || "Chủ tủ CLOOP",
    };
  });

  return (
    <MixMatchClient
      initialProducts={formattedProducts}
      preselectedProductId={productId}
    />
  );
}
