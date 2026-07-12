"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation"; 
import { 
  Search, ShoppingBag, Sun, Moon, Shirt, Users, Leaf, Star, X, Shield
} from "lucide-react";
import { createClient } from "@supabase/supabase-js"; 
import "./globals.css";
import AiStylistChat from "./components/AiStylistChat"; 
// 🟢 ĐẤU NỐI CONTEXT: Import Provider và Hook dùng chung vừa tạo ở Bước 1[cite: 2]
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
      <div className="max-w-[1500px] mx-auto h-[88px] grid grid-cols-[auto_1fr_auto] items-center gap-4">
        
        <Link href="/" className="flex items-center gap-3 shrink-0 cursor-pointer group">
          <Image src="/loogo.png" alt="CLOOP Brand Logo" width={46} height={46} className="mix-blend-multiply" />
          <div className="leading-none mt-0.5 text-left">
            <div className={`font-logo text-[28px] font-semibold tracking-[0.18em] transition-colors ${darkMode ? "text-[#F5F5F5]" : "text-[#183A2D]"}`}>CLOOP</div>
            <p className="font-body text-[8px] font-bold tracking-[0.3em] uppercase text-[#6BA37A] mt-1">Fashion In A Loop</p>
          </div>
        </Link>

        <div className="flex items-center gap-4 xl:gap-5 min-w-0">
          <div className={`hidden md:flex items-center w-[120px] xl:w-[150px] h-[40px] rounded-full px-4 shrink-0 transition-all ${darkMode ? "bg-[#1C2834] border border-[#2B3946]" : "bg-[#FAF8F3] border border-[#E9E2D8] focus-within:bg-white focus-within:border-[#183A2D]"}`}>
            <Search size={13} className="text-gray-400 shrink-0" />
            <input className="ml-2 flex-1 bg-transparent text-[11px] font-body outline-none placeholder:text-gray-400 text-[#183A2D]" placeholder={placeholders[placeholderIndex]} readOnly onClick={() => window.location.href = '/shop'} />
          </div>

          <nav className="hidden lg:flex items-center gap-3.5 xl:gap-5 font-body text-[11px] xl:text-[12px] uppercase tracking-wide whitespace-nowrap font-bold min-w-0 overflow-x-auto no-scrollbar">
            <Link href="/" className={getNavbarClass("/", null, null)}>Trang chủ</Link>
            <Link href="/shop?type=rent" className={getNavbarClass("/shop", "rent", null)}>Thuê đồ</Link>
            <Link href="/my-closet/create?mode=rent" className={getNavbarClass("/my-closet/create", null, "rent")}>Cho thuê đồ</Link>
            <Link href="/shop?type=sell" className={getNavbarClass("/shop", "sell", null)}>Mua sắm</Link>
            <Link href="/my-closet/create?mode=consign" className={getNavbarClass("/my-closet/create", null, "consign")}>Chuyển nhượng & Ký gửi</Link>
            <button onClick={() => handleFeatureRequirement("Tái chế")} className="text-gray-400 hover:text-[#183A2D] transition-colors uppercase shrink-0 whitespace-nowrap bg-transparent border-none cursor-pointer font-bold">Tái chế</button>
            <button onClick={() => handleFeatureRequirement("Blog")} className="text-gray-400 hover:text-[#183A2D] transition-colors uppercase shrink-0 whitespace-nowrap bg-transparent border-none cursor-pointer font-bold">Blog</button>
          </nav>
        </div>

        <div className="flex items-center gap-4 shrink-0 whitespace-nowrap font-body text-[11px] font-bold uppercase tracking-widest">
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2.5 rounded-full transition-colors ${darkMode ? "bg-[#1C2834] text-amber-400 hover:bg-[#253946]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </motion.button>

          {currentUser ? (
            <div className="flex items-center gap-2 xl:gap-3">
              <span className="hidden xl:inline text-xs font-bold text-[#6BA37A] max-w-[140px] truncate">
                Chào {currentUser.name}! 🌿
              </span>
              <Link href="/my-closet" className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border whitespace-nowrap bg-white text-[#183A2D] border-[#E9E2D8] hover:bg-[#FAF8F3]">
                Tủ đồ của tôi
              </Link>
              <button 
                onClick={() => { 
                  // Khi thoát, xóa dọn sạch bộ nhớ của cả hai luồng đồng bộ danh tính[cite: 2]
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

// 🟢 TÁCH BIỆT PHÂN HỆ KHỐI GIAO DIỆN ĐỂ SỬ DỤNG ĐÚNG HOOK CONTEXT[cite: 2]
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
    <body className={`min-h-screen overflow-x-hidden antialiased relative transition-colors duration-500 font-body selection:bg-[#183A2D] selection:text-white ${darkMode ? "bg-[#0F1720] text-[#F5F5F5]" : "bg-[#FAF8F3] text-[#183A2D]"}`}>
      
      <style>{`
        html { scroll-behavior: smooth; }
        .font-logo { font-family: 'Cinzel', serif; }
        .font-heading { font-family: 'Cormorant Garamond', serif; }
        .font-body { font-family: 'Plus Jakarta Sans', sans-serif; }
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

      <footer className={`transition-colors duration-500 pt-16 pb-12 relative z-10 text-left ${darkMode ? "bg-[#0A1118] border-t border-[#2B3946]" : "bg-[#183A2D] text-[#FAF8F3]"}`}>
        <div className={`max-w-[1500px] mx-auto px-6 lg:px-12 grid grid-cols-2 md:grid-cols-5 gap-10 border-b pb-12 ${darkMode ? "border-slate-800" : "border-[#FAF8F3]/10"}`}>
          <div className="col-span-2 space-y-4">
            <div className="font-logo text-2xl font-bold tracking-wider text-white">CLOOP</div>
            <p className="font-body text-xs text-gray-300 max-w-[320px] leading-relaxed">
              CLOOP - Nền tảng kết nối thời trang tuần hoàn đầu tiên tại Việt Nam ứng dụng trí tuệ nhân tạo nâng cao trải nghiệm tiêu dùng xanh.
            </p>
            
            <div className="mt-6 flex items-center gap-3">
              <motion.a whileHover={{ scale: 1.12 }} href="https://facebook.com" target="_blank" className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 flex items-center justify-center text-white transition-all shadow-sm">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.8z"/>
                </svg>
              </motion.a>
              <motion.a whileHover={{ scale: 1.12 }} href="https://instagram.com" target="_blank" className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 flex items-center justify-center text-white transition-all shadow-sm">
                <svg className="w-3.5 h-3.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </motion.a>
              <motion.a whileHover={{ scale: 1.12 }} href="https://tiktok.com" target="_blank" className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 flex items-center justify-center text-white transition-all shadow-sm">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.13-1.46-.77-.53-1.43-1.23-1.93-2.05V15.7c.02 2.32-.89 4.67-2.62 6.16-2.12 1.83-5.32 2.14-7.77.77-2.82-1.56-3.89-5.18-2.42-8.02 1.11-2.16 3.56-3.49 5.97-3.32v4.13c-1.23-.15-2.52.3-3.29 1.25-.97 1.19-.85 3.1.28 4.14 1.12 1.04 3.02 1.01 4.1-.07.64-.64.91-1.56.89-2.47V.02z"/>
                </svg>
              </motion.a>
            </div>
          </div>

          {[
            { title: "Về chúng tôi", links: [{name: "Giới thiệu đề tài", path: "/about"}, {name: "Sứ mệnh cốt lõi", path: "/about/mission"}, {name: "Tầm nhìn công nghệ", path: "/about/tech"}, {name: "Tin tức dự án", path: "/blog"}] },
            { title: "Hỗ trợ kỹ thuật", links: [{name: "Trung tâm trợ giúp", path: "/support"}, {name: "Hướng dẫn sử dụng", path: "/support/guide"}, {name: "Điều khoản bảo mật", path: "/support/privacy"}, {name: "Giải quyết khiếu nại", path: "/support/report"}] },
            { title: "Cộng đồng xanh", links: [{name: "Chuyên mục Blog", path: "/blog"}, {name: "Sự kiện Techfest", path: "/events"}, {name: "Cộng tác viên Upcycle", path: "/partners"}, {name: "Đối tác liên kết", path: "/partners/list"}] }
          ].map((col, idx) => (
            <div key={idx} className="col-span-1">
              <h4 className="font-body text-xs font-bold uppercase tracking-wider text-white mb-5">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link, lIdx) => (
                  <li key={lIdx}>
                    <Link href={link.path} className="font-body text-xs text-gray-300 hover:text-white transition-colors text-left block">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="max-w-[1500px] mx-auto px-6 lg:px-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-body text-[11px] text-gray-400 tracking-wider">
          <div>© 2026 CLOOP PROJECT • NỀN TẢNG THỜI TRANG TUẦN HOÀN THÔNG MINH.</div>
          <div className="font-semibold uppercase tracking-widest text-[#6BA37A]">Powered by Next.js & Supabase Engine</div>
        </div>
      </footer>

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
                    // 🟢 MẠCH PHÂN LUỒNG DANH TÍNH: Đối soát email động trong database[cite: 2]
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
                      // LUỒNG A: Email đã tồn tại -> Kiểm tra password hợp lệ[cite: 2]
                      if (existingUser.password !== password) {
                        alert("Mật khẩu không chính xác cho tài khoản Email này. Vui lòng kiểm tra lại nhé! 🔑");
                        return;
                      }
                      finalUserId = existingUser.id;
                      finalName = existingUser.name || name.trim();
                    } else {
                      // LUỒNG B: Email hoàn toàn mới -> Tự động khởi tạo UUID đăng ký bản ghi User shadow[cite: 2]
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

                    // Khóa mã định danh chuẩn và đồng bộ mượt mà state Context[cite: 2]
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

    </body>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:ital,wght=0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght=300;400;500;600;700&display=swap" />
      </head>
      {/* 🟢 BỌC TOÀN SITE BẰNG PROVIDER ĐỂ PHÂN PHỐI QUYỀN TRUY CẬP DANH TÍNH[cite: 2] */}
      <AuthModalProvider>
        <LayoutContent>{children}</LayoutContent>
      </AuthModalProvider>
    </html>
  );
}