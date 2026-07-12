"use client";

import { useState } from "react";
import CheckoutModal from "../../../components/CheckoutModal";
export default function ProductDetailPage() {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any>(null); // Nơi lưu trữ kết quả đơn hàng trả về

  // Giả định cục dữ liệu thật đang hiển thị trên UI của cậu
  const productData = {
    id: "3c8eba2b-fc77-4a8d-a70c-566d0d7d1a72",
    name: "váy ngắn",
    total_bill: 45000
  };

  return (
    <div className="relative">
      {/* --- ĐỐNG CODE GIAO DIỆN HIỆN TẠI CỦA CẬU --- */}
      
      {/* Tại vị trí cái nút bấm TIẾN HÀNH THUÊ 1 NGÀY, cậu bổ sung sự kiện onClick này vào: */}
      <button 
        onClick={() => setIsCheckoutOpen(true)}
        className="w-full bg-[#183A2D] text-white py-3 rounded-xl font-bold"
      >
        📥 TIẾN HÀNH THUÊ 1 NGÀY
      </button>

      {/* --- KẾT QUẢ ĐƠN HÀNG TRẢ VỀ: Nối mạch hiển thị ở phía bên dưới chân trang --- */}
      {successOrder && (
        <div className="mt-8 max-w-xl mx-auto p-5 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <h4 className="text-md font-bold text-emerald-800 flex items-center gap-2">
            ✅ ĐĂNG KÝ MẠCH THUÊ ĐỒ THÀNH CÔNG!
          </h4>
          <div className="text-xs text-emerald-900 grid grid-cols-2 gap-2 font-mono">
            <div>🧾 Mã đơn: <span className="font-bold">{successOrder.id.slice(0,8)}...</span></div>
            <div>👤 Người nhận: {successOrder.customer_name}</div>
            <div>📞 Điện thoại: {successOrder.customer_phone}</div>
            <div>📍 Khu vực: {successOrder.shipping_province}</div>
            <div>🏠 Địa chỉ: {successOrder.shipping_address}</div>
            <div className="col-span-2 text-sm text-[#183A2D] pt-2 border-t border-emerald-200 font-sans font-bold">
              💰 Tổng số tiền thu hộ (COD): {successOrder.total_amount.toLocaleString()}đ
            </div>
          </div>
        </div>
      )}

      {/* Bộ điều khiển bật tắt cửa sổ điền form vận chuyển */}
      {isCheckoutOpen && (
        <CheckoutModal
          productId={productData.id}
          productName={productData.name}
          totalPrice={productData.total_bill}
          onClose={() => setIsCheckoutOpen(false)}
          onSuccess={(order) => setSuccessOrder(order)} // Hứng dữ liệu từ modal đẩy về đây
        />
      )}
    </div>
  );
}