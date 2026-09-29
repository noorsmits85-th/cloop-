"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Camera, Search, X, 
  ShieldCheck, Leaf
} from "lucide-react";
import VisualSearchModal from "@/app/components/VisualSearchModal";
import { getShopProductsAction } from "@/app/actions/product";
import { getOptimizedCloudinaryUrl } from "@/lib/cloudinary-optimize";

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
  isSale?: boolean;
}

const REAL_DEFAULT_PRODUCTS = [
  {
    id: "05693149-132b-4515-990d-d7f1cbab34d0",
    title: "Váy liền",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790652964/cloop_mobile_closet/y6rpnangntxkue2itbrt.jpg",
    tag: "Đầm & Váy",
    occasion: "Dạo phố",
    price: "200k (Mua sở hữu)",
    originalPrice: "750.000đ",
    ownerName: "hoyenvy76",
    modelFit: "Size M • Thanh lịch"
  },
  {
    id: "1a1081f1-bb9a-4f63-9e58-446d4ab7fae5",
    title: "Áo trễ vai",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790652406/cloop_mobile_closet/fpz9ndww574pxu14zz6r.jpg",
    tag: "Áo",
    occasion: "Dạo phố",
    price: "50k (Mua sở hữu)",
    originalPrice: "200.000đ",
    ownerName: "hoyenvy76",
    modelFit: "Size S-M • Dễ thương"
  },
  {
    id: "c3a4cea4-4735-44f7-a53f-5bb3f3323102",
    title: "Áo sweater dài tay phối cổ sơ mi màu xám",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790530424/cloop_mobile_closet/pt4xccwmvrjsrnhrgnib.png",
    tag: "Áo",
    occasion: "Dạo phố",
    price: "260k/ngày",
    originalPrice: "850.000đ",
    ownerName: "huyenlinhtinh555",
    modelFit: "Size M • Form trẻ trung"
  },
  {
    id: "43aed30a-d2ae-4001-929c-3d3292375737",
    title: "Áo dài xanh lụa satin",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790158145/cloop_mobile_closet/amktbwdkwxb4swc32gry.jpg",
    tag: "Áo dài",
    occasion: "Tiệc cưới",
    price: "60k/ngày",
    originalPrice: "450.000đ",
    ownerName: "Trinh Trần",
    modelFit: "Size M • Duyên dáng"
  },
  {
    id: "9c27a170-6daa-4765-b8ae-07e0666fae9e",
    title: "Áo dạ Tweets siêu xinh",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790529427/cloop_mobile_closet/axmg0f26jcktzy9pq0ak.jpg",
    tag: "Áo khoác",
    occasion: "Sự kiện",
    price: "200k/ngày",
    originalPrice: "1.350.000đ",
    ownerName: "Quỳnh",
    modelFit: "Size M • Chuẩn form"
  },
  {
    id: "e773470f-dada-428e-952f-452a8e925746",
    title: "Váy ren đen quyến rũ sang trọng",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790243386/cloop_mobile_closet/xpirvpupmyfoxxneenve.jpg",
    tag: "Đầm & Váy",
    occasion: "Dạ hội",
    price: "200k/ngày",
    originalPrice: "1.500.000đ",
    ownerName: "Trinh Trần",
    modelFit: "Size M • Quyến rũ"
  },
  {
    id: "cfc8b957-6090-40c6-ac1c-409aaa1bdf91",
    title: "Áo dài hoa nhí xanh dịu dàng",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790159335/cloop_mobile_closet/s3lwl54qe2sjov5i4oaw.jpg",
    tag: "Áo dài",
    occasion: "Tiệc cưới",
    price: "70k/ngày",
    originalPrice: "650.000đ",
    ownerName: "Trinh Trần",
    modelFit: "Size M • Dịu dàng"
  },
  {
    id: "c9596782-8dd0-47d8-a339-5ef1a2254d38",
    title: "Áo yếm trễ hai vai màu trắng",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790529824/cloop_mobile_closet/fm1wjeikdlxlxofjhby8.jpg",
    tag: "Áo",
    occasion: "Du lịch",
    price: "32k/ngày",
    originalPrice: "520.000đ",
    ownerName: "huyenlinhtinh555",
    modelFit: "Size S-M • Quyến rũ"
  },
  {
    id: "b631f003-aac7-474c-9c51-2b016483e980",
    title: "Set hai món áo thun trễ vai kèm áo dây",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790529215/cloop_mobile_closet/xgets5evjgbimymuwhph.jpg",
    tag: "Set đồ",
    occasion: "Dạo phố",
    price: "280k/ngày",
    originalPrice: "980.000đ",
    ownerName: "huyenlinhtinh555",
    modelFit: "Size M • Nữ tính"
  },
  {
    id: "26a74511-68e7-4e87-9f60-446487711b8e",
    title: "Quần jean trắng nữ ống rộng",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790529105/cloop_mobile_closet/hjwa8skzpg2hyojtdyw8.jpg",
    tag: "Quần",
    occasion: "Dạo phố",
    price: "150k/ngày",
    originalPrice: "650.000đ",
    ownerName: "Quỳnh",
    modelFit: "Size M • Ống suông"
  },
  {
    id: "73ab9d7c-788a-4500-b6b9-c4739cf17361",
    title: "Áo cộc tay lệch vai màu xám",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790528654/cloop_mobile_closet/jtcs4aqozlktffcb8em8.jpg",
    tag: "Áo",
    occasion: "Dạo phố",
    price: "130k/ngày",
    originalPrice: "480.000đ",
    ownerName: "huyenlinhtinh555",
    modelFit: "Size M • Cá tính"
  },
  {
    id: "5b53c97b-abae-41a5-961d-f0e0308e74be",
    title: "Set Váy Kẻ Caro Kèm Cardigan",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790528463/cloop_mobile_closet/lod8a8mhqifkmxsghevr.jpg",
    tag: "Set váy",
    occasion: "Hẹn hò",
    price: "200k/ngày",
    originalPrice: "1.050.000đ",
    ownerName: "huyenlinhtinh555",
    modelFit: "Size M • Dễ thương"
  },
  {
    id: "7fe34a92-d544-44d4-99c4-541560b9d55f",
    title: "Đồ bộ hoa đỏ xanh chụp ảnh",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790243509/cloop_mobile_closet/frv18nicmfvrr1lwv8qu.jpg",
    tag: "Set đồ",
    occasion: "Chụp ảnh",
    price: "50k/ngày",
    originalPrice: "350.000đ",
    ownerName: "Trinh Trần",
    modelFit: "Size M • Nổi bật"
  },
  {
    id: "e773470f-dada-428e-952f-452a8e925746",
    title: "Váy ren đen quyến rũ sang trọng",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790243386/cloop_mobile_closet/xpirvpupmyfoxxneenve.jpg",
    tag: "Đầm & Váy",
    occasion: "Dạ hội",
    price: "200k/ngày",
    originalPrice: "1.500.000đ",
    ownerName: "Trinh Trần",
    modelFit: "Size M • Quyến rũ"
  },
  {
    id: "53256227-1d64-442e-9a30-eccdc7e39b2b",
    title: "Áo dài sự kiện truyền thống",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790236961/cloop_mobile_closet/zkfordpozndqzflmfjso.jpg",
    tag: "Áo dài",
    occasion: "Sự kiện",
    price: "100k/ngày",
    originalPrice: "850.000đ",
    ownerName: "Trang",
    modelFit: "Size M • Duyên dáng"
  },
  {
    id: "4c65d5f3-b8f7-49d4-9df9-1534674847d4",
    title: "Sét đồ sọc nữ đi biển",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790160514/cloop_mobile_closet/u9te4xi7eh2dgi9u1b5h.jpg",
    tag: "Set đồ",
    occasion: "Du lịch",
    price: "100k/ngày",
    originalPrice: "500.000đ",
    ownerName: "Trinh Trần",
    modelFit: "Size M • Thoáng mát"
  },
  {
    id: "c47cbeee-214c-42d4-ba13-c9401f239f8e",
    title: "Váy dài đi biển hoa nhí",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790160203/cloop_mobile_closet/bwaklbajgj4eeyjlbfa9.jpg",
    tag: "Đầm & Váy",
    occasion: "Du lịch",
    price: "70k/ngày",
    originalPrice: "420.000đ",
    ownerName: "Trinh Trần",
    modelFit: "Size M • Nhẹ nhàng"
  },
  {
    id: "45f953eb-2f0f-4485-a499-f1ea46c1ab20",
    title: "Áo thun sọc nữ đáng yêu",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790159832/cloop_mobile_closet/tk2qpa5zltgp7aiq1mcm.jpg",
    tag: "Áo thun",
    occasion: "Dạo phố",
    price: "50k/ngày",
    originalPrice: "300.000đ",
    ownerName: "Trinh Trần",
    modelFit: "Size M • Dễ thương"
  },
  {
    id: "018f6cb9-74f1-48fe-bbed-4cc54ea6843f",
    title: "Áo nữ babydoll dễ thương",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790159659/cloop_mobile_closet/jiwf2f9me4txmx5zcp96.jpg",
    tag: "Áo",
    occasion: "Dạo phố",
    price: "100k/ngày",
    originalPrice: "480.000đ",
    ownerName: "Trinh Trần",
    modelFit: "Size M • Thoải mái"
  },
  {
    id: "42ff79cd-eeb4-4887-9f55-bc2bd629a615",
    title: "Váy trắng trễ vai dáng dài sang trọng",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790159416/cloop_mobile_closet/aefeq2587mrhrxn56udw.jpg",
    tag: "Đầm & Váy",
    occasion: "Tiệc cưới",
    price: "100k/ngày",
    originalPrice: "890.000đ",
    ownerName: "Trinh Trần",
    modelFit: "Size M • Thướt tha"
  },
  {
    id: "cfc8b957-6090-40c6-ac1c-409aaa1bdf91",
    title: "Áo dài hoa nhí xanh dịu dàng",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790159335/cloop_mobile_closet/s3lwl54qe2sjov5i4oaw.jpg",
    tag: "Áo dài",
    occasion: "Tiệc cưới",
    price: "70k/ngày",
    originalPrice: "650.000đ",
    ownerName: "Trinh Trần",
    modelFit: "Size M • Nữ tính"
  },
  {
    id: "cc80a8a6-d638-4e72-8f41-8da2275053c6",
    title: "Váy voan hoa nhí dễ thương",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790158613/cloop_mobile_closet/zxomorv7ido8dciuftrl.jpg",
    tag: "Đầm & Váy",
    occasion: "Dạo phố",
    price: "100k/ngày",
    originalPrice: "550.000đ",
    ownerName: "Trinh Trần",
    modelFit: "Size M • Xinh xắn"
  },
  {
    id: "173fb95f-4faa-475f-9f6d-bd50290ec5f3",
    title: "Đồ thể thao đá bóng nữ năng động",
    img: "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790158416/cloop_mobile_closet/z8aoxz4mqcyzltogtblw.jpg",
    tag: "Thể thao",
    occasion: "Thể thao",
    price: "100k/ngày",
    originalPrice: "450.000đ",
    ownerName: "Trinh Trần",
    modelFit: "Size M • Năng động"
  }
];

