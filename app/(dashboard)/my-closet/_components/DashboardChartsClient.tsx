"use client";

import dynamic from "next/dynamic";
import React from "react";

function DashboardChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 animate-pulse">
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
  );
}

const DynamicCharts = dynamic(
  () => import("../DashboardCharts").then((mod) => mod.DashboardCharts),
  {
    ssr: false,
    loading: () => <DashboardChartsSkeleton />
  }
);

export function DashboardChartsClient({
  revenueData,
  categoryData,
  totalProducts
}: {
  revenueData: any[];
  categoryData: any[];
  totalProducts: number;
}) {
  return (
    <DynamicCharts 
      revenueData={revenueData} 
      categoryData={categoryData} 
      totalProducts={totalProducts} 
    />
  );
}
