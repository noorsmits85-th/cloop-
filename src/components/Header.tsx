"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion"; // 🟢 ĐÃ THÊM: AnimatePresence cho menu mượt mà
import { useAuthModal } from "../../app/AuthModalContext";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Header() {
  const router = useRouter();
  const { handleFeatureRequirement } = useAuthModal(); 
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // 🟢 ĐÃ THÊM: Trạng thái đóng mở menu mobile

  useEffect(() => {
    const handleAuthCheck = async () => {
      if (typeof window !== "undefined") {
        const storedUserId = localStorage.getItem("cloop_user_id");
        const storedUserRaw = localStorage.getItem("cloop_user");

        if (storedUserId) {
          setUser({ id: storedUserId });
          if (storedUserRaw) {
            try {
              const parsed = JSON.parse(storedUserRaw);
              setProfile({
                full_name: parsed.name || parsed.full_name || "Trang Hoàng",
                username: parsed.username || "tranghoang",
                avatar_url: parsed.avatar_url || parsed.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb"
              });
            } catch (e) {
              setProfile({
                full_name: storedUserRaw || "Trang Hoàng",
                username: "tranghoang",
                avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb"
              });
            }
          } else {
            try {
              const { data: uData } = await supabase
                .from("User")
                .select("*")
                .eq("id", storedUserId)
                .single();
              if (uData) {
                setProfile({
                  full_name: uData.name || uData.full_name || "Trang Hoàng",
                  username: uData.username || "tranghoang",
                  avatar_url: uData.avatar_url || uData.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb"
                });
              }
            } catch (err) {
              setProfile({
                full_name: "Trang Hoàng",
                username: "tranghoang",
                avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb"
              });
            }
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    };

    handleAuthCheck();
    const interval = setInterval(handleAuthCheck, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("cloop_user_id");
      localStorage.removeItem("cloop_user");
    }
    setUser(null);
    setProfile(null);
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <header className="w-full bg-[#FAF9F5] border-b border-gray-200/60 px-4 md:px-8 py-3 lg:py-4 sticky top-0 z-50 transition-all duration-300">
      {/* KHUNG GIỚI HẠN TRUNG TÂM: Giúp màn hình laptop 100% gom lại gọn gàng như bản 80% */}
      <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between">
        
        {/* KHỐI TRÁI: LOGO CLOOP & THANH TÌM KIẾM AI STYLIST */}
        <div className="flex items-center gap-4 lg:gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-xl lg:text-2xl font-bold tracking-wider text-[#1C3F30] font-serif">CLOOP</span>
            <span className="text-[8px] lg:text-[9px] text-[#1C3F30]/60 font-medium hidden sm:block leading-none tracking-widest uppercase">Fashion in a loop</span>
          </Link>
          
          <div className="relative w-48 xl:w-64 hidden lg:block">
            <input 
              type="text" 
              placeholder="Search AI Stylist" 
              className="w-full pl-9 pr-4 py-1.5 bg-white/80 border border-gray-200/80 rounded-full focus:outline-none focus:border-[#1C3F30] text-[11px] font-medium placeholder-gray-400"
            />
            <span className="absolute left-3 top-2 text-gray-400 text-xs">🔍</span>
          </div>
        </div>

        {/* KHỐI GIỮA: THANH MENU ĐIỀU HƯỚNG CHÍNH (Tự động ẩn trên Mobile) */}
        <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-[10px] lg:text-[11px] font-bold tracking-widest text-[#1C3F30]/80">
          <Link href="/" className="hover:text-[#1C3F30] pb-1 transition">TRANG CHỦ</Link>
          <Link href="/shop?type=rent" className="hover:text-[#1C3F30] pb-1 transition">THUÊ ĐỒ</Link>
          <Link href="/my-closet/create" className="hover:text-[#1C3F30] pb-1 transition">CHO THUÊ ĐỒ</Link>
          <Link href="/shop?type=sell" className="hover:text-[#1C3F30] pb-1 transition">MUA & BÁN</Link>
          
          <button 
            onClick={() => handleFeatureRequirement("TÁI CHẾ")} 
            className="hover:text-[#1C3F30] pb-1 transition uppercase bg-transparent border-none outline-none font-bold tracking-widest text-[10px] lg:text-[11px] text-[#1C3F30]/80 cursor-pointer select-none"
          >
            TÁI CHẾ
          </button>
          <button 
            onClick={() => handleFeatureRequirement("BLOG")} 
            className="hover:text-[#1C3F30] pb-1 transition uppercase bg-transparent border-none outline-none font-bold tracking-widest text-[10px] lg:text-[11px] text-[#1C3F30]/80 cursor-pointer select-none"
          >
            BLOG
          </button>
        </nav>

        {/* KHỐI PHẢI: UTILS CHỨC NĂNG & ĐẤU DÂY XÁC THỰC */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {/* Nút Darkmode */}
          <button className="text-[#1C3F30] opacity-80 hover:opacity-100 text-sm p-1">🌙</button>

          {/* Giỏ hàng */}
          <button className="text-[#1C3F30] opacity-80 hover:opacity-100 text-sm p-1 mr-1">🛍️</button>

          {/* Khu vực Đăng nhập / Profile (Ẩn nút chữ trên Mobile để chống vỡ) */}
          <div className="hidden md:block">
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-8 h-8 lg:w-10 lg:h-10 rounded-full overflow-hidden border-2 border-[#1C3F30] focus:outline-none relative block shadow-sm hover:scale-105 transition cursor-pointer"
                >
                  <Image
                    src={profile?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb"} 
                    alt="Avatar"
                    fill
                    className="object-cover"
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-3 w-52 bg-white border border-gray-100 rounded-xl shadow-xl py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-50 text-left">
                      <p className="text-xs font-bold text-gray-800 truncate">{profile?.full_name || "Trang Hoàng"}</p>
                      <p className="text-[10px] text-gray-400 font-mono truncate">@{profile?.username || "tranghoang"}</p>
                    </div>
                    <Link 
                      href="/my-closet" 
                      className="block px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition text-left"
                      onClick={() => setDropdownOpen(false)}
                    >
                      👚 Tủ đồ của tôi
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 border-t border-gray-50 transition cursor-pointer"
                    >
                      🚪 Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => router.push("/login")}
                  className="text-[10px] lg:text-[11px] font-bold text-[#1C3F30]/80 hover:text-[#1C3F30] tracking-widest transition px-2 py-1.5 cursor-pointer"
                >
                  ĐĂNG NHẬP
                </button>
                <button 
                  onClick={() => router.push("/register")}
                  className="bg-[#1C3F30] text-white text-[10px] lg:text-[11px] font-bold tracking-widest px-4 py-1.5 rounded-full hover:bg-opacity-90 transition shadow-sm cursor-pointer"
                >
                  ĐĂNG KÝ
                </button>
              </div>
            )}
          </div>

          {/* Nếu đã Đăng nhập trên Mobile -> Vẫn ưu tiên hiện Avatar nhỏ gọn xinh xắn */}
          {user && (
            <div className="block md:hidden mr-1">
              <Link href="/my-closet" className="w-7 h-7 rounded-full overflow-hidden border border-[#1C3F30] relative block">
                <Image
                  src={profile?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb"} 
                  alt="Avatar"
                  fill
                  className="object-cover"
                />
              </Link>
            </div>
          )}

          {/* ☰ NÚT HAMBURGER DI ĐỘNG: Bật tắt menu trên điện thoại */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="block md:hidden text-[#1C3F30] p-1.5 text-lg focus:outline-none select-none"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* 📱 MENU THẢ XUỐNG DÀNH CHO MOBILE (Sử dụng hiệu ứng mượt của Framer Motion) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="block md:hidden w-full overflow-hidden bg-[#FAF9F5] border-t border-gray-100 mt-2 font-body"
          >
            <div className="flex flex-col py-4 space-y-4 text-xs font-bold tracking-wider text-[#1C3F30]/90 pl-2">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="hover:text-[#1C3F30] transition">TRANG CHỦ</Link>
              <Link href="/shop?type=rent" onClick={() => setMobileMenuOpen(false)} className="hover:text-[#1C3F30] transition">THUÊ ĐỒ</Link>
              <Link href="/my-closet/create" onClick={() => setMobileMenuOpen(false)} className="hover:text-[#1C3F30] transition">CHO THUÊ ĐỒ</Link>
              <Link href="/shop?type=sell" onClick={() => setMobileMenuOpen(false)} className="hover:text-[#1C3F30] transition">MUA & BÁN</Link>
              
              <button 
                onClick={() => { setMobileMenuOpen(false); handleFeatureRequirement("TÁI CHẾ"); }}
                className="text-left font-bold text-xs tracking-wider text-[#1C3F30]/90 uppercase"
              >
                TÁI CHẾ
              </button>
              <button 
                onClick={() => { setMobileMenuOpen(false); handleFeatureRequirement("BLOG"); }}
                className="text-left font-bold text-xs tracking-wider text-[#1C3F30]/90 uppercase"
              >
                BLOG
              </button>

              {/* Phần tài khoản dưới đáy menu di động khi CHƯA đăng nhập */}
              {!user && (
                <div className="flex items-center gap-3 pt-2 border-t border-gray-200/60 w-full">
                  <button 
                    onClick={() => { setMobileMenuOpen(false); router.push("/login"); }}
                    className="text-[11px] font-bold text-[#1C3F30] tracking-widest py-2"
                  >
                    ĐĂNG NHẬP
                  </button>
                  <button 
                    onClick={() => { setMobileMenuOpen(false); router.push("/register"); }}
                    className="bg-[#1C3F30] text-white text-[11px] font-bold tracking-widest px-5 py-2 rounded-full"
                  >
                    ĐĂNG KÝ
                  </button>
                </div>
              )}

              {/* Phần đăng xuất dưới đáy menu di động khi ĐÃ đăng nhập */}
              {user && (
                <div className="pt-2 border-t border-gray-200/60 w-full flex flex-col space-y-3">
                  <Link href="/my-closet" onClick={() => setMobileMenuOpen(false)} className="text-gray-700">
                    👚 Tủ đồ của tôi ({profile?.full_name})
                  </Link>
                  <button 
                    onClick={handleSignOut}
                    className="text-left text-red-600 font-bold"
                  >
                    🚪 ĐĂNG XUẤT
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}