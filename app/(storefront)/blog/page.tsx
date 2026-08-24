"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Heart, Bookmark, MapPin, PenTool, 
  BookOpen, Trophy, Sparkles, User, ChevronRight,
  Share2, MessageSquare, Shirt, ArrowRight, X, Feather, Check, Leaf, Droplet
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface UserProfile {
  id: string;
  name?: string;
  avatar?: string;
  isVip?: boolean;
}

interface BlogWithData {
  id: string;
  title: string;
  content: string;
  coverImage: string;
  productId?: string;
  createdAt: string;
  status: string;
  isPinned?: boolean;
  location?: string;
  category?: string;
  userId?: string;
  
  // Dữ liệu Real-time
  likesCount: number;
  savesCount: number;
  hasLiked: boolean;
  hasSaved: boolean;
  author: UserProfile | null;
  allImages: string[]; 
  product?: {
    id: string;
    title: string;
    original_price?: number;
    rentalPrice?: number;
    image?: string;
  } | null;
}

// 📖 6 BÀI VIẾT KÝ ỨC MẪU ĐẬM CHẤT THỜI TRANG & CẢM XÚC
const DEFAULT_FASHION_STORIES: BlogWithData[] = [
  {
    id: "def-1",
    title: "Chiếc đầm Satin đỏ Bordeaux và buổi khiêu vũ tốt nghiệp Opera 2026",
    content: "Mình từng nghĩ một chiếc đầm dạ hội chỉ mặc đúng một lần rồi nằm im trong tủ. Nhưng khi gửi nó lên CLOOP, chiếc váy đã cùng 3 cô gái khác tỏa sáng ở những đêm tiệc rực rỡ. Mỗi lần nhận lại ảnh fit check của các bạn, mình như được sống lại cảm xúc tự tin của tuổi 22...",
    coverImage: "/1.1.jpg",
    allImages: ["/1.1.jpg", "/1.1 (1).jpg", "/step3_party.jpg"],
    createdAt: "2026-08-22T14:30:00.000Z",
    status: "PUBLISHED",
    isPinned: true,
    location: "Nhà Hát Lớn, Hà Nội",
    category: "gala",
    likesCount: 142,
    savesCount: 38,
    hasLiked: false,
    hasSaved: false,
    author: {
      id: "auth-1",
      name: "Khánh Linh (Linh Couture)",
      avatar: "/avatar_1.jpg",
      isVip: true
    },
    product: {
      id: "prod-1",
      title: "Đầm Lụa Satin Đỏ Rượu",
      original_price: 4500000,
      rentalPrice: 350000,
      image: "/1.1.jpg"
    }
  },
  {
    id: "def-2",
    title: "Set Dạ Tweed Parisienne: Nét thanh lịch cổ điển giữa lòng phố cổ",
    content: "Set dạ Tweed này mình may đo tại tiệm may thủ công Pháp năm 2023. Chất dạ dày dặn, đường cắt tinh tế giữ ấm cực tốt trong những ngày chớm đông. Rất hạnh phúc vì có bạn thuê set đồ này để chụp bộ ảnh kỷ yếu phong cách vintage tuyệt đẹp!",
    coverImage: "/1.2.jpeg",
    allImages: ["/1.2.jpeg", "/1.2.jpg", "/hero_warm.jpg"],
    createdAt: "2026-08-20T09:15:00.000Z",
    status: "PUBLISHED",
    location: "Tràng Tiền, Hà Nội",
    category: "daily",
    likesCount: 98,
    savesCount: 45,
    hasLiked: false,
    hasSaved: false,
    author: {
      id: "auth-2",
      name: "Minh Thư (Vintage Muse)",
      avatar: "/avatar_2.jpg",
      isVip: true
    },
    product: {
      id: "prod-2",
      title: "Set Dạ Tweed Paris",
      original_price: 2800000,
      rentalPrice: 180000,
      image: "/1.2.jpeg"
    }
  },
  {
    id: "def-3",
    title: "Tà Áo Dài Tơ Tằm 15 Năm: Ký ức ngày cưới của Mẹ và chuyến du xuân Hội An",
    content: "Chiếc áo dài lụa tơ tằm thêu tay hoa sen do chính mẹ mình gìn giữ suốt 15 năm. Sợi tơ mềm óng ánh, tôn trọn nét dịu dàng của người phụ nữ Việt. Được các bạn trẻ đón nhận và gìn giữ trong các dịp lễ Tết là niềm vinh dự lớn của gia đình.",
    coverImage: "/anhbia.png",
    allImages: ["/anhbia.png", "/macro_fabric.jpg"],
    createdAt: "2026-08-18T16:00:00.000Z",
    status: "PUBLISHED",
    isPinned: true,
    location: "Phố Cổ Hội An",
    category: "heritage",
    likesCount: 186,
    savesCount: 62,
    hasLiked: false,
    hasSaved: false,
    author: {
      id: "auth-3",
      name: "Hồng Hạnh (Heritage Silk)",
      avatar: "/avatar_3.jpg",
      isVip: true
    },
    product: {
      id: "prod-3",
      title: "Áo Dài Tơ Tằm Thêu Sen",
      original_price: 3800000,
      rentalPrice: 280000,
      image: "/anhbia.png"
    }
  },
  {
    id: "def-4",
    title: "Chiếc Blazer Dạ 1998 và câu chuyện 5 lần đổi chủ vẫn vẹn nguyên form dáng",
    content: "Được mua tại một tiệm archive tại Tokyo, chiếc blazer len cashmere này có form vai quyền lực đặc trưng thập niên 90. Qua 5 lượt thuê, vải vẫn mịn và đanh. Đúng là thời trang bền vững thực thụ!",
    coverImage: "/vintage_coat.jpg",
    allImages: ["/vintage_coat.jpg", "/1.3.jpeg"],
    createdAt: "2026-08-15T11:20:00.000Z",
    status: "PUBLISHED",
    location: "Quận 1, TP. Hồ Chí Minh",
    category: "vintage",
    likesCount: 76,
    savesCount: 29,
    hasLiked: false,
    hasSaved: false,
    author: {
      id: "auth-4",
      name: "Quốc Bảo (Archive Hunter)",
      avatar: "/avatar_1.jpg",
      isVip: false
    },
    product: {
      id: "prod-4",
      title: "Blazer Dạ 1998 Vintage",
      original_price: 3200000,
      rentalPrice: 190000,
      image: "/vintage_coat.jpg"
    }
  },
  {
    id: "def-5",
    title: "Set đồ Upcycled từ vải vụn Denim: Tuyên ngôn thời trang không rác thải",
    content: "Nhóm chúng mình đã ghép 12 mảnh vải denim từ quần jean cũ thành set trang phục biểu diễn cực kỳ cá tính. Vừa bảo vệ môi trường, vừa tạo nên dấu ấn độc nhất vô nhị không thể đụng hàng trên sân khấu!",
    coverImage: "/hero_group.jpg",
    allImages: ["/hero_group.jpg", "/macro_fabric.jpg"],
    createdAt: "2026-08-12T13:40:00.000Z",
    status: "PUBLISHED",
    location: "Đà Lạt, Lâm Đồng",
    category: "upcycle",
    likesCount: 115,
    savesCount: 51,
    hasLiked: false,
    hasSaved: false,
    author: {
      id: "auth-5",
      name: "Nhóm Sáng Tạo EcoClub",
      avatar: "/avatar_2.jpg",
      isVip: true
    },
    product: {
      id: "prod-5",
      title: "Set Đồ Upcycled Denim",
      original_price: 2200000,
      rentalPrice: 160000,
      image: "/hero_group.jpg"
    }
  },
  {
    id: "def-6",
    title: "Đầm dạ hội Sequin lấp lánh: Tỏa sáng rực rỡ tại Gala Trao Giải",
    content: "Hàng ngàn hạt cườm và sequin bắt sáng lộng lẫy dưới ánh đèn sân khấu. Thuê đầm trên CLOOP giúp mình tiết kiệm tới 90% chi phí so với mua mới mà vẫn có được diện mạo lộng lẫy nhất!",
    coverImage: "/evening_dress.jpg",
    allImages: ["/evening_dress.jpg", "/step3_party.jpg"],
    createdAt: "2026-08-10T19:00:00.000Z",
    status: "PUBLISHED",
    location: "GEM Center, TP. HCM",
    category: "gala",
    likesCount: 164,
    savesCount: 77,
    hasLiked: false,
    hasSaved: false,
    author: {
      id: "auth-6",
      name: "Thảo My (Fashionista)",
      avatar: "/avatar_3.jpg",
      isVip: true
    },
    product: {
      id: "prod-6",
      title: "Váy Lụa Sequin Dạ Tiệc",
      original_price: 5200000,
      rentalPrice: 380000,
      image: "/evening_dress.jpg"
    }
  }
];

