"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowUpRight, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

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
    images: string[]; // Mảng chứa đầy đủ các ảnh thực tế của món đồ
  } | null;
}

export default function BlogJournalPage() {
  const [posts, setPosts] = useState<BlogWithProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchJournalFeed() {
      try {
        // 1. Kéo toàn bộ danh sách câu chuyện Blog về máy trước
        const { data: blogData, error: blogError } = await supabase
          .from("BlogPost")
          .select("*")
          .order("createdAt", { ascending: false });

        if (blogError) throw blogError;

        // 🔐 BỘ LỌC TUYỆT ĐỐI: Loại bỏ ngay lập tức những bài viết mang trạng thái HIDDEN bằng JS dưới máy
        const publicBlogs = (blogData || []).filter(b => b.status !== "HIDDEN");

        if (publicBlogs.length === 0) {
          setPosts([]);
          return;
        }

        // 2. Gom danh sách ID sản phẩm đi kèm câu chuyện để quét chéo dữ liệu lẻ
        const productIds = publicBlogs.map(b => b.productId).filter(Boolean);

        const { data: productsData } = await supabase.from("products").select("*").in("id", productIds);
        const { data: listingsData } = await supabase.from("Listing").select("*").in("productId", productIds);
        const { data: imagesData } = await supabase.from("ProductImage").select("*").in("productId", productIds);

        // 3. ĐIỀU PHỐI ĐỒNG BỘ KÉP: Khớp nối sản phẩm, luồng giá và ĐỦ MẢNG ẢNH ĐÃ UP CÙNG LÚC
        const formattedBlogs = publicBlogs.map(blog => {
          const matchedProduct = (productsData || []).find(p => String(p.id) === String(blog.productId));
          
          let productInfo = null;
          if (matchedProduct) {
            const matchedListings = (listingsData || []).filter(l => String(l.productId) === String(matchedProduct.id));
            const matchedImages = (imagesData || []).filter(img => String(img.productId) === String(matchedProduct.id));

            // Gom ảnh cover đại diện và các ảnh phụ trong bảng ProductImage lại làm một mảng album hoàn chỉnh
            let allUrls = matchedImages.map((img: any) => img.url);
            if (allUrls.length === 0 && blog.coverImage) {
              allUrls = [blog.coverImage];
            }
            // Dự phòng nếu trống trơn thì bế ảnh mẫu Unsplash
            if (allUrls.length === 0) {
              allUrls = ["https://images.unsplash.com/photo-1515886657613-9f3515b0c78f"];
            }

            const rentalListing = matchedListings.find((l: any) => l.listingType === "RENT");
            
            productInfo = {
              title: matchedProduct.title,
              original_price: matchedProduct.original_price,
              Listing: matchedListings,
              images: allUrls // Đút mảng full album ảnh vào đây công phá giao diện nhé
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
      
      {/* 🏛️ HEADER TẠP CHÍ HIGH-FASHION */}
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

      {/* 🕊️ DÒNG CHẢY FEED LOOKBOOK BẢN MINIMALIST */}
      <div className="max-w-md mx-auto space-y-14">
        {posts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200/40 p-8 shadow-sm">
            <p className="text-sm font-sans text-stone-400">Hiện chưa có câu chuyện outfit nào được chia sẻ.</p>
            <p className="text-xs font-sans text-[#1C3F30] font-semibold mt-2">
              Hãy là người đầu tiên thổi hồn vào trang phục tại mục Đăng đồ nhé! ✨
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const productInfo = post.products;
            const rentalListing = productInfo?.Listing?.find((l: any) => l.listingType === "RENT");
            const rentalPrice = rentalListing ? rentalListing.basePrice : null;
            const album = productInfo?.images || [post.coverImage || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f"];

            return (
              <div 
                key={post.id} 
                className="bg-white p-5 rounded-3xl border border-stone-200/30 shadow-[0_8px_30px_rgb(0,0,0,0.012)] space-y-5 group transition-all duration-300"
              >
                {/* 📸 THIẾT KẾ MỚI: KHUNG CHỮ NHẬT MINIMALIST - ALBUM CẢM XÚC VUỐT NGANG MULTI-IMAGE */}
                <div className="w-full flex justify-center overflow-hidden">
                  <div className="w-full p-1 bg-[#FAF9F5]/40 rounded-[1.6rem] border border-stone-100">
                    {/* Tỷ lệ khung hình chữ nhật đứng 3:4 chuẩn tạp chí Vogue hiện đại, tuyệt đối xóa sổ phom vòm */}
                    <div className="relative w-full aspect-[3/4] overflow-hidden rounded-[1.3rem] bg-stone-100 shadow-inner">
                      
                      {/* Luồng thanh cuộn ngang mượt mà (Snap Carousel) chứa toàn bộ ảnh cậu up cùng lúc */}
                      <div className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar">
                        {album.map((url: string, idx: number) => (
                          <div key={idx} className="w-full h-full shrink-0 snap-start relative">
                            <img 
                              src={url} 
                              alt={`${post.title} - Khung ảnh ${idx + 1}`}
                              className="w-full h-full object-cover select-none"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Thanh chỉ báo số lượng ảnh siêu mỏng ở cạnh trên góc phải (Ví dụ: 1/3) */}
                      {album.length > 1 && (
                        <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md text-[9px] font-sans text-white/90 font-bold px-2.5 py-1 rounded-full tracking-wider pointer-events-none select-none">
                          ALBUM • {album.length} ẢNH
                        </div>
                      )}

                      {/* Gợi ý vuốt sang bên dành cho người dùng ở góc dưới */}
                      {album.length > 1 && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full pointer-events-none">
                          {album.map((_, dotIdx) => (
                            <div key={dotIdx} className="w-1 h-1 rounded-full bg-white shadow-sm" />
                          ))}
                        </div>
                      )}
                      
                    </div>
                  </div>
                </div>

                {/* 📝 KHỐI NỘI DUNG CHỮ TRUYỀN CẢM HƯỚNG */}
                <div className="space-y-2.5 px-1">
                  <div className="flex items-center justify-between text-[8px] font-sans tracking-[0.18em] text-stone-400 uppercase">
                    <span className="font-medium">{new Date(post.createdAt).toLocaleDateString("vi-VN")}</span>
                    <span className="text-[#1C3F30] font-bold tracking-widest bg-stone-100 px-2 py-0.5 rounded">CLOOP MUSE</span>
                  </div>
                  
                  <h3 className="text-base font-bold text-[#183A2D] leading-snug tracking-tight">
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
                      <span className="text-[8px] text-stone-400 uppercase tracking-[0.2em] font-semibold block">Trang phục trong ảnh</span>
                      <p className="text-xs font-bold text-stone-800 truncate tracking-tight">{productInfo.title}</p>
                    </div>
                    
                    <Link href={`/shop/${post.productId}`} className="shrink-0">
                      <button className="bg-[#1C3F30] hover:bg-[#0F261D] text-[#FAF8F3] px-4 py-2.5 rounded-full font-sans text-[11px] font-bold tracking-wider transition-all duration-300 shadow-sm active:scale-[0.97] flex items-center gap-1">
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