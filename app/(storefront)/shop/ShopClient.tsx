"use client";

import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Star, ArrowLeft, Search, SlidersHorizontal, Shirt, X, Flame, Loader2, Mic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import VoiceSearchModal from "@/app/components/VoiceSearchModal";

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600";

export interface Product { 
  id: string; 
  image: string; 
  type: string; 
  listingTypeRaw: string;
  title: string; 
  price: number;
  priceDisplay: string; 
  location: string; 
  rating: string; 
  condition: string; 
  storeRetailPrice: number; 
  occasion: string;
  ownerName?: string;
  userId: string;
  size?: string;
  material?: string;
  createdAt: string;
  isBoosted?: boolean;
}

function ProductCardImage({ src, alt }: { src: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState(src || PLACEHOLDER_IMG);

  useEffect(() => {
    setImgSrc(src || PLACEHOLDER_IMG);
  }, [src]);

  return (
    <Image 
      src={imgSrc} 
      alt={alt} 
      fill 
      unoptimized 
      onError={() => setImgSrc("/1.1.jpg")}
      className="object-cover object-top transition-transform duration-700 group-hover:scale-105" 
    />
  );
}

interface ShopClientProps {
  initialProducts: Product[];
  initialTotalCount: number;
  initialHasMore: boolean;
  initialType: string;
  initialOccasion: string;
  initialSize: string;
  initialMaterial: string;
  initialSearch: string;
}

export function ShopClient({
  initialProducts,
  initialTotalCount,
  initialHasMore,
  initialType,
  initialOccasion,
  initialSize,
  initialMaterial,
  initialSearch
}: ShopClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ⚡ URL IS SINGLE SOURCE OF TRUTH (Tự động đồng bộ với Browser Back / Forward)
  const urlType = searchParams.get("type") || initialType || "all";
  const urlOccasion = searchParams.get("occasion") || searchParams.get("category") || initialOccasion || "Tất cả";
  const urlSize = searchParams.get("size") || initialSize || "all";
  const urlMaterial = searchParams.get("material") || initialMaterial || "all";
  const urlSearch = searchParams.get("search") || searchParams.get("q") || initialSearch || "";

  // Local UI states
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isVoiceSearchOpen, setIsVoiceSearchOpen] = useState(false);

  // Pagination appended items (for "Xem thêm trang phục")
  const [appendedProducts, setAppendedProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);

  const occasionList = [
    "Tất cả",
    "Áo",
    "Quần",
    "Chân váy",
    "Đầm & Váy liền",
    "Set đồ & Bộ trang phục",
    "Áo khoác & Blazer",
    "Áo dài & Cổ phục",
    "Dạo phố",
    "Thể thao",
    "Dã ngoại",
    "Du lịch",
    "Lễ hội",
    "Tiệc cưới",
    "Sự kiện",
    "Sinh nhật",
    "Tốt nghiệp",
    "Chụp ảnh",
    "Concert",
    "Đi làm & Công sở",
    "Phụ kiện & Túi xách"
  ];

  // Reset pagination khi server filters thay đổi (initialProducts mới truyền từ Server)
  useEffect(() => {
    setAppendedProducts([]);
    setPage(1);
    setHasMore(initialHasMore);
  }, [initialProducts, initialHasMore]);

  // Đồng bộ ô search khi URL search thay đổi từ bên ngoài (như bấm nút Back/Forward)
  useEffect(() => {
    setSearchQuery(urlSearch);
  }, [urlSearch]);

  // Debounced search sync to URL (dùng searchParams của Next.js router)
  const isFirstSearchMount = useRef(true);
  useEffect(() => {
    if (isFirstSearchMount.current) {
      isFirstSearchMount.current = false;
      return;
    }

    const handler = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (searchQuery.trim()) {
          params.set("search", searchQuery.trim());
        } else {
          params.delete("search");
          params.delete("q");
        }
        params.delete("page");
        router.push(`/shop?${params.toString()}`, { scroll: false });
      });
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery, router, searchParams]);

  // Chuyển đổi qua lại giữa Tất cả / Thuê đồ / Mua sắm (Test 4)
  const handleTypeClick = (targetType: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (targetType === "all") {
        params.delete("type");
      } else {
        params.set("type", targetType);
      }
      params.delete("page");
      router.push(`/shop?${params.toString()}`, { scroll: false });
    });
  };

  // Filter handlers: Giữ nguyên các params khác và chỉ cập nhật param tương ứng
  const handleChipClick = (occName: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (occName === "Tất cả") {
        params.delete("occasion");
        params.delete("category");
      } else {
        params.set("occasion", occName);
        params.delete("category");
      }
      params.delete("page");
      router.push(`/shop?${params.toString()}`, { scroll: false });
    });
  };

  const handleSizeClick = (size: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      const newSize = urlSize === size ? "all" : size;
      if (newSize === "all") {
        params.delete("size");
      } else {
        params.set("size", newSize);
      }
      params.delete("page");
      router.push(`/shop?${params.toString()}`, { scroll: false });
    });
  };

  const handleMaterialClick = (material: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      const newMaterial = urlMaterial.toLowerCase() === material.toLowerCase() ? "all" : material;
      if (newMaterial === "all") {
        params.delete("material");
      } else {
        params.set("material", newMaterial);
      }
      params.delete("page");
      router.push(`/shop?${params.toString()}`, { scroll: false });
    });
  };

  // HTTP GET-based pagination for "Xem Thêm" (Khử trùng ID triệt để)
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(nextPage));
      params.set("limit", "24");

      const res = await fetch(`/api/products?${params.toString()}`, {
        signal: AbortSignal.timeout(8000)
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.products) && data.products.length > 0) {
        setAppendedProducts((prev) => {
          const existingIds = new Set([
            ...initialProducts.map((p) => p.id),
            ...prev.map((p) => p.id)
          ]);
          const uniqueNew = data.products.filter((p: Product) => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });
        setPage(nextPage);
        setHasMore(Boolean(data.hasMore));
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Load more failed:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // ⚡ DEDUPLICATE THEO ID: Tuyệt đối không bao giờ trùng lặp key React
  const displayProducts = useMemo(() => {
    const seen = new Set<string>();
    const list: Product[] = [];
    for (const item of [...initialProducts, ...appendedProducts]) {
      if (!item?.id || seen.has(item.id)) continue;
      seen.add(item.id);
      list.push(item);
    }
    return list;
  }, [initialProducts, appendedProducts]);

  const activeFilterCount = (urlSize !== "all" ? 1 : 0) + (urlMaterial !== "all" ? 1 : 0);

  return (
    <main className="min-h-screen bg-[#FAF8F3] text-[#183A2D] antialiased p-4 sm:p-6 md:p-10 font-sans selection:bg-[#183A2D] selection:text-white">
      <div className="max-w-[1400px] mx-auto space-y-6 sm:space-y-8">
        
        {/* Header Navigation */}
        <div className="flex justify-between items-center">
          <Link href="/" prefetch={true} className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-emerald-800 transition-colors">
            <ArrowLeft size={12} /> QUAY LẠI TRANG CHỦ
          </Link>
          <div className="flex items-center gap-2">
            {isPending && <Loader2 size={13} className="animate-spin text-emerald-700" />}
            <span className="bg-white border border-stone-200/80 text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full text-stone-600 shadow-2xs">
              CLOOP MARKETPLACE LIVE
            </span>
          </div>
        </div>

        {/* Title & Segmented Control */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="text-left space-y-1.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#183A2D] font-heading">
                {urlType === "rent" ? "Kho Trang Phục Thuê Đồ" : urlType === "sell" ? "Kệ Hàng Mua Sở Hữu Tuần Hoàn" : "Sàn Thời Trang Tuần Hoàn"}
              </h1>
              {isPending && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full animate-pulse">
                  <Loader2 size={11} className="animate-spin" /> Đang cập nhật...
                </span>
              )}
            </div>
            <p className="text-xs sm:text-[13px] font-medium text-stone-500 max-w-[800px] leading-relaxed">
              Kéo dài vòng đời trang phục, nâng niu phong cách và trải nghiệm hàng ngàn mẫu thiết kế với giá cực hời.
            </p>
          </div>

          {/* ⚡ SEGMENTED CONTROL: TẤT CẢ / THUÊ ĐỒ / MUA SỞ HỮU (Test 4) */}
          <div className="flex items-center gap-1 p-1 bg-stone-200/70 rounded-full font-ui shrink-0">
            {[
              { id: "all", label: "Tất cả" },
              { id: "rent", label: "Thuê đồ" },
              { id: "sell", label: "Mua sắm" },
            ].map((tab) => {
              const isActive = (urlType === tab.id) || (tab.id === "all" && (urlType === "all" || !urlType));
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTypeClick(tab.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer select-none ${
                    isActive
                      ? "bg-[#183A2D] text-white shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* TOOLBAR ĐIỀU KHIỂN: CHIPS & SEARCH */}
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 justify-between items-start lg:items-center bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-stone-200/80 shadow-2xs">
          
          {/* HORIZONTAL CHIP SCROLLER */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0 scroll-smooth w-full lg:flex-1">
            {occasionList.map((occ) => (
              <button
                key={occ}
                type="button"
                onClick={() => handleChipClick(occ)}
                className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer select-none font-ui ${
                  urlOccasion === occ 
                    ? "bg-[#183A2D] text-white shadow-xs" 
                    : "bg-stone-50 text-stone-600 hover:text-[#183A2D] hover:bg-stone-100 border border-stone-200/80"
                }`}
              >
                {occ}
              </button>
            ))}
          </div>

          {/* SEARCH & FILTERS */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto font-ui">
            <div className="flex items-center gap-2 border border-stone-200 bg-stone-50 rounded-full px-3.5 py-1.5 sm:py-2 w-full sm:w-[270px] focus-within:bg-white focus-within:border-[#183A2D] transition-colors">
              <Search size={14} className="text-stone-400 shrink-0" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên váy, áo hoặc chủ tủ..." 
                className="bg-transparent border-none outline-none text-xs w-full text-stone-800 placeholder:text-stone-400 font-medium"
              />
              {searchQuery ? (
                <button 
                  type="button"
                  onClick={() => setSearchQuery("")} 
                  className="text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  <X size={12} />
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={() => setIsVoiceSearchOpen(true)}
                  title="Tìm kiếm bằng giọng nói"
                  className="text-stone-400 hover:text-[#183A2D] transition-colors p-0.5 cursor-pointer"
                >
                  <Mic size={14} />
                </button>
              )}
            </div>

            <button 
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className="flex items-center gap-1.5 border border-[#183A2D] px-4 py-2 rounded-full text-xs font-bold bg-[#183A2D] text-white hover:bg-[#102a20] transition-colors shadow-2xs cursor-pointer"
            >
              <SlidersHorizontal size={13} /> 
              <span>Bộ lọc</span> 
              {activeFilterCount > 0 && (
                <span className="bg-emerald-400 text-[#183A2D] w-4 h-4 rounded-full flex items-center justify-center text-[9px] ml-0.5 font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

        </div>

        {/* LƯỚI GRID HIỂN THỊ TRANG PHỤC (SINGLE SOURCE OF TRUTH + SMOOTH TRANSITION) */}
        {displayProducts.length > 0 ? (
          <>
            <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 pt-2 transition-opacity duration-200 ${isPending ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
              {displayProducts.map((prod) => {
                const savedPercentage = prod.storeRetailPrice > prod.price 
                  ? Math.round(((prod.storeRetailPrice - prod.price) / prod.storeRetailPrice) * 100) 
                  : 0;

                return (
                  <div 
                    key={prod.id} 
                    className="block group relative"
                  >
                    <div className={`bg-white rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300 flex flex-col justify-between h-full text-left ${prod.isBoosted ? "border-2 border-[#183A2D] shadow-md hover:shadow-xl hover:-translate-y-1" : "border border-stone-200/80 shadow-2xs hover:shadow-lg hover:-translate-y-0.5"}`}>
                      
                      {/* KHU VỰC KHUNG ẢNH LOOKBOOK */}
                      <Link href={`/product/${prod.id}`} prefetch={true} className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden block z-10">
                        <ProductCardImage 
                          src={prod.image} 
                          alt={prod.title} 
                        />
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-20">
                          <span className={`text-[8.5px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md text-white shadow-xs font-ui ${prod.listingTypeRaw === "RENT" ? "bg-[#183A2D]" : "bg-amber-800"}`}>
                            {prod.listingTypeRaw === "RENT" ? "THUÊ ĐỒ" : "MUA SỞ HỮU"}
                          </span>
                          <div className="flex gap-1">
                            <span className="text-[8px] font-bold bg-white/95 backdrop-blur-xs text-stone-700 px-2 py-0.5 rounded shadow-2xs font-ui border border-stone-200/60">
                              {prod.condition}
                            </span>
                            {prod.isBoosted && (
                              <span className="text-[8px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded shadow-2xs flex items-center gap-0.5 border border-rose-200 font-ui">
                                <Flame size={9} className="text-rose-500" /> ĐỀ XUẤT
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="absolute bottom-2.5 right-2.5 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-full text-[10px] font-bold text-[#183A2D] flex items-center gap-0.5 shadow-2xs z-20 font-mono">
                          <Star size={10} className="fill-amber-400 stroke-none" /> {prod.rating}
                        </div>
                      </Link>

                      {/* KHU VỰC CHÂN CARD */}
                      <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between space-y-3 relative z-10">
                        
                        <div className="space-y-1">
                          <div className="text-[#183A2D] font-bold truncate font-heading text-xs sm:text-sm hover:text-emerald-700 transition-colors w-fit">
                             <Link href={`/closet/${prod.userId}`} prefetch={true}>@{prod.ownerName}</Link>
                          </div>
                          
                          <div className="flex justify-between items-start gap-1">
                            <h4 className="text-xs sm:text-[13px] font-bold line-clamp-1 text-stone-800 transition-colors uppercase tracking-wide leading-tight group-hover:text-[#183A2D]">
                              <Link href={`/product/${prod.id}`} prefetch={true}>{prod.title}</Link>
                            </h4>
                            <span className="text-[8px] font-semibold text-stone-500 border border-stone-200 px-1 py-[1px] rounded shrink-0 font-ui">
                              {prod.occasion}
                            </span>
                          </div>
                          
                          {prod.storeRetailPrice > 0 && (
                            <p className="text-[10px] font-medium text-stone-400 line-through">
                              Giá gốc: {Math.round(prod.storeRetailPrice).toLocaleString("vi-VN")}₫
                            </p>
                          )}
                        </div>

                        <div className="flex justify-between items-end pt-1">
                          <div>
                            <span className="text-[8.5px] font-bold text-stone-400 uppercase tracking-wider block font-ui">Giá Tuần Hoàn</span>
                            <div className="text-xs sm:text-sm font-mono font-black text-[#0A2517]">{prod.priceDisplay}</div>
                          </div>
                          
                          {savedPercentage > 0 && (
                            <span className="text-[8.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded uppercase tracking-wider font-ui">
                              Tiết kiệm {savedPercentage}%
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[10px] text-stone-400 border-t border-stone-100 pt-2 font-semibold uppercase tracking-wider font-ui">
                          <MapPin size={10} className="text-emerald-700 shrink-0" /> 
                          <span className="font-medium text-stone-600 truncate">{prod.location}</span>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-10 mb-8">
                <button 
                  type="button"
                  onClick={handleLoadMore} 
                  disabled={loadingMore || isPending}
                  className="px-8 py-3 bg-[#183A2D] text-white font-heading font-extrabold uppercase tracking-widest text-xs rounded-full hover:bg-[#0a2517] transition-all disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {loadingMore ? "Đang tải thêm..." : "Xem Thêm Trang Phục"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="border border-stone-200/80 bg-white rounded-3xl p-10 text-center shadow-2xs max-w-lg mx-auto mt-6 space-y-4">
            <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-800">
              <Shirt size={24} />
            </div>
            <h3 className="text-base font-bold text-[#0A2517] font-heading">
              Tủ đồ phong cách này đang chờ bạn khai phá!
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
              Hiện tại chưa có trang phục nào thuộc phân loại này. Bạn hãy là người đầu tiên đăng tải chiếc váy của mình lên sàn nhé!
            </p>
            <div className="pt-2">
              <Link
                href="/my-closet/create"
                prefetch={true}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#183A2D] hover:bg-[#0A2517] text-white font-heading font-bold rounded-full text-xs uppercase tracking-wider transition-all shadow-sm"
              >
                Đăng Món Đồ Đầu Tiên &rarr;
              </Link>
            </div>
          </div>
        )}

      </div>

      {/* OFF-CANVAS DRAWER CHO BỘ LỌC */}
      <AnimatePresence>
        {isFilterOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-40"
            />
            
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 w-[85%] max-w-[380px] h-full bg-white shadow-2xl z-50 flex flex-col font-ui"
            >
              <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-[#FAF8F3]">
                <h3 className="font-heading text-lg font-bold text-[#183A2D]">Bộ Lọc Nâng Cao</h3>
                <button 
                  type="button"
                  onClick={() => setIsFilterOpen(false)} 
                  className="p-1.5 hover:bg-stone-200 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} className="text-stone-600" />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                {/* Kích cỡ */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Kích cỡ</h4>
                  <div className="flex flex-wrap gap-2">
                    {["S", "M", "L", "FreeSize"].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleSizeClick(size)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          urlSize === size 
                            ? "bg-[#183A2D] text-white border-[#183A2D] shadow-xs" 
                            : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chất liệu vải */}
                <div className="space-y-3 pt-2 border-t border-stone-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Chất liệu</h4>
                  <div className="flex flex-wrap gap-2">
                    {["Lụa", "Cotton", "Dạ / Tweed", "Ren", "Linen", "Da", "Voan"].map((mat) => (
                      <button
                        key={mat}
                        type="button"
                        onClick={() => handleMaterialClick(mat)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          urlMaterial.toLowerCase().includes(mat.toLowerCase())
                            ? "bg-[#183A2D] text-white border-[#183A2D] shadow-xs" 
                            : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                        }`}
                      >
                        {mat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-stone-100 flex gap-3 bg-white">
                <button 
                  type="button"
                  onClick={() => {
                    startTransition(() => {
                      const params = new URLSearchParams(searchParams.toString());
                      params.delete("size");
                      params.delete("material");
                      params.delete("page");
                      router.push(`/shop?${params.toString()}`, { scroll: false });
                    });
                    setIsFilterOpen(false);
                  }}
                  className="flex-1 py-2.5 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-full uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Xóa bộ lọc
                </button>
                <button 
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-[#183A2D] hover:bg-[#102a20] rounded-full uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                >
                  Áp dụng
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL TÌM KIẾM BẰNG GIỌNG NÓI */}
      <VoiceSearchModal
        isOpen={isVoiceSearchOpen}
        onClose={() => setIsVoiceSearchOpen(false)}
        onTranscript={(text) => {
          setSearchQuery(text);
        }}
      />
    </main>
  );
}
