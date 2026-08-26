"use client";

import React from "react";
import Link from "next/link";
import { Search, Bell, Plus, Award, LogOut, Menu } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

export function DashboardHeader({
  currentUser,
  setCurrentUser,
  setIsSidebarOpen
}: {
  currentUser: any;
  setCurrentUser: any;
  setIsSidebarOpen: (v: boolean) => void;
}) {
  const [showNotifications, setShowNotifications] = React.useState(false);
  const notifRef = React.useRef<HTMLDivElement>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
  const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

  // Đóng notification khi click ra ngoài
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 h-[72px] md:h-[88px] bg-white/95 backdrop-blur-md border-b border-[#E9E2D8] flex items-center justify-between px-4 md:px-8 shrink-0">
      <div className="flex items-center gap-4">
        <button
          className="md:hidden text-[#183A2D] p-2 -ml-2 rounded-lg hover:bg-stone-100"
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
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-stone-500 hover:text-[#183A2D] hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
            aria-label="Thông báo"
          >
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-emerald-700 rounded-full border-2 border-white animate-pulse"></span>
          </button>

          {/* DROPDOWN DANH SÁCH THÔNG BÁO */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-stone-200 rounded-2xl shadow-2xl z-50 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-3 bg-[#183A2D] text-white flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">Thông báo CLOOP</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium">3 mới</span>
              </div>

              <div className="divide-y divide-stone-100 max-h-[380px] overflow-y-auto">
                <Link
                  href="/my-closet/orders"
                  onClick={() => setShowNotifications(false)}
                  className="p-3.5 hover:bg-emerald-50/60 transition-colors flex gap-3 items-start block"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#183A2D] flex items-center justify-center shrink-0 text-sm">
                    📦
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <p className="text-xs font-bold text-stone-900">Đơn thuê mới cần chuẩn bị đồ</p>
                    <p className="text-[11px] text-stone-600 leading-snug">Khách vừa đặt thuê váy từ Tủ đồ của bạn. Hãy kiểm tra và xác nhận giao đồ.</p>
                    <span className="text-[9.5px] text-stone-400 font-mono">10 phút trước</span>
                  </div>
                </Link>

                <Link
                  href="/my-closet/wallet"
                  onClick={() => setShowNotifications(false)}
                  className="p-3.5 hover:bg-emerald-50/60 transition-colors flex gap-3 items-start block"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 text-sm">
                    💰
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <p className="text-xs font-bold text-stone-900">Tiền thuê đã cộng vào Ví</p>
                    <p className="text-[11px] text-stone-600 leading-snug">Đơn thuê hoàn tất thành công. Tiền thuê khả dụng đã được cộng vào tài khoản.</p>
                    <span className="text-[9.5px] text-stone-400 font-mono">1 giờ trước</span>
                  </div>
                </Link>

                <Link
                  href="/my-closet"
                  onClick={() => setShowNotifications(false)}
                  className="p-3.5 hover:bg-emerald-50/60 transition-colors flex gap-3 items-start block"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 text-sm">
                    🌿
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <p className="text-xs font-bold text-stone-900">Thưởng +50 Điểm Lá ESG</p>
                    <p className="text-[11px] text-stone-600 leading-snug">Bạn vừa đóng góp giảm 1.5kg CO₂ vào mạng lưới thời trang tuần hoàn CLOOP.</p>
                    <span className="text-[9.5px] text-stone-400 font-mono">Hôm nay</span>
                  </div>
                </Link>
              </div>

              <div className="p-2.5 bg-stone-50 border-t border-stone-100 text-center">
                <Link
                  href="/my-closet/orders"
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] font-bold text-[#183A2D] hover:underline"
                >
                  Xem toàn bộ đơn hàng & hoạt động →
                </Link>
              </div>
            </div>
          )}
        </div>

        <Link
          href="/my-closet/create"
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
            <Link href="/my-closet/profile" className="block px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-stone-50 hover:text-[#183A2D]">
              Xem hồ sơ
            </Link>
            <Link href="/my-closet/create" className="block sm:hidden px-4 py-2.5 text-xs font-medium text-emerald-600 hover:bg-stone-50 hover:text-emerald-700">
              + Thêm đồ mới
            </Link>
            <div className="h-[1px] bg-gray-100 my-1"></div>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                setCurrentUser(null);
                window.location.href = "/";
              }}
              className="w-full text-left px-4 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
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
