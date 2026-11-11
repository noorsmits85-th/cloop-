"use client";

import React, { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalRootError({
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
    <html lang="vi">
      <body className="min-h-screen flex items-center justify-center p-6 bg-white text-black font-sans antialiased">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-neutral-200 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-neutral-100 border border-neutral-300 text-black flex items-center justify-center mx-auto">
            <AlertTriangle size={32} />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight">
              Đã xảy ra sự cố gián đoạn tạm thời
            </h1>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Hệ thống đang đồng bộ dữ liệu hoặc bận xử lý. Vui lòng thử lại hoặc quay về trang chủ.
            </p>
          </div>

          {error?.digest && (
            <div className="text-[10px] text-neutral-500 font-mono bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200 inline-block">
              Mã tham chiếu: {error.digest}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="w-full flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white py-3 px-4 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <RefreshCw size={15} />
              Thử lại ngay
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = "/";
                }
              }}
              className="w-full flex items-center justify-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-black py-3 px-4 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Home size={15} />
              Về Trang chủ
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
