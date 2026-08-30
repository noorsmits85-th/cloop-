"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Star, Filter, ArrowUpDown, ArrowLeft, Search, SlidersHorizontal, Shirt, X, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "@/lib/supabase";
import { getShopProductsAction } from "@/app/actions/product";

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600";

interface Product { 
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
  ownerName?: string; // 🟢 NÂNG CẤP: Khai báo thêm trường lưu trữ tên chủ đồ
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
      className="object-cover object-top transition-transform duration-1000 group-hover:scale-[1.07]" 
    />
  );
}

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 🎛️ a) Nhận diện phân luồng trực tiếp từ URL bar (?type, ?occasion, ?category, ?size, ?material)
  const urlType = searchParams.get("type") || "all";
  const urlOccasion = searchParams.get("occasion");
  const urlCategory = searchParams.get("category");
  const urlSize = searchParams.get("size") || "all";
  const urlMaterial = searchParams.get("material") || "all";

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedSize, setSelectedSize] = useState(urlSize);
  const [selectedMaterial, setSelectedMaterial] = useState(urlMaterial);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showAllMaterials, setShowAllMaterials] = useState(false);

  // 🎛️ b) Khởi tạo state lọc dịp linh hoạt theo URL bar thay vì ép cứng "Tất cả"
  const [selectedOccasion, setSelectedOccasion] = useState(urlOccasion || urlCategory || "Tất cả");

  // 🎛️ c) Cập nhật mở rộng danh sách chip lọc khớp chuẩn khép kín với 8 dịp trên trang chủ và form
  const occasionList = ["Tất cả", "Tiệc cưới", "Dạ hội", "Dạo phố", "Áo dài", "Đi biển", "Kỷ yếu", "Lễ hội", "Công sở", "Upcycle", "Vintage"];

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [renderError, setRenderError] = useState<Error | null>(null);

  // Ném lỗi vào Error Boundary (error.tsx) để hiển thị UI thân thiện nếu có lỗi nghiêm trọng lúc fetching
  if (renderError) {
    throw renderError;
  }

  // Debounce tìm kiếm để không spam DB
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // ⚡ ĐỒNG BỘ HÓA NGƯỢC: Tự động nhảy chip sáng đèn nếu URL thay đổi thời gian thực
  useEffect(() => {
    if (urlOccasion) {
      setSelectedOccasion(urlOccasion);
    } else if (urlCategory) {
      setSelectedOccasion(urlCategory);
    } else {
      setSelectedOccasion("Tất cả");
    }
  }, [urlOccasion, urlCategory]);

  const [page, setPage] = useState(1);
  const isFetchingRef = useRef(false);

  // 📡 ĐẦU NỐI MẠCH REAL-TIME TỐI ƯU HOÁ: Server Action + Backend Prisma Filtering
  const loadShopData = async (isLoadMore: boolean = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const targetPage = isLoadMore ? page + 1 : 1;

      const res = await getShopProductsAction({
        type: urlType,
        category: urlCategory,
        occasion: selectedOccasion !== "Tất cả" ? selectedOccasion : undefined,
        search: debouncedSearch.trim() || undefined,
        size: selectedSize !== "all" ? selectedSize : undefined,
        material: selectedMaterial !== "all" ? selectedMaterial : undefined,
        page: targetPage,
        limit: 16
      });

      if (res.success && res.products) {
        if (isLoadMore) {
          setProducts((prev) => [...prev, ...(res.products as any)]);
          setPage(targetPage);
        } else {
          setProducts(res.products as any);
          setPage(1);
        }
        setHasMore(Boolean(res.hasMore));
      } else {
        if (!isLoadMore) setProducts([]);
        setHasMore(false);
      }
    } catch (err: any) {
      console.error("❌ Lỗi vận hành dòng chảy dữ liệu sàn /shop:", err?.message || err);
      if (!isLoadMore) setProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    loadShopData(false);
  }, [urlType, selectedOccasion, selectedSize, selectedMaterial, debouncedSearch]);

  const handleChipClick = (occName: string) => {
    setSelectedOccasion(occName);
    const params = new URLSearchParams(window.location.search);
    if (occName === "Tất cả") {
      params.delete("occasion");
    } else {
      params.set("occasion", occName);
    }
    router.push(`/shop?${params.toString()}`);
  };

  const handleSizeClick = (size: string) => {
    const newSize = selectedSize === size ? "all" : size;
    setSelectedSize(newSize);
    const params = new URLSearchParams(window.location.search);
    if (newSize === "all") {
      params.delete("size");
    } else {
      params.set("size", newSize);
    }
    router.push(`/shop?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-[#FAF8F3] text-[#183A2D] antialiased p-6 md:p-12 font-sans selection:bg-[#183A2D] selection:text-white">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        <div className="flex justify-between items-center">
          <Link href="/" className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-green-800 transition-colors">
            <ArrowLeft size={12} /> QUAY LẠI TRANG CHỦ
          </Link>
          <span className="bg-white border text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full text-stone-500 shadow-sm">
            CLOOP MARKETPLACE LIVE
          </span>
        </div>

        <div className="text-left space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#183A2D] font-heading">
            {urlType === "rent" ? "Kho Trang Phục Thuê Đồ" : urlType === "sell" ? "Kệ Hàng Mua Sắm Tuần Hoàn" : "Sàn Thời Trang Tuần Hoàn"}
          </h1>
          <p className="text-[13px] font-medium text-stone-500 max-w-[800px] leading-relaxed font-sans">
            Kéo dài vòng đời sản phẩm, kiến tạo giải pháp tiết kiệm tối đa tài chính cho ví tiền sinh viên và bảo vệ môi trường xanh bền vững.
          </p>
        </div>

        {/* TOOLBAR ĐIỀU KHIỂN CẤU TRÚC CHIP MỚI CUỘN NGANG */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white p-4 rounded-3xl border border-[#E9E2D8] shadow-sm">
          
          {/* DÃY CHIP CUỘN NGANG CHỌN PHONG CÁCH / DANH MỤC */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 lg:pb-0 scroll-smooth w-full lg:flex-1">
            {occasionList.map(occ => (
              <button
                key={occ}
                onClick={() => handleChipClick(occ)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer select-none font-sans ${
                  selectedOccasion === occ 
                    ? "bg-[#183A2D] text-white shadow" 
                    : "bg-stone-50 text-gray-500 hover:text-[#183A2D] border border-stone-200"
                }`}
              >
                {occ}
              </button>
            ))}
          </div>

          {/* Ô TÌM KIẾM TEXT ĐỘNG CHUẨN JSX */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto font-sans">
            <div className="flex items-center gap-2 border border-stone-200 bg-stone-50 rounded-full px-4 py-2 w-full sm:w-[280px] focus-within:bg-white focus-within:border-[#183A2D] transition-colors shadow-inner">
              <Search size={14} className="text-gray-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên váy, áo hoặc chủ tủ đồ..." 
                className="bg-transparent border-none outline-none text-xs w-full text-gray-700 placeholder:text-gray-400 font-medium"
              />
            </div>

            <button 
              onClick={() => setIsFilterOpen(true)}
              className="flex items-center gap-1.5 border border-[#183A2D] px-4 py-2 rounded-full text-xs font-bold bg-[#183A2D] text-white hover:bg-[#102a20] transition shadow-sm"
            >
              <SlidersHorizontal size={13} /> Bộ lọc nâng cao {(selectedSize !== "all") && <span className="bg-emerald-400 text-[#183A2D] w-4 h-4 rounded-full flex items-center justify-center text-[10px] ml-1">!</span>}
            </button>
            <button className="flex items-center gap-1.5 border px-4 py-2 rounded-full text-xs font-bold bg-white hover:bg-stone-50 transition shadow-sm text-stone-600">
              <ArrowUpDown size={13} /> Sắp xếp
            </button>
          </div>

        </div>

        {/* LƯỚI GRID HIỂN THỊ TRANG PHỤC */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 pt-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <div key={n} className="border border-[#E9E2D8] bg-white rounded-[2.5rem] overflow-hidden flex flex-col h-full">
                <div className="w-full aspect-[3/4] bg-stone-200/70 animate-pulse relative">
                  <div className="absolute top-4 left-4 w-16 h-6 bg-stone-300/80 rounded-md animate-pulse"></div>
                  <div className="absolute top-12 left-4 w-12 h-4 bg-white/50 rounded animate-pulse"></div>
                </div>
                <div className="p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="w-1/3 h-3 bg-stone-200 animate-pulse rounded"></div>
                    <div className="w-3/4 h-4 bg-stone-300 animate-pulse rounded"></div>
                  </div>
                  <div className="flex justify-between items-end mt-4">
                    <div className="space-y-1">
                      <div className="w-20 h-2 bg-stone-200 animate-pulse rounded block"></div>
                      <div className="w-16 h-4 bg-stone-300 animate-pulse rounded block"></div>
                    </div>
                  </div>
                  <div className="w-1/2 h-2.5 bg-stone-200 animate-pulse rounded mt-2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
          <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 pt-4">
            <AnimatePresence>
            {products.map((prod) => {
              const savedPercentage = prod.storeRetailPrice > prod.price 
                ? Math.round(((prod.storeRetailPrice - prod.price) / prod.storeRetailPrice) * 100) 
                : 0;

              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  key={prod.id} 
                  className="block group relative"
                >
                  <div className={`bg-white rounded-[2.5rem] overflow-hidden transition-all duration-500 flex flex-col justify-between h-full text-left font-sans ${prod.isBoosted ? "border-2 border-[#183A2D] shadow-[0_0_20px_rgba(24,58,45,0.15)] hover:shadow-[0_0_30px_rgba(24,58,45,0.3)] hover:-translate-y-2 relative" : "border border-[#E9E2D8] shadow-sm hover:shadow-xl hover:-translate-y-1"}`}>
                    
                    {prod.isBoosted && (
                      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-200 to-emerald-50 rounded-[2.5rem] blur opacity-30 z-0"></div>
                    )}
                    
                    {/* KHU VỰC KHUNG ẢNH LOOKBOOK */}
                    <Link href={`/product/${prod.id}`} className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden block z-10">
                      <ProductCardImage 
                        src={prod.image} 
                        alt={prod.title} 
                      />
                      <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                        <span className={`text-[8.5px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md text-white shadow-sm transition-colors ${prod.listingTypeRaw === "RENT" ? "bg-[#183A2D]" : "bg-amber-700"}`}>
                          {prod.listingTypeRaw === "RENT" ? "THUÊ ĐỒ" : "MUA SẮM"}
                        </span>
                        <div className="flex gap-1.5">
                          <span className="text-[8px] font-bold bg-white/95 backdrop-blur-sm text-stone-700 px-2.5 py-1 rounded shadow-sm w-fit border border-stone-100">
                            {prod.condition}
                          </span>
                          {prod.isBoosted && (
                            <span className="text-[8px] font-bold bg-rose-100/95 backdrop-blur-sm text-rose-800 px-2.5 py-1 rounded shadow-sm w-fit flex items-center gap-1 border border-rose-300">
                              <Flame size={9} className="text-rose-600" /> ĐỀ XUẤT
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#183A2D] flex items-center gap-0.5 shadow-sm">
                        <Star size={10} className="fill-amber-400 stroke-none" /> {prod.rating}
                      </div>
                    </Link>

                    {/* KHU VỰC CHÂN CARD */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4 relative z-10">
                      
                      <div className="space-y-1">
                        {/* 🟢 NÂNG CẤP 1: Bố trí tên Tác Giả (Owner Name) lên vị trí trang trọng có gắn Link tủ đồ cá nhân */}
                        <div className="text-[#183A2D] font-bold truncate font-heading text-sm mb-1.5 hover:text-stone-500 transition-colors w-fit">
                           <Link href={`/closet/${prod.userId}`}>@{prod.ownerName}</Link>
                        </div>
                        
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="text-xs font-bold line-clamp-1 text-stone-800 transition-colors uppercase tracking-wide leading-tight group-hover:text-[#183A2D]">
                            <Link href={`/product/${prod.id}`}>{prod.title}</Link>
                          </h4>
                          <span className="text-[8px] font-semibold text-stone-400 border border-stone-200 px-1 py-[1px] rounded shrink-0">
                            {prod.occasion}
                          </span>
                        </div>
                        
                        {prod.storeRetailPrice > 0 && (
                          <p className="text-[10px] font-medium text-stone-400 line-through mt-1">
                            Giá mua mới: {Math.round(prod.storeRetailPrice).toLocaleString()}đ
                          </p>
                        )}
                      </div>

                      <div className="flex justify-between items-end">
                        <div>
                          <span className="text-[8.5px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Giá CLOOP Tuần Hoàn</span>
                          <div className="text-[13px] font-mono font-black text-stone-900">{prod.priceDisplay}</div>
                        </div>
                        
                        {savedPercentage > 0 && (
                          <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Tiết kiệm {savedPercentage}%
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-gray-400 border-t border-stone-50 pt-2.5 font-semibold uppercase tracking-wider">
                        <MapPin size={10} className="text-[#6BA37A]" /> 
                        <span className="font-medium text-stone-600">{prod.location}</span>
                      </div>
                    </div>

                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
          </motion.div>
          {hasMore && (
            <div className="flex justify-center mt-12 mb-8">
              <button 
                onClick={() => loadShopData(true)} 
                disabled={loadingMore}
                className="px-8 py-3 bg-[#183A2D] text-white font-bold uppercase tracking-widest text-xs rounded-full hover:bg-[#0a2517] transition-all disabled:opacity-50"
              >
                {loadingMore ? "Đang tải thêm..." : "Tải thêm sản phẩm"}
              </button>
            </div>
          )}
          </>
        ) : (
          <div className="border border-stone-200/60 bg-white rounded-[2.5rem] p-12 text-center shadow-sm max-w-xl mx-auto mt-8 font-sans space-y-4">
            <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-800 shadow-inner">
              <Shirt size={24} />
            </div>
            <h3 className="text-base font-bold text-stone-800 uppercase tracking-wide">
              Tủ đồ phong cách này đang chờ bạn khai phá!
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
              Hiện tại chưa có trang phục nào thuộc phân loại này. Bạn hãy là người đầu tiên đăng tải chiếc váy của mình lên sàn nhé!
            </p>
            <div className="pt-2">
              <Link
                href="/my-closet/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#183A2D] hover:bg-[#0A2517] text-white font-bold rounded-full text-xs uppercase tracking-wider transition-all font-ui shadow-md"
              >
                Đăng Món Đồ Đầu Tiên &rarr;
              </Link>
            </div>
          </div>
        )}

      </div>

      {/* OFF-CANVAS DRAWER CHO BỘ LỌC NÂNG CAO */}
      <AnimatePresence>
        {isFilterOpen && (
          <>
            {/* Backdrop Mờ */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40"
            />
            
            {/* Drawer */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 w-[90%] md:w-[400px] h-full bg-white shadow-2xl z-50 flex flex-col font-sans"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-[#FAF8F3]">
                <h3 className="font-heading text-xl font-bold text-[#183A2D]">Bộ Lọc Nâng Cao</h3>
                <button onClick={() => setIsFilterOpen(false)} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
                  <X size={20} className="text-stone-600" />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-8">
                {/* Visual Pills: Size */}
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-stone-500">Kích cỡ</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["S", "M", "L", "FreeSize"].map(size => {
                      const count = products.filter(p => p.size === size).length;
                      return (
                        <button
                          key={size}
                          onClick={() => handleSizeClick(size)}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                            selectedSize === size 
                              ? "bg-[#183A2D] text-white border-[#183A2D] shadow-md" 
                              : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                          }`}
                        >
                          {size} <span className="opacity-60 text-[10px] ml-1 font-mono">({count})</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

              </div>

              {/* Sticky Footer Buttons */}
              <div className="p-6 border-t border-stone-100 flex gap-3 bg-white">
                <button 
                  onClick={() => {
                    setSelectedSize("all");
                    router.push('/shop' + (urlType ? `?type=${urlType}` : ''));
                  }}
                  className="flex-1 py-3 text-sm font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg uppercase tracking-wider transition-colors"
                >
                  Xóa bộ lọc
                </button>
                <button 
                  onClick={() => setIsFilterOpen(false)}
                  className="flex-[2] py-3 text-sm font-bold text-white bg-[#183A2D] hover:bg-[#102a20] rounded-lg uppercase tracking-wider transition-colors shadow-lg"
                >
                  Hiển thị {filteredProducts.length} kết quả
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

    </main>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF8F3] flex items-center justify-center text-xs font-bold uppercase tracking-widest text-stone-400">Loading CLOOP Core Marketplace...</div>}>
      <ShopContent />
    </Suspense>
  );
}
