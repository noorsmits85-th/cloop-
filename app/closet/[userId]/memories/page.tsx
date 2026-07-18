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
  productId: string; // 🟢 CHUẨN HÓA: Bổ sung cấu trúc dữ liệu ID sản phẩm gắn liền với bài viết
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
        // Lấy tên User
        const { data: user } = await supabase.from("User").select("name").eq("id", userId).maybeSingle();
        if (user?.name) setUserName(user.name);

        // Lấy toàn bộ Blog Ký ức (Bao gồm cả content làm caption)
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
              productId: b.productId || b.product_id || "" // 🟢 ĐỒNG BỘ: Bốc chính xác trường productId từ DB
            };
          });
          setMemories(mapped);
        } else {
            // Cài sẵn productId giả lập cho mock data để click test thử không lo bị lỗi link
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
      className="min-h-screen text-stone-800 antialiased pb-24 pt-8 relative selection:bg-[#183A2D] selection:text-white"
      style={{ backgroundColor: "#F5F2EB", backgroundImage: `url(${PAPER_BG})` }}
    >
      {/* 🟢 ĐÃ FIX LỖI: Thêm khối Style định dạng font chữ, Polaroid và Băng dính */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600;700&family=Caveat:wght@400;500;600;700&display=swap');
        h1, h2, h3, .font-heading { font-family: 'Cormorant Garamond', serif !important; }
        .font-handwriting { font-family: 'Caveat', cursive !important; }
        
        .tape {
            position: absolute;
            background-color: rgba(255, 235, 150, 0.65);
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            backdrop-filter: blur(2px);
            z-index: 20;
        }
        .polaroid-big {
            background: white;
            padding: 12px 12px 32px 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.05), 0 2px 5px rgba(0,0,0,0.02);
        }
      `}</style>

      {/* Hoa văn góc nền */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] opacity-20 pointer-events-none z-0" style={{ background: "radial-gradient(circle, rgba(107,163,122,0.2) 0%, rgba(245,242,235,0) 70%)" }} />
      
      {/* 🟢 ĐÃ FIX LỖI: CÀNH LÁ & HOA CỎ KHÔ TRANG TRÍ GÓC TRANG — HOÀI NIỆM NHƯ ẢNH MẪU */}
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

      {/* Bông hoa cỏ khô nhỏ điểm xuyết giữa trang */}
      <div className="fixed top-1/3 left-8 rotate-[-12deg] opacity-40 pointer-events-none z-0 hidden xl:block">
        <svg width="60" height="80" viewBox="0 0 60 80" fill="none">
          <path d="M30 80 L30 20" stroke="#8B9D77" strokeWidth="1.2" />
          <circle cx="30" cy="18" r="3" fill="#E8C4A0" />
          <circle cx="24" cy="30" r="2.5" fill="#E8C4A0" />
          <circle cx="36" cy="42" r="2.5" fill="#E8C4A0" />
        </svg>
      </div>
      
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 relative z-10">
        
        {/* THANH ĐIỀU HƯỚNG */}
        <div className="flex items-center justify-between mb-12">
          <Link href={`/closet/${userId}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-400 hover:text-[#183A2D] transition-colors uppercase tracking-wider bg-white/50 px-4 py-2 rounded-full border border-stone-200 shadow-sm backdrop-blur-md">
            <ArrowLeft size={14} /> Tủ đồ của {userName.split(" ")[0] || "Bạn"}
          </Link>
          <div className="w-10 h-10 rounded-full border border-dashed border-stone-300 flex items-center justify-center text-stone-300">
            <BookOpen size={16} />
          </div>
        </div>

        {/* TIÊU ĐỀ TRANG NHẬT KÝ */}
        <div className="text-center mb-16 space-y-4 relative">
          <div className="tape w-20 h-5 -top-4 left-1/2 -translate-x-1/2 rotate-2" />
          <h1 className="text-4xl md:text-6xl font-bold text-[#183A2D] font-heading">Cuốn Nhật Ký Kỷ Niệm</h1>
          <p className="text-sm text-stone-500 italic font-serif flex items-center justify-center gap-2">
            <Clock size={14} /> Ghi chép hành trình thời trang của {userName}
          </p>
        </div>

        {/* DANH SÁCH BÀI VIẾT KÈM CAPTION */}
        {memories.length === 0 ? (
          <div className="text-center py-20 bg-white/40 rounded-3xl border border-stone-200 border-dashed">
            <p className="font-handwriting text-2xl text-stone-400">Trang giấy trắng chưa có nét mực nào...</p>
          </div>
        ) : (
          <div className="space-y-24 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-stone-200 before:to-transparent">
            {memories.map((mem, idx) => {
              // Điểm điều hướng an toàn: Nếu không tìm thấy productId thật thì sẽ neo giữ tại chính trang tủ đồ
              const targetLink = mem.productId ? `/product/${mem.productId}` : `/closet/${userId}#wardrobe-section`;

              return (
                <div key={mem.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  
                  {/* Dấu chấm Timeline */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#F5F2EB] bg-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10 text-[#183A2D]">
                    <Heart size={14} className={idx === 0 ? "fill-amber-400 text-amber-400" : ""} />
                  </div>
                  
                  {/* Nội dung bài viết */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-[#FCFBFA] border border-[#EBE6D8] p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow relative">
                    <div className={`tape w-16 h-4 -top-2 ${idx % 2 === 0 ? 'right-6 rotate-3' : 'left-6 -rotate-3'}`} />
                    
                    {/* Khung ảnh Polaroid trỏ thẳng về trang chi tiết sản phẩm /product/[id] */}
                    <Link href={targetLink} className={`block polaroid-big relative mb-6 ${idx % 2 === 0 ? '-rotate-1' : 'rotate-1'} hover:rotate-0 transition-transform duration-500`}>
                      <div className="w-full aspect-[4/3] bg-stone-100 overflow-hidden relative border border-stone-200/50">
                        <Image src={mem.image} alt={mem.title} fill unoptimized className="object-cover" />
                      </div>
                    </Link>
                    
                    {/* Caption & Chữ viết tay */}
                    <div className="space-y-3 px-2">
                      <p className="text-[10px] font-bold text-emerald-700 tracking-widest uppercase">{mem.fullDate}</p>
                      
                      {/* Tiêu đề bài viết trỏ thẳng về trang chi tiết sản phẩm /product/[id] */}
                      <Link href={targetLink} className="block">
                        <h3 className="text-xl font-bold text-stone-800 font-heading hover:text-[#183A2D] transition-colors">{mem.title}</h3>
                      </Link>
                      
                      <p className="text-[15px] leading-relaxed text-stone-600 font-handwriting">
                        "{mem.content}"
                      </p>
                    </div>
                  </div>

                </div>
              ); // 🟢 ĐÃ FIX LỖI: Đóng ngoặc chuẩn xác của lệnh return bên trong hàm map()
            })}
          </div>
        )}
        
      </div>
    </main>
  );
}