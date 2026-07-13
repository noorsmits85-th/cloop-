"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowUpRight, Sparkles } from "lucide-react";

// Khởi tạo Supabase đồng bộ chuẩn với dự án
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface BlogWithProduct {
  id: string;
  title: string;
  content: string;
  coverImage: string;
  productId: string;
  createdAt: string;
  status: string;
  products: Array<{
    title: string;
    original_price: number;
    Listing: Array<{
      basePrice: number;
      listingType: string;
    }>;
  }> | any;
}

export default function BlogJournalPage() {
  const [posts, setPosts] = useState<BlogWithProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchJournalFeed() {
      try {
        const { data, error } = await supabase
          .from("BlogPost")
          .select(`
            id, title, content, coverImage, productId, createdAt, status,
            products (
              title, original_price,
              Listing (basePrice, listingType)
            )
          `)
          .eq("status", "PUBLIC") // 🔐 Chỉ lấy những bài viết mang trạng thái công khai
          .order("createdAt", { ascending: false })
          .limit(20);

        if (error) throw error;
        setPosts(data || []);
      } catch (err) {
        console.error("Lỗi kéo dữ liệu dòng chảy Blog:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchJournalFeed();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center font-serif text-[#1C3F30]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-[#1C3F30] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs tracking-widest uppercase mt-4">Đang tải lookbook tuần hoàn...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-16 px-4 sm:px-6 lg:px-8 font-serif text-stone-800 tracking-tight">
      
      {/* 🏛️ HEADER TẠP CHÍ ĐẬM CHẤT CHÂU ÂU */}
      <div className="max-w-md mx-auto text-center mb-16 space-y-3">
        <div className="flex items-center justify-center gap-1.5 text-[9px] font-sans tracking-[0.3em] text-[#1C3F30] uppercase font-bold">
          <Sparkles size={10} className="text-emerald-600" />
          <span>The Sustainable Voice</span>
        </div>
        <h1 className="text-4xl font-bold tracking-[0.18em] text-[#1C3F30] uppercase font-logo">CLOOP JOURNAL</h1>
        <div className="h-[1px] w-12 bg-[#1C3F30]/25 mx-auto"></div>
        <p className="text-[10px] font-sans tracking-widest text-stone-400 uppercase leading-relaxed max-w-[280px] mx-auto">
          Thổi hồn câu chuyện di sản vào từng mảnh mảnh trang phục tuần hoàn
        </p>
      </div>

      {/* 🕊️ DÒNG CHẢY FEED BÀI VIẾT BIẾN HÓA NGHỆ THUẬT */}
      <div className="max-w-md mx-auto space-y-14">
        {posts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-[2rem] border border-stone-200/40 p-8 shadow-[0_10px_30px_rgba(0,0,0,0.01)]">
            <p className="text-sm font-sans text-stone-400">Hiện chưa có câu chuyện outfit nào được chia sẻ.</p>
            {/* 🎯 ĐÃ ĐỔI: Sử dụng "nhé" chuẩn phom ngôn ngữ */}
            <p className="text-xs font-sans text-[#1C3F30] font-semibold mt-2">
              Hãy là người đầu tiên thổi hồn vào trang phục tại mục Đăng đồ nhé! ✨
            </p>
          </div>
        ) : (
          posts.map((post, index) => {
            const productInfo = Array.isArray(post.products) ? post.products[0] : post.products;
            const rentalListing = productInfo?.Listing?.find((l: any) => l.listingType === "RENT");
            const rentalPrice = rentalListing ? rentalListing.basePrice : null;

            // 👑 THIẾT KẾ KHUNG ẢNH NGHỆ THUẬT BIẾN HÓA (ASÝMMETRIC LUXURY FRAMING)
            // Cứ mỗi bài đăng, cấu trúc khung ảnh sẽ tự động thay đổi đan xen để tạo nhịp điệu Lookbook tạp chí cá tính:
            const frameStyles = [
              "rounded-t-[140px] rounded-b-2xl", // Phom vòm cổng cung điện thanh lịch (Arched Gate)
              "rounded-[4rem_12px_4rem_12px]",    // Phom chiếc lá organic cắt xéo tinh tế (Editorial Leaf)
              "rounded-[12px_12px_140px_140px]"  // Phom giọt nước ngược cá tính đương đại (Modern Drop)
            ];
            const currentFrameStyle = frameStyles[index % frameStyles.length];

            return (
              <div 
                key={post.id} 
                className="bg-white p-6 rounded-[2.5rem] border border-stone-200/30 shadow-[0_12px_40px_-12px_rgba(28,63,48,0.04)] space-y-6 group transition-all duration-500 hover:shadow-[0_20px_50px_-8px_rgba(28,63,48,0.07)]"
              >
                {/* 📸 NÂNG CẤP: KHUNG ẢNH BIẾN HÓA CAO CẤP */}
                <div className="w-full flex justify-center overflow-hidden">
                  <div className="w-full p-2 bg-[#FAF9F5]/80 rounded-[inherit] border border-stone-100 shadow-inner">
                    <div className={`relative w-full aspect-[3/4] overflow-hidden transition-all duration-700 ease-out bg-stone-50 ${currentFrameStyle}`}>
                      <img 
                        src={post.coverImage || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f"} 
                        alt={post.title}
                        className="w-full h-full object-cover grayscale-[15%] group-hover:grayscale-0 scale-[1.01] group-hover:scale-105 transition-transform duration-[1000ms] ease-out"
                      />
                      {/* Lớp filter mờ mịn phủ mờ nhẹ rìa ảnh tạo chiều sâu tạp chí */}
                      <div className="absolute inset-0 ring-1 ring-black/5 ring-inset rounded-[inherit]" />
                    </div>
                  </div>
                </div>

                {/* 📝 KHỐI NỘI DUNG CHỮ CĂN CHỈNH TỶ LỆ VÀNG */}
                <div className="space-y-3 px-1">
                  <div className="flex items-center justify-between text-[9px] font-sans tracking-[0.18em] text-stone-400 uppercase">
                    <span className="font-medium">{new Date(post.createdAt).toLocaleDateString("vi-VN")}</span>
                    <span className="text-[#1C3F30] font-bold tracking-widest bg-stone-100 px-2 py-0.5 rounded">CLOOP MUSE</span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-[#1C3F30] leading-snug tracking-tight group-hover:text-emerald-900 transition-colors">
                    {post.title}
                  </h3>
                  
                  <div className="relative">
                    <p className="text-[12px] text-stone-600 font-sans leading-relaxed text-justify italic bg-[#FAF9F5]/70 p-4 rounded-2xl border border-stone-100/60 font-light">
                      "{post.content}"
                    </p>
                  </div>
                </div>

                {/* 🎯 NÚT QUAN HỆ KHẾP KÍN SANG TRỌNG */}
                {productInfo && (
                  <div className="mx-1 pt-4 border-t border-dashed border-stone-200/80 flex items-center justify-between gap-4">
                    <div className="font-sans max-w-[55%] space-y-0.5">
                      <span className="text-[8px] text-stone-400 uppercase tracking-[0.2em] font-semibold block">Trang phục Giám tuyển</span>
                      <p className="text-xs font-bold text-stone-800 truncate tracking-tight">{productInfo.title}</p>
                    </div>
                    
                    <Link href={`/shop/${post.productId}`} className="shrink-0">
                      <button className="bg-[#1C3F30] hover:bg-[#0F261D] text-[#FAF8F3] px-4 py-2.5 rounded-full font-sans text-[11px] font-bold tracking-wider transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.97] flex items-center gap-1.5 group/btn">
                        <span>Thuê ngay</span>
                        {rentalPrice !== null && (
                          <span className="opacity-80 font-normal">| {rentalPrice.toLocaleString("vi-VN")}đ</span>
                        )}
                        <ArrowUpRight size={12} className="text-emerald-400 transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}