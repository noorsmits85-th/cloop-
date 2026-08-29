"use client";

import { supabase } from "@/src/lib/supabase";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignedShippingQuote } from "@/src/utils/shipping";
import { Loader2, ShieldCheck, MapPin, Calendar, Clock, Sparkles } from "lucide-react";
import Image from "next/image";

export default function CheckoutClient({
  product,
  productId,
  fromProvince,
  weight,
  depositPrice,
  pricingTiers,
  turnaroundDays,
}: {
  product: any;
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
  
  // States cho Smart Pricing & Date (Mặc định gói 3 ngày)
  const [selectedTier, setSelectedTier] = useState<any>(pricingTiers[1] || pricingTiers[0]);
  const [startDate, setStartDate] = useState<string>(new Date(Date.now() + 86400000).toISOString().slice(0, 10));

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
    if (!startDate) {
      setError("⚠️ Bạn ơi, vui lòng chọn Ngày bắt đầu thuê nhé!");
      return;
    }
    if (!selectedProvince || !selectedDistrict || !selectedWard) {
      setError("⚠️ Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã để tính phí giao hàng!");
      return;
    }
    if (!addressDetail.trim() || addressDetail.trim().length < 3) {
      setError("⚠️ Vui lòng nhập địa chỉ chi tiết (Số nhà, tên đường...)");
      return;
    }
    if (!phone.trim()) {
      setError("⚠️ Vui lòng nhập số điện thoại người nhận hàng!");
      return;
    }
    
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
      setError("⚠️ Số điện thoại không đúng định dạng (Ví dụ: 0987654321)");
      return;
    }

    if (!selectedQuote) {
      setError("⚠️ Đang tính cước vận chuyển, vui lòng đợi 1 giây!");
      return;
    }

    setError("");
    setIsProcessingPayment(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
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
        // Chuyển hướng tới cổng thanh toán VietQR PayOS
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      setError(err.message);
      setIsProcessingPayment(false);
    }
  };

  const rentalFee = selectedTier?.price || 0;
  const shippingFee = selectedQuote?.quote.fee || 0;
  const totalAmount = rentalFee + depositPrice + shippingFee;

  const calculateEndDate = () => {
    if (!startDate || !selectedTier) return "";
    const start = new Date(startDate);
    const end = new Date(start.getTime() + (selectedTier.days - 1) * 86400000);
    return end.toLocaleDateString('vi-VN');
  };

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* CỘT TRÁI (5/12): THÔNG TIN ĐƠN HÀNG & BẢNG KÊ ĐỒNG BỘ ĐỘNG */}
      <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-6">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60 font-ui">
            HÓA ĐƠN ĐẶT THUÊ
          </span>
          <h2 className="font-heading text-xl text-[#0A2517] font-bold mt-2">Thông tin đơn hàng</h2>
        </div>
        
        {/* Khối Ảnh & Tên Sản Phẩm */}
        <div className="flex gap-4 pb-5 border-b border-stone-100">
          <div className="relative w-24 h-32 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
            <Image 
              src={product.images?.[0]?.url || product.image || "/placeholder-clothing.png"} 
              alt={product.title} 
              fill 
              className="object-cover" 
              unoptimized 
            />
          </div>
          
          <div className="flex flex-col justify-between">
            <div>
              <h3 className="font-heading font-bold text-base text-[#0A2517] leading-snug line-clamp-2">
                {product.title}
              </h3>
              <p className="text-xs text-stone-500 mt-1 font-body">Chủ tủ: <strong>{product.user?.name || "Thành viên CLOOP"}</strong></p>
              <p className="text-xs text-stone-500 font-body flex items-center gap-1 mt-0.5">
                <MapPin size={11} className="text-emerald-700" /> Giao từ: {product.province || fromProvince || "Toàn quốc"}
              </p>
            </div>
            
            <div className="text-xs font-mono text-stone-600 bg-[#FAF9F5] p-2 rounded-lg border border-stone-100">
              Đơn giá gốc: <strong className="text-stone-900 font-bold">{(product.listings?.[0]?.basePrice || 0).toLocaleString('vi-VN')}đ/ngày</strong>
            </div>
          </div>
        </div>
        
        {/* Bảng Kê Chi Phí Đồng Bộ Thời Gian Thực */}
        <div className="space-y-3 font-ui text-xs text-stone-600">
          
          <div className="flex justify-between items-center py-1">
            <span className="font-medium text-stone-800 flex items-center gap-1.5">
              <Clock size={13} className="text-emerald-800" />
              Chi phí gói thuê <strong>({selectedTier?.days || 1} ngày)</strong>:
            </span>
            <span className="font-bold font-mono text-sm text-[#0A2517]">
              {rentalFee.toLocaleString('vi-VN')}đ
            </span>
          </div>

          <div className="flex justify-between items-center py-1 text-amber-900 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/60">
            <div>
              <p className="font-bold flex items-center gap-1">
                <ShieldCheck size={14} className="text-amber-700" /> Tiền cọc Két Escrow:
              </p>
              <span className="text-[10px] text-amber-700">Tự động hoàn trả 100% khi trả váy</span>
            </div>
            <span className="font-bold font-mono text-sm">+{depositPrice.toLocaleString('vi-VN')}đ</span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span>Phí vận chuyển giao nhận (GHN):</span>
            <span className="font-bold font-mono text-stone-900">
              {isLoadingShipping ? "Đang tính..." : selectedQuote ? `+${shippingFee.toLocaleString('vi-VN')}đ` : "Chưa chọn địa chỉ"}
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span>Phí dịch vụ tuần hoàn (Nền tảng):</span>
            <div className="flex items-center gap-2">
              <span className="text-stone-400 line-through font-mono">15.000đ</span>
              <span className="font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded text-[10px] font-ui">
                FREE LAUNCH
              </span>
            </div>
          </div>

          {/* Tổng Hóa Đơn */}
          <div className="pt-4 border-t border-stone-200 flex justify-between items-baseline">
            <div>
              <span className="text-xs uppercase font-bold text-stone-500 tracking-wider">Tổng thanh toán:</span>
              <p className="text-[10px] text-stone-400">Bao gồm cọc hoàn lại và phí ship</p>
            </div>
            <span className="font-heading text-2xl font-black text-[#183A2D] font-mono">
              {totalAmount.toLocaleString('vi-VN')}đ
            </span>
          </div>
        </div>

        {/* Khối Cam Kết Bảo Hiểm */}
        <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E9E2D8] text-[11px] text-stone-600 space-y-1.5 font-body">
          <p className="font-bold text-emerald-950 flex items-center gap-1.5">
            <Sparkles size={13} className="text-emerald-700" /> Cam Kết Bảo Chứng CLOOP
          </p>
          <p className="text-stone-500 leading-relaxed">
            Tiền của bạn được giữ an toàn trong Két Escrow và chỉ giải ngân cho chủ tủ khi bạn đã nhận đồ đúng mẫu, đúng size.
          </p>
        </div>

      </div>

      {/* CỘT PHẢI (7/12): FORM NHẬP LỊCH THUÊ, ĐỊA CHỈ GHN & NÚT PAYOS */}
      <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col space-y-6">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60 font-ui">
            BƯỚC GIAO NHẬN
          </span>
          <h2 className="font-heading text-xl text-[#0A2517] font-bold mt-2">Thông tin nhận hàng & Lịch thuê</h2>
        </div>
        
        {/* 1. CHỌN GÓI THUÊ THÔNG MINH */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-ui">
            1. Chọn gói thuê (Tiết kiệm đến 25%)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {pricingTiers.map((tier, idx) => (
              <div 
                key={idx}
                onClick={() => setSelectedTier(tier)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  selectedTier?.days === tier.days 
                    ? 'border-[#183A2D] bg-[#F4F9F5] shadow-xs ring-1 ring-[#183A2D]' 
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-ui font-bold text-xs text-[#0A2517]">{tier.name}</span>
                  </div>
                  <p className="text-[10px] text-stone-500 line-clamp-1">{tier.description}</p>
                </div>
                <div className="pt-2 mt-2 border-t border-stone-100 flex justify-between items-baseline">
                  <span className="text-[10px] font-bold text-emerald-800 font-mono">{tier.days} ngày</span>
                  <span className="font-bold text-sm font-mono text-[#183A2D]">{tier.price.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. CHỌN NGÀY BẮT ĐẦU */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-ui">
            2. Ngày dự kiến nhận đồ (Bắt đầu lịch thuê)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <input 
                type="date"
                value={startDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-3 border border-stone-200 rounded-xl font-ui text-xs font-medium focus:outline-none focus:border-[#183A2D] bg-white"
              />
            </div>
            <div className="bg-[#FAF9F5] px-3.5 py-2.5 rounded-xl border border-stone-100 flex flex-col justify-center">
              <span className="text-[10px] text-stone-400 font-ui uppercase tracking-wider">Dự kiến hoàn trả đồ:</span>
              <span className="text-xs font-bold text-[#183A2D] font-mono mt-0.5">
                📅 {calculateEndDate() || "Vui lòng chọn ngày bắt đầu"}
              </span>
            </div>
          </div>
        </div>

        {/* 3. ĐỊA CHỈ NHẬN HÀNG (GHN 3 CẤP) */}
        <div className="space-y-3 pt-2 border-t border-stone-100">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-ui">
            3. Địa chỉ giao nhận tận nhà (Tính cước GHN)
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <select
              value={selectedProvince?.id || ""}
              onChange={(e) => {
                const p = provinces.find((x) => String(x.ProvinceID) === String(e.target.value));
                setSelectedProvince(p ? { id: p.ProvinceID, name: p.ProvinceName } : null);
              }}
              className="w-full px-3 py-2.5 border border-stone-200 rounded-xl font-ui text-xs focus:outline-none focus:border-[#183A2D] bg-white"
            >
              <option value="">-- Chọn Tỉnh/Thành --</option>
              {provinces.map((p) => (
                <option key={p.ProvinceID} value={p.ProvinceID}>{p.ProvinceName}</option>
              ))}
            </select>

            <select
              value={selectedDistrict?.id || ""}
              onChange={(e) => {
                const d = districts.find((x) => String(x.DistrictID) === String(e.target.value));
                setSelectedDistrict(d ? { id: d.DistrictID, name: d.DistrictName } : null);
              }}
              disabled={!selectedProvince}
              className="w-full px-3 py-2.5 border border-stone-200 rounded-xl font-ui text-xs focus:outline-none focus:border-[#183A2D] bg-white disabled:bg-stone-50 disabled:text-stone-400"
            >
              <option value="">-- Chọn Quận/Huyện --</option>
              {districts.map((d) => (
                <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>
              ))}
            </select>

            <select
              value={selectedWard?.id || ""}
              onChange={(e) => {
                const w = wards.find((x) => String(x.WardCode) === String(e.target.value));
                setSelectedWard(w ? { id: w.WardCode, name: w.WardName } : null);
              }}
              disabled={!selectedDistrict}
              className="w-full px-3 py-2.5 border border-stone-200 rounded-xl font-ui text-xs focus:outline-none focus:border-[#183A2D] bg-white disabled:bg-stone-50 disabled:text-stone-400"
            >
              <option value="">-- Chọn Phường/Xã --</option>
              {wards.map((w) => (
                <option key={w.WardCode} value={w.WardCode}>{w.WardName}</option>
              ))}
            </select>
          </div>

          {isLoadingShipping && (
            <div className="text-xs text-emerald-800 flex items-center gap-2 font-ui animate-pulse">
              <Loader2 size={13} className="animate-spin" /> Đang tính cước phí vận chuyển GHN tối ưu nhất...
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-stone-600 mb-1 font-ui">Số nhà, tên đường *</label>
              <input 
                type="text" 
                placeholder="Ví dụ: 124 Lê Lợi, Tòa A..."
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl font-ui text-xs focus:outline-none focus:border-[#183A2D] bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-600 mb-1 font-ui">Số điện thoại nhận hàng *</label>
              <input 
                type="tel" 
                placeholder="Ví dụ: 0987654321..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl font-ui text-xs font-mono focus:outline-none focus:border-[#183A2D] bg-white"
              />
            </div>
          </div>
        </div>

        {/* Thông báo lỗi nếu thiếu */}
        {error && (
          <div className="text-red-700 text-xs font-ui p-3.5 bg-red-50 rounded-xl border border-red-200 flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {/* NÚT BẤM THANH TOÁN PAYOS */}
        <div className="pt-2 mt-auto">
          <button 
            onClick={handleCheckout}
            disabled={isProcessingPayment}
            className="w-full py-4 bg-[#183A2D] hover:bg-[#0A2517] text-white rounded-2xl font-ui font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
          >
            {isProcessingPayment ? (
              <>
                <Loader2 size={18} className="animate-spin" /> ĐANG TẠO MÃ VIETQR PAYOS...
              </>
            ) : (
              <>
                THANH TOÁN AN TOÀN ({totalAmount.toLocaleString('vi-VN')}đ) ➔
              </>
            )}
          </button>
          <p className="text-center text-[11px] text-stone-400 mt-2 font-ui">
            Chuyển khoản an toàn 24/7 qua mã VietQR Ngân hàng ACB
          </p>
        </div>

      </div>

    </div>
  );
}
