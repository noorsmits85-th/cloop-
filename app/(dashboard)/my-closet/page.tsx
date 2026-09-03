import React from "react";
import Link from "next/link";
import { Plus, Leaf, Droplet, Sprout } from "lucide-react";
import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { supabase } from "@/lib/supabase";
import { DashboardCharts } from "./DashboardCharts";
import { SmartSellerOnboardingCard } from "./_components/SmartSellerOnboardingCard";
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

export default async function MyClosetOverviewPage() {
  let userAuth;
  try {
    userAuth = await requireUser();
  } catch (error) {
    // Không tìm thấy session SSR
  }

  if (!userAuth) {
    redirect("/login");
  }

  const userId = userAuth.id;

  const today = new Date();
  const past7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return {
      dateObj: d,
      name: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`,
      rent: 0,
      sell: 0
    };
  });
  const sevenDaysAgo = past7Days[0].dateObj;

  // ⚡ TỐI ƯU SIÊU TỐC: Gom toàn bộ 7 truy vấn Dashboard chạy song song cùng lúc (Parallel Fetching)
  const [
    user,
    products,
    dbMetrics,
    categoryGroups,
    profileRes,
    completedRentals,
    soldItems
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { cloopCoins: true }
    }),
    prisma.product.findMany({
      where: { userId },
      select: { category: true, material: true }
    }),
    getCachedEcoMetrics(),
    prisma.product.groupBy({
      by: ['category'],
      where: { userId },
      _count: { id: true }
    }),
    supabase
      .from("profiles")
      .select("id, pickup_address, phone, bank_name, bank_account, bank_owner")
      .eq("id", userId)
      .maybeSingle(),
    prisma.rentalHistory.findMany({
      where: {
        product: { userId },
        status: "LENDER_COMPLETED",
        updatedAt: { gte: sevenDaysAgo }
      },
      select: {
        updatedAt: true,
        start_date: true,
        end_date: true,
        invoice: {
          select: {
            rentalFee: true,
            platformFee: true,
            amount: true
          }
        },
        product: {
          select: {
            listings: {
              where: { listingType: "RENT" },
              select: { basePrice: true },
              take: 1
            }
          }
        }
      }
    }),
    prisma.listing.findMany({
      where: {
        product: { userId },
        status: "SOLD",
        listingType: { in: ["SELL", "RECYCLE"] },
        updatedAt: { gte: sevenDaysAgo }
      },
      select: {
        basePrice: true,
        salePrice: true,
        updatedAt: true
      }
    })
  ]);

  const userProfile = profileRes?.data;
  const cloopCoins = user?.cloopCoins || 0;

  // Convert array to Dictionary for fast lookup
  const ECO_MATRIX: Record<string, { water: number; co2: number; pts: number }> = {};
  dbMetrics.forEach((m: any) => {
    ECO_MATRIX[m.keyword.toLowerCase().trim()] = { water: m.waterFactor, co2: m.co2Factor, pts: m.greenPts };
  });

  let co2Saved = 0;
  let waterSaved = 0;
  let greenPoints = 0;

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
    co2Saved += metrics.co2;
    waterSaved += metrics.water;
    greenPoints += metrics.pts;
  });

  const ecoStats = { co2Saved, waterSaved, greenPoints };
  const totalProducts = products.length;

  const categoryData = categoryGroups.length > 0 ? categoryGroups.map((g: any) => ({
    name: g.category,
    value: g._count.id
  })) : [
    { name: 'Chưa có dữ liệu', value: 1 }
  ];

  // Gom nhóm dữ liệu doanh thu
  completedRentals.forEach((rental: any) => {
    const rentalDate = new Date(rental.updatedAt);
    rentalDate.setHours(0, 0, 0, 0);
    
    const dayData = past7Days.find(d => d.dateObj.getTime() === rentalDate.getTime());
    if (dayData) {
      const invoiceEarnings = rental.invoice?.rentalFee 
        ? Math.max(0, rental.invoice.rentalFee - (rental.invoice.platformFee || 0)) 
        : 0;
      
      if (invoiceEarnings > 0) {
        dayData.rent += invoiceEarnings;
      } else {
        const basePrice = rental.product.listings?.[0]?.basePrice || 0;
        const diffDays = rental.start_date && rental.end_date
          ? Math.ceil((new Date(rental.end_date).getTime() - new Date(rental.start_date).getTime()) / (1000 * 60 * 60 * 24))
          : 1;
        const rentalDays = Math.max(1, isNaN(diffDays) ? 1 : diffDays);
        dayData.rent += basePrice * rentalDays;
      }
    }
  });

  soldItems.forEach((item: any) => {
    const soldDate = new Date(item.updatedAt);
    soldDate.setHours(0, 0, 0, 0);
    
    const dayData = past7Days.find(d => d.dateObj.getTime() === soldDate.getTime());
    if (dayData) {
      dayData.sell += item.salePrice || item.basePrice || 0;
    }
  });

  // Format lại array chỉ lấy những thuộc tính cần thiết cho biểu đồ
  const revenueData = past7Days.map(d => ({
    name: d.name,
    rent: d.rent,
    sell: d.sell
  }));

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-8 px-4 sm:px-8 text-stone-800 antialiased">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50/90 px-3 py-0.5 rounded-full border border-emerald-200/60 font-ui">
              TRUNG TÂM ĐIỀU HÀNH
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-normal text-[#183A2D] mt-2">
            Tổng Quan CLOOP
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1.5 font-body">
            Quản lý hiệu suất kinh doanh, chỉ số sinh thái ESG và doanh thu thực tế.
          </p>
        </div>

        {/* 📦 BƯỚC THIẾT LẬP DÀNH CHO CHỦ SHOP / CHỦ TỦ ĐỒ (ĐỊA CHỈ LẤY HÀNG + STK NGÂN HÀNG) */}
        <SmartSellerOnboardingCard userProfile={userProfile} />

        {/* GREEN IMPACT ESG DASHBOARD & COIN BALANCE */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {/* Card: Giảm CO2 */}
          <div className="group bg-white border border-stone-200/50 p-5 rounded-2xl shadow-sm flex items-center gap-4 text-left hover:border-emerald-200 transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-100 shrink-0 group-hover:-rotate-12 group-hover:scale-110 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
              <Leaf size={18} />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Giảm CO₂ tích lũy</div>
              <div className="text-2xl font-mono font-black text-stone-900">{ecoStats.co2Saved.toLocaleString()} kg</div>
              <p className="text-[11px] text-gray-500 font-medium">Bảo vệ bầu không khí sạch</p>
            </div>
          </div>

          {/* Card: Tiết kiệm nước */}
          <div className="group bg-white border border-stone-200/50 p-5 rounded-2xl shadow-sm flex items-center gap-4 text-left hover:border-blue-200 transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-800 flex items-center justify-center border border-blue-100 shrink-0 group-hover:translate-y-1 group-hover:scale-110 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
              <Droplet size={18} />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tiết kiệm nước</div>
              <div className="text-2xl font-mono font-black text-stone-900">{ecoStats.waterSaved.toLocaleString()} Lít</div>
              <p className="text-[11px] text-gray-500 font-medium">Tối ưu tài nguyên bản địa</p>
            </div>
          </div>

          {/* Card: Điểm Green Pts */}
          <div className="group bg-white border border-stone-200/50 p-5 rounded-2xl shadow-sm flex items-center gap-4 text-left hover:border-emerald-200 transition-colors cursor-pointer relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-[shimmer_1.5s_infinite] skew-x-[-20deg] z-10 pointer-events-none" />
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
              <Sprout size={18} />
            </div>
            <div className="space-y-0.5 relative z-20">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Điểm Green Pts</div>
              <div className="text-2xl font-mono font-black text-[#183A2D]">{ecoStats.greenPoints.toLocaleString()} Pts</div>
              <p className="text-[11px] text-gray-500 font-medium">Định danh người dùng xanh</p>
            </div>
          </div>

          {/* Card: Lá CLOOP */}
          <div className="bg-white border border-stone-200/50 p-5 rounded-2xl shadow-sm flex items-center gap-4 text-left relative overflow-hidden group cursor-pointer hover:border-[#183A2D]/30 transition-colors">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
              <img src="/images/cloop-coin-tilt.png" alt="Coin bg" className="w-full h-full object-contain mix-blend-multiply" />
            </div>
            <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center border border-stone-100 shrink-0 p-1.5 relative z-10 group-hover:scale-110 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
              <img src="/images/cloop-coin-front.png" alt="Lá CLOOP" className="w-full h-full object-contain drop-shadow-sm mix-blend-multiply" />
            </div>
            <div className="space-y-0.5 relative z-10">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tài khoản Lá CLOOP</div>
              <div className="text-2xl font-mono font-black text-[#183A2D]">{cloopCoins.toLocaleString()} <span className="text-xs font-bold">Lá</span></div>
              <p className="text-[11px] text-gray-500 font-medium">Sẵn sàng quảng cáo tủ đồ</p>
            </div>
          </div>
        </div>

        <DashboardCharts revenueData={revenueData} categoryData={categoryData} totalProducts={totalProducts} />
      </div>
    </div>
  );
}
