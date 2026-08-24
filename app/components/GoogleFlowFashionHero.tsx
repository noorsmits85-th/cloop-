"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Camera, Search, Sparkles } from "lucide-react";
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
  // Top Row (Floating gently)
  {
    id: "tile-1",
    image: "/evening_dress.jpg",
    tag: "Dạ Hội",
    title: "Váy Lụa Sequin",
    price: "380k/ngày",
    className: "w-36 sm:w-44 md:w-52 aspect-[3/4] -top-6 left-[2%] md:left-[6%]",
    duration: 6,
    delay: 0,
  },
  {
    id: "tile-2",
    image: "/1.2.jpeg",
    tag: "Thanh Lịch",
    title: "Set Dạ Tweed Paris",
    price: "180k/ngày",
    className: "w-40 sm:w-48 md:w-56 aspect-[4/3] -top-8 left-[28%] md:left-[30%]",
    duration: 7,
    delay: 0.5,
  },
  {
    id: "tile-3",
    image: "/macro_fabric.jpg",
    tag: "Chất Liệu",
    title: "Sợi Linen Tự Nhiên",
    price: "Eco-Linen",
    className: "w-32 sm:w-40 md:w-48 aspect-square -top-4 right-[25%] md:right-[26%]",
    duration: 6.5,
    delay: 1,
  },
  {
    id: "tile-4",
    image: "/anhbia.png",
    tag: "Di Sản",
    title: "Áo Dài Tơ Tằm",
    price: "280k/ngày",
    className: "w-36 sm:w-44 md:w-52 aspect-[3/4] -top-6 right-[3%] md:right-[5%]",
    duration: 8,
    delay: 0.2,
  },

  // Middle Flanking Tiles
  {
    id: "tile-5",
    image: "/1.1.jpg",
    tag: "Prom Night",
    title: "Đầm Satin Đỏ Rượu",
    price: "350k/ngày",
    className: "w-40 sm:w-48 md:w-60 aspect-[3/4] top-[32%] -left-4 md:left-[2%]",
    duration: 7.5,
    delay: 0.8,
  },
  {
    id: "tile-6",
    image: "/2.1.jpg",
    tag: "Tối Giản",
    title: "Đầm Cúp Ngực",
    price: "220k/ngày",
    className: "w-40 sm:w-48 md:w-60 aspect-[3/4] top-[32%] -right-4 md:right-[2%]",
    duration: 6.8,
    delay: 0.3,
  },

  // Bottom Row
  {
    id: "tile-7",
    image: "/vintage_coat.jpg",
    tag: "Hoài Niệm",
    title: "Blazer Dạ 1998",
    price: "190k/ngày",
    className: "w-36 sm:w-44 md:w-52 aspect-[3/4] -bottom-6 left-[4%] md:left-[8%]",
    duration: 7.2,
    delay: 0.6,
  },
  {
    id: "tile-8",
    image: "/hero_group.jpg",
    tag: "Tái Sinh",
    title: "Set Streetstyle",
    price: "160k/ngày",
    className: "w-44 sm:w-52 md:w-64 aspect-[16/10] -bottom-8 left-[28%] md:left-[28%]",
    duration: 8.5,
    delay: 1.2,
  },
  {
    id: "tile-9",
    image: "/1.2.jpg",
    tag: "Hoài Cổ",
    title: "Biker Jacket Da",
    price: "250k/ngày",
    className: "w-36 sm:w-44 md:w-52 aspect-[3/4] -bottom-6 right-[26%] md:right-[26%]",
    duration: 6.2,
    delay: 0.4,
  },
  {
    id: "tile-10",
    image: "/step3_party.jpg",
    tag: "Khoảnh Khắc",
    title: "Tiệc Đêm Rực Rỡ",
    price: "Kỷ Niệm",
    className: "w-36 sm:w-44 md:w-48 aspect-square -bottom-4 right-[4%] md:right-[6%]",
    duration: 7.8,
    delay: 0.9,
  },
];

