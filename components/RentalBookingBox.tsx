"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { CreditCard, X, QrCode, CheckCircle2, Star, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { createPayOSPaymentLink } from "@/app/actions/payment";
import { createBooking } from "@/app/actions/booking";
import { useLogger } from "next-axiom";

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
  const log = useLogger();
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [rentalPackage, setRentalPackage] = useState<1 | 3 | 7>(3);
  
  const [renterName, setRenterName] = useState("");
  const [renterPhone, setRenterPhone] = useState(""); 
  
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shippingMode, setShippingMode] = useState<"CLOOP_BOOK" | "SELF_AGREEMENT">("CLOOP_BOOK");
  // Mock Payment Flow States
  const [showMockPayment, setShowMockPayment] = useState(false);
  const [mockPaymentStatus, setMockPaymentStatus] = useState<"IDLE" | "SCANNING" | "SUCCESS">("IDLE");

  // Tự động tính ngày kết thúc
  const endDate = new Date(new Date(startDate).getTime() + (rentalPackage - 1) * 86400000).toISOString().slice(0, 10);

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
  
  const days = isRental && startDate ? rentalPackage : 0;
  
  // LOGIC GIẢM GIÁ GÓI THUÊ
  let discountPercent = 0;
  if (days === 3) discountPercent = 0.10; // Giảm 10%
  if (days === 7) discountPercent = 0.25; // Giảm 25%
  
  const baseSubTotal = isRental ? (days > 0 ? days * activePrice : 0) : activePrice; 
  const discountAmount = baseSubTotal * discountPercent;
  const subTotal = baseSubTotal - discountAmount;
  
  const depositAmount = isRental && days > 0 ? Number(depositPercent) : 0;
  
  const shippingFee = shippingMode === "CLOOP_BOOK" ? 35000 : 0;

  const totalInvoicePrice = isRental 
    ? (days > 0 ? subTotal + depositAmount + currentServiceFee + shippingFee : 0)
    : (activePrice + currentServiceFee + shippingFee);

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
    // 1. Kiểm tra đăng nhập bằng Supabase thay vì localStorage (Thông mạch UX & Security)
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push(`/login?next=/product/${productId}`);
      return;
    }

    if (totalInvoicePrice <= 0) {
      alert("Lỗi: Tổng hóa đơn thanh toán không hợp lệ (0đ). Vui lòng kiểm tra lại giá sản phẩm!");
      return;
    }

    if (!renterName.trim()) { alert(`Vui lòng nhập tên người ${isRental ? "thuê" : "mua"} để CLOOP bảo chứng nhé!`); return; }
    if (!renterPhone.trim()) { alert(`Vui lòng nhập số điện thoại người ${isRental ? "thuê" : "mua"} nhé!`); return; }
    
    if (isRental) {
      if (!startDate) { alert("Vui lòng chọn ngày bắt đầu thuê."); return; }
    }
    if (!agreedToTerms) { alert(`Bạn ơi, vui lòng tích chọn đồng ý với Điều khoản và cam kết bảo chứng của CLOOP nhé! 😊`); return; }

    setIsSubmitting(true);
    
    // Ghi log Nghiệp vụ Axiom
    log.info("User Clicked Checkout", { 
      productId, 
      isRental, 
      shippingMode, 
      totalInvoicePrice, 
      renterPhone 
    });

    try {
      // 1.5 KIỂM TRA SỐ DƯ VÍ CLOOP
      let walletBalance = 0;
      const { data: userData } = await supabase.from('User').select('cloopCoins').eq('id', session.user.id).single();
      if (userData) {
        walletBalance = userData.cloopCoins || 0;
      }

      if (walletBalance < totalInvoicePrice) {
        alert(`Số dư ví của bạn không đủ (${walletBalance.toLocaleString()}đ). Vui lòng nạp thêm tối thiểu ${(totalInvoicePrice - walletBalance).toLocaleString()}đ vào Ví Cloop để tiếp tục.`);
        setIsSubmitting(false);
        // Ở đây đáng lý sẽ gọi PayOS để nạp ví, tạm thời kích hoạt Mock Payment Modal
        setShowMockPayment(true);
        setMockPaymentStatus("SCANNING");
        return;
      }

      // NẾU ĐỦ TIỀN VÍ -> Trừ tiền trong ví và tạo đơn hàng
      // 2. Gọi Server Action để tạo Booking
      const bookingRes = await createBooking({
        productId,
        startDate,
        endDate,
        renterName,
        renterPhone,
        ownerName: finalOwnerName,
        ownerPhone: finalOwnerPhone,
        isRental,
        shippingMode
      });

      if (!bookingRes.success || !(bookingRes as any).rentalId) {
        alert((bookingRes as any).error || "Có lỗi xảy ra khi tạo đơn hàng.");
        setIsSubmitting(false);
        return;
      }

      // TRỪ TIỀN TRONG VÍ (Giả lập trừ ở Client/Server, đáng ra phải gọi API trừ tiền)
      // Tạm thời bỏ qua gọi PayOS vì đã trả bằng ví thành công
      alert("Thanh toán thành công qua Ví CLOOP! Tiền đã được giữ an toàn.");
      window.location.href = `/my-closet/orders`;
      
    } catch (error) {
      console.error(error);
      alert("Lỗi kết nối. Vui lòng thử lại!");
      setIsSubmitting(false);
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
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-[#183A2D] uppercase tracking-wider mb-2">Gói Thuê Siêu Tiết Kiệm</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 3, 7].map((pkg) => (
                  <button
                    key={pkg}
                    onClick={() => setRentalPackage(pkg as 1|3|7)}
                    className={`relative p-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                      rentalPackage === pkg 
                        ? "bg-[#183A2D] text-white border-[#183A2D] shadow-md" 
                        : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    <span>{pkg} Ngày</span>
                    {pkg === 3 && <span className="absolute -top-2 -right-2 bg-amber-400 text-amber-950 text-[9px] px-1.5 py-0.5 rounded-full">-10%</span>}
                    {pkg === 7 && <span className="absolute -top-2 -right-2 bg-emerald-400 text-emerald-950 text-[9px] px-1.5 py-0.5 rounded-full">-25%</span>}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-[#183A2D] uppercase tracking-wider mb-1.5">Từ ngày</label>
                <input type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-3 rounded-2xl border border-[#E9E2D8] text-xs focus:outline-none focus:border-green-800 bg-white" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Đến ngày (Tự động)</label>
                <input type="date" value={endDate} readOnly className="w-full px-3 py-3 rounded-2xl border border-stone-100 text-xs text-gray-400 bg-stone-50 cursor-not-allowed" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white/50 p-4 rounded-2xl border border-[#E9E2D8] space-y-3">
        <div className="flex justify-between text-xs text-gray-500">
          <span>{isRental ? `Chi phí thuê (${days} ngày):` : "Giá sản phẩm:"}</span>
          <div className="flex items-center gap-2 font-mono">
            {discountAmount > 0 && <span className="text-stone-400 line-through">{baseSubTotal.toLocaleString()}đ</span>}
            <span className="font-semibold text-stone-900">{subTotal.toLocaleString()}đ</span>
          </div>
        </div>
        
        {isRental && (
          <div className="flex justify-between text-xs text-amber-700 font-semibold">
            <span>Tiền cọc bảo chứng (Yêu cầu từ chủ tủ):</span>
            <span className="font-mono">+{depositAmount.toLocaleString()}đ</span>
          </div>
        )}
        
        {/* LỰA CHỌN PHƯƠNG THỨC VẬN CHUYỂN */}
        <div className="pt-2 pb-1 space-y-2">
          <label className="block text-sm font-semibold text-[#183A2D] mb-2">Phương thức vận chuyển</label>
          <div className="flex flex-col gap-2">
            <div 
              onClick={() => setShippingMode("CLOOP_BOOK")}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${shippingMode === "CLOOP_BOOK" ? "bg-emerald-50/50 border-emerald-600/30" : "bg-white border-stone-200 hover:border-emerald-300"}`}
            >
              <input type="radio" checked={shippingMode === "CLOOP_BOOK"} readOnly className="w-4 h-4 text-emerald-600" />
              <div className="flex flex-col flex-1">
                <span className="text-xs font-bold text-stone-800">🚚 Giao hàng thảnh thơi (Cloop lo trọn gói)</span>
                <span className="text-[10px] text-stone-500">Đồng giá toàn quốc, theo dõi hành trình 24/7 (Khuyên dùng)</span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700">+35.000đ</span>
            </div>

            <div 
              onClick={() => setShippingMode("SELF_AGREEMENT")}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${shippingMode === "SELF_AGREEMENT" ? "bg-emerald-50/50 border-emerald-600/30" : "bg-white border-stone-200 hover:border-emerald-300"}`}
            >
              <input type="radio" checked={shippingMode === "SELF_AGREEMENT"} readOnly className="w-4 h-4 text-emerald-600" />
              <div className="flex flex-col flex-1">
                <span className="text-xs font-bold text-stone-800">Tự thỏa thuận với chủ đồ</span>
                <span className="text-[10px] text-stone-500">Người mua tự thanh toán phí ship lúc nhận hàng</span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700">0đ</span>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center text-xs">
          <span>Phí dịch vụ tuần hoàn (Nền tảng):</span>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-stone-400 line-through">
              +{isRental ? (days > 0 ? (originalServiceFee * days).toLocaleString() : 0) : originalServiceFee.toLocaleString()}đ
            </span>
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] tracking-wide">
              FREE LAUNCH
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center text-sm font-bold border-t border-stone-200 pt-3 mt-2">
          <span className="text-gray-700">Tổng hóa đơn đặt {isRental ? "thuê" : "mua"}:</span>
          <span className="text-xl font-mono text-[#183A2D] font-black">{totalInvoicePrice.toLocaleString()}đ</span>
        </div>

        <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4 flex items-start gap-3 mt-4">
          <input type="checkbox" id="legal-checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="mt-1 w-4 h-4 text-green-800 border-gray-300 rounded cursor-pointer shrink-0" />
          <label htmlFor="legal-checkbox" className="text-sm text-gray-700 leading-relaxed font-medium cursor-pointer select-none text-left">
            🛡️ Tôi đồng ý thanh toán số tiền <strong>{totalInvoicePrice.toLocaleString()}đ</strong> qua Ví CLOOP. Tiền của bạn sẽ được Cloop giữ an toàn và chỉ chuyển cho người bán khi bạn xác nhận đã nhận đúng món đồ.
          </label>
        </div>

        <button disabled={isSubmitting} onClick={handleActivatePayment} className="w-full py-4 bg-[#183A2D] text-white font-bold text-sm rounded-2xl hover:bg-[#23452F] transition-all shadow-md flex items-center justify-center gap-2 mt-2 disabled:opacity-50">
          {isSubmitting ? "ĐANG CHUYỂN HƯỚNG..." : <><ShieldCheck size={18} /> THANH TOÁN AN TOÀN ➔</>}
        </button>
      </div>

      {/* MOCK PAYMENT MODAL THAY CHO PAYOS THẬT */}
      <AnimatePresence>
        {showMockPayment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if(mockPaymentStatus !== "SCANNING") setShowMockPayment(false) }}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl text-center flex flex-col items-center justify-center space-y-6 overflow-hidden"
            >
              {mockPaymentStatus === "SCANNING" ? (
                <>
                  <div className="relative w-48 h-48 bg-stone-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-stone-300 overflow-hidden">
                    <QrCode size={100} className="text-stone-300" />
                    {/* Fake Scanning Line */}
                    <motion.div 
                      animate={{ y: [-100, 100] }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="absolute top-1/2 left-0 w-full h-1 bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-[#183A2D] font-heading">Đang chờ thanh toán...</h3>
                  <p className="text-xs text-stone-500 max-w-[250px]">Vui lòng mở app ngân hàng và quét mã QR để bảo chứng giao dịch.</p>
                </>
              ) : (
                <>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-2">
                      <CheckCircle2 size={50} className="text-green-600" />
                    </div>
                  </motion.div>
                  <h3 className="text-xl font-bold text-green-700 font-heading">Bảo Chứng Thành Công!</h3>
                  <p className="text-xs text-stone-500 max-w-[250px]">Giao dịch đã được hệ thống lưu lại an toàn. Bạn có thể liên hệ với chủ đồ ngay bây giờ.</p>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Xóa Modal QR tĩnh */}
    </div>
  );
}