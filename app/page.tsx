"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { 
  Search, ShoppingBag, ArrowRight, Sparkles, MapPin, 
  Layers, Star, Plus, Gift, ShieldCheck, Heart, Zap, Shield,
  Handshake, RefreshCw, Leaf, Users, Shirt, Sun, Moon, X, Pin, BookOpen,
  ChevronLeft, ChevronRight
} from "lucide-react";
import Link from "next/link";
import AiStylistChat from "./components/AiStylistChat"; 
import { useAuthModal } from "./AuthModalContext";
import KyUcTuanHoanSection from "./components/KyUcTuanHoanSection";

// Import Hooks & Types từ file vừa tạo
import { useMarketplaceData, type Product } from "./hooks/useMarketplaceData";
import { useTopClosets } from "./hooks/useTopClosets";

interface ServiceItem { tag: string; icon: any; title: string; desc: string; btn: string; href: string; isModal?: boolean; }

// Nền sáng Xanh Matcha chuẩn vibe Canva sạch sẽ mượt mà
function MatchaGlowBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#FCFCFB]">
      <div className="absolute top-[-15%] left-[5%] w-[80%] h-[70%] rounded-full bg-gradient-to-b from-emerald-100/60 to-transparent blur-[120px] mix-blend-multiply opacity-90" />
      <div className="absolute top-[10%] right-[-10%] w-[40%] h-[60%] rounded-full bg-gradient-to-l from-teal-50/50 to-transparent blur-[100px] mix-blend-multiply" />
    </div>
  );
}

