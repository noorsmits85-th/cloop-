"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // PayOS trả về các query param như code, id, cancel, status, orderCode
  const orderCode = searchParams.get("orderCode");
  const cancel = searchParams.get("cancel");
  
  const [status, setStatus] = useState<"verifying" | "success" | "cancelled">("verifying");

  useEffect(() => {
    if (cancel === "true") {
      setStatus("cancelled");
    } else {
      // Ở đây ta không tin tưởng hoàn toàn trình duyệt. 
      // Server webhook sẽ chạy độc lập để update DB thành PAID.
      // Trên Client, ta chỉ báo "Đang xử lý".
      // Bạn có thể fetch polling API để check trạng thái DB thật nếu muốn.
      setStatus("success");
    }
  }, [cancel, orderCode]);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-3xl p-8 text-center shadow-xl border border-stone-100">
        
        {status === "verifying" && (
          <div className="space-y-4">
            <Loader2 className="w-16 h-16 text-emerald-600 animate-spin mx-auto" />
            <h1 className="text-2xl font-bold text-stone-800">Đang xác minh...</h1>
            <p className="text-stone-500 text-sm">Hệ thống đang kết nối với ngân hàng để ghi nhận giao dịch.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-stone-800">Đã nhận yêu cầu thanh toán</h1>
            <p className="text-stone-500 text-sm leading-relaxed">
              Hệ thống đang xác minh tự động thông qua cổng PayOS. Đơn thuê sẽ sớm được cập nhật trạng thái ngay khi có xác nhận dòng tiền.
            </p>
            <div className="pt-6">
              <button 
                onClick={() => router.push("/my-closet")}
                className="w-full py-4 bg-[#183A2D] text-white font-bold rounded-xl hover:bg-[#23452F] transition-colors"
              >
                Quản lý tủ đồ
              </button>
            </div>
          </div>
        )}

        {status === "cancelled" && (
          <div className="space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-stone-800">Đã hủy thanh toán</h1>
            <p className="text-stone-500 text-sm">Bạn đã hủy giao dịch trên cổng thanh toán ngân hàng.</p>
            <div className="pt-6">
              <button 
                onClick={() => router.push("/")}
                className="w-full py-4 bg-stone-200 text-stone-800 font-bold rounded-xl hover:bg-stone-300 transition-colors"
              >
                Về Trang Chủ
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