export default function GoogleFlowFashionHero() {
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [hoveredTile, setHoveredTile] = useState<string | null>(null);

  return (
    <section className="relative w-full min-h-[580px] sm:min-h-[640px] md:min-h-[700px] lg:min-h-[760px] bg-[#05110A] overflow-hidden flex items-center justify-center select-none">
      
      {/* 🔮 MOSAIC GRID LAYER: Floating & Undulating Living Fashion Cards */}
      <div className="absolute inset-0 w-full h-full pointer-events-auto overflow-hidden">
        {FASHION_TILES.map((tile) => (
          <motion.div
            key={tile.id}
            initial={{ y: 0 }}
            animate={{ 
              y: [-10, 10, -10],
              rotate: hoveredTile === tile.id ? 0 : [-0.5, 0.5, -0.5]
            }}
            transition={{
              duration: tile.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: tile.delay,
            }}
            onMouseEnter={() => setHoveredTile(tile.id)}
            onMouseLeave={() => setHoveredTile(null)}
            className={`absolute ${tile.className} z-10 cursor-pointer transition-transform duration-500 hover:scale-108 hover:z-30`}
          >
            <div className="relative w-full h-full rounded-2xl md:rounded-3xl overflow-hidden border border-white/15 bg-stone-900/80 shadow-2xl backdrop-blur-xs group">
              <Image
                src={tile.image}
                alt={tile.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-75 group-hover:opacity-100"
                unoptimized
              />

              {/* Card Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

              {/* Tag pill */}
              <div className="absolute top-2.5 left-2.5 z-10">
                <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-widest bg-black/60 backdrop-blur-md text-stone-200 px-2 py-0.5 rounded-full border border-white/10">
                  {tile.tag}
                </span>
              </div>

              {/* Bottom Quick Info */}
              <div className="absolute bottom-0 left-0 w-full p-2.5 sm:p-3 text-white transform translate-y-1 group-hover:translate-y-0 transition-transform">
                <h4 className="font-heading text-[11px] sm:text-xs font-bold leading-tight line-clamp-1">
                  {tile.title}
                </h4>
                <p className="text-[9.5px] sm:text-[10px] text-[#A3E39F] font-mono font-semibold">
                  {tile.price}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 🌑 CENTER VIGNETTE OVERLAY: Giữ độ sâu và làm nổi bật tiêu đề trung tâm */}
      <div className="absolute inset-0 bg-radial-[circle_at_center,_rgba(5,17,10,0.55)_0%,_rgba(5,17,10,0.85)_50%,_rgba(5,17,10,0.98)_100%] z-20 pointer-events-none" />

      {/* 🌟 CENTERPIECE CONTENT: Phong cách Google Flow tối giản, siêu sang trọng */}
      <div className="relative z-30 max-w-4xl mx-auto px-4 text-center flex flex-col items-center justify-center pointer-events-auto">
        
        {/* Top Badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[#A3E39F] text-[10.5px] font-bold uppercase tracking-widest mb-4 shadow-lg font-ui"
        >
          <span className="w-2 h-2 rounded-full bg-[#A3E39F] animate-pulse"></span>
          Tủ Đồ Tuần Hoàn Sinh Thái 2026
        </motion.div>

        {/* Big Statement Headline */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-heading text-4xl sm:text-6xl md:text-7xl lg:text-[80px] font-extrabold text-white tracking-tight leading-none mb-4 drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]"
        >
          CLOOP
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="font-body text-xs sm:text-sm md:text-base text-stone-200/90 font-light max-w-xl mx-auto leading-relaxed mb-8 drop-shadow-md"
        >
          Tủ đồ xoay vòng vô tận từ những người sành thời trang. Tiết kiệm 90% chi phí mua mới, diện đồ chuẩn spa và bảo tồn tài nguyên sinh thái.
        </motion.p>

        {/* Google Flow Style Giant White Pill Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto"
        >
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
        </motion.div>

        {/* Quick Micro Search Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mt-6 w-full max-w-md"
        >
          <div className="relative flex items-center bg-black/40 backdrop-blur-md border border-white/20 rounded-full px-3 py-1.5 shadow-inner focus-within:border-white/50 transition-all">
            <Search size={14} className="text-stone-400 ml-1.5 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Tìm Đầm dạ hội, Blazer linen, Áo dài gấm..."
              className="flex-1 bg-transparent border-none outline-none font-ui text-xs text-white placeholder:text-stone-400 font-medium min-w-0"
            />
            <Link
              href="/shop"
              className="px-3 py-1 bg-white/20 hover:bg-white text-white hover:text-black rounded-full text-[10px] font-bold uppercase tracking-wider transition-all shrink-0 font-ui"
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
