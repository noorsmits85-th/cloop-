"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowUpRight, Sparkles, Star, Heart, Activity, Pin } from "lucide-react";

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
  isPinned?: boolean; // 📌 ĐÃ ĐỒNG BỘ: Nhận diện biến ghim từ phân hệ quản trị Admin
  products: {
    title: string;
    original_price: number;
    Listing: Array<{
      basePrice: number;
      listingType: string;
    }>;
    images: string[];
  } | null;
}

// 📸 COMPONENT CON: GHÉP ẢNH BẤT ĐỐI XỨNG CẮT DÁN THỦ CÔNG (KHÔNG TUA ẢNH)
function ScrapbookCollage({ images, title }: { images: string[]; title: string }) {
  if (images.length === 1) {
    return (
      <div className="relative p-2 bg-white border border-stone-200 shadow-md rotate-[-2deg] max-w-[200px] mx-auto group">
        <div className="absolute -top-3 left-1/4 w-12 h-3.5 bg-pink-200/60 rotate-[-8deg] border border-dashed border-pink-300/30 select-none pointer-events-none" />
        <img src={images[0]} alt={title} className="w-full aspect-[3/4] object-cover rounded-xs" />
      </div>
    );
  }

  if (images.length === 2) {
    return (
      <div className="relative h-[240px] w-full max-w-[280px] mx-auto select-none">
        <div className="absolute left-1 top-2 w-[58%] p-1.5 bg-white border border-stone-200 shadow-sm rotate-[-4deg] z-10 hover:z-30 transition-all">
          <div className="absolute -top-2.5 left-2 w-10 h-3.5 bg-cyan-200/50 rotate-12 border border-dashed border-cyan-300/30" />
          <img src={images[0]} alt={title} className="w-full aspect-[3/4] object-cover rounded-xs" />
        </div>
        <div className="absolute right-1 bottom-2 w-[55%] p-1.5 bg-white border border-stone-200 shadow-md rotate-[3deg] z-20 hover:z-30 transition-all">
          <div className="absolute -top-2 right-2 w-10 h-3.5 bg-pink-200/60 rotate-[-15deg] border border-dashed border-pink-300/30" />
          <img src={images[1]} alt={title} className="w-full aspect-[3/4] object-cover rounded-xs" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[260px] w-full max-w-[300px] mx-auto select-none">
      <Star size={14} className="absolute -top-2 right-6 text-purple-400 fill-purple-200 animate-bounce" />
      <Heart size={12} className="absolute bottom-6 -left-2 text-pink-400 fill-pink-200 rotate-12" />
      
      {/* Ảnh 1 - Khung chính bên trái */}
      <div className="absolute left-0 top-2 w-[55%] p-1.5 bg-white border border-stone-200 shadow-md rotate-[-3deg] z-10 hover:z-40 transition-all">
        <div className="absolute -top-2.5 left-2 w-12 h-3.5 bg-purple-200/50 rotate-6 border border-dashed border-purple-300/30" />
        <img src={images[0]} alt={title} className="w-full aspect-[3/4] object-cover rounded-xs" />
      </div>
      
      {/* Ảnh 2 - Khung phụ vuông góc trên bên phải */}
      <div className="absolute right-0 top-4 w-[46%] p-1.5 bg-white border border-stone-200 shadow-sm rotate-[5deg] z-25 hover:z-40 transition-all">
        <div className="absolute -top-2 right-3 w-10 h-3 bg-yellow-100/70 rotate-[-8deg] border border-dashed border-yellow-200/40" />
        <img src={images[1]} alt={title} className="w-full aspect-square object-cover rounded-xs" />
      </div>
      
      {/* Ảnh 3 - Khung phụ đè chéo góc dưới bên phải */}
      <div className="absolute right-2 bottom-1 w-[48%] p-1.5 bg-white border border-stone-200 shadow-md rotate-[-2deg] z-30 hover:z-40 transition-all">
        <div className="absolute -bottom-2 left-4 w-10 h-3.5 bg-cyan-200/60 rotate-12 border border-dashed border-cyan-300/30" />
        <img src={images[2]} alt={title} className="w-full aspect-[3/4] object-cover rounded-xs" />
      </div>
    </div>
  );
}

export default function BlogJournalPage() {
  const [posts, setPosts] = useState<BlogWithProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchJournalFeed() {
      try {
        const { data: blogData, error: blogError } = await supabase
          .from("BlogPost")
          .select("*")
          // 📌 ĐÃ ĐỒNG BỘ LỆNH ĐIỀU PHỐI KÉP: Đẩy bài được ghim lên đầu, rồi mới xếp theo ngày mới nhất
          .order("isPinned", { ascending: false })
          .order("createdAt", { ascending: false });

        if (blogError) throw blogError;

        const publicBlogs = (blogData || []).filter((b: any) => b.status !== "HIDDEN");

        if (publicBlogs.length === 0) {
          setPosts([]);
          return;
        }

        const productIds = publicBlogs.map((b: any) => b.productId).filter(Boolean);

        const { data: productsData } = await supabase.from("products").select("*").in("id", productIds);
        const { data: listingsData } = await supabase.from("Listing").select("*").in("productId", productIds);
        const { data: imagesData } = await supabase.from("ProductImage").select("*").in("productId", productIds);

        const formattedBlogs = publicBlogs.map((blog: any) => {
          const targetProductId = blog.productId;
          const matchedProduct = (productsData || []).find((p: any) => String(p.id) === String(targetProductId));
          
          let productInfo = null;
          if (matchedProduct) {
            const matchedListings = (listingsData || []).filter((l: any) => String(l.productId) === String(matchedProduct.id));
            const matchedImages = (imagesData || []).filter((img: any) => String(img.productId) === String(matchedProduct.id));

            let allUrls = matchedImages.map((img: any) => img.url);
            if (allUrls.length === 0 && blog.coverImage) {
              allUrls = [blog.coverImage];
            }
            if (allUrls.length === 0) {
              allUrls = ["https://images.unsplash.com/photo-1515886657613-9f3515b0c78f"];
            }

            productInfo = {
              title: matchedProduct.title,
              original_price: matchedProduct.original_price,
              Listing: matchedListings,
              images: allUrls
            };
          }

          return {
            ...blog,
            products: productInfo
          };
        });

        setPosts(formattedBlogs);
      } catch (err) {
        console.error("Lỗi vận hành dòng chảy Lookbook:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchJournalFeed();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center font-serif text-stone-700">
        <div className="text-center space-y-2">
          <div className="w-5 h-5 border-2 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] tracking-widest uppercase mt-4 font-sans text-purple-400 font-bold">Đang dàn trận bảng ghim lưu niệm...</p>
        </div>
      </div>
    );
  }

  return (
    // 📖 GIAO DIỆN CARO TẬP HỌC SINH TOÀN MÀN HÌNH KHÔNG CÒN GÓC TRỐNG RỖNG
    <div className="min-h-screen bg-[#FFFDF9] bg-[linear-gradient(to_right,#F4F1EA_1px,transparent_1px),linear-gradient(to_bottom,#F4F1EA_1px,transparent_1px)] bg-[size:20px_20px] py-16 px-4 sm:px-8 lg:px-16 text-stone-800 tracking-tight relative overflow-x-hidden">
      
      {/* Hàng lò xo kim loại sổ tay chạy dọc viền trái màn hình lớn */}
      <div className="absolute left-4 top-0 bottom-0 flex flex-col justify-around opacity-30 select-none pointer-events-none hidden xl:flex text-stone-300">
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className="w-3.5 h-3.5 border-[1.5px] border-stone-400 rounded-full bg-white shadow-xs" />
        ))}
      </div>

      {/* HEADER DIARY TIÊU ĐIỂM */}
      <div className="max-w-[600px] mx-auto text-center mb-14 space-y-2 relative z-10">
        <div className="inline-flex items-center gap-1 bg-pink-100 text-pink-600 text-[9px] font-sans tracking-widest uppercase font-black px-2.5 py-1 rounded-full shadow-xs">
          <Sparkles size={10} className="animate-spin text-pink-500" />
          <span>Y2K Scrapbook Network</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-stone-900 font-serif lowercase">
          cloop<span className="text-pink-500 font-sans font-light">.diary</span>
        </h1>
        <p className="text-[11px] font-sans text-stone-400 font-medium tracking-wide">
          Bảng ghim ký ức trang phục tuần hoàn — Cuốn sổ tay ghi chép những mẩu chuyện nhỏ bước ra từ tủ đồ tuần hoàn.
        </p>
      </div>

      {/* 🏛️ KHÔNG GIAN LỚN: NÂNG CẤP BẢNG GRID 3 CỘT KHÔNG GIAN RỘNG LỚN */}
      <div className="max-w-7xl mx-auto relative z-10">
        {posts.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16 bg-white rounded-3xl border-2 border-dashed border-stone-200 p-8 shadow-sm">
            <p className="text-xs font-sans text-stone-400 tracking-wide">Trang sổ nhật ký hiện chưa dán bài đăng nào.</p>
            <p className="text-[11px] font-sans text-pink-500 font-bold mt-1">
              Hãy bấm đăng đồ để kích nổ luồng ảnh đầu tiên nhé Trang! 🌟
            </p>
          </div>
        ) : (
          // ⚡ ĐÃ PHÂN LUỒNG: Tự động chia 3 bài viết trên 1 dòng ở Desktop
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
            {posts.map((post: any, index: number) => {
              const productInfo = post.products;
              const rentalListing = productInfo?.Listing?.find((l: any) => l.listingType === "RENT");
              const rentalPrice = rentalListing ? rentalListing.basePrice : null;
              const album = productInfo?.images || [post.coverImage];

              return (
                <div 
                  key={post.id} 
                  className={`bg-white p-5 rounded-[2.2rem] border-2 transition-all duration-300 hover:shadow-[0_15px_35px_rgba(40,35,30,0.06)] space-y-5 relative flex flex-col justify-between min-h-[510px]
                    ${post.isPinned 
                      ? "border-amber-400 shadow-[0_10px_25px_rgba(245,158,11,0.04)] bg-amber-50/10" 
                      : "border-stone-900/10"
                    }`}
                >
                  {/* Icon ghim dập nổi góc nếu bài viết được Admin Trang ghim lên đầu hệ thống */}
                  {post.isPinned ? (
                    <div className="absolute top-3.5 right-4 flex items-center gap-0.5 text-amber-600 bg-amber-100 font-sans font-black text-[8px] tracking-widest px-2 py-0.5 rounded-md animate-pulse">
                      <Pin size={10} className="rotate-45 fill-amber-500" />
                      <span>PINNED</span>
                    </div>
                  ) : (
                    <Star size={12} className="absolute top-4 right-4 text-cyan-300 fill-cyan-50 rotate-12" />
                  )}

                  {/* Khối ghép ảnh Scrapbook 1 màn hình */}
                  <div className="w-full pt-4 shrink-0">
                    <ScrapbookCollage images={album} title={post.title} />
                  </div>

                  {/* Nội dung chữ nhật ký viết tay */}
                  <div className="space-y-2 text-left px-1 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[8px] font-sans font-bold text-stone-400 uppercase tracking-widest">
                        <span className={post.isPinned ? "text-amber-600 font-black" : "text-purple-500"}>
                          Page #0{index + 1} {post.isPinned && "★"}
                        </span>
                        <span>{new Date(post.createdAt).toLocaleDateString("vi-VN")}</span>
                      </div>
                      
                      <h3 className="text-sm font-black text-stone-900 leading-tight font-serif line-clamp-2">
                        {post.title}
                      </h3>
                    </div>
                    
                    <p className="text-[12px] text-stone-600 font-serif italic leading-relaxed text-justify bg-[#FAF9F3] p-3.5 rounded-xl border border-stone-200/50 tracking-wide mt-2 line-clamp-4 flex-1">
                      "{post.content}"
                    </p>
                  </div>

                  {/* Thẻ tag phục trang cho thuê dứt điểm */}
                  {productInfo && (
                    <div className="pt-3 border-t-2 border-dashed border-stone-100 flex items-center justify-between gap-2 shrink-0">
                      <div className="font-sans max-w-[55%] space-y-0.5 text-left">
                        <span className="text-[8px] text-pink-500 uppercase tracking-widest font-black flex items-center gap-0.5">
                          <Activity size={8} /> Outfit Tag
                        </span>
                        <p className="text-[11px] font-bold text-stone-800 truncate tracking-tight">{productInfo.title}</p>
                      </div>
                      
                      {/* 🛠️ ĐÃ SỬA LỖI ĐỊNH TUYẾN CHUẨN XÁC VỀ TRANG PRODUCT */}
                      <Link href={`/product/${post.productId}`} className="shrink-0">
                        <button className="bg-stone-900 hover:bg-pink-600 text-white px-3 py-2 rounded-xl font-sans text-[10px] font-black tracking-wider transition-all duration-200 shadow-sm flex items-center gap-1 cursor-pointer whitespace-nowrap active:scale-95">
                          <span>Thuê ngay</span>
                          {rentalPrice !== null && (
                            <span className="opacity-60 font-normal">| {rentalPrice.toLocaleString("vi-VN")}đ</span>
                          )}
                          <ArrowUpRight size={10} strokeWidth={3} className="text-amber-300" />
                        </button>
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}