"use client";

import { useState, useEffect, useMemo } from "react";
import { getOptimizedCloudinaryUrl } from "@/lib/cloudinary-optimize";
import Image from "next/image";
import Link from "next/link";
import { 
  ArrowRight, 
  ShieldCheck, 
  Leaf, 
  Lock,
  Heart,
  Droplet,
  DollarSign,
  CheckCircle2,
  Calendar
} from "lucide-react";
import VisualSearchModal from "@/app/components/VisualSearchModal";
import GoogleFlowFashionHero from "@/app/components/GoogleFlowFashionHero";
import LivePulseTicker from "@/app/components/LivePulseTicker";
import HowItWorksTabs from "@/app/components/HowItWorksTabs";
import { getShopProductsAction } from "@/app/actions/product";

const REAL_DEFAULT_PRODUCTS = [
  {
    id: "05693149-132b-4515-990d-d7f1cbab34d0",
    userId: "98758235-4ece-40a6-9e70-1a4a7f5cd62b",
    title: "Váy liền",
    brand: "HOYENVY76",
    price: 200000,
    origPrice: 750000,
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790652964/cloop_mobile_closet/y6rpnangntxkue2itbrt.jpg",
    hoverImg: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790652964/cloop_mobile_closet/y6rpnangntxkue2itbrt.jpg",
    user: "@hoyenvy76",
    tag: "Dạo phố"
  },
  {
    id: "1a1081f1-bb9a-4f63-9e58-446d4ab7fae5",
    userId: "98758235-4ece-40a6-9e70-1a4a7f5cd62b",
    title: "Áo trễ vai",
    brand: "HOYENVY76",
    price: 50000,
    origPrice: 200000,
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790652406/cloop_mobile_closet/fpz9ndww574pxu14zz6r.jpg",
    hoverImg: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790652406/cloop_mobile_closet/fpz9ndww574pxu14zz6r.jpg",
    user: "@hoyenvy76",
    tag: "Dạo phố"
  },
  {
    id: "c3a4cea4-4735-44f7-a53f-5bb3f3323102",
    userId: "451835b1-cfe5-4350-a6d9-fba0d8027f00",
    title: "Áo sweater dài tay phối cổ sơ mi màu xám",
    brand: "HUYENLINH",
    price: 260000,
    origPrice: 850000,
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790530424/cloop_mobile_closet/pt4xccwmvrjsrnhrgnib.png",
    hoverImg: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790530424/cloop_mobile_closet/pt4xccwmvrjsrnhrgnib.png",
    user: "@huyenlinhtinh555",
    tag: "Dạo phố"
  },
  {
    id: "43aed30a-d2ae-4001-929c-3d3292375737",
    userId: "b391e374-0506-46c1-86e3-edb9589eb4b0",
    title: "Áo dài xanh lụa satin",
    brand: "TRINHTRAN",
    price: 60000,
    origPrice: 450000,
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790158145/cloop_mobile_closet/amktbwdkwxb4swc32gry.jpg",
    hoverImg: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790158145/cloop_mobile_closet/amktbwdkwxb4swc32gry.jpg",
    user: "@tranthitrinh0501",
    tag: "Áo dài"
  },
  {
    id: "9c27a170-6daa-4765-b8ae-07e0666fae9e",
    userId: "cac12d82-2c0f-40d0-9a69-b3daee2584c6",
    title: "Áo dạ Tweets siêu xinh",
    brand: "QUYNH",
    price: 200000,
    origPrice: 1350000,
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790529427/cloop_mobile_closet/axmg0f26jcktzy9pq0ak.jpg",
    hoverImg: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790529427/cloop_mobile_closet/axmg0f26jcktzy9pq0ak.jpg",
    user: "@quynhnguyentall",
    tag: "Sự kiện"
  },
  {
    id: "e773470f-dada-428e-952f-452a8e925746",
    userId: "b391e374-0506-46c1-86e3-edb9589eb4b0",
    title: "Váy ren đen quyến rũ sang trọng",
    brand: "TRINHTRAN",
    price: 200000,
    origPrice: 1500000,
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790243386/cloop_mobile_closet/xpirvpupmyfoxxneenve.jpg",
    hoverImg: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790243386/cloop_mobile_closet/xpirvpupmyfoxxneenve.jpg",
    user: "@tranthitrinh0501",
    tag: "Dạ hội"
  },
  {
    id: "cfc8b957-6090-40c6-ac1c-409aaa1bdf91",
    userId: "b391e374-0506-46c1-86e3-edb9589eb4b0",
    title: "Áo dài hoa nhí xanh dịu dàng",
    brand: "TRINHTRAN",
    price: 70000,
    origPrice: 500000,
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790159335/cloop_mobile_closet/s3lwl54qe2sjov5i4oaw.jpg",
    hoverImg: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790159335/cloop_mobile_closet/s3lwl54qe2sjov5i4oaw.jpg",
    user: "@tranthitrinh0501",
    tag: "Áo dài"
  },
  {
    id: "c9596782-8dd0-47d8-a339-5ef1a2254d38",
    userId: "451835b1-cfe5-4350-a6d9-fba0d8027f00",
    title: "Áo yếm trễ hai vai màu trắng",
    brand: "HUYENLINH",
    price: 32000,
    origPrice: 520000,
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790529824/cloop_mobile_closet/fm1wjeikdlxlxofjhby8.jpg",
    hoverImg: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790529824/cloop_mobile_closet/fm1wjeikdlxlxofjhby8.jpg",
    user: "@huyenlinhtinh555",
    tag: "Du lịch"
  }
];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [activeClosetIndex, setActiveClosetIndex] = useState(0);
  const [products, setProducts] = useState<any[]>(REAL_DEFAULT_PRODUCTS);

  useEffect(() => {
    let isMounted = true;
    getShopProductsAction({ type: "all", limit: 32 })
      .then((res) => {
        if (isMounted && res.success && Array.isArray(res.products) && res.products.length > 0) {
          const clean = res.products.filter((p: any) => {
            const img = p.images?.[0]?.url || p.images?.[0] || p.image || p.img;
            return img && typeof img === "string" && !img.startsWith("/");
          });
          if (clean.length > 0) {
            setProducts(clean);
          }
        }
      })
      .catch((err) => console.error("Error loading storefront products:", err));
    return () => { isMounted = false; };
  }, []);

  // Trích xuất linh hoạt ảnh mới nhất từ database chung cho từng dịp. Mục nào chưa có hình thì trả về null để ẩn
  const getLatestOccasionImage = (keywords: string[]) => {
    const found = products.find((p: any) => {
      const occasion = (p.occasion || "").toLowerCase();
      const category = (p.category || "").toLowerCase();
      const title = (p.title || "").toLowerCase();
      const tag = (p.tag || "").toLowerCase();
      return keywords.some((k) => occasion.includes(k) || category.includes(k) || title.includes(k) || tag.includes(k));
    });
    const url = found?.images?.[0]?.url || found?.images?.[0] || found?.img || found?.image;
    return (url && typeof url === "string" && !url.startsWith("/")) ? url : null;
  };

  // 03 — OCCASIONS (Đồng bộ đầy đủ sự kiện, chỉ hiện mục CÓ HÌNH, tự động hiện khi có ảnh mới)
  const occasionCollections = useMemo(() => {
    const allOccasions = [
      { 
        id: "wedding", 
        title: "Dự Tiệc Cưới", 
        keywords: ["cưới", "tiệc", "đầm dự tiệc", "váy ren"],
        link: "/shop?occasion=Tiệc cưới"
      },
      { 
        id: "gala", 
        title: "Dạ Hội", 
        keywords: ["dạ hội", "sự kiện", "prom", "sang trọng"],
        link: "/shop?occasion=Dạ hội"
      },
      { 
        id: "heritage", 
        title: "Áo Dài", 
        keywords: ["áo dài", "cách tân", "truyền thống", "cổ phục"],
        link: "/shop?occasion=Áo dài"
      },
      { 
        id: "street", 
        title: "Dạo Phố", 
        keywords: ["dạo phố", "hằng ngày", "phố", "áo thun", "sweater", "cà phê"],
        link: "/shop?occasion=Dạo phố"
      },
      { 
        id: "travel", 
        title: "Du Lịch", 
        keywords: ["du lịch", "dã ngoại", "biển", "váy maxi", "yếm", "đi biển"],
        link: "/shop?occasion=Du lịch"
      },
      { 
        id: "birthday", 
        title: "Sinh Nhật", 
        keywords: ["sinh nhật", "hẹn hò", "date", "hoa nhí", "ngọt ngào"],
        link: "/shop?occasion=Sinh nhật"
      },
      { 
        id: "event", 
        title: "Sự Kiện", 
        keywords: ["sự kiện", "biểu diễn", "event", "stage", "áo dạ"],
        link: "/shop?occasion=Sự kiện"
      },
      { 
        id: "festival", 
        title: "Lễ Hội", 
        keywords: ["lễ hội", "festival", "check-in", "tết", "trung thu"],
        link: "/shop?occasion=Lễ hội"
      },
    ];

    return allOccasions
      .map((occ) => {
        const rawImg = getLatestOccasionImage(occ.keywords);
        if (!rawImg) return null; // Mục nào chưa có hình thì thôi không hiện, sau có hình tự động hiện!
        return {
          id: occ.id,
          title: occ.title,
          image: getOptimizedCloudinaryUrl(rawImg, 700),
          link: occ.link
        };
      })
      .filter(Boolean) as Array<{ id: string; title: string; image: string; link: string }>;
  }, [products]);

  // 04 — TRENDING ROTATIONS CATALOG (Dữ Liệu Thật 100% Cập Nhật Mới Nhất)
  const trendingCatalog = products.slice(0, 8).map((p: any, idx: number) => {
    const img = p.images?.[0]?.url || p.images?.[0] || p.img || "";
    const hoverImg = p.images?.[1]?.url || p.images?.[1] || img;
    const owner = p.user?.name || p.ownerName || (typeof p.user === 'string' ? p.user.replace('@', '') : "Thành viên CLOOP");
    const tag = p.occasion || p.category || "Dạo phố";
    const userHandle = typeof p.user === "string" ? p.user.replace(/^@/, "") : (p.user?.username || p.user?.name || p.ownerName || "");
    const userId = p.userId || p.user?.id || userHandle || (owner.toLowerCase().replace(/\s+/g, ''));

    // Phân biệt chính xác giữa Thuê đồ và Mua sở hữu (bán lại)
    const rentPrice = p.rentalPrice && Number(p.rentalPrice) > 0 ? Number(p.rentalPrice) : 0;
    const sellPrice = p.salePrice && Number(p.salePrice) > 0 ? Number(p.salePrice) : 0;
    const isSellOnly = (p.listingTypeRaw === "SELL" || sellPrice > 0) && rentPrice === 0;
    const isBoth = rentPrice > 0 && sellPrice > 0;

    let mode = "RENT";
    let modeBadge = "Thuê đồ";
    let priceLabel = "Giá thuê";
    let price = rentPrice || 50000;
    let priceUnit = "/ ngày";
    let ctaText = "Thuê Ngay";
    let origPrice = sellPrice > 0 ? sellPrice : (price * 5);

    if (isSellOnly) {
      mode = "SELL";
      modeBadge = "Mua sở hữu";
      priceLabel = "Giá bán";
      price = sellPrice || (typeof p.price === "number" && p.price > 0 ? p.price : 100000);
      priceUnit = "";
      ctaText = "Mua Ngay";
      origPrice = p.origPrice || (price > 150000 ? Math.round(price * 1.5) : Math.round(price * 2.5));
    } else if (isBoth) {
      mode = "BOTH";
      modeBadge = "Thuê & Mua";
      priceLabel = "Giá thuê";
      price = rentPrice;
      priceUnit = "/ ngày";
      ctaText = "Chi Tiết";
      origPrice = sellPrice;
    } else {
      // Thuê đồ thuần túy
      price = rentPrice || (typeof p.price === "number" && p.price > 0 ? p.price : 50000);
      origPrice = sellPrice > 0 ? sellPrice : (p.origPrice || price * 5);
    }

    if (origPrice <= price) {
      origPrice = Math.round(price * 1.8);
    }

    return {
      id: p.id || idx,
      userId,
      title: p.title || "Trang phục CLOOP",
      brand: p.brand || owner,
      price,
      priceLabel,
      priceUnit,
      mode,
      modeBadge,
      ctaText,
      origPrice,
      img,
      hoverImg,
      user: typeof p.user === "string" ? p.user : `@${p.user?.username || (owner.toLowerCase().replace(/\s+/g, ''))}`,
      tag
    };
  });

  const getLenderFeaturedImgs = (userId: string, fallbacks: string[]) => {
    const userProds = products.filter((p: any) => p.userId === userId);
    const imgs = userProds.map((p: any) => p.images?.[0]?.url || p.images?.[0] || p.img).filter(Boolean);
    if (imgs.length >= 3) return imgs.slice(0, 3);
    return Array.from(new Set([...imgs, ...fallbacks])).slice(0, 3);
  };

  const getLenderItemCount = (userId: string, defaultCount: number) => {
    const count = products.filter((p: any) => p.userId === userId).length;
    return count > 0 ? count : defaultCount;
  };

  // 06 — MEET THE LENDERS (Top 3 Chủ Tủ CLOOP Uy Tín Nhất Từ Hệ Thống)
  const topLenders = useMemo(() => [
    {
      id: 0,
      userId: 'b391e374-0506-46c1-86e3-edb9589eb4b0',
      username: 'tranthitrinh0501',
      name: 'Trinh Trần',
      tag: 'CHỦ TỦ TÍCH CỰC',
      rating: '5.0 ★',
      bio: 'Tủ đồ đa dạng phong cách từ đầm dạ hội sang trọng, áo dài truyền thống đến các set đồ du lịch biển trẻ trung.',
      itemsCount: `${getLenderItemCount('b391e374-0506-46c1-86e3-edb9589eb4b0', 14)} món đồ`,
      avatarImg: getOptimizedCloudinaryUrl('https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790243386/cloop_mobile_closet/xpirvpupmyfoxxneenve.jpg', 300),
      featuredImgs: getLenderFeaturedImgs('b391e374-0506-46c1-86e3-edb9589eb4b0', [
        'https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790243386/cloop_mobile_closet/xpirvpupmyfoxxneenve.jpg',
        'https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790159416/cloop_mobile_closet/aefeq2587mrhrxn56udw.jpg',
        'https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790160514/cloop_mobile_closet/u9te4xi7eh2dgi9u1b5h.jpg'
      ]).map(url => getOptimizedCloudinaryUrl(url, 400)),
    },
    {
      id: 1,
      userId: '451835b1-cfe5-4350-a6d9-fba0d8027f00',
      username: 'huyenlinhtinh555',
      name: 'Huyền Linh',
      tag: 'XU HƯỚNG MỚI',
      rating: '5.0 ★',
      bio: 'Yêu thích phong cách trẻ trung năng động, đồ dạo phố nhẹ nhàng và set đồ cardigan cực xinh cho các bạn nữ.',
      itemsCount: `${getLenderItemCount('451835b1-cfe5-4350-a6d9-fba0d8027f00', 13)} món đồ`,
      avatarImg: getOptimizedCloudinaryUrl('https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790530424/cloop_mobile_closet/pt4xccwmvrjsrnhrgnib.png', 300),
      featuredImgs: getLenderFeaturedImgs('451835b1-cfe5-4350-a6d9-fba0d8027f00', [
        'https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790530424/cloop_mobile_closet/pt4xccwmvrjsrnhrgnib.png',
        'https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790529824/cloop_mobile_closet/fm1wjeikdlxlxofjhby8.jpg',
        'https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790528463/cloop_mobile_closet/lod8a8mhqifkmxsghevr.jpg'
      ]).map(url => getOptimizedCloudinaryUrl(url, 400)),
    },
    {
      id: 2,
      userId: 'cac12d82-2c0f-40d0-9a69-b3daee2584c6',
      username: 'quynhnguyentall',
      name: 'Quỳnh',
      tag: 'THIẾT KẾ NỔI BẬT',
      rating: '5.0 ★',
      bio: 'Gu thời trang nữ tính, sang xịn mịn với các mẫu váy đầm dự tiệc và áo dạ tweet phom dáng cực chuẩn.',
      itemsCount: `${getLenderItemCount('cac12d82-2c0f-40d0-9a69-b3daee2584c6', 6)} món đồ`,
      avatarImg: getOptimizedCloudinaryUrl('https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790529633/cloop_mobile_closet/ekxdoqiw0ge05f9znmgj.jpg', 300),
      featuredImgs: getLenderFeaturedImgs('cac12d82-2c0f-40d0-9a69-b3daee2584c6', [
        'https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790529633/cloop_mobile_closet/ekxdoqiw0ge05f9znmgj.jpg',
        'https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790530309/cloop_mobile_closet/zvvo3mp0lrsa4mbvam60.jpg',
        'https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790529427/cloop_mobile_closet/axmg0f26jcktzy9pq0ak.jpg'
      ]).map(url => getOptimizedCloudinaryUrl(url, 400)),
    }
  ], [products]);

  return (
    <main className="min-h-screen overflow-x-hidden antialiased bg-[#FAF9F5] text-[#0A2517] pb-28 md:pb-0 font-body">

      {/* 01 — HERO EDITORIAL */}
      <GoogleFlowFashionHero initialProducts={products} />

      {/* ⚡ 02 — NHỊP ĐẬP TUẦN HOÀN (CHÂN HERO HEADER) */}
      <LivePulseTicker />

      {/* 👗 03 — OCCASIONS (Kiểu By Rotation: khi rê chuột kéo to hình ra đầy đủ) */}
      <section className="w-full max-w-7xl xl:max-w-[1380px] mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl text-[#0A2517] font-extrabold tracking-tight">
            Tìm Phong Cách Theo Dịp Của Bạn
          </h2>

          <Link 
            href="/shop" 
            prefetch={true}
            className="font-ui text-xs font-bold uppercase tracking-wider text-[#183A2D] hover:text-emerald-800 flex items-center gap-1 group shrink-0"
          >
            <span>Tất Cả Phong Cách</span>
            <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 💻 DESKTOP: Khi rê chuột vào thẻ nào, thẻ đó mượt mà dãn rộng kéo to hình ra đầy đủ (Accordion Expanding Cards) */}
        <div className="hidden md:flex gap-3 lg:gap-3.5 w-full h-[460px] lg:h-[500px]">
          {occasionCollections.map((col) => (
            <Link
              key={col.id}
              href={col.link}
              prefetch={true}
              className="group relative flex-1 hover:flex-[3] lg:hover:flex-[3.5] transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] rounded-2xl lg:rounded-3xl overflow-hidden shadow-xs hover:shadow-2xl cursor-pointer border border-stone-200/80 flex flex-col justify-end p-5 lg:p-6"
            >
              <Image 
                src={col.image} 
                alt={col.title} 
                fill 
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105 brightness-[0.92] group-hover:brightness-[0.96]" 
                unoptimized 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

              <div className="relative z-10 space-y-1">
                <h3 className="font-heading text-xl lg:text-2xl font-bold text-white leading-tight whitespace-nowrap drop-shadow-md">
                  {col.title}
                </h3>
                <div className="flex items-center gap-1 text-xs font-semibold text-[#A3E39F] group-hover:text-white transition-colors font-ui">
                  <span className="uppercase text-[10px] tracking-wider whitespace-nowrap">Khám Phá Ngay</span>
                  <ArrowRight size={12} className="group-hover:translate-x-1.5 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* 📱 MOBILE: Lướt ngang mượt mà */}
        <div className="flex md:hidden overflow-x-auto no-scrollbar gap-3 snap-x px-4 -mx-4 py-1">
          {occasionCollections.map((col) => (
            <Link
              key={col.id}
              href={col.link}
              prefetch={true}
              className="w-[220px] shrink-0 aspect-[9/14] snap-start rounded-2xl overflow-hidden relative shadow-xs border border-stone-200/80 p-4 flex flex-col justify-end group active:scale-[0.98] transition-transform"
            >
              <Image 
                src={col.image} 
                alt={col.title} 
                fill 
                className="object-cover brightness-[0.92]" 
                unoptimized 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

              <div className="relative z-10 space-y-1">
                <h3 className="font-heading text-lg font-bold text-white leading-tight">
                  {col.title}
                </h3>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-[#A3E39F] font-ui uppercase">
                  <span>Khám Phá Ngay</span>
                  <ArrowRight size={11} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 🌟 04 — TRENDING ROTATIONS (SẢN PHẨM NỔI BẬT ĐANG ĐƯỢC THUÊ / MUA SỞ HỮU) */}
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
            href="/shop" 
            prefetch={true}
            className="group font-ui text-xs font-bold text-[#0A2517] hover:text-emerald-800 uppercase tracking-widest flex items-center gap-1.5 shrink-0"
          >
            <span>Xem Toàn Bộ Sàn</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 4-Column Clean Editorial Product Grid - 100% Clickable Directly into Product */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {trendingCatalog.map((product) => (
            <div 
              key={product.id} 
              className="group flex flex-col bg-white rounded-2xl p-3 border border-stone-200/80 hover:border-[#183A2D]/40 hover:shadow-lg transition-all"
            >
              {/* Product Image Frame - Clickable Link to Product Details */}
              <Link
                href={`/product/${product.id}`}
                prefetch={true}
                className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden rounded-xl mb-3 cursor-pointer group/img block"
              >
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
                <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-xs text-white font-ui text-[8.5px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wider shadow-xs z-10 pointer-events-none">
                  {product.tag}
                </div>

                {/* Bottom Left Mode Badge (Thuê đồ / Mua sở hữu) */}
                <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none">
                  <span className={`text-[8.5px] uppercase font-bold px-2 py-0.5 rounded-md shadow-xs font-ui ${
                    product.mode === "SELL" 
                      ? "bg-amber-600 text-white" 
                      : product.mode === "BOTH" 
                        ? "bg-teal-700 text-white" 
                        : "bg-emerald-700 text-white"
                  }`}>
                    {product.modeBadge}
                  </span>
                </div>

                {/* Top Right Save/Heart */}
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs text-stone-600 hover:text-rose-500 hover:scale-110 transition-all flex items-center justify-center shadow-sm z-10 cursor-pointer"
                  title="Lưu vào yêu thích"
                >
                  <Heart size={14} />
                </button>
              </Link>

              {/* Product Details */}
              <div className="flex flex-col flex-1 justify-between space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10.5px]">
                    <Link
                      href={`/closet/${product.userId}`}
                      prefetch={true}
                      className="text-stone-500 hover:text-emerald-800 font-ui font-semibold uppercase tracking-wider transition-colors hover:underline"
                    >
                      {product.brand}
                    </Link>
                    <span className="text-emerald-700 font-bold font-mono text-[9.5px] bg-emerald-50 px-1.5 py-0.5 rounded">
                      Tiết kiệm 90%
                    </span>
                  </div>

                  <Link href={`/product/${product.id}`} prefetch={true}>
                    <h4 className="text-sm font-heading font-bold text-[#0A2517] line-clamp-1 hover:text-emerald-800 transition-colors">
                      {product.title}
                    </h4>
                  </Link>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] text-stone-400 font-ui block">{product.priceLabel}:</span>
                    <p className="text-base font-extrabold text-[#183A2D] font-mono leading-none">
                      {product.price.toLocaleString('vi-VN')}đ
                      {product.priceUnit && (
                        <span className="text-[10px] text-stone-400 font-normal font-sans ml-1">{product.priceUnit}</span>
                      )}
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
                  <span className="text-stone-400 text-[10px]">
                    Chủ tủ:{" "}
                    <Link
                      href={`/closet/${product.userId}`}
                      prefetch={true}
                      className="text-stone-700 hover:text-emerald-800 font-bold hover:underline"
                    >
                      {product.user}
                    </Link>
                  </span>
                  <Link 
                    href={`/product/${product.id}`}
                    prefetch={true}
                    className="text-emerald-800 font-bold uppercase text-[10px] hover:underline flex items-center gap-0.5"
                  >
                    <span>{product.ctaText}</span>
                    <ArrowRight size={11} />
                  </Link>
                </div>

              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 🔄 05 — CÁCH CLOOP HOẠT ĐỘNG (DUAL TABS THEO CHUẨN BY ROTATION) */}
      <HowItWorksTabs />

      {/* 06 — MEET THE LENDERS (CỘNG ĐỒNG CLOOP TIÊU BIỂU) */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-20">
        {/* Header centered */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80 font-ui">
            CỘNG ĐỒNG CLOOP
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-extrabold text-[#0A2517] tracking-tight">
            Chủ Tủ Hàng Đầu
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 font-body font-light">
            Gặp gỡ những người yêu thời trang chia sẻ tủ đồ uy tín nhất CLOOP.
          </p>
        </div>

        {/* 3 Prominent Lenders Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {topLenders.map((lender) => (
            <div 
              key={lender.id}
              className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs hover:shadow-xl hover:border-[#183A2D]/40 transition-all flex flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                {/* Header with Avatar & Badge - Clickable to public closet */}
                <Link 
                  href={`/closet/${lender.userId}`}
                  prefetch={true}
                  className="flex items-center gap-3.5 group/lender block cursor-pointer"
                >
                  <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-[#183A2D]/30 group-hover/lender:border-[#183A2D] transition-colors shrink-0">
                    <Image src={lender.avatarImg} alt={lender.username} fill className="object-cover group-hover/lender:scale-105 transition-transform" unoptimized />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-heading font-bold text-base text-[#0A2517] group-hover/lender:text-emerald-800 transition-colors">{lender.name}</h3>
                      <span className="text-xs text-stone-400 font-ui">({lender.username})</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 font-mono flex items-center gap-1 mt-0.5">
                      <ShieldCheck size={12} className="text-emerald-600" /> Đã xác thực eKYC • Đánh giá {lender.rating}
                    </span>
                  </div>
                </Link>

                <p className="text-xs sm:text-sm text-stone-600 font-body font-light leading-relaxed">
                  "{lender.bio}"
                </p>

                {/* Wardrobe Preview Thumbnails - Clickable to public closet */}
                <div className="pt-2">
                  <span className="text-[10.5px] uppercase font-bold text-stone-400 font-ui tracking-wider block mb-2">
                    Tủ đồ ({lender.itemsCount}):
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {lender.featuredImgs.map((img, idx) => (
                      <Link 
                        key={idx} 
                        href={`/closet/${lender.userId}`}
                        prefetch={true}
                        className="relative aspect-[3/4] rounded-lg overflow-hidden border border-stone-200 bg-stone-100 block group/thumb cursor-pointer"
                      >
                        <Image src={img} alt="Closet item" fill className="object-cover group-hover/thumb:scale-110 transition-transform duration-500" unoptimized />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Link to public closet */}
              <div className="pt-3 border-t border-stone-100">
                <Link
                  href={`/closet/${lender.userId}`}
                  prefetch={true}
                  className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-[#183A2D] text-[#183A2D] hover:text-white font-ui text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Khám Phá Tủ Đồ Của {lender.name}</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA centered */}
        <div className="mt-10 text-center">
          <Link 
            href="/shop" 
            prefetch={true}
            className="group font-ui text-xs font-bold text-[#0A2517] hover:text-emerald-800 uppercase tracking-widest inline-flex items-center gap-1.5 px-6 py-3 rounded-full border border-stone-300/80 bg-white hover:bg-stone-50 transition-all shadow-xs cursor-pointer"
          >
            <span>Xem Tất Cả Chủ Tủ</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
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
                    <Image 
                      src="https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790243386/cloop_mobile_closet/xpirvpupmyfoxxneenve.jpg" 
                      alt="Váy Ren Đen Dạ Hội Sang Trọng" 
                      fill 
                      className="object-cover" 
                      unoptimized 
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <h3 className="font-heading text-lg sm:text-xl font-bold text-[#183A2D] leading-tight">
                      Váy Ren Đen Dạ Hội Sang Trọng
                    </h3>
                    <p className="text-xs text-stone-500">Chủ nhân ban đầu: <strong className="text-stone-800">@tranthitrinh0501</strong></p>
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
