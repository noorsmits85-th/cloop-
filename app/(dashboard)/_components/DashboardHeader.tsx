"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Bell, Plus, Award, LogOut, Menu, Package, Wallet, Leaf, Truck, CheckCircle2, AlertTriangle, Star, Clock, Check, Loader2 } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { getUserNotificationsAction, NotificationItem } from "@/app/actions/notification";

export function DashboardHeader({
  currentUser,
  setCurrentUser,
  setIsSidebarOpen
}: {
  currentUser: any;
  setCurrentUser: any;
  setIsSidebarOpen: (v: boolean) => void;
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
  const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

  // ⚡ TẢI THÔNG BÁO THỰC TẾ TỪ SERVER VÀ ĐỒNG BỘ TRẠNG THÁI ĐÃ ĐỌC PERSISTENT
  const loadNotifications = async () => {
    try {
      setIsLoadingNotifs(true);
      const res = await getUserNotificationsAction();
      if (res.success) {
        let readIds: string[] = [];
        try {
          readIds = JSON.parse(localStorage.getItem("cloop_read_notif_ids") || "[]");
        } catch {}

        const updated = res.notifications.map(n => ({
          ...n,
          isRead: n.isRead || readIds.includes(n.id)
        }));

        setNotifications(updated);
        const unread = updated.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (e) {
      console.error("Lỗi tải thông báo header:", e);
    } finally {
      setIsLoadingNotifs(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    // 🔔 Supabase Realtime Channel: Tự động làm mới khi có đơn hàng hoặc biến động số dư
    const channel = supabase
      .channel("header_notifications_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rental_history" },
        () => loadNotifications()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "coin_ledger_entries" },
        () => loadNotifications()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ledger_transactions" },
        () => loadNotifications()
      )
      .subscribe();

    window.addEventListener("notifications-updated", loadNotifications);
    window.addEventListener("focus", loadNotifications);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("notifications-updated", loadNotifications);
      window.removeEventListener("focus", loadNotifications);
    };
  }, []);

  // Đóng notification khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const allIds = notifications.map(n => n.id);
      const existingRead: string[] = JSON.parse(localStorage.getItem("cloop_read_notif_ids") || "[]");
      const combined = Array.from(new Set([...existingRead, ...allIds]));
      localStorage.setItem("cloop_read_notif_ids", JSON.stringify(combined));
    } catch {}

    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    window.dispatchEvent(new CustomEvent("notifications-updated"));
  };

  const handleNotificationItemClick = (item: NotificationItem) => {
    try {
      const existingRead: string[] = JSON.parse(localStorage.getItem("cloop_read_notif_ids") || "[]");
      if (!existingRead.includes(item.id)) {
        const combined = [...existingRead, item.id];
        localStorage.setItem("cloop_read_notif_ids", JSON.stringify(combined));
        setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        window.dispatchEvent(new CustomEvent("notifications-updated"));
      }
    } catch {}
    setShowNotifications(false);
  };

  const getNotifIcon = (iconType: string) => {
    const baseClass = "w-8 h-8 rounded-lg bg-stone-100 border border-stone-200/70 text-stone-700 flex items-center justify-center shrink-0";
    switch (iconType) {
      case "package":
        return <div className={baseClass}><Package size={14} strokeWidth={1.75} /></div>;
      case "wallet":
        return <div className={baseClass}><Wallet size={14} strokeWidth={1.75} /></div>;
      case "coin":
        return <div className={baseClass}><Leaf size={14} strokeWidth={1.75} /></div>;
      case "truck":
        return <div className={baseClass}><Truck size={14} strokeWidth={1.75} /></div>;
      case "check":
        return <div className={baseClass}><CheckCircle2 size={14} strokeWidth={1.75} /></div>;
      case "alert":
        return <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0"><AlertTriangle size={14} strokeWidth={1.75} /></div>;
      default:
        return <div className={baseClass}><Bell size={14} strokeWidth={1.75} /></div>;
    }
  };

  return (
    <header className="sticky top-0 z-40 h-[72px] md:h-[88px] bg-white/95 backdrop-blur-md border-b border-[#E9E2D8] flex items-center justify-between px-4 md:px-8 shrink-0">
      <div className="flex items-center gap-4">
        <button
          className="md:hidden text-[#183A2D] p-2 -ml-2 rounded-lg hover:bg-stone-100 cursor-pointer"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu size={24} />
        </button>

        {/* Search Bar */}
        <div className="hidden md:flex items-center w-[250px] lg:w-[350px] h-[44px] bg-stone-50 border border-stone-200 rounded-full px-4 focus-within:bg-white focus-within:border-[#183A2D] focus-within:shadow-sm transition-all">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Tìm mã đơn hàng, sản phẩm..."
            className="w-full bg-transparent border-none outline-none text-xs ml-3 font-search text-[#183A2D] placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        {/* CHUÔNG THÔNG BÁO TƯƠNG TÁC */}
        <div className="relative" ref={notifRef}>
          <button 
            type="button"
            onClick={() => {
              if (!showNotifications) loadNotifications();
              setShowNotifications(!showNotifications);
            }}
            className="relative p-2 text-stone-500 hover:text-[#183A2D] hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
            aria-label="Thông báo"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-rose-500 text-white text-[9.5px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* DROPDOWN DANH SÁCH THÔNG BÁO */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-stone-200 rounded-3xl shadow-2xl z-50 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150 font-body">
              
              {/* Header Dropdown */}
              <div className="px-4 py-3 bg-[#183A2D] text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider font-ui">Thông báo CLOOP</span>
                  {unreadCount > 0 ? (
                    <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-bold font-ui">
                      {unreadCount} mới
                    </span>
                  ) : (
                    <span className="text-[10px] bg-white/20 text-stone-200 px-2 py-0.5 rounded-full font-medium font-ui">
                      Cập nhật
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-emerald-200 hover:text-white underline cursor-pointer font-ui flex items-center gap-1"
                  >
                    <Check size={11} /> Đã đọc hết
                  </button>
                )}
              </div>

              {/* Danh sách thông báo */}
              <div className="divide-y divide-stone-100 max-h-[380px] overflow-y-auto">
                {isLoadingNotifs && notifications.length === 0 ? (
                  <div className="p-8 text-center text-stone-400 text-xs flex flex-col items-center gap-2">
                    <Loader2 size={20} className="animate-spin text-emerald-700" />
                    <span>Đang nạp thông báo thực tế...</span>
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.slice(0, 6).map((item) => (
                    <Link
                      key={item.id}
                      href={item.link}
                      prefetch={true}
                      onClick={() => handleNotificationItemClick(item)}
                      className={`p-3.5 transition-colors flex gap-3 items-start block hover:bg-emerald-50/50 ${
                        !item.isRead ? "bg-emerald-50/30 font-medium" : ""
                      }`}
                    >
                      {getNotifIcon(item.iconType)}
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-stone-900 font-heading line-clamp-1">
                            {item.title}
                          </p>
                          {!item.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-600 leading-snug line-clamp-2">
                          {item.message}
                        </p>
                        <div className="flex items-center gap-1.5 text-[9.5px] text-stone-400 font-mono pt-0.5">
                          <Clock size={9.5} />
                          <span>{item.timeRelative}</span>
                          <span>•</span>
                          <span>{item.timeFormatted}</span>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-8 text-center text-stone-400 text-xs space-y-1">
                    <Bell size={24} className="mx-auto text-stone-300 mb-2" />
                    <p className="font-semibold text-stone-600">Chưa có thông báo nào</p>
                    <p className="text-[11px]">Hoạt động đơn hàng và tài chính của bạn sẽ xuất hiện tại đây.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-2.5 bg-stone-50 border-t border-stone-100 text-center font-ui">
                <Link
                  href="/my-closet/notifications"
                  prefetch={true}
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] font-bold text-[#183A2D] hover:underline block"
                >
                  Xem toàn bộ lịch sử hoạt động ({notifications.length}) →
                </Link>
              </div>
            </div>
          )}
        </div>

        <Link
          href="/my-closet/create"
          prefetch={true}
          className="hidden sm:flex items-center gap-2 bg-[#183A2D] hover:bg-[#112a20] text-white px-4 md:px-5 py-2 md:py-2.5 rounded-full text-xs font-bold transition-all shadow-md hover:shadow-lg font-ui"
        >
          <Plus size={16} />
          Thêm đồ mới
        </Link>

        <div className="w-[1px] h-6 bg-gray-200 mx-1 hidden sm:block"></div>

        {/* User Dropdown Profile */}
        <div className="flex items-center gap-3 group relative cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center text-emerald-800 font-bold text-sm overflow-hidden shrink-0">
            {currentUser?.name?.charAt(0).toUpperCase() || "C"}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-[#183A2D] truncate max-w-[100px] capitalize">
              {currentUser?.name || "Member"}
            </div>
            <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
              <Award size={10} /> Trustworthy
            </div>
          </div>

          {/* Dropdown Menu */}
          <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right scale-95 group-hover:scale-100 font-ui py-2 z-50">
            <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
              <div className="text-xs font-bold text-[#183A2D] capitalize">{currentUser?.name || "Member"}</div>
              <div className="text-[10px] text-emerald-600 font-bold">Trustworthy</div>
            </div>
            <Link href="/my-closet/profile" prefetch={true} className="block px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-stone-50 hover:text-[#183A2D]">
              Xem hồ sơ
            </Link>
            <Link href="/my-closet/notifications" prefetch={true} className="block px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-stone-50 hover:text-[#183A2D]">
              Trung tâm thông báo
            </Link>
            <Link href="/my-closet/create" prefetch={true} className="block sm:hidden px-4 py-2.5 text-xs font-medium text-emerald-600 hover:bg-stone-50 hover:text-emerald-700">
              + Thêm đồ mới
            </Link>
            <div className="h-[1px] bg-gray-100 my-1"></div>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                setCurrentUser(null);
                window.location.href = "/";
              }}
              className="w-full text-left px-4 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
            >
              <LogOut size={14} />
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
