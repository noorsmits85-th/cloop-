"use client";

import React, { useState } from "react";
import { History, ShoppingBag, Star, X, Check, Truck, Package, RotateCcw, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=120";

function StatusStepper({ status }: { status: string }) {
  const steps = [
    { key: "pending_payment", label: "Chờ cọc", icon: <Package size={14} /> },
    { key: "active", label: "Đang giao", icon: <Truck size={14} /> },
    { key: "returning", label: "Trả đồ", icon: <RotateCcw size={14} /> },
    { key: "completed", label: "Hoàn tất", icon: <Check size={14} /> }
  ];

  let currentStepIndex = steps.findIndex(s => s.key === status);
  if (status === "disputed") currentStepIndex = 4; // Lỗi

  if (status === "disputed") {
    return (
      <div className="flex items-center gap-2 text-red-600 font-bold text-xs bg-red-50 p-2 rounded-lg border border-red-100 w-full justify-center">
        <AlertTriangle size={16} /> Đang xảy ra tranh chấp
      </div>
    );
  }

  return (
    <div className="flex items-center w-full max-w-sm mt-2">
      {steps.map((step, index) => {
        const isActive = index <= currentStepIndex;
        const isLast = index === steps.length - 1;
        return (
          <React.Fragment key={step.key}>
            <div className={`flex flex-col items-center gap-1 ${isActive ? "text-emerald-700" : "text-stone-300"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${isActive ? "bg-emerald-100 border border-emerald-200 shadow-sm" : "bg-stone-50 border border-stone-200"}`}>
                {step.icon}
              </div>
              <span className={`text-[9px] font-bold whitespace-nowrap ${isActive ? "text-emerald-700" : "text-stone-400"}`}>{step.label}</span>
            </div>
            {!isLast && (
              <div className={`flex-1 h-0.5 mx-1 mb-3 ${isActive && index < currentStepIndex ? "bg-emerald-500" : "bg-stone-200"}`}></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function OrdersClient({ initialEscrow, initialRented }: { initialEscrow: any[], initialRented: any[] }) {
  const [activeTab, setActiveTab] = useState<"INCOMING" | "OUTGOING">("INCOMING");
  const [escrowOrders, setEscrowOrders] = useState(initialEscrow);
  const [rentedOrders, setRentedOrders] = useState(initialRented);
  
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmitReview = async () => {
    if (!selectedOrderForReview) return;
    setIsReviewSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      if (!currentUserId) { alert("Vui lòng đăng nhập để thực hiện."); return; }

      const isRenterToOwnerLuong = String(selectedOrderForReview.renterId) === String(currentUserId);
      const finalRevieweeId = isRenterToOwnerLuong ? selectedOrderForReview.ownerId : selectedOrderForReview.renterId;
      const finalType = isRenterToOwnerLuong ? "RENTER_TO_OWNER" : "OWNER_TO_RENTER";
      const updateField = isRenterToOwnerLuong ? { renterRatedAt: new Date().toISOString() } : { ownerRatedAt: new Date().toISOString() };

      const { error: reviewError } = await supabase.from("Review").insert([{
        rentalHistoryId: selectedOrderForReview.id,
        reviewerId: currentUserId,
        revieweeId: finalRevieweeId || "",
        rating: rating,
        type: finalType,
        comment: comment
      }]);

      if (reviewError) throw reviewError;

      const { error: historyError } = await supabase
        .from("rental_history")
        .update(updateField)
        .eq("id", selectedOrderForReview.id);

      if (historyError) throw historyError;

      alert("🎉 Ghi nhận phản hồi thành công! Hệ thống cộng thưởng +10 Green Points vào tài khoản tủ đồ của cậu nhé.");
      setShowReviewModal(false);
      router.refresh(); 
    } catch (err: any) {
      alert(`Trục trặc luồng đẩy dữ liệu: ${err.message}`);
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden flex flex-col mt-4">
        <div className="flex border-b border-stone-100 w-full px-2 pt-2 overflow-x-auto no-scrollbar bg-stone-50/50">
          <button 
            onClick={() => setActiveTab("INCOMING")} 
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === "INCOMING" ? "border-transparent text-amber-800 border-b-2 !border-amber-800 bg-white rounded-t-lg" : "border-transparent text-stone-400 hover:text-stone-700"}`}
          >
            <History size={16} /> Luồng Yêu cầu ĐẾN (Khách đặt)
            <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === "INCOMING" ? "bg-amber-100 text-amber-800" : "bg-stone-100"}`}>{escrowOrders.length}</span>
          </button>
          <button 
            onClick={() => setActiveTab("OUTGOING")} 
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === "OUTGOING" ? "border-transparent text-[#0ea5e9] border-b-2 !border-[#0ea5e9] bg-white rounded-t-lg" : "border-transparent text-stone-400 hover:text-stone-700"}`}
          >
            <ShoppingBag size={16} /> Luồng Yêu cầu ĐI (Mình đặt)
            <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === "OUTGOING" ? "bg-blue-50 text-blue-700" : "bg-stone-100"}`}>{rentedOrders.length}</span>
          </button>
        </div>

        <div className="p-0 bg-stone-50/20">
          {activeTab === "INCOMING" && (
            <div>
              {escrowOrders.length > 0 ? (
                <div className="flex flex-col">
                  {escrowOrders.map((order) => (
                    <div key={order.id} className="p-4 sm:p-6 border-b border-stone-100 hover:bg-stone-50/80 transition-colors flex flex-col md:flex-row gap-4 md:gap-6">
                      <div className="flex-1 flex gap-4">
                        <img src={order.products?.image_url || PLACEHOLDER_IMG} className="w-20 h-24 rounded-lg object-cover bg-stone-100 border border-stone-200 shrink-0" />
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-[10px] text-stone-400">#{String(order.id).substring(0,8)}</span>
                          <span className="font-bold text-[#183A2D] text-sm sm:text-base line-clamp-1">{order.products?.title || 'Trang phục CLOOP'}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-stone-500">Khách thuê:</span>
                            <span className="font-bold text-stone-800 text-[11px]">{order.renter_name || `ID: ${order.renterId?.substring(0,8)}`}</span>
                            <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5"><Star size={10} className="fill-amber-500" /> {order.renterAvg}</span>
                          </div>
                          <span className="text-sm font-bold text-[#183A2D] mt-auto">Tổng cọc: {(order.total_amount || 0).toLocaleString()}₫</span>
                        </div>
                      </div>
                      <div className="w-full md:w-1/3 border-t md:border-t-0 md:border-l border-stone-100 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center items-center md:items-start">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Trạng thái giao dịch</span>
                        <StatusStepper status={order.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center text-stone-300 mb-4">
                    <History size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-stone-800 mb-2">Chưa có yêu cầu đến</h3>
                  <p className="text-sm text-stone-500 max-w-sm">Tủ đồ của bạn hiện chưa có yêu cầu thuê/mua nào từ người dùng khác.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "OUTGOING" && (
            <div>
              {rentedOrders.length > 0 ? (
                <div className="flex flex-col">
                  {rentedOrders.map((order) => (
                    <div key={order.id} className="p-4 sm:p-6 border-b border-stone-100 hover:bg-stone-50/80 transition-colors flex flex-col md:flex-row gap-4 md:gap-6">
                      <div className="flex-1 flex gap-4">
                        <img src={order.products?.image_url || PLACEHOLDER_IMG} className="w-20 h-24 rounded-lg object-cover bg-stone-100 border border-stone-200 shrink-0" />
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-[10px] text-stone-400">#{String(order.id).substring(0,8)}</span>
                          <span className="font-bold text-[#183A2D] text-sm sm:text-base line-clamp-1">{order.products?.title || 'Trang phục CLOOP'}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-stone-500">Chủ đồ:</span>
                            <span className="font-bold text-stone-800 text-[11px]">{order.owner_name || `ID: ${order.ownerId?.substring(0,8)}`}</span>
                            <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5"><Star size={10} className="fill-amber-500" /> {order.ownerAvg}</span>
                          </div>
                          <span className="text-sm font-bold text-[#0ea5e9] mt-auto">Đã thanh toán: {(order.total_amount || 0).toLocaleString()}₫</span>
                          {order.status === "completed" && (
                            <button onClick={() => {
                              setSelectedOrderForReview(order);
                              setShowReviewModal(true);
                            }} className="text-[10px] font-bold text-[#183A2D] bg-[#183A2D]/10 hover:bg-[#183A2D] hover:text-white px-3 py-1.5 rounded-md transition-colors w-fit mt-2">
                              Đánh giá chủ đồ
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="w-full md:w-1/3 border-t md:border-t-0 md:border-l border-stone-100 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center items-center md:items-start">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Trạng thái giao dịch</span>
                        <StatusStepper status={order.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center text-stone-300 mb-4">
                    <ShoppingBag size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-stone-800 mb-2">Bạn chưa đặt món đồ nào</h3>
                  <p className="text-sm text-stone-500 max-w-sm mb-6">Hàng ngàn sản phẩm tuyệt đẹp đang chờ bạn khám phá trên CLOOP Market.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showReviewModal && selectedOrderForReview && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="bg-white border border-stone-200/60 rounded-[2rem] max-w-[440px] w-full shadow-2xl p-6 text-left space-y-4"
          >
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-bold text-[#183A2D] uppercase tracking-wider">
                ⭐ Đánh giá giao dịch
              </h3>
              <button 
                type="button" 
                onClick={() => setShowReviewModal(false)} 
                className="text-stone-400 hover:text-stone-700 transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-stone-500">
                Bạn đang ghi nhận phản hồi đối với đối tác giao dịch:
              </p>
              <p className="text-xs font-bold text-stone-900">
                {selectedOrderForReview.owner_name} / {selectedOrderForReview.renter_name}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">Số sao tín nhiệm</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform active:scale-90 cursor-pointer"
                  >
                    <Star
                      size={24}
                      className={star <= rating ? "fill-amber-400 text-amber-400" : "text-stone-200"}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">Nội dung nhận xét</label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Nhập cảm nhận thực tế..."
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 text-xs focus:outline-none focus:border-emerald-600 bg-stone-50/50 resize-none"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmitReview}
              disabled={isReviewSubmitting}
              className="w-full py-3 bg-[#183A2D] text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow transition-all flex items-center justify-center gap-2 hover:bg-[#23452F] disabled:opacity-50 cursor-pointer"
            >
              {isReviewSubmitting ? "Đang xử lý..." : "Gửi đánh giá tín nhiệm (+10 Pts)"}
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
}