const aspects = ["aspect-[3/4]", "aspect-[4/5]", "aspect-[3/4]", "aspect-square"];

function buildMosaicColumns(rawItems: any[]): FashionItem[][] {
  const columns: FashionItem[][] = [[], [], [], [], []];
  
  const valid = rawItems && rawItems.length > 0 ? rawItems : REAL_DEFAULT_PRODUCTS;
  
  const formatted: FashionItem[] = valid
    .map((p, idx) => {
      const rawImgUrl = p.img || p.image || (Array.isArray(p.images) ? (p.images[0]?.url || p.images[0]) : "");
      if (!rawImgUrl || typeof rawImgUrl !== "string" || rawImgUrl.startsWith("/")) return null;
      const imgUrl = getOptimizedCloudinaryUrl(rawImgUrl, 420);

      const title = p.title || "Trang phục CLOOP";
      const isSale = p.listingTypeRaw === "SELL" || (p.rentalPrice === 0 && p.salePrice > 0);
      const isRent = p.listingTypeRaw === "RENT" || (p.rentalPrice && Number(p.rentalPrice) > 0);

      let priceDisplay = "100k/ngày";
      if (isSale && !isRent) {
        const sPrice = p.salePrice || p.price || 100000;
        priceDisplay = `${Math.round(sPrice / 1000)}k (Mua sở hữu)`;
      } else {
        const rPrice = p.rentalPrice || p.price || 80000;
        priceDisplay = `${Math.round(rPrice / 1000)}k/ngày (Thuê đồ)`;
      }

      return {
        id: p.id || `real-${idx}`,
        img: imgUrl,
        tag: isSale && !isRent ? "Mua sở hữu" : (p.category && p.category !== "DRESSES" ? p.category : (p.occasion || "Thuê đồ")),
        title,
        price: priceDisplay,
        originalPrice: p.originalPrice || (p.salePrice ? `${Number(p.salePrice).toLocaleString("vi-VN")}đ` : "Tuyển chọn"),
        aspect: aspects[idx % aspects.length],
        eco: "-8.5kg CO₂",
        passport: `CLP-${(p.id || "REAL").slice(0, 4).toUpperCase()}`,
        rentals: p.ownerName ? `Chủ tủ ${p.ownerName}` : "CLOOP Verified",
        rating: `${p.rating || "5.0"}★`,
        modelFit: p.modelFit || p.style || `Size ${p.size || "M"}`,
        description: p.description || `Món đồ tuyển chọn thực tế từ tủ đồ của ${p.ownerName || "thành viên CLOOP"}.`,
        occasion: p.occasion || "Dạo phố",
        isSale: isSale && !isRent
      };
    })
    .filter(Boolean) as FashionItem[];

  const safeList = formatted.length > 0 ? formatted : (REAL_DEFAULT_PRODUCTS as any);

  const minPerCol = 3;
  for (let c = 0; c < 5; c++) {
    for (let i = 0; i < minPerCol; i++) {
      const itemIdx = (c * minPerCol + i) % safeList.length;
      const baseItem = safeList[itemIdx];
      columns[c].push({
        ...baseItem,
        id: `${baseItem.id}-c${c}-i${i}`
      });
    }
  }

  return columns;
}

