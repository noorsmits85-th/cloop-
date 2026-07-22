"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { 
  ShoppingBag, Sparkles, Layers, Gift, ShieldCheck, 
  Heart, Handshake, RefreshCw, Leaf, X, Star 
} from "lucide-react";
import Link from "next/link";
import AiStylistChat from "./components/AiStylistChat"; 
import { useAuthModal } from "./AuthModalContext";
import KyUcTuanHoanSection from "./components/KyUcTuanHoanSection";

// Import Hooks & Types
import { useMarketplaceData, type Product } from "./hooks/useMarketplaceData";
import { useTopClosets } from "./hooks/useTopClosets";

interface ServiceItem { tag: string; en: string; icon: any; title: string; desc: string; btn: string; href: string; isModal?: boolean; }

// Nền lụa nhám chuẩn Luxury #FCFAF5
function SilkBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#FCFAF5]">
      <div className="absolute top-[-10%] left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-b from-[#F2EFE8] to-transparent blur-[140px] opacity-80" />
      <div className="absolute top-[20%] right-[-10%] w-[50%] h-[60%] rounded-full bg-gradient-to-l from-stone-100/50 to-transparent blur-[120px]" />
    </div>
  );
}

export default function Home() {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [randomPick, setRandomPick] = useState<Product | null>(null);
  const { handleFeatureRequirement } = useAuthModal();

  const { products, rentalProducts, saleProducts, occasions, productsLoading, recentBlogs } = useMarketplaceData();
  const { topClosets } = useTopClosets();

  // Khối Dịch vụ Boutique
  const services: ServiceItem[] = [
    { tag: "01", en: "Rent", icon: ShoppingBag, title: "Thuê đồ", desc: "Thuê phục trang theo nhu cầu thực tế, tối ưu ngân sách.", btn: "Explore →", href: "/shop?type=rent" },
    { tag: "02", en: "Lend", icon: Handshake, title: "Cho thuê đồ", desc: "Chia sẻ tủ quần áo nhàn rỗi, tạo nguồn thu nhập xanh.", btn: "Explore →", href: "/my-closet/create?mode=rent" },
    { tag: "03", en: "Buy", icon: RefreshCw, title: "Mua sắm", desc: "Sở hữu đồ hiệu second-hand tuyển chọn, chất lượng cao.", btn: "Explore →", href: "/shop?type=sell" },
    { tag: "04", en: "Consign", icon: Layers, title: "Ký gửi", desc: "Ủy thác tủ đồ cũ để bán đứt hoặc phối hợp vận hành.", btn: "Explore →", href: "/my-closet/create?mode=consign" },
    { tag: "05", en: "Upcycle", icon: Leaf, title: "Tái chế", desc: "Gửi quần áo cũ hỏng cho xưởng Upcycle để tái sinh.", btn: "Discover →", href: "#", isModal: true }
  ];

  const privileges = [
    { icon: <Gift size={22} strokeWidth={1.5} />, title: "Tặng Ngay 100 Green Points", desc: "Tích lũy điểm thưởng sau mỗi lần giao dịch để đổi voucher ưu đãi." },
    { icon: <Sparkles size={22} strokeWidth={1.5} />, title: "Trợ Lý AI Stylist", desc: "Mở khóa AI tự động gợi ý phụ kiện, túi xách phù hợp với từng outfit." },
    { icon: <ShieldCheck size={22} strokeWidth={1.5} />, title: "Gian Hàng Tự Quản", desc: "Đăng bài kinh doanh, chia sẻ tủ đồ và quản lý đơn hàng chuyên nghiệp." },
    { icon: <Heart size={22} strokeWidth={1.5} />, title: "Kết Nối Upcycle", desc: "Gửi yêu cầu sửa đổi quần áo cũ trực tiếp đến các đối tác tái chế." }
  ];

  const handleShuffle = () => {
    if (products.length === 0) return;
    const random = products[Math.floor(Math.random() * products.length)];
    setRandomPick(random);
  };

  return (
    <main className="cloop-vogue-scope min-h-screen overflow-x-hidden antialiased relative bg-[#FCFAF5] text-[#2C2C2C] selection:bg-[#183A2D] selection:text-[#FCFAF5]">
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap');
        
        .cloop-vogue-scope { font-family: 'Inter', sans-serif; }
        
        .cloop-vogue-scope .font-editorial { 
          font-family: 'Cormorant Garamond', serif !important; 
          letter-spacing: -0.015em;
        }
        
        .cloop-vogue-scope .font-cta { font-family: 'Plus Jakarta Sans', sans-serif !important; }

        html { scroll-behavior: smooth; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .lux-shadow { box-shadow: 0 12px 30px rgba(33, 33, 33, 0.04); }
        
        .lux-hover { transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
        .lux-hover:hover { 
          transform: translateY(-8px) rotate(-1deg); 
          box-shadow: 0 20px 40px rgba(33, 33, 33, 0.08); 
        }
        .icon-hover { transition: transform 0.5s ease; }
        .lux-hover:hover .icon-hover { transform: scale(1.1) rotate(8deg); }
        
        .btn-gradient:hover {
          background: linear-gradient(120deg, #183A2D, #2B5745);
        }
        
        @keyframes gradient-xy { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .animate-gradient-xy { background-size: 400% 400%; animation: gradient-xy 3s ease infinite; }
      `}</style>

      {/* VOGUE HERO SECTION */}
      <section className="relative overflow-hidden pt-20 pb-28">
        <SilkBackground />
        
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-16 relative">
            
            <div className="w-full lg:w-[50%] space-y-10 text-center lg:text-left mt-10">
              <h1 className="font-editorial text-7xl sm:text-8xl lg:text-[7.5rem] font-light leading-[0.9] text-[#1A1A1A] tracking-tight">
                Discover <br />
                <span className="italic text-[#4A5D4E]">Circular Fashion</span>
              </h1>

              <div className="font-editorial text-2xl text-stone-500 italic flex gap-4 justify-center lg:justify-start items-center">
                <span>mặc đẹp</span>
                <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                <span>mặc bền</span>
                <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                <span>mặc có câu chuyện</span>
              </div>

              <div className="pt-4">
                <Link href="/shop" className="font-cta bg-[#183A2D] btn-gradient text-white text-[13px] font-bold uppercase tracking-[0.2em] px-10 py-5 rounded-full transition-all active:scale-95 shadow-[0_10px_30px_rgba(24,58,45,0.2)] inline-block">
                  Explore →
                </Link>
              </div>
            </div>

            <div className="w-full lg:w-[45%] relative flex items-center justify-center">
              <div className="w-full aspect-[4/5] max-w-[420px] bg-transparent overflow-hidden relative">
                <div className="w-full h-full rounded-[100rem] overflow-hidden relative shadow-[0_20px_60px_rgba(0,0,0,0.1)]">
                  <Image 
                    src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800" 
                    alt="CLOOP Campaign" 
                    fill priority unoptimized
                    className="object-cover object-top filter contrast-[0.95]"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FASHION QUOTE */}
      <section className="py-24 relative z-10 border-t border-stone-200/50 bg-[#FCFAF5]">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-6">
          <Heart className="mx-auto text-stone-300" strokeWidth={1} size={32} />
          <h2 className="font-editorial text-4xl sm:text-5xl font-light italic text-[#2C2C2C] leading-snug">
            "Một chiếc váy không chỉ để mặc.<br/> Nó lưu giữ một phần thanh xuân."
          </h2>
          <p className="text-stone-400 tracking-[0.3em] text-xs uppercase font-cta font-bold mt-4">The Cloop Philosophy</p>
        </div>
      </section>

      {/* BOUTIQUE SERVICE CARDS */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-12 relative z-10 bg-[#FCFAF5]">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {services.map((srv, i) => {
            const ServiceIcon = srv.icon;
            return (
              <Link href={srv.href} key={i} className="block h-full">
                <div className="bg-white p-8 rounded-2xl flex flex-col justify-between lux-shadow lux-hover h-full border border-stone-100 overflow-hidden relative group">
                  
                  <div className="flex justify-between items-start mb-12 relative z-10">
                    <div className="w-12 h-12 rounded-full border border-stone-200 flex items-center justify-center text-stone-700 bg-[#FCFAF5] icon-hover">
                      <ServiceIcon size={20} strokeWidth={1.5} />
                    </div>
                    <span className="font-editorial text-2xl text-stone-300 italic group-hover:text-[#183A2D] transition-colors">{srv.tag}</span>
                  </div>
                  
                  <div className="relative z-10 space-y-4">
                    <div>
                      <h4 className="font-cta text-[10px] uppercase tracking-[0.2em] text-stone-400 font-bold mb-1">{srv.en}</h4>
                      <h3 className="font-editorial text-3xl font-semibold text-[#183A2D]">{srv.title}</h3>
                    </div>
                    <div className="w-6 h-[1px] bg-stone-300 group-hover:bg-[#183A2D] transition-colors" />
                    <p className="text-[13px] text-stone-500 leading-relaxed font-light">{srv.desc}</p>
                  </div>

                  <span className="font-cta text-[11px] font-bold uppercase tracking-[0.1em] text-stone-900 mt-10 flex items-center gap-2 group-hover:text-[#183A2D] transition-colors">
                    {srv.btn}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* EVERY OCCASION HAS ITS OWN STORY */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-20 space-y-10 bg-[#FCFAF5]">
        <div className="text-center space-y-3">
          <h2 className="text-4xl sm:text-5xl font-editorial font-semibold text-[#2C2C2C]">Dress For Every Memory</h2>
          <p className="text-stone-500 text-[15px] font-light italic font-editorial">Khoảnh khắc hôm nay bạn muốn mặc gì?</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-4 justify-items-center">
          {occasions.map((occ) => (
            <Link 
              href={occ.name === "All" ? "/shop" : `/shop?occasion=${occ.name}`}
              key={occ.name}
              className="group flex flex-col items-center space-y-4 cursor-pointer w-full text-center lux-hover"
            >
              <div className="w-full aspect-[3/4] rounded-full overflow-hidden bg-white border border-stone-200/50 p-1.5 shadow-sm relative flex items-center justify-center">
                {occ.img ? (
                  <img src={occ.img} alt={occ.label} className="w-full h-full object-cover rounded-full filter grayscale-[20%] group-hover:grayscale-0 transition-all duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#F8F5EF] rounded-full">
                    <span className="font-editorial italic text-stone-400">Cloop</span>
                  </div>
                )}
              </div>
              <div className="font-cta text-[11px] uppercase tracking-widest font-semibold text-stone-600 group-hover:text-[#183A2D] transition-colors">{occ.label}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* TOP TỦ ĐỒ UY TÍN */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 pt-16 pb-8">
        {topClosets.length > 0 && (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-2 mb-8">
              <p className="font-cta text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400">Trusted Community</p>
              <h3 className="text-4xl font-semibold text-[#2C2C2C] font-editorial flex items-center gap-2 justify-center">
                <Sparkles size={24} className="text-amber-500 fill-amber-500/20" strokeWidth={1} /> 
                Top Tủ Đồ Uy Tín
              </h3>
            </div>
            
            <div className="flex gap-8 overflow-x-auto no-scrollbar py-4 justify-start lg:justify-center snap-x">
              {topClosets.map((c, i) => (
                <Link href={`/closet/${c.userId}`} key={i} className="flex flex-col items-center gap-3 shrink-0 snap-start lux-hover">
                  <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-emerald-500 via-amber-300 to-pink-500 animate-gradient-xy shadow-lg">
                    <div className="w-full h-full rounded-full border-[3px] border-white overflow-hidden bg-stone-100 flex items-center justify-center">
                      {c.avatar ? (
                        <img src={c.avatar} className="w-full h-full object-cover" alt={c.name} />
                      ) : (
                        <span className="font-editorial text-stone-400 font-bold text-xl">{c.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-center w-24">
                    <p className="font-cta text-[11px] font-bold text-stone-800 truncate">@{c.name}</p>
                    <span className="font-cta text-[9px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full mt-1.5 inline-flex items-center gap-1 border border-amber-100">
                      <Star size={8} className="fill-amber-500 text-amber-500"/> {c.avgRating.toFixed(1)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* EDITOR'S PICK (SẢN PHẨM) */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-16 space-y-24">
        
        {/* Tủ đồ Thuê */}
        <div className="space-y-8">
          <div className="border-b border-stone-200 pb-4 flex items-end justify-between">
            <div>
              <p className="font-cta text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 mb-2">Sustainable Choice</p>
              <h3 className="text-4xl font-semibold text-[#2C2C2C] font-editorial">Tủ đồ Thuê tuần hoàn</h3>
            </div>
            <Link href="/shop?type=rent" className="font-cta text-[11px] font-bold uppercase tracking-widest text-[#183A2D] hover:text-stone-500 pb-1">View All →</Link>
          </div>

          <div className="overflow-x-auto no-scrollbar flex gap-8 pb-8 pt-2 snap-x">
            {productsLoading ? (
              [1, 2, 3, 4].map((n) => <div key={n} className="w-[280px] aspect-[3/4] bg-stone-200/40 rounded-sm animate-pulse shrink-0" />)
            ) : rentalProducts.length === 0 ? (
              <p className="text-sm text-stone-500 font-light italic font-editorial">Kho lưu trữ đang cập nhật...</p>
            ) : (
              rentalProducts.slice(0, 8).map((item) => (
                <div key={item.id} className="w-[280px] shrink-0 snap-start group flex flex-col space-y-4 relative text-left lux-hover bg-white p-3 rounded-lg lux-shadow">
                  <div className="w-full aspect-[3/4] bg-stone-50 overflow-hidden relative">
                    <Image src={item.image} alt={item.title} fill unoptimized className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-[9px] font-cta font-bold text-stone-800 px-3 py-1.5 uppercase tracking-widest">
                      Rent
                    </div>
                  </div>

                  <div className="space-y-2 px-1">
                    <div className="font-editorial text-lg text-stone-900 font-semibold truncate group-hover:text-[#183A2D] transition-colors">
                      {item.title}
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-cta text-stone-500 tracking-wide">
                      <span className="uppercase">@{item.ownerName}</span>
                      <span>{item.rawPriceText}</span>
                    </div>
                  </div>
                  <Link href={`/product/${item.id}`} className="absolute inset-0 z-0"><span className="sr-only">Xem chi tiết</span></Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kệ đồ Bán */}
        <div className="space-y-8">
          <div className="border-b border-stone-200 pb-4 flex items-end justify-between">
            <div>
              <p className="font-cta text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 mb-2">Second-hand Luxury</p>
              <h3 className="text-4xl font-semibold text-[#2C2C2C] font-editorial">Kệ thanh lý phục trang</h3>
            </div>
            <Link href="/shop?type=sell" className="font-cta text-[11px] font-bold uppercase tracking-widest text-[#183A2D] hover:text-stone-500 pb-1">View All →</Link>
          </div>

          <div className="overflow-x-auto no-scrollbar flex gap-8 pb-8 pt-2 snap-x">
            {productsLoading ? (
              [1, 2, 3, 4].map((n) => <div key={n} className="w-[280px] aspect-[3/4] bg-stone-200/40 rounded-sm animate-pulse shrink-0" />)
            ) : saleProducts.length === 0 ? (
              <p className="text-sm text-stone-500 font-light italic font-editorial">Kho lưu trữ đang cập nhật...</p>
            ) : (
              saleProducts.slice(0, 8).map((item) => (
                <div key={item.id} className="w-[280px] shrink-0 snap-start group flex flex-col space-y-4 relative text-left lux-hover bg-white p-3 rounded-lg lux-shadow">
                  <div className="w-full aspect-[3/4] bg-stone-50 overflow-hidden relative">
                    <Image src={item.image} alt={item.title} fill unoptimized className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                    <div className="absolute top-3 left-3 bg-[#183A2D]/90 backdrop-blur text-[9px] font-cta font-bold text-white px-3 py-1.5 uppercase tracking-widest">
                      Buy Out
                    </div>
                  </div>

                  <div className="space-y-2 px-1">
                    <div className="font-editorial text-lg text-stone-900 font-semibold truncate group-hover:text-[#183A2D] transition-colors">
                      {item.title}
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-cta text-stone-500 tracking-wide">
                      <span className="uppercase">@{item.ownerName}</span>
                      <span>{item.rawPriceText}</span>
                    </div>
                  </div>
                  <Link href={`/product/${item.id}`} className="absolute inset-0 z-0"><span className="sr-only">Xem chi tiết</span></Link>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* TẠP CHÍ BLOG SECTION */}
      <KyUcTuanHoanSection recentBlogs={recentBlogs} />

      {/* ĐĂNG KÝ BOUTIQUE */}
      <section id="register-privilege" className="max-w-[1400px] mx-auto px-6 lg:px-12 py-24 relative z-10">
        <div className="bg-[#F8F5EF] rounded-[2rem] p-10 lg:p-16 lux-shadow flex flex-col lg:flex-row items-center justify-between gap-16 relative overflow-hidden border border-stone-200/60">
          <div className="w-full lg:w-[50%] relative z-10 space-y-8">
            <div>
              <div className="font-cta text-[10px] font-bold tracking-[0.3em] uppercase text-[#6BA37A] mb-4">Cloop Membership</div>
              <h2 className="text-4xl lg:text-5xl font-editorial font-semibold leading-tight text-[#1A1A1A]">
                Trải nghiệm <br/> <span className="italic font-light">đặc quyền xanh.</span>
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10">
              {privileges.map((item: any, idx: number) => (
                <div key={idx} className="flex gap-4 items-start group">
                  <div className="text-stone-400 group-hover:text-[#183A2D] transition-colors">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold font-editorial text-stone-900 mb-1">{item.title}</h4>
                    <p className="text-[13px] text-stone-500 font-light leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full lg:w-[40%] relative z-10 bg-white p-12 rounded-[1.5rem] text-center lux-shadow border border-stone-100">
            <h3 className="text-3xl font-semibold text-stone-900 font-editorial mb-3">Join The Circle</h3>
            <p className="text-[13px] text-stone-500 mb-10 font-light">Thiết lập tủ đồ xanh của riêng bạn chỉ trong 30 giây.</p>
            
            <button onClick={() => handleFeatureRequirement("Mở tủ đồ xanh")} className="w-full font-cta text-[11px] font-bold uppercase tracking-[0.2em] py-5 rounded-none bg-[#183A2D] text-white hover:bg-[#2C2C2C] transition-colors">
              Đăng ký ngay
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER ĐIỆN ẢNH */}
      <section className="mt-12 bg-[#1A1A1A] pt-24 pb-20 relative overflow-hidden flex flex-col items-center">
        <h1 className="font-editorial text-[15vw] leading-[0.8] font-light italic text-[#F8F5EF]/10 select-none text-center w-full block pointer-events-none">
          Cloop
        </h1>
        <div className="text-center mt-8 relative z-10">
          <p className="text-[#F8F5EF]/50 font-cta text-[10px] sm:text-[11px] tracking-[0.4em] uppercase font-semibold">
            The Future of Circular Fashion
          </p>
        </div>
      </section>

      {/* FLOATING ACTION BUTTON */}
      <button 
        onClick={handleShuffle} 
        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 bg-white/90 backdrop-blur-md border border-stone-200 text-stone-800 rounded-full px-6 py-4 lux-shadow text-[11px] font-cta font-bold uppercase tracking-[0.15em] flex items-center gap-2 transition hover:-translate-y-1 hover:shadow-xl"
      >
        <Sparkles size={14} className="text-[#183A2D]" strokeWidth={1.5} />
        <span>Editor's Pick</span>
      </button>

      {/* MODAL LẮC TỦ ĐỒ */}
      <AnimatePresence>
        {randomPick && (
          <div className="fixed inset-0 z-[100] bg-[#1A1A1A]/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setRandomPick(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 20 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-[#FCFAF5] rounded-xl max-w-sm w-full overflow-hidden p-6 relative flex flex-col space-y-6" 
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setRandomPick(null)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 transition-colors z-10">
                <X size={20} strokeWidth={1.5} />
              </button>

              <div className="text-center space-y-1 pt-2">
                <span className="font-cta text-[9px] font-bold uppercase tracking-[0.2em] text-stone-400">Featured</span>
                <h3 className="text-3xl font-editorial font-semibold text-stone-900">For You</h3>
              </div>

              <div className="relative w-full aspect-[3/4] overflow-hidden bg-stone-100">
                <Image src={randomPick.image} alt={randomPick.title} fill unoptimized className="object-cover" />
                <div className="absolute top-3 left-3 bg-white/90 font-cta text-[9px] font-bold text-stone-800 px-3 py-1.5 uppercase tracking-widest">
                  {randomPick.type}
                </div>
              </div>

              <div className="space-y-3 text-center">
                <h4 className="text-xl font-semibold text-stone-900 font-editorial">{randomPick.title}</h4>
                <div className="flex justify-center items-center text-[11px] font-cta text-stone-500 tracking-widest uppercase gap-3">
                  <span>@{randomPick.ownerName}</span>
                  <span className="w-1 h-1 bg-stone-300 rounded-full" />
                  <span>{randomPick.rawPriceText}</span>
                </div>
              </div>

              <div className="pt-2">
                <Link href={`/product/${randomPick.id}`} className="block">
                  <button className="w-full bg-[#183A2D] text-white py-4 font-cta text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#2C2C2C] transition-colors">
                    Khám phá chi tiết
                  </button>
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AiStylistChat darkMode={darkMode} />
    </main>
  );
}