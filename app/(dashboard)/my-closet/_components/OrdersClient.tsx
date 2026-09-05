"use client";

import React, { useState, useEffect } from "react";
import { History, ShoppingBag, Star, X, Check, Truck, Package, RotateCcw, AlertTriangle, CheckCircle, ShieldAlert, Store, PartyPopper, Loader2, Video, Camera, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { submitReviewAction, raiseDisputeWithProposalAction, acceptDisputeProposalAction, rejectAndEscalateDisputeAction, completeOrderAction, loadMoreOrdersAction, renterReceivedAction, renterReturnAction } from "../orders/actions"; 
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
      <div className="flex items-center gap-2 text-amber-700 font-bold text-xs bg-amber-50 p-2 rounded-lg border border-amber-200 w-full justify-center mt-2">
        <AlertTriangle size={16} strokeWidth={1.5} /> Đang tự hòa giải / Khiếu nại
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
  initialHasMoreEscrow: boolean;
  initialHasMoreRented: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [mode, setMode] = useState<"owner" | "renter">(
    searchParams.get("mode") === "renter" ? "renter" : "owner"
  );
  const isOwnerMode = mode === "owner";
  
  const handleModeChange = (newMode: "owner" | "renter") => {
    setMode(newMode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", newMode);
    window.history.pushState(null, "", `${pathname}?${params.toString()}`);
  };

  const [escrowOrders, setEscrowOrders] = useState(initialEscrow);
  const [rentedOrders, setRentedOrders] = useState(initialRented);

  useEffect(() => {
    const syncModeFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setMode(params.get("mode") === "renter" ? "renter" : "owner");
    };

    window.addEventListener("popstate", syncModeFromUrl);
    return () => window.removeEventListener("popstate", syncModeFromUrl);
  }, []);

  useEffect(() => {
    setEscrowOrders(initialEscrow);
  }, [initialEscrow]);

  useEffect(() => {
    setRentedOrders(initialRented);
  }, [initialRented]);

  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "RETURNED" | "DISPUTED" | "COMPLETED">("ALL");
  const [hasMoreEscrow, setHasMoreEscrow] = useState(initialHasMoreEscrow);
  const [hasMoreRented, setHasMoreRented] = useState(initialHasMoreRented);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // 🛡️ Idempotency / Double-click shields
  const [completingIds, setCompletingIds] = useState<Record<string, boolean>>({});
  const [requestingPickupIds, setRequestingPickupIds] = useState<Record<string, boolean>>({});
  const [receivingIds, setReceivingIds] = useState<Record<string, boolean>>({});
  const [returningIds, setReturningIds] = useState<Record<string, boolean>>({});
  const [acceptingDisputeIds, setAcceptingDisputeIds] = useState<Record<string, boolean>>({});
  const [rejectingDisputeIds, setRejectingDisputeIds] = useState<Record<string, boolean>>({});
  
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<any>(null);
  const [selectedOrderForDispute, setSelectedOrderForDispute] = useState<any>(null);
  
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [suggestedDeduction, setSuggestedDeduction] = useState<number>(0);
  const [disputeImages, setDisputeImages] = useState<string[]>([]);
  
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [isDisputeSubmitting, setIsDisputeSubmitting] = useState(false);

  // 📦 Packaging Video & Sealed Proof State (Kiểm tra niêm phong & Video trước khi gửi)
  const [packagingOrder, setPackagingOrder] = useState<any | null>(null);
  const [packagingProofs, setPackagingProofs] = useState<string[]>([]);
  const [packagingChecklist, setPackagingChecklist] = useState({
    cleanAndIntact: true,
    fullAccessories: true,
    sealedProperly: true
  });

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
    
    setCompletingIds(prev => ({ ...prev, [orderId]: true }));
    setEscrowOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "LENDER_COMPLETED" } : o));
    setRentedOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "LENDER_COMPLETED" } : o));
    try {
      const res = await completeOrderAction(orderId);
      if (res.success) {
        toast.success("🎉 Đã hoàn tất đơn hàng!", { description: "Két Escrow đã hoàn trả 100% tiền cọc và mở đồ cho thuê tiếp." });
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

  const handleRequestPickup = async (orderId: string, packagingProofUrls: string[] = []) => {
    if (requestingPickupIds[orderId]) return;
    
    setRequestingPickupIds(prev => ({ ...prev, [orderId]: true }));
    setEscrowOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "LENDER_SHIPPED" } : o));
    setRentedOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "LENDER_SHIPPED" } : o));
    try {
      const res = await requestPickupAction(orderId, packagingProofUrls);
      if (res.success) {
        toast.success("🚚 Đã bàn giao cho Shipper!", { description: "Đơn hàng đã chuyển sang trạng thái Đang Vận Chuyển." });
        setPackagingOrder(null);
        setPackagingProofs([]);
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
    
    setReceivingIds(prev => ({ ...prev, [orderId]: true }));
    setRentedOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "BORROWER_RECEIVED" } : o));
    setEscrowOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "BORROWER_RECEIVED" } : o));
    try {
      const res = await renterReceivedAction(orderId);
      if (res.success) {
        toast.success("👗 Đã xác nhận nhận đồ!", { description: "Thời gian gói thuê chính thức bắt đầu đếm ngược." });
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
    
    setReturningIds(prev => ({ ...prev, [orderId]: true }));
    setRentedOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "BORROWER_RETURNED" } : o));
    setEscrowOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "BORROWER_RETURNED" } : o));
    try {
      const res = await renterReturnAction(orderId);
      if (res.success) {
        toast.success("🔄 Đã báo hệ thống hoàn trả!", { description: "Hãy giao đồ cho Shipper để gửi về nhé." });
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
    if (!disputeDescription || disputeDescription.trim().length < 5) { 
      toast.error("Vui lòng nhập mô tả sự cố (tối thiểu 5 ký tự)"); 
      return; 
    }
    if (disputeImages.length === 0) { 
      toast.error("Bắt buộc phải tải lên ít nhất 1 ảnh bằng chứng"); 
      return; 
    }

    setIsDisputeSubmitting(true);
    try {
      const res = await raiseDisputeWithProposalAction(
        selectedOrderForDispute.id, 
        disputeDescription, 
        disputeImages,
        suggestedDeduction
      );
      if (res.success) {
        toast.success("Đã gửi đề xuất hòa giải sự cố!", { 
          description: "Đề xuất đã được gửi tới bên còn lại để tự thương lượng trước khi đẩy lên BQT." 
        });
        setShowDisputeModal(false);
        setDisputeDescription("");
        setDisputeImages([]);
        setSuggestedDeduction(0);
        router.refresh();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dispute-updated"));
        }
      } else {
        toast.error("Lỗi gửi khiếu nại", { description: res.error });
      }
    } catch (e: any) {
      toast.error("Lỗi khiếu nại", { description: e.message });
    } finally {
      setIsDisputeSubmitting(false);
    }
  };

  const handleAcceptDispute = async (disputeId: string) => {
    if (acceptingDisputeIds[disputeId]) return;
    if (!confirm("Xác nhận bạn đồng ý với mức bồi thường đề xuất và kết thúc đơn hàng? (Tiền sẽ được tự động giải ngân và hoàn cọc vào ví)")) return;

    setAcceptingDisputeIds(prev => ({ ...prev, [disputeId]: true }));
    try {
      const res = await acceptDisputeProposalAction(disputeId);
      if (res.success) {
        toast.success("Thỏa thuận thành công!", { description: "Đơn hàng đã được quyết toán và hoàn cọc an toàn vào ví." });
        router.refresh();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dispute-updated"));
        }
      } else {
        toast.error("Lỗi xử lý", { description: res.error });
      }
    } catch (e: any) {
      toast.error("Lỗi hệ thống", { description: e.message });
    } finally {
      setAcceptingDisputeIds(prev => ({ ...prev, [disputeId]: false }));
    }
  };

  const handleRejectDispute = async (disputeId: string) => {
    if (rejectingDisputeIds[disputeId]) return;
    const reason = prompt("Nhập lý do bạn không đồng ý với mức bồi thường này (để chuyển BQT xem xét):");
    if (reason === null) return;

    setRejectingDisputeIds(prev => ({ ...prev, [disputeId]: true }));
    try {
      const res = await rejectAndEscalateDisputeAction(disputeId, reason || "Không đồng ý mức bồi thường đề xuất");
      if (res.success) {
        toast.info("Đã chuyển lên Ban Quản Trị", { description: "BQT CLOOP sẽ tiếp nhận hồ sơ và làm trọng tài phân xử." });
        router.refresh();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dispute-updated"));
        }
      } else {
        toast.error("Lỗi xử lý", { description: res.error });
      }
    } catch (e: any) {
      toast.error("Lỗi hệ thống", { description: e.message });
    } finally {
      setRejectingDisputeIds(prev => ({ ...prev, [disputeId]: false }));
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

        {/* SUB-FILTER STATUS TAB BAR */}
        {(() => {
          const currentList = isOwnerMode ? escrowOrders : rentedOrders;
          const disputedList = currentList.filter(
            (o) => o.status === "DISPUTE" || (o.disputes && o.disputes.some((d: any) => d.status === "PENDING_REVIEW" || d.status === "DISPUTED"))
          );
          const activeList = currentList.filter(
            (o) => o.status === "PENDING_APPROVAL" || o.status === "OWNER_PACKED" || o.status === "LENDER_SHIPPED" || o.status === "BORROWER_RECEIVED"
          );
          const returnedList = currentList.filter((o) => o.status === "BORROWER_RETURNED");
          const completedList = currentList.filter((o) => o.status === "LENDER_COMPLETED" || o.status === "CANCELLED");

          return (
            <div className="flex items-center gap-2 px-6 py-3 border-b border-stone-100 bg-stone-50/70 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === "ALL"
                    ? "bg-white text-stone-900 shadow-xs border border-stone-200"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                Tất cả ({currentList.length})
              </button>
              <button
                onClick={() => setStatusFilter("ACTIVE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === "ACTIVE"
                    ? "bg-white text-stone-900 shadow-xs border border-stone-200"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                Đang xử lý / Thuê ({activeList.length})
              </button>
              <button
                onClick={() => setStatusFilter("RETURNED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === "RETURNED"
                    ? "bg-white text-stone-900 shadow-xs border border-stone-200"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                Chờ nhận lại ({returnedList.length})
              </button>
              <button
                onClick={() => setStatusFilter("DISPUTED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  statusFilter === "DISPUTED"
                    ? "bg-rose-50 text-rose-700 border border-rose-200 shadow-xs"
                    : "text-stone-500 hover:text-rose-600"
                }`}
              >
                <AlertTriangle size={13} className={disputedList.length > 0 ? "text-rose-600 animate-pulse" : "text-stone-400"} />
                Đang khiếu nại {disputedList.length > 0 && <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px]">{disputedList.length}</span>}
              </button>
              <button
                onClick={() => setStatusFilter("COMPLETED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === "COMPLETED"
                    ? "bg-white text-stone-900 shadow-xs border border-stone-200"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                Đã hoàn tất ({completedList.length})
              </button>
            </div>
          );
        })()}

        <div className="p-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${isOwnerMode ? "owner" : "renter"}_${statusFilter}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {isOwnerMode ? (
                <div>
                  {(() => {
                    const displayedEscrow = escrowOrders.filter((order) => {
                      if (statusFilter === "ACTIVE") return order.status === "PENDING_APPROVAL" || order.status === "OWNER_PACKED" || order.status === "LENDER_SHIPPED" || order.status === "BORROWER_RECEIVED";
                      if (statusFilter === "RETURNED") return order.status === "BORROWER_RETURNED";
                      if (statusFilter === "DISPUTED") return order.status === "DISPUTE" || (order.disputes && order.disputes.some((d: any) => d.status === "PENDING_REVIEW" || d.status === "DISPUTED"));
                      if (statusFilter === "COMPLETED") return order.status === "LENDER_COMPLETED" || order.status === "CANCELLED";
                      return true;
                    });

                    return displayedEscrow.length > 0 ? (
                      <div className="flex flex-col">
                        {displayedEscrow.map((order) => (
                        <div key={order.id} className="p-6 sm:p-8 border-b border-stone-100 hover:bg-[#183A2D]/[0.02] transition-colors duration-500 flex flex-col md:flex-row gap-6 md:gap-8">
                          <div className="flex-1 flex gap-5">
                            <img src={order.product?.images?.[0]?.url || PLACEHOLDER_IMG} className="w-24 h-32 rounded-md object-cover bg-stone-50 border border-stone-100 shrink-0 shadow-sm" />
                            <div className="flex flex-col gap-1.5 justify-center">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[9px] tracking-widest text-[#183A2D]/50 uppercase">ORD-{String(order.id).substring(0,8)}</span>
                                <span className="text-[9.5px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 font-semibold inline-flex items-center gap-1">
                                  <Truck size={11} className="text-emerald-700" />
                                  GHN-{String(order.id).substring(0,8).toUpperCase()}
                                </span>
                              </div>
                              <span className="font-medium text-[#183A2D] text-sm sm:text-base tracking-wide line-clamp-1">{order.product?.title || 'CLOOP Item'}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-light tracking-wider text-stone-500">Khách thuê:</span>
                                <span className="font-medium text-[#183A2D] text-[11px]">{order.renter?.name || `ID:${order.renterId?.substring(0,6)}`}</span>
                              </div>

                              {/* Lộ trình & Lịch trình dự kiến (Shopee Standard) */}
                              <div className="mt-2 p-2 rounded-lg bg-stone-50 border border-stone-200/60 text-[10.5px] text-stone-600 space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <Truck size={12} className="text-emerald-700 shrink-0" />
                                  <span>Giao từ: <strong>{order.product?.province || "Hà Nội"}</strong> → <strong>{order.buyerAddress ? order.buyerAddress.split(',').slice(-2).join(', ') : "Địa chỉ khách"}</strong></span>
                                </div>
                                <div className="text-[10px] text-emerald-800 font-mono flex items-center gap-2">
                                  <span>Bắt đầu thuê: <strong>{order.startDate ? new Date(order.startDate).toLocaleDateString('vi-VN') : 'Khi nhận đồ'}</strong></span>
                                  <span>•</span>
                                  <span>Hạn trả: <strong>{order.endDate ? new Date(order.endDate).toLocaleDateString('vi-VN') : 'Dự kiến'}</strong></span>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-3 mt-3">
                                {order.status === "PENDING_APPROVAL" && (
                                  <button 
                                    disabled={requestingPickupIds[order.id]}
                                    onClick={() => {
                                      setPackagingOrder(order);
                                      setPackagingProofs([]);
                                      setPackagingChecklist({ cleanAndIntact: true, fullAccessories: true, sealedProperly: true });
                                    }}
                                    className="border border-[#183A2D] bg-[#183A2D] hover:bg-transparent text-white hover:text-[#183A2D] text-xs font-medium px-5 py-2.5 rounded-md transition-all duration-500 flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
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
                                {order.status === "LENDER_SHIPPED" && (
                                  <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium px-4 py-2.5 rounded-md flex items-center gap-2">
                                    <Truck size={14} className="text-emerald-700" /> Đang vận chuyển • Chờ khách nhận đồ
                                  </div>
                                )}
                                {order.status === "BORROWER_RECEIVED" && (
                                  <div className="bg-sky-50 text-sky-800 border border-sky-200 text-xs font-medium px-4 py-2.5 rounded-md flex items-center gap-2">
                                    <CheckCircle size={14} className="text-sky-700" /> Khách đang diện đồ • Chờ đến hạn trả
                                  </div>
                                )}
                                {order.status === "BORROWER_RETURNED" && (
                                  <div className="w-full space-y-2.5">
                                    {order.disputes?.some((d: any) => d.status === "APPROVED_DEDUCTION" || d.adminNotes?.includes("pendingRefundToRenter")) && (
                                      <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-950 space-y-1">
                                        <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                                          <RotateCcw size={14} /> Kiện hàng đang hoàn về từ khách (Do khiếu nại sai mẫu / lỗi)
                                        </div>
                                        <p className="text-[10px] text-amber-800/90 leading-relaxed font-light">
                                          ⚠️ <strong>Lưu ý:</strong> Chủ tủ tự thanh toán cước giao về (~25.000đ) cho bưu tá khi nhận lại kiện hàng. Sau khi kiểm tra hàng hoàn tất, bấm nút bên dưới để giải ngân hoàn 100% tiền cọc & tiền thuê cho khách.
                                        </p>
                                      </div>
                                    )}
                                    <div className="flex flex-wrap gap-3">
                                      <button 
                                        disabled={completingIds[order.id]}
                                        onClick={() => handleCompleteOrder(order.id)}
                                        className="border border-[#183A2D] bg-[#183A2D] hover:bg-transparent text-white hover:text-[#183A2D] text-xs font-medium px-5 py-2.5 rounded-md transition-all duration-500 flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
                                      >
                                        {completingIds[order.id] ? (
                                          <>
                                            <Loader2 size={14} className="animate-spin" /> Đang hoàn tất...
                                          </>
                                        ) : (
                                          <>
                                            <Check size={14} strokeWidth={2} />
                                            {order.disputes?.some((d: any) => d.status === "APPROVED_DEDUCTION" || d.adminNotes?.includes("pendingRefundToRenter"))
                                              ? "Đã nhận lại đồ hoàn (Giải ngân cho khách)"
                                              : "Đã nhận lại đồ"}
                                          </>
                                        )}
                                      </button>
                                      {!order.disputes?.some((d: any) => d.status === "APPROVED_DEDUCTION") && (
                                        <button 
                                          onClick={() => {
                                            setSelectedOrderForDispute(order);
                                            setShowDisputeModal(true);
                                          }}
                                          className="bg-transparent hover:bg-red-50 text-stone-500 hover:text-red-600 border border-stone-200 hover:border-red-200 text-xs font-medium px-4 py-2.5 rounded-md flex items-center gap-2 transition-all duration-500 cursor-pointer"
                                        >
                                          <ShieldAlert size={14} strokeWidth={1.5} /> Khiếu nại hỏng đồ
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {order.status === "LENDER_COMPLETED" && (
                                   <button 
                                     onClick={() => {
                                       setSelectedOrderForReview(order);
                                       setShowReviewModal(true);
                                     }} 
                                     className="border border-stone-200 bg-transparent hover:border-[#183A2D] hover:bg-[#183A2D] text-stone-600 hover:text-white text-xs font-medium px-5 py-2.5 rounded-md transition-all duration-500 flex items-center gap-1.5"
                                   >
                                     ⭐ Đánh giá khách thuê
                                   </button>
                                 )}
                                {order.status === "DISPUTE" && (
                                  <div className="mt-4 p-4 rounded-lg bg-amber-50/70 border border-amber-200/80 text-left space-y-3 w-full">
                                    <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs uppercase tracking-wide">
                                      <AlertTriangle size={15} /> Thỏa thuận hòa giải P2P
                                    </div>
                                    {order.disputes?.[0] ? (
                                      <div className="space-y-2">
                                        <p className="text-xs text-stone-700 font-light">
                                          <span className="font-medium text-stone-900">Lý do:</span> {order.disputes[0].description}
                                        </p>
                                        <p className="text-xs text-stone-700">
                                          {order.disputes[0].adminNotes?.includes('"initiatorRole":"RENTER"') ? (
                                            <>
                                              <span className="font-medium text-stone-900">Khách yêu cầu hoàn tiền thuê:</span>{" "}
                                              <span className="font-bold text-amber-900">{order.disputes[0].suggestedDeduction?.toLocaleString('vi-VN')}đ</span>{" "}
                                              <span className="text-[10px] text-stone-500">(và hoàn trả 100% tiền cọc cho khách)</span>
                                            </>
                                          ) : (
                                            <>
                                              <span className="font-medium text-stone-900">Đề xuất bồi thường:</span>{" "}
                                              <span className="font-bold text-amber-900">{order.disputes[0].suggestedDeduction?.toLocaleString('vi-VN')}đ</span>{" "}
                                              <span className="text-[10px] text-stone-500">(khấu trừ từ tiền cọc của khách)</span>
                                            </>
                                          )}
                                        </p>
                                        {order.disputes[0].images?.length > 0 && (
                                          <div className="flex gap-2 pt-1">
                                            {order.disputes[0].images.map((img: string, i: number) => (
                                              <img key={i} src={img} alt="Minh chứng" className="w-12 h-12 rounded object-cover border border-amber-200" />
                                            ))}
                                          </div>
                                        )}
                                        {order.disputes[0].status === "PENDING_REVIEW" ? (
                                          <div className="pt-2">
                                            {order.disputes[0].adminNotes?.includes('"initiatorRole":"OWNER"') ? (
                                              <p className="text-[11px] text-amber-700 italic bg-amber-100/50 p-2 rounded border border-amber-200/50">
                                                ⏳ Đang chờ khách thuê phản hồi đề xuất bồi thường của bạn...
                                              </p>
                                            ) : (
                                              <div className="flex flex-wrap gap-2">
                                                <button
                                                  disabled={acceptingDisputeIds[order.disputes[0].id]}
                                                  onClick={() => handleAcceptDispute(order.disputes[0].id)}
                                                  className="bg-[#183A2D] hover:bg-[#122b22] text-white text-xs font-medium px-4 py-2 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                                >
                                                  {acceptingDisputeIds[order.disputes[0].id] ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                                  Đồng ý hoàn tiền & Đóng đơn
                                                </button>
                                                <button
                                                  disabled={rejectingDisputeIds[order.disputes[0].id]}
                                                  onClick={() => handleRejectDispute(order.disputes[0].id)}
                                                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium px-3 py-2 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                                >
                                                  {rejectingDisputeIds[order.disputes[0].id] ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                                                  Từ chối (Đẩy lên BQT)
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <p className="text-[11px] text-red-700 font-medium bg-red-50 p-2 rounded border border-red-200">
                                            ⚠️ Vụ việc đã được chuyển lên Ban Quản Trị CLOOP để làm trọng tài giải quyết.
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-stone-500">Đang khởi tạo khiếu nại...</p>
                                    )}
                                  </div>
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
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div>
                {(() => {
                  const displayedRented = rentedOrders.filter((order) => {
                    if (statusFilter === "ACTIVE") return order.status === "PENDING_APPROVAL" || order.status === "OWNER_PACKED" || order.status === "LENDER_SHIPPED" || order.status === "BORROWER_RECEIVED";
                    if (statusFilter === "RETURNED") return order.status === "BORROWER_RETURNED";
                    if (statusFilter === "DISPUTED") return order.status === "DISPUTE" || (order.disputes && order.disputes.some((d: any) => d.status === "PENDING_REVIEW" || d.status === "DISPUTED"));
                    if (statusFilter === "COMPLETED") return order.status === "LENDER_COMPLETED" || order.status === "CANCELLED";
                    return true;
                  });

                  return displayedRented.length > 0 ? (
                    <div className="flex flex-col">
                      {displayedRented.map((order) => (
                        <div key={order.id} className="p-6 sm:p-8 border-b border-stone-100 hover:bg-slate-50/50 transition-colors duration-500 flex flex-col md:flex-row gap-6 md:gap-8">
                          <div className="flex-1 flex gap-5">
                            <img src={order.product?.images?.[0]?.url || PLACEHOLDER_IMG} className="w-24 h-32 rounded-md object-cover bg-stone-50 border border-stone-100 shrink-0 shadow-sm" />
                            <div className="flex flex-col gap-1.5 justify-center">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[9px] tracking-widest text-slate-500 uppercase">ORD-{String(order.id).substring(0,8)}</span>
                                <span className="text-[9.5px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 font-semibold inline-flex items-center gap-1">
                                  <Truck size={11} className="text-emerald-700" />
                                  GHN-{String(order.id).substring(0,8).toUpperCase()}
                                </span>
                              </div>
                              <span className="font-medium text-slate-900 text-sm sm:text-base tracking-wide line-clamp-1">{order.product?.title || 'CLOOP Item'}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-light tracking-wider text-stone-500">Chủ đồ:</span>
                                <span className="font-medium text-slate-800 text-[11px]">{order.product?.user?.name || `ID:${order.product?.userId?.substring(0,6)}`}</span>
                              </div>

                              {/* Lộ trình & Lịch trình dự kiến (Shopee Standard) */}
                              <div className="mt-2 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200/60 text-[10.5px] text-emerald-950 space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <Truck size={12} className="text-emerald-700 shrink-0" />
                                  <span>Gửi từ: <strong>{order.product?.province || "Hà Nội"}</strong> → Giao tới bạn</span>
                                </div>
                                <div className="text-[10px] text-emerald-800 font-mono flex flex-wrap items-center gap-2">
                                  <span>Bắt đầu thuê: <strong>{order.startDate ? new Date(order.startDate).toLocaleDateString('vi-VN') : 'Khi nhận đồ'}</strong></span>
                                  <span>•</span>
                                  <span>Hạn trả: <strong>{order.endDate ? new Date(order.endDate).toLocaleDateString('vi-VN') : 'Dự kiến'}</strong></span>
                                </div>
                                {order.status === "LENDER_SHIPPED" && (
                                  <>
                                    <p className="text-[9.5px] text-emerald-700 italic pt-0.5">
                                      💡 Gói thuê chỉ bắt đầu tính giờ khi bạn bấm nút &quot;Đã nhận được đồ&quot; bên dưới.
                                    </p>
                                    <div className="mt-2 p-3 rounded-lg bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-950 flex items-start gap-2.5">
                                      <div className="p-1.5 bg-amber-100/80 rounded-md text-amber-800 shrink-0 mt-0.5">
                                        <Video size={16} />
                                      </div>
                                      <div className="space-y-0.5">
                                        <p className="font-semibold text-amber-900">
                                          Khuyến nghị: Quay video mở hộp (Unboxing Proof)
                                        </p>
                                        <p className="text-[10px] text-amber-800/90 leading-relaxed font-light">
                                          Vui lòng quay video liền mạch từ lúc còn nguyên vẹn tem niêm phong và mã vận đơn để bảo vệ quyền lợi <strong>hoàn tiền 100%</strong> nếu trang phục bị giao sai mẫu mã hoặc hư hỏng.
                                        </p>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap gap-3 mt-3">
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
                                  <>
                                    <button 
                                      disabled={returningIds[order.id]}
                                      onClick={() => handleRenterReturn(order.id)}
                                      className="border border-slate-900 bg-slate-900 hover:bg-transparent text-white hover:text-slate-900 text-xs font-medium px-5 py-2.5 rounded-md transition-all duration-500 disabled:opacity-50 flex items-center gap-2"
                                    >
                                      {returningIds[order.id] ? <><Loader2 size={14} className="animate-spin" /> Đang xử lý...</> : "Đóng gói trả đồ"}
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setSelectedOrderForDispute(order);
                                        setShowDisputeModal(true);
                                      }}
                                      className="bg-transparent hover:bg-red-50 text-stone-500 hover:text-red-600 border border-stone-200 hover:border-red-200 text-xs font-medium px-4 py-2.5 rounded-md flex items-center gap-2 transition-all duration-500"
                                    >
                                      <ShieldAlert size={14} strokeWidth={1.5} /> Báo lỗi đồ
                                    </button>
                                  </>
                                )}
                                {order.status === "BORROWER_RETURNED" && (
                                  <div className="bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium px-4 py-2 rounded-md flex items-center gap-2">
                                    <Truck size={14} /> Đang chuyển hoàn về chủ đồ...
                                  </div>
                                )}
                                {order.status === "LENDER_COMPLETED" && (
                                  <button onClick={() => {
                                    setSelectedOrderForReview(order);
                                    setShowReviewModal(true);
                                  }} className="border border-stone-200 bg-transparent hover:border-slate-900 hover:bg-slate-900 text-stone-500 hover:text-white text-xs font-medium px-5 py-2.5 rounded-md transition-all duration-500">
                                    Đánh giá
                                  </button>
                                )}
                                {order.status === "DISPUTE" && (
                                  <div className="mt-4 p-4 rounded-lg bg-amber-50/70 border border-amber-200/80 text-left space-y-3 w-full">
                                    <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs uppercase tracking-wide">
                                      <AlertTriangle size={15} /> Thỏa thuận hòa giải P2P
                                    </div>
                                    {order.disputes?.[0] ? (
                                      <div className="space-y-2">
                                        <p className="text-xs text-stone-700 font-light">
                                          <span className="font-medium text-stone-900">Lý do sự cố:</span> {order.disputes[0].description}
                                        </p>
                                        <p className="text-xs text-stone-700">
                                          {order.disputes[0].adminNotes?.includes('"initiatorRole":"RENTER"') ? (
                                            <>
                                              <span className="font-medium text-stone-900">Bạn đã yêu cầu hoàn tiền thuê:</span>{" "}
                                              <span className="font-bold text-amber-900">{order.disputes[0].suggestedDeduction?.toLocaleString('vi-VN')}đ</span>{" "}
                                              <span className="text-[10px] text-stone-500">(kèm hoàn trả 100% tiền cọc)</span>
                                            </>
                                          ) : (
                                            <>
                                              <span className="font-medium text-stone-900">Chủ tủ đề xuất khấu trừ cọc:</span>{" "}
                                              <span className="font-bold text-amber-900">{order.disputes[0].suggestedDeduction?.toLocaleString('vi-VN')}đ</span>{" "}
                                              <span className="text-[10px] text-stone-500">(để bồi thường hư hỏng)</span>
                                            </>
                                          )}
                                        </p>
                                        {order.disputes[0].images?.length > 0 && (
                                          <div className="flex gap-2 pt-1">
                                            {order.disputes[0].images.map((img: string, i: number) => (
                                              <img key={i} src={img} alt="Minh chứng" className="w-12 h-12 rounded object-cover border border-amber-200" />
                                            ))}
                                          </div>
                                        )}
                                        {order.disputes[0].status === "PENDING_REVIEW" ? (
                                          <div className="pt-2">
                                            {order.disputes[0].adminNotes?.includes('"initiatorRole":"RENTER"') ? (
                                              <p className="text-[11px] text-amber-700 italic bg-amber-100/50 p-2 rounded border border-amber-200/50">
                                                ⏳ Đang chờ chủ tủ phản hồi yêu cầu hoàn tiền của bạn...
                                              </p>
                                            ) : (
                                              <div className="flex flex-wrap gap-2">
                                                <button
                                                  disabled={acceptingDisputeIds[order.disputes[0].id]}
                                                  onClick={() => handleAcceptDispute(order.disputes[0].id)}
                                                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-4 py-2 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                                >
                                                  {acceptingDisputeIds[order.disputes[0].id] ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                                  Đồng ý khấu trừ & Nhận phần cọc còn lại
                                                </button>
                                                <button
                                                  disabled={rejectingDisputeIds[order.disputes[0].id]}
                                                  onClick={() => handleRejectDispute(order.disputes[0].id)}
                                                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium px-3 py-2 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                                >
                                                  {rejectingDisputeIds[order.disputes[0].id] ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                                                  Không đồng ý (Đẩy lên BQT)
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <p className="text-[11px] text-red-700 font-medium bg-red-50 p-2 rounded border border-red-200">
                                            ⚠️ Vụ việc đã được chuyển lên Ban Quản Trị CLOOP để làm trọng tài giải quyết.
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-stone-500">Đang khởi tạo khiếu nại...</p>
                                    )}
                                  </div>
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
                  );
                })()}
              </div>
            )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {showDisputeModal && selectedOrderForDispute && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-white border border-stone-100 rounded-xl max-w-[460px] w-full shadow-2xl p-8 text-left space-y-5">
            <div className="flex justify-between items-center border-b border-stone-100 pb-4">
              <h3 className="text-xs font-semibold text-amber-800 tracking-wide uppercase flex items-center gap-2">
                <AlertTriangle size={16} strokeWidth={2} /> 
                {!isOwnerMode ? "Báo lỗi đồ & Yêu cầu hoàn tiền" : "Báo cáo sự cố & Đề xuất bồi thường"}
              </h3>
              <button onClick={() => setShowDisputeModal(false)} className="text-stone-400 hover:text-stone-900 transition-colors p-1"><X size={18} strokeWidth={1.5} /></button>
            </div>
            
            <p className="text-xs font-light text-stone-600 leading-relaxed">
              {!isOwnerMode 
                ? "Trang phục nhận được bị sai mẫu mã, rách hoặc bẩn trước khi mặc? Hãy gửi hình ảnh thực tế và số tiền thuê bạn yêu cầu hoàn lại. Khi Chủ tủ đồng ý, toàn bộ tiền cọc và tiền thuê sẽ được hoàn trả về ví của bạn."
                : "Hệ thống sẽ gửi đề xuất bồi thường đến khách thuê để khấu trừ từ tiền cọc. Nếu 2 bên không đạt thỏa thuận, vụ việc sẽ được chuyển lên Ban Quản Trị CLOOP phân xử."}
            </p>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-medium text-stone-500 uppercase tracking-wide">Mô tả chi tiết sự cố</label>
              <textarea 
                rows={3} 
                value={disputeDescription} 
                onChange={(e) => setDisputeDescription(e.target.value)} 
                placeholder={!isOwnerMode ? "Mô tả chi tiết việc sai mẫu mã, kích thước hoặc lỗi rách từ lúc nhận..." : "Mô tả cụ thể vết ố, rách, mất phụ kiện sau khi khách trả đồ..."} 
                className="w-full px-4 py-2.5 rounded-md border border-stone-200/60 text-sm font-light focus:outline-none focus:border-amber-500 bg-stone-50/30 resize-none transition-colors" 
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-medium text-stone-500 uppercase tracking-wide">
                  {!isOwnerMode ? "Tiền thuê yêu cầu hoàn trả (VNĐ)" : "Mức khấu trừ từ tiền cọc (VNĐ)"}
                </label>
                <span className="text-[10px] text-amber-800 font-medium">
                  {!isOwnerMode 
                    ? `Tối đa tiền thuê: ${(selectedOrderForDispute.invoice?.rentalFee || 0).toLocaleString('vi-VN')}đ`
                    : `Cọc tối đa: ${(selectedOrderForDispute.invoice?.depositAmount || 0).toLocaleString('vi-VN')}đ`}
                </span>
              </div>
              <input 
                type="number" 
                min={0}
                max={!isOwnerMode ? (selectedOrderForDispute.invoice?.rentalFee || 10000000) : (selectedOrderForDispute.invoice?.depositAmount || 10000000)}
                step={10000}
                value={suggestedDeduction || ""} 
                onChange={(e) => setSuggestedDeduction(Number(e.target.value) || 0)} 
                placeholder={!isOwnerMode ? `VD: ${selectedOrderForDispute.invoice?.rentalFee || 50000} (Hoàn 100% tiền thuê)` : "VD: 80000 (chi phí spa, phục hồi...)"} 
                className="w-full px-4 py-2.5 rounded-md border border-stone-200/60 text-sm font-medium focus:outline-none focus:border-amber-500 bg-stone-50/30 transition-colors" 
              />
              <p className="text-[10px] text-stone-400 italic leading-relaxed">
                {!isOwnerMode 
                  ? `* Khi hàng lỗi: CLOOP miễn phí dịch vụ sàn 100%. Phí ship chiều đi do khách trả khi mới khui, phí ship chiều về do chủ tủ tự thanh toán cho bưu tá khi nhận lại hàng. Toàn bộ tiền cọc (${(selectedOrderForDispute.invoice?.depositAmount || 0).toLocaleString('vi-VN')}đ) và tiền thuê sẽ được hoàn về ví của bạn.`
                  : "* Khoản tiền này sẽ được khấu trừ từ tiền cọc của khách thuê chuyển thẳng vào ví chủ đồ sau khi 2 bên đồng thuận."}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-medium text-stone-500 uppercase tracking-wide">Ảnh minh chứng hiện trường (Ít nhất 1 ảnh)</label>
              <div className="flex flex-wrap gap-2.5">
                {disputeImages.map((img, i) => (
                  <img key={i} src={img} alt="Bằng chứng" className="w-14 h-14 object-cover rounded-md border border-stone-200 shadow-xs" />
                ))}
                <CldUploadWidget uploadPreset="cloop_uploads" onSuccess={(result: any) => { if (result.info?.secure_url) setDisputeImages(prev => [...prev, result.info.secure_url]); }}>
                  {({ open }) => (
                    <button type="button" onClick={() => open()} className="w-14 h-14 rounded-md border border-dashed border-stone-300 flex items-center justify-center text-stone-400 hover:border-amber-400 hover:text-amber-600 transition-colors text-lg font-light">+</button>
                  )}
                </CldUploadWidget>
              </div>
            </div>

            <button 
              type="button" 
              onClick={handleSubmitDispute} 
              disabled={isDisputeSubmitting} 
              className="w-full py-3.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold tracking-wide rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {isDisputeSubmitting ? <><Loader2 size={14} className="animate-spin" /> Đang gửi đề xuất...</> : (!isOwnerMode ? "Gửi yêu cầu hoàn tiền cho Chủ tủ" : "Gửi đề xuất khấu trừ cọc")}
            </button>
          </motion.div>
        </div>
      )}

      {packagingOrder && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-white border border-stone-100 rounded-xl max-w-[480px] w-full shadow-2xl p-6 md:p-8 text-left space-y-5">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-[#183A2D]">
                <Package size={18} strokeWidth={2} />
                <h3 className="text-xs font-semibold uppercase tracking-wide">Kiểm tra niêm phong & Đóng gói</h3>
              </div>
              <button onClick={() => setPackagingOrder(null)} className="text-stone-400 hover:text-stone-900 transition-colors p-1">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-stone-50 border border-stone-200/60">
              <img 
                src={packagingOrder.product?.images?.[0]?.url || packagingOrder.product?.images?.[0] || PLACEHOLDER_IMG} 
                alt="" 
                className="w-12 h-12 rounded object-cover border border-stone-200" 
              />
              <div className="text-xs">
                <p className="font-medium text-stone-900 line-clamp-1">{packagingOrder.product?.title}</p>
                <p className="text-[11px] text-stone-500 font-mono">ORD-{packagingOrder.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-semibold text-stone-600 uppercase tracking-wide">
                1. Danh sách kiểm tra chất lượng trước khi gửi
              </label>
              <div className="space-y-2 text-xs text-stone-700 bg-emerald-50/40 p-3 rounded-lg border border-emerald-100">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={packagingChecklist.cleanAndIntact}
                    onChange={(e) => setPackagingChecklist(prev => ({ ...prev, cleanAndIntact: e.target.checked }))}
                    className="mt-0.5 rounded border-stone-300 text-[#183A2D] focus:ring-[#183A2D]" 
                  />
                  <span>Trang phục sạch sẽ, thơm tho, khóa cúc hoạt động tốt.</span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={packagingChecklist.fullAccessories}
                    onChange={(e) => setPackagingChecklist(prev => ({ ...prev, fullAccessories: e.target.checked }))}
                    className="mt-0.5 rounded border-stone-300 text-[#183A2D] focus:ring-[#183A2D]" 
                  />
                  <span>Kèm đầy đủ phụ kiện & dây tag bảo hiểm niêm phong.</span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={packagingChecklist.sealedProperly}
                    onChange={(e) => setPackagingChecklist(prev => ({ ...prev, sealedProperly: e.target.checked }))}
                    className="mt-0.5 rounded border-stone-300 text-[#183A2D] focus:ring-[#183A2D]" 
                  />
                  <span>Đã dán kín miệng túi / hộp hàng và dán tem niêm phong CLOOP.</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-semibold text-stone-600 uppercase tracking-wide">
                  2. Video / Ảnh gói hàng & niêm phong
                </label>
                <span className="text-[10px] text-emerald-800 font-medium">Bảo vệ quyền lợi 100%</span>
              </div>
              <p className="text-[11px] font-light text-stone-500 leading-relaxed">
                Tải lên video hoặc ảnh cận cảnh quá trình đóng hàng và dán tem. Đây là căn cứ bảo vệ bạn 100% khi có khiếu nại phát sinh từ khách thuê.
              </p>
              
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {packagingProofs.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-stone-200 shadow-xs group">
                    {url.endsWith(".mp4") || url.includes("/video/") ? (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white text-[10px]">
                        <Video size={20} />
                      </div>
                    ) : (
                      <img src={url} alt="Proof" className="w-full h-full object-cover" />
                    )}
                    <button 
                      type="button" 
                      onClick={() => setPackagingProofs(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                <CldUploadWidget 
                  uploadPreset="cloop_uploads" 
                  options={{ maxFiles: 3, resourceType: "auto" }}
                  onSuccess={(result: any) => { 
                    if (result.info?.secure_url) {
                      setPackagingProofs(prev => [...prev, result.info.secure_url]); 
                    }
                  }}
                >
                  {({ open }) => (
                    <button 
                      type="button" 
                      onClick={() => open()} 
                      className="h-16 px-3 rounded-md border border-dashed border-emerald-600/40 hover:border-emerald-600 bg-emerald-50/30 text-emerald-800 flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Camera size={16} /> + Thêm video/ảnh
                    </button>
                  )}
                </CldUploadWidget>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button 
                type="button"
                disabled={requestingPickupIds[packagingOrder.id]}
                onClick={() => handleRequestPickup(packagingOrder.id, [])}
                className="w-1/3 py-3 border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-medium rounded-md transition-colors text-center cursor-pointer"
              >
                Bỏ qua video
              </button>
              <button 
                type="button"
                disabled={requestingPickupIds[packagingOrder.id]}
                onClick={() => handleRequestPickup(packagingOrder.id, packagingProofs)}
                className="w-2/3 py-3 bg-[#183A2D] hover:bg-[#122c22] text-white text-xs font-semibold tracking-wide rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {requestingPickupIds[packagingOrder.id] ? (
                  <><Loader2 size={14} className="animate-spin" /> Đang điều phối...</>
                ) : (
                  <><Check size={14} /> Xác nhận & Gọi Shipper</>
                )}
              </button>
            </div>
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
