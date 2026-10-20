import React from "react";
import Image from "next/image";

export default function MobileAppLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FAF9F5] select-none">
      {/* 3D Silk Infinity Loop with Ambient Breathing Glow */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Soft Ambient Radial Light */}
        <div className="absolute w-40 h-40 rounded-full bg-emerald-100/50 blur-2xl animate-pulse pointer-events-none" />

        {/* 3D Silk Loop Emblem */}
        <div className="relative w-24 h-24 mb-4 flex items-center justify-center animate-silk-float">
          <Image
            src="/loogo.png"
            alt="CLOOP Silk Loop"
            width={96}
            height={96}
            priority
            className="object-contain drop-shadow-[0_10px_25px_rgba(20,50,36,0.18)]"
          />
        </div>

        {/* Minimalist Haute Couture Typography */}
        <div className="text-center space-y-1">
          <h1 className="text-xs font-bold text-[#143224] tracking-[0.3em] uppercase">
            CLOOP
          </h1>
          <p className="text-[9px] text-stone-400 font-medium tracking-[0.2em] uppercase">
            Thời Trang Tuần Hoàn
          </p>
        </div>

        {/* Subtle Minimalist Line Loader */}
        <div className="w-24 h-[1.5px] bg-stone-200/80 rounded-full mt-6 overflow-hidden">
          <div className="w-full h-full bg-[#1E5638] rounded-full animate-progress-sweep" />
        </div>
      </div>
    </div>
  );
}
