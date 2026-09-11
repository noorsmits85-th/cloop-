import React from "react";

export default function MyClosetLoading() {
  return (
    <div className="min-h-screen bg-[#FAF9F5] py-8 px-4 sm:px-8 text-stone-800 antialiased animate-pulse">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Title Header */}
        <div className="space-y-2">
          <div className="h-5 w-36 bg-emerald-100/70 rounded-full"></div>
          <div className="h-8 w-60 bg-stone-200 rounded-lg"></div>
          <div className="h-4 w-96 bg-stone-100 rounded"></div>
        </div>

        {/* Smart Onboarding Card Skeleton */}
        <div className="w-full rounded-2xl bg-white border border-[#EBE6D8] p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div className="space-y-2">
              <div className="h-5 w-48 bg-stone-200 rounded"></div>
              <div className="h-3.5 w-72 bg-stone-100 rounded"></div>
            </div>
            <div className="h-8 w-32 bg-stone-100 rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="h-16 bg-stone-50 rounded-xl border border-stone-100"></div>
            <div className="h-16 bg-stone-50 rounded-xl border border-stone-100"></div>
          </div>
        </div>

        {/* 4 ESG Metric Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-stone-200/50 p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-stone-100 shrink-0"></div>
              <div className="space-y-2 flex-1">
                <div className="h-3 w-20 bg-stone-200 rounded"></div>
                <div className="h-6 w-28 bg-stone-200 rounded"></div>
                <div className="h-2.5 w-32 bg-stone-100 rounded"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200/60 shadow-sm lg:col-span-2 space-y-4">
            <div className="space-y-1.5">
              <div className="h-4 w-44 bg-stone-200 rounded"></div>
              <div className="h-3 w-64 bg-stone-100 rounded"></div>
            </div>
            <div className="h-[250px] w-full bg-stone-50 rounded-xl border border-stone-100"></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-stone-200/60 shadow-sm flex flex-col space-y-4">
            <div className="space-y-1.5">
              <div className="h-4 w-36 bg-stone-200 rounded"></div>
              <div className="h-3 w-48 bg-stone-100 rounded"></div>
            </div>
            <div className="h-[250px] w-full bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-center">
              <div className="w-28 h-28 rounded-full border-4 border-stone-200 border-t-transparent"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
