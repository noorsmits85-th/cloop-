import React from "react";

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse p-2 font-body">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#183A2D] h-48 rounded-3xl p-6 opacity-60"></div>
        <div className="bg-white border border-stone-200 h-48 rounded-3xl p-6"></div>
        <div className="bg-white border border-stone-200 h-48 rounded-3xl p-6"></div>
      </div>
      <div className="bg-white p-6 rounded-3xl border border-[#E9E2D8] h-64"></div>
    </div>
  );
}
