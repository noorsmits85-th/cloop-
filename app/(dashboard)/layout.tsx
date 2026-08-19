"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  ArrowLeft,
  Shirt,
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { currentUser, setCurrentUser } = useAuthModal();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);



  const getNavClass = (path: string) => {
    const isActive = pathname === path || (path !== "/my-closet" && pathname.startsWith(path));
    return `flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
      isActive
        ? "bg-[#183A2D] text-white shadow-md"
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
    <div className="min-h-screen bg-stone-50 font-sans antialiased text-stone-800">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap" />
      <style>{`
        /* Force Be Vietnam Pro for all dashboard UI except specific logos/headings if needed */
        aside h3, aside span, aside a, main h1, main h2, main h3, main h4, main p, main span, main div, main button, main input, main label, main td, main th { 
          font-family: 'Be Vietnam Pro', sans-serif !important; 
        }
      `}</style>
      
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
              <div className="font-brand-title text-[25px] font-bold tracking-[0.14em] leading-none animate-brand-shimmer text-[#183A2D] pl-[0.14em] transition-colors">
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
                    className={getNavClass(item.path)}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    {item.icon}
                    {item.name}
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
    </div>
  );
}
