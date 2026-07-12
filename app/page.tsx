"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { 
  Search, ShoppingBag, ArrowRight, Sparkles, MapPin, 
  Layers, Star, Plus, Gift, ShieldCheck, Heart, Zap, Shield,
  Handshake, RefreshCw, Leaf, Users, Shirt, Sun, Moon, X
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import AiStylistChat from "./components/AiStylistChat"; 
// 🟢 ĐẤU NỐI CONTEXT: Gọi Hook dùng chung để kết nối Modal tổng ở Layout
import { useAuthModal } from "./AuthModalContext";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Product { 
  id: string; 
  image: string; 
  type: string; 
  title: string; 
  price: string; 
  location: string; 
  rating: string; 
  condition: string; 
  size?: string; 
  storeRetailPrice: number; 
  savedPercentage: number;  
}

interface ServiceItem { tag: string; icon: any; title: string; desc: string; btn: string; href: string; isModal?: boolean; }
interface StatItem { num: string; label: string; icon: any; }
interface PrivilegeItem { icon: any; title: string; desc: string; }

export default function Home() {
  // Giữ lại state darkMode cục bộ để phục vụ hiển thị màu nền CSS của các Section
  const [darkMode, setDarkMode] = useState<boolean>(false);
  
  // 🟢 Kích hoạt đầu nối lấy tính năng kích nổ Modal từ Context chung
  const { handleFeatureRequirement } = useAuthModal();

  const [placeholderIndex, setPlaceholderIndex] = useState<number>(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(true);

  const placeholders = ["Search outfits...", "AI Stylist...", "AI Discovery...", "AI Pricing...", "Near me..."];

  useEffect(() => {
    const interval = setInterval(() => { 
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length); 
    }, 5000);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  // 📡 ĐỒNG BỘ MẠCH NEW FEED CHUẨN XÁC VÀ LẤY DƯ POOL DỮ LIỆU CHỐNG HỤT UI
  useEffect(() => {
    async function fetchFeaturedProducts() {
      try {
        setProductsLoading(true);
        
        // 🔄 ĐỔI TỪ .limit(4) -> .limit(20): Lấy dư ra để tránh bị hụt thẻ sau khi filter hàng ẩn
        let response = await supabase
          .from("products")
          .select("*, ProductImage(*), Listing(*)") 
          .order("createdAt", { ascending: false })
          .limit(20);

        if (response.error) {
          response = await supabase
            .from("products")
            .select("*, images(*), listings(*)") 
            .order("createdAt", { ascending: false })
            .limit(20);
        }

        if (response.error) {
          response = await supabase
            .from("products")
            .select("*") 
            .order("id", { ascending: false })
            .limit(20);
        }

        const { data, error } = response;
        if (error) throw error;

        if (data) {
          const mappedProducts = data.map((item: any) => {
            const listingsArr = item.Listing || item.listings || [];
            const imagesArr = item.ProductImage || item.images || [];

            // Tích hợp bộ lọc điều kiện trạng thái AVAILABLE để lọc bỏ các bài viết đã HIDDEN
            const rentListing = listingsArr.find((l: any) => l.listingType === "RENT" && l.status === "AVAILABLE");
            const sellListing = listingsArr.find((l: any) => (l.listingType === "SELL" || l.listingType === "SALE") && l.status === "AVAILABLE");

            const rentPrice = rentListing ? Number(rentListing.basePrice) : 0;
            const sellPrice = sellListing ? Number(sellListing.basePrice) : 0;

            // 🟢 CHỐT CHẶN: Nếu không còn listing nào khả dụng (bị chủ tủ ẩn hết) -> Loại bỏ hoàn toàn khỏi New Feed
            if (rentPrice <= 0 && sellPrice <= 0) {
              return null;
            }

            const currentViewIsRental = rentPrice > 0;
            const finalPrice = currentViewIsRental ? rentPrice : sellPrice;

            const storeRetailPrice = item.original_price || item.originalPrice || (sellPrice ? sellPrice * 2.2 : finalPrice * 7);
            const savedPercentage = Math.round(((storeRetailPrice - finalPrice) / storeRetailPrice) * 100);

            let currentImage = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600";
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
              price: currentViewIsRental 
                ? `${finalPrice.toLocaleString()}đ / ngày` 
                : `${finalPrice.toLocaleString()}đ`,
              location: item.province || "Nghệ An", 
              rating: "5.0",            
              condition: item.condition === "GOOD" ? "Mới 95%" : "Mới 98%",
              size: item.size || "M",
              storeRetailPrice,
              savedPercentage
            };
          })
          .filter(Boolean) // 🟢 Lọc sạch bỏ qua các dòng null của sản phẩm bị ẩn bài viết
          .slice(0, 4);    // 🟢 Cắt lấy đúng 4 sản phẩm khả dụng đầu tiên để lấp đầy New Feed hoàn hảo

          setProducts(mappedProducts as Product[]);
        }
        setProductsLoading(false);
      } catch (err: any) {
        console.error("❌ LỖI KHỞI CHẠY DATA TRANG CHỦ CHỮ THẬT:", err);
        setProductsLoading(false);
      }
    }
    
    fetchFeaturedProducts();
  }, []);

  const services: ServiceItem[] = [
    { tag: "01", icon: ShoppingBag, title: "THUÊ ĐỒ", desc: "Thuê trang phục theo nhu cầu thực tế, tối ưu chi phí tiêu dùng.", btn: "Khám phá ngay →", href: "/shop?type=rent" },
    { tag: "02", icon: Handshake, title: "CHO THUÊ ĐỒ", desc: "Chia sẻ tủ quần áo nhàn rỗi của bạn, tạo nguồn thu nhập xanh ổn định.", btn: "Đăng cho thuê →", href: "/my-closet/create?mode=rent" },
    { tag: "03", icon: RefreshCw, title: "MUA SẮM", desc: "Sở hữu sản phẩm thời trang second-hand tuyển chọn, chất lượng cao.", btn: "Mua sắm ngay →", href: "/shop?type=sell" },
    { tag: "04", icon: Layers, title: "CHUYỂN NHƯỢNG & KÝ GỬI", desc: "Ủy thác tủ đồ cũ để bán đứt nhanh chóng hoặc phối hợp vận hành tuần hoàn thương mại.", btn: "Ký gửi ngay →", href: "/my-closet/create?mode=consign" },
    { tag: "05", icon: Leaf, title: "TÁI CHẾ", desc: "Gửi quần áo cũ hỏng cho xưởng Upcycle để thiết kế và tái sinh vòng đời.", btn: "Tìm hiểu ngay →", href: "#", isModal: true }
  ];

  const statsData: StatItem[] = [
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

  const heroContainerVariants: any = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const heroItemVariants: any = {
    hidden: { opacity: 0, scale: 0.95, y: 40 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
  };

  return (
    <main className="min-h-screen overflow-x-hidden antialiased relative transition-colors duration-500 font-body selection:bg-[#183A2D] selection:text-white">
      
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=Cormorant+Garamond:ital,wght=0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght=300;400;500;600;700&display=swap" />

      <style>{`
        html { scroll-behavior: smooth; }
        .font-logo { font-family: 'Cinzel', serif; }
        .font-heading { font-family: 'Cormorant Garamond', serif; }
        .font-body { font-family: 'Plus Jakarta Sans', sans-serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* DẢI LỤA XANH NỀN ĐỘNG NGUYÊN BẢN */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ y: [0, -25, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[2%] right-[-6%] w-[850px] h-[850px] flex items-center justify-center"
        >
          <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} className="w-full h-full relative">
            <Image src="/loogo.png" alt="CLOOP Brand Logo" fill sizes="100vw" className={`object-contain mix-blend-multiply select-none transition-opacity ${darkMode ? "opacity-10" : "opacity-20"}`} priority />
          </motion.div>
        </motion.div>
      </div>

      {/* 2. HERO SECTION */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 pt-12 pb-16 relative z-10">
        <motion.div 
          variants={heroContainerVariants} initial="hidden" animate="show"
          className={`rounded-[3rem] border p-8 lg:p-14 flex flex-col lg:flex-row items-center justify-between gap-12 relative overflow-hidden shadow-sm transition-colors duration-500 ${darkMode ? "bg-[#18222B] border-[#2B3946]" : "bg-gradient-to-br from-[#FAF8F3] via-white to-[#EFECE5]/40 border-[#E9E2D8]"}`}
        >
          <div className="w-full lg:w-[48%] relative z-10 text-left">
            <motion.div variants={heroItemVariants} className="inline-flex items-center gap-2 bg-[#EAEFEA] border border-[#C8DCC8] rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1B5E20] animate-pulse" />
              <span className="font-body text-[9px] font-bold uppercase tracking-widest text-[#1B5E20]">Nền tảng thời trang số tuần hoàn</span>
            </motion.div>

            <h1 className={`font-heading text-[52px] md:text-[72px] lg:text-[80px] leading-[1.05] font-bold tracking-tight ${darkMode ? "text-white" : "text-[#183A2D]"}`}>
              Mặc đẹp hơn. <br /> Tiêu ít hơn. <br />
              <span className="italic font-normal text-[#6BA37A]">Sống xanh hơn.</span>
            </h1>

            <p className="font-body mt-6 text-[14px] leading-relaxed text-gray-500 max-w-[460px]">
              CLOOP là nền tảng thời trang tuần hoàn. Thuê, cho thuê, mua bán và tái chế thời trang để kéo dài vòng đời sản phẩm — vì một tương lai bền vững của cộng đồng tiêu dùng thông minh.
            </p>

            <div className="mt-8 flex items-center gap-4">
              <Link href="/shop">
                <motion.button whileHover={{ scale: 1.05, boxShadow: "0px 10px 25px rgba(24,58,45,0.18)" }} whileTap={{ scale: 0.96 }} className="font-body text-[11px] font-bold uppercase tracking-[0.15em] bg-[#183A2D] text-white px-8 py-4 rounded-full hover:bg-[#2E5A3D] transition flex items-center gap-2">
                  Khám phá ngay <ArrowRight size={14} />
                </motion.button>
              </Link>
              <Link href="/shop">
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className={`font-body text-[11px] font-bold uppercase tracking-[0.15em] border px-8 py-4 rounded-full transition shadow-sm ${darkMode ? "bg-[#1C2834] text-gray-200 border-[#2B3946]" : "bg-white text-[#183A2D] border-[#E4DDD3]"}`}>
                  Tìm hiểu thêm
                </motion.button>
              </Link>
            </div>

            <div className="mt-12 flex items-center gap-3 border-t border-[#E9E2D8]/60 pt-6">
              <div className="flex -space-x-3">
                {[1, 2, 3].map((v) => (
                  <div key={v} className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#183A2D] to-[#6BA37A] border-2 border-white" />
                ))}
              </div>
              <span className="font-body text-xs text-gray-500">Hơn <strong className={darkMode ? "text-emerald-400" : "text-[#183A2D]"}>5.000+ người</strong> đang cùng CLOOP sống xanh mỗi ngày</span>
            </div>
          </div>

          <div className="w-full lg:w-[48%] flex items-center justify-center relative">
            <motion.div variants={heroItemVariants} className={`relative w-full max-w-[480px] h-[480px] rounded-[2.5rem] border-[4px] border-dashed shadow-inner flex flex-col items-center justify-center p-8 text-center group transition-all duration-500 ${darkMode ? "border-emerald-800/40 bg-[#14212A]" : "border-[#183A2D]/20 bg-gradient-to-br from-white to-[#EFECE5]/40"}`}>
              <div className="w-14 h-14 rounded-full bg-white text-[#183A2D] flex items-center justify-center border border-[#E9E2D8] mb-4 shadow-sm group-hover:scale-105 transition-transform">
                <Layers size={22} className="text-[#6BA37A]" />
              </div>
              <h3 className={`font-heading text-2xl font-bold tracking-wide uppercase ${darkMode ? "text-white" : "text-[#183A2D]"}`}>Khung ảnh xu hướng</h3>
              <p className="font-body text-xs text-gray-400 mt-2 max-w-[280px] leading-relaxed">
                Phân hệ đặc quyền dành riêng cho <strong className={darkMode ? "text-emerald-400" : "text-[#183A2D]"}>Admin</strong> đăng tải bài viết và đề xuất thay thế hình ảnh chiến dịch liên tục để cập nhật xu thế thời trang mới nhất.
              </p>
              <Link href="/admin" className={`mt-6 text-[9px] tracking-[0.2em] uppercase font-bold font-body px-5 py-2.5 rounded-full border shadow-sm hover:scale-105 transition-transform ${darkMode ? "bg-emerald-600 text-white border-emerald-500" : "bg-[#183A2D] text-white border-[#183A2D]/10"}`}>
                🔗 Mở Cổng Quản Trị Admin →
              </Link>
            </motion.div>

            <motion.div variants={heroItemVariants} className={`absolute right-[-20px] top-1/2 -translate-y-1/2 border p-6 rounded-[2rem] shadow-xl hidden xl:flex flex-col gap-5 w-[180px] z-20 text-left ${darkMode ? "bg-[#18222B] border-[#2B3946]" : "bg-white/95 border-[#E9E2D8]"}`}>
              {statsData.map((item, index) => {
                const StatIcon = item.icon;
                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FAF8F3] border border-[#E9E2D8] flex items-center justify-center text-[#6BA37A]">
                      <StatIcon size={16} />
                    </div>
                    <div>
                      <div className="font-heading text-lg font-bold leading-none">{item.num}</div>
                      <div className="font-body text-[10px] text-gray-400 font-medium mt-0.5">{item.label}</div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* 3. KHỐI CHỨC NĂNG CHÍNH */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {services.map((srv, i) => {
            const ServiceIcon = srv.icon;
            return (
              <Link href={srv.href} key={i} className="block h-full">
                <motion.div whileHover={{ y: -6, boxShadow: "0px 12px 30px rgba(24,58,45,0.08)" }} onClick={(e) => { if(srv.isModal) { e.preventDefault(); handleFeatureRequirement(srv.title); } }} className={`border p-6 xl:p-8 rounded-3xl flex flex-col justify-between transition-all duration-300 relative group cursor-pointer text-left h-full ${darkMode ? "bg-[#18222B] border-[#2B3946]" : "bg-white border-[#E9E2D8]"}`}>
                  <span className="absolute top-4 right-5 font-heading text-xs text-gray-300 font-bold tracking-wider">{srv.tag}</span>
                  <div>
                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-5 group-hover:bg-[#183A2D] group-hover:text-white transition-colors duration-300 ${darkMode ? "bg-[#162721] border-[#254236] text-emerald-400" : "bg-[#FAF8F3] border-[#E9E2D8] text-[#183A2D]"}`}>
                      <ServiceIcon size={20} />
                    </div>
                    <h3 className="font-body text-[11px] xl:text-xs font-bold uppercase tracking-wider mb-2 line-clamp-1">{srv.title}</h3>
                    <p className="font-body text-[11px] xl:text-xs text-gray-400 leading-relaxed mb-6 line-clamp-3">{srv.desc}</p>
                  </div>
                  <span className={`font-body text-[10px] font-bold uppercase tracking-wider text-left border-t pt-4 block group-hover:text-[#6BA37A] transition-colors ${darkMode ? "border-[#2B3946] text-emerald-400" : "border-gray-100 text-[#183A2D]"}`}>{srv.btn}</span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 4. SẢN PHẨM NỔI BẬT KHU VỰC */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-12 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 text-left">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-heading text-3xl font-bold">Sản phẩm nổi bật</h2>
              <div className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-full shadow-sm ${darkMode ? "bg-[#162721] border-emerald-800/40" : "bg-white border-[#E9E2D8]"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-body text-[8px] font-bold uppercase tracking-widest">Live Inventory</span>
              </div>
            </div>
            <p className="font-body text-xs text-gray-400 mt-2 max-w-[700px] leading-relaxed">
              Hệ thống kết nối thời gian thực hiển thị phục trang mới tinh vừa lên kệ. Khách hàng đăng đồ phát là xuất hiện ở đây ngay lập tức!
            </p>
          </div>
          <Link href="/shop" className="font-body text-xs font-bold uppercase tracking-widest text-[#6BA37A] hover:text-[#183A2D] transition-colors whitespace-nowrap">
            Xem tất cả →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {productsLoading ? (
            [1, 2, 3, 4].map((n) => (
              <div key={n} className="w-full aspect-[3/4] bg-gray-200/60 rounded-3xl animate-pulse" />
            ))
          ) : (
            products.map((prod) => (
              <Link href={`/product/${prod.id}`} key={prod.id} className="block h-full">
                <motion.div whileHover={{ y: -5, boxShadow: "0px 10px 25px rgba(24,58,45,0.06)" }} className={`border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col justify-between group cursor-pointer text-left ${darkMode ? "bg-[#18222B] border-[#2B3946]" : "bg-white border-[#E9E2D8]"}`}>
                  <div className="relative w-full h-[260px] bg-[#FAF8F3] overflow-hidden">
                    <Image src={prod.image} alt={prod.title} fill unoptimized sizes="(max-w-768px) 50vw, 20vw" className="object-cover object-top transition-transform duration-500 group-hover:scale-104" />
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md text-white ${prod.type === "Thuê" ? "bg-[#183A2D]" : "bg-amber-700"}`}>
                        {prod.type}
                      </span>
                      <span className="text-[8.5px] font-bold bg-white/90 text-gray-600 px-2 py-0.5 rounded shadow-sm border border-black/5">
                        {prod.condition}
                      </span>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-bold text-[#183A2D] flex items-center gap-0.5">
                      <Star size={10} className="fill-amber-400 stroke-none" /> {prod.rating}
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-body text-xs font-bold line-clamp-1 group-hover:text-[#6BA37A] transition-colors">{prod.title}</h4>
                      <p className="text-[10px] font-medium text-stone-400 line-through mt-1">
                        Giá gốc: {Math.round(prod.storeRetailPrice).toLocaleString()}đ
                      </p>
                      <div className="flex justify-between items-end mt-1.5">
                        <div className={`font-body text-xs font-mono font-black ${darkMode ? "text-white" : "text-stone-900"}`}>{prod.price}</div>
                        <span className="text-[8px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          -{prod.savedPercentage}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mt-3 border-t border-gray-50 pt-2.5">
                      <div className="flex items-center gap-1">
                        <MapPin size={10} className="text-[#6BA37A]" /> <span className="font-medium text-gray-600">{prod.location}</span>
                      </div>
                      {prod.size && <span className="font-mono font-bold text-stone-400">SIZE {prod.size}</span>}
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))
          )}

          <Link href="/my-closet/create" className="block h-full">
            <motion.div whileHover={{ scale: 1.02, borderStyle: "solid", borderColor: "#183A2D" }} className={`border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer group h-full ${darkMode ? "bg-[#1E2D38]/30 border-[#2B3946]" : "bg-[#EFECE5]/30 border-[#183A2D]/20 hover:bg-[#EFECE5]/50"}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border mb-4 group-hover:bg-[#183A2D] group-hover:text-white transition-all shadow-sm ${darkMode ? "bg-[#18222B] border-[#2B3946]" : "bg-white border-[#E9E2D8] text-[#183A2D]"}`}>
                <Plus size={20} />
              </div>
              <h4 className="font-body text-xs font-bold uppercase tracking-wider">Bạn có đồ nhàn rỗi?</h4>
              <p className="font-body text-[11px] text-gray-400 mt-1 max-w-[140px] leading-normal">Đăng bài ngay, tự đính kèm GPS định vị vị trí tủ đồ chính xác</p>
              <span className={`mt-5 font-body text-[10px] font-bold uppercase tracking-widest px-5 py-2.5 rounded-full block text-white ${darkMode ? "bg-emerald-600" : "bg-[#183A2D]"}`}>Đăng ngay</span>
            </motion.div>
          </Link>
        </div>
      </section>

      {/* 5. SECTION: ĐẶC QUYỀN THÀNH VIÊN */}
      <section id="register-privilege" className={`max-w-[1500px] mx-auto px-6 lg:px-12 py-16 border-t relative z-10 text-left ${darkMode ? "border-[#2B3946]" : "border-[#E9E2D8]/60"}`}>
        <div className={`border rounded-[2.5rem] p-8 lg:p-12 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-10 transition-colors duration-500 ${darkMode ? "bg-[#18222B] border-[#2B3946]" : "bg-white border-[#E9E2D8]"}`}>
          <div className="w-full lg:w-[55%]">
            <h2 className="font-heading text-3xl lg:text-4xl font-bold">Hãy đăng ký tài khoản để trải nghiệm trọn vẹn đặc quyền xanh</h2>
            <p className="font-body text-xs tracking-[0.15em] text-[#6BA37A] uppercase font-bold mt-2 mb-6">Trở thành một phần của hệ sinh thái thời trang tuần hoàn thông minh</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {privileges.map((item: PrivilegeItem, idx: number) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${darkMode ? "bg-[#162721] border-[#254236] text-emerald-400" : "bg-[#FAF8F3] border-[#E9E2D8] text-[#183A2D]"}`}>{item.icon}</div>
                  <div>
                    <h4 className="font-body text-xs font-bold uppercase tracking-wider">{item.title}</h4>
                    <p className="font-body text-xs text-gray-400 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className={`w-full lg:w-[38%] border p-8 rounded-3xl text-center flex flex-col items-center ${darkMode ? "bg-[#1C2834] border-[#2B3946]" : "bg-[#FAF8F3] border-[#E9E2D8]"}`}>
            <div className="w-12 h-12 rounded-full bg-[#EAEFEA] border border-[#C8DCC8] flex items-center justify-center mb-4"><Zap size={20} className="text-[#1B5E20]" /></div>
            <h3 className="font-heading text-2xl font-bold">Kích Hoạt Tài Khoản</h3>
            <p className="font-body text-xs text-gray-400 mt-2 mb-6 leading-relaxed">Chỉ mất 30 giây để thiết lập tủ đồ xanh của riêng bạn trên ứng dụng.</p>
            {/* 🟢 Nút bấm mở tủ đồ xanh bốc trực tiếp lệnh từ Context tổng thông mạch */}
            <button onClick={() => handleFeatureRequirement("Mở tủ đồ xanh")} className={`w-full font-body text-xs font-bold uppercase tracking-widest py-4 rounded-full shadow-md transition ${darkMode ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-[#183A2D] text-white hover:bg-[#23452F]"}`}>Đăng ký thành viên ngay</button>
          </div>
        </div>
      </section>

      <AiStylistChat darkMode={darkMode} />

    </main>
  );
}