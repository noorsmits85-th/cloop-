"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Camera, Search, Sparkles, X, 
  ShieldCheck, Leaf, Heart, Users, Star, ChevronRight
} from "lucide-react";
import VisualSearchModal from "@/app/components/VisualSearchModal";

interface FashionItem {
  id: string;
  img: string;
  tag: string;
  title: string;
  price: string;
  originalPrice: string;
  aspect: string;
  eco: string;
  passport: string;
  rentals: string;
  rating: string;
  modelFit: string;
  description: string;
  occasion: string;
}

// 12 bức ảnh Cánh Trái (Left Runway Wing)
const LEFT_RUNWAY_COLUMNS: FashionItem[][] = [
  [
    { 
      id: "l1-1", img: "/evening_dress.jpg", tag: "Dạ Hội", title: "Váy Lụa Sequin Prom", 
      price: "380k/ngày", originalPrice: "5.200.000đ", aspect: "aspect-[3/4]",
      eco: "-14.2kg CO₂", passport: "CLP-8821", rentals: "18 lượt", rating: "5.0★",
      modelFit: "Cao 1m68 • Nặng 48kg • Size S",
      description: "Được dệt từ sợi tơ sequin bắt sáng cao cấp, đầm ôm dáng thanh lịch tôn trọn đường cong.",
      occasion: "Gala Night, Dạ Tiệc Cuối Năm, Prom"
    },
    { 
      id: "l1-2", img: "/1.2.jpeg", tag: "Thanh Lịch", title: "Set Dạ Tweed Paris", 
      price: "180k/ngày", originalPrice: "2.800.000đ", aspect: "aspect-[4/5]",
      eco: "-8.5kg CO₂", passport: "CLP-4019", rentals: "12 lượt", rating: "4.9★",
      modelFit: "Cao 1m62 • Nặng 46kg • Size S",
      description: "Chất dạ tweed Pháp may đo thủ công, giữ ấm hoàn hảo cho những ngày chớm đông.",
      occasion: "Hẹn Hò, Chụp Ảnh Vintage, Tiệc Trà"
    },
    { 
      id: "l1-3", img: "/step1_phone.jpg", tag: "Trải Nghiệm", title: "App Thuê 60s", 
      price: "Tiện Lợi", originalPrice: "Miễn Phí", aspect: "aspect-square",
      eco: "100% Digital", passport: "CLP-APP", rentals: "500+ lượt", rating: "5.0★",
      modelFit: "Giao nhận tận nơi 2H tại HN & HCM",
      description: "Ứng dụng thông minh hỗ trợ thử đồ bằng AI và nhận đồ giặt sấy chuẩn spa.",
      occasion: "Mọi Dịp Sự Kiện"
    },
  ],
  [
    { 
      id: "l2-1", img: "/1.1.jpg", tag: "Prom Gala", title: "Đầm Satin Đỏ Rượu", 
      price: "350k/ngày", originalPrice: "4.500.000đ", aspect: "aspect-[3/4]",
      eco: "-11.8kg CO₂", passport: "CLP-7734", rentals: "16 lượt", rating: "5.0★",
      modelFit: "Cao 1m65 • Nặng 47kg • Size S",
      description: "Sắc đỏ Bordeaux quý phái, chất lụa satin rủ mềm mại xẻ tà quyến rũ.",
      occasion: "Khiêu Vũ, Tiệc Rượu, Event Thảm Đỏ"
    },
    { 
      id: "l2-2", img: "/macro_fabric.jpg", tag: "Chất Liệu", title: "Sợi Linen Eco Hữu Cơ", 
      price: "Chuẩn Xanh", originalPrice: "Eco-Silk", aspect: "aspect-square",
      eco: "-6.4kg CO₂", passport: "CLP-ECO", rentals: "Chứng Nhận", rating: "5.0★",
      modelFit: "Vải dệt từ 100% sợi thực vật",
      description: "Chất liệu thân thiện với làn da và phân hủy sinh học hoàn toàn.",
      occasion: "Thời Trang Bền Vững"
    },
    { 
      id: "l2-3", img: "/vintage_coat.jpg", tag: "Hoài Cổ", title: "Blazer Dạ 1998 Archive", 
      price: "190k/ngày", originalPrice: "3.500.000đ", aspect: "aspect-[3/4]",
      eco: "-12.0kg CO₂", passport: "CLP-1998", rentals: "9 lượt", rating: "4.9★",
      modelFit: "Cao 1m70 • Nặng 52kg • Size M",
      description: "Form vai quyền lực vintage thập niên 90, chất len cashmere nguyên bản.",
      occasion: "Fashion Week, Triển Lãm Nghệ Thuật"
    },
  ]
];

