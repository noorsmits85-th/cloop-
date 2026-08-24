"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Camera, Search } from "lucide-react";
import VisualSearchModal from "@/app/components/VisualSearchModal";

interface FashionCard {
  id: string;
  image: string;
  tag: string;
  title: string;
  price: string;
  className: string;
  duration: number;
  delay: number;
}

const FASHION_TILES: FashionCard[] = [
  // Hàng trên
  {
    id: "tile-1",
    image: "/evening_dress.jpg",
    tag: "Dạ Hội",
    title: "Váy Lụa Sequin",
    price: "380k/ngày",
    className: "w-32 sm:w-40 md:w-48 aspect-[3/4] -top-4 left-[2%] md:left-[5%]",
    duration: 6,
    delay: 0,
  },
  {
    id: "tile-2",
    image: "/1.2.jpeg",
    tag: "Thanh Lịch",
    title: "Set Dạ Tweed Paris",
    price: "180k/ngày",
    className: "w-36 sm:w-44 md:w-52 aspect-[4/3] -top-6 left-[25%] md:left-[27%]",
    duration: 7,
    delay: 0.5,
  },
  {
    id: "tile-3",
    image: "/macro_fabric.jpg",
    tag: "Chất Liệu",
    title: "Sợi Linen Tự Nhiên",
    price: "Eco-Linen",
    className: "w-28 sm:w-36 md:w-44 aspect-square -top-3 right-[24%] md:right-[26%]",
    duration: 6.5,
    delay: 1,
  },
  {
    id: "tile-4",
    image: "/anhbia.png",
    tag: "Di Sản",
    title: "Áo Dài Tơ Tằm",
    price: "280k/ngày",
    className: "w-32 sm:w-40 md:w-48 aspect-[3/4] -top-4 right-[2%] md:right-[5%]",
    duration: 8,
    delay: 0.2,
  },

  // Hai bên sườn
  {
    id: "tile-5",
    image: "/1.1.jpg",
    tag: "Dạ Tiệc",
    title: "Đầm Satin Đỏ Rượu",
    price: "350k/ngày",
    className: "w-36 sm:w-44 md:w-52 aspect-[3/4] top-[30%] -left-2 md:left-[3%]",
    duration: 7.5,
    delay: 0.8,
  },
  {
    id: "tile-6",
    image: "/2.1.jpg",
    tag: "Tối Giản",
    title: "Đầm Cúp Ngực",
    price: "220k/ngày",
    className: "w-36 sm:w-44 md:w-52 aspect-[3/4] top-[30%] -right-2 md:right-[3%]",
    duration: 6.8,
    delay: 0.3,
  },

  // Hàng dưới
  {
    id: "tile-7",
    image: "/vintage_coat.jpg",
    tag: "Hoài Niệm",
    title: "Blazer Dạ 1998",
    price: "190k/ngày",
    className: "w-32 sm:w-40 md:w-48 aspect-[3/4] -bottom-4 left-[3%] md:left-[6%]",
    duration: 7.2,
    delay: 0.6,
  },
  {
    id: "tile-8",
    image: "/hero_group.jpg",
    tag: "Tái Sinh",
    title: "Set Streetstyle",
    price: "160k/ngày",
    className: "w-40 sm:w-48 md:w-56 aspect-[16/10] -bottom-6 left-[25%] md:left-[26%]",
    duration: 8.5,
    delay: 1.2,
  },
  {
    id: "tile-9",
    image: "/1.2.jpg",
    tag: "Hoài Cổ",
    title: "Biker Jacket Da",
    price: "250k/ngày",
    className: "w-32 sm:w-40 md:w-48 aspect-[3/4] -bottom-4 right-[25%] md:right-[26%]",
    duration: 6.2,
    delay: 0.4,
  },
  {
    id: "tile-10",
    image: "/step3_party.jpg",
    tag: "Khoảnh Khắc",
    title: "Tiệc Đêm Rực Rỡ",
    price: "Kỷ Niệm",
    className: "w-32 sm:w-36 md:w-44 aspect-square -bottom-3 right-[3%] md:right-[5%]",
    duration: 7.8,
    delay: 0.9,
  },
];

