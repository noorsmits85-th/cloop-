"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
// Đã bảo chứng import đầy đủ tất cả icon hệ thống chống lỗi ts(2304)
import { MapPin, Star, Filter, ArrowUpDown, ArrowLeft, Search, SlidersHorizontal, Shirt, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "@/lib/supabase";

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
}

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 🎛️ a) Nhận diện phân luồng trực tiếp từ URL bar (?type và ?occasion mới)
  const urlType = searchParams.get("type") || "all";
  const urlOccasion = searchParams.get("occasion");
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
  const [selectedOccasion, setSelectedOccasion] = useState(urlOccasion || "Tất cả");

  // 🎛️ c) Cập nhật mở rộng danh sách chip lọc khớp chuẩn khép kín với 8 dịp trên trang chủ và form
  const occasionList = ["Tất cả", "Tiệc cưới", "Dạ hội", "Dạo phố", "Áo dài", "Đi biển", "Kỷ yếu", "Lễ hội", "Công sở"];

  // ⚡ ĐỒNG BỘ HÓA NGƯỢC: Tự động nhảy chip sáng đèn nếu URL thay đổi thời gian thực
  useEffect(() => {
    if (urlOccasion) {
      setSelectedOccasion(urlOccasion);
    } else {
      setSelectedOccasion("Tất cả");
    }
  }, [urlOccasion]);

  // 📡 ĐẦU NỐI MẠCH REAL-TIME: Truy xuất Supabase sắp xếp đồ mới lên đầu Feed
  useEffect(() => {
    async function fetchShopProducts() {
      try {
        setLoading(true);

        // Đảm bảo đồ vừa đăng nổ lên vị trí đầu tiên ngay lập tức bằng cách sort theo ngày tạo
        let response = await supabase
          .from("products")
          .select("*, ProductImage(*), Listing(*)")
          .order("createdAt", { ascending: false });

        if (response.error) {
          response = await supabase
            .from("products")
            .select("*, images(*), listings(*)")
            .order("createdAt", { ascending: false });
        }

        if (response.error) {
          response = await supabase
            .from("products")
            .select("*")
            .order("id", { ascending: false });
        }

        const { data, error } = response;
        if (error) throw error;

        if (data) {
          // 🟢 NÂNG CẤP XỬ LÝ: Quét chéo bảng `User` và `users` để kéo đúng tên Tác giả
          const productUserIds = [...new Set(data.map((item: any) => item.userId || item.user_id).filter(Boolean))];
          let usersDataForProducts: any[] = [];
          
          if (productUserIds.length > 0) {
            const [res1, res2] = await Promise.all([
              supabase.from("User").select("id, name").in("id", productUserIds),
              supabase.from("users").select("id, name").in("id", productUserIds)
            ]);
            usersDataForProducts = [...(res1.data || []), ...(res2.data || [])];
          }

          const mapped: Product[] = [];

          data.forEach((item: any) => {
            const listingsArr = item.Listing || item.listings || [];
            const imagesArr = item.ProductImage || item.images || [];

            // Chỉ lấy các gói giá ở trạng thái AVAILABLE (Bỏ qua các sản phẩm đã tạm ẩn)
            const rentListing = listingsArr.find((l: any) => l.listingType === "RENT" && l.status === "AVAILABLE");
            const sellListing = listingsArr.find((l: any) => (l.listingType === "SELL" || l.listingType === "SALE") && l.status === "AVAILABLE");

            const rentPrice = rentListing ? Number(rentListing.basePrice) : 0;
            const sellPrice = sellListing ? Number(sellListing.basePrice) : 0;

            let currentImage = PLACEHOLDER_IMG;
            if (imagesArr && imagesArr.length > 0) {
              currentImage = imagesArr[0].url || imagesArr[0] || currentImage;
            } else if (item.image_url || item.imageUrl) {
              currentImage = item.image_url || item.imageUrl;
            }

            const storeRetailPrice = item.original_price || item.originalPrice || 500000;

            // 🟢 TÌM VÀ GẮN TÊN CHỦ ĐỒ
            const uId = item.userId || item.user_id;
            const matchedUser = usersDataForProducts.find((u: any) => u.id === uId);
            const ownerName = matchedUser?.name || item.owner_name || item.ownerName || "Thành viên CLOOP";

            // 🟢 MOCK DỮ LIỆU BỘ LỌC 2027
            const sizes = ["S", "M", "L", "FreeSize"];
            const randomSize = sizes[Math.floor(Math.random() * sizes.length)];
            const materials = ["Lụa", "Cotton", "Denim", "Linen", "Voan", "Gấm", "Taffeta", "Nỉ", "Vải dù", "Da", "Ren"];
            const randomMaterial = materials[Math.floor(Math.random() * materials.length)];

            // d) ĐỐI SOÁT TRƯỜNG OCCASION: Đồng bộ cấu trúc dữ liệu ở cả 3 nhánh đẩy đồ lên sàn
            if (urlType === "rent" && rentPrice > 0) {
              mapped.push({
                id: item.id,
                image: currentImage,
                type: "Thuê",
                listingTypeRaw: "RENT",
                title: item.title || item.name || "Trang phục CLOOP",
                price: rentPrice,
                priceDisplay: `${rentPrice.toLocaleString()}đ / ngày`,
                location: item.province || "Nghệ An", 
                rating: "5.0",            
                condition: item.condition === "GOOD" ? "Mới 95%" : "Mới 98%",
                storeRetailPrice,
                occasion: item.occasion || "Khác",
                ownerName: ownerName, // 🟢 Đẩy vào Object
                userId: uId || "anonymous",
                size: item.size || randomSize,
                material: item.material || randomMaterial
              });
            } else if (urlType === "sell" && sellPrice > 0) {
              mapped.push({
                id: item.id,
                image: currentImage,
                type: "Mua sắm",
                listingTypeRaw: "SELL",
                title: item.title || item.name || "Trang phục CLOOP",
                price: sellPrice,
                priceDisplay: `${sellPrice.toLocaleString()}đ`,
                location: item.province || "Nghệ An", 
                rating: "5.0",            
                condition: item.condition === "GOOD" ? "Mới 95%" : "Mới 98%",
                storeRetailPrice,
                occasion: item.occasion || "Khác",
                ownerName: ownerName, // 🟢 Đẩy vào Object
                userId: uId || "anonymous",
                size: item.size || randomSize,
                material: item.material || randomMaterial
              });
            } else if (urlType === "all") {
              const hasRent = rentPrice > 0;
              const displayPrice = hasRent ? rentPrice : sellPrice;
              
              if (rentPrice > 0 || sellPrice > 0) {
                mapped.push({
                  id: item.id,
                  image: currentImage,
                  type: hasRent ? "Thuê" : "Mua sắm",
                  listingTypeRaw: hasRent ? "RENT" : "SELL",
                  title: item.title || item.name || "Trang phục CLOOP",
                  price: displayPrice,
                  priceDisplay: hasRent ? `${displayPrice.toLocaleString()}đ / ngày` : `${displayPrice.toLocaleString()}đ`,
                  location: item.province || "Nghệ An", 
                  rating: "5.0",            
                  condition: item.condition === "GOOD" ? "Mới 95%" : "Mới 98%",
                  storeRetailPrice,
                  occasion: item.occasion || "Khác",
                  ownerName: ownerName, // 🟢 Đẩy vào Object
                  userId: uId || "anonymous",
                  size: item.size || randomSize,
                  material: item.material || randomMaterial
                });
              }
            }
          });

          setProducts(mapped);
        }
      } catch (err) {
        console.error("❌ Lỗi vận hành dòng chảy dữ liệu sàn /shop:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchShopProducts();
  }, [urlType]);

  // MOCK DỮ LIỆU DANH MỤC
  const filterChips = ["Tất cả", "Tiệc cưới", "Dạ hội", "Dạo phố", "Áo dài", "Đi biển", "Kỷ yếu", "Áo", "Quần", "Váy", "Giày Dép", "Phụ Kiện"];

  // 🎛️ e) BỘ LỌC ĐA NHIỆM
  useEffect(() => {
    let result = [...products];

    if (selectedOccasion !== "Tất cả") {
      result = result.filter(p => 
        (p.occasion && p.occasion.includes(selectedOccasion)) || 
        (p.title && p.title.toLowerCase().includes(selectedOccasion.toLowerCase()))
      );
    }
    
    if (selectedSize !== "all") {
      result = result.filter(p => p.size === selectedSize);
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.location.toLowerCase().includes(q) ||
        (p.ownerName && p.ownerName.toLowerCase().includes(q))
      );
    }

    setFilteredProducts(result);
  }, [searchQuery, selectedOccasion, selectedSize, products]);

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
            {filterChips.map(occ => (
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-6">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="w-full aspect-[3/4] bg-stone-200/50 rounded-[2rem] animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 pt-4">
            <AnimatePresence>
            {filteredProducts.map((prod) => {
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
                  <div className="border border-[#E9E2D8] bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full text-left font-sans">
                    
                    {/* KHU VỰC KHUNG ẢNH LOOKBOOK */}
                    <Link href={`/product/${prod.id}`} className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden block">
                      <Image 
                        src={prod.image} 
                        alt={prod.title} 
                        fill 
                        unoptimized 
                        className="object-cover object-top transition-transform duration-700 group-hover:scale-105" 
                      />
                      <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                        <span className={`text-[8.5px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md text-white shadow-sm transition-colors ${prod.listingTypeRaw === "RENT" ? "bg-[#183A2D]" : "bg-amber-700"}`}>
                          {prod.listingTypeRaw === "RENT" ? "THUÊ ĐỒ" : "MUA SẮM"}
                        </span>
                        <span className="text-[8px] font-bold bg-white/90 text-stone-600 px-2 py-0.5 rounded shadow-sm border border-black/5 w-fit">
                          {prod.condition}
                        </span>
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
        ) : (
          <div className="border border-stone-200/60 bg-white rounded-[2.5rem] p-12 text-center shadow-sm max-w-xl mx-auto mt-8 font-sans">
            <div className="w-12 h-12 bg-stone-50 border rounded-full flex items-center justify-center mx-auto text-stone-400 mb-4 shadow-inner">
              <Shirt size={20} />
            </div>
            <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wide">Không tìm thấy trang phục phù hợp</h3>
            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
              Hiện tại phân hệ này chưa ghi nhận phục trang tương thích với phong cách này, cậu chọn dịp khác hoặc tự tay đăng đồ nhé.
            </p>
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