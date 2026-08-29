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
  LogOut
} from "lucide-react";
import { useAuthModal } from "@/app/AuthModalContext";
import { DashboardHeader } from "./_components/DashboardHeader";
import { getUserDisputeStats } from "@/app/actions/getDisputeStats";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { currentUser, setCurrentUser } = useAuthModal();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [disputeCount, setDisputeCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      try {
        const res = await getUserDisputeStats();
        if (isMounted && res.success && typeof res.count === "number") {
          setDisputeCount(res.count);
        }
      } catch (err: any) {
        console.error("⚠️ [Dashboard DisputeStats Fetch Error]:", err?.message || err);
      }
    }

    loadStats();

    // 🔔 Đồng bộ badge khiếu nại tức thì khi có mutation hoặc focus lại tab
    const handleDisputeUpdate = () => {
      loadStats();
    };

    window.addEventListener("dispute-updated", handleDisputeUpdate);
    window.addEventListener("focus", handleDisputeUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("dispute-updated", handleDisputeUpdate);
      window.removeEventListener("focus", handleDisputeUpdate);
    };
  }, []);

  const getNavClass = (path: string) => {
    const isActive = pathname === path || (path !== "/my-closet" && pathname.startsWith(path));
    return `flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${
      isActive
        ? "bg-[#183A2D] text-white shadow-xs"
        : "text-gray-500 hover:bg-emerald-50 hover:text-[#183A2D]"
    }`;
  };

  const navGroups = [
    {
      title: "Tổng quan",
      items: [
        { name: "Dashboard", path: "/my-closet", icon: <LayoutDashboard size={20} /> },
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
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    {item.icon}
                    <span className="flex-1">{item.name}</span>
                    {item.path === "/my-closet/orders" && disputeCount > 0 && (
                      <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                        {disputeCount}
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
        />

        {/* Dashboard Content - Cứ để cuộn tự nhiên theo window */}
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-[1200px] w-full mx-auto pb-24 md:pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* 📱 LUXURY MOBILE BOTTOM DOCK (Thanh điều hướng dưới đáy chuẩn app điện thoại) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E9E2D8] px-3 py-2 flex items-center justify-around shadow-lg">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-all ${
            pathname === "/" ? "text-[#183A2D] font-bold" : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <Store size={19} strokeWidth={pathname === "/" ? 2.2 : 1.5} />
          <span>Khám phá</span>
        </Link>

        <Link
          href="/my-closet/items"
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-all ${
            pathname.startsWith("/my-closet/items") ? "text-[#183A2D] font-bold" : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <Shirt size={19} strokeWidth={pathname.startsWith("/my-closet/items") ? 2.2 : 1.5} />
          <span>Tủ đồ</span>
        </Link>

        {/* Nút Đăng Đồ Nổi Bật Chính Giữa */}
        <Link
          href="/my-closet/create"
          className="flex flex-col items-center -mt-5 group"
        >
          <div className="w-11 h-11 rounded-full bg-[#183A2D] text-white flex items-center justify-center shadow-md shadow-[#183A2D]/30 group-active:scale-95 transition-transform border-2 border-white">
            <Plus size={22} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-bold text-[#183A2D] mt-0.5">Đăng đồ</span>
        </Link>

        <Link
          href="/my-closet/wishlist"
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-all relative ${
            pathname.startsWith("/my-closet/wishlist") ? "text-rose-600 font-bold" : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <Heart size={19} strokeWidth={pathname.startsWith("/my-closet/wishlist") ? 2.2 : 1.5} className={pathname.startsWith("/my-closet/wishlist") ? "fill-rose-500" : ""} />
          <span>Đã lưu</span>
        </Link>

        <Link
          href="/my-closet/orders"
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-all ${
            pathname.startsWith("/my-closet/orders") ? "text-[#183A2D] font-bold" : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <ShoppingBag size={19} strokeWidth={pathname.startsWith("/my-closet/orders") ? 2.2 : 1.5} />
          <span>Đơn hàng</span>
        </Link>
      </nav>
    </div>
  );
}
