"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("⚠️ [CLOOP Global Error Boundary]:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-stone-50 font-ui text-stone-800">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E9E2D8] shadow-xl text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
          <AlertTriangle size={32} />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[#183A2D] font-brand-title">
            Hệ thống đang đồng bộ dữ liệu
          </h2>
          <p className="text-xs text-stone-500 leading-relaxed">
            Kết nối máy chủ đang bận hoặc vừa được cập nhật phiên bản mới. Vui lòng bấm thử lại hoặc tải lại trang.
          </p>
        </div>

        {error?.message && (
          <div className="p-3 bg-red-50/80 border border-red-200/80 rounded-2xl text-left max-h-24 overflow-y-auto">
            <p className="text-[11px] font-mono text-red-600 break-all leading-tight">
              {error.message}
            </p>
          </div>
        )}

        {error?.digest && (
          <div className="text-[10px] text-stone-400 font-mono bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200 inline-block">
            Mã định danh: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={async () => {
              if (typeof window !== "undefined") {
                try {
                  if ("caches" in window) {
                    const keys = await window.caches.keys();
                    await Promise.all(keys.map((k) => window.caches.delete(k)));
                  }
                } catch (_) {}
                const isMobile = /Android|iPhone|iPad|iPod|Zalo|MiniApp|Mobile/i.test(navigator.userAgent);
                const target = isMobile ? "/app" : "/";
                window.location.href = `${target}?reload=${Date.now()}`;
              } else {
                reset();
              }
            }}
            className="w-full flex items-center justify-center gap-2 bg-[#183A2D] hover:bg-[#112a20] text-white py-3 px-4 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
          >
            <RefreshCw size={15} />
            Thử lại ngay
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                const isMobile = /Android|iPhone|iPad|iPod|Zalo|MiniApp|Mobile/i.test(navigator.userAgent);
                window.location.href = isMobile ? "/app" : "/";
              }
            }}
            className="w-full flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 py-3 px-4 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
          >
            <Home size={15} />
            Về Trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
