"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Star, Heart, Bookmark, Sparkles, Search } from "lucide-react";
import { motion } from "framer-motion";
import MagneticButton from "./components/MagneticButton";

export default function Home() {
  const [activeRentalCategory, setActiveRentalCategory] = useState("Tất cả");
  const rentalCategories = ["Tất cả", "Dạ hội", "Đi tiệc", "Áo dài", "Vintage"];

  const [activeResaleCategory, setActiveResaleCategory] = useState("Tất cả");
  const resaleCategories = ["Tất cả", "Túi xách", "Phụ kiện", "Áo khoác", "Váy thiết kế"];

  const [activeCard, setActiveCard] = useState(0);

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

      {/* SECTION 1: HERO - TRỰC DIỆN THƯƠNG MẠI */}
      <section className="relative w-full flex flex-col lg:flex-row items-stretch min-h-[80vh] bg-[#FAF9F6] overflow-hidden">
        {/* Left: Text & CTAs */}
        <div className="w-full lg:w-1/2 flex flex-col justify-start items-start px-4 md:px-12 lg:px-20 xl:px-32 py-16 lg:pt-[15vh] lg:pb-20 z-10 relative mt-16 lg:mt-0">
          <div className="flex flex-col items-start justify-start w-full text-left max-w-2xl">
              <motion.h1 
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: { staggerChildren: 0.1 }
                  }
                }}
                className="font-heading text-[28px] sm:text-3xl md:text-[48px] lg:text-5xl font-extrabold text-[#0A2517] leading-snug md:leading-snug lg:leading-snug mb-5 tracking-wide whitespace-nowrap"
              >
                {["Thuê", "&", "Sở", "Hữu"].map((word, i) => (
                  <motion.span key={i} className="inline-block mr-3" variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } } }}>
                    {word}
                  </motion.span>
                ))}
                <br/>
                {["Thời", "Trang"].map((word, i) => (
                  <motion.span key={i+10} className="inline-block mr-3" variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } } }}>
                    {word}
                  </motion.span>
                ))}
                <br/>
                {["Tuần", "Hoàn"].map((word, i) => (
                  <motion.span key={i+20} className="inline-block mr-3" variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } } }}>
                    {word}
                  </motion.span>
                ))}
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.8 }}
                className="font-body text-base md:text-lg text-stone-700 leading-relaxed md:leading-loose mb-8 w-full lg:pr-4"
              >
                Có những món đồ cất trong tủ kính mang theo cả một thời tuổi trẻ. Thay vì để chúng ngủ quên, hãy gửi gắm vào tủ đồ CLOOP. Chút hoài niệm của bạn hôm nay sẽ là sự rạng rỡ của một người khác ngày mai.
              </motion.p>

              {/* Generative UI Vibe: Smart Search Bar */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="w-full max-w-lg mb-10 relative group"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-200 to-teal-100 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative flex items-center bg-white border border-stone-200 rounded-lg p-2 shadow-sm focus-within:ring-2 focus-within:ring-[#0A2517]/20 transition-all">
                  <Search size={18} className="text-stone-400 ml-2 mr-3" />
                  <input 
                    type="text" 
                    placeholder="Bạn đang tìm chiếc Blazer cho tiệc cuối tuần?" 
                    className="flex-1 bg-transparent border-none outline-none font-ui text-sm text-[#0A2517] placeholder:text-stone-400"
                  />
                  <button className="px-4 py-2 bg-[#0A2517] text-white rounded-md text-xs font-bold uppercase tracking-wider hover:bg-[#113a25] transition-colors">
                    Tìm kiếm
                  </button>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-4"
              >
                <MagneticButton>
                  <Link href="/shop" className="group font-ui font-semibold text-xs md:text-sm px-6 h-[48px] bg-[#0A2517] text-white rounded hover:bg-[#113a25] transition-colors duration-300 tracking-wide flex items-center justify-center gap-2 relative z-10 w-full sm:w-auto">
                    KHÁM PHÁ TỦ ĐỒ <ArrowRight size={16} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                  </Link>
                </MagneticButton>
                
                <MagneticButton>
                  <Link href="/my-closet" className="font-ui font-semibold text-xs md:text-sm px-6 h-[48px] bg-transparent text-[#0A2517] border-2 border-[#0A2517] rounded hover:bg-[#0A2517] hover:text-white transition-colors duration-300 tracking-wide flex items-center justify-center relative z-10 w-full sm:w-auto bg-white/50 backdrop-blur-sm">
                    CHIA SẺ TỦ ĐỒ
                  </Link>
                </MagneticButton>
              </motion.div>
            </div>
          </div>
        {/* Right: Tràn viền (Full-bleed) Image */}
        <div className="w-full lg:w-1/2 relative min-h-[50vh] lg:min-h-auto z-0 overflow-hidden lg:pl-4 xl:pl-8">
          <Image 
            src="/anhbia.png" 
            alt="CLOOP Fashion Community" 
            fill 
            className="object-cover object-center animate-ken-burns rounded-none" 
            unoptimized 
          />
        </div>
      </section>

      {/* SECTION 2: TỦ ĐỒ UY TÍN (TRUSTED CLOSETS) - Accordion Thần Thánh */}
      <section className="w-full py-16 bg-[#F9F9F9]">
        {/* Mở rộng không gian để bằng với Trang Phục Cho Thuê */}
        <div className="w-full px-4 md:px-8 lg:px-12 xl:px-20">
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

          {/* KHỐI ACCORDION - Chiều cao chuẩn 500px, không bị khổng lồ */}
          <div className="flex flex-col md:flex-row w-full h-[600px] md:h-[500px] gap-3 lg:gap-4">
            
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
      <section className="w-full px-4 md:px-8 lg:px-12 xl:px-20 py-20 bg-white border-t border-stone-100">
        
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
          {/* Ép h-fit để cột này tự quyết định chiều cao dựa trên content, cột trái sẽ nương theo chiều cao này */}
          <div className="w-full lg:w-1/2 grid grid-cols-2 gap-x-3 md:gap-x-4 gap-y-8 md:gap-y-12 h-fit">
            
            {/* ITEM 1 */}
            <div className="group flex flex-col cursor-pointer">
              <div className="relative w-full aspect-[4/5] md:aspect-[3/4] bg-stone-100 overflow-hidden mb-4">
                {/* Ảnh chính - Mờ đi khi hover */}
                <Image src="/1.2.jpeg" alt="Item" fill className="absolute inset-0 w-full h-full object-cover transition-all duration-700 opacity-100 group-hover:opacity-0" unoptimized />
                {/* Ảnh phụ (Góc khác) - Hiện ra khi hover */}
                <Image src="/1.2.jpg" alt="Item Hover" fill className="absolute inset-0 w-full h-full object-cover transition-all duration-700 scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-100" unoptimized />
              </div>
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-1.5">
                  <p className="text-[9px] text-stone-500 uppercase tracking-[0.2em] font-ui">@chic.street</p>
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
                {/* Đổi Tên Sản Phẩm sang font Serif để nhìn đắt tiền hơn */}
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

            {/* ITEM 2 */}
            <div className="group flex flex-col cursor-pointer">
              <div className="relative w-full aspect-[4/5] md:aspect-[3/4] bg-stone-100 overflow-hidden mb-4">
                <Image src="/2.1.jpg" alt="Item" fill className="absolute inset-0 w-full h-full object-cover transition-all duration-700 opacity-100 group-hover:opacity-0" unoptimized />
                <Image src="/2.1 (1).jpg" alt="Item Hover" fill className="absolute inset-0 w-full h-full object-cover transition-all duration-700 scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-100" unoptimized />
              </div>
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-1.5">
                  <p className="text-[9px] text-stone-500 uppercase tracking-[0.2em] font-ui">@minimal.edit</p>
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
                <h3 className="text-xs md:text-base font-heading text-black mb-2 line-clamp-1 font-semibold">Blazer Linen Trắng</h3>
                
                <div className="hidden md:flex items-center gap-2 mb-1">
                  <span className="text-xs text-stone-400 line-through font-ui">1.200.000đ</span>
                  <span className="text-[10px] text-red-700 font-medium tracking-wider font-ui">-90%</span>
                </div>
                <p className="text-sm font-bold text-black font-ui">
                  120.000đ <span className="text-[10px] text-stone-500 font-normal">/ngày</span>
                  <span className="md:hidden text-[10px] text-red-700 font-medium ml-1">· -90%</span>
                </p>
              </div>
            </div>

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
      <section className="w-full px-4 md:px-8 lg:px-12 xl:px-20 py-20 bg-[#F9F9F9]">
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
      <section className="w-full px-4 md:px-8 lg:px-12 xl:px-20 py-24 bg-[#F7F5F0]">
        
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

        {/* Lưới 3 câu chuyện (3 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          
          {/* ===== STORY 1: TÌNH CẢM GIA ĐÌNH ===== */}
          <div className="group flex flex-col cursor-pointer">
            <div className="relative w-full aspect-[4/5] overflow-hidden mb-6 bg-stone-200">
              <Image src="/vintage_coat.jpg" alt="Chiếc Blazer của mẹ" fill className="object-cover grayscale-[50%] transition-all duration-1000 group-hover:scale-105 group-hover:grayscale-0" unoptimized />
            </div>
            <div className="flex flex-col flex-grow">
              <h3 className="text-xl font-heading font-bold text-black mb-3">Chiếc Blazer Năm 1998</h3>
              <p className="text-sm text-stone-600 leading-relaxed font-body italic mb-6 flex-grow">
                "Chiếc áo này được mua bằng tháng lương đầu tiên của mẹ tôi. Nó đã chứng kiến những ngày tháng thanh xuân rực rỡ và đầy kiêu hãnh của bà. Giờ đây, tôi muốn nó tiếp tục khoác lên vai và mang lại sự tự tin cho một cô gái khác trên nấc thang sự nghiệp của mình."
              </p>
              <div className="flex items-center gap-3 mt-auto pt-5 border-t border-stone-200">
                <div className="w-8 h-8 rounded-full bg-stone-300 overflow-hidden relative">
                  <Image src="/avatar_1.jpg" alt="User" fill className="object-cover" unoptimized />
                </div>
                <span className="text-xs uppercase tracking-widest text-stone-500 font-ui font-bold">@olivia.style</span>
              </div>
            </div>
          </div>

          {/* ===== STORY 2: THANH XUÂN TƯƠI ĐẸP ===== */}
          <div className="group flex flex-col cursor-pointer">
            <div className="relative w-full aspect-[4/5] overflow-hidden mb-6 bg-stone-200">
              <Image src="/evening_dress.jpg" alt="Váy Dạ Hội Prom" fill className="object-cover grayscale-[50%] transition-all duration-1000 group-hover:scale-105 group-hover:grayscale-0" unoptimized />
            </div>
            <div className="flex flex-col flex-grow">
              <h3 className="text-xl font-heading font-bold text-black mb-3">Đêm Dạ Vũ Tỏa Sáng</h3>
              <p className="text-sm text-stone-600 leading-relaxed font-body italic mb-6 flex-grow">
                "Mình chỉ mặc chiếc váy lụa đỏ này đúng một lần vào đêm Prom đại học. Thanh xuân của mình đã trọn vẹn và lấp lánh cùng nó. Thay vì cất sâu trong đáy tủ bám bụi, mình mong nó sẽ thắp sáng một đêm diệu kỳ nữa cho cô chủ nhân mới."
              </p>
              <div className="flex items-center gap-3 mt-auto pt-5 border-t border-stone-200">
                <div className="w-8 h-8 rounded-full bg-stone-300 overflow-hidden relative">
                  <Image src="/avatar_2.jpg" alt="User" fill className="object-cover" unoptimized />
                </div>
                <span className="text-xs uppercase tracking-widest text-stone-500 font-ui font-bold">@chloe.vintage</span>
              </div>
            </div>
          </div>

          {/* ===== STORY 3: NHỮNG CHUYẾN ĐI ===== */}
          <div className="group flex flex-col cursor-pointer">
            <div className="relative w-full aspect-[4/5] overflow-hidden mb-6 bg-stone-200">
              <Image src="/1.2.jpg" alt="Áo Da Biker" fill className="object-cover grayscale-[50%] transition-all duration-1000 group-hover:scale-105 group-hover:grayscale-0" unoptimized />
            </div>
            <div className="flex flex-col flex-grow">
              <h3 className="text-xl font-heading font-bold text-black mb-3">Kẻ Lữ Hành Cô Độc</h3>
              <p className="text-sm text-stone-600 leading-relaxed font-body italic mb-6 flex-grow">
                "Chiếc áo da sờn vai này đã cùng tôi rong ruổi khắp các cung đường Tây Bắc. Mỗi vết xước là một dặm đường, một cơn mưa rừng hay một ánh lửa trại ấm áp. Gửi gắm lại đây cho những tâm hồn tự do, đam mê xê dịch và sự phong trần."
              </p>
              <div className="flex items-center gap-3 mt-auto pt-5 border-t border-stone-200">
                <div className="w-8 h-8 rounded-full bg-stone-300 overflow-hidden relative">
                   <Image src="/avatar_3.jpg" alt="User" fill className="object-cover" unoptimized />
                </div>
                <span className="text-xs uppercase tracking-widest text-stone-500 font-ui font-bold">@dustin.journey</span>
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


    </main>
  );
}
