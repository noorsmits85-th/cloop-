import React from "react";
import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { EcoClient } from "../_components/EcoClient";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";

export const revalidate = 0;

// Cache EcoMetrics
const getCachedEcoMetrics = unstable_cache(
  async () => {
    return await prisma.ecoMetric.findMany();
  },
  ['eco-metrics'],
  { revalidate: 86400 }
);

export default async function EcoPage() {
  let userAuth;
  try {
    userAuth = await requireUser();
  } catch (error) {
    // Không có session
  }

  if (!userAuth) {
    redirect("/login?next=/my-closet/eco");
  }

  const userId = userAuth.id;

  // ⚡ TỐI ƯU SIÊU TỐC: Truy vấn song song siêu nhẹ và dùng cache EcoMetrics
  const [products, dbMetrics, completedRentalsCount] = await Promise.all([
    prisma.product.findMany({
      where: { userId, isDeleted: false },
      select: { category: true, material: true }
    }),
    getCachedEcoMetrics(),
    prisma.rentalHistory.count({
      where: {
        OR: [{ ownerId: userId }, { renterId: userId }],
        status: "LENDER_COMPLETED"
      }
    })
  ]);

  const ECO_MATRIX: Record<string, { water: number; co2: number; pts: number }> = {};
  dbMetrics.forEach((m: any) => {
    ECO_MATRIX[m.keyword.toLowerCase().trim()] = { water: m.waterFactor, co2: m.co2Factor, pts: m.greenPts };
  });

  let carbonSaved = 0;
  let waterSaved = 0;

  products.forEach((product: any) => {
    const cat = (product.category || "").toLowerCase().trim();
    const mat = (product.material || "").toLowerCase().trim();
    
    let match = null;
    for (const key of Object.keys(ECO_MATRIX)) {
      if (cat.includes(key) || mat.includes(key)) {
        match = ECO_MATRIX[key];
        break;
      }
    }

    const metrics = match || { water: 2000, co2: 15, pts: 100 };
    carbonSaved += metrics.co2;
    waterSaved += metrics.water;
  });

  const productsCount = products.length;
  const itemsRecycled = productsCount + completedRentalsCount;

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-8 px-4 sm:px-8 text-stone-800 antialiased">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50/90 px-3 py-0.5 rounded-full border border-emerald-200/60 font-ui">
              BỀN VỮNG & SINH THÁI
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-normal text-[#183A2D] mt-2">
            Thống Kê Sinh Thái ESG
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1.5 font-body">
            Dấu chân sinh thái tích cực của bạn khi chia sẻ và tái sử dụng thời trang tuần hoàn.
          </p>
        </div>
        
        <EcoClient 
          carbonSaved={carbonSaved} 
          waterSaved={waterSaved} 
          itemsRecycled={itemsRecycled}
          productsCount={productsCount}
          completedRentalsCount={completedRentalsCount}
        />
      </div>
    </div>
  );
}
