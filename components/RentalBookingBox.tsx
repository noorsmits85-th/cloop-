"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Calendar, Clock, ArrowRight, Check, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface RentalBookingBoxProps {
  productId: string;
  ownerId?: string;
  rentalPricePerDay?: number; 
  price?: number;             
  listingType?: "RENT" | "SELL"; 
  depositPercent?: number; 
  ownerName?: string;    
  ownerPhone?: string;   
  ownerAddress?: string; 
}

export default function RentalBookingBox({ 
  productId, 
  ownerId,
  rentalPricePerDay, 
  price, 
  listingType = "RENT", 
  depositPercent = 0,
  ownerName,
  ownerPhone,
  ownerAddress
}: RentalBookingBoxProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [rentalPackage, setRentalPackage] = useState<1 | 3 | 7>(3);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Điểm đánh giá trung bình thật của chủ tủ từ Database
  const [ownerRating, setOwnerRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number>(0);

  const activePrice = price ?? rentalPricePerDay ?? 0; 
  const isRental = listingType === "RENT";
  
  // Tính ngày kết thúc
  const endDate = new Date(new Date(startDate).getTime() + (rentalPackage - 1) * 86400000).toISOString().slice(0, 10);

  // Chiết khấu gói thuê
  const getPackagePrice = (pkg: 1 | 3 | 7) => {
    if (pkg === 1) return activePrice;
    if (pkg === 3) return Math.round(activePrice * 3 * 0.85 / 1000) * 1000;
    if (pkg === 7) return Math.round(activePrice * 7 * 0.70 / 1000) * 1000;
    return activePrice;
  };

  const selectedRentalFee = isRental ? getPackagePrice(rentalPackage) : activePrice;
  const depositAmount = isRental ? Number(depositPercent || 0) : 0;
  const estimatedTotal = selectedRentalFee + depositAmount;

  // Lấy review thật của chủ đồ
  useEffect(() => {
    if (!ownerId) return;
    async function fetchOwnerStats() {
      try {
        const { data, error } = await supabase
          .from("Review")
          .select("rating")
          .eq("revieweeId", ownerId);

        if (!error && data && data.length > 0) {
          const sum = data.reduce((acc: number, curr: any) => acc + (curr.rating || 5), 0);
          setOwnerRating(Number((sum / data.length).toFixed(1)));
          setReviewCount(data.length);
        }
      } catch (err) {}
    }
    fetchOwnerStats();
  }, [ownerId]);

  const handleProceedToCheckout = () => {
    if (!agreedToTerms) {
      alert("Vui lòng đồng ý với cam kết bảo chứng tuần hoàn để tiếp tục!");
      return;
    }
    setIsSubmitting(true);
    router.push(`/checkout/${productId}?package=${rentalPackage}&startDate=${startDate}&type=${isRental ? 'rent' : 'sell'}`);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E9E2D8] p-5 sm:p-6 shadow-xs space-y-5 font-body text-[#183A2D] antialiased">
      
      {/* 1. THẺ THÔNG TIN CHỦ TỦ ĐỒ */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#E5EFE2] text-[#183A2D] flex items-center justify-center font-bold text-xs font-heading">
            {ownerName ? ownerName.charAt(0).toUpperCase() : "C"}
          </div>
          <div>
            <p className="text-xs font-bold text-[#0A2517] leading-none">
              {ownerName || "Thành viên CLOOP"}
            </p>
            <p className="text-[10px] text-stone-400 mt-0.5">
              Chủ tủ đồ đã xác minh danh tính
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-800 bg-[#EAF2EC] px-2.5 py-1 rounded-full border border-emerald-200/60 font-ui">
          <ShieldCheck size={12} className="text-emerald-700" /> Đã xác thực
        </span>
      </div>

      {/* 2. CHỌN GÓI THUÊ (NẾU LÀ THUÊ) */}
      {isRental && (
        <div className="space-y-2.5">
          <div className="flex justify-between items-baseline">
            <span className="text-[10.5px] uppercase font-bold tracking-wider text-stone-600 font-ui">
              Chọn Gói Thuê
            </span>
            <span className="text-[10.5px] text-emerald-800 font-medium">
              Tiết kiệm đến 30%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { days: 1 as const, name: "1 Ngày", discount: null },
              { days: 3 as const, name: "3 Ngày", discount: "-15%" },
              { days: 7 as const, name: "7 Ngày", discount: "-30%" },
            ].map((pkg) => {
              const isSelected = rentalPackage === pkg.days;
              const pkgPrice = getPackagePrice(pkg.days);

              return (
                <button
                  key={pkg.days}
                  type="button"
                  onClick={() => setRentalPackage(pkg.days)}
                  className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected 
                      ? "bg-[#183A2D] text-white border-[#183A2D] shadow-xs" 
                      : "bg-[#FAF9F5] text-stone-700 border-stone-200 hover:border-[#183A2D]/40"
                  }`}
                >
                  {pkg.discount && (
                    <span className={`absolute -top-1.5 -right-1 text-[8.5px] font-bold px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? "bg-amber-400 text-amber-950" : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {pkg.discount}
                    </span>
                  )}
                  <span className="text-xs font-bold font-ui">{pkg.name}</span>
                  <span className={`text-[11px] font-mono mt-1 font-semibold ${
                    isSelected ? "text-emerald-200" : "text-[#183A2D]"
                  }`}>
                    {pkgPrice.toLocaleString("vi-VN")}đ
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. LỊCH DỰ KIẾN NHẬN & TRẢ */}
      {isRental && (
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div>
            <label className="block text-[10.5px] font-bold text-stone-600 uppercase tracking-wider mb-1 font-ui">
              Từ Ngày
            </label>
            <input 
              type="date"
              value={startDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-medium focus:outline-none focus:border-[#183A2D] bg-[#FAF9F5] text-[#183A2D]"
            />
          </div>

          <div>
            <label className="block text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mb-1 font-ui">
              Đến Ngày (Tự động)
            </label>
            <div className="px-3 py-2 rounded-xl border border-stone-100 text-xs text-stone-500 bg-stone-50/80 font-mono">
              {new Date(endDate).toLocaleDateString("vi-VN")}
            </div>
          </div>
        </div>
      )}

      {/* 4. BẢNG KÊ CHI PHÍ TẠM TÍNH */}
      <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-stone-200/70 space-y-2 text-xs">
        <div className="flex justify-between items-center text-stone-600">
          <span>{isRental ? `Giá thuê gói (${rentalPackage} ngày):` : "Giá bán sở hữu:"}</span>
          <span className="font-mono font-bold text-[#0A2517]">
            {selectedRentalFee.toLocaleString("vi-VN")}đ
          </span>
        </div>

        {isRental && depositAmount > 0 && (
          <div className="flex justify-between items-center text-amber-800">
            <span className="flex items-center gap-1">
              <ShieldCheck size={12} className="text-amber-700" /> Tiền cọc Két Escrow:
            </span>
            <span className="font-mono font-bold">
              +{depositAmount.toLocaleString("vi-VN")}đ
            </span>
          </div>
        )}

        <div className="flex justify-between items-center text-stone-500 text-[11px]">
          <span>Phí dịch vụ tuần hoàn:</span>
          <span className="text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
            FREE LAUNCH (0đ)
          </span>
        </div>

        <div className="pt-2 border-t border-stone-200/80 flex justify-between items-baseline">
          <div>
            <span className="text-xs font-bold text-[#0A2517]">Tạm tính đơn hàng:</span>
            <p className="text-[9.5px] text-stone-400">Chưa bao gồm cước ship GHN</p>
          </div>
          <span className="font-heading text-lg font-black text-[#183A2D] font-mono">
            {estimatedTotal.toLocaleString("vi-VN")}đ
          </span>
        </div>
      </div>

      {/* 5. ĐIỀU KHOẢN & NÚT TIẾP TỤC */}
      <div className="space-y-3">
        <label className="flex items-start gap-2 text-[11px] text-stone-600 leading-relaxed cursor-pointer select-none">
          <input 
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-0.5 w-3.5 h-3.5 rounded text-[#183A2D] accent-[#183A2D] cursor-pointer shrink-0"
          />
          <span>
            Tôi đồng ý với cam kết bảo chứng tuần hoàn. Tiền cọc được giữ an toàn trong Két Escrow và tự động hoàn trả khi trả trang phục.
          </span>
        </label>

        <button
          type="button"
          onClick={handleProceedToCheckout}
          disabled={isSubmitting}
          className="w-full py-3.5 bg-[#183A2D] hover:bg-[#0A2517] text-white rounded-xl font-ui font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50"
        >
          <span>{isRental ? "Tiếp Tục Đặt Thuê" : "Tiếp Tục Mua Hàng"}</span>
          <ArrowRight size={14} />
        </button>
      </div>

    </div>
  );
}
