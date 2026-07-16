"use client";

import { useState, useEffect, useRef } from "react";
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
  album: string[];
  createdAt: string;
}

interface OccasionItem { name: string; label: string; img: string; }
interface ServiceItem { tag: string; icon: any; title: string; desc: string; btn: string; href: string; isModal?: boolean; }
interface PrivilegeItem { icon: any; title: string; desc: string; }

// 📈 PHÂN ĐOẠN 1 (TIẾP) — BỘ ĐẾM SỐ ESG CHẠY KHI CUỘN TỚI
function CountUpNumber({ target, suffix = "", duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasRun) {
        setHasRun(true);
        const start = performance.now();
        const animate = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          setCount(Math.floor(progress * target));
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }
    }, { threshold: 0.4 });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasRun, target, duration]);

  return <span ref={ref}>{count.toLocaleString("vi-VN")}{suffix}</span>;
}

// 🎀 DẢI LỤA TRẮNG & CỤM NƠ PHẤT PHƠ NỀN NGHỆ THUẬT
const SilkRibbonBackground = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
    <svg className="absolute w-full h-full opacity-[0.14] animate-silk-wave" viewBox="0 0 1440 600" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M-100 200 C 250 80, 550 420, 950 250 C 1150 140, 1350 360, 1600 300" stroke="white" strokeWidth="6" strokeLinecap="round" strokeDasharray="12 18" />
      <path d="M-100 215 C 240 95, 540 435, 940 265 C 1140 155, 1340 375, 1590 315" stroke="white" strokeWidth="2" />
      
      {/* Cụm nơ đính dọc theo khúc uốn lượn */}
      <g transform="translate(400, 260) scale(1.3)">
        <path d="M0 0 C -18 -18, -28 5, 0 5 C 28 5, 18 -18, 0 0 Z" fill="white" />
        <path d="M0 0 C -28 5, -18 -18, 0 -18 C 18 -18, 28 5, 0 0 Z" fill="white" />
        <path d="M0 0 L -12 24" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M0 0 L 12 26" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <circle cx="0" cy="0" r="3.5" fill="#183A2D" />
      </g>

      <g transform="translate(1020, 210) scale(1)">
        <path d="M0 0 C -15 -15, -25 5, 0 5 C 25 5, 15 -15, 0 0 Z" fill="white" />
        <path d="M0 0 C -25 5, -15 -15, 0 -15 C 15 -15, 25 5, 0 0 Z" fill="white" />
        <path d="M0 0 L -8 18" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M0 0 L 8 20" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="0" cy="0" r="2.5" fill="#183A2D" />
      </g>
    </svg>
  </div>
);

