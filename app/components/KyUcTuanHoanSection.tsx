"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, Leaf, Users, Shirt, Droplet, ArrowRight } from "lucide-react";

interface BlogPreview {
  id: string;
  title: string;
  content: string;
  coverImage: string;
  album?: string[];
  createdAt: string;
  authorName?: string;
  authorAvatar?: string;
}

interface Props {
  recentBlogs: BlogPreview[];
}

// 📈 Bộ đếm số ESG tự động kích hoạt nhảy số khi cuộn màn hình tới vị trí[cite: 5]
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
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasRun, target, duration]);

  return <span ref={ref}>{count.toLocaleString("vi-VN")}{suffix}</span>;
}

export default function KyUcTuanHoanSection({ recentBlogs }: Props) {
  // Trích xuất bài viết động: Bài chính là bài mới nhất, ảnh Polaroid dùng bài thứ hai (nếu có) để tạo sự phong phú dữ liệu[cite: 5]
  const mainStory = recentBlogs?.[0] || {
    id: "default-1",
    title: "Hành trình của một chiếc áo len",
    content: "Từ những ngày đông lạnh giá cho đến một vòng đời mới đầy ý nghĩa...",
    coverImage: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600",
    createdAt: new Date().toISOString(),
    authorName: "Trang Hoài",
    authorAvatar: ""
  };
  
  const polaroidStory = recentBlogs?.[1] || mainStory;

  const statsData = [
    { num: 2000, suffix: "+", label: "Sản phẩm", sub: "Đa dạng và chất lượng", icon: Shirt },
    { num: 1000, suffix: "+", label: "Người dùng", sub: "Tin tưởng và đồng hành", icon: Users },
    { num: 12500, suffix: " kg", label: "CO₂ đã giảm", sub: "Cùng nhau bảo vệ hành tinh", icon: Leaf },
    { num: 5000000, suffix: " lít", label: "Nước được tiết kiệm", sub: "Giảm tiêu thụ tài nguyên", icon: Droplet },
  ];

  return (
    <section className="relative max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-12 py-20 overflow-hidden bg-[#FAF9F6]">
      
      {/* 🔐 NHÚNG KHÓA HỆ PHÔNG CHỮ VÀ HIỆU ỨNG ĐỔ BÓNG TRANG TRÍ SCRAPBOOK[cite: 5] */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Caveat:wght@500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

        .kyuc-heading { font-family: 'Cormorant Garamond', serif !important; }
        .kyuc-hand { font-family: 'Caveat', cursive !important; }
        .kyuc-body { font-family: 'Inter', sans-serif !important; }

        /* 🎀 Dải lụa satin tơ tằm chuyển động mượt mà lót dưới nền[cite: 5] */
        .kyuc-silk {
          position: absolute;
          width: 160%;
          height: 220px;
          left: -30%;
          border-radius: 999px;
          background: linear-gradient(100deg, #ffffff, #F3EEE1, #ffffff, #EDE6D3, #ffffff);
          filter: blur(14px);
          opacity: .85;
          animation: kyucSilkMove 14s ease-in-out infinite;
        }
        .kyuc-silk-1 { top: -40px; transform: rotate(-3deg); }
        .kyuc-silk-2 { top: 65%; transform: rotate(2deg); opacity: .6; animation-delay: -5s; }
        
        @keyframes kyucSilkMove {
          0%, 100% { transform: translateX(0) rotate(-3deg); }
          50% { transform: translateX(40px) rotate(-1.5deg); }
        }

        /* Vân băng dính Washi xé rách mờ nghệ thuật[cite: 5] */
        .kyuc-tape {
          position: absolute;
          background: repeating-linear-gradient(45deg, rgba(217,199,158,0.45), rgba(217,199,158,0.45) 3px, rgba(232,220,190,0.45) 3px, rgba(232,220,190,0.45) 6px);
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          backdrop-filter: blur(0.5px); /* 🛠️ ĐÃ SỬA: Chuyển đổi chuẩn xác về thuộc tính CSS thuần bọc mờ */
        }

        /* Nền họa tiết lưới tập vở sổ tay lưu bút[cite: 5] */
        .bg-scrapbook-canvas {
          background-color: #f5f1e6;
          background-image: 
            linear-gradient(rgba(215, 204, 185, 0.25) 1px, transparent 1px),
            linear-gradient(90deg, rgba(215, 204, 185, 0.25) 1px, transparent 1px);
          background-size: 24px 24px;
        }
      `}</style>

      {/* Lớp lụa satin mượt mà ẩn sau nền[cite: 5] */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[3rem] -z-10">
        <div className="kyuc-silk kyuc-silk-1" />
        <div className="kyuc-silk kyuc-silk-2" />
      </div>

      {/* 🌿 Nhành lá cây vector trang trí góc trên bên trái[cite: 5] */}
      <svg className="absolute top-6 left-0 w-44 h-44 text-[#7C9473]/60 pointer-events-none hidden xl:block z-10" viewBox="0 0 100 100" fill="none">
        <path d="M10 90 Q 30 60 20 20 Q 40 40 35 70 Q 55 45 45 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx="22" cy="35" rx="8" ry="3.5" fill="currentColor" opacity="0.65" transform="rotate(40 22 35)" />
        <ellipse cx="33" cy="55" rx="8" ry="3.5" fill="currentColor" opacity="0.65" transform="rotate(-30 33 55)" />
      </svg>

      {/* 🌿 Nhành lá cây vector trang trí góc trên bên phải[cite: 5] */}
      <svg className="absolute top-4 right-0 w-52 h-54 text-[#7C9473]/50 pointer-events-none hidden xl:block z-10" viewBox="0 0 100 100" fill="none">
        <path d="M90 90 Q 60 70 70 30 Q 45 45 55 75 Q 30 55 40 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx="65" cy="42" rx="8" ry="3.5" fill="currentColor" opacity="0.65" transform="rotate(-40 65 42)" />
        <ellipse cx="52" cy="62" rx="8" ry="3.5" fill="currentColor" opacity="0.65" transform="rotate(30 52 62)" />
      </svg>

      {/* Khối tiêu đề phân đoạn[cite: 5] */}
      <div className="relative z-10 text-center space-y-4 mb-12">
        <span className="inline-flex items-center gap-1.5 bg-white/80 backdrop-blur-sm border border-[#B9C4A9]/60 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-[#5C7A54] kyuc-body shadow-2xs">
          <Leaf size={11} /> Dấu ấn thanh xuân
        </span>
        <h2 className="kyuc-heading text-5xl sm:text-6xl font-medium text-[#1F3D2B] flex items-center justify-center gap-2 flex-wrap tracking-tight">
          Ký Ức <span className="text-[#7C9473] italic font-normal">Tuần Hoàn</span>
          <Sparkles size={26} className="text-amber-400 fill-amber-300" />
        </h2>
        <p className="kyuc-body text-stone-500 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
          Mỗi nếp gấp áo là một câu chuyện chưa kể. Hãy để những kỷ niệm rực rỡ nhất được sống lại và viết tiếp vòng đời mới trên cuốn lưu bút của CLOOP.
        </p>
      </div>

      {/* KHỐI KHUNG SỔ TAY CHÍNH (Scrapbook Board Wrapper)[cite: 5] */}
      <div className="relative z-10 bg-[#EDE6D3] rounded-[2.5rem] border border-[#D8CBA8]/60 shadow-[0_20px_50px_rgba(0,0,0,0.06)] px-5 sm:px-10 py-12 sm:py-14 max-w-[1300px] mx-auto">
        <div className="bg-scrapbook-canvas rounded-[2rem] border border-[#e2d7c0] p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr_1.4fr] gap-10 items-stretch">

          {/* 1. KHỐI ẢNH POLAROID KÈM KẸP GIẤY VÀ WASHI TAPE[cite: 5] */}
          <div className="flex items-center justify-center py-2">
            <div className="relative bg-white p-3.5 pb-11 rounded-xs shadow-[0_12px_35px_rgba(0,0,0,0.1)] border border-stone-200 transform -rotate-3 hover:rotate-0 transition-transform duration-500 w-full max-w-[270px]">
              
              {/* Kẹp giấy kim loại mộc mạc phía đầu ảnh (SVG cổ điển)[cite: 5] */}
              <svg className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 text-stone-400/90 drop-shadow-3xs z-20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2 L12 16 A4 4 0 0 1 4 16 L4 6 A2.5 2.5 0 0 1 9 6 L9 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>

              {/* Khung ảnh chân thực[cite: 5] */}
              <div className="relative w-full aspect-[4/5] bg-stone-100 overflow-hidden rounded-xs border border-stone-100">
                <Image src={polaroidStory.coverImage} alt={polaroidStory.title} fill unoptimized className="object-cover object-top filter sepia-[0.04]" />
              </div>
              <p className="kyuc-hand text-xl text-stone-700 text-center mt-3 tracking-wide">Hè 2022, Đà Lạt ♥</p>
              
              {/* Băng keo dán mờ đè chân ảnh[cite: 5] */}
              <div className="kyuc-tape absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-5 rotate-[-2deg]" />
            </div>
          </div>

          {/* 2. GIẤY NOTE CỦA SỔ TAY LÒ XO CÓ ĐỤC LỖ RÁCH[cite: 5] */}
          <div className="relative bg-[#FCFAF2] rounded-sm shadow-[0_8px_25px_rgba(24,58,45,0.04)] p-6 pt-9 border border-[#E4DCCE] transform rotate-2 hover:rotate-0 transition-transform duration-500 max-w-[310px] mx-auto w-full flex flex-col justify-between min-h-[320px]">
            
            {/* Lò xo đục lỗ rách sổ tay chèn chéo đỉnh[cite: 5] */}
            <div className="absolute top-0 left-4 right-4 h-3 flex justify-between px-2 opacity-70">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-full bg-[#EDE6D3] border-b border-stone-300/60 shadow-inner" />
              ))}
            </div>
            
            {/* Băng dính Washi dán đầu note cố định[cite: 5] */}
            <div className="kyuc-tape absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-5 rotate-[1deg]" />

            <div className="space-y-3 pt-2">
              <h3 className="kyuc-hand text-2xl font-bold text-[#1F3D2B]">Chiếc váy hoa đầu tiên ♡</h3>
              <p className="kyuc-hand text-[18px] text-stone-600 leading-snug text-justify">
                {mainStory.content.length > 150 ? mainStory.content.slice(0, 150) + "…" : mainStory.content}
              </p>
            </div>

            {/* Chân mảnh giấy chứa mộc dấu bưu điện cổ và nhánh cỏ thảo mộc[cite: 5] */}
            <div className="flex justify-between items-end mt-4 pt-4 border-t border-dashed border-stone-200/60">
              {/* Nhánh lá nhỏ thảo mộc góc trái[cite: 5] */}
              <svg className="w-8 h-8 text-[#7C9473]/40" viewBox="0 0 24 24" fill="none">
                <path d="M2 22 Q 8 14 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <ellipse cx="6" cy="12" rx="3" ry="1.3" fill="currentColor" opacity="0.6" transform="rotate(50 6 12)" />
              </svg>

              {/* Con dấu bưu tá tròn thương hiệu CLOOP[cite: 5] */}
              <div className="w-14 h-14 rounded-full border border-dashed border-[#7C9473]/60 flex flex-col items-center justify-center text-center rotate-[-8deg] opacity-65 select-none shrink-0">
                <span className="text-[6px] font-bold uppercase tracking-widest text-[#5C7A54] kyuc-body leading-none">CLOOP</span>
                <span className="text-[4.5px] font-medium text-[#5C7A54] kyuc-body mt-0.5 scale-90">CIRCULAR</span>
              </div>
            </div>
          </div>

          {/* 3. PREVIEW HỘP TIN BÀI BLOG MỚI NHẤT (Có đinh ghim vàng 3D và Ảnh lót)[cite: 5] */}
          <div className="bg-white/95 rounded-[1.75rem] p-6 border border-stone-100 shadow-[0_10px_35px_rgba(24,58,45,0.03)] flex flex-col justify-between relative h-full">
            
            {/* Đinh ghim tròn kim loại vàng 3D cố định ở mép trên[cite: 5] */}
            <div className="absolute top-4 right-[42%] w-3.5 h-3.5 rounded-full bg-gradient-to-br from-amber-200 via-amber-500 to-amber-800 shadow-md border border-amber-600/30 z-20" />

            <div className="grid grid-cols-[1.1fr_1fr] gap-4 items-stretch h-full">
              
              {/* Cột chữ nội dung[cite: 5] */}
              <div className="flex flex-col justify-between space-y-4 text-left">
                <div className="space-y-2">
                  <span className="inline-block text-[9px] font-bold uppercase tracking-widest text-[#5C7A54] kyuc-body">✦ Bài viết mới</span>
                  <h3 className="kyuc-heading text-[22px] font-semibold text-[#1F3D2B] leading-tight line-clamp-3">{mainStory.title}</h3>
                  <p className="kyuc-body text-[11px] text-stone-400 font-light leading-relaxed line-clamp-3">{mainStory.content}</p>
                </div>

                {/* Khối danh tính Tác giả[cite: 5] */}
                <div className="flex items-center gap-2.5 pt-2 border-t border-stone-50">
                  <div className="w-8 h-8 rounded-full bg-stone-100 overflow-hidden shrink-0 relative border border-stone-200/60 shadow-3xs">
                    {mainStory.authorAvatar ? (
                      <Image src={mainStory.authorAvatar} alt="" fill unoptimized className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-stone-400 uppercase kyuc-body bg-stone-50">
                        {(mainStory.authorName || "C").charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-800 kyuc-body leading-none truncate">{mainStory.authorName || "Thành viên CLOOP"}</p>
                    <p className="text-[10px] text-stone-400 font-normal kyuc-body mt-1">
                      {new Date(mainStory.createdAt).toLocaleDateString("vi-VN")} • 5 phút đọc
                    </p>
                  </div>
                </div>

                <Link href="/blog" className="inline-flex items-center gap-1 text-xs font-bold text-[#1F3D2B] kyuc-body pt-1 hover:gap-2 transition-all w-fit">
                  Xem thêm <ArrowRight size={13} />
                </Link>
              </div>

              {/* Cột ảnh đính kèm lookbook áo len phối tag Thank You[cite: 5] */}
              <div className="relative w-full aspect-[4/5] lg:aspect-auto rounded-2xl overflow-hidden shadow-xs border border-stone-100 shrink-0">
                <Image src={mainStory.coverImage} alt={mainStory.title} fill unoptimized className="object-cover object-top" />
                
                {/* Tag giấy Kraft "Thank you!" đính chéo nghệ thuật ở góc ảnh dưới[cite: 5] */}
                <div className="absolute bottom-3 left-3 bg-[#e4dac7] px-2.5 py-1 rounded-3xs shadow-md border border-[#ccbfa9] transform -rotate-6 text-center select-none z-10">
                  <span className="kyuc-hand text-[13px] font-bold text-stone-700 tracking-wide block leading-none">Thank you!</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* 📊 THANH CHỈ SỐ ESG — Đè tràn lên gấu cạnh dưới của khối sổ tay chuẩn 100% bản vẽ[cite: 5] */}
        <div className="relative mt-12 -mb-24 sm:-mb-20 z-20">
          <div className="bg-white rounded-[2rem] shadow-[0_15px_45px_rgba(24,58,45,0.08)] border border-stone-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-stone-100/70 py-5 px-3">
            {statsData.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="flex items-center gap-3.5 px-5 py-3 lg:py-1">
                  <div className="w-10 h-10 rounded-full bg-[#f4f7f2] text-[#4e5f44] flex items-center justify-center shrink-0 border border-[#e4ece5]">
                    {/* 🛠️ ĐÃ SỬA: Tinh gọn logic, gọi thẳng thẻ hiển thị Icon thay vì kiểm tra typeof thừa */}
                    <Icon size={16} />
                  </div>
                  <div className="kyuc-body text-left">
                    <div className="text-xl font-black text-stone-900 leading-none tracking-tight">
                      <CountUpNumber target={s.num} suffix={s.suffix} />
                    </div>
                    <p className="text-[11px] font-bold text-stone-700 mt-1">{s.label}</p>
                    <p className="text-[10px] text-stone-400 font-light mt-0.5">{s.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Khoảng trống bù lại phần âm margin của khối ESG đè dưới[cite: 5] */}
      <div className="h-16 sm:h-12" />
    </section>
  );
}