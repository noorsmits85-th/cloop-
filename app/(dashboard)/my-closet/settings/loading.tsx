import React from "react";

export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-[#FAF9F5] py-8 px-4 sm:px-8 text-stone-800 antialiased animate-pulse">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="h-5 w-36 bg-emerald-100/70 rounded-full"></div>
          <div className="h-8 w-56 bg-stone-200 rounded-lg"></div>
          <div className="h-4 w-96 bg-stone-100 rounded"></div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/60 p-6 space-y-6">
          <div className="space-y-3">
            <div className="h-4 w-32 bg-stone-200 rounded"></div>
            <div className="h-10 w-full bg-stone-100 rounded-xl"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 w-32 bg-stone-200 rounded"></div>
            <div className="h-10 w-full bg-stone-100 rounded-xl"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 w-32 bg-stone-200 rounded"></div>
            <div className="h-24 w-full bg-stone-100 rounded-xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
