"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

interface CheckoutModalProps {
  productName: string;
  totalPrice: number;
  productId: string;
  onClose: () => void;
  onSuccess: (orderData: any) => void;
}

export default function CheckoutModal({ productName, totalPrice, productId, onClose, onSuccess }: CheckoutModalProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("Nghệ An");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !address) {
      alert("Trang ơi, cậu điền thiếu thông tin giao hàng rồi kìa!");
      return;
    }

    try {
      setIsSubmitting(true);

      // 🔐 Lấy thông tin tài khoản thuê đồ hiện tại
      const { data: { user } } = await supabase.auth.getUser();
      const renterId = user?.id || "mock-renter-trang-2026";

      // Bắn toàn bộ thông tin đơn hàng lên bảng 'orders' hoặc 'rentals' trên Supabase
      const { data, error } = await supabase.from("orders").insert([
        {
          product_id: productId,
          product_name: productName,
          total_amount: totalPrice,
          renter_id: renterId,
          customer_name: fullName,
          customer_phone: phone,
          shipping_province: province,
          shipping_address: address,
          status: "pending_payment",
          created_at: new Date().toISOString()
        }
      ]).select();

      if (error) throw error;

      alert("🎉 Kích hoạt đơn hàng thuê tuần hoàn thành công!");
      if (data && data[0]) {
        onSuccess(data[0]); // Trả kết quả hóa đơn ngược về cho trang xử lý bên dưới hiển thị
      }
      onClose();
    } catch (error: any) {
      console.error("❌ Lỗi ngắt mạch khi tạo đơn hàng:", error.message);
      alert("Hệ thống database lỗi dòng: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#FDFBF7] border border-stone-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 className="text-lg font-bold text-[#183A2D]">📦 Thông Tin Nhận Trang Phục</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">✕</button>
        </div>

        <form onSubmit={handleOrderSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#183A2D] uppercase mb-1">Họ và tên người nhận</label>
            <input
              type="text"
              placeholder="Hoàng Thị Trang"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-[#183A2D] text-[#183A2D]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#183A2D] uppercase mb-1">Số điện thoại</label>
              <input
                type="tel"
                placeholder="0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-[#183A2D] text-[#183A2D]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#183A2D] uppercase mb-1">Tỉnh / Thành phố</label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-[#183A2D] text-[#183A2D]"
              >
                <option value="Nghệ An">Nghệ An</option>
                <option value="Hà Nội">Hà Nội</option>
                <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                <option value="Đà Nẵng">Đà Nẵng</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#183A2D] uppercase mb-1">Địa chỉ cụ thể (Số nhà, ngõ, xã/phường)</label>
            <input
              type="text"
              placeholder="Số 12, đường Lê Lợi, Hưng Nguyên"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-[#183A2D] text-[#183A2D]"
            />
          </div>

          <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 space-y-1">
            <div className="flex justify-between text-xs text-stone-500">
              <span>Sản phẩm:</span>
              <span className="font-medium text-stone-700">{productName}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-[#183A2D] pt-1 border-t border-stone-200/60">
              <span>Tổng hóa đơn thanh toán:</span>
              <span>{totalPrice.toLocaleString()}đ</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-sm"
            >
              Quay lại
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 bg-[#183A2D] hover:bg-[#235341] text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2"
            >
              {isSubmitting ? "Đang tạo đơn..." : "Xác nhận thuê Đồ 🚀"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}