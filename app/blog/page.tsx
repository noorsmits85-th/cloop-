"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowUpRight, Sparkles, Star, Heart, Activity } from "lucide-react";

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

// 📸 COMPONENT CON: GHÉP ẢNH BẤT ĐỐI XỨNG CẮT DÁN THỦ CÔNG (KHÔNG TUA ẢNH)
function ScrapbookCollage({ images, title }: { images: string[]; title: string }) {
  // Trường hợp 1 ảnh: Đứng giữa, nghiêng nhẹ, dán băng keo hồng
  if (images.length === 1) {
    return (
      <div className="relative p-2.5 bg-white border border-stone-200/80 shadow-[0_8px_20px_rgba(0,0,0,0.04)] rotate-[-2deg] max-w-[240px] mx-auto group">
        <div className="absolute -top-3.5 left-1/4 w-16 h-4 bg-pink-200/60 rotate-[-8deg] border border-dashed border-pink-300/30 select-none pointer-events-none" />
        <img src={images[0]} alt={title} className="w-full aspect-[3/4] object-cover rounded-xs" />
      </div>
    );
  }

  // Trường hợp 2 ảnh: Xếp gối đầu lên nhau chéo cánh sinh động
  if (images.length === 2) {
    return (
      <div className="relative h-[290px] w-full max-w-[320px] mx-auto select-none">
        {/* Ảnh 1 - Nằm dưới bên trái */}
        <div className="absolute left-2 top-2 w-[58%] p-2 bg-white border border-stone-200 shadow-md rotate-[-4deg] z-10 hover:z-30 transition-all duration-300">
          <div className="absolute -top-3 left-4 w-12 h-4 bg-cyan-200/50 rotate-12 border border-dashed border-cyan-300/30" />
          <img src={images[0]} alt={title} className="w-full aspect-[3/4] object-cover rounded-xs" />
        </div>
        {/* Ảnh 2 - Đè lên trên bên phải */}
        <div className="absolute right-2 bottom-2 w-[55%] p-2 bg-white border border-stone-200 shadow-lg rotate-[3deg] z-20 hover:z-30 transition-all duration-300">
          <div className="absolute -top-2 right-4 w-12 h-4 bg-pink-200/60 rotate-[-15deg] border border-dashed border-pink-300/30" />
          <img src={images[1]} alt={title} className="w-full aspect-[3/4] object-cover rounded-xs" />
        </div>
      </div>
    );
  }

  // Trường hợp từ 3 ảnh trở lên: Bung xõa layout Grid Scrapbook bất đối xứng cực chất
  return (
    <div className="relative h-[340px] w-full max-w-[360px] mx-auto select-none">
      
      {/* 🩹 Thêm mớ sticker ngôi sao lấp lánh Y2K bay lơ lửng xung quanh khung ảnh */}
      <Star size={16} className="absolute top-0 right-8 text-purple-400 fill-purple-200 animate-bounce" />
      <Heart size={14} className="absolute bottom-12 left-0 text-pink-400 fill-pink-200 rotate-12" />
      
      {/* Ảnh 1 (Ảnh chính to nhất chiếm góc trái) */}
      <div className="absolute left-1 top-2 w-[55%] p-2 bg-white border border-stone-200 shadow-[0_10px_25px_rgba(0,0,0,0.05)] rotate-[-3deg] z-10 hover:z-40 transition-all duration-300">
        <div className="absolute -top-3.5 left-4 w-14 h-4 bg-purple-200/50 rotate-6 border border-dashed border-purple-300/30" />
        <img src={images[0]} alt={title} className="w-full aspect-[3/4] object-cover rounded-xs" />
      </div>
      
      {/* Ảnh 2 (Ảnh phụ nhỏ vuông vắn dán góc trên bên phải) */}
      <div className="absolute right-1 top-6 w-[45%] p-1.5 bg-white border border-stone-200 shadow-md rotate-[5deg] z-25 hover:z-40 transition-all duration-300">
        <div className="absolute -top-2 right-6 w-10 h-3.5 bg-yellow-100/70 rotate-[-8deg] border border-dashed border-yellow-200/40" />
        <img src={images[1]} alt={title} className="w-full aspect-square object-cover rounded-xs" />
      </div>
      
      {/* Ảnh 3 (Ảnh phụ chữ nhật đứng đè chéo ở đáy bên phải) */}
      <div className="absolute right-4 bottom-2 w-[48%] p-1.5 bg-white border border-stone-200 shadow-[0_12px_30px_rgba(0,0,0,0.06)] rotate-[-2deg] z-30 hover:z-40 transition-all duration-300">
        <div className="absolute -bottom-2 left-6 w-12 h-4 bg-cyan-200/60 rotate-12 border border-dashed border-cyan-300/30" />
        <img src={images[2]} alt={title} className="w-full aspect-[3/4] object-cover rounded-xs" />
      </div>

      {/* Ảnh 4 (Nếu có, giấu nhẹm mờ ảo ở lớp nền phía sau tạo chiều sâu) */}
      {images[3] && (
        <div className="absolute left-6 bottom-4 w-[35%] p-1 bg-white border border-stone-200 shadow-sm rotate-[8deg] z-0 opacity-60 hover:opacity-100 hover:z-40 transition-all duration-300">
          <img src={images[3]} alt={title} className="w-full aspect-square object-cover rounded-xs" />
        </div>
      )}
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

        const productIds = publicBlogs.map(b => b.productId).filter(Boolean);

        const { data: productsData } = await supabase.from("products").select("*").in("id", productIds);
        const { data: listingsData } = await supabase.from("Listing").select("*").in("productId", productIds);
        const { data: imagesData } = await supabase.from("ProductImage").select("*").in("productId", productIds);

        const formattedBlogs = publicBlogs.map(blog => {
          const targetProductId = blog.productId;
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
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center font-serif text-stone-700">
        <div className="text-center space-y-2">
          <div className="w-5 h-5 border-2 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] tracking-widest uppercase mt-4 font-sans text-purple-400 font-bold">Đang găm sticker lên trang sổ...</p>
        </div>
      </div>
    );
  }

  return (
    // 📖 GIAO DIỆN LỘT XÁC: NỀN VÀNG KEM ẤM ÁP KÈM LƯỚI CARO TẬP HỌC SINH SIÊU XÌ TEEN
    <div className="min-h-screen bg-[#FFFDF9] bg-[linear-gradient(to_right,#F4F1EA_1px,transparent_1px),linear-gradient(to_bottom,#F4F1EA_1px,transparent_1px)] bg-[size:20px_20px] py-16 px-4 sm:px-6 lg:px-8 text-stone-800 tracking-tight relative">
      
      {/* Biểu tượng lò xo sổ tay xoắn dọc cạnh trái màn hình máy tính */}
      <div className="absolute left-6 top-0 bottom-0 flex flex-col justify-around opacity-40 select-none pointer-events-none hidden lg:flex text-stone-300 font-sans text-xs">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="w-4 h-4 border-2 border-stone-400 rounded-full bg-white shadow-sm" />
        ))}
      </div>

      <div className="max-w-md mx-auto text-center mb-14 space-y-2">
        <div className="inline-flex items-center gap-1 bg-pink-100 text-pink-600 text-[9px] font-sans tracking-widest uppercase font-black px-2.5 py-1 rounded-full shadow-xs">
          <Sparkles size={10} className="animate-spin text-pink-500" />
          <span>Y2K Scrapbook Edition</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-stone-900 font-serif lowercase">
          cloop<span className="text-pink-500 font-sans font-light">.diary</span>
        </h1>
        <p className="text-[11px] font-sans text-stone-400 font-medium tracking-wide">
          Nơi tụi mình gom nhặt kỷ niệm và thổi hồn vòng đời mới cho phục trang ✨
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-16">
        {posts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-stone-200 p-8 shadow-sm">
            <p className="text-xs font-sans text-stone-400 tracking-wide">Trang sổ nhật ký hiện đang trống trơn rồi cậu.</p>
            <p className="text-[11px] font-sans text-pink-500 font-bold mt-1">
              Bấm đăng đồ để dán trang ký ức đầu tiên nhé Trang! 🌟
            </p>
          </div>
        ) : (
          posts.map((post, index) => {
            const productInfo = post.products;
            const rentalListing = productInfo?.Listing?.find((l: any) => l.listingType === "RENT");
            const rentalPrice = rentalListing ? rentalListing.basePrice : null;
            const album = productInfo?.images || [post.coverImage];

            return (
              // Khối card bài viết bo góc bầu bĩnh, đổ bóng đổ lofi nhẹ nhàng
              <div 
                key={post.id} 
                className="bg-white p-6 rounded-[2.5rem] border-2 border-stone-900/10 shadow-[0_12px_30px_rgba(40,35,30,0.03)] space-y-6 relative overflow-hidden"
              >
                {/* Sticker Ngôi sao 4 cánh retro trang trí góc card bài đăng */}
                <Star size={12} className="absolute top-4 left-4 text-cyan-400 fill-cyan-100 rotate-12" />

                {/* 📸 KHỐI GHÉP ẢNH COLLAGE ĐẬP VÀO MẮT 1 MÀN LUÔN */}
                <div className="w-full">
                  <ScrapbookCollage images={album} title={post.title} />
                </div>

                {/* 📝 ĐÃ CẬP NHẬT: VĂN BẢN STATUS CHỮ VIẾT TAY HOÀI NIỆM SÂU LẮNG */}
                <div className="space-y-2.5 text-left px-1">
                  <div className="flex items-center justify-between text-[9px] font-sans font-bold text-stone-400 uppercase tracking-widest">
                    <span className="text-purple-500 bg-purple-50 px-2 py-0.5 rounded-md">Page #0{index + 1}</span>
                    <span>{new Date(post.createdAt).toLocaleDateString("vi-VN")}</span>
                  </div>
                  
                  <h3 className="text-base font-black text-stone-900 leading-tight font-serif">
                    {post.title}
                  </h3>
                  
                  {/* Khung chữ Status mô phỏng nét viết tay lưu bút nghiêng nhẹ dạt dào cảm xúc */}
                  <p className="text-[13px] text-stone-700 font-serif italic leading-relaxed text-justify bg-[#FAF9F3] p-4 rounded-2xl border border-stone-200/60 shadow-inner">
                    "{post.content}"
                  </p>
                </div>

                {/* Thẻ tag kết nối sản phẩm thuê đồ khép kín siêu ngầu */}
                {productInfo && (
                  <div className="mx-1 pt-4 border-t-2 border-dashed border-stone-100 flex items-center justify-between gap-4">
                    <div className="font-sans max-w-[55%] space-y-0.5">
                      <span className="text-[8px] text-pink-500 uppercase tracking-widest font-black flex items-center gap-0.5">
                        <Activity size={8} /> Outfit Tag
                      </span>
                      <p className="text-xs font-bold text-stone-800 truncate tracking-tight">{productInfo.title}</p>
                    </div>
                    
                    <Link href={`/shop/${post.productId}`} className="shrink-0">
                      <button className="bg-stone-900 hover:bg-pink-600 text-white hover:text-white px-4 py-2.5 rounded-2xl font-sans text-[11px] font-black tracking-wider transition-all duration-300 shadow-md active:scale-[0.95] flex items-center gap-1 cursor-pointer">
                        <span>Thuê ngay</span>
                        {rentalPrice !== null && (
                          <span className="opacity-60 font-normal">| {rentalPrice.toLocaleString("vi-VN")}đ</span>
                        )}
                        <ArrowUpRight size={12} strokeWidth={2.5} className="text-amber-300" />
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