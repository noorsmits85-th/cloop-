"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("⛔ [Admin Route Exception Captured]:", error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-[#FAF9F5]">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle size={32} />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-stone-900 font-heading">
            Tạm thời chưa tải được dữ liệu Quản trị
          </h2>
          <p className="text-xs text-stone-500 leading-relaxed">
            Hệ thống vừa trải qua đợt kiểm thử tải hoặc phiên đăng nhập của bạn cần được làm mới để cập nhật quyền hạn Admin.
          </p>
          {error?.digest && (
            <p className="text-[10px] font-mono text-stone-400 bg-stone-50 py-1 px-2 rounded-lg inline-block">
              Mã theo dõi: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-[#183A2D] text-white font-bold text-xs py-3 px-4 rounded-xl hover:bg-[#122e23] transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Thử tải lại</span>
          </button>

          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-stone-100 text-stone-700 font-bold text-xs py-3 px-4 rounded-xl hover:bg-stone-200 transition-all active:scale-95"
          >
            <Home size={14} />
            <span>Về trang chủ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
