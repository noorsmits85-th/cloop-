import React from "react";
import { Loader2 } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[#FAF9F5] p-6 sm:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
        <div className="h-14 bg-stone-200/70 rounded-2xl w-full" />
        <div className="h-44 bg-[#183A2D]/80 rounded-3xl p-8 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-6 w-48 bg-white/20 rounded-full" />
            <div className="h-8 w-80 bg-white/30 rounded-xl" />
          </div>
          <div className="h-4 w-60 bg-white/20 rounded-md" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-stone-200 space-y-3">
              <div className="h-3 w-24 bg-stone-200 rounded" />
              <div className="h-8 w-32 bg-stone-300 rounded-lg" />
              <div className="h-2 w-36 bg-stone-100 rounded" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center py-12 gap-3 text-stone-400 text-xs font-mono">
          <Loader2 className="w-5 h-5 animate-spin text-[#183A2D]" />
          <span>Đang đồng bộ số liệu thời gian thực...</span>
        </div>
      </div>
    </div>
  );
}