export default function Home() {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [randomPick, setRandomPick] = useState<Product | null>(null);
  const { handleFeatureRequirement } = useAuthModal();

  // 👉 GỌI DATA TỪ HOOKS BÊN NGOÀI
  const { 
    products, 
    rentalProducts, 
    saleProducts, 
    occasions, 
    productsLoading, 
    recentBlogs 
  } = useMarketplaceData();

  const { topClosets } = useTopClosets();

  const services: ServiceItem[] = [
    { tag: "01", icon: ShoppingBag, title: "THUÊ ĐỒ", desc: "Thuê phục trang theo nhu cầu thực tế, tối ưu ngân sách.", btn: "Khám phá ngay →", href: "/shop?type=rent" },
    { tag: "02", icon: Handshake, title: "CHO THUÊ ĐỒ", desc: "Chia sẻ tủ quần áo nhàn rỗi, tạo nguồn thu nhập xanh.", btn: "Đăng cho thuê →", href: "/my-closet/create?mode=rent" },
    { tag: "03", icon: RefreshCw, title: "MUA SẮM", desc: "Sở hữu đồ hiệu second-hand tuyển chọn, chất lượng cao.", btn: "Mua sắm ngay →", href: "/shop?type=sell" },
    { tag: "04", icon: Layers, title: "KÝ GỬI", desc: "Ủy thác tủ đồ cũ để bán đứt hoặc phối hợp vận hành.", btn: "Ký gửi ngay →", href: "/my-closet/create?mode=consign" },
    { tag: "05", icon: Leaf, title: "TÁI CHẾ", desc: "Gửi quần áo cũ hỏng cho xưởng Upcycle để tái sinh.", btn: "Tìm hiểu ngay →", href: "#", isModal: true }
  ];

  const privileges = [
    { icon: <Gift size={20} />, title: "Tặng Ngay 100 Green Points", desc: "Tích lũy điểm thưởng sau mỗi lần thuê hoặc tái chế đồ để đổi voucher ưu đãi." },
    { icon: <Sparkles size={20} />, title: "Trợ Lý Phối Đồ AI Stylist", desc: "Mở khóa tính năng AI tự động gợi ý phụ kiện, túi xách phù hợp với từng outfit." },
    { icon: <ShieldCheck size={20} />, title: "Mở Gian Hàng Tự Quản", desc: "Bất kỳ cá nhân nào cũng có thể đăng bài kinh doanh, chia sẻ tủ đồ tăng thu nhập." },
    { icon: <Heart size={20} />, title: "Kết Nối Xưởng Upcycle", desc: "Gửi yêu cầu thiết kế và sửa đổi quần áo cũ trực tiếp đến các đối tác tái chế." }
  ];

  const handleShuffle = () => {
    if (products.length === 0) return;
    const random = products[Math.floor(Math.random() * products.length)];
    setRandomPick(random);
  };

  return (
    <main className="min-h-screen overflow-x-hidden antialiased relative bg-[#FCFCFB] text-stone-900 selection:bg-[#183A2D] selection:text-white">
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600;700&display=swap');
        
        body, input, textarea, button, p, span, div {
          font-family: 'Inter', sans-serif !important;
        }
        
        /* Gắn font hoài cổ (Vintage) cho các Tiêu đề lớn */
        .editorial-title, .font-heading, h1, h2, h3 {
          font-family: 'Cormorant Garamond', serif !important;
          letter-spacing: -0.01em !important;
        }

        html { scroll-behavior: smooth; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Đã vá lỗi vòng xoay gradient-xy cho Avatar Top Tủ Đồ */
        @keyframes gradient-xy { 
          0%, 100% { background-position: 0% 50%; } 
          50% { background-position: 100% 50%; } 
        }
        .animate-gradient-xy { 
          background-size: 400% 400%; 
          animation: gradient-xy 3s ease infinite; 
        }
      `}</style>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-16">
        <MatchaGlowBackground />

        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-14 relative text-left">
            
            <div className="w-full lg:w-[48%] space-y-6">
              <div className="inline-flex items-center gap-1.5 bg-[#183A2D]/5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase text-[#183A2D]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#183A2D] inline-block animate-pulse" />
                <span>Nền tảng thời trang số tuần hoàn</span>
              </div>

              <h1 className="font-heading text-6xl sm:text-7xl lg:text-[6.5rem] font-black tracking-tighter leading-[0.95] text-[#183A2D] drop-shadow-lg">
                Mặc đẹp hơn. <br />
                Tiêu ít hơn. <br />
                <span className="text-[#6BA37A] italic">Sống xanh hơn.</span>
              </h1>

              <p className="text-sm sm:text-base text-gray-600 max-w-lg leading-relaxed font-medium">
                CLOOP là nền tảng thời trang tuần hoàn. Thuê, cho thuê, mua bán và tái chế thời trang để kéo dài vòng đời sản phẩm — vì một tương lai bền vững của cộng đồng tiêu dùng thông minh.
              </p>

              <div className="pt-4 flex items-center gap-3">
                <Link href="/shop" className="bg-[#183A2D] hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider px-8 py-4 rounded-full transition-all shadow-md active:scale-95">
                  Khám phá ngay →
                </Link>
                <Link href="#register-privilege" className="border border-stone-300 hover:bg-stone-50 text-[#183A2D] text-xs font-bold uppercase tracking-wider px-8 py-4 rounded-full transition-all bg-white/80 backdrop-blur-sm shadow-sm">
                  Tìm hiểu thêm
                </Link>
              </div>
            </div>

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

      {/* KHỐI TÍNH NĂNG CHÍNH */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-6 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {services.map((srv, i) => {
            const ServiceIcon = srv.icon;
            return (
              <Link href={srv.href} key={i} className="block h-full">
                <div className="bg-white p-6 xl:p-8 rounded-[2rem] flex flex-col justify-between transition-all duration-500 relative group cursor-pointer text-left h-full shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_40px_rgba(24,58,45,0.08)] border border-stone-100 hover:border-[#183A2D]/30 overflow-hidden hover:-translate-y-2">
                  
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/0 to-emerald-50/0 group-hover:from-emerald-50/50 group-hover:to-transparent transition-colors duration-500" />
                  
                  <span className="absolute top-5 right-6 text-3xl text-stone-100 font-heading font-black italic group-hover:text-emerald-100 transition-colors">{srv.tag}</span>
                  
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#183A2D] to-emerald-800 text-white flex items-center justify-center mb-6 shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                      <ServiceIcon size={24} strokeWidth={2} />
                    </div>
                    
                    <h3 className="text-base lg:text-lg font-black uppercase tracking-widest mb-3 text-[#183A2D] font-heading drop-shadow-sm">{srv.title}</h3>
                    <div className="w-8 h-1 bg-emerald-400 rounded-full mb-4 transition-all duration-300 group-hover:w-16" />

                    <p className="text-xs text-stone-500 leading-relaxed mb-8 font-medium">{srv.desc}</p>
                  </div>

                  <span className="relative z-10 text-[11px] font-black uppercase tracking-widest text-center bg-[#FAF9F5] text-[#183A2D] py-3.5 rounded-xl group-hover:bg-[#183A2D] group-hover:text-white transition-all duration-300 block border border-stone-200 group-hover:border-[#183A2D]">
                    {srv.btn}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* TÌM KIẾM DỊP MẶC ĐỒ */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-8 space-y-6">
        <div className="text-left space-y-1">
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight font-heading">Tìm kiếm theo dịp mặc đồ</h2>
          <p className="text-gray-600 text-sm font-medium">Lựa chọn trang phục hài hòa cùng điểm đến để mọi trải nghiệm thêm phần trọn vẹn.</p>
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

      {/* DANH SÁCH TỦ ĐỒ (TỔNG HỢP) */}
      <section className="max-w-[1500px] mx-auto px-6 lg:px-12 py-6 space-y-12">
        
        {/* Top Tủ Đồ Uy Tín */}
        {topClosets.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 border-b border-stone-200/60 pb-2 text-left">
              <Sparkles size={16} className="text-amber-500 fill-amber-500" />
              <h3 className="text-sm font-bold text-stone-800 uppercase tracking-widest font-heading">Top Tủ Đồ Uy Tín</h3>
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
                    <p className="text-[11px] font-bold text-stone-800 truncate">@{c.name}</p>
                    <span className="text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-200/40 px-2 py-0.5 rounded-full mt-0.5 inline-block">★ {c.avgRating.toFixed(1)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tủ đồ Thuê */}
        <div className="space-y-4">
          <div className="border-b border-stone-200/60 pb-3 text-left">
            <h3 className="text-2xl font-bold text-[#183A2D] flex items-center gap-1.5 mb-1 font-heading">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block animate-pulse" />
              <span>Tủ đồ cho thuê tuần hoàn</span>
            </h3>
            <p className="text-sm text-gray-500 font-medium">Kho đồ cho thuê linh hoạt. Tiêu dùng thông minh, sống xanh bền vững.</p>
          </div>

          <div className="overflow-x-auto no-scrollbar flex gap-6 pb-4 pt-1 snap-x">
            {productsLoading ? (
              [1, 2, 3, 4].map((n) => (
                <div key={n} className="w-[240px] aspect-[3/4] bg-stone-200/40 rounded-2xl animate-pulse shrink-0" />
              ))
            ) : rentalProducts.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 pl-2 font-medium">Kho lưu trữ trang phục cho thuê tạm thời đang cập nhật sản phẩm mới.</p>
            ) : (
              rentalProducts.slice(0, 8).map((item) => (
                <div key={item.id} className="w-[240px] shrink-0 snap-start group flex flex-col space-y-2.5 relative text-left">
                  <div className="w-full aspect-[3/4] bg-stone-50 rounded-2xl overflow-hidden relative border border-stone-200/30">
                    <Image src={item.image} alt={item.title} fill unoptimized className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]" />
                    <div className="absolute top-3 left-3 bg-[#183A2D] text-[9px] font-bold text-white px-2.5 py-1 rounded shadow-xs uppercase tracking-wider z-10 font-heading">
                      RENTAL
                    </div>
                    <div className="absolute top-3 right-3 bg-red-500 text-[10px] font-bold text-white px-2 py-1 rounded shadow-sm font-mono z-10">
                      -{item.savedPercentage}%
                    </div>
                  </div>

                  <div className="space-y-1.5 px-1 text-xs font-normal">
                    <div className="text-[#183A2D] font-bold truncate font-heading relative z-10 text-sm">
                      <Link href={`/closet/${item.userId}`} className="hover:text-stone-600 font-bold transition-colors">@{item.ownerName}</Link>
                    </div>
                    <div className="text-gray-500 truncate font-medium">
                      Địa chỉ: <span className="text-gray-800 font-semibold">{item.location}</span>
                    </div>
                    <div className="text-gray-500 flex items-center gap-1 font-medium">
                      Sao: <span className="text-amber-600 font-bold flex items-center gap-0.5">★ {item.rating}</span>
                    </div>
                    <div className="text-stone-900 font-mono font-extrabold pt-1 text-[13px]">
                      {item.rawPriceText}
                    </div>
                  </div>
                  <Link href={`/product/${item.id}`} className="absolute inset-0 z-0"><span className="sr-only">Xem chi tiết {item.title}</span></Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kệ đồ Bán */}
        <div className="space-y-4">
          <div className="border-b border-stone-200/60 pb-3 text-left">
            <h3 className="text-2xl font-bold text-[#183A2D] flex items-center gap-1.5 mb-1 font-heading">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block animate-pulse" />
              <span>Kệ thanh lý phục trang</span>
            </h3>
            <p className="text-sm text-gray-500 font-medium">Không gian mua sắm thời trang sở hữu vòng đời thứ hai chất lượng cao.</p>
          </div>

          <div className="overflow-x-auto no-scrollbar flex gap-6 pb-4 pt-1 snap-x">
            {productsLoading ? (
              [1, 2, 3, 4].map((n) => (
                <div key={n} className="w-[240px] aspect-[3/4] bg-stone-200/40 rounded-2xl animate-pulse shrink-0" />
              ))
            ) : saleProducts.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 pl-2 font-medium">Kho lưu trữ phục trang thanh lý hiện đang cập nhật sản phẩm.</p>
            ) : (
              saleProducts.slice(0, 8).map((item) => (
                <div key={item.id} className="w-[240px] shrink-0 snap-start group flex flex-col space-y-2.5 relative text-left">
                  <div className="w-full aspect-[3/4] bg-stone-50 rounded-2xl overflow-hidden relative border border-stone-200/30">
                    <Image src={item.image} alt={item.title} fill unoptimized className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]" />
                    <div className="absolute top-3 left-3 bg-blue-700 text-[9px] font-bold text-white px-2.5 py-1 rounded shadow-xs tracking-wider font-heading z-10">
                      BUY OUT
                    </div>
                    <div className="absolute top-3 right-3 bg-stone-900/80 text-[10px] font-bold text-white px-2 py-1 rounded shadow-sm font-mono z-10">
                      -{item.savedPercentage}%
                    </div>
                  </div>

                  <div className="space-y-1.5 px-1 text-xs font-normal">
                    <div className="text-[#183A2D] font-bold truncate font-heading relative z-10 text-sm">
                      <Link href={`/closet/${item.userId}`} className="hover:text-stone-600 font-bold transition-colors">@{item.ownerName}</Link>
                    </div>
                    <div className="text-gray-500 truncate font-medium">
                      Địa chỉ: <span className="text-gray-800 font-semibold">{item.location}</span>
                    </div>
                    <div className="text-gray-500 flex items-center gap-1 font-medium">
                      Sao: <span className="text-amber-600 font-bold flex items-center gap-0.5">★ {item.rating}</span>
                    </div>
                    <div className="text-stone-900 font-mono font-extrabold pt-1 text-[13px]">
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

      <KyUcTuanHoanSection recentBlogs={recentBlogs} />

      {/* FORM ĐĂNG KÝ (Đặc quyền xanh) */}
      <section id="register-privilege" className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-12 py-12 relative z-10">
        <div className="bg-white/70 backdrop-blur-xl border border-stone-200/60 rounded-[3rem] p-8 lg:p-14 shadow-[0_8px_30px_rgba(24,58,45,0.03)] flex flex-col lg:flex-row items-center justify-between gap-12 relative overflow-hidden">
          <div className="w-full lg:w-[55%] relative z-10">
            <div className="font-heading text-xl text-[#6BA37A] italic mb-3">CLOOP Fashion</div>
            <h2 className="text-4xl lg:text-5xl font-bold font-heading leading-tight tracking-tight mb-4 text-[#183A2D]">
              Đăng ký tài khoản để trải nghiệm <br/><span className="text-[#6BA37A] italic">trọn vẹn đặc quyền xanh</span>
            </h2>
            <p className="text-sm text-stone-500 mb-8 font-medium leading-relaxed">
              Trở thành một phần của hệ sinh thái thời trang tuần hoàn. Chia sẻ tủ đồ, gia tăng thu nhập và bảo vệ môi trường.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8">
              {privileges.map((item: any, idx: number) => (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100/50">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 mb-1.5">{item.title}</h4>
                    <p className="text-xs text-stone-500 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full lg:w-[38%] relative z-10 bg-[#FAF9F6] p-10 rounded-[2.5rem] text-center shadow-lg border border-stone-200/50">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-6 mx-auto text-[#183A2D] shadow-sm border border-stone-100">
              <Zap size={24} className="fill-emerald-600" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 font-heading mb-2">Kích Hoạt Tài Khoản</h3>
            <p className="text-sm text-gray-500 mb-8 font-medium">Chỉ mất 30 giây để thiết lập tủ đồ xanh của riêng bạn trên nền tảng.</p>
            
            <button onClick={() => handleFeatureRequirement("Mở tủ đồ xanh")} className="w-full text-sm font-bold uppercase tracking-widest py-4 rounded-2xl shadow-[0_8px_20px_rgba(24,58,45,0.15)] bg-[#183A2D] text-white hover:bg-emerald-900 transition-all active:scale-[0.98] hover:-translate-y-1">
              Đăng ký ngay
            </button>
          </div>
        </div>
      </section>

      {/* ĐIỂM NHẤN CLOOP KHỔNG LỒ */}
      <section className="mt-8 bg-[#0B1E15] rounded-t-[3rem] lg:rounded-t-[4rem] pt-20 pb-16 relative overflow-hidden flex flex-col items-center border-t border-emerald-900/30">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
        <h1 className="font-logo text-[18vw] leading-[0.75] font-black text-white/5 select-none tracking-[0.05em] text-center w-full block pointer-events-none drop-shadow-2xl">
          CLOOP
        </h1>
        <div className="text-center mt-6 relative z-10">
          <p className="text-emerald-400/60 font-body text-[10px] sm:text-xs tracking-[0.4em] uppercase font-bold">
            The Future of Circular Fashion
          </p>
        </div>
      </section>

      {/* FLOATING ACTION BUTTON - LẮC TỦ ĐỒ */}
      <button 
        onClick={handleShuffle} 
        className="fixed bottom-24 right-6 z-40 bg-[#183A2D] border border-emerald-400/20 text-white rounded-full px-5 py-3.5 shadow-lg text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition active:scale-95 cursor-pointer hover:bg-emerald-950 font-heading"
      >
        <Zap size={13} className="text-emerald-400 animate-pulse" />
        <span>🎲 Lắc tủ đồ AI</span>
      </button>

      {/* MODAL LẮC TỦ ĐỒ (Chạy chung state randomPick) */}
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