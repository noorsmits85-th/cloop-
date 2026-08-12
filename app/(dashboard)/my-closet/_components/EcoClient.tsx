"use client";

import React, { useRef } from "react";
import { Leaf, Droplet, Box, Share2, Award, Trophy, Medal } from "lucide-react";

export function EcoClient({ carbonSaved, waterSaved, itemsRecycled }: { carbonSaved: number, waterSaved: number, itemsRecycled: number }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleShare = () => {
    alert("Tính năng Share to Instagram/TikTok đang tải... (Mô phỏng: Render HTML to Canvas & Web Share API)");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ECO CARD */}
      <div 
        ref={cardRef}
        className="bg-gradient-to-br from-[#183A2D] to-[#1F4C3B] p-6 sm:p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden flex flex-col justify-between items-center sm:items-start text-center sm:text-left gap-6"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col gap-1 z-10 items-center sm:items-start w-full border-b border-white/10 pb-6">
          <span className="text-emerald-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <Leaf size={16} /> CLOOP ECO IMPACT
          </span>
          <h2 className="text-3xl font-bold mt-2">Dấu Chân Sinh Thái</h2>
          <p className="text-stone-300 text-sm mt-1">Cảm ơn bạn đã đồng hành cùng thời trang bền vững.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full z-10">
          <div className="flex flex-col items-center sm:items-start gap-2 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Leaf size={20} />
            </div>
            <span className="text-2xl font-mono font-bold">{carbonSaved.toLocaleString()} kg</span>
            <span className="text-xs text-stone-300 uppercase font-bold tracking-wider">CO2 Giảm Thải</span>
          </div>
          
          <div className="flex flex-col items-center sm:items-start gap-2 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Droplet size={20} />
            </div>
            <span className="text-2xl font-mono font-bold">{waterSaved.toLocaleString()} L</span>
            <span className="text-xs text-stone-300 uppercase font-bold tracking-wider">Nước Tiết Kiệm</span>
          </div>

          <div className="flex flex-col items-center sm:items-start gap-2 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Box size={20} />
            </div>
            <span className="text-2xl font-mono font-bold">{itemsRecycled.toLocaleString()}</span>
            <span className="text-xs text-stone-300 uppercase font-bold tracking-wider">Món Đồ Tuần Hoàn</span>
          </div>
        </div>

        <button 
          onClick={handleShare}
          className="mt-2 w-full sm:w-auto px-8 py-3 bg-white text-[#183A2D] rounded-full text-sm font-bold shadow-md hover:bg-stone-100 transition-colors flex items-center justify-center gap-2 z-10"
        >
          <Share2 size={18} /> Chia sẻ thành tích
        </button>
      </div>

      {/* GAMIFICATION BADGES */}
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden flex flex-col p-6">
        <div className="flex items-center gap-3 mb-6">
          <Award size={24} className="text-amber-500" />
          <h3 className="font-bold text-stone-800 uppercase tracking-wider">Huy hiệu đạt được</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col items-center text-center p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 grayscale-0 opacity-100 hover:-translate-y-1 transition-transform">
            <Trophy size={32} className="text-emerald-600 mb-3" />
            <span className="text-xs font-bold text-stone-800">Mầm Non Xanh</span>
            <span className="text-[10px] text-stone-500 mt-1">Hoàn thành 1 đơn hàng</span>
          </div>
          
          <div className="flex flex-col items-center text-center p-4 rounded-xl border border-stone-100 bg-stone-50 grayscale opacity-50">
            <Medal size={32} className="text-stone-400 mb-3" />
            <span className="text-xs font-bold text-stone-800">Cây Cổ Thụ</span>
            <span className="text-[10px] text-stone-500 mt-1">Tiết kiệm 100kg CO2</span>
          </div>

          <div className="flex flex-col items-center text-center p-4 rounded-xl border border-stone-100 bg-stone-50 grayscale opacity-50">
            <Award size={32} className="text-stone-400 mb-3" />
            <span className="text-xs font-bold text-stone-800">Chiến Thần Tủ Đồ</span>
            <span className="text-[10px] text-stone-500 mt-1">Cho thuê 50 món</span>
          </div>

          <div className="flex flex-col items-center text-center p-4 rounded-xl border border-stone-100 bg-stone-50 grayscale opacity-50">
            <Leaf size={32} className="text-stone-400 mb-3" />
            <span className="text-xs font-bold text-stone-800">Hiệp Sĩ Nước</span>
            <span className="text-[10px] text-stone-500 mt-1">Tiết kiệm 5,000L nước</span>
          </div>
        </div>
      </div>
    </div>
  );
}
