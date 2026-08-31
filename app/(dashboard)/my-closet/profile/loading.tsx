import React from "react";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse p-2 font-body">
      <div className="bg-white p-6 rounded-3xl border border-[#E9E2D8] flex items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-stone-200"></div>
        <div className="space-y-3 flex-1">
          <div className="h-6 w-48 bg-stone-200 rounded"></div>
          <div className="h-4 w-32 bg-stone-100 rounded"></div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-3xl border border-[#E9E2D8] h-80"></div>
    </div>
  );
}
