"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Camera, Search, Sparkles, X, 
  ShieldCheck, Leaf, Star
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

// 24 bức ảnh thời trang tràn ngập 100% diện tích không gian
const FULL_MOSAIC_COLUMNS: FashionItem[][] = [
  // Cột 1: Trôi lên
  [
    { 
      id: "m1-1", img: "/evening_dress.jpg", tag: "Dạ Hội", title: "Váy Lụa Sequin Prom", 
      price: "380k/ngày", originalPrice: "5.200.000đ", aspect: "aspect-[3/4]",
      eco: "-14.2kg CO₂", passport: "CLP-8821", rentals: "18 lượt", rating: "5.0★",
      modelFit: "Cao 1m68 • Nặng 48kg • Size S",
      description: "Được dệt từ sợi tơ sequin bắt sáng cao cấp, đầm ôm dáng thanh lịch tôn trọn đường cong.",
      occasion: "Gala Night, Dạ Tiệc Cuối Năm, Prom"
    },
    { 
      id: "m1-2", img: "/1.2.jpeg", tag: "Thanh Lịch", title: "Set Dạ Tweed Paris", 
      price: "180k/ngày", originalPrice: "2.800.000đ", aspect: "aspect-[4/5]",
      eco: "-8.5kg CO₂", passport: "CLP-4019", rentals: "12 lượt", rating: "4.9★",
      modelFit: "Cao 1m62 • Nặng 46kg • Size S",
      description: "Chất dạ tweed Pháp may đo thủ công, giữ ấm hoàn hảo cho những ngày chớm đông.",
      occasion: "Hẹn Hò, Chụp Ảnh Vintage, Tiệc Trà"
    },
    { 
      id: "m1-3", img: "/step1_phone.jpg", tag: "Trải Nghiệm", title: "App Thuê Tốc Độ 60s", 
      price: "Tiện Lợi", originalPrice: "Miễn Phí", aspect: "aspect-square",
      eco: "100% Digital", passport: "CLP-APP", rentals: "500+ lượt/ngày", rating: "5.0★",
      modelFit: "Giao nhận tận nơi 2H tại HN & HCM",
      description: "Ứng dụng thông minh hỗ trợ thử đồ bằng AI và nhận đồ giặt sấy chuẩn spa.",
      occasion: "Mọi Dịp Sự Kiện"
    },
    { 
      id: "m1-4", img: "/vintage_coat.jpg", tag: "Hoài Cổ", title: "Blazer Dạ 1998 Archive", 
      price: "190k/ngày", originalPrice: "3.500.000đ", aspect: "aspect-[3/4]",
      eco: "-12.0kg CO₂", passport: "CLP-1998", rentals: "9 lượt", rating: "4.9★",
      modelFit: "Cao 1m70 • Nặng 52kg • Size M",
      description: "Form vai quyền lực vintage thập niên 90, chất len cashmere nguyên bản.",
      occasion: "Fashion Week, Triển Lãm Nghệ Thuật"
    },
  ],
  // Cột 2: Trôi xuống
  [
    { 
      id: "m2-1", img: "/1.1.jpg", tag: "Prom Gala", title: "Đầm Lụa Satin Đỏ Rượu", 
      price: "350k/ngày", originalPrice: "4.500.000đ", aspect: "aspect-[3/4]",
      eco: "-11.8kg CO₂", passport: "CLP-7734", rentals: "16 lượt", rating: "5.0★",
      modelFit: "Cao 1m65 • Nặng 47kg • Size S",
      description: "Sắc đỏ Bordeaux quý phái, chất lụa satin rủ mềm mại xẻ tà quyến rũ.",
      occasion: "Khiêu Vũ, Tiệc Rượu, Event Thảm Đỏ"
    },
    { 
      id: "m2-2", img: "/macro_fabric.jpg", tag: "Chất Liệu", title: "Sợi Linen Eco Tự Nhiên", 
      price: "Chuẩn Xanh", originalPrice: "Hữu Cơ", aspect: "aspect-square",
      eco: "-6.4kg CO₂", passport: "CLP-ECO", rentals: "Chứng Nhận", rating: "5.0★",
      modelFit: "Vải dệt từ 100% sợi thực vật",
      description: "Chất liệu thân thiện với làn da và phân hủy sinh học hoàn toàn.",
      occasion: "Thời Trang Bền Vững"
    },
    { 
      id: "m2-3", img: "/2.1.jpg", tag: "Tối Giản", title: "Đầm Cúp Ngực Tinh Khôi", 
      price: "220k/ngày", originalPrice: "2.900.000đ", aspect: "aspect-[4/5]",
      eco: "-7.9kg CO₂", passport: "CLP-5520", rentals: "14 lượt", rating: "4.8★",
      modelFit: "Cao 1m64 • Nặng 48kg • Size S",
      description: "Đường cắt cúp ngực tôn dáng với nơ lưng nhẹ nhàng tinh tế.",
      occasion: "Sinh Nhật, Tiệc Bãi Biển, Cocktail"
    },
    { 
      id: "m2-4", img: "/hero_warm.jpg", tag: "Ấm Áp", title: "Sắc Nắng Mùa Thu Vintage", 
      price: "Outfit Thu", originalPrice: "3.200.000đ", aspect: "aspect-[3/4]",
      eco: "-9.3kg CO₂", passport: "CLP-9912", rentals: "8 lượt", rating: "4.9★",
      modelFit: "Cao 1m66 • Nặng 50kg • Size M",
      description: "Tone màu beige ấm áp, hoàn hảo cho những chuyến du lịch Đà Lạt, Sa Pa.",
      occasion: "Du Lịch, Lookbook Ngoại Cảnh"
    },
  ],
  // Cột 3: Trôi lên (ở giữa)
  [
    { 
      id: "m3-1", img: "/anhbia.png", tag: "Di Sản", title: "Áo Dài Tơ Tằm Thêu Sen", 
      price: "280k/ngày", originalPrice: "3.800.000đ", aspect: "aspect-[3/4]",
      eco: "-15.0kg CO₂", passport: "CLP-0015", rentals: "22 lượt", rating: "5.0★",
      modelFit: "Cao 1m60 - 1m68 • Size S/M",
      description: "Lụa tơ tằm truyền thống thêu tay hoa sen tinh xảo gìn giữ 15 năm.",
      occasion: "Lễ Tết, Cưới Hỏi, Du Xuân Hội An"
    },
    { 
      id: "m3-2", img: "/step2_bag.jpg", tag: "Bao Bì", title: "Túi Đóng Gói Tuần Hoàn", 
      price: "Tái Sử Dụng", originalPrice: "Zero-Waste", aspect: "aspect-[4/5]",
      eco: "-3.2kg Rác Thải", passport: "CLP-BAG", rentals: "Tái Sinh", rating: "5.0★",
      modelFit: "Chất liệu chống thấm tái chế",
      description: "Bao bì thời trang thay thế hoàn toàn túi nilon một lần.",
      occasion: "Bảo Vệ Sinh Thái"
    },
    { 
      id: "m3-3", img: "/1.2.jpg", tag: "Streetwear", title: "Áo Khoác Da Biker 90s", 
      price: "250k/ngày", originalPrice: "4.200.000đ", aspect: "aspect-[3/4]",
      eco: "-18.5kg CO₂", passport: "CLP-6612", rentals: "11 lượt", rating: "4.9★",
      modelFit: "Cao 1m65 - 1m75 • Size L",
      description: "Da thật lên màu patina thời gian cực chất, khóa kéo kim loại cổ điển.",
      occasion: "Dạo Phố, Concert, Night Club"
    },
    { 
      id: "m3-4", img: "/2.2.jpg", tag: "Dạ Tiệc", title: "Đầm Xòe Công Chúa", 
      price: "320k/ngày", originalPrice: "4.800.000đ", aspect: "aspect-[4/5]",
      eco: "-10.5kg CO₂", passport: "CLP-3341", rentals: "15 lượt", rating: "5.0★",
      modelFit: "Cao 1m63 • Nặng 47kg • Size S",
      description: "Tùng váy phồng nhiều lớp lót voan bồng bềnh như truyện cổ tích.",
      occasion: "Sinh Nhật, Prom, Kỷ Niệm"
    },
  ],
  // Cột 4: Trôi xuống (ở giữa)
  [
    { 
      id: "m4-1", img: "/hero_group.jpg", tag: "Tái Sinh", title: "Set Đồ Upcycled Denim", 
      price: "160k/ngày", originalPrice: "2.200.000đ", aspect: "aspect-[16/10]",
      eco: "-22.1kg CO₂", passport: "CLP-UPCY", rentals: "20 lượt", rating: "5.0★",
      modelFit: "Free size • Unisex cá tính",
      description: "Tái chế từ 12 mảnh vải denim quần jean cũ, độc bản duy nhất.",
      occasion: "Biểu Diễn, Fashion Show, Chụp Ảnh"
    },
    { 
      id: "m4-2", img: "/1.1 (1).jpg", tag: "Gala Night", title: "Đầm Xẻ Tà Hoàng Gia", 
      price: "350k/ngày", originalPrice: "5.000.000đ", aspect: "aspect-[3/4]",
      eco: "-13.0kg CO₂", passport: "CLP-8812", rentals: "13 lượt", rating: "5.0★",
      modelFit: "Cao 1m67 • Nặng 49kg • Size S",
      description: "Dáng đầm xẻ cao khoe trọn đôi chân thon thả, đính ngọc trai tinh tế.",
      occasion: "Tiệc Tối Sang Trọng, Gala"
    },
    { 
      id: "m4-3", img: "/step3_party.jpg", tag: "Tỏa Sáng", title: "Khoảnh Khắc Đêm Tiệc", 
      price: "Kỷ Niệm", originalPrice: "Vô Giá", aspect: "aspect-[4/5]",
      eco: "100% Cảm Xúc", passport: "CLP-MEM", rentals: "Vòng Đời Mới", rating: "5.0★",
      modelFit: "Cùng hàng ngàn cô gái tỏa sáng",
      description: "Những nụ cười và khoảnh khắc đáng nhớ nhất cùng tủ đồ CLOOP.",
      occasion: "Mọi Khoảnh Khắc Đẹp"
    },
    { 
      id: "m4-4", img: "/kinhgucci.webp", tag: "Phụ Kiện", title: "Kính Mắt Cat-Eye Vintage", 
      price: "Pass 300k", originalPrice: "1.800.000đ", aspect: "aspect-square",
      eco: "-2.1kg CO₂", passport: "CLP-ACC1", rentals: "Pass Lại", rating: "4.8★",
      modelFit: "Gọng đồi mồi chính hãng",
      description: "Phụ kiện hoàn thiện phong cách cổ điển thanh lịch.",
      occasion: "Dạo Phố, Cafe Cuối Tuần"
    },
  ],
  // Cột 5: Trôi lên
  [
    { 
      id: "m5-1", img: "/2.1 (1).jpg", tag: "Cocktail", title: "Đầm Tiệc Trắng Lụa Ren", 
      price: "220k/ngày", originalPrice: "3.100.000đ", aspect: "aspect-[3/4]",
      eco: "-8.7kg CO₂", passport: "CLP-2114", rentals: "10 lượt", rating: "4.9★",
      modelFit: "Cao 1m64 • Nặng 47kg • Size S",
      description: "Chi tiết ren thêu tay thủ công mềm mại, tôn vẻ đẹp thuần khiết.",
      occasion: "Tiệc Cưới, Hẹn Hò Lãng Mạn"
    },
    { 
      id: "m5-2", img: "/bootvanlentino.webp", tag: "Phụ Kiện", title: "Boots Da Thật Cao Cổ", 
      price: "Pass 1.2Tr", originalPrice: "6.500.000đ", aspect: "aspect-[4/5]",
      eco: "-16.4kg CO₂", passport: "CLP-BOT1", rentals: "Pass Mới 98%", rating: "5.0★",
      modelFit: "Size 37 - 38",
      description: "Chất da bê cao cấp, gót trụ chắc chắn giúp kéo dài đôi chân.",
      occasion: "Mùa Đông, Chụp Ảnh Lookbook"
    },
    { 
      id: "m5-3", img: "/vintage_coat.jpg", tag: "Di Sản", title: "Túi Xách Da Archive", 
      price: "Pass 2.5Tr", originalPrice: "8.000.000đ", aspect: "aspect-[3/4]",
      eco: "-19.0kg CO₂", passport: "CLP-BAG2", rentals: "Bộ Sưu Tập", rating: "5.0★",
      modelFit: "Da thật nguyên tấm",
      description: "Mẫu túi hiếm thập niên 90 được bảo quản hoàn hảo.",
      occasion: "Sưu Tầm, Đi Tiệc"
    },
    { 
      id: "m5-4", img: "/evening_dress.jpg", tag: "Prom", title: "Váy Sequin Lấp Lánh Emerald", 
      price: "380k/ngày", originalPrice: "5.500.000đ", aspect: "aspect-square",
      eco: "-14.5kg CO₂", passport: "CLP-9923", rentals: "17 lượt", rating: "5.0★",
      modelFit: "Cao 1m65 - 1m70 • Size S",
      description: "Sắc xanh ngọc lục bảo huyền bí, lấp lánh như viên ngọc trong đêm.",
      occasion: "Dạ Hội, Thảm Đỏ"
    },
  ],
  // Cột 6: Trôi xuống
  [
    { 
      id: "m6-1", img: "/1.3.jpeg", tag: "Cá Tính", title: "Blazer Oversized Phong Cách Hàn", 
      price: "210k/ngày", originalPrice: "2.900.000đ", aspect: "aspect-[3/4]",
      eco: "-9.1kg CO₂", passport: "CLP-1309", rentals: "11 lượt", rating: "4.9★",
      modelFit: "Free size • Rộng rãi thoải mái",
      description: "Form suông thời thượng dễ phối cùng váy lụa hoặc quần ống rộng.",
      occasion: "Đi Làm, Đi Chơi, Sự Kiện"
    },
    { 
      id: "m6-2", img: "/2.2 (1).jpg", tag: "Thanh Lịch", title: "Đầm Dạ Hội Ren Pháp", 
      price: "340k/ngày", originalPrice: "4.600.000đ", aspect: "aspect-[4/5]",
      eco: "-11.4kg CO₂", passport: "CLP-2281", rentals: "14 lượt", rating: "5.0★",
      modelFit: "Cao 1m66 • Nặng 49kg • Size S",
      description: "Chất ren hoa dập nổi cao cấp, lót lụa satin êm ái.",
      occasion: "Dạ Tiệc, Lễ Đính Hôn"
    },
    { 
      id: "m6-3", img: "/3.1.jpg", tag: "Tối Giản", title: "Set Váy Satin Minimalist", 
      price: "260k/ngày", originalPrice: "3.400.000đ", aspect: "aspect-[3/4]",
      eco: "-8.3kg CO₂", passport: "CLP-3105", rentals: "8 lượt", rating: "4.8★",
      modelFit: "Cao 1m63 • Nặng 46kg • Size S",
      description: "Thiết kế tối giản thời thượng với đường nhún eo tinh xảo.",
      occasion: "Tiệc Trà Chiều, Dạo Phố"
    },
    { 
      id: "m6-4", img: "/hero_warm.jpg", tag: "Mùa Thu", title: "Áo Khoác Trench Coat", 
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
    <section 
      className="relative w-full min-h-[620px] sm:min-h-[680px] md:min-h-[740px] lg:min-h-[800px] bg-[#071C12] overflow-hidden flex items-center justify-center select-none border-b border-[#0F3120] transform-gpu"
      style={{ contain: "content" }}
    >
      
      {/* 🖼️ WALL-TO-WALL LIVING PHOTO CANVAS: 6 Cột Ảnh Kín Toàn Bộ Màn Hình (Không Trống Trải) */}
      <div className="absolute inset-0 w-full h-full overflow-hidden grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 md:gap-3 p-2 sm:p-3 pointer-events-auto transform-gpu opacity-90 hover:opacity-100 transition-opacity duration-500">
        {FULL_MOSAIC_COLUMNS.map((column, colIdx) => {
          const isOdd = colIdx % 2 !== 0;
          return (
            <motion.div
              key={colIdx}
              animate={{
                y: isOdd ? [-20, 20, -20] : [20, -20, 20],
              }}
              transition={{
                duration: 20 + colIdx * 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ willChange: "transform", backfaceVisibility: "hidden" }}
              className={`flex flex-col gap-2.5 md:gap-3 transform-gpu ${colIdx === 5 ? 'hidden lg:flex' : ''} ${colIdx === 4 ? 'hidden md:flex' : ''}`}
            >
              {column.map((card) => (
                <div key={card.id} className="relative group transform-gpu">
                  
                  {/* ✨ PULSING NEON MATCHA GLOW HALO */}
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#A3E39F] via-white to-[#A3E39F] opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300 pointer-events-none z-0" />

                  <div
                    onClick={() => setSelectedItem(card)}
                    className={`relative w-full ${card.aspect} rounded-2xl overflow-hidden bg-[#0A2215] border border-white/20 hover:border-[#A3E39F] shadow-lg hover:shadow-[0_0_45px_rgba(163,227,159,0.9),_0_0_18px_rgba(255,255,255,0.75)] hover:ring-2 hover:ring-white transition-all duration-300 hover:scale-108 hover:z-50 cursor-pointer block z-10`}
                  >
                    {/* Glowing & Brightening Image */}
                    <Image
                      src={card.img}
                      alt={card.title}
                      fill
                      sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 18vw"
                      className="object-cover transition-all duration-500 group-hover:scale-112 brightness-105 group-hover:brightness-135 group-hover:contrast-105 opacity-90 group-hover:opacity-100"
                      unoptimized
                    />

                    {/* ✨ LUMINOUS GLASS SHIMMER OVERLAY */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#A3E39F]/35 via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none mix-blend-overlay" />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent pointer-events-none group-hover:opacity-50 transition-opacity" />

                    {/* Top Left: Tag Pill */}
                    <div className="absolute top-2 left-2 z-20">
                      <span className="text-[7.5px] uppercase font-bold tracking-wider bg-black/70 group-hover:bg-[#A3E39F] text-[#A3E39F] group-hover:text-[#07190F] group-hover:shadow-[0_0_15px_rgba(163,227,159,1)] px-2.5 py-0.5 rounded-full border border-white/18 group-hover:border-white font-ui shadow-xs transition-colors duration-200">
                        {card.tag}
                      </span>
                    </div>

                    {/* Top Right: Live Eco Impact Chip (Reveals on hover) */}
                    <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="text-[7px] uppercase font-bold tracking-wider bg-[#0A2517]/95 text-[#A3E39F] px-2 py-0.5 rounded-full border border-[#A3E39F]/60 font-ui shadow-xs flex items-center gap-1">
                        <Leaf size={7} /> {card.eco}
                      </span>
                    </div>

                    {/* Bottom Info: Title, Price & Live Rentals */}
                    <div className="absolute bottom-0 left-0 w-full p-2.5 text-white transform translate-y-0.5 group-hover:translate-y-0 transition-transform z-20">
                      <p className="text-[10px] sm:text-[11px] font-heading font-bold leading-tight line-clamp-1 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,1)] transition-all">
                        {card.title}
                      </p>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[9px] sm:text-[9.5px] text-[#A3E39F] group-hover:text-[#D4FFD0] font-mono font-bold group-hover:drop-shadow-[0_0_8px_rgba(163,227,159,1)] transition-all">
                          {card.price}
                        </p>
                        <span className="text-[8px] text-stone-300 font-ui opacity-0 group-hover:opacity-100 transition-opacity">
                          {card.rentals}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </motion.div>
          );
        })}
      </div>

      {/* 🍵 DEEP CENTER SPOTLIGHT MASK: Đè chìm ảnh ở tâm xuống để chữ trắng nổi bần bật, xung quanh vẫn sáng rõ */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(7,24,15,0.92)_0%,_rgba(7,24,15,0.82)_35%,_rgba(7,24,15,0.35)_70%,_rgba(5,18,10,0.85)_100%)] pointer-events-none z-20" />

      {/* 🌟 CENTERPIECE CONTENT: Chữ Trắng Bật Sắc Nét, Không Bị Chìm, Đầy Đủ Tính Năng */}
      <div className="relative z-30 max-w-3xl mx-auto px-4 text-center flex flex-col items-center justify-center pointer-events-auto my-auto py-8">
        
        {/* Top Matcha Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-[#A3E39F]/50 text-[#A3E39F] text-[10.5px] font-bold uppercase tracking-widest mb-3.5 shadow-lg font-ui">
          <span className="w-2 h-2 rounded-full bg-[#A3E39F] animate-pulse"></span>
          Tủ Đồ Tuần Hoàn Sinh Thái 2026
        </div>

        {/* Big Bold Solid White Title */}
        <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-[84px] font-extrabold text-white tracking-tight leading-none mb-3.5 drop-shadow-[0_4px_30px_rgba(0,0,0,0.95)]">
          CLOOP
        </h1>

        {/* Poetic & High-Fashion Tagline */}
        <p className="font-body text-xs sm:text-sm md:text-[15px] text-stone-100 font-normal leading-relaxed max-w-lg mx-auto mb-6 drop-shadow-[0_2px_14px_rgba(0,0,0,0.9)]">
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
            className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white/20 hover:bg-white/30 text-white border border-white/35 backdrop-blur-md font-heading font-bold text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 shadow-md hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group font-ui"
          >
            <Camera size={15} className="text-[#A3E39F] group-hover:scale-110 transition-transform" />
            <span>Tìm Bằng Ảnh AI</span>
          </button>
        </div>

        {/* Micro Search Bar with Quick Trending Tags */}
        <div className="mt-6 w-full max-w-md space-y-2.5">
          <div className="relative flex items-center bg-black/55 backdrop-blur-md border border-white/30 rounded-full px-3.5 py-1.5 shadow-inner focus-within:border-white/70 transition-all">
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
            <span className="text-[9px] uppercase font-bold text-stone-300 font-ui">Xu hướng:</span>
            {[
              { label: "Đầm Dạ Hội", q: "dạ hội" },
              { label: "Set Tweed", q: "tweed" },
              { label: "Áo Dài", q: "áo dài" },
              { label: "Blazer 90s", q: "blazer" }
            ].map((chip, idx) => (
              <Link
                key={idx}
                href={`/shop?q=${encodeURIComponent(chip.q)}`}
                className="text-[9px] font-bold text-stone-200 hover:text-white bg-black/40 hover:bg-white/20 px-2.5 py-0.5 rounded-full border border-white/15 transition-colors font-ui"
              >
                #{chip.label}
              </Link>
            ))}
          </div>
        </div>

        {/* 🌿 Live ESG Mini Metrics Ticker */}
        <div className="mt-7 pt-4 border-t border-white/15 grid grid-cols-3 gap-4 sm:gap-8 text-center w-full max-w-lg">
          <div>
            <p className="font-heading font-extrabold text-base sm:text-lg text-white">2.450+</p>
            <p className="text-[9px] uppercase font-bold text-stone-300 font-ui">Trang Phục</p>
          </div>
          <div>
            <p className="font-heading font-extrabold text-base sm:text-lg text-[#A3E39F] flex items-center justify-center gap-1">
              <Leaf size={13} className="text-[#A3E39F]" /> -18.2 Tấn
            </p>
            <p className="text-[9px] uppercase font-bold text-stone-300 font-ui">Giảm CO₂</p>
          </div>
          <div>
            <p className="font-heading font-extrabold text-base sm:text-lg text-amber-300 flex items-center justify-center gap-1">
              <Star size={13} className="fill-current text-amber-400" /> 4.9★
            </p>
            <p className="text-[9px] uppercase font-bold text-stone-300 font-ui">1.8k Đánh Giá</p>
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
