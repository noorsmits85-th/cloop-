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
  products: {
    title: string;
    original_price: number;
    Listing: Array<{
      basePrice: number;
      listingType: string;
    }>;
    ProductImage: Array<{
      url: string;
    }>;
  } | any;
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
              Listing (basePrice, listingType),
              ProductImage (url)
            )
          `)
          .not("status", "eq", "HIDDEN")
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
      
      {/* 🏛️ HEADER TẠP CHÍ EDITORIAL LUXURY */}
      <div className="max-w-md mx-auto text-center mb-16 space-y-3">
        <div className="flex items-center justify-center gap-1.5 text-[9px] font-sans tracking-[0.3em] text-[#1C3F30] uppercase font-bold">
          <Sparkles size={10} className="text-emerald-600" />
          <span>The Sustainable Voice</span>
        </div>
        <h1 className="text-4xl font-bold tracking-[0.18em] text-[#1C3F30] uppercase font-logo">CLOOP JOURNAL</h1>
        <div className="h-[1px] w-12 bg-[#1C3F30]/25 mx-auto"></div>
        <p className="text-[10px] font-sans tracking-widest text-stone-400 uppercase leading-relaxed max-w-[280px] mx-auto">
          Thổi hồn câu chuyện di sản vào từng mảnh trang phục tuần hoàn
        </p>
      </div>

      {/* 🕊️ DÒNG CHẢY FEED BÀI VIẾT BIẾN HÓA NGHỆ THUẬT */}
      <div className="max-w-md mx-auto space-y-14">
        {posts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-[2rem] border border-stone-200/40 p-8 shadow-[0_10px_30px_rgba(0,0,0,0.01)]">
            <p className="text-sm font-sans text-stone-400">Hiện chưa có câu chuyện outfit nào được chia sẻ.</p>
            <p className="text-xs font-sans text-[#1C3F30] font-semibold mt-2">
              Hãy là người đầu tiên thổi hồn vào trang phục tại mục Đăng đồ nhé! ✨
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const productInfo = Array.isArray(post.products) ? post.products[0] : post.products;
            const rentalListing = productInfo?.Listing?.find((l: any) => l.listingType === "RENT");
            const rentalPrice = rentalListing ? rentalListing.basePrice : null;

            const productImages = productInfo?.ProductImage || [];
            const allImages = productImages.length > 0 
              ? productImages.map((img: any) => img.url) 
              : [post.coverImage || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f"];

            return (
              <div 
                key={post.id} 
                className="bg-white p-5 rounded-[2rem] border border-stone-200/40 shadow-[0_12px_40px_-12px_rgba(28,63,48,0.03)] space-y-5 group transition-all duration-500 hover:shadow-[0_20px_50px_-8px_rgba(28,63,48,0.06)]"
              >
                {/* 📸 KHUNG NHẬT KÝ MULTI-IMAGE SLIDER CAO CẤP */}
                <div className="w-full flex justify-center overflow-hidden">
                  <div className="w-full p-1.5 bg-[#FAF9F5]/90 rounded-[1.8rem] border border-stone-100 shadow-inner">
                    <div className="relative w-full aspect-[3/4] overflow-hidden rounded-[1.4rem] bg-stone-50">
                      
                      <div className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar">
                        {allImages.map((imgUrl: string, imgIdx: number) => (
                          <div key={imgIdx} className="w-full h-full shrink-0 snap-start relative">
                            <img 
                              src={imgUrl} 
                              alt={`${post.title} - Góc chụp ${imgIdx + 1}`}
                              className="w-full h-full object-cover transition-all duration-700 ease-out"
                            />
                          </div>
                        ))}
                      </div>

                      {/* ✨ ĐÃ SỬA DÒNG 142: Định nghĩa rõ ràng kiểu dữ liệu để triệt hạ lỗi đỏ au */}
                      {allImages.length > 1 && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 bg-black/15 backdrop-blur-md px-2.5 py-1 rounded-full pointer-events-none">
                          {allImages.map((_: string, dotIdx: number) => (
                            <div key={dotIdx} className="w-1 h-1 rounded-full bg-white/70" />
                          ))}
                        </div>
                      )}
                      
                    </div>
                  </div>
                </div>

                {/* 📝 KHỐI NỘI DUNG CHỮ */}
                <div className="space-y-2.5 px-1">
                  <div className="flex items-center justify-between text-[8px] font-sans tracking-[0.18em] text-stone-400 uppercase">
                    <span className="font-medium">{new Date(post.createdAt).toLocaleDateString("vi-VN")}</span>
                    <span className="text-[#1C3F30] font-bold tracking-widest bg-stone-100 px-2 py-0.5 rounded">CLOOP MUSE</span>
                  </div>
                  
                  <h3 className="text-base font-bold text-[#1C3F30] leading-snug tracking-tight">
                    {post.title}
                  </h3>
                  
                  <p className="text-[12px] text-stone-600 font-sans leading-relaxed text-justify italic bg-[#FAF9F5]/70 p-4 rounded-xl border border-stone-100/60 font-light">
                    "{post.content}"
                  </p>
                </div>

                {/* 🎯 NÚT MUA SẮM KHẾP KÍN */}
                {productInfo && (
                  <div className="mx-1 pt-3.5 border-t border-dashed border-stone-200/80 flex items-center justify-between gap-4">
                    <div className="font-sans max-w-[55%] space-y-0.5">
                      <span className="text-[8px] text-stone-400 uppercase tracking-[0.2em] font-semibold block">Trang phục Giám tuyển</span>
                      <p className="text-xs font-bold text-stone-800 truncate tracking-tight">{productInfo.title}</p>
                    </div>
                    
                    <Link href={`/shop/${post.productId}`} className="shrink-0">
                      <button className="bg-[#1C3F30] hover:bg-[#0F261D] text-[#FAF8F3] px-3.5 py-2 rounded-full font-sans text-[11px] font-bold tracking-wider transition-all duration-300 shadow-sm active:scale-[0.97] flex items-center gap-1">
                        <span>Thuê ngay</span>
                        {rentalPrice !== null && (
                          <span className="opacity-80 font-normal">| {rentalPrice.toLocaleString("vi-VN")}đ</span>
                        )}
                        <ArrowUpRight size={11} className="text-emerald-400" />
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