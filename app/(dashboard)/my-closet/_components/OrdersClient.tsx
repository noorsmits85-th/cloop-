"use client";

import React, { useState, useEffect } from "react";
import { History, ShoppingBag, Star, X, Check, Truck, Package, RotateCcw, AlertTriangle, CheckCircle, ShieldAlert, Store, PartyPopper, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { submitReviewAction, raiseDisputeAction, completeOrderAction, loadMoreOrdersAction, renterReceivedAction, renterReturnAction } from "../orders/actions"; 
import { requestPickupAction } from "@/app/actions/shipment";
import { CldUploadWidget } from "next-cloudinary";
import Link from "next/link";
import { toast } from "sonner";

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=120";

function StatusStepper({ status, isOwnerMode }: { status: string, isOwnerMode: boolean }) {
  const steps = [
    { key: "PENDING_APPROVAL", label: "Chờ duyệt", icon: <Package size={14} strokeWidth={1.5} /> },
    { key: "LENDER_SHIPPED", label: "Đã gửi hàng", icon: <Truck size={14} strokeWidth={1.5} /> },
    { key: "BORROWER_RECEIVED", label: "Đang thuê", icon: <CheckCircle size={14} strokeWidth={1.5} /> },
    { key: "BORROWER_RETURNED", label: "Đang trả hàng", icon: <RotateCcw size={14} strokeWidth={1.5} /> },
    { key: "LENDER_COMPLETED", label: "Hoàn tất", icon: <Check size={14} strokeWidth={1.5} /> }
  ];

  let currentStepIndex = steps.findIndex(s => s.key === status);
  if (status === "DISPUTE") currentStepIndex = 4;

  const activeColor = isOwnerMode ? "text-[#183A2D]" : "text-slate-900";
  const activeBg = isOwnerMode ? "bg-[#183A2D]/5 border-[#183A2D]/20" : "bg-slate-50 border-slate-200";
  const activeLine = isOwnerMode ? "bg-[#183A2D]" : "bg-slate-900";

  if (status === "DISPUTE") {
    return (
      <div className="flex items-center gap-2 text-red-600 font-bold text-xs bg-red-50 p-2 rounded-lg border border-red-100 w-full justify-center mt-2">
        <AlertTriangle size={16} strokeWidth={1.5} /> Đang xảy ra tranh chấp
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
            <div className={`flex flex-col items-center gap-1 ${isActive ? activeColor : "text-stone-300"}`}>
              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] transition-all duration-500 ${isActive ? `${activeBg} border` : "bg-transparent border border-stone-200"}`}>
                {step.icon}
              </div>
              <span className={`text-[9px] font-medium tracking-wide whitespace-nowrap ${isActive ? activeColor : "text-stone-400"}`}>{step.label}</span>
            </div>
            {!isLast && (
              <div className={`flex-1 h-[1px] mx-1 mb-3 transition-colors duration-500 ${isActive && index < currentStepIndex ? activeLine : "bg-stone-200"}`}></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function OrdersClient({ 
  initialEscrow, 
  initialRented,
  initialHasMoreEscrow = false,
  initialHasMoreRented = false
}: { 
  initialEscrow: any[]; 
  initialRented: any[];
  initialHasMoreEscrow?: boolean;
  initialHasMoreRented?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const modeParam = searchParams.get("mode");
  const isOwnerMode = modeParam !== "renter";
  
  const handleModeChange = (newMode: "owner" | "renter") => {
    router.push(`${pathname}?mode=${newMode}`);
  };

  const [escrowOrders, setEscrowOrders] = useState(initialEscrow);
  const [rentedOrders, setRentedOrders] = useState(initialRented);
  const [hasMoreEscrow, setHasMoreEscrow] = useState(initialHasMoreEscrow);
  const [hasMoreRented, setHasMoreRented] = useState(initialHasMoreRented);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // 🛡️ Idempotency / Double-click shields
  const [completingIds, setCompletingIds] = useState<Record<string, boolean>>({});
  const [requestingPickupIds, setRequestingPickupIds] = useState<Record<string, boolean>>({});
  const [receivingIds, setReceivingIds] = useState<Record<string, boolean>>({});
  const [returningIds, setReturningIds] = useState<Record<string, boolean>>({});
  
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<any>(null);
  const [selectedOrderForDispute, setSelectedOrderForDispute] = useState<any>(null);
  
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeImages, setDisputeImages] = useState<string[]>([]);
  
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [isDisputeSubmitting, setIsDisputeSubmitting] = useState(false);

  // ⚡ Supabase Realtime Channels (Live State & Toast Synchronization)
  useEffect(() => {
    const channel = supabase
      .channel("orders_realtime_sync")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rental_history"
        },
        (payload: any) => {
          const updatedOrder = payload.new;
          if (!updatedOrder) return;

          // 1. Phản ứng trên Tab Khách Thuê (Renter Mode)
          setRentedOrders(prev => {
            const index = prev.findIndex(o => o.id === updatedOrder.id);
            if (index !== -1) {
              const oldStatus = prev[index].status;
              const newStatus = updatedOrder.status;

              if (oldStatus !== newStatus) {
                const itemTitle = prev[index].product?.title || prev[index].products?.title || "Trang phục";
                
                if (newStatus === "LENDER_SHIPPED") {
                  toast.info("🚚 Đơn hàng đang được giao!", {
                    description: `Chủ đồ đã gửi món "${itemTitle}". Hãy chuẩn bị đón đồ nhé!`,
                    duration: 5000,
                  });
                } else if (newStatus === "LENDER_COMPLETED") {
                  toast.success("🎉 Hoàn cọc thành công!", {
                    description: `Chủ đồ đã xác nhận nhận lại "${itemTitle}". Tiền cọc đã được mở khóa an toàn về ví!`,
                    duration: 6000,
                  });
                } else if (newStatus === "DISPUTE") {
                  toast.error("⚠️ Có sự cố phát sinh", {
                    description: `Đơn hàng "${itemTitle}" đang được đưa vào diện khiếu nại để BQT giải quyết.`,
                    duration: 7000,
                  });
                }

                const updatedList = [...prev];
                updatedList[index] = { ...updatedList[index], status: newStatus };
                return updatedList;
              }
            }
            return prev;
          });

          // 2. Phản ứng trên Tab Chủ Tủ (Owner Mode)
          setEscrowOrders(prev => {
            const index = prev.findIndex(o => o.id === updatedOrder.id);
            if (index !== -1) {
              const oldStatus = prev[index].status;
              const newStatus = updatedOrder.status;

              if (oldStatus !== newStatus) {
                const itemTitle = prev[index].product?.title || prev[index].products?.title || "Món đồ";

                if (newStatus === "BORROWER_RETURNED") {
                  toast.info("📦 Khách đã gửi trả đồ!", {
                    description: `Khách thuê đã hoàn tất gửi trả "${itemTitle}". Vui lòng kiểm tra và bấm "Đã nhận lại đồ" để kết thúc giao dịch.`,
                    duration: 6000,
                  });
                } else if (newStatus === "BORROWER_RECEIVED") {
                  toast.info("Khách đã nhận được đồ", {
                    description: `Khách thuê đã xác nhận nhận "${itemTitle}" an toàn.`,
                    duration: 4000,
                  });
                } else if (newStatus === "DISPUTE") {
                  toast.error("⚠️ Khiếu nại đã ghi nhận", {
                    description: `Đơn hàng "${itemTitle}" đang ở trạng thái tranh chấp.`,
                    duration: 6000,
                  });
                }

                const updatedList = [...prev];
                updatedList[index] = { ...updatedList[index], status: newStatus };
                return updatedList;
              }
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    try {
      const mode = isOwnerMode ? "owner" : "renter";
      const currentList = isOwnerMode ? escrowOrders : rentedOrders;
      const lastItem = currentList[currentList.length - 1];
      const cursor = lastItem ? lastItem.id : null;

      const res = await loadMoreOrdersAction({ mode, cursor, limit: 20 });
      if (res.success && res.orders) {
        if (isOwnerMode) {
          setEscrowOrders(prev => [...prev, ...res.orders]);
          setHasMoreEscrow(Boolean(res.hasMore));
        } else {
          setRentedOrders(prev => [...prev, ...res.orders]);
          setHasMoreRented(Boolean(res.hasMore));
        }
      } else {
        alert(res.error || "Không thể tải thêm đơn hàng.");
      }
    } catch (e: any) {
      alert(e.message || "Lỗi khi tải thêm đơn hàng.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedOrderForReview) return;
    setIsReviewSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      if (!currentUserId) { alert("Vui lòng đăng nhập để thực hiện."); return; }

      const isRenterToOwnerLuong = String(selectedOrderForReview.renterId) === String(currentUserId);
      const finalType = isRenterToOwnerLuong ? "RENTER_TO_OWNER" : "OWNER_TO_RENTER";

      const res = await submitReviewAction({
        rentalId: selectedOrderForReview.id,
        rating,
        type: finalType,
        comment
      });

      if (!res.success) throw new Error("error" in res ? String(res.error) : "Lỗi không xác định");

      toast.success("🎉 Đã gửi đánh giá thành công!", { description: "Điểm tín nhiệm (+10 Pts) đã được ghi nhận." });
      setShowReviewModal(false);
      router.refresh(); 
    } catch (err: any) {
      toast.error("Trục trặc phản hồi", { description: err.message });
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    if (completingIds[orderId]) return; // 🔒 Guard against double-click
    if (!confirm("Xác nhận bạn đã nhận lại đồ nguyên vẹn và kết thúc đơn hàng? (Tiền cọc sẽ được hoàn lại cho người thuê)")) return;
    
    setCompletingIds(prev => ({ ...prev, [orderId]: true }));
    try {
      const res = await completeOrderAction(orderId);
      if (res.success) {
        toast.success("Đã hoàn tất đơn hàng!", { description: "Giao dịch đã kết thúc và tiền cọc đã được mở khóa." });
        router.refresh();
      } else {
        toast.error("Lỗi hoàn tất", { description: res.error });
      }
    } catch (e: any) {
      toast.error("Lỗi hệ thống", { description: e.message });
    } finally {
      setCompletingIds(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleRequestPickup = async (orderId: string) => {
    if (requestingPickupIds[orderId]) return;
    if (!confirm("Xác nhận bạn đã đóng gói xong và sẵn sàng gọi Shipper tới lấy đồ?")) return;
    
    setRequestingPickupIds(prev => ({ ...prev, [orderId]: true }));
    try {
      const res = await requestPickupAction(orderId);
      if (res.success) {
        toast.success("Đã báo hệ thống đóng gói xong!", { description: "Admin sẽ điều phối Shipper tới lấy đồ sớm nhất." });
        router.refresh();
      } else {
        toast.error("Lỗi xác nhận", { description: res.error });
      }
    } catch (e: any) {
      toast.error("Lỗi hệ thống", { description: e.message });
    } finally {
      setRequestingPickupIds(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleRenterReceived = async (orderId: string) => {
    if (receivingIds[orderId]) return;
    if (!confirm("Xác nhận bạn đã nhận được đồ từ Shipper an toàn?")) return;
    
    setReceivingIds(prev => ({ ...prev, [orderId]: true }));
    try {
      const res = await renterReceivedAction(orderId);
      if (res.success) {
        toast.success("Đã xác nhận nhận hàng!", { description: "Chúc bạn có những trải nghiệm tuyệt vời với món đồ này." });
        router.refresh();
      } else {
        toast.error("Lỗi xác nhận", { description: res.error });
      }
    } catch (e: any) {
      toast.error("Lỗi hệ thống", { description: e.message });
    } finally {
      setReceivingIds(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleRenterReturn = async (orderId: string) => {
    if (returningIds[orderId]) return;
    if (!confirm("Xác nhận bạn đã đóng gói xong và sẵn sàng gửi trả lại đồ cho chủ tủ?")) return;
    
    setReturningIds(prev => ({ ...prev, [orderId]: true }));
    try {
      const res = await renterReturnAction(orderId);
      if (res.success) {
        toast.success("Đã báo hệ thống hoàn trả!", { description: "Hãy giao đồ cho Shipper để gửi về nhé." });
        router.refresh();
      } else {
        toast.error("Lỗi xác nhận", { description: res.error });
      }
    } catch (e: any) {
      toast.error("Lỗi hệ thống", { description: e.message });
    } finally {
      setReturningIds(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleSubmitDispute = async () => {
    if (!selectedOrderForDispute) return;
    if (!disputeDescription) { alert("Vui lòng nhập mô tả sự cố"); return; }
    if (disputeImages.length === 0) { alert("Bắt buộc phải tải lên ít nhất 1 ảnh bằng chứng"); return; }

    setIsDisputeSubmitting(true);
    try {
      const res = await raiseDisputeAction(selectedOrderForDispute.id, disputeDescription, disputeImages);
      if (res.success) {
        toast.success("Đã gửi báo cáo sự cố", { description: "Báo cáo của bạn đã được chuyển tới Ban Quản Trị." });
        setShowDisputeModal(false);
        router.refresh();
      } else {
        toast.error("Lỗi gửi khiếu nại", { description: res.error });
      }
    } catch (e: any) {
      toast.error("Lỗi khiếu nại", { description: e.message });
    } finally {
      setIsDisputeSubmitting(false);
    }
  };

  return (
    <>
      <div className={`bg-white/80 backdrop-blur-sm rounded-xl border overflow-hidden flex flex-col mt-4 transition-colors duration-500 ${isOwnerMode ? 'border-[#183A2D]/10' : 'border-slate-200/60'}`}>
        
        <div className="flex justify-center p-6 border-b border-stone-100/50">
          <div className="relative flex w-full max-w-md rounded-xl bg-white/50 border border-stone-200/50 p-1.5 shadow-sm">
            <div
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-lg transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOwnerMode ? "translate-x-0 bg-[#183A2D]" : "translate-x-full bg-slate-900"}`}
            />
            <button
              onClick={() => handleModeChange("owner")}
              className={`relative z-10 flex-1 py-2.5 text-xs font-medium tracking-wide transition-colors duration-500 ${isOwnerMode ? "text-white" : "text-stone-500 hover:text-stone-700"}`}
            >
              Chủ tủ <span className="opacity-70 ml-1">({escrowOrders.length})</span>
            </button>
            <button
              onClick={() => handleModeChange("renter")}
              className={`relative z-10 flex-1 py-2.5 text-xs font-medium tracking-wide transition-colors duration-500 ${!isOwnerMode ? "text-white" : "text-stone-500 hover:text-stone-700"}`}
            >
              Khách thuê <span className="opacity-70 ml-1">({rentedOrders.length})</span>
            </button>
          </div>
        </div>

        <div className="p-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={isOwnerMode ? "owner" : "renter"}
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              {isOwnerMode ? (
                <div>
                  {escrowOrders.length > 0 ? (
                    <div className="flex flex-col">
                      {escrowOrders.map((order) => (
                        <div key={order.id} className="p-6 sm:p-8 border-b border-stone-100 hover:bg-[#183A2D]/[0.02] transition-colors duration-500 flex flex-col md:flex-row gap-6 md:gap-8">
                          <div className="flex-1 flex gap-5">
                            <img src={order.product?.images?.[0]?.url || PLACEHOLDER_IMG} className="w-24 h-32 rounded-md object-cover bg-stone-50 border border-stone-100 shrink-0 shadow-sm" />
                            <div className="flex flex-col gap-1.5 justify-center">
                              <span className="font-mono text-[9px] tracking-widest text-[#183A2D]/50 uppercase">ORD-{String(order.id).substring(0,8)}</span>
                              <span className="font-medium text-[#183A2D] text-sm sm:text-base tracking-wide line-clamp-1">{order.product?.title || 'CLOOP Item'}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-light tracking-wider text-stone-500">Khách thuê:</span>
                                <span className="font-medium text-[#183A2D] text-[11px]">{order.renter?.name || `ID:${order.renterId?.substring(0,6)}`}</span>
                              </div>
                              
                              <div className="flex flex-wrap gap-3 mt-4">
                                {order.status === "PENDING_APPROVAL" && (
                                  <button 
                                    disabled={requestingPickupIds[order.id]}
                                    onClick={() => handleRequestPickup(order.id)}
                                    className="border border-[#183A2D] bg-[#183A2D] hover:bg-transparent text-white hover:text-[#183A2D] text-xs font-medium px-5 py-2.5 rounded-md transition-all duration-500 flex items-center gap-2 disabled:opacity-50"
                                  >
                                    {requestingPickupIds[order.id] ? (
                                      <>
                                        <Loader2 size={14} className="animate-spin" /> Đang xử lý...
                                      </>
                                    ) : (
                                      <>Đã đóng gói - Gọi Shipper</>
                                    )}
                                  </button>
                                )}
                                {order.status === "OWNER_PACKED" && (
                                  <div className="bg-[#183A2D]/10 text-[#183A2D] border border-[#183A2D]/20 text-xs font-medium px-5 py-2.5 rounded-md flex items-center gap-2">
                                    <Truck size={14} strokeWidth={2} /> Chờ điều phối Shipper...
                                  </div>
                                )}
                                {order.status === "BORROWER_RETURNED" && (
                                  <button 
                                    disabled={completingIds[order.id]}
                                    onClick={() => handleCompleteOrder(order.id)}
                                    className="border border-[#183A2D] bg-[#183A2D] hover:bg-transparent text-white hover:text-[#183A2D] text-xs font-medium px-5 py-2.5 rounded-md transition-all duration-500 flex items-center gap-2 disabled:opacity-50"
                                  >
                                    {completingIds[order.id] ? (
                                      <>
                                        <Loader2 size={14} className="animate-spin" /> Đang hoàn tất...
                                      </>
                                    ) : (
                                      <>
                                        <Check size={14} strokeWidth={2} /> Đã nhận lại đồ
                                      </>
                                    )}
                                  </button>
                                )}
                                {order.status === "BORROWER_RETURNED" && (
                                  <button 
                                    onClick={() => {
                                      setSelectedOrderForDispute(order);
                                      setShowDisputeModal(true);
                                    }}
                                    className="bg-transparent hover:bg-red-50 text-stone-500 hover:text-red-600 border border-stone-200 hover:border-red-200 text-xs font-medium px-4 py-2.5 rounded-md flex items-center gap-2 transition-all duration-500"
                                  >
                                    <ShieldAlert size={14} strokeWidth={1.5} /> Báo cáo sự cố
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="w-full md:w-1/3 border-t md:border-t-0 md:border-l border-stone-100/50 pt-6 md:pt-0 md:pl-8 flex flex-col justify-center items-center md:items-start">
                            <span className="text-[10px] font-medium text-[#183A2D]/70 tracking-widest mb-3">TIẾN TRÌNH</span>
                            <StatusStepper status={order.status} isOwnerMode={true} />
                          </div>
                        </div>
                      ))}

                      {hasMoreEscrow && (
                        <div className="p-6 flex justify-center border-t border-stone-100/50">
                          <button
                            onClick={handleLoadMore}
                            disabled={isLoadingMore}
                            className="border border-[#183A2D]/30 hover:border-[#183A2D] bg-transparent hover:bg-[#183A2D]/5 text-[#183A2D] text-xs font-medium py-3 px-8 rounded-md transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
                          >
                            {isLoadingMore ? (
                              <>
                                <Loader2 size={14} className="animate-spin" /> Đang tải thêm đơn cũ...
                              </>
                            ) : (
                              "Xem thêm đơn hàng cũ"
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
                      <div className="relative mb-8">
                        <div className="absolute inset-0 bg-[#183A2D]/5 rounded-full blur-xl animate-pulse"></div>
                        <div className="relative w-20 h-20 bg-transparent rounded-full flex items-center justify-center text-[#183A2D]/80 border border-[#183A2D]/10">
                          <Store size={32} strokeWidth={0.75} className="animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                        </div>
                      </div>
                      <h3 className="text-sm sm:text-base font-medium text-[#183A2D] mb-3 tracking-wide">Tài sản thời trang đang ngủ đông</h3>
                      <p className="text-xs font-light text-stone-500 max-w-sm mb-10 leading-relaxed">Hàng ngàn thành viên CLOOP đang tìm kiếm phong cách của bạn. Lên sóng món đồ đầu tiên để đánh thức tủ đồ và kích hoạt dòng tiền ngay hôm nay.</p>
                      <Link href="/my-closet/create" className="border border-[#183A2D] bg-[#183A2D] hover:bg-transparent text-white hover:text-[#183A2D] font-medium py-3.5 px-8 rounded-md transition-all duration-500 text-xs tracking-wide">
                        + Đăng bán / Cho thuê ngay
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {rentedOrders.length > 0 ? (
                    <div className="flex flex-col">
                      {rentedOrders.map((order) => (
                        <div key={order.id} className="p-6 sm:p-8 border-b border-stone-100 hover:bg-slate-50/50 transition-colors duration-500 flex flex-col md:flex-row gap-6 md:gap-8">
                          <div className="flex-1 flex gap-5">
                            <img src={order.product?.images?.[0]?.url || PLACEHOLDER_IMG} className="w-24 h-32 rounded-md object-cover bg-stone-50 border border-stone-100 shrink-0 shadow-sm" />
                            <div className="flex flex-col gap-1.5 justify-center">
                              <span className="font-mono text-[9px] tracking-widest text-slate-500 uppercase">ORD-{String(order.id).substring(0,8)}</span>
                              <span className="font-medium text-slate-900 text-sm sm:text-base tracking-wide line-clamp-1">{order.product?.title || 'CLOOP Item'}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-light tracking-wider text-stone-500">Chủ đồ:</span>
                                <span className="font-medium text-slate-800 text-[11px]">{order.product?.user?.name || `ID:${order.product?.userId?.substring(0,6)}`}</span>
                              </div>
                              
                              <div className="flex flex-wrap gap-3 mt-4">
                                {order.status === "LENDER_SHIPPED" && (
                                  <button 
                                    disabled={receivingIds[order.id]}
                                    onClick={() => handleRenterReceived(order.id)}
                                    className="border border-slate-900 bg-slate-900 hover:bg-transparent text-white hover:text-slate-900 text-xs font-medium px-5 py-2.5 rounded-md transition-all duration-500 disabled:opacity-50 flex items-center gap-2"
                                  >
                                    {receivingIds[order.id] ? <><Loader2 size={14} className="animate-spin" /> Đang xử lý...</> : "Đã nhận được đồ"}
                                  </button>
                                )}
                                {order.status === "BORROWER_RECEIVED" && (
                                  <button 
                                    disabled={returningIds[order.id]}
                                    onClick={() => handleRenterReturn(order.id)}
                                    className="border border-slate-900 bg-slate-900 hover:bg-transparent text-white hover:text-slate-900 text-xs font-medium px-5 py-2.5 rounded-md transition-all duration-500 disabled:opacity-50 flex items-center gap-2"
                                  >
                                    {returningIds[order.id] ? <><Loader2 size={14} className="animate-spin" /> Đang xử lý...</> : "Đóng gói trả đồ"}
                                  </button>
                                )}
                                {order.status === "LENDER_COMPLETED" && (
                                  <button onClick={() => {
                                    setSelectedOrderForReview(order);
                                    setShowReviewModal(true);
                                  }} className="border border-stone-200 bg-transparent hover:border-slate-900 hover:bg-slate-900 text-stone-500 hover:text-white text-xs font-medium px-5 py-2.5 rounded-md transition-all duration-500">
                                    Đánh giá
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="w-full md:w-1/3 border-t md:border-t-0 md:border-l border-stone-100/50 pt-6 md:pt-0 md:pl-8 flex flex-col justify-center items-center md:items-start">
                            <span className="text-[10px] font-medium text-slate-500 tracking-widest mb-3">TIẾN TRÌNH</span>
                            <StatusStepper status={order.status} isOwnerMode={false} />
                          </div>
                        </div>
                      ))}

                      {hasMoreRented && (
                        <div className="p-6 flex justify-center border-t border-stone-100/50">
                          <button
                            onClick={handleLoadMore}
                            disabled={isLoadingMore}
                            className="border border-slate-300 hover:border-slate-900 bg-transparent hover:bg-slate-50 text-slate-900 text-xs font-medium py-3 px-8 rounded-md transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
                          >
                            {isLoadingMore ? (
                              <>
                                <Loader2 size={14} className="animate-spin" /> Đang tải thêm đơn cũ...
                              </>
                            ) : (
                              "Xem thêm đơn hàng cũ"
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
                      <div className="relative mb-8">
                        <div className="absolute inset-0 bg-slate-200/20 rounded-full blur-xl animate-pulse"></div>
                        <div className="relative w-20 h-20 bg-transparent rounded-full flex items-center justify-center text-slate-600 border border-slate-200/50">
                          <PartyPopper size={32} strokeWidth={0.75} className="animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                        </div>
                      </div>
                      <h3 className="text-sm sm:text-base font-medium text-slate-900 mb-3 tracking-wide">Tủ đồ vô tận đang chờ mở khóa</h3>
                      <p className="text-xs font-light text-stone-500 max-w-sm mb-10 leading-relaxed">Từ váy dạ hội đến outfit dạo phố, khám phá ngay những thiết kế cao cấp được chia sẻ từ cộng đồng chung gu thẩm mỹ với bạn.</p>
                      <Link href="/" className="border border-slate-900 bg-slate-900 hover:bg-transparent text-white hover:text-slate-900 font-medium py-3.5 px-8 rounded-md transition-all duration-500 text-xs tracking-wide">
                        Khám phá tủ đồ cộng đồng
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {showDisputeModal && selectedOrderForDispute && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-white border border-stone-100 rounded-xl max-w-[440px] w-full shadow-2xl p-8 text-left space-y-6">
            <div className="flex justify-between items-center border-b border-stone-100 pb-4">
              <h3 className="text-xs font-medium text-red-600 tracking-wide uppercase flex items-center gap-2">
                <AlertTriangle size={16} strokeWidth={1.5} /> Báo cáo sự cố
              </h3>
              <button onClick={() => setShowDisputeModal(false)} className="text-stone-400 hover:text-stone-900 transition-colors p-1"><X size={18} strokeWidth={1.5} /></button>
            </div>
            <p className="text-xs font-light text-stone-500 leading-relaxed">Hãy cung cấp chi tiết sự cố và hình ảnh minh chứng để Ban Quản Trị giải quyết.</p>
            <div className="space-y-2">
              <label className="block text-[10px] font-medium text-stone-500 uppercase tracking-wide">Mô tả chi tiết</label>
              <textarea rows={3} value={disputeDescription} onChange={(e) => setDisputeDescription(e.target.value)} placeholder="Nhập chi tiết..." className="w-full px-4 py-3 rounded-md border border-stone-200/60 text-sm font-light focus:outline-none focus:border-red-400 bg-stone-50/30 resize-none transition-colors" />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-medium text-stone-500 uppercase tracking-wide">Bằng chứng (Ít nhất 1 ảnh)</label>
              <div className="flex flex-wrap gap-3">
                {disputeImages.map((img, i) => (<img key={i} src={img} alt="Bằng chứng" className="w-16 h-16 object-cover rounded-md border border-stone-200" />))}
                <CldUploadWidget uploadPreset="cloop_uploads" onSuccess={(result: any) => { if (result.info?.secure_url) setDisputeImages(prev => [...prev, result.info.secure_url]); }}>
                  {({ open }) => (<button type="button" onClick={() => open()} className="w-16 h-16 rounded-md border border-dashed border-stone-300 flex items-center justify-center text-stone-400 hover:border-red-300 hover:text-red-500 transition-colors">+</button>)}
                </CldUploadWidget>
              </div>
            </div>
            <button type="button" onClick={handleSubmitDispute} disabled={isDisputeSubmitting} className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium tracking-wide rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {isDisputeSubmitting ? "Đang gửi..." : "Gửi báo cáo"}
            </button>
          </motion.div>
        </div>
      )}

      {showReviewModal && selectedOrderForReview && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-white border border-stone-100 rounded-xl max-w-[440px] w-full shadow-2xl p-8 text-left space-y-6">
            <div className="flex justify-between items-center border-b border-stone-100 pb-4">
              <h3 className="text-xs font-medium text-[#183A2D] tracking-wide uppercase">Đánh giá giao dịch</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-stone-400 hover:text-stone-900 transition-colors p-1"><X size={18} strokeWidth={1.5} /></button>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-light text-stone-500">Đối tác giao dịch:</p>
              <p className="text-sm font-medium text-stone-900 tracking-wide">{selectedOrderForReview.product?.user?.name} / {selectedOrderForReview.renter?.name}</p>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-medium text-stone-500 uppercase tracking-wide">Tín nhiệm</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button type="button" key={star} onClick={() => setRating(star)} className="transition-transform hover:scale-110 active:scale-90 cursor-pointer">
                    <Star size={24} className={star <= rating ? "fill-amber-400 text-amber-400" : "text-stone-200"} strokeWidth={1.5} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-medium text-stone-500 uppercase tracking-wide">Nhận xét</label>
              <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Để lại vài lời..." className="w-full px-4 py-3 rounded-md border border-stone-200/60 text-sm font-light focus:outline-none focus:border-[#183A2D] bg-stone-50/30 resize-none transition-colors" />
            </div>
            <button type="button" onClick={handleSubmitReview} disabled={isReviewSubmitting} className="w-full py-3.5 border border-[#183A2D] bg-[#183A2D] hover:bg-transparent text-white hover:text-[#183A2D] text-xs font-medium tracking-wide rounded-md transition-all duration-500 flex items-center justify-center disabled:opacity-50 cursor-pointer">
              {isReviewSubmitting ? "Đang xử lý..." : "Gửi đánh giá (+10 Pts)"}
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
}
