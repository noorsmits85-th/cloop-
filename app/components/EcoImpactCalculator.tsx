"use client";

import React, { useState } from "react";
import { Leaf, Droplet, Trees, ArrowRight, DollarSign } from "lucide-react";
import Link from "next/link";

export default function EcoImpactCalculator() {
  const [rentCount, setRentCount] = useState<number>(4);
  const [shareCount, setShareCount] = useState<number>(2);

  // Financial calculations
  const moneySaved = rentCount * 1550000;
  const moneyEarned = shareCount * 900000;
  const totalBenefit = moneySaved + moneyEarned;

  // Environmental metric factors (LCA benchmarks):
  const co2Saved = (rentCount + shareCount * 2) * 24.5;
  const waterSaved = (rentCount + shareCount * 2) * 2700;
  const treesEquivalent = Math.max(1, Math.round(co2Saved / 22));

  return (
    <div className="w-full bg-[#37503F] text-white rounded-2xl p-7 sm:p-10 md:p-12 border border-[#4D6E57] shadow-xl relative overflow-hidden font-ui">
      
      {/* Ambient glowing atmosphere */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#A3E39F]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#32613F]/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row gap-8 lg:gap-12 items-center justify-between">
        
        {/* Left Side: Controls & Philosophy */}
        <div className="w-full lg:w-1/2 space-y-5">
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[#A3E39F] text-[10.5px] font-bold uppercase tracking-widest">
              MÔ PHỎNG TÁC ĐỘNG TUẦN HOÀN
            </span>
            <h3 className="font-heading text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight">
              Mỗi Lần Thuê Đồ Là Một <br className="hidden sm:inline" />
              <span className="text-[#A3E39F]">Hành Động Vì Trái Đất</span>
            </h3>
            <p className="text-stone-200 text-xs sm:text-sm font-light leading-relaxed max-w-lg">
              Bạn không cần mua sắm ít đi để sống xanh — chỉ cần chọn cách thông minh hơn: Chia sẻ, thuê lại và kéo dài vòng đời của từng thước vải.
            </p>
          </div>

          {/* Interactive Sliders */}
          <div className="space-y-5 bg-black/25 p-5 rounded-xl border border-white/10 backdrop-blur-xs">
            {/* Slider 1: Outfits Rented per Year */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-stone-200 font-medium">Số dịp đi tiệc / sự kiện cần đồ trong năm:</span>
                <span className="font-bold text-[#A3E39F] text-base">{rentCount} lần</span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                value={rentCount}
                onChange={(e) => setRentCount(Number(e.target.value))}
                className="w-full h-2 bg-black/40 rounded-md appearance-none cursor-pointer accent-[#A3E39F]"
              />
              <div className="flex justify-between text-[10px] text-stone-300 font-mono">
                <span>1 lần</span>
                <span>8 lần</span>
                <span>15+ lần</span>
              </div>
            </div>

            {/* Slider 2: Closet Items Shared */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-stone-200 font-medium">Số món đồ ít mặc có thể chia sẻ lên CLOOP:</span>
                <span className="font-bold text-[#F3D58C] text-base">{shareCount} món</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={shareCount}
                onChange={(e) => setShareCount(Number(e.target.value))}
                className="w-full h-2 bg-black/40 rounded-md appearance-none cursor-pointer accent-[#F3D58C]"
              />
              <div className="flex justify-between text-[10px] text-stone-300 font-mono">
                <span>0 món</span>
                <span>5 món</span>
                <span>10+ món</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Impact Live Output Cards */}
        <div className="w-full lg:w-1/2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Card 1: Money Benefit */}
            <div className="bg-black/25 border border-white/15 p-4 sm:p-5 rounded-xl flex flex-col justify-between hover:border-[#F3D58C]/60 transition-all shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-stone-300 font-medium uppercase tracking-wider">Lợi ích tài chính ước tính</span>
                <div className="w-7 h-7 rounded-md bg-white/10 text-[#F3D58C] flex items-center justify-center border border-white/10">
                  <DollarSign size={15} />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#F3D58C] font-mono tracking-tight">
                  ~{totalBenefit.toLocaleString("vi-VN")}đ
                </div>
                <p className="text-[10.5px] text-stone-300 mt-1">Tiết kiệm mua mới + Thu nhập thụ động</p>
              </div>
            </div>

            {/* Card 2: Carbon Footprint */}
            <div className="bg-black/25 border border-white/15 p-4 sm:p-5 rounded-xl flex flex-col justify-between hover:border-[#A3E39F]/60 transition-all shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-stone-300 font-medium uppercase tracking-wider">Giảm phát thải CO₂</span>
                <div className="w-7 h-7 rounded-md bg-white/10 text-[#A3E39F] flex items-center justify-center border border-white/10">
                  <Leaf size={15} />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#A3E39F] font-mono tracking-tight">
                  {co2Saved.toFixed(0)} kg
                </div>
                <p className="text-[10.5px] text-stone-300 mt-1">Tránh khai thác & sản xuất thô mới</p>
              </div>
            </div>

            {/* Card 3: Clean Water */}
            <div className="bg-black/25 border border-white/15 p-4 sm:p-5 rounded-xl flex flex-col justify-between hover:border-[#8CD4F3]/60 transition-all shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-stone-300 font-medium uppercase tracking-wider">Nước sạch bảo tồn</span>
                <div className="w-7 h-7 rounded-md bg-white/10 text-[#8CD4F3] flex items-center justify-center border border-white/10">
                  <Droplet size={15} />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#8CD4F3] font-mono tracking-tight">
                  {waterSaved.toLocaleString("vi-VN")} L
                </div>
                <p className="text-[10.5px] text-stone-300 mt-1">Tương đương nước sinh hoạt 3 tháng</p>
              </div>
            </div>

            {/* Card 4: Trees Equivalent */}
            <div className="bg-black/25 border border-white/15 p-4 sm:p-5 rounded-xl flex flex-col justify-between hover:border-[#A3E39F]/60 transition-all shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-stone-300 font-medium uppercase tracking-wider">Tương đương trồng cây</span>
                <div className="w-7 h-7 rounded-md bg-white/10 text-[#A3E39F] flex items-center justify-center border border-white/10">
                  <Trees size={15} />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#A3E39F] font-mono tracking-tight">
                  {treesEquivalent} Cây xanh
                </div>
                <p className="text-[10.5px] text-stone-300 mt-1">Hấp thụ carbon tự nhiên trọn vẹn 1 năm</p>
              </div>
            </div>

          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/shop"
              className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-[#A3E39F] text-[#1E3A25] hover:text-black font-extrabold rounded-lg text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shrink-0 font-ui"
            >
              Bắt Đầu Thuê Xanh Ngay <ArrowRight size={13} />
            </Link>
            <Link
              href="/my-closet/items"
              className="w-full sm:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-white/30 shrink-0 font-ui"
            >
              Đăng Tủ Đồ Nhận Thu Nhập
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
