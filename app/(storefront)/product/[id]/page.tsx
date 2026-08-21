"use client";

import { useState, useEffect, Suspense } from "react"; 
import { useParams, useRouter, useSearchParams } from "next/navigation"; 
import Image from "next/image";
import Link from "next/link";
import { MapPin, Star, ArrowLeft, Shirt, ShoppingBag, ChevronLeft, ChevronRight, Ruler, Scissors, Scale, User, Wand2 } from "lucide-react";

import RentalBookingBox from "@/components/RentalBookingBox"; 
import LiveViewerBadge from "@/components/LiveViewerBadge";

import { supabase } from "@/lib/supabase";

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
  const [hasActiveRentals, setHasActiveRentals] = useState(false);

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
          const { data: imgData } = await supabase.from("product_images").select("url").eq("productId", id);
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
            const { data: uData } = await supabase.from("profiles").select("*").eq("id", data.userId).single();
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

        // Kiểm tra xem sản phẩm có đang bị kẹt lịch thuê không
        try {
          // Table name might be RentalHistory or rental_history depending on DB case mapping, try both if needed
          const { data: rentData } = await supabase.from("RentalHistory").select("id").eq("product_id", id).in("status", ["active", "RESERVED"]).limit(1);
          if (rentData && rentData.length > 0) {
            setHasActiveRentals(true);
          } else {
            // Fallback for snake_case table name if Prisma mapped it differently in Supabase public schema
            const { data: rentData2 } = await supabase.from("rental_history").select("id").eq("product_id", id).in("status", ["active", "RESERVED"]).limit(1);
            if (rentData2 && rentData2.length > 0) {
              setHasActiveRentals(true);
            }
          }
        } catch (e) {
          console.warn("Bỏ qua kiểm tra lịch thuê", e);
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
    <main className="min-h-screen bg-[#FAF8F3] text-[#183A2D] antialiased px-4 py-6 md:p-12 font-sans selection:bg-[#183A2D] selection:text-white relative">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 md:mb-8 text-left">
          <Link href="/shop" className="inline-flex items-center gap-2 text-xs md:text-sm font-bold uppercase tracking-widest text-gray-500 hover:text-green-800 transition-colors">
            <ArrowLeft size={14} /> — QUAY LẠI SÀN THƯƠNG MẠI CLOOP
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
          
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
                  
                  <div className="absolute bottom-4 right-4 bg-black/50 text-white font-mono text-xs px-3 py-1 rounded-full backdrop-blur-sm">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[11px] md:text-xs text-gray-500 font-bold uppercase tracking-widest">
                <MapPin size={13} className="text-[#6BA37A]" /> Khu vực chung: {product.province}
              </div>
              <Link href={`/closet/${product.userId}`} className="text-[11px] md:text-xs w-fit text-emerald-700 font-bold uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors">
                Tủ Đồ Của @{product.ownerRealName || 'closet'} ➔
              </Link>
            </div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-[#183A2D] capitalize leading-snug">{product.title || product.name}</h1>
            
            <LiveViewerBadge />
            <div className="flex items-center gap-2 text-xs md:text-sm text-amber-500 font-bold">
              <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((s) => <Star key={s} size={14} className="fill-amber-400 stroke-none" />)}</div>
              <span className="text-gray-400 font-medium font-mono text-[11px] md:text-xs translate-y-[1px]">(ĐỘ UY TÍN CAO)</span>
            </div>

            <div className="bg-white border border-[#E9E2D8] rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm space-y-6 md:space-y-8">
              {/* Cụm A: Đặc tính sản phẩm */}
              <div className="space-y-3 md:space-y-4">
                <h3 className="text-sm md:text-base font-bold text-gray-900 border-b border-stone-100 pb-2 md:pb-3">Đặc tính sản phẩm</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 md:gap-y-4 text-sm">
                  {product.color && <div className="flex gap-2"><span className="text-gray-500">Màu sắc:</span><span className="font-medium text-gray-900">{product.color}</span></div>}
                  <div className="flex gap-2"><span className="text-gray-500">Kích cỡ:</span><span className="font-medium text-gray-900">{product.size}</span></div>
                  {product.material && <div className="flex gap-2"><span className="text-gray-500">Chất liệu:</span><span className="font-medium text-gray-900">{product.material}</span></div>}
                  <div className="flex gap-2"><span className="text-gray-500">Độ mới:</span><span className="font-medium text-gray-900">{product.condition}</span></div>
                  {product.occasion && <div className="flex gap-2"><span className="text-gray-500">Dịp:</span><span className="font-medium text-gray-900">{product.occasion}</span></div>}
                  {product.brand && <div className="flex gap-2"><span className="text-gray-500">Thương hiệu:</span><span className="font-medium text-gray-900">{product.brand}</span></div>}
                </div>
              </div>

              {/* Cụm B: Vừa vặn hoàn hảo */}
              <div className="space-y-3 md:space-y-4">
                <h3 className="text-sm md:text-base font-bold text-gray-900 border-b border-stone-100 pb-2 md:pb-3 flex items-center gap-2"><Ruler size={14} /> Vừa vặn hoàn hảo</h3>
                <div className="flex flex-col gap-2 md:gap-3">
                  {(product.targetHeight || product.targetWeight) && (
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
                      {product.targetHeight && <span>Chiều cao: <strong className="text-green-800">{product.targetHeight} cm</strong></span>}
                      {product.targetWeight && <span>Cân nặng: <strong className="text-green-800">{product.targetWeight} kg</strong></span>}
                    </div>
                  )}
                  {(product.chest || product.waist || product.hips) && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">Số đo 3 vòng:</span>
                      <span>
                        {product.chest ? `Ngực ${product.chest} ` : ''} 
                        {product.waist ? `- Eo ${product.waist} ` : ''} 
                        {product.hips ? `- Mông ${product.hips}` : ''}
                      </span>
                    </div>
                  )}
                  {(!product.targetHeight && !product.targetWeight && !product.chest && !product.waist && !product.hips) && (
                    <span className="text-xs text-stone-500 italic">Người bán chưa cung cấp số đo chi tiết.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 md:space-y-3">
              <div className="text-sm md:text-base font-bold text-gray-900">Mô tả từ chủ tủ đồ</div>
              <p className="text-sm text-gray-600 leading-relaxed bg-white border border-[#E9E2D8] rounded-xl md:rounded-2xl p-4 md:p-5 shadow-sm">
                {product.description || "Trang phục Lookbook tuyển chọn thương hiệu cao cấp."}
              </p>
            </div>

            {product.isRental && product.isSale && (
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex bg-gray-100/80 p-1.5 rounded-xl border border-gray-200/50 w-full">
                  <button 
                    type="button"
                    onClick={() => setTransactionMode("RENT")}
                    className={`flex-1 py-2.5 text-sm md:text-base font-semibold rounded-lg transition-all duration-200 ${
                      transactionMode === "RENT" 
                        ? "bg-white shadow-sm text-emerald-800 ring-1 ring-black/5" 
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    Thuê đồ
                  </button>
                  <button 
                    type="button"
                    disabled={hasActiveRentals}
                    onClick={() => setTransactionMode("SELL")}
                    className={`flex-1 py-2.5 text-sm md:text-base font-semibold rounded-lg transition-all duration-200 ${
                      hasActiveRentals 
                        ? "opacity-50 cursor-not-allowed text-stone-400" 
                        : transactionMode === "SELL" 
                          ? "bg-white shadow-sm text-emerald-800 ring-1 ring-black/5" 
                          : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    Sở hữu món đồ
                  </button>
                </div>
                {hasActiveRentals && (
                  <p className="text-xs text-amber-600 font-semibold text-center italic">
                    *Sản phẩm đang vướng lịch thuê. Vui lòng quay lại sau!
                  </p>
                )}
              </div>
            )}

            <div className="bg-white border border-[#E9E2D8] rounded-xl md:rounded-2xl p-5 md:p-6 shadow-sm space-y-2 mb-6">
              <div className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">
                {transactionMode === "RENT" ? "Giá thuê" : "Giá thanh toán toàn bộ"}
              </div>
              <div className="text-2xl md:text-3xl lg:text-4xl font-mono font-black text-stone-900 tracking-tight">
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
      <ProductDetailContent />
    </Suspense>
  );
}