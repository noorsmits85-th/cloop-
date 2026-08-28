"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ArrowRight, 
  ShieldCheck, 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getTrendingProductsAction } from "@/app/actions/favorite";
import VisualSearchModal from "@/app/components/VisualSearchModal";
import LivePulseTicker from "@/app/components/LivePulseTicker";
import EcoImpactCalculator from "@/app/components/EcoImpactCalculator";
import GoogleFlowFashionHero from "@/app/components/GoogleFlowFashionHero";
import MarketingLoopShowcase from "@/app/components/MarketingLoopShowcase";

export default function Home() {
  const [activeRentalCategory, setActiveRentalCategory] = useState("Tất cả");
  const rentalCategories = ["Tất cả", "Dạ hội & Sự kiện", "Tiệc cưới", "Áo dài truyền thống", "Đồ hoài cổ 90s", "Tối giản"];

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
      tag: "Lụa Satin & Dạ Hội",
      desc: "Lụa satin óng ả, sequin lấp lánh & dáng váy dạ vũ thướt tha.", 
      image: "/evening_dress.jpg",
      link: "/shop?category=Dạ hội"
    },
    { 
      id: "Capsule", 
      title: "Tối Giản Thường Nhật", 
      tag: "Sợi Linen Tự Nhiên",
      desc: "Sợi linen tự nhiên, blazer thanh lịch & set đồ xoay vòng êm dịu.", 
      image: "/macro_fabric.jpg",
      link: "/shop?category=Đi tiệc"
    },
    { 
      id: "Archive", 
      title: "Hoài Niệm & Di Sản", 
      tag: "Bộ Sưu Tập 90s",
      desc: "Kho báu thời trang thập niên 90s, dạ tweed & nét đẹp vượt thời gian.", 
      image: "/vintage_coat.jpg",
      link: "/shop?category=Vintage"
    },
    { 
      id: "Heritage", 
      title: "Áo Dài Truyền Thống", 
      tag: "Lụa Tơ Tằm Di Sản",
      desc: "Gấm thêu tay & tơ tằm mềm mại cho những dịp kỷ niệm trang trọng.", 
      image: "/anhbia.png",
      link: "/shop?category=Áo dài"
    }
  ];

  const featuredClosets = [
    {
      id: 0,
      username: 'leena.vintage',
      tag: 'CHỦ TỦ TIÊU BIỂU',
      trustScore: '99.4/100',
      ecoBadge: '🌿 180kg CO₂ Giảm',
      bio: 'Đam mê lụa Pháp & đồ Tweed. Tuyển chọn từng đường kim mũi chỉ cho các buổi tiệc.',
      mainImg: '/vintage_coat.jpg',
      items: ['/evening_dress.jpg', '/macro_fabric.jpg', '/step2_bag.jpg'],
    },
    {
      id: 1,
      username: 'chic.street',
      tag: 'DẪN ĐẦU XU HƯỚNG',
      trustScore: '98.8/100',
      ecoBadge: '🌿 145kg CO₂ Giảm',
      bio: 'Phong cách đường phố cá tính, tự do và những món đồ tái sinh độc bản.',
      mainImg: '/anhbia.png',
      items: ['/hero_group.jpg', '/hero_warm.jpg', '/step1_phone.jpg'],
    },
    {
      id: 2,
      username: 'the.archive',
      tag: 'BỘ SƯU TẬP HIẾM',
      trustScore: '99.8/100',
      ecoBadge: '🌿 230kg CO₂ Giảm',
      bio: 'Kho báu thời trang thập niên 90s từ các nhà mốt lớn với đầy đủ câu chuyện.',
      mainImg: '/hero_group.jpg',
      items: ['/vintage_coat.jpg', '/step2_bag.jpg', '/evening_dress.jpg'],
    },
    {
      id: 3,
      username: 'minimal.edit',
      tag: 'LỐI SỐNG BỀN VỮNG',
      trustScore: '99.1/100',
      ecoBadge: '🌿 190kg CO₂ Giảm',
      bio: 'Tối giản, thanh lịch. Tủ đồ xoay vòng tinh gọn dành cho quý cô hiện đại.',
      mainImg: '/evening_dress.jpg',
      items: ['/macro_fabric.jpg', '/vintage_coat.jpg', '/step2_bag.jpg'],
    },
  ];

  const rentalCatalog = [
    { id: 101, title: "Váy Dạ Hội Xẻ Tà Lụa Satin", price: 350000, origPrice: 3500000, img: "/1.1.jpg", hoverImg: "/1.1 (1).jpg", user: "@the.archive", tag: "Thuê Nhiều" },
    { id: 102, title: "Set Dạ Tweed Cổ Điển Parisienne", price: 180000, origPrice: 2200000, img: "/1.2.jpeg", hoverImg: "/step2_bag.jpg", user: "@leena.vintage", tag: "Thanh Lịch" },
    { id: 103, title: "Đầm Dạ Tiệc Tối Giản Cúp Ngực", price: 220000, origPrice: 2800000, img: "/2.1.jpg", hoverImg: "/2.1 (1).jpg", user: "@minimal.edit", tag: "Tối Giản" },
    { id: 104, title: "Áo Dài Tơ Tằm Gấm Thêu Tay", price: 280000, origPrice: 3800000, img: "/anhbia.png", hoverImg: "/hero_warm.jpg", user: "@heritage.silk", tag: "Di Sản" },
    { id: 105, title: "Áo Khoác Da Biker Hoài Cổ 90s", price: 250000, origPrice: 4200000, img: "/1.2.jpg", hoverImg: "/step3_party.jpg", user: "@dustin.style", tag: "Hoài Cổ" },
    { id: 106, title: "Đầm Sequin Kim Tuyến Đêm Dạ Vũ", price: 320000, origPrice: 3900000, img: "/evening_dress.jpg", hoverImg: "/step1_phone.jpg", user: "@chloe.party", tag: "Dạ Hội" },
  ];

  const resaleItems = [
    { src: "/vintage_coat.jpg", hoverSrc: "/macro_fabric.jpg", title: "Túi Xách Da Cao Cấp (Chuyển Nhượng)", price: "2.500.000đ", originalPrice: "5.000.000đ", discount: "-50%", owner: "@emma.closet" },
    { src: "/kinhgucci.webp", hoverSrc: "/anhbia.png", title: "Kính Râm Mắt Mèo Cổ Điển", price: "300.000đ", originalPrice: "1.000.000đ", discount: "-70%", owner: "@lucy.vintage" },
    { src: "/bootvanlentino.webp", hoverSrc: "/hero_warm.jpg", title: "Boots Cổ Cao Da Thật", price: "1.200.000đ", originalPrice: "3.000.000đ", discount: "-60%", owner: "@david.kicks" },
    { src: "/evening_dress.jpg", hoverSrc: "/step3_party.jpg", title: "Áo Khoác Da Phong Trần", price: "1.800.000đ", originalPrice: "4.500.000đ", discount: "-60%", owner: "@sarah.style" },
    { src: "/2.1.jpg", hoverSrc: "/2.1 (1).jpg", title: "Đầm Lụa Thiết Kế Độc Bản", price: "1.450.000đ", originalPrice: "3.200.000đ", discount: "-55%", owner: "@minimal.edit" },
    { src: "/1.2.jpeg", hoverSrc: "/step2_bag.jpg", title: "Áo Khoác Dạ Tweed Cao Cấp", price: "1.100.000đ", originalPrice: "2.600.000đ", discount: "-58%", owner: "@leena.vintage" },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden antialiased bg-[#FAF9F5] text-[#0A2517] pb-28 md:pb-0 font-body">

      {/* SECTION 1: HERO - GOOGLE FLOW LIVING FASHION MOSAIC GRID */}
      <GoogleFlowFashionHero />

      {/* 🔴 LIVE CIRCULAR PULSE TICKER: Nhịp đập tuần hoàn */}
      <LivePulseTicker />

      {/* SECTION 2: BỘ SƯU TẬP THEO CẢM XÚC & DỊP SỰ KIỆN */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 mb-6 border-b border-stone-200/60 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-700"></span>
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-emerald-900/80 font-ui">
                BỘ SƯU TẬP THEO CẢM XÚC
              </span>
            </div>
            <h2 className="font-heading text-xl sm:text-2xl md:text-3xl font-extrabold text-[#183A2D] tracking-tight">
              Phong Cách Dành Riêng Cho Dịp Của Bạn
            </h2>
          </div>

          <Link 
            href="/shop" 
            className="font-ui text-[11px] font-bold uppercase tracking-widest text-[#2A4B2E] hover:text-[#183A2D] flex items-center gap-1 group shrink-0"
          >
            Tất cả phong cách <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 4 Graceful Visual Portrait Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {moodCapsules.map((capsule) => (
            <Link
              key={capsule.id}
              href={capsule.link}
              className="group relative aspect-[3/4] sm:aspect-[4/5] rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-700 flex flex-col justify-end p-4 cursor-pointer border border-[#E0ECE0]/80"
            >
              <Image 
                src={capsule.image} 
                alt={capsule.title} 
                fill 
                className="object-cover transition-transform duration-1000 ease-out group-hover:scale-108 brightness-[0.82] group-hover:brightness-[0.75]" 
                unoptimized 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0C1E12]/95 via-[#0C1E12]/35 to-transparent pointer-events-none" />

              <div className="absolute top-3 left-3 z-10">
                <span className="text-[8px] uppercase tracking-widest font-bold text-[#234227] bg-[#F3F7F1]/90 backdrop-blur-xs px-2 py-0.5 rounded-full border border-[#D5E4D1]">
                  {capsule.tag}
                </span>
              </div>

              <div className="relative z-10 space-y-1 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-500">
                <h3 className="font-heading text-base sm:text-lg font-bold text-white leading-snug drop-shadow-sm">
                  {capsule.title}
                </h3>
                <p className="text-[10.5px] text-stone-200 font-body font-light leading-relaxed line-clamp-2 italic drop-shadow-xs">
                  {capsule.desc}
                </p>
                <div className="pt-1.5 flex items-center gap-1 text-[11px] font-semibold text-[#A8D3A3] group-hover:text-white transition-colors font-ui">
                  <span className="uppercase text-[9.5px] tracking-wider">Khám Phá Tủ Đồ</span>
                  <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION 3: SÀN CHO THUÊ TUYỂN CHỌN DENSE GRID */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-3 border-b border-stone-200/60 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-700"></span>
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-emerald-900/80 font-ui">
                TIẾT KIỆM ĐẾN 90%
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-extrabold text-[#0A2517] tracking-tight">
              Trang Phục Cho Thuê Thịnh Hành
            </h2>
          </div>
          
          <div className="flex items-center gap-4 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 hide-scrollbar shrink-0">
            <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-wider text-stone-500 font-ui shrink-0">
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

            <div className="hidden md:block w-px h-3.5 bg-gray-300"></div>

            <Link 
              href="/shop" 
              className="group font-ui text-[11px] font-bold text-[#0A2517] hover:text-emerald-800 uppercase tracking-widest flex items-center gap-1 shrink-0"
            >
              Khám Phá Tất Cả <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Dense 6-Column High-Fashion Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {rentalCatalog.map((product) => (
            <div key={product.id} className="group flex flex-col bg-white p-2.5 rounded-xl border border-stone-200/80 hover:border-emerald-800/40 hover:shadow-md transition-all duration-300">
              <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden rounded-lg mb-2.5">
                <Image src={product.img} alt={product.title} fill className="object-cover transition-opacity duration-700 opacity-100 group-hover:opacity-0" unoptimized />
                <Image src={product.hoverImg} alt={product.title} fill className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-100" unoptimized />
                <div className="absolute top-2 left-2 bg-[#183A2D]/90 text-white font-ui text-[7.5px] font-bold uppercase px-1.5 py-0.5 rounded-sm tracking-widest shadow-2xs z-10">
                  {product.tag}
                </div>
              </div>

              <div className="flex flex-col flex-1 justify-between gap-1">
                <div className="flex justify-between items-center text-[9px]">
                  <span className="text-stone-400 font-ui uppercase tracking-wider line-clamp-1">{product.user}</span>
                  <span className="text-emerald-700 font-bold font-mono text-[8.5px] bg-emerald-50 px-1 py-0.2 rounded-sm">-90%</span>
                </div>

                <Link href="/shop">
                  <h4 className="text-[11.5px] font-heading font-bold text-[#0A2517] line-clamp-1 hover:text-emerald-800 transition-colors">
                    {product.title}
                  </h4>
                </Link>

                <div className="flex justify-between items-baseline pt-1 border-t border-stone-100">
                  <p className="text-[11.5px] font-bold text-[#183A2D] font-mono">
                    {product.price.toLocaleString('vi-VN')}đ
                    <span className="text-[8.5px] text-stone-400 font-normal font-sans">/ngày</span>
                  </p>
                  <span className="text-[8.5px] text-stone-400 line-through font-mono">
                    {(product.origPrice / 1000000).toFixed(1)}Tr
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 🌿 SECTION 4: QUY TRÌNH THỜI TRANG TUẦN HOÀN 2 CHIỀU (BY ROTATION STYLE) */}
      <MarketingLoopShowcase />

      {/* SECTION 5: TỦ ĐỒ CỦA CÁC CHỦ TỦ TIÊU BIỂU */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 mb-6 border-b border-stone-200/60 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-700"></span>
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-emerald-900/80 font-ui">
                CHỦ TỦ TIÊU BIỂU
              </span>
            </div>
            <h2 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold text-[#0A2517] tracking-tight">
              Khám Phá Tủ Đồ Các Nhà Sáng Tạo
            </h2>
          </div>
          
          <Link 
            href="/closets" 
            className="group font-ui text-[11px] font-bold text-[#0A2517] hover:text-emerald-800 uppercase tracking-widest flex items-center gap-1 shrink-0"
          >
            Khám phá tất cả <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 🖥️ DESKTOP VIEW: Interactive Accordion */}
        <div className="hidden md:flex flex-row w-full h-[370px] gap-3">
          {featuredClosets.map((closet, index) => {
            const isActive = activeCard === index;

            return (
              <div
                key={closet.id}
                onMouseEnter={() => setActiveCard(index)}
                className={`relative overflow-hidden cursor-pointer rounded-2xl transition-[flex] duration-700 ease-out border border-stone-200/80
                  ${isActive ? 'flex-[6] lg:flex-[5] shadow-xl' : 'flex-[1] hover:flex-[1.2] shadow-2xs'}
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
                  className={`absolute inset-0 flex flex-col items-center justify-end pb-5 transition-opacity duration-300
                    ${isActive ? 'opacity-0 hidden' : 'opacity-100 delay-300'}
                  `}
                >
                  <h3 
                    className="text-white font-heading text-base tracking-wider text-center"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                  >
                    @{closet.username}
                  </h3>
                </div>

                {/* Active State */}
                <div className={`absolute bottom-0 left-0 w-full p-5 lg:p-6 flex flex-col md:flex-row justify-between items-end transition-all duration-700 transform
                  ${isActive ? 'opacity-100 translate-y-0 delay-200' : 'opacity-0 translate-y-6 pointer-events-none hidden'}
                `}>
                  
                  <div className="text-white max-w-xs mb-2 md:mb-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="bg-white text-[#0A2517] font-ui text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-xs">
                        {closet.tag}
                      </span>
                      <span className="bg-emerald-900/90 text-emerald-300 font-mono text-[8px] px-1.5 py-0.5 rounded-xs border border-emerald-500/30 flex items-center gap-1">
                        <ShieldCheck size={9} /> Tín nhiệm: {closet.trustScore}
                      </span>
                    </div>
                    <h3 className="font-heading font-extrabold text-xl lg:text-2xl leading-none mb-1">
                      @{closet.username}
                    </h3>
                    <p className="text-stone-300 font-body text-[11px] font-light leading-relaxed line-clamp-2">
                      {closet.bio}
                    </p>
                    <Link 
                      href={`/closet/${closet.id}`} 
                      className="inline-block mt-2 border-b border-white pb-0.5 font-ui text-[10px] uppercase tracking-widest hover:text-emerald-300 hover:border-emerald-300 transition-colors font-bold"
                    >
                      Khám Phá Cả Tủ Đồ &rarr;
                    </Link>
                  </div>

                  {/* Mini Item Thumbnails */}
                  <div className="flex gap-1.5">
                    {closet.items.map((itemImg, idx) => (
                      <div key={idx} className="relative w-10 aspect-square md:aspect-[7/10] h-auto border border-white/20 bg-black/30 backdrop-blur-xs p-0.5 overflow-hidden rounded-md">
                        <Image src={itemImg} fill unoptimized className="object-cover hover:scale-110 transition-transform duration-500" alt="item" />
                      </div>
                    ))}
                    <div className="w-10 aspect-square md:aspect-[7/10] h-auto border border-white/20 bg-white/15 backdrop-blur-xs flex flex-col items-center justify-center text-white cursor-pointer hover:bg-white/25 transition-all rounded-md">
                      <span className="font-heading text-[10px] font-light">+12</span>
                      <span className="font-ui text-[6px] uppercase tracking-widest mt-0.5">Món</span>
                    </div>
                  </div>

                </div>

              </div>
            );
          })}
        </div>

        {/* 📱 MOBILE VIEW: Horizontal Swipe Cards */}
        <div className="md:hidden flex gap-2.5 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
          {featuredClosets.map((closet) => (
            <div 
              key={closet.id}
              className="w-[220px] shrink-0 bg-white rounded-xl border border-stone-200/80 overflow-hidden shadow-2xs flex flex-col"
            >
              <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                <Image src={closet.mainImg} alt={closet.username} fill className="object-cover" unoptimized />
                <div className="absolute top-2 left-2 bg-black/80 text-white text-[7.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-xs">
                  {closet.tag}
                </div>
                <div className="absolute bottom-2 right-2 bg-emerald-900/90 text-emerald-200 text-[7.5px] font-mono px-1.5 py-0.5 rounded-xs flex items-center gap-1">
                  <ShieldCheck size={9} /> {closet.trustScore}
                </div>
              </div>
              <div className="p-2.5 flex flex-col flex-1 justify-between gap-1.5">
                <div>
                  <h3 className="font-heading font-bold text-xs text-[#0A2517]">@{closet.username}</h3>
                  <p className="text-[10px] text-stone-500 line-clamp-2 mt-0.5 font-light leading-relaxed">{closet.bio}</p>
                </div>
                <Link href={`/closet/${closet.id}`} className="text-[11px] font-semibold text-[#183A2D] hover:underline flex items-center gap-1 pt-1 border-t border-stone-100">
                  Vào xem tủ đồ <ArrowRight size={10} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 6: TRANG PHỤC THANH LÝ & SỞ HỮU */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-3 border-b border-stone-200/60 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-amber-900/80 font-ui">
                CHUYỂN NHƯỢNG & PASS NHANH
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-extrabold text-[#0A2517] tracking-tight">
              Trang Phục Thanh Lý & Sở Hữu
            </h2>
          </div>
          
          <div className="flex items-center gap-4 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 hide-scrollbar shrink-0">
            <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-wider text-stone-500 font-ui shrink-0">
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

            <div className="hidden md:block w-px h-3.5 bg-gray-300"></div>

            <Link 
              href="/shop" 
              className="group font-ui text-[11px] font-bold text-[#0A2517] hover:text-emerald-800 uppercase tracking-widest flex items-center gap-1 shrink-0"
            >
              Khám Phá Tất Cả <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* 6-Column Resale Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {resaleItems.map((item, idx) => (
            <div key={idx} className="group flex flex-col bg-white p-2.5 rounded-xl border border-stone-200/80 hover:border-amber-400/50 hover:shadow-md transition-all duration-300 cursor-pointer">
              <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden rounded-lg mb-2.5">
                <Image src={item.src} alt={item.title} fill className="object-cover transition-opacity duration-700 opacity-100 group-hover:opacity-0" unoptimized />
                <Image src={item.hoverSrc} alt={item.title} fill className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-100" unoptimized />
                <div className="absolute top-2 right-2 px-1.5 py-0.5 text-[7.5px] font-bold tracking-wider bg-black text-white uppercase rounded-xs z-10">
                  Sở Hữu
                </div>
              </div>

              <div className="flex flex-col flex-1 justify-between gap-1">
                <div className="flex justify-between items-center text-[9px]">
                  <span className="text-stone-400 font-ui uppercase line-clamp-1">{item.owner}</span>
                  <span className="text-rose-600 font-bold font-mono text-[8.5px] bg-rose-50 px-1 py-0.2 rounded">{item.discount}</span>
                </div>

                <h3 className="text-[11.5px] font-heading font-bold text-black line-clamp-1 group-hover:text-emerald-800 transition-colors">
                  {item.title}
                </h3>

                <div className="flex items-center gap-1.5 pt-1 border-t border-stone-100">
                  <span className="text-[11.5px] font-bold text-black font-mono">{item.price}</span>
                  <span className="text-[8.5px] text-stone-400 line-through font-mono">{item.originalPrice}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 7: HỘ CHIẾU THỜI TRANG SỐ */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
        <div className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-stone-200/80 shadow-sm">
          
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center">
            {/* Left: Interactive Passport Card Preview */}
            <div className="w-full lg:w-1/2 relative">
              <div className="relative bg-[#FAF9F5] rounded-2xl p-5 sm:p-6 shadow-md border border-stone-300/70 overflow-hidden">
                <div className="absolute top-3.5 right-3.5 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-[#D5E4D1] text-[#28422A] text-[9.5px] font-mono font-bold uppercase tracking-wider shadow-2xs">
                  <ShieldCheck size={11} className="text-emerald-700" /> Hộ Chiếu Số
                </div>

                <div className="flex gap-3.5 sm:gap-5 items-start mb-4">
                  <div className="relative w-20 sm:w-24 aspect-[3/4] rounded-xl overflow-hidden shrink-0 border border-stone-200 shadow-2xs">
                    <Image src="/1.1.jpg" alt="Váy Dạ Hội" fill className="object-cover" unoptimized />
                  </div>
                  <div className="space-y-1 flex-1">
                    <span className="text-[9px] uppercase tracking-widest text-emerald-800 font-bold font-mono">#CLOOP-VN-0892</span>
                    <h3 className="font-heading text-base sm:text-lg font-bold text-[#183A2D] leading-tight">
                      Váy Dạ Hội Xẻ Tà Lụa Satin
                    </h3>
                    <p className="text-[11px] text-stone-500 font-ui">Chủ nhân ban đầu: <span className="font-semibold text-stone-800">@the.archive</span></p>
                    <div className="pt-1 flex flex-wrap gap-1.5">
                      <span className="text-[9.5px] bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded-md font-mono font-semibold">
                        🔄 8 Vòng đời
                      </span>
                      <span className="text-[9.5px] bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md font-mono font-semibold">
                        🌿 196kg CO₂ Tránh Thải
                      </span>
                    </div>
                  </div>
                </div>

                {/* Travel route stamp milestones */}
                <div className="pt-3 border-t border-stone-200/60 space-y-1.5">
                  <div className="text-[9.5px] font-bold text-stone-400 uppercase tracking-wider font-ui">
                    Hành Trình Du Ngoạn Của Chiếc Váy:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center text-[11px] font-mono">
                    <div className="p-2 bg-white rounded-lg border border-stone-200/70 shadow-2xs">
                      <p className="font-bold text-[#183A2D]">Hà Nội</p>
                      <span className="text-[8px] text-stone-400">Dạ Vũ 2024</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-stone-200/70 shadow-2xs">
                      <p className="font-bold text-[#183A2D]">Đà Lạt</p>
                      <span className="text-[8px] text-stone-400">Ảnh Cưới 2025</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-stone-200/70 shadow-2xs">
                      <p className="font-bold text-[#183A2D]">TP.HCM</p>
                      <span className="text-[8px] text-stone-400">Đại Tiệc 2026</span>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-300 text-emerald-900 shadow-2xs">
                      <p className="font-bold text-emerald-900">Đà Nẵng</p>
                      <span className="text-[8px] text-emerald-700">Sẵn sàng</span>
                    </div>
                  </div>
                </div>

                {/* Emotional diary note */}
                <div className="mt-3 p-3 bg-[#FAF7F0] rounded-xl border border-[#E5DEC9] text-[11.5px] text-stone-600 italic font-scrapbook leading-relaxed">
                  "Chiếc váy lụa này đã cùng mình nhận giải thưởng lớn tại đêm tiệc hôm qua. Cảm ơn người bạn xa lạ đã chia sẻ nó!"
                </div>
              </div>
            </div>

            {/* Right: Storytelling & USP */}
            <div className="w-full lg:w-1/2 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-700"></span>
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-emerald-900/80 font-ui">
                  CÔNG NGHỆ MINH BẠCH
                </span>
              </div>
              <h2 className="font-heading text-xl sm:text-2xl md:text-3xl font-extrabold text-[#183A2D] leading-tight">
                Mỗi Món Đồ Đều Có <br />
                <span className="text-emerald-800">Một Cuốn Hộ Chiếu Riêng</span>
              </h2>
              <p className="text-stone-600 text-xs sm:text-sm font-light leading-relaxed">
                Tại CLOOP, quần áo không chỉ là vải vóc — chúng là những nhân chứng của kỷ niệm. Nhờ Hộ Chiếu Thời Trang (Digital Garment Passport), bạn có thể quét mã để biết món đồ đã đi qua những thành phố nào, được yêu thương ra sao và đã đóng góp bao nhiêu cho mẹ Trái Đất.
              </p>

              <div className="pt-2 flex items-center gap-3">
                <Link
                  href="/shop"
                  className="px-6 py-3 bg-[#37503F] hover:bg-[#2C4233] text-white font-bold rounded-xl text-[11px] uppercase tracking-wider transition-all font-ui shadow-xs inline-flex items-center gap-2"
                >
                  Khám Phá Tủ Đồ Có Hộ Chiếu <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 8: BẢO TÀNG KÝ ỨC TUẦN HOÀN */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8 max-w-xl mx-auto space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-700"></span>
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-emerald-900/80 font-ui">
              KÝ ỨC & CÂU CHUYỆN CLOOP
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-extrabold text-[#0A2517] tracking-tight">
            Bảo Tàng Ký Ức Tuần Hoàn
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 font-light">
            Lắng nghe những mảnh ký ức trước khi trang phục bước vào hành trình mới.
          </p>
        </div>

        {/* Stories 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
          
          {/* Story 1 */}
          <div className="group relative bg-white rounded-2xl p-3.5 shadow-2xs border border-stone-200/80 hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
            <div className="relative aspect-[4/5] rounded-xl overflow-hidden mb-3">
              <Image src="/vintage_coat.jpg" alt="Chiếc Blazer 1998" fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
              <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-xs text-white text-[8px] font-mono px-2 py-0.5 rounded-md">
                Vòng đời #4 • 1998
              </div>
            </div>
            <div className="px-1 space-y-1.5">
              <h3 className="font-heading text-sm font-bold text-[#0A2517]">Chiếc Blazer Năm 1998</h3>
              <p className="font-scrapbook text-xs text-stone-600 italic leading-relaxed">
                "Chiếc áo được mua bằng tháng lương đầu tiên của mẹ tôi. Nó đã chứng kiến những ngày thanh xuân rực rỡ..."
              </p>
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-ui">
                <span className="font-semibold text-emerald-800 text-[10px]">@olivia.style</span>
                <span className="text-[9px]">Hà Nội</span>
              </div>
            </div>
          </div>

          {/* Story 2 */}
          <div className="group relative bg-white rounded-2xl p-3.5 shadow-2xs border border-stone-200/80 hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
            <div className="relative aspect-[4/5] rounded-xl overflow-hidden mb-3">
              <Image src="/evening_dress.jpg" alt="Đêm Dạ Vũ" fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
              <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-xs text-white text-[8px] font-mono px-2 py-0.5 rounded-md">
                Vòng đời #2 • Prom Night
              </div>
            </div>
            <div className="px-1 space-y-1.5">
              <h3 className="font-heading text-sm font-bold text-[#0A2517]">Đêm Dạ Vũ Tỏa Sáng</h3>
              <p className="font-scrapbook text-xs text-stone-600 italic leading-relaxed">
                "Mình mặc chiếc váy lụa này đúng một lần vào đêm Prom. Mong nó sẽ tiếp tục thắp sáng một đêm diệu kỳ nữa..."
              </p>
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-ui">
                <span className="font-semibold text-emerald-800 text-[10px]">@chloe.vintage</span>
                <span className="text-[9px]">TP.HCM</span>
              </div>
            </div>
          </div>

          {/* Story 3 */}
          <div className="group relative bg-white rounded-2xl p-3.5 shadow-2xs border border-stone-200/80 hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
            <div className="relative aspect-[4/5] rounded-xl overflow-hidden mb-3">
              <Image src="/1.2.jpg" alt="Kẻ Lữ Hành" fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
              <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-xs text-white text-[8px] font-mono px-2 py-0.5 rounded-md">
                Vòng đời #3 • Tây Bắc
              </div>
            </div>
            <div className="px-1 space-y-1.5">
              <h3 className="font-heading text-sm font-bold text-[#0A2517]">Kẻ Lữ Hành Cô Độc</h3>
              <p className="font-scrapbook text-xs text-stone-600 italic leading-relaxed">
                "Chiếc áo da sờn vai đã cùng tôi rong ruổi khắp Tây Bắc. Mỗi vết xước là một dặm đường ấm áp..."
              </p>
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-ui">
                <span className="font-semibold text-emerald-800 text-[10px]">@dustin.journey</span>
                <span className="text-[9px]">Đà Lạt</span>
              </div>
            </div>
          </div>

        </div>

        <div className="flex justify-center mt-8">
          <Link 
            href="/shop" 
            className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#0A2517] text-white hover:bg-emerald-900 rounded-xl text-[11px] uppercase tracking-widest font-bold transition-all font-ui shadow-xs"
          >
            Xem Thêm Ký Ức & Tủ Đồ Tuần Hoàn <ArrowRight size={13} />
          </Link>
        </div>

      </section>

      {/* SECTION 9: ECO-IMPACT LIVE SIMULATOR */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
        <EcoImpactCalculator />
      </section>

      {/* SECTION 10: CHỢ XANH CLOOP */}
      <section className="w-full bg-[#37503F] text-white pt-16 pb-14 relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 md:px-6 text-center relative z-10 space-y-4">
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-normal text-white">
            Chợ Xanh CLOOP
          </h2>
          <p className="text-xs sm:text-sm text-stone-200 font-light leading-relaxed max-w-xl mx-auto">
            Kéo dài vòng đời thời trang. Nơi dành riêng cho sinh viên thiết kế, Local Brand và các tín đồ Upcycling săn nguyên liệu độc đáo.
          </p>
          <div className="pt-2">
            <Link 
              href="/green-market" 
              className="inline-flex items-center justify-center px-7 py-3 bg-white text-[#183A2D] hover:bg-[#F4F1EA] font-extrabold rounded-xl text-[11px] uppercase tracking-widest transition-all font-ui shadow-sm"
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
