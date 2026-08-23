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
  Sparkles, 
  ShieldCheck, 
  RotateCcw, 
  Leaf, 
  Quote, 
  Compass,
  SlidersHorizontal,
  Tag
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
  const rentalCategories = ["Tất cả", "Dạ hội", "Đi tiệc", "Áo dài", "Vintage"];

  const [activeResaleCategory, setActiveResaleCategory] = useState("Tất cả");
  const resaleCategories = ["Tất cả", "Túi xách", "Phụ kiện", "Áo khoác", "Váy thiết kế"];

  const [activeMoodCapsule, setActiveMoodCapsule] = useState("Gala");
  const moodCapsules = [
    { id: "Gala", title: "Dạ Hội & Tiệc Đêm", icon: "🥂", desc: "Đầm lụa satin, sequin lấp lánh và váy dạ vũ quyến rũ." },
    { id: "Capsule", title: "Tối Giản Thường Nhật", icon: "🌿", desc: "Linen tự nhiên, blazer thanh lịch và set đồ capsule xoay vòng." },
    { id: "Archive", title: "Vintage & Di Sản", icon: "🕰️", desc: "Archive thập niên 90s, áo khoác dạ tweed và đồ độc bản." },
    { id: "Heritage", title: "Áo Dài Truyền Thống", icon: "🌸", desc: "Áo dài lụa tơ tằm, gấm thêu tay cho dịp lễ tết và kỷ niệm." }
  ];

  const [activeCard, setActiveCard] = useState(0);
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [boostedProducts, setBoostedProducts] = useState<any[]>([]);

  // Lấy dữ liệu sản phẩm thịnh hành từ Database
  useEffect(() => {
    async function fetchTrending() {
      try {
        const res = await getTrendingProductsAction(20);
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
        .limit(20);
        
      if (!error && data) {
        setBoostedProducts(data);
      }
    }
    fetchTrending();
  }, []);

  const featuredClosets = [
    {
      id: 0,
      username: 'leena.vintage',
      tag: 'TOP STYLIST',
      trustScore: '99.4/100',
      ecoBadge: '🌿 180kg CO₂ Saved',
      bio: 'Đam mê lụa Pháp & đồ Tweed. Tuyển chọn từng đường kim mũi chỉ cho các bữa tiệc sang trọng.',
      mainImg: '/vintage_coat.jpg',
      items: ['/evening_dress.jpg', '/macro_fabric.jpg', '/step2_bag.jpg'],
    },
    {
      id: 1,
      username: 'chic.street',
      tag: 'TRENDSETTER',
      trustScore: '98.8/100',
      ecoBadge: '🌿 145kg CO₂ Saved',
      bio: 'Streetwear cá tính, unisex và những món đồ upcycled độc bản mang tinh thần tự do.',
      mainImg: '/anhbia.png',
      items: ['/hero_group.jpg', '/hero_warm.jpg', '/step1_phone.jpg'],
    },
    {
      id: 2,
      username: 'the.archive',
      tag: 'RARE ARCHIVE',
      trustScore: '99.8/100',
      ecoBadge: '🌿 230kg CO₂ Saved',
      bio: 'Kho báu vintage thập niên 90s. Archive fashion từ các nhà mốt lớn với đầy đủ ký ức.',
      mainImg: '/hero_group.jpg',
      items: ['/vintage_coat.jpg', '/step2_bag.jpg', '/evening_dress.jpg'],
    },
    {
      id: 3,
      username: 'minimal.edit',
      tag: 'SUSTAINABLE',
      trustScore: '99.1/100',
      ecoBadge: '🌿 190kg CO₂ Saved',
      bio: 'Tối giản, thanh lịch. Tủ đồ capsule xoay vòng dành cho quý cô văn phòng hiện đại.',
      mainImg: '/evening_dress.jpg',
      items: ['/macro_fabric.jpg', '/vintage_coat.jpg', '/step2_bag.jpg'],
    },
  ];

  const resaleItems = [
    { 
      src: "/vintage_coat.jpg", 
      hoverSrc: "/macro_fabric.jpg", 
      title: "Túi Xách Da Cao Cấp (Pass Nhanh)", 
      price: "2.500.000đ", 
      originalPrice: "5.000.000đ", 
      discount: "-50%", 
      owner: "@emma.closet" 
    },
    { 
      src: "/kinhgucci.webp", 
      hoverSrc: "/anhbia.png", 
      title: "Kính Râm Cat-Eye Cổ Điển", 
      price: "300.000đ", 
      originalPrice: "1.000.000đ", 
      discount: "-70%", 
      owner: "@lucy.vintage" 
    },
    { 
      src: "/bootvanlentino.webp", 
      hoverSrc: "/hero_warm.jpg", 
      title: "Boots Cổ Cao Da Thật", 
      price: "1.200.000đ", 
      originalPrice: "3.000.000đ", 
      discount: "-60%", 
      owner: "@david.kicks" 
    },
    { 
      src: "/evening_dress.jpg", 
      hoverSrc: "/step3_party.jpg", 
      title: "Jacket Da Biker Phong Trần", 
      price: "1.800.000đ", 
      originalPrice: "4.500.000đ", 
      discount: "-60%", 
      owner: "@sarah.style" 
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden antialiased bg-[#FAF9F5] text-[#0A2517] pb-28 md:pb-0 font-body">

      {/* SECTION 1: HERO - CINEMATIC NATURAL BRIGHT VIDEO BANNER */}
      <section className="relative w-full aspect-[16/9] min-h-[480px] md:min-h-[540px] lg:min-h-[580px] max-h-[78vh] flex items-center justify-start overflow-hidden bg-stone-900">
        
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
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent z-10 pointer-events-none" />

        {/* Hero Content */}
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8 z-20 relative flex flex-col justify-center items-start text-left">
          <div className="max-w-2xl">
            
            {/* Tagline Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-0.5 rounded-md bg-emerald-950/80 backdrop-blur-md border border-emerald-400/40 text-emerald-300 text-[11px] font-bold uppercase tracking-widest mb-3 shadow-md font-ui"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Thời Trang Tuần Hoàn Sinh Thái
            </motion.div>

            {/* Main Heading (Font Fraunces, kích thước vừa vặn tinh tế) */}
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
                <motion.span key={i+10} className="inline-block mr-2 text-emerald-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]" variants={{ hidden: { y: 15, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } } }}>
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
              className="font-body text-xs sm:text-sm text-stone-100 leading-relaxed mb-5 md:mb-6 max-w-lg drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)] font-light"
            >
              Có những món đồ cất trong tủ kính mang theo cả một thời tuổi trẻ. Thay vì để chúng ngủ quên, hãy gửi gắm vào tủ đồ CLOOP để tiếp tục tỏa sáng cùng người khác.
            </motion.p>

            {/* Smart Search Bar with AI Visual Search */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="w-full max-w-lg mb-6 relative group"
            >
              <div className="relative flex items-center bg-white/95 backdrop-blur-md border border-white/60 rounded-xl p-1.5 shadow-2xl focus-within:ring-2 focus-within:ring-emerald-400 transition-all gap-1.5">
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
                  className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-ui text-xs font-bold transition-all shadow-xs group/cam shrink-0 hover:scale-105 active:scale-95"
                  title="Tìm trang phục tương tự bằng ảnh Lookbook / Pinterest"
                >
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Camera size={14} className="text-emerald-700 group-hover/cam:scale-110 transition-transform" />
                  <span className="hidden sm:inline font-semibold text-[11px]">Tìm bằng ảnh</span>
                </button>

                <Link
                  href="/shop"
                  className="px-3.5 py-1.5 bg-[#0A2517] text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-emerald-900 transition-colors shrink-0 shadow-xs flex items-center justify-center font-ui"
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
                <Link href="/shop" className="group font-ui font-bold text-xs px-5 h-[42px] bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded-lg shadow-lg shadow-emerald-500/25 transition-all duration-300 tracking-wide flex items-center justify-center gap-2 relative z-10 flex-1 sm:flex-initial">
                  KHÁM PHÁ TỦ ĐỒ <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </MagneticButton>
              
              <MagneticButton>
                <Link href="/my-closet" className="font-ui font-bold text-xs px-5 h-[42px] bg-black/35 hover:bg-black/50 text-white border border-white/30 backdrop-blur-md rounded-lg transition-all duration-300 tracking-wide flex items-center justify-center relative z-10 flex-1 sm:flex-initial shadow-md">
                  CHIA SẺ TỦ ĐỒ
                </Link>
              </MagneticButton>
            </motion.div>

          </div>
        </div>
      </section>

      {/* 🔴 LIVE CIRCULAR PULSE TICKER: Nhịp đập tuần hoàn */}
      <LivePulseTicker />

      {/* SECTION 2: CURATED MOOD CAPSULES (Khám phá theo dịp sống) */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-14">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 mb-6">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/60 font-ui">
              BỘ SƯU TẬP THEO DỊP
            </span>
            <h2 className="font-heading text-xl md:text-3xl text-[#0A2517] font-bold tracking-normal mt-1.5">
              Phong Cách Dành Riêng Cho Dịp Của Bạn
            </h2>
            <p className="text-stone-500 text-xs sm:text-sm mt-0.5 font-body">
              Chọn tâm trạng và sự kiện sắp tới để CLOOP gợi ý outfit chuẩn nhất.
            </p>
          </div>

          <Link 
            href="/shop" 
            className="font-ui text-xs font-bold uppercase tracking-widest text-[#183A2D] hover:text-emerald-700 flex items-center gap-1.5 group shrink-0"
          >
            Tất cả phong cách <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Capsule Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {moodCapsules.map((capsule) => {
            const isSelected = activeMoodCapsule === capsule.id;
            return (
              <div
                key={capsule.id}
                onClick={() => setActiveMoodCapsule(capsule.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected 
                    ? "bg-[#183A2D] text-white border-[#183A2D] shadow-lg ring-1 ring-emerald-400/30" 
                    : "bg-white text-stone-800 border-stone-200/70 hover:border-emerald-300 hover:shadow-xs"
                }`}
              >
                <div>
                  <div className="text-2xl mb-2.5">{capsule.icon}</div>
                  <h3 className={`font-heading font-bold text-base mb-1 ${isSelected ? "text-white" : "text-[#0A2517]"}`}>
                    {capsule.title}
                  </h3>
                  <p className={`text-xs leading-relaxed ${isSelected ? "text-stone-300" : "text-stone-500"}`}>
                    {capsule.desc}
                  </p>
                </div>
                <div className={`mt-3 pt-2.5 border-t text-[10.5px] font-bold uppercase tracking-wider flex items-center justify-between ${isSelected ? "border-emerald-800/80 text-emerald-300" : "border-stone-100 text-emerald-800"}`}>
                  <span>Xem 40+ Món</span>
                  <ArrowRight size={12} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: TỦ ĐỒ UY TÍN (TRUSTED WARDROBES ACCORDION) */}
      <section className="w-full py-14 bg-[#F3EFE6] border-y border-stone-200/70">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 mb-6">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50/90 px-2.5 py-0.5 rounded-md border border-emerald-200/60 font-ui">
                NHỮNG TỦ ĐỒ TIÊU BIỂU
              </span>
              <h2 className="font-heading text-xl md:text-3xl text-[#0A2517] font-bold tracking-normal mt-1.5">
                Tủ Đồ Cá Nhân Đáng Tin Cậy
              </h2>
              <p className="text-stone-500 text-xs sm:text-sm mt-0.5 font-body">
                Khám phá gu thẩm mỹ độc bản từ những người có phong cách sống bền vững.
              </p>
            </div>
            
            <Link 
              href="/closets" 
              className="group font-ui text-xs font-bold text-[#0A2517] hover:text-emerald-800 uppercase tracking-widest flex items-center gap-1.5 shrink-0"
            >
              Khám phá tất cả <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </Link>
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

          {/* 🖥️ DESKTOP VIEW: Interactive Accordion (Chiều cao 460px) */}
          <div className="hidden md:flex flex-row w-full h-[460px] gap-3 lg:gap-3.5">
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

                  {/* Active State (Full Peek Info) */}
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

        </div>
      </section>

      {/* SECTION 4: SÀN CHO THUÊ TUYỂN CHỌN (RENTAL HUB 50/50 SPLIT) */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-16">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 border-b border-stone-200 pb-3">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/60 font-ui">
              TIẾT KIỆM ĐẾN 90%
            </span>
            <h2 className="text-xl md:text-3xl font-heading font-extrabold text-[#0A2517] tracking-normal mt-1.5">
              Trang Phục Cho Thuê
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

        {/* 50/50 Split Editorial Showcase */}
        <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-stretch">
          
          {/* Left: Hero Poster Lookbook */}
          <div className="w-full lg:w-1/2 group relative bg-stone-100 cursor-pointer overflow-hidden rounded-xl aspect-[3/4] lg:aspect-auto lg:min-h-[560px] shadow-md">
            <Image src="/1.1.jpg" alt="Váy Dạ Hội" fill className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 opacity-100 group-hover:opacity-0" unoptimized />
            <Image src="/1.1 (1).jpg" alt="Váy Dạ Hội Hover" fill className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-100" unoptimized />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent pointer-events-none" />
            
            <div className="absolute top-5 left-5 bg-black/80 text-white text-[8.5px] uppercase tracking-[0.2em] px-2.5 py-1 font-bold font-ui rounded-sm z-10">
              Stylist's Curated Pick
            </div>

            <div className="absolute bottom-0 left-0 w-full p-6 lg:p-8 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-[9.5px] uppercase tracking-[0.2em] text-stone-300 font-ui font-semibold">@the.archive • Q.1, TP.HCM</p>
                <span className="text-[9.5px] bg-emerald-900/90 text-emerald-200 px-2 py-0.5 rounded-sm font-mono">
                  🌿 Tiết kiệm 88%
                </span>
              </div>
              <h3 className="text-xl md:text-2xl lg:text-3xl font-heading leading-tight mb-3 font-bold">
                Váy Dạ Hội Xẻ Tà Lụa Satin
              </h3>
              
              <div className="flex items-baseline gap-2.5 mb-4">
                <p className="text-xl md:text-2xl font-bold text-emerald-300 font-ui font-mono">
                  350.000đ <span className="text-xs text-stone-300 font-normal font-sans">/ngày</span>
                </p>
                <span className="text-xs text-stone-400 line-through font-ui">Gốc: 3.500.000đ</span>
              </div>
              
              <Link 
                href="/shop" 
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-white text-[#0A2517] hover:bg-emerald-300 rounded-lg text-xs uppercase tracking-wider font-bold transition-colors font-ui shadow-md"
              >
                Thuê Món Này Ngay <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* Right: Grid of Dynamic Trending / Boosted Products */}
          <div className="w-full lg:w-1/2 grid grid-cols-2 gap-3 h-fit">
            {boostedProducts.slice(0, 4).map((product) => {
              const primaryImg = product.images?.find((img: any) => img.isPrimary)?.url || product.images?.[0]?.url || "/placeholder-clothing.png";
              const isBoosted = product.boostExpiresAt && new Date(product.boostExpiresAt) > new Date();

              return (
                <div key={product.id} className="group flex flex-col bg-white p-2.5 rounded-xl border border-stone-200/70 hover:border-emerald-300 hover:shadow-sm transition-all">
                  <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden rounded-lg mb-2">
                    {isBoosted && (
                      <div className="absolute top-2 left-2 bg-rose-600 text-white font-ui text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-sm tracking-widest shadow-xs z-20 flex items-center gap-1">
                        <Flame size={9} /> Top
                      </div>
                    )}
                    <Image src={primaryImg} alt={product.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
                  </div>

                  <div className="flex flex-col flex-1 justify-between gap-1">
                    <div className="flex justify-between items-center text-[9.5px]">
                      <span className="text-stone-400 font-ui uppercase tracking-wider line-clamp-1">
                        @{product.user?.name || "closet"}
                      </span>
                      <ProductLikeSaveButtons
                        productId={product.id}
                        initialLikeCount={product.likeCount || 0}
                        initialSaveCount={product.saveCount || 0}
                        variant="light"
                        showCounts={false}
                      />
                    </div>

                    <Link href={`/checkout/${product.id}`}>
                      <h4 className="text-xs font-heading font-bold text-[#0A2517] line-clamp-1 hover:text-emerald-800 transition-colors">
                        {product.title}
                      </h4>
                    </Link>

                    <div className="flex justify-between items-baseline pt-0.5">
                      <p className="text-xs font-bold text-[#183A2D] font-mono">
                        {product.listings?.[0]?.basePrice ? `${product.listings[0].basePrice.toLocaleString('vi-VN')}đ` : 'Cho thuê'}
                        <span className="text-[9.5px] text-stone-500 font-normal font-sans">/ngày</span>
                      </p>
                      <span className="text-[8.5px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded-sm">
                        Tuần hoàn
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Fallback Mock Items */}
            {boostedProducts.length < 4 && (
              <>
                <div className="group flex flex-col bg-white p-2.5 rounded-xl border border-stone-200/70 hover:border-emerald-300 hover:shadow-sm transition-all">
                  <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden rounded-lg mb-2">
                    <Image src="/1.2.jpeg" alt="Set Tweed" fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
                  </div>
                  <div className="flex flex-col flex-1 justify-between gap-1">
                    <span className="text-[9.5px] text-stone-400 font-ui uppercase">@chic.street</span>
                    <h4 className="text-xs font-heading font-bold text-[#0A2517] line-clamp-1">Set Dạ Tweed Cổ Điển</h4>
                    <p className="text-xs font-bold text-[#183A2D] font-mono">180.000đ <span className="text-[9.5px] text-stone-500 font-normal">/ngày</span></p>
                  </div>
                </div>

                <div className="group flex flex-col bg-white p-2.5 rounded-xl border border-stone-200/70 hover:border-emerald-300 hover:shadow-sm transition-all">
                  <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden rounded-lg mb-2">
                    <Image src="/2.1.jpg" alt="Đầm Tối Giản" fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
                  </div>
                  <div className="flex flex-col flex-1 justify-between gap-1">
                    <span className="text-[9.5px] text-stone-400 font-ui uppercase">@minimal.edit</span>
                    <h4 className="text-xs font-heading font-bold text-[#0A2517] line-clamp-1">Đầm Dạ Tiệc Tối Giản</h4>
                    <p className="text-xs font-bold text-[#183A2D] font-mono">220.000đ <span className="text-[9.5px] text-stone-500 font-normal">/ngày</span></p>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </section>

      {/* SECTION 5: TRANG PHỤC THANH LÝ & PASS ĐỒ (RESALE MARKET) */}
      <section className="w-full px-4 md:px-8 lg:px-12 py-16 bg-[#F8F6F0] border-t border-stone-200/70">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 border-b border-stone-200 pb-3">
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

          {/* Grid 4 Items */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4">
            {resaleItems.map((item, idx) => (
              <div key={idx} className="group flex flex-col bg-white p-3 rounded-xl border border-stone-200/80 hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer">
                <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden rounded-lg mb-2.5">
                  <Image src={item.src} alt={item.title} fill className="object-cover transition-opacity duration-700 opacity-100 group-hover:opacity-0" unoptimized />
                  <Image src={item.hoverSrc} alt={item.title} fill className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-100" unoptimized />
                  <div className="absolute top-2 right-2 px-2 py-0.5 text-[8.5px] font-bold tracking-wider bg-black text-white uppercase rounded-sm z-10">
                    Sở Hữu
                  </div>
                </div>

                <div className="flex flex-col flex-1 justify-between gap-1">
                  <div className="flex justify-between items-center text-[9.5px]">
                    <span className="text-stone-400 font-ui uppercase">{item.owner}</span>
                    <span className="text-rose-600 font-bold font-mono">{item.discount}</span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-heading font-bold text-black line-clamp-1 group-hover:text-emerald-800 transition-colors">
                    {item.title}
                  </h3>

                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-xs sm:text-sm font-bold text-black font-mono">{item.price}</span>
                    <span className="text-[10px] text-stone-400 line-through font-mono">{item.originalPrice}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: BẢO TÀNG KÝ ỨC TUẦN HOÀN (STORIES OF GARMENTS) */}
      <section className="w-full py-20 bg-[#F5F2EB] border-t border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-12 max-w-2xl mx-auto">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-800 bg-emerald-100/80 px-3 py-0.5 rounded-md border border-emerald-200 font-ui mb-2">
              CLOOP STORIES & HERITAGE
            </span>
            <h2 className="text-2xl md:text-4xl font-heading font-extrabold text-[#0A2517] mb-2.5 tracking-normal">
              Bảo Tàng Ký Ức Tuần Hoàn
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 font-body leading-relaxed">
              Mỗi nếp gấp đều cất giấu một câu chuyện. Lắng nghe những mảnh ký ức trước khi trang phục bước vào hành trình mới.
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
                  "Chiếc áo được mua bằng tháng lương đầu tiên của mẹ tôi. Nó đã chứng kiến những ngày thanh xuân rực rỡ và đầy kiêu hãnh..."
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
                  "Mình mặc chiếc váy lụa này đúng một lần vào đêm Prom đại học. Mong nó sẽ tiếp tục thắp sáng một đêm diệu kỳ nữa..."
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
                  "Chiếc áo da sờn vai đã cùng tôi rong ruổi khắp Tây Bắc. Mỗi vết xước là một dặm đường và một ánh lửa trại ấm áp..."
                </p>
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 font-ui">
                  <span className="font-semibold text-emerald-800 text-[11px]">@dustin.journey</span>
                  <span className="text-[10px]">Đà Lạt</span>
                </div>
              </div>
            </div>

          </div>

          <div className="flex justify-center mt-10">
            <Link 
              href="/shop" 
              className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#0A2517] text-white hover:bg-emerald-900 rounded-lg text-xs uppercase tracking-widest font-bold transition-colors font-ui shadow-sm"
            >
              Xem Thêm Ký Ức & Tủ Đồ Tuần Hoàn <ArrowRight size={13} />
            </Link>
          </div>

        </div>
      </section>

      {/* SECTION 7: ECO-IMPACT LIVE SIMULATOR (Máy tính tác động sinh thái nhẹ nhàng) */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-14">
        <EcoImpactCalculator />
      </section>

      {/* SECTION 8: CHỢ XANH UPCYCLE (Full-width, liền mạch 100% với Footer) */}
      <section className="w-full bg-[#0A2517] text-white pt-16 pb-14 border-t border-emerald-900/50 relative overflow-hidden">
        {/* Subtle ambient gradients */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center relative z-10 space-y-4">
          <span className="inline-block text-[10.5px] uppercase font-bold tracking-widest text-emerald-300 bg-emerald-900/60 px-3 py-0.5 rounded-md border border-emerald-500/30 font-ui">
            DỰ ÁN SÁNG TẠO XANH
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold leading-tight text-white">
            Chợ Xanh CLOOP & Upcycling
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 font-light leading-relaxed max-w-xl mx-auto">
            Kéo dài vòng đời nguyên liệu vải thừa và phụ kiện pass nhanh. Không gian dành riêng cho sinh viên thiết kế thời trang và các local brand sáng tạo.
          </p>
          <div className="pt-2">
            <Link 
              href="/green-market" 
              className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-bold rounded-lg text-xs uppercase tracking-wider transition-all font-ui shadow-md"
            >
              Khám Phá Nguyên Liệu Xanh <ArrowRight size={13} />
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
