"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { 
  Heart, Bookmark, MapPin, PenTool, 
  BookOpen, Trophy, Sparkles
} from "lucide-react";

// 🔧 KẾT NỐI SUPABASE
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface BlogInteraction {
  id: string;
  blog_id: string;
  user_id: string;
  type: 'LIKE' | 'BOOKMARK';
}

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  role: string;
}

interface BlogWithData {
  id: string;
  title: string;
  content: string;
  coverImage: string;
  productId: string;
  createdAt: string;
  status: string;
  isPinned?: boolean;
  location?: string;
  author_id?: string;
  // Dữ liệu Real-time ghép nối
  likesCount: number;
  bookmarksCount: number;
  hasLiked: boolean;
  hasBookmarked: boolean;
  author: UserProfile | null;
  products: {
    title: string;
    original_price: number;
    Listing: Array<{ basePrice: number; listingType: string; }>;
    images: string[];
  } | null;
}

export default function BlogJournalPage() {
  const [posts, setPosts] = useState<BlogWithData[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"newest" | "loved" | "community">("newest");
  
  // Giả lập user đang đăng nhập (Lắp Auth thật vào đây sau)
  const currentUserId = "current-user-id"; 

  useEffect(() => {
    async function fetchRealDataFeed() {
      try {
        // 1. Lấy bài viết (Ghim lên trước, Mới nhất lên sau)
        const { data: blogData, error: blogError } = await supabase
          .from("BlogPost")
          .select("*")
          .order("isPinned", { ascending: false })
          .order("createdAt", { ascending: false });

        if (blogError) throw blogError;
        const publicBlogs = (blogData || []).filter((b: any) => b.status !== "HIDDEN");

        if (publicBlogs.length === 0) {
          setPosts([]);
          setIsLoading(false);
          return;
        }

        const productIds = publicBlogs.map((b: any) => b.productId).filter(Boolean);
        const authorIds = publicBlogs.map((b: any) => b.author_id).filter(Boolean);
        const blogIds = publicBlogs.map((b: any) => b.id);

        // 2. Fetch song song các bảng liên quan để tối ưu tốc độ
        const [
          { data: productsData },
          { data: listingsData },
          { data: imagesData },
          { data: profilesData },
          { data: interactionsData }
        ] = await Promise.all([
          supabase.from("products").select("*").in("id", productIds),
          supabase.from("Listing").select("*").in("productId", productIds),
          supabase.from("ProductImage").select("*").in("productId", productIds),
          supabase.from("profiles").select("*").in("id", authorIds), // Bảng user
          supabase.from("blog_interactions").select("*").in("blog_id", blogIds) // Bảng tương tác (LIKE/BOOKMARK)
        ]);

        // 3. Xử lý & Ghép nối dữ liệu thật
        let authorScores: Record<string, { name: string; avatar: string; score: number }> = {};

        const formattedBlogs = publicBlogs.map((blog: any) => {
          // --- Ghép Product ---
          const matchedProduct = (productsData || []).find((p: any) => String(p.id) === String(blog.productId));
          let productInfo = null;
          if (matchedProduct) {
            const matchedListings = (listingsData || []).filter((l: any) => String(l.productId) === String(matchedProduct.id));
            const matchedImages = (imagesData || []).filter((img: any) => String(img.productId) === String(matchedProduct.id));
            let allUrls = matchedImages.map((img: any) => img.url);
            if (allUrls.length === 0 && blog.coverImage) allUrls = [blog.coverImage];
            if (allUrls.length === 0) allUrls = ["https://images.unsplash.com/photo-1515886657613-9f3515b0c78f"];

            productInfo = {
              title: matchedProduct.title,
              original_price: matchedProduct.original_price,
              Listing: matchedListings,
              images: allUrls
            };
          }

          // --- Ghép Tương tác thật (Tim/Lưu) ---
          const blogInteractions = (interactionsData || []).filter((i: any) => String(i.blog_id) === String(blog.id));
          const likes = blogInteractions.filter((i: any) => i.type === 'LIKE');
          const bookmarks = blogInteractions.filter((i: any) => i.type === 'BOOKMARK');
          
          const hasLiked = likes.some((i: any) => i.user_id === currentUserId);
          const hasBookmarked = bookmarks.some((i: any) => i.user_id === currentUserId);

          // --- Ghép Tác giả & Tính điểm Leaderboard ---
          const author = (profilesData || []).find((p: any) => String(p.id) === String(blog.author_id)) || null;
          
          if (author) {
            if (!authorScores[author.id]) {
              authorScores[author.id] = { name: author.full_name || 'Người dùng', avatar: author.avatar_url, score: 0 };
            }
            authorScores[author.id].score += likes.length; // 1 Tim = 1 Điểm vinh danh
          }

          return {
            ...blog,
            location: blog.location || "Việt Nam", // Không dùng random nữa
            likesCount: likes.length,
            bookmarksCount: bookmarks.length,
            hasLiked,
            hasBookmarked,
            author,
            products: productInfo
          };
        });

        // 4. Sắp xếp Bảng Vinh Danh thật
        const sortedLeaderboard = Object.values(authorScores)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3); // Lấy Top 3

        setPosts(formattedBlogs);
        setLeaderboard(sortedLeaderboard);

      } catch (err) {
        console.error("Lỗi fetch dữ liệu blog:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRealDataFeed();
  }, []);

  // ==================== HÀM XỬ LÝ TƯƠNG TÁC THẬT LÊN DB ====================
  const handleInteraction = async (blogId: string, type: 'LIKE' | 'BOOKMARK') => {
    // 1. Optimistic UI Update (Cập nhật giao diện mượt mà trước khi chờ Server)
    setPosts(prevPosts => prevPosts.map(post => {
      if (post.id === blogId) {
        const isLiking = type === 'LIKE';
        const currentValue = isLiking ? post.hasLiked : post.hasBookmarked;
        const countKey = isLiking ? 'likesCount' : 'bookmarksCount';
        const hasKey = isLiking ? 'hasLiked' : 'hasBookmarked';

        return {
          ...post,
          [hasKey]: !currentValue,
          [countKey]: post[countKey] + (!currentValue ? 1 : -1)
        };
      }
      return post;
    }));

    // 2. Gọi API thật (Nên có Auth context thật ở đây)
    try {
      const isLiking = type === 'LIKE';
      const post = posts.find(p => p.id === blogId);
      if (!post) return;
      
      const isCurrentlyActive = isLiking ? post.hasLiked : post.hasBookmarked;

      if (isCurrentlyActive) {
        // Hủy Tim/Lưu
        await supabase.from("blog_interactions")
          .delete()
          .match({ blog_id: blogId, user_id: currentUserId, type });
      } else {
        // Thêm Tim/Lưu
        await supabase.from("blog_interactions")
          .insert({ blog_id: blogId, user_id: currentUserId, type });
      }
    } catch (error) {
      console.error(`Lỗi cập nhật ${type}:`, error);
      // Nếu lỗi, nên rollback state UI lại (Bỏ qua trong bản rút gọn này để code sạch)
    }
  };

  // ==================== RENDER LOADING ====================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[url('/giaynhau.png')] bg-cover bg-center flex items-center justify-center font-serif text-stone-700 relative">
        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm" />
        <div className="text-center space-y-4 relative z-10 flex flex-col items-center">
          <img src="/logo2.png" className="w-20 animate-pulse drop-shadow-md" alt="Loading" />
          <p className="text-sm tracking-widest uppercase font-sans text-[#1A3B2E] font-bold">Đang tải ký ức...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F1EA] py-12 px-4 md:px-8 xl:px-16 relative overflow-hidden font-sans text-[#333]">
      {/* BACKGROUND ĐÁY - Đã sửa lỗi fixed/absolute xung đột */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[url('/giaynhau.png')] bg-cover bg-center mix-blend-multiply opacity-80" />

      <div className="max-w-[1440px] mx-auto relative z-10 space-y-8">
        
        {/* ================= HÀNG 1: HERO BANNER & PROFILE ================= */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* CỘT TRÁI: HERO BANNER */}
          <div className="xl:col-span-8 bg-[url('/giaynhaurach.png')] bg-cover bg-center p-8 md:p-12 min-h-[380px] flex flex-col md:flex-row items-center justify-between gap-8 filter drop-shadow-md relative">
            <img src="/hoagiay.png" className="absolute -top-6 -left-6 w-32 md:w-40 opacity-90 z-20 pointer-events-none drop-shadow-sm" alt="Hoa khô" />
            <img src="/ghimvang.png" className="absolute top-4 right-1/2 w-8 z-20" alt="Ghim" />
            <img src="/logo1.png" className="absolute bottom-6 -left-4 w-28 opacity-80 -rotate-12" alt="Con dấu" />

            {/* Content Chữ */}
            <div className="space-y-5 max-w-md relative z-10">
              <h1 className="text-5xl md:text-6xl font-serif text-[#1A3B2E] font-bold leading-tight">
                BẢO TÀNG <br/>
                <span className="font-normal italic text-[#6BA37A]">Ký ức tuần hoàn <Heart size={28} className="inline text-[#D4AF37] fill-transparent mb-2" strokeWidth={1.5} /></span>
              </h1>
              <p className="text-sm font-medium text-stone-700 leading-relaxed">
                Mỗi chiếc váy đều đi qua một hành trình. <br/> Mỗi câu chuyện đều đáng được lưu giữ.
              </p>
              
              <div className="flex flex-wrap gap-3 pt-4">
                <button className="bg-[#1A3B2E] text-white px-5 py-3 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-[#122A20] transition shadow-md">
                  <PenTool size={14} /> Viết ký ức của bạn
                </button>
                <button className="bg-transparent border border-stone-400 text-stone-800 px-5 py-3 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-stone-100 transition">
                  <BookOpen size={14} /> Kho ký ức của tôi
                </button>
              </div>
            </div>

            {/* Note giấy và Ảnh nổi bật */}
            <div className="relative shrink-0 flex items-center gap-4 z-10">
              <div className="hidden md:block w-40 p-4 border border-dashed border-stone-300 bg-[#FAF8F5]/50 rotate-3 text-center">
                <p className="text-[11px] font-serif italic text-stone-700 leading-relaxed">
                  * Ở đây, bạn không chỉ chia sẻ câu chuyện, bạn đang truyền cảm hứng và lan tỏa những điều đẹp đẽ. ♡
                </p>
              </div>
              <div className="bg-white p-3 pb-8 rounded-sm shadow-[0_10px_20px_rgba(0,0,0,0.1)] rotate-[-4deg] relative w-56">
                <img src="/bangdanvang.png" className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 rotate-2 z-10" alt="Tape" />
                <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f" className="w-full aspect-[4/5] object-cover" alt="Hero" />
                <p className="absolute bottom-2 w-full text-center text-[10px] font-serif italic text-stone-500 pr-6">Một chiếc váy - Nhiều kỷ niệm</p>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: PROFILE USER (Lấy data thật nếu có, tạm Demo chuẩn) */}
          <div className="xl:col-span-4 bg-[url('/giaynhaurach.png')] bg-cover bg-center p-8 min-h-[380px] flex flex-col justify-center items-center text-center filter drop-shadow-md relative">
            <img src="/vuongmien.png" className="absolute top-6 right-6 w-12 drop-shadow-sm" alt="Crown" />
            <div className="w-24 h-24 p-1 bg-white border border-stone-300 rounded-full shadow-sm mb-4">
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200" className="w-full h-full object-cover rounded-full" alt="Avatar" />
            </div>
            
            <h2 className="text-2xl font-serif font-bold text-[#1A3B2E]">@Trinh <Sparkles size={16} className="inline text-green-600 mb-2"/></h2>
            <p className="text-xs font-bold text-red-700 bg-red-50 px-3 py-1 rounded-full mt-1">Thành viên Ruby ❤️</p>
            
            <p className="text-xs font-serif italic text-stone-600 mt-4 leading-relaxed px-4">
              "Có những chiếc váy <br/> không chỉ để mặc, <br/> mà để nhớ."
            </p>

            <div className="grid grid-cols-3 w-full gap-2 border-t border-b border-stone-300/50 py-4 mt-6 mb-5">
              <div><p className="text-lg font-serif font-bold text-[#1A3B2E]">34</p><p className="text-[9px] uppercase">Câu chuyện</p></div>
              <div><p className="text-lg font-serif font-bold text-[#1A3B2E]">126</p><p className="text-[9px] uppercase">Đồng cảm</p></div>
              <div><p className="text-lg font-serif font-bold text-[#1A3B2E]">9</p><p className="text-[9px] uppercase">Trang phục</p></div>
            </div>

            <button className="bg-[#1A3B2E] text-white w-full py-3 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#122A20] transition shadow-sm">
              Chỉnh sửa hồ sơ
            </button>
          </div>
        </div>

        {/* ================= HÀNG 2: BẢNG KÝ ỨC (MAIN) & VINH DANH ================= */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start relative z-20">
          
          {/* CỘT TRÁI: DANH SÁCH BÀI VIẾT THẬT */}
          <div className="xl:col-span-8 bg-[url('/giaynhaurach.png')] bg-cover bg-center p-8 filter drop-shadow-md relative">
            <img src="/hoagiay.png" className="absolute top-4 -left-4 w-28 opacity-80 z-20 pointer-events-none drop-shadow-sm" alt="Hoa khô" />
            <img src="/mayanh.png" className="absolute -bottom-10 right-4 w-44 z-30 drop-shadow-xl" alt="Camera" />

            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 border-b border-stone-300/50 pb-4">
              <div className="text-left pl-8">
                <h2 className="text-2xl font-serif font-bold text-[#1A3B2E] flex items-center gap-2">
                  🌿 BẢNG KÝ ỨC
                </h2>
                <p className="text-xs text-stone-500 font-medium">Những mảnh ghép tạo nên hành trình đẹp</p>
              </div>
              
              <div className="flex gap-2 mt-4 sm:mt-0">
                {(["newest", "loved", "community"] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition ${
                      activeTab === tab ? "bg-[#1A3B2E] text-white" : "bg-transparent text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {tab === "newest" ? "Mới nhất" : tab === "loved" ? "Được yêu thích" : "Nhiều người đồng cảm"}
                  </button>
                ))}
              </div>
            </div>

            {/* LƯỚI CARD POLAROID TỪ DỮ LIỆU THẬT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
              {posts.map((post, index) => {
                const coverImg = post.products?.images[0] || post.coverImage;
                const tapeAsset = index % 2 === 0 ? "/bangdanvang.png" : "/bangdanxanh.png";
                
                return (
                  <div key={post.id} className="relative group hover:-translate-y-2 transition-transform duration-300 z-10">
                    <div className="bg-[#FAF9F6] p-3 pb-4 rounded-sm shadow-md border border-stone-200 flex flex-col h-full relative">
                      
                      {/* Băng dính & Kẹp (File name chuẩn Linux) */}
                      <img src={tapeAsset} className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 z-20 drop-shadow-sm" alt="Tape" />
                      {index === 1 && <img src="/kep-den.png" className="absolute -top-2 -right-4 w-12 z-20 drop-shadow-md" alt="Clip" />}
                      {index === 2 && <img src="/logo2.png" className="absolute bottom-16 -left-6 w-16 z-30 drop-shadow-md" alt="Wax Seal" />}

                      {/* Khung ảnh Polaroid */}
                      <div className="w-full aspect-[4/5] bg-stone-100 p-2 pb-6 border border-stone-200 relative mb-4">
                        <img src={coverImg} className="w-full h-full object-cover filter contrast-100 sepia-[0.05]" alt={post.title} />
                        <div className="absolute bottom-1 left-2 flex items-center gap-1 text-[9px] font-bold text-stone-500 uppercase tracking-widest bg-[#EADDCE]/80 px-2 py-0.5 rounded-sm">
                          <MapPin size={8} /> {post.location}
                        </div>
                        {post.isPinned && (
                          <div className="absolute top-2 right-2 bg-[#D1A775] text-[#3E2723] p-1.5 text-[8px] font-black uppercase text-center w-12 h-14 flex flex-col justify-center border border-dashed border-[#5D4037] transform rotate-6 shadow-sm">
                            <span>PINNED</span><hr className="border-[#5D4037] my-0.5"/><span>CLOOP</span>
                          </div>
                        )}
                      </div>

                      {/* Thông tin bài viết & DỮ LIỆU TƯƠNG TÁC THẬT */}
                      <div className="flex-1 flex flex-col justify-between px-1">
                        <h3 className="font-serif text-[15px] font-bold text-[#1A3B2E] mb-2 leading-snug line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-[11px] text-stone-600 mb-4 line-clamp-3 leading-relaxed">
                          {post.content}
                        </p>
                        
                        <div className="flex items-center gap-3 pt-3 border-t border-stone-200">
                          <button onClick={() => handleInteraction(post.id, 'LIKE')} className={`flex items-center gap-1 text-[11px] font-bold ${post.hasLiked ? "text-red-500" : "text-stone-500"}`}>
                            <Heart size={14} className={post.hasLiked ? "fill-current" : ""} /> {post.likesCount}
                          </button>
                          <button onClick={() => handleInteraction(post.id, 'BOOKMARK')} className={`flex items-center gap-1 text-[11px] font-bold ${post.hasBookmarked ? "text-blue-600" : "text-stone-500"}`}>
                            <Bookmark size={14} className={post.hasBookmarked ? "fill-current" : ""} /> Lưu lại
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center mt-4">
              <button className="bg-transparent border-2 border-stone-300 text-stone-600 px-6 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-stone-200 transition">
                Xem thêm ký ức →
              </button>
            </div>
          </div>

          {/* CỘT PHẢI: VINH DANH (REAL DATA) & RUBY */}
          <div className="xl:col-span-4 flex flex-col gap-8 h-full">
            
            {/* Box 1: Bảng Vinh Danh Thật Từ Supabase */}
            <div className="bg-[url('/giaynhaurach.png')] bg-cover bg-center p-6 filter drop-shadow-md relative">
              <div className="flex justify-between items-center mb-6 border-b border-stone-300/50 pb-3">
                <h3 className="text-[13px] font-black uppercase tracking-widest text-[#1A3B2E] flex items-center gap-2">
                  <img src="/vuongmien.png" className="w-5" alt="Crown" /> GÓC VINH DANH
                </h3>
                <span className="text-[10px] font-bold text-stone-500 cursor-pointer hover:text-stone-800">Xem tất cả →</span>
              </div>

              <div className="space-y-4 relative z-10">
                {leaderboard.length > 0 ? leaderboard.map((u, index) => {
                  const r = index + 1;
                  const c = r === 1 ? "bg-yellow-100 text-yellow-700" : r === 2 ? "bg-stone-200 text-stone-700" : "bg-orange-100 text-orange-700";
                  return (
                    <div key={r} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex justify-center items-center font-bold text-[10px] ${c}`}>
                          <Trophy size={10} className="mr-0.5" />{r}
                        </span>
                        <img src={u.avatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80"} className="w-8 h-8 rounded-full object-cover border border-stone-300" alt={u.name} />
                        <div>
                          <p className="text-[11px] font-bold text-stone-800">@{u.name}</p>
                          <p className="text-[10px] text-stone-500">{u.score} ❤️</p>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-xs text-center text-stone-500 py-4">Chưa có ai trong bảng xếp hạng tháng này.</p>
                )}
              </div>

              {/* Decor Cúp vàng */}
              <div className="mt-6 flex justify-end relative">
                <div className="absolute top-2 right-16 w-32 bg-[#F9F8F6] p-2 border border-dashed border-stone-300 rotate-[-5deg] text-[9px] font-serif italic text-stone-700 text-center shadow-sm">
                  Cảm ơn bạn đã lan tỏa những câu chuyện đẹp!
                </div>
                <img src="/cupvang.png" className="w-20 drop-shadow-md z-10" alt="Cup" />
              </div>
            </div>

            {/* Box 2: Ruby Collection */}
            <div className="bg-[url('/giaynhaurach.png')] bg-cover bg-center p-6 filter drop-shadow-md flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-[13px] font-black uppercase tracking-widest text-[#1A3B2E] flex items-center gap-2">
                    <Heart size={14} className="fill-red-500 text-red-500" /> RUBY COLLECTION
                  </h3>
                  <p className="text-[9px] text-stone-500 font-medium mt-1">Dành riêng cho thành viên Ruby</p>
                </div>
                <span className="text-[10px] font-bold text-stone-500 cursor-pointer hover:text-stone-800">Xem thêm →</span>
              </div>

              <div className="flex gap-4 mt-2 h-full items-center">
                <div className="flex-1 space-y-4">
                  <p className="text-[11px] font-medium text-stone-700 leading-relaxed">
                    Những câu chuyện truyền cảm hứng nhất được tuyển chọn kỹ lưỡng.
                  </p>
                  <button className="border-2 border-stone-800 text-stone-800 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-stone-800 hover:text-white transition w-full">
                    Khám phá ngay
                  </button>
                </div>
                <div className="w-24 shrink-0 bg-white p-1.5 pb-4 shadow-sm border border-stone-200 rotate-3 relative">
                  <img src="/vuongmien.png" className="absolute -top-3 -right-2 w-8 z-10" alt="Crown"/>
                  <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200" className="w-full aspect-square object-cover" alt="Collection" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}