export default function Home() {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const { handleFeatureRequirement } = useAuthModal();

  const [products, setProducts] = useState<Product[]>([]);
  const [rentalProducts, setRentalProducts] = useState<Product[]>([]);
  const [saleProducts, setSaleProducts] = useState<Product[]>([]);
  const [recentBlogs, setRecentStories] = useState<BlogPreview[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(true);

  // 🎲 STATE "LẮC TỦ ĐỒ AI"
  const [randomPick, setRandomPick] = useState<Product | null>(null);

  // 🏆 STATE "TOP TỦ ĐỒ UY TÍN" (Lọc theo rating Review)
  const [topClosets, setTopClosets] = useState<any[]>([]);

  // 🏛️ DANH MỤC PHÂN LOẠI THEO DỊP: Đã bổ sung Lễ hội & Công sở đầy đủ
  const [occasions, setOccasions] = useState<OccasionItem[]>([
    { name: "All", label: "Tất cả đồ", img: "" },
    { name: "Tiệc cưới", label: "Tiệc cưới", img: "" },
    { name: "Dạ hội", label: "Dạ hội", img: "" },
    { name: "Dạo phố", label: "Dạo phố", img: "" },
    { name: "Áo dài", label: "Áo dài", img: "" },
    { name: "Đi biển", label: "Đi biển", img: "" },
    { name: "Kỷ yếu", label: "Kỷ yếu", img: "" },
    { name: "Lễ hội", label: "Lễ hội", img: "" },
    { name: "Công sở", label: "Công sở", img: "" }
  ]);

  // 🟢 PHÂN ĐOẠN 2 — KHỐI 5 DỊCH VỤ CỐT LÕI
  const services: ServiceItem[] = [
    { tag: "01", icon: ShoppingBag, title: "THUÊ ĐỒ", desc: "Thuê phục trang theo nhu cầu thực tế, tối ưu chi phí tiêu dùng.", btn: "Khám phá ngay →", href: "/shop?type=rent" },
    { tag: "02", icon: Handshake, title: "CHO THUÊ ĐỒ", desc: "Chia sẻ tủ quần áo nhàn rỗi của bạn, tạo nguồn thu nhập xanh ổn định.", btn: "Đăng cho thuê →", href: "/my-closet/create?mode=rent" },
    { tag: "03", icon: RefreshCw, title: "MUA SẮM", desc: "Sở hữu sản phẩm thời trang second-hand tuyển chọn, chất lượng cao.", btn: "Mua sắm ngay →", href: "/shop?type=sell" },
    { tag: "04", icon: Layers, title: "CHUYỂN NHƯỢNG & KÝ GỬI", desc: "Ủy thác tủ đồ cũ để bán đứt hoặc phối hợp vận hành tuần hoàn.", btn: "Ký gửi ngay →", href: "/my-closet/create?mode=consign" },
    { tag: "05", icon: Leaf, title: "TÁI CHẾ", desc: "Gửi quần áo cũ hỏng cho xưởng Upcycle để thiết kế và tái sinh vòng đời.", btn: "Tìm hiểu ngay →", href: "#", isModal: true }
  ];

  // 📊 SỐ LIỆU ĐÀI ESG ĐÃ TÁCH BIỆT TRƯỜNG DỮ LIỆU ĐỂ CHẠY ĐẾM SỐ
  const statsData = [
    { num: 2000, suffix: "+", label: "Sản phẩm", icon: Shirt },
    { num: 1000, suffix: "+", label: "Người dùng", icon: Users },
    { num: 12500, suffix: " kg", label: "CO₂ đã giảm", icon: Leaf },
    { num: 5000000, suffix: " lít", label: "Nước tiết kiệm", icon: Sparkles }
  ];

  const privileges: PrivilegeItem[] = [
    { icon: <Gift size={18} />, title: "Tặng Ngay 100 Green Points", desc: "Tích lũy điểm thưởng sau mỗi lần thuê hoặc tái chế đồ để đổi voucher ưu đãi." },
    { icon: <Sparkles size={18} />, title: "Trợ Lý Phối Đồ AI Stylist", desc: "Mở khóa tính năng AI tự động gợi ý phụ kiện, túi xách phù hợp với từng outfit." },
    { icon: <ShieldCheck size={18} />, title: "Mở Gian Hàng Tự Quản", desc: "Bất kỳ cá nhân nào cũng có thể đăng bài kinh doanh, chia sẻ tủ đồ tăng thu nhập." },
    { icon: <Heart size={18} />, title: "Kết Nối Xưởng Upcycle", desc: "Gửi yêu cầu thiết kế và sửa đổi quần áo cũ trực tiếp đến các đối tác tái chế." }
  ];

  // 📡 TRUY XUẤT DỮ LIỆU SẢN PHẨM & ALBUM NHẬT KÝ LƯU BÚT ĐỘNG
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
              location: item.province || "Hà Nội", 
              rating: "5.0",   
              condition: item.condition === "GOOD" ? "Mới 95%" : "Mới 98%",
              size: item.size || "M",
              brand: item.brand || "Thiết kế Việt",
              ownerName: item.owner_name || item.ownerName || "Ẩn danh",
              userId: item.userId || "anonymous-user",
              storeRetailPrice,
              savedPercentage,
              occasion: item.occasion || "Dạo phố"
            };
          }).filter(Boolean) as Product[];

          setProducts(mappedProducts);
          setRentalProducts(mappedProducts.filter(p => p.type === "Thuê"));
          setSaleProducts(mappedProducts.filter(p => p.type === "Mua sắm"));

          // Cập nhật ảnh đại diện cho dịp bằng ảnh thực tế từ database
          setOccasions(prev => prev.map(occ => {
            if (occ.name === "All") return occ;
            const matchProd = mappedProducts.find(p => p.occasion === occ.name);
            return { ...occ, img: matchProd ? matchProd.image : "" };
          }));
        }

        // PHÂN ĐOẠN 5 — TRUY VẤN BLOG POST KÈM ALBUM ẢNH GHÉP
        const { data: blogData } = await supabase
          .from("BlogPost")
          .select("*")
          .filter("status", "neq", "HIDDEN")
          .order("isPinned", { ascending: false })
          .order("createdAt", { ascending: false })
          .limit(3);

        if (blogData) {
          const productIds = blogData.map((b: any) => b.productId).filter(Boolean);
          const { data: imagesData } = await supabase.from("ProductImage").select("*").in("productId", productIds);

          const mappedBlogs = blogData.map((b: any) => {
            const imgs = (imagesData || [])
              .filter((img: any) => img.productId === b.productId)
              .map((img: any) => img.url);

            return {
              id: b.id,
              title: b.title,
              content: b.content,
              coverImage: b.coverImage || b.cover_image || PLACEHOLDER_IMG,
              album: imgs.length > 0 ? imgs : [b.coverImage || b.cover_image || PLACEHOLDER_IMG],
              createdAt: b.createdAt
            };
          });
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

  // 🏆 TRUY TRÌNH "TOP TỦ ĐỒ UY TÍN" (Rating-based ranking)
  useEffect(() => {
    async function fetchTopClosets() {
      try {
        const { data: reviewsData } = await supabase.from("Review").select("*").eq("type", "RENTER_TO_OWNER");
        if (!reviewsData || reviewsData.length === 0) {
          setTopClosets([]);
          return;
        }

        const grouped: Record<string, number[]> = {};
        reviewsData.forEach((r: any) => {
          if (!grouped[r.revieweeId]) grouped[r.revieweeId] = [];
          grouped[r.revieweeId].push(r.rating);
        });

        const ranked = Object.entries(grouped)
          .map(([userId, ratings]) => ({
            userId,
            avgRating: ratings.reduce((a, b) => a + b, 0) / ratings.length,
            reviewCount: ratings.length
          }))
          .filter((r) => r.reviewCount >= 1)
          .sort((a, b) => b.avgRating - a.avgRating)
          .slice(0, 8);

        if (ranked.length === 0) {
          setTopClosets([]);
          return;
        }

        const userIds = ranked.map((r) => r.userId);
        const { data: usersData } = await supabase.from("User").select("id, name, avatar").in("id", userIds);

        const merged = ranked.map((r) => {
          const u = (usersData || []).find((u: any) => u.id === r.userId);
          return {
            ...r,
            name: u?.name || "Thành viên CLOOP",
            avatar: u?.avatar || null
          };
        });

        setTopClosets(merged);
      } catch (err) {
        console.error("❌ Lỗi tải danh sách Top Tủ Đồ Uy Tín:", err);
      }
    }
    fetchTopClosets();
  }, []);

  // 🎲 HÀM CHỌN LẮC NGẪU NHIÊN 1 BỘ ĐỒ TRONG DATABASE
  const handleShuffle = () => {
    if (products.length === 0) return;
    const random = products[Math.floor(Math.random() * products.length)];
    setRandomPick(random);
  };

  return (
    <main className="min-h-screen overflow-x-hidden antialiased relative bg-[#FAF9F6] text-stone-900 font-body selection:bg-[#183A2D] selection:text-white">
      
      {/* 🔐 NHÚNG PHÔNG CHỮ CHUẨN THIẾT KẾ CỦA TRANG CHỦ */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;1,400&display=swap" />
      
      <style>{`
        html { scroll-behavior: smooth; }
        .font-heading { font-family: 'Outfit', sans-serif; }
        .font-body { font-family: 'Inter', sans-serif; }
        .font-diary { font-family: 'Playfair Display', serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes wave {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1.2deg); }
        }
        .animate-silk-wave {
          animation: wave 12s ease-in-out infinite;
        }
        @keyframes gradient-xy {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-xy {
          background-size: 400% 400%;
          animation: gradient-xy 3s ease infinite;
        }
      `}</style>

      {/* 🟢 PHÂN ĐOẠN 1: HERO SECTION - EDITORIAL LUXURY MẠNG XÃ HỘI */}
      <section className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-12 pt-8 pb-4">
        <div className="bg-[#183A2D] text-[#FAF9F6] rounded-[2.5rem] p-8 lg:p-16 flex flex-col lg:flex-row items-center justify-between gap-12 relative overflow-hidden shadow-sm">
          
          {/* NỀN LỤA TRẮNG & NƠ PHẤT PHƠ GIÚP EDITORIAL VIBE LÊN HẲN */}
          <SilkRibbonBackground />
          <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#FAF9F6_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
          
          <div className="w-full lg:w-[52%] space-y-6 text-left relative z-10">
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase text-emerald-300 font-heading">
              <Sparkles size={10} className="fill-emerald-300" />
              <span>Nền tảng số tuần hoàn Việt Nam</span>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.12] tracking-tight text-white">
              Mặc đẹp hơn. Tiêu ít hơn. <br />
              <span className="text-emerald-400">Sống xanh cùng CLOOP.</span>
            </h1>

            <p className="font-body text-xs sm:text-sm text-stone-300 max-w-md leading-relaxed font-normal opacity-90">
              CLOOP – Nền tảng thời trang tuần hoàn tiên phong. Trải nghiệm giải pháp thuê, cho thuê, ký gửi và tái chế thông minh để định hình phong cách tiêu dùng hiện đại và bền vững.
            </p>

            <div className="pt-2">
              <Link href="/shop" className="inline-block bg-[#FAF9F6] hover:bg-stone-100 text-[#183A2D] text-xs font-bold uppercase tracking-wider px-8 py-4 rounded-full transition-all shadow-sm active:scale-95 font-heading">
                Khám phá ngay →
              </Link>
            </div>
          </div>

          {/* Sửa Khung ảnh: h-[420px] cố định cho ảnh nằm ngang cực thoáng */}
          <div className="w-full lg:w-[42%] h-[420px] bg-stone-900/10 rounded-[2rem] overflow-hidden relative border-4 border-white/10 shadow-2xl group">
            <Image 
              src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800" 
              alt="CLOOP Campaign Dynamic Asset" 
              fill priority unoptimized
              className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#183A2D]/50 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-6 left-6 text-left">
              <span className="text-[9px] uppercase tracking-widest font-bold font-heading bg-white/20 backdrop-blur-md px-2.5 py-1 rounded text-white tracking-wider">CLOOP Eco Campaign</span>
            </div>
          </div>
        </div>
      </section>

      {/* 🟢 PHÂN ĐOẠN 1 (TIẾP) — KHỐI CHỈ SỐ ESG KHUNG TO NỔI BẬT */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 items-center">
          {statsData.map((item, idx) => {
            const StatIcon = item.icon;
            return (
              <div key={idx} className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-stone-200/40 text-left shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#183A2D] flex items-center justify-center shrink-0">
                  <StatIcon size={18} />
                </div>
                <div>
                  <div className="font-heading text-2xl font-black text-stone-900 leading-none">
                    <CountUpNumber target={item.num} suffix={item.suffix} />
                  </div>
                  <div className="font-heading text-[10px] text-stone-400 font-bold uppercase tracking-wider mt-1.5">{item.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 🟢 PHÂN ĐOẠN 2 — KHỐI 5 DỊCH VỤ CỐT LÕI */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {services.map((srv, i) => {
            const ServiceIcon = srv.icon;
            return (
              <Link href={srv.href} key={i} className="block h-full">
                <motion.div 
                  whileHover={{ y: -6, boxShadow: "0px 12px 30px rgba(24,58,45,0.04)" }} 
                  onClick={(e) => { if(srv.isModal) { e.preventDefault(); handleFeatureRequirement(srv.title); } }} 
                  className="border border-stone-200 bg-white p-6 xl:p-8 rounded-3xl flex flex-col justify-between transition-all duration-300 relative group cursor-pointer text-left h-full"
                >
                  <span className="absolute top-4 right-5 font-heading text-xs text-stone-300 font-bold tracking-wider">{srv.tag}</span>
                  <div>
                    <div className="w-11 h-11 rounded-xl border border-stone-100 bg-[#FAF9F6] text-[#183A2D] flex items-center justify-center mb-5 group-hover:bg-[#183A2D] group-hover:text-white transition-colors duration-300">
                      <ServiceIcon size={16} />
                    </div>
                    <h3 className="font-heading text-xs font-bold uppercase tracking-wider mb-1.5 text-stone-900">{srv.title}</h3>
                    <p className="font-body text-[11px] text-stone-400 leading-relaxed mb-6 line-clamp-3">{srv.desc}</p>
                  </div>
                  <span className="font-heading text-[10px] font-bold uppercase tracking-wider text-left border-t border-stone-100 pt-4 block text-[#183A2D] group-hover:text-[#6BA37A] transition-colors">
                    {srv.btn}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 🎯 PHÂN ĐOẠN 3 — TÌM KIẾM THEO DỊP - CẬP NHẬT 9 Ô TRÒN CHUẨN ĐỒNG BỘ */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-8 space-y-6">
        <div className="text-left space-y-1">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">Tìm kiếm theo dịp mặc đồ</h2>
          <p className="font-body text-stone-400 text-xs font-medium">Lựa chọn trang phục hài hòa cùng điểm đến để mọi trải nghiệm thêm phần trọn vẹn.</p>
        </div>

        {/* Đã chuyển class thành lg:grid-cols-9 để dàn 9 ô thẳng tắp cực kì sang xịn */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-6 justify-items-center">
          {occasions.map((occ) => (
            <Link 
              href={occ.name === "All" ? "/shop" : `/shop?occasion=${occ.name}`}
              key={occ.name}
              className="group flex flex-col items-center space-y-3 cursor-pointer w-full"
            >
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-white border-2 border-stone-200 p-1.5 shadow-2xs transition-transform duration-300 group-hover:scale-105 group-hover:border-[#183A2D] relative flex items-center justify-center">
                {occ.img ? (
                  <img src={occ.img} alt={occ.label} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-stone-100 text-stone-400 font-heading font-black text-xs uppercase rounded-full tracking-wider">
                    {occ.name.slice(0, 3)}
                  </div>
                )}
              </div>
              <div className="font-heading text-[12px] font-bold text-stone-700 group-hover:text-[#183A2D] transition-colors truncate max-w-full px-1">{occ.label}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* 👗 PHÂN ĐOẠN 4 — HỆ THỐNG KỆ ĐỒ SONG HÀNH VÀ TOP TỦ ĐỒ UY TÍN */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-8 space-y-14">
        
        {/* 🏆 TOP TỦ ĐỒ UY TÍN (Xếp hạng theo Review RENTER_TO_OWNER) */}
        {topClosets.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 border-b border-stone-200/60 pb-2 text-left">
              <Sparkles size={16} className="text-amber-500 fill-amber-500" />
              <h3 className="font-heading text-sm font-black text-stone-800 uppercase tracking-wider">Top Tủ Đồ Uy Tín</h3>
            </div>
            <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
              {topClosets.map((c) => (
                <Link href={`/closet/${c.userId}`} key={c.userId} className="flex flex-col items-center gap-2 shrink-0 w-24 group">
                  <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-emerald-400 via-amber-300 to-pink-400 animate-gradient-xy group-hover:scale-105 transition-all duration-300">
                    <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-stone-100 flex items-center justify-center">
                      {c.avatar ? (
                        <img src={c.avatar} className="w-full h-full object-cover" alt={c.name} />
                      ) : (
                        <span className="text-stone-400 font-bold text-sm">{c.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-stone-700 truncate w-full text-center">@{c.name}</span>
                  <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">★ {c.avgRating.toFixed(1)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* TẦNG 1: TỦ ĐỒ CHO THUÊ TUẦN HOÀN */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
            <h3 className="font-heading text-lg font-bold text-[#183A2D] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block animate-pulse" />
              <span>Tủ đồ cho thuê tuần hoàn</span>
            </h3>
            <Link href="/shop?type=rent" className="font-heading text-[11px] font-bold uppercase tracking-wider text-stone-400 hover:text-[#183A2D] transition-colors">
              Xem tất cả đồ thuê →
            </Link>
          </div>

          <div className="overflow-x-auto no-scrollbar flex gap-6 pb-4 pt-1 snap-x">
            {productsLoading ? (
              [1, 2, 3, 4].map((n) => (
                <div key={n} className="w-[280px] aspect-[3/4] bg-stone-200/40 rounded-2xl animate-pulse shrink-0" />
              ))
            ) : rentalProducts.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 pl-2">Kho lưu trữ trang phục cho thuê tạm thời đang cập nhật sản phẩm mới.</p>
            ) : (
              rentalProducts.slice(0, 8).map((item) => (
                <div key={item.id} className="w-[260px] shrink-0 snap-start group flex flex-col space-y-3 relative text-left">
                  <div className="w-full aspect-[3/4] bg-stone-50 rounded-2xl overflow-hidden relative border border-stone-200/30 shadow-3xs">
                    <Image src={item.image} alt={item.title} fill unoptimized className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]" />
                    <button className="absolute top-3 right-3 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-stone-600 hover:text-red-500 transition-colors cursor-pointer z-10">
                      <Heart size={11} strokeWidth={2.5} />
                    </button>
                    <div className="absolute top-3 left-3 bg-[#183A2D] text-[8px] font-bold font-heading text-white px-2 py-0.5 rounded shadow-xs uppercase tracking-wider z-10">
                      RENTAL
                    </div>
                    <div className="absolute top-3 right-12 bg-red-500 text-[10px] font-bold font-heading text-white px-2 py-0.5 rounded shadow-sm z-10 font-mono">
                      -{item.savedPercentage}%
                    </div>
                    <div className="absolute bottom-3 left-3 bg-stone-900/70 backdrop-blur-md text-[9px] font-bold font-heading text-white px-2 py-0.5 rounded-md tracking-wider">
                      SIZE {item.size}
                    </div>
                  </div>

                  <div className="space-y-0.5 px-0.5">
                    <div className="flex items-center justify-between text-[9px] font-bold text-stone-400 uppercase tracking-wider font-heading">
                      <Link href={`/closet/${item.userId}`} className="hover:text-[#183A2D] underline decoration-stone-200/60 z-10 relative font-semibold">
                        @{item.ownerName}
                      </Link>
                      <span className="flex items-center gap-0.5 font-medium text-stone-400">
                        <MapPin size={8} className="text-[#6BA37A]" /> {item.location}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-stone-900 line-clamp-1 group-hover:text-[#183A2D] transition-colors tracking-tight font-heading">{item.title}</h4>
                    
                    <div className="pt-1.5 flex items-baseline justify-between border-t border-dashed border-stone-200 mt-1 font-heading">
                      <div>
                        <span className="text-[8px] font-bold text-stone-400 uppercase block">Giá thuê</span>
                        <p className="text-xs font-black text-[#183A2D] font-mono mt-0.5">{item.rawPriceText}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-bold text-stone-400 uppercase block">Giá mua mới</span>
                        <p className="text-[10px] font-semibold text-stone-400 line-through font-mono">{item.storeRetailPrice.toLocaleString()}đ</p>
                      </div>
                    </div>
                  </div>
                  <Link href={`/product/${item.id}`} className="absolute inset-0 z-0"><span className="sr-only">Xem chi tiết {item.title}</span></Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* TẦNG 2: KỆ THANH LÝ PHỤC TRANG MUA ĐỨT */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
            <h3 className="font-heading text-lg font-bold text-[#183A2D] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block animate-pulse" />
              <span>Kệ thanh lý phục trang</span>
            </h3>
            <Link href="/shop?type=sell" className="font-heading text-[11px] font-bold uppercase tracking-wider text-stone-400 hover:text-[#183A2D] transition-colors">
              Xem tất cả đồ mua đứt →
            </Link>
          </div>

          <div className="overflow-x-auto no-scrollbar flex gap-6 pb-4 pt-1 snap-x">
            {productsLoading ? (
              [1, 2, 3, 4].map((n) => (
                <div key={n} className="w-[280px] aspect-[3/4] bg-stone-200/40 rounded-2xl animate-pulse shrink-0" />
              ))
            ) : saleProducts.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 pl-2">Kho lưu trữ trang phục mua đứt hiện đang chờ bài đăng thanh lý.</p>
            ) : (
              saleProducts.slice(0, 8).map((item) => (
                <div key={item.id} className="w-[260px] shrink-0 snap-start group flex flex-col space-y-3 relative text-left">
                  <div className="w-full aspect-[3/4] bg-stone-50 rounded-2xl overflow-hidden relative border border-stone-200/30 shadow-3xs">
                    <Image src={item.image} alt={item.title} fill unoptimized className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]" />
                    <button className="absolute top-3 right-3 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-stone-600 hover:text-red-500 transition-colors cursor-pointer z-10">
                      <Heart size={11} strokeWidth={2.5} />
                    </button>
                    <div className="absolute top-3 left-3 bg-blue-700 text-[8px] font-bold font-heading text-white px-2 py-0.5 rounded shadow-xs uppercase tracking-wider z-10">
                      BUY OUT
                    </div>
                    <div className="absolute top-3 right-12 bg-stone-900/80 text-[10px] font-bold font-heading text-white px-2 py-0.5 rounded shadow-sm z-10 font-mono">
                      -{item.savedPercentage}%
                    </div>
                    <div className="absolute bottom-3 left-3 bg-stone-900/70 backdrop-blur-md text-[9px] font-bold font-heading text-white px-2 py-0.5 rounded-md tracking-wider">
                      SIZE {item.size}
                    </div>
                  </div>

                  <div className="space-y-0.5 px-0.5">
                    <div className="flex items-center justify-between text-[9px] font-bold text-stone-400 uppercase tracking-wider font-heading">
                      <Link href={`/closet/${item.userId}`} className="hover:text-[#183A2D] underline decoration-stone-200/60 z-10 relative font-semibold">
                        @{item.ownerName}
                      </Link>
                      <span className="flex items-center gap-0.5 font-medium text-stone-400">
                        <MapPin size={8} className="text-[#6BA37A]" /> {item.location}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-stone-900 line-clamp-1 group-hover:text-[#183A2D] transition-colors tracking-tight font-heading">{item.title}</h4>
                    
                    <div className="pt-1.5 flex items-baseline justify-between border-t border-dashed border-stone-200 mt-1 font-heading">
                      <div>
                        <span className="text-[8px] font-bold text-stone-400 uppercase block">Giá mua đứt</span>
                        <p className="text-xs font-black text-[#183A2D] font-mono mt-0.5">{item.rawPriceText}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-bold text-stone-400 uppercase block">Giá gốc Store</span>
                        <p className="text-[10px] font-semibold text-stone-400 line-through font-mono">{item.storeRetailPrice.toLocaleString()}đ</p>
                      </div>
                    </div>
                  </div>
                  <Link href={`/product/${item.id}`} className="absolute inset-0 z-0"><span className="sr-only">Xem chi tiết {item.title}</span></Link>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 📔 PHÂN ĐOẠN 5 — GÓC NHẬT KÝ LƯU BÚT HOÀI NIỆM (SCRAPBOOK GALLERY) */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-12 space-y-8">
        <div className="bg-white border-2 border-stone-900/5 p-6 sm:p-10 rounded-[2.5rem] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xs text-left relative overflow-hidden">
          <div className="space-y-1.5 max-w-2xl relative z-10">
            <span className="text-[9px] font-bold font-heading uppercase tracking-widest bg-pink-50 text-pink-600 px-3 py-1 rounded-md inline-block">Hồi Âm Phục Trang</span>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight flex items-center gap-1.5">
              <BookOpen size={20} className="text-stone-700" />
              <span>Góc lưu bút nhật ký kỷ niệm phục trang</span>
            </h2>
            <p className="font-body text-stone-400 text-xs leading-relaxed font-normal opacity-90">
              Mỗi trang phục cũ đều ôm giữ những hồi ức thanh xuân dạt dào cảm xúc. Hệ thống sẽ chọn lọc phê duyệt ghim những phản hồi ấm áp nhất lên cuốn sổ lưu bút chung của CLOOP.
            </p>
          </div>

          <Link href="/blog" className="shrink-0 w-full md:w-auto relative z-10">
            <button className="w-full md:w-auto bg-stone-900 hover:bg-pink-600 text-[#FAF9F6] text-[11px] font-bold font-heading uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95">
              Mở cuốn sổ nhật ký lớn →
            </button>
          </Link>
        </div>

        {recentBlogs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
            {recentBlogs.map((story, idx) => (
              <div key={story.id} className="bg-white p-6 rounded-[2rem] border-2 border-stone-100 flex flex-col space-y-5 shadow-3xs text-left relative overflow-hidden group">
                <div className="absolute top-3.5 right-4 z-20 flex items-center gap-0.5 text-amber-600 bg-amber-50 font-heading font-bold text-[8px] tracking-widest px-2 py-0.5 rounded-sm">
                  <Pin size={8} className="rotate-45 fill-amber-500" />
                  <span>PINNED STORY</span>
                </div>

                {/* KHUNG GHÉP NHIỀU ẢNH (ALBUM GRID) */}
                <div className={`w-full aspect-[4/3] bg-stone-100 rounded-xl overflow-hidden border-4 border-stone-50 shadow-md relative transition-all duration-500 grid
                  ${story.album.length > 1 ? "grid-cols-2 gap-0.5" : "grid-cols-1"}
                  ${idx % 2 === 0 ? "rotate-[-2.5deg] group-hover:rotate-0" : "rotate-[2.5deg] group-hover:rotate-0"}`}>
                  
                  {story.album.slice(0, 4).map((url: string, i: number) => (
                    <img key={i} src={url} className="w-full h-full object-cover" alt={story.title} />
                  ))}

                  {/* Băng dính mờ retro */}
                  <div className="absolute -top-1 left-1/3 w-16 h-5 bg-pink-100/50 rotate-[-12deg] border-l border-r border-dashed border-pink-200/40 select-none pointer-events-none backdrop-blur-[1px]" />
                </div>

                <div className="space-y-2 flex-1 flex flex-col justify-between pt-1">
                  <div className="space-y-1">
                    <span className="text-[8px] font-mono font-bold text-stone-400 uppercase tracking-widest block font-heading">
                      Page #0{idx + 1} • {new Date(story.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                    <h4 className="text-sm font-bold text-stone-900 font-heading line-clamp-1 group-hover:text-pink-600 transition-colors">
                      {story.title}
                    </h4>
                  </div>
                  {/* Trích dẫn phông Playfair lãng mạn */}
                  <p className="text-[12px] text-stone-600 h-24 font-diary italic leading-relaxed text-justify bg-[#FCFAF5] p-4 rounded-xl border border-stone-200/40 tracking-wide line-clamp-4 shadow-inner">
                    "{story.content}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-stone-400 text-center py-6">Cuốn sổ nhật ký hiện chưa dán bài ghim truyền cảm hứng nào.</p>
        )}
      </section>

      {/* 🌿 PHÂN ĐOẠN 6 — ĐẶC QUYỀN THÀNH VIÊN */}
      <section id="register-privilege" className="max-w-[1500px] mx-auto px-6 lg:px-12 py-10 border-t border-stone-200/60 text-left relative z-10">
        <div className="border border-stone-200 bg-white rounded-[2.5rem] p-8 lg:p-12 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="w-full lg:w-[55%]">
            <h2 className="font-heading text-3xl font-bold text-stone-900">Hãy đăng ký tài khoản để trải nghiệm trọn vẹn đặc quyền xanh</h2>
            <p className="font-heading text-xs tracking-[0.15em] text-[#6BA37A] uppercase font-bold mt-2 mb-6">Trở thành một phần của hệ sinh thái thời trang tuần hoàn thông minh</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {privileges.map((item: any, idx: number) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-xl border border-stone-200 bg-[#FAF8F3] text-[#183A2D] flex items-center justify-center shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-stone-900">{item.title}</h4>
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
            
            <button onClick={() => handleFeatureRequirement("Mở tủ đồ xanh")} className="w-full font-heading text-xs font-black uppercase tracking-widest py-4 rounded-full shadow-md bg-[#183A2D] text-white hover:bg-emerald-800 transition active:scale-[0.98] cursor-pointer">
              Đăng ký thành viên ngay
            </button>
          </div>
        </div>
      </section>

      {/* 🎲 TÍNH NĂNG MỚI B: TRẠM QUẸT ĐỒ NGẪU NHIÊN (LẮC TỦ ĐỒ AI) */}
      <button 
        onClick={handleShuffle} 
        className="fixed bottom-24 right-6 z-40 bg-[#183A2D] border border-emerald-400/20 text-white rounded-full px-5 py-3.5 shadow-lg text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition active:scale-95 cursor-pointer hover:bg-emerald-950"
      >
        <Zap size={13} className="text-emerald-400 animate-pulse" />
        <span>🎲 Lắc tủ đồ AI</span>
      </button>

      {/* MODAL HIỂN THỊ KẾT QUẢ "LẮC" */}
      <AnimatePresence>
        {randomPick && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setRandomPick(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[2rem] max-w-sm w-full overflow-hidden p-6 relative border border-stone-100 shadow-2xl flex flex-col space-y-4" 
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setRandomPick(null)}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 cursor-pointer z-10"
              >
                <X size={14} />
              </button>

              <div className="text-center">
                <span className="text-[9px] font-bold font-heading uppercase tracking-widest text-pink-600 bg-pink-50 px-2.5 py-1 rounded-md inline-block">Món đồ định mệnh 🔮</span>
                <h3 className="font-heading text-lg font-bold text-stone-900 mt-1">Lắc Tủ Đồ May Mắn</h3>
              </div>

              <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border border-stone-200/30">
                <Image src={randomPick.image} alt={randomPick.title} fill unoptimized className="object-cover" />
                <div className="absolute top-3 left-3 bg-[#183A2D] text-[8px] font-bold font-heading text-white px-2 py-0.5 rounded shadow-xs uppercase tracking-wider">
                  {randomPick.type}
                </div>
                <div className="absolute top-3 right-3 bg-red-500 text-[10px] font-bold font-heading text-white px-2 py-0.5 rounded shadow-sm font-mono">
                  -{randomPick.savedPercentage}%
                </div>
                <div className="absolute bottom-3 left-3 bg-stone-900/70 backdrop-blur-md text-[9px] font-bold font-heading text-white px-2 py-0.5 rounded-md">
                  SIZE {randomPick.size}
                </div>
              </div>

              <div className="space-y-1 text-left">
                <div className="flex justify-between items-center text-[9px] text-stone-400 font-bold font-heading uppercase tracking-wider">
                  <span>@{randomPick.ownerName}</span>
                  <span className="flex items-center gap-0.5"><MapPin size={8} className="text-[#6BA37A]" /> {randomPick.location}</span>
                </div>
                <h4 className="font-heading text-sm font-bold text-stone-900 line-clamp-1">{randomPick.title}</h4>
                
                <div className="pt-2 flex items-center justify-between border-t border-dashed border-stone-200 mt-1">
                  <div>
                    <span className="text-[8px] font-bold text-stone-400 uppercase font-heading block">Đóng góp</span>
                    <p className="text-xs font-black text-[#183A2D] font-mono">{randomPick.rawPriceText}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-bold text-stone-400 uppercase font-heading block">Giá trị gốc</span>
                    <p className="text-[10px] font-semibold text-stone-400 line-through font-mono">{randomPick.storeRetailPrice.toLocaleString()}đ</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <Link href={`/product/${randomPick.id}`} className="block">
                  <button className="w-full bg-[#183A2D] text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-emerald-800 transition active:scale-95 cursor-pointer">
                    Xem chi tiết
                  </button>
                </Link>
                <button 
                  onClick={handleShuffle}
                  className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold uppercase tracking-wider py-3.5 rounded-xl transition cursor-pointer border border-stone-200"
                >
                  Lắc Lại 🎲
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AiStylistChat darkMode={darkMode} />
    </main>
  );
}