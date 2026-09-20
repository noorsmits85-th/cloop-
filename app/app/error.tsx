"use client";

import React, { useEffect } from "react";
import { RefreshCw, Sparkles, Home } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("⚠️ [CLOOP App Local Error]:", error);
  }, [error]);

  const handleReload = async () => {
    try {
      if (typeof window !== "undefined" && "caches" in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((k) => window.caches.delete(k)));
      }
    } catch (_) {}
    if (typeof window !== "undefined") {
      window.location.href = "/app?t=" + Date.now();
    } else {
      reset();
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-12 px-4 flex flex-col items-center justify-center font-ui text-[#0A2517] selection:bg-[#0A2517] selection:text-white">
      <div className="w-full max-w-[390px] bg-white rounded-3xl p-7 border border-stone-200 shadow-xl text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center mx-auto shadow-xs">
          <Sparkles size={28} />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-[#183A2D] font-brand-title">
            Đang cập nhật phiên bản mới
          </h2>
          <p className="text-xs text-stone-500 leading-relaxed">
            Ứng dụng CLOOP vừa được nâng cấp các tính năng mới. Vui lòng bấm làm mới để đồng bộ dữ liệu mượt mà nhất.
          </p>
        </div>

        {error?.message && (
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-left max-h-24 overflow-y-auto">
            <p className="text-[10.5px] font-mono text-stone-600 break-all leading-tight">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleReload}
            className="w-full flex items-center justify-center gap-2 bg-[#0A2517] hover:bg-[#143E29] active:scale-95 text-white py-3.5 px-4 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <RefreshCw size={15} />
            Làm mới ứng dụng ngay
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/?desktop=1&t=" + Date.now();
              }
            }}
            className="w-full flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 py-3 px-4 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Home size={15} />
            Mở bản Web đầy đủ
          </button>
        </div>
      </div>
    </div>
  );
}