interface GoogleFlowFashionHeroProps {
  initialProducts?: any[];
}

export default function GoogleFlowFashionHero({ initialProducts }: GoogleFlowFashionHeroProps) {
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FashionItem | null>(null);
  const [heroProducts, setHeroProducts] = useState<any[]>(initialProducts && initialProducts.length > 0 ? initialProducts : []);

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setHeroProducts(initialProducts);
    } else {
      getShopProductsAction({ type: "all", limit: 32 })
        .then((res) => {
          if (res.success && res.products && res.products.length > 0) {
            setHeroProducts(res.products);
          }
        })
        .catch(() => {});
    }
  }, [initialProducts]);

  const mosaicColumns = useMemo(() => {
    return buildMosaicColumns(heroProducts);
  }, [heroProducts]);

  return (
    <>
      {/* 📱 1. GIAO DIỆN DI ĐỘNG NHẸ BÃNG */}
      <div className="md:hidden w-full bg-[#FAF8F5] px-4 pt-3 pb-3 space-y-3.5 border-b border-[#EBE6D8]">
        {/* Thanh tìm kiếm & Camera AI */}
        <div className="flex items-center gap-2">
          <Link
            href="/shop"
            className="flex-1 h-11 rounded-full bg-white border border-[#E0D9CE] px-4 flex items-center gap-2 text-stone-400 shadow-3xs hover:border-[#183A2D] transition-colors"
          >
            <Search size={16} className="text-[#183A2D]" />
            <span className="text-xs font-medium text-stone-500 truncate">
              Tìm áo, quần, váy đầm, áo dài...
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setIsVisualSearchOpen(true)}
            className="w-11 h-11 rounded-full bg-[#183A2D] text-white flex items-center justify-center shadow-md active:scale-95 transition-transform shrink-0"
            title="Tìm kiếm bằng ảnh AI"
          >
            <Camera size={18} />
          </button>
        </div>

        {/* Vòng tròn danh mục nổi bật */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 -mx-4 px-4">
          {[
            { label: "Áo", icon: "👚", link: "/shop?category=Áo" },
            { label: "Quần", icon: "👖", link: "/shop?category=Quần" },
            { label: "Chân Váy", icon: "👗", link: "/shop?category=Chân váy" },
            { label: "Đầm Tiệc", icon: "💃", link: "/shop?occasion=Tiệc cưới" },
            { label: "Áo Dài", icon: "🪡", link: "/shop?category=Áo dài & Cổ phục" },
            { label: "Dạo Phố", icon: "👟", link: "/shop?occasion=Dạo phố" },
          ].map((cat, idx) => (
            <Link
              key={idx}
              href={cat.link}
              className="flex flex-col items-center gap-1.5 shrink-0 group active:scale-95 transition-transform"
            >
              <div className="w-13 h-13 rounded-full bg-white border border-[#E5DFD5] shadow-3xs flex items-center justify-center text-xl group-hover:border-[#183A2D] transition-colors">
                <span>{cat.icon}</span>
              </div>
              <span className="text-[10px] font-bold text-stone-700 tracking-tight whitespace-nowrap">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Mini-Banner Matcha Lụa */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#183A2D] via-[#245240] to-[#183A2D] p-3.5 text-white shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="inline-block text-[8.5px] uppercase tracking-widest font-extrabold text-[#A3E39F] bg-white/10 px-2 py-0.5 rounded-full">
              Tuần Hoàn Tủ Đồ 2026
            </span>
            <h3 className="font-heading text-sm font-extrabold leading-tight text-white">
              Thuê Đồ Thiết Kế Từ 50k/ngày
            </h3>
            <Link
              href="/shop?type=rent"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#A3E39F] hover:text-white pt-0.5"
            >
              <span>Khám phá ngay</span>
              <ArrowRight size={12} />
            </Link>
          </div>
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl shrink-0">
            👚
          </div>
        </div>
      </div>

      {/* 💻 2. DESKTOP HERO EDITORIAL (DÀNH RIÊNG MÀN HÌNH MÁY TÍNH) */}
      <section 
        className="hidden md:flex relative z-0 isolate w-full min-h-[740px] lg:min-h-[800px] bg-[#071C12] overflow-hidden items-center justify-center select-none border-b border-[#0F3120]"
      >
      {/* 🖼️ WALL-TO-WALL LIVING PHOTO CANVAS: 6 Cột Ảnh Thật 100% Của Người Dùng Thực */}
      <div className="absolute inset-0 w-full h-full overflow-hidden grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 md:gap-3 p-2 sm:p-3 pointer-events-auto transform-gpu opacity-90 hover:opacity-100 transition-opacity duration-500">
        {mosaicColumns.map((column, colIdx) => {
          const isOdd = colIdx % 2 !== 0;
          return (
            <div
              key={colIdx}
              style={{
                animationDuration: `${22 + colIdx * 3}s`,
              }}
              className={`flex flex-col gap-2.5 md:gap-3 ${isOdd ? 'hero-col-odd' : 'hero-col-even'} ${colIdx === 5 ? 'hidden lg:flex' : ''} ${colIdx === 4 ? 'hidden md:flex' : ''}`}
            >
              {column.map((card) => (
                <div key={card.id} className="relative group">
                  
                  {/* PULSING NEON MATCHA GLOW HALO */}
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#A3E39F] via-white to-[#A3E39F] opacity-0 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none z-0" />

                  <div
                    onClick={() => setSelectedItem(card)}
                    className={`relative w-full ${card.aspect} rounded-2xl overflow-hidden bg-[#0A2215] border border-white/20 hover:border-[#A3E39F] shadow-lg hover:shadow-[0_0_30px_rgba(163,227,159,0.7)] hover:ring-2 hover:ring-white transition-all duration-300 hover:scale-105 hover:z-50 cursor-pointer block z-10`}
                  >
                    {/* Living Photo từ Cloudinary người dùng thật */}
                    <Image
                      src={card.img}
                      alt={card.title}
                      fill
                      sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 18vw"
                      className="object-cover transition-all duration-500 group-hover:scale-108 brightness-105 group-hover:brightness-125 opacity-90 group-hover:opacity-100"
                      unoptimized
                    />

                    {/* LUMINOUS GLASS SHIMMER OVERLAY */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#A3E39F]/30 via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none mix-blend-overlay" />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent pointer-events-none group-hover:opacity-50 transition-opacity" />

                    {/* Top Left: Tag Pill */}
                    <div className="absolute top-2 left-2 z-20">
                      <span className="text-[7.5px] uppercase font-bold tracking-wider bg-black/70 group-hover:bg-[#A3E39F] text-[#A3E39F] group-hover:text-[#07190F] group-hover:shadow-[0_0_15px_rgba(163,227,159,1)] px-2.5 py-0.5 rounded-full border border-white/18 group-hover:border-white font-ui shadow-xs transition-colors duration-200">
                        {card.tag}
                      </span>
                    </div>

                    {/* Top Right: Live Eco Impact Chip */}
                    <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="text-[7px] uppercase font-bold tracking-wider bg-[#0A2517]/95 text-[#A3E39F] px-2 py-0.5 rounded-full border border-[#A3E39F]/60 font-ui shadow-xs flex items-center gap-1">
                        <Leaf size={7} /> {card.eco}
                      </span>
                    </div>

                    {/* Bottom Info: Title, Price & Owner */}
                    <div className="absolute bottom-0 left-0 w-full p-2.5 text-white transform translate-y-0.5 group-hover:translate-y-0 transition-transform z-20">
                      <p className="text-[10px] sm:text-[11px] font-heading font-bold leading-tight line-clamp-1 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,1)] transition-all">
                        {card.title}
                      </p>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[9px] sm:text-[9.5px] text-[#A3E39F] group-hover:text-[#D4FFD0] font-mono font-bold group-hover:drop-shadow-[0_0_8px_rgba(163,227,159,1)] transition-all">
                          {card.price}
                        </p>
                        <span className="text-[8px] text-stone-300 font-ui opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-[90px]">
                          {card.rentals}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* 🍵 DEEP CENTER SPOTLIGHT MASK */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(7,24,15,0.92)_0%,_rgba(7,24,15,0.82)_35%,_rgba(7,24,15,0.35)_70%,_rgba(5,18,10,0.85)_100%)] pointer-events-none z-20" />

      {/* 🌟 CENTERPIECE CONTENT */}
      <div className="relative z-30 max-w-3xl mx-auto px-4 text-center flex flex-col items-center justify-center pointer-events-auto my-auto py-8">
        
        {/* Top Matcha Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#071F13]/85 border border-[#A3E39F]/50 text-[#A3E39F] text-[10.5px] font-bold uppercase tracking-widest mb-4 shadow-lg font-ui">
          <span className="w-2 h-2 rounded-full bg-[#A3E39F] animate-pulse"></span>
          Tủ Đồ Chia Sẻ & Tuần Hoàn 2026
        </div>

        {/* Big Bold Headline */}
        <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-[84px] font-extrabold text-white tracking-tight leading-none mb-3.5 drop-shadow-[0_4px_30px_rgba(0,0,0,0.95)]">
          CLOOP
        </h1>

        {/* Tagline */}
        <p className="font-body text-xs sm:text-sm md:text-[15px] text-stone-100 font-normal leading-relaxed max-w-lg mx-auto mb-6 drop-shadow-[0_2px_14px_rgba(0,0,0,0.9)]">
          Biến tủ đồ của bạn thành nguồn thu nhập. Đăng cho thuê, chuyển nhượng dễ dàng và trải nghiệm hàng nghìn mẫu thiết kế với giá cực hời.
        </p>

        {/* 2 Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
          <Link
            href="/shop?type=rent"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white text-[#0A2517] hover:bg-[#FAF7F0] font-heading font-extrabold text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 shadow-[0_6px_25px_rgba(255,255,255,0.35)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group font-ui"
          >
            <span>Khám Phá Tủ Đồ</span>
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          <button
            type="button"
            onClick={() => setIsVisualSearchOpen(true)}
            className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white/20 hover:bg-white/30 text-white border border-white/35 font-heading font-bold text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 shadow-md hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group font-ui cursor-pointer"
          >
            <Camera size={15} className="text-[#A3E39F] group-hover:scale-110 transition-transform" />
            <span>Tìm Bằng Ảnh AI</span>
          </button>
        </div>

      </div>

      {/* 👗 INSTANT FIT-CHECK & DIGITAL PASSPORT MODAL */}
      <AnimatePresence>
        {selectedItem && (
          <div 
            className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md overflow-y-auto p-4 sm:p-6 flex items-center justify-center animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedItem(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative border border-stone-200 my-auto text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors z-30 shadow-md cursor-pointer"
                title="Đóng"
              >
                <X size={16} />
              </button>

              {/* Photo & Badge */}
              <div className="relative h-48 sm:h-56 w-full bg-stone-900 shrink-0">
                <Image
                  src={selectedItem.img}
                  alt={selectedItem.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                
                <div className="absolute top-3.5 left-3.5 flex gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-ui border shadow-xs ${
                    selectedItem.isSale 
                      ? "bg-amber-600 text-white border-amber-400" 
                      : "bg-[#183A2D] text-[#A3E39F] border-[#A3E39F]/40"
                  }`}>
                    {selectedItem.tag}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-wider font-ui">
                    Hộ Chiếu {selectedItem.passport}
                  </span>
                </div>

                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <h3 className="font-heading text-lg sm:text-xl font-extrabold line-clamp-1">{selectedItem.title}</h3>
                  <p className="text-xs text-[#A3E39F] font-mono font-bold">{selectedItem.price} • {selectedItem.rentals}</p>
                </div>
              </div>

              {/* Specs & Digital Passport details */}
              <div className="p-5 sm:p-6 space-y-3.5 overflow-y-auto flex-1">
                
                {/* Fit Check Stats */}
                <div className="p-3 bg-[#F5F8F4] rounded-2xl border border-[#D5E5D2] space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#183A2D] font-ui flex items-center gap-1.5">
                      <ShieldCheck size={13} className="text-[#2A6E46]" /> Thông Số Fit Check Chuẩn
                    </span>
                    <span className="text-[11px] font-extrabold text-[#2A6E46] font-ui">{selectedItem.rating} (Đánh giá cao)</span>
                  </div>
                  <p className="text-xs text-stone-700 font-medium">{selectedItem.modelFit}</p>
                  <p className="text-[11px] text-stone-500 italic">Phù hợp: {selectedItem.occasion}</p>
                </div>

                {/* ESG Impact Bar */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                    <p className="text-[8.5px] uppercase font-bold text-stone-400 font-ui">Tác Động Sinh Thái</p>
                    <p className="text-xs font-extrabold text-[#183A2D] flex items-center gap-1 mt-0.5">
                      <Leaf size={12} className="text-emerald-600" /> Giảm {selectedItem.eco}
                    </p>
                  </div>
                  <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                    <p className="text-[8.5px] uppercase font-bold text-stone-400 font-ui">Vòng Đời Tuần Hoàn</p>
                    <p className="text-xs font-extrabold text-[#183A2D] flex items-center gap-1 mt-0.5">
                      <ShieldCheck size={12} className="text-emerald-600" /> {selectedItem.rentals}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-stone-600 leading-relaxed font-body line-clamp-3">
                  {selectedItem.description}
                </p>

                {/* Action CTA */}
                <div className="pt-2 flex items-center gap-3">
                  {(() => {
                    const realId = selectedItem.id.replace(/-c\d+-i\d+$/, '');
                    return (
                      <Link
                        href={`/product/${realId}`}
                        prefetch={true}
                        className="flex-1 py-3 rounded-full bg-[#0A2517] hover:bg-[#183A2D] text-white font-heading font-extrabold text-xs uppercase tracking-wider text-center transition-all shadow-md flex items-center justify-center gap-2 font-ui cursor-pointer"
                      >
                        <span>{selectedItem.isSale ? "Xem Chi Tiết & Mua Ngay" : "Xem Chi Tiết & Thuê Ngay"}</span>
                        <ArrowRight size={14} />
                      </Link>
                    );
                  })()}

                  <Link
                    href="/shop"
                    prefetch={true}
                    className="px-5 py-3 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-heading font-bold text-xs uppercase tracking-wider transition-all font-ui text-center cursor-pointer"
                  >
                    Xem Thêm
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
    </>
  );
}
