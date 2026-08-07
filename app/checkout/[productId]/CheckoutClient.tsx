"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignedShippingQuote } from "@/src/utils/shipping";
import { Loader2 } from "lucide-react";

export default function CheckoutClient({
  productId,
  fromProvince,
  weight,
  depositPrice,
  pricingTiers,
  turnaroundDays,
}: {
  productId: string;
  fromProvince: string;
  weight: number;
  depositPrice: number;
  pricingTiers: any[];
  turnaroundDays: number;
}) {
  const router = useRouter();
  const [addressDetail, setAddressDetail] = useState("");
  const [phone, setPhone] = useState("");
  
  // GHN Address States
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  
  const [selectedProvince, setSelectedProvince] = useState<{ id: string; name: string } | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<{ id: string; name: string } | null>(null);
  const [selectedWard, setSelectedWard] = useState<{ id: string; name: string } | null>(null);

  const [shippingQuotes, setShippingQuotes] = useState<SignedShippingQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<SignedShippingQuote | null>(null);
  
  // States cho Smart Pricing & Date
  const [selectedTier, setSelectedTier] = useState<any>(pricingTiers[1] || pricingTiers[0]); // Mặc định gói 3 ngày
  const [startDate, setStartDate] = useState<string>("");

  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [error, setError] = useState("");

  // Fetch Provinces on Mount
  useEffect(() => {
    fetch("/api/shipping/address?type=province")
      .then(res => res.json())
      .then(data => {
        if (data.data) setProvinces(data.data);
      })
      .catch(console.error);
  }, []);

  // Fetch Districts when Province changes
  useEffect(() => {
    if (!selectedProvince) return;
    setDistricts([]);
    setWards([]);
    setSelectedDistrict(null);
    setSelectedWard(null);
    fetch(`/api/shipping/address?type=district&province_id=${selectedProvince.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.data) setDistricts(data.data);
      })
      .catch(console.error);
  }, [selectedProvince]);

  // Fetch Wards when District changes
  useEffect(() => {
    if (!selectedDistrict) return;
    setWards([]);
    setSelectedWard(null);
    fetch(`/api/shipping/address?type=ward&district_id=${selectedDistrict.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.data) setWards(data.data);
      })
      .catch(console.error);
  }, [selectedDistrict]);

  // Auto Fetch Shipping when Ward is selected
  useEffect(() => {
    if (selectedProvince && selectedDistrict && selectedWard) {
      handleFetchShipping();
    }
  }, [selectedWard]);

  const handleFetchShipping = async () => {
    if (!selectedProvince || !selectedDistrict || !selectedWard) return;
    
    setError("");
    setIsLoadingShipping(true);
    
    // Ghép chuỗi để tương thích với mock logic kiểm tra vùng ven hiện tại
    const fullToProvinceStr = `${selectedWard.name}, ${selectedDistrict.name}, ${selectedProvince.name}`;

    try {
      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromProvince, toProvince: fullToProvinceStr, weight }),
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
    if (!phone.trim() || !addressDetail.trim() || !startDate) {
      setError("Vui lòng nhập đủ Ngày, SĐT và chi tiết địa chỉ");
      return;
    }
    
    // Validate Regex cơ bản ở Client
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(phone)) {
      setError("Số điện thoại không đúng định dạng (Ví dụ: 0987654321)");
      return;
    }
    if (addressDetail.length < 5) {
      setError("Địa chỉ nhận hàng quá ngắn, vui lòng nhập rõ số nhà, tên đường.");
      return;
    }

    setError("");
    setIsProcessingPayment(true);

    try {
      const userId = localStorage.getItem("cloop_user_id");
      if (!userId) {
        throw new Error("Vui lòng đăng nhập để tiếp tục thanh toán");
      }

      const fullToProvinceStr = `${selectedWard.name}, ${selectedDistrict.name}, ${selectedProvince.name}`;
      const payload = {
        productId,
        userId,
        shippingToken: selectedQuote.token,
        buyerAddress: `${addressDetail}, ${fullToProvinceStr}`,
        buyerPhone: phone,
        startDate: startDate,
        packageDays: selectedTier.days
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const totalAmount = (selectedTier?.price || 0) + depositPrice + (selectedQuote?.quote.fee || 0);

  // Tính endDate tạm thời cho UI
  const calculateEndDate = () => {
    if (!startDate || !selectedTier) return "";
    const start = new Date(startDate);
    const end = new Date(start.getTime() + selectedTier.days * 86400000);
    return end.toLocaleDateString('vi-VN');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-100 flex flex-col h-fit">
      <h2 className="font-heading text-2xl text-[#0A2517] font-bold mb-6">Thông tin nhận hàng & Lịch thuê</h2>
      
      {/* Smart Pricing Tiers */}
      <div className="mb-6 space-y-3">
        <label className="block text-sm font-ui text-stone-600 font-bold mb-2">Chọn gói thuê</label>
        <div className="grid grid-cols-1 gap-3">
          {pricingTiers.map((tier, idx) => (
            <div 
              key={idx}
              onClick={() => setSelectedTier(tier)}
              className={`p-4 border rounded cursor-pointer transition-all ${
                selectedTier.days === tier.days 
                  ? 'border-[#0A2517] bg-emerald-50 ring-1 ring-[#0A2517]' 
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-ui font-bold text-[#0A2517]">{tier.name} ({tier.days} ngày)</span>
                <span className="font-heading font-bold text-emerald-600">{tier.price.toLocaleString('vi-VN')}đ</span>
              </div>
              <p className="text-xs text-stone-500">{tier.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Date Picker */}
      <div className="mb-6 p-4 bg-stone-50 rounded border border-stone-100">
        <label className="block text-sm font-ui text-stone-600 font-bold mb-2">Ngày dự kiến nhận đồ (Start Date)</label>
        <input 
          type="date" 
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full px-3 py-2 border border-stone-200 rounded font-ui focus:outline-none focus:border-[#0A2517] mb-2"
          min={new Date().toISOString().split('T')[0]} // Không cho phép chọn ngày quá khứ
        />
        {startDate && (
          <p className="text-sm text-stone-600 mt-2">
            Ngày trả đồ dự kiến: <span className="font-bold text-[#0A2517]">{calculateEndDate()}</span>
          </p>
        )}
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-ui text-stone-600 mb-1">Khu vực giao hàng (Tỉnh - Huyện - Xã)</label>
          <div className="flex flex-col gap-2">
            <select
              value={selectedProvince?.id || ""}
              onChange={(e) => {
                const p = provinces.find((x) => x.ProvinceID == e.target.value);
                setSelectedProvince(p ? { id: p.ProvinceID, name: p.ProvinceName } : null);
              }}
              className="w-full px-3 py-2 border border-stone-200 rounded font-ui focus:outline-none focus:border-[#0A2517] bg-white"
            >
              <option value="">-- Chọn Tỉnh/Thành phố --</option>
              {provinces.map((p) => (
                <option key={p.ProvinceID} value={p.ProvinceID}>{p.ProvinceName}</option>
              ))}
            </select>

            <select
              value={selectedDistrict?.id || ""}
              onChange={(e) => {
                const d = districts.find((x) => x.DistrictID == e.target.value);
                setSelectedDistrict(d ? { id: d.DistrictID, name: d.DistrictName } : null);
              }}
              disabled={!selectedProvince}
              className="w-full px-3 py-2 border border-stone-200 rounded font-ui focus:outline-none focus:border-[#0A2517] bg-white disabled:bg-stone-50"
            >
              <option value="">-- Chọn Quận/Huyện --</option>
              {districts.map((d) => (
                <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>
              ))}
            </select>

            <select
              value={selectedWard?.id || ""}
              onChange={(e) => {
                const w = wards.find((x) => x.WardCode == e.target.value);
                setSelectedWard(w ? { id: w.WardCode, name: w.WardName } : null);
              }}
              disabled={!selectedDistrict}
              className="w-full px-3 py-2 border border-stone-200 rounded font-ui focus:outline-none focus:border-[#0A2517] bg-white disabled:bg-stone-50"
            >
              <option value="">-- Chọn Phường/Xã --</option>
              {wards.map((w) => (
                <option key={w.WardCode} value={w.WardCode}>{w.WardName}</option>
              ))}
            </select>
          </div>
          {isLoadingShipping && <div className="mt-2 text-sm text-[#0A2517] flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Đang tính phí ship...</div>}
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
