import React from "react";

export default function DashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-pulse p-4 sm:p-6 font-body">
      {/* Top Banner Skeleton */}
      <div className="bg-white p-6 rounded-2xl border border-[#E9E2D8] shadow-xs space-y-4">
        <div className="h-4 w-40 bg-emerald-100/70 rounded-md"></div>
        <div className="h-7 w-72 bg-stone-200 rounded-lg"></div>
        <div className="h-4 w-96 bg-stone-100 rounded-md"></div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="h-20 bg-stone-50 rounded-xl border border-stone-200/60 p-4"></div>
          <div className="h-20 bg-stone-50 rounded-xl border border-stone-200/60 p-4"></div>
        </div>
      </div>

      {/* 4 Metric Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-[#E9E2D8] shadow-xs space-y-3">
            <div className="w-8 h-8 rounded-full bg-emerald-50"></div>
            <div className="h-6 w-20 bg-stone-200 rounded-md"></div>
            <div className="h-3.5 w-28 bg-stone-100 rounded"></div>
          </div>
        ))}
      </div>

      {/* Content Section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E9E2D8] shadow-xs space-y-4">
          <div className="h-5 w-48 bg-stone-200 rounded"></div>
          <div className="h-48 bg-stone-50 rounded-xl border border-stone-100"></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#E9E2D8] shadow-xs space-y-4">
          <div className="h-5 w-36 bg-stone-200 rounded"></div>
          <div className="h-48 bg-stone-50 rounded-xl border border-stone-100"></div>
        </div>
      </div>
    </div>
  );
}
