"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ArrowRight, 
  Check, 
  Star, 
  Heart, 
  Bookmark, 
  Flame, 
  Search, 
  TrendingUp, 
  Camera, 
  ShieldCheck, 
  RotateCcw, 
  Leaf, 
  Compass,
  SlidersHorizontal,
  Tag,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import MagneticButton from "@/app/components/MagneticButton";
import { supabase } from "@/lib/supabase";
import ProductLikeSaveButtons from "@/components/ProductLikeSaveButtons";
import { getTrendingProductsAction } from "@/app/actions/favorite";
import VisualSearchModal from "@/app/components/VisualSearchModal";
import LivePulseTicker from "@/app/components/LivePulseTicker";
import EcoImpactCalculator from "@/app/components/EcoImpactCalculator";

export default function Home() {
  const [activeRentalCategory, setActiveRentalCategory] = useState("Tất cả");
  const rentalCategories = ["Tất cả", "Dạ hội & Gala", "Tiệc cưới", "Áo dài", "Vintage 90s", "Tối giản"];

  const [activeResaleCategory, setActiveResaleCategory] = useState("Tất cả");
  const resaleCategories = ["Tất cả", "Túi xách", "Phụ kiện", "Áo khoác", "Váy thiết kế", "Giày & Boots"];

  const [activeCard, setActiveCard] = useState(0);
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [boostedProducts, setBoostedProducts] = useState<any[]>([]);

  // Lấy dữ liệu sản phẩm thịnh hành từ Database
  useEffect(() => {
    async function fetchTrending() {
      try {
        const res = await getTrendingProductsAction(24);
        if (res.success && res.products && res.products.length > 0) {
          setBoostedProducts(res.products);
          return;
        }
      } catch (e) {}

      // Fallback query từ Supabase
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, title, name, province, condition, size, brand, owner_name, ownerName, userId, user_id, original_price, originalPrice, rental_price, occasion, image_url, imageUrl, boostExpiresAt, isHighlighted, likeCount, saveCount,
          user:User(name, avatar),
          images:ProductImage(url, isPrimary),
          listings:Listing(basePrice, status)
        `)
        .order("likeCount", { ascending: false })
        .limit(24);
        
      if (!error && data) {
        setBoostedProducts(data);
      }
    }
    fetchTrending();
  }, []);

  const moodCapsules = [
    { 
      id: "Gala", 
      title: "Dạ Hội & Tiệc Đêm", 
      tag: "Silk & Evening Gala",
      desc: "Lụa satin óng ả, sequin lấp lánh & dáng váy dạ vũ.", 
      image: "/evening_dress.jpg",
      link: "/shop?category=Dạ hội"
    },
    { 
      id: "Capsule", 
      title: "Tối Giản Thường Nhật", 
      tag: "Organic Linen",
      desc: "Sợi linen tự nhiên, blazer thanh lịch & set đồ capsule.", 
      image: "/macro_fabric.jpg",
      link: "/shop?category=Đi tiệc"
    },
    { 
      id: "Archive", 
      title: "Vintage & Di Sản", 
      tag: "90s Rare Archive",
      desc: "Archive thập niên 90s, dạ tweed & nét đẹp độc bản.", 
      image: "/vintage_coat.jpg",
      link: "/shop?category=Vintage"
    },
    { 
      id: "Heritage", 
      title: "Áo Dài Di Sản", 
      tag: "Heritage Silk",
      desc: "Gấm thêu tay & tơ tằm mềm mại cho dịp trang trọng.", 
      image: "/anhbia.png",
      link: "/shop?category=Áo dài"
    }
  ];

  const communityLookbookReel = [
    { src: "/1.1.jpg", hover: "/1.1 (1).jpg", title: "Đầm Lụa Satin", price: "350k/ngày", user: "@the.archive", tag: "Gala Prom" },
    { src: "/1.2.jpeg", hover: "/step2_bag.jpg", title: "Set Dạ Tweed", price: "180k/ngày", user: "@leena.vintage", tag: "Paris Chic" },
    { src: "/2.1.jpg", hover: "/2.1 (1).jpg", title: "Đầm Cúp Ngực", price: "220k/ngày", user: "@minimal.edit", tag: "Minimalist" },
    { src: "/anhbia.png", hover: "/hero_warm.jpg", title: "Áo Dài Gấm Xưa", price: "280k/ngày", user: "@heritage.silk", tag: "Truyền Thống" },
    { src: "/1.2.jpg", hover: "/step3_party.jpg", title: "Biker Jacket Da", price: "250k/ngày", user: "@dustin.style", tag: "Vintage 90s" },
    { src: "/evening_dress.jpg", hover: "/step1_phone.jpg", title: "Váy Dạ Vũ Sequin", price: "380k/ngày", user: "@chloe.party", tag: "Cocktail" },
    { src: "/vintage_coat.jpg", hover: "/macro_fabric.jpg", title: "Blazer Dạ 1998", price: "190k/ngày", user: "@olivia.chic", tag: "Rare Archive" },
    { src: "/hero_group.jpg", hover: "/hero_warm.jpg", title: "Set Streetwear Tái Sinh", price: "160k/ngày", user: "@chic.street", tag: "Upcycled" },
  ];

  const featuredClosets = [
    {
      id: 0,
      username: 'leena.vintage',
      tag: 'TOP ROTATOR',
      trustScore: '99.4/100',
      ecoBadge: '🌿 180kg CO₂ Saved',
      bio: 'Đam mê lụa Pháp & đồ Tweed. Tuyển chọn từng đường kim mũi chỉ.',
      mainImg: '/vintage_coat.jpg',
      items: ['/evening_dress.jpg', '/macro_fabric.jpg', '/step2_bag.jpg'],
    },
    {
      id: 1,
      username: 'chic.street',
      tag: 'TRENDSETTER',
      trustScore: '98.8/100',
      ecoBadge: '🌿 145kg CO₂ Saved',
      bio: 'Streetwear cá tính, unisex và những món đồ upcycled độc bản.',
      mainImg: '/anhbia.png',
      items: ['/hero_group.jpg', '/hero_warm.jpg', '/step1_phone.jpg'],
    },
    {
      id: 2,
      username: 'the.archive',
      tag: 'RARE ARCHIVE',
      trustScore: '99.8/100',
      ecoBadge: '🌿 230kg CO₂ Saved',
      bio: 'Kho báu vintage thập niên 90s từ các nhà mốt lớn.',
      mainImg: '/hero_group.jpg',
      items: ['/vintage_coat.jpg', '/step2_bag.jpg', '/evening_dress.jpg'],
    },
    {
      id: 3,
      username: 'minimal.edit',
      tag: 'SUSTAINABLE',
      trustScore: '99.1/100',
      ecoBadge: '🌿 190kg CO₂ Saved',
      bio: 'Tối giản, thanh lịch. Tủ đồ capsule xoay vòng hiện đại.',
      mainImg: '/evening_dress.jpg',
      items: ['/macro_fabric.jpg', '/vintage_coat.jpg', '/step2_bag.jpg'],
    },
  ];

  const rentalCatalog = [
    { id: 101, title: "Váy Dạ Hội Xẻ Tà Lụa Satin", price: 350000, origPrice: 3500000, img: "/1.1.jpg", hoverImg: "/1.1 (1).jpg", user: "@the.archive", tag: "Top Rent" },
    { id: 102, title: "Set Dạ Tweed Cổ Điển Parisienne", price: 180000, origPrice: 2200000, img: "/1.2.jpeg", hoverImg: "/step2_bag.jpg", user: "@leena.vintage", tag: "Chic" },
    { id: 103, title: "Đầm Dạ Tiệc Tối Giản Cúp Ngực", price: 220000, origPrice: 2800000, img: "/2.1.jpg", hoverImg: "/2.1 (1).jpg", user: "@minimal.edit", tag: "Minimal" },
    { id: 104, title: "Áo Dài Tơ Tằm Gấm Thêu Tay", price: 280000, origPrice: 3800000, img: "/anhbia.png", hoverImg: "/hero_warm.jpg", user: "@heritage.silk", tag: "Di Sản" },
    { id: 105, title: "Jacket Da Biker Bụi Bặm 90s", price: 250000, origPrice: 4200000, img: "/1.2.jpg", hoverImg: "/step3_party.jpg", user: "@dustin.style", tag: "Archive" },
    { id: 106, title: "Đầm Sequin Kim Tuyến Đêm Prom", price: 320000, origPrice: 3900000, img: "/evening_dress.jpg", hoverImg: "/step1_phone.jpg", user: "@chloe.party", tag: "Gala" },
  ];

  const resaleItems = [
    { src: "/vintage_coat.jpg", hoverSrc: "/macro_fabric.jpg", title: "Túi Xách Da Cao Cấp (Pass Nhanh)", price: "2.500.000đ", originalPrice: "5.000.000đ", discount: "-50%", owner: "@emma.closet" },
    { src: "/kinhgucci.webp", hoverSrc: "/anhbia.png", title: "Kính Râm Cat-Eye Cổ Điển", price: "300.000đ", originalPrice: "1.000.000đ", discount: "-70%", owner: "@lucy.vintage" },
    { src: "/bootvanlentino.webp", hoverSrc: "/hero_warm.jpg", title: "Boots Cổ Cao Da Thật", price: "1.200.000đ", originalPrice: "3.000.000đ", discount: "-60%", owner: "@david.kicks" },
    { src: "/evening_dress.jpg", hoverSrc: "/step3_party.jpg", title: "Jacket Da Biker Phong Trần", price: "1.800.000đ", originalPrice: "4.500.000đ", discount: "-60%", owner: "@sarah.style" },
    { src: "/2.1.jpg", hoverSrc: "/2.1 (1).jpg", title: "Đầm Lụa Thiết Kế Độc Bản", price: "1.450.000đ", originalPrice: "3.200.000đ", discount: "-55%", owner: "@minimal.edit" },
    { src: "/1.2.jpeg", hoverSrc: "/step2_bag.jpg", title: "Áo Khoác Dạ Tweed Cao Cấp", price: "1.100.000đ", originalPrice: "2.600.000đ", discount: "-58%", owner: "@leena.vintage" },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden antialiased bg-[#FAF9F5] text-[#0A2517] pb-28 md:pb-0 font-body">

      {/* SECTION 1: HERO - CINEMATIC FULL-WIDTH FASHION BANNER */}
      <section className="relative w-full aspect-[16/9] min-h-[460px] md:min-h-[520px] lg:min-h-[560px] max-h-[75vh] flex items-center justify-start overflow-hidden bg-stone-900">
        
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/anhbia.png"
          className="absolute inset-0 w-full h-full object-cover object-[center_20%]"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
          <source src="/hero.mp4" type="video/mp4" />
        </video>

        {/* Ambient Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10 pointer-events-none" />

        {/* Hero Content */}
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 py-8 z-20 relative flex flex-col justify-center items-start text-left">
          <div className="max-w-2xl">
            
            {/* Tagline Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-0.5 rounded-md bg-[#28422A]/90 backdrop-blur-md border border-[#A3E39F]/40 text-[#A3E39F] text-[11px] font-bold uppercase tracking-widest mb-3 shadow-md font-ui"
            >
              <span className="w-2 h-2 rounded-full bg-[#A3E39F] animate-pulse"></span>
              Thời Trang Tuần Hoàn Sinh Thái
            </motion.div>

            {/* Main Heading */}
            <motion.h1 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: { staggerChildren: 0.08 }
                }
              }}
              className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-extrabold text-white leading-snug md:leading-[1.18] mb-3 tracking-normal drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
            >
              {["Thuê", "&", "Sở", "Hữu"].map((word, i) => (
                <motion.span key={i} className="inline-block mr-2" variants={{ hidden: { y: 15, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } } }}>
                  {word}
                </motion.span>
              ))}
              <br />
              {["Thời", "Trang"].map((word, i) => (
                <motion.span key={i+10} className="inline-block mr-2 text-[#A3E39F] drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]" variants={{ hidden: { y: 15, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } } }}>
                  {word}
                </motion.span>
              ))}
              {" "}
              {["Tuần", "Hoàn"].map((word, i) => (
                <motion.span key={i+20} className="inline-block mr-2" variants={{ hidden: { y: 15, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } } }}>
                  {word}
                </motion.span>
              ))}
            </motion.h1>

            {/* Subtext */}
            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="font-body text-xs sm:text-sm text-stone-200 leading-relaxed mb-5 md:mb-6 max-w-lg drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)] font-light"
            >
              Tủ đồ xoay vòng vô tận từ những người sành thời trang. Tiết kiệm 90% chi phí mua mới & bảo tồn tài nguyên sinh thái.
            </motion.p>

            {/* Smart Search Bar with AI Visual Search */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="w-full max-w-lg mb-6 relative group"
            >
              <div className="relative flex items-center bg-white/95 backdrop-blur-md border border-white/60 rounded-xl p-1.5 shadow-2xl focus-within:ring-2 focus-within:ring-[#37503F] transition-all gap-1.5">
                <Search size={16} className="text-stone-400 ml-2 mr-1 shrink-0" />
                <input 
                  type="text" 
                  placeholder="Tìm Blazer linen, đầm dạ hội, áo dài gấm..." 
                  className="flex-1 bg-transparent border-none outline-none font-ui text-xs md:text-sm text-[#0A2517] placeholder:text-stone-400 font-medium min-w-0"
                />

                {/* AI Visual Search Button */}
                <button
                  type="button"
                  onClick={() => setIsVisualSearchOpen(true)}
                  className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#EBF3E8] hover:bg-[#D8EADB] text-[#244228] border border-[#BED7BC] font-ui text-xs font-bold transition-all shadow-xs group/cam shrink-0 hover:scale-105 active:scale-95"
                  title="Tìm trang phục tương tự bằng ảnh Lookbook / Pinterest"
                >
                  <Camera size={14} className="text-[#3F6B44] group-hover/cam:scale-110 transition-transform" />
                  <span className="hidden sm:inline font-semibold text-[11px]">Tìm bằng ảnh</span>
                </button>

                <Link
                  href="/shop"
                  className="px-4 py-1.5 bg-[#37503F] text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#2A4232] transition-colors shrink-0 shadow-xs flex items-center justify-center font-ui"
                >
                  Tìm kiếm
                </Link>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="flex flex-row w-full sm:w-auto items-center gap-3"
            >
              <MagneticButton>
                <Link href="/shop" className="group font-ui font-bold text-xs px-5 h-[42px] bg-white text-[#183A2D] hover:bg-[#FAF7F0] rounded-lg shadow-lg transition-all duration-300 tracking-wide flex items-center justify-center gap-2 relative z-10 flex-1 sm:flex-initial">
                  KHÁM PHÁ TỦ ĐỒ <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </MagneticButton>
              
              <MagneticButton>
                <Link href="/my-closet" className="font-ui font-bold text-xs px-5 h-[42px] bg-black/40 hover:bg-black/60 text-white border border-white/30 backdrop-blur-md rounded-lg transition-all duration-300 tracking-wide flex items-center justify-center relative z-10 flex-1 sm:flex-initial shadow-md">
                  CHIA SẺ TỦ ĐỒ
                </Link>
              </MagneticButton>
            </motion.div>

          </div>
        </div>
      </section>

      {/* 🔴 LIVE CIRCULAR PULSE TICKER: Nhịp đập tuần hoàn */}
      <LivePulseTicker />

      {/* 📸 BY ROTATION STYLE: INFINITE COMMUNITY LOOKBOOK REEL (DẢI TRANG PHỤC ĐANG ĐƯỢC THUÊ) */}
      <section className="w-full py-8 bg-[#F4F1EA] border-b border-stone-200/80 overflow-hidden">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 mb-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
            <h3 className="font-heading text-sm sm:text-base font-bold text-[#183A2D] uppercase tracking-wider">
              Trending On Rotators • Đang Được Mặc Nhiều Nhất
            </h3>
          </div>
          <Link href="/shop" className="text-xs font-semibold text-[#28422A] hover:underline font-ui">
            Xem tất cả &rarr;
          </Link>
        </div>

        {/* Dense Horizontal Glide Stream */}
        <div className="flex gap-3.5 overflow-x-auto no-scrollbar px-4 md:px-8 pb-2">
          {communityLookbookReel.map((item, index) => (
            <Link
              key={index}
              href="/shop"
              className="group w-[170px] sm:w-[200px] md:w-[220px] shrink-0 bg-white rounded-xl overflow-hidden border border-stone-200/80 hover:border-[#37503F] hover:shadow-md transition-all flex flex-col"
            >
              <div className="relative aspect-[3/4] bg-stone-100 overflow-hidden">
                <Image src={item.src} alt={item.title} fill className="object-cover transition-opacity duration-700 opacity-100 group-hover:opacity-0" unoptimized />
                <Image src={item.hover} alt={item.title} fill className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-100" unoptimized />
                <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[8px] font-mono px-2 py-0.5 rounded-sm">
                  {item.tag}
                </div>
              </div>
              <div className="p-2.5 space-y-1">
                <p className="text-[9px] text-stone-400 font-ui uppercase line-clamp-1">{item.user}</p>
                <h4 className="text-xs font-heading font-bold text-[#183A2D] line-clamp-1 group-hover:text-emerald-800 transition-colors">
                  {item.title}
                </h4>
                <div className="flex justify-between items-center pt-0.5 border-t border-stone-100 text-[11px]">
                  <span className="font-extrabold text-[#183A2D] font-mono">{item.price}</span>
                  <span className="text-[9px] text-emerald-800 font-bold uppercase">Thuê ngay</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION 2: CURATED MOOD CAPSULES (Khám phá phong cách theo cảm xúc & dịp sống) */}
      <section className="w-full max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 py-14">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 mb-6">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#2A4B2E] bg-[#E5EFE2] px-2.5 py-0.5 rounded-md border border-[#C5DAC2] font-ui">
              BỘ SƯU TẬP THEO CẢM XÚC
            </span>
            <h2 className="font-heading text-xl md:text-3xl text-[#183A2D] font-extrabold tracking-normal mt-1.5">
              Phong Cách Dành Riêng Cho Dịp Của Bạn
            </h2>
          </div>

          <Link 
            href="/shop" 
            className="font-ui text-xs font-bold uppercase tracking-widest text-[#2A4B2E] hover:text-[#183A2D] flex items-center gap-1.5 group shrink-0"
          >
            Tất cả phong cách <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 4 Graceful Visual Portrait Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {moodCapsules.map((capsule) => (
            <Link
              key={capsule.id}
              href={capsule.link}
              className="group relative aspect-[3/4] sm:aspect-[4/5] rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-700 flex flex-col justify-end p-5 cursor-pointer border border-[#E0ECE0]/80"
            >
              <Image 
                src={capsule.image} 
                alt={capsule.title} 
                fill 
                className="object-cover transition-transform duration-1000 ease-out group-hover:scale-108 brightness-[0.82] group-hover:brightness-[0.75]" 
                unoptimized 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0C1E12]/95 via-[#0C1E12]/35 to-transparent pointer-events-none" />

              <div className="absolute top-3.5 left-3.5 z-10">
                <span className="text-[8.5px] uppercase tracking-widest font-bold text-[#234227] bg-[#F3F7F1]/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-[#D5E4D1]">
                  {capsule.tag}
                </span>
              </div>

              <div className="relative z-10 space-y-1.5 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-500">
                <h3 className="font-heading text-lg sm:text-xl font-bold text-white leading-snug drop-shadow-sm">
                  {capsule.title}
                </h3>
                <p className="text-[11.5px] text-stone-200 font-body font-light leading-relaxed line-clamp-2 italic drop-shadow-xs">
                  {capsule.desc}
                </p>
                <div className="pt-2 flex items-center gap-1.5 text-xs font-semibold text-[#A8D3A3] group-hover:text-white transition-colors font-ui">
                  <span className="uppercase text-[10px] tracking-wider">Khám Phá Tủ Đồ</span>
                  <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION 3: SÀN CHO THUÊ TUYỂN CHỌN DENSE GRID (TRENDING RENTALS 6-COLUMN LOOKBOOK) */}
      <section className="w-full max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 py-14 border-t border-stone-200/70">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4 border-b border-stone-200 pb-3">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/60 font-ui">
              TIẾT KIỆM ĐẾN 90%
            </span>
            <h2 className="text-xl md:text-3xl font-heading font-extrabold text-[#0A2517] tracking-normal mt-1.5">
              Trang Phục Cho Thuê Thịnh Hành
            </h2>
          </div>
          
          <div className="flex items-center gap-5 lg:gap-6 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 hide-scrollbar shrink-0">
            <div className="flex items-center gap-5 lg:gap-6 text-xs font-bold uppercase tracking-wider text-stone-500 font-ui shrink-0">
              {rentalCategories.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setActiveRentalCategory(cat)}
                  className={`pb-1 shrink-0 transition-all cursor-pointer ${activeRentalCategory === cat ? 'text-[#183A2D] border-b-2 border-[#183A2D]' : 'hover:text-[#183A2D] border-b-2 border-transparent hover:border-[#183A2D]'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="hidden md:block w-px h-4 bg-gray-300"></div>

            <Link 
              href="/shop" 
              className="group font-ui text-xs font-bold text-[#0A2517] hover:text-emerald-800 uppercase tracking-widest flex items-center gap-1 shrink-0"
            >
              Khám Phá Tất Cả <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Dense 6-Column High-Fashion Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 md:gap-4">
          {rentalCatalog.map((product) => (
            <div key={product.id} className="group flex flex-col bg-white p-2.5 rounded-xl border border-stone-200/70 hover:border-[#37503F] hover:shadow-md transition-all">
              <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden rounded-lg mb-2.5">
                <Image src={product.img} alt={product.title} fill className="object-cover transition-opacity duration-700 opacity-100 group-hover:opacity-0" unoptimized />
                <Image src={product.hoverImg} alt={product.title} fill className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-100" unoptimized />
                <div className="absolute top-2 left-2 bg-black/75 text-white font-ui text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-sm tracking-widest shadow-xs z-10">
                  {product.tag}
                </div>
              </div>

              <div className="flex flex-col flex-1 justify-between gap-1">
                <div className="flex justify-between items-center text-[9.5px]">
                  <span className="text-stone-400 font-ui uppercase tracking-wider line-clamp-1">{product.user}</span>
                  <span className="text-emerald-700 font-bold font-mono text-[9px] bg-emerald-50 px-1 py-0.2 rounded-sm">-90%</span>
                </div>

                <Link href="/shop">
                  <h4 className="text-xs font-heading font-bold text-[#0A2517] line-clamp-1 hover:text-emerald-800 transition-colors">
                    {product.title}
                  </h4>
                </Link>

                <div className="flex justify-between items-baseline pt-1 border-t border-stone-100">
                  <p className="text-xs font-bold text-[#183A2D] font-mono">
                    {product.price.toLocaleString('vi-VN')}đ
                    <span className="text-[9px] text-stone-400 font-normal font-sans">/ngày</span>
                  </p>
                  <span className="text-[9px] text-stone-400 line-through font-mono">
                    {(product.origPrice / 1000000).toFixed(1)}Tr
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: TỦ ĐỒ UY TÍN (TOP ROTATORS OF CLOOP) */}
      <section className="w-full py-14 bg-[#F3EFE6] border-y border-stone-200/70">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 mb-6">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50/90 px-2.5 py-0.5 rounded-md border border-emerald-200/60 font-ui">
                TOP ROTATORS
              </span>
              <h2 className="font-heading text-xl md:text-3xl text-[#0A2517] font-bold tracking-normal mt-1.5">
                Khám Phá Tủ Đồ Các Nhà Sáng Tạo
              </h2>
            </div>
            
            <Link 
              href="/closets" 
              className="group font-ui text-xs font-bold text-[#0A2517] hover:text-emerald-800 uppercase tracking-widest flex items-center gap-1.5 shrink-0"
            >
              Khám phá tất cả <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* 🖥️ DESKTOP VIEW: Interactive Accordion */}
          <div className="hidden md:flex flex-row w-full h-[440px] gap-3 lg:gap-3.5">
            {featuredClosets.map((closet, index) => {
              const isActive = activeCard === index;

              return (
                <div
                  key={closet.id}
                  onMouseEnter={() => setActiveCard(index)}
                  className={`relative overflow-hidden cursor-pointer rounded-xl transition-[flex] duration-700 ease-out border border-stone-300/40
                    ${isActive ? 'flex-[6] lg:flex-[5] shadow-xl' : 'flex-[1] hover:flex-[1.2] shadow-xs'}
                  `}
                >
                  <Image
                    src={closet.mainImg}
                    alt={closet.username}
                    fill
                    unoptimized
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-700
                      ${isActive ? 'brightness-100' : 'brightness-[0.6] grayscale-[40%] hover:brightness-75'}
                    `}
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

                  {/* Non-Active State (Vertical Text) */}
                  <div 
                    className={`absolute inset-0 flex flex-col items-center justify-end pb-6 transition-opacity duration-300
                      ${isActive ? 'opacity-0 hidden' : 'opacity-100 delay-300'}
                    `}
                  >
                    <h3 
                      className="text-white font-heading text-lg tracking-wider text-center"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                    >
                      @{closet.username}
                    </h3>
                  </div>

                  {/* Active State */}
                  <div className={`absolute bottom-0 left-0 w-full p-6 lg:p-7 flex flex-col md:flex-row justify-between items-end transition-all duration-700 transform
                    ${isActive ? 'opacity-100 translate-y-0 delay-200' : 'opacity-0 translate-y-6 pointer-events-none hidden'}
                  `}>
                    
                    <div className="text-white max-w-sm mb-3 md:mb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-white text-[#0A2517] font-ui text-[8.5px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm">
                          {closet.tag}
                        </span>
                        <span className="bg-emerald-900/90 text-emerald-300 font-mono text-[8.5px] px-2 py-0.5 rounded-sm border border-emerald-500/30 flex items-center gap-1">
                          <ShieldCheck size={10} /> TrustScore: {closet.trustScore}
                        </span>
                      </div>
                      <h3 className="font-heading font-extrabold text-2xl lg:text-3xl leading-none mb-1.5">
                        @{closet.username}
                      </h3>
                      <p className="text-stone-300 font-body text-xs font-light leading-relaxed">
                        {closet.bio}
                      </p>
                      <Link 
                        href={`/closet/${closet.id}`} 
                        className="inline-block mt-3 border-b border-white pb-0.5 font-ui text-xs uppercase tracking-widest hover:text-emerald-300 hover:border-emerald-300 transition-colors font-bold"
                      >
                        Khám Phá Cả Tủ Đồ &rarr;
                      </Link>
                    </div>

                    {/* Mini Item Thumbnails */}
                    <div className="flex gap-2">
                      {closet.items.map((itemImg, idx) => (
                        <div key={idx} className="relative w-12 aspect-square md:aspect-[7/10] h-auto border border-white/20 bg-black/30 backdrop-blur-xs p-0.5 overflow-hidden rounded-md">
                          <Image src={itemImg} fill unoptimized className="object-cover hover:scale-110 transition-transform duration-500" alt="item" />
                        </div>
                      ))}
                      <div className="w-12 aspect-square md:aspect-[7/10] h-auto border border-white/20 bg-white/15 backdrop-blur-xs flex flex-col items-center justify-center text-white cursor-pointer hover:bg-white/25 transition-all rounded-md">
                        <span className="font-heading text-xs font-light">+12</span>
                        <span className="font-ui text-[6.5px] uppercase tracking-widest mt-0.5">Món</span>
                      </div>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>

          {/* 📱 MOBILE VIEW: Horizontal Swipe Cards */}
          <div className="md:hidden flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
            {featuredClosets.map((closet) => (
              <div 
                key={closet.id}
                className="w-[240px] shrink-0 bg-white rounded-xl border border-stone-200/80 overflow-hidden shadow-xs flex flex-col"
              >
                <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                  <Image src={closet.mainImg} alt={closet.username} fill className="object-cover" unoptimized />
                  <div className="absolute top-2 left-2 bg-black/80 text-white text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm">
                    {closet.tag}
                  </div>
                  <div className="absolute bottom-2 right-2 bg-emerald-900/90 text-emerald-200 text-[8px] font-mono px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                    <ShieldCheck size={10} /> {closet.trustScore}
                  </div>
                </div>
                <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                  <div>
                    <h3 className="font-heading font-bold text-sm text-[#0A2517]">@{closet.username}</h3>
                    <p className="text-[11px] text-stone-500 line-clamp-2 mt-0.5 font-light leading-relaxed">{closet.bio}</p>
                  </div>
                  <Link href={`/closet/${closet.id}`} className="text-xs font-semibold text-[#183A2D] hover:underline flex items-center gap-1 pt-1 border-t border-stone-100">
                    Vào xem tủ đồ <ArrowRight size={11} />
                  </Link>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* SECTION 5: HÀNH TRÌNH TUẦN HOÀN 3 BƯỚC (HOW CLOOP WORKS) */}
      <section className="w-full max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 py-14">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#2A4B2E] bg-[#E5EFE2] px-3 py-0.5 rounded-md border border-[#C5DAC2] font-ui">
            TRẢI NGHIỆM ĐỘC BẢN CLOOP
          </span>
          <h2 className="font-heading text-xl md:text-3xl text-[#183A2D] font-bold tracking-normal mt-1.5">
            Vận Hành Vòng Đời Thời Trang Trong 3 Bước
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          {/* Step 1 */}
          <div className="group bg-white rounded-2xl p-4 border border-stone-200/80 hover:border-[#37503F] hover:shadow-lg transition-all flex flex-col justify-between">
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-4 bg-stone-100">
              <Image src="/step1_phone.jpg" alt="Lướt & Đặt Thuê" fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
              <div className="absolute top-3 left-3 bg-[#37503F] text-white text-xs font-mono font-bold px-2.5 py-1 rounded-md shadow-xs">
                01
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="font-heading text-base font-bold text-[#183A2D]">Lướt & Đặt Thuê Trong 60s</h3>
              <p className="text-stone-600 text-xs font-light leading-relaxed">
                Khám phá hàng ngàn món đồ độc bản từ các chủ tủ uy tín. Kiểm tra lịch rảnh và đặt lịch giao tận tay trước sự kiện.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="group bg-white rounded-2xl p-4 border border-stone-200/80 hover:border-[#37503F] hover:shadow-lg transition-all flex flex-col justify-between">
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-4 bg-stone-100">
              <Image src="/step2_bag.jpg" alt="Nhận Đồ Chuẩn Spa" fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
              <div className="absolute top-3 left-3 bg-[#37503F] text-white text-xs font-mono font-bold px-2.5 py-1 rounded-md shadow-xs">
                02
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="font-heading text-base font-bold text-[#183A2D]">Nhận Đồ Tận Tay Chuẩn Spa</h3>
              <p className="text-stone-600 text-xs font-light leading-relaxed">
                Trang phục được hấp sấy ozone tiệt trùng chuẩn sinh thái, đóng gói bằng bao bì tuần hoàn thơm tho, sẵn sàng để mặc ngay.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="group bg-white rounded-2xl p-4 border border-stone-200/80 hover:border-[#37503F] hover:shadow-lg transition-all flex flex-col justify-between">
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-4 bg-stone-100">
              <Image src="/step3_party.jpg" alt="Tỏa Sáng & Trả Đồ" fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
              <div className="absolute top-3 left-3 bg-[#37503F] text-white text-xs font-mono font-bold px-2.5 py-1 rounded-md shadow-xs">
                03
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="font-heading text-base font-bold text-[#183A2D]">Tỏa Sáng & Trả Đồ Tiện Lợi</h3>
              <p className="text-stone-600 text-xs font-light leading-relaxed">
                Tự tin ghi dấu ấn tại sự kiện. Sau ngày thuê, shipper CLOOP đến nhận lại tận nơi mà bạn hoàn toàn không cần tự giặt ủi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: HỘ CHIẾU THỜI TRANG SỐ (DIGITAL GARMENT PASSPORT SPOTLIGHT) */}
      <section className="w-full py-16 bg-[#F3EFE6] border-y border-stone-200/80">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12">
          
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center">
            {/* Left: Interactive Passport Card Preview */}
            <div className="w-full lg:w-1/2 relative">
              <div className="relative bg-white rounded-2xl p-6 sm:p-7 shadow-xl border border-stone-300/80 overflow-hidden">
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF7F0] border border-[#D5E4D1] text-[#28422A] text-[10px] font-mono font-bold uppercase tracking-wider">
                  <ShieldCheck size={12} className="text-emerald-700" /> Digital Passport
                </div>

                <div className="flex gap-4 sm:gap-6 items-start mb-5">
                  <div className="relative w-24 sm:w-28 aspect-[3/4] rounded-lg overflow-hidden shrink-0 border border-stone-200 shadow-xs">
                    <Image src="/1.1.jpg" alt="Váy Dạ Hội" fill className="object-cover" unoptimized />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <span className="text-[10px] uppercase tracking-widest text-emerald-800 font-bold font-mono">#CLOOP-VN-0892</span>
                    <h3 className="font-heading text-lg sm:text-xl font-bold text-[#183A2D] leading-tight">
                      Váy Dạ Hội Xẻ Tà Lụa Satin
                    </h3>
                    <p className="text-xs text-stone-500 font-ui">Chủ nhân ban đầu: <span className="font-semibold text-stone-800">@the.archive</span></p>
                    <div className="pt-1.5 flex flex-wrap gap-2">
                      <span className="text-[10px] bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded font-mono font-semibold">
                        🔄 8 Vòng đời
                      </span>
                      <span className="text-[10px] bg-amber-50 text-amber-900 px-2 py-0.5 rounded font-mono font-semibold">
                        🌿 196kg CO₂ Tránh Thải
                      </span>
                    </div>
                  </div>
                </div>

                {/* Travel route stamp milestones */}
                <div className="pt-3.5 border-t border-stone-100 space-y-2">
                  <div className="text-[10.5px] font-bold text-stone-400 uppercase tracking-wider font-ui">
                    Hành Trình Du Ngoạn Của Chiếc Váy:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                    <div className="p-2 bg-[#FAF9F5] rounded-lg border border-stone-200/70">
                      <p className="font-bold text-[#183A2D]">Hà Nội</p>
                      <span className="text-[9px] text-stone-400">Prom 2024</span>
                    </div>
                    <div className="p-2 bg-[#FAF9F5] rounded-lg border border-stone-200/70">
                      <p className="font-bold text-[#183A2D]">Đà Lạt</p>
                      <span className="text-[9px] text-stone-400">Ảnh Cưới 2025</span>
                    </div>
                    <div className="p-2 bg-[#FAF9F5] rounded-lg border border-stone-200/70">
                      <p className="font-bold text-[#183A2D]">TP.HCM</p>
                      <span className="text-[9px] text-stone-400">Gala 2026</span>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-300 text-emerald-900">
                      <p className="font-bold text-emerald-900">Đà Nẵng</p>
                      <span className="text-[9px] text-emerald-700">Sẵn sàng ✨</span>
                    </div>
                  </div>
                </div>

                {/* Emotional diary note */}
                <div className="mt-3.5 p-2.5 bg-[#FAF7F0] rounded-lg border border-[#E5DEC9] text-xs text-stone-600 italic font-scrapbook leading-relaxed">
                  "Chiếc váy lụa này đã cùng mình nhận giải thưởng lớn tại đêm tiệc hôm qua. Cảm ơn người bạn xa lạ đã chia sẻ nó!"
                </div>
              </div>
            </div>

            {/* Right: Storytelling & USP */}
            <div className="w-full lg:w-1/2 space-y-4">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#2A4B2E] bg-[#E5EFE2] px-2.5 py-0.5 rounded-md border border-[#C5DAC2] font-ui">
                CÔNG NGHỆ MINH BẠCH
              </span>
              <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#183A2D] leading-tight">
                Mỗi Món Đồ Đều Có <br />
                <span className="text-emerald-800">Một Cuốn Hộ Chiếu Riêng</span>
              </h2>
              <p className="text-stone-600 text-xs sm:text-sm font-light leading-relaxed">
                Tại CLOOP, quần áo không chỉ là vải vóc — chúng là những nhân chứng của kỷ niệm. Nhờ Hộ Chiếu Thời Trang (Digital Garment Passport), bạn có thể quét mã để biết món đồ đã đi qua những thành phố nào, được yêu thương ra sao và đã đóng góp bao nhiêu cho mẹ Trái Đất.
              </p>

              <div className="pt-2 flex items-center gap-4">
                <Link
                  href="/shop"
                  className="px-6 py-3 bg-[#37503F] hover:bg-[#2C4233] text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all font-ui shadow-sm inline-flex items-center gap-2"
                >
                  Khám Phá Tủ Đồ Có Hộ Chiếu <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 7: TRANG PHỤC THANH LÝ & PASS ĐỒ DENSE 6-COLUMN GRID */}
      <section className="w-full max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 py-14">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4 border-b border-stone-200 pb-3">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/60 font-ui">
              PASS NHANH & CHUYỂN GIAO
            </span>
            <h2 className="text-xl md:text-3xl font-heading font-extrabold text-[#0A2517] tracking-normal mt-1.5">
              Trang Phục Thanh Lý & Sở Hữu
            </h2>
          </div>
          
          <div className="flex items-center gap-5 lg:gap-6 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 hide-scrollbar shrink-0">
            <div className="flex items-center gap-5 lg:gap-6 text-xs font-bold uppercase tracking-wider text-stone-500 font-ui shrink-0">
              {resaleCategories.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setActiveResaleCategory(cat)}
                  className={`pb-1 shrink-0 transition-all cursor-pointer ${activeResaleCategory === cat ? 'text-[#183A2D] border-b-2 border-[#183A2D]' : 'hover:text-[#183A2D] border-b-2 border-transparent hover:border-[#183A2D]'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="hidden md:block w-px h-4 bg-gray-300"></div>

            <Link 
              href="/shop" 
              className="group font-ui text-xs font-bold text-[#0A2517] hover:text-emerald-800 uppercase tracking-widest flex items-center gap-1 shrink-0"
            >
              Khám Phá Tất Cả <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* 6-Column Resale Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 md:gap-4">
          {resaleItems.map((item, idx) => (
            <div key={idx} className="group flex flex-col bg-white p-2.5 rounded-xl border border-stone-200/80 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer">
              <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden rounded-lg mb-2">
                <Image src={item.src} alt={item.title} fill className="object-cover transition-opacity duration-700 opacity-100 group-hover:opacity-0" unoptimized />
                <Image src={item.hoverSrc} alt={item.title} fill className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-100" unoptimized />
                <div className="absolute top-2 right-2 px-1.5 py-0.5 text-[8px] font-bold tracking-wider bg-black text-white uppercase rounded-sm z-10">
                  Sở Hữu
                </div>
              </div>

              <div className="flex flex-col flex-1 justify-between gap-1">
                <div className="flex justify-between items-center text-[9.5px]">
                  <span className="text-stone-400 font-ui uppercase line-clamp-1">{item.owner}</span>
                  <span className="text-rose-600 font-bold font-mono text-[9.5px] bg-rose-50 px-1 py-0.2 rounded">{item.discount}</span>
                </div>

                <h3 className="text-xs font-heading font-bold text-black line-clamp-1 group-hover:text-emerald-800 transition-colors">
                  {item.title}
                </h3>

                <div className="flex items-center gap-1.5 pt-0.5 border-t border-stone-100">
                  <span className="text-xs font-bold text-black font-mono">{item.price}</span>
                  <span className="text-[9.5px] text-stone-400 line-through font-mono">{item.originalPrice}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 8: BẢO TÀNG KÝ ỨC TUẦN HOÀN (STORIES OF GARMENTS) */}
      <section className="w-full py-16 bg-[#F5F2EB] border-t border-stone-200/80">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-10 max-w-2xl mx-auto">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-md border border-emerald-200 font-ui mb-1.5">
              CLOOP STORIES & HERITAGE
            </span>
            <h2 className="text-2xl md:text-3xl font-heading font-extrabold text-[#0A2517] mb-1 tracking-normal">
              Bảo Tàng Ký Ức Tuần Hoàn
            </h2>
            <p className="text-xs text-stone-600 font-body">
              Lắng nghe những mảnh ký ức trước khi trang phục bước vào hành trình mới.
            </p>
          </div>

          {/* Stories 3 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
            
            {/* Story 1 */}
            <div className="group relative bg-white rounded-xl p-3.5 shadow-xs border border-stone-200/80 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="relative aspect-[4/5] rounded-lg overflow-hidden mb-3">
                <Image src="/vintage_coat.jpg" alt="Chiếc Blazer 1998" fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
                <div className="absolute top-2.5 left-2.5 bg-black/75 text-white text-[8.5px] font-mono px-2 py-0.5 rounded-sm">
                  Vòng đời #4 • 1998
                </div>
              </div>
              <div className="px-1 space-y-2">
                <h3 className="font-heading text-base font-bold text-[#0A2517]">Chiếc Blazer Năm 1998</h3>
                <p className="font-scrapbook text-sm text-stone-600 italic leading-relaxed">
                  "Chiếc áo được mua bằng tháng lương đầu tiên của mẹ tôi. Nó đã chứng kiến những ngày thanh xuân rực rỡ..."
                </p>
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 font-ui">
                  <span className="font-semibold text-emerald-800 text-[11px]">@olivia.style</span>
                  <span className="text-[10px]">Hà Nội</span>
                </div>
              </div>
            </div>

            {/* Story 2 */}
            <div className="group relative bg-white rounded-xl p-3.5 shadow-xs border border-stone-200/80 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="relative aspect-[4/5] rounded-lg overflow-hidden mb-3">
                <Image src="/evening_dress.jpg" alt="Đêm Dạ Vũ" fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
                <div className="absolute top-2.5 left-2.5 bg-black/75 text-white text-[8.5px] font-mono px-2 py-0.5 rounded-sm">
                  Vòng đời #2 • Prom Night
                </div>
              </div>
              <div className="px-1 space-y-2">
                <h3 className="font-heading text-base font-bold text-[#0A2517]">Đêm Dạ Vũ Tỏa Sáng</h3>
                <p className="font-scrapbook text-sm text-stone-600 italic leading-relaxed">
                  "Mình mặc chiếc váy lụa này đúng một lần vào đêm Prom. Mong nó sẽ tiếp tục thắp sáng một đêm diệu kỳ nữa..."
                </p>
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 font-ui">
                  <span className="font-semibold text-emerald-800 text-[11px]">@chloe.vintage</span>
                  <span className="text-[10px]">TP.HCM</span>
                </div>
              </div>
            </div>

            {/* Story 3 */}
            <div className="group relative bg-white rounded-xl p-3.5 shadow-xs border border-stone-200/80 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="relative aspect-[4/5] rounded-lg overflow-hidden mb-3">
                <Image src="/1.2.jpg" alt="Kẻ Lữ Hành" fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
                <div className="absolute top-2.5 left-2.5 bg-black/75 text-white text-[8.5px] font-mono px-2 py-0.5 rounded-sm">
                  Vòng đời #3 • Tây Bắc
                </div>
              </div>
              <div className="px-1 space-y-2">
                <h3 className="font-heading text-base font-bold text-[#0A2517]">Kẻ Lữ Hành Cô Độc</h3>
                <p className="font-scrapbook text-sm text-stone-600 italic leading-relaxed">
                  "Chiếc áo da sờn vai đã cùng tôi rong ruổi khắp Tây Bắc. Mỗi vết xước là một dặm đường ấm áp..."
                </p>
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 font-ui">
                  <span className="font-semibold text-emerald-800 text-[11px]">@dustin.journey</span>
                  <span className="text-[10px]">Đà Lạt</span>
                </div>
              </div>
            </div>

          </div>

          <div className="flex justify-center mt-8">
            <Link 
              href="/shop" 
              className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#0A2517] text-white hover:bg-emerald-900 rounded-lg text-xs uppercase tracking-widest font-bold transition-colors font-ui shadow-sm"
            >
              Xem Thêm Ký Ức & Tủ Đồ Tuần Hoàn <ArrowRight size={13} />
            </Link>
          </div>

        </div>
      </section>

      {/* SECTION 9: ECO-IMPACT LIVE SIMULATOR (Máy tính tác động sinh thái) */}
      <section className="w-full max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 py-14">
        <EcoImpactCalculator />
      </section>

      {/* SECTION 10: CHỢ XANH CLOOP (Màu Xanh Rêu Matcha Mộc #37503F, Nút Trắng Tối Giản) */}
      <section className="w-full bg-[#37503F] text-white pt-20 pb-16 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center relative z-10 space-y-5">
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-normal text-white">
            Chợ Xanh CLOOP
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-stone-200 font-light leading-relaxed max-w-2xl mx-auto">
            Kéo dài vòng đời thời trang. Nơi dành riêng cho sinh viên thiết kế, Local Brand và các tín đồ Upcycling săn nguyên liệu độc đáo.
          </p>
          <div className="pt-3">
            <Link 
              href="/green-market" 
              className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-[#183A2D] hover:bg-[#F4F1EA] font-extrabold rounded-md text-xs uppercase tracking-widest transition-all font-ui shadow-sm"
            >
              KHÁM PHÁ NGUYÊN LIỆU
            </Link>
          </div>
        </div>
      </section>

      {/* MODAL TÌM KIẾM HÌNH ẢNH LOOKBOOK BẰNG AI */}
      <VisualSearchModal 
        isOpen={isVisualSearchOpen} 
        onClose={() => setIsVisualSearchOpen(false)} 
      />

    </main>
  );
}
