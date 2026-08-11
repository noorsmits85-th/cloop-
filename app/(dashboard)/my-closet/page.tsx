import React from "react";
import Link from "next/link";
import { Plus, Leaf, Droplet, Sparkles } from "lucide-react";
import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { DashboardCharts } from "./DashboardCharts";
import { redirect } from "next/navigation";

export default async function MyClosetOverviewPage() {
  let userAuth;
  try {
    userAuth = await requireUser();
  } catch (error) {
    redirect("/login");
  }

  const userId = userAuth.id;

  // 1. Fetch User Coins
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cloopCoins: true }
  });
  const cloopCoins = user?.cloopCoins || 0;

  // 2. Tự động tính Eco Stats qua Prisma Count
  const totalProducts = await prisma.product.count({
    where: { userId }
  });

  const ecoStats = {
    co2Saved: totalProducts * 25,
    waterSaved: totalProducts * 1500,
    greenPoints: totalProducts * 100
  };

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
  const completedRentals = await prisma.rentalHistory.findMany({
    where: {
      product: { userId },
      status: "completed"
    },
    include: { invoice: true }
  });

  const soldItems = await prisma.listing.findMany({
    where: {
      product: { userId },
      status: "SOLD",
      listingType: { in: ["SELL", "RECYCLE"] } // Thay PASS bằng RECYCLE theo đúng schema
    }
  });

  // (Ví dụ) Map dữ liệu thực tế vào mảng thứ ngày tháng - Chạy cực nhanh trên Server Node.js
  const revenueData = [
    { name: 'T2', rent: 4000, sell: 2400 },
    { name: 'T3', rent: 3000, sell: 1398 },
    { name: 'T4', rent: 2000, sell: 9800 },
    { name: 'T5', rent: 2780, sell: 3908 },
    { name: 'T6', rent: 1890, sell: 4800 },
    { name: 'T7', rent: 2390, sell: 3800 },
    { name: 'CN', rent: 3490, sell: 4300 },
  ];
  //TODO: Tự động cộng dồn theo ngày của completedRentals và soldItems

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-10 px-4 sm:px-8 text-stone-800 antialiased">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end border-b border-stone-200/60 pb-6 gap-4">
          <div className="text-left space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-[#183A2D]">Tổng quan CLOOP Dashboard</h1>
            <p className="text-stone-400 text-xs font-medium tracking-wide">Quản lý hiệu suất, chỉ số sinh thái và doanh thu thực tế.</p>
          </div>
          <Link href="/my-closet/create" className="inline-flex items-center gap-1.5 bg-[#183A2D] hover:bg-[#224430] text-white text-xs font-medium px-4 py-2.5 rounded-xl transition-all shadow-sm shrink-0">
            <Plus size={14} /> Thêm đồ mới
          </Link>
        </div>

        {/* GREEN IMPACT ESG DASHBOARD & COIN BALANCE */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <div className="bg-white border border-stone-200/50 p-5 rounded-2xl shadow-sm flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-100 shrink-0">
              <Leaf size={18} />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Giảm CO₂ tích lũy</div>
              <div className="text-2xl font-mono font-black text-stone-900">{ecoStats.co2Saved.toLocaleString()} kg</div>
              <p className="text-[11px] text-emerald-700 font-medium">Bảo vệ bầu không khí sạch</p>
            </div>
          </div>

          <div className="bg-white border border-stone-200/50 p-5 rounded-2xl shadow-sm flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-800 flex items-center justify-center border border-blue-100 shrink-0">
              <Droplet size={18} />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tiết kiệm nước</div>
              <div className="text-2xl font-mono font-black text-stone-900">{ecoStats.waterSaved.toLocaleString()} Lít</div>
              <p className="text-[11px] text-blue-700 font-medium">Tối ưu tài nguyên bản địa</p>
            </div>
          </div>

          <div className="bg-white border border-stone-200/50 p-5 rounded-2xl shadow-sm flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-100 shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Điểm Green Pts</div>
              <div className="text-2xl font-mono font-black text-[#183A2D]">{ecoStats.greenPoints.toLocaleString()} Pts</div>
              <p className="text-[11px] text-amber-700 font-medium">Định danh người dùng xanh</p>
            </div>
          </div>

          <div className="bg-white border border-stone-200/50 p-5 rounded-2xl shadow-sm flex items-center gap-4 text-left relative overflow-hidden group cursor-pointer hover:border-[#183A2D]/30 transition-colors">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
              <img src="/images/cloop-coin-tilt.png" alt="Coin bg" className="w-full h-full object-contain mix-blend-multiply" />
            </div>
            <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center border border-stone-100 shrink-0 p-1.5 relative z-10">
              <img src="/images/cloop-coin-front.png" alt="Lá CLOOP" className="w-full h-full object-contain drop-shadow-sm mix-blend-multiply" />
            </div>
            <div className="space-y-0.5 relative z-10">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tài khoản Lá CLOOP</div>
              <div className="text-2xl font-mono font-black text-[#183A2D]">{cloopCoins.toLocaleString()} <span className="text-xs font-bold">Lá</span></div>
              <p className="text-[11px] text-[#183A2D] font-medium">Sẵn sàng quảng cáo tủ đồ</p>
            </div>
          </div>
        </div>

        <DashboardCharts revenueData={revenueData} categoryData={categoryData} totalProducts={totalProducts} />
      </div>
    </div>
  );
}