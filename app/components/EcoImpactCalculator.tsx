"use client";

import React, { useState } from "react";
import { Leaf, Droplet, Trees, Sparkles, ArrowRight, DollarSign } from "lucide-react";
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
    <div className="w-full bg-[#F3F7F1] text-stone-800 rounded-xl p-6 sm:p-8 md:p-10 border border-[#D5E4D1] shadow-xs relative overflow-hidden font-ui">
      
      {/* Subtle organic matcha light accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4E7D0]/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#E3EFE0]/60 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row gap-8 lg:gap-12 items-center justify-between">
        
        {/* Left Side: Controls & Philosophy */}
        <div className="w-full lg:w-1/2 space-y-5">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-md bg-[#E1EDE0] border border-[#BED7BC] text-[#234227] text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#3F6B44]" /> Mô Phỏng Tác Động Tuần Hoàn
            </span>
            <h3 className="font-heading text-xl sm:text-2xl md:text-3xl font-extrabold text-[#1F3923] leading-tight">
              Mỗi Lần Thuê Đồ Là Một <br className="hidden sm:inline" />
              <span className="text-[#3F6B44]">Hành Động Vì Trái Đất</span>
            </h3>
            <p className="text-[#4E6150] text-xs sm:text-sm font-light leading-relaxed">
              Bạn không cần mua sắm ít đi để sống xanh — chỉ cần chọn cách thông minh hơn: Chia sẻ, thuê lại và kéo dài vòng đời của từng thước vải.
            </p>
          </div>

          {/* Interactive Sliders */}
          <div className="space-y-5 bg-white/90 p-4 sm:p-5 rounded-lg border border-[#DCE8D8] shadow-2xs">
            {/* Slider 1: Outfits Rented per Year */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-[#324935] font-medium">Số dịp đi tiệc / sự kiện cần đồ trong năm:</span>
                <span className="font-bold text-[#234227] text-sm sm:text-base">{rentCount} lần</span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                value={rentCount}
                onChange={(e) => setRentCount(Number(e.target.value))}
                className="w-full h-1.5 bg-[#E2EBE0] rounded-md appearance-none cursor-pointer accent-[#3F6B44]"
              />
              <div className="flex justify-between text-[10px] text-[#718874] font-mono">
                <span>1 lần</span>
                <span>8 lần</span>
                <span>15+ lần</span>
              </div>
            </div>

            {/* Slider 2: Closet Items Shared */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-[#324935] font-medium">Số món đồ ít mặc có thể chia sẻ lên CLOOP:</span>
                <span className="font-bold text-[#876527] text-sm sm:text-base">{shareCount} món</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={shareCount}
                onChange={(e) => setShareCount(Number(e.target.value))}
                className="w-full h-1.5 bg-[#E2EBE0] rounded-md appearance-none cursor-pointer accent-[#876527]"
              />
              <div className="flex justify-between text-[10px] text-[#718874] font-mono">
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
            <div className="bg-white/95 border border-[#DCE8D8] p-4 rounded-lg flex flex-col justify-between group hover:border-[#7AA677] transition-all shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-[#586E5A] font-medium">Lợi ích tài chính ước tính</span>
                <div className="w-7 h-7 rounded-md bg-[#EBF3E8] text-[#2E5033] flex items-center justify-center border border-[#D1E2CD]">
                  <DollarSign size={14} />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#1F3923] font-mono tracking-tight">
                  ~{totalBenefit.toLocaleString("vi-VN")}đ
                </div>
                <p className="text-[10px] text-[#69806C] mt-0.5">Tiết kiệm mua mới + Thu nhập thụ động</p>
              </div>
            </div>

            {/* Card 2: Carbon Footprint */}
            <div className="bg-white/95 border border-[#DCE8D8] p-4 rounded-lg flex flex-col justify-between group hover:border-[#7AA677] transition-all shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-[#586E5A] font-medium">Giảm phát thải CO₂</span>
                <div className="w-7 h-7 rounded-md bg-[#EBF3E8] text-[#2E5033] flex items-center justify-center border border-[#D1E2CD]">
                  <Leaf size={14} />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#1F3923] font-mono tracking-tight">
                  {co2Saved.toFixed(0)} kg
                </div>
                <p className="text-[10px] text-[#69806C] mt-0.5">Tránh khai thác & sản xuất thô mới</p>
              </div>
            </div>

            {/* Card 3: Clean Water */}
            <div className="bg-white/95 border border-[#D4E3ED] p-4 rounded-lg flex flex-col justify-between group hover:border-[#6CA3C7] transition-all shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-[#586E5A] font-medium">Nước sạch bảo tồn</span>
                <div className="w-7 h-7 rounded-md bg-[#EBF4FA] text-[#245D85] flex items-center justify-center border border-[#C6DEED]">
                  <Droplet size={14} />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#1E4D6E] font-mono tracking-tight">
                  {waterSaved.toLocaleString("vi-VN")} L
                </div>
                <p className="text-[10px] text-[#69806C] mt-0.5">Tương đương nước sinh hoạt 3 tháng</p>
              </div>
            </div>

            {/* Card 4: Trees Equivalent */}
            <div className="bg-white/95 border border-[#DCE8D8] p-4 rounded-lg flex flex-col justify-between group hover:border-[#7AA677] transition-all shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-[#586E5A] font-medium">Tương đương trồng cây</span>
                <div className="w-7 h-7 rounded-md bg-[#EBF3E8] text-[#2E5033] flex items-center justify-center border border-[#D1E2CD]">
                  <Trees size={14} />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#1F3923] font-mono tracking-tight">
                  {treesEquivalent} Cây xanh
                </div>
                <p className="text-[10px] text-[#69806C] mt-0.5">Hấp thụ carbon tự nhiên trọn vẹn 1 năm</p>
              </div>
            </div>

          </div>

          <div className="pt-1 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/shop"
              className="w-full sm:w-auto px-5 py-2.5 bg-[#2B4C2F] hover:bg-[#203B23] text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs shrink-0 font-ui"
            >
              Bắt Đầu Thuê Xanh Ngay <ArrowRight size={13} />
            </Link>
            <Link
              href="/my-closet/items"
              className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-[#EBF2EA] text-[#234227] font-semibold rounded-lg text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-[#C5D8C3] shrink-0 font-ui"
            >
              Đăng Tủ Đồ Nhận Thu Nhập
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
