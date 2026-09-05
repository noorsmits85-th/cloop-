"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Camera, Sparkles, Bell, Heart, MapPin, 
  Shirt, ArrowRight, Home, ShoppingBag, Plus, User,
  CheckCircle2, Flame, Star
} from "lucide-react";
import VisualSearchModal from "@/app/components/VisualSearchModal";
import { getTrendingProductsAction } from "@/app/actions/favorite";
import { getUserNotificationsAction } from "@/app/actions/notification";
import { useAuthModal } from "@/app/AuthModalContext";

export default function MobileAppPage() {
  const { currentUser, setShowAuthModal } = useAuthModal();
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [activeCategoryTab, setActiveCategoryTab] = useState("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [likedItems, setLikedItems] = useState<Record<string, boolean>>({});

  // 🌿 1. LẤY DỮ LIỆU SẢN PHẨM & THÔNG BÁO THỰC TẾ
  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, notifRes] = await Promise.all([
          getTrendingProductsAction(20),
          getUserNotificationsAction().catch(() => ({ success: false, unreadCount: 0 }))
        ]);

        if (prodRes?.success && prodRes.products) {
          // Lọc bỏ các ảnh rác / ảnh không phải quần áo nếu có
          const validProducts = (prodRes.products as any[]).filter((p: any) => {
            const img = p.primaryImage || p.imageUrl || p.image_url || p.images?.[0]?.url || "";
            return !img.includes("wine") && !img.includes("bottle");
          });
          setProducts(validProducts.length > 0 ? validProducts : prodRes.products);
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

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLikedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredProducts = products.filter(p => {
    if (activeCategoryTab === "all") return true;
    if (activeCategoryTab === "rent") return true;
    if (activeCategoryTab === "sale") return p.isHighlighted;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D1210] via-[#141A17] to-[#0A0E0C] py-0 sm:py-8 flex justify-center selection:bg-emerald-800 selection:text-white">
      
      {/* 📱 KHUNG MÁY IPHONE 17 PRO MAX TITANIUM (VIỀN SIÊU MỎNG 1.15MM) */}
      <div className="w-full max-w-[400px] min-h-screen sm:min-h-[860px] sm:max-h-[880px] sm:rounded-[52px] bg-[#FAF8F5] text-stone-900 antialiased shadow-[0_25px_90px_-10px_rgba(0,0,0,0.85),0_0_0_2px_#383B3F] sm:border-[2px] border-stone-600 relative overflow-y-auto overflow-x-hidden select-none pb-24 no-scrollbar">
        
        {/* ========================================================
            📱 2. APP HEADER BAR (SẮC NÉT, ĐẲNG CẤP, CÓ HỒN)
            ======================================================== */}

        {/* ========================================================
            📱 2. APP HEADER BAR (SẮC NÉT, ĐẲNG CẤP, CÓ HỒN)
            ======================================================== */}
        <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md px-4 py-3 border-b border-[#E8E1D5] flex items-center justify-between shadow-3xs">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
              <Image 
                src="/loogo.png" 
                alt="CLOOP Brand Logo" 
                width={42} 
                height={42} 
                className="mix-blend-multiply drop-shadow-xs" 
              />
            </div>
            <div className="flex flex-col">
              <span className="font-brand-title text-[22px] font-extrabold tracking-[0.14em] text-[#183A2D] leading-none pl-0.5">
                CLOOP
              </span>
              <span className="text-[7.5px] font-extrabold tracking-[0.32em] uppercase text-[#226343] mt-1 pl-0.5 font-sans">
                FASHION IN A LOOP
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link 
              href="/ai-stylist" 
              className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center gap-1 text-emerald-800 text-xs font-bold shadow-3xs active:scale-95 transition-transform"
              title="Trợ lý AI Stylist"
            >
              <Sparkles size={14} className="text-emerald-700 animate-spin [animation-duration:6s]" />
              <span className="text-[10px] uppercase font-ui tracking-wider">AI Stylist</span>
            </Link>

            <Link 
              href="/my-closet/notifications" 
              onClick={(e) => handleAuthGuarded(e, "/my-closet/notifications")}
              className="w-9 h-9 rounded-full bg-white border border-[#E0D8CB] flex items-center justify-center text-stone-700 shadow-3xs relative active:scale-95 transition-transform"
              title="Hộp thư thông báo"
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] bg-rose-500 text-white text-[8.5px] font-extrabold rounded-full flex items-center justify-center px-0.5 border-2 border-white shadow-xs">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* ========================================================
            🔍 3. THANH TÌM KIẾM CAO CẤP & CAMERA AI
            ======================================================== */}
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2.5">
            <Link
              href="/shop"
              className="flex-1 h-12 rounded-full bg-white border border-[#DDD5C7] px-4 flex items-center gap-2.5 text-stone-400 shadow-xs hover:border-[#183A2D] transition-colors group"
            >
              <Search size={17} className="text-[#183A2D] group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-stone-600 truncate font-ui">
                Tìm đầm tiệc, áo dài gấm, túi hiệu...
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setIsVisualSearchOpen(true)}
              className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#183A2D] to-[#2B6349] text-white flex items-center justify-center shadow-md hover:shadow-lg active:scale-90 transition-all shrink-0 cursor-pointer border border-emerald-700/50"
              title="Tìm kiếm bằng ảnh AI Lookbook"
            >
              <Camera size={19} />
            </button>
          </div>

          {/* ========================================================
              🎀 4. THẺ STORY THỜI TRANG ĐỨNG (EDITORIAL STORY CARDS)
              ======================================================== */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <span className="text-[10.5px] font-extrabold tracking-wider uppercase text-[#183A2D] font-ui flex items-center gap-1.5">
                <Sparkles size={12} className="text-[#C89D56]" />
                Bộ Sưu Tập Nổi Bật
              </span>
              <span className="text-[10px] text-stone-400 font-medium">Vuốt sang →</span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 -mx-4 px-4">
              {[
                { 
                  title: "Dạ Tiệc & Gala", 
                  tag: "Lụa Satin",
                  img: "/1.1.jpg", 
                  link: "/shop?occasion=Dạ hội" 
                },
                { 
                  title: "Áo Dài Di Sản", 
                  tag: "Gấm Sen",
                  img: "/anhbia.png", 
                  link: "/shop?occasion=Áo dài" 
                },
                { 
                  title: "Tiệc Cưới Prom", 
                  tag: "Sequin Lấp Lánh",
                  img: "/evening_dress.jpg", 
                  link: "/shop?occasion=Tiệc cưới" 
                },
                { 
                  title: "Túi & Phụ Kiện", 
                  tag: "Da Thủ Công",
                  img: "/step2_bag.jpg", 
                  link: "/shop?occasion=Phụ kiện" 
                },
                { 
                  title: "Tủ Đồ Xanh", 
                  tag: "Eco Linen",
                  img: "/macro_fabric.jpg", 
                  link: "/shop?occasion=Vintage" 
                },
                { 
                  title: "Tối Giản Paris", 
                  tag: "Cashmere",
                  img: "/vintage_coat.jpg", 
                  link: "/shop?type=rent" 
                },
              ].map((card, idx) => (
                <Link
                  key={idx}
                  href={card.link}
                  className="relative w-[105px] h-[145px] rounded-2xl overflow-hidden shrink-0 group active:scale-95 transition-all shadow-sm hover:shadow-md border border-stone-200/80"
                >
                  <Image
                    src={card.img}
                    alt={card.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    unoptimized
                  />
                  {/* Gradient phủ tối cho chữ nổi bật */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  
                  <div className="absolute top-2 left-2">
                    <span className="text-[7.5px] uppercase font-bold tracking-widest text-[#E8DFD0] bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-full border border-white/20">
                      {card.tag}
                    </span>
                  </div>

                  <div className="absolute bottom-2.5 left-2 right-2">
                    <h4 className="font-heading text-xs font-bold text-white leading-tight drop-shadow-sm">
                      {card.title}
                    </h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* ========================================================
              🌿 5. BANNER LỤA MATCHA CAO CẤP (KHÔNG NHẠT NHÒA)
              ======================================================== */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0F2E20] via-[#1B4D35] to-[#0A2217] p-5 text-white shadow-lg border border-[#326B4E]/60">
            {/* Vầng sáng hữu cơ */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />
            
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="space-y-1.5 max-w-[65%]">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 border border-emerald-400/40 text-[#A3E39F] text-[9px] font-extrabold tracking-widest uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A3E39F] animate-pulse" />
                  Tuần Hoàn 2026
                </div>
                <h3 className="font-heading text-base sm:text-lg font-extrabold leading-tight text-white tracking-wide drop-shadow-sm">
                  Mặc Đẹp Mọi Sự Kiện Tiết Kiệm Đến 85%
                </h3>
                <p className="text-[10px] text-emerald-100/80 font-ui leading-relaxed line-clamp-2">
                  Trải nghiệm hàng trăm thiết kế lộng lẫy không cần tốn tiền mua đứt.
                </p>
                <Link
                  href="/shop?type=rent"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FAF8F5] text-[#183A2D] text-[10.5px] font-extrabold uppercase tracking-wider hover:bg-white shadow-md active:scale-95 transition-all mt-1 font-ui"
                >
                  <span>Thuê đồ ngay</span>
                  <ArrowRight size={11} />
                </Link>
              </div>

              <div className="relative w-24 h-28 rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl shrink-0 bg-stone-900 group">
                <Image 
                  src="/evening_dress.jpg" 
                  alt="CLOOP Evening Dress" 
                  fill 
                  className="object-cover group-hover:scale-105 transition-transform duration-500" 
                  unoptimized 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[8px] font-bold text-center text-white bg-black/60 backdrop-blur-xs py-0.5 rounded">
                  Dạ tiệc 2026
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================
              🏷️ 6. BỘ LỌC DANH MỤC & TIÊU ĐỀ
              ======================================================== */}
          <div className="flex items-center justify-between pt-1 border-b border-[#E8E1D5] pb-3">
            <div className="flex items-center gap-1.5">
              {[
                { id: "all", label: "Tất cả" },
                { id: "rent", label: "Đang cho thuê" },
                { id: "sale", label: "Hàng hiệu tuyển chọn" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategoryTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer font-ui ${
                    activeCategoryTab === tab.id
                      ? "bg-[#183A2D] text-white shadow-xs"
                      : "bg-white text-stone-600 border border-[#DCD5C8] hover:bg-stone-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Link
              href="/shop"
              className="text-xs font-bold text-[#183A2D] flex items-center gap-0.5 hover:underline font-ui"
            >
              <span>Xem tất cả</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {/* ========================================================
              👗 7. LƯỚI SẢN PHẨM THỜI TRANG NỔI BẬT (2 CỘT SẮC NÉT)
              ======================================================== */}
          {isLoadingProducts ? (
            <div className="grid grid-cols-2 gap-3.5 py-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="space-y-2.5 animate-pulse bg-white p-2.5 rounded-2xl border border-stone-200">
                  <div className="w-full aspect-[3/4] bg-stone-200 rounded-xl" />
                  <div className="h-3.5 bg-stone-200 rounded w-3/4" />
                  <div className="h-3 bg-stone-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-stone-400 bg-white rounded-2xl border border-dashed border-stone-200">
              <Shirt size={28} className="mx-auto mb-2 opacity-40 text-stone-500" />
              <p className="text-xs font-medium font-heading">Chưa có trang phục nào thuộc mục này.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5">
              {filteredProducts.map((p: any) => {
                const primaryImg = p.primaryImage || p.imageUrl || p.image_url || p.images?.[0]?.url || "/placeholder-clothing.png";
                const rentPrice = p.rental_price || p.rentalPrice || p.listings?.[0]?.basePrice || 0;
                const displayPrice = rentPrice > 0 
                  ? `${new Intl.NumberFormat("vi-VN").format(rentPrice)}₫ / ngày`
                  : "Liên hệ";
                const isLiked = !!likedItems[p.id];

                return (
                  <Link
                    href={`/product/${p.id}`}
                    key={p.id}
                    className="block group relative bg-white rounded-2xl overflow-hidden border border-[#E0D8CB] shadow-3xs hover:shadow-md transition-all hover:border-[#183A2D]/40"
                  >
                    <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden">
                      <Image
                        src={primaryImg}
                        alt={p.title || p.name || "CLOOP Outfit"}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover:scale-106"
                      />

                      {/* Tag RENTAL sang xịn */}
                      <span className="absolute top-2.5 left-2.5 text-[8.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#183A2D] text-[#FAF8F5] shadow-xs font-heading">
                        CHO THUÊ
                      </span>

                      {/* Nút tim yêu thích */}
                      <button 
                        onClick={(e) => toggleLike(p.id, e)}
                        className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full backdrop-blur-md flex items-center justify-center shadow-xs transition-all z-20 ${
                          isLiked 
                            ? "bg-rose-50 text-rose-500" 
                            : "bg-white/90 text-stone-400 hover:text-rose-500"
                        }`}
                        title="Thêm vào yêu thích"
                      >
                        <Heart size={13} className={isLiked ? "fill-rose-500" : ""} />
                      </button>

                      {p.size && (
                        <span className="absolute bottom-2.5 left-2.5 bg-stone-900/80 backdrop-blur-md text-[8.5px] font-bold text-white px-2 py-0.5 rounded-md font-heading">
                          SIZE {p.size}
                        </span>
                      )}
                    </div>

                    <div className="p-3 space-y-1.5">
                      <p className="text-xs font-bold text-stone-900 line-clamp-1 font-heading group-hover:text-[#183A2D] transition-colors">
                        {p.title || p.name}
                      </p>
                      
                      <div className="flex items-center gap-1 text-[10.5px] text-stone-500">
                        <MapPin size={11} className="text-[#3D7A58] shrink-0" />
                        <span className="truncate">{p.province || "Hà Nội"}</span>
                      </div>

                      <div className="pt-0.5 border-t border-stone-100 flex items-center justify-between">
                        <span className="font-mono font-extrabold text-[#183A2D] text-[12.5px]">
                          {displayPrice}
                        </span>
                        <span className="text-[8.5px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Cọc an toàn
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
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50 bg-[#FAF8F5]/95 backdrop-blur-lg border-t border-[#E0D8CB] px-2 py-1.5 flex items-center justify-around shadow-[0_-6px_25px_rgba(24,58,45,0.08)] pb-[calc(0.4rem+env(safe-area-inset-bottom,0px))] sm:rounded-b-[2.5rem]">
          
          {/* TAB 1: KHÁM PHÁ (ACTIVE) */}
          <Link
            href="/app"
            className="flex flex-col items-center justify-center flex-1 py-1 text-[#183A2D] font-extrabold select-none"
          >
            <div className="relative">
              <Home size={21} strokeWidth={2.6} />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#183A2D] rounded-full" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 font-ui">Khám phá</span>
          </Link>

          {/* TAB 2: SÀN THUÊ */}
          <Link
            href="/shop?type=rent"
            className="flex flex-col items-center justify-center flex-1 py-1 text-stone-500 hover:text-[#183A2D] font-semibold select-none transition-colors"
          >
            <ShoppingBag size={20} strokeWidth={1.8} />
            <span className="text-[10px] tracking-tight mt-0.5 font-ui">Sàn thuê</span>
          </Link>

          {/* TAB 3: NÚT TRÒN ĐĂNG ĐỒ NỔI BẬT */}
          <div className="flex-1 flex justify-center -mt-6">
            <Link
              href="/my-closet/create"
              onClick={(e) => handleAuthGuarded(e, "/my-closet/create")}
              className="group relative flex flex-col items-center active:scale-95 transition-transform"
              aria-label="Đăng trang phục mới"
            >
              <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-tr from-[#183A2D] via-[#235840] to-[#2E6F55] p-[2.5px] shadow-lg shadow-emerald-950/30 flex items-center justify-center border-2 border-white">
                <div className="w-full h-full rounded-full bg-[#183A2D] flex items-center justify-center text-white transition-colors group-hover:bg-[#122c21]">
                  <Plus size={24} strokeWidth={2.8} />
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
            className="flex flex-col items-center justify-center flex-1 py-1 text-stone-500 hover:text-[#183A2D] font-semibold relative select-none transition-colors"
          >
            <div className="relative">
              <Bell size={20} strokeWidth={1.8} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] bg-rose-500 text-white text-[8px] font-extrabold rounded-full flex items-center justify-center px-0.5 border-2 border-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 font-ui">Hộp thư</span>
          </Link>

          {/* TAB 5: TỦ ĐỒ CỦA TÔI */}
          <Link
            href="/my-closet"
            onClick={(e) => handleAuthGuarded(e, "/my-closet")}
            className="flex flex-col items-center justify-center flex-1 py-1 text-stone-500 hover:text-[#183A2D] font-semibold select-none transition-colors"
          >
            <User size={20} strokeWidth={1.8} />
            <span className="text-[10px] tracking-tight mt-0.5 font-ui">Tủ đồ</span>
          </Link>

        </nav>

        {/* MODAL TÌM KIẾM BẰNG ẢNH AI */}
        <VisualSearchModal
          isOpen={isVisualSearchOpen}
          onClose={() => setIsVisualSearchOpen(false)}
        />

      </div>
    </div>
  );
}
