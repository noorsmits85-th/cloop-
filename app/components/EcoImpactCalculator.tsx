"use client";

import React from "react";
import { Leaf, Droplet, DollarSign, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function EcoImpactCalculator() {
  return (
    <div className="w-full bg-[#183A2D] text-white rounded-3xl p-8 sm:p-12 md:p-14 border border-emerald-700/40 shadow-xl relative overflow-hidden font-ui">
      
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-300/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
        
        {/* Header */}
        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-[#A3E39F] text-[10.5px] font-bold uppercase tracking-widest">
            <Leaf size={12} className="text-[#A3E39F]" /> Tác Động Sinh Thái & Tài Chính
          </span>
          
          <h3 className="font-heading text-2xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight">
            Mỗi Lần Thuê Là Một Lần Giảm Mua Mới
          </h3>
          
          <p className="text-stone-200 text-xs sm:text-sm md:text-base font-light leading-relaxed max-w-xl mx-auto font-body">
            Bạn không cần mua sắm ít đi để sống xanh — chỉ cần chọn cách thông minh hơn: Thuê lại, chia sẻ và kéo dài vòng đời của từng thước vải.
          </p>
        </div>

        {/* 3 Core Highlight Numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-2">
          
          {/* Metric 1 */}
          <div className="bg-black/25 backdrop-blur-md border border-white/15 p-6 rounded-2xl flex flex-col items-center justify-center space-y-2 hover:border-[#F3D58C]/50 transition-all">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-[#F3D58C] flex items-center justify-center border border-white/10 mb-1">
              <DollarSign size={20} />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#F3D58C] font-mono tracking-tight">
              ~8.000.000đ
            </div>
            <p className="text-xs text-stone-300 font-medium">Tiết kiệm chi phí mua sắm / năm</p>
          </div>

          {/* Metric 2 */}
          <div className="bg-black/25 backdrop-blur-md border border-white/15 p-6 rounded-2xl flex flex-col items-center justify-center space-y-2 hover:border-[#A3E39F]/50 transition-all">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-[#A3E39F] flex items-center justify-center border border-white/10 mb-1">
              <Leaf size={20} />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#A3E39F] font-mono tracking-tight">
              -196 kg CO₂
            </div>
            <p className="text-xs text-stone-300 font-medium">Giảm phát thải khí nhà kính</p>
          </div>

          {/* Metric 3 */}
          <div className="bg-black/25 backdrop-blur-md border border-white/15 p-6 rounded-2xl flex flex-col items-center justify-center space-y-2 hover:border-[#8CD4F3]/50 transition-all">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-[#8CD4F3] flex items-center justify-center border border-white/10 mb-1">
              <Droplet size={20} />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#8CD4F3] font-mono tracking-tight">
              21.600 Lít
            </div>
            <p className="text-xs text-stone-300 font-medium">Nước sạch bảo tồn cho tự nhiên</p>
          </div>

        </div>

        {/* 1 Single Clear Primary CTA */}
        <div className="pt-2 flex justify-center">
          <Link
            href="/shop?type=rent"
            className="px-8 py-4 bg-white hover:bg-[#FAF7F0] text-[#0A2517] font-heading font-extrabold rounded-full text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 shadow-[0_6px_25px_rgba(255,255,255,0.25)] hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <span>Bắt Đầu Thuê Đồ Ngay</span>
            <ArrowRight size={15} />
          </Link>
        </div>

      </div>
    </div>
  );
}
