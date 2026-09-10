"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, ChevronRight, ShieldCheck, Sparkles, ArrowRight, Leaf
} from "lucide-react";

interface SlideData {
  id: string;
  slideNumber: string;
  bgImage: string;
  badge: string;
  title: string;
  subtitle: string;
  cardCategory: string;
  cardTitle: string;
  cardPrice: string;
  cardOriginalPrice: string;
  cardThumb: string;
  link: string;
}

const SLIDES: SlideData[] = [
  {
    id: "cashmere-coat",
    slideNumber: "01",
    bgImage: "/editorial-hero-1.jpg",
    badge: "BỘ SƯU TẬP THE ARCHIVE 2026",
    title: "Wardrobes That Mirror You",
    subtitle: "Khám phá hơn 1.200+ thiết kế dạ hội và hàng hiệu được luân chuyển từ những tủ đồ phong cách nhất Việt Nam.",
    cardCategory: "Quiet Luxury Archive",
    cardTitle: "Trench Coat Cashmere & Silk Draping",
    cardPrice: "280.000₫",
    cardOriginalPrice: "6.500.000₫",
    cardThumb: "/vintage_coat.jpg",
    link: "/shop?occasion=Vintage"
  },
  {
    id: "gala-emerald",
    slideNumber: "02",
    bgImage: "/editorial-hero-2-left.jpg",
    badge: "DẠ HỘI & GALA NIGHT",
    title: "Spaces That Mirror You",
    subtitle: "Tỏa sáng trọn vẹn trong từng đêm tiệc trọng đại với các thiết kế lụa satin ôm dáng, chỉ từ 10% giá gốc.",
    cardCategory: "Dạ Hội & Tiệc Cưới",
    cardTitle: "Đầm Lụa Emerald Satin Xẻ Tà",
    cardPrice: "350.000₫",
    cardOriginalPrice: "4.800.000₫",
    cardThumb: "/1.1.jpg",
    link: "/shop?occasion=Dạ hội"
  },
  {
    id: "paris-tweed",
    slideNumber: "03",
    bgImage: "/editorial-hero-3-left.jpg",
    badge: "PHONG CÁCH TIỂU THƯ PARISIENNE",
    title: "Elegance Reborn In A Loop",
    subtitle: "Set dạ Tweed phối cúc kim loại sang trọng. Thời trang tuần hoàn giúp bạn liên tục làm mới phong cách.",
    cardCategory: "Thanh Lịch Hẹn Hò",
    cardTitle: "Set Tweed Cổ Điển & Chân Váy Xếp Ly",
    cardPrice: "220.000₫",
    cardOriginalPrice: "3.200.000₫",
    cardThumb: "/1.2.jpeg",
    link: "/shop?occasion=Tiệc cưới"
  }
];

