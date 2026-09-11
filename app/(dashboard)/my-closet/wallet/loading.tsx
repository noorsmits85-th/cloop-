import React from "react";

export default function WalletLoading() {
  return (
    <div className="min-h-screen bg-[#FAF9F5] py-8 px-4 sm:px-8 text-stone-800 antialiased animate-pulse">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="h-5 w-36 bg-emerald-100/70 rounded-full"></div>
          <div className="h-8 w-60 bg-stone-200 rounded-lg"></div>
          <div className="h-4 w-96 bg-stone-100 rounded"></div>
        </div>

        {/* 3 Top Cards (VNĐ, CloopCoins, Actions) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-[#183A2D] h-52 rounded-3xl p-6 opacity-60"></div>
          <div className="bg-white border border-stone-200 h-52 rounded-3xl p-6 space-y-4">
            <div className="h-4 w-32 bg-stone-200 rounded"></div>
            <div className="h-8 w-40 bg-stone-300 rounded"></div>
            <div className="h-10 w-full bg-stone-100 rounded-xl"></div>
          </div>
          <div className="bg-white border border-stone-200 h-52 rounded-3xl p-6 space-y-4">
            <div className="h-4 w-32 bg-stone-200 rounded"></div>
            <div className="h-8 w-40 bg-stone-300 rounded"></div>
            <div className="h-10 w-full bg-stone-100 rounded-xl"></div>
          </div>
        </div>

        {/* Tabs & History Table Skeleton */}
        <div className="bg-white rounded-3xl border border-[#E9E2D8] p-6 space-y-4">
          <div className="flex gap-3 pb-3 border-b border-stone-100">
            <div className="h-10 w-32 bg-stone-200 rounded-xl"></div>
            <div className="h-10 w-32 bg-stone-100 rounded-xl"></div>
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-stone-50 rounded-xl border border-stone-100"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