// 12 bức ảnh Cánh Phải (Right Runway Wing)
const RIGHT_RUNWAY_COLUMNS: FashionItem[][] = [
  [
    { 
      id: "r1-1", img: "/anhbia.png", tag: "Di Sản", title: "Áo Dài Tơ Tằm Thêu Sen", 
      price: "280k/ngày", originalPrice: "3.800.000đ", aspect: "aspect-[3/4]",
      eco: "-15.0kg CO₂", passport: "CLP-0015", rentals: "22 lượt", rating: "5.0★",
      modelFit: "Cao 1m60 - 1m68 • Size S/M",
      description: "Lụa tơ tằm truyền thống thêu tay hoa sen tinh xảo gìn giữ 15 năm.",
      occasion: "Lễ Tết, Cưới Hỏi, Du Xuân Hội An"
    },
    { 
      id: "r1-2", img: "/2.1.jpg", tag: "Tối Giản", title: "Đầm Cúp Ngực Tinh Khôi", 
      price: "220k/ngày", originalPrice: "2.900.000đ", aspect: "aspect-[4/5]",
      eco: "-7.9kg CO₂", passport: "CLP-5520", rentals: "14 lượt", rating: "4.8★",
      modelFit: "Cao 1m64 • Nặng 48kg • Size S",
      description: "Đường cắt cúp ngực tôn dáng với nơ lưng nhẹ nhàng tinh tế.",
      occasion: "Sinh Nhật, Tiệc Bãi Biển, Cocktail"
    },
    { 
      id: "r1-3", img: "/hero_group.jpg", tag: "Tái Sinh", title: "Set Đồ Upcycled Denim", 
      price: "160k/ngày", originalPrice: "2.200.000đ", aspect: "aspect-square",
      eco: "-22.1kg CO₂", passport: "CLP-UPCY", rentals: "20 lượt", rating: "5.0★",
      modelFit: "Free size • Unisex cá tính",
      description: "Tái chế từ 12 mảnh vải denim quần jean cũ, độc bản duy nhất.",
      occasion: "Biểu Diễn, Fashion Show, Chụp Ảnh"
    },
  ],
  [
    { 
      id: "r2-1", img: "/step3_party.jpg", tag: "Tỏa Sáng", title: "Khoảnh Khắc Đêm Tiệc", 
      price: "Kỷ Niệm", originalPrice: "Vô Giá", aspect: "aspect-[3/4]",
      eco: "100% Cảm Xúc", passport: "CLP-MEM", rentals: "Vòng Đời Mới", rating: "5.0★",
      modelFit: "Cùng hàng ngàn cô gái tỏa sáng",
      description: "Những nụ cười và khoảnh khắc đáng nhớ nhất cùng tủ đồ CLOOP.",
      occasion: "Mọi Khoảnh Khắc Đẹp"
    },
    { 
      id: "r2-2", img: "/bootvanlentino.webp", tag: "Phụ Kiện", title: "Boots Da Thật Cao Cổ", 
      price: "Pass 1.2Tr", originalPrice: "6.500.000đ", aspect: "aspect-[4/5]",
      eco: "-16.4kg CO₂", passport: "CLP-BOT1", rentals: "Pass Mới 98%", rating: "5.0★",
      modelFit: "Size 37 - 38",
      description: "Chất da bê cao cấp, gót trụ chắc chắn giúp kéo dài đôi chân.",
      occasion: "Mùa Đông, Chụp Ảnh Lookbook"
    },
    { 
      id: "r2-3", img: "/hero_warm.jpg", tag: "Mùa Thu", title: "Áo Khoác Trench Coat", 
      price: "230k/ngày", originalPrice: "3.800.000đ", aspect: "aspect-square",
      eco: "-10.8kg CO₂", passport: "CLP-4402", rentals: "12 lượt", rating: "4.9★",
      modelFit: "Cao 1m65 • Nặng 50kg • Size M",
      description: "Chất kaki chống nước cao cấp, đai thắt eo tôn dáng chuẩn mẫu.",
      occasion: "Du Lịch Mùa Thu Đông"
    },
  ]
];

