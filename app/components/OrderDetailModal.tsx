"use client";

import React, { useState } from "react";
import Image from "next/image";
import { 
  X, 
  Check, 
  Copy, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Package, 
  RotateCcw, 
  ShieldCheck, 
  Loader2, 
  AlertCircle,
  MapPin,
  Phone,
  User,
  ExternalLink
} from "lucide-react";
import { advanceMobileOrderStatusAction } from "@/app/actions/closet";

export interface OrderDetailItem {
  id: string;
  orderCode?: string;
  status: string;
  startDate: string;
  endDate: string;
  rawStartDate?: string | null;
  rawEndDate?: string | null;
  isOverdue?: boolean;
  productTitle: string;
  productImage: string;
  productSize?: string;
  productCategory?: string;
  productMaterial?: string;
  productLocation?: string;
  amount: number;
  rentalFee?: number;
  depositAmount?: number;
  shippingFee?: number;
  renterName?: string;
  renterPhone?: string;
  ownerName?: string;
  ownerPhone?: string;
  shippingCode?: string;
  createdAt?: string;
}

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderDetailItem | null;
  role?: "renter" | "lender";
  clientUserId?: string;
  onStatusUpdated?: (orderId: string, newStatus: string) => void;
}

export function formatOrderStatus(status: string) {
  switch (status) {
    case "PENDING_APPROVAL":
      return {
        label: "Chờ xác nhận",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
        stepIndex: 0
      };
    case "OWNER_PACKED":
      return {
        label: "Đang đóng gói",
        badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
        stepIndex: 1
      };
    case "LENDER_SHIPPED":
      return {
        label: "Đang giao hàng",
        badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
        stepIndex: 1
      };
    case "BORROWER_RECEIVED":
      return {
        label: "Đang thuê",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
        stepIndex: 2
      };
    case "BORROWER_RETURNED":
      return {
        label: "Đã gửi trả đồ",
        badgeClass: "bg-purple-50 text-purple-800 border-purple-200",
        stepIndex: 3
      };
    case "LENDER_COMPLETED":
    case "COMPLETED":
      return {
        label: "Hoàn tất",
        badgeClass: "bg-stone-100 text-[#183A2D] border-stone-300 font-bold",
        stepIndex: 4
      };
    case "DISPUTE":
      return {
        label: "Khiếu nại",
        badgeClass: "bg-rose-50 text-rose-800 border-rose-200 font-bold",
        stepIndex: -1
      };
    case "CANCELLED":
      return {
        label: "Đã hủy",
        badgeClass: "bg-stone-100 text-stone-500 border-stone-200",
        stepIndex: -1
      };
    default:
      return {
        label: "Đang xử lý",
        badgeClass: "bg-stone-100 text-stone-700 border-stone-200",
        stepIndex: 0
      };
  }
}

const STEPS = [
  { key: "PENDING_APPROVAL", label: "Đặt đơn", icon: Package },
  { key: "LENDER_SHIPPED", label: "Giao đồ", icon: Truck },
  { key: "BORROWER_RECEIVED", label: "Đang thuê", icon: Clock },
  { key: "BORROWER_RETURNED", label: "Trả đồ", icon: RotateCcw },
  { key: "LENDER_COMPLETED", label: "Hoàn tất", icon: CheckCircle2 }
];

