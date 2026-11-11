"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RefreshCw, Shirt, LogIn } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4 font-ui text-stone-800">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E9E2D8] shadow-lg text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
          <AlertTriangle size={32} />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[#183A2D] font-brand-title">
            Tạm thời gián đoạn kết nối Tủ đồ
          </h2>
          <p className="text-xs text-stone-500 leading-relaxed">
            Dữ liệu hoặc phiên làm việc của mục này đang được đồng bộ. Vui lòng bấm thử lại hoặc đăng nhập lại để tiếp tục.
          </p>
        </div>

        {error?.digest && (
          <div className="text-[10px] text-stone-400 font-mono bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200 inline-block">
            Mã định danh lỗi: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full flex items-center justify-center gap-2 bg-[#183A2D] hover:bg-[#112a20] text-white py-3 px-4 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <RefreshCw size={15} />
            Thử lại
          </button>
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 py-3 px-4 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <LogIn size={15} />
            <span>Đăng nhập lại</span>
          </Link>
        </div>

        <div className="pt-2 border-t border-stone-100">
          <Link
            href="/my-closet/items"
            className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-[#183A2D] font-medium transition"
          >
            <Shirt size={14} />
            Quay về danh sách Tủ đồ của tôi
          </Link>
        </div>
      </div>
    </div>
  );
}
