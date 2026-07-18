"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, BookOpen, Clock, Heart, Quote } from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600";
const PAPER_BG = "https://www.transparenttextures.com/patterns/cream-paper.png";

// Hoa lá khô decor nền
const DRIED_LEAF = "https://images.unsplash.com/photo-1621274220349-2e06cb388ea2?q=80&w=500";
const VINTAGE_PAPER = "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?q=80&w=500"; 

// 🟢 NÂNG CẤP: Đổi image (chuỗi) thành images (mảng) để chứa toàn bộ hình ảnh
interface FullMemory {
  id: string;
  title: string;
  content: string;
  images: string[]; 
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
          // 🟢 NÂNG CẤP: Lấy TẤT CẢ hình ảnh từ ProductImage khớp với productId của bài viết
          const productIds = blogData.map((b: any) => b.productId || b.product_id).filter(Boolean);
          let productImages: any[] = [];
          
          if (productIds.length > 0) {
            const { data: pImages } = await supabase
              .from("ProductImage")
              .select("productId, url")
              .in("productId", productIds);
            if (pImages) productImages = pImages;
          }

          const mapped = blogData.map((b: any) => {
            const d = new Date(b.createdAt);
            const pId = b.productId || b.product_id || "";
            
            // Tìm tất cả ảnh của sản phẩm này
            const relatedImages = productImages
              .filter((img) => img.productId === pId)
              .map((img) => img.url);

            // Nếu không có ảnh nào trong kho, xài ảnh cover mặc định
            const fallbackImage = b.coverImage || b.cover_image || PLACEHOLDER_IMG;
            const finalImages = relatedImages.length > 0 ? relatedImages : [fallbackImage];

            return {
              id: b.id,
              title: b.title,
              content: b.excerpt || b.content || "Một kỷ niệm đẹp chưa được viết lời tựa...",
              images: finalImages,
              date: `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`,
              fullDate: d.toLocaleDateString("vi-VN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
              productId: pId 
            };
          });
          setMemories(mapped);
        } else {
            setMemories([]);
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
      <div className="flex flex-col justify-center items-center min-h-screen bg-[#EBE5D9] space-y-3">
        <div className="w-5 h-5 border border-emerald-800/40 border-t-emerald-900 rounded-full animate-spin" />
        <p className="text-[10px] font-medium text-emerald-900 uppercase tracking-widest">Đang lật mở trang nhật ký...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#EAE4D8] py-8 md:py-16 px-2 sm:px-6 relative overflow-x-hidden selection:bg-[#183A2D] selection:text-white font-sans">
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600;700&family=Caveat:wght@400;500;600;700&display=swap');
        h1, h2, h3, .font-heading { font-family: 'Cormorant Garamond', serif !important; }
        .font-handwriting { font-family: 'Caveat', cursive !important; }
        
        .torn-paper {
            background: #FFFDF9;
            box-shadow: 2px 4px 15px rgba(0,0,0,0.05);
            border-radius: 2px 2px 15px 2px;
            border: 1px solid #E9E2D5;
        }

        .washi-tape {
            position: absolute;
            background-color: rgba(220, 205, 175, 0.85);
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            backdrop-filter: blur(2px);
            mix-blend-mode: multiply;
            z-index: 50; /* Z-index cao để đè lên mọi ảnh */
            clip-path: polygon(1% 5%, 100% 0%, 98% 95%, 0% 100%);
        }

        .polaroid-frame {
            background: #fff;
            padding: 12px 12px 35px 12px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.03);
            border: 1px solid #F0ECE1;
        }

