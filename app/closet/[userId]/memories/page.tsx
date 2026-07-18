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
            // 🟢 ĐÃ FIX: Trả về mảng rỗng để hiển thị thông báo "Trang giấy trắng..." chuẩn dữ liệu thật
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
            z-index: 20;
            clip-path: polygon(1% 5%, 100% 0%, 98% 95%, 0% 100%);
        }

        .polaroid-frame {
            background: #fff;
            padding: 12px 12px 35px 12px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.03);
            border: 1px solid #F0ECE1;
        }
      `}</style>

      <div className="fixed top-0 left-0 w-[600px] h-[600px] opacity-20 pointer-events-none z-0" style={{ background: "radial-gradient(circle, rgba(107,163,122,0.2) 0%, rgba(245,242,235,0) 70%)" }} />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] opacity-30 pointer-events-none z-0" style={{ background: "radial-gradient(circle, rgba(212,175,140,0.2) 0%, rgba(245,242,235,0) 70%)" }} />
      
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
      
      <div 
        className="w-full max-w-[1100px] mx-auto bg-[#FBF9F4] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] rounded-sm relative flex flex-col md:flex-row min-h-[85vh] border border-[#D5C6B1]"
        style={{ backgroundImage: `url(${PAPER_BG})` }}
      >
        <div className="hidden md:block absolute top-0 bottom-0 left-1/2 w-[70px] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#DACBB6]/60 to-transparent shadow-[inset_0_0_12px_rgba(0,0,0,0.03)] border-l border-r border-[#DACBB6]/30 z-0" />

        <div className="w-full relative z-10 p-6 sm:p-10 md:p-16">
          
          <div className="flex items-center justify-between mb-12 border-b border-[#DACBB6]/40 pb-6">
            <Link href={`/closet/${userId}`} className="inline-flex items-center gap-2 text-xs font-bold text-stone-500 hover:text-[#183A2D] transition-colors uppercase tracking-wider bg-white/60 px-4 py-2 rounded-full border border-stone-200/60 shadow-sm">
              <ArrowLeft size={14} /> Quay lại tủ đồ
            </Link>
          </div>

          <div className="columns-1 md:columns-2 gap-16 md:gap-32">
            
            <div className="break-inside-avoid mb-14 relative z-10">
              <div className="torn-paper p-8 relative -rotate-1">
                <div className="washi-tape w-24 h-6 -top-3 left-1/2 -translate-x-1/2 rotate-2" />
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1C3F30] font-heading leading-tight mb-4">
                  Cuốn Nhật Ký<br/>Kỷ Niệm
                </h1>
                <p className="text-[16px] text-stone-500 italic font-serif flex items-center gap-2 border-l-2 border-amber-600/30 pl-3">
                  Ghi chép hành trình thời trang của {userName.split(" ")[0]}
                </p>
                
                <div className="absolute -bottom-6 -right-6 text-amber-800/40 rotate-12 mix-blend-multiply opacity-80 pointer-events-none">
                   <svg width="100" height="100" viewBox="0 0 100 100">
                     <path id="curve" d="M 20 50 A 30 30 0 1 1 80 50 A 30 30 0 1 1 20 50" fill="transparent"/>
                     <text className="text-[9px] font-mono tracking-[0.2em] font-bold" fill="currentColor">
                       <textPath href="#curve">
                         • CLOOP FASHION LOOP • 2026
                       </textPath>
                     </text>
                     <circle cx="50" cy="50" r="16" stroke="currentColor" fill="none" strokeWidth="1.5" strokeDasharray="4 2"/>
                   </svg>
                </div>
              </div>
            </div>

            <div className="break-inside-avoid mb-14 relative p-6 bg-[#FDFBF7]/50 border border-[#E9E2D5] rounded-lg shadow-sm rotate-2">
               <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-stone-200 shadow-sm flex items-center justify-center border-2 border-white">
                 <div className="w-1.5 h-1.5 rounded-full bg-stone-400" />
               </div>
               <Quote size={20} className="text-stone-300 mb-3" />
               <p className="font-handwriting text-lg text-stone-600 leading-relaxed">
                 "Mỗi món đồ vintage đều cất giữ một linh hồn. Khi chúng ta trao đi hoặc mượn lại, ta đang viết tiếp câu chuyện của chúng."
               </p>
               <Heart size={14} className="text-amber-500 mt-3 opacity-60" />
            </div>

            {/* KIỂM TRA NẾU TRỐNG: Hiển thị giao diện "chưa có nét mực" cực thơ */}
            {memories.length === 0 ? (
                <div className="break-inside-avoid mb-16 relative transition-transform duration-500 text-center py-20 opacity-60">
                    <p className="font-handwriting text-2xl md:text-3xl text-stone-400 rotate-2">
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
                    {isTape ? (
                      <div className="washi-tape w-20 h-6 -top-3 left-10 rotate-3" />
                    ) : (
                      <div className="washi-tape w-24 h-5 -top-2 right-10 -rotate-2 bg-stone-300/80" />
                    )}

                    <Link href={targetLink} className="block polaroid-frame group">
                      <div className="w-full aspect-square md:aspect-[4/3] bg-stone-100 overflow-hidden relative">
                        <Image src={mem.image} alt={mem.title} fill unoptimized className="object-cover group-hover:scale-105 transition-transform duration-700" />
                      </div>
                    </Link>
                    
                    <div className="bg-[#FFFDF9] border border-[#E9E2D5] border-t-0 p-5 rounded-b-lg shadow-sm -mt-2 relative z-10">
                      <div className="flex justify-between items-baseline mb-3">
                        <h3 className="text-[18px] md:text-[20px] font-bold text-[#1C3F30] font-heading pr-4">
                          <Link href={targetLink} className="hover:textemerald-700 transition-colors line-clamp-2">{mem.title}</Link>
                        </h3>
                        <span className="text-[9px] font-bold text-stone-500 font-mono tracking-widest uppercase shrink-0">
                          {mem.date}
                        </span>
                      </div>
                      
                      <p className="text-[16px] md:text-[18px] leading-relaxed text-stone-600 font-handwriting">
                        {mem.content}
                      </p>
                    </div>
                  </div>
                );
              })
            )}

          </div>
        </div>

        <div className="absolute bottom-4 right-4 text-[#7C9473]/30 pointer-events-none -rotate-12 z-20 hidden md:block">
           <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
             <path d="M10 90 Q 40 70 80 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
             <path d="M25 80 Q 40 50 60 40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
             <circle cx="80" cy="10" r="3" fill="currentColor" opacity="0.8" />
             <circle cx="60" cy="40" r="4" fill="currentColor" opacity="0.6" />
             <circle cx="45" cy="25" r="2.5" fill="currentColor" opacity="0.7" />
           </svg>
        </div>
      </div>
    </main>
  );
}