"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation"; 
import { 
  Search, ShoppingBag, Sun, Moon, Shirt, Users, Leaf, Star, X, Shield, BookOpen,
  Home, PlusCircle, User, Loader2
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr"; 
import "../globals.css";
import AiStylistChat from "./AiStylistChat"; 
import PwaInstallPrompt from "./PwaInstallPrompt";
import { useAuthModal } from "../AuthModalContext";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

function HeaderNavbar({ darkMode, setDarkMode, handleFeatureRequirement, currentUser, setCurrentUser }: any) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  const mode = searchParams.get("mode");

  const placeholders = ["Search outfits...", "AI Stylist...", "AI Discovery...", "Near me..."];
  const [placeholderIndex, setPlaceholderIndex] = useState<number>(0);

  const userIdStr = currentUser?.id || null;

  useEffect(() => {
    const interval = setInterval(() => { 
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length); 
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getNavbarClass = (targetPath: string, targetType: string | null = null, targetMode: string | null = null) => {
    const isCurrentActive = pathname === targetPath && type === targetType && mode === targetMode;
    return isCurrentActive
      ? "text-[#183A2D] dark:textemerald-400 transition-colors shrink-0 font-bold"
      : "text-gray-400 hover:text-[#183A2D] transition-colors shrink-0 font-bold";
  };

  return (
    <header className={`sticky top-0 z-50 border-b px-4 lg:px-6 transition-all duration-500 backdrop-blur-md ${darkMode ? "bg-[#141E28]/90 border-[#2B3946]" : "bg-white border-[#ece7dc]"}`}>
      <div className="max-w-[1280px] mx-auto h-[88px] grid grid-cols-[auto_1fr_auto] items-center gap-4">
        
        <Link href="/" className="flex items-center gap-3 shrink-0 cursor-pointer group select-none">
          <div className="relative">
            <Image src="/loogo.png" alt="CLOOP Brand Logo" width={46} height={46} className="mix-blend-multiply transition-transform duration-500 group-hover:scale-105 animate-logo-glow" />
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <div className="font-brand-title text-[27px] sm:text-[29px] font-bold tracking-[0.14em] leading-none animate-brand-shimmer drop-shadow-xs transition-all duration-300 pl-[0.14em]">
              CLOOP
            </div>
            <p className="font-brand-sub text-[8px] sm:text-[8.5px] font-semibold tracking-[0.34em] uppercase text-[#1B5E20] dark:text-[#86EFAC] mt-1.5 w-full text-center pl-[0.34em] transition-colors">
              FASHION IN A LOOP
            </p>
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
            <Link href="/my-closet/create?mode=consign" className={getNavbarClass("/my-closet/create", null, "consign")}>Thanh lý</Link>
            <button onClick={() => handleFeatureRequirement("Tái chế")} className="text-gray-400 hover:text-[#183A2D] transition-colors uppercase shrink-0 whitespace-nowrap bg-transparent border-none cursor-pointer font-bold">Tái chế</button>
            <Link href="/blog" className={getNavbarClass("/blog", null, null)}>Blog</Link>
          </nav>
        </div>

        <div className="flex items-center gap-4 shrink-0 whitespace-nowrap font-ui text-[11px] font-bold uppercase tracking-widest">

          {currentUser ? (
            <div className="flex items-center gap-2 xl:gap-3">
              <span className="hidden xl:inline text-xs font-bold text-[#6BA37A] max-w-[140px] truncate capitalize">
                Chào {currentUser.name}! 🌿
              </span>
              
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
                onClick={async () => { 
                  await supabase.auth.signOut();
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
          <Shirt size={22} strokeWidth={pathname.startsWith("/my-closet") ? 2.5 : 2} />
          <span className="text-[9px] font-ui uppercase tracking-widest mt-0.5">Tủ đồ</span>
        </div>
        <div 
          onClick={() => {
            if (currentUser) {
              window.location.href = '/profile';
            } else {
              handleFeatureRequirement("Hồ sơ");
            }
          }}
          className={getNavClass("/profile")}
        >
          <User size={22} strokeWidth={pathname.startsWith("/profile") ? 2.5 : 2} />
          <span className="text-[9px] font-ui uppercase tracking-widest mt-0.5">Hồ sơ</span>
        </div>
      </div>
    </div>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { showAuthModal, setShowAuthModal, activeFeatureName, handleFeatureRequirement, currentUser, setCurrentUser } = useAuthModal();
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'forgot_otp'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [otpCooldown, setOtpCooldown] = useState(0);

  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);
  
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleOtpChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      const newOtp = [...otpValues];
      newOtp[index] = '';
      setOtpValues(newOtp);
      return;
    }

    const newOtp = [...otpValues];

    // Single digit typed or replaced (takes the latest typed digit)
    if (digits.length <= 2) {
      const lastDigit = digits[digits.length - 1];
      newOtp[index] = lastDigit;
      setOtpValues(newOtp);

      if (index < 5) {
        setTimeout(() => {
          otpRefs[index + 1].current?.focus();
        }, 10);
      }
      return;
    }

    // Pasted multi-digit string (e.g. 6 digits)
    const sliced = digits.slice(0, 6 - index).split('');
    sliced.forEach((digit, offset) => {
      if (index + offset < 6) {
        newOtp[index + offset] = digit;
      }
    });
    setOtpValues(newOtp);

    const nextIndex = Math.min(index + sliced.length, 5);
    setTimeout(() => {
      otpRefs[nextIndex].current?.focus();
    }, 10);
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpValues[index] && index > 0) {
        setTimeout(() => {
          otpRefs[index - 1].current?.focus();
        }, 10);
      }
    }
  };

  const clearOtp = () => {
    setOtpValues(['', '', '', '', '', '']);
    otpRefs[0].current?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    const newOtp = [...otpValues];
    pastedData.forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtpValues(newOtp);
    if (pastedData.length > 0) {
      const focusIndex = Math.min(pastedData.length, 5);
      otpRefs[focusIndex].current?.focus();
    }
  };

  useEffect(() => {
    if (showAuthModal) {
      if (activeFeatureName === "Đăng ký") setAuthMode('register');
      else setAuthMode('login');
    }
  }, [showAuthModal, activeFeatureName]);

  return (
    <div className={`min-h-screen overflow-x-hidden antialiased relative transition-colors duration-500 font-body selection:bg-[#0A2517] selection:text-[#FAF9F6] ${darkMode ? "bg-[#0F1720] text-[#F5F5F5] dark" : "bg-[#FAF9F6] text-[#0A2517]"}`}>
      
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

      {!pathname?.startsWith('/my-closet') && (
        <Suspense fallback={<div className="p-4 text-center text-xs text-stone-400 font-bold uppercase tracking-widest">Đang kết nối cổng điều phối CLOOP...</div>}>
          <HeaderNavbar 
            darkMode={darkMode} 
            setDarkMode={setDarkMode} 
            handleFeatureRequirement={handleFeatureRequirement} 
            currentUser={currentUser} 
            setCurrentUser={setCurrentUser}
          />
        </Suspense>
      )}

      <div className="relative z-10">
        {children}
      </div>

      {!pathname?.startsWith('/my-closet') && (
        <>
          <footer className="w-full bg-[#0A2517] text-white pt-16 pb-8 border-t border-white/10">
            <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:px-12">
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8 mb-16">
                
                <div className="md:col-span-12 lg:col-span-4 flex flex-col">
                  <h2 className="text-3xl lg:text-4xl font-logo text-white tracking-widest mb-5">CLOOP.</h2>
                  <p className="font-body text-sm text-gray-300 leading-relaxed font-light mb-8 max-w-sm">
                    Hệ sinh thái thời trang dệt nên từ những kết nối chân thật. Nơi những món đồ đi qua tìm thấy thanh xuân mới và những người đồng điệu tìm thấy nhau. CLOOP trao cho bạn đặc quyền thay đổi phong cách mỗi ngày — Mặc đẹp, sống nhẹ nhàng và không bận tâm sở hữu.
                  </p>
                  
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

                <div className="md:col-span-12 lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-10 pt-2">
                  
                  {/* Cột Khám Phá */}
                  <div className="flex flex-col items-center text-center">
                    <h3 className="font-heading text-sm md:text-base font-bold uppercase tracking-[0.18em] text-[#E8F5E9] mb-5 drop-shadow-sm border-b border-[#6BA37A]/30 pb-2 px-3">
                      Khám Phá
                    </h3>
                    <ul className="font-body flex flex-col items-center gap-3 text-xs md:text-sm text-gray-300 font-light">
                      <li><Link href="/shop?type=rent" className="hover:text-white hover:underline transition-colors">Trang phục cho thuê</Link></li>
                      <li><Link href="/shop?type=sell" className="hover:text-white hover:underline transition-colors">Đồ chuyển nhượng</Link></li>
                      <li><Link href="/shop" className="hover:text-white hover:underline transition-colors">Chợ Xanh Upcycle</Link></li>
                      <li><Link href="/blog" className="hover:text-white hover:underline transition-colors">Bảo tàng ký ức</Link></li>
                    </ul>
                  </div>

                  {/* Cột Về CLOOP */}
                  <div className="flex flex-col items-center text-center">
                    <h3 className="font-heading text-sm md:text-base font-bold uppercase tracking-[0.18em] text-[#E8F5E9] mb-5 drop-shadow-sm border-b border-[#6BA37A]/30 pb-2 px-3">
                      Về CLOOP
                    </h3>
                    <ul className="font-body flex flex-col items-center gap-3 text-xs md:text-sm text-gray-300 font-light">
                      <li><Link href="/blog" className="hover:text-white hover:underline transition-colors">Câu chuyện thương hiệu</Link></li>
                      <li><Link href="/my-closet/eco" className="hover:text-white hover:underline transition-colors">Sứ mệnh bền vững</Link></li>
                      <li><Link href="/blog" className="hover:text-white hover:underline transition-colors">Cộng đồng xanh</Link></li>
                      <li><Link href="/blog" className="hover:text-white hover:underline transition-colors">Sự kiện & Workshop</Link></li>
                    </ul>
                  </div>

                  {/* Cột Hỗ Trợ */}
                  <div className="flex flex-col items-center text-center">
                    <h3 className="font-heading text-sm md:text-base font-bold uppercase tracking-[0.18em] text-[#E8F5E9] mb-5 drop-shadow-sm border-b border-[#6BA37A]/30 pb-2 px-3">
                      Hỗ Trợ
                    </h3>
                    <ul className="font-body flex flex-col items-center gap-3 text-xs md:text-sm text-gray-300 font-light">
                      <li><Link href="/my-closet/profile" className="hover:text-white hover:underline transition-colors">Trung tâm trợ giúp</Link></li>
                      <li><Link href="/my-closet/profile" className="hover:text-white hover:underline transition-colors">Chính sách bảo vệ</Link></li>
                      <li><Link href="/my-closet/profile" className="hover:text-white hover:underline transition-colors">Điều khoản & Bảo mật</Link></li>
                      <li><Link href="/my-closet/orders" className="hover:text-white hover:underline transition-colors">Gửi khiếu nại</Link></li>
                    </ul>
                  </div>

                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/10 text-[11px] font-body text-gray-400 font-light gap-4">
                <p>&copy; 2026 CLOOP PROJECT. All rights reserved.</p>
                <p className="font-ui tracking-widest uppercase text-[9px] text-gray-500">Fashion in a loop</p>
              </div>

            </div>
          </footer>

          <div className="h-[65px] block md:hidden w-full bg-[#0A2517]"></div>
        </>
      )}

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
                <h3 className="font-heading text-2xl font-bold uppercase tracking-wide">
                  {authMode === 'login' ? 'Đăng nhập CLOOP' : authMode === 'register' ? 'Kích hoạt ID Xanh' : authMode === 'forgot' ? 'Quên mật khẩu' : 'Nhập mã khôi phục'}
                </h3>
                <p className="text-[11px] text-gray-400">
                  {authMode === 'login' ? 'Chào mừng bạn quay trở lại với thời trang tuần hoàn.' : authMode === 'register' ? 'Đăng ký tài khoản bảo mật để đồng bộ hóa và quản lý kệ đồ cá nhân.' : authMode === 'forgot' ? 'Nhập email để nhận mã OTP khôi phục mật khẩu.' : `Mã bảo mật đã được gửi tới ${resetEmail}. Nhập mã và mật khẩu mới.`}
                </p>
              </div>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsLoading(true);
                  try {
                    const fData = new FormData(e.currentTarget);
                    const email = fData.get("email") as string;
                    
                    if (authMode === 'forgot') {
                      if (!email.trim()) return;
                      if (otpCooldown > 0) {
                        alert(`Vui lòng đợi ${otpCooldown} giây trước khi yêu cầu lại mã OTP.`);
                        return;
                      }
                      
                      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
                      if (error) {
                        alert(`Lỗi gửi mã khôi phục: ${error.message}`);
                        return;
                      }
                      setResetEmail(email.trim());
                      setOtpValues(['', '', '', '', '', '']); // Reset OTP fields
                      setOtpCooldown(60); // Set 60s cooldown
                      setAuthMode('forgot_otp');
                      return;
                    }

                    const password = fData.get("password") as string;

                    if (authMode === 'forgot_otp') {
                      const otp = otpValues.join('');
                      if (otp.length < 6 || !password) {
                        alert("Vui lòng nhập đủ 6 ký tự mã xác thực và mật khẩu mới.");
                        return;
                      }
                      
                      const cleanOtp = otp.trim();
                      if (!/^\d{6}$/.test(cleanOtp)) {
                        alert("Ma OTP phai gom dung 6 chu so.");
                        return;
                      }

                      const { error: verifyError } = await supabase.auth.verifyOtp({
                        email: resetEmail,
                        token: cleanOtp,
                        type: 'recovery'
                      });
                      
                      if (verifyError) {
                        alert(`Mã xác thực không hợp lệ: ${verifyError.message}`);
                        return;
                      }

                      const { error: updateError } = await supabase.auth.updateUser({ password });
                      if (updateError) {
                        alert(`Lỗi cập nhật mật khẩu: ${updateError.message}`);
                        return;
                      }
                      
                      alert("Cập nhật mật khẩu thành công! Vui lòng đăng nhập lại.");
                      setAuthMode('login');
                      return;
                    }

                    const name = fData.get("username") as string || ""; 
                    
                    if (!email.trim() || !password.trim() || (authMode === 'register' && !name.trim())) return;

                    if (authMode === 'login') {
                      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                        email: email.trim(),
                        password: password
                      });

                      if (authError) {
                        alert(`Đăng nhập thất bại: Mật khẩu hoặc Email không chính xác.`);
                        return;
                      }

                      let userName = authData.user?.user_metadata?.name;
                      if (!userName && authData.user?.id) {
                        const { data: dbUser } = await supabase
                          .from("profiles")
                          .select("name")
                          .eq("id", authData.user.id)
                          .maybeSingle();
                        
                        if (dbUser?.name) {
                          userName = dbUser.name;
                          await supabase.auth.updateUser({ data: { name: userName } });
                        }
                      }
                      
                      setShowAuthModal(false);
                      
                    } else if (authMode === 'register') {
                      const { data: authData, error: authError } = await supabase.auth.signUp({
                        email: email.trim(),
                        password: password,
                        options: {
                          data: { name: name.trim() }
                        }
                      });
                      
                      if (authError) {
                        alert(`Đăng ký thất bại: ${authError.message}`);
                        return;
                      }
                      
                      if (!authData.user) return;

                      setShowAuthModal(false);
                    }
                  } catch (err: any) {
                    alert(`Hệ thống gặp sự cố: ${err.message || err}`);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className="space-y-4 pt-2 text-left"
              >
                {authMode === 'register' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Biệt danh công khai</label>
                    <input type="text" name="username" required placeholder="Ví dụ: abc..." className={`w-full px-4 py-2.5 border rounded-xl text-xs font-medium outline-none ${darkMode ? "bg-[#0F1720] border-[#2B3946] text-white" : "bg-[#FAF8F3] border-[#E9E2D8] text-[#183A2D]"}`} />
                  </div>
                )}

                {authMode !== 'forgot_otp' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Địa chỉ Email</label>
                    <input type="email" name="email" required placeholder="member@cloop.vn" className={`w-full px-4 py-2.5 border rounded-xl text-xs font-medium outline-none ${darkMode ? "bg-[#0F1720] border-[#2B3946] text-white" : "bg-[#FAF8F3] border-[#E9E2D8] text-[#183A2D]"}`} />
                  </div>
                )}

                {authMode === 'forgot_otp' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Mã Xác Thực (OTP 6 số)</label>
                      <button type="button" onClick={clearOtp} className="text-[10px] font-bold text-red-400 hover:text-red-500 hover:underline">XÓA TRẮNG</button>
                    </div>
                    <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                      {otpValues.map((digit, index) => (
                        <input
                          key={index}
                          ref={otpRefs[index]}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete={index === 0 ? "one-time-code" : "off"}
                          maxLength={2}
                          value={digit}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          disabled={isLoading}
                          className={`w-12 h-12 text-center text-lg font-bold border rounded-xl outline-none transition-all focus:border-[#183A2D] focus:ring-1 focus:ring-[#183A2D] ${
                            darkMode ? "bg-[#0F1720] border-[#2B3946] text-white" : "bg-[#FAF8F3] border-[#E9E2D8] text-[#183A2D]"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {authMode !== 'forgot' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{authMode === 'forgot_otp' ? 'Mật khẩu mới' : 'Mật khẩu bảo mật'}</label>
                    <input type="password" name="password" required placeholder="••••••••" className={`w-full px-4 py-2.5 border rounded-xl text-xs font-medium outline-none ${darkMode ? "bg-[#0F1720] border-[#2B3946] text-white" : "bg-[#FAF8F3] border-[#E9E2D8] text-[#183A2D]"}`} />
                  </div>
                )}

                <button 
                  disabled={isLoading || (authMode === 'forgot' && otpCooldown > 0)} 
                  type="submit" 
                  className="w-full font-body flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest bg-[#183A2D] text-white py-3.5 rounded-full shadow-md text-center hover:bg-[#254F3B] transition mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading && <Loader2 size={16} className="animate-spin" />}
                  {isLoading ? 'Đang xử lý...' : 
                    authMode === 'login' ? 'Đăng nhập ngay' : 
                    authMode === 'register' ? 'Kích hoạt tài khoản' : 
                    authMode === 'forgot' ? (otpCooldown > 0 ? `Đang gửi mã... (${otpCooldown}s)` : 'Gửi mã OTP khôi phục') : 
                    'Đổi mật khẩu'}
                </button>
              </form> 

              <div className="flex flex-col gap-2 mt-4 text-[11px] font-medium text-gray-500">
                {authMode === 'login' && (
                  <>
                    <button onClick={() => setAuthMode('forgot')} className="hover:text-[#183A2D] transition hover:underline">Quên mật khẩu?</button>
                    <button onClick={() => setAuthMode('register')} className="hover:text-[#183A2D] transition hover:underline">Chưa có ID Xanh? Tạo ngay</button>
                  </>
                )}
                {authMode === 'register' && (
                  <button onClick={() => setAuthMode('login')} className="hover:text-[#183A2D] transition hover:underline">Đã có ID Xanh? Đăng nhập</button>
                )}
                {(authMode === 'forgot' || authMode === 'forgot_otp') && (
                  <button onClick={() => setAuthMode('login')} className="hover:text-[#183A2D] transition hover:underline">Quay lại đăng nhập</button>
                )}
                {authMode === 'forgot_otp' && (
                  <button 
                    disabled={otpCooldown > 0 || isLoading}
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
                        if (error) throw error;
                        setOtpCooldown(60);
                        alert("Mã khôi phục mới đã được gửi!");
                      } catch (err: any) {
                        alert(`Lỗi gửi mã: ${err.message}`);
                      } finally {
                        setIsLoading(false);
                      }
                    }} 
                    className="hover:text-[#183A2D] transition hover:underline mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:no-underline"
                  >
                    {otpCooldown > 0 ? `Chưa nhận được mã? Gửi lại (${otpCooldown}s)` : 'Chưa nhận được mã? Gửi lại'}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <PwaInstallPrompt />
    </div>
  );
}