export default function GoogleFlowFashionHero() {
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FashionItem | null>(null);

  return (
    <section className="relative w-full min-h-[620px] sm:min-h-[680px] md:min-h-[740px] lg:min-h-[780px] bg-[#071A10] overflow-hidden flex items-center justify-center select-none border-b border-[#0F3120]">
      
      {/* 🍵 AMBIENT MATCHA GLOW: Vầng sáng matcha mềm mại lan tỏa ở trung tâm */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(16,48,30,0.65)_0%,_rgba(10,30,18,0.75)_50%,_rgba(5,18,10,0.96)_100%)] pointer-events-none z-0" />

      {/* 🖼️ CÁNH TRÁI: Dải Băng Chuyền Lookbook Trôi Êm Ả (Left Flank) */}
      <div className="absolute left-0 top-0 bottom-0 w-[24%] sm:w-[26%] lg:w-[28%] overflow-hidden grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 pointer-events-auto z-10 opacity-75 hover:opacity-95 transition-opacity duration-500 hidden md:grid">
        {LEFT_RUNWAY_COLUMNS.map((col, colIdx) => {
          const isOdd = colIdx % 2 !== 0;
          return (
            <motion.div
              key={colIdx}
              animate={{ y: isOdd ? [-18, 18, -18] : [18, -18, 18] }}
              transition={{ duration: 22 + colIdx * 3, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col gap-3"
            >
              {col.map((card) => (
                <div
                  key={card.id}
                  onClick={() => setSelectedItem(card)}
                  className={`group relative w-full ${card.aspect} rounded-2xl overflow-hidden bg-[#0A2215] border border-white/18 hover:border-[#A3E39F] shadow-lg hover:shadow-[0_0_35px_rgba(163,227,159,0.85)] transition-all duration-300 hover:scale-105 cursor-pointer block`}
                >
                  <Image
                    src={card.img}
                    alt={card.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110 brightness-100 group-hover:brightness-115"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  
                  <div className="absolute top-2 left-2 z-10">
                    <span className="text-[7.5px] uppercase font-bold tracking-wider bg-black/70 text-[#A3E39F] px-2 py-0.5 rounded-full border border-white/15 font-ui">
                      {card.tag}
                    </span>
                  </div>

                  <div className="absolute bottom-0 left-0 w-full p-2 text-white transform translate-y-0.5 group-hover:translate-y-0 transition-transform">
                    <p className="text-[10px] font-heading font-bold leading-tight line-clamp-1">{card.title}</p>
                    <p className="text-[9px] text-[#A3E39F] font-mono font-bold">{card.price}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          );
        })}
      </div>

      {/* 🖼️ CÁNH PHẢI: Dải Băng Chuyền Lookbook Trôi Êm Ả (Right Flank) */}
      <div className="absolute right-0 top-0 bottom-0 w-[24%] sm:w-[26%] lg:w-[28%] overflow-hidden grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 pointer-events-auto z-10 opacity-75 hover:opacity-95 transition-opacity duration-500 hidden md:grid">
        {RIGHT_RUNWAY_COLUMNS.map((col, colIdx) => {
          const isOdd = colIdx % 2 === 0;
          return (
            <motion.div
              key={colIdx}
              animate={{ y: isOdd ? [18, -18, 18] : [-18, 18, -18] }}
              transition={{ duration: 24 + colIdx * 3, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col gap-3"
            >
              {col.map((card) => (
                <div
                  key={card.id}
                  onClick={() => setSelectedItem(card)}
                  className={`group relative w-full ${card.aspect} rounded-2xl overflow-hidden bg-[#0A2215] border border-white/18 hover:border-[#A3E39F] shadow-lg hover:shadow-[0_0_35px_rgba(163,227,159,0.85)] transition-all duration-300 hover:scale-105 cursor-pointer block`}
                >
                  <Image
                    src={card.img}
                    alt={card.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110 brightness-100 group-hover:brightness-115"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  
                  <div className="absolute top-2 left-2 z-10">
                    <span className="text-[7.5px] uppercase font-bold tracking-wider bg-black/70 text-[#A3E39F] px-2 py-0.5 rounded-full border border-white/15 font-ui">
                      {card.tag}
                    </span>
                  </div>

                  <div className="absolute bottom-0 left-0 w-full p-2 text-white transform translate-y-0.5 group-hover:translate-y-0 transition-transform">
                    <p className="text-[10px] font-heading font-bold leading-tight line-clamp-1">{card.title}</p>
                    <p className="text-[9px] text-[#A3E39F] font-mono font-bold">{card.price}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          );
        })}
      </div>

      {/* 🌟 TÂM ĐIỂM SÂN KHẤU (Center Runway Stage): Hoàn Toàn Trong Trẻo, Êm Mắt, Đọc Chữ Cực Đã */}
      <div className="relative z-30 max-w-2xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center justify-center pointer-events-auto py-10">
        
        {/* Top Matcha Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/12 backdrop-blur-md border border-[#A3E39F]/40 text-[#A3E39F] text-[10.5px] font-bold uppercase tracking-widest mb-4 shadow-lg font-ui">
          <span className="w-2 h-2 rounded-full bg-[#A3E39F] animate-pulse"></span>
          Tủ Đồ Tuần Hoàn Sinh Thái 2026
        </div>

        {/* Big Bold Elegant Title */}
        <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-[84px] font-extrabold text-white tracking-tight leading-none mb-4 drop-shadow-[0_4px_30px_rgba(0,0,0,0.85)]">
          CLOOP
        </h1>

        {/* Poetic & High-Fashion Tagline */}
        <p className="font-body text-xs sm:text-sm md:text-base text-stone-200 font-light leading-relaxed max-w-lg mx-auto mb-7 drop-shadow-md">
          Mở khóa tủ đồ phong cách vô tận từ cộng đồng sành thời trang. Tự do biến hóa diện mạo mỗi ngày, tiết kiệm 90% chi phí và lan tỏa lối sống xanh.
        </p>

        {/* Action Buttons Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
          {/* Primary Giant White Pill Button */}
          <Link
            href="/shop"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white text-[#0A2517] hover:bg-[#FAF7F0] font-heading font-extrabold text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 shadow-[0_6px_25px_rgba(255,255,255,0.35)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group font-ui"
          >
            Khám Phá Tủ Đồ
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* AI Visual Search Button */}
          <button
            type="button"
            onClick={() => setIsVisualSearchOpen(true)}
            className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white/18 hover:bg-white/28 text-white border border-white/30 backdrop-blur-md font-heading font-bold text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 shadow-md hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group font-ui"
          >
            <Camera size={15} className="text-[#A3E39F] group-hover:scale-110 transition-transform" />
            <span>Tìm Bằng Ảnh AI</span>
          </button>
        </div>

        {/* Micro Search Bar with Quick Filter Tags */}
        <div className="mt-6 w-full max-w-md space-y-2.5">
          <div className="relative flex items-center bg-black/45 backdrop-blur-md border border-white/25 rounded-full px-3.5 py-1.5 shadow-inner focus-within:border-white/60 transition-all">
            <Search size={14} className="text-stone-300 ml-1 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Tìm Đầm dạ hội, Blazer linen, Áo dài gấm..."
              className="flex-1 bg-transparent border-none outline-none font-ui text-xs text-white placeholder:text-stone-300 font-medium min-w-0"
            />
            <Link
              href="/shop"
              className="px-4 py-1 bg-[#A3E39F] hover:bg-white text-[#071A10] font-heading font-extrabold rounded-full text-[10px] uppercase tracking-wider transition-all shrink-0 font-ui shadow-xs"
            >
              Tìm
            </Link>
          </div>

          {/* Quick Trending Tags */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <span className="text-[9px] uppercase font-bold text-stone-400 font-ui">Xu hướng:</span>
            {[
              { label: "Đầm Dạ Hội", q: "dạ hội" },
              { label: "Set Tweed", q: "tweed" },
              { label: "Áo Dài", q: "áo dài" },
              { label: "Blazer 90s", q: "blazer" }
            ].map((chip, idx) => (
              <Link
                key={idx}
                href={`/shop?q=${encodeURIComponent(chip.q)}`}
                className="text-[9px] font-bold text-stone-300 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-0.5 rounded-full border border-white/10 transition-colors font-ui"
              >
                #{chip.label}
              </Link>
            ))}
          </div>
        </div>

        {/* 🌿 Live ESG Mini Metrics Ticker */}
        <div className="mt-8 pt-5 border-t border-white/10 grid grid-cols-3 gap-4 sm:gap-8 text-center w-full max-w-lg">
          <div>
            <p className="font-heading font-extrabold text-base sm:text-lg text-white">2.450+</p>
            <p className="text-[9px] uppercase font-bold text-stone-400 font-ui">Trang Phục</p>
          </div>
          <div>
            <p className="font-heading font-extrabold text-base sm:text-lg text-[#A3E39F] flex items-center justify-center gap-1">
              <Leaf size={13} className="text-[#A3E39F]" /> -18.2 Tấn
            </p>
            <p className="text-[9px] uppercase font-bold text-stone-400 font-ui">Giảm CO₂</p>
          </div>
          <div>
            <p className="font-heading font-extrabold text-base sm:text-lg text-amber-300 flex items-center justify-center gap-1">
              <Star size={13} className="fill-current text-amber-400" /> 4.9★
            </p>
            <p className="text-[9px] uppercase font-bold text-stone-400 font-ui">1.8k Đánh Giá</p>
          </div>
        </div>

      </div>

      {/* 👗 INSTANT FIT-CHECK & DIGITAL PASSPORT MODAL */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative border border-stone-200"
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors z-30 shadow-md"
              >
                <X size={18} />
              </button>

              {/* Photo & Badge */}
              <div className="relative aspect-[16/10] w-full bg-stone-900">
                <Image
                  src={selectedItem.img}
                  alt={selectedItem.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#183A2D] text-[#A3E39F] text-[10px] font-bold uppercase tracking-wider font-ui border border-[#A3E39F]/40 shadow-xs">
                    {selectedItem.tag}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider font-ui">
                    Hộ Chiếu {selectedItem.passport}
                  </span>
                </div>

                <div className="absolute bottom-3 left-4 text-white">
                  <h3 className="font-heading text-lg sm:text-xl font-extrabold">{selectedItem.title}</h3>
                  <p className="text-xs text-[#A3E39F] font-mono font-bold">{selectedItem.price} • Giá gốc {selectedItem.originalPrice}</p>
                </div>
              </div>

              {/* Specs & Digital Passport details */}
              <div className="p-6 space-y-4">
                
                {/* Fit Check Stats */}
                <div className="p-3.5 bg-[#F5F8F4] rounded-2xl border border-[#D5E5D2] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#183A2D] font-ui flex items-center gap-1.5">
                      <Sparkles size={13} className="text-[#2A6E46]" /> Thông Số Fit Check Chuẩn
                    </span>
                    <span className="text-[11px] font-extrabold text-[#2A6E46] font-ui">{selectedItem.rating} (Đánh giá cao)</span>
                  </div>
                  <p className="text-xs text-stone-700 font-medium">{selectedItem.modelFit}</p>
                  <p className="text-[11px] text-stone-500 italic">Phù hợp: {selectedItem.occasion}</p>
                </div>

                {/* ESG Impact Bar */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <p className="text-[9px] uppercase font-bold text-stone-400 font-ui">Tác Động Sinh Thái</p>
                    <p className="text-xs font-extrabold text-[#183A2D] flex items-center gap-1 mt-0.5">
                      <Leaf size={12} className="text-emerald-600" /> Giảm {selectedItem.eco}
                    </p>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <p className="text-[9px] uppercase font-bold text-stone-400 font-ui">Vòng Đời Tuần Hoàn</p>
                    <p className="text-xs font-extrabold text-[#183A2D] flex items-center gap-1 mt-0.5">
                      <ShieldCheck size={12} className="text-emerald-600" /> Đã thuê {selectedItem.rentals}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-stone-600 leading-relaxed font-body">
                  {selectedItem.description}
                </p>

                {/* Action CTA */}
                <div className="pt-2 flex items-center gap-3">
                  <Link
                    href={`/shop`}
                    className="flex-1 py-3.5 rounded-full bg-[#0A2517] hover:bg-[#183A2D] text-white font-heading font-extrabold text-xs uppercase tracking-wider text-center transition-all shadow-md flex items-center justify-center gap-2 font-ui"
                  >
                    Thuê Trang Phục Này Ngay
                    <ArrowRight size={14} />
                  </Link>

                  <Link
                    href="/blog"
                    className="px-5 py-3.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-heading font-bold text-xs uppercase tracking-wider transition-all font-ui text-center"
                  >
                    Xem Ký Ức
                  </Link>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL TÌM KIẾM HÌNH ẢNH LOOKBOOK BẰNG AI */}
      <VisualSearchModal 
        isOpen={isVisualSearchOpen} 
        onClose={() => setIsVisualSearchOpen(false)} 
      />

    </section>
  );
}
