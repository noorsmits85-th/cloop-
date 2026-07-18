"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation"; 
import { 
  Search, ShoppingBag, Sun, Moon, Shield, X, BookOpen, UserCircle
} from "lucide-react";
import { createClient } from "@supabase/supabase-js"; 
import "./globals.css";
import AiStylistChat from "./components/AiStylistChat"; 
import { AuthModalProvider, useAuthModal } from "./AuthModalContext";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function HeaderNavbar({ darkMode, setDarkMode, handleFeatureRequirement, currentUser, setCurrentUser }: any) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  const mode = searchParams.get("mode");

  const placeholders = ["Tìm kiếm phong cách...", "AI Stylist...", "Khám phá tủ đồ...", "Đồ gần tôi..."];
  const [placeholderIndex, setPlaceholderIndex] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => { 
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length); 
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Lấy ID người dùng để gắn vào nút "Xem Tủ Công Khai"
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedId = localStorage.getItem("cloop_user_id");
      if (storedId) setCurrentUserId(storedId);
    }
  }, [currentUser]);

  const getNavbarClass = (targetPath: string, targetType: string | null = null, targetMode: string | null = null) => {
    const isCurrentActive = pathname === targetPath && type === targetType && mode === targetMode;
    return isCurrentActive
      ? "text-emerald-700 bg-emerald-50 px-4 py-2 rounded-full transition-all shrink-0 font-bold"
      : "text-gray-500 hover:text-emerald-700 hover:bg-emerald-50/50 px-4 py-2 rounded-full transition-all shrink-0 font-bold";
  };

  return (
    <header className={`sticky top-0 z-50 border-b px-4 lg:px-6 transition-all duration-500 backdrop-blur-xl ${darkMode ? "bg-[#111827]/90 border-gray-800" : "bg-white/95 border-gray-100 shadow-sm"}`}>
      <div className="max-w-[1500px] mx-auto h-[80px] grid grid-cols-[auto_1fr_auto] items-center gap-4">
        
        {/* LOGO REDESIGN KIỂU SAAS */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 cursor-pointer group">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
             <Image src="/loogo.png" alt="CLOOP Logo" width={28} height={28} className="mix-blend-multiply" />
          </div>
          <div className="leading-none text-left">
            <div className={`text-2xl font-extrabold tracking-tight transition-colors ${darkMode ? "text-white" : "text-gray-900 group-hover:text-emerald-700"}`}>CLOOP</div>
            <p className="text-[9px] font-extrabold tracking-[0.2em] uppercase text-emerald-500 mt-0.5">Thời Trang Số</p>
          </div>
        </Link>

        {/* NAVIGATION & SEARCH BAR */}
        <div className="flex items-center gap-4 xl:gap-5 min-w-0">
          <div className={`hidden md:flex items-center w-[150px] xl:w-[220px] h-[44px] rounded-full px-4 shrink-0 transition-all shadow-inner ${darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border border-gray-200 focus-within:bg-white focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100"}`}>
            <Search size={14} className="text-gray-400 shrink-0" />
            <input className="ml-2 flex-1 bg-transparent text-xs outline-none placeholder:text-gray-400 text-gray-800 font-medium" placeholder={placeholders[placeholderIndex]} readOnly onClick={() => window.location.href = '/shop'} />
          </div>

          <nav className="hidden lg:flex items-center gap-1 font-body text-xs uppercase tracking-wide whitespace-nowrap min-w-0 overflow-x-auto no-scrollbar">
            <Link href="/" className={getNavbarClass("/", null, null)}>Trang chủ</Link>
            <Link href="/shop?type=rent" className={getNavbarClass("/shop", "rent", null)}>Thuê đồ</Link>
            <Link href="/my-closet/create?mode=rent" className={getNavbarClass("/my-closet/create", null, "rent")}>Đăng Cho Thuê</Link>
            <Link href="/shop?type=sell" className={getNavbarClass("/shop", "sell", null)}>Mua sắm</Link>
            <Link href="/my-closet/create?mode=consign" className={getNavbarClass("/my-closet/create", null, "consign")}>Thanh Lý</Link>
            <button onClick={() => handleFeatureRequirement("Tái chế")} className="text-gray-500 hover:text-emerald-700 hover:bg-emerald-50/50 px-4 py-2 rounded-full transition-all uppercase shrink-0 whitespace-nowrap font-bold">Tái chế</button>
            <Link href="/blog" className={getNavbarClass("/blog", null, null)}>Tạp Chí</Link>
          </nav>
        </div>

        {/* USER ACTIONS */}
        <div className="flex items-center gap-3 shrink-0 whitespace-nowrap font-body text-[11px] font-bold uppercase tracking-widest">
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2.5 rounded-full transition-colors ${darkMode ? "bg-gray-800 text-amber-400 hover:bg-gray-700" : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200"}`}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </motion.button>

          <ShoppingBag size={18} onClick={() => window.location.href = '/shop'} className="text-gray-500 hover:text-emerald-700 transition cursor-pointer hidden sm:block mx-1" />

          {currentUser ? (
            <div className="flex items-center gap-2">
              <span className="hidden xl:inline text-xs font-bold text-gray-800 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 max-w-[140px] truncate">
                👋 Chào {currentUser.name}
              </span>
              
              {/* NÚT TỦ ĐỒ CÔNG KHAI - XEM NHẬT KÝ (Góc nhìn người ngoài) */}
              {currentUserId && (
                <Link href={`/closet/${currentUserId}`} title="Xem Tủ Đồ Công Khai (Nhật ký)" className="flex items-center justify-center w-8 h-8 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors shadow-sm">
                  <BookOpen size={14} />
                </Link>
              )}

              {/* NÚT QUẢN LÝ (Góc nhìn nội bộ) */}
              <Link href="/my-closet" title="Quản lý kho đồ" className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm">
                <UserCircle size={15} />
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
                className="text-[10px] font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-full transition-colors ml-1"
              >
                Thoát
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => handleFeatureRequirement("Đăng nhập")} className="text-gray-500 hover:text-gray-900 transition-colors px-3">Đăng Nhập</button>
              <button onClick={() => handleFeatureRequirement("Đăng ký")} className={`px-5 py-2.5 rounded-full font-bold transition-all shadow-sm ${darkMode ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-[#183A2D] text-white hover:bg-emerald-900"}`}>Bắt Đầu Ngay</button>
            </div>
          )}
        </div>

      </div>
    </header>
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
    <body className={`min-h-screen overflow-x-hidden antialiased relative transition-colors duration-500 font-body selection:bg-emerald-500 selection:text-white ${darkMode ? "bg-[#0B1121] text-gray-100" : "bg-white text-gray-900"}`}>
      
      <style>{`
        /* THAY MÁU FONT SANS-SERIF NHƯ YÊU CẦU */
        html { scroll-behavior: smooth; }
        .font-logo { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-heading { font-family: 'Plus Jakarta Sans', sans-serif; letter-spacing: -0.01em; }
        .font-body { font-family: 'Plus Jakarta Sans', sans-serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <Suspense fallback={<div className="p-4 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">Đang tải nền tảng...</div>}>
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

      <footer className={`transition-colors duration-500 pt-16 pb-12 relative z-10 text-left border-t ${darkMode ? "bg-[#0B1121] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
        <div className={`max-w-[1500px] mx-auto px-6 lg:px-12 grid grid-cols-2 md:grid-cols-5 gap-10 border-b pb-12 ${darkMode ? "border-gray-800" : "border-gray-200"}`}>
          <div className="col-span-2 space-y-4">
            <div className={`text-2xl font-extrabold tracking-tight ${darkMode ? "text-white" : "text-gray-900"}`}>CLOOP</div>
            <p className="font-body text-xs text-gray-500 max-w-[320px] leading-relaxed">
              Nền tảng kết nối thời trang tuần hoàn, ứng dụng công nghệ làm đẹp không gian sống và tối ưu vòng đời sản phẩm.
            </p>
            
            <div className="mt-6 flex items-center gap-3">
              <motion.a whileHover={{ scale: 1.1 }} href="#" className="w-9 h-9 rounded-full bg-white border border-gray-200 hover:border-emerald-300 flex items-center justify-center text-gray-600 hover:text-emerald-600 transition-all shadow-sm">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.8z"/></svg>
              </motion.a>
              <motion.a whileHover={{ scale: 1.1 }} href="#" className="w-9 h-9 rounded-full bg-white border border-gray-200 hover:border-emerald-300 flex items-center justify-center text-gray-600 hover:text-emerald-600 transition-all shadow-sm">
                <svg className="w-4 h-4 stroke-current fill-none stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </motion.a>
            </div>
          </div>

          {[
            { title: "Về CLOOP", links: [{name: "Câu chuyện", path: "/about"}, {name: "Bền vững", path: "/about/mission"}, {name: "Tin tức", path: "/blog"}] },
            { title: "Hỗ trợ", links: [{name: "Trợ giúp", path: "/support"}, {name: "Quy định bảo mật", path: "/support/privacy"}] },
            { title: "Dịch vụ", links: [{name: "Thuê trang phục", path: "/shop?type=rent"}, {name: "Ký gửi & Tái chế", path: "/my-closet/create"}] }
          ].map((col, idx) => (
            <div key={idx} className="col-span-1">
              <h4 className={`font-body text-[11px] font-extrabold uppercase tracking-widest mb-5 ${darkMode ? "text-gray-400" : "text-gray-900"}`}>{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link, lIdx) => (
                  <li key={lIdx}>
                    <Link href={link.path} className="font-body text-[13px] font-medium text-gray-500 hover:text-emerald-600 transition-colors text-left block">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="max-w-[1500px] mx-auto px-6 lg:px-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-body text-[11px] text-gray-400">
          <div className="font-medium">© 2026 CLOOP PROJECT. All rights reserved.</div>
          <div className="font-bold uppercase tracking-widest text-emerald-600">Built with Next.js</div>
        </div>
      </footer>

      <AiStylistChat darkMode={darkMode} />

      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }} 
              className={`p-8 rounded-[2rem] max-w-[400px] w-full text-center shadow-2xl relative space-y-5 mx-auto border ${darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}
            >
              <button type="button" onClick={() => setShowAuthModal(false)} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition">
                <X size={16} />
              </button>
              
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 mx-auto">
                <Shield size={24} strokeWidth={2.5} />
              </div>
              
              <div className="text-center space-y-1">
                <h3 className="font-heading text-2xl font-extrabold tracking-tight">Kích hoạt tài khoản</h3>
                <p className="text-xs text-gray-500 font-medium">Bắt đầu vòng lặp thời trang xanh cùng CLOOP ngay hôm nay.</p>
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
                    alert(`Hệ thống gặp sự cố: ${err.message || err}`);
                  }
                }}
                className="space-y-4 pt-4 text-left"
              >
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Tên hiển thị</label>
                  <input type="text" name="username" required placeholder="Nhập tên của bạn..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-400 focus:bg-white transition-all text-gray-900" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Địa chỉ Email</label>
                  <input type="email" name="email" required placeholder="hello@cloop.vn" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-400 focus:bg-white transition-all text-gray-900" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Mật khẩu</label>
                  <input type="password" name="password" required placeholder="••••••••" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-400 focus:bg-white transition-all text-gray-900" />
                </div>

                <button type="submit" className="w-full font-body text-xs font-extrabold uppercase tracking-widest bg-[#183A2D] text-white py-4 rounded-xl shadow-[0_4px_14px_rgba(24,58,45,0.2)] text-center hover:bg-emerald-900 transition-all active:scale-95 mt-4">
                  Đăng Nhập / Đăng Ký
                </button>
              </form> 
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </body>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" />
      </head>
      <AuthModalProvider>
        <LayoutContent>{children}</LayoutContent>
      </AuthModalProvider>
    </html>
  );
}