export default function OrderDetailModal({
  isOpen,
  onClose,
  order,
  role = "renter",
  clientUserId,
  onStatusUpdated
}: OrderDetailModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const statusInfo = formatOrderStatus(order.status);
  const orderCodeDisplay = order.orderCode || order.id.slice(-6).toUpperCase();

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleAdvanceStatus = async (action: "CONFIRM_RECEIVED" | "CONFIRM_RETURNED" | "COMPLETE_ORDER") => {
    setIsProcessing(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    try {
      const res = await advanceMobileOrderStatusAction({
        orderId: order.id,
        action,
        clientUserId
      });

      if (res.success && res.newStatus) {
        setActionSuccessMsg(res.message || "Cập nhật đơn hàng thành công!");
        if (onStatusUpdated) {
          onStatusUpdated(order.id, res.newStatus);
        }
      } else {
        setActionErrorMsg(res.error || "Không thể thực hiện hành động này.");
      }
    } catch (err: any) {
      setActionErrorMsg(err.message || "Lỗi xử lý đơn hàng.");
    } finally {
      setIsProcessing(false);
    }
  };

  const isCompleted = order.status === "LENDER_COMPLETED" || order.status === "COMPLETED";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#183A2D] text-white flex items-center justify-center shadow-xs">
              <Package size={15} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-sm text-[#183A2D] tracking-wide">
                  ĐƠN #{orderCodeDisplay}
                </h3>
                <button
                  type="button"
                  onClick={() => handleCopy(order.id, "orderId")}
                  className="text-stone-400 hover:text-stone-800 transition"
                  title="Sao chép mã đơn"
                >
                  {copiedKey === "orderId" ? <Check size={12} className="text-emerald-700" /> : <Copy size={12} />}
                </button>
              </div>
              <p className="text-[10.5px] text-stone-500 font-light">
                {role === "renter" ? "Đơn bạn đi thuê trang phục" : "Đơn khách thuê trang phục của bạn"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${statusInfo.badgeClass}`}>
              {statusInfo.label}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-200/70 hover:bg-stone-300 text-stone-600 flex items-center justify-center transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
          {/* 1. STATUS TIMELINE STEPPER */}
          <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80">
            <div className="flex items-center justify-between relative">
              {STEPS.map((step, idx) => {
                const isPassed = statusInfo.stepIndex >= idx;
                const isCurrent = statusInfo.stepIndex === idx;
                const IconComponent = step.icon;

                return (
                  <div key={step.key} className="flex flex-col items-center relative z-10 flex-1">
                    <div 
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-[11px] transition-all shadow-2xs ${
                        isCurrent
                          ? "bg-[#183A2D] text-white ring-2 ring-[#183A2D]/20 scale-105"
                          : isPassed
                          ? "bg-emerald-700 text-white"
                          : "bg-white text-stone-400 border border-stone-200"
                      }`}
                    >
                      <IconComponent size={13} strokeWidth={isCurrent ? 2.5 : 2} />
                    </div>
                    <span 
                      className={`text-[9.5px] mt-1.5 font-medium whitespace-nowrap ${
                        isCurrent ? "font-bold text-[#183A2D]" : isPassed ? "text-stone-700" : "text-stone-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}

              {/* Connecting line */}
              <div className="absolute top-3.5 left-4 right-4 h-[2px] bg-stone-200 -z-0">
                <div 
                  className="h-full bg-[#183A2D] transition-all duration-300"
                  style={{
                    width: `${Math.max(0, Math.min(100, (statusInfo.stepIndex / (STEPS.length - 1)) * 100))}%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* 2. CẢNH BÁO THỜI GIAN THUÊ THÔNG MINH */}
          {order.isOverdue && !isCompleted && (
            <div className="p-3 bg-amber-50/90 border border-amber-200/80 text-amber-900 rounded-2xl flex items-start gap-2.5 text-xs">
              <AlertCircle size={15} className="shrink-0 text-amber-700 mt-0.5" />
              <div>
                <span className="font-bold block">Đơn hàng đã qua hạn thuê ({order.endDate})</span>
                <p className="text-[11px] text-amber-800 font-light mt-0.5">
                  Lịch thuê đã kết thúc. Nếu hai bên đã nhận và trả đồ xong, hãy bấm xác nhận để hoàn tất đơn và nhận lại tiền cọc về ví ngay.
                </p>
              </div>
            </div>
          )}

          {/* 3. THÔNG BÁO KẾT QUẢ THAO TÁC */}
          {actionSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
              <span className="font-bold text-xs">{actionSuccessMsg}</span>
            </div>
          )}

          {actionErrorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-700 shrink-0" />
              <span className="text-xs">{actionErrorMsg}</span>
            </div>
          )}

          {/* 4. THÔNG TIN TRANG PHỤC */}
          <div className="bg-white border border-stone-200 rounded-2xl p-3.5 flex gap-3.5 items-center">
            <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200 shadow-2xs">
              <Image 
                src={order.productImage} 
                alt={order.productTitle} 
                fill 
                className="object-cover" 
                unoptimized 
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[9.5px] font-bold text-emerald-800 bg-stone-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                {order.productCategory || "Thuê trang phục"}
              </span>
              <h4 className="font-bold text-stone-900 text-xs mt-1 truncate" title={order.productTitle}>
                {order.productTitle}
              </h4>
              <p className="text-[11px] text-stone-500 font-light mt-0.5">
                Size: <strong className="text-stone-800 font-semibold">{order.productSize || "M"}</strong> {order.productMaterial && `• ${order.productMaterial}`}
              </p>
              <p className="text-[11px] text-stone-600 mt-1 flex items-center gap-1">
                <Clock size={12} className="text-stone-400" />
                <span>Lịch thuê: <strong>{order.startDate}</strong> - <strong>{order.endDate}</strong></span>
              </p>
            </div>
          </div>

          {/* 5. CHI TIẾT TÀI CHÍNH & KÝ QUỸ AN TOÀN */}
          <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3.5 space-y-2 text-[11px]">
            <div className="flex items-center justify-between font-bold text-stone-800 pb-1 border-b border-stone-200/60 uppercase tracking-wider text-[10px]">
              <span>Chi tiết thanh toán</span>
              <span className="text-[#183A2D] flex items-center gap-1 font-mono">
                <ShieldCheck size={13} className="text-emerald-700" />
                <span>Ví Ký Quỹ CLOOP</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-stone-600">
              <span>Giá thuê trang phục:</span>
              <span className="font-mono font-bold text-stone-900">
                {(order.rentalFee || 0).toLocaleString("vi-VN")}đ
              </span>
            </div>

            <div className="flex items-center justify-between text-stone-600">
              <div className="flex items-center gap-1">
                <span>Tiền cọc giữ chỗ:</span>
                <span className="text-[9.5px] text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">
                  Hoàn 100% khi trả
                </span>
              </div>
              <span className="font-mono font-bold text-stone-900">
                {(order.depositAmount || 0).toLocaleString("vi-VN")}đ
              </span>
            </div>

            <div className="flex items-center justify-between text-stone-600">
              <span>Phí vận chuyển GHN:</span>
              <span className="font-mono font-bold text-stone-900">
                {(order.shippingFee || 0).toLocaleString("vi-VN")}đ
              </span>
            </div>

            <div className="pt-1.5 border-t border-stone-200 flex items-center justify-between">
              <span className="font-bold text-stone-900 text-xs">Tổng tiền đã thanh toán:</span>
              <span className="font-mono font-black text-sm text-[#183A2D]">
                {(order.amount || 0).toLocaleString("vi-VN")}đ
              </span>
            </div>
          </div>

          {/* 6. THÔNG TIN ĐỐI TÁC P2P & VẬN CHUYỂN */}
          <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3.5 space-y-2 text-[11px]">
            <span className="font-bold text-stone-800 uppercase tracking-wider text-[10px] block pb-1 border-b border-stone-200/60">
              Thông tin liên hệ &amp; Vận chuyển
            </span>

            <div className="flex items-center justify-between text-stone-600">
              <span>Chủ trang phục:</span>
              <span className="font-bold text-stone-900">{order.ownerName || "Thành viên CLOOP"}</span>
            </div>

            <div className="flex items-center justify-between text-stone-600">
              <span>Khách thuê:</span>
              <span className="font-bold text-stone-900">{order.renterName || "Thành viên CLOOP"}</span>
            </div>

            {order.shippingCode && (
              <div className="flex items-center justify-between text-stone-600 pt-1 border-t border-stone-200/60">
                <span>Mã vận đơn GHN:</span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-[#183A2D]">
                  <span>{order.shippingCode}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(order.shippingCode || "", "shippingCode")}
                    className="text-stone-400 hover:text-stone-800"
                  >
                    {copiedKey === "shippingCode" ? <Check size={11} className="text-emerald-700" /> : <Copy size={11} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-5 py-4 border-t border-stone-100 bg-stone-50/70 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-stone-200/80 hover:bg-stone-300 text-stone-700 font-bold rounded-2xl transition cursor-pointer text-xs"
          >
            Đóng
          </button>

          {/* HÀNH ĐỘNG DÀNH CHO NGƯỜI THUÊ (RENTER) */}
          {role === "renter" && (
            <div className="flex items-center gap-2">
              {order.status === "LENDER_SHIPPED" && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleAdvanceStatus("CONFIRM_RECEIVED")}
                  className="py-2.5 px-4 bg-[#183A2D] hover:bg-[#112a20] active:scale-95 text-white font-bold rounded-2xl shadow-xs transition flex items-center gap-1.5 cursor-pointer text-xs disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Xác Nhận Đã Nhận Đồ</span>
                </button>
              )}

              {order.status === "BORROWER_RECEIVED" && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleAdvanceStatus("CONFIRM_RETURNED")}
                  className="py-2.5 px-4 bg-[#183A2D] hover:bg-[#112a20] active:scale-95 text-white font-bold rounded-2xl shadow-xs transition flex items-center gap-1.5 cursor-pointer text-xs disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                  <span>Báo Đã Gửi Trả Đồ</span>
                </button>
              )}

              {/* NÚT THOÁT TREO ĐƠN NẾU ĐƠN QUÁ HẠN LÂU NGÀY */}
              {order.isOverdue && order.status !== "LENDER_COMPLETED" && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleAdvanceStatus("COMPLETE_ORDER")}
                  className="py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white font-bold rounded-2xl shadow-xs transition flex items-center gap-1.5 cursor-pointer text-xs disabled:opacity-50"
                  title="Xác nhận hoàn tất để giải phóng trạng thái treo đơn và hoàn cọc"
                >
                  {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  <span>Hoàn Tất Đơn &amp; Nhận Lại Cọc</span>
                </button>
              )}
            </div>
          )}

          {/* HÀNH ĐỘNG DÀNH CHO CHỦ ĐỒ (LENDER) */}
          {role === "lender" && (
            <div className="flex items-center gap-2">
              {order.status === "BORROWER_RETURNED" && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleAdvanceStatus("COMPLETE_ORDER")}
                  className="py-2.5 px-4 bg-[#183A2D] hover:bg-[#112a20] active:scale-95 text-white font-bold rounded-2xl shadow-xs transition flex items-center gap-1.5 cursor-pointer text-xs disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  <span>Đã Nhận Lại Đồ &amp; Hoàn Tất</span>
                </button>
              )}

              {order.isOverdue && order.status !== "LENDER_COMPLETED" && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleAdvanceStatus("COMPLETE_ORDER")}
                  className="py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white font-bold rounded-2xl shadow-xs transition flex items-center gap-1.5 cursor-pointer text-xs disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  <span>Xác Nhận Hoàn Tất Đơn</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
