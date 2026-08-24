"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Camera, Search, Sparkles } from "lucide-react";
import VisualSearchModal from "@/app/components/VisualSearchModal";

// 20 bức ảnh thời trang sắc nét lấp kín 100% không gian nền xung quanh
const DENSE_FASHION_COLUMNS = [
  // Cột 1
  [
    { id: "c1-1", img: "/evening_dress.jpg", tag: "Dạ Hội", title: "Váy Lụa Sequin", price: "380k/ngày", aspect: "aspect-[3/4]" },
    { id: "c1-2", img: "/1.2.jpeg", tag: "Thanh Lịch", title: "Set Dạ Tweed", price: "180k/ngày", aspect: "aspect-[4/5]" },
    { id: "c1-3", img: "/step1_phone.jpg", tag: "Trải Nghiệm", title: "Đặt Thuê Nhanh", price: "Tiện Lợi", aspect: "aspect-square" },
    { id: "c1-4", img: "/vintage_coat.jpg", tag: "Hoài Cổ", title: "Blazer Dạ 1998", price: "190k/ngày", aspect: "aspect-[3/4]" },
  ],
  // Cột 2
  [
    { id: "c2-1", img: "/1.1.jpg", tag: "Prom Gala", title: "Đầm Lụa Satin", price: "350k/ngày", aspect: "aspect-[3/4]" },
    { id: "c2-2", img: "/macro_fabric.jpg", tag: "Chất Liệu", title: "Sợi Linen Tự Nhiên", price: "Eco Silk", aspect: "aspect-square" },
    { id: "c2-3", img: "/2.1.jpg", tag: "Tối Giản", title: "Đầm Cúp Ngực", price: "220k/ngày", aspect: "aspect-[4/5]" },
    { id: "c2-4", img: "/hero_warm.jpg", tag: "Ấm Áp", title: "Sắc Nắng Mùa Thu", price: "Outfit Thu", aspect: "aspect-[3/4]" },
  ],
  // Cột 3
  [
    { id: "c3-1", img: "/anhbia.png", tag: "Di Sản", title: "Áo Dài Tơ Tằm", price: "280k/ngày", aspect: "aspect-[3/4]" },
    { id: "c3-2", img: "/step2_bag.jpg", tag: "Bao Bì Xanh", title: "Đóng Gói Tuần Hoàn", price: "Chuẩn Xanh", aspect: "aspect-[4/5]" },
    { id: "c3-3", img: "/1.2.jpg", tag: "Streetwear", title: "Áo Khoác Da Biker", price: "250k/ngày", aspect: "aspect-[3/4]" },
    { id: "c3-4", img: "/2.2.jpg", tag: "Dạ Tiệc", title: "Đầm Xòe Công Chúa", price: "320k/ngày", aspect: "aspect-[4/5]" },
  ],
  // Cột 4
  [
    { id: "c4-1", img: "/hero_group.jpg", tag: "Tái Sinh", title: "Set Đồ Upcycled", price: "160k/ngày", aspect: "aspect-[16/10]" },
    { id: "c4-2", img: "/1.1 (1).jpg", tag: "Gala Night", title: "Đầm Xẻ Tà Sang Trọng", price: "350k/ngày", aspect: "aspect-[3/4]" },
    { id: "c4-3", img: "/step3_party.jpg", tag: "Tỏa Sáng", title: "Khoảnh Khắc Đêm Tiệc", price: "Kỷ Niệm", aspect: "aspect-[4/5]" },
    { id: "c4-4", img: "/kinhgucci.webp", tag: "Phụ Kiện", title: "Kính Mắt Cat-Eye", price: "Pass 300k", aspect: "aspect-square" },
  ],
  // Cột 5
  [
    { id: "c5-1", img: "/2.1 (1).jpg", tag: "Cocktail", title: "Đầm Tiệc Trắng", price: "220k/ngày", aspect: "aspect-[3/4]" },
    { id: "c5-2", img: "/bootvanlentino.webp", tag: "Phụ Kiện", title: "Boots Da Thật", price: "Pass 1.2Tr", aspect: "aspect-[4/5]" },
    { id: "c5-3", img: "/vintage_coat.jpg", tag: "Di Sản", title: "Túi Xách Da Archive", price: "Pass 2.5Tr", aspect: "aspect-[3/4]" },
    { id: "c5-4", img: "/evening_dress.jpg", tag: "Prom", title: "Váy Sequin Lấp Lánh", price: "380k/ngày", aspect: "aspect-square" },
  ]
];

