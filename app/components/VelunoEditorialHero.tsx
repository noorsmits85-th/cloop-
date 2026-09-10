"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Search, Heart, ShoppingBag, 
  ChevronLeft, ChevronRight, Sparkles, ShieldCheck, Leaf, ArrowUpRight
} from "lucide-react";

interface SlideData {
  id: string;
  slideNumber: string;
  bgImage: string;
  title: string;
  subtitle: string;
  cardCategory: string;
  cardTitle: string;
  cardDesc: string;
  cardPrice: string;
  cardOriginalPrice: string;
  cardThumb: string;
  link: string;
  tag: string;
}

const SLIDES: SlideData[] = [
  {
    id: "gala-silk",
    slideNumber: "01",
    bgImage: "/editorial-hero-2.jpg",
    title: "Wardrobes That Mirror You",
    subtitle: "Trải nghiệm hơn 1.200+ thiết kế dạ hội và tiệc cưới từ các nhà mốt hàng đầu. Mặc đẹp hơn, chi tiêu thông minh hơn từ 10% giá gốc.",
    cardCategory: "Dạ Hội & Gala Night",
    cardTitle: "Đầm Lụa Emerald Satin Xẻ Tà",
    cardDesc: "Lụa satin cao cấp ôm dáng thanh lịch, hoàn hảo cho tiệc thảm đỏ.",
    cardPrice: "350.000₫",
    cardOriginalPrice: "4.800.000₫",
    cardThumb: "/1.1.jpg",
    link: "/shop?occasion=Dạ hội",
    tag: "Độc Quyền • Size S"
  },
  {
    id: "cashmere-coat",
    slideNumber: "02",
    bgImage: "/editorial-hero-1.jpg",
    title: "Timeless Luxury In Every Stitch",
    subtitle: "Dòng trang phục Cashmere & lụa tơ tằm cổ điển. Tủ đồ luân chuyển bền vững lưu giữ trọn vẹn câu chuyện du hành của từng món đồ.",
    cardCategory: "Quiet Luxury Archive",
    cardTitle: "Trench Coat Cashmere & Silk Draping",
    cardDesc: "Chất len Cashmere dệt thủ công Pháp, phom dáng quyền lực vượt thời gian.",
    cardPrice: "280.000₫",
    cardOriginalPrice: "6.500.000₫",
    cardThumb: "/vintage_coat.jpg",
    link: "/shop?occasion=Vintage",
    tag: "Kho Lưu Trữ 1998"
  },
  {
    id: "paris-tweed",
    slideNumber: "03",
    bgImage: "/editorial-hero-3.jpg",
    title: "Elegance Reborn Through The Loop",
    subtitle: "Set dạ Tweed Parisienne phối cúc vàng kim loại. Thời trang không cần mua đứt để tỏa sáng trong những ngày trọng đại.",
    cardCategory: "Tiểu Thư Parisienne",
    cardTitle: "Set Tweed Cổ Điển & Chân Váy Xếp Ly",
    cardDesc: "Phom dáng tiểu thư quý phái cho những buổi tiệc trà và sự kiện thanh lịch.",
    cardPrice: "220.000₫",
    cardOriginalPrice: "3.200.000₫",
    cardThumb: "/1.2.jpeg",
    link: "/shop?occasion=Tiệc cưới",
    tag: "Thịnh Hành • Size S/M"
  }
];

export default function VelunoEditorialHero() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  // Tự động chuyển slide sau 7 giây nếu không tương tác
  useEffect(() => {
    if (!isAutoPlay) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
    }, 7000);
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
    <section className="w-full bg-[#FAF9F5] px-3 sm:px-6 lg:px-8 pt-3 pb-8">
      <div className="max-w-[1400px] mx-auto">
        
        {/* KHUNG HERO FRAME THEO VIBE VELUNO */}
        <div className="relative w-full rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-stone-800/20 shadow-2xl bg-[#111614] min-h-[620px] lg:min-h-[680px] flex flex-col justify-between p-6 sm:p-10 lg:p-12 text-white select-none">

          {/* BACKGROUND IMAGE VỚI HIỆU ỨNG CROSS-FADE MƯỢT MÀ */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide.id}
              initial={{ opacity: 0, scale: 1.04 }}
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
                className="object-cover object-center brightness-[0.92]"
                sizes="100vw"
              />
              {/* Lớp phủ đa tầng tạo chiều sâu điện ảnh (Cinematic Shadows) */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/40 to-black/85 lg:to-black/80" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40" />
            </motion.div>
          </AnimatePresence>

          {/* TOP BAR / NAVIGATION BÊN TRONG HERO (CHUẨN VIBE VELUNO) */}
          <div className="relative z-20 flex items-center justify-between gap-4 border-b border-white/10 pb-5">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-white transition-transform group-hover:scale-105">
                <Leaf size={16} className="text-emerald-400" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-black tracking-widest text-lg leading-none text-white">
                  CLOOP
                </span>
                <span className="text-[7.5px] uppercase tracking-[0.3em] text-emerald-300 font-ui font-semibold mt-0.5">
                  Circular Fashion
                </span>
              </div>
            </Link>

            {/* Menu Links */}
            <nav className="hidden md:flex items-center gap-7 text-xs uppercase tracking-wider font-ui font-semibold text-stone-300">
              <Link href="/" className="text-white font-bold transition-colors">
                Trang Chủ
              </Link>
              <Link href="/shop?type=rent" className="hover:text-white transition-colors">
                Thuê Đồ
              </Link>
              <Link href="/shop?occasion=Tiệc cưới" className="hover:text-white transition-colors">
                Đồ Sự Kiện
              </Link>
              <Link href="/my-closet/create?mode=rent" className="hover:text-white transition-colors">
                Đăng Tủ Kiếm Tiền
              </Link>
              <Link href="/blog" className="hover:text-white transition-colors">
                Lookbook
              </Link>
            </nav>

            {/* Right Action Icons */}
            <div className="flex items-center gap-3">
              <Link
                href="/shop"
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs text-stone-200 transition-all font-ui shadow-xs"
              >
                <Search size={13} className="text-stone-300" />
                <span className="hidden sm:inline text-[11px]">Tìm kiếm tủ đồ...</span>
              </Link>

              <Link
                href="/shop?type=rent"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-stone-200 hover:text-white transition-all"
                title="Yêu thích"
              >
                <Heart size={14} />
              </Link>

              <Link
                href="/my-closet"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#183A2D] font-ui text-[11px] font-bold uppercase tracking-wider hover:bg-emerald-50 transition-all shadow-sm"
              >
                <span>Tủ Đồ</span>
                <ArrowUpRight size={13} />
              </Link>
            </div>
          </div>

          {/* MAIN HERO CONTENT ROW (CÂN BẰNG GIỮA TRÁI & PHẢI) */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end py-10 lg:py-16">
            
            {/* Cột Trái: Để trống một phần để người xem ngắm trọn vẹn visual đầm/trench coat */}
            <div className="hidden lg:flex lg:col-span-5 flex-col justify-end space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-[10.5px] font-mono uppercase tracking-wider text-emerald-300 w-fit">
                <ShieldCheck size={13} className="text-emerald-400" />
                <span>Két Ký Quỹ Escrow • Đối Soát 24h</span>
              </div>
              <p className="text-xs text-stone-300/80 max-w-xs font-light leading-relaxed">
                Từng trang phục đều được bảo chứng số hóa và khử khuẩn chuẩn spa trước khi trao tay.
              </p>
            </div>

            {/* Cột Phải: Headline lớn phong cách "Spaces That Mirror You" + Floating Glass Card */}
            <div className="lg:col-span-7 flex flex-col items-start lg:items-end text-left lg:text-right space-y-6">
              
              {/* Tiêu đề biên tập lớn (Editorial Headline) */}
              <div className="space-y-3">
                <span className="text-[10px] sm:text-xs font-ui uppercase font-bold tracking-[0.25em] text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full backdrop-blur-md inline-block">
                  CLOOP ARCHIVE 2026
                </span>

                <AnimatePresence mode="wait">
                  <motion.h1
                    key={currentSlide.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.5 }}
                    className="font-heading text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08]"
                  >
                    {currentSlide.title}
                  </motion.h1>
                </AnimatePresence>

                <p className="text-xs sm:text-sm md:text-base text-stone-200/90 font-light font-body max-w-lg lg:ml-auto leading-relaxed">
                  {currentSlide.subtitle}
                </p>
              </div>

              {/* THANH TRƯỢT CHỈ SỐ SLIDER (01 ────── 03) CHUẨN VIBE VELUNO */}
              <div className="flex items-center gap-4 py-2 font-mono text-xs text-stone-400 w-full lg:w-auto justify-start lg:justify-end">
                <span className="text-white font-bold">{currentSlide.slideNumber}</span>
                
                <div className="flex gap-1.5 items-center w-36 sm:w-48 h-1 bg-white/20 rounded-full overflow-hidden">
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
              <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between lg:justify-end gap-4 pt-2">
                
                {/* Nút mũi tên điều hướng tròn bên trái card */}
                <div className="flex items-center gap-2 order-2 sm:order-1">
                  <button
                    onClick={handlePrev}
                    className="w-10 h-10 rounded-full border border-white/20 bg-black/40 hover:bg-white hover:text-black text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
                    aria-label="Slide trước"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={handleNext}
                    className="w-10 h-10 rounded-full border border-white/20 bg-black/40 hover:bg-white hover:text-black text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
                    aria-label="Slide kế tiếp"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Floating Glassmorphic Outfit Card */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4 }}
                    className="order-1 sm:order-2 bg-black/55 backdrop-blur-xl border border-white/20 rounded-3xl p-3.5 sm:p-4 shadow-2xl flex items-center gap-3.5 sm:gap-4 max-w-[420px] text-left hover:border-white/40 transition-colors"
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

                    {/* Content & Action */}
                    <div className="flex-1 space-y-1 min-w-0">
                      <span className="text-[9px] font-ui uppercase font-bold tracking-wider text-emerald-300 block truncate">
                        {currentSlide.cardCategory} • {currentSlide.tag}
                      </span>
                      <h4 className="text-xs sm:text-sm font-heading font-bold text-white leading-tight truncate">
                        {currentSlide.cardTitle}
                      </h4>
                      <p className="text-[10.5px] text-stone-300/80 line-clamp-1 font-light">
                        {currentSlide.cardDesc}
                      </p>

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
                          className="px-3 py-1.5 rounded-full bg-white hover:bg-emerald-400 text-stone-900 hover:text-stone-950 font-ui text-[10.5px] font-extrabold uppercase tracking-wider transition-all duration-200 shadow-md cursor-pointer shrink-0"
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

          {/* FOOTER BAR NHỎ TRONG HERO (CAM KẾT 3 TRỤ CỘT TUẦN HOÀN) */}
          <div className="relative z-10 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-ui text-stone-300/90">
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

        </div>

      </div>
    </section>
  );
}
