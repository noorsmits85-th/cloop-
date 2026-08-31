import React from "react";

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse p-2 font-body">
      <div className="bg-white p-6 rounded-3xl border border-[#E9E2D8] shadow-xs flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-emerald-100/80 rounded-md"></div>
          <div className="h-7 w-64 bg-stone-200 rounded-lg"></div>
          <div className="h-3.5 w-80 bg-stone-100 rounded"></div>
        </div>
        <div className="h-10 w-28 bg-stone-200 rounded-full"></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-3xl border border-[#E9E2D8] overflow-hidden">
            <div className="aspect-[3/4] bg-stone-200"></div>
            <div className="p-4 space-y-2">
              <div className="h-4 w-3/4 bg-stone-200 rounded"></div>
              <div className="h-4 w-1/2 bg-stone-300 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
