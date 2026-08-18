import React from "react";
import Link from "next/link";
import { Plus, Leaf, Droplet, Sprout } from "lucide-react";
import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { DashboardCharts } from "./DashboardCharts";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";

export default async function MyClosetOverviewPage() {
  let userAuth;
  try {
    userAuth = await requireUser();
  } catch (error) {
    // Bắt lỗi an toàn, thực hiện redirect bên ngoài catch block
  }

  if (!userAuth) {
    redirect("/login");
  }

  const userId = userAuth.id;

  // 1. Fetch User Coins
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cloopCoins: true }
  });
  const cloopCoins = user?.cloopLeaves || 0;

  // 2. Fetch all products to calculate Eco Stats using DB Matrix
  const products = await prisma.product.findMany({
    where: { userId },
    select: { category: true, material: true }
  });

  // Fetch EcoMetrics from Database with Cache (Lá bùa 1: Chống bóp nghẹt DB)
  const getCachedEcoMetrics = unstable_cache(
    async () => {
      return await prisma.ecoMetric.findMany();
    },
    ['eco-metrics'],
    { revalidate: 86400 } // 24 hours TTL
  );
  
  const dbMetrics = await getCachedEcoMetrics();
  
  // Convert array to Dictionary for fast lookup
  const ECO_MATRIX: Record<string, { water: number; co2: number; pts: number }> = {};
  dbMetrics.forEach(m => {
    // Lưu trữ từ khóa chuẩn (lowercase, trim)
    ECO_MATRIX[m.keyword.toLowerCase().trim()] = { water: m.waterFactor, co2: m.co2Factor, pts: m.greenPts };
  });

  let co2Saved = 0;
  let waterSaved = 0;
  let greenPoints = 0;

  products.forEach((product) => {
    // Lá bùa 2: Chuẩn hóa chuỗi dữ liệu đầu vào (trim & lowercase)
    const cat = (product.category || "").toLowerCase().trim();
    const mat = (product.material || "").toLowerCase().trim();
    
    // Look for a match in the matrix
    let match = null;
    for (const key of Object.keys(ECO_MATRIX)) {
      if (cat.includes(key) || mat.includes(key)) {
        match = ECO_MATRIX[key];
        break;
      }
    }

    // Fallback baseline if no match
    const metrics = match || { water: 2000, co2: 15, pts: 100 };

    co2Saved += metrics.co2;
    waterSaved += metrics.water;
    greenPoints += metrics.pts;
  });

  const ecoStats = { co2Saved, waterSaved, greenPoints };

  // Tự động tính tổng sản phẩm cho các thống kê khác
  const totalProducts = products.length;

  // 3. Prisma Aggregation cho Pie Chart (Phân bổ danh mục)
  // 🔒 Bảo mật IDOR: where: { userId } đảm bảo chỉ tính tài sản của chính user này
  const categoryGroups = await prisma.product.groupBy({
    by: ['category'],
    where: { userId },
    _count: {
      id: true
    }
  });

  const categoryData = categoryGroups.length > 0 ? categoryGroups.map(g => ({
    name: g.category,
    value: g._count.id
  })) : [
    { name: 'Chưa có dữ liệu', value: 1 }
  ];

  // 4. Prisma Fetch Thống kê doanh thu (Rent & Sale)
  // 🔒 Bảo mật IDOR: where: { product: { userId } }
  // Khởi tạo mảng 7 ngày gần nhất (từ hôm nay lùi về 6 ngày trước)
  const today = new Date();
  const past7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0); // Đặt về đầu ngày để so sánh dễ dàng
    return {
      dateObj: d,
      name: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`,
      rent: 0,
      sell: 0
    };
  });
  
  const sevenDaysAgo = past7Days[0].dateObj;

  const completedRentals = await prisma.rentalHistory.findMany({
    where: {
      product: { userId },
      status: "LENDER_COMPLETED",
      updatedAt: { gte: sevenDaysAgo }
    },
    include: { 
      product: {
        include: {
          listings: {
            where: { listingType: "RENT" },
            take: 1
          }
        }
      }
    }
  });

  const soldItems = await prisma.listing.findMany({
    where: {
      product: { userId },
      status: "SOLD",
      listingType: { in: ["SELL", "RECYCLE"] },
      updatedAt: { gte: sevenDaysAgo }
    }
  });

  // Gom nhóm dữ liệu doanh thu
  completedRentals.forEach(rental => {
    const rentalDate = new Date(rental.updatedAt);
    rentalDate.setHours(0, 0, 0, 0);
    
    // Tìm ngày tương ứng trong mảng past7Days
    const dayData = past7Days.find(d => d.dateObj.getTime() === rentalDate.getTime());
    if (dayData) {
      // Tính doanh thu: basePrice * số ngày thuê
      const basePrice = rental.product.listings[0]?.basePrice || 0;
      const days = Math.ceil((new Date(rental.end_date).getTime() - new Date(rental.start_date).getTime()) / (1000 * 60 * 60 * 24));
      const rentalDays = days > 0 ? days : 1;
      dayData.rent += basePrice * rentalDays;
    }
  });

  soldItems.forEach(item => {
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
    <div className="min-h-screen bg-[#FAF9F5] py-10 px-4 sm:px-8 text-stone-800 antialiased">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end border-b border-stone-200/60 pb-6 gap-4">
          <div className="text-left space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-[#183A2D]">Tổng quan CLOOP Dashboard</h1>
            <p className="text-stone-400 text-xs font-medium tracking-wide">Quản lý hiệu suất, chỉ số sinh thái và doanh thu thực tế.</p>
          </div>
        </div>

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
            {/* Shimmer effect inside the card */}
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