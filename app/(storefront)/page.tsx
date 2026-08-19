"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Star, Heart, Bookmark, Sparkles, Search, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import MagneticButton from "@/app/components/MagneticButton";
import { supabase } from "@/lib/supabase";
import ProductLikeSaveButtons from "@/components/ProductLikeSaveButtons";
import { getTrendingProductsAction } from "@/app/actions/favorite";

export default function Home() {
  const [activeRentalCategory, setActiveRentalCategory] = useState("Tất cả");
  const rentalCategories = ["Tất cả", "Dạ hội", "Đi tiệc", "Áo dài", "Vintage"];

  const [activeResaleCategory, setActiveResaleCategory] = useState("Tất cả");
  const resaleCategories = ["Tất cả", "Túi xách", "Phụ kiện", "Áo khoác", "Váy thiết kế"];

  const [activeCard, setActiveCard] = useState(0);

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

      {/* SECTION 1: HERO - TINH GỌN & THOÁNG ĐÃNG CHUẨN HIGH-FASHION */}
      <section className="relative w-full bg-[#FAF9F6] border-b border-stone-100 overflow-hidden pt-6 pb-12 sm:py-16 lg:py-20">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            
            {/* Cột Trái: Nội Dung Tinh Gọn (Airy & Minimalist) */}
            <div className="w-full lg:w-1/2 flex flex-col items-start text-left">
              {/* Pill Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/5 text-[#183A2D] text-[11px] font-semibold tracking-wider uppercase mb-4 border border-[#183A2D]/10">
                <Sparkles size={12} className="text-[#183A2D]" /> Thời Trang Tuần Hoàn 2026
              </div>

              {/* Headline: Thoáng, không bị bẻ dòng vụn vặt */}
              <h1 className="font-heading text-2xl sm:text-4xl md:text-5xl font-extrabold text-[#0A2517] leading-[1.2] tracking-tight mb-3 sm:mb-4">
                Thuê & Sở Hữu <br className="hidden sm:inline" />
                <span className="text-[#183A2D]">Thời Trang Tuần Hoàn</span>
              </h1>

              {/* Subtext: 2 dòng ngắn gọn, dễ thở */}
              <p className="font-body text-xs sm:text-base text-stone-600 leading-relaxed mb-6 max-w-lg">
                Tủ đồ cao cấp xoay vòng không giới hạn. Tận hưởng hàng ngàn thiết kế độc bản từ cộng đồng, tiết kiệm 90% chi phí và phong cách mỗi ngày.
              </p>

              {/* Minimalist Smart Search Bar (Gọn gàng trên Mobile) */}
              <div className="w-full max-w-md mb-6">
                <div className="relative flex items-center bg-white border border-stone-200/80 rounded-full p-1.5 pl-4 shadow-xs focus-within:ring-2 focus-within:ring-[#183A2D]/15 transition-all">
                  <Search size={16} className="text-stone-400 mr-2.5 shrink-0" />
                  <input 
                    type="text" 
                    placeholder="Tìm váy dạ tiệc, blazer, áo dài..." 
                    className="flex-1 bg-transparent border-none outline-none font-ui text-xs sm:text-sm text-[#0A2517] placeholder:text-stone-400"
                  />
                  <Link href="/shop" className="px-4 py-2 bg-[#183A2D] hover:bg-[#122b22] text-white rounded-full text-xs font-semibold tracking-wide transition-colors shrink-0">
                    Tìm kiếm
                  </Link>
                </div>

                {/* Quick Tags Trượt Ngang Trên Mobile */}
                <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar py-1">
                  <span className="text-[10px] uppercase font-bold text-stone-400 shrink-0">Gợi ý:</span>
                  {["Váy dạ tiệc", "Blazer", "Áo dài", "Túi hiệu", "Tweed"].map((tag) => (
                    <Link
                      key={tag}
                      href={`/shop?q=${encodeURIComponent(tag)}`}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-stone-200/70 text-stone-600 hover:text-[#183A2D] hover:border-[#183A2D] transition-colors whitespace-nowrap shrink-0 shadow-2xs"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>

              {/* CTAs */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link 
                  href="/shop" 
                  className="flex-1 sm:flex-initial text-center font-ui font-semibold text-xs sm:text-sm px-6 py-3 bg-[#183A2D] hover:bg-[#122b22] text-white rounded-xl transition-all duration-300 shadow-sm flex items-center justify-center gap-2"
                >
                  Khám phá tủ đồ <ArrowRight size={14} />
                </Link>
                
                <Link 
                  href="/my-closet/create" 
                  className="flex-1 sm:flex-initial text-center font-ui font-semibold text-xs sm:text-sm px-5 py-3 bg-white text-[#183A2D] border border-stone-200 hover:border-[#183A2D] rounded-xl transition-all duration-300 shadow-2xs"
                >
                  + Đăng chia sẻ đồ
                </Link>
              </div>
            </div>

            {/* Cột Phải: Khung Ảnh Bo Tròn Thoáng Đãng */}
            <div className="w-full lg:w-1/2 relative">
              <div className="relative w-full aspect-[16/10] sm:aspect-[4/3] lg:aspect-[1/1] rounded-2xl overflow-hidden shadow-md border border-stone-200/50 bg-stone-100">
                <Image 
                  src="/anhbia.png" 
                  alt="CLOOP Fashion Community" 
                  fill 
                  className="object-cover object-center" 
                  priority
                  unoptimized 
                />
                
                {/* Floating Clean Badge */}
                <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/50 shadow-sm flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-[#183A2D] font-bold text-xs">
                    90%
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Tiết kiệm</p>
                    <p className="text-xs font-bold text-[#183A2D]">Thuê hàng hiệu chuẩn gu</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 2: TỦ ĐỒ NỔI BẬT - MOBILE CAROUSEL & DESKTOP ACCORDION */}
      <section className="w-full py-10 sm:py-16 bg-[#F9F9F9] border-b border-stone-100">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="flex justify-between items-end mb-6 sm:mb-8">
            <div>
              <p className="font-ui text-[10px] sm:text-xs text-stone-500 uppercase tracking-[0.25em] mb-1">Cộng Đồng</p>
              <h2 className="font-heading text-xl sm:text-3xl lg:text-4xl text-[#0A2517] tracking-tight font-extrabold">
                Tủ Đồ Nổi Bật
              </h2>
            </div>
            <Link href="/closets" className="font-ui text-xs sm:text-sm font-semibold text-[#183A2D] hover:underline flex items-center gap-1">
              Xem tất cả <ArrowRight size={14} />
            </Link>
          </div>

          {/* 📱 MOBILE VIEW: Swipe Cards (Thoáng mắt, dễ lướt bằng ngón cái) */}
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

          {/* 🖥️ DESKTOP VIEW: Accordion Thần Thánh */}
          <div className="hidden md:flex flex-row w-full h-[450px] gap-3 lg:gap-4">
            {featuredClosets.map((closet, index) => {
              const isActive = activeCard === index;
              return (
                <div
                  key={closet.id}
                  onMouseEnter={() => setActiveCard(index)}
                  className={`relative overflow-hidden cursor-pointer rounded-2xl transition-[flex] duration-700 ease-out
                    ${isActive ? 'flex-[5] shadow-lg' : 'flex-[1] hover:flex-[1.2] shadow-xs'}
                  `}
                >
                  <Image
                    src={closet.mainImg}
                    alt={closet.username}
                    fill
                    unoptimized
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-700
                      ${isActive ? 'brightness-100' : 'brightness-[0.6] grayscale-[30%] hover:brightness-75'}
                    `}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>

                  <div 
                    className={`absolute inset-0 flex flex-col items-center justify-end pb-8 transition-opacity duration-300
                      ${isActive ? 'opacity-0 hidden' : 'opacity-100 delay-300'}
                    `}
                  >
                    <h3 
                      className="text-white font-heading text-xl tracking-wider text-center"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                    >
                      {closet.username}
                    </h3>
                  </div>

                  <div className={`absolute bottom-0 left-0 w-full p-6 lg:p-8 flex justify-between items-end transition-all duration-700 transform
                    ${isActive ? 'opacity-100 translate-y-0 delay-200' : 'opacity-0 translate-y-8 pointer-events-none hidden'}
                  `}>
                    <div className="text-white max-w-sm">
                      <span className="inline-block bg-white text-[#0A2517] font-ui text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded mb-2">
                        {closet.tag}
                      </span>
                      <h3 className="font-heading font-extrabold text-2xl lg:text-3xl leading-none mb-2">
                        {closet.username}
                      </h3>
                      <p className="text-stone-300 font-body text-xs font-light leading-relaxed">
                        {closet.bio}
                      </p>
                      <Link href={`/closet/${closet.id}`} className="inline-block mt-3 border-b border-white pb-0.5 font-ui text-xs uppercase tracking-widest hover:text-stone-300 hover:border-stone-300 transition-colors">
                        Vào Tủ Đồ &rarr;
                      </Link>
                    </div>

                    <div className="flex gap-2">
                      {closet.items.map((itemImg, idx) => (
                        <div key={idx} className="relative w-12 aspect-[7/10] border border-white/20 bg-black/20 backdrop-blur-xs overflow-hidden rounded">
                          <Image src={itemImg} fill unoptimized className="object-cover hover:scale-110 transition-transform duration-500" alt="item" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 3: TRANG PHỤC CHO THUÊ (RENTAL HUB) */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-16 md:py-20 bg-white border-t border-stone-100">
        <div className="max-w-7xl mx-auto">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 sm:mb-10 gap-3 sm:gap-6 border-b border-stone-200/70 pb-4">
            <div>
              <p className="font-ui text-[10px] sm:text-xs text-stone-500 uppercase tracking-[0.25em] mb-1">Thịnh Hành</p>
              <h2 className="text-xl sm:text-3xl lg:text-4xl font-heading font-extrabold text-[#0A2517] tracking-tight">
                Trang Phục Cho Thuê
              </h2>
            </div>
            
            <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar shrink-0">
              {/* Nhóm Tabs */}
              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-semibold text-stone-500 font-ui shrink-0">
                {rentalCategories.map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setActiveRentalCategory(cat)}
                    className={`px-3 py-1.5 rounded-full transition-all shrink-0 cursor-pointer ${
                      activeRentalCategory === cat 
                        ? 'bg-[#183A2D] text-white shadow-2xs font-bold' 
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="hidden md:block w-px h-4 bg-stone-300"></div>

              <Link 
                href="/shop" 
                className="font-ui text-xs sm:text-sm font-semibold text-[#183A2D] hover:underline flex items-center gap-1 shrink-0 ml-auto md:ml-0"
              >
                Xem tất cả <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* LAYOUT: CHIA ĐÔI TRÊN DESKTOP, LƯỚI TRỰC DIỆN TRÊN MOBILE */}
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 lg:items-stretch">
            
            {/* ===== LEFT: HERO POSTER (Ẩn trên mobile để đỡ chật chội, hiện trên Desktop) ===== */}
            <div className="hidden lg:block w-full lg:w-1/2 group relative bg-stone-100 cursor-pointer overflow-hidden rounded-2xl aspect-[3/4] min-h-[600px]">
              <Image src="/1.1.jpg" alt="Váy Dạ Hội" fill className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 opacity-100 group-hover:opacity-0" unoptimized />
              <Image src="/1.1 (1).jpg" alt="Váy Dạ Hội Hover" fill className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-100" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity pointer-events-none"></div>
              
              <div className="absolute top-5 left-5 bg-black/80 backdrop-blur-xs text-white text-[9px] uppercase tracking-[0.2em] px-3 py-1.5 font-bold font-ui rounded">
                Stylist's Pick
              </div>

              <div className="absolute bottom-0 left-0 w-full p-8 text-white">
                <p className="text-[10px] uppercase tracking-[0.2em] opacity-80 font-ui mb-1">@the.archive</p>
                <h3 className="text-3xl font-heading font-extrabold leading-tight mb-3">Váy Dạ Hội Xẻ Tà Lụa Satin</h3>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs text-stone-300 line-through font-ui">Retail: 3.500.000đ</span>
                  <span className="text-[10px] bg-white/20 backdrop-blur-xs text-white font-semibold px-2 py-0.5 rounded uppercase font-ui">Save 90%</span>
                </div>
                <p className="text-2xl font-bold text-white font-ui mb-5">350.000đ <span className="text-xs font-normal opacity-70">/ngày</span></p>
                <Link href="/shop" className="inline-flex items-center gap-1 text-xs uppercase tracking-wider font-bold text-white border-b border-white pb-1 hover:text-stone-300 hover:border-stone-300 transition-colors">
                  Thuê Ngay &rarr;
                </Link>
              </div>
            </div>

            {/* ===== RIGHT: GRID SẢN PHẨM (2 CỘT GỌN GÀNG TRÊN MOBILE) ===== */}
            <div className="w-full lg:w-1/2 grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 h-fit">
              {/* RENDER DYNAMIC BOOSTED & TRENDING PRODUCTS */}
              {boostedProducts.map((product) => {
                const primaryImg = product.images?.find((img: any) => img.isPrimary)?.url || product.images?.[0]?.url || "/placeholder-clothing.png";
                const isBoosted = product.boostExpiresAt && new Date(product.boostExpiresAt) > new Date();
                return (
                  <div key={product.id} className="group flex flex-col bg-white rounded-xl border border-stone-200/70 overflow-hidden shadow-2xs hover:shadow-xs transition-all duration-300">
                    <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden">
                      {/* BADGE BOOST */}
                      {isBoosted && (
                        <div className="absolute top-2 left-2 bg-rose-600 text-white font-ui text-[8.5px] font-bold uppercase px-2 py-0.5 rounded shadow-2xs z-10 flex items-center gap-1">
                          <Sparkles size={9} /> Top 1
                        </div>
                      )}
                      {product.isHighlighted && !isBoosted && (
                        <div className="absolute top-2 left-2 bg-emerald-700 text-white font-ui text-[8.5px] font-bold uppercase px-2 py-0.5 rounded shadow-2xs z-10">
                          Uy Tín
                        </div>
                      )}
                      <Image src={primaryImg} alt={product.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized />
                    </div>

                    <div className="p-2.5 sm:p-3.5 flex flex-col justify-between flex-1 gap-1.5">
                      <div className="flex justify-between items-center">
                        <Link href={`/closet/${product.userId}`} className="text-[9px] text-stone-400 uppercase tracking-wider font-ui hover:text-[#183A2D] transition-colors truncate max-w-[90px]">
                          @{product.user?.name || "closet"}
                        </Link>
                        <ProductLikeSaveButtons
                          productId={product.id}
                          initialLikeCount={product.likeCount || 0}
                          initialSaveCount={product.saveCount || 0}
                          variant="compact"
                          showCounts={true}
                        />
                      </div>

                      <Link href={`/checkout/${product.id}`}>
                        <h3 className="text-xs sm:text-sm font-semibold text-stone-900 line-clamp-1 group-hover:text-[#183A2D] transition-colors">
                          {product.title}
                        </h3>
                      </Link>
                      
                      <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-bold text-[#183A2D] font-ui">
                          {product.listings?.[0]?.basePrice ? `${product.listings[0].basePrice.toLocaleString('vi-VN')}đ` : 'Đang thuê'} <span className="text-[9px] text-stone-400 font-normal">/ngày</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* FALLBACK MOCK DATA NẾU CHƯA CÓ ĐỦ SẢN PHẨM */}
              {boostedProducts.length < 4 && (
                <>
                  <div className="group flex flex-col bg-white rounded-xl border border-stone-200/70 overflow-hidden shadow-2xs hover:shadow-xs transition-all duration-300">
                    <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden">
                      <Image src="/1.2.jpeg" alt="Set Tweed Dạ Cổ Điển" fill className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized />
                    </div>
                    <div className="p-2.5 sm:p-3.5 flex flex-col justify-between flex-1 gap-1.5">
                      <div className="flex justify-between items-center">
                        <p className="text-[9px] text-stone-400 uppercase tracking-wider font-ui truncate max-w-[90px]">@chic.street</p>
                        <ProductLikeSaveButtons productId="mock-fallback-1" initialLikeCount={18} initialSaveCount={12} variant="compact" showCounts={true} />
                      </div>
                      <Link href="/shop">
                        <h3 className="text-xs sm:text-sm font-semibold text-stone-900 line-clamp-1 group-hover:text-[#183A2D] transition-colors">Set Tweed Dạ Cổ Điển</h3>
                      </Link>
                      <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-bold text-[#183A2D] font-ui">180.000đ <span className="text-[9px] text-stone-400 font-normal">/ngày</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="group flex flex-col bg-white rounded-xl border border-stone-200/70 overflow-hidden shadow-2xs hover:shadow-xs transition-all duration-300">
                    <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden">
                      <Image src="/2.1.jpg" alt="Đầm Dạ Tiệc Tối Giản" fill className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized />
                    </div>
                    <div className="p-2.5 sm:p-3.5 flex flex-col justify-between flex-1 gap-1.5">
                      <div className="flex justify-between items-center">
                        <p className="text-[9px] text-stone-400 uppercase tracking-wider font-ui truncate max-w-[90px]">@minimal.edit</p>
                        <ProductLikeSaveButtons productId="mock-fallback-2" initialLikeCount={29} initialSaveCount={16} variant="compact" showCounts={true} />
                      </div>
                      <Link href="/shop">
                        <h3 className="text-xs sm:text-sm font-semibold text-stone-900 line-clamp-1 group-hover:text-[#183A2D] transition-colors">Đầm Dạ Tiệc Tối Giản</h3>
                      </Link>
                      <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-bold text-[#183A2D] font-ui">350.000đ <span className="text-[9px] text-stone-400 font-normal">/ngày</span></p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* ===== END RIGHT ===== */}

          </div>
        </div>
      </section>

      {/* SECTION 4: CHUYỂN NHƯỢNG & KÝ GỬI (RESALE MARKET) */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-16 md:py-20 bg-[#F9F9F9] border-t border-stone-100">
        <div className="max-w-7xl mx-auto">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 sm:mb-10 gap-3 sm:gap-6 border-b border-stone-200/70 pb-4">
            <div>
              <p className="font-ui text-[10px] sm:text-xs text-stone-500 uppercase tracking-[0.25em] mb-1">Pass Đồ Tuyển Chọn</p>
              <h2 className="text-xl sm:text-3xl lg:text-4xl font-heading font-extrabold text-[#0A2517] tracking-tight">
                Trang Phục Thanh Lý
              </h2>
            </div>
            
            <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-semibold text-stone-500 font-ui shrink-0">
                {resaleCategories.map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setActiveResaleCategory(cat)}
                    className={`px-3 py-1.5 rounded-full transition-all shrink-0 cursor-pointer ${
                      activeResaleCategory === cat 
                        ? 'bg-[#183A2D] text-white shadow-2xs font-bold' 
                        : 'bg-white hover:bg-stone-200 text-stone-600 border border-stone-200/70'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="hidden md:block w-px h-4 bg-stone-300"></div>

              <Link 
                href="/shop" 
                className="font-ui text-xs sm:text-sm font-semibold text-[#183A2D] hover:underline flex items-center gap-1 shrink-0 ml-auto md:ml-0"
              >
                Xem tất cả <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* LƯỚI SẢN PHẨM (2 CỘT MOBILE / 4 CỘT DESKTOP) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {/* SẢN PHẨM 1 */}
            <div className="group flex flex-col bg-white rounded-xl border border-stone-200/70 overflow-hidden shadow-2xs hover:shadow-xs transition-all duration-300">
              <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden">
                <Image src="/vintage_coat.jpg" alt="Túi xách Gucci" fill className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized />
                <div className="absolute top-2 left-2 px-2 py-0.5 text-[8.5px] tracking-wider font-bold bg-black/80 backdrop-blur-xs text-white uppercase rounded z-10">
                  Sở Hữu
                </div>
              </div>
              <div className="p-2.5 sm:p-3.5 flex flex-col justify-between flex-1 gap-1.5">
                <div className="flex justify-between items-center">
                  <p className="text-[9px] text-stone-400 uppercase tracking-wider font-ui truncate max-w-[90px]">@emma.closet</p>
                  <ProductLikeSaveButtons productId="mock-resale-1" initialLikeCount={12} initialSaveCount={8} variant="compact" showCounts={true} />
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-stone-900 line-clamp-1 group-hover:text-[#183A2D] transition-colors">Túi xách Gucci (Pass nhanh)</h3>
                <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between">
                  <p className="text-xs sm:text-sm font-bold text-[#183A2D] font-ui">2.500.000đ</p>
                  <span className="text-[9px] text-red-600 font-semibold bg-red-50 px-1.5 py-0.5 rounded">-50%</span>
                </div>
              </div>
            </div>

            {/* SẢN PHẨM 2 */}
            <div className="group flex flex-col bg-white rounded-xl border border-stone-200/70 overflow-hidden shadow-2xs hover:shadow-xs transition-all duration-300">
              <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden">
                <Image src="/kinhgucci.webp" alt="Kính râm" fill className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized />
                <div className="absolute top-2 left-2 px-2 py-0.5 text-[8.5px] tracking-wider font-bold bg-black/80 backdrop-blur-xs text-white uppercase rounded z-10">
                  Sở Hữu
                </div>
              </div>
              <div className="p-2.5 sm:p-3.5 flex flex-col justify-between flex-1 gap-1.5">
                <div className="flex justify-between items-center">
                  <p className="text-[9px] text-stone-400 uppercase tracking-wider font-ui truncate max-w-[90px]">@lucy.vintage</p>
                  <ProductLikeSaveButtons productId="mock-resale-2" initialLikeCount={25} initialSaveCount={15} variant="compact" showCounts={true} />
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-stone-900 line-clamp-1 group-hover:text-[#183A2D] transition-colors">Kính râm Cat-eye</h3>
                <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between">
                  <p className="text-xs sm:text-sm font-bold text-[#183A2D] font-ui">300.000đ</p>
                  <span className="text-[9px] text-red-600 font-semibold bg-red-50 px-1.5 py-0.5 rounded">-70%</span>
                </div>
              </div>
            </div>

            {/* SẢN PHẨM 3 */}
            <div className="group flex flex-col bg-white rounded-xl border border-stone-200/70 overflow-hidden shadow-2xs hover:shadow-xs transition-all duration-300">
              <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden">
                <Image src="/bootvanlentino.webp" alt="Boots" fill className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized />
                <div className="absolute top-2 left-2 px-2 py-0.5 text-[8.5px] tracking-wider font-bold bg-black/80 backdrop-blur-xs text-white uppercase rounded z-10">
                  Sở Hữu
                </div>
              </div>
              <div className="p-2.5 sm:p-3.5 flex flex-col justify-between flex-1 gap-1.5">
                <div className="flex justify-between items-center">
                  <p className="text-[9px] text-stone-400 uppercase tracking-wider font-ui truncate max-w-[90px]">@david.kicks</p>
                  <ProductLikeSaveButtons productId="mock-resale-3" initialLikeCount={19} initialSaveCount={9} variant="compact" showCounts={true} />
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-stone-900 line-clamp-1 group-hover:text-[#183A2D] transition-colors">Boots cổ cao da thật</h3>
                <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between">
                  <p className="text-xs sm:text-sm font-bold text-[#183A2D] font-ui">1.200.000đ</p>
                  <span className="text-[9px] text-red-600 font-semibold bg-red-50 px-1.5 py-0.5 rounded">-60%</span>
                </div>
              </div>
            </div>

            {/* SẢN PHẨM 4 */}
            <div className="group flex flex-col bg-white rounded-xl border border-stone-200/70 overflow-hidden shadow-2xs hover:shadow-xs transition-all duration-300">
              <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden">
                <Image src="/evening_dress.jpg" alt="Jacket" fill className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized />
                <div className="absolute top-2 left-2 px-2 py-0.5 text-[8.5px] tracking-wider font-bold bg-black/80 backdrop-blur-xs text-white uppercase rounded z-10">
                  Sở Hữu
                </div>
              </div>
              <div className="p-2.5 sm:p-3.5 flex flex-col justify-between flex-1 gap-1.5">
                <div className="flex justify-between items-center">
                  <p className="text-[9px] text-stone-400 uppercase tracking-wider font-ui truncate max-w-[90px]">@sophia.closet</p>
                  <ProductLikeSaveButtons productId="mock-resale-4" initialLikeCount={34} initialSaveCount={21} variant="compact" showCounts={true} />
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-stone-900 line-clamp-1 group-hover:text-[#183A2D] transition-colors">Đầm Dạ Hội Lụa Đỏ</h3>
                <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between">
                  <p className="text-xs sm:text-sm font-bold text-[#183A2D] font-ui">1.800.000đ</p>
                  <span className="text-[9px] text-red-600 font-semibold bg-red-50 px-1.5 py-0.5 rounded">-40%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== BẢO TÀNG KÝ ỨC TUẦN HOÀN (CLOOP STORIES) ===== */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-24 bg-[#F7F5F0]">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col items-center text-center mb-8 sm:mb-14">
            <span className="text-[10px] text-stone-500 uppercase tracking-[0.3em] mb-2 font-ui font-bold">Cloop Stories</span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-heading font-extrabold text-[#0A2517] mb-3 tracking-tight">
              Bảo Tàng Ký Ức Tuần Hoàn
            </h2>
            <p className="text-xs sm:text-base text-stone-600 font-body max-w-xl leading-relaxed">
              Mỗi nếp gấp đều cất giấu một câu chuyện. Lắng nghe những mảnh ký ức trước khi tìm thấy chủ nhân mới.
            </p>
          </div>

          {/* Lưới câu chuyện: Trượt ngang trên Mobile, 3 cột trên Desktop */}
          <div className="flex md:grid md:grid-cols-3 gap-4 lg:gap-8 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 pb-2">
            {/* STORY 1 */}
            <div className="w-[280px] md:w-auto shrink-0 group relative h-[380px] md:h-[480px] lg:h-[540px] overflow-hidden cursor-pointer rounded-2xl shadow-sm border border-stone-200/50">
              <Image src="/vintage_coat.jpg" alt="Chiếc Blazer Năm 1998" fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent"></div>
              <div className="absolute inset-0 flex flex-col justify-end p-5 lg:p-7 text-white">
                <h3 className="text-lg lg:text-2xl font-heading font-bold mb-2">Chiếc Blazer Năm 1998</h3>
                <p className="text-xs text-stone-200 font-body italic mb-4 line-clamp-3 leading-relaxed">
                  "Chiếc áo này được mua bằng tháng lương đầu tiên của mẹ tôi, chứng kiến những ngày thanh xuân rực rỡ và đầy kiêu hãnh..."
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
            <div className="w-[280px] md:w-auto shrink-0 group relative h-[380px] md:h-[480px] lg:h-[540px] overflow-hidden cursor-pointer rounded-2xl shadow-sm border border-stone-200/50">
              <Image src="/evening_dress.jpg" alt="Đêm Dạ Vũ Tỏa Sáng" fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent"></div>
              <div className="absolute inset-0 flex flex-col justify-end p-5 lg:p-7 text-white">
                <h3 className="text-lg lg:text-2xl font-heading font-bold mb-2">Đêm Dạ Vũ Tỏa Sáng</h3>
                <p className="text-xs text-stone-200 font-body italic mb-4 line-clamp-3 leading-relaxed">
                  "Mình chỉ mặc chiếc váy lụa đỏ này đúng một lần vào đêm Prom. Mong nó sẽ tiếp tục thắp sáng một đêm diệu kỳ nữa..."
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
            <div className="w-[280px] md:w-auto shrink-0 group relative h-[380px] md:h-[480px] lg:h-[540px] overflow-hidden cursor-pointer rounded-2xl shadow-sm border border-stone-200/50">
              <Image src="/1.2.jpg" alt="Kẻ Lữ Hành Cô Độc" fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent"></div>
              <div className="absolute inset-0 flex flex-col justify-end p-5 lg:p-7 text-white">
                <h3 className="text-lg lg:text-2xl font-heading font-bold mb-2">Kẻ Lữ Hành Cô Độc</h3>
                <p className="text-xs text-stone-200 font-body italic mb-4 line-clamp-3 leading-relaxed">
                  "Chiếc áo da sờn vai đã cùng tôi rong ruổi khắp các cung đường Tây Bắc. Gửi lại cho những tâm hồn tự do và đam mê xê dịch..."
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
        </div>
      </section>

      {/* SECTION 5: CHỢ XANH (GREEN MARKET BANNER) */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto relative rounded-3xl overflow-hidden shadow-md">
          <Image 
            src="https://images.unsplash.com/photo-1518882585223-9c8eb0041a31?q=80&w=1600" 
            alt="Fabric Upcycle" 
            fill 
            className="object-cover" 
            unoptimized 
          />
          <div className="absolute inset-0 bg-[#0A2517]/85" />
          
          <div className="relative z-10 w-full p-8 sm:p-14 md:p-16 text-center text-white flex flex-col items-center">
            <h2 className="font-heading text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 text-[#FAF9F6]">
              Chợ Xanh CLOOP
            </h2>
            <p className="font-body text-xs sm:text-base text-white/90 mb-6 sm:mb-8 max-w-xl leading-relaxed">
              Kéo dài vòng đời thời trang. Không gian dành riêng cho sinh viên thiết kế, Local Brand và các tín đồ Upcycling săn nguyên liệu độc đáo.
            </p>
            <Link href="/green-market" className="font-ui text-xs sm:text-sm font-bold uppercase tracking-wider px-7 py-3.5 bg-[#FAF9F6] text-[#0A2517] hover:bg-white transition-colors rounded-xl shadow-md">
              Khám Phá Nguyên Liệu &rarr;
            </Link>
          </div>
        </div>
      </section>


    </main>
  );
}
