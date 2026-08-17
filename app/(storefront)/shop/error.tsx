"use client"; // Error components must be Client Components

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("ShopError Boundary Caught:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        Oops! Tủ đồ đang được dọn dẹp
      </h2>
      <p className="text-gray-600 max-w-md mb-8">
        Server đang bận rộn cập nhật các bộ sưu tập mới nhất. Quý khách vui lòng thử lại sau giây lát.
      </p>
      
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="bg-black text-white hover:bg-gray-800 rounded-full py-2 px-8 flex items-center gap-2 transition-colors font-medium"
        >
          <RefreshCcw className="w-4 h-4" />
          Thử lại
        </button>
        <button
          onClick={() => window.location.href = "/"}
          className="bg-white text-black border border-gray-300 hover:bg-gray-50 rounded-full py-2 px-8 transition-colors font-medium"
        >
          Về trang chủ
        </button>
      </div>
    </div>
  );
}
