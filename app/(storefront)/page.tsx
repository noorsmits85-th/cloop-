"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ArrowRight, 
  ShieldCheck, 
  Leaf, 
  Lock,
  Sparkles,
  Heart,
  Droplet,
  DollarSign,
  CheckCircle2,
  Calendar
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import VisualSearchModal from "@/app/components/VisualSearchModal";
import GoogleFlowFashionHero from "@/app/components/GoogleFlowFashionHero";
import HowItWorksTabs from "@/app/components/HowItWorksTabs";
import { getTrendingProductsAction } from "@/app/actions/favorite";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [activeClosetIndex, setActiveClosetIndex] = useState(0);
  const [boostedProducts, setBoostedProducts] = useState<any[]>([]);

  // Lấy dữ liệu sản phẩm thịnh hành từ Database
  useEffect(() => {
    async function fetchTrending() {
      try {
        const res = await getTrendingProductsAction(12);
        if (res.success && res.products && res.products.length > 0) {
          setBoostedProducts(res.products);
          return;
        }
      } catch (e) {}

      const { data, error } = await supabase
        .from("products")
        .select(`
          id, title, name, province, condition, size, brand, owner_name, ownerName, userId, user_id, original_price, originalPrice, rental_price, occasion, image_url, imageUrl, boostExpiresAt, isHighlighted, likeCount, saveCount
        `)
        .order("likeCount", { ascending: false })
        .limit(12);
        
      if (!error && data) {
        setBoostedProducts(data);
      }
    }
    fetchTrending();
  }, []);

  // 03 — OCCASION CURATIONS (5 Bộ Sưu Tập Ảnh Lớn Chuẩn By Rotation)
  const occasionCollections = [
    { 
      id: "wedding", 
      title: "Dự Tiệc Cưới & Prom", 
      tag: "180+ Mẫu Thiết Kế",
      desc: "Đầm lụa thướt tha, set dạ tweed sang trọng & sequin lấp lánh.", 
      image: "/evening_dress.jpg",
      link: "/shop?occasion=Tiệc cưới"
    },
    { 
      id: "gala", 
      title: "Dạ Hội & Gala Night", 
      tag: "Độc Quyền",
      desc: "Thiết kế cao cấp, xẻ tà quyến rũ cho những đêm tiệc tỏa sáng.", 
      image: "/1.1.jpg",
      link: "/shop?occasion=Dạ hội"
    },
    { 
      id: "heritage", 
      title: "Áo Dài & Di Sản", 
      tag: "Tơ Tằm Gấm Thêu",
      desc: "Gấm dệt thủ công, phom dáng thanh tao cho ngày trọng đại.", 
      image: "/anhbia.png",
      link: "/shop?occasion=Áo dài"
    },
    { 
      id: "minimal", 
      title: "Tối Giản Thường Nhật", 
      tag: "Clean Luxury",
      desc: "Blazer linen, set đồ dạo phố thanh lịch và phong khoáng.", 
      image: "/vintage_coat.jpg",
      link: "/shop?occasion=Vintage"
    },
    { 
      id: "bags", 
      title: "Túi Xách & Phụ Kiện Hiệu", 
      tag: "Hàng Hiệu Tuyển Chọn",
      desc: "Túi da cao cấp, boots và trang sức hoàn thiện outfit hoàn hảo.", 
      image: "/step2_bag.jpg",
      link: "/shop?occasion=Phụ kiện"
    }
  ];

  // 04 — TRENDING ROTATIONS CATALOG
  const trendingCatalog = [
    { 
      id: 101, 
      title: "Váy Dạ Hội Xẻ Tà Lụa Satin Đỏ Rượu", 
      brand: "House of CB",
      price: 350000, 
      origPrice: 3500000, 
      img: "/1.1.jpg", 
      hoverImg: "/1.1 (1).jpg", 
      user: "@the.archive", 
      tag: "Dạ Tiệc" 
    },
    { 
      id: 102, 
      title: "Set Dạ Tweed Cổ Điển Parisienne", 
      brand: "Maje Paris",
      price: 180000, 
      origPrice: 2200000, 
      img: "/1.2.jpeg", 
      hoverImg: "/step2_bag.jpg", 
      user: "@leena.vintage", 
      tag: "Thanh Lịch" 
    },
    { 
      id: 103, 
      title: "Đầm Dạ Tiệc Tối Giản Cúp Ngực", 
      brand: "Reformation",
      price: 220000, 
      origPrice: 2800000, 
      img: "/2.1.jpg", 
      hoverImg: "/2.1 (1).jpg", 
      user: "@minimal.edit", 
      tag: "Tối Giản" 
    },
    { 
      id: 104, 
      title: "Áo Dài Tơ Tằm Gấm Thêu Tay Sen Vàng", 
      brand: "Heritage Silk",
      price: 280000, 
      origPrice: 3800000, 
      img: "/anhbia.png", 
      hoverImg: "/hero_warm.jpg", 
      user: "@heritage.silk", 
      tag: "Di Sản" 
    },
    { 
      id: 105, 
      title: "Áo Khoác Da Biker Hoài Cổ 90s", 
      brand: "Vintage Archive",
      price: 250000, 
      origPrice: 4200000, 
      img: "/1.2.jpg", 
      hoverImg: "/step3_party.jpg", 
      user: "@dustin.style", 
      tag: "Hoài Cổ" 
    },
    { 
      id: 106, 
      title: "Đầm Sequin Kim Tuyến Đêm Dạ Vũ", 
      brand: "Self-Portrait",
      price: 320000, 
      origPrice: 3900000, 
      img: "/evening_dress.jpg", 
      hoverImg: "/step1_phone.jpg", 
      user: "@chloe.party", 
      tag: "Dạ Hội" 
    },
    { 
      id: 107, 
      title: "Blazer Dạ Dáng Dài Vintage 1998", 
      brand: "Yves Saint Laurent Vintage",
      price: 210000, 
      origPrice: 3200000, 
      img: "/vintage_coat.jpg", 
      hoverImg: "/macro_fabric.jpg", 
      user: "@olivia.chic", 
      tag: "Độc Bản" 
    },
    { 
      id: 108, 
      title: "Set Đồ Tái Sinh Denim Độc Bản Upcycle", 
      brand: "CLOOP Studio",
      price: 160000, 
      origPrice: 2000000, 
      img: "/hero_group.jpg", 
      hoverImg: "/hero_warm.jpg", 
      user: "@chic.street", 
      tag: "Tái Sinh" 
    }
  ];

  // 06 — MEET THE LENDERS (Top Rotators)
  const topLenders = [
    {
      id: 0,
      username: 'the.archive',
      name: 'Elena Vance',
      tag: 'BỘ SƯU TẬP HIẾM',
      trustScore: '99.8/100',
      rating: '5.0 (48 lượt thuê)',
      bio: 'Kho báu thời trang thập niên 90s và váy dạ hội thiết kế Pháp với đầy đủ câu chuyện và lịch sử du hành.',
      itemsCount: '34 món đồ',
      avatarImg: '/vintage_coat.jpg',
      featuredImgs: ['/1.1.jpg', '/evening_dress.jpg', '/step2_bag.jpg'],
    },
    {
      id: 1,
      username: 'leena.vintage',
      name: 'Chloe Laurent',
      tag: 'CHỦ TỦ TIÊU BIỂU',
      trustScore: '99.4/100',
      rating: '4.9 (62 lượt thuê)',
      bio: 'Đam mê đồ Tweed & lụa tơ tằm. Tủ đồ phong cách tiểu thư thanh lịch dành cho các buổi tiệc trà và sự kiện.',
      itemsCount: '28 món đồ',
      avatarImg: '/1.2.jpeg',
      featuredImgs: ['/macro_fabric.jpg', '/step2_bag.jpg', '/hero_warm.jpg'],
    },
    {
      id: 2,
      username: 'minimal.edit',
      name: 'Sophie Moreau',
      tag: 'LỐI SỐNG BỀN VỮNG',
      trustScore: '99.1/100',
      rating: '5.0 (35 lượt thuê)',
      bio: 'Tối giản, hiện đại và tinh tế. Tủ đồ xoay vòng tinh gọn giúp bạn mặc đẹp mà không cần mua sắm lãng phí.',
      itemsCount: '22 món đồ',
      avatarImg: '/2.1.jpg',
      featuredImgs: ['/2.1 (1).jpg', '/vintage_coat.jpg', '/step1_phone.jpg'],
    }
  ];

  return (
    <main className="min-h-screen overflow-x-hidden antialiased bg-[#FAF9F5] text-[#0A2517] pb-28 md:pb-0 font-body">

      {/* 🌟 01 — HERO EDITORIAL */}
      <GoogleFlowFashionHero />

      {/* 👗 03 — OCCASION CURATIONS (KHÁM PHÁ THEO DỊP) */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 mb-8">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80 font-ui">
              BỘ SƯU TẬP TUYỂN CHỌN
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl text-[#0A2517] font-extrabold tracking-tight mt-1.5">
              Tìm Phong Cách Theo Dịp Của Bạn
            </h2>
          </div>

          <Link 
            href="/shop?type=rent" 
            prefetch={true}
            className="font-ui text-xs font-bold uppercase tracking-widest text-[#183A2D] hover:text-emerald-800 flex items-center gap-1 group shrink-0"
          >
            <span>Tất Cả Phong Cách</span>
            <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 5 High-Fashion Visual Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {occasionCollections.map((col) => (
            <Link
              key={col.id}
              href={col.link}
              prefetch={true}
              className="group relative aspect-[3/4] sm:aspect-[4/5] rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-700 flex flex-col justify-end p-5 cursor-pointer border border-stone-200/80"
            >
              <Image 
                src={col.image} 
                alt={col.title} 
                fill 
                className="object-cover transition-transform duration-1000 ease-out group-hover:scale-108 brightness-[0.85] group-hover:brightness-[0.75]" 
                unoptimized 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

              <div className="absolute top-3.5 left-3.5 z-10">
                <span className="text-[9px] uppercase tracking-wider font-bold text-[#183A2D] bg-white/95 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-stone-200 shadow-xs font-ui">
                  {col.tag}
                </span>
              </div>

              <div className="relative z-10 space-y-1 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-500">
                <h3 className="font-heading text-lg font-bold text-white leading-snug">
                  {col.title}
                </h3>
                <p className="text-[11px] text-stone-200 font-body font-light leading-relaxed line-clamp-2">
                  {col.desc}
                </p>
                <div className="pt-2 flex items-center gap-1 text-[11px] font-semibold text-[#A3E39F] group-hover:text-white transition-colors font-ui">
                  <span className="uppercase text-[10px] tracking-wider">Khám Phá Ngay</span>
                  <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 🌟 04 — TRENDING ROTATIONS (SẢN PHẨM NỔI BẬT ĐANG ĐƯỢC THUÊ) */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16 border-t border-stone-200/80">
        
        {/* Header & Filter Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80 font-ui">
              THỜI TRANG THỊNH HÀNH
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-extrabold text-[#0A2517] tracking-tight mt-1.5">
              Đang Được Xoay Vòng Nhiều Nhất
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 font-body font-light mt-1">
              Trải nghiệm các thiết kế chính hãng từ các thương hiệu lớn với mức giá chỉ từ 10%.
            </p>
          </div>

          <Link 
            href="/shop?type=rent" 
            prefetch={true}
            className="group font-ui text-xs font-bold text-[#0A2517] hover:text-emerald-800 uppercase tracking-widest flex items-center gap-1.5 shrink-0"
          >
            <span>Xem Toàn Bộ Sàn Thuê</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 4-Column Clean Editorial Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {trendingCatalog.map((product) => (
            <div 
              key={product.id} 
              className="group flex flex-col bg-white rounded-2xl p-3 border border-stone-200/80 hover:border-[#183A2D]/40 hover:shadow-lg transition-all"
            >
              {/* Product Image Frame */}
              <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden rounded-xl mb-3">
                <Image 
                  src={product.img} 
                  alt={product.title} 
                  fill 
                  className="object-cover transition-opacity duration-700 opacity-100 group-hover:opacity-0" 
                  unoptimized 
                />
                <Image 
                  src={product.hoverImg} 
                  alt={product.title} 
                  fill 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-100" 
                  unoptimized 
                />
                
                {/* Top Left Tag */}
                <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-xs text-white font-ui text-[8.5px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wider shadow-xs z-10">
                  {product.tag}
                </div>

                {/* Top Right Save/Heart */}
                <button 
                  type="button"
                  className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs text-stone-600 hover:text-rose-500 hover:scale-110 transition-all flex items-center justify-center shadow-sm z-10 cursor-pointer"
                  title="Lưu vào yêu thích"
                >
                  <Heart size={14} />
                </button>
              </div>

              {/* Product Details */}
              <div className="flex flex-col flex-1 justify-between space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="text-stone-500 font-ui font-semibold uppercase tracking-wider">{product.brand}</span>
                    <span className="text-emerald-700 font-bold font-mono text-[9.5px] bg-emerald-50 px-1.5 py-0.5 rounded">
                      Tiết kiệm 90%
                    </span>
                  </div>

                  <Link href="/shop?type=rent">
                    <h4 className="text-sm font-heading font-bold text-[#0A2517] line-clamp-1 hover:text-emerald-800 transition-colors">
                      {product.title}
                    </h4>
                  </Link>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] text-stone-400 font-ui block">Giá thuê:</span>
                    <p className="text-base font-extrabold text-[#183A2D] font-mono leading-none">
                      {product.price.toLocaleString('vi-VN')}đ
                      <span className="text-[10px] text-stone-400 font-normal font-sans ml-1">/ ngày</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-stone-400 font-ui block">Giá gốc:</span>
                    <span className="text-[11px] text-stone-400 line-through font-mono">
                      {(product.origPrice / 1000000).toFixed(1)}Tr
                    </span>
                  </div>
                </div>

                {/* Owner Tag & CTA */}
                <div className="pt-1 flex items-center justify-between text-[11px] font-ui">
                  <span className="text-stone-400 text-[10px]">Chủ tủ: <strong className="text-stone-700">{product.user}</strong></span>
                  <Link 
                    href="/shop?type=rent"
                    className="text-emerald-800 font-bold uppercase text-[10px] hover:underline"
                  >
                    Thuê Ngay &rarr;
                  </Link>
                </div>

              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 🔄 05 — CÁCH CLOOP HOẠT ĐỘNG (DUAL TABS THEO CHUẨN BY ROTATION) */}
      <HowItWorksTabs />

      {/* 👑 06 — MEET THE LENDERS (CỘNG ĐỒNG CHỦ TỦ TIÊU BIỂU) */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80 font-ui">
              CỘNG ĐỒNG ROTATORS
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-extrabold text-[#0A2517] tracking-tight mt-1.5">
              Khám Phá Tủ Đồ Của Các Chủ Tủ Hàng Đầu
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 font-body font-light mt-1">
              Gặp gỡ những người yêu thời trang đang chia sẻ hàng trăm món đồ thiết kế mỗi ngày.
            </p>
          </div>

          <Link 
            href="/shop" 
            className="group font-ui text-xs font-bold text-[#0A2517] hover:text-emerald-800 uppercase tracking-widest flex items-center gap-1.5 shrink-0"
          >
            <span>Xem Tất Cả Chủ Tủ</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 3 Prominent Lenders Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {topLenders.map((lender) => (
            <div 
              key={lender.id}
              className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs hover:shadow-xl hover:border-[#183A2D]/40 transition-all flex flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                {/* Header with Avatar & Badge */}
                <div className="flex items-center gap-3.5">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-[#183A2D]/30 shrink-0">
                    <Image src={lender.avatarImg} alt={lender.username} fill className="object-cover" unoptimized />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-heading font-bold text-base text-[#0A2517]">{lender.name}</h3>
                      <span className="text-xs text-stone-400 font-ui">({lender.username})</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 font-mono flex items-center gap-1 mt-0.5">
                      <ShieldCheck size={12} className="text-emerald-600" /> Tín nhiệm {lender.trustScore} • {lender.rating}
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-stone-600 font-body font-light leading-relaxed">
                  "{lender.bio}"
                </p>

                {/* Wardrobe Preview Thumbnails */}
                <div className="pt-2">
                  <span className="text-[10.5px] uppercase font-bold text-stone-400 font-ui tracking-wider block mb-2">
                    Tủ đồ ({lender.itemsCount}):
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {lender.featuredImgs.map((img, idx) => (
                      <div key={idx} className="relative aspect-[3/4] rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
                        <Image src={img} alt="Closet item" fill className="object-cover hover:scale-110 transition-transform duration-500" unoptimized />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Link */}
              <div className="pt-3 border-t border-stone-100">
                <Link
                  href="/shop?type=rent"
                  className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-[#183A2D] text-[#183A2D] hover:text-white font-ui text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Khám Phá Tủ Đồ Của {lender.name}</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 🌿 07 — HỘ CHIẾU SỐ & TÁC ĐỘNG MÔI TRƯỜNG (CLOOP EXCLUSIVE KILLER USP) */}
      <section className="w-full py-16 md:py-20 bg-[#F3EFE6] border-y border-stone-200/80 font-ui">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-center">
            
            {/* Left: Interactive Passport Card Preview */}
            <div className="w-full lg:w-1/2">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-stone-300/80 space-y-6">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800">
                      HỘ CHIẾU SỐ #CLOOP-VN-0892
                    </span>
                  </div>
                  <span className="text-[10px] bg-[#FAF7F0] border border-[#D5E4D1] text-[#28422A] px-2.5 py-0.5 rounded-full font-mono font-semibold">
                    Định danh Blockchain
                  </span>
                </div>

                <div className="flex gap-4 sm:gap-6 items-start">
                  <div className="relative w-24 sm:w-28 aspect-[3/4] rounded-2xl overflow-hidden shrink-0 border border-stone-200 shadow-xs">
                    <Image src="/1.1.jpg" alt="Váy Dạ Hội" fill className="object-cover" unoptimized />
                  </div>
                  <div className="space-y-2 flex-1">
                    <h3 className="font-heading text-lg sm:text-xl font-bold text-[#183A2D] leading-tight">
                      Váy Dạ Hội Xẻ Tà Lụa Satin
                    </h3>
                    <p className="text-xs text-stone-500">Chủ nhân ban đầu: <strong className="text-stone-800">@the.archive</strong></p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="text-[11px] bg-emerald-50 text-emerald-900 px-2.5 py-1 rounded-lg font-mono font-bold">
                        🔄 8 Vòng đời
                      </span>
                      <span className="text-[11px] bg-amber-50 text-amber-900 px-2.5 py-1 rounded-lg font-mono font-bold">
                        🌿 -196kg CO₂
                      </span>
                    </div>
                  </div>
                </div>

                {/* Travel route stamp milestones */}
                <div className="pt-4 border-t border-stone-100 space-y-2.5">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                    Hành Trình Du Ngoạn Của Trang Phục:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                    <div className="p-2.5 bg-[#FAF9F5] rounded-xl border border-stone-200/70">
                      <p className="font-bold text-[#183A2D]">Hà Nội</p>
                      <span className="text-[9.5px] text-stone-400">Dạ Vũ 2024</span>
                    </div>
                    <div className="p-2.5 bg-[#FAF9F5] rounded-xl border border-stone-200/70">
                      <p className="font-bold text-[#183A2D]">Đà Lạt</p>
                      <span className="text-[9.5px] text-stone-400">Ảnh Cưới 2025</span>
                    </div>
                    <div className="p-2.5 bg-[#FAF9F5] rounded-xl border border-stone-200/70">
                      <p className="font-bold text-[#183A2D]">TP.HCM</p>
                      <span className="text-[9.5px] text-stone-400">Gala 2026</span>
                    </div>
                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-300 text-emerald-900 font-bold">
                      <p>Đà Nẵng</p>
                      <span className="text-[9.5px] text-emerald-700">Sẵn sàng</span>
                    </div>
                  </div>
                </div>

                {/* Diary Note */}
                <div className="p-3.5 bg-[#FAF7F0] rounded-xl border border-[#E5DEC9] text-xs text-stone-600 italic font-serif leading-relaxed">
                  "Chiếc váy lụa này đã cùng mình nhận giải thưởng lớn tại đêm tiệc. Cảm ơn người bạn xa lạ đã chia sẻ nó!"
                </div>
              </div>
            </div>

            {/* Right: Storytelling & 3 Punchy ESG Numbers */}
            <div className="w-full lg:w-1/2 space-y-6">
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#2A4B2E] bg-[#E5EFE2] px-2.5 py-1 rounded-md border border-[#C5DAC2] font-ui">
                  MINH BẠCH VÒNG ĐỜI
                </span>
                <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#183A2D] leading-tight">
                  Mỗi Món Đồ Đều Có Một Hộ Chiếu
                </h2>
                <p className="text-stone-600 text-sm sm:text-base font-light leading-relaxed font-body">
                  Theo dõi ai đã mặc, đã đi đâu và đã được tái sử dụng bao nhiêu lần. Từng đường kim mũi chỉ đều được định danh, bảo chứng và lưu giữ kỷ niệm.
                </p>
              </div>

              {/* 3 Highlight Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
                  <DollarSign size={18} className="text-[#A37E2C] mb-1" />
                  <div className="text-xl font-extrabold font-mono text-[#0A2517]">~8 Triệu</div>
                  <p className="text-[10px] text-stone-500 mt-0.5">Tiết kiệm chi phí / năm</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
                  <Leaf size={18} className="text-emerald-700 mb-1" />
                  <div className="text-xl font-extrabold font-mono text-emerald-800">-196 kg</div>
                  <p className="text-[10px] text-stone-500 mt-0.5">CO₂ giảm phát thải</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
                  <Droplet size={18} className="text-sky-700 mb-1" />
                  <div className="text-xl font-extrabold font-mono text-sky-800">21.600 L</div>
                  <p className="text-[10px] text-stone-500 mt-0.5">Nước sạch bảo tồn</p>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/shop?type=rent"
                  className="px-8 py-4 bg-[#183A2D] hover:bg-[#112a20] text-white font-bold rounded-full text-xs sm:text-sm uppercase tracking-wider transition-all font-ui shadow-md inline-flex items-center gap-2"
                >
                  <span>Khám Phá Sàn Đồ Có Hộ Chiếu</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 💰 08 — LENDER MONETIZATION CALL-OUT BANNER */}
      <section className="w-full bg-[#EFECE4] py-16 md:py-20 px-4 md:px-8 border-b border-stone-300/80">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="text-[10.5px] uppercase font-bold tracking-widest text-[#183A2D] bg-white px-3.5 py-1.5 rounded-full border border-stone-300 font-ui inline-block shadow-xs">
            KIẾM TIỀN TỪ TỦ ĐỒ NHÀN RỖI
          </span>
          
          <h2 className="font-heading text-3xl sm:text-5xl font-extrabold text-[#0A2517] tracking-tight leading-tight">
            Tủ Đồ Của Bạn Đáng Giá Bao Nhiêu Khi Không Mặc Tới?
          </h2>
          
          <p className="text-stone-600 text-sm sm:text-base font-light max-w-xl mx-auto font-body leading-relaxed">
            Đừng để những bộ cánh lộng lẫy nằm im trong tủ. Tham gia cùng hơn 2.400+ chủ tủ tại CLOOP và kiếm từ 5–15 triệu đồng thu nhập thụ động mỗi tháng.
          </p>

          <div className="pt-2 flex justify-center">
            <Link
              href="/my-closet/create?mode=rent"
              className="px-8 py-4 bg-[#183A2D] hover:bg-[#112a20] text-white font-heading font-extrabold rounded-full text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 shadow-md hover:scale-105 flex items-center gap-2 font-ui"
            >
              <span>Bắt Đầu Đăng Tủ Cho Thuê</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* 🌿 BRAND SLOGAN MANIFESTO: SẴN SÀNG CHO VÒNG ĐỜI TIẾP THEO (KHÔNG CÓ NÚT DƯ THỪA) */}
      <section className="w-full bg-[#183A2D] text-white py-20 px-4 md:px-8 relative overflow-hidden font-ui">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#A3E39F]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center space-y-4 relative z-10">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#A3E39F] bg-white/10 px-3.5 py-1 rounded-full border border-white/20 font-ui inline-block shadow-xs">
            THỜI TRANG TUẦN HOÀN 2026
          </span>
          <h2 className="font-heading text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Sẵn Sàng Cho Vòng Đời Tiếp Theo?
          </h2>
          <p className="text-stone-200 text-xs sm:text-base font-light leading-relaxed max-w-xl mx-auto font-body">
            Mặc đẹp hơn, chi tiêu thông minh hơn và cùng hàng ngàn tín đồ thời trang chung tay bảo vệ hành tinh xanh.
          </p>
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
