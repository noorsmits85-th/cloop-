"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Loader2, Shirt } from "lucide-react";
import { fastLoginAction } from "@/app/(storefront)/login/actions";
import { toast } from "sonner";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    console.error("⚠️ [CLOOP Dashboard Error Boundary]:", error);
  }, [error]);

  const handleQuickReauth = async () => {
    setIsLoggingIn(true);
    try {
      const res = await fastLoginAction({ redirectTo: window.location.pathname || '/my-closet' });
      if (res?.error) {
        toast.error("Lỗi đăng nhập: " + res.error);
      } else {
        toast.success("Khôi phục phiên thành công!");
        window.location.reload();
      }
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khôi phục phiên");
    } finally {
      setIsLoggingIn(false);
    }
  };

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
            Dữ liệu hoặc phiên làm việc của mục này đang được đồng bộ. Bấm thử lại hoặc khôi phục phiên 1-chạm để vào ngay.
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
          <button
            type="button"
            disabled={isLoggingIn}
            onClick={handleQuickReauth}
            className="w-full flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 py-3 px-4 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            {isLoggingIn ? <Loader2 size={15} className="animate-spin" /> : <span>⚡ Đăng nhập lại 1-chạm</span>}
          </button>
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
