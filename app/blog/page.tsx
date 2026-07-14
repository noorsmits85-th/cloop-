"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowUpRight, Sparkles, ChevronLeft, ChevronRight, Bookmark } from "lucide-react";

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
    images: string[];
  } | null;
}

function PolaroidCarousel({ images, title, rotationClass }: { images: string[]; title: string; rotationClass: string }) {
  const [idx, setIdx] = useState(0);

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((p) => (p === 0 ? images.length - 1 : p - 1));
  };

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((p) => (p === images.length - 1 ? 0 : p + 1));
  };

  return (
    <div className={`relative bg-[#FBFBFA] p-4 pb-14 shadow-[0_10px_30px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] border border-stone-200/40 rounded-sm transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] max-w-sm mx-auto group ${rotationClass}`}>
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-20 h-5 bg-amber-100/60 border border-amber-200/20 backdrop-blur-[1px] rotate-[-1deg] shadow-sm opacity-75 border-dashed mix-blend-multiply select-none pointer-events-none" />
      
      <div className="relative aspect-[3/4] bg-stone-50 overflow-hidden border border-stone-200/60 shadow-inner rounded-xs">
        <img 
          src={images[idx]} 
          alt={`${title} - Góc chụp ${idx + 1}`} 
          className="w-full h-full object-cover select-none transition-all duration-500"
        />
        
        {images.length > 1 && (
          <>
            <button 
              type="button" 
              onClick={prev} 
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-stone-800 hover:bg-white transition-all shadow-md opacity-0 group-hover:opacity-100 z-10 cursor-pointer"
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
            </button>
            <button 
              type="button" 
              onClick={next} 
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-stone-800 hover:bg-white transition-all shadow-md opacity-0 group-hover:opacity-100 z-10 cursor-pointer"
            >
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
            
            <div className="absolute top-2.5 right-2.5 bg-black/40 backdrop-blur-md text-[8px] font-sans text-white/90 font-bold px-2 py-0.5 rounded-full tracking-widest">
              {idx + 1} / {images.length}
            </div>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none">
              {images.map((_, dotIdx) => (
                <div 
                  key={dotIdx} 
                  className={`w-1 h-1 rounded-full transition-all duration-300 ${dotIdx === idx ? "bg-white w-2" : "bg-white/40"}`} 
                />
              ))}
            </div>
          </>
        )}
      </div>
      
      <div className="absolute bottom-3 right-4 font-sans text-[8px] text-stone-400 tracking-[0.2em] uppercase select-none">
        Cloop Memorabilia
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
          .order("createdAt", { ascending: false });

        if (blogError) throw blogError;

        const publicBlogs = (blogData || []).filter(b => b.status !== "HIDDEN");

        if (publicBlogs.length === 0) {
          setPosts([]);
          return;
        }

        // 🟢 ĐÃ ĐỒNG BỘ: Quét chính xác theo trường b.productId của Supabase
        const productIds = publicBlogs.map(b => b.productId).filter(Boolean);

        const { data: productsData } = await supabase.from("products").select("*").in("id", productIds);
        const { data: listingsData } = await supabase.from("Listing").select("*").in("productId", productIds);
        const { data: imagesData } = await supabase.from("ProductImage").select("*").in("productId", productIds);

        const formattedBlogs = publicBlogs.map(blog => {
          const targetProductId = blog.productId; // Đổi về b.productId
          const matchedProduct = (productsData || []).find(p => String(p.id) === String(targetProductId));
          
          let productInfo = null;
          if (matchedProduct) {
            const matchedListings = (listingsData || []).filter(l => String(l.productId) === String(matchedProduct.id));
            const matchedImages = (imagesData || []).filter(img => String(img.productId) === String(matchedProduct.id));

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
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-serif text-stone-700">
        <div className="text-center space-y-2">
          <div className="w-5 h-5 border-2 border-stone-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-[10px] tracking-widest uppercase mt-4 font-sans text-stone-400">Đang lật mở các trang nhật ký...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-16 px-4 sm:px-6 lg:px-8 text-stone-800 tracking-tight relative selection:bg-stone-800 selection:text-white">
      <div className="absolute left-4 top-0 bottom-0 w-[1px] bg-red-100/40 hidden md:block" />
      <div className="absolute left-6 top-0 bottom-0 w-[1px] bg-red-100/20 hidden md:block" />

      <div className="max-w-md mx-auto text-center mb-16 space-y-2.5">
        <div className="flex items-center justify-center gap-1 text-[9px] font-sans tracking-[0.25em] text-stone-400 uppercase font-bold">
          <Bookmark size={10} className="text-stone-500 fill-stone-200" />
          <span>The Scrapbook Edition</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-[0.15em] text-stone-900 uppercase font-serif">CLOOP DIARY</h1>
        <p className="text-[11px] font-sans italic text-stone-400/90 leading-relaxed max-w-[260px] mx-auto tracking-wide">
          "Lưu giữ ký ức thanh xuân, thổi hồn vòng đời mới cho trang phục tuần hoàn."
        </p>
        <div className="h-[1px] w-10 bg-stone-300 mx-auto mt-2" />
      </div>

      <div className="max-w-md mx-auto space-y-16">
        {posts.length === 0 ? (
          <div className="text-center py-16 bg-white/60 rounded-3xl border border-stone-200/50 p-8 shadow-sm">
            <p className="text-xs font-sans text-stone-400 tracking-wide">Hiện trang nhật ký thời trang đang trống trơn.</p>
            <p className="text-[11px] font-sans text-stone-700 font-semibold mt-1.5">
              Hãy là người đầu tiên gửi gắm câu chuyện trang phục nhé! ✨
            </p>
          </div>
        ) : (
          posts.map((post, index) => {
            const productInfo = post.products;
            const rentalListing = productInfo?.Listing?.find((l: any) => l.listingType === "RENT");
            const rentalPrice = rentalListing ? rentalListing.basePrice : null;
            const album = productInfo?.images || [post.coverImage];

            const rotations = ["rotate-1", "-rotate-1", "rotate-[1.5deg]", "-rotate-[1.5deg]"];
            const currentRotation = rotations[index % rotations.length];

            return (
              <div 
                key={post.id} 
                className="bg-[#FCFAF4] p-6 rounded-[2rem] border border-stone-200/50 shadow-[0_4px_24px_rgba(27,25,22,0.02)] space-y-6 relative"
              >
                <div className="w-full pt-2">
                  <PolaroidCarousel images={album} title={post.title} rotationClass={currentRotation} />
                </div>

                <div className="space-y-3 text-left px-2">
                  <div className="flex items-center justify-between text-[8px] font-sans tracking-widest text-stone-400 uppercase">
                    <span>Trang số • 0{index + 1}</span>
                    <span className="font-medium bg-stone-200/60 px-2 py-0.5 rounded-sm">{new Date(post.createdAt).toLocaleDateString("vi-VN")}</span>
                  </div>
                  
                  <h3 className="text-sm font-bold text-stone-900 tracking-tight font-serif">
                    {post.title}
                  </h3>
                  
                  <p className="text-[13px] text-stone-700 font-serif italic leading-relaxed text-justify bg-white/40 p-4 rounded-xl border border-stone-200/40 tracking-wide shadow-inner">
                    "{post.content}"
                  </p>
                </div>

                {productInfo && (
                  <div className="mx-2 pt-4 border-t border-dashed border-stone-300/80 flex items-center justify-between gap-4">
                    <div className="font-sans max-w-[55%] space-y-0.5">
                      <span className="text-[8px] text-stone-400 uppercase tracking-widest font-bold block">Trang phục trong trang nhật ký</span>
                      <p className="text-xs font-bold text-stone-800 truncate tracking-tight">{productInfo.title}</p>
                    </div>
                    
                    {/* 🟢 ĐÃ SỬA CHUẨN: Đồng bộ link sang post.productId gốc */}
                    <Link href={`/shop/${post.productId}`} className="shrink-0">
                      <button className="bg-stone-900 hover:bg-stone-800 text-[#FAF8F3] px-4 py-2 rounded-xl font-sans text-[11px] font-bold tracking-wider transition-all shadow-sm active:scale-[0.97] flex items-center gap-1 cursor-pointer">
                        <span>Chạm để thuê</span>
                        {rentalPrice !== null && (
                          <span className="opacity-70 font-normal">| {rentalPrice.toLocaleString("vi-VN")}đ</span>
                        )}
                        <ArrowUpRight size={12} className="text-amber-300" />
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