        /* Bóng đổ cho hoa lá ép khô */
        .pressed-flora {
            filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.15));
            mix-blend-mode: multiply;
        }
      `}</style>

      {/* BACKGROUND BÊN NGOÀI SỔ (MẶT BÀN TRƠN, ÁNH SÁNG MỜ) */}
      <div className="fixed top-0 left-0 w-[600px] h-[600px] opacity-20 pointer-events-none z-0" style={{ background: "radial-gradient(circle, rgba(107,163,122,0.2) 0%, rgba(245,242,235,0) 70%)" }} />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] opacity-30 pointer-events-none z-0" style={{ background: "radial-gradient(circle, rgba(212,175,140,0.2) 0%, rgba(245,242,235,0) 70%)" }} />
      
      {/* ========================================================
          📖 CUỐN SỔ SCRAPBOOK CHÍNH (Chứa mọi thứ bên trong)
          ======================================================== */}
      <div 
        className="w-full max-w-[1100px] mx-auto bg-[#FBF9F4] shadow-[0_25px_60px_-10px_rgba(40,30,20,0.3)] rounded-sm relative flex flex-col md:flex-row min-h-[85vh] border border-[#D5C6B1] overflow-hidden"
        style={{ backgroundImage: `url(${PAPER_BG})` }}
      >
        {/* GÁY SỔ Ở GIỮA */}
        <div className="hidden md:block absolute top-0 bottom-0 left-1/2 w-[80px] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#C3B29D]/60 to-transparent shadow-[inset_0_0_15px_rgba(60,50,40,0.1)] border-l border-r border-[#C3B29D]/20 z-0" />
        <div className="hidden md:block absolute top-0 bottom-0 left-1/2 w-[2px] -translate-x-1/2 bg-stone-300/40 z-0 shadow-[2px_0_4px_rgba(0,0,0,0.05)]" />

        {/* 🟢 DECOR 1: Cành lá dương xỉ ép khô dán góc trên bên trái sổ */}
        <div className="absolute top-8 -left-4 md:left-6 w-32 h-40 opacity-70 pointer-events-none z-10 pressed-flora -rotate-12">
            <div className="washi-tape w-8 h-4 top-8 left-12 rotate-45 bg-[#D1C5B4]/90" /> {/* Băng keo dán cành */}
            <svg viewBox="0 0 100 200" className="w-full h-full text-[#6b705c]">
                <path d="M50 180 Q 45 100 80 20 M50 160 Q 30 140 15 110 M48 140 Q 70 120 85 90 M46 110 Q 20 90 10 50 M48 80 Q 65 60 70 30" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <path d="M80 20 Q 70 30 75 40 Q 85 30 80 20" fill="currentColor" opacity="0.8"/>
                <path d="M15 110 Q 25 100 30 115 Q 20 120 15 110" fill="currentColor" opacity="0.8"/>
                <path d="M85 90 Q 75 95 70 80 Q 80 80 85 90" fill="currentColor" opacity="0.8"/>
                <path d="M10 50 Q 20 55 25 40 Q 15 40 10 50" fill="currentColor" opacity="0.8"/>
            </svg>
        </div>

        {/* 🟢 DECOR 2: Nhành hoa nhí sấy khô đính góc dưới bên phải sổ */}
        <div className="absolute bottom-12 -right-4 md:right-10 w-40 h-48 opacity-60 pointer-events-none z-10 pressed-flora rotate-12">
            <div className="washi-tape w-10 h-4 bottom-10 right-16 -rotate-12 bg-[#D1C5B4]/90" /> {/* Băng keo dán cành */}
            <svg viewBox="0 0 100 200" className="w-full h-full text-[#8a7e71]">
                <path d="M30 180 Q 50 100 20 20 M35 150 Q 70 130 80 90 M25 100 Q 60 70 70 40 M22 60 Q 40 50 50 20" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                <circle cx="20" cy="20" r="4" fill="#a47e6a" opacity="0.9"/>
                <circle cx="25" cy="15" r="3" fill="#a47e6a" opacity="0.9"/>
                <circle cx="15" cy="25" r="3.5" fill="#a47e6a" opacity="0.9"/>
                
                <circle cx="80" cy="90" r="4" fill="#a47e6a" opacity="0.9"/>
                <circle cx="85" cy="85" r="3" fill="#a47e6a" opacity="0.9"/>
                
                <circle cx="70" cy="40" r="4.5" fill="#a47e6a" opacity="0.9"/>
                <circle cx="75" cy="35" r="3" fill="#a47e6a" opacity="0.9"/>
                
                <circle cx="50" cy="20" r="4" fill="#a47e6a" opacity="0.9"/>
            </svg>
        </div>

        {/* NỘI DUNG CHÍNH CỦA SỔ */}
        <div className="w-full relative z-20 p-6 sm:p-10 md:p-16">
          
          <div className="flex items-center justify-between mb-12 border-b border-[#DACBB6]/50 pb-6 relative z-30">
            <Link href={`/closet/${userId}`} className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-[#183A2D] transition-colors uppercase tracking-wider bg-[#FFFDF9]/80 px-5 py-2.5 rounded-full border border-stone-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.03)] backdrop-blur-md">
              <ArrowLeft size={14} /> Quay lại tủ đồ
            </Link>
          </div>

          <div className="columns-1 md:columns-2 gap-16 md:gap-32">
            
            {/* TRANG TRÁI: TIÊU ĐỀ & LỜI NGỎ */}
            <div className="break-inside-avoid mb-14 relative z-10">
              
              {/* Note tiêu đề lớn */}
              <div className="torn-paper p-8 relative -rotate-2">
                <div className="washi-tape w-24 h-6 -top-3 left-1/2 -translate-x-1/2 rotate-2 bg-[#D1C5B4]/80" />
                <h1 className="text-5xl md:text-6xl font-bold text-[#1C3F30] font-heading leading-[1.1] mb-5">
                  Cuốn Nhật Ký<br/>Kỷ Niệm
                </h1>
                <p className="text-[17px] text-stone-500 italic font-serif flex items-center gap-2 border-l-2 border-amber-600/40 pl-4">
                  Ghi chép hành trình thời trang của {userName.split(" ")[0]}
                </p>
                
                {/* Con dấu mộc in thẳng lên giấy */}
                <div className="absolute -bottom-8 -right-8 text-[#987654]/40 rotate-12 mix-blend-multiply opacity-70 pointer-events-none">
                   <svg width="110" height="110" viewBox="0 0 100 100">
                     <path id="curve" d="M 20 50 A 30 30 0 1 1 80 50 A 30 30 0 1 1 20 50" fill="transparent"/>
                     <text className="text-[9.5px] font-mono tracking-[0.22em] font-bold" fill="currentColor">
                       <textPath href="#curve">
                         • CLOOP FASHION LOOP • 2026
                       </textPath>
                     </text>
                     <circle cx="50" cy="50" r="15" stroke="currentColor" fill="none" strokeWidth="1.2" strokeDasharray="3 2"/>
                   </svg>
                </div>
              </div>

              {/* Note Quote nhỏ đính kèm */}
              <div className="mt-12 p-7 bg-[#FDFBF7]/60 border border-[#E9E2D5] rounded-sm shadow-sm rotate-1 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-stone-300/80 shadow-sm flex items-center justify-center border-2 border-white">
                  <div className="w-1.5 h-1.5 rounded-full bg-stone-500" />
                </div>
                <Quote size={24} className="text-[#C3B29D] mb-4" />
                <p className="font-handwriting text-[19px] text-stone-700 leading-relaxed">
                  "Mỗi món đồ vintage đều cất giữ một linh hồn. Khi chúng ta trao đi hoặc mượn lại, ta đang viết tiếp câu chuyện của chúng."
                </p>
                <Heart size={14} className="text-amber-600 mt-4 opacity-50" />
              </div>

            </div>

            {/* KIỂM TRA NẾU TRỐNG */}
            {memories.length === 0 ? (
                <div className="break-inside-avoid mb-16 relative transition-transform duration-500 text-center py-20 opacity-60">
                    <p className="font-handwriting text-3xl md:text-4xl text-stone-400 -rotate-2">
                        Trang giấy trắng chưa có nét mực nào...
                    </p>
                </div>
            ) : (
              memories.map((mem, idx) => {
                const targetLink = mem.productId ? `/product/${mem.productId}` : `/closet/${userId}#wardrobe-section`;
                const rotations = ["-rotate-2", "rotate-3", "-rotate-1", "rotate-2"];
                const currentRotation = rotations[idx % rotations.length];
                const isTape = idx % 2 === 0;

                return (
                  <div 
                    key={mem.id} 
                    className={`break-inside-avoid mb-16 relative transition-transform duration-500 hover:scale-[1.02] hover:z-30 ${currentRotation}`}
                  >
                    {/* Ghim / Băng dính (Phải có z-50 để đè lên mọi ảnh xếp chồng) */}
                    {isTape ? (
                      <div className="washi-tape w-20 h-6 -top-3 left-1/2 -translate-x-1/2 rotate-1 bg-[#D1C5B4]/90 z-50" />
                    ) : (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-amber-800/80 border-[2px] border-white shadow-sm z-50 flex items-center justify-center">
                          <div className="w-1 h-1 rounded-full bg-amber-900/60" />
                      </div>
                    )}

                    {/* 🟢 NÂNG CẤP: STACK ẢNH XẾP CHỒNG LÊN NHAU NHƯ CẦM XẤP ẢNH POLAROID */}
                    <div className="relative">
                      {mem.images.slice(0, 3).map((imgUrl, imgIdx) => {
                        const isFirst = imgIdx === 0;
                        // Tính toán độ lệch cho từng bức ảnh nằm dưới
                        const stackRotations = ["rotate-0", "rotate-3", "-rotate-2"];
                        const stackPositions = ["", "translate-x-2 translate-y-2", "-translate-x-2 translate-y-4"];
                        const stackZIndexes = ["z-30", "z-20", "z-10"];

                        return (
                          <Link 
                            href={targetLink} 
                            key={imgIdx} 
                            className={`block polaroid-frame group shadow-sm transition-all duration-300 hover:-translate-y-2 hover:z-40 origin-bottom
                              ${isFirst ? "relative" : "absolute top-0 left-0 w-full"}
                              ${stackRotations[imgIdx]} ${stackPositions[imgIdx]} ${stackZIndexes[imgIdx]}
                            `}
                          >
                            <div className="w-full aspect-[4/3] bg-stone-100 overflow-hidden relative">
                              <Image src={imgUrl} alt={`${mem.title} - ${imgIdx}`} fill unoptimized className="object-cover group-hover:scale-105 transition-transform duration-700" />
                            </div>
                          </Link>
                        );
                      })}

                      {/* Hiển thị badge số lượng nếu có > 3 ảnh */}
                      {mem.images.length > 3 && (
                        <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-[#987654] text-white rounded-full flex items-center justify-center font-bold font-mono text-[11px] shadow-md z-40 rotate-12 border-2 border-[#FBF9F4]">
                           +{mem.images.length - 3}
                        </div>
                      )}
                    </div>
                    
                    {/* Caption viết tay */}
                    <div className="bg-[#FFFDF9] border border-[#E9E2D5] border-t-0 p-5 rounded-b-sm shadow-sm -mt-[1px] relative z-40">
                      <div className="flex justify-between items-baseline mb-3 border-b border-stone-200/50 pb-2">
                        <h3 className="text-[20px] md:text-[22px] font-bold text-[#1C3F30] font-heading pr-4 leading-tight">
                          <Link href={targetLink} className="hover:text-emerald-700 transition-colors line-clamp-2">{mem.title}</Link>
                        </h3>
                        <span className="text-[10px] font-bold text-amber-700/70 font-mono tracking-widest uppercase shrink-0 bg-amber-50 px-2 py-0.5 rounded border border-amber-100/40">
                          {mem.date}
                        </span>
                      </div>
                      
                      <p className="text-[17px] md:text-[19px] leading-relaxed text-stone-600 font-handwriting">
                        "{mem.content}"
                      </p>
                    </div>

                  </div>
                );
              })
            )}

          </div>
        </div>
      </div>
    </main>
  );
}