"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
// Đã bảo chứng import đầy đủ tất cả icon hệ thống chống lỗi ts(2304)
import { MapPin, Star, Filter, ArrowUpDown, ArrowLeft, Search, SlidersHorizontal, Shirt } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  occasion: string; // Khớp cấu trúc thuộc tính dịp/phong cách toàn diện
}

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 🎛️ a) Nhận diện phân luồng trực tiếp từ URL bar (?type và ?occasion mới)
  const urlType = searchParams.get("type") || "all";
  const urlOccasion = searchParams.get("occasion");

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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
                });
              }
            }
          });

          setProducts(mapped);
        }
      } catch (err) {
        console.error("❌ Lỗi vận hành dòng chảy dữ liệu sàn /shop:", err);
      } finally {
        // 🛠️ ĐÃ SỬA LỖI NGHIÊM TRỌNG: Đổi từ setProductsLoading thành setLoading chính xác để tắt trạng thái chờ
        setLoading(false);
      }
    }

    fetchShopProducts();
  }, [urlType]);

  // 🎛️ e) BỘ LỌC ĐA NHIỆM: Đối soát đồng bộ tuyệt đối giữa Ô Tìm kiếm Text và Chip Occasion động
  useEffect(() => {
    let result = [...products];

    if (selectedOccasion !== "Tất cả") {
      result = result.filter(p => p.occasion === selectedOccasion);
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.location.toLowerCase().includes(q)
      );
    }

    setFilteredProducts(result);
  }, [searchQuery, selectedOccasion, products]);

  // Hàm chuyển đổi tham số URL thủ công khi click trực tiếp vào hàng chip trên Sàn
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

  return (
    <main className="min-h-screen bg-[#FAF8F3] text-[#183A2D] antialiased p-6 md:p-12 font-sans selection:bg-[#183A2D] selection:text-white">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* THANH ĐIỀU HƯỚNG QUAY LẠI TRANG CHỦ */}
        <div className="flex justify-between items-center">
          <Link href="/" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-green-800 transition-colors">
            <ArrowLeft size={12} /> — Quay lại trang chủ
          </Link>
          <span className="bg-white border text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full text-stone-500 shadow-sm">
            CLOOP MARKETPLACE LIVE
          </span>
        </div>

        {/* TIÊU ĐỀ SÀN BIẾN ĐỔI LINH HOẠT THEO LUỒNG THƯƠNG MẠI */}
        <div className="text-left space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#183A2D]">
            {urlType === "rent" ? "Kho Trang Phục Thuê Đồ" : urlType === "sell" ? "Kệ Hàng Mua Sắm Tuần Hoàn" : "Sàn Thời Trang Tuần Hoàn"}
          </h1>
          <p className="text-xs text-gray-400 max-w-[600px] leading-relaxed">
            Kéo dài vòng đời sản phẩm, kiến tạo giải pháp tiết kiệm tối đa tài chính cho ví tiền sinh viên và bảo vệ môi trường xanh bền vững.
          </p>
        </div>

        {/* TOOLBAR ĐIỀU KHIỂN CẤU TRÚC CHIP MỚI CUỘN NGANG */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white p-4 rounded-3xl border border-[#E9E2D8] shadow-sm">
          
          {/* DÃY CHIP CUỘN NGANG CHỌN PHONG CÁCH / DỊP PHỐI ĐỒ */}
          <div className="flex gap-2 overflow-x-auto pb-1 w-full lg:w-auto text-left scrollbar-none" style={{ scrollbarWidth: 'none' }}>
            {occasionList.map((occ) => (
              <button
                key={occ}
                onClick={() => handleChipClick(occ)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer select-none ${
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
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
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

            <button className="flex items-center gap-1.5 border px-4 py-2 rounded-full text-xs font-bold bg-white hover:bg-stone-50 transition shadow-sm text-stone-600">
              <SlidersHorizontal size={13} /> Bộ lọc nâng cao
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 pt-4">
            {filteredProducts.map((prod) => {
              const savedPercentage = prod.storeRetailPrice > prod.price 
                ? Math.round(((prod.storeRetailPrice - prod.price) / prod.storeRetailPrice) * 100) 
                : 0;

              return (
                <Link href={`/product/${prod.id}`} key={prod.id} className="block group">
                  <div className="border border-[#E9E2D8] bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full text-left">
                    
                    {/* KHU VỰC KHUNG ẢNH LOOKBOOK */}
                    <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden">
                      <Image 
                        src={prod.image} 
                        alt={prod.title} 
                        fill 
                        unoptimized 
                        className="object-cover object-top transition-transform duration-700 group-hover:scale-104" 
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
                    </div>

                    {/* KHU VỰC CHÂN CARD */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-1">
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="text-xs font-bold line-clamp-1 text-stone-800 group-hover:text-green-700 transition-colors uppercase tracking-wide leading-tight">
                            {prod.title}
                          </h4>
                          <span className="text-[8px] font-semibold text-stone-400 border border-stone-200 px-1 py-0.2 rounded shrink-0">
                            {prod.occasion}
                          </span>
                        </div>
                        
                        {prod.storeRetailPrice > 0 && (
                          <p className="text-[10px] font-medium text-stone-400 line-through">
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
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="border border-stone-200/60 bg-white rounded-[2.5rem] p-12 text-center shadow-sm max-w-xl mx-auto mt-8">
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