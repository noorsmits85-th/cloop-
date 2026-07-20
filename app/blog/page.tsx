"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { 
  Heart, Bookmark, MapPin, PenTool, 
  BookOpen, Trophy, Sparkles, User, ChevronRight
} from "lucide-react";

// 🔧 KẾT NỐI SUPABASE
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface UserProfile {
  id: string;
  name?: string;
  avatar?: string;
  isVip?: boolean; // Nếu database có cột này thì sẽ hiện mác Ruby
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
  userId?: string; // SỬA: Khớp bảng BlogPost thật
  
  // Dữ liệu Real-time
  likesCount: number;
  savesCount: number;
  hasLiked: boolean;
  hasSaved: boolean;
  author: UserProfile | null;
  allImages: string[]; 
  products: {
    title: string;
    original_price: number;
    Listing: Array<{ basePrice: number; listingType: string; }>;
  } | null;
}

export default function BlogJournalPage() {
  const [posts, setPosts] = useState<BlogWithData[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [rubyPost, setRubyPost] = useState<BlogWithData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"newest" | "loved" | "community">("newest");
  
  // ⚡ LẤY USER ID THẬT TỪ LOCAL STORAGE
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedId = localStorage.getItem("cloop_user_id");
      setCurrentUserId(storedId);
    }
  }, []);

  // ⚡ FETCH THÔNG TIN PROFILE CỦA NGƯỜI ĐANG ĐĂNG NHẬP
  useEffect(() => {
    if (!currentUserId) return;
    async function fetchMyProfile() {
      const { data } = await supabase.from("User").select("id, name, avatar, isVip").eq("id", currentUserId).maybeSingle();
      if (data) setMyProfile(data);
    }
    fetchMyProfile();
  }, [currentUserId]);

  // ⚡ FETCH TOÀN BỘ DATA BẢNG TIN
  useEffect(() => {
    async function fetchRealDataFeed() {
      try {
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
        const authorIds = publicBlogs.map((b: any) => b.userId).filter(Boolean); // ĐÃ SỬA: userId
        const blogIds = publicBlogs.map((b: any) => b.id);

        // FETCH SONG SONG CÁC BẢNG (ĐÃ SỬA TÊN BẢNG VÀ CỘT)
        const [
          { data: productsData },
          { data: listingsData },
          { data: imagesData },
          { data: usersData }, // Bảng User thật
          { data: interactionsData } // Bảng BlogInteraction thật
        ] = await Promise.all([
          supabase.from("products").select("*").in("id", productIds),
          supabase.from("Listing").select("*").in("productId", productIds),
          supabase.from("ProductImage").select("*").in("productId", productIds),
          supabase.from("User").select("id, name, avatar, isVip").in("id", authorIds), 
          supabase.from("BlogInteraction").select("*").in("blogPostId", blogIds) 
        ]);

        let authorScores: Record<string, { name: string; avatar: string; score: number }> = {};

        const formattedBlogs = publicBlogs.map((blog: any) => {
          let allUrls: string[] = [];
          if (blog.coverImage) allUrls.push(blog.coverImage);

          const matchedProduct = (productsData || []).find((p: any) => String(p.id) === String(blog.productId));
          let productInfo = null;
          
          if (matchedProduct) {
            const matchedListings = (listingsData || []).filter((l: any) => String(l.productId) === String(matchedProduct.id));
            const matchedImages = (imagesData || []).filter((img: any) => String(img.productId) === String(matchedProduct.id));
            allUrls = [...allUrls, ...matchedImages.map((img: any) => img.url)];
            
            productInfo = {
              title: matchedProduct.title,
              original_price: matchedProduct.original_price,
              Listing: matchedListings,
            };
          }

          allUrls = Array.from(new Set(allUrls)); 
          if (allUrls.length === 0) allUrls = ["https://images.unsplash.com/photo-1515886657613-9f3515b0c78f"];

          // TÍNH TOÁN LƯỢT TƯƠNG TÁC THẬT
          const blogInteractions = (interactionsData || []).filter((i: any) => String(i.blogPostId) === String(blog.id));
          const likes = blogInteractions.filter((i: any) => i.type === 'LIKE');
          const saves = blogInteractions.filter((i: any) => i.type === 'SAVE'); // Đổi BOOKMARK thành SAVE
          
          const hasLiked = currentUserId ? likes.some((i: any) => i.userId === currentUserId) : false;
          const hasSaved = currentUserId ? saves.some((i: any) => i.userId === currentUserId) : false;

          const author = (usersData || []).find((u: any) => String(u.id) === String(blog.userId)) || null;

          if (author) {
            if (!authorScores[author.id]) {
              authorScores[author.id] = { name: author.name || 'Ẩn danh', avatar: author.avatar || "/logo2.png", score: 0 };
            }
            authorScores[author.id].score += likes.length; 
          }

          return {
            ...blog,
            location: blog.location || "Việt Nam", 
            likesCount: likes.length,
            savesCount: saves.length,
            hasLiked,
            hasSaved,
            author,
            allImages: allUrls,
            products: productInfo
          };
        });

        const sortedLeaderboard = Object.values(authorScores).sort((a, b) => b.score - a.score).slice(0, 3);
        const topTrendingPost = [...formattedBlogs].sort((a, b) => b.likesCount - a.likesCount)[0];

        setPosts(formattedBlogs);
        setLeaderboard(sortedLeaderboard);
        setRubyPost(topTrendingPost);

      } catch (err) {
        console.error("Lỗi fetch dữ liệu blog:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRealDataFeed();
  }, [currentUserId]); // Cập nhật khi lấy được ID user

  // ==================== TƯƠNG TÁC BẤM TIM/LƯU NHẢY SỐ TỨC THÌ ====================
  const handleInteraction = async (blogId: string, type: 'LIKE' | 'SAVE') => {
    if (!currentUserId) {
      alert("Bạn cần đăng nhập để thả tim và lưu bài viết!");
      return;
    }

    // 1. Optimistic UI
    setPosts(prevPosts => prevPosts.map(post => {
      if (post.id === blogId) {
        const isLiking = type === 'LIKE';
        const currentValue = isLiking ? post.hasLiked : post.hasSaved;
        const countKey = isLiking ? 'likesCount' : 'savesCount';
        const hasKey = isLiking ? 'hasLiked' : 'hasSaved';

        return {
          ...post,
          [hasKey]: !currentValue,
          [countKey]: post[countKey] + (!currentValue ? 1 : -1)
        };
      }
      return post;
    }));

    // Cập nhật riêng cho thẻ Ruby nổi bật
    if (rubyPost && rubyPost.id === blogId) {
       setRubyPost(prev => {
         if(!prev) return null;
         const isLiking = type === 'LIKE';
         const currentValue = isLiking ? prev.hasLiked : prev.hasSaved;
         return {
           ...prev,
           hasLiked: isLiking ? !currentValue : prev.hasLiked,
           likesCount: isLiking ? prev.likesCount + (!currentValue ? 1 : -1) : prev.likesCount
         }
       });
    }

    // 2. Gửi Supabase (Đã sửa tên bảng & cột)
    try {
      const isLiking = type === 'LIKE';
      const post = posts.find(p => p.id === blogId);
      if (!post) return;
      
      const isCurrentlyActive = isLiking ? post.hasLiked : post.hasSaved;

      if (isCurrentlyActive) {
        await supabase.from("BlogInteraction").delete().match({ blogPostId: blogId, userId: currentUserId, type });
      } else {
        await supabase.from("BlogInteraction").insert({ blogPostId: blogId, userId: currentUserId, type });
      }
    } catch (error) {
      console.error(`Lỗi cập nhật ${type}:`, error);
    }
  };

  // ⚡ TÍNH TOÁN SỐ LIỆU ĐỘNG CỦA CÁ NHÂN TỪ DANH SÁCH POSTS
  const myPosts = posts.filter(p => p.userId === currentUserId);
  const myPostCount = myPosts.length;
  const myTotalLikes = myPosts.reduce((sum, p) => sum + p.likesCount, 0);
  const myProductCount = new Set(myPosts.map(p => p.productId).filter(Boolean)).size;

  // ==================== RENDER ====================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center font-serif relative">
        <div className="text-center space-y-4 relative z-10 flex flex-col items-center">
          <img src="/logo2.png" className="w-20 animate-pulse drop-shadow-md" alt="Loading" />
          <p className="text-sm tracking-widest uppercase font-sans text-[#1A3B2E] font-bold">Đang dàn trang ký ức...</p>
        </div>
      </div>
    );
  }

  const displayPosts = [...posts].sort((a, b) => {
    if (activeTab === "loved") return b.likesCount - a.likesCount; 
    return 0; 
  });

  return (
    <main className="min-h-screen bg-[#F4F1EA] py-12 px-4 md:px-8 xl:px-16 relative overflow-hidden font-sans text-[#333]">
      <div className="fixed inset-0 pointer-events-none z-0 bg-[url('/giaynhau.png')] bg-cover bg-center mix-blend-multiply opacity-80" />

      <div className="max-w-[1440px] mx-auto relative z-10 space-y-8">
        
        {/* ================= HÀNG 1: HERO & PROFILE ================= */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          <div className="xl:col-span-8 bg-[url('/giaynhaurach.png')] bg-cover bg-center p-8 md:p-12 min-h-[380px] flex flex-col md:flex-row items-center justify-between gap-8 filter drop-shadow-md relative">
            <img src="/hoagiay.png" className="absolute -top-6 -left-6 w-32 md:w-40 opacity-90 z-20 pointer-events-none drop-shadow-sm" alt="Hoa khô" />
            <img src="/ghimvang.png" className="absolute top-4 right-1/2 w-8 z-20" alt="Ghim" />
            <img src="/logo1.png" className="absolute bottom-6 -left-4 w-28 opacity-80 -rotate-12" alt="Con dấu" />

            <div className="space-y-5 max-w-md relative z-10">
              <h1 className="text-5xl md:text-6xl font-serif text-[#1A3B2E] font-bold leading-tight">
                BẢO TÀNG <br/>
                <span className="font-normal italic text-[#6BA37A]">Ký ức tuần hoàn <Heart size={28} className="inline text-[#D4AF37] fill-transparent mb-2" strokeWidth={1.5} /></span>
              </h1>
              <p className="text-sm font-medium text-stone-700 leading-relaxed">
                Mỗi chiếc váy đều đi qua một hành trình. <br/> Mỗi câu chuyện đều đáng được lưu giữ.
              </p>
              
              <div className="flex flex-wrap gap-3 pt-4">
                <Link href="/blog/create">
                  <button className="bg-[#1A3B2E] text-white px-5 py-3 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-[#122A20] transition shadow-md">
                    <PenTool size={14} /> Viết ký ức
                  </button>
                </Link>
                <Link href={currentUserId ? `/closet/${currentUserId}` : "/auth"}>
                  <button className="bg-transparent border border-stone-400 text-stone-800 px-5 py-3 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-stone-100 transition">
                    <BookOpen size={14} /> Kho ký ức của tôi
                  </button>
                </Link>
              </div>
            </div>

            <div className="relative shrink-0 flex items-center gap-4 z-10 hidden md:flex">
              <div className="w-40 p-4 border border-dashed border-stone-300 bg-[#FAF8F5]/50 rotate-3 text-center">
                <p className="text-[11px] font-serif italic text-stone-700 leading-relaxed">
                  * Truyền cảm hứng và lan tỏa những điều đẹp đẽ. ♡
                </p>
              </div>
              <div className="bg-white p-3 pb-8 rounded-sm shadow-[0_10px_20px_rgba(0,0,0,0.1)] rotate-[-4deg] relative w-56">
                <img src="/bangdanvang.png" className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 rotate-2 z-10" alt="Tape" />
                <img src={posts[0]?.allImages[0] || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f"} className="w-full aspect-[4/5] object-cover" alt="Hero" />
                <p className="absolute bottom-2 w-full text-center text-[10px] font-serif italic text-stone-500 pr-6">Nơi lưu giữ nét đẹp</p>
              </div>
            </div>
          </div>

          <div className="xl:col-span-4 bg-[url('/giaynhaurach.png')] bg-cover bg-center p-8 min-h-[380px] flex flex-col justify-center items-center text-center filter drop-shadow-md relative">
            <img src="/vuongmien.png" className="absolute top-6 right-6 w-12 drop-shadow-sm" alt="Crown" />
            
            {currentUserId ? (
              <>
                <div className="w-24 h-24 p-1 bg-white border border-stone-300 rounded-full shadow-sm mb-4">
                  <img src={myProfile?.avatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80"} className="w-full h-full object-cover rounded-full" alt="Avatar" />
                </div>
                
                <h2 className="text-2xl font-serif font-bold text-[#1A3B2E]">
                  @{myProfile?.name || "Khách"} <Sparkles size={16} className="inline text-green-600 mb-2"/>
                </h2>
                
                {/* HIỆN THẺ RUBY NẾU isVip = true trong Supabase */}
                {myProfile?.isVip ? (
                  <p className="text-[10px] font-bold text-red-700 bg-red-50 px-3 py-1 rounded-full mt-1 border border-red-200">
                    Thành viên Ruby ❤️
                  </p>
                ) : (
                  <p className="text-[10px] font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full mt-1 border border-green-200">
                    Thành viên CLOOP 🌱
                  </p>
                )}

                <div className="grid grid-cols-3 w-full gap-2 border-t border-b border-stone-300/50 py-4 mt-6 mb-5">
                  <div><p className="text-lg font-serif font-bold text-[#1A3B2E]">{myPostCount}</p><p className="text-[9px] uppercase">Câu chuyện</p></div>
                  <div><p className="text-lg font-serif font-bold text-[#1A3B2E]">{myTotalLikes}</p><p className="text-[9px] uppercase">Đồng cảm</p></div>
                  <div><p className="text-lg font-serif font-bold text-[#1A3B2E]">{myProductCount}</p><p className="text-[9px] uppercase">Trang phục</p></div>
                </div>

                {/* SỬA LINK CHỈNH SỬA VỀ ĐÚNG /closet */}
                <Link href={`/closet/${currentUserId}`} className="w-full">
                  <button className="bg-[#1A3B2E] text-white w-full py-3 rounded-full text-[11px] font-bold uppercase tracking-wider hover:bg-[#122A20] transition shadow-sm">
                    Chỉnh sửa hồ sơ
                  </button>
                </Link>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-stone-100 border border-stone-300 rounded-full flex items-center justify-center text-stone-400 mb-4">
                  <User size={32} />
                </div>
                <h2 className="text-2xl font-serif font-bold text-[#1A3B2E]">Chào bạn! 👋</h2>
                <p className="text-xs font-serif italic text-stone-600 mt-4 leading-relaxed px-4">
                  "Hãy đăng nhập để lưu giữ ký ức và lan tỏa phong cách thời trang xanh."
                </p>
                <Link href="/auth" className="w-full mt-8">
                  <button className="bg-[#1A3B2E] text-white w-full py-3 rounded-full text-[11px] font-bold uppercase tracking-wider hover:bg-[#122A20] transition shadow-sm">
                    Đăng nhập / Đăng ký
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* ================= HÀNG 2: BẢNG KÝ ỨC & VINH DANH ================= */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start relative z-20">
          
          <div className="xl:col-span-8 bg-[url('/giaynhaurach.png')] bg-cover bg-center p-8 filter drop-shadow-md relative">
            <img src="/hoagiay.png" className="absolute top-4 -left-4 w-28 opacity-80 z-20 pointer-events-none drop-shadow-sm" alt="Hoa khô" />
            <img src="/mayanh.png" className="absolute -bottom-10 right-4 w-44 z-30 drop-shadow-xl" alt="Camera" />

            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 border-b border-stone-300/50 pb-4">
              <div className="text-left pl-8">
                <h2 className="text-2xl font-serif font-bold text-[#1A3B2E] flex items-center gap-2">
                  🌿 BẢNG KÝ ỨC
                </h2>
              </div>
              <div className="flex gap-2 mt-4 sm:mt-0">
                {(["newest", "loved"] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition ${
                      activeTab === tab ? "bg-[#1A3B2E] text-white" : "bg-transparent text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {tab === "newest" ? "Mới nhất" : "Nhiều tim nhất"}
                  </button>
                ))}
              </div>
            </div>

            {/* LƯỚI CARD POLAROID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
              {displayPosts.map((post, index) => {
                const tapeAsset = index % 2 === 0 ? "/bangdanvang.png" : "/bangdanxanh.png";
                
                return (
                  <div key={post.id} className="relative group hover:-translate-y-2 transition-transform duration-300 z-10">
                    <div className="bg-[#FAF9F6] p-3 pb-4 rounded-sm shadow-md border border-stone-200 flex flex-col h-full relative">
                      
                      <img src={tapeAsset} className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 z-20 drop-shadow-sm" alt="Tape" />
                      {index === 1 && <img src="/kep-den.png" className="absolute -top-2 -right-4 w-12 z-20 drop-shadow-md" alt="Clip" />}
                      
                      {/* KHUNG ẢNH CÓ SLIDER (HIỂN THỊ TẤT CẢ ẢNH) */}
                      <div className="w-full aspect-[4/5] bg-stone-100 p-2 pb-6 border border-stone-200 relative mb-4 overflow-hidden">
                        
                        <div className="flex w-full h-full overflow-x-auto snap-x snap-mandatory hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                          {post.allImages.map((img, i) => (
                            <img key={i} src={img} className="w-full h-full object-cover shrink-0 snap-center filter contrast-100 sepia-[0.05]" alt={`${post.title}-${i}`} />
                          ))}
                        </div>

                        {post.allImages.length > 1 && (
                          <div className="absolute bottom-8 w-full left-0 flex justify-center gap-1 z-10 pointer-events-none">
                             {post.allImages.map((_, i) => (
                               <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/80 border border-stone-400/50 shadow-sm" />
                             ))}
                          </div>
                        )}

                        <div className="absolute bottom-1 left-2 flex items-center gap-1 text-[9px] font-bold text-stone-500 uppercase tracking-widest bg-[#EADDCE]/80 px-2 py-0.5 rounded-sm">
                          <MapPin size={8} /> {post.location}
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col justify-between px-1">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <img src={post.author?.avatar || "/logo2.png"} className="w-4 h-4 rounded-full object-cover" alt="author"/>
                            <span className="text-[10px] font-bold text-stone-600">@{post.author?.name || "Ẩn danh"}</span>
                          </div>
                          <h3 className="font-serif text-[15px] font-bold text-[#1A3B2E] mb-2 leading-snug line-clamp-2">{post.title}</h3>
                          <p className="text-[11px] text-stone-600 mb-4 line-clamp-3 leading-relaxed">{post.content}</p>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-stone-200">
                          <div className="flex gap-3">
                            <button onClick={() => handleInteraction(post.id, 'LIKE')} className={`flex items-center gap-1 text-[11px] font-bold transition-colors ${post.hasLiked ? "text-red-500" : "text-stone-500 hover:text-red-400"}`}>
                              <Heart size={14} className={post.hasLiked ? "fill-current" : ""} /> {post.likesCount}
                            </button>
                            <button onClick={() => handleInteraction(post.id, 'SAVE')} className={`flex items-center gap-1 text-[11px] font-bold transition-colors ${post.hasSaved ? "text-blue-600" : "text-stone-500 hover:text-blue-500"}`}>
                              <Bookmark size={14} className={post.hasSaved ? "fill-current" : ""} /> Lưu
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CỘT PHẢI: VINH DANH & RUBY TOP TRENDING */}
          <div className="xl:col-span-4 flex flex-col gap-8 h-full">
            
            <div className="bg-[url('/giaynhaurach.png')] bg-cover bg-center p-6 filter drop-shadow-md relative">
              <div className="flex justify-between items-center mb-6 border-b border-stone-300/50 pb-3">
                <h3 className="text-[13px] font-black uppercase tracking-widest text-[#1A3B2E] flex items-center gap-2">
                  <img src="/vuongmien.png" className="w-5" alt="Crown" /> GÓC VINH DANH
                </h3>
              </div>

              <div className="space-y-4 relative z-10">
                {leaderboard.length > 0 ? leaderboard.map((u, index) => {
                  const r = index + 1;
                  const c = r === 1 ? "bg-yellow-100 text-yellow-700" : r === 2 ? "bg-stone-200 text-stone-700" : "bg-orange-100 text-orange-700";
                  return (
                    <div key={r} className="flex items-center justify-between bg-white/40 p-2 rounded-xl border border-stone-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex justify-center items-center font-bold text-[10px] ${c}`}>
                          <Trophy size={10} className="mr-0.5" />{r}
                        </span>
                        <img src={u.avatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80"} className="w-8 h-8 rounded-full object-cover border border-stone-300" alt={u.name} />
                        <div>
                          <p className="text-[11px] font-bold text-stone-800">@{u.name}</p>
                          <p className="text-[10px] text-red-500 font-bold">{u.score} Tim ❤️</p>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-xs text-center text-stone-500 py-4 italic font-serif">Đang chờ những câu chuyện đầu tiên...</p>
                )}
              </div>

              <div className="mt-6 flex justify-end relative">
                <img src="/cupvang.png" className="w-20 drop-shadow-md z-10" alt="Cup" />
              </div>
            </div>

            <div className="bg-[url('/giaynhaurach.png')] bg-cover bg-center p-6 filter drop-shadow-md flex-1 flex flex-col relative">
              <img src="/logo2.png" className="absolute bottom-2 -right-4 w-20 opacity-40 z-0" alt="Seal"/>
              
              <div className="flex justify-between items-center mb-4 relative z-10">
                <div>
                  <h3 className="text-[13px] font-black uppercase tracking-widest text-[#1A3B2E] flex items-center gap-2">
                    <Heart size={14} className="fill-red-500 text-red-500 animate-pulse" /> BÀI VIẾT NỔI BẬT
                  </h3>
                  <p className="text-[9px] text-stone-500 font-medium mt-1">Nhiều người đồng cảm nhất</p>
                </div>
              </div>

              {rubyPost ? (
                <div className="flex gap-4 mt-2 h-full items-center relative z-10">
                  <div className="flex-1 space-y-3">
                    <p className="text-[11px] font-bold text-stone-800 leading-snug line-clamp-2">
                      {rubyPost.title}
                    </p>
                    <p className="text-[10px] text-stone-600 line-clamp-3 italic">
                      "{rubyPost.content}"
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-red-600 pt-2">
                      <Heart size={12} className="fill-current"/> {rubyPost.likesCount} Lượt tim
                    </div>
                  </div>
                  
                  <div className="w-24 shrink-0 bg-white p-1.5 pb-4 shadow-sm border border-stone-200 rotate-3 relative">
                    <img src="/vuongmien.png" className="absolute -top-3 -right-2 w-8 z-10" alt="Crown"/>
                    <img src={rubyPost.allImages[0]} className="w-full aspect-square object-cover filter contrast-100 sepia-[0.1]" alt="Collection" />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-stone-500 italic mt-4 text-center">Chưa có bài viết nổi bật nào.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}} />
    </main>
  );
}