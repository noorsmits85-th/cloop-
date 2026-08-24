"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Camera, Search } from "lucide-react";
import VisualSearchModal from "@/app/components/VisualSearchModal";

// 24 bức ảnh thời trang tràn ngập 100% toàn bộ khung hình không một khoảng trống
const FULL_MOSAIC_COLUMNS = [
  // Cột 1: Trôi lên
  [
    { id: "m1-1", img: "/evening_dress.jpg", tag: "Dạ Hội", title: "Váy Lụa Sequin", price: "380k/ngày", aspect: "aspect-[3/4]" },
    { id: "m1-2", img: "/1.2.jpeg", tag: "Thanh Lịch", title: "Set Dạ Tweed", price: "180k/ngày", aspect: "aspect-[4/5]" },
    { id: "m1-3", img: "/step1_phone.jpg", tag: "Trải Nghiệm", title: "Đặt Thuê Nhanh", price: "60 Giây", aspect: "aspect-square" },
    { id: "m1-4", img: "/vintage_coat.jpg", tag: "Hoài Cổ", title: "Blazer Dạ 1998", price: "190k/ngày", aspect: "aspect-[3/4]" },
  ],
  // Cột 2: Trôi xuống
  [
    { id: "m2-1", img: "/1.1.jpg", tag: "Prom Gala", title: "Đầm Lụa Satin", price: "350k/ngày", aspect: "aspect-[3/4]" },
    { id: "m2-2", img: "/macro_fabric.jpg", tag: "Chất Liệu", title: "Sợi Linen Tự Nhiên", price: "Eco Silk", aspect: "aspect-square" },
    { id: "m2-3", img: "/2.1.jpg", tag: "Tối Giản", title: "Đầm Cúp Ngực", price: "220k/ngày", aspect: "aspect-[4/5]" },
    { id: "m2-4", img: "/hero_warm.jpg", tag: "Ấm Áp", title: "Sắc Nắng Mùa Thu", price: "Outfit Thu", aspect: "aspect-[3/4]" },
  ],
  // Cột 3: Trôi lên (ở giữa sau chữ)
  [
    { id: "m3-1", img: "/anhbia.png", tag: "Di Sản", title: "Áo Dài Tơ Tằm", price: "280k/ngày", aspect: "aspect-[3/4]" },
    { id: "m3-2", img: "/step2_bag.jpg", tag: "Bao Bì", title: "Túi Đóng Gói Xanh", price: "Tuần Hoàn", aspect: "aspect-[4/5]" },
    { id: "m3-3", img: "/1.2.jpg", tag: "Streetwear", title: "Áo Khoác Da Biker", price: "250k/ngày", aspect: "aspect-[3/4]" },
    { id: "m3-4", img: "/2.2.jpg", tag: "Dạ Tiệc", title: "Đầm Xòe Công Chúa", price: "320k/ngày", aspect: "aspect-[4/5]" },
  ],
  // Cột 4: Trôi xuống (ở giữa sau chữ)
  [
    { id: "m4-1", img: "/hero_group.jpg", tag: "Tái Sinh", title: "Set Đồ Upcycled", price: "160k/ngày", aspect: "aspect-[16/10]" },
    { id: "m4-2", img: "/1.1 (1).jpg", tag: "Gala Night", title: "Đầm Xẻ Tà Sang Trọng", price: "350k/ngày", aspect: "aspect-[3/4]" },
    { id: "m4-3", img: "/step3_party.jpg", tag: "Tỏa Sáng", title: "Khoảnh Khắc Đêm Tiệc", price: "Kỷ Niệm", aspect: "aspect-[4/5]" },
    { id: "m4-4", img: "/kinhgucci.webp", tag: "Phụ Kiện", title: "Kính Mắt Cat-Eye", price: "Pass 300k", aspect: "aspect-square" },
  ],
  // Cột 5: Trôi lên
  [
    { id: "m5-1", img: "/2.1 (1).jpg", tag: "Cocktail", title: "Đầm Tiệc Trắng", price: "220k/ngày", aspect: "aspect-[3/4]" },
    { id: "m5-2", img: "/bootvanlentino.webp", tag: "Phụ Kiện", title: "Boots Da Thật", price: "Pass 1.2Tr", aspect: "aspect-[4/5]" },
    { id: "m5-3", img: "/vintage_coat.jpg", tag: "Di Sản", title: "Túi Xách Da Archive", price: "Pass 2.5Tr", aspect: "aspect-[3/4]" },
    { id: "m5-4", img: "/evening_dress.jpg", tag: "Prom", title: "Váy Sequin Lấp Lánh", price: "380k/ngày", aspect: "aspect-square" },
  ],
  // Cột 6: Trôi xuống
  [
    { id: "m6-1", img: "/1.3.jpeg", tag: "Cá Tính", title: "Blazer Oversized", price: "210k/ngày", aspect: "aspect-[3/4]" },
    { id: "m6-2", img: "/2.2 (1).jpg", tag: "Thanh Lịch", title: "Đầm Dạ Hội Ren", price: "340k/ngày", aspect: "aspect-[4/5]" },
    { id: "m6-3", img: "/3.1.jpg", tag: "Tối Giản", title: "Set Váy Satin", price: "260k/ngày", aspect: "aspect-[3/4]" },
    { id: "m6-4", img: "/hero_warm.jpg", tag: "Mùa Thu", title: "Áo Khoác Trench Coat", price: "230k/ngày", aspect: "aspect-square" },
  ]
];

export default function GoogleFlowFashionHero() {
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);

  return (
    <section className="relative w-full min-h-[600px] sm:min-h-[660px] md:min-h-[720px] lg:min-h-[780px] bg-[#07190F] overflow-hidden flex items-center justify-center select-none border-b border-emerald-950/80">
      
      {/* 🖼️ FULL-BLEED DENSE LIVING PHOTO WALL: Tràn ngập 100% diện tích không gian */}
      <div className="absolute inset-0 w-full h-full overflow-hidden grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 md:gap-3 p-2 sm:p-3 pointer-events-auto">
        {FULL_MOSAIC_COLUMNS.map((column, colIdx) => {
          const isOdd = colIdx % 2 !== 0;
          return (
            <motion.div
              key={colIdx}
              animate={{
                y: isOdd ? [-28, 28, -28] : [28, -28, 28],
              }}
              transition={{
                duration: 14 + colIdx * 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className={`flex flex-col gap-2.5 md:gap-3 ${colIdx === 5 ? 'hidden lg:flex' : ''} ${colIdx === 4 ? 'hidden md:flex' : ''}`}
            >
              {column.map((card) => (
                <Link
                  key={card.id}
                  href="/shop"
                  className={`group relative w-full ${card.aspect} rounded-2xl overflow-hidden bg-stone-900 border border-white/20 hover:border-[#A3E39F] shadow-lg hover:shadow-[0_0_35px_rgba(163,227,159,0.85)] hover:ring-2 hover:ring-[#A3E39F]/80 transition-all duration-500 hover:scale-110 hover:z-50 cursor-pointer block`}
                >
                  {/* Glowing & Brightening Image */}
                  <Image
                    src={card.img}
                    alt={card.title}
                    fill
                    className="object-cover transition-all duration-700 group-hover:scale-115 brightness-105 group-hover:brightness-130 group-hover:contrast-105 opacity-90 group-hover:opacity-100"
                    unoptimized
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent pointer-events-none group-hover:opacity-75 transition-opacity" />

                  {/* Glowing Tag Pill */}
                  <div className="absolute top-2 left-2 z-10">
                    <span className="text-[7.5px] uppercase font-bold tracking-wider bg-black/70 group-hover:bg-[#A3E39F] text-[#A3E39F] group-hover:text-[#07190F] group-hover:shadow-[0_0_15px_rgba(163,227,159,0.9)] px-2.5 py-0.5 rounded-full border border-white/15 group-hover:border-[#A3E39F] font-ui shadow-xs transition-all duration-300">
                      {card.tag}
                    </span>
                  </div>

                  {/* Bottom Glowing Text Info */}
                  <div className="absolute bottom-0 left-0 w-full p-2 text-white transform translate-y-0.5 group-hover:translate-y-0 transition-transform">
                    <p className="text-[10px] sm:text-[11px] font-heading font-bold leading-tight line-clamp-1 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.9)] transition-colors">
                      {card.title}
                    </p>
                    <p className="text-[9px] sm:text-[9.5px] text-[#A3E39F] group-hover:text-[#C5FFC2] font-mono font-bold group-hover:drop-shadow-[0_0_8px_rgba(163,227,159,0.9)] transition-colors">
                      {card.price}
                    </p>
                  </div>
                </Link>
              ))}
            </motion.div>
          );
        })}
      </div>

      {/* 🍵 MATCHA GLOW VIGNETTE OVERLAY: Lớp phủ matcha dịu dàng giúp ảnh nổi mà chữ vẫn cực kỳ rõ */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(7,25,15,0.72)_0%,_rgba(10,34,20,0.65)_45%,_rgba(7,25,15,0.88)_100%)] pointer-events-none z-20" />

      {/* 🌟 CENTERPIECE CONTENT: Đặt trực tiếp nổi bật giữa biển ảnh thời trang */}
      <div className="relative z-30 max-w-3xl mx-auto px-4 text-center flex flex-col items-center justify-center pointer-events-auto my-auto">
        
        {/* Top Matcha Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-[#A3E39F]/40 text-[#A3E39F] text-[10.5px] font-bold uppercase tracking-widest mb-3.5 shadow-lg font-ui">
          <span className="w-2 h-2 rounded-full bg-[#A3E39F] animate-pulse"></span>
          Tủ Đồ Tuần Hoàn Sinh Thái 2026
        </div>

        {/* Big Bold White Title */}
        <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-extrabold text-white tracking-tight leading-none mb-3.5 drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
          CLOOP
        </h1>

        {/* Poetic & High-Fashion Tagline */}
        <p className="font-body text-xs sm:text-sm md:text-[15px] text-stone-100 font-normal leading-relaxed max-w-lg mx-auto mb-7 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
          Mở khóa tủ đồ vô tận từ cộng đồng sành phong cách. Tự do biến hóa diện mạo mỗi ngày, tiết kiệm 90% chi phí và lan tỏa lối sống xanh.
        </p>

        {/* Action Buttons Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
          {/* Primary Giant White Pill Button */}
          <Link
            href="/shop"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white text-[#0A2517] hover:bg-[#FAF7F0] font-heading font-extrabold text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 shadow-[0_6px_25px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group font-ui"
          >
            Khám Phá Tủ Đồ
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* AI Visual Search Button */}
          <button
            type="button"
            onClick={() => setIsVisualSearchOpen(true)}
            className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white/20 hover:bg-white/30 text-white border border-white/35 backdrop-blur-md font-heading font-bold text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 shadow-md hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group font-ui"
          >
            <Camera size={15} className="text-[#A3E39F] group-hover:scale-110 transition-transform" />
            <span>Tìm Bằng Ảnh AI</span>
          </button>
        </div>

        {/* Micro Search Bar */}
        <div className="mt-5 w-full max-w-md">
          <div className="relative flex items-center bg-black/50 backdrop-blur-md border border-white/25 rounded-full px-3.5 py-1.5 shadow-inner focus-within:border-white/60 transition-all">
            <Search size={14} className="text-stone-300 ml-1 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Tìm Đầm dạ hội, Blazer linen, Áo dài gấm..."
              className="flex-1 bg-transparent border-none outline-none font-ui text-xs text-white placeholder:text-stone-300 font-medium min-w-0"
            />
            <Link
              href="/shop"
              className="px-3.5 py-1 bg-white/25 hover:bg-white text-white hover:text-black rounded-full text-[10px] font-bold uppercase tracking-wider transition-all shrink-0 font-ui"
            >
              Tìm
            </Link>
          </div>
        </div>

      </div>

      {/* MODAL TÌM KIẾM HÌNH ẢNH LOOKBOOK BẰNG AI */}
      <VisualSearchModal 
        isOpen={isVisualSearchOpen} 
        onClose={() => setIsVisualSearchOpen(false)} 
      />

    </section>
  );
}
