import React from "react";

export default function MobileAppLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FAF9F5] select-none">
      <div className="relative flex flex-col items-center justify-center">
        {/* Ambient Warm Aura */}
        <div className="absolute w-36 h-36 rounded-full bg-emerald-50/60 blur-2xl pointer-events-none" />

        {/* Minimalist Haute Couture Typography */}
        <div className="relative z-10 text-center space-y-1.5">
          <h1 className="text-sm font-semibold text-[#143224] tracking-[0.35em] uppercase font-serif">
            CLOOP
          </h1>
          <p className="text-[9px] text-stone-400 font-medium tracking-[0.25em] uppercase">
            Thời Trang Tuần Hoàn
          </p>
        </div>

        {/* Subtle Minimalist Line Loader */}
        <div className="w-16 h-[1.5px] bg-stone-200/60 rounded-full mt-5 overflow-hidden">
          <div className="w-full h-full bg-[#1E5638] rounded-full animate-progress-sweep" />
        </div>
      </div>
    </div>
  );
}
