"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { MapPin, Star, ShieldCheck, ArrowLeft, Shirt } from "lucide-react";

// Khởi tạo kết nối Supabase đồng bộ với hệ thống trang chủ
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600";

interface ClosetProduct {
  id: string;
  title: string;
  image: string;
  type: "Thuê" | "Mua sắm";
  priceText: string;
  location: string;
  size: string;
}

interface UserProfile {
  id: string;
  name: string;
  avatar: string | null;
}

export default function ClosetProfilePage() {
  const params = useParams();
  const userId = params?.userId as string;

  const [ownerInfo, setOwnerInfo] = useState<UserProfile | null>(null);
  const [rentalProducts, setRentalProducts] = useState<ClosetProduct[]>([]);
  const [saleProducts, setSaleProducts] = useState<ClosetProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!userId) return;

    async function fetchClosetData() {
      try {
        setLoading(true);

        // 1. Quy quét thông tin định danh của chủ tủ đồ (Hỗ trợ đối soát cả bảng hoa lẫn bảng thường)
        const { data: userData, error: userError } = await supabase
          .from("User")
          .select("id, name, avatar")
          .eq("id", userId)
          .maybeSingle();

        if (!userError && userData) {
          setOwnerInfo({
            id: userData.id,
            name: userData.name || "Thành viên CLOOP",
            avatar: userData.avatar || null,
          });
        } else {
          const { data: fallbackUser } = await supabase
            .from("users")
            .select("id, name, avatar")
            .eq("id", userId)
            .maybeSingle();
          if (fallbackUser) {
            setOwnerInfo({
              id: fallbackUser.id,
              name: fallbackUser.name || "Thành viên CLOOP",
              avatar: fallbackUser.avatar || null,
            });
          }
        }

        // 2. Tải toàn bộ danh sách sản phẩm thuộc sở hữu của chủ tủ đồ này
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("*")
          .eq("userId", userId)
          .order("createdAt", { ascending: false });

        if (productsError) throw productsError;

        if (productsData && productsData.length > 0) {
          const productIds = productsData.map((p) => p.id);

          // Tải danh sách Listing niêm yết giá và ProductImage đi kèm sản phẩm
          const { data: listingsData } = await supabase.from("Listing").select("*").in("productId", productIds);
          const { data: imagesData } = await supabase.from("ProductImage").select("*").in("productId", productIds);

          const formatted: ClosetProduct[] = [];

          productsData.forEach((item: any) => {
            const listingsArr = (listingsData || []).filter((l: any) => l.productId === item.id);
            const imagesArr = (imagesData || []).filter((img: any) => img.productId === item.id);

            const rentListing = listingsArr.find((l: any) => l.listingType === "RENT" && l.status === "AVAILABLE");
            const sellListing = listingsArr.find((l: any) => (l.listingType === "SELL" || l.listingType === "SALE") && l.status === "AVAILABLE");

            const rentPrice = rentListing ? Number(rentListing.basePrice) : 0;
            const sellPrice = sellListing ? Number(sellListing.basePrice) : 0;
            const effectiveRentPrice = rentPrice || item.rental_price;

            let image = PLACEHOLDER_IMG;
            if (imagesArr.length > 0) {
              image = imagesArr[0].url || image;
            } else if (item.image_url || item.imageUrl) {
              image = item.image_url || item.imageUrl;
            }

            // Gán thông tin phân loại luồng Đồ Cho Thuê
            if (effectiveRentPrice > 0) {
              formatted.push({
                id: item.id,
                title: item.title || item.name || "Trang phục CLOOP",
                image,
                type: "Thuê",
                priceText: `${effectiveRentPrice.toLocaleString()}đ / ngày`,
                location: item.province || "Nghệ An",
                size: item.size || "M",
              });
            }

            // Gán thông tin phân loại luồng Đồ Thanh Lý / Mua Đứt
            if (sellPrice > 0) {
              formatted.push({
                id: item.id,
                title: item.title || item.name || "Trang phục CLOOP",
                image,
                type: "Mua sắm",
                priceText: `${sellPrice.toLocaleString()}đ`,
                location: item.province || "Nghệ An",
                size: item.size || "M",
              });
            }
          });

          // Phân tách mảng dữ liệu gán riêng biệt vào 2 State độc lập
          setRentalProducts(formatted.filter((p) => p.type === "Thuê"));
          setSaleProducts(formatted.filter((p) => p.type === "Mua sắm"));
        }
      } catch (err) {
        console.error("❌ Lỗi vận hành đồng bộ dữ liệu chi tiết tủ đồ cá nhân:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchClosetData();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-[#FAF9F6] space-y-3">
        <div className="w-5 h-5 border border-emerald-800/40 border-t-emerald-900 rounded-full animate-spin" />
        <p className="text-[10px] font-medium text-emerald-900 uppercase tracking-widest">Đang tải cấu trúc tủ đồ...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-stone-900 antialiased pb-20 pt-8">
      {/* Khóa chặt font chữ đồng bộ với trang chủ dự án */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600;700&display=swap');
        body, p, span, div { font-family: 'Inter', sans-serif !important; }
        h1, h2, h3, .font-heading { font-family: 'Cormorant Garamond', serif !important; }
      `}</style>

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-12 space-y-12">
        
        {/* NÚT QUAY LẠI TRANG CHỦ & KHỐI HỒ SƠ ĐẦU TRANG */}
        <div className="space-y-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-400 hover:text-[#183A2D] transition-colors uppercase tracking-wider text-left">
            <ArrowLeft size={14} /> Quay lại trang chủ
          </Link>

          <div className="bg-white border border-stone-200/60 rounded-[2.5rem] p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xs text-left">
            <div className="flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto">
              {/* Khung viền Avatar dải màu chuyển động chuẩn CLOOP Network */}
              <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-emerald-500 via-amber-300 to-pink-500 shrink-0 shadow-xs">
                <div className="w-full h-full rounded-full border-2 border-white bg-stone-100 overflow-hidden flex items-center justify-center">
                  {ownerInfo?.avatar ? (
                    <img src={ownerInfo.avatar} className="w-full h-full object-cover" alt={ownerInfo.name} />
                  ) : (
                    <span className="text-stone-400 font-bold text-xl">{(ownerInfo?.name || "C").charAt(0).toUpperCase()}</span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 font-heading">@{ownerInfo?.name || "Thành viên CLOOP"}</h1>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                    <ShieldCheck size={12} /> {rentalProducts.length + saleProducts.length} sản phẩm đang công khai
                  </span>
                  <span className="flex items-center gap-0.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/30 px-2.5 py-1 rounded-full">
                    ★ 5.0 Uy tín
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 border border-stone-100 bg-stone-50 px-4 py-3 rounded-2xl text-left">
              <Shirt size={14} className="text-stone-400" />
              <p className="text-[11px] text-stone-400 max-w-xs leading-tight">
                Bằng việc sử dụng thời trang tuần hoàn, chủ gian hàng này đã góp phần giảm thiểu lượng CO2 phát thải ra môi trường.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-14">
          
          {/* KHỐI 1: ĐỒ CHO THUÊ TUẦN HOÀN */}
          <div className="space-y-5 text-left">
            <div className="border-b border-stone-200/60 pb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block animate-pulse" />
              <h2 className="text-xl font-bold text-[#183A2D] font-heading">Tủ đồ cho thuê tuần hoàn</h2>
            </div>

            {rentalProducts.length === 0 ? (
              <div className="bg-white border border-dashed border-stone-200 rounded-[2rem] p-12 text-center text-xs text-stone-400 shadow-3xs font-medium">
                Chủ tủ đồ này hiện chưa có sản phẩm cho thuê nào.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {rentalProducts.map((p) => (
                  <Link href={`/product/${p.id}`} key={p.id} className="block group relative">
                    <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-white border border-stone-200/30 shadow-3xs">
                      <Image src={p.image} alt={p.title} fill unoptimized className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]" />
                      <span className="absolute top-3 left-3 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white bg-[#183A2D] shadow-xs font-heading">
                        RENTAL
                      </span>
                      <span className="absolute bottom-3 left-3 bg-stone-900/70 backdrop-blur-md text-[9px] font-bold text-white px-2 py-0.5 rounded-md font-heading">
                        SIZE {p.size}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 px-0.5 text-xs">
                      <p className="font-bold text-stone-800 line-clamp-1 font-heading text-sm group-hover:text-[#183A2D] transition-colors">{p.title}</p>
                      <div className="text-stone-400 flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-0.5 truncate max-w-[60%]"><MapPin size={10} className="text-[#6BA37A] shrink-0" /> {p.location}</span>
                        <span className="font-mono font-bold text-[#183A2D]">{p.priceText}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* KHỐI 2: ĐỒ MUA ĐỨT / CHUYỂN NHƯỢNG (KỆ THANH LÝ) */}
          <div className="space-y-5 text-left">
            <div className="border-b border-stone-200/60 pb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block animate-pulse" />
              <h2 className="text-xl font-bold text-[#183A2D] font-heading">Kệ thanh lý phục trang</h2>
            </div>

            {saleProducts.length === 0 ? (
              <div className="bg-white border border-dashed border-stone-200 rounded-[2rem] p-12 text-center text-xs text-stone-400 shadow-3xs font-medium">
                Chủ tủ đồ này hiện chưa có sản phẩm chuyển nhượng nào.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {saleProducts.map((p) => (
                  <Link href={`/product/${p.id}`} key={p.id} className="block group relative">
                    <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-white border border-stone-200/30 shadow-3xs">
                      <Image src={p.image} alt={p.title} fill unoptimized className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]" />
                      <span className="absolute top-3 left-3 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white bg-blue-700 shadow-xs font-heading">
                        BUY OUT
                      </span>
                      <span className="absolute bottom-3 left-3 bg-stone-900/70 backdrop-blur-md text-[9px] font-bold text-white px-2 py-0.5 rounded-md font-heading">
                        SIZE {p.size}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 px-0.5 text-xs">
                      <p className="font-bold text-stone-800 line-clamp-1 font-heading text-sm group-hover:text-[#183A2D] transition-colors">{p.title}</p>
                      <div className="text-stone-400 flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-0.5 truncate max-w-[60%]"><MapPin size={10} className="text-[#6BA37A] shrink-0" /> {p.location}</span>
                        <span className="font-mono font-bold text-[#183A2D]">{p.priceText}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}