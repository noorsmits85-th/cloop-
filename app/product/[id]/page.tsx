"use client";

import { useState, useEffect, Suspense } from "react"; 
import { useParams, useRouter, useSearchParams } from "next/navigation"; 
import Image from "next/image";
import Link from "next/link";
import { MapPin, Star, ArrowLeft, Shirt, ShoppingBag, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

import RentalBookingBox from "../../../components/RentalBookingBox"; 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600";

function ProductDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const urlType = searchParams.get("type"); 

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transactionMode, setTransactionMode] = useState<"RENT" | "SELL">("RENT");

  const [imagesList, setImagesList] = useState<string[]>([]); 
  const [activeImgIndex, setActiveImgIndex] = useState(0);    

  useEffect(() => {
    if (!id) return;
    async function fetchProductDetail() {
      try {
        setLoading(true);
        const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
        if (error) throw error;

        let fetchedImages: string[] = [];
        try {
          const { data: imgData } = await supabase.from("ProductImage").select("url").eq("productId", id);
          if (imgData && imgData.length > 0) {
            fetchedImages = imgData.map((img: any) => img.url);
          }
        } catch (e) {
          console.warn("Bỏ qua lỗi truy xuất tệp danh sách ảnh phụ ProductImage.");
        }

        if (fetchedImages.length === 0) {
          fetchedImages = [data?.image_url || "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600"];
        }
        setImagesList(fetchedImages);
        setActiveImgIndex(0); 

        let ownerProfile: any = null;
        if (data?.userId) {
          try {
            const { data: uData } = await supabase.from("User").select("*").eq("id", data.userId).single();
            if (uData) ownerProfile = uData;
          } catch (authErr) {
            console.error("Lỗi truy vấn bảng User chính chủ:", authErr);
          }
        }

        let priceData: any[] = [];
        try {
          const { data: lData } = await supabase.from("Listing").select("*").eq("productId", id);
          if (lData && lData.length > 0) priceData = lData;
        } catch (e) {
          console.warn("Bỏ qua lỗi truy xuất Listing.");
        }

        const rentListing = priceData.find((l: any) => (l.listingType || l.listing_type) === "RENT");
        const saleListing = priceData.find((l: any) => (l.listingType || l.listing_type) === "SALE" || (l.listingType || l.listing_type) === "SELL");

        const isRentalAvailable = !!rentListing || data?.rental_price > 0;
        const isSaleAvailable = !!saleListing || data?.sale_price > 0;

        setProduct({
          ...data,
          rentalPrice: rentListing?.basePrice || data?.rental_price || 0,
          salePrice: saleListing?.basePrice || data?.sale_price || 0,
          isRental: isRentalAvailable,
          isSale: isSaleAvailable,
          depositPercent: rentListing ? Number(rentListing.deposit) : 100,
          image: data?.image_url || "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600",
          ownerRealName: ownerProfile?.name || ownerProfile?.full_name || "Chủ tủ đồ ẩn danh",
          ownerRealPhone: ownerProfile?.phone || ownerProfile?.phoneNumber || data?.owner_phone || data?.ownerPhone || "Chưa cập nhật SĐT"
        });

        if (urlType === "sell" && isSaleAvailable) {
          setTransactionMode("SELL");
        } else if (urlType === "rent" && isRentalAvailable) {
          setTransactionMode("RENT");
        } else {
          setTransactionMode(isRentalAvailable ? "RENT" : "SELL");
        }

      } catch (err) {
        console.error("Lỗi dòng chảy chi tiết sản phẩm:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProductDetail();
  }, [id, urlType]);

  const handlePrevImage = () => {
    setActiveImgIndex((prev) => (prev === 0 ? imagesList.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setActiveImgIndex((prev) => (prev === imagesList.length - 1 ? 0 : prev + 1));
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-[#FAF8F3] space-y-3">
      <div className="w-10 h-10 border-4 border-green-800 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-semibold text-green-800 tracking-wider">⚡ ĐANG TẢI DỮ LIỆU ĐỒ BẠN VUI LÒNG CHỜ...</p>
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-[#FAF8F3] flex flex-col items-center justify-center p-6 text-center">
      <p className="text-sm font-bold text-red-600 mb-4">🚨 Không tìm thấy sản phẩm này trong kho lưu trữ dữ liệu thật.</p>
      <button onClick={() => router.push("/")} className="px-6 py-2.5 bg-green-800 text-white font-bold text-xs rounded-full uppercase tracking-wider">Quay lại trang chủ</button>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#FAF8F3] text-[#183A2D] antialiased p-4 md:p-12 font-sans selection:bg-[#183A2D] selection:text-white relative">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-left">
          <Link href="/shop" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-green-800 transition-colors">
            <ArrowLeft size={12} /> — QUAY LẠI SÀN THƯƠNG MẠI CLOOP
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          
          <div className="space-y-4 w-full">
            <div className="relative w-full aspect-[3/4] rounded-[2rem] overflow-hidden shadow-md border border-stone-200/60 bg-white group">
              <Image 
                src={imagesList[activeImgIndex] || product.image} 
                alt={product.title} 
                fill 
                unoptimized 
                className="object-cover object-top transition-all duration-300" 
              />

              {imagesList.length > 1 && (
                <>
                  <button 
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center text-stone-800 hover:bg-white transition-all shadow-sm opacity-0 group-hover:opacity-100"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button 
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center text-stone-800 hover:bg-white transition-all shadow-sm opacity-0 group-hover:opacity-100"
                  >
                    <ChevronRight size={18} />
                  </button>
                  
                  <div className="absolute bottom-4 right-4 bg-black/40 text-white font-mono text-[10px] px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                    {activeImgIndex + 1} / {imagesList.length}
                  </div>
                </>
              )}
            </div>

            {imagesList.length > 1 && (
              <div className="flex gap-2 overflow-x-auto py-1 justify-start">
                {imagesList.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImgIndex(idx)}
                    className={`relative w-14 aspect-[3/4] rounded-xl overflow-hidden border-2 bg-white shadow-sm shrink-0 transition-all ${idx === activeImgIndex ? "border-green-800 scale-95" : "border-stone-200/60 opacity-60 hover:opacity-100"}`}
                  >
                    <img src={imgUrl} className="w-full h-full object-cover object-top" alt="Góc chụp phụ Lookbook" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6 text-left">
            <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              <MapPin size={12} className="text-[#6BA37A]" /> Khu vực bàn giao chung: {product.province} [Khóa SĐT bảo mật]
            </div>
            <h1 className="text-3xl font-bold tracking-normal text-[#183A2D] uppercase">{product.title || product.name}</h1>
            
            <div className="flex items-center gap-2 text-xs text-amber-500 font-bold">
              <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((s) => <Star key={s} size={14} className="fill-amber-400 stroke-none" />)}</div>
              <span className="text-gray-400 font-medium font-mono translate-y-[1px]">(ĐỘ UY TÍN CAO)</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-[#E9E2D8] rounded-2xl p-4 shadow-sm">
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">KÍCH CỠ</div>
                <div className="text-sm font-bold text-[#183A2D]">{product.size} (Độ mới: {product.condition})</div>
              </div>
              <div className="bg-white border border-[#E9E2D8] rounded-2xl p-4 shadow-sm">
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">CHẤT LIỆU</div>
                <div className="text-sm font-bold text-[#183A2D]">{product.material}</div>
              </div>
              <div className="bg-white border border-[#E9E2D8] rounded-2xl p-4 shadow-sm">
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">CHIỀU CAO KHUYẾN NGHỊ</div>
                <div className="text-sm font-bold text-green-800 font-mono">{product.targetHeight} cm</div>
              </div>
              <div className="bg-white border border-[#E9E2D8] rounded-2xl p-4 shadow-sm">
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">CÂN NẶNG KHUYẾN NGHỊ</div>
                <div className="text-sm font-bold text-green-800 font-mono">{product.targetWeight} kg</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">MÔ TẢ TỪ CHỦ TỦ ĐỒ</div>
              <p className="text-xs text-gray-500 leading-relaxed bg-white border border-[#E9E2D8] rounded-2xl p-4 shadow-sm">
                {product.description || "Trang phục Lookbook tuyển chọn thương hiệu cao cấp."}
              </p>
            </div>

            {product.isRental && product.isSale && (
              <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 w-full">
                <button 
                  type="button"
                  onClick={() => setTransactionMode("RENT")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${transactionMode === "RENT" ? "bg-[#183A2D] text-white shadow-sm" : "text-gray-500 hover:text-stone-800"}`}
                >
                  <Shirt size={14} /> Xem Luồng Thuê Đồ
                </button>
                <button 
                  type="button"
                  onClick={() => setTransactionMode("SELL")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${transactionMode === "SELL" ? "bg-amber-800 text-white shadow-sm" : "text-gray-500 hover:text-stone-800"}`}
                >
                  <ShoppingBag size={14} /> Xem Luồng Mua Đứt
                </button>
              </div>
            )}

            <div className="bg-white border border-[#E9E2D8] rounded-2xl p-5 shadow-sm space-y-1">
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                {transactionMode === "RENT" ? "CHI PHÍ THUÊ PHÁT HÀNH" : "CHI PHÍ SỞ HỮU ĐỨT ĐIỂM"}
              </div>
              <div className="text-2xl font-mono font-black text-stone-900">
                {transactionMode === "RENT" 
                  ? `${product.rentalPrice.toLocaleString()}đ / ngày` 
                  : `${product.salePrice.toLocaleString()}đ`
                }
              </div>
            </div>

            {/* 🟢 HỘP BẢO CHỨNG ĐÃ ĐẤU DÂY THÀNH CÔNG: Gắn ownerId={product.userId} gửi trực tiếp dữ liệu thật */}
            <RentalBookingBox 
              productId={product.id} 
              ownerId={product.userId} 
              price={transactionMode === "RENT" ? product.rentalPrice : product.salePrice} 
              listingType={transactionMode} 
              depositPercent={product.depositPercent || 100} 
              ownerName={product.ownerRealName}
              ownerPhone={product.ownerRealPhone}
              ownerAddress={product.province || product.address}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col justify-center items-center min-h-screen bg-[#FAF8F3] space-y-3">
        <div className="w-10 h-10 border-4 border-green-800 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-green-800 tracking-wider">⚡ ĐANG KHỞI TẠO LUỒNG AN TOÀN...</p>
      </div>
    }>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" />
      <style>{`body, h1, h2, div, span, p, button, label { font-family: 'Plus Jakarta Sans', sans-serif !important; }`}</style>
      <ProductDetailContent />
    </Suspense>
  );
}