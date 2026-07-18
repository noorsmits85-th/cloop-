"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { 
  Search, ShoppingBag, ArrowRight, Sparkles, MapPin, 
  Layers, Star, Plus, Gift, ShieldCheck, Heart, Zap, Shield,
  Handshake, RefreshCw, Leaf, Users, Shirt, Sun, Moon, X, Pin, BookOpen,
  ChevronLeft, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import AiStylistChat from "./components/AiStylistChat"; 
import { useAuthModal } from "./AuthModalContext";
import KyUcTuanHoanSection from "./components/KyUcTuanHoanSection";

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
  authorName?: string;
  authorAvatar?: string;
}

interface OccasionItem { name: string; label: string; img: string; }
interface ServiceItem { tag: string; icon: any; title: string; desc: string; btn: string; href: string; isModal?: boolean; }

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
    }, { threshold: 0.2 });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasRun, target, duration]);

  return <span ref={ref} className="font-mono font-bold tracking-tight">{count.toLocaleString("vi-VN")}{suffix}</span>;
}

export default function Home() {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const { handleFeatureRequirement } = useAuthModal();

  const [products, setProducts] = useState<Product[]>([]);
  const [rentalProducts, setRentalProducts] = useState<Product[]>([]);
  const [saleProducts, setSaleProducts] = useState<Product[]>([]);
  const [recentBlogs, setRecentStories] = useState<BlogPreview[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(true);

  const [randomPick, setRandomPick] = useState<Product | null>(null);
  const [topClosets, setTopClosets] = useState<any[]>([]);

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

  const services: ServiceItem[] = [
    { tag: "01", icon: ShoppingBag, title: "THUÊ ĐỒ", desc: "Thuê phục trang theo nhu cầu thực tế, tối ưu chi phí.", btn: "Khám phá ngay", href: "/shop?type=rent" },
    { tag: "02", icon: Handshake, title: "CHO THUÊ ĐỒ", desc: "Chia sẻ tủ quần áo nhàn rỗi, tạo nguồn thu nhập xanh.", btn: "Đăng cho thuê", href: "/my-closet/create?mode=rent" },
    { tag: "03", icon: RefreshCw, title: "MUA SẮM", desc: "Sở hữu đồ hiệu second-hand tuyển chọn, chất lượng cao.", btn: "Mua sắm ngay", href: "/shop?type=sell" },
    { tag: "04", icon: Layers, title: "KÝ GỬI", desc: "Ủy thác tủ đồ cũ để bán đứt hoặc phối hợp vận hành.", btn: "Ký gửi ngay", href: "/my-closet/create?mode=consign" },
    { tag: "05", icon: Leaf, title: "TÁI CHẾ", desc: "Gửi quần áo cũ hỏng cho xưởng Upcycle để tái sinh.", btn: "Tìm hiểu ngay", href: "#", isModal: true }
  ];

  const privileges = [
    { icon: <Gift size={20} />, title: "Tặng 100 Green Points", desc: "Tích lũy điểm thưởng sau mỗi lần giao dịch để đổi voucher." },
    { icon: <Sparkles size={20} />, title: "Trợ Lý AI Stylist", desc: "AI tự động gợi ý phụ kiện, túi xách phù hợp với từng outfit." },
    { icon: <ShieldCheck size={20} />, title: "Gian Hàng Tự Quản", desc: "Đăng bài kinh doanh, chia sẻ tủ đồ và gia tăng thu nhập." },
    { icon: <Heart size={20} />, title: "Kết Nối Xưởng Upcycle", desc: "Gửi yêu cầu thiết kế lại quần áo cũ trực tiếp đến đối tác." }
  ];

  useEffect(() => {
    async function fetchRealMarketplaceData() {
      try {
        setProductsLoading(true);
        
        const { data: pData, error: pError } = await supabase.from("products").select("*").order("createdAt", { ascending: false });
        if (pError) throw pError;

        const { data: listingsData } = await supabase.from("Listing").select("*");
        const { data: imagesData } = await supabase.from("ProductImage").select("*");

        const productUserIds = [...new Set((pData || []).map((item: any) => item.userId || item.user_id).filter(Boolean))];
        let usersDataForProducts: any[] = [];
        
        if (productUserIds.length > 0) {
          const [res1, res2] = await Promise.all([
            supabase.from("User").select("id, name").in("id", productUserIds),
            supabase.from("users").select("id, name").in("id", productUserIds)
          ]);
          usersDataForProducts = [...(res1.data || []), ...(res2.data || [])];
        }

        if (pData) {
          const mappedRents: Product[] = [];
          const mappedSells: Product[] = [];

          pData.forEach((item: any) => {
            const listingsArr = (listingsData || []).filter((l: any) => l.productId === item.id);
            const imagesArr = (imagesData || []).filter((img: any) => img.productId === item.id);

            const rentListing = listingsArr.find((l: any) => l.listingType === "RENT" && l.status === "AVAILABLE");
            const sellListing = listingsArr.find((l: any) => (l.listingType === "SELL" || l.listingType === "SALE") && l.status === "AVAILABLE");

            const rentPrice = rentListing ? Number(rentListing.basePrice) : 0;
            const sellPrice = sellListing ? Number(sellListing.basePrice) : 0;
            const effectiveRentPrice = rentPrice || item.rental_price;

            const storeRetailPrice = item.original_price || item.originalPrice || 500000;

            let currentImage = PLACEHOLDER_IMG;
            if (imagesArr.length > 0) {
              currentImage = imagesArr[0].url || currentImage;
            } else if (item.image_url || item.imageUrl) {
              currentImage = item.image_url || item.imageUrl;
            }

            const uId = item.userId || item.user_id;
            const matchedUser = usersDataForProducts.find((u: any) => u.id === uId);

            const baseProduct = {
              id: item.id,
              image: currentImage, 
              title: item.title || item.name || "Trang phục CLOOP",
              location: item.province || "Nghệ An", 
              rating: "5.0",   
              condition: item.condition === "GOOD" ? "Mới 95%" : "Mới 98%",
              size: item.size || "M",
              brand: item.brand || "Thiết kế Việt",
              ownerName: matchedUser?.name || item.owner_name || item.ownerName || "Thành viên CLOOP",
              userId: uId || "anonymous-user",
              storeRetailPrice,
              occasion: item.occasion || "Dạo phố"
            };

            if (effectiveRentPrice > 0) {
              mappedRents.push({
                ...baseProduct,
                type: "Thuê",
                listingTypeRaw: "RENT",
                price: effectiveRentPrice,
                rawPriceText: `${effectiveRentPrice.toLocaleString()}đ / ngày`,
                savedPercentage: Math.round(((storeRetailPrice - effectiveRentPrice) / storeRetailPrice) * 100),
              });
            }

            if (sellPrice > 0) {
              mappedSells.push({
                ...baseProduct,
                type: "Mua sắm",
                listingTypeRaw: "SELL",
                price: sellPrice,
                rawPriceText: `${sellPrice.toLocaleString()}đ`,
                savedPercentage: Math.round(((storeRetailPrice - sellPrice) / storeRetailPrice) * 100),
              });
            }
          });

          const allUniqueProducts = [...mappedRents, ...mappedSells].filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i);

          setProducts(allUniqueProducts);
          setRentalProducts(mappedRents);
          setSaleProducts(mappedSells);

          setOccasions(prev => prev.map(occ => {
            if (occ.name === "All") return occ;
            const matchProd = allUniqueProducts.find(p => p.occasion === occ.name);
            return { ...occ, img: matchProd ? matchProd.image : "" };
          }));
        }

        const { data: blogData } = await supabase
          .from("BlogPost")
          .select("*")
          .filter("status", "neq", "HIDDEN")
          .order("isPinned", { ascending: false })
          .order("createdAt", { ascending: false })
          .limit(3);

        const defaultStories: BlogPreview[] = [
          {
            id: "story-1",
            title: "Tà Áo Dài trắng năm 18 tuổi",
            content: "Chiếc áo dài lụa tơ tằm mình mặc đúng một lần duy nhất vào buổi bế giảng cấp 3 năm ấy. Giữ mãi mùi nắng của ngày hạ cuối cùng...",
            coverImage: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=600",
            album: [],
            createdAt: new Date().toISOString(),
            authorName: "Trang Hoài",
            authorAvatar: ""
          }
        ];

        if (blogData && blogData.length > 0) {
          const productIds = blogData.map((b: any) => b.productId).filter(Boolean);
          const userIds = blogData.map((b: any) => b.userId || b.user_id).filter(Boolean);
          
          const { data: imagesData } = await supabase.from("ProductImage").select("*").in("productId", productIds);
          
          let allBlogUsers: any[] = [];
          if (userIds.length > 0) {
            const [res1, res2] = await Promise.all([
              supabase.from("User").select("id, name, avatar").in("id", userIds),
              supabase.from("users").select("id, name, avatar").in("id", userIds)
            ]);
            allBlogUsers = [...(res1.data || []), ...(res2.data || [])];
          }

          const mappedBlogs = blogData.map((b: any) => {
            const imgs = (imagesData || []).filter((img: any) => img.productId === b.productId).map((img: any) => img.url);
            const author = allBlogUsers.find((u: any) => u.id === (b.userId || b.user_id));
            
            const imgUrl = b.coverImage || b.cover_image;
            const isTechImage = imgUrl && (imgUrl.includes("screenshot") || imgUrl.includes("notxrjsuukrrxdlboavo") || imgUrl.includes("localhost"));

            return {
              id: b.id,
              title: b.title,
              content: b.content,
              coverImage: isTechImage || !imgUrl ? "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600" : imgUrl,
              album: imgs.length > 0 ? imgs : [imgUrl || PLACEHOLDER_IMG],
              createdAt: b.createdAt,
              authorName: author?.name || "Thành viên CLOOP",
              authorAvatar: author?.avatar || ""
            };
          });
          setRecentStories(mappedBlogs);
        } else {
          setRecentStories(defaultStories);
        }

      } catch (err: any) {
        console.error("❌ LỖI VẬN HÀNH KHO DỮ LIỆU ĐỘNG TRANG CHỦ:", err);
      } finally {
        setProductsLoading(false);
      }
    }
    
    fetchRealMarketplaceData();
  }, []);

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
          .sort((a, b) => b.avgRating - a.avgRating)
          .slice(0, 8);

        const userIds = ranked.map((r) => r.userId);
        
        let allTopUsers: any[] = [];
        if (userIds.length > 0) {
          const [res1, res2] = await Promise.all([
            supabase.from("User").select("id, name, avatar").in("id", userIds),
            supabase.from("users").select("id, name, avatar").in("id", userIds)
          ]);
          allTopUsers = [...(res1.data || []), ...(res2.data || [])];
        }

        const merged = ranked.map((r) => {
          const u = allTopUsers.find((u: any) => u.id === r.userId);
          return { ...r, name: u?.name || "Thành viên CLOOP", avatar: u?.avatar || null };
        });

        setTopClosets(merged);
      } catch (err) {
        console.error("❌ Lỗi tải danh sách Top Tủ Đồ Uy Tín:", err);
      }
    }
    fetchTopClosets();
  }, []);

  const handleShuffle = () => {
    if (products.length === 0) return;
    const random = products[Math.floor(Math.random() * products.length)];
    setRandomPick(random);
  };

  return (
    <main className="min-h-screen overflow-x-hidden antialiased bg-[#FFFFFF] text-gray-900 selection:bg-[#183A2D] selection:text-white">
      
      {/* 🎨 CSS INJECTION: ÉP FONT SANS-SERIF DÀY DẶN KIỂU CANVA VÀ TẠO GLOW BACKGROUND */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        body, input, textarea, button, p, span, div, h1, h2, h3, h4, h5, h6 {
          font-family: 'Plus Jakarta Sans', sans-serif !important;
        }
        
        html { scroll-behavior: smooth; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* Vibe Cava Matcha: Nền trắng tinh + Đốm sáng xanh lá mạ mượt mà */
        .matcha-glow {
          position: absolute;
          top: -200px;
          left: 50%;
          transform: translateX(-50%);
          width: 100vw;
          height: 800px;
          background: radial-gradient(ellipse at top, rgba(167, 219, 185, 0.4) 0%, rgba(240, 248, 255, 0) 70%);
          z-index: 0;
          pointer-events: none;
        }

        /* Gradient Text chuẩn Canva */
        .text-gradient {
          background: linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        /* Hiệu ứng nổi High-tech Soft Shadow */
        .hover-card {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .hover-card:hover {
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.08);
          transform: translateY(-4px);
        }
      `}</style>

      {/* 🟢 HERO SECTION: MATCH GLOW BACKGROUND */}
      <section className="relative pt-20 pb-24 md:pt-32 md:pb-28">
        <div className="matcha-glow"></div>

        <div className="max-w-[1200px] mx-auto px-6 relative z-10 text-center flex flex-col items-center">
          
          {/* Badge xịn mịn */}
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full text-xs font-bold text-[#183A2D] shadow-sm mb-8 border border-gray-100 hover:shadow-md transition cursor-default">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Nền Tảng Thời Trang Số Tuần Hoàn
          </div>

          {/* Slogan cực to, cực rõ nét (Crisp) */}
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] text-gradient mb-6 max-w-4xl">
            Mặc đẹp hơn.<br />
            Tiêu ít hơn.<br />
            Sống xanh hơn.
          </h1>

          <p className="text-sm md:text-base text-gray-500 max-w-2xl leading-relaxed mb-10">
            CLOOP là nền tảng thời trang tuần hoàn. Thuê, cho thuê, mua bán và tái chế thời trang để kéo dài vòng đời sản phẩm — vì một tương lai bền vững của cộng đồng tiêu dùng thông minh.
          </p>

          {/* Nút Call to action bo tròn mạnh kiểu nút Canva */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link href="/shop" className="bg-[#183A2D] hover:bg-emerald-900 text-white text-sm font-bold px-10 py-4 rounded-full transition-all shadow-[0_8px_20px_rgba(24,58,45,0.25)] hover:shadow-[0_12px_25px_rgba(24,58,45,0.35)] active:scale-95 flex items-center gap-2">
              Khám phá tủ đồ <ArrowRight size={16} />
            </Link>
            <Link href="#register-privilege" className="bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 text-sm font-bold px-10 py-4 rounded-full transition-all shadow-sm">
              Tìm hiểu cách thức
            </Link>
          </div>
        </div>
      </section>

      {/* 🚀 5 KHỐI TÍNH NĂNG CHÍNH (THIẾT KẾ CARD THÔNG MINH, SẠCH SẼ) */}
      <section className="max-w-[1400px] mx-auto px-6 pb-20 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {services.map((srv, i) => {
            const ServiceIcon = srv.icon;
            return (
              <Link href={srv.href} key={i} className="block h-full">
                <div className="bg-white border border-gray-100 p-8 rounded-[2rem] flex flex-col justify-between h-full hover-card text-center items-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#183A2D] flex items-center justify-center mb-6">
                    <ServiceIcon size={28} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-extrabold tracking-tight text-gray-900 mb-2">{srv.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed mb-6 font-medium">{srv.desc}</p>
                  </div>
                  <span className="text-[11px] font-bold text-[#183A2D] bg-gray-50 px-4 py-2 rounded-full w-full hover:bg-gray-100 transition-colors">
                    {srv.btn}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 🎯 TÌM KIẾM THEO DỊP (UI NỔI BẬT HÌNH ẢNH) */}
      <section className="max-w-[1400px] mx-auto px-6 py-12 border-t border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Tìm kiếm theo dịp mặc đồ</h2>
            <p className="text-gray-500 text-sm mt-1">Lựa chọn trang phục hài hòa cùng điểm đến.</p>
          </div>
          <Link href="/shop" className="text-sm font-bold text-[#183A2D] hover:underline flex items-center gap-1">
            Xem tất cả <ArrowRight size={14}/>
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4">
          {occasions.map((occ) => (
            <Link 
              href={occ.name === "All" ? "/shop" : `/shop?occasion=${occ.name}`}
              key={occ.name}
              className="group flex flex-col items-center gap-3 cursor-pointer shrink-0 w-[120px]"
            >
              <div className="w-24 h-24 rounded-full overflow-hidden bg-white border border-gray-200 shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:shadow-md group-hover:border-emerald-200 relative flex items-center justify-center p-1">
                {occ.img ? (
                  <img src={occ.img} alt={occ.label} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full rounded-full bg-emerald-50 flex items-center justify-center text-emerald-800 font-bold text-[10px] tracking-wider">
                    CLOOP
                  </div>
                )}
              </div>
              <div className="text-xs font-bold text-gray-700 group-hover:text-[#183A2D] transition-colors">{occ.label}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* 👗 HỆ THỐNG KỆ ĐỒ */}
      <section className="bg-gray-50/50 py-16 border-t border-gray-100 mt-8">
        <div className="max-w-[1400px] mx-auto px-6 space-y-16">
          
          {/* TOP TỦ ĐỒ UY TÍN */}
          {topClosets.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                <Sparkles size={20} className="text-amber-500 fill-amber-500" />
                Top Tủ Đồ Uy Tín
              </h3>
              <div className="flex gap-6 overflow-x-auto no-scrollbar py-2">
                {topClosets.map((c, i) => (
                  <Link href={`/closet/${c.userId}`} key={i} className="flex flex-col items-center gap-3 shrink-0 group w-[100px] bg-white p-4 rounded-2xl hover-card border border-gray-100">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 border-2 border-white shadow-sm ring-2 ring-emerald-100 group-hover:ring-emerald-400 transition-all">
                      {c.avatar ? (
                        <img src={c.avatar} className="w-full h-full object-cover" alt={c.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-sm bg-gray-50">{c.name.charAt(0).toUpperCase()}</div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-bold text-gray-800 truncate w-20">@{c.name}</p>
                      <span className="text-[10px] font-black text-amber-600 flex items-center justify-center gap-0.5 mt-1">★ {c.avgRating.toFixed(1)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* KỆ CHO THUÊ */}
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  Kệ đồ cho thuê
                </h3>
                <p className="text-sm text-gray-500">Thuê để tối ưu ngân sách, làm mới diện mạo mỗi ngày.</p>
              </div>
              <Link href="/shop?type=rent" className="text-sm font-bold text-[#183A2D] hover:underline flex items-center gap-1 hidden sm:flex">Xem tất cả <ArrowRight size={14}/></Link>
            </div>

            <div className="overflow-x-auto no-scrollbar flex gap-6 pb-6 pt-2 snap-x">
              {productsLoading ? (
                [1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="w-[260px] aspect-[3/4] bg-gray-200 rounded-[2rem] animate-pulse shrink-0" />
                ))
              ) : rentalProducts.length === 0 ? (
                <p className="text-sm text-gray-400">Đang cập nhật sản phẩm mới...</p>
              ) : (
                rentalProducts.slice(0, 10).map((item) => (
                  <div key={item.id} className="w-[260px] shrink-0 snap-start group relative bg-white border border-gray-100 rounded-[2rem] p-3 hover-card flex flex-col justify-between">
                    <div className="w-full aspect-[4/5] bg-gray-100 rounded-3xl overflow-hidden relative mb-4">
                      <Image src={item.image} alt={item.title} fill unoptimized className="object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-[10px] font-bold text-gray-800 px-2.5 py-1 rounded-full shadow-sm">
                        THUÊ ĐỒ
                      </div>
                      <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md text-[10px] font-bold text-amber-600 px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                        ★ {item.rating}
                      </div>
                    </div>

                    <div className="px-2 space-y-1">
                      <div className="text-xs font-bold text-gray-500 truncate hover:text-[#183A2D] relative z-10 w-fit">
                        <Link href={`/closet/${item.userId}`}>@{item.ownerName}</Link>
                      </div>
                      <h4 className="font-extrabold text-[15px] text-gray-900 truncate">{item.title}</h4>
                      <div className="flex items-end justify-between pt-2">
                        <div className="font-mono font-black text-lg text-[#183A2D]">{item.rawPriceText}</div>
                        <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">-{item.savedPercentage}%</div>
                      </div>
                    </div>
                    <Link href={`/product/${item.id}`} className="absolute inset-0 z-0"><span className="sr-only">Xem chi tiết</span></Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* KỆ THANH LÝ */}
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  Kệ thanh lý phục trang
                </h3>
                <p className="text-sm text-gray-500">Mua đứt sản phẩm chính hãng với giá thanh lý cực hời.</p>
              </div>
              <Link href="/shop?type=sell" className="text-sm font-bold text-[#183A2D] hover:underline flex items-center gap-1 hidden sm:flex">Xem tất cả <ArrowRight size={14}/></Link>
            </div>

            <div className="overflow-x-auto no-scrollbar flex gap-6 pb-6 pt-2 snap-x">
              {productsLoading ? (
                [1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="w-[260px] aspect-[3/4] bg-gray-200 rounded-[2rem] animate-pulse shrink-0" />
                ))
              ) : saleProducts.length === 0 ? (
                <p className="text-sm text-gray-400">Đang cập nhật sản phẩm mới...</p>
              ) : (
                saleProducts.slice(0, 10).map((item) => (
                  <div key={item.id} className="w-[260px] shrink-0 snap-start group relative bg-white border border-gray-100 rounded-[2rem] p-3 hover-card flex flex-col justify-between">
                    <div className="w-full aspect-[4/5] bg-gray-100 rounded-3xl overflow-hidden relative mb-4">
                      <Image src={item.image} alt={item.title} fill unoptimized className="object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-[10px] font-bold text-gray-800 px-2.5 py-1 rounded-full shadow-sm">
                        MUA SẮM
                      </div>
                      <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md text-[10px] font-bold text-amber-600 px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                        ★ {item.rating}
                      </div>
                    </div>

                    <div className="px-2 space-y-1">
                      <div className="text-xs font-bold text-gray-500 truncate hover:text-[#183A2D] relative z-10 w-fit">
                        <Link href={`/closet/${item.userId}`}>@{item.ownerName}</Link>
                      </div>
                      <h4 className="font-extrabold text-[15px] text-gray-900 truncate">{item.title}</h4>
                      <div className="flex items-end justify-between pt-2">
                        <div className="font-mono font-black text-lg text-[#183A2D]">{item.rawPriceText}</div>
                        <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">-{item.savedPercentage}%</div>
                      </div>
                    </div>
                    <Link href={`/product/${item.id}`} className="absolute inset-0 z-0"><span className="sr-only">Xem chi tiết</span></Link>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </section>

      {/* SỔ TAY BLOG (Vẫn giữ logic truyền data của bro) */}
      <KyUcTuanHoanSection recentBlogs={recentBlogs} />

      {/* BANNER ĐĂNG KÝ (REDESIGN KIỂU SAAS HIỆN ĐẠI) */}
      <section id="register-privilege" className="bg-white py-20 border-t border-gray-100">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="bg-[#183A2D] rounded-[3rem] p-10 lg:p-16 flex flex-col lg:flex-row items-center justify-between gap-12 relative overflow-hidden">
            {/* Lớp mờ rực sáng bên trong khối tối */}
            <div className="absolute top-[-50%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="w-full lg:w-[50%] relative z-10 text-white">
              <h2 className="text-4xl font-extrabold mb-4 tracking-tight">Kích hoạt Tủ Đồ Số của riêng bạn</h2>
              <p className="text-emerald-100 text-sm leading-relaxed mb-8">
                Trở thành một phần của hệ sinh thái thời trang tuần hoàn. Chỉ mất 30 giây để bắt đầu chia sẻ tủ đồ và tận hưởng các đặc quyền xanh từ CLOOP.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {privileges.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-800 text-emerald-200 flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>
                      <p className="text-xs text-emerald-200/80 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full lg:w-[35%] relative z-10 bg-white p-8 rounded-[2rem] text-center shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6 text-[#183A2D]">
                <Zap size={24} className="fill-emerald-500" />
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Sẵn sàng trải nghiệm?</h3>
              <p className="text-sm text-gray-500 mb-8">Miễn phí tham gia, tối ưu doanh thu từ chính tủ quần áo của bạn.</p>
              <button onClick={() => handleFeatureRequirement("Mở tủ đồ xanh")} className="w-full bg-[#183A2D] text-white font-bold py-4 rounded-full hover:bg-emerald-900 transition-all hover:-translate-y-1 shadow-[0_5px_15px_rgba(24,58,45,0.2)]">
                Đăng ký thành viên
              </button>
            </div>
          </div>
        </div>
      </section>

      <button 
        onClick={handleShuffle} 
        className="fixed bottom-24 right-6 z-40 bg-[#183A2D] border border-emerald-400/20 text-white rounded-full px-5 py-4 shadow-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition hover:-translate-y-1 cursor-pointer hover:bg-emerald-950"
      >
        <Zap size={14} className="text-emerald-400 animate-pulse fill-emerald-400" />
        <span>Lắc tủ đồ AI</span>
      </button>

      <AnimatePresence>
        {randomPick && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setRandomPick(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[2rem] max-w-sm w-full overflow-hidden p-6 relative shadow-2xl flex flex-col space-y-4" 
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setRandomPick(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors z-10">
                <X size={16} />
              </button>

              <div className="text-center pt-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-pink-600 bg-pink-50 px-3 py-1 rounded-full inline-block">Món đồ định mệnh 🔮</span>
                <h3 className="text-xl font-extrabold text-gray-900 mt-2">Lắc Tủ Đồ May Mắn</h3>
              </div>

              <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 border border-gray-100">
                <Image src={randomPick.image} alt={randomPick.title} fill unoptimized className="object-cover" />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-[10px] font-bold text-gray-800 px-3 py-1.5 rounded-full shadow-sm">
                  {randomPick.type}
                </div>
                <div className="absolute bottom-3 right-3 bg-[#183A2D]/90 backdrop-blur-md text-[11px] font-bold text-white px-3 py-1.5 rounded-full shadow-sm">
                  SIZE {randomPick.size}
                </div>
              </div>

              <div className="space-y-1 text-left px-1">
                <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                  <span className="hover:text-[#183A2D] cursor-pointer">@{randomPick.ownerName}</span>
                  <span className="flex items-center gap-1"><MapPin size={10} className="text-[#6BA37A]" /> {randomPick.location}</span>
                </div>
                <h4 className="text-base font-extrabold text-gray-900 line-clamp-1 py-1">{randomPick.title}</h4>
                
                <div className="flex items-end justify-between border-t border-gray-100 pt-3 mt-2">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Giá Đóng góp</span>
                    <p className="text-lg font-black text-[#183A2D] font-mono">{randomPick.rawPriceText}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mb-1 inline-block">Tiết kiệm {randomPick.savedPercentage}%</span>
                    <p className="text-xs font-semibold text-gray-400 line-through font-mono">Gốc: {randomPick.storeRetailPrice.toLocaleString()}đ</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Link href={`/product/${randomPick.id}`} className="block">
                  <button className="w-full bg-[#183A2D] text-white py-4 rounded-xl text-sm font-bold transition hover:bg-emerald-900 active:scale-95">
                    Xem chi tiết
                  </button>
                </Link>
                <button onClick={handleShuffle} className="w-full bg-gray-50 hover:bg-gray-100 text-gray-800 text-sm font-bold py-4 rounded-xl transition border border-gray-200 active:scale-95">
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