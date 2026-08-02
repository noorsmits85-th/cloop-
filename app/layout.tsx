"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation"; 
import { 
  Search, ShoppingBag, Sun, Moon, Shirt, Users, Leaf, Star, X, Shield, BookOpen,
  Home, PlusCircle, User
} from "lucide-react";
import { createClient } from "@supabase/supabase-js"; 
import "./globals.css";
import AiStylistChat from "./components/AiStylistChat"; 
import PwaInstallPrompt from "./components/PwaInstallPrompt";
import { AuthModalProvider, useAuthModal } from "./AuthModalContext";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function HeaderNavbar({ darkMode, setDarkMode, handleFeatureRequirement, currentUser, setCurrentUser }: any) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  const mode = searchParams.get("mode");

  const placeholders = ["Search outfits...", "AI Stylist...", "AI Discovery...", "Near me..."];
  const [placeholderIndex, setPlaceholderIndex] = useState<number>(0);

  // 🟢 NÂNG CẤP: Lấy userId từ bộ nhớ để tạo lối tắt trang cá nhân
  const [userIdStr, setUserIdStr] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserIdStr(localStorage.getItem("cloop_user_id"));
    }
  }, [currentUser]);

  useEffect(() => {
    const interval = setInterval(() => { 
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length); 
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getNavbarClass = (targetPath: string, targetType: string | null = null, targetMode: string | null = null) => {
    const isCurrentActive = pathname === targetPath && type === targetType && mode === targetMode;
    return isCurrentActive
      ? "text-[#183A2D] dark:text-emerald-400 transition-colors shrink-0 font-bold"
      : "text-gray-400 hover:text-[#183A2D] transition-colors shrink-0 font-bold";
  };

  return (
    <header className={`sticky top-0 z-50 border-b px-4 lg:px-6 transition-all duration-500 backdrop-blur-md ${darkMode ? "bg-[#141E28]/90 border-[#2B3946]" : "bg-white border-[#ece7dc]"}`}>
      <div className="max-w-[1280px] mx-auto h-[88px] grid grid-cols-[auto_1fr_auto] items-center gap-2 md:gap-4">
        
        <Link href="/" className="flex items-center gap-2 md:gap-3 shrink-0 cursor-pointer group">
          <Image src="/loogo.png" alt="CLOOP Brand Logo" width={46} height={46} className="mix-blend-multiply w-9 h-9 md:w-[46px] md:h-[46px]" />
          <div className="leading-none mt-0.5 text-left">
            <div className={`font-logo text-[22px] md:text-[28px] font-semibold tracking-[0.18em] transition-colors ${darkMode ? "text-[#F5F5F5]" : "text-[#183A2D]"}`}>CLOOP</div>
            <p className="hidden sm:block font-body text-[8px] font-bold tracking-[0.3em] uppercase text-[#6BA37A] mt-1">Fashion In A Loop</p>
          </div>
        </Link>

        <div className="flex items-center gap-4 xl:gap-5 min-w-0">
          <div className={`hidden md:flex items-center w-[120px] xl:w-[150px] h-[40px] rounded-full px-4 shrink-0 transition-all ${darkMode ? "bg-[#1C2834] border border-[#2B3946]" : "bg-stone-100 border border-stone-200 focus-within:bg-white focus-within:border-[#183A2D]"}`}>
            <Search size={13} className="text-gray-500 shrink-0" />
            <input className="ml-2 flex-1 bg-transparent text-[11px] font-search outline-none placeholder:text-gray-500 text-[#183A2D]" placeholder={placeholders[placeholderIndex]} readOnly onClick={() => window.location.href = '/shop'} />
          </div>

          <nav className="hidden lg:flex items-center gap-3.5 xl:gap-5 font-ui text-[11px] xl:text-[12px] uppercase tracking-wide whitespace-nowrap font-bold min-w-0 overflow-x-auto no-scrollbar">
            <Link href="/" className={getNavbarClass("/", null, null)}>Trang chủ</Link>
            <Link href="/shop?type=rent" className={getNavbarClass("/shop", "rent", null)}>Thuê đồ</Link>
            <Link href="/my-closet/create?mode=rent" className={getNavbarClass("/my-closet/create", null, "rent")}>Cho thuê đồ</Link>
            <Link href="/shop?type=sell" className={getNavbarClass("/shop", "sell", null)}>Sở hữu</Link>
            <Link href="/my-closet/create?mode=consign" className={getNavbarClass("/my-closet/create", null, "consign")}>Bán & Ký gửi</Link>
            <button onClick={() => handleFeatureRequirement("Tái chế")} className="text-gray-400 hover:text-[#183A2D] transition-colors uppercase shrink-0 whitespace-nowrap bg-transparent border-none cursor-pointer font-bold">Tái chế</button>
            <Link href="/blog" className={getNavbarClass("/blog", null, null)}>Blog</Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0 whitespace-nowrap font-ui text-[11px] font-bold uppercase tracking-widest">
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className={`p-1.5 md:p-2.5 rounded-full transition-colors ${darkMode ? "bg-[#1C2834] text-amber-400 hover:bg-[#253946]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </motion.button>

          {currentUser ? (
            <div className="flex items-center gap-2 xl:gap-3">
              <span className="hidden xl:inline text-xs font-bold text-[#6BA37A] max-w-[140px] truncate">
                Chào {currentUser.name}! 🌿
              </span>
              
              {/* 🟢 NÂNG CẤP: Lối tắt siêu tốc đến Tủ Đồ Công Khai và Nhật Ký */}
              {userIdStr && (
                <div className="flex items-center gap-1.5 ml-1">
                  <Link href={`/closet/${userIdStr}`} title="Xem Tủ Đồ Công Khai" className="w-[30px] h-[30px] rounded-full border border-[#E9E2D8] bg-white text-stone-400 hover:text-[#183A2D] hover:bg-[#FAF8F3] hover:border-[#183A2D]/30 transition-all flex items-center justify-center shadow-sm">
                    <Shirt size={13} />
                  </Link>
                  <Link href={`/closet/${userIdStr}/memories`} title="Mở Cuốn Nhật Ký" className="w-[30px] h-[30px] rounded-full border border-[#E9E2D8] bg-white text-stone-400 hover:text-[#183A2D] hover:bg-[#FAF8F3] hover:border-[#183A2D]/30 transition-all flex items-center justify-center shadow-sm">
                    <BookOpen size={13} />
                  </Link>
                </div>
              )}

              <Link href="/my-closet" className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border whitespace-nowrap bg-white text-[#183A2D] border-[#E9E2D8] hover:bg-[#FAF8F3]">
                Tủ đồ của tôi
              </Link>
              <button 
                onClick={() => { 
                  if (typeof window !== "undefined") {
                    localStorage.removeItem("cloop_user"); 
                    localStorage.removeItem("cloop_user_id");
                  }
                  setCurrentUser(null);
                  window.location.reload(); 
                }} 
                className="text-[10px] font-bold text-red-500 hover:underline"
              >
                Thoát
              </button>
            </div>
          ) : (
            <>
              <button onClick={() => handleFeatureRequirement("Đăng nhập")} className="text-gray-500 hover:text-[#183A2D] transition-colors">LOG IN</button>
              <button onClick={() => handleFeatureRequirement("Đăng ký")} className={`px-4 py-2 rounded-full border transition-all ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"}`}>JOIN US</button>
            </>
          )}
          <div className="w-[1px] h-5 bg-gray-200 mx-1 hidden sm:block" />
          <ShoppingBag size={20} onClick={() => window.location.href = '/shop'} className="text-[#183A2D] dark:text-white cursor-pointer hidden sm:block" />
        </div>

      </div>
    </header>
  );
}

function MobileBottomNavbar({ darkMode, currentUser, handleFeatureRequirement }: any) {
  const pathname = usePathname();
  
  const getNavClass = (targetPath: string) => {
    const isActive = pathname === targetPath || (targetPath !== "/" && pathname.startsWith(targetPath));
    return `flex flex-col items-center justify-center gap-1 w-full h-full transition-colors cursor-pointer ${
      isActive 
        ? "text-[#183A2D] dark:text-emerald-400 font-bold" 
        : "text-gray-400 hover:text-[#183A2D]"
    }`;
  };

  return (
    <div className={`flex md:hidden fixed bottom-0 left-0 w-full h-[65px] pt-1 z-[90] border-t backdrop-blur-xl transition-colors duration-500 ${darkMode ? "bg-[#141E28]/95 border-[#2B3946]" : "bg-white/95 border-[#ece7dc]"}`}>
      <div className="flex items-center justify-around w-full h-full px-2">
        <Link href="/" className={getNavClass("/")}>
          <Home size={22} strokeWidth={pathname === "/" ? 2.5 : 2} />
          <span className="text-[9px] font-ui uppercase tracking-widest mt-0.5">Trang chủ</span>
        </Link>
        <Link href="/shop" className={getNavClass("/shop")}>
          <ShoppingBag size={22} strokeWidth={pathname.startsWith("/shop") ? 2.5 : 2} />
          <span className="text-[9px] font-ui uppercase tracking-widest mt-0.5">Khám phá</span>
        </Link>
        <Link href="/my-closet/create?mode=consign" className="flex flex-col items-center justify-center gap-1 w-full h-full text-gray-400 hover:text-[#183A2D] relative group">
          <div className={`absolute -top-7 w-12 h-12 rounded-full bg-[#183A2D] text-white flex items-center justify-center shadow-lg border-4 transition-colors duration-500 group-hover:bg-[#112a20] ${darkMode ? 'border-[#141E28]' : 'border-white'}`}>
            <PlusCircle size={22} strokeWidth={2} />
          </div>
          <span className="text-[9px] font-ui uppercase tracking-widest mt-6">Đăng bán</span>
        </Link>
        <Link href="/blog" className={getNavClass("/blog")}>
          <BookOpen size={22} strokeWidth={pathname.startsWith("/blog") ? 2.5 : 2} />
          <span className="text-[9px] font-ui uppercase tracking-widest mt-0.5">Blog</span>
        </Link>
        <div 
          onClick={() => {
            if (currentUser) {
              window.location.href = '/my-closet';
            } else {
              handleFeatureRequirement("Tủ đồ");
            }
          }}
          className={getNavClass("/my-closet")}
        >
          <User size={22} strokeWidth={pathname.startsWith("/my-closet") ? 2.5 : 2} />
          <span className="text-[9px] font-ui uppercase tracking-widest mt-0.5">Tủ đồ</span>
        </div>
      </div>
    </div>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { showAuthModal, setShowAuthModal, activeFeatureName, handleFeatureRequirement, currentUser, setCurrentUser } = useAuthModal();
  const [darkMode, setDarkMode] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const session = localStorage.getItem("cloop_user");
      if (session) {
        try {
          setCurrentUser(JSON.parse(session));
        } catch (e) {
          console.error("Lỗi đồng bộ bộ nhớ thành viên tại Layout Master:", e);
        }
      }
    }
  }, [setCurrentUser]);

  return (
    <body className={`min-h-screen overflow-x-hidden antialiased relative transition-colors duration-500 font-body selection:bg-[#0A2517] selection:text-[#FAF9F6] ${darkMode ? "bg-[#0F1720] text-[#F5F5F5]" : "bg-[#FAF9F6] text-[#0A2517]"}`}>
      
      <style>{`
        html { scroll-behavior: smooth; }
        .font-logo { font-family: 'Fraunces', serif; font-weight: 800; letter-spacing: -0.02em; }
        .font-heading { font-family: 'Fraunces', serif; }
        .font-body { font-family: 'Lora', serif; }
        .font-slogan { font-family: 'Fraunces', serif; font-style: italic; }
        .font-ui { font-family: 'Inter', sans-serif; }
        .font-search { font-family: 'Inter', sans-serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <Suspense fallback={<div className="p-4 text-center text-xs text-stone-400 font-bold uppercase tracking-widest">Đang kết nối cổng điều phối CLOOP...</div>}>
        <HeaderNavbar 
          darkMode={darkMode} 
          setDarkMode={setDarkMode} 
          handleFeatureRequirement={handleFeatureRequirement} 
          currentUser={currentUser} 
          setCurrentUser={setCurrentUser}
        />
      </Suspense>

      <div className="relative z-10">
        {children}
      </div>

      <footer className="w-full bg-[#0A2517] text-white pt-16 pb-8 border-t border-white/10">
        <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:px-12">
          
          {/* Phần Trên: Cột Thông tin & Link */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8 mb-16">
            
            {/* CỘT 1: Logo & Thông tin thương hiệu */}
            <div className="md:col-span-12 lg:col-span-4 flex flex-col">
              <h2 className="text-3xl lg:text-4xl font-logo text-white tracking-widest mb-5">CLOOP.</h2>
              <p className="font-body text-sm text-gray-300 leading-relaxed font-light mb-8 max-w-sm">
                Hệ sinh thái thời trang dệt nên từ những kết nối chân thật. Nơi những món đồ đi qua tìm thấy thanh xuân mới, và những người đồng điệu tìm thấy nhau. CLOOP trao cho bạn đặc quyền thay đổi phong cách mỗi ngày — Mặc đẹp, sống nhẹ nhàng và không bận tâm sở hữu.
              </p>
              
              {/* Dàn Icon Mạng Xã Hội */}
              <div className="flex items-center gap-6 text-gray-400">
                <button className="hover:text-white transition-colors" title="Facebook">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path></svg>
                </button>
                <button className="hover:text-white transition-colors" title="Instagram">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" strokeWidth="1.5"></rect><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01"></path></svg>
                </button>
                <button className="hover:text-white transition-colors" title="TikTok">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19c-4.3 1.4-4.3-2.5-4.3-2.5 0-18 4.2-12 4.2-12 2.5 0 5.4 3 5.4 3v4.6c0 0-2.8-3.1-5.3-3.1v10.3c0 2-3.4 3.7-5.5 2.1-2.1-1.6-1.5-5.2.9-6.3V12c-4.4 2-5 7.8-2 10.3 3.1 2.5 8 1.4 8-3.8V4.5c2.3.9 4 3 4 3v-3s-2.1-2.4-4.7-3v18.5z"></path></svg>
                </button>
              </div>
            </div>

            {/* CỘT MENU */}
            <div className="md:col-span-12 lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-8 pt-2">
              
              {/* Cột Khám Phá */}
              <div className="flex flex-col">
                <h3 className="font-ui text-[10px] font-bold uppercase tracking-[0.2em] mb-6 text-gray-200">Khám Phá</h3>
                <ul className="font-ui flex flex-col gap-3.5 text-sm text-gray-400 font-light">
                  <li><button className="hover:text-white transition-colors">Trang phục cho thuê</button></li>
                  <li><button className="hover:text-white transition-colors">Đồ chuyển nhượng</button></li>
                  <li><button className="hover:text-white transition-colors">Chợ Xanh Upcycle</button></li>
                  <li><button className="hover:text-white transition-colors">Bảo tàng ký ức</button></li>
                </ul>
              </div>

              {/* Cột Về Chúng Tôi */}
              <div className="flex flex-col">
                <h3 className="font-ui text-[10px] font-bold uppercase tracking-[0.2em] mb-6 text-gray-200">Về CLOOP</h3>
                <ul className="font-ui flex flex-col gap-3.5 text-sm text-gray-400 font-light">
                  <li><button className="hover:text-white transition-colors">Câu chuyện thương hiệu</button></li>
                  <li><button className="hover:text-white transition-colors">Sứ mệnh bền vững</button></li>
                  <li><button className="hover:text-white transition-colors">Cộng đồng xanh</button></li>
                  <li><button className="hover:text-white transition-colors">Sự kiện & Workshop</button></li>
                </ul>
              </div>

              {/* Cột Hỗ Trợ */}
              <div className="flex flex-col">
                <h3 className="font-ui text-[10px] font-bold uppercase tracking-[0.2em] mb-6 text-gray-200">Hỗ Trợ</h3>
                <ul className="font-ui flex flex-col gap-3.5 text-sm text-gray-400 font-light">
                  <li><button className="hover:text-white transition-colors">Trung tâm trợ giúp</button></li>
                  <li><button className="hover:text-white transition-colors">Chính sách bảo vệ</button></li>
                  <li><button className="hover:text-white transition-colors">Điều khoản & Bảo mật</button></li>
                  <li><button className="hover:text-white transition-colors">Gửi khiếu nại</button></li>
                </ul>
              </div>

            </div>
          </div>

          {/* Phần Dưới Đáy: Copyright */}
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/10 text-[11px] font-body text-gray-400 font-light gap-4">
            <p>&copy; 2026 CLOOP PROJECT. All rights reserved.</p>
            <p className="font-ui tracking-widest uppercase text-[9px] text-gray-500">Fashion in a loop</p>
          </div>

        </div>
      </footer>

      {/* Khoảng trống để Footer không bị che bởi Mobile Bar */}
      <div className="h-[65px] block md:hidden w-full bg-[#0A2517]"></div>

      <MobileBottomNavbar 
        darkMode={darkMode} 
        currentUser={currentUser} 
        handleFeatureRequirement={handleFeatureRequirement} 
      />

      <AiStylistChat darkMode={darkMode} />

      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className={`p-8 rounded-[2.5rem] max-w-[420px] w-full text-center shadow-2xl relative space-y-5 mx-auto border ${darkMode ? "bg-[#18222B] border-[#2B3946]" : "bg-white border-[#E9E2D8]"}`}
            >
              <button type="button" onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-[#183A2D] transition">
                <X size={18} />
              </button>
              
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2 mx-auto border border-emerald-200">
                <Shield size={20} className="animate-pulse" />
              </div>
              
              <div className="text-center space-y-1">
                <h3 className="font-heading text-2xl font-bold uppercase tracking-wide">Kích hoạt ID Xanh CLOOP</h3>
                <p className="text-[11px] text-gray-400">Đăng ký tài khoản bảo mật để đồng bộ hóa và quản lý kệ đồ cá nhân.</p>
              </div>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fData = new FormData(e.currentTarget);
                  const name = fData.get("username") as string;
                  const email = fData.get("email") as string;
                  const password = fData.get("password") as string;
                  
                  if (!name.trim() || !email.trim() || !password.trim()) return;

                  try {
                    const { data: existingUser, error: checkError } = await supabase
                      .from("User")
                      .select("id, password, name")
                      .eq("email", email.trim())
                      .maybeSingle();

                    if (checkError) {
                      alert(`Lỗi đối soát danh tính: ${checkError.message}`);
                      return;
                    }

                    let finalUserId: string;
                    let finalName = name.trim();

                    if (existingUser) {
                      if (existingUser.password !== password) {
                        alert("Mật khẩu không chính xác cho tài khoản Email này. Vui lòng kiểm tra lại nhé! 🔑");
                        return;
                      }
                      finalUserId = existingUser.id;
                      finalName = existingUser.name || name.trim();
                    } else {
                      const newUserId = crypto.randomUUID();
                      const { error: userInsertError } = await supabase
                        .from("User")
                        .insert([{
                          id: newUserId,
                          email: email.trim(),
                          password: password,
                          name: name.trim(),
                        }]);

                      if (userInsertError) {
                        alert(`Lỗi khởi tạo tài khoản: ${userInsertError.message}`);
                        return;
                      }
                      finalUserId = newUserId;
                    }

                    localStorage.setItem("cloop_user_id", finalUserId);

                    const userSession = { name: finalName, email: email.trim(), isLoggedIn: true };
                    localStorage.setItem("cloop_user", JSON.stringify(userSession));
                    
                    setCurrentUser(userSession);
                    setShowAuthModal(false);

                  } catch (err: any) {
                    alert(`Hệ thống gặp sự cố bất tuần hoàn: ${err.message || err}`);
                  }
                }}
                className="space-y-4 pt-2 text-left"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Biệt danh công khai</label>
                  <input type="text" name="username" required placeholder="Ví dụ: abc..." className={`w-full px-4 py-2.5 border rounded-xl text-xs font-medium outline-none ${darkMode ? "bg-[#0F1720] border-[#2B3946] text-white" : "bg-[#FAF8F3] border-[#E9E2D8] text-[#183A2D]"}`} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Địa chỉ Email</label>
                  <input type="email" name="email" required placeholder="member@cloop.vn" className={`w-full px-4 py-2.5 border rounded-xl text-xs font-medium outline-none ${darkMode ? "bg-[#0F1720] border-[#2B3946] text-white" : "bg-[#FAF8F3] border-[#E9E2D8] text-[#183A2D]"}`} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Mật khẩu bảo mật</label>
                  <input type="password" name="password" required placeholder="••••••••" className={`w-full px-4 py-2.5 border rounded-xl text-xs font-medium outline-none ${darkMode ? "bg-[#0F1720] border-[#2B3946] text-white" : "bg-[#FAF8F3] border-[#E9E2D8] text-[#183A2D]"}`} />
                </div>

                <button type="submit" className="w-full font-body text-xs font-bold uppercase tracking-widest bg-[#183A2D] text-white py-3.5 rounded-full shadow-md text-center hover:bg-[#254F3B] transition mt-2">
                  Kích hoạt tài khoản ngay
                </button>
              </form> 
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <PwaInstallPrompt />
    </body>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=Lora:ital,wght@0,400..700;1,400..700&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" />
        <meta name="theme-color" content="#0A2517" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CLOOP" />
        <link rel="apple-touch-icon" href="/loogo.png" />
      </head>
      <AuthModalProvider>
        <LayoutContent>{children}</LayoutContent>
      </AuthModalProvider>
    </html>
  );
}