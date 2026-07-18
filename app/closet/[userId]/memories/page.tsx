"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, BookOpen, Clock, Heart } from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600";
const PAPER_BG = "https://www.transparenttextures.com/patterns/cream-paper.png";

interface FullMemory {
  id: string;
  title: string;
  content: string;
  image: string;
  date: string;
  fullDate: string;
  productId: string;
}

export default function MemoriesDiaryPage() {
  const params = useParams();
  const userId = params?.userId as string;
  
  const [memories, setMemories] = useState<FullMemory[]>([]);
  const [userName, setUserName] = useState("Thành viên CLOOP");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    async function fetchData() {
      try {
        setLoading(true);
        const { data: user } = await supabase.from("User").select("name").eq("id", userId).maybeSingle();
        if (user?.name) setUserName(user.name);

        const { data: blogData } = await supabase
          .from("BlogPost")
          .select("*")
          .eq("userId", userId)
          .eq("status", "PUBLIC")
          .order("createdAt", { ascending: false });

        if (blogData && blogData.length > 0) {
          const mapped = blogData.map((b: any) => {
            const d = new Date(b.createdAt);
            return {
              id: b.id,
              title: b.title,
              content: b.excerpt || b.content || "Một kỷ niệm đẹp chưa được viết lời tựa...",
              image: b.coverImage || b.cover_image || PLACEHOLDER_IMG,
              date: `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`,
              fullDate: d.toLocaleDateString("vi-VN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
              productId: b.productId || b.product_id || "" 
            };
          });
          setMemories(mapped);
        } else {
            // Dữ liệu mẫu (Mock data)
            setMemories([
                { id: '1', title: "Chuyến đi cùng chiếc váy hoa nhí đầu tiên", content: "Chiếc váy hoa nhí nhẹ nhàng cùng mình đi qua những con phố nhỏ hoài cổ, cảm giác thời trang xanh thực sự ý nghĩa.", image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=400", date: "05.2025", fullDate: "Thứ Hai, ngày 12 tháng 05 năm 2025", productId: "mock-product-1" },
                { id: '2', title: "Chiếc váy lụa mình đã mặc trong buổi hoàng hôn", content: "Chất lụa mát rượi lướt nhẹ theo làn gió biển. Thuê món đồ này trên CLOOP là quyết định đúng đắn nhất mùa hè này của mình.", image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=400", date: "04.2025", fullDate: "Thứ Sáu, ngày 18 tháng 04 năm 2025", productId: "mock-product-2" },
                { id: '3', title: "Nhận chiếc váy vintage mình yêu thích nhất", content: "Mở hộp đồ thuê mà tim đập thình thịch vì gói ghém quá xinh. Món đồ thơm tho, sạch sẽ như mới tinh vậy khui ra cực thích.", image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?q=80&w=400", date: "03.2025", fullDate: "Chủ Nhật, ngày 02 tháng 03 năm 2025", productId: "mock-product-3" },
                { id: '4', title: "Kỷ niệm đáng nhớ ngày khai trương CLOOP", content: "Được gặp gỡ những người bạn có cùng tần số yêu lối sống bền vững. Cảm ơn CLOOP vì đã kết nối tụi mình lại với nhau.", image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=400", date: "02.2025", fullDate: "Thứ Bảy, ngày 15 tháng 02 năm 2025", productId: "mock-product-4" }
            ]);
        }
      } catch (e) {
        console.error("Lỗi lấy nhật ký:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-[#F7F5F0] space-y-3">
        <div className="w-5 h-5 border border-emerald-800/40 border-t-emerald-900 rounded-full animate-spin" />
        <p className="text-[10px] font-medium text-emerald-900 uppercase tracking-widest">Đang giở từng trang lưu bút...</p>
      </div>
    );
  }

  return (
    <main 
      className="min-h-screen text-stone-800 antialiased pb-32 pt-8 relative selection:bg-[#183A2D] selection:text-white"
      style={{ backgroundColor: "#F5F2EB", backgroundImage: `url(${PAPER_BG})` }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600;700&family=Caveat:wght@400;500;600;700&display=swap');
        h1, h2, h3, .font-heading { font-family: 'Cormorant Garamond', serif !important; }
        .font-handwriting { font-family: 'Caveat', cursive !important; }
        
        /* Đổ bóng cho các mẩu giấy dán vào sổ */
        .scrapbook-shadow {
            box-shadow: 2px 5px 15px rgba(0,0,0,0.04), 0px 1px 3px rgba(0,0,0,0.02);
        }
        
        .tape {
            position: absolute;
            background-color: rgba(232, 220, 196, 0.8);
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            backdrop-filter: blur(1px);
            mix-blend-mode: multiply;
            z-index: 20;
        }
      `}</style>

      {/* HIỆU ỨNG ÁNH SÁNG & GÓC NỀN */}
      <div className="fixed top-0 left-0 w-[600px] h-[600px] opacity-20 pointer-events-none z-0" style={{ background: "radial-gradient(circle, rgba(107,163,122,0.2) 0%, rgba(245,242,235,0) 70%)" }} />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] opacity-30 pointer-events-none z-0" style={{ background: "radial-gradient(circle, rgba(212,175,140,0.2) 0%, rgba(245,242,235,0) 70%)" }} />
      
      {/* 🌿 CÀNH LÁ & HOA CỎ KHÔ TRANG TRÍ GÓC TRANG (Giữ nguyên) */}
      <svg className="fixed top-24 left-4 w-40 h-52 text-[#7C9473]/50 pointer-events-none z-0 hidden lg:block" viewBox="0 0 100 140" fill="none">
        <path d="M10 130 Q 25 90 15 40 Q 40 60 32 100 Q 55 70 45 20" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <ellipse cx="20" cy="60" rx="7" ry="3" fill="currentColor" opacity="0.55" transform="rotate(40 20 60)" />
        <ellipse cx="35" cy="85" rx="7" ry="3" fill="currentColor" opacity="0.55" transform="rotate(-30 35 85)" />
        <ellipse cx="42" cy="45" rx="6" ry="2.5" fill="currentColor" opacity="0.5" transform="rotate(20 42 45)" />
      </svg>
      
      <svg className="fixed bottom-16 right-6 w-44 h-56 text-[#B98B5E]/40 pointer-events-none z-0 hidden lg:block" viewBox="0 0 100 140" fill="none">
        <path d="M90 130 Q 70 90 80 40 Q 55 60 65 100 Q 40 70 50 20" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <ellipse cx="75" cy="60" rx="7" ry="3" fill="currentColor" opacity="0.5" transform="rotate(-40 75 60)" />
        <ellipse cx="60" cy="85" rx="7" ry="3" fill="currentColor" opacity="0.5" transform="rotate(30 60 85)" />
        <circle cx="55" cy="30" r="4" fill="#D4A574" opacity="0.4" />
      </svg>

      <div className="fixed top-1/3 left-8 rotate-[-12deg] opacity-40 pointer-events-none z-0 hidden xl:block">
        <svg width="60" height="80" viewBox="0 0 60 80" fill="none">
          <path d="M30 80 L30 20" stroke="#8B9D77" strokeWidth="1.2" />
          <circle cx="30" cy="18" r="3" fill="#E8C4A0" />
          <circle cx="24" cy="30" r="2.5" fill="#E8C4A0" />
          <circle cx="36" cy="42" r="2.5" fill="#E8C4A0" />
        </svg>
      </div>
      
      {/* WRAPPER RỘNG HƠN ĐỂ HIỂN THỊ QUYỂN SỔ 2 TRANG */}
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 relative z-10">
        
        {/* THANH ĐIỀU HƯỚNG BÊN TRÊN */}
        <div className="flex items-center justify-between mb-12">
          <Link href={`/closet/${userId}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-[#183A2D] transition-colors uppercase tracking-wider bg-white/60 px-5 py-2.5 rounded-full border border-stone-200/60 shadow-sm backdrop-blur-md">
            <ArrowLeft size={14} /> Quay lại tủ đồ
          </Link>
          <div className="w-10 h-10 rounded-full border border-dashed border-stone-300 flex items-center justify-center text-stone-400 bg-white/30 backdrop-blur-sm">
            <BookOpen size={16} />
          </div>
        </div>

        {/* TIÊU ĐỀ SỔ LƯU BÚT */}
        <div className="text-center mb-16 space-y-4 relative">
          <div className="tape w-20 h-5 -top-4 left-1/2 -translate-x-1/2 rotate-2" />
          <h1 className="text-5xl md:text-7xl font-bold text-[#1C3F30] font-heading tracking-tight">Cuốn Nhật Ký Kỷ Niệm</h1>
          <p className="text-[15px] text-stone-500 italic font-serif flex items-center justify-center gap-2">
            <Heart size={12} className="text-amber-600/60" /> Ghi chép hành trình thời trang của {userName} <Heart size={12} className="text-amber-600/60" />
          </p>
        </div>

        {/* ========================================================
            🟢 NÂNG CẤP GIAO DIỆN SCRAPBOOK: 2 CỘT SO LE CỰC NGHỆ 
            ======================================================== */}
        <div className="relative mt-8">
          
          {/* ĐƯỜNG GÁY SỔ Ở GIỮA (Chỉ hiện trên Desktop) */}
          <div className="hidden md:block absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-transparent via-stone-300/80 to-transparent -translate-x-1/2 z-0" />
          <div className="hidden md:block absolute inset-y-0 left-1/2 w-12 bg-gradient-to-r from-stone-200/20 to-transparent -translate-x-full z-0" />
          <div className="hidden md:block absolute inset-y-0 left-1/2 w-12 bg-gradient-to-l from-stone-200/20 to-transparent z-0" />

          {memories.length === 0 ? (
            <div className="text-center py-24 bg-white/40 rounded-3xl border border-stone-200 border-dashed">
              <p className="font-handwriting text-3xl text-stone-400">Trang giấy trắng chưa có nét mực nào...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-x-20 md:gap-y-12 relative z-10 px-2">
              {memories.map((mem, idx) => {
                const targetLink = mem.productId ? `/product/${mem.productId}` : `/closet/${userId}#wardrobe-section`;
                
                // Thuật toán tạo góc nghiêng ngẫu nhiên để trông giống dán tay
                const rotations = ["-rotate-2", "rotate-3", "-rotate-1", "rotate-2"];
                const currentRotation = rotations[idx % rotations.length];
                const isTape = idx % 2 === 0;

                return (
                  <div 
                    key={mem.id} 
                    className={`flex flex-col bg-[#FFFDF9] border border-[#E9E2D5] p-5 md:p-6 rounded-sm scrapbook-shadow relative transition-all duration-500 hover:scale-[1.02] hover:z-20
                      ${currentRotation}
                      ${idx % 2 === 1 ? "md:mt-32" : ""} 
                    `}
                  >
                    {/* TRANG TRÍ: BĂNG KEO DÁN HOẶC GHIM ĐÓNG */}
                    {isTape ? (
                      <div className="tape w-16 h-5 -top-2 left-1/2 -translate-x-1/2 -rotate-3" />
                    ) : (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-amber-700/90 border-2 border-white shadow-sm z-30 flex items-center justify-center">
                         <div className="w-1 h-1 rounded-full bg-amber-900/50" />
                      </div>
                    )}

                    {/* KHUNG ẢNH POLAROID TRẮNG */}
                    <Link href={targetLink} className="block relative mb-5 bg-white p-3 pb-8 shadow-sm border border-stone-100/80 hover:shadow-md transition-shadow">
                      <div className="w-full aspect-[4/3] bg-stone-100 overflow-hidden relative">
                        <Image src={mem.image} alt={mem.title} fill unoptimized className="object-cover hover:scale-105 transition-transform duration-700" />
                      </div>
                    </Link>
                    
                    {/* LỜI TỰA & MỐC THỜI GIAN BIÊN TẬP (CAPTION) */}
                    <div className="space-y-3 px-2">
                      <div className="flex items-baseline justify-between border-b border-stone-200/60 pb-2">
                        <h3 className="text-xl md:text-2xl font-bold text-[#1C3F30] font-heading leading-tight flex-1 pr-4">
                          <Link href={targetLink} className="hover:text-emerald-700 transition-colors">{mem.title}</Link>
                        </h3>
                        <span className="text-[9px] font-bold text-amber-700/80 font-mono tracking-widest uppercase shrink-0 bg-amber-50 px-2 py-0.5 rounded border border-amber-100/50">
                          {mem.date}
                        </span>
                      </div>
                      
                      <p className="text-[17px] md:text-[19px] leading-relaxed text-stone-600 font-handwriting">
                        "{mem.content}"
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}