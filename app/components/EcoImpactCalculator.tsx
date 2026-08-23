"use client";

import React, { useState } from "react";
import { Leaf, Droplet, Trees, Sparkles, ArrowRight, DollarSign } from "lucide-react";
import Link from "next/link";

export default function EcoImpactCalculator() {
  const [rentCount, setRentCount] = useState<number>(4);
  const [shareCount, setShareCount] = useState<number>(2);

  // Calculations
  // Average retail purchase price of an event outfit = 1,800,000 VND
  // Average rental cost = 250,000 VND
  // Financial savings per rented outfit = 1,550,000 VND
  // Earning per shared closet item = 300,000 VND * 3 rentals/year = 900,000 VND
  const moneySaved = rentCount * 1550000;
  const moneyEarned = shareCount * 900000;
  const totalBenefit = moneySaved + moneyEarned;

  // Environmental metric factors (LCA industry benchmarks):
  // 1 outfit reused/rented = ~24.5 kg CO2 avoided + 2,700 L clean water preserved
  const co2Saved = (rentCount + shareCount * 2) * 24.5;
  const waterSaved = (rentCount + shareCount * 2) * 2700;
  const treesEquivalent = Math.max(1, Math.round(co2Saved / 22));

  return (
    <div className="w-full bg-[#0A2517] text-white rounded-3xl p-6 sm:p-10 md:p-14 border border-emerald-800/40 shadow-2xl relative overflow-hidden font-ui">
      {/* Subtle organic light accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row gap-10 lg:gap-14 items-center justify-between">
        
        {/* Left Side: Controls & Philosophy */}
        <div className="w-full lg:w-1/2 space-y-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/60 border border-emerald-700/40 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Mô Phỏng Tác Động Tuần Hoàn
            </span>
            <h3 className="font-heading text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight">
              Mỗi Lần Thuê Đồ Là Một <br className="hidden sm:inline" />
              <span className="text-emerald-400">Hành Động Vì Trái Đất</span>
            </h3>
            <p className="text-stone-300 text-xs sm:text-sm font-light leading-relaxed">
              Bạn không cần mua sắm ít đi để sống xanh — chỉ cần chọn cách thông minh hơn: Chia sẻ, thuê lại và kéo dài vòng đời của từng thước vải.
            </p>
          </div>

          {/* Interactive Sliders */}
          <div className="space-y-6 bg-black/25 p-5 sm:p-6 rounded-2xl border border-emerald-900/40 backdrop-blur-xs">
            {/* Slider 1: Outfits Rented per Year */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-stone-300 font-medium">Số dịp đi tiệc / sự kiện bạn cần đồ trong năm:</span>
                <span className="font-bold text-emerald-300 text-base">{rentCount} lần</span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                value={rentCount}
                onChange={(e) => setRentCount(Number(e.target.value))}
                className="w-full h-2 bg-emerald-950 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                <span>1 lần</span>
                <span>8 lần</span>
                <span>15+ lần</span>
              </div>
            </div>

            {/* Slider 2: Closet Items Shared */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-stone-300 font-medium">Số món đồ ít mặc bạn có thể chia sẻ lên CLOOP:</span>
                <span className="font-bold text-amber-300 text-base">{shareCount} món</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={shareCount}
                onChange={(e) => setShareCount(Number(e.target.value))}
                className="w-full h-2 bg-emerald-950 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                <span>0 món</span>
                <span>5 món</span>
                <span>10+ món</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Impact Live Output Cards */}
        <div className="w-full lg:w-1/2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Card 1: Money Benefit */}
            <div className="bg-emerald-950/70 border border-emerald-700/50 p-5 rounded-2xl flex flex-col justify-between group hover:border-emerald-400 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-stone-300 font-medium">Lợi ích tài chính ước tính</span>
                <div className="w-8 h-8 rounded-full bg-emerald-900/80 flex items-center justify-center text-emerald-300">
                  <DollarSign size={16} />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-300 font-mono tracking-tight">
                  ~{totalBenefit.toLocaleString("vi-VN")}đ
                </div>
                <p className="text-[11px] text-stone-400 mt-1">Tiết kiệm mua sắm + Thu nhập thụ động từ tủ đồ</p>
              </div>
            </div>

            {/* Card 2: Carbon Footprint */}
            <div className="bg-emerald-950/70 border border-emerald-700/50 p-5 rounded-2xl flex flex-col justify-between group hover:border-emerald-400 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-stone-300 font-medium">Giảm phát thải CO₂</span>
                <div className="w-8 h-8 rounded-full bg-emerald-900/80 flex items-center justify-center text-emerald-400">
                  <Leaf size={16} />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                  {co2Saved.toFixed(0)} kg
                </div>
                <p className="text-[11px] text-stone-400 mt-1">Tránh khai thác & sản xuất dệt may thô mới</p>
              </div>
            </div>

            {/* Card 3: Clean Water */}
            <div className="bg-emerald-950/70 border border-emerald-700/50 p-5 rounded-2xl flex flex-col justify-between group hover:border-emerald-400 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-stone-300 font-medium">Nước sạch bảo tồn</span>
                <div className="w-8 h-8 rounded-full bg-blue-950/80 flex items-center justify-center text-blue-400">
                  <Droplet size={16} />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-blue-200 font-mono tracking-tight">
                  {waterSaved.toLocaleString("vi-VN")} L
                </div>
                <p className="text-[11px] text-stone-400 mt-1">Tương đương nước sinh hoạt trong 3 tháng</p>
              </div>
            </div>

            {/* Card 4: Trees Equivalent */}
            <div className="bg-emerald-950/70 border border-emerald-700/50 p-5 rounded-2xl flex flex-col justify-between group hover:border-emerald-400 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-stone-300 font-medium">Tương đương trồng cây</span>
                <div className="w-8 h-8 rounded-full bg-emerald-900/80 flex items-center justify-center text-emerald-400">
                  <Trees size={16} />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-300 font-mono tracking-tight">
                  {treesEquivalent} Cây xanh
                </div>
                <p className="text-[11px] text-stone-400 mt-1">Hấp thụ carbon tự nhiên trọn vẹn 1 năm</p>
              </div>
            </div>

          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/shop"
              className="w-full sm:w-auto px-6 py-3 bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 shrink-0"
            >
              Bắt Đầu Thuê Xanh Ngay <ArrowRight size={14} />
            </Link>
            <Link
              href="/my-closet/items"
              className="w-full sm:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-white/20 shrink-0"
            >
              Đăng Tủ Đồ Nhận Thu Nhập
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
