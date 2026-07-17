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
// 🟢 BIẾN ĐỘC QUYỀN: Giữ nguyên vẹn đầu nối kích nổ Modal từ Context chung
import { useAuthModal } from "./AuthModalContext";
// 📔 TÍCH HỢP COMPONENT GÓC NHẬT KÝ TUẦN HOÀN CHUẨN ĐÉT EDITORIAL MAGAZINE
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

// 📈 PHÂN ĐOẠN 1 — BỘ ĐẾM SỐ ESG TỰ ĐỘNG CHẠY KHI CUỘN TỚI KHUNG
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

  return <span ref={ref} className="font-mono">{count.toLocaleString("vi-VN")}{suffix}</span>;
}

// 🎀 COMPONENT DẢI LỤA SATIN CSS CHẠY ẨN SAU NỀN HERO ĐÚNG THEO BẢN THIẾT KẾ CỦA TRANG
function SilkBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div className="silk silk-1"></div>
      <div className="silk silk-2"></div>
      <div className="silk silk-3"></div>
    </div>
  );
}

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

  // 🏆 STATE "TOP TỦ ĐỒ UY TÍN" (Ẩn sạch nếu database chưa có review thật)
  const [topClosets, setTopClosets] = useState<any[]>([]);

  // 🏛️ DANH MỤC PHÂN LOẠI THEO DỊP
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
    { tag: "01", icon: ShoppingBag, title: "THUÊ ĐỒ", desc: "Thuê phục trang theo nhu cầu thực tế, tối ưu chi phí tiêu dùng.", btn: "Khám phá ngay →", href: "/shop?type=rent" },
    { tag: "02", icon: Handshake, title: "CHO THUÊ ĐỒ", desc: "Chia sẻ tủ quần áo nhàn rỗi của bạn, tạo nguồn thu nhập xanh ổn định.", btn: "Đăng cho thuê →", href: "/my-closet/create?mode=rent" },
    { tag: "03", icon: RefreshCw, title: "MUA SẮM", desc: "Sở hữu sản phẩm thời trang second-hand tuyển chọn, chất lượng cao.", btn: "Mua sắm ngay →", href: "/shop?type=sell" },
    { tag: "04", icon: Layers, title: "CHUYỂN NHƯỢNG & KÝ GỬI", desc: "Ủy thác tủ đồ cũ để bán đứt hoặc phối hợp vận hành tuần hoàn.", btn: "Ký gửi ngay →", href: "/my-closet/create?mode=consign" },
    { tag: "05", icon: Leaf, title: "TÁI CHẾ", desc: "Gửi quần áo cũ hỏng cho xưởng Upcycle để thiết kế và tái sinh vòng đời.", btn: "Tìm hiểu ngay →", href: "#", isModal: true }
  ];

  // 🌿 ĐẶC QUYỀN THÀNH VIÊN
  const privileges = [
    { icon: <Gift size={18} />, title: "Tặng Ngay 100 Green Points", desc: "Tích lũy điểm thưởng sau mỗi lần thuê hoặc tái chế đồ để đổi voucher ưu đãi." },
    { icon: <Sparkles size={18} />, title: "Trợ Lý Phối Đồ AI Stylist", desc: "Mở khóa tính năng AI tự động gợi ý phụ kiện, túi xách phù hợp với từng outfit." },
    { icon: <ShieldCheck size={18} />, title: "Mở Gian Hàng Tự Quản", desc: "Bất kỳ cá nhân nào cũng có thể đăng bài kinh doanh, chia sẻ tủ đồ tăng thu nhập." },
    { icon: <Heart size={18} />, title: "Kết Nối Xưởng Upcycle", desc: "Gửi yêu cầu thiết kế và sửa đổi quần áo cũ trực tiếp đến các đối tác tái chế." }
  ];

  // 📡 TRUY XUẤT DỮ LIỆU SẢN PHẨM & ALBUM NHẬT KÝ ĐỘNG TỪ SUPABASE
  useEffect(() => {
    async function fetchRealMarketplaceData() {
      try {
        setProductsLoading(true);
        
        const { data: pData, error: pError } = await supabase.from("products").select("*").order("createdAt", { ascending: false });
        if (pError) throw pError;

        const { data: listingsData } = await supabase.from("Listing").select("*");
        const { data: imagesData } = await supabase.from("ProductImage").select("*");

        // 🟢 NÂNG CẤP XỬ LÝ: Lấy danh sách tất cả userId độc nhất từ danh sách sản phẩm để gọi bảng User một lần duy nhất
        const productUserIds = [...new Set((pData || []).map((item: any) => item.userId).filter(Boolean))];
        const { data: usersDataForProducts } = await supabase.from("User").select("id, name").in("id", productUserIds);

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

            // 🟢 NÂNG CẤP XỬ LÝ: Đối chiếu tìm thông tin User để gán tên thật thay vì gán chữ "Ẩn danh" cố định
            const matchedUser = (usersDataForProducts || []).find((u: any) => u.id === item.userId);

            const baseProduct = {
              id: item.id,
              image: currentImage, 
              title: item.title || item.name || "Trang phục CLOOP",
              location: item.province || "Nghệ An", 
              rating: "5.0",   
              condition: item.condition === "GOOD" ? "Mới 95%" : "Mới 98%",
              size: item.size || "M",
              brand: item.brand || "Thiết kế Việt",
              ownerName: matchedUser?.name || item.owner_name || item.ownerName || "Ẩn danh",
              userId: item.userId || "anonymous-user",
              storeRetailPrice,
              occasion: item.occasion || "Dạo phố"
            };

            // Tách biệt luồng Đồ Thuê
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

            // Tách biệt luồng Đồ Bán đứt (Kệ thanh lý phục trang)
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

        // 📔 NÂNG CẤP ĐỘNG: QUY QUÉT CHÉO BẢNG USER ĐỂ HIỂN THỊ DANH TÍNH THẬT TRÊN LƯU BÚT
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
            content: "Chiếc áo dài lụa tơ tằm mình mặc đúng một lần duy nhất vào buổi bế giảng cấp 3 năm ấy. Giữ mãi mùi nắng của ngày hạ cuối cùng, tiếng cười khúc khích sân trường và những dòng chữ lưu bút viết vội vàng bên mép tà áo nếp gấp kỉ niệm.",
            coverImage: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=600",
            album: [],
            createdAt: new Date().toISOString(),
            authorName: "Trang Hoài",
            authorAvatar: ""
          },
          {
            id: "story-2",
            title: "Chiếc váy hoa nhí dưới mưa",
            content: "Váy hai dây voan tơ thướt tha mềm mại đồng hành cùng mình trong buổi hẹn hò đầu tiên. Cơn mưa rào bất chợt làm ướt gấu váy nhưng lại thắp lên ngọn lửa ấm áp của mối tình thanh xuân rực rỡ.",
            coverImage: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600",
            album: [],
            createdAt: new Date().toISOString(),
            authorName: "Thành viên CLOOP",
            authorAvatar: ""
          },
          {
            id: "story-3",
            title: "Blazer đen ngày đầu đi thực tập",
            content: "Bộ đồ phom đứng thanh lịch đã nâng đỡ sự tự tin của mình trước hội đồng giám khảo khó tính ngày đầu bước chân vào thế giới người lớn. Vừa có nét trang trọng quy chuẩn, vừa ôm trọn hoài bão khát vọng rực cháy tuổi trẻ.",
            coverImage: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?q=80&w=600",
            album: [],
            createdAt: new Date().toISOString(),
            authorName: "Thành viên CLOOP",
            authorAvatar: ""
          }
        ];

        if (blogData && blogData.length > 0) {
          const productIds = blogData.map((b: any) => b.productId).filter(Boolean);
          const userIds = blogData.map((b: any) => b.userId).filter(Boolean);
          
          const { data: imagesData } = await supabase.from("ProductImage").select("*").in("productId", productIds);
          const { data: usersData } = await supabase.from("User").select("id, name, avatar").in("id", userIds);

          const mappedBlogs = blogData.map((b: any) => {
            const imgs = (imagesData || []).filter((img: any) => img.productId === b.productId).map((img: any) => img.url);
            const author = (usersData || []).find((u: any) => u.id === b.userId);
            
            // Bảo chứng lọc bỏ ảnh screenshot lỗi hệ thống từ database test
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

  // 🏆 BỘ ĐỐI SOÁT "TOP TỦ ĐỒ UY TÍN"
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
        const { data: usersData } = await supabase.from("User").select("id, name, avatar").in("id", userIds);

        const merged = ranked.map((r) => {
          const u = (usersData || []).find((u: any) => u.id === r.userId);
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
    <main className="min-h-screen overflow-x-hidden antialiased relative bg-[#FAF9F6] text-stone-900 selection:bg-[#183A2D] selection:text-white">
      
      {/* 🔐 CSS INJECTION KHÓA CHẶT FONT CHỮ CORMORANT GARAMOND VÀ THỚ VẢI LỤA SATIN CSS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600;700&display=swap');
        
        body, input, textarea, button, p, span, div {
          font-family: 'Inter', sans-serif !important;
        }
        
        .editorial-title, .font-heading, h1, h2, h3 {
          font-family: 'Cormorant Garamond', serif !important;
          letter-spacing: -0.01em !important;
        }
        
        .font-diary-quote, .editorial-title span.italic {
          font-family: 'Cormorant Garamond', serif !important;
          font-style: italic !important;
        }

        html { scroll-behavior: smooth; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* 🎀 THIẾT LẬP KỊCH BẢN DẢI LỤA SATIN CSS CHẠY ẨN SAU NỀN THEO ĐÚNG CẤU TRÚC TRANG */
        .silk {
          position: absolute;
          width: 180%;
          height: 220px;
          left: -40%;
          border-radius: 999px;
          background: linear-gradient(
            110deg,
            rgba(255,255,255,0.95),
            rgba(212,175,140,0.45),
            rgba(255,255,255,0.9),
            rgba(107,163,122,0.28),
            rgba(255,255,255,0.95)
          );
          filter: blur(14px);
          opacity: 1;
          box-shadow: 
            0 35px 70px rgba(24,58,45,0.1),
            0 -10px 30px rgba(255,255,255,0.9);
          animation: silkMove 12s ease-in-out infinite;
        }
        .silk-1 { top: 230px; transform: rotate(-4deg); }
        .silk-2 { top: 310px; transform: rotate(3deg); opacity: .8; animation-delay: -3s; }
        .silk-3 { top: 390px; transform: rotate(-2deg); opacity: .6; animation-delay: -6s; }

        @keyframes silkMove {
          0%, 100% { transform: translateX(0) rotate(-4deg); }
          50% { transform: translateX(80px) rotate(-3deg); }
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

      {/* 🟢 PHÂN ĐOẠN 1: HERO SECTION CHỨA DẢI LỤA SATIN ẨN NỀN PHÍA SAU */}
      <section className="relative overflow-hidden pt-12 pb-16">
        <SilkBackground />

        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-14 relative text-left">
            
            <div className="w-full lg:w-[48%] space-y-6">
              <div className="inline-flex items-center gap-1.5 bg-[#183A2D]/5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase text-[#183A2D]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#183A2D] inline-block animate-pulse" />
                <span>Nền tảng thời trang số tuần hoàn</span>
              </div>

              <h1 className="editorial-title text-5xl sm:text-6xl lg:text-[4.5rem] font-bold leading-[1.08] text-[#183A2D]">
                Mặc đẹp hơn. <br />
                Tiêu ít hơn. <br />
                <span className="text-[#6BA37A] italic font-normal">Sống xanh hơn.</span>
              </h1>

              <p className="text-xs sm:text-sm text-stone-500 max-w-lg leading-relaxed font-normal opacity-90">
                CLOOP là nền tảng thời trang tuần hoàn. Thuê, cho thuê, mua bán và tái chế thời trang để kéo dài vòng đời sản phẩm — vì một tương lai bền vững của cộng đồng tiêu dùng thông minh.
              </p>

              <div className="pt-4 flex items-center gap-3">
                <Link href="/shop" className="bg-[#183A2D] hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider px-8 py-4 rounded-full transition-all shadow-sm active:scale-95">
                  Khám phá ngay →
                </Link>
                <Link href="#register-privilege" className="border border-stone-200 hover:bg-stone-50 text-[#183A2D] text-xs font-bold uppercase tracking-wider px-8 py-4 rounded-full transition-all">
                  Tìm hiểu thêm
                </Link>
              </div>
            </div>

            {/* KHUNG ẢNH XU HƯỚNG */}
            <div className="w-full lg:w-[42%] relative flex items-center justify-center">
              <div className="w-full aspect-square max-w-[460px] bg-white rounded-[2.5rem] overflow-hidden relative border border-stone-200/40 p-4 shadow-xl flex items-center justify-center">
                <div className="w-full h-full rounded-[2rem] overflow-hidden relative">
                  <Image 
                    src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800" 
                    alt="CLOOP Campaign Lookbook" 
                    fill priority unoptimized
                    className="object-cover object-top"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 🟢 PHÂN ĐOẠN 2: KHỐI 5 CHỨC NĂNG CHÍNH */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-6 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {services.map((srv, i) => {
            const ServiceIcon = srv.icon;
            return (
              <Link href={srv.href} key={i} className="block h-full">
                <div className="border border-stone-200 bg-white p-6 xl:p-8 rounded-3xl flex flex-col justify-between transition-all duration-300 relative group cursor-pointer text-left h-full shadow-2xs hover:border-stone-400">
                  <span className="absolute top-4 right-5 text-xs text-stone-300 font-mono font-bold">{srv.tag}</span>
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-stone-50 text-[#183A2D] flex items-center justify-center mb-5 group-hover:bg-[#183A2D] group-hover:text-white transition-colors duration-300">
                      <ServiceIcon size={15} />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-1.5 text-stone-900 font-heading">{srv.title}</h3>
                    <p className="text-[11px] text-stone-400 leading-relaxed mb-6 font-normal line-clamp-3">{srv.desc}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-left border-t border-stone-100 pt-4 block text-[#183A2D]">
                    {srv.btn}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 🎯 PHÂN ĐOẠN 3: TÌM KIẾM THEO DỊP */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-8 space-y-6">
        <div className="text-left space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight font-heading">Tìm kiếm theo dịp mặc đồ</h2>
          <p className="text-stone-400 text-xs font-medium">Lựa chọn trang phục hài hòa cùng điểm đến để mọi trải nghiệm thêm phần trọn vẹn.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-4 justify-items-center">
          {occasions.map((occ) => (
            <Link 
              href={occ.name === "All" ? "/shop" : `/shop?occasion=${occ.name}`}
              key={occ.name}
              className="group flex flex-col items-center space-y-2.5 cursor-pointer w-full text-left"
            >
              <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden bg-white border border-stone-200 p-1 shadow-3xs transition-transform duration-300 group-hover:scale-[1.02] group-hover:border-[#183A2D] relative flex items-center justify-center">
                {occ.img ? (
                  <img src={occ.img} alt={occ.label} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="w-full h-full flex flex-col justify-between p-3.5 bg-gradient-to-b from-stone-50 to-[#FAF9F6] rounded-xl border border-dashed border-stone-200 text-left">
                    <span className="text-[9px] font-bold text-stone-300 font-mono tracking-widest">CLOOP</span>
                    <span className="text-[11px] font-bold text-stone-600 leading-tight block">{occ.label}</span>
                  </div>
                )}
              </div>
              <div className="text-[11px] font-bold text-stone-700 group-hover:text-[#183A2D] transition-colors truncate max-w-full px-1 text-center w-full">{occ.label}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* 👗 PHÂN ĐOẠN 4: HỆ THỐNG KỆ ĐỒ SONG HÀNH & CHỦ TỦ TRIỆU VIEW */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-6 space-y-12">
        
        {/* TOP TỦ ĐỒ UY TÍN */}
        {topClosets.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 border-b border-stone-200/60 pb-2 text-left">
              <Sparkles size={14} className="text-amber-500 fill-amber-500" />
              <h3 className="text-xs font-bold text-stone-800 uppercase tracking-widest font-heading">Top Tủ Đồ Uy Tín</h3>
            </div>
            <div className="flex gap-6 overflow-x-auto no-scrollbar py-1">
              {topClosets.map((c, i) => (
                <Link href={`/closet/${c.userId}`} key={i} className="flex flex-col items-center gap-2 shrink-0 group">
                  <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-emerald-500 via-amber-300 to-pink-500 animate-gradient-xy group-hover:scale-105 transition-all duration-300 shadow-sm">
                    <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-stone-100 flex items-center justify-center">
                      {c.avatar ? (
                        <img src={c.avatar} className="w-full h-full object-cover" alt={c.name} />
                      ) : (
                        <span className="text-stone-400 font-bold text-sm">{c.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-center w-20">
                    <p className="text-[10px] font-bold text-stone-700 truncate">@{c.name}</p>
                    <span className="text-[8px] font-black text-amber-700 bg-amber-50 border border-amber-200/40 px-1.5 py-0.5 rounded-full mt-0.5 inline-block">★ {c.avgRating.toFixed(1)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* TẦNG 1: TỦ ĐỒ CHO THUÊ TUẦN HOÀN */}
        <div className="space-y-4">
          <div className="border-b border-stone-200/60 pb-3 text-left">
            <h3 className="text-xl font-bold text-[#183A2D] flex items-center gap-1.5 mb-1 font-heading">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block animate-pulse" />
              <span>Tủ đồ cho thuê tuần hoàn</span>
            </h3>
            <p className="text-xs text-stone-400 font-medium">Kho đồ cho thuê linh hoạt. Tiêu dùng thông minh, sống xanh bền vững.</p>
          </div>

          <div className="overflow-x-auto no-scrollbar flex gap-6 pb-4 pt-1 snap-x">
            {productsLoading ? (
              [1, 2, 3, 4].map((n) => (
                <div key={n} className="w-[240px] aspect-[3/4] bg-stone-200/40 rounded-2xl animate-pulse shrink-0" />
              ))
            ) : rentalProducts.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 pl-2">Kho lưu trữ trang phục cho thuê tạm thời đang cập nhật sản phẩm mới.</p>
            ) : (
              rentalProducts.slice(0, 8).map((item) => (
                <div key={item.id} className="w-[240px] shrink-0 snap-start group flex flex-col space-y-2.5 relative text-left">
                  <div className="w-full aspect-[3/4] bg-stone-50 rounded-2xl overflow-hidden relative border border-stone-200/30">
                    <Image src={item.image} alt={item.title} fill unoptimized className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]" />
                    <div className="absolute top-3 left-3 bg-[#183A2D] text-[8px] font-bold text-white px-2 py-0.5 rounded shadow-xs uppercase tracking-wider z-10 font-heading">
                      RENTAL
                    </div>
                    <div className="absolute top-3 right-3 bg-red-500 text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow-sm font-mono z-10">
                      -{item.savedPercentage}%
                    </div>
                  </div>

                  <div className="space-y-1 px-0.5 text-xs font-normal">
                    <div className="text-[#183A2D] font-bold truncate font-heading">
                      <Link href={`/closet/${item.userId}`} className="hover:text-stone-600 font-bold transition-colors">@{item.ownerName}</Link>
                    </div>
                    <div className="text-stone-400 truncate">
                      Địa chỉ: <span className="text-stone-600">{item.location}</span>
                    </div>
                    <div className="text-stone-400 flex items-center gap-1">
                      Sao: <span className="text-amber-600 font-bold flex items-center gap-0.5">★ {item.rating}</span>
                    </div>
                    <div className="text-stone-800 font-mono font-bold pt-0.5">
                      {item.rawPriceText}
                    </div>
                  </div>
                  <Link href={`/product/${item.id}`} className="absolute inset-0 z-0"><span className="sr-only">Xem chi tiết {item.title}</span></Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* TẦNG 2: KỆ THANH LÝ PHỤC TRANG */}
        <div className="space-y-4">
          <div className="border-b border-stone-200/60 pb-3 text-left">
            <h3 className="text-xl font-bold text-[#183A2D] flex items-center gap-1.5 mb-1 font-heading">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block animate-pulse" />
              <span>Kệ thanh lý phục trang</span>
            </h3>
            <p className="text-xs text-stone-400 font-medium">Không gian mua sắm thời trang sở hữu vòng đời thứ hai chất lượng cao.</p>
          </div>

          <div className="overflow-x-auto no-scrollbar flex gap-6 pb-4 pt-1 snap-x">
            {productsLoading ? (
              [1, 2, 3, 4].map((n) => (
                <div key={n} className="w-[240px] aspect-[3/4] bg-stone-200/40 rounded-2xl animate-pulse shrink-0" />
              ))
            ) : saleProducts.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 pl-2">Kho lưu trữ phục trang thanh lý hiện đang cập nhật sản phẩm.</p>
            ) : (
              saleProducts.slice(0, 8).map((item) => (
                <div key={item.id} className="w-[240px] shrink-0 snap-start group flex flex-col space-y-2.5 relative text-left">
                  <div className="w-full aspect-[3/4] bg-stone-50 rounded-2xl overflow-hidden relative border border-stone-200/30">
                    <Image src={item.image} alt={item.title} fill unoptimized className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]" />
                    <div className="absolute top-3 left-3 bg-blue-700 text-[8px] font-bold text-white px-2 py-0.5 rounded shadow-xs tracking-wider font-heading z-10">
                      BUY OUT
                    </div>
                    <div className="absolute top-3 right-3 bg-stone-900/80 text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow-sm font-mono z-10">
                      -{item.savedPercentage}%
                    </div>
                  </div>

                  <div className="space-y-1 px-0.5 text-xs font-normal">
                    <div className="text-[#183A2D] font-bold truncate font-heading">
                      <Link href={`/closet/${item.userId}`} className="hover:text-stone-600 font-bold transition-colors">@{item.ownerName}</Link>
                    </div>
                    <div className="text-stone-400 truncate">
                      Địa chỉ: <span className="text-stone-600">{item.location}</span>
                    </div>
                    <div className="text-stone-400 flex items-center gap-1">
                      Sao: <span className="text-amber-600 font-bold flex items-center gap-0.5">★ {item.rating}</span>
                    </div>
                    <div className="text-stone-800 font-mono font-bold pt-0.5">
                      {item.rawPriceText}
                    </div>
                  </div>
                  <Link href={`/product/${item.id}`} className="absolute inset-0 z-0"><span className="sr-only">Xem chi tiết {item.title}</span></Link>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 📔 PHÂN ĐOẠN 5: GÓC NHẬT KÝ LƯU BÚT HOÀI NIỆM - KÝ ỨC TUẦN HOÀN DỮ LIỆU THẬT */}
      <KyUcTuanHoanSection recentBlogs={recentBlogs} />

      {/* 🌿 PHÂN ĐOẠN 6: ĐẶC QUYỀN THÀNH VIÊN */}
      <section id="register-privilege" className="max-w-[1500px] mx-auto px-6 lg:px-12 py-8 border-t border-stone-200/60 text-left relative z-10">
        <div className="border border-stone-200 bg-white rounded-[2.5rem] p-8 lg:p-12 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="w-full lg:w-[55%]">
            <h2 className="text-3xl font-bold text-stone-900 font-heading">Hãy đăng ký tài khoản để trải nghiệm trọn vẹn đặc quyền xanh</h2>
            <p className="text-xs tracking-[0.15em] text-[#6BA37A] uppercase font-bold mt-2 mb-6 font-heading">Trở thành một phần của hệ sinh thái thời trang tuần hoàn thông minh</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {privileges.map((item: any, idx: number) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-xl border border-stone-200 bg-[#FAF8F3] text-[#183A2D] flex items-center justify-center shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 font-heading">{item.title}</h4>
                    <p className="text-xs text-stone-400 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full lg:w-[38%] border border-stone-200 bg-[#FAF8F3] p-8 rounded-3xl text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-white border border-stone-200 flex items-center justify-center mb-4 text-[#183A2D] shadow-2xs">
              <Zap size={18} />
            </div>
            <h3 className="text-2xl font-bold text-stone-900 font-heading">Kích Hoạt Tài Khoản</h3>
            <p className="text-xs text-stone-400 mt-2 mb-6 leading-relaxed">Chỉ mất 30 giây để thiết lập tủ đồ xanh của riêng bạn trên ứng dụng.</p>
            
            <button onClick={() => handleFeatureRequirement("Mở tủ đồ xanh")} className="w-full text-xs font-black uppercase tracking-widest py-4 rounded-full shadow-md bg-[#183A2D] text-white hover:bg-emerald-800 transition active:scale-[0.98] cursor-pointer font-heading">
              Đăng ký thành viên ngay
            </button>
          </div>
        </div>
      </section>

      {/* 🎲 TÍNH NĂNG MỚI B: TRẠM QUẸT ĐỒ NGẪU NHIÊN (LẮC TỦ ĐỒ AI) */}
      <button 
        onClick={handleShuffle} 
        className="fixed bottom-24 right-6 z-40 bg-[#183A2D] border border-emerald-400/20 text-white rounded-full px-5 py-3.5 shadow-lg text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition active:scale-95 cursor-pointer hover:bg-emerald-950 font-heading"
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
                <span className="text-[9px] font-bold uppercase tracking-widest text-pink-600 bg-pink-50 px-2.5 py-1 rounded-md inline-block font-heading">Món đồ định mệnh 🔮</span>
                <h3 className="text-lg font-bold text-stone-900 mt-1 font-heading">Lắc Tủ Đồ May Mắn</h3>
              </div>

              <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border border-stone-200/30">
                <Image src={randomPick.image} alt={randomPick.title} fill unoptimized className="object-cover" />
                <div className="absolute top-3 left-3 bg-[#183A2D] text-[8px] font-bold text-white px-2 py-0.5 rounded shadow-xs uppercase tracking-wider font-heading">
                  {randomPick.type}
                </div>
                <div className="absolute top-3 right-3 bg-red-500 text-[10px] font-bold text-white px-2 py-0.5 rounded shadow-sm font-mono">
                  -{randomPick.savedPercentage}%
                </div>
                <div className="absolute bottom-3 left-3 bg-stone-900/70 backdrop-blur-md text-[9px] font-bold text-white px-2 py-0.5 rounded-md font-heading">
                  SIZE {randomPick.size}
                </div>
              </div>

              <div className="space-y-1 text-left">
                <div className="flex justify-between items-center text-[9px] text-stone-400 font-bold uppercase tracking-wider font-heading">
                  <span>@{randomPick.ownerName}</span>
                  <span className="flex items-center gap-0.5"><MapPin size={8} className="text-[#6BA37A]" /> {randomPick.location}</span>
                </div>
                <h4 className="text-sm font-bold text-stone-900 line-clamp-1 font-heading">{randomPick.title}</h4>
                
                <div className="pt-2 flex items-center justify-between border-t border-dashed border-stone-200 mt-1">
                  <div>
                    <span className="text-[8px] font-bold text-stone-400 uppercase block font-heading">Đóng góp</span>
                    <p className="text-xs font-black text-[#183A2D] font-mono">{randomPick.rawPriceText}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-bold text-stone-400 uppercase block font-heading">Giá trị gốc</span>
                    <p className="text-[10px] font-semibold text-stone-400 line-through font-mono">{randomPick.storeRetailPrice.toLocaleString()}đ</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <Link href={`/product/${randomPick.id}`} className="block">
                  <button className="w-full bg-[#183A2D] text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-emerald-800 transition active:scale-95 cursor-pointer font-heading">
                    Xem chi tiết
                  </button>
                </Link>
                <button 
                  onClick={handleShuffle}
                  className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold uppercase tracking-wider py-3.5 rounded-xl transition cursor-pointer border border-stone-200 font-heading"
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