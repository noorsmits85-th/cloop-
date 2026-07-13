"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

// Khởi tạo Supabase đồng bộ chuẩn với dự án của cậu
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
  products: Array<{
    title: string;
    original_price: number;
    Listing: Array<{
      basePrice: number;
      listingType: string;
    }>;
  }> | any; // Chấp nhận kiểu mảng trả về từ Supabase để xóa hoàn toàn lỗi đỏ
}

export default function BlogJournalPage() {
  const [posts, setPosts] = useState<BlogWithProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchJournalFeed() {
      try {
        // Cú pháp gọi Query bốc toàn bộ bài Blog kèm thông tin Product và luồng giá tương ứng[cite: 1]
        const { data, error } = await supabase
          .from("BlogPost")
          .select(`
            id, title, content, coverImage, productId, createdAt,
            products (
              title, original_price,
              Listing (basePrice, listingType)
            )
          `)
          .order("createdAt", { ascending: false }); // Bài mới nhất phóng lên đầu[cite: 1]

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
    <div className="min-h-screen bg-[#FAF9F5] py-12 px-4 sm:px-6 lg:px-8 font-serif text-stone-800 tracking-tight">
      {/* HEADER TẠP CHÍ CHUẨN BY ROTATION */}
      <div className="max-w-md mx-auto text-center mb-12 space-y-2">
        <h1 className="text-3xl font-bold tracking-[0.2em] text-[#1C3F30] uppercase">CLOOP JOURNAL</h1>
        <div className="h-[1px] w-16 bg-[#1C3F30]/30 mx-auto"></div>
        <p className="text-[10px] font-sans tracking-widest text-stone-400 uppercase">
          Câu chuyện truyền cảm hứng từ những tủ đồ di động
        </p>
      </div>

      {/* DÒNG CHẢY FEED BÀI VIẾT ĐỘNG */}
      <div className="max-w-md mx-auto space-y-10">
        {posts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-stone-100 p-6">
            <p className="text-sm font-sans text-stone-400">Hiện chưa có câu chuyện outfit nào được chia sẻ.</p>
            <p className="text-xs font-sans text-stone-400 mt-1">Hãy là người đầu tiên thổi hồn vào trang phục tại mục Đăng đồ nhen! ✨</p>
          </div>
        ) : (
          posts.map((post, index) => {
            // Mẹo: Cứ bài chỉ số chẵn làm khung OVAL nghệ thuật, bài lẻ làm khung CHỮ NHẬT bo góc[cite: 2]
            const isOvalLayout = index % 2 === 0;

            // XỬ LÝ AN TOÀN: Vì Supabase trả về products dạng mảng, ta chủ động lấy phần tử đầu tiên [0]
            const productInfo = Array.isArray(post.products) ? post.products[0] : post.products;
            
            // Tìm mức giá thuê trong mảng Listing của sản phẩm[cite: 1]
            const rentalListing = productInfo?.Listing?.find((l: any) => l.listingType === "RENT");
            const rentalPrice = rentalListing ? rentalListing.basePrice : null;

            return (
              <div 
                key={post.id} 
                className="bg-white p-6 rounded-[2rem] border border-emerald-800/5 shadow-[0_4px_20px_-4px_rgba(28,63,48,0.03)] space-y-5 animate-fadeIn"
              >
                {/* 📸 KHUNG ẢNH ĐA HÌNH KHỐI NGHỆ THUẬT[cite: 2] */}
                <div className="w-full flex justify-center overflow-hidden">
                  <div 
                    className={`relative w-full aspect-[3/4] overflow-hidden transition-all duration-500 border border-stone-100
                      ${isOvalLayout ? "rounded-[140px_140px_140px_140px]" : "rounded-2xl"}`}
                  >
                    <img 
                      src={post.coverImage || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f"} 
                      alt={post.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                </div>

                {/* 📝 NỘI DUNG TRUYỀN CẢM HƯỚNG CỦA CHỦ ĐỒ */}
                <div className="space-y-2.5 text-justify">
                  <div className="flex items-center space-x-2 text-[9px] font-sans tracking-wider text-stone-400 uppercase">
                    <span>{new Date(post.createdAt).toLocaleDateString("vi-VN")}</span>
                    <span>•</span>
                    <span className="text-[#1C3F30] font-semibold">COMMUNITY IDENTITY</span>
                  </div>
                  <h3 className="text-base font-bold text-[#1C3F30] leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-xs text-stone-600 font-sans leading-relaxed italic bg-[#FAF9F5]/60 p-3 rounded-xl border border-stone-100/40">
                    "{post.content}"
                  </p>
                </div>

                {/* 🎯 NÚT THUÊ ĐỒ KHÉP KÍN KHÔNG ĐỂ LỘ TRAFFIC RA NGOÀI[cite: 1] */}
                {productInfo && (
                  <div className="pt-3.5 border-t border-dashed border-stone-100 flex items-center justify-between">
                    <div className="font-sans max-w-[60%]">
                      <p className="text-[9px] text-stone-400 uppercase tracking-widest font-medium">Trang phục trong ảnh</p>
                      <p className="text-xs font-bold text-stone-700 truncate">{productInfo.title}</p>
                    </div>
                    
                    <Link href={`/shop/${post.productId}`}>
                      <button className="bg-[#1C3F30] hover:bg-[#11271E] text-white px-4 py-2 rounded-full font-sans text-[11px] font-semibold tracking-wider hover:shadow-sm transition-all active:scale-95 flex items-center space-x-1">
                        <span>Thuê ngay</span>
                        {rentalPrice !== null && (
                          <span>• {rentalPrice.toLocaleString("vi-VN")}đ</span>
                        )}
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