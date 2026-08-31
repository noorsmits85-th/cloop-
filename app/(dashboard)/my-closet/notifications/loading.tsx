import React from "react";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse p-2 font-body">
      <div className="bg-white p-6 rounded-3xl border border-[#E9E2D8] h-28"></div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-[#E9E2D8] flex gap-4 items-center">
            <div className="w-10 h-10 rounded-2xl bg-stone-100"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-stone-200 rounded"></div>
              <div className="h-3 w-2/3 bg-stone-100 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