export default function BlogJournalPage() {
  const [posts, setPosts] = useState<BlogWithData[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [spotlightPost, setSpotlightPost] = useState<BlogWithData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedStory, setSelectedStory] = useState<BlogWithData | null>(null); // Modal đọc chi tiết
  
  // Auth Session
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
      }
    };
    fetchSession();
  }, []);

  // Fetch thông tin profile
  useEffect(() => {
    if (!currentUserId) return;
    async function fetchMyProfile() {
      const { data } = await supabase.from("profiles").select("id, name, avatar, isVip").eq("id", currentUserId).maybeSingle();
      if (data) setMyProfile(data);
    }
    fetchMyProfile();
  }, [currentUserId]);

  // Fetch toàn bộ data bài viết (Supabase + LocalStorage fallback + Default Stories)
  useEffect(() => {
    async function fetchRealDataFeed() {
      try {
        const { data: blogData } = await supabase
          .from("blog_posts")
          .select("*")
          .order("isPinned", { ascending: false })
          .order("createdAt", { ascending: false });

        let loadedBlogs: any[] = blogData || [];
        
        // Lấy thêm bài viết từ Local Storage nếu có
        try {
          const localBlogs = JSON.parse(localStorage.getItem("cloop_custom_blogs") || "[]");
          loadedBlogs = [...localBlogs, ...loadedBlogs];
        } catch (e) {
          console.warn("Local storage parse error:", e);
        }

        // Nếu database chưa có bài nào, sử dụng danh sách bài mẫu phong phú
        if (loadedBlogs.length === 0) {
          setPosts(DEFAULT_FASHION_STORIES);
          setSpotlightPost(DEFAULT_FASHION_STORIES[0]);
          
          // Leaderboard mẫu
          setLeaderboard([
            { name: "Hồng Hạnh (Heritage Silk)", avatar: "/avatar_3.jpg", score: 186 },
            { name: "Thảo My (Fashionista)", avatar: "/avatar_3.jpg", score: 164 },
            { name: "Khánh Linh (Linh Couture)", avatar: "/avatar_1.jpg", score: 142 },
          ]);
          setIsLoading(false);
          return;
        }

        // Ghép thêm default stories để trang luôn đầy ắp
        const combined = [...loadedBlogs, ...DEFAULT_FASHION_STORIES];
        const uniqueBlogs = Array.from(new Map(combined.map(item => [item.id, item])).values());

        const formatted = uniqueBlogs.map((b: any) => ({
          ...b,
          allImages: b.allImages || [b.coverImage || "/1.1.jpg"],
          likesCount: b.likesCount || Math.floor(Math.random() * 50) + 20,
          savesCount: b.savesCount || Math.floor(Math.random() * 20) + 5,
          hasLiked: false,
          hasSaved: false,
          author: b.author || { name: "Thành viên CLOOP", avatar: "/logo2.png", isVip: false },
          location: b.location || "Việt Nam",
          category: b.category || "gala"
        }));

        setPosts(formatted);
        setSpotlightPost(formatted.find(p => p.isPinned) || formatted[0]);

        // Tính leaderboard
        const scores: Record<string, { name: string; avatar: string; score: number }> = {};
        formatted.forEach(p => {
          const name = p.author?.name || "Thành viên";
          if (!scores[name]) {
            scores[name] = { name, avatar: p.author?.avatar || "/logo2.png", score: 0 };
          }
          scores[name].score += p.likesCount;
        });

        const sorted = Object.values(scores).sort((a, b) => b.score - a.score).slice(0, 3);
        setLeaderboard(sorted);

      } catch (err) {
        console.error("Lỗi fetch blog:", err);
        setPosts(DEFAULT_FASHION_STORIES);
        setSpotlightPost(DEFAULT_FASHION_STORIES[0]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRealDataFeed();
  }, [currentUserId]);

  // Tương tác Thả Tim / Lưu Bài
  const handleInteraction = (blogId: string, type: 'LIKE' | 'SAVE') => {
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

    if (spotlightPost && spotlightPost.id === blogId) {
      setSpotlightPost(prev => {
        if (!prev) return null;
        const isLiking = type === 'LIKE';
        const currentValue = isLiking ? prev.hasLiked : prev.hasSaved;
        return {
          ...prev,
          hasLiked: isLiking ? !currentValue : prev.hasLiked,
          likesCount: isLiking ? prev.likesCount + (!currentValue ? 1 : -1) : prev.likesCount
        };
      });
    }
  };

  // Lọc bài viết
  const filteredPosts = posts.filter(post => {
    if (activeCategory === "all") return true;
    if (activeCategory === "loved") return true;
    return post.category === activeCategory;
  }).sort((a, b) => {
    if (activeCategory === "loved") return b.likesCount - a.likesCount;
    return 0;
  });

  const myPosts = posts.filter(p => p.userId === currentUserId);

  return (
    <main className="min-h-screen bg-[#FAF8F5] py-8 sm:py-12 px-4 sm:px-6 lg:px-10 font-sans text-stone-800 relative">
      
      {/* Background Subtle Linen Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[url('/giaynhau.png')] bg-cover bg-center opacity-30 mix-blend-multiply" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        
        {/* ================= HÀNG 1: HERO SCRAPBOOK & TỔNG QUAN TÀI KHOẢN ================= */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          
          {/* CỘT TRÁI (8/12): HERO BANNER LƯU BÚT THỜI TRANG */}
          <div className="xl:col-span-8 bg-white/95 backdrop-blur-md rounded-3xl border border-stone-200/90 p-6 sm:p-10 shadow-[0_16px_40px_rgba(24,58,45,0.06)] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
            
            {/* Vintage Stamps & Decorative Flowers */}
            <Image src="/hoagiay.png" alt="Flower" width={120} height={120} className="absolute -top-4 -left-4 opacity-70 pointer-events-none drop-shadow-xs" unoptimized />
            <Image src="/ghimvang.png" alt="Pin" width={28} height={28} className="absolute top-4 right-1/2 opacity-80 pointer-events-none" unoptimized />
            <Image src="/logo1.png" alt="Seal" width={100} height={100} className="absolute -bottom-6 -right-6 opacity-10 pointer-events-none -rotate-12" unoptimized />

            <div className="space-y-4 max-w-md relative z-10 text-left">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#E5EFE2] border border-[#C5DAC2] text-[#2A4B2E] text-[10.5px] font-bold uppercase tracking-widest font-ui shadow-2xs">
                <Sparkles size={11} className="text-[#37503F]" /> Bảo Tàng Ký Ức Tuần Hoàn 2026
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading text-[#0A2517] font-extrabold tracking-tight leading-tight">
                NHẬT KÝ <br />
                <span className="italic font-normal text-[#2A6E46] flex items-center gap-2">
                  Vòng Đời Phong Cách <Heart size={24} className="text-rose-500 fill-rose-100 inline" />
                </span>
              </h1>

              <p className="font-body text-xs sm:text-sm text-stone-600 leading-relaxed font-normal">
                Mỗi bộ trang phục đều chứa đựng một khoảnh khắc thanh xuân rực rỡ. Hãy cùng viết tiếp hành trình và chia sẻ câu chuyện để truyền cảm hứng cho người mặc kế tiếp!
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/blog/create"
                  className="px-6 py-3 rounded-full bg-[#0A2517] hover:bg-[#183A2D] text-white font-heading font-bold text-xs uppercase tracking-wider transition-all shadow-md hover:scale-105 active:scale-95 flex items-center gap-2 font-ui"
                >
                  <PenTool size={14} /> Viết Ký Ức Mới
                </Link>

                <Link
                  href={currentUserId ? `/closet/${currentUserId}` : "/auth"}
                  className="px-5 py-3 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-heading font-bold text-xs uppercase tracking-wider transition-all border border-stone-300 flex items-center gap-2 font-ui"
                >
                  <BookOpen size={14} /> Tủ Đồ Ký Ức
                </Link>
              </div>
            </div>

            {/* Polaroid Preview Stack */}
            <div className="relative shrink-0 hidden sm:flex flex-col items-center z-10">
              <div className="bg-white p-2.5 pb-6 rounded-xl shadow-[0_12px_28px_rgba(0,0,0,0.12)] border border-stone-200 rotate-[-4deg] w-48 relative hover:rotate-0 transition-transform duration-500">
                <Image src="/bangdanvang.png" alt="Tape" width={80} height={20} className="absolute -top-3 left-1/2 -translate-x-1/2 rotate-2 z-10 drop-shadow-xs" unoptimized />
                <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-stone-100">
                  <Image src={posts[0]?.coverImage || "/1.1.jpg"} alt="Hero Polar" fill className="object-cover" unoptimized />
                </div>
                <p className="text-center font-heading italic text-[10px] text-stone-500 mt-2 font-bold">
                  * Nơi lưu giữ những nụ cười ♡
                </p>
              </div>
            </div>

          </div>

          {/* CỘT PHẢI (4/12): HỒ SƠ TÁC GIẢ & CHỈ SỐ XANH */}
          <div className="xl:col-span-4 bg-white/95 backdrop-blur-md rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-[0_16px_40px_rgba(24,58,45,0.06)] flex flex-col justify-between items-center text-center relative overflow-hidden">
            
            <Image src="/vuongmien.png" alt="Crown" width={40} height={40} className="absolute top-4 right-4 opacity-80" unoptimized />

            {currentUserId ? (
              <div className="w-full flex flex-col items-center">
                <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-[#A3E39F] to-[#183A2D] shadow-md mb-3">
                  <div className="relative w-full h-full rounded-full overflow-hidden bg-white">
                    <Image src={myProfile?.avatar || "/avatar_1.jpg"} alt="Avatar" fill className="object-cover" unoptimized />
                  </div>
                </div>

                <h3 className="font-heading text-lg font-extrabold text-[#0A2517] flex items-center gap-1.5">
                  @{myProfile?.name || "Người Kể Chuyện"}
                  <Sparkles size={14} className="text-[#2A6E46]" />
                </h3>

                <span className="text-[10px] font-bold uppercase tracking-widest text-[#2A4B2E] bg-[#E5EFE2] border border-[#C5DAC2] px-3 py-0.5 rounded-full mt-1 font-ui">
                  {myProfile?.isVip ? "Thành viên Ruby 💎" : "Thành viên CLOOP 🌱"}
                </span>

                {/* Mini Stats Grid */}
                <div className="grid grid-cols-3 w-full gap-2 border-y border-stone-100 py-3.5 my-4">
                  <div>
                    <p className="font-heading font-extrabold text-base text-[#0A2517]">{myPosts.length}</p>
                    <p className="text-[9px] uppercase font-bold text-stone-400 font-ui">Câu chuyện</p>
                  </div>
                  <div>
                    <p className="font-heading font-extrabold text-base text-rose-600">
                      {myPosts.reduce((acc, p) => acc + p.likesCount, 0)}
                    </p>
                    <p className="text-[9px] uppercase font-bold text-stone-400 font-ui">Đồng cảm</p>
                  </div>
                  <div>
                    <p className="font-heading font-extrabold text-base text-[#2A6E46]">
                      {new Set(myPosts.map(p => p.productId).filter(Boolean)).size}
                    </p>
                    <p className="text-[9px] uppercase font-bold text-stone-400 font-ui">Trang phục</p>
                  </div>
                </div>

                <Link
                  href={`/closet/${currentUserId}`}
                  className="w-full py-2.5 rounded-full bg-[#183A2D] hover:bg-[#0A2517] text-white text-[11px] font-bold uppercase tracking-wider transition-all font-ui shadow-xs"
                >
                  Quản Lý Tủ Đồ & Ký Ức
                </Link>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-center my-auto py-4">
                <div className="w-16 h-16 rounded-full bg-[#F0F5EE] border border-[#C8DAC4] flex items-center justify-center text-[#183A2D] mb-3">
                  <User size={28} />
                </div>
                <h3 className="font-heading text-lg font-bold text-[#0A2517]">Chào Bạn Yêu Thời Trang! 👋</h3>
                <p className="text-xs text-stone-500 mt-2 max-w-xs leading-relaxed font-body">
                  Đăng nhập để đính câu chuyện trang phục của bạn lên bản đồ ký ức và tích lũy điểm xanh!
                </p>
                <Link
                  href="/auth"
                  className="mt-5 w-full py-3 rounded-full bg-[#0A2517] hover:bg-[#183A2D] text-white text-xs font-bold uppercase tracking-wider transition-all font-ui shadow-md"
                >
                  Đăng Nhập / Đăng Ký
                </Link>
              </div>
            )}

          </div>

        </div>

        {/* ================= HÀNG 2: BẢNG KÝ ỨC POLAROID & CỘT VINH DANH ================= */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* CỘT TRÁI (8/12): LƯỚI CARD KÝ ỨC POLAROID */}
          <div className="xl:col-span-8 space-y-6">
            
            {/* Category Filter Tabs */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-stone-200/90 p-3 shadow-sm flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-1.5 shrink-0">
                {[
                  { id: "all", label: "Tất Cả Ký Ức" },
                  { id: "gala", label: "Dạ Hội & Gala" },
                  { id: "daily", label: "Thanh Lịch Hằng Ngày" },
                  { id: "heritage", label: "Di Sản Áo Dài" },
                  { id: "upcycle", label: "Cải Tạo & Upcycling" },
                  { id: "loved", label: "Nhiều Tim Nhất ❤️" }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCategory(tab.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold font-ui uppercase tracking-wider transition-all ${
                      activeCategory === tab.id
                        ? "bg-[#0A2517] text-white shadow-xs"
                        : "text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* LƯỚI BÀI VIẾT POLAROID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post, idx) => {
                const tapeAsset = idx % 2 === 0 ? "/bangdanvang.png" : "/bangdanxanh.png";

                return (
                  <div
                    key={post.id}
                    className="group relative bg-white rounded-2xl border border-stone-200 shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 flex flex-col justify-between overflow-hidden"
                  >
                    {/* Washi Tape Header */}
                    <div className="p-3 pb-0 relative">
                      <Image
                        src={tapeAsset}
                        alt="Washi Tape"
                        width={75}
                        height={18}
                        className="absolute -top-2.5 left-1/2 -translate-x-1/2 rotate-1 z-20 drop-shadow-xs"
                        unoptimized
                      />

                      {/* Image Thumbnail Slider Container */}
                      <div 
                        onClick={() => setSelectedStory(post)}
                        className="relative aspect-[4/5] rounded-xl overflow-hidden bg-stone-100 cursor-pointer group/img"
                      >
                        <Image
                          src={post.coverImage || post.allImages[0]}
                          alt={post.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover/img:scale-108 brightness-100"
                          unoptimized
                        />

                        {/* Location Pill */}
                        <div className="absolute top-2 left-2 z-10">
                          <span className="text-[8px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-full flex items-center gap-1 font-ui">
                            <MapPin size={8} className="text-[#A3E39F]" /> {post.location}
                          </span>
                        </div>

                        {/* Multi-images indicator */}
                        {post.allImages.length > 1 && (
                          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[8px] font-bold px-2 py-0.5 rounded-full font-ui">
                            +{post.allImages.length} ảnh
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-4 pt-3 flex-1 flex flex-col justify-between space-y-3">
                      
                      {/* Author Info */}
                      <div className="flex items-center gap-2">
                        <div className="relative w-6 h-6 rounded-full overflow-hidden bg-stone-200 border border-stone-300 shrink-0">
                          <Image src={post.author?.avatar || "/avatar_1.jpg"} alt="Author" fill className="object-cover" unoptimized />
                        </div>
                        <p className="text-[11px] font-bold text-stone-700 truncate font-ui">
                          @{post.author?.name || "Người Kể Chuyện"}
                        </p>
                      </div>

                      {/* Title & Excerpt */}
                      <div onClick={() => setSelectedStory(post)} className="cursor-pointer">
                        <h3 className="font-heading text-sm font-extrabold text-[#0A2517] leading-snug line-clamp-2 group-hover:text-[#2A6E46] transition-colors mb-1.5">
                          {post.title}
                        </h3>
                        <p className="font-body text-xs text-stone-500 line-clamp-3 leading-relaxed">
                          {post.content}
                        </p>
                      </div>

                      {/* Linked Garment Card (If available) */}
                      {post.product && (
                        <Link
                          href={`/product/${post.product.id || '1'}`}
                          className="p-2 bg-[#F4F9F2] hover:bg-[#EAF3E7] rounded-xl border border-[#CDE1CA] flex items-center justify-between gap-2 transition-colors group/prod"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Shirt size={13} className="text-[#2A6E46] shrink-0" />
                            <span className="text-[10px] font-bold text-[#183A2D] truncate font-ui">
                              {post.product.title}
                            </span>
                          </div>
                          <span className="text-[9.5px] font-extrabold text-[#2A6E46] shrink-0 font-ui flex items-center">
                            Thuê Ngay <ChevronRight size={11} className="group-hover/prod:translate-x-0.5 transition-transform" />
                          </span>
                        </Link>
                      )}

                      {/* Card Footer Actions */}
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Like Button */}
                          <button
                            onClick={() => handleInteraction(post.id, 'LIKE')}
                            className={`flex items-center gap-1 text-xs font-bold transition-transform active:scale-125 ${
                              post.hasLiked ? "text-rose-500" : "text-stone-400 hover:text-rose-500"
                            }`}
                          >
                            <Heart size={14} className={post.hasLiked ? "fill-current" : ""} />
                            <span>{post.likesCount}</span>
                          </button>

                          {/* Save Button */}
                          <button
                            onClick={() => handleInteraction(post.id, 'SAVE')}
                            className={`flex items-center gap-1 text-xs font-bold transition-transform active:scale-125 ${
                              post.hasSaved ? "text-[#183A2D]" : "text-stone-400 hover:text-[#183A2D]"
                            }`}
                          >
                            <Bookmark size={14} className={post.hasSaved ? "fill-current" : ""} />
                            <span>{post.savesCount}</span>
                          </button>
                        </div>

                        {/* Read Details Link */}
                        <button
                          onClick={() => setSelectedStory(post)}
                          className="text-[10.5px] font-bold uppercase tracking-wider text-stone-500 hover:text-[#0A2517] font-ui transition-colors flex items-center gap-1"
                        >
                          Đọc tiếp <ArrowRight size={11} />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* CỘT PHẢI (4/12): GÓC VINH DANH & KÝ ỨC NỔI BẬT */}
          <div className="xl:col-span-4 space-y-6">
            
            {/* 1. GÓC VINH DANH NGƯỜI KỂ CHUYỆN (LEADERBOARD) */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-stone-200/90 p-6 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
                <h3 className="font-heading text-sm font-extrabold uppercase tracking-wider text-[#0A2517] flex items-center gap-2">
                  <Trophy size={16} className="text-amber-500" /> Bảng Vinh Danh Tác Giả
                </h3>
              </div>

              <div className="space-y-3">
                {leaderboard.map((user, idx) => {
                  const rank = idx + 1;
                  const rankBadge = rank === 1 ? "bg-amber-100 text-amber-800 border-amber-300" : rank === 2 ? "bg-stone-100 text-stone-700 border-stone-300" : "bg-orange-100 text-orange-800 border-orange-300";

                  return (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-stone-50/80 hover:bg-[#F4F9F2] rounded-2xl border border-stone-200/80 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-6 h-6 rounded-full border flex items-center justify-center font-heading font-extrabold text-xs ${rankBadge}`}>
                          {rank === 1 ? "👑" : rank}
                        </span>
                        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-stone-200">
                          <Image src={user.avatar} alt={user.name} fill className="object-cover" unoptimized />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-800 font-ui">{user.name}</p>
                          <p className="text-[10px] text-stone-400 font-medium">{rank === 1 ? "Top 1 Kể Chuyện" : "Thành viên tích cực"}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-extrabold text-rose-500 font-ui flex items-center gap-1">
                          <Heart size={11} className="fill-current" /> {user.score}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 text-center">
                <p className="text-[10.5px] font-medium text-stone-500 font-body">
                  Mỗi lượt đồng cảm từ cộng đồng giúp bạn thăng hạng danh hiệu Thời Trang Xanh!
                </p>
              </div>
            </div>

            {/* 2. KÝ ỨC TIÊU BIỂU SPOTLIGHT */}
            {spotlightPost && (
              <div className="bg-gradient-to-br from-[#183A2D] to-[#0A2517] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <Image src="/vuongmien.png" alt="Crown" width={45} height={45} className="absolute -top-2 -right-2 opacity-30" unoptimized />
                
                <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[#A3E39F] text-[9.5px] font-bold uppercase tracking-widest font-ui mb-3">
                  <Sparkles size={10} /> Câu Chuyện Tiêu Biểu Tuần
                </div>

                <div 
                  onClick={() => setSelectedStory(spotlightPost)}
                  className="relative aspect-[16/10] rounded-2xl overflow-hidden mb-4 border border-white/20 cursor-pointer group"
                >
                  <Image
                    src={spotlightPost.coverImage}
                    alt={spotlightPost.title}
                    fill
                    className="object-cover group-hover:scale-108 transition-transform duration-700 brightness-105"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <span className="absolute bottom-2 left-2 text-[9px] font-bold bg-white/90 text-[#0A2517] px-2.5 py-0.5 rounded-full font-ui">
                    📍 {spotlightPost.location}
                  </span>
                </div>

                <h4 
                  onClick={() => setSelectedStory(spotlightPost)}
                  className="font-heading text-base font-extrabold leading-snug line-clamp-2 cursor-pointer hover:text-[#A3E39F] transition-colors mb-2"
                >
                  {spotlightPost.title}
                </h4>

                <p className="text-xs text-stone-200 line-clamp-3 leading-relaxed font-body mb-4">
                  "{spotlightPost.content}"
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-white/15 text-xs font-bold font-ui">
                  <span className="text-[#A3E39F] flex items-center gap-1">
                    <Heart size={13} className="fill-current text-rose-400" /> {spotlightPost.likesCount} Lượt Đồng Cảm
                  </span>

                  <button
                    onClick={() => setSelectedStory(spotlightPost)}
                    className="text-white hover:text-[#A3E39F] uppercase tracking-wider text-[10px] flex items-center gap-1"
                  >
                    Đọc toàn bộ <ChevronRight size={12} />
                  </button>
                </div>

              </div>
            )}

            {/* 3. TÁC ĐỘNG XANH CỘNG ĐỒNG */}
            <div className="bg-[#FAF4EB] rounded-3xl border border-[#E8DCBF] p-5 space-y-3">
              <h4 className="font-heading text-xs font-extrabold uppercase tracking-wider text-[#4A3C20] flex items-center gap-1.5">
                <Leaf size={14} className="text-emerald-700" /> Tác Động Môi Trường Của Blog
              </h4>
              <p className="text-[11px] text-stone-600 leading-relaxed font-body">
                Nhờ mỗi câu chuyện được sẻ chia, đã có hơn <strong className="text-[#0A2517]">450 lượt trang phục được tái sử dụng</strong>, tiết kiệm ước tính <strong className="text-[#2A6E46]">1.800 kg CO₂</strong> và <strong className="text-[#2A6E46]">350.000 lít nước sạch</strong>.
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* ================= MODAL ĐỌC KÝ ỨC CHI TIẾT (FULL STORY READER) ================= */}
      {selectedStory && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative border border-stone-200 space-y-6">
            
            {/* Close Button */}
            <button
              onClick={() => setSelectedStory(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors z-20 shadow-xs"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="space-y-2 pr-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5EFE2] text-[#2A4B2E] text-[10px] font-bold uppercase tracking-widest font-ui">
                <Sparkles size={11} /> Ký Ức Tuần Hoàn • {selectedStory.location}
              </div>
              <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-[#0A2517] leading-snug">
                {selectedStory.title}
              </h2>
              <div className="flex items-center gap-2 pt-1">
                <div className="relative w-7 h-7 rounded-full overflow-hidden bg-stone-200">
                  <Image src={selectedStory.author?.avatar || "/avatar_1.jpg"} alt="Author" fill className="object-cover" unoptimized />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-800 font-ui">@{selectedStory.author?.name}</p>
                  <p className="text-[10px] text-stone-400">Đăng ngày {new Date(selectedStory.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
            </div>

            {/* Image Gallery */}
            <div className="space-y-2">
              <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-stone-100 shadow-sm border border-stone-200">
                <Image src={selectedStory.coverImage || selectedStory.allImages[0]} alt="Story main" fill className="object-cover" unoptimized />
              </div>
              {selectedStory.allImages.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {selectedStory.allImages.map((img, i) => (
                    <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                      <Image src={img} alt={`Gallery ${i}`} fill className="object-cover" unoptimized />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Story Content */}
            <div className="p-4 sm:p-5 bg-stone-50 rounded-2xl border border-stone-200/80">
              <p className="font-body text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                {selectedStory.content}
              </p>
            </div>

            {/* Linked Garment in Modal */}
            {selectedStory.product && (
              <div className="p-4 bg-[#F0F7EE] rounded-2xl border border-[#C5DAC2] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-stone-200 shrink-0 border border-stone-300">
                    <Image src={selectedStory.product.image || selectedStory.coverImage} alt="Garment" fill className="object-cover" unoptimized />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#2A4B2E] font-ui">Trang Phục Trong Câu Chuyện</span>
                    <h4 className="font-heading text-xs sm:text-sm font-bold text-[#0A2517]">{selectedStory.product.title}</h4>
                    <p className="text-[11px] font-extrabold text-[#2A6E46] font-mono">{selectedStory.product.rentalPrice?.toLocaleString('vi-VN')}đ / ngày</p>
                  </div>
                </div>

                <Link
                  href={`/product/${selectedStory.product.id || '1'}`}
                  className="px-4 py-2.5 rounded-full bg-[#0A2517] hover:bg-[#183A2D] text-white text-[11px] font-bold uppercase tracking-wider font-ui shrink-0 shadow-xs"
                >
                  Thuê Món Này
                </Link>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-stone-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleInteraction(selectedStory.id, 'LIKE')}
                  className={`px-4 py-2 rounded-full border text-xs font-bold font-ui flex items-center gap-1.5 transition-colors ${
                    selectedStory.hasLiked ? "bg-rose-50 border-rose-200 text-rose-600" : "border-stone-300 text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  <Heart size={14} className={selectedStory.hasLiked ? "fill-current" : ""} />
                  <span>{selectedStory.likesCount} Đồng Cảm</span>
                </button>

                <button
                  onClick={() => handleInteraction(selectedStory.id, 'SAVE')}
                  className={`px-4 py-2 rounded-full border text-xs font-bold font-ui flex items-center gap-1.5 transition-colors ${
                    selectedStory.hasSaved ? "bg-[#E5EFE2] border-[#C5DAC2] text-[#183A2D]" : "border-stone-300 text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  <Bookmark size={14} className={selectedStory.hasSaved ? "fill-current" : ""} />
                  <span>{selectedStory.hasSaved ? "Đã Lưu" : "Lưu Ký Ức"}</span>
                </button>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Đã sao chép liên kết câu chuyện!");
                }}
                className="p-2.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                title="Chia sẻ"
              >
                <Share2 size={16} />
              </button>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}
