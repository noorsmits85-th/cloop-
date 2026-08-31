"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Shirt, Plus, Bell, User, ShoppingBag, Sparkles } from "lucide-react";
import { useAuthModal } from "@/app/AuthModalContext";
import { getUserNotificationsAction } from "@/app/actions/notification";

export default function MobileBottomDock() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, setShowAuthModal } = useAuthModal();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadNotifCount() {
      try {
        const res = await getUserNotificationsAction();
        if (res.success && res.unreadCount > 0) {
          setUnreadCount(res.unreadCount);
        }
      } catch (_) {}
    }
    loadNotifCount();
  }, [pathname]);

  const handleAuthGuardedClick = (e: React.MouseEvent, targetUrl: string) => {
    if (!currentUser) {
      e.preventDefault();
      setShowAuthModal(true);
    }
  };

  // Ẩn thanh dock trên một số màn hình full-screen chuyên biệt nếu cần (vd: camera scan full)
  if (pathname.startsWith("/admin")) {
    return null;
  }

  const isHomeActive = pathname === "/";
  const isShopActive = pathname.startsWith("/shop");
  const isCreateActive = pathname.startsWith("/my-closet/create");
  const isNotifActive = pathname.startsWith("/my-closet/notifications");
  const isProfileActive = pathname.startsWith("/my-closet") && !isCreateActive && !isNotifActive;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-auto">
      {/* Background Blur Shell chuẩn TikTok / iOS Native App */}
      <nav className="bg-white/95 backdrop-blur-lg border-t border-[#E9E2D8] px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[calc(0.4rem+env(safe-area-inset-bottom,0px))]">
        
        {/* TAB 1: KHÁM PHÁ / TRANG CHỦ */}
        <Link
          href="/"
          prefetch={true}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 select-none ${
            isHomeActive ? "text-[#183A2D] font-bold" : "text-stone-400 hover:text-stone-600 font-medium"
          }`}
        >
          <div className="relative">
            <Home size={21} strokeWidth={isHomeActive ? 2.5 : 1.8} />
            {isHomeActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#183A2D] rounded-full"></span>
            )}
          </div>
          <span className="text-[9.5px] tracking-tight mt-0.5 font-ui">Khám phá</span>
        </Link>

        {/* TAB 2: SÀN THUÊ TRANG PHỤC */}
        <Link
          href="/shop?type=rent"
          prefetch={true}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 select-none ${
            isShopActive ? "text-[#183A2D] font-bold" : "text-stone-400 hover:text-stone-600 font-medium"
          }`}
        >
          <div className="relative">
            <ShoppingBag size={21} strokeWidth={isShopActive ? 2.5 : 1.8} />
            {isShopActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#183A2D] rounded-full"></span>
            )}
          </div>
          <span className="text-[9.5px] tracking-tight mt-0.5 font-ui">Sàn thuê</span>
        </Link>

        {/* TAB 3: NÚT ĐĂNG ĐỒ NỔI BẬT CHÍNH GIỮA (TIKTOK CENTER CREATE BUTTON) */}
        <div className="flex-1 flex justify-center -mt-6">
          <Link
            href="/my-closet/create"
            prefetch={true}
            onClick={(e) => handleAuthGuardedClick(e, "/my-closet/create")}
            className="group relative flex flex-col items-center active:scale-95 transition-transform"
            aria-label="Đăng trang phục mới"
          >
            {/* TikTok Style Gradient / Glow Ring */}
            <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-tr from-[#183A2D] via-[#21523F] to-[#2E6F55] p-[2.5px] shadow-lg shadow-emerald-950/25 flex items-center justify-center border-2 border-white">
              <div className="w-full h-full rounded-full bg-[#183A2D] flex items-center justify-center text-white transition-colors group-hover:bg-[#112a20]">
                <Plus size={24} strokeWidth={2.8} className="transition-transform group-hover:rotate-90 duration-300" />
              </div>
            </div>
            <span className="text-[9px] font-extrabold text-[#183A2D] tracking-tighter mt-0.5 uppercase font-ui">
              Đăng đồ
            </span>
          </Link>
        </div>

        {/* TAB 4: THÔNG BÁO / HỘP THƯ */}
        <Link
          href="/my-closet/notifications"
          prefetch={true}
          onClick={(e) => handleAuthGuardedClick(e, "/my-closet/notifications")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 select-none relative ${
            isNotifActive ? "text-[#183A2D] font-bold" : "text-stone-400 hover:text-stone-600 font-medium"
          }`}
        >
          <div className="relative">
            <Bell size={21} strokeWidth={isNotifActive ? 2.5 : 1.8} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] bg-rose-500 text-white text-[8.5px] font-extrabold rounded-full flex items-center justify-center px-0.5 border border-white animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            {isNotifActive && !unreadCount && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#183A2D] rounded-full"></span>
            )}
          </div>
          <span className="text-[9.5px] tracking-tight mt-0.5 font-ui">Hộp thư</span>
        </Link>

        {/* TAB 5: TỦ ĐỒ / HỒ SƠ */}
        <Link
          href="/my-closet"
          prefetch={true}
          onClick={(e) => handleAuthGuardedClick(e, "/my-closet")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 select-none ${
            isProfileActive ? "text-[#183A2D] font-bold" : "text-stone-400 hover:text-stone-600 font-medium"
          }`}
        >
          <div className="relative">
            {currentUser?.avatar ? (
              <div className={`w-[22px] h-[22px] rounded-full overflow-hidden border ${isProfileActive ? "border-[#183A2D] ring-1 ring-[#183A2D]" : "border-stone-300"}`}>
                <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
              </div>
            ) : (
              <User size={21} strokeWidth={isProfileActive ? 2.5 : 1.8} />
            )}
            {isProfileActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#183A2D] rounded-full"></span>
            )}
          </div>
          <span className="text-[9.5px] tracking-tight mt-0.5 font-ui">Tủ đồ</span>
        </Link>

      </nav>
    </div>
  );
}
