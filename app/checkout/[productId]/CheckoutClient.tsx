"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignedShippingQuote } from "@/src/utils/shipping";
import { Loader2 } from "lucide-react";

export default function CheckoutClient({
  productId,
  fromProvince,
  weight,
  itemPrice,
  depositPrice
}: {
  productId: string;
  fromProvince: string;
  weight: number;
  itemPrice: number;
  depositPrice: number;
}) {
  const router = useRouter();
  const [toProvince, setToProvince] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [phone, setPhone] = useState("");
  
  const [shippingQuotes, setShippingQuotes] = useState<SignedShippingQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<SignedShippingQuote | null>(null);
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [error, setError] = useState("");

  const handleFetchShipping = async () => {
    if (!toProvince.trim()) {
      setError("Vui lòng nhập Tỉnh/Thành phố nhận hàng");
      return;
    }
    setError("");
    setIsLoadingShipping(true);
    
    try {
      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromProvince, toProvince, weight }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi lấy phí ship");
      
      setShippingQuotes(data.options);
      if (data.options.length > 0) {
        setSelectedQuote(data.options[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingShipping(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedQuote) {
      setError("Vui lòng chọn phương thức giao hàng");
      return;
    }
    if (!phone.trim() || !addressDetail.trim()) {
      setError("Vui lòng nhập đủ SĐT và chi tiết địa chỉ");
      return;
    }

    setError("");
    setIsProcessingPayment(true);

    try {
      const userId = localStorage.getItem("cloop_user_id");
      if (!userId) {
        throw new Error("Vui lòng đăng nhập để tiếp tục thanh toán");
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          userId,
          shippingToken: selectedQuote.token,
          buyerAddress: `${addressDetail}, ${toProvince}`,
          buyerPhone: phone
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Lỗi thanh toán");
      }

      if (data.checkoutUrl) {
        // Redirect tới PayOS
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      setError(err.message);
      setIsProcessingPayment(false);
    }
  };

  const totalAmount = itemPrice + depositPrice + (selectedQuote?.quote.fee || 0);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-100 flex flex-col h-fit">
      <h2 className="font-heading text-2xl text-[#0A2517] font-bold mb-6">Thông tin nhận hàng</h2>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-ui text-stone-600 mb-1">Tỉnh/Thành phố</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={toProvince}
              onChange={(e) => setToProvince(e.target.value)}
              placeholder="VD: Hà Nội, Hồ Chí Minh"
              className="flex-1 px-3 py-2 border border-stone-200 rounded font-ui focus:outline-none focus:border-[#0A2517]"
            />
            <button 
              onClick={handleFetchShipping}
              disabled={isLoadingShipping || !toProvince.trim()}
              className="px-4 py-2 bg-[#0A2517] text-white rounded font-ui text-sm hover:bg-[#113a25] disabled:opacity-50 flex items-center justify-center min-w-[100px]"
            >
              {isLoadingShipping ? <Loader2 size={16} className="animate-spin" /> : "Tính phí"}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-ui text-stone-600 mb-1">Địa chỉ chi tiết (Số nhà, Đường)</label>
          <input 
            type="text" 
            value={addressDetail}
            onChange={(e) => setAddressDetail(e.target.value)}
            className="w-full px-3 py-2 border border-stone-200 rounded font-ui focus:outline-none focus:border-[#0A2517]"
          />
        </div>

        <div>
          <label className="block text-sm font-ui text-stone-600 mb-1">Số điện thoại</label>
          <input 
            type="tel" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-stone-200 rounded font-ui focus:outline-none focus:border-[#0A2517]"
          />
        </div>
      </div>

      {error && <div className="text-red-500 text-sm font-ui mb-4 p-3 bg-red-50 rounded border border-red-100">{error}</div>}

      {/* Danh sách gói cước */}
      {shippingQuotes.length > 0 && (
        <div className="mb-6 space-y-3">
          <label className="block text-sm font-ui text-stone-600 font-bold">Chọn gói vận chuyển GHN</label>
          {shippingQuotes.map((sq, idx) => (
            <div 
              key={idx}
              onClick={() => setSelectedQuote(sq)}
              className={`p-3 border rounded cursor-pointer transition-colors flex justify-between items-center ${selectedQuote?.token === sq.token ? 'border-[#0A2517] bg-emerald-50' : 'border-stone-200 hover:border-[#0A2517]'}`}
            >
              <div>
                <p className="font-ui font-semibold text-[#0A2517]">{sq.quote.name}</p>
                <p className="text-xs text-stone-500">Dự kiến giao: {sq.quote.estimatedDays > 0 ? `${sq.quote.estimatedDays} ngày` : "Trong ngày"}</p>
              </div>
              <span className="font-ui font-bold text-[#0A2517]">{sq.quote.fee.toLocaleString('vi-VN')}đ</span>
            </div>
          ))}
        </div>
      )}

      {/* Tổng tiền & Nút thanh toán */}
      <div className="mt-auto pt-6 border-t border-stone-100">
        <div className="flex justify-between items-center mb-6">
          <span className="font-ui text-lg text-stone-600 font-bold">Tổng thanh toán</span>
          <span className="font-heading text-2xl font-bold text-emerald-600">{totalAmount.toLocaleString('vi-VN')}đ</span>
        </div>
        
        <button 
          onClick={handleCheckout}
          disabled={isProcessingPayment || !selectedQuote}
          className="w-full h-[54px] bg-[#0A2517] text-white rounded font-ui font-bold text-lg hover:bg-[#113a25] transition-colors flex items-center justify-center disabled:opacity-50"
        >
          {isProcessingPayment ? <Loader2 size={24} className="animate-spin" /> : "Thanh toán bằng PayOS"}
        </button>
        <p className="text-center text-xs text-stone-400 mt-3 font-ui">Chuyển khoản an toàn qua mã QR 24/7</p>
      </div>
    </div>
  );
}
