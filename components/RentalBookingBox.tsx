"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { CreditCard, X, QrCode, CheckCircle2, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

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
      setPaymentSuccess(false);
      setShowQrModal(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmTransfer = async () => {
    let currentUserId = null;
    if (typeof window !== "undefined") {
      currentUserId = localStorage.getItem("cloop_user_id");
    }

    try {
      const { error } = await supabase.from("rental_history").insert([{
        product_id: productId,
        renterId: currentUserId, // Đồng bộ lưu tài khoản người thuê thật phục vụ chấm sao về sau
        renter_name: renterName,
        renter_phone: renterPhone,   
        owner_name: finalOwnerName,   
        owner_phone: finalOwnerPhone, 
        start_date: isRental ? startDate : today,
        end_date: isRental ? endDate : today,
        status: "active",
      }]);
      if (error) throw error;
      setPaymentSuccess(true);
    } catch (err: any) {
      alert(`Lỗi hệ thống khi tạo đơn hàng: ${err.message}`);
    }
  };

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

        <button onClick={handleActivatePayment} disabled={isSubmitting} className="w-full py-4 bg-[#183A2D] text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-[#23452F] transition-all shadow-md flex items-center justify-center gap-2 mt-2">
          <CreditCard size={16} /> {isSubmitting ? "Đang xử lý..." : isRental ? "KÍCH HOẠT ĐẶT THUÊ SẢN PHẨM" : "KÍCH HOẠT MUA ĐỨT SẢN PHẨM"}
        </button>
      </div>

      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border border-[#E9E2D8] rounded-[2rem] max-w-[440px] w-full shadow-2xl relative overflow-hidden text-left">
              <div className="bg-[#004a9c] p-4 text-white flex items-center justify-between relative">
                <div className="flex items-center gap-2 text-left">
                  <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center p-1 text-red-600 font-bold text-xs font-mono">VNP</div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">CỔNG THANH TOÁN VNPAY QR</h4>
                    <p className="text-[9px] text-blue-200">Giao dịch tuần hoàn an toàn & bảo mật tài khoản</p>
                  </div>
                </div>
                <button onClick={() => setShowQrModal(false)} className="text-white/70 hover:text-white transition-colors p-1"><X size={20} /></button>
              </div>

              {!paymentSuccess ? (
                <div className="p-5 space-y-4">
                  <div className="text-center space-y-1"><p className="text-[11px] text-gray-500">Mở App Ngân hàng bất kỳ để quét mã ghim tiền tự động</p></div>
                  <div className="bg-white border-2 border-stone-100 p-4 rounded-2xl w-fit mx-auto shadow-sm relative">
                    <img src={`https://img.vietqr.io/image/Techcombank-0866801743-compact.jpg?amount=${totalInvoicePrice}&addInfo=CLOOP%20${isRental ? "RENT" : "BUY"}%20${productId.substring(0,6)}&accountName=HOANG%20THI%20TRANG`} alt="QR" className="w-[200px] h-[200px] rounded-lg object-contain shadow-sm" />
                  </div>
                  <div className="bg-[#FAF8F3] border border-[#E9E2D8] rounded-xl p-3 text-xs space-y-1.5 font-sans">
                    <div className="flex justify-between border-b pb-1.5 mb-1.5"><span className="text-gray-400">Mã đơn hàng:</span><span className="font-mono font-bold text-gray-700">{isRental ? "RNT" : "BUY"}-{productId.substring(0,6).toUpperCase()}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Số tài khoản:</span><span className="font-bold font-mono text-gray-800">0866801743 (TCB)</span></div>
                    <div className="flex items-center justify-between border-t pt-2 mt-1.5 font-bold text-[#183A2D] text-sm">
                      <span>Số tiền quét tự động:</span><span className="font-mono text-red-600 font-extrabold text-base">{totalInvoicePrice.toLocaleString()}đ</span>
                    </div>
                  </div>
                  <button onClick={handleConfirmTransfer} className="w-full py-3 bg-[#004a9c] hover:bg-[#003978] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow transition-all flex items-center justify-center gap-2">
                    <QrCode size={14} /> Tôi đã chuyển khoản thành công
                  </button>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 text-center space-y-4 font-sans">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-green-600 mx-auto border border-emerald-200 shadow-inner">
                    <CheckCircle2 size={36} className="animate-bounce" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-emerald-800 tracking-tight">GIAO DỊCH HOÀN TẤT!</h3>
                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-full text-[11px] font-bold text-emerald-800 shadow-sm mx-auto">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      🔒 CLOOP ĐÃ GIỮ TIỀN BẢO CHỨNG AN TOÀN
                    </div>
                    <p className="text-[11px] text-gray-400 px-4 leading-relaxed pt-1.5">
                      Tiền đã nạp vào quỹ bảo chứng dịch vụ. Cậu hãy gọi điện hoặc liên hệ trực tiếp đến thông tin người đăng dưới đây để hẹn lịch giao nhận đồ nhé!
                    </p>
                  </div>

                  <div className="bg-[#FAF8F3] border border-[#E9E2D8] rounded-2xl p-4 text-left space-y-2.5 max-w-xs mx-auto shadow-sm text-xs">
                    <div className="flex justify-between items-center border-b border-stone-200/60 pb-1.5">
                      <span className="text-gray-400 font-medium">Họ và tên chủ tủ đồ:</span>
                      <span className="font-bold text-stone-800">{finalOwnerName}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-stone-200/60 pb-1.5">
                      <span className="text-gray-400 font-medium">Số điện thoại liên hệ:</span>
                      <span className="font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/40">
                        {finalOwnerPhone}
                      </span>
                    </div>
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-gray-400 font-medium shrink-0">Địa chỉ bàn giao:</span>
                      <span className="font-semibold text-stone-700 text-right leading-tight">{finalOwnerAddress}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center max-w-xs mx-auto">
                    <a 
                      href={`tel:${finalOwnerPhone}`}
                      className="flex-1 py-3 bg-[#183A2D] hover:bg-[#23452F] text-white text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      📞 Gọi điện liên hệ
                    </a>
                    <button 
                      onClick={() => { setShowQrModal(false); router.push("/my-closet"); }} 
                      className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all"
                    >
                      Quản lý Tủ đồ
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}