export default function GoogleFlowFashionHero() {
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [hoveredTile, setHoveredTile] = useState<string | null>(null);

  return (
    <section className="relative w-full min-h-[540px] sm:min-h-[590px] md:min-h-[640px] lg:min-h-[690px] bg-[#FAF8F2] overflow-hidden flex items-center justify-center select-none border-b border-stone-200/80">
      
      {/* ☀️ SUNLIT AMBIENT GRADIENT: Nền sáng ấm áp, thanh lịch, tự nhiên */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(235,245,232,0.9)_0%,_rgba(250,248,242,0.95)_60%,_rgba(245,242,233,1)_100%)] pointer-events-none z-0" />

      {/* 🌸 MOSAIC GRID LAYER: Thẻ ảnh thời trang sáng sủa, sắc nét */}
      <div className="absolute inset-0 w-full h-full pointer-events-auto overflow-hidden z-10">
        {FASHION_TILES.map((tile) => (
          <motion.div
            key={tile.id}
            initial={{ y: 0 }}
            animate={{ 
              y: [-8, 8, -8],
              rotate: hoveredTile === tile.id ? 0 : [-0.4, 0.4, -0.4]
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
            <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/90 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)] group">
              <Image
                src={tile.image}
                alt={tile.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-108 brightness-100 opacity-90 group-hover:opacity-100"
                unoptimized
              />

              {/* Gentle Light Gradient Overlay at bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />

              {/* Tag pill */}
              <div className="absolute top-2 left-2 z-10">
                <span className="text-[7.5px] sm:text-[8.5px] uppercase font-bold tracking-widest bg-white/95 text-[#183A2D] px-2 py-0.5 rounded-full shadow-2xs border border-stone-200/60 font-ui">
                  {tile.tag}
                </span>
              </div>

              {/* Bottom Quick Info */}
              <div className="absolute bottom-0 left-0 w-full p-2.5 text-white transform translate-y-1 group-hover:translate-y-0 transition-transform">
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

      {/* 🌟 CENTERPIECE CONTENT: Trắng sáng, tương phản cao, tràn đầy năng lượng */}
      <div className="relative z-20 max-w-3xl mx-auto px-4 text-center flex flex-col items-center justify-center pointer-events-auto my-auto">
        
        {/* Top Matcha Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5EFE2] border border-[#C5DAC2] text-[#2A4B2E] text-[10px] font-bold uppercase tracking-widest mb-3 shadow-2xs font-ui"
        >
          <span className="w-2 h-2 rounded-full bg-[#37503F] animate-pulse"></span>
          Tủ Đồ Tuần Hoàn Sinh Thái 2026
        </motion.div>

        {/* Big Statement Headline (Deep Forest Green) */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-[70px] font-extrabold text-[#0A2517] tracking-tight leading-none mb-3 drop-shadow-xs"
        >
          CLOOP
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="font-body text-xs sm:text-sm md:text-base text-stone-700 font-normal max-w-lg mx-auto leading-relaxed mb-6"
        >
          Tủ đồ xoay vòng vô tận từ những người sành thời trang. Tiết kiệm 90% chi phí mua mới, diện đồ chuẩn spa & bảo tồn tài nguyên sinh thái.
        </motion.p>

        {/* Buttons Row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto"
        >
          {/* Main Dark Emerald Pill Button */}
          <Link
            href="/shop"
            className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#0A2517] hover:bg-[#183A2D] text-white font-heading font-extrabold text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 shadow-md hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group font-ui"
          >
            Khám Phá Tủ Đồ
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* AI Visual Search Button (Clean Ivory/Matcha Pill) */}
          <button
            type="button"
            onClick={() => setIsVisualSearchOpen(true)}
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-white hover:bg-[#FAF7F0] text-[#183A2D] border border-stone-300/80 font-heading font-bold text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 shadow-sm hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group font-ui"
          >
            <Camera size={15} className="text-[#37503F] group-hover:scale-110 transition-transform" />
            <span>Tìm Bằng Ảnh AI</span>
          </button>
        </motion.div>

        {/* Quick Micro Search Bar in Crisp White Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-5 w-full max-w-md"
        >
          <div className="relative flex items-center bg-white/95 border border-stone-300/90 rounded-full px-3 py-1.5 shadow-md focus-within:ring-2 focus-within:ring-[#37503F] transition-all">
            <Search size={14} className="text-stone-400 ml-1.5 mr-2 shrink-0" />
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
        </motion.div>

      </div>

      {/* MODAL TÌM KIẾM HÌNH ẢNH LOOKBOOK BẰNG AI */}
      <VisualSearchModal 
        isOpen={isVisualSearchOpen} 
        onClose={() => setIsVisualSearchOpen(false)} 
      />

    </section>
  );
}
