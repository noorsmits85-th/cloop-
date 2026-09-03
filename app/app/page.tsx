"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Camera, Sparkles, Bell, Heart, MapPin, 
  Shirt, ArrowRight, Home, ShoppingBag, Plus, User,
  CheckCircle2, RefreshCw
} from "lucide-react";
import VisualSearchModal from "@/app/components/VisualSearchModal";
import { getTrendingProductsAction } from "@/app/actions/favorite";
import { getUserNotificationsAction } from "@/app/actions/notification";
import { useAuthModal } from "@/app/AuthModalContext";

export default function MobileAppPage() {
  const { currentUser, setShowAuthModal } = useAuthModal();
  const [showSplash, setShowSplash] = useState(false);
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [activeCategoryTab, setActiveCategoryTab] = useState("all");
  const [unreadCount, setUnreadCount] = useState(0);

  // 🌿 1. QUẢN LÝ MÀN HÌNH CHÀO NGHỆ THUẬT (CHỈ CHẠY RIÊNG TRONG /app)
  useEffect(() => {
    const hasSeenAppSplash = sessionStorage.getItem("cloop_app_route_splash_seen");
    if (!hasSeenAppSplash) {
      setShowSplash(true);
      sessionStorage.setItem("cloop_app_route_splash_seen", "true");
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 1900);
      return () => clearTimeout(timer);
    }
  }, []);

  // 🌿 2. LẤY DỮ LIỆU SẢN PHẨM & THÔNG BÁO THỰC TẾ
  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, notifRes] = await Promise.all([
          getTrendingProductsAction(20),
          getUserNotificationsAction().catch(() => ({ success: false, unreadCount: 0 }))
        ]);

        if (prodRes?.success && prodRes.products) {
          setProducts(prodRes.products);
        }
        if (notifRes?.success && notifRes.unreadCount) {
          setUnreadCount(notifRes.unreadCount);
        }
      } catch (e) {
        console.error("Lỗi tải dữ liệu app:", e);
      } finally {
        setIsLoadingProducts(false);
      }
    }
    loadData();
  }, []);

  const handleAuthGuarded = (e: React.MouseEvent, url: string) => {
    if (!currentUser) {
      e.preventDefault();
      setShowAuthModal(true);
    }
  };

  const filteredProducts = products.filter(p => {
    if (activeCategoryTab === "all") return true;
    if (activeCategoryTab === "rent") return true;
    if (activeCategoryTab === "sale") return p.isHighlighted;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-stone-800 antialiased pb-24 max-w-md mx-auto shadow-2xl border-x border-stone-200/60 relative overflow-x-hidden select-none">
      
      {/* ========================================================
          🌸 1. MÀN HÌNH CHÀO ĐỘC BẢN CHO APP ("Fashion in a loop")
          ======================================================== */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="app-dedicated-splash"
            initial={{ opacity: 1 }}
            exit={{ 
              opacity: 0, 
              scale: 1.04,
              filter: "blur(10px)",
              transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } 
            }}
            onClick={() => setShowSplash(false)}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none cursor-pointer overflow-hidden max-w-md mx-auto"
            style={{
              background: "radial-gradient(ellipse at 50% 40%, #FFFFFF 0%, #F4FAF5 45%, #E2EFE7 100%)",
            }}
          >
            {/* Lớp lụa matcha bồng bềnh */}
            <motion.div
              animate={{
                scale: [1, 1.25, 1],
                rotate: [0, 15, 0],
                x: [-15, 20, -15],
                y: [-10, 15, -10],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/5 -left-12 w-[320px] h-[320px] rounded-full bg-gradient-to-tr from-[#C5DFD0]/50 via-[#E4F3EB]/40 to-transparent blur-3xl pointer-events-none"
            />

            {/* Dải lụa 3D tuần hoàn */}
            <div className="relative z-10 flex flex-col items-center text-center px-6">
              <motion.div
                initial={{ scale: 0.6, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-24 h-24 mb-2 flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-[#98C8A8]/40 via-[#B4DCBF]/30 to-[#E8F4EC]/60 rounded-full blur-xl animate-pulse" />
                <Image
                  src="/loogo.png"
                  alt="CLOOP"
                  width={88}
                  height={88}
                  priority
                  className="object-contain mix-blend-multiply drop-shadow-sm"
                />
              </motion.div>

              {/* CLOOP Title */}
              <motion.h1
                initial={{ opacity: 0, y: 10, letterSpacing: "0.25em" }}
                animate={{ opacity: 1, y: 0, letterSpacing: "0.15em" }}
                transition={{ duration: 0.8, delay: 0.25 }}
                className="font-brand-title text-4xl font-extrabold tracking-[0.15em] pl-[0.15em] leading-none animate-brand-shimmer drop-shadow-xs font-heading text-[#183A2D]"
              >
                CLOOP
              </motion.h1>

              {/* Fashion in a loop */}
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.9, delay: 0.55 }}
                className="mt-2.5 flex items-center justify-center gap-2.5"
              >
                <span className="w-5 h-[1px] bg-gradient-to-r from-transparent to-[#4A785D]" />
                <p 
                  className="font-handwriting text-2xl text-[#1E4B35] italic"
                  style={{ fontFamily: "var(--font-dancing-script), cursive" }}
                >
                  Fashion in a loop
                </p>
                <span className="w-5 h-[1px] bg-gradient-to-l from-transparent to-[#4A785D]" />
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ duration: 0.7, delay: 0.8 }}
                className="text-[9px] uppercase tracking-[0.3em] text-[#36634A] font-ui mt-3 font-semibold"
              >
                Tủ Đồ Tuần Hoàn • Thời Trang Bền Vững
              </motion.p>
            </div>

            <div className="absolute bottom-10 flex items-center gap-1.5 opacity-60">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A785D] animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#6C9E80] animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#9DC6AD] animate-bounce [animation-delay:0.4s]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================
          📱 2. APP HEADER BAR (TỐI GIẢN, HIỆN ĐẠI, CAO CẤP)
          ======================================================== */}
      <header className="sticky top-0 z-40 bg-[#FAF9F5]/90 backdrop-blur-md px-4 py-3 border-b border-[#EBE6D8] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image 
            src="/loogo.png" 
            alt="CLOOP" 
            width={34} 
            height={34} 
            className="mix-blend-multiply" 
          />
          <div>
            <span className="font-brand-title text-xl font-extrabold tracking-[0.1em] text-[#183A2D] leading-none block font-heading">
              CLOOP
            </span>
            <span className="font-handwriting text-[10px] text-[#4A785D] italic -mt-0.5 block">
              Fashion in a loop
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link 
            href="/ai-stylist" 
            className="w-9 h-9 rounded-full bg-white border border-[#EBE6D8] flex items-center justify-center text-[#183A2D] shadow-3xs active:scale-90 transition-transform"
            title="AI Stylist"
          >
            <Sparkles size={16} className="text-emerald-700" />
          </Link>

          <Link 
            href="/my-closet/notifications" 
            onClick={(e) => handleAuthGuarded(e, "/my-closet/notifications")}
            className="w-9 h-9 rounded-full bg-white border border-[#EBE6D8] flex items-center justify-center text-stone-600 shadow-3xs relative active:scale-90 transition-transform"
            title="Hộp thư thông báo"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] bg-rose-500 text-white text-[8.5px] font-extrabold rounded-full flex items-center justify-center px-0.5 border border-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* ========================================================
          🔍 3. THANH TÌM KIẾM & CHỤP ẢNH AI LOOKBOOK
          ======================================================== */}
      <div className="p-4 space-y-3.5">
        <div className="flex items-center gap-2">
          <Link
            href="/shop"
            className="flex-1 h-11 rounded-full bg-white border border-[#E0D9CE] px-4 flex items-center gap-2 text-stone-400 shadow-3xs active:scale-98 transition-transform"
          >
            <Search size={16} className="text-[#183A2D]" />
            <span className="text-xs font-medium text-stone-500 truncate">
              Tìm đầm dạ hội, áo dài, túi hiệu...
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setIsVisualSearchOpen(true)}
            className="w-11 h-11 rounded-full bg-[#183A2D] text-white flex items-center justify-center shadow-md active:scale-90 transition-transform shrink-0 cursor-pointer"
            title="Tìm kiếm bằng ảnh AI"
          >
            <Camera size={18} />
          </button>
        </div>

        {/* ========================================================
            🎀 4. VÒNG TRÒN DANH MỤC NỔI BẬT (STORY BUBBLES)
            ======================================================== */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 -mx-4 px-4">
          {[
            { label: "Đầm Dạ Hội", icon: "💃", link: "/shop?occasion=Dạ hội" },
            { label: "Áo Dài Di Sản", icon: "🪡", link: "/shop?occasion=Áo dài" },
            { label: "Tiệc Cưới", icon: "👗", link: "/shop?occasion=Tiệc cưới" },
            { label: "Túi & Phụ Kiện", icon: "👜", link: "/shop?occasion=Phụ kiện" },
            { label: "Tủ Đồ Xanh", icon: "🌿", link: "/shop?occasion=Vintage" },
            { label: "Giao 2H", icon: "⚡", link: "/shop?type=rent" },
          ].map((cat, idx) => (
            <Link
              key={idx}
              href={cat.link}
              className="flex flex-col items-center gap-1.5 shrink-0 group active:scale-95 transition-transform"
            >
              <div className="w-14 h-14 rounded-full bg-white border border-[#E5DFD5] shadow-3xs flex items-center justify-center text-2xl group-hover:border-[#183A2D] transition-colors">
                <span>{cat.icon}</span>
              </div>
              <span className="text-[10px] font-bold text-stone-700 tracking-tight whitespace-nowrap">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>

        {/* ========================================================
            🌿 5. MINI-BANNER MATCHA LỤA (KHÔNG BỊ ĐƠ CỨNG)
            ======================================================== */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#183A2D] via-[#245240] to-[#183A2D] p-4 text-white shadow-sm flex items-center justify-between">
          <div className="space-y-1 max-w-[70%]">
            <span className="inline-block text-[8.5px] uppercase tracking-widest font-extrabold text-[#A3E39F] bg-white/10 px-2 py-0.5 rounded-full">
              Tuần Hoàn Tủ Đồ 2026
            </span>
            <h3 className="font-heading text-sm font-extrabold leading-tight text-white">
              Thuê Đồ Sự Kiện Tiết Kiệm Đến 85%
            </h3>
            <Link
              href="/shop?type=rent"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#A3E39F] hover:text-white pt-1"
            >
              <span>Khám phá ngay</span>
              <ArrowRight size={12} />
            </Link>
          </div>
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl shrink-0">
            👗
          </div>
        </div>

        {/* ========================================================
            🏷️ 6. BỘ LỌC DANH MỤC NHANH
            ======================================================== */}
        <div className="flex items-center justify-between pt-1 border-b border-[#EBE6D8] pb-2.5">
          <div className="flex items-center gap-1.5">
            {[
              { id: "all", label: "Tất cả" },
              { id: "rent", label: "Đang cho thuê" },
              { id: "sale", label: "Hàng tuyển chọn" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategoryTab(tab.id)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  activeCategoryTab === tab.id
                    ? "bg-[#183A2D] text-white shadow-3xs"
                    : "bg-white text-stone-500 border border-stone-200/80 hover:bg-stone-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Link
            href="/shop"
            className="text-[11px] font-bold text-[#183A2D] flex items-center gap-0.5 hover:underline"
          >
            <span>Xem thêm</span>
            <ArrowRight size={11} />
          </Link>
        </div>

        {/* ========================================================
            👗 7. LƯỚI SẢN PHẨM THỜI TRANG (2 CỘT CHUẨN MOBILE APP)
            ======================================================== */}
        {isLoadingProducts ? (
          <div className="grid grid-cols-2 gap-3 py-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="space-y-2 animate-pulse">
                <div className="w-full aspect-[3/4] bg-stone-200 rounded-2xl" />
                <div className="h-3 bg-stone-200 rounded-md w-3/4" />
                <div className="h-3 bg-stone-200 rounded-md w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-12 text-center text-stone-400 bg-white rounded-2xl border border-dashed border-stone-200">
            <Shirt size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs font-medium">Chưa có trang phục nào thuộc mục này.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((p) => {
              const primaryImg = p.imageUrl || p.image_url || p.images?.[0]?.url || "/placeholder-clothing.png";
              const rentPrice = p.rental_price || p.rentalPrice || p.listings?.[0]?.basePrice || 0;
              const displayPrice = rentPrice > 0 
                ? `${new Intl.NumberFormat("vi-VN").format(rentPrice)}₫ / ngày`
                : "Liên hệ";

              return (
                <Link
                  href={`/product/${p.id}`}
                  key={p.id}
                  className="block group relative bg-white rounded-2xl overflow-hidden border border-stone-200/60 shadow-3xs hover:shadow-sm transition-all"
                >
                  <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden">
                    <Image
                      src={primaryImg}
                      alt={p.title || p.name || "CLOOP Outfit"}
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    <span className="absolute top-2 left-2 text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[#183A2D] text-white shadow-xs font-heading">
                      RENTAL
                    </span>

                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-stone-400 hover:text-red-500 shadow-sm transition-colors z-20"
                    >
                      <Heart size={12} />
                    </button>

                    {p.size && (
                      <span className="absolute bottom-2 left-2 bg-stone-900/70 backdrop-blur-md text-[8.5px] font-bold text-white px-2 py-0.5 rounded font-heading">
                        SIZE {p.size}
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 space-y-1">
                    <p className="text-xs font-bold text-stone-800 line-clamp-1 font-heading group-hover:text-[#183A2D] transition-colors">
                      {p.title || p.name}
                    </p>
                    <div className="flex flex-col gap-0.5 text-[10px] text-stone-400">
                      <span className="flex items-center gap-0.5 truncate">
                        <MapPin size={10} className="text-[#6BA37A] shrink-0" />
                        {p.province || "Toàn quốc"}
                      </span>
                      <span className="font-mono font-bold text-[#183A2D] text-xs mt-0.5">
                        {displayPrice}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================
          📱 8. THANH ĐIỀU HƯỚNG ĐÁY CHUẨN APP NATIVE (5 TABS)
          ======================================================== */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50 bg-white/95 backdrop-blur-lg border-t border-[#E9E2D8] px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[calc(0.4rem+env(safe-area-inset-bottom,0px))]">
        
        {/* TAB 1: KHÁM PHÁ (ACTIVE) */}
        <Link
          href="/app"
          className="flex flex-col items-center justify-center flex-1 py-1 text-[#183A2D] font-bold select-none"
        >
          <div className="relative">
            <Home size={20} strokeWidth={2.5} />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#183A2D] rounded-full" />
          </div>
          <span className="text-[9.5px] tracking-tight mt-0.5 font-ui">Khám phá</span>
        </Link>

        {/* TAB 2: SÀN THUÊ */}
        <Link
          href="/shop?type=rent"
          className="flex flex-col items-center justify-center flex-1 py-1 text-stone-400 hover:text-stone-600 font-medium select-none"
        >
          <ShoppingBag size={20} strokeWidth={1.8} />
          <span className="text-[9.5px] tracking-tight mt-0.5 font-ui">Sàn thuê</span>
        </Link>

        {/* TAB 3: NÚT TRÒN ĐĂNG ĐỒ NỔI BẬT */}
        <div className="flex-1 flex justify-center -mt-6">
          <Link
            href="/my-closet/create"
            onClick={(e) => handleAuthGuarded(e, "/my-closet/create")}
            className="group relative flex flex-col items-center active:scale-95 transition-transform"
            aria-label="Đăng trang phục mới"
          >
            <div className="w-[48px] h-[48px] rounded-full bg-gradient-to-tr from-[#183A2D] via-[#21523F] to-[#2E6F55] p-[2px] shadow-lg shadow-emerald-950/25 flex items-center justify-center border-2 border-white">
              <div className="w-full h-full rounded-full bg-[#183A2D] flex items-center justify-center text-white transition-colors group-hover:bg-[#112a20]">
                <Plus size={22} strokeWidth={2.8} />
              </div>
            </div>
            <span className="text-[9px] font-extrabold text-[#183A2D] tracking-tighter mt-0.5 uppercase font-ui">
              Đăng đồ
            </span>
          </Link>
        </div>

        {/* TAB 4: THÔNG BÁO */}
        <Link
          href="/my-closet/notifications"
          onClick={(e) => handleAuthGuarded(e, "/my-closet/notifications")}
          className="flex flex-col items-center justify-center flex-1 py-1 text-stone-400 hover:text-stone-600 font-medium relative select-none"
        >
          <div className="relative">
            <Bell size={20} strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] bg-rose-500 text-white text-[8px] font-extrabold rounded-full flex items-center justify-center px-0.5 border border-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[9.5px] tracking-tight mt-0.5 font-ui">Hộp thư</span>
        </Link>

        {/* TAB 5: TỦ ĐỒ CỦA TÔI */}
        <Link
          href="/my-closet"
          onClick={(e) => handleAuthGuarded(e, "/my-closet")}
          className="flex flex-col items-center justify-center flex-1 py-1 text-stone-400 hover:text-stone-600 font-medium select-none"
        >
          <User size={20} strokeWidth={1.8} />
          <span className="text-[9.5px] tracking-tight mt-0.5 font-ui">Tủ đồ</span>
        </Link>

      </nav>

      {/* MODAL TÌM KIẾM BẰNG ẢNH AI */}
      <VisualSearchModal
        isOpen={isVisualSearchOpen}
        onClose={() => setIsVisualSearchOpen(false)}
      />

    </div>
  );
}
