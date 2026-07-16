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
  createdAt: string;
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

  // 🏛️ DANH MỤC PHÂN LOẠI THEO DỊP: Gồm 9 mục đứng dạng khung chữ nhật bo góc rộng rãi
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

  // 📊 SỐ LIỆU ĐÀI ESG BAN GIÁM KHẢO CHẤM ĐIỂM KHỞI NGHIỆP
  const statsData = [
    { num: 2000, suffix: "+", label: "Sản phẩm tuần hoàn", icon: Shirt },
    { num: 1000, suffix: "+", label: "Người dùng thông thái", icon: Users },
    { num: 12500, suffix: " kg", label: "Lượng CO₂ đã giảm", icon: Leaf },
    { num: 5000000, suffix: " lít", label: "Nước sạch tiết kiệm", icon: Sparkles }
  ];

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

        const { data: pData, error: pError } = response;
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
            const finalPrice = currentViewIsRental ? (rentPrice || item.rental_price) : sellPrice;
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
              listingTypeRaw: currentViewIsRental ? "RENT" : "SELL",
              title: item.title || item.name || "Trang phục CLOOP",
              price: finalPrice,
              rawPriceText: currentViewIsRental ? `${finalPrice.toLocaleString()}đ / ngày` : `${finalPrice.toLocaleString()}đ`,
              location: item.province || "Nghệ An", 
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
          // Đồng bộ chính xác logic Kệ Hàng với Shop để fix rỗng
          setRentalProducts(mappedProducts.filter(p => p.listingTypeRaw === "RENT"));
          setSaleProducts(mappedProducts.filter(p => p.listingTypeRaw === "SELL"));

          setOccasions(prev => prev.map(occ => {
            if (occ.name === "All") return occ;
            const matchProd = mappedProducts.find(p => p.occasion === occ.name);
            return { ...occ, img: matchProd ? matchProd.image : "" };
          }));
        }

        // TRUY VẤN BLOG NHẬT KÝ HOÀI NIỆM THANH XUÂN CỦA GEN Z
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
            title: "Tà Áo Dài trắng và cái ngoảnh đầu năm 18 tuổi",
            content: "Chiếc áo dài lụa tơ tằm mình mặc đúng một lần duy nhất vào buổi bế giảng cấp 3 năm ấy. Giữ mãi mùi nắng của ngày hạ cuối cùng, tiếng cười khúc khích sân trường và những dòng chữ lưu bút viết vội vàng bên mép tà áo nếp gấp kỉ niệm.",
            coverImage: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=600",
            createdAt: new Date().toISOString()
          },
          {
            id: "story-2",
            title: "Chiếc váy hoa nhí buổi hẹn đầu dưới cơn mưa rào",
            content: "Váy hai dây voan tơ thướt tha mềm mại đồng hành cùng mình trong buổi tối hẹn hò đầu tiên ở quán cafe cũ. Cơn mưa rào bất chợt làm ướt gấu váy nhưng lại thắp lên ngọn lửa ấm áp của mối tình thanh xuân tươi đẹp năm hai.",
            coverImage: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600",
            createdAt: new Date().toISOString()
          },
          {
            id: "story-3",
            title: "Bộ Blazer đen bảo chứng ngày đầu đi thực tập",
            content: "Bộ đồ phom đứng thanh lịch đã nâng đỡ sự tự tin của mình trước hội đồng giám khảo khó tính ngày đầu bước chân vào thế giới người lớn. Vừa có nét trang trọng quy chuẩn, vừa ôm trọn hoài bão khát vọng rực cháy tuổi trẻ.",
            coverImage: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?q=80&w=600",
            createdAt: new Date().toISOString()
          }
        ];

        if (blogData && blogData.length > 0) {
          const mappedBlogs = blogData.map((b: any) => ({
            id: b.id,
            title: b.title,
            content: b.content,
            coverImage: b.coverImage || b.cover_image || PLACEHOLDER_IMG,
            createdAt: b.createdAt
          }));
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

  // 🏆 BỘ ĐỐI SOÁT "TOP TỦ ĐỒ UY TÍN" — NÓI KHÔNG VỚI MOCK DATA ĐỂ TRÁNH LỖI PHÁT SINH
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

  // 🎲 HÀM CHỌN LẮC NGẪU NHIÊN 1 BỘ ĐỒ TRONG DATABASE — AN TOÀN TUYỆT ĐỐI CHỐNG CRASH
  const handleShuffle = () => {
    if (products.length === 0) return;
    const random = products[Math.floor(Math.random() * products.length)];
    setRandomPick(random);
  };

  return (
    <main className="min-h-screen overflow-x-hidden antialiased relative bg-[#FAF9F6] text-stone-900 font-body selection:bg-[#183A2D] selection:text-white">
      
      {/* 🔐 NHÚNG PHÔNG CHỮ VÀ PHÂN ĐỊNH LỚP FONT */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400;1,600&display=swap" />
      <style>{`
        html { scroll-behavior: smooth; }
        .font-heading { font-family: 'Outfit', sans-serif; }
        .font-body { font-family: 'Inter', sans-serif; }
        .font-diary { font-family: 'Playfair Display', serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* 🎀 THIẾT LẬP KỊCH BẢN DẢI LỤA SATIN CSS CHẢY TRÀN NẰM ẨN SAU NỀN */
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

        /* Hiệu ứng pattern Scrapbook cho Góc Nhật Ký */
        .bg-scrapbook {
          background-color: #f7f3eb;
          background-image: radial-gradient(#d5cbb8 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>

      {/* 🟢 PHÂN ĐOẠN 1: HERO SECTION - Đã ép khoảng cách gần nhau và giữ dải lụa lướt nhẹ */}
      <section className="relative overflow-hidden pt-12 pb-16">
        <SilkBackground />

        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-14 relative text-left">
            
            <div className="w-full lg:w-[48%] space-y-6 flex flex-col justify-center">
              <div className="w-fit inline-flex items-center gap-1.5 bg-[#183A2D]/5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase text-[#183A2D] font-heading">
                <span className="w-1.5 h-1.5 rounded-full bg-[#183A2D] inline-block animate-pulse" />
                <span>Nền tảng thời trang số tuần hoàn</span>
              </div>

              {/* Slogan trứ danh của CLOOP */}
              <h1 className="font-heading text-5xl sm:text-6xl lg:text-[4.2rem] font-extrabold leading-[1.08] text-[#183A2D] tracking-tight">
                Mặc đẹp hơn. <br />
                Tiêu ít hơn. <br />
                <span className="text-[#6BA37A] italic font-normal">Sống xanh hơn.</span>
              </h1>

              <p className="font-body text-xs sm:text-sm text-stone-500 max-w-lg leading-relaxed font-normal opacity-90">
                CLOOP là nền tảng thời trang tuần hoàn. Thuê, cho thuê, mua bán và tái chế thời trang để kéo dài vòng đời sản phẩm — vì một tương lai bền vững của cộng đồng tiêu dùng thông minh.
              </p>

              <div className="pt-4 flex items-center gap-3">
                <Link href="/shop" className="bg-[#183A2D] hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider px-8 py-4 rounded-full transition-all shadow-sm active:scale-95 font-heading">
                  Khám phá ngay →
                </Link>
                <Link href="#register-privilege" className="border border-stone-200 hover:bg-stone-50 text-[#183A2D] text-xs font-bold uppercase tracking-wider px-8 py-4 rounded-full transition-all font-heading">
                  Tìm hiểu thêm
                </Link>
              </div>
            </div>

            {/* Khung ảnh Lookbook góc phải dời gần sát khối chữ */}
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

          {/* 📊 ĐẢI SỐ ESG NỔI TRÊN LẠI SATIN NẰM NGANG TINH TẾ */}
          <div className="mt-16 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 p-6 md:p-8 shadow-[0_30px_80px_rgba(0,0,0,.08)] max-w-[1300px] mx-auto z-20 relative h-[120px] md:h-[130px] flex items-center">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 items-center w-full">
              {statsData.map((item, idx) => {
                const StatIcon = item.icon;
                const numericPart = item.num;
const suffixPart = item.suffix || "";

                return (
                  <div key={idx} className="flex items-center gap-4 text-left px-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#183A2D]/5 text-[#183A2D] flex items-center justify-center shrink-0 border border-[#183A2D]/10">
                      <StatIcon size={18} />
                    </div>
                    <div>
                      <div className="text-2xl md:text-3xl font-black text-[#183A2D] leading-none tracking-tight">
                        <CountUpNumber target={numericPart} suffix={suffixPart} />
                      </div>
                      <div className="text-[11px] text-stone-400 font-bold tracking-wide uppercase mt-1.5 font-heading">{item.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </section>

      {/* 🟢 PHÂN ĐOẠN 2: KHỐI 5 CHỨC NĂNG CHÍNH ĐÃ HẠ XUỐNG DƯỚI ĐỂ CÓ KHOẢNG THỞ */}
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
                    <p className="font-body text-[11px] text-stone-400 leading-relaxed mb-6 font-normal line-clamp-3">{srv.desc}</p>
                  </div>
                  <span className="font-heading text-[10px] font-bold uppercase tracking-wider text-left border-t border-stone-100 pt-4 block text-[#183A2D]">
                    {srv.btn}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 🎯 PHÂN ĐOẠN 3: TÌM KIẾM THEO DỊP — KHUNG CHỮ NHẬT ĐỨNG TRÔNG RỘNG RÃI THOÁNG ĐẠT */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-8 space-y-6">
        <div className="text-left space-y-1">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">Tìm kiếm theo dịp mặc đồ</h2>
          <p className="font-body text-stone-400 text-xs font-medium">Lựa chọn trang phục hài hòa cùng điểm đến để mọi trải nghiệm thêm phần trọn vẹn.</p>
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
                    <span className="text-[11px] font-bold text-stone-600 leading-tight block font-heading">{occ.label}</span>
                  </div>
                )}
              </div>
              <div className="font-heading text-[11px] font-bold text-stone-700 group-hover:text-[#183A2D] transition-colors truncate max-w-full px-1 text-center w-full">{occ.label}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* 👗 PHÂN ĐOẠN 4: HỆ THỐNG KỆ ĐỒ SONG HÀNH & CHỦ TỦ TRIỆU VIEW */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-6 space-y-12">
        
        {/* TOP TỦ ĐỒ UY TÍN — TỰ ĐỘNG HIỂN THỊ KHI CÓ DỮ LIỆU ĐÁNH GIÁ THẬT */}
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

        {/* TẦNG 1: TỦ ĐỒ CHO THUÊ TUẦN HOÀN — CỘT ĐỨNG THEO BẢN THIẾT KẾ GỐC */}
        <div className="space-y-4">
          <div className="border-b border-stone-200/60 pb-3 text-left">
            <h3 className="text-xl font-bold text-[#183A2D] flex items-center gap-1.5 mb-1 font-heading">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block animate-pulse" />
              <span>Tủ đồ cho thuê tuần hoàn</span>
            </h3>
            <p className="font-body text-xs text-stone-400 font-medium">Kho đồ cho thuê linh hoạt. Tiêu dùng thông minh, sống xanh bền vững.</p>
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
                    <div className="text-[#183A2D] font-bold truncate">
                      Tên chủ đồ: <Link href={`/closet/${item.userId}`} className="underline hover:text-stone-600 font-normal">@{item.ownerName}</Link>
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

        {/* TẦNG 2: KỆ THANH LÝ PHỤC TRANG — ĐÃ BỐC DỮ LIỆU ĐỘNG CHUẨN MUA ĐỨT */}
        <div className="space-y-4">
          <div className="border-b border-stone-200/60 pb-3 text-left">
            <h3 className="text-xl font-bold text-[#183A2D] flex items-center gap-1.5 mb-1 font-heading">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block animate-pulse" />
              <span>Kệ thanh lý phục trang</span>
            </h3>
            <p className="font-body text-xs text-stone-400 font-medium">Không gian mua sắm thời trang sở hữu vòng đời thứ hai chất lượng cao.</p>
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

                  {/* Thông tin dọc đồng bộ hoàn toàn với tầng trên */}
                  <div className="space-y-1 px-0.5 text-xs font-normal">
                    <div className="text-[#183A2D] font-bold truncate">
                      Tên chủ đồ: <Link href={`/closet/${item.userId}`} className="underline hover:text-stone-600 font-normal">@{item.ownerName}</Link>
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

      {/* 📔 PHÂN ĐOẠN 5: GÓC NHẬT KÝ LƯU BÚT HOÀI NIỆM - DESIGN SCRAPBOOK POLAROID ĐỘC ĐÁO */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-16 space-y-12">
        
        {/* Tiêu đề & Slogan lãng mạn hoài niệm */}
        <div className="text-center space-y-4">
          <span className="text-[10px] font-bold font-heading uppercase tracking-widest bg-stone-900 text-white px-4 py-1.5 rounded-full inline-block shadow-md">
            Dấu Ấn Thanh Xuân
          </span>
          <h2 className="font-diary text-4xl sm:text-5xl font-semibold text-stone-900 tracking-tight italic">
            Ký Ức Tuần Hoàn
          </h2>
          <p className="font-body text-stone-500 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Mỗi nếp gấp áo là một câu chuyện chưa kể. Hãy để những kỷ niệm rực rỡ nhất được sống lại và viết tiếp vòng đời mới trên cuốn lưu bút của CLOOP.
          </p>
        </div>

        {recentBlogs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 bg-scrapbook p-8 sm:p-12 rounded-[3rem] border border-[#d5cbb8] shadow-inner relative">
            
            {/* Washi tape dán decor góc scrapbook */}
            <div className="absolute top-0 right-10 w-24 h-6 bg-pink-100/60 rotate-45 border-l border-r border-dashed border-pink-300 backdrop-blur-sm -translate-y-3 z-10" />
            <div className="absolute bottom-0 left-10 w-24 h-6 bg-emerald-100/60 -rotate-45 border-l border-r border-dashed border-emerald-300 backdrop-blur-sm translate-y-3 z-10" />

            {recentBlogs.map((story, idx) => (
              <div 
                key={story.id} 
                className="group relative"
                style={{ 
                  transform: `rotate(${idx % 2 === 0 ? '-3deg' : '3deg'}) translateY(${idx % 2 !== 0 ? '20px' : '0'})` 
                }}
              >
                {/* Thẻ Polaroid chất liệu giấy dày dặn */}
                <div className="bg-white p-4 pb-16 rounded-sm shadow-[0_15px_35px_rgba(0,0,0,0.1)] border border-stone-200 transition-transform duration-500 hover:rotate-0 hover:scale-105 relative z-20">
                  
                  {/* Cục ghim dập kẹp giấy hoài cổ */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center justify-center z-30">
                     <div className="w-1.5 h-6 bg-stone-300 rounded-full shadow-sm"></div>
                  </div>

                  <div className="w-full aspect-square bg-stone-100 overflow-hidden relative shadow-inner">
                    <img src={story.coverImage} className="w-full h-full object-cover sepia-[0.1] contrast-[1.1] transition-transform duration-700 group-hover:scale-110" alt={story.title} />
                  </div>
                  
                  {/* Trích dẫn viết tay lãng mạn kiểu lưu bút */}
                  <div className="absolute bottom-0 left-0 w-full p-4 text-center">
                    <h4 className="font-heading text-xs font-bold text-stone-900 uppercase tracking-widest line-clamp-1 mb-1">
                      {story.title}
                    </h4>
                    <p className="font-diary text-[15px] font-medium text-stone-600 italic line-clamp-2 leading-relaxed">
                      "{story.content}"
                    </p>
                  </div>
                </div>

                <Link href={`/blog/${story.id}`} className="absolute inset-0 z-30"><span className="sr-only">Đọc câu chuyện {story.title}</span></Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-scrapbook p-16 rounded-[3rem] border border-[#d5cbb8] text-center shadow-inner">
             <p className="font-diary text-lg italic text-stone-500">Cuốn sổ lưu bút đang giở những trang trắng đầu tiên...</p>
          </div>
        )}

        <div className="text-center pt-4">
          <Link href="/blog">
            <button className="bg-transparent border border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-[#FAF9F6] text-[11px] font-bold font-heading uppercase tracking-widest px-8 py-3.5 rounded-full transition-all cursor-pointer shadow-sm">
              Lật xem toàn bộ lưu bút
            </button>
          </Link>
        </div>
      </section>

      {/* 🌿 PHÂN ĐOẠN 6: ĐẶC QUYỀN THÀNH VIÊN */}
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

      {/* 🎲 TÍNH NĂNG MỚI B: TRẠM QUẸT ĐỒ NGẪU NHIÊN (LẮC TỦ ĐỒ AI) — GIỮ NGUYÊN VẸN */}
      <button 
        onClick={handleShuffle} 
        className="fixed bottom-24 right-6 z-40 bg-[#183A2D] border border-emerald-400/20 text-white rounded-full px-5 py-3.5 shadow-lg text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition active:scale-95 cursor-pointer hover:bg-emerald-950"
      >
        <Zap size={13} className="text-emerald-400 animate-pulse" />
        <span>🎲 Lắc tủ đồ AI</span>
      </button>

      {/* MODAL HIỂN THỊ KẾT QUẢ "LẮC" — GIỮ NGUYÊN VẸN */}
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
                <span className="text-[9px] font-bold uppercase tracking-widest text-pink-600 bg-pink-50 px-2.5 py-1 rounded-md inline-block">Món đồ định mệnh 🔮</span>
                <h3 className="text-lg font-bold text-stone-900 mt-1">Lắc Tủ Đồ May Mắn</h3>
              </div>

              <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border border-stone-200/30">
                <Image src={randomPick.image} alt={randomPick.title} fill unoptimized className="object-cover" />
                <div className="absolute top-3 left-3 bg-[#183A2D] text-[8px] font-bold text-white px-2 py-0.5 rounded shadow-xs uppercase tracking-wider">
                  {randomPick.type}
                </div>
                <div className="absolute top-3 right-3 bg-red-500 text-[10px] font-bold text-white px-2 py-0.5 rounded shadow-sm font-mono">
                  -{randomPick.savedPercentage}%
                </div>
                <div className="absolute bottom-3 left-3 bg-stone-900/70 backdrop-blur-md text-[9px] font-bold text-white px-2 py-0.5 rounded-md">
                  SIZE {randomPick.size}
                </div>
              </div>

              <div className="space-y-1 text-left">
                <div className="flex justify-between items-center text-[9px] text-stone-400 font-bold uppercase tracking-wider">
                  <span>@{randomPick.ownerName}</span>
                  <span className="flex items-center gap-0.5"><MapPin size={8} className="text-[#6BA37A]" /> {randomPick.location}</span>
                </div>
                <h4 className="text-sm font-bold text-stone-900 line-clamp-1">{randomPick.title}</h4>
                
                <div className="pt-2 flex items-center justify-between border-t border-dashed border-stone-200 mt-1">
                  <div>
                    <span className="text-[8px] font-bold text-stone-400 uppercase block">Đóng góp</span>
                    <p className="text-xs font-black text-[#183A2D] font-mono">{randomPick.rawPriceText}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-bold text-stone-400 uppercase block">Giá gốc Store</span>
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