import { prisma } from "@/src/lib/prisma";
import { notFound } from "next/navigation";
import CheckoutClient from "./CheckoutClient";

export const revalidate = 0;

export default async function CheckoutPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;

  // 1. Fetch Product Data
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: {
        where: { isPrimary: true },
        take: 1
      },
      user: {
        select: { id: true, name: true }
      },
      listings: {
        where: { status: "AVAILABLE" },
        take: 1
      }
    }
  });

  if (!product || product.listings.length === 0) {
    return notFound();
  }

  const listing = product.listings[0];
  const weight = 500; 
  const fromProvince = product.province || "Hà Nội";

  // Tính toán Tiers
  let pricingTiers = listing.pricing_tiers as any[];
  if (!pricingTiers || pricingTiers.length === 0) {
    const base = listing.basePrice || 0;
    const roundToThousand = (num: number) => Math.round(num / 1000) * 1000;
    pricingTiers = [
      { days: 1, price: base, name: "Gói Hỏa Tốc", description: "Dành cho nhu cầu sử dụng ngay lập tức." },
      { days: 3, price: roundToThousand(base * 3 * 0.85), name: "Gói Cuối Tuần / Đi Tiệc", description: "Thong thả nhận, mặc tiệc, giặt giũ và trả đồ." },
      { days: 7, price: roundToThousand(base * 7 * 0.70), name: "Gói Nghỉ Dưỡng", description: "Hoàn hảo cho những chuyến du lịch xa." },
    ];
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-8 sm:py-12 px-4 md:px-8 text-stone-800 antialiased font-body">
      <CheckoutClient 
        product={product}
        productId={product.id} 
        fromProvince={fromProvince} 
        weight={weight} 
        depositPrice={listing.deposit || 0}
        pricingTiers={pricingTiers}
        turnaroundDays={listing.turnaround_days || 2}
      />
    </div>
  );
}
