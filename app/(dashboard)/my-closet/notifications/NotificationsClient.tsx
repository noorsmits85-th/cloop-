"use client";

import React, { useState } from "react";
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

  const filteredNotifications = notifications.filter(item => {
    if (activeTab !== "ALL" && item.type !== activeTab) return false;
    if (unreadOnly && item.isRead) return false;
    return true;
  });

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const getIcon = (type: string, iconType: string) => {
    switch (iconType) {
      case "package":
        return <div className="w-10 h-10 rounded-2xl bg-emerald-100/80 text-[#183A2D] flex items-center justify-center shrink-0 shadow-2xs"><Package size={20} /></div>;
      case "wallet":
        return <div className="w-10 h-10 rounded-2xl bg-amber-100/80 text-amber-800 flex items-center justify-center shrink-0 shadow-2xs"><Wallet size={20} /></div>;
      case "coin":
        return <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center shrink-0 shadow-2xs"><Leaf size={20} /></div>;
      case "truck":
        return <div className="w-10 h-10 rounded-2xl bg-blue-100/80 text-blue-800 flex items-center justify-center shrink-0 shadow-2xs"><Truck size={20} /></div>;
      case "check":
        return <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 shadow-2xs"><CheckCircle2 size={20} /></div>;
      case "alert":
        return <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0 shadow-2xs"><AlertTriangle size={20} /></div>;
      default:
        return <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0 shadow-2xs"><Star size={20} /></div>;
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
            {initialUnreadCount > 0 && (
              <span className="text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full font-ui">
                {initialUnreadCount} mới
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
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E9E2D8] shadow-2xs font-ui">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ALL" 
                ? "bg-[#183A2D] text-white shadow-xs" 
                : "bg-transparent text-stone-600 hover:bg-stone-100"
            }`}
          >
            Tất cả ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab("ORDER")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ORDER" 
                ? "bg-[#183A2D] text-white shadow-xs" 
                : "bg-transparent text-stone-600 hover:bg-stone-100"
            }`}
          >
            📦 Đơn hàng
          </button>
          <button
            onClick={() => setActiveTab("WALLET")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "WALLET" 
                ? "bg-[#183A2D] text-white shadow-xs" 
                : "bg-transparent text-stone-600 hover:bg-stone-100"
            }`}
          >
            💰 Ví tiền
          </button>
          <button
            onClick={() => setActiveTab("COIN")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "COIN" 
                ? "bg-[#183A2D] text-white shadow-xs" 
                : "bg-transparent text-stone-600 hover:bg-stone-100"
            }`}
          >
            🌿 Xu Lá ESG
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
              className={`block bg-white p-4 sm:p-5 rounded-2xl border transition-all duration-200 hover:shadow-md hover:border-[#183A2D]/30 group ${
                !item.isRead ? "border-emerald-300/80 bg-emerald-50/20" : "border-[#E9E2D8]"
              }`}
            >
              <div className="flex gap-4 items-start">
                {getIcon(item.type, item.iconType)}

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="text-sm font-bold text-[#0A2517] font-heading group-hover:text-[#183A2D] transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-stone-400 font-mono shrink-0">
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {item.timeRelative}
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-stone-500">
                        {item.timeFormatted}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed font-normal">
                    {item.message}
                  </p>

                  <div className="pt-1 flex items-center gap-1.5 text-[11px] font-bold text-[#183A2D] uppercase tracking-wider font-ui group-hover:underline">
                    <span>Xem chi tiết giao dịch</span>
                    <ExternalLink size={12} />
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
              Không có thông báo nào
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Mọi hoạt động mới nhất về đơn thuê, dòng tiền và điểm thưởng của bạn sẽ được hiển thị đầy đủ tại đây.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
