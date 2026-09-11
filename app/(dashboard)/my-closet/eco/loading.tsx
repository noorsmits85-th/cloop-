import React from "react";

export default function EcoLoading() {
  return (
    <div className="min-h-screen bg-[#FAF9F5] py-8 px-4 sm:px-8 text-stone-800 antialiased animate-pulse">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="h-5 w-36 bg-emerald-100/70 rounded-full"></div>
          <div className="h-8 w-64 bg-stone-200 rounded-lg"></div>
          <div className="h-4 w-96 bg-stone-100 rounded"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-200/60 p-6 space-y-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50"></div>
              <div className="h-6 w-24 bg-stone-200 rounded"></div>
              <div className="h-3.5 w-36 bg-stone-100 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