export default function GoogleFlowFashionHero() {
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);

  return (
    <section className="relative w-full min-h-[580px] sm:min-h-[640px] md:min-h-[700px] lg:min-h-[750px] bg-[#F7F5EE] overflow-hidden flex items-center justify-center select-none border-b border-stone-200/80">
      
      {/* 🖼️ FULL-BLEED DENSE LIVING PHOTO WALL: 5 Cột Ảnh Đan Xen Trôi Nhẹ Lấp Kín 100% Không Gian */}
      <div className="absolute inset-0 w-full h-full overflow-hidden grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 p-2 sm:p-3 opacity-75 md:opacity-85 pointer-events-auto">
        {DENSE_FASHION_COLUMNS.map((column, colIdx) => {
          const isOdd = colIdx % 2 !== 0;
          return (
            <motion.div
              key={colIdx}
              animate={{
                y: isOdd ? [-25, 25, -25] : [25, -25, 25],
              }}
              transition={{
                duration: 12 + colIdx * 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className={`flex flex-col gap-3 md:gap-4 ${colIdx === 4 ? 'hidden lg:flex' : ''} ${colIdx === 3 ? 'hidden sm:flex' : ''}`}
            >
              {column.map((card) => (
                <div
                  key={card.id}
                  className={`group relative w-full ${card.aspect} rounded-2xl overflow-hidden bg-white border border-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-xl transition-all duration-500 hover:scale-105 cursor-pointer`}
                >
                  <Image
                    src={card.img}
                    alt={card.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110 brightness-100 group-hover:brightness-105"
                    unoptimized
                  />
                  {/* Subtle Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />

                  {/* Tag Pill */}
                  <div className="absolute top-2 left-2 z-10">
                    <span className="text-[7.5px] uppercase font-bold tracking-wider bg-white/95 text-[#183A2D] px-2 py-0.5 rounded-full shadow-2xs border border-stone-200/50 font-ui">
                      {card.tag}
                    </span>
                  </div>

                  {/* Bottom Text */}
                  <div className="absolute bottom-0 left-0 w-full p-2 text-white transform translate-y-1 group-hover:translate-y-0 transition-transform">
                    <p className="text-[10px] font-heading font-bold leading-tight line-clamp-1">
                      {card.title}
                    </p>
                    <p className="text-[9px] text-[#A3E39F] font-mono font-semibold">
                      {card.price}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          );
        })}
      </div>

      {/* 🌟 FROSTED GLASS EDITORIAL CENTERPIECE: Tôn chữ cực kỳ sắc nét và nổi bật */}
      <div className="relative z-40 max-w-2xl mx-auto px-4 sm:px-6 text-center pointer-events-auto my-auto">
        <div className="bg-white/92 backdrop-blur-2xl border-2 border-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-[0_20px_60px_rgba(10,37,23,0.18)] flex flex-col items-center">
          
          {/* Top Matcha Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#E5EFE2] border border-[#C5DAC2] text-[#2A4B2E] text-[10.5px] font-bold uppercase tracking-widest mb-3 shadow-2xs font-ui">
            <span className="w-2 h-2 rounded-full bg-[#2A4B2E] animate-pulse"></span>
            Tủ Đồ Tuần Hoàn Sinh Thái 2026
          </div>

          {/* Brand Name */}
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#0A2517] tracking-tight leading-none mb-3 drop-shadow-xs">
            CLOOP
          </h1>

          {/* Poetic & High-Fashion Tagline */}
          <p className="font-body text-xs sm:text-sm md:text-[15px] text-stone-800 font-medium leading-relaxed max-w-lg mx-auto mb-6">
            Mở khóa tủ đồ vô tận từ cộng đồng sành phong cách. Tự do biến hóa diện mạo mỗi ngày, tiết kiệm 90% chi phí và lan tỏa lối sống xanh.
          </p>

          {/* Action Buttons Row */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* Primary Dark Emerald Button */}
            <Link
              href="/shop"
              className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#0A2517] hover:bg-[#183A2D] text-white font-heading font-extrabold text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 shadow-md hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group font-ui"
            >
              Khám Phá Tủ Đồ
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>

            {/* AI Visual Search Button */}
            <button
              type="button"
              onClick={() => setIsVisualSearchOpen(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#FAF7F0] hover:bg-white text-[#183A2D] border border-stone-300 font-heading font-bold text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 shadow-2xs hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group font-ui"
            >
              <Camera size={15} className="text-[#37503F] group-hover:scale-110 transition-transform" />
              <span>Tìm Bằng Ảnh AI</span>
            </button>
          </div>

          {/* Micro Search Bar */}
          <div className="mt-5 w-full max-w-md">
            <div className="relative flex items-center bg-stone-50 border border-stone-300/90 rounded-full px-3 py-1.5 shadow-inner focus-within:ring-2 focus-within:ring-[#37503F] transition-all">
              <Search size={14} className="text-stone-400 ml-1 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Tìm Đầm dạ hội, Blazer linen, Áo dài gấm..."
                className="flex-1 bg-transparent border-none outline-none font-ui text-xs text-[#0A2517] placeholder:text-stone-400 font-medium min-w-0"
              />
              <Link
                href="/shop"
                className="px-3.5 py-1 bg-[#37503F] hover:bg-[#28422A] text-white rounded-full text-[10px] font-bold uppercase tracking-wider transition-all shrink-0 font-ui"
              >
                Tìm
              </Link>
            </div>
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
