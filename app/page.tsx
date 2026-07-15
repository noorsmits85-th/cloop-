"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { 
  Search, ShoppingBag, ArrowRight, Sparkles, MapPin, 
  Layers, Star, Plus, Gift, ShieldCheck, Heart, Zap, Shield,
  Handshake, RefreshCw, Leaf, Users, Shirt, Sun, Moon, X, Pin, BookOpen
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import AiStylistChat from "./components/AiStylistChat"; 
// 🟢 BIẾN ĐỘC QUYỀN: Giữ nguyên vẹn đầu nối kích nổ Modal từ Context chung
import { useAuthModal } from "./AuthModalContext";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600";

interface Product { 
  id: string; 
  image: string; 
  type: string; 
  title: string; 
  price: number; 
  rawPriceText: string;
  location: string; 
  rating: string; 
  condition: string; 
  size?: string; 
  brand?: string;
  ownerName?: string;
  userId: string;
  storeRetailPrice: number; 
  savedPercentage: number;  
  occasion: string;
}

interface BlogPreview {
  id: string;
  title: string;
  content: string;
  coverImage: string;
  createdAt: string;
}

interface OccasionItem { name: string; label: string; img: string; }
interface ServiceItem { tag: string; icon: any; title: string; desc: string; btn: string; href: string; isModal?: boolean; }
interface PrivilegeItem { icon: any; title: string; desc: string; }

