"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
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
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { currentUser, setCurrentUser } = useAuthModal();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        let name = session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Member";
        setCurrentUser({ name, email: session.user.email || "" });
      }
    };
    fetchUser();
  }, [setCurrentUser]);

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
        { name: "Hồ sơ & Uy tín", path: "/profile", icon: <Award size={20} /> },
        { name: "Cài đặt", path: "/settings", icon: <Settings size={20} /> },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50 font-body">
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
          <Link href="/" className="flex items-center gap-3 shrink-0 cursor-pointer group">
            <Image src="/loogo.png" alt="CLOOP Brand Logo" width={46} height={46} className="mix-blend-multiply" />
            <div className="leading-none mt-0.5 text-left">
              <div className="font-logo text-[28px] font-semibold tracking-[0.18em] text-[#183A2D] transition-colors">CLOOP</div>
              <p className="font-body text-[8px] font-bold tracking-[0.3em] uppercase text-[#6BA37A] mt-1">Fashion In A Loop</p>
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
              <h3 className="px-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 font-ui">
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

        <div className="p-4 border-t border-[#E9E2D8] shrink-0">
          <Link href="/" className="flex items-center justify-center gap-2 w-full py-3 text-sm font-bold text-stone-500 hover:text-[#183A2D] transition-colors rounded-xl hover:bg-stone-100 font-ui">
            Quay lại Mua Sắm
          </Link>
        </div>
      </aside>

      {/* Main Content Wrapper - Bị đẩy sang phải bởi Sidebar */}
      <div className="md:pl-64 flex flex-col min-h-screen w-full">
        {/* Top Header - Gắn chặt ở trên cùng (Sticky) */}
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
            <button className="relative p-2 text-gray-400 hover:text-[#183A2D] transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

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
                <div className="text-xs font-bold text-[#183A2D] truncate max-w-[100px]">
                  {currentUser?.name || "Member"}
                </div>
                <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <Award size={10} /> Trustworthy
                </div>
              </div>

              {/* Dropdown Menu */}
              <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right scale-95 group-hover:scale-100 font-ui py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
                  <div className="text-xs font-bold text-[#183A2D]">{currentUser?.name || "Member"}</div>
                  <div className="text-[10px] text-emerald-600 font-bold">Trustworthy</div>
                </div>
                <Link href="/profile" className="block px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-stone-50 hover:text-[#183A2D]">
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
