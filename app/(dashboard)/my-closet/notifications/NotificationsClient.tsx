"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Bell, Package, Wallet, Leaf, Truck, CheckCircle2, AlertTriangle, 
  Star, ArrowLeft, Filter, Check, ExternalLink, Clock, Calendar
} from "lucide-react";
import { NotificationItem } from "@/app/actions/notification";

export function NotificationsClient({
  initialNotifications,
  initialUnreadCount
}: {
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [activeTab, setActiveTab] = useState<"ALL" | "ORDER" | "WALLET" | "COIN">("ALL");
  const [unreadOnly, setUnreadOnly] = useState(false);

  // ⚡ ĐỒNG BỘ TRẠNG THÁI ĐÃ ĐỌC TỪ LOCALSTORAGE (PERSISTENT TRACKER)
  useEffect(() => {
    try {
      const readIds: string[] = JSON.parse(localStorage.getItem("cloop_read_notif_ids") || "[]");
      if (readIds.length > 0) {
        setNotifications(prev => prev.map(n => ({
          ...n,
          isRead: n.isRead || readIds.includes(n.id)
        })));
      }
    } catch {}
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = notifications.filter(item => {
    if (activeTab !== "ALL" && item.type !== activeTab) return false;
    if (unreadOnly && item.isRead) return false;
    return true;
  });

  const handleMarkAllRead = () => {
    try {
      const allIds = notifications.map(n => n.id);
      const existingRead: string[] = JSON.parse(localStorage.getItem("cloop_read_notif_ids") || "[]");
      const combined = Array.from(new Set([...existingRead, ...allIds]));
      localStorage.setItem("cloop_read_notif_ids", JSON.stringify(combined));
    } catch {}
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    window.dispatchEvent(new CustomEvent("notifications-updated"));
  };

  const handleItemClick = (item: NotificationItem) => {
    try {
      const existingRead: string[] = JSON.parse(localStorage.getItem("cloop_read_notif_ids") || "[]");
      if (!existingRead.includes(item.id)) {
        const combined = [...existingRead, item.id];
        localStorage.setItem("cloop_read_notif_ids", JSON.stringify(combined));
        setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
        window.dispatchEvent(new CustomEvent("notifications-updated"));
      }
    } catch {}
  };

  const getIcon = (type: string, iconType: string) => {
    switch (iconType) {
      case "package":
        return (
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Package size={19} strokeWidth={2} />
          </div>
        );
      case "wallet":
        return (
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Wallet size={19} strokeWidth={2} />
          </div>
        );
      case "coin":
        return (
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Leaf size={19} strokeWidth={2} />
          </div>
        );
      case "truck":
        return (
          <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-200/80 text-sky-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Truck size={19} strokeWidth={2} />
          </div>
        );
      case "check":
        return (
          <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200/80 text-teal-600 flex items-center justify-center shrink-0 shadow-2xs">
            <CheckCircle2 size={19} strokeWidth={2} />
          </div>
        );
      case "alert":
        return (
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
            <AlertTriangle size={19} strokeWidth={2} />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Bell size={19} strokeWidth={2} />
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-[#183A2D] font-body">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E9E2D8] shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-800 bg-[#EAF2EC] px-2.5 py-1 rounded-md border border-emerald-200/60 font-ui">
              TRUNG TÂM HOẠT ĐỘNG
            </span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold bg-[#183A2D] text-white px-2 py-0.5 rounded-full font-ui">
                {unreadCount} mới
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-[#0A2517] tracking-tight">
            Thông Báo & Lịch Sử Hoạt Động
          </h1>
          <p className="text-xs text-stone-500 font-medium">
            Theo dõi chi tiết ngày giờ, trạng thái đơn thuê, dòng tiền Escrow và điểm thưởng ESG.
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-full transition-colors cursor-pointer self-start sm:self-auto font-ui"
        >
          <Check size={14} />
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-[#E9E2D8] shadow-2xs font-ui">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "ALL" 
                ? "bg-[#183A2D] text-white shadow-xs" 
                : "bg-transparent text-stone-600 hover:bg-stone-100"
            }`}
          >
            Tất cả ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab("ORDER")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "ORDER" 
                ? "bg-[#183A2D] text-white shadow-xs" 
                : "bg-transparent text-stone-600 hover:bg-stone-100"
            }`}
          >
            <Package size={14} strokeWidth={2} className={activeTab === "ORDER" ? "text-white" : "text-blue-600"} />
            <span>Đơn hàng</span>
          </button>
          <button
            onClick={() => setActiveTab("WALLET")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "WALLET" 
                ? "bg-[#183A2D] text-white shadow-xs" 
                : "bg-transparent text-stone-600 hover:bg-stone-100"
            }`}
          >
            <Wallet size={14} strokeWidth={2} className={activeTab === "WALLET" ? "text-white" : "text-amber-600"} />
            <span>Ví tiền</span>
          </button>
          <button
            onClick={() => setActiveTab("COIN")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "COIN" 
                ? "bg-[#183A2D] text-white shadow-xs" 
                : "bg-transparent text-stone-600 hover:bg-stone-100"
            }`}
          >
            <Leaf size={14} strokeWidth={2} className={activeTab === "COIN" ? "text-white" : "text-emerald-600"} />
            <span>Xu Lá ESG</span>
          </button>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-stone-600 cursor-pointer pr-2">
          <input 
            type="checkbox" 
            checked={unreadOnly} 
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="rounded text-[#183A2D] focus:ring-[#183A2D]" 
          />
          Chưa đọc
        </label>
      </div>

      {/* Notification Items List */}
      <div className="space-y-3">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((item) => (
            <Link
              key={item.id}
              href={item.link}
              prefetch={true}
              onClick={() => handleItemClick(item)}
              className={`block bg-white p-4 sm:p-5 rounded-2xl border transition-all duration-200 hover:shadow-xs group ${
                !item.isRead ? "border-stone-300 bg-stone-50/40" : "border-stone-200/80 hover:border-stone-300"
              }`}
            >
              <div className="flex gap-4 items-start">
                {getIcon(item.type, item.iconType)}

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="text-sm font-semibold text-[#0A2517] font-heading group-hover:text-[#183A2D] transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-stone-400 font-mono shrink-0">
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {item.timeRelative}
                      </span>
                      <span>•</span>
                      <span className="font-medium text-stone-500">
                        {item.timeFormatted}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed font-normal">
                    {item.message}
                  </p>

                  <div className="pt-1 flex items-center gap-1 text-xs font-medium text-stone-700 group-hover:text-[#183A2D] font-ui transition-colors">
                    <span>
                      {item.type === "ORDER" 
                        ? "Xem đơn hàng" 
                        : item.type === "WALLET" 
                        ? "Xem ví tiền" 
                        : item.type === "COIN" 
                        ? "Xem ví lá" 
                        : "Khám phá ngay"}
                    </span>
                    <ExternalLink size={11} className="opacity-70" />
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="bg-white p-12 rounded-3xl border border-[#E9E2D8] text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-50 text-[#183A2D] rounded-full flex items-center justify-center mx-auto">
              <Bell size={22} />
            </div>
            <h3 className="font-bold text-base text-[#0A2517] font-heading">
              {activeTab === "ORDER" 
                ? "Chưa có đơn hàng nào" 
                : activeTab === "WALLET" 
                ? "Chưa có biến động số dư ví" 
                : activeTab === "COIN"
                ? "Chưa có lịch sử điểm lá"
                : "Hộp thư thông báo đang trống"}
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              {activeTab === "ORDER"
                ? "Bạn chưa có đơn thuê hoặc cho thuê nào. Khi có khách thuê trang phục của bạn hoặc bạn đặt thuê đồ, tiến trình vận chuyển sẽ hiển thị tại đây."
                : activeTab === "WALLET"
                ? "Lịch sử nhận tiền thuê, hoàn cọc ký quỹ Escrow và rút tiền về tài khoản ngân hàng sẽ được cập nhật tự động khi phát sinh giao dịch."
                : activeTab === "COIN"
                ? "Điểm Lá Xanh ESG nhận được từ các nhiệm vụ tuần hoàn hoặc nạp thêm sẽ được hiển thị chi tiết tại đây."
                : "Mọi hoạt động mới nhất về đơn thuê, dòng tiền và điểm thưởng cá nhân của bạn sẽ được hiển thị đầy đủ tại đây."}
            </p>
            {activeTab === "ORDER" && (
              <div className="pt-2">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#183A2D] hover:bg-emerald-800 px-4 py-2 rounded-xl transition shadow-xs"
                >
                  Khám phá trang phục trên sàn →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
