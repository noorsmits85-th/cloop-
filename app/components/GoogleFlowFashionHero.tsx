"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Camera, Search } from "lucide-react";
import VisualSearchModal from "@/app/components/VisualSearchModal";

interface FashionTile {
  id: string;
  image: string;
  tag: string;
  title: string;
  price: string;
  className: string;
  duration: number;
  delay: number;
}

// 16 thẻ ảnh thời trang sáng nét, bố trí dày đặc bao quanh tâm điểm
const DENSE_FASHION_TILES: FashionTile[] = [
  // Hàng trên cùng (Top Row)
  {
    id: "tile-1",
    image: "/evening_dress.jpg",
    tag: "Dạ Hội",
    title: "Váy Lụa Sequin",
    price: "380k/ngày",
    className: "w-32 sm:w-40 md:w-48 aspect-[3/4] -top-5 left-[2%] md:left-[5%]",
    duration: 6,
    delay: 0,
  },
  {
    id: "tile-2",
    image: "/1.2.jpeg",
    tag: "Thanh Lịch",
    title: "Set Dạ Tweed Paris",
    price: "180k/ngày",
    className: "w-36 sm:w-44 md:w-52 aspect-[4/3] -top-7 left-[24%] md:left-[26%]",
    duration: 7.2,
    delay: 0.4,
  },
  {
    id: "tile-3",
    image: "/macro_fabric.jpg",
    tag: "Chất Liệu",
    title: "Sợi Linen Tự Nhiên",
    price: "Eco Silk",
    className: "w-28 sm:w-36 md:w-44 aspect-square -top-4 right-[24%] md:right-[26%]",
    duration: 6.5,
    delay: 1,
  },
  {
    id: "tile-4",
    image: "/anhbia.png",
    tag: "Di Sản",
    title: "Áo Dài Tơ Tằm",
    price: "280k/ngày",
    className: "w-32 sm:w-40 md:w-48 aspect-[3/4] -top-5 right-[2%] md:right-[5%]",
    duration: 8,
    delay: 0.2,
  },

  // Cánh trái (Left Flank)
  {
    id: "tile-5",
    image: "/1.1.jpg",
    tag: "Prom Gala",
    title: "Đầm Satin Đỏ Rượu",
    price: "350k/ngày",
    className: "w-36 sm:w-44 md:w-52 aspect-[3/4] top-[24%] -left-3 md:left-[2%]",
    duration: 7.5,
    delay: 0.8,
  },
  {
    id: "tile-6",
    image: "/step1_phone.jpg",
    tag: "Trải Nghiệm",
    title: "Lướt Đặt Thuê",
    price: "Nhanh 60s",
    className: "w-28 sm:w-36 md:w-42 aspect-square top-[52%] left-[1%] md:left-[4%]",
    duration: 6.2,
    delay: 0.5,
  },

  // Cánh phải (Right Flank)
  {
    id: "tile-7",
    image: "/2.1.jpg",
    tag: "Tối Giản",
    title: "Đầm Cúp Ngực",
    price: "220k/ngày",
    className: "w-36 sm:w-44 md:w-52 aspect-[3/4] top-[24%] -right-3 md:right-[2%]",
    duration: 6.8,
    delay: 0.3,
  },
  {
    id: "tile-8",
    image: "/hero_warm.jpg",
    tag: "Ấm Áp",
    title: "Sắc Nắng Mùa Thu",
    price: "Outfit Thu",
    className: "w-28 sm:w-36 md:w-42 aspect-square top-[52%] right-[1%] md:right-[4%]",
    duration: 7.8,
    delay: 1.1,
  },

  // Hàng dưới cùng (Bottom Row)
  {
    id: "tile-9",
    image: "/vintage_coat.jpg",
    tag: "Hoài Cổ",
    title: "Blazer Dạ 1998",
    price: "190k/ngày",
    className: "w-32 sm:w-40 md:w-48 aspect-[3/4] -bottom-5 left-[3%] md:left-[6%]",
    duration: 7.2,
    delay: 0.6,
  },
  {
    id: "tile-10",
    image: "/hero_group.jpg",
    tag: "Tái Sinh",
    title: "Set Đồ Upcycled",
    price: "160k/ngày",
    className: "w-40 sm:w-48 md:w-56 aspect-[16/10] -bottom-7 left-[24%] md:left-[25%]",
    duration: 8.5,
    delay: 1.2,
  },
  {
    id: "tile-11",
    image: "/1.2.jpg",
    tag: "Streetwear",
    title: "Áo Khoác Da Biker",
    price: "250k/ngày",
    className: "w-32 sm:w-40 md:w-48 aspect-[3/4] -bottom-5 right-[24%] md:right-[25%]",
    duration: 6.4,
    delay: 0.4,
  },
  {
    id: "tile-12",
    image: "/step3_party.jpg",
    tag: "Khoảnh Khắc",
    title: "Tiệc Đêm Rực Rỡ",
    price: "Kỷ Niệm",
    className: "w-32 sm:w-36 md:w-44 aspect-square -bottom-4 right-[3%] md:right-[5%]",
    duration: 7.6,
    delay: 0.9,
  },

  // Thẻ phụ góc chéo (Diagonal Corners)
  {
    id: "tile-13",
    image: "/step2_bag.jpg",
    tag: "Đóng Gói",
    title: "Túi Tuần Hoàn",
    price: "Bảo Vệ Đồ",
    className: "hidden xl:block w-36 aspect-[4/5] top-[8%] left-[14%]",
    duration: 9,
    delay: 1.5,
  },
  {
    id: "tile-14",
    image: "/2.2.jpg",
    tag: "Dạ Tiệc",
    title: "Đầm Xòe Công Chúa",
    price: "320k/ngày",
    className: "hidden xl:block w-36 aspect-[4/5] top-[8%] right-[14%]",
    duration: 8.8,
    delay: 1.3,
  },
  {
    id: "tile-15",
    image: "/1.1 (1).jpg",
    tag: "Gala Night",
    title: "Đầm Xẻ Tà",
    price: "350k/ngày",
    className: "hidden xl:block w-36 aspect-[3/4] bottom-[8%] left-[14%]",
    duration: 7.9,
    delay: 0.7,
  },
  {
    id: "tile-16",
    image: "/bootvanlentino.webp",
    tag: "Phụ Kiện",
    title: "Boots Da Thật",
    price: "Pass 1.2Tr",
    className: "hidden xl:block w-36 aspect-square bottom-[8%] right-[14%]",
    duration: 8.2,
    delay: 1.0,
  }
];

export default function GoogleFlowFashionHero() {
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [hoveredTile, setHoveredTile] = useState<string | null>(null);

  return (
    <section className="relative w-full min-h-[580px] sm:min-h-[640px] md:min-h-[700px] lg:min-h-[760px] bg-[#07190F] overflow-hidden flex items-center justify-center select-none border-b border-emerald-950/80">
      
      {/* 🍵 MATCHA GLOW VIGNETTE: Nền xanh matcha kẹo dịu dàng, sang trọng */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(24,61,40,0.85)_0%,_rgba(10,34,20,0.92)_50%,_rgba(7,25,15,0.98)_100%)] pointer-events-none z-0" />

      {/* 🌸 MOSAIC TILES LAYER: Thẻ ảnh sáng nét, tràn ngập bao quanh */}
      <div className="absolute inset-0 w-full h-full pointer-events-auto overflow-hidden z-10">
        {DENSE_FASHION_TILES.map((tile) => (
          <motion.div
            key={tile.id}
            initial={{ y: 0 }}
            animate={{ 
              y: [-8, 8, -8],
              rotate: hoveredTile === tile.id ? 0 : [-0.3, 0.3, -0.3]
            }}
            transition={{
              duration: tile.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: tile.delay,
            }}
            onMouseEnter={() => setHoveredTile(tile.id)}
            onMouseLeave={() => setHoveredTile(null)}
            className={`absolute ${tile.className} cursor-pointer transition-transform duration-500 hover:scale-108 hover:z-30`}
          >
            <div className="relative w-full h-full rounded-2xl md:rounded-3xl overflow-hidden border border-white/20 bg-stone-900 shadow-[0_8px_24px_rgba(0,0,0,0.35)] group">
              {/* Ảnh sáng rõ nét */}
              <Image
                src={tile.image}
                alt={tile.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110 brightness-105 opacity-90 group-hover:opacity-100"
                unoptimized
              />

              {/* Gradient nhẹ góc dưới */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

              {/* Tag pill */}
              <div className="absolute top-2 left-2 z-10">
                <span className="text-[7.5px] sm:text-[8.5px] uppercase font-bold tracking-widest bg-black/65 backdrop-blur-md text-[#A3E39F] px-2 py-0.5 rounded-full border border-white/15 font-ui shadow-xs">
                  {tile.tag}
                </span>
              </div>

              {/* Bottom Quick Info */}
              <div className="absolute bottom-0 left-0 w-full p-2.5 text-white transform translate-y-0.5 group-hover:translate-y-0 transition-transform">
                <h4 className="font-heading text-[10.5px] sm:text-[11.5px] font-bold leading-tight line-clamp-1">
                  {tile.title}
                </h4>
                <p className="text-[9px] sm:text-[10px] text-[#A3E39F] font-mono font-semibold">
                  {tile.price}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 🌟 CENTERPIECE CONTENT: Phong cách Google Flow rực rỡ, chữ trắng sắc nét */}
      <div className="relative z-30 max-w-3xl mx-auto px-4 text-center flex flex-col items-center justify-center pointer-events-auto my-auto">
        
        {/* Top Matcha Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-[#A3E39F]/30 text-[#A3E39F] text-[10.5px] font-bold uppercase tracking-widest mb-3.5 shadow-lg font-ui">
          <span className="w-2 h-2 rounded-full bg-[#A3E39F] animate-pulse"></span>
          Tủ Đồ Tuần Hoàn Sinh Thái 2026
        </div>

        {/* Big Bold White Title */}
        <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-[76px] font-extrabold text-white tracking-tight leading-none mb-3.5 drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
          CLOOP
        </h1>

        {/* Poetic & High-Fashion Tagline */}
        <p className="font-body text-xs sm:text-sm md:text-[15px] text-stone-200 font-light leading-relaxed max-w-lg mx-auto mb-7 drop-shadow-md">
          Mở khóa tủ đồ vô tận từ cộng đồng sành phong cách. Tự do biến hóa diện mạo mỗi ngày, tiết kiệm 90% chi phí và lan tỏa lối sống xanh.
        </p>

        {/* Action Buttons Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
          {/* Primary Giant White Pill Button */}
          <Link
            href="/shop"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white text-[#0A2517] hover:bg-[#FAF7F0] font-heading font-extrabold text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 shadow-[0_4px_20px_rgba(255,255,255,0.25)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group font-ui"
          >
            Khám Phá Tủ Đồ
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* AI Visual Search Button */}
          <button
            type="button"
            onClick={() => setIsVisualSearchOpen(true)}
            className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-md font-heading font-bold text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 shadow-md hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group font-ui"
          >
            <Camera size={15} className="text-[#A3E39F] group-hover:scale-110 transition-transform" />
            <span>Tìm Bằng Ảnh AI</span>
          </button>
        </div>

        {/* Micro Search Bar */}
        <div className="mt-5 w-full max-w-md">
          <div className="relative flex items-center bg-black/40 backdrop-blur-md border border-white/20 rounded-full px-3.5 py-1.5 shadow-inner focus-within:border-white/50 transition-all">
            <Search size={14} className="text-stone-400 ml-1 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Tìm Đầm dạ hội, Blazer linen, Áo dài gấm..."
              className="flex-1 bg-transparent border-none outline-none font-ui text-xs text-white placeholder:text-stone-400 font-medium min-w-0"
            />
            <Link
              href="/shop"
              className="px-3.5 py-1 bg-white/20 hover:bg-white text-white hover:text-black rounded-full text-[10px] font-bold uppercase tracking-wider transition-all shrink-0 font-ui"
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
