"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Star, Heart, Bookmark, Sparkles, Search, TrendingUp, Camera } from "lucide-react";
import { motion } from "framer-motion";
import MagneticButton from "@/app/components/MagneticButton";
import { supabase } from "@/lib/supabase";
import ProductLikeSaveButtons from "@/components/ProductLikeSaveButtons";
import { getTrendingProductsAction } from "@/app/actions/favorite";
import VisualSearchModal from "@/app/components/VisualSearchModal";

export default function Home() {
  const [activeRentalCategory, setActiveRentalCategory] = useState("Tất cả");
  const rentalCategories = ["Tất cả", "Dạ hội", "Đi tiệc", "Áo dài", "Vintage"];

  const [activeResaleCategory, setActiveResaleCategory] = useState("Tất cả");
  const resaleCategories = ["Tất cả", "Túi xách", "Phụ kiện", "Áo khoác", "Váy thiết kế"];

  const [activeCard, setActiveCard] = useState(0);
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);

  // --- LẤY DỮ LIỆU SẢN PHẨM THỊNH HÀNH & TOP TIM/LƯU THEO TIME-DECAY ---
  const [boostedProducts, setBoostedProducts] = useState<any[]>([]);

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
      const now = new Date().toISOString();
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
      tag: 'TOP SELLER',
      bio: 'Đam mê lụa Pháp & đồ Tweed. Hàng tuyển chọn từng đường kim mũi chỉ.',
      mainImg: '/vintage_coat.jpg',
      items: ['/evening_dress.jpg', '/macro_fabric.jpg', '/step2_bag.jpg'],
    },
    {
      id: 1,
      username: 'chic.street',
      tag: 'TRENDING',
      bio: 'Streetwear cá tính, unisex và những món đồ upcycled độc bản.',
      mainImg: '/anhbia.png',
      items: ['/hero_group.jpg', '/hero_warm.jpg', '/step1_phone.jpg'],
    },
    {
      id: 2,
      username: 'the.archive',
      tag: 'RARE FINDS',
      bio: 'Kho báu vintage thập niên 90s. Archive fashion từ các nhà mốt lớn.',
      mainImg: '/hero_group.jpg',
      items: ['/vintage_coat.jpg', '/step2_bag.jpg', '/evening_dress.jpg'],
    },
    {
      id: 3,
      username: 'minimal.edit',
      tag: 'SUSTAINABLE',
      bio: 'Tối giản, thanh lịch. Tủ đồ capsule xoay vòng dành cho quý cô hiện đại.',
      mainImg: '/evening_dress.jpg',
      items: ['/macro_fabric.jpg', '/vintage_coat.jpg', '/step2_bag.jpg'],
    },
  ];

  // Mock data for Rentals (Grid)
  const rentalItems = [
    { src: "/1.1.jpeg", hoverSrc: "/1.2.jpeg", title: "Đầm lụa lệch vai", price: "150.000đ", owner: "@leena.vintage", isBoosted: true },
    { src: "/1.2.jpeg", hoverSrc: "/1.3.jpeg", title: "Áo Blazer Linen Cầu Vai Rộng", price: "120.000đ", owner: "@chic.street", isBoosted: false },
    { src: "/1.3.jpeg", hoverSrc: "/1.1.jpeg", title: "Váy dạ tiệc Đỏ", price: "200.000đ", owner: "@the.archive", isBoosted: false },
    { src: "/2.1.jpg", hoverSrc: "/2.2.jpg", title: "Set dạ Tweed", price: "180.000đ", owner: "@minimal.edit", isBoosted: true },
    { src: "/2.2.jpg", hoverSrc: "/3.1.jpg", title: "Đầm nhung Cổ điển", price: "220.000đ", owner: "@chic.street", isBoosted: false },
    { src: "/3.1.jpg", hoverSrc: "/2.1.jpg", title: "Chân váy Maxi", price: "100.000đ", owner: "@leena.vintage", isBoosted: false },
    { src: "/1.1 (1).jpg", hoverSrc: "/1.1.jpeg", title: "Áo khoác Vintage", price: "250.000đ", owner: "@the.archive", isBoosted: true },
    { src: "/1.2.jpeg", hoverSrc: "/1.3.jpeg", title: "Set lụa Pháp", price: "190.000đ", owner: "@minimal.edit", isBoosted: false },
  ];

  // Mock data for Resale (Grid)
  const resaleItems = [
    { src: "https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?q=80&w=800", title: "Túi xách Gucci (Pass nhanh)", price: "2.500.000đ" },
    { src: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=800", title: "Kính râm Cat-eye", price: "300.000đ" },
    { src: "https://images.unsplash.com/photo-1509631179647-0c5000642f58?q=80&w=800", title: "Boots cổ cao da thật", price: "1.200.000đ" },
    { src: "https://images.unsplash.com/photo-1434389670869-c8c57502c2e0?q=80&w=800", title: "Jacket da thật", price: "1.800.000đ" },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden antialiased bg-white text-[#0A2517] pb-28 md:pb-0">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes kenBurns {
          from { transform: scale(1); }
          to { transform: scale(1.05); }
        }
        .animate-fade-up-1 {
          animation: fadeUp 0.8s ease-out forwards;
        }
        .animate-fade-up-2 {
          animation: fadeUp 0.8s ease-out 0.2s forwards;
          opacity: 0;
        }
        .animate-fade-up-3 {
          animation: fadeUp 0.8s ease-out 0.4s forwards;
          opacity: 0;
        }
        .animate-ken-burns {
          animation: kenBurns 15s ease-out forwards;
        }
      `}</style>

      {/* SECTION 1: HERO - CINEMATIC 16:9 NATURAL BRIGHT VIDEO BANNER */}
      <section className="relative w-full aspect-[16/9] min-h-[500px] md:min-h-[580px] lg:min-h-[640px] max-h-[82vh] flex items-center justify-start overflow-hidden bg-stone-900">
        {/* Background Video (Tự nhiên, sáng rõ, không phóng to cắt mất đầu) */}
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

        {/* Gradient mỏng nhẹ bên góc trái để đọc chữ rõ ràng mà vẫn giữ 100% ánh nắng ban ngày */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent z-10 pointer-events-none" />

        {/* Content Overlaid on Video (Thoáng đãng, không có khung viền bao quanh) */}
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-10 z-20 relative flex flex-col justify-center items-start text-left">
          <div className="max-w-2xl">
            
            {/* Tagline Badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/70 backdrop-blur-md border border-emerald-400/40 text-emerald-300 text-xs font-bold uppercase tracking-widest mb-4 shadow-md"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
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
              className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight md:leading-[1.12] mb-4 tracking-normal drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
            >
              {["Thuê", "&", "Sở", "Hữu"].map((word, i) => (
                <motion.span key={i} className="inline-block mr-2 md:mr-3" variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } } }}>
                  {word}
                </motion.span>
              ))}
              <br />
              {["Thời", "Trang"].map((word, i) => (
                <motion.span key={i+10} className="inline-block mr-2 md:mr-3 text-emerald-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]" variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } } }}>
                  {word}
                </motion.span>
              ))}
              {" "}
              {["Tuần", "Hoàn"].map((word, i) => (
                <motion.span key={i+20} className="inline-block mr-2 md:mr-3" variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } } }}>
                  {word}
                </motion.span>
              ))}
            </motion.h1>

            {/* Subtext */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="font-body text-xs sm:text-sm md:text-base text-stone-100 leading-relaxed mb-6 md:mb-8 max-w-xl drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]"
            >
              Có những món đồ cất trong tủ kính mang theo cả một thời tuổi trẻ. Thay vì để chúng ngủ quên, hãy gửi gắm vào tủ đồ CLOOP. Chút hoài niệm của bạn hôm nay sẽ là sự rạng rỡ của một người khác ngày mai.
            </motion.p>

            {/* Smart Search Bar (Glassmorphism) with Prominent AI Visual Search Camera */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="w-full max-w-xl mb-6 md:mb-8 relative group"
            >
              <div className="relative flex items-center bg-white/95 backdrop-blur-md border border-white/50 rounded-2xl p-1.5 md:p-2 shadow-2xl focus-within:ring-2 focus-within:ring-emerald-400 transition-all gap-1">
                <Search size={18} className="text-stone-400 ml-2 mr-1 shrink-0" />
                <input 
                  type="text" 
                  placeholder="Tìm Blazer, đầm dạ tiệc, áo dài..." 
                  className="flex-1 bg-transparent border-none outline-none font-ui text-xs md:text-sm text-[#0A2517] placeholder:text-stone-500 font-medium min-w-0"
                />

                {/* NÚT TÌM BẰNG HÌNH ẢNH (AI LOOKBOOK CAMERA) CỰC KỲ NỔI BẬT */}
                <button
                  type="button"
                  onClick={() => setIsVisualSearchOpen(true)}
                  className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-ui text-xs font-bold transition-all shadow-sm group/cam shrink-0 hover:scale-105 active:scale-95"
                  title="Tìm trang phục tương tự bằng ảnh Lookbook / Pinterest"
                >
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <Camera size={15} className="text-emerald-700 group-hover/cam:scale-110 transition-transform" />
                  <span className="hidden sm:inline font-semibold">Tìm bằng ảnh</span>
                </button>

                <button className="px-4 py-2 bg-[#0A2517] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-emerald-900 transition-colors shrink-0 shadow-sm">
                  Tìm kiếm
                </button>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex flex-row w-full sm:w-auto items-center gap-3 sm:gap-4"
            >
              <MagneticButton>
                <Link href="/shop" className="group font-ui font-bold text-xs md:text-sm px-5 md:px-7 h-[46px] md:h-[50px] bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-300 tracking-wide flex items-center justify-center gap-2 relative z-10 flex-1 sm:flex-initial">
                  KHÁM PHÁ TỦ ĐỒ <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </MagneticButton>
              
              <MagneticButton>
                <Link href="/my-closet" className="font-ui font-bold text-xs md:text-sm px-5 md:px-7 h-[46px] md:h-[50px] bg-black/30 hover:bg-black/40 text-white border border-white/30 backdrop-blur-md rounded-xl transition-all duration-300 tracking-wide flex items-center justify-center relative z-10 flex-1 sm:flex-initial shadow-md">
                  CHIA SẺ TỦ ĐỒ
                </Link>
              </MagneticButton>
            </motion.div>

          </div>
        </div>
      </section>

      {/* SECTION 2: TỦ ĐỒ UY TÍN (TRUSTED CLOSETS) - Accordion Thần Thánh */}
      <section className="w-full py-16 bg-[#F9F9F9]">
        {/* Mở rộng không gian để bằng với Trang Phục Cho Thuê */}
        <div className="w-full px-4 md:px-8 lg:px-10 xl:px-12">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-0 mb-10">
            <div>
              <p className="font-ui text-xs text-stone-500 uppercase tracking-[0.3em] mb-2">Discovery</p>
              <h2 className="font-heading text-2xl md:text-4xl lg:text-5xl text-[#0A2517] tracking-tight font-extrabold">
                Tủ Đồ Nổi Bật
              </h2>
            </div>
            <Link href="/closets" className="group font-ui text-[15px] font-semibold text-[#0A2517] border-b-2 border-[#0A2517] pb-1 pr-2 hover:text-stone-500 hover:border-stone-500 uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 self-start md:self-auto">
              Khám phá tất cả
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>

          {/* 📱 MOBILE VIEW: Swipe Cards (Thoáng mắt, dễ lướt trên điện thoại) */}
          <div className="md:hidden flex gap-3.5 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
            {featuredClosets.map((closet) => (
              <div 
                key={closet.id}
                className="w-[240px] shrink-0 bg-white rounded-2xl border border-stone-200/70 overflow-hidden shadow-2xs flex flex-col"
              >
                <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                  <Image src={closet.mainImg} alt={closet.username} fill className="object-cover" unoptimized />
                  <div className="absolute top-2.5 left-2.5 bg-black/80 backdrop-blur-xs text-white text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                    {closet.tag}
                  </div>
                </div>
                <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
                  <div>
                    <h3 className="font-heading font-bold text-sm text-[#0A2517]">@{closet.username}</h3>
                    <p className="text-[11px] text-stone-500 line-clamp-2 mt-0.5 font-light leading-relaxed">{closet.bio}</p>
                  </div>
                  <Link href={`/closet/${closet.id}`} className="text-xs font-semibold text-[#183A2D] hover:underline flex items-center gap-1 pt-1 border-t border-stone-100">
                    Vào xem tủ đồ <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* 🖥️ DESKTOP VIEW: KHỐI ACCORDION NGUYÊN BẢN (Chiều cao chuẩn 500px) */}
          <div className="hidden md:flex flex-row w-full h-[500px] gap-3 lg:gap-4">
            
            {featuredClosets.map((closet, index) => {
              const isActive = activeCard === index;

              return (
                <div
                  key={closet.id}
                  // SỬ DỤNG onMouseEnter THAY VÌ onClick ĐỂ TỰ ĐỘNG MỞ KHI RÊ CHUỘT
                  onMouseEnter={() => setActiveCard(index)}
                  className={`relative overflow-hidden cursor-pointer rounded-xl transition-[flex] duration-700 ease-out
                    ${isActive ? 'flex-[6] lg:flex-[5] shadow-xl' : 'flex-[1] hover:flex-[1.2] shadow-sm'}
                  `}
                >
                  {/* Ảnh Nền */}
                  <Image
                    src={closet.mainImg}
                    alt={closet.username}
                    fill
                    unoptimized
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-700
                      ${isActive ? 'brightness-100' : 'brightness-[0.6] grayscale-[40%] hover:brightness-75'}
                    `}
                  />

                  {/* Gradient Đen (chỉ phủ từ dưới lên) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none"></div>

                  {/* ===== TRẠNG THÁI KHÔNG ACTIVE (THẺ BỊ ĐÓNG) ===== */}
                  <div 
                    className={`absolute inset-0 flex flex-col items-center justify-end pb-8 transition-opacity duration-300
                      ${isActive ? 'opacity-0 hidden' : 'opacity-100 delay-300'}
                    `}
                  >
                    <h3 
                      className="text-white font-heading text-2xl tracking-wider text-center"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                    >
                      {closet.username}
                    </h3>
                  </div>

                  {/* ===== TRẠNG THÁI ACTIVE (BUNG RA THÔNG TIN) ===== */}
                  <div className={`absolute bottom-0 left-0 w-full p-6 lg:p-8 flex flex-col md:flex-row justify-between items-end transition-all duration-700 transform
                    ${isActive ? 'opacity-100 translate-y-0 delay-200' : 'opacity-0 translate-y-8 pointer-events-none hidden'}
                  `}>
                    
                    {/* Text Info */}
                    <div className="text-white max-w-sm mb-4 md:mb-0">
                      <span className="inline-block bg-white text-[#0A2517] font-ui text-[9px] font-bold uppercase tracking-widest px-2 py-1 mb-3">
                        {closet.tag}
                      </span>
                      <h3 className="font-heading font-extrabold text-3xl lg:text-4xl leading-none mb-3">
                        {closet.username}
                      </h3>
                      <p className="text-stone-300 font-body text-sm font-light leading-relaxed">
                        {closet.bio}
                      </p>
                      <button className="mt-4 border-b border-white pb-1 font-ui text-xs uppercase tracking-widest hover:text-stone-400 hover:border-stone-400 transition-colors">
                        Vào Tủ Đồ &rarr;
                      </button>
                    </div>

                    {/* Mini Thumbnails */}
                    <div className="flex gap-2">
                      {closet.items.map((itemImg, idx) => (
                        <div key={idx} className="relative w-14 aspect-square md:aspect-[7/10] h-auto border border-white/20 bg-black/20 backdrop-blur-sm p-0.5 overflow-hidden rounded-sm">
                          <Image src={itemImg} fill unoptimized className="object-cover hover:scale-110 transition-transform duration-500" alt="item" />
                        </div>
                      ))}
                      <div className="w-14 aspect-square md:aspect-[7/10] h-auto border border-white/20 bg-white/10 backdrop-blur-md flex flex-col items-center justify-center text-white cursor-pointer hover:bg-white/20 transition-all rounded-sm">
                        <span className="font-heading text-sm font-light">+12</span>
                        <span className="font-ui text-[7px] uppercase tracking-widest mt-1">Món</span>
                      </div>
                    </div>

                  </div>

                </div>
              );
            })}

          </div>
        </div>
      </section>

      {/* SECTION 3: TRANG PHỤC CHO THUÊ (RENTAL HUB) - 50/50 Split Editorial */}
      {/* Bọc toàn bộ Section */}
      <section className="w-full px-4 md:px-8 lg:px-10 xl:px-12 py-20 bg-white border-t border-stone-100">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 border-b border-stone-200 pb-4">
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-heading font-extrabold text-[#0A2517] tracking-tight">
            Trang Phục Cho Thuê
          </h2>
          
          <div className="flex items-center gap-6 lg:gap-8 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 hide-scrollbar shrink-0">
            {/* Nhóm Tabs */}
            <div className="flex items-center gap-6 lg:gap-10 text-base font-bold uppercase tracking-wider text-stone-500 font-ui shrink-0">
              {rentalCategories.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setActiveRentalCategory(cat)}
                  className={`pb-1.5 shrink-0 transition-all ${activeRentalCategory === cat ? 'text-black border-b-[2px] border-black' : 'hover:text-black border-b-[2px] border-transparent hover:border-black'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Vạch kẻ dọc chia cách (chỉ hiện trên Desktop) */}
            <div className="hidden md:block w-px h-5 bg-gray-300"></div>

            {/* Nút Khám Phá Tất Cả */}
            <Link 
              href="/shop" 
              className="group font-ui text-[15px] font-semibold text-[#0A2517] border-b-2 border-[#0A2517] pb-1 pr-2 hover:text-stone-500 hover:border-stone-500 uppercase tracking-widest transition-all flex items-center gap-2 shrink-0"
            >
              Khám Phá Tất Cả
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* NEW LAYOUT: CHIA ĐÔI MÀN HÌNH (50/50 Split) */}
        {/* Thêm lg:items-stretch để ép 2 cột luôn cao bằng nhau */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 lg:items-stretch">
          
          {/* ===== LEFT: HERO POSTER (50%) ===== */}
          {/* FIX LỖI BỐC HƠI: Thêm lg:min-h-[700px] để nó luôn có điểm tựa chiều cao, không bao giờ bị xẹp về 0px nữa */}
          <div className="w-full lg:w-1/2 group relative bg-stone-100 cursor-pointer overflow-hidden aspect-square md:aspect-[3/4] lg:aspect-auto lg:min-h-[700px]">
            
            <Image src="/1.1.jpg" alt="Váy Dạ Hội" fill className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 opacity-100 group-hover:opacity-0" unoptimized />
            <Image src="/1.1 (1).jpg" alt="Váy Dạ Hội Hover" fill className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-100" unoptimized />
            
            {/* Gradient chỉ mờ nhẹ ở đáy, không làm đen thui cả bức ảnh nữa */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity pointer-events-none"></div>
            
            {/* Badge Minimalist */}
            <div className="absolute top-6 left-6 bg-black text-white text-[9px] uppercase tracking-[0.2em] px-3 py-1.5 font-bold font-ui z-10">
              Stylist's Pick
            </div>

            <div className="absolute bottom-0 left-0 w-full p-8 lg:p-12 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] uppercase tracking-[0.2em] opacity-70 font-ui">@the.archive</p>
                {/* ACTION ICONS (Heart & Bookmark) */}
                <div className="flex items-center gap-3 text-white/70">
                  <button className="hover:text-red-500 transition-colors" title="Yêu thích">
                    <Heart size={18} strokeWidth={1.5} />
                  </button>
                  <button className="hover:text-white transition-colors" title="Lưu tủ đồ">
                    <Bookmark size={18} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              <h3 className="text-2xl md:text-4xl lg:text-5xl font-heading leading-tight mb-6 font-extrabold">Váy Dạ Hội Xẻ Tà <br/> Lụa Satin</h3>
              
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-stone-400 line-through decoration-stone-500 font-ui">Retail: 3.500.000đ</span>
                  {/* THAY THẾ BADGE: Viền mỏng, chữ trắng, cực kỳ luxury */}
                  <span className="text-[10px] border border-white/50 text-white font-medium px-2 py-0.5 uppercase tracking-widest font-ui">
                    Save 90%
                  </span>
                </div>
                <p className="text-3xl font-light text-white font-ui">350.000đ <span className="text-sm opacity-60 font-light">/ngày</span></p>
              </div>
              
              {/* Đổi thành nút dạng Link để thanh thoát hơn */}
              <button className="mt-8 opacity-0 group-hover:opacity-100 border-b border-white pb-1 text-xs uppercase tracking-[0.2em] hover:text-stone-300 hover:border-stone-300 transition-all duration-300 font-ui font-semibold">
                Thuê Ngay &rarr;
              </button>
            </div>
          </div>
          {/* ===== END LEFT ===== */}


          {/* ===== RIGHT: GRID 4 MÓN ĐỒ (50%) ===== */}
          <div className="w-full lg:w-1/2 grid grid-cols-2 gap-x-3 md:gap-x-4 gap-y-8 md:gap-y-12 h-fit">
            
            {/* RENDER DYNAMIC BOOSTED PRODUCTS */}
            {boostedProducts.map((product) => {
              const primaryImg = product.images?.find((img: any) => img.isPrimary)?.url || product.images?.[0]?.url || "/placeholder-clothing.png";
              const isBoosted = product.boostExpiresAt && new Date(product.boostExpiresAt) > new Date();
              return (
                <div key={product.id} className="group flex flex-col cursor-pointer relative">
                  {/* BADGE BOOST */}
                  {isBoosted && (
                    <div className="absolute -top-3 right-2 bg-rose-600 text-white font-ui text-[9px] font-bold uppercase px-3 py-1 rounded-full tracking-widest shadow-sm z-20 flex items-center gap-1">
                      <Sparkles size={10} /> Top 1
                    </div>
                  )}
                  {/* BADGE HIGHLIGHT */}
                  {product.isHighlighted && !isBoosted && (
                    <div className="absolute -top-3 right-2 bg-emerald-600 text-white font-ui text-[9px] font-bold uppercase px-3 py-1 rounded-full tracking-widest shadow-sm z-20 flex items-center gap-1">
                      Uy Tín
                    </div>
                  )}

                  <div className={`relative w-full aspect-[4/5] md:aspect-[3/4] bg-stone-100 overflow-hidden mb-4 rounded-sm transition-all duration-300 ${product.isHighlighted ? 'ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/20' : ''} ${isBoosted ? 'ring-2 ring-rose-500 shadow-xl shadow-rose-500/30' : ''}`}>
                    <Image src={primaryImg} alt={product.title} fill className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
                  </div>
                    <div className="flex flex-col">
                      <div className="flex justify-between items-center mb-1.5">
                        <Link href={`/closet/${product.userId}`} className="text-[9px] text-stone-500 uppercase tracking-[0.2em] font-ui hover:text-green-800 transition-colors z-20 relative">@{product.user?.name || "closet"}</Link>
                        <ProductLikeSaveButtons
                          productId={product.id}
                          initialLikeCount={product.likeCount || 0}
                          initialSaveCount={product.saveCount || 0}
                          variant="light"
                          showCounts={true}
                        />
                      </div>
                      <Link href={`/checkout/${product.id}`}>
                        <h3 className="text-xs md:text-base font-heading text-black mb-2 line-clamp-1 font-semibold hover:text-[#183A2D] transition-colors">{product.title}</h3>
                      </Link>
                      
                      <p className="text-sm font-bold text-[#183A2D] font-ui">
                        {product.listings?.[0]?.basePrice ? `${product.listings[0].basePrice.toLocaleString('vi-VN')}đ` : 'Đang cho thuê'} <span className="text-[10px] text-stone-500 font-normal">/ngày</span>
                      </p>
                    </div>
                  </div>
                );
              })}

            {/* FALLBACK MOCK DATA NẾU CHƯA CÓ ĐỦ SẢN PHẨM BOOST (Để lấp đầy Grid) */}
            {boostedProducts.length < 4 && (
              <>
                {/* ITEM 1 */}
                <div className="group flex flex-col cursor-pointer">
                  <div className="relative w-full aspect-[4/5] md:aspect-[3/4] bg-stone-100 overflow-hidden mb-4">
                    <Image src="/1.2.jpeg" alt="Item" fill className="absolute inset-0 w-full h-full object-cover transition-all duration-700 opacity-100 group-hover:opacity-0" unoptimized />
                    <Image src="/1.2.jpg" alt="Item Hover" fill className="absolute inset-0 w-full h-full object-cover transition-all duration-700 scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-100" unoptimized />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-1.5">
                      <p className="text-[9px] text-stone-500 uppercase tracking-[0.2em] font-ui">@chic.street</p>
                      <div className="flex items-center gap-3 text-stone-400">
                        <button className="hover:text-red-500 transition-colors"><Heart size={16} strokeWidth={1.5} /></button>
                        <button className="hover:text-black transition-colors"><Bookmark size={16} strokeWidth={1.5} /></button>
                      </div>
                    </div>
                    <h3 className="text-xs md:text-base font-heading text-black mb-2 line-clamp-1 font-semibold">Set Tweed Dạ Cổ Điển</h3>
                    <div className="hidden md:flex items-center gap-2 mb-1">
                      <span className="text-xs text-stone-400 line-through font-ui">1.800.000đ</span>
                      <span className="text-[10px] text-red-700 font-medium tracking-wider font-ui">-90%</span>
                    </div>
                    <p className="text-sm font-bold text-black font-ui">
                      180.000đ <span className="text-[10px] text-stone-500 font-normal">/ngày</span>
                      <span className="md:hidden text-[10px] text-red-700 font-medium ml-1">· -90%</span>
                    </p>
                  </div>
                </div>
              </>
            )}
            {boostedProducts.length < 3 && (
              <>
                 {/* ITEM 2 */}
                <div className="group flex flex-col cursor-pointer">
                  <div className="relative w-full aspect-[4/5] md:aspect-[3/4] bg-stone-100 overflow-hidden mb-4">
                    <Image src="/2.1.jpg" alt="Item" fill className="absolute inset-0 w-full h-full object-cover transition-all duration-700 opacity-100 group-hover:opacity-0" unoptimized />
                    <Image src="/2.1 (1).jpg" alt="Item Hover" fill className="absolute inset-0 w-full h-full object-cover transition-all duration-700 scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-100" unoptimized />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-1.5">
                      <p className="text-[9px] text-stone-500 uppercase tracking-[0.2em] font-ui">@minimal.edit</p>
                      <div className="flex items-center gap-3 text-stone-400">
                        <button className="hover:text-red-500 transition-colors"><Heart size={16} strokeWidth={1.5} /></button>
                        <button className="hover:text-black transition-colors"><Bookmark size={16} strokeWidth={1.5} /></button>
                      </div>
                    </div>
                    <h3 className="text-xs md:text-base font-heading text-black mb-2 line-clamp-1 font-semibold">Đầm Dạ Tiệc Tối Giản</h3>
                    <div className="hidden md:flex items-center gap-2 mb-1">
                      <span className="text-xs text-stone-400 line-through font-ui">2.500.000đ</span>
                      <span className="text-[10px] text-red-700 font-medium tracking-wider font-ui">-85%</span>
                    </div>
                    <p className="text-sm font-bold text-black font-ui">
                      350.000đ <span className="text-[10px] text-stone-500 font-normal">/ngày</span>
                      <span className="md:hidden text-[10px] text-red-700 font-medium ml-1">· -85%</span>
                    </p>
                  </div>
                </div>
              </>
            )}


            {/* ITEM 3 */}
            <div className="group flex flex-col cursor-pointer">
              <div className="relative w-full aspect-[4/5] md:aspect-[3/4] bg-stone-100 overflow-hidden mb-4">
                <Image src="/2.2.jpg" alt="Item" fill className="absolute inset-0 w-full h-full object-cover transition-all duration-700 opacity-100 group-hover:opacity-0" unoptimized />
                <Image src="/2.2 (1).jpg" alt="Item Hover" fill className="absolute inset-0 w-full h-full object-cover transition-all duration-700 scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-100" unoptimized />
              </div>
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-1.5">
                  <p className="text-[9px] text-stone-500 uppercase tracking-[0.2em] font-ui">@leena.vintage</p>
                  {/* ACTION ICONS */}
                  <div className="flex items-center gap-3 text-stone-400">
                    <button className="hover:text-red-500 transition-colors" title="Yêu thích">
                      <Heart size={16} strokeWidth={1.5} />
                    </button>
                    <button className="hover:text-black transition-colors" title="Lưu tủ đồ">
                      <Bookmark size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
                <h3 className="text-xs md:text-base font-heading text-black mb-2 line-clamp-1 font-semibold">Đầm Lụa Đỏ Burgundy</h3>
                
                <div className="hidden md:flex items-center gap-2 mb-1">
                  <span className="text-xs text-stone-400 line-through font-ui">2.000.000đ</span>
                  <span className="text-[10px] text-red-700 font-medium tracking-wider font-ui">-90%</span>
                </div>
                <p className="text-sm font-bold text-black font-ui">
                  200.000đ <span className="text-[10px] text-stone-500 font-normal">/ngày</span>
                  <span className="md:hidden text-[10px] text-red-700 font-medium ml-1">· -90%</span>
                </p>
              </div>
            </div>

            {/* ITEM 4 */}
            <div className="group flex flex-col cursor-pointer">
              <div className="relative w-full aspect-[4/5] md:aspect-[3/4] bg-stone-100 overflow-hidden mb-4">
                <Image src="/3.1.jpg" alt="Item" fill className="absolute inset-0 w-full h-full object-cover transition-all duration-700 opacity-100 group-hover:opacity-0" unoptimized />
                <Image src="/3.1 (1).jpg" alt="Item Hover" fill className="absolute inset-0 w-full h-full object-cover transition-all duration-700 scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-100" unoptimized />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-10">
                  <Link href="/shop" className="text-white text-xs uppercase tracking-widest border-b border-white pb-1 font-ui font-bold hover:text-stone-300 hover:border-stone-300">Xem Thêm Đồ</Link>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-1.5">
                  <p className="text-[9px] text-stone-500 uppercase tracking-[0.2em] font-ui">@street.hype</p>
                  {/* ACTION ICONS */}
                  <div className="flex items-center gap-3 text-stone-400">
                    <button className="hover:text-black transition-colors" title="Lưu tủ đồ">
                      <Bookmark size={16} strokeWidth={1.5} />
                    </button>
                    <button className="hover:text-red-500 transition-colors" title="Yêu thích">
                      <Heart size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
                <h3 className="text-xs md:text-base font-heading text-black mb-2 line-clamp-1 font-semibold">Túi Cầm Tay Da Thật</h3>
                
                <div className="hidden md:flex items-center gap-2 mb-1">
                  <span className="text-xs text-stone-400 line-through font-ui">2.500.000đ</span>
                  <span className="text-[10px] text-red-700 font-medium tracking-wider font-ui">-90%</span>
                </div>
                <p className="text-sm font-bold text-black font-ui">
                  250.000đ <span className="text-[10px] text-stone-500 font-normal">/ngày</span>
                  <span className="md:hidden text-[10px] text-red-700 font-medium ml-1">· -90%</span>
                </p>
              </div>
            </div>

          </div>
          {/* ===== END RIGHT ===== */}

        </div>
      </section>

      {/* SECTION 4: CHUYỂN NHƯỢNG & KÝ GỬI (RESALE MARKET) */}
      <section className="w-full px-4 md:px-8 lg:px-10 xl:px-12 py-20 bg-[#F9F9F9]">
        {/* ===== ĐỒNG BỘ HEADER (Giống hệt phần Trang Phục Cho Thuê) ===== */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 border-b border-gray-200 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-heading font-extrabold text-[#0A2517] tracking-tight">
              Trang Phục Thanh Lý
            </h2>
          </div>
          
          <div className="flex items-center gap-6 lg:gap-10 text-base font-bold uppercase tracking-wider text-stone-500 font-ui overflow-x-auto w-full md:w-auto pb-1 md:pb-0 hide-scrollbar shrink-0">
            {/* Nhóm Tabs */}
            <div className="flex items-center gap-6 lg:gap-10 shrink-0">
              <button className="text-black border-b-[2px] border-black pb-1.5 shrink-0 transition-all">Tất Cả</button>
              <button className="hover:text-black border-b-[2px] border-transparent hover:border-black pb-1.5 shrink-0 transition-all">Túi Xách</button>
              <button className="hover:text-black border-b-[2px] border-transparent hover:border-black pb-1.5 shrink-0 transition-all">Phụ Kiện</button>
              <button className="hover:text-black border-b-[2px] border-transparent hover:border-black pb-1.5 shrink-0 transition-all">Áo Khoác</button>
              <button className="hover:text-black border-b-[2px] border-transparent hover:border-black pb-1.5 shrink-0 transition-all">Váy Thiết Kế</button>
            </div>

            {/* Vạch kẻ dọc chia cách */}
            <div className="hidden md:block w-px h-5 bg-gray-300"></div>

            {/* Nút Khám Phá Tất Cả */}
            <Link 
              href="/shop" 
              className="group font-ui text-[15px] font-semibold text-[#0A2517] border-b-2 border-[#0A2517] pb-1 pr-2 hover:text-stone-500 hover:border-stone-500 uppercase tracking-widest transition-all flex items-center gap-2 shrink-0"
            >
              Khám Phá Tất Cả
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* ===== LƯỚI SẢN PHẨM (TRÀN VIỀN, SẮC CẠNH) ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 md:gap-x-4 gap-y-8 md:gap-y-12">
          
          {/* SẢN PHẨM 1 */}
          <div className="group flex flex-col cursor-pointer">
            <div className="relative w-full aspect-[3/4] bg-gray-200 overflow-hidden mb-4">
              <Image src="/vintage_coat.jpg" alt="Túi xách Gucci" fill className="object-cover transition-all duration-700 opacity-100 group-hover:opacity-0" unoptimized />
              <Image src="/macro_fabric.jpg" alt="Túi xách Gucci Hover" fill className="absolute inset-0 w-full h-full object-cover transition-all duration-700 scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-100" unoptimized />
              <div className="absolute top-2 right-2 px-1.5 py-0.5 text-[8px] md:text-[10px] md:px-3 md:py-1.5 md:top-3 md:right-3 tracking-widest font-medium bg-black text-white uppercase z-10">
                Sở Hữu
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-ui">@emma.closet</p>
                <div className="flex items-center gap-3 text-stone-400">
                  <button className="hover:text-red-500 transition-colors"><Heart size={16} strokeWidth={1.5} /></button>
                  <button className="hover:text-black transition-colors"><Bookmark size={16} strokeWidth={1.5} /></button>
                </div>
              </div>
              <h3 className="text-base font-heading font-semibold text-black mb-1 line-clamp-1">Túi xách Gucci (Pass nhanh)</h3>
              <div className="hidden md:flex items-center gap-2 mb-0.5">
                <span className="text-xs text-stone-400 line-through font-ui">5.000.000đ</span>
                <span className="text-[10px] text-red-700 font-medium tracking-wider font-ui">-50%</span>
              </div>
              <p className="text-xs md:text-sm font-bold text-black font-ui">
                2.500.000đ
                <span className="md:hidden text-[10px] text-red-700 font-medium ml-1">· -50%</span>
              </p>
            </div>
          </div>

          {/* SẢN PHẨM 2 */}
          <div className="group flex flex-col cursor-pointer">
            <div className="relative w-full aspect-[3/4] bg-gray-200 overflow-hidden mb-4">
              <Image src="/kinhgucci.webp" alt="Kính râm" fill className="object-cover transition-all duration-700 opacity-100 group-hover:opacity-0" unoptimized />
              <Image src="/anhbia.png" alt="Kính râm Hover" fill className="absolute inset-0 w-full h-full object-cover transition-all duration-700 scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-100" unoptimized />
              <div className="absolute top-2 right-2 px-1.5 py-0.5 text-[8px] md:text-[10px] md:px-3 md:py-1.5 md:top-3 md:right-3 tracking-widest font-medium bg-black text-white uppercase z-10">
                Sở Hữu
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-ui">@lucy.vintage</p>
                <div className="flex items-center gap-3 text-stone-400">
                  <button className="hover:text-red-500 transition-colors"><Heart size={16} strokeWidth={1.5} /></button>
                  <button className="hover:text-black transition-colors"><Bookmark size={16} strokeWidth={1.5} /></button>
                </div>
              </div>
              <h3 className="text-base font-heading font-semibold text-black mb-1 line-clamp-1">Kính râm Cat-eye</h3>
              <div className="hidden md:flex items-center gap-2 mb-0.5">
                <span className="text-xs text-stone-400 line-through font-ui">1.000.000đ</span>
                <span className="text-[10px] text-red-700 font-medium tracking-wider font-ui">-70%</span>
              </div>
              <p className="text-xs md:text-sm font-bold text-black font-ui">
                300.000đ
                <span className="md:hidden text-[10px] text-red-700 font-medium ml-1">· -70%</span>
              </p>
            </div>
          </div>

          {/* SẢN PHẨM 3 */}
          <div className="group flex flex-col cursor-pointer">
            <div className="relative w-full aspect-[3/4] bg-gray-200 overflow-hidden mb-4">
              <Image src="/bootvanlentino.webp" alt="Boots" fill className="object-cover transition-all duration-700 opacity-100 group-hover:opacity-0" unoptimized />
              <Image src="/hero_warm.jpg" alt="Boots Hover" fill className="absolute inset-0 w-full h-full object-cover transition-all duration-700 scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-100" unoptimized />
              <div className="absolute top-2 right-2 px-1.5 py-0.5 text-[8px] md:text-[10px] md:px-3 md:py-1.5 md:top-3 md:right-3 tracking-widest font-medium bg-black text-white uppercase z-10">
                Sở Hữu
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-ui">@david.kicks</p>
                <div className="flex items-center gap-3 text-stone-400">
                  <button className="hover:text-red-500 transition-colors"><Heart size={16} strokeWidth={1.5} /></button>
                  <button className="hover:text-black transition-colors"><Bookmark size={16} strokeWidth={1.5} /></button>
                </div>
              </div>
              <h3 className="text-base font-heading font-semibold text-black mb-1 line-clamp-1">Boots cổ cao da thật</h3>
              <div className="hidden md:flex items-center gap-2 mb-0.5">
                <span className="text-xs text-stone-400 line-through font-ui">3.000.000đ</span>
                <span className="text-[10px] text-red-700 font-medium tracking-wider font-ui">-60%</span>
              </div>
              <p className="text-xs md:text-sm font-bold text-black font-ui">
                1.200.000đ
                <span className="md:hidden text-[10px] text-red-700 font-medium ml-1">· -60%</span>
              </p>
            </div>
          </div>

          {/* SẢN PHẨM 4 */}
          <div className="group flex flex-col cursor-pointer">
            <div className="relative w-full aspect-[3/4] bg-gray-200 overflow-hidden mb-4">
              <Image src="/evening_dress.jpg" alt="Jacket" fill className="object-cover transition-all duration-700 opacity-100 group-hover:opacity-0" unoptimized />
              <Image src="/step3_party.jpg" alt="Jacket Hover" fill className="absolute inset-0 w-full h-full object-cover transition-all duration-700 scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-100" unoptimized />
              <div className="absolute top-2 right-2 px-1.5 py-0.5 text-[8px] md:text-[10px] md:px-3 md:py-1.5 md:top-3 md:right-3 tracking-widest font-medium bg-black text-white uppercase z-10">
                Sở Hữu
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-ui">@sarah.style</p>
                <div className="flex items-center gap-3 text-stone-400">
                  <button className="hover:text-red-500 transition-colors"><Heart size={16} strokeWidth={1.5} /></button>
                  <button className="hover:text-black transition-colors"><Bookmark size={16} strokeWidth={1.5} /></button>
                </div>
              </div>
              <h3 className="text-base font-heading font-semibold text-black mb-1 line-clamp-1">Jacket da thật</h3>
              <div className="hidden md:flex items-center gap-2 mb-0.5">
                <span className="text-xs text-stone-400 line-through font-ui">4.500.000đ</span>
                <span className="text-[10px] text-red-700 font-medium tracking-wider font-ui">-60%</span>
              </div>
              <p className="text-xs md:text-sm font-bold text-black font-ui">
                1.800.000đ
                <span className="md:hidden text-[10px] text-red-700 font-medium ml-1">· -60%</span>
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ===== BẢO TÀNG KÝ ỨC TUẦN HOÀN (Nằm trên mục Chợ Xanh) ===== */}
      <section className="w-full px-4 md:px-8 lg:px-10 xl:px-12 py-24 bg-[#F7F5F0]">
        
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-16">
          <span className="text-[10px] text-stone-500 uppercase tracking-[0.3em] mb-4 font-ui font-bold">Cloop Stories</span>
          <h2 className="text-4xl lg:text-5xl font-heading font-extrabold text-[#0A2517] mb-6 tracking-tight">
            Bảo Tàng Ký Ức Tuần Hoàn
          </h2>
          <p className="text-base lg:text-lg text-stone-600 font-body max-w-2xl leading-relaxed">
            Mỗi nếp gấp, mỗi vết sờn đều cất giấu một câu chuyện chưa kể. Trước khi tìm thấy chủ nhân mới, hãy lắng nghe những mảnh ký ức được dệt nên từ những ngày tháng cũ.
          </p>
        </div>

        {/* 📱 MOBILE VIEW: Lướt Ngang 3 Câu Chuyện */}
        <div className="md:hidden flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2">
          {/* STORY 1 */}
          <div className="w-[280px] shrink-0 group relative h-[380px] overflow-hidden cursor-pointer rounded-2xl shadow-sm">
            <Image src="/vintage_coat.jpg" alt="Chiếc Blazer Năm 1998" fill className="object-cover" unoptimized />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent"></div>
            <div className="absolute inset-0 flex flex-col justify-end p-5 text-white">
              <h3 className="text-xl font-heading font-bold mb-2">Chiếc Blazer Năm 1998</h3>
              <p className="text-xs text-stone-200 font-body italic mb-4 line-clamp-3 leading-relaxed">
                "Chiếc áo này được mua bằng tháng lương đầu tiên của mẹ tôi. Nó đã chứng kiến những ngày tháng thanh xuân rực rỡ..."
              </p>
              <div className="flex items-center gap-2.5 pt-3 border-t border-white/20">
                <div className="w-7 h-7 rounded-full bg-stone-300 overflow-hidden relative border border-white">
                  <Image src="/avatar_1.jpg" alt="User" fill className="object-cover" unoptimized />
                </div>
                <span className="text-[11px] uppercase tracking-wider text-white/90 font-ui font-semibold">@olivia.style</span>
              </div>
            </div>
          </div>

          {/* STORY 2 */}
          <div className="w-[280px] shrink-0 group relative h-[380px] overflow-hidden cursor-pointer rounded-2xl shadow-sm">
            <Image src="/evening_dress.jpg" alt="Đêm Dạ Vũ Tỏa Sáng" fill className="object-cover" unoptimized />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent"></div>
            <div className="absolute inset-0 flex flex-col justify-end p-5 text-white">
              <h3 className="text-xl font-heading font-bold mb-2">Đêm Dạ Vũ Tỏa Sáng</h3>
              <p className="text-xs text-stone-200 font-body italic mb-4 line-clamp-3 leading-relaxed">
                "Mình chỉ mặc chiếc váy lụa đỏ này đúng một lần vào đêm Prom. Thanh xuân của mình đã trọn vẹn và lấp lánh cùng nó..."
              </p>
              <div className="flex items-center gap-2.5 pt-3 border-t border-white/20">
                <div className="w-7 h-7 rounded-full bg-stone-300 overflow-hidden relative border border-white">
                  <Image src="/avatar_2.jpg" alt="User" fill className="object-cover" unoptimized />
                </div>
                <span className="text-[11px] uppercase tracking-wider text-white/90 font-ui font-semibold">@chloe.vintage</span>
              </div>
            </div>
          </div>

          {/* STORY 3 */}
          <div className="w-[280px] shrink-0 group relative h-[380px] overflow-hidden cursor-pointer rounded-2xl shadow-sm">
            <Image src="/1.2.jpg" alt="Kẻ Lữ Hành Cô Độc" fill className="object-cover" unoptimized />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent"></div>
            <div className="absolute inset-0 flex flex-col justify-end p-5 text-white">
              <h3 className="text-xl font-heading font-bold mb-2">Kẻ Lữ Hành Cô Độc</h3>
              <p className="text-xs text-stone-200 font-body italic mb-4 line-clamp-3 leading-relaxed">
                "Chiếc áo da sờn vai đã cùng tôi rong ruổi khắp các cung đường Tây Bắc. Gửi lại cho những tâm hồn tự do..."
              </p>
              <div className="flex items-center gap-2.5 pt-3 border-t border-white/20">
                <div className="w-7 h-7 rounded-full bg-stone-300 overflow-hidden relative border border-white">
                  <Image src="/avatar_3.jpg" alt="User" fill className="object-cover" unoptimized />
                </div>
                <span className="text-[11px] uppercase tracking-wider text-white/90 font-ui font-semibold">@dustin.journey</span>
              </div>
            </div>
          </div>
        </div>

        {/* 🖥️ DESKTOP VIEW: Lưới 3 câu chuyện NGUYÊN BẢN (3 Columns) */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          
          {/* ===== STORY 1: TÌNH CẢM GIA ĐÌNH ===== */}
          <div className="group relative w-full h-[500px] lg:h-[600px] overflow-hidden cursor-pointer rounded-2xl shadow-md">
            {/* Background Image */}
            <Image src="/vintage_coat.jpg" alt="Chiếc Blazer của mẹ" fill className="object-cover transition-transform duration-1000 group-hover:scale-105" unoptimized />
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>

            {/* Content overlaid */}
            <div className="absolute inset-0 flex flex-col justify-end p-6 lg:p-8 text-white">
              <h3 className="text-2xl lg:text-3xl font-heading font-bold mb-3 drop-shadow-md">Chiếc Blazer Năm 1998</h3>
              <p className="text-sm text-stone-200 leading-relaxed font-body italic mb-6 drop-shadow line-clamp-3 group-hover:line-clamp-none transition-all duration-500">
                "Chiếc áo này được mua bằng tháng lương đầu tiên của mẹ tôi. Nó đã chứng kiến những ngày tháng thanh xuân rực rỡ và đầy kiêu hãnh của bà. Giờ đây, tôi muốn nó tiếp tục khoác lên vai và mang lại sự tự tin cho một cô gái khác trên nấc thang sự nghiệp của mình."
              </p>
              <div className="flex items-center gap-3 pt-5 border-t border-white/20">
                <div className="w-10 h-10 rounded-full bg-stone-300 overflow-hidden relative border-2 border-white">
                  <Image src="/avatar_1.jpg" alt="User" fill className="object-cover" unoptimized />
                </div>
                <span className="text-xs uppercase tracking-widest text-white/80 font-ui font-bold drop-shadow">@olivia.style</span>
              </div>
            </div>
          </div>

          {/* ===== STORY 2: THANH XUÂN TƯƠI ĐẸP ===== */}
          <div className="group relative w-full h-[500px] lg:h-[600px] overflow-hidden cursor-pointer rounded-2xl shadow-md">
            <Image src="/evening_dress.jpg" alt="Váy Dạ Hội Prom" fill className="object-cover transition-transform duration-1000 group-hover:scale-105" unoptimized />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
            
            <div className="absolute inset-0 flex flex-col justify-end p-6 lg:p-8 text-white">
              <h3 className="text-2xl lg:text-3xl font-heading font-bold mb-3 drop-shadow-md">Đêm Dạ Vũ Tỏa Sáng</h3>
              <p className="text-sm text-stone-200 leading-relaxed font-body italic mb-6 drop-shadow line-clamp-3 group-hover:line-clamp-none transition-all duration-500">
                "Mình chỉ mặc chiếc váy lụa đỏ này đúng một lần vào đêm Prom đại học. Thanh xuân của mình đã trọn vẹn và lấp lánh cùng nó. Thay vì cất sâu trong đáy tủ bám bụi, mình mong nó sẽ thắp sáng một đêm diệu kỳ nữa cho cô chủ nhân mới."
              </p>
              <div className="flex items-center gap-3 pt-5 border-t border-white/20">
                <div className="w-10 h-10 rounded-full bg-stone-300 overflow-hidden relative border-2 border-white">
                  <Image src="/avatar_2.jpg" alt="User" fill className="object-cover" unoptimized />
                </div>
                <span className="text-xs uppercase tracking-widest text-white/80 font-ui font-bold drop-shadow">@chloe.vintage</span>
              </div>
            </div>
          </div>

          {/* ===== STORY 3: NHỮNG CHUYẾN ĐI ===== */}
          <div className="group relative w-full h-[500px] lg:h-[600px] overflow-hidden cursor-pointer rounded-2xl shadow-md">
            <Image src="/1.2.jpg" alt="Áo Da Biker" fill className="object-cover transition-transform duration-1000 group-hover:scale-105" unoptimized />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
            
            <div className="absolute inset-0 flex flex-col justify-end p-6 lg:p-8 text-white">
              <h3 className="text-2xl lg:text-3xl font-heading font-bold mb-3 drop-shadow-md">Kẻ Lữ Hành Cô Độc</h3>
              <p className="text-sm text-stone-200 leading-relaxed font-body italic mb-6 drop-shadow line-clamp-3 group-hover:line-clamp-none transition-all duration-500">
                "Chiếc áo da sờn vai này đã cùng tôi rong ruổi khắp các cung đường Tây Bắc. Mỗi vết xước là một dặm đường, một cơn mưa rừng hay một ánh lửa trại ấm áp. Gửi gắm lại đây cho những tâm hồn tự do, đam mê xê dịch và sự phong trần."
              </p>
              <div className="flex items-center gap-3 pt-5 border-t border-white/20">
                <div className="w-10 h-10 rounded-full bg-stone-300 overflow-hidden relative border-2 border-white">
                   <Image src="/avatar_3.jpg" alt="User" fill className="object-cover" unoptimized />
                </div>
                <span className="text-xs uppercase tracking-widest text-white/80 font-ui font-bold drop-shadow">@dustin.journey</span>
              </div>
            </div>
          </div>

        </div>

        {/* Nút Xem thêm */}
        <div className="flex justify-center mt-16">
          <button className="border-b-[2px] border-[#0A2517] pb-1 text-xs uppercase tracking-[0.2em] font-ui font-bold text-[#0A2517] hover:text-stone-500 hover:border-stone-500 transition-all">
            Đọc Thêm Câu Chuyện
          </button>
        </div>
      </section>

      {/* SECTION 5: CHỢ XANH (GREEN MARKET BANNER) */}
      <section className="w-full relative min-h-[400px] flex items-center overflow-hidden">
        {/* Full-width Background Image */}
        <Image 
          src="https://images.unsplash.com/photo-1518882585223-9c8eb0041a31?q=80&w=1600" 
          alt="Fabric Upcycle" 
          fill 
          className="object-cover" 
          unoptimized 
        />
        {/* Dark Green Overlay for Contrast */}
        <div className="absolute inset-0 bg-[#0A2517]/80" />
        
        {/* Content */}
        <div className="relative z-10 w-full max-w-[1200px] mx-auto p-8 md:p-16 text-center text-white flex flex-col items-center">
          <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold mb-6 drop-shadow-md text-[#FAF9F6]">
            Chợ Xanh CLOOP
          </h2>
          <p className="font-body text-base md:text-lg lg:text-xl text-white/90 mb-10 max-w-3xl drop-shadow-sm leading-relaxed">
            Kéo dài vòng đời thời trang. Nơi dành riêng cho sinh viên thiết kế, Local Brand và các tín đồ Upcycling săn nguyên liệu độc đáo.
          </p>
          <Link href="/green-market" className="inline-block font-ui text-xs md:text-sm font-bold uppercase tracking-widest px-10 py-4 bg-[#FAF9F6] text-[#0A2517] hover:bg-white transition-colors rounded-sm shadow-lg">
            Khám Phá Nguyên Liệu
          </Link>
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
