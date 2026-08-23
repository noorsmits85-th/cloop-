"use client";

import React from "react";
import { Leaf, ShoppingBag, RotateCcw, Heart, ShieldCheck } from "lucide-react";

interface PulseItem {
  id: string;
  icon: React.ReactNode;
  text: string;
  tag?: string;
}

const PULSE_EVENTS: PulseItem[] = [
  {
    id: "eco-stat",
    icon: <Leaf className="w-3.5 h-3.5 text-emerald-400" />,
    text: "1.450 kg CO₂ & 28.500 Lít nước đã được bảo tồn trong tuần này qua CLOOP",
    tag: "TÁC ĐỘNG XANH"
  },
  {
    id: "rent-1",
    icon: <ShoppingBag className="w-3.5 h-3.5 text-amber-300" />,
    text: "@leena.vintage vừa hoàn tất cho thuê Đầm Dạ Hội Lụa Pháp tại Q.1, TP.HCM",
    tag: "VỪA GIAO DỊCH"
  },
  {
    id: "circular-passport",
    icon: <RotateCcw className="w-3.5 h-3.5 text-teal-300" />,
    text: "Chiếc Blazer 1998 vừa bắt đầu vòng đời tuần hoàn thứ 5 cùng chủ nhân mới",
    tag: "HỘ CHIẾU SỐ"
  },
  {
    id: "trust-closet",
    icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />,
    text: "Tủ đồ @the.archive vừa đạt điểm tín nhiệm cao 99.4/100",
    tag: "TỦ ĐỒ UY TÍN"
  },
  {
    id: "community-active",
    icon: <Heart className="w-3.5 h-3.5 text-rose-400" />,
    text: "Hơn 89 trang phục thiết kế đang luân chuyển và tỏa sáng tại các sự kiện hôm nay",
    tag: "VÒNG ĐỜI THỰC"
  }
];

export default function LivePulseTicker() {
  // Duplicate array for seamless infinite marquee loop
  const displayItems = [...PULSE_EVENTS, ...PULSE_EVENTS];

  return (
    <div className="w-full bg-[#071D12] border-y border-emerald-950/80 py-2.5 overflow-hidden select-none relative z-30 font-ui">
      <div className="max-w-[1600px] mx-auto px-4 flex items-center">
        {/* Left Fixed Badge */}
        <div className="hidden md:flex items-center gap-2 pr-4 border-r border-emerald-900/60 shrink-0 text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Nhịp Đập Tuần Hoàn</span>
        </div>

        {/* Marquee Track Container */}
        <div className="flex-1 overflow-hidden relative">
          <div className="flex items-center gap-12 whitespace-nowrap animate-ticker pl-4">
            {displayItems.map((item, index) => (
              <div key={`${item.id}-${index}`} className="inline-flex items-center gap-2 text-stone-200 text-xs font-normal">
                {item.icon}
                {item.tag && (
                  <span className="bg-emerald-950/80 text-emerald-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-800/40 uppercase tracking-widest font-mono">
                    {item.tag}
                  </span>
                )}
                <span className="tracking-wide">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