export default function Home() {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const { handleFeatureRequirement } = useAuthModal();

  const [placeholderIndex, setPlaceholderIndex] = useState<number>(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [recentBlogs, setRecentStories] = useState<BlogPreview[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(true);
  const [selectedOccasion, setSelectedOccasion] = useState<string>("All");

  const placeholders = ["Tìm kiếm trang phục...", "Trợ lý ảo AI Stylist...", "Khám phá tủ đồ hiệu...", "Ước tính giá thuê..."];

  // 🏛️ DANH MỤC PHÂN LOẠI THEO DỊP: Ngắn gọn, mộc mạc, thực tế theo đúng yêu cầu điều phối của Trang
  const occasions: OccasionItem[] = [
    { name: "All", label: "Tất cả phục trang", img: "" },
    { name: "Tiệc cưới", label: "Tiệc cưới", img: "https://images.unsplash.com/photo-1549417229-aa67d3263c09?q=80&w=300" },
    { name: "Dạ hội", label: "Dạ hội", img: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=300" },
    { name: "Dạo phố", label: "Dạo phố", img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=300" },
    { name: "Áo dài", label: "Áo dài", img: "https://images.unsplash.com/photo-1621184455862-c163dfb30e0f?q=80&w=300" },
    { name: "Đi biển", label: "Đi biển", img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=300" }
  ];

  const services: ServiceItem[] = [
    { tag: "01", icon: ShoppingBag, title: "THUÊ ĐỒ", desc: "Thuê trang phục theo nhu cầu thực tế, tối ưu chi phí tiêu dùng.", btn: "Khám phá ngay →", href: "/shop?type=rent" },
    { tag: "02", icon: Handshake, title: "CHO THUÊ ĐỒ", desc: "Chia sẻ tủ quần áo nhàn rỗi của bạn, tạo nguồn thu nhập xanh ổn định.", btn: "Đăng cho thuê →", href: "/my-closet/create?mode=rent" },
    { tag: "03", icon: RefreshCw, title: "MUA SẮM", desc: "Sở hữu sản phẩm thời trang second-hand tuyển chọn, chất lượng cao.", btn: "Mua sắm ngay →", href: "/shop?type=sell" },
    { tag: "04", icon: Layers, title: "CHUYỂN NHƯỢNG & KÝ GỬI", desc: "Ủy thác tủ đồ cũ để bán đứt nhanh chóng hoặc phối hợp vận hành tuần hoàn thương mại.", btn: "Ký gửi ngay →", href: "/my-closet/create?mode=consign" },
    { tag: "05", icon: Leaf, title: "TÁI CHẾ", desc: "Gửi quần áo cũ hỏng cho xưởng Upcycle để thiết kế và tái sinh vòng đời.", btn: "Tìm hiểu ngay →", href: "#", isModal: true }
  ];

  const statsData = [
    { num: "12.000+", label: "Sản phẩm", icon: Shirt },
    { num: "5.000+", label: "Người dùng", icon: Users },
    { num: "680kg", label: "CO₂ đã giảm", icon: Leaf },
    { num: "98%", label: "Đánh giá tốt", icon: Star }
  ];

  const privileges: PrivilegeItem[] = [
    { icon: <Gift size={18} />, title: "Tặng Ngay 100 Green Points", desc: "Tích lũy điểm thưởng sau mỗi lần thuê hoặc tái chế đồ để đổi voucher ưu đãi." },
    { icon: <Sparkles size={18} />, title: "Trợ Lý Phối Đồ AI Stylist", desc: "Mở khóa tính năng AI tự động gợi ý phụ kiện, túi xách phù hợp với từng outfit." },
    { icon: <ShieldCheck size={18} />, title: "Mở Gian Hàng Tự Quản", desc: "Bất kỳ cá nhân nào cũng có thể đăng bài kinh doanh, chia sẻ tủ đồ tăng thu nhập." },
    { icon: <Heart size={18} />, title: "Kết Nối Xưởng Upcycle", desc: "Gửi yêu cầu thiết kế và sửa đổi quần áo cũ trực tiếp đến các đối tác tái chế." }
  ];

  useEffect(() => {
    const interval = setInterval(() => { 
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length); 
    }, 5000);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  // 📡 THÔNG MẠCH DỮ LIỆU THẬT ĐỘNG TOÀN DIỆN TỪ SUPABASE (REAL MARKETPLACE FLOW)
  useEffect(() => {
    async function fetchRealMarketplaceData() {
      try {
        setProductsLoading(true);
        
        let productsQuery = await supabase.from("products").select("*, ProductImage(*), Listing(*)");
        if (productsQuery.error) {
          productsQuery = await supabase.from("products").select("*, images(*), listings(*)");
        }
        if (productsQuery.error) {
          productsQuery = await supabase.from("products").select("*");
        }

        const { data: pData, error: pError } = productsQuery;
        if (pError) throw pError;

        if (pData) {
          const mappedProducts = pData.map((item: any) => {
            // 🔐 ĐÃ SỬA: Xóa bỏ hoàn toàn biến rác productListings chưa định nghĩa gây lỗi
            const listingsArr = item.Listing || item.listings || []; 
            const imagesArr = item.ProductImage || item.images || [];

            const rentListing = listingsArr.find((l: any) => l.listingType === "RENT" && l.status === "AVAILABLE");
            const sellListing = listingsArr.find((l: any) => (l.listingType === "SELL" || l.listingType === "SALE") && l.status === "AVAILABLE");

            const rentPrice = rentListing ? Number(rentListing.basePrice) : 0;
            const sellPrice = sellListing ? Number(sellListing.basePrice) : 0;

            if (rentPrice <= 0 && sellPrice <= 0 && !item.rental_price) {
              return null;
            }

            const currentViewIsRental = rentPrice > 0 || !!item.rental_price;
            const finalPrice = rentPrice || item.rental_price || sellPrice;

            const storeRetailPrice = item.original_price || item.originalPrice || 500000;
            const savedPercentage = Math.round(((storeRetailPrice - finalPrice) / storeRetailPrice) * 100);

            let currentImage = PLACEHOLDER_IMG;
            if (imagesArr && imagesArr.length > 0) {
              currentImage = imagesArr[0].url || imagesArr[0] || currentImage;
            } else if (item.image_url || item.imageUrl) {
              currentImage = item.image_url || item.imageUrl;
            }

            return {
              id: item.id,
              image: currentImage, 
              type: currentViewIsRental ? "Thuê" : "Mua sắm",
              title: item.title || item.name || "Trang phục CLOOP",
              price: finalPrice,
              rawPriceText: currentViewIsRental ? `${finalPrice.toLocaleString()}đ / ngày` : `${finalPrice.toLocaleString()}đ`,
              location: item.province || "Nghệ An", 
              rating: "5.0",            
              condition: item.condition === "GOOD" ? "Mới 95%" : "Mới 98%",
              size: item.size || "M",
              brand: item.brand || "Thiết kế Việt",
              ownerName: item.owner_name || "Thành viên CLOOP",
              userId: item.userId,
              storeRetailPrice,
              savedPercentage,
              occasion: item.occasion || "Dạo phố"
            };
          }).filter(Boolean);

          setProducts(mappedProducts as Product[]);
          setFilteredProducts(mappedProducts as Product[]);
        }

        // 📡 QUÉT LƯU BÚT ĐỜI THƯỜNG: Bốc giới hạn đúng 3 bài đăng mới nhất từ database về
        const { data: blogData } = await supabase
          .from("BlogPost")
          .select("*")
          .filter("status", "neq", "HIDDEN")
          .order("isPinned", { ascending: false })
          .order("createdAt", { ascending: false })
          .limit(3);

        if (blogData) {
          const mappedBlogs = blogData.map((b: any) => ({
            id: b.id,
            title: b.title,
            content: b.content,
            coverImage: b.coverImage || b.cover_image || PLACEHOLDER_IMG,
            createdAt: b.createdAt
          }));
          setRecentStories(mappedBlogs);
        }

      } catch (err: any) {
        console.error("❌ LỖI VẬN HÀNH KHO DỮ LIỆU ĐỘNG TRANG CHỦ:", err);
      } finally {
        setProductsLoading(false);
      }
    }
    
    fetchRealMarketplaceData();
  }, []);

  const handleFilterOccasion = (occName: string) => {
    setSelectedOccasion(occName);
    if (occName === "All") {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(p => p.occasion === occName));
    }
  };

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } }
  };

  return (
    <main className="min-h-screen overflow-x-hidden antialiased relative transition-colors duration-500 bg-[#FAF9F6] text-stone-900 font-body selection:bg-[#183A2D] selection:text-white">
      
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght=0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" />

      <style>{`
        html { scroll-behavior: smooth; }
        .font-heading { font-family: 'Cormorant Garamond', serif; }
        .font-body { font-family: 'Plus Jakarta Sans', sans-serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* 🟢 PHÂN ĐOẠN 1: EDITORIAL HERO SECTION - BANNER PHẲNG XANH LỤC BẢO SANG TRỌNG */}
      <section className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-12 pt-8 pb-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
          className="bg-[#183A2D] text-[#FAF9F6] rounded-[2.5rem] py-20 px-6 sm:px-12 lg:px-20 text-center relative overflow-hidden shadow-md"
        >
          <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#FAF9F6_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
          
          <div className="max-w-3xl mx-auto space-y-6 relative z-10">
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase text-emerald-300">
              <Sparkles size={10} className="fill-emerald-300" />
              <span>Nền tảng số tuần hoàn Việt Nam</span>
            </div>
            <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
              Mặc đẹp hơn. Tiêu ít hơn. <br />
              <span className="italic font-normal text-emerald-300/90">Sống xanh hơn.</span>
            </h1>
            <p className="font-body text-xs sm:text-sm text-stone-300 max-w-md mx-auto font-medium leading-relaxed">
              Kéo dài vòng đời trang phục nhàn rỗi thông qua mô hình chia sẻ thông minh. Tự đăng đồ, tự quyết giá thuê và bảo chứng cọc an toàn.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link href="/shop" className="bg-[#FAF9F6] hover:bg-stone-100 text-[#183A2D] text-xs font-black uppercase tracking-wider px-7 py-3.5 rounded-full transition-all shadow-sm active:scale-95">
                Khám phá tủ đồ ngay
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 🟢 PHÂN ĐOẠN 2: KHỒI 5 CHỨC NĂNG CHÍNH - ĐÃ HỒI SINH GIAO DIỆN EDITORIAL PHẲNG CAO CẤP */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {services.map((srv, i) => {
            const ServiceIcon = srv.icon;
            return (
              <Link href={srv.href} key={i} className="block h-full">
                <motion.div 
                  whileHover={{ y: -6, boxShadow: "0px 12px 30px rgba(24,58,45,0.05)" }} 
                  onClick={(e) => { if(srv.isModal) { e.preventDefault(); handleFeatureRequirement(srv.title); } }} 
                  className="border border-stone-200 bg-white p-6 xl:p-8 rounded-3xl flex flex-col justify-between transition-all duration-300 relative group cursor-pointer text-left h-full"
                >
                  <span className="absolute top-4 right-5 font-heading text-xs text-stone-300 font-bold tracking-wider">{srv.tag}</span>
                  <div>
                    <div className="w-12 h-12 rounded-2xl border border-stone-200 bg-[#FAF9F6] text-[#183A2D] flex items-center justify-center mb-5 group-hover:bg-[#183A2D] group-hover:text-white transition-colors duration-300">
                      <ServiceIcon size={18} />
                    </div>
                    <h3 className="font-body text-xs font-bold uppercase tracking-wider mb-2 text-stone-900">{srv.title}</h3>
                    <p className="font-body text-[11px] text-stone-400 leading-relaxed mb-6 line-clamp-3">{srv.desc}</p>
                  </div>
                  <span className="font-body text-[10px] font-black uppercase tracking-wider text-left border-t border-stone-100 pt-4 block text-[#183A2D] group-hover:text-[#6BA37A] transition-colors">
                    {srv.btn}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 🎯 PHÂN ĐOẠN 3: EXPLORE BY OCCASION - PHÂN LUỒNG THEO DỊP MỘC MẠC */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-6 space-y-6">
        <div className="text-left space-y-1">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">Tìm kiếm theo dịp mặc đồ</h2>
          <p className="font-body text-stone-400 text-xs font-medium">Lọc nhanh mớ phục trang thực tế bám sát mục đích ngày hội của bạn</p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {occasions.map((occ) => (
            <div 
              key={occ.name}
              onClick={() => handleFilterOccasion(occ.name)}
              className={`p-2 rounded-2xl border text-center space-y-2 cursor-pointer transition-all duration-200 shadow-2xs group
                ${selectedOccasion === occ.name 
                  ? "bg-[#183A2D] border-[#183A2D] text-white" 
                  : "bg-white border-stone-200 text-stone-700 hover:border-stone-400"
                }`}
            >
              <div className="aspect-square w-full rounded-xl overflow-hidden bg-stone-50 relative">
                {occ.img ? (
                  <img src={occ.img} alt={occ.label} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-stone-100 text-stone-400 font-bold text-xs uppercase tracking-wider">ALL</div>
                )}
              </div>
              <div className="text-[11px] font-bold tracking-tight truncate px-1">{occ.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 👗 PHÂN ĐOẠN 4: CURATED PREMIUM FEED - KỆ ĐỒ THỜI GIAN THỰC KHUNG Ả LỚN 3:4 */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-8 space-y-6">
        <div className="flex items-center justify-between border-b border-stone-200/60 pb-3">
          <div className="text-left space-y-1">
            <h3 className="font-heading text-xl sm:text-2xl font-bold text-[#183A2D]">Trang phục lên kệ thời gian thực</h3>
            <p className="font-body text-stone-400 text-xs">Sản phẩm thật, giao dịch thật do các thành viên tự đăng tải điều phối</p>
          </div>
          <Link href="/shop" className="font-body text-xs font-black uppercase tracking-widest text-[#6BA37A] hover:text-[#183A2D] transition-colors whitespace-nowrap">
            Xem tất cả →
          </Link>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="w-full aspect-[3/4] bg-stone-200/40 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white border border-stone-200 rounded-3xl shadow-2xs">
            <p className="text-xs font-medium text-stone-400">Tủ đồ danh mục này tạm thời chưa có đồ mới đăng tải.</p>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
            {filteredProducts.slice(0, 4).map((item) => (
              <motion.div variants={itemVariants} key={item.id} className="group flex flex-col space-y-3 relative text-left">
                
                <div className="w-full aspect-[3/4] bg-stone-50 rounded-2xl overflow-hidden relative border border-stone-200/30 shadow-2xs">
                  <Image 
                    src={item.image} 
                    alt={item.title} 
                    fill unoptimized
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  />
                  
                  <button className="absolute top-3 right-3 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-stone-600 hover:text-red-500 transition-colors shadow-2xs cursor-pointer z-10">
                    <Heart size={12} strokeWidth={2.5} />
                  </button>

                  <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                    <span className="text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md text-white shadow-sm bg-[#183A2D]">
                      {item.type}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 bg-stone-900/70 backdrop-blur-md text-[9px] font-bold text-white px-2 py-0.5 rounded-md tracking-wider">
                    SIZE {item.size}
                  </div>
                </div>

                <div className="space-y-1 px-0.5">
                  <div className="flex items-center justify-between text-[9px] font-bold text-stone-400 uppercase tracking-wider">
                    <Link href={`/closet/${item.userId}`} className="hover:text-[#183A2D] underline decoration-stone-200/60 z-10 relative">
                      @{item.brand}
                    </Link>
                    <span className="flex items-center gap-0.5 text-stone-400 font-medium">
                      <MapPin size={9} className="text-[#6BA37A]" /> {item.location}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-stone-900 line-clamp-1 group-hover:text-[#183A2D] transition-colors tracking-tight">
                    {item.title}
                  </h4>

                  <div className="pt-1.5 flex items-baseline justify-between border-t border-dashed border-stone-200 mt-1">
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-bold text-stone-400 uppercase tracking-widest block">Chi phí</span>
                      <p className="text-xs font-black text-[#183A2D] font-mono">
                        {item.rawPriceText}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-bold text-stone-400 uppercase tracking-widest block">Giá gốc Store</span>
                      <div className="flex items-center gap-1.5 justify-end">
                        <p className="text-[10px] font-semibold text-stone-400 line-through font-mono">
                          {item.storeRetailPrice.toLocaleString()}đ
                        </p>
                        <span className="text-[8px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded uppercase tracking-wider">
                          -{item.savedPercentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Link href={`/product/${item.id}`} className="absolute inset-0 z-0">
                  <span className="sr-only">Xem chi tiết {item.title}</span>
                </Link>

              </motion.div>
            ))}
            
            <Link href="/my-closet/create" className="block h-full">
              <div className="border-2 border-dashed border-stone-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer group h-full bg-stone-50/20 hover:bg-stone-50/80 min-h-[340px]">
                <div className="w-10 h-14 bg-white border border-stone-200 rounded-lg flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all shadow-2xs">
                  <Plus size={16} />
                </div>
                <h4 className="font-body text-xs font-bold uppercase tracking-wider mt-4">Ký gửi mở rộng tủ đồ</h4>
                <p className="font-body text-[11px] text-stone-400 mt-1 max-w-[130px] leading-normal">Tự đăng bài kinh doanh quần áo nhàn rỗi miễn phí</p>
              </div>
            </Link>
          </motion.div>
        )}
      </section>

      {/* 📔 PHÂN ĐOẠN 5: TRẠM LƯU BÚT ĐỜI THƯỜNG - ADMIN GHIM TINH TUYỂN */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-8 space-y-6">
        <div className="bg-white border-2 border-stone-900/5 p-6 sm:p-8 rounded-[2rem] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xs text-left relative overflow-hidden">
          <div className="space-y-1.5 max-w-2xl relative z-10">
            <span className="text-[9px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-md inline-block">Góc Lưu Niệm</span>
            <h2 className="font-heading text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-1.5">
              <BookOpen size={18} className="text-stone-700" />
              <span>Góc nhật ký lưu bút phục trang</span>
            </h2>
            <p className="font-body text-stone-400 text-xs leading-relaxed font-normal">
              Mỗi bộ phục trang cũ đều ôm giữ những hồi ức thanh xuân dạt dào cảm xúc. Hãy gửi gắm câu chuyện lưu niệm của bạn, hệ thống Admin sẽ chọn lọc phê duyệt ghim những dòng chữ phản hồi ấm áp nhất lên trang chủ CLOOP.
            </p>
          </div>
          <Link href="/blog" className="shrink-0 w-full md:w-auto relative z-10">
            <button className="w-full md:w-auto bg-stone-900 hover:bg-emerald-800 text-[#FAF9F6] text-[11px] font-black uppercase tracking-wider px-6 py-3 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95">
              Lật xem toàn bộ sổ ký ức →
            </button>
          </Link>
        </div>

        {recentBlogs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentBlogs.map((story) => (
              <Link href="/blog" key={story.id} className="block group">
                <div className="bg-[#FCFAF5] border border-stone-200/50 p-4 rounded-2xl flex gap-4 items-center text-left hover:bg-white hover:shadow-sm transition-all duration-300 h-24">
                  <div className="w-12 h-16 bg-stone-100 rounded-lg overflow-hidden border border-stone-200/60 shrink-0 relative">
                    <img src={story.coverImage} className="w-full h-full object-cover" alt="Cover" />
                    <div className="absolute top-1 left-1 bg-amber-400 text-white p-0.5 rounded-xs shadow-2xs">
                      <Pin size={8} className="rotate-45 fill-white" />
                    </div>
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="text-[8px] font-mono font-bold text-stone-400 uppercase tracking-widest block">
                      {new Date(story.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                    <h4 className="text-xs font-extrabold text-stone-900 truncate group-hover:text-emerald-700 transition-colors">
                      {story.title}
                    </h4>
                    <p className="text-[11px] text-stone-500 font-serif italic truncate">
                      "{story.content}"
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 🌿 PHÂN ĐOẠN 6: ĐẶC QUYỀN THÀNH VIÊN - ĐÃ HỒI SINH HOÀN CHỈNH CHUẨN THƯƠNG HIỆU */}
      <section id="register-privilege" className="max-w-[1500px] mx-auto px-6 lg:px-12 py-10 border-t border-stone-200/60 text-left relative z-10">
        <div className="border border-stone-200 bg-white rounded-[2.5rem] p-8 lg:p-12 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="w-full lg:w-[55%]">
            <h2 className="font-heading text-3xl font-bold text-stone-900">Hãy đăng ký tài khoản để trải nghiệm trọn vẹn đặc quyền xanh</h2>
            <p className="font-body text-xs tracking-[0.15em] text-[#6BA37A] uppercase font-bold mt-2 mb-6">Trở thành một phần của hệ sinh thái thời trang tuần hoàn thông minh</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {privileges.map((item: PrivilegeItem, idx: number) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-xl border border-stone-200 bg-[#FAF8F3] text-[#183A2D] flex items-center justify-center shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-body text-xs font-bold uppercase tracking-wider text-stone-900">{item.title}</h4>
                    <p className="font-body text-xs text-stone-400 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="w-full lg:w-[38%] border border-stone-200 bg-[#FAF8F3] p-8 rounded-3xl text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-white border border-stone-200 flex items-center justify-center mb-4 text-[#183A2D] shadow-2xs">
              <Zap size={18} />
            </div>
            <h3 className="font-heading text-2xl font-bold text-stone-900">Kích Hoạt Tài Khoản</h3>
            <p className="font-body text-xs text-stone-400 mt-2 mb-6 leading-relaxed">Chỉ mất 30 giây để thiết lập tủ đồ xanh của riêng bạn trên ứng dụng.</p>
            <button onClick={() => handleFeatureRequirement("Mở tủ đồ xanh")} className="w-full font-body text-xs font-black uppercase tracking-widest py-4 rounded-full shadow-md bg-[#183A2D] text-white hover:bg-emerald-800 transition active:scale-[0.98] cursor-pointer">
              Đăng ký thành viên ngay
            </button>
          </div>
        </div>
      </section>

      {/* 🌿 PHÂN ĐOẠN 7: CHỈ SỐ TÁC ĐỘNG XANH ESG LÓT MỎNG TRÊN FOOTER */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-8 border-t border-stone-200/60">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 items-center">
          {statsData.map((item, idx) => {
            const StatIcon = item.icon;
            return (
              <div key={idx} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-stone-200/40 text-left shadow-3xs">
                <div className="w-9 h-9 rounded-xl bg-stone-50 text-[#6BA37A] border border-stone-200/40 flex items-center justify-center shrink-0">
                  <StatIcon size={16} />
                </div>
                <div>
                  <div className="font-heading text-lg font-black text-stone-900 leading-none">{item.num}</div>
                  <div className="font-body text-[10px] text-stone-400 font-bold uppercase tracking-wider mt-1">{item.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <AiStylistChat darkMode={darkMode} />

    </main>
  );
}