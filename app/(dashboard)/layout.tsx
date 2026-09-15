"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  ArrowLeft,
  Shirt,
  Heart,
  Store,
  ShoppingBag,
  Archive,
  Wallet,
  Leaf,
  Award,
  Settings,
  Bell,
  Search,
  Plus,
  Menu,
  X,
  LogOut,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/src/utils/supabase/client";
import { fastLoginAction } from "@/app/(storefront)/login/actions";
import { useAuthModal } from "@/app/AuthModalContext";
import { DashboardHeader } from "./_components/DashboardHeader";
import { getUserDisputeStats } from "@/app/actions/getDisputeStats";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { currentUser, setCurrentUser, setShowAuthModal } = useAuthModal();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [disputeCount, setDisputeCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [isQuickLoggingIn, setIsQuickLoggingIn] = useState(false);

  const handleQuickLogin = async () => {
    setIsQuickLoggingIn(true);
    try {
      const targetUrl = pathname || '/my-closet';
      const res = await fastLoginAction({ redirectTo: targetUrl });
      if (res?.error) {
        toast.error("Lỗi đăng nhập: " + res.error);
      } else if (res?.user) {
        toast.success("Đăng nhập thành công! Đang đồng bộ giao diện...");
        try {
          const supabase = createClient();
          await supabase.auth.signInWithPassword({
            email: "th4212044@gmail.com",
            password: "CloopPassword2026!"
          });
        } catch (_) {}
        setCurrentUser({
          name: res.user.name || "Trang Hoàng",
          email: res.user.email || "th4212044@gmail.com",
          isLoggedIn: true,
          id: res.user.id
        });
        window.location.href = res.redirectUrl || targetUrl;
      }
    } catch (err: any) {
      toast.error(err?.message || "Lỗi đăng nhập nhanh");
    } finally {
      setIsQuickLoggingIn(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadDisputeStats() {
      try {
        const disputeRes = await getUserDisputeStats();
        if (!isMounted) return;

        if (disputeRes.success && typeof disputeRes.count === "number") {
          setDisputeCount(disputeRes.count);
        }
      } catch (err: any) {
        console.error("⚠️ [Dashboard Dispute Stats Fetch Error]:", err?.message || err);
      }
    }

    loadDisputeStats();

    // 🔔 Đồng bộ badge khiếu nại (có throttle để tránh spam server khi focus liên tục)
    let lastFetch = Date.now();
    const handleThrottledSync = () => {
      const now = Date.now();
      if (now - lastFetch > 30000) {
        lastFetch = now;
        loadDisputeStats();
      }
    };

    const handleImmediateSync = () => {
      lastFetch = Date.now();
      loadDisputeStats();
    };

    window.addEventListener("dispute-updated", handleImmediateSync);
    window.addEventListener("focus", handleThrottledSync);

    return () => {
      isMounted = false;
      window.removeEventListener("dispute-updated", handleImmediateSync);
      window.removeEventListener("focus", handleThrottledSync);
    };
  }, []);

  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  useEffect(() => {
    setNavigatingTo(null);
  }, [pathname]);

  const currentPath = navigatingTo || pathname;

  const getNavClass = (path: string) => {
    const isActive = currentPath === path || (path !== "/my-closet" && currentPath.startsWith(path));
    return `flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
      isActive
        ? "bg-[#183A2D] text-white shadow-xs font-semibold"
        : "text-gray-500 hover:bg-emerald-50 hover:text-[#183A2D]"
    }`;
  };

  const navGroups = [
    {
      title: "Tổng quan",
      items: [
        { name: "Dashboard", path: "/my-closet", icon: <LayoutDashboard size={20} /> },
        { name: "Thông báo & Hoạt động", path: "/my-closet/notifications", icon: <Bell size={20} /> },
      ],
    },
    {
      title: "Quản lý Tủ Đồ",
      items: [
        { name: "Tủ đồ của tôi", path: "/my-closet/items", icon: <Shirt size={20} /> },
        { name: "Đã thích & Đã lưu", path: "/my-closet/wishlist", icon: <Heart size={20} /> },
        { name: "Đơn hàng & Giao dịch", path: "/my-closet/orders", icon: <ShoppingBag size={20} /> },
        { name: "Kho lưu trữ", path: "/my-closet/archive", icon: <Archive size={20} /> },
      ],
    },
    {
      title: "Tài chính & Điểm",
      items: [
        { name: "Ví Lá CLOOP", path: "/my-closet/wallet", icon: <Wallet size={20} /> },
        { name: "Thống kê Sinh thái", path: "/my-closet/eco", icon: <Leaf size={20} /> },
      ],
    },
    {
      title: "Tài khoản",
      items: [
        { name: "Hồ sơ & Uy tín", path: "/my-closet/profile", icon: <Award size={20} /> },
        { name: "Cài đặt", path: "/my-closet/settings", icon: <Settings size={20} /> },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50 antialiased text-stone-800">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Cố định ở bên trái */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#E9E2D8] transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } flex flex-col h-full`}
      >
        <div className="h-[88px] flex items-center px-6 border-b border-[#E9E2D8] shrink-0">
          <Link href="/" className="flex items-center gap-3 shrink-0 cursor-pointer group select-none">
            <div className="relative">
              <Image src="/loogo.png" alt="CLOOP Brand Logo" width={44} height={44} className="mix-blend-multiply transition-transform duration-500 group-hover:scale-105 animate-logo-glow" />
            </div>
            <div className="flex flex-col items-center justify-center text-center">
              <div className="font-brand-title text-[26px] font-extrabold tracking-[0.12em] leading-none animate-brand-shimmer text-[#183A2D] pl-[0.12em] transition-colors">
                CLOOP
              </div>
              <p className="font-brand-sub text-[7.5px] font-semibold tracking-[0.34em] uppercase text-[#1B5E20] mt-1.5 w-full text-center pl-[0.34em] transition-colors">
                FASHION IN A LOOP
              </p>
            </div>
          </Link>
          <button
            className="ml-auto md:hidden text-gray-500 hover:text-black"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        {/* ⚡ BANNER DÀNH CHO KHÁCH: ĐĂNG NHẬP NHANH 1-CHẠM TRỰC TIẾP TRÊN THANH ĐIỀU HƯỚNG */}
        {!currentUser?.isLoggedIn && (
          <div className="mx-4 mt-4 p-3.5 bg-gradient-to-br from-emerald-50/90 to-teal-50/70 border border-emerald-200/80 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider font-ui">Chế độ Xem Khách</span>
            </div>
            <p className="text-[11px] text-stone-600 mb-3 leading-relaxed font-ui">
              Đăng nhập để xem Dashboard, Tủ đồ và Quản lý đơn hàng.
            </p>
            <button
              type="button"
              disabled={isQuickLoggingIn}
              onClick={handleQuickLogin}
              className="w-full py-2.5 px-3 bg-[#183A2D] hover:bg-[#112a20] text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer font-ui"
            >
              {isQuickLoggingIn ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <span>⚡ Đăng nhập nhanh 1-chạm</span>
              )}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 no-scrollbar">
          {navGroups.map((group, index) => (
            <div key={index}>
              <h3 className="px-4 text-xs font-bold uppercase tracking-wider text-stone-900 mb-3 font-ui">
                {group.title}
              </h3>
              <nav className="space-y-1 font-ui">
                {group.items.map((item, i) => (
                  <Link
                    key={i}
                    href={item.path}
                    prefetch={true}
                    className={getNavClass(item.path)}
                    onClick={(e) => {
                      if (!currentUser?.isLoggedIn) {
                        e.preventDefault();
                        toast.info(`Vui lòng đăng nhập để truy cập "${item.name}"`, {
                          description: "Bấm Đăng nhập nhanh 1-chạm ở đầu menu để vào ngay.",
                          duration: 4000
                        });
                        setShowAuthModal(true);
                        return;
                      }
                      setIsSidebarOpen(false);
                      if (pathname !== item.path) {
                        setNavigatingTo(item.path);
                      }
                    }}
                  >
                    {item.icon}
                    <span className="flex-1">{item.name}</span>
                    {item.path === "/my-closet/orders" && disputeCount > 0 && (
                      <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                        {disputeCount}
                      </span>
                    )}
                    {item.path === "/my-closet/notifications" && unreadNotifCount > 0 && (
                      <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                        {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-[#E9E2D8] shrink-0 bg-stone-50/50">
          <Link href="/" className="flex items-center justify-center gap-2.5 w-full py-3.5 text-sm font-bold text-[#183A2D] hover:bg-[#183A2D]/10 bg-transparent transition-all rounded-xl font-ui group">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Quay lại Mua Sắm
          </Link>
        </div>
      </aside>

      {/* Main Content Wrapper - Bị đẩy sang phải bởi Sidebar */}
      <div className="md:pl-64 flex flex-col min-h-screen w-full">
        {/* Top Header - Component tách riêng */}
        <DashboardHeader 
          currentUser={currentUser} 
          setCurrentUser={setCurrentUser} 
          setIsSidebarOpen={setIsSidebarOpen} 
          onUnreadCountChange={setUnreadNotifCount}
        />

        {/* Dashboard Content - Cứ để cuộn tự nhiên theo window */}
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-[1200px] w-full mx-auto pb-24 md:pb-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