export default function VelunoEditorialHero() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  // Tự động chuyển slide sau 6.5 giây
  useEffect(() => {
    if (!isAutoPlay) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [isAutoPlay]);

  const currentSlide = SLIDES[currentIndex];

  const handleNext = () => {
    setIsAutoPlay(false);
    setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
  };

  const handlePrev = () => {
    setIsAutoPlay(false);
    setCurrentIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  return (
    <section className="relative w-full min-h-[92vh] lg:min-h-screen overflow-hidden bg-[#0A100D] flex flex-col justify-between pt-[100px] sm:pt-[115px] pb-8 sm:pb-12 px-6 sm:px-12 lg:px-20 text-white select-none border-b border-stone-800/40">

      {/* BACKGROUND IMAGE TRÀN 100% DIỆN TÍCH MÀN HÌNH (FULL BLEED) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide.id}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 z-0"
        >
          <Image
            src={currentSlide.bgImage}
            alt={currentSlide.title}
            fill
            priority
            className="object-cover object-left sm:object-center brightness-[0.92]"
            sizes="100vw"
          />
          {/* Lớp phủ Gradient điện ảnh: Giữ sáng cho chủ thể bên trái, phủ tối mượt mà bên phải để đọc chữ */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/40 to-black/85 lg:from-transparent lg:via-black/50 lg:to-black/90" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40" />
        </motion.div>
      </AnimatePresence>

      {/* TOP ACCENT BADGE */}
      <div className="relative z-10 flex items-center justify-between max-w-[1500px] mx-auto w-full">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-[10.5px] sm:text-xs font-mono uppercase tracking-widest text-emerald-300 shadow-sm">
          <Sparkles size={13} className="text-emerald-400" />
          <span>{currentSlide.badge}</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-stone-300/80 bg-black/30 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Két Ký Quỹ Escrow • Đối Soát 24h</span>
        </div>
      </div>

      {/* NỘI DUNG CHÍNH: BỐ CỤC 2 CỘT TỰ NHIÊN RỘNG RÃI */}
      <div className="relative z-10 max-w-[1500px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-end my-auto py-6">
        
        {/* Cột trái: Khoảng trống rộng mở để tôn vinh bộ sưu tập thời trang bên trái */}
        <div className="hidden lg:block lg:col-span-5">
          {/* Để trống cho tác phẩm nghệ thuật thời trang bên trái tỏa sáng */}
        </div>

        {/* Cột phải: Headline chữ lớn phong cách Veluno + Thanh trượt + Card thủy tinh mờ */}
        <div className="lg:col-span-7 flex flex-col items-start lg:items-end text-left lg:text-right space-y-5">
          
          {/* Tiêu đề biên tập lớn (Editorial Headline) */}
          <div className="space-y-3 max-w-xl">
            <span className="text-[10px] sm:text-xs font-ui uppercase font-bold tracking-[0.25em] text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full backdrop-blur-md inline-block">
              CLOOP LUXURY ARCHIVE
            </span>

            <AnimatePresence mode="wait">
              <motion.h1
                key={currentSlide.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="font-heading text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08]"
              >
                {currentSlide.title}
              </motion.h1>
            </AnimatePresence>

            <p className="text-xs sm:text-sm md:text-base text-stone-200/90 font-light font-body leading-relaxed max-w-md lg:ml-auto">
              {currentSlide.subtitle}
            </p>
          </div>

          {/* THANH TRƯỢT CHỈ SỐ SLIDER (01 ────── 03) */}
          <div className="flex items-center gap-3.5 py-1.5 font-mono text-xs text-stone-400 w-full lg:w-auto justify-start lg:justify-end">
            <span className="text-white font-bold">{currentSlide.slideNumber}</span>
            
            <div className="flex gap-1.5 items-center w-32 sm:w-44 h-1 bg-white/20 rounded-full overflow-hidden">
              {SLIDES.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setIsAutoPlay(false);
                    setCurrentIndex(idx);
                  }}
                  className={`h-full flex-1 transition-all duration-500 cursor-pointer ${
                    idx === currentIndex ? "bg-white" : "bg-transparent hover:bg-white/40"
                  }`}
                  title={`Chuyển tới slide ${s.slideNumber}`}
                />
              ))}
            </div>

            <span>0{SLIDES.length}</span>
          </div>

          {/* CARD PREVIEW THỦY TINH MỜ (FROSTED GLASS PREVIEW CARD) */}
          <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between lg:justify-end gap-3.5 pt-1">
            
            {/* Nút điều hướng mũi tên tròn bên trái */}
            <div className="flex items-center gap-2.5 order-2 sm:order-1">
              <button
                onClick={handlePrev}
                className="w-10 h-10 rounded-full border border-white/20 bg-black/45 hover:bg-white hover:text-black text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
                aria-label="Slide trước"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNext}
                className="w-10 h-10 rounded-full border border-white/20 bg-black/45 hover:bg-white hover:text-black text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
                aria-label="Slide kế tiếp"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Floating Glassmorphic Outfit Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide.id}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.35 }}
                className="order-1 sm:order-2 bg-black/60 backdrop-blur-xl border border-white/20 rounded-3xl p-3.5 sm:p-4 shadow-2xl flex items-center gap-3.5 max-w-[420px] text-left hover:border-white/40 transition-colors"
              >
                {/* Thumbnail Image */}
                <div className="relative w-16 sm:w-20 aspect-[3/4] rounded-2xl overflow-hidden shrink-0 border border-white/20 shadow-md">
                  <Image
                    src={currentSlide.cardThumb}
                    alt={currentSlide.cardTitle}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>

                {/* Content & Button */}
                <div className="flex-1 space-y-1 min-w-0">
                  <span className="text-[9.5px] font-ui uppercase font-bold tracking-wider text-emerald-300 block truncate">
                    {currentSlide.cardCategory}
                  </span>
                  <h4 className="text-xs sm:text-sm font-heading font-bold text-white leading-tight truncate">
                    {currentSlide.cardTitle}
                  </h4>

                  <div className="flex items-center justify-between pt-1.5">
                    <div>
                      <span className="text-sm font-black font-mono text-emerald-400">
                        {currentSlide.cardPrice}
                      </span>
                      <span className="text-[9.5px] text-stone-400 line-through ml-1.5 font-mono">
                        {currentSlide.cardOriginalPrice}
                      </span>
                    </div>

                    <Link
                      href={currentSlide.link}
                      className="px-3.5 py-1.5 rounded-full bg-white hover:bg-emerald-400 text-stone-900 hover:text-stone-950 font-ui text-[10.5px] font-extrabold uppercase tracking-wider transition-all duration-200 shadow-md cursor-pointer shrink-0"
                    >
                      Thuê Ngay
                    </Link>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

          </div>

        </div>

      </div>

      {/* FOOTER BAR DƯỚI ĐÁY HERO: 4 CAM KẾT TUẦN HOÀN TRÀN MÀN HÌNH */}
      <div className="relative z-10 max-w-[1500px] mx-auto w-full pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-ui text-stone-300/90">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span>100% Đồ Chính Hãng Đã Kiểm Định</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>Két Escrow Hoàn Cọc Tức Thì</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>Giao Nhận Hỏa Tốc 2H Nội Thành</span>
        </div>
        <div className="flex items-center gap-2 justify-start sm:justify-end text-emerald-300 font-bold font-mono">
          <span>Hơn 4.2 Tấn CO₂ Đã Giảm Thiểu</span>
        </div>
      </div>

    </section>
  );
}
