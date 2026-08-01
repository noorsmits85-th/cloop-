"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { CreditCard, X, QrCode, CheckCircle2, Star, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { createPayOSPaymentLink } from "@/app/actions/payment";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface RentalBookingBoxProps {
  productId: string;
  ownerId?: string; // Nhận ID chủ đồ để quét tính sao uy tín thật trên database
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
  listingType, 
  depositPercent = 0,
  ownerName,
  ownerPhone,
  ownerAddress
}: RentalBookingBoxProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [renterName, setRenterName] = useState("");
  const [renterPhone, setRenterPhone] = useState(""); 
  
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // States quản lý dữ liệu xếp hạng sao thật của chủ tủ đồ bốc từ database
  const [ownerRating, setOwnerRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number>(0);

  const today = new Date().toISOString().slice(0, 10);
  const currentServiceFee = 0; 
  const originalServiceFee = 10000;

  const activePrice = price ?? rentalPricePerDay ?? 0; 
  
  let activeType: "RENT" | "SELL" = "RENT";
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get("type");
    if (typeParam === "sell") activeType = "SELL";
  }
  
  const finalListingType = listingType ?? activeType;
  const isRental = finalListingType === "RENT";
  
  const days = isRental && startDate && endDate ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1) : 0;
  const subTotal = isRental ? (days > 0 ? days * activePrice : 0) : activePrice; 
  const depositAmount = isRental && days > 0 ? Number(depositPercent) : 0;
  
  const totalInvoicePrice = isRental 
    ? (days > 0 ? subTotal + depositAmount + currentServiceFee : 0)
    : (activePrice + currentServiceFee);

  const finalOwnerName = ownerName || "Chủ tủ đồ ẩn danh";
  const finalOwnerPhone = ownerPhone || "Chưa cập nhật SĐT";
  const finalOwnerAddress = ownerAddress || "Chưa cập nhật địa chỉ";

  // 📡 HIỆU ỨNG TRUY VẤN: Lấy điểm đánh giá trung bình thực tế của chủ tủ đồ từ Database thật
  useEffect(() => {
    if (!ownerId) return;

    async function fetchOwnerReviewStats() {
      try {
        const { data, error } = await supabase
          .from("Review")
          .select("rating")
          .eq("revieweeId", ownerId)
          .eq("type", "RENTER_TO_OWNER");

        if (error) throw error;

        if (data && data.length > 0) {
          const sum = data.reduce((acc, curr) => acc + curr.rating, 0); // 🟢 ĐÃ SỬA: Đổi item thành curr để hết sạch lỗi bốc hơi dữ liệu
          const avg = Number((sum / data.length).toFixed(1));
          setOwnerRating(avg);
          setReviewCount(data.length);
        }
      } catch (err) {
        console.error("🚨 [CLOOP RATING ERROR] Thất bại khi bốc tách điểm uy tín chủ tủ đồ:", err);
      }
    }

    fetchOwnerReviewStats();
  }, [ownerId]);

  const handleActivatePayment = async () => {
    let currentUserId = null;
    if (typeof window !== "undefined") {
      currentUserId = localStorage.getItem("cloop_user_id");
    }

    if (!currentUserId) {
      alert("Yêu cầu hệ thống: Bạn ơi, vui lòng đăng nhập tài khoản thông qua cổng ID Xanh trước để thực hiện ký quỹ bảo chứng giao dịch nhé! 😊");
      return;
    }

    if (!renterName.trim()) { alert(`Vui lòng nhập tên người ${isRental ? "thuê" : "mua"} để CLOOP bảo chứng nhé!`); return; }
    if (!renterPhone.trim()) { alert(`Vui lòng nhập số điện thoại người ${isRental ? "thuê" : "mua"} nhé!`); return; }
    
    if (isRental) {
      if (!startDate || !endDate) { alert("Vui lòng chọn ngày bắt đầu và kết thúc thuê."); return; }
      if (new Date(endDate) < new Date(startDate)) { alert("Ngày kết thúc phải sau ngày bắt đầu."); return; }
    }
    if (!agreedToTerms) { alert(`Bạn ơi, vui lòng tích chọn đồng ý với Điều khoản và cam kết bảo chứng của CLOOP nhé! 😊`); return; }

    setIsSubmitting(true);
    try {
      if (isRental) {
        const { data: overlapping } = await supabase.from("rental_history").select("start_date, end_date").eq("product_id", productId).eq("status", "active");
        const hasConflict = (overlapping || []).some((r: any) => startDate <= r.end_date && endDate >= r.start_date);
        
        if (hasConflict) {
          alert("Rất tiếc, sản phẩm đã có người đặt thuê trong khoảng thời gian này. Vui lòng chọn ngày khác!");
          setIsSubmitting(false);
          return;
        }
      }
      
      setIsRedirecting(true);
      const payosResult = await createPayOSPaymentLink(productId); // FIXME: server action expects rentalId, but we don't have it yet!
      
      if (!payosResult.success) {
        alert("Lỗi khởi tạo cổng thanh toán: " + payosResult.error);
        setIsSubmitting(false);
        setIsRedirecting(false);
        return;
      }
      
      window.location.href = payosResult.checkoutUrl as string;
      
    } catch (err: any) {
      alert(`Lỗi hệ thống: ${err.message}`);
      setIsSubmitting(false);
      setIsRedirecting(false);
    }
  };
  // Hàm confirmManualTransfer đã bị xóa vì dùng Webhook
  return (
    <div className="space-y-4 pt-4 border-t border-stone-200">
      
      {/* KHỐI HIỂN THỊ CHỈ SỐ UY TÍN CHỦ ĐỒ (DIGITAL SOCIAL PROOF) */}
      <div className="flex items-center gap-2 bg-[#FBFDFB] border border-emerald-600/10 p-3.5 rounded-2xl text-xs text-left">
        <Star size={15} className="fill-amber-400 text-amber-400 shrink-0" />
        <p className="text-emerald-950 font-normal">
          Chỉ số uy tín chủ tủ đồ:{" "}
          <strong className="text-stone-900 font-bold">
            {ownerRating !== null ? `${ownerRating} / 5.0 ★` : "Cực tốt (5.0★)"}
          </strong>
          {reviewCount > 0 ? ` (${reviewCount} lượt phản hồi tuần hoàn)` : " (Thành viên uy tín mới)"}
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-[#183A2D] uppercase tracking-wider mb-1.5">Tên người {isRental ? "thuê" : "mua"} *</label>
            <input type="text" placeholder={isRental ? "Nhập tên người thuê..." : "Nhập tên người mua..."} value={renterName} onChange={(e) => setRenterName(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-[#E9E2D8] text-xs focus:outline-none focus:border-green-800 bg-white" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#183A2D] uppercase tracking-wider mb-1.5">Số điện thoại liên hệ *</label>
            <input type="tel" placeholder={`Nhập SĐT người ${isRental ? "thuê" : "mua"}...`} value={renterPhone} onChange={(e) => setRenterPhone(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-[#E9E2D8] text-xs focus:outline-none focus:border-green-800 bg-white font-mono" />
          </div>
        </div>
        
        {isRental && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-[#183A2D] uppercase tracking-wider mb-1.5">Từ ngày</label>
              <input type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-3 rounded-2xl border border-[#E9E2D8] text-xs focus:outline-none focus:border-green-800 bg-white" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#183A2D] uppercase tracking-wider mb-1.5">Đến ngày</label>
              <input type="date" min={startDate || today} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-3 rounded-2xl border border-[#E9E2D8] text-xs focus:outline-none focus:border-green-800 bg-white" />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white/50 p-4 rounded-2xl border border-[#E9E2D8] space-y-3">
        <div className="flex justify-between text-xs text-gray-500">
          <span>{isRental ? `Chi phí thuê (${days} ngày):` : "Giá sản phẩm:"}</span>
          <span className="font-mono font-semibold text-stone-900">{subTotal.toLocaleString()}đ</span>
        </div>
        
        {isRental && (
          <div className="flex justify-between text-xs text-amber-700 font-semibold">
            <span>Tiền cọc bảo chứng (Yêu cầu từ chủ tủ):</span>
            <span className="font-mono">+{depositAmount.toLocaleString()}đ</span>
          </div>
        )}
        
        <div className="flex justify-between items-center text-xs">
          <span>Phí dịch vụ tuần hoàn (Nền tảng):</span>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-stone-400 line-through">
              +{isRental ? (days > 0 ? (originalServiceFee * days).toLocaleString() : 0) : originalServiceFee.toLocaleString()}đ
            </span>
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] tracking-wide uppercase">
              FREE LAUNCH
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center text-xs font-bold border-t border-stone-200 pt-3 mt-2">
          <span className="text-gray-700 uppercase">TỔNG HÓA ĐƠN ĐẶT {isRental ? "THUÊ" : "MUA"}:</span>
          <span className="text-xl font-mono text-[#183A2D] font-black">{totalInvoicePrice.toLocaleString()}đ</span>
        </div>

        <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3.5 flex items-start gap-3 mt-4">
          <input type="checkbox" id="legal-checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="mt-0.5 w-4 h-4 text-green-800 border-gray-300 rounded cursor-pointer" />
          <label htmlFor="legal-checkbox" className="text-[11px] text-amber-900 leading-relaxed cursor-pointer select-none text-left">
            Tôi xác nhận đồng ý cho CLOOP xử lý dữ liệu và cam kết <strong>ký quỹ bảo chứng số tiền {totalInvoicePrice.toLocaleString()}đ</strong>. Thông tin liên hệ chính thức của người đăng bài sẽ hiển thị ngay sau khi hệ thống ghi nhận dòng tiền bảo chứng.
          </label>
        </div>

        <button onClick={handleActivatePayment} disabled={isSubmitting || isRedirecting} className="w-full py-4 bg-[#183A2D] text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-[#23452F] transition-all shadow-md flex items-center justify-center gap-2 mt-2">
          <ShieldCheck size={16} className={isRedirecting ? "animate-pulse" : ""} /> {isRedirecting ? "ĐANG KẾT NỐI PAYOS..." : (isSubmitting ? "ĐANG XỬ LÝ..." : `BẢO CHỨNG BẰNG PAYOS ➔`)}
        </button>
      </div>

      {/* Xóa Modal QR tĩnh */}
    </div>
  );
}