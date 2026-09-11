import React from "react";

export default function ArchiveLoading() {
  return (
    <div className="min-h-screen bg-[#FAF9F5] py-8 px-4 sm:px-8 text-stone-800 antialiased animate-pulse">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="h-5 w-32 bg-emerald-100/70 rounded-full"></div>
          <div className="h-8 w-56 bg-stone-200 rounded-lg"></div>
          <div className="h-4 w-96 bg-stone-100 rounded"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-200/60 p-4 space-y-3">
              <div className="aspect-[4/3] bg-stone-100 rounded-xl"></div>
              <div className="h-4 w-3/4 bg-stone-200 rounded"></div>
              <div className="h-3 w-1/2 bg-stone-100 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
