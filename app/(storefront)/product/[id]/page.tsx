"use client";

import { useState, useEffect, Suspense } from "react"; 
import { useParams, useRouter, useSearchParams } from "next/navigation"; 
import Image from "next/image";
import Link from "next/link";
import { 
  MapPin, Star, ArrowLeft, Shirt, ShoppingBag, 
  ChevronLeft, ChevronRight, Ruler, Sparkles, 
  ShieldCheck, Leaf, RotateCcw, Share2, Heart,
  CheckCircle2, Info, MessageCircle, PhoneCall
} from "lucide-react";

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
  const [isLiked, setIsLiked] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function fetchProductDetail() {
      try {
        setLoading(true);
        const res = await fetch(`/api/products/${id}`);
        const result = await res.json();

        if (!res.ok || !result.success || !result.product) {
          throw new Error(result?.error || "Không tìm thấy sản phẩm");
        }

        const pData = result.product;
        setProduct(pData);
        setImagesList(pData.images && pData.images.length > 0 ? pData.images : [pData.image || PLACEHOLDER_IMG]);
        setActiveImgIndex(0);

        if (urlType === "sell" && pData.isSale) {
          setTransactionMode("SELL");
        } else if (urlType === "rent" && pData.isRental) {
          setTransactionMode("RENT");
        } else {
          setTransactionMode(pData.isRental ? "RENT" : "SELL");
        }
      } catch (err) {
        console.error("Lỗi nạp chi tiết sản phẩm:", err);
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

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center min-h-[70vh] bg-[#FAF8F3] space-y-4">
      <div className="w-10 h-10 border-3 border-[#183A2D] border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-semibold uppercase tracking-widest text-[#183A2D] font-ui">
        Đang nạp chi tiết trang phục CLOOP...
      </p>
    </div>
  );

  if (!product) return (
    <div className="min-h-[70vh] bg-[#FAF8F3] flex flex-col items-center justify-center p-6 text-center">
      <p className="text-sm font-bold text-stone-700 mb-4">Không tìm thấy sản phẩm này trong kho lưu trữ.</p>
      <button 
        onClick={() => router.push("/")} 
        className="px-6 py-2.5 bg-[#183A2D] text-white font-bold text-xs rounded-full uppercase tracking-wider hover:bg-[#2A6E46] transition-colors cursor-pointer"
      >
        Quay lại trang chủ
      </button>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#FAF8F3] text-[#142A1E] antialiased px-4 py-4 md:py-8 font-sans selection:bg-[#183A2D] selection:text-white">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* 🌿 TOP BREADCRUMB & BACK ACTION */}
        <div className="flex items-center justify-between border-b border-stone-200/70 pb-3">
          <Link 
            href="/shop" 
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-[#183A2D] transition-colors font-ui"
          >
            <ArrowLeft size={14} /> Khám phá thêm tủ đồ
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-600 hover:text-[#183A2D] bg-white border border-stone-200 px-2.5 py-1 rounded-full shadow-2xs transition-all cursor-pointer"
            >
              <Share2 size={12} />
              {copied ? "Đã chép link!" : "Chia sẻ"}
            </button>
            <button
              type="button"
              onClick={() => setIsLiked(!isLiked)}
              className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                isLiked 
                  ? "bg-rose-50 border-rose-200 text-rose-600" 
                  : "bg-white border-stone-200 text-stone-500 hover:text-rose-500 shadow-2xs"
              }`}
              title="Lưu vào yêu thích"
            >
              <Heart size={13} className={isLiked ? "fill-rose-600" : ""} />
            </button>
          </div>
        </div>

        {/* 🌟 MAIN 2-COLUMN LUXURY EDITORIAL GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* 📷 LEFT COLUMN: HIGH-FASHION LOOKBOOK GALLERY (5 Cols) */}
          <div className="lg:col-span-5 space-y-3.5 sticky top-24">
            <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-lg border border-stone-200/80 bg-[#F4EFE6] group">
              <Image 
                src={imagesList[activeImgIndex] || product.image} 
                alt={product.title} 
                fill 
                unoptimized 
                priority
                className="object-cover object-top transition-transform duration-500 group-hover:scale-103" 
              />

              {/* Listing Mode Floating Tag */}
              <div className="absolute top-3.5 right-3.5">
                <span className="rounded-full bg-[#183A2D] px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-wider text-white shadow-xs">
                  {transactionMode === "RENT" ? "Cho Thuê" : "Sở Hữu"}
                </span>
              </div>

              {/* Image Carousel Controls */}
              {imagesList.length > 1 && (
                <>
                  <button 
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-stone-800 hover:bg-white transition-all shadow-md opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-stone-800 hover:bg-white transition-all shadow-md opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                  
                  <div className="absolute bottom-3.5 right-3.5 bg-black/60 text-white font-mono text-[10.5px] px-2.5 py-0.5 rounded-full backdrop-blur-md">
                    {activeImgIndex + 1} / {imagesList.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {imagesList.length > 1 && (
              <div className="flex gap-2 overflow-x-auto py-1 justify-start">
                {imagesList.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImgIndex(idx)}
                    className={`relative w-14 aspect-[3/4] rounded-xl overflow-hidden border-2 bg-stone-100 shadow-2xs shrink-0 transition-all cursor-pointer ${
                      idx === activeImgIndex 
                        ? "border-[#183A2D] scale-95 ring-2 ring-[#183A2D]/20" 
                        : "border-stone-200/80 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={imgUrl} className="w-full h-full object-cover object-top" alt={`Góc chụp Lookbook ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}

            {/* DỊCH VỤ & BẢO ĐẢM GIAO DỊCH */}
            <div className="rounded-2xl border border-stone-200 bg-white p-3.5 space-y-2.5 text-left text-[11px] shadow-2xs">
              <div className="flex items-center gap-2 text-[#183A2D] font-bold uppercase tracking-wider text-[10.5px]">
                <ShieldCheck size={14} className="text-emerald-700" /> Quyền Lợi & Bảo Đảm Giao Dịch
              </div>
              <ul className="space-y-1.5 text-stone-600 leading-relaxed font-light">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-700 shrink-0 mt-0.5" />
                  <span>Tiền cọc được bảo chứng an toàn và hoàn trả ngay khi xong đơn.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <RotateCcw size={12} className="text-emerald-700 shrink-0 mt-0.5" />
                  <span>Hỗ trợ đổi mẫu hoặc đổi size nhanh nếu không vừa vặn.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <PhoneCall size={12} className="text-emerald-700 shrink-0 mt-0.5" />
                  <span>Đội ngũ CSKH hỗ trợ trực tiếp 24/7 qua Hotline & Zalo.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* 👗 RIGHT COLUMN: EDITORIAL DETAILS & BOOKING (7 Cols) */}
          <div className="lg:col-span-7 space-y-5 text-left">
            
            {/* Header: Closet Owner & Province */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-stone-500 font-ui">
                <MapPin size={13} className="text-emerald-700 shrink-0" />
                <span>{product.province || "Toàn quốc"}</span>
                <span className="text-stone-300">•</span>
                <span className="text-emerald-800 font-medium">Hỗ trợ giao gấp 2H</span>
              </div>

              <Link 
                href={`/closet/${product.userId || 'official'}`} 
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#183A2D] bg-[#E8F1E6] hover:bg-[#D8E8D5] px-3 py-1 rounded-full transition-colors border border-[#C6DFC4]"
              >
                <span>Tủ đồ @{product.ownerRealName || 'CLOOP'}</span>
                <CheckCircle2 size={11} className="text-emerald-700" />
              </Link>
            </div>

            {/* Product Title (Editorial Serif Typography) */}
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-[#142A1E] leading-tight">
                {product.title || product.name}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1 text-amber-600 font-bold">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={13} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-stone-600 font-mono text-[11px]">4.9 (98% hài lòng)</span>
                </div>
                <span className="text-stone-300">•</span>
                <LiveViewerBadge />
              </div>
            </div>

            {/* TRANSACTION MODE SWITCHER (THUÊ vs SỞ HỮU) */}
            {product.isRental && product.isSale && (
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-stone-200/70 border border-stone-300/80">
                <button 
                  type="button"
                  onClick={() => setTransactionMode("RENT")}
                  className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    transactionMode === "RENT" 
                      ? "bg-white text-[#183A2D] shadow-xs ring-1 ring-black/5" 
                      : "text-stone-600 hover:text-[#183A2D]"
                  }`}
                >
                  <Shirt size={14} /> Thuê Trang Phục
                </button>

                <button 
                  type="button"
                  disabled={hasActiveRentals}
                  onClick={() => setTransactionMode("SELL")}
                  className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    hasActiveRentals 
                      ? "opacity-40 cursor-not-allowed text-stone-400" 
                      : transactionMode === "SELL" 
                        ? "bg-white text-[#183A2D] shadow-xs ring-1 ring-black/5" 
                        : "text-stone-600 hover:text-[#183A2D]"
                  }`}
                >
                  <ShoppingBag size={14} /> Sở Hữu Món Đồ
                </button>
              </div>
            )}

            {/* PRICE CARD */}
            <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-2xs space-y-1">
              <div className="text-[10.5px] font-bold text-stone-500 uppercase tracking-wider font-ui">
                {transactionMode === "RENT" ? "Chi phí thuê tuần hoàn" : "Giá sở hữu trọn đời"}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-mono font-black text-[#183A2D]">
                  {transactionMode === "RENT" 
                    ? `${product.rentalPrice?.toLocaleString()}đ` 
                    : `${product.salePrice?.toLocaleString()}đ`
                  }
                </span>
                {transactionMode === "RENT" && (
                  <span className="text-xs text-stone-500 font-medium">/ ngày (tiết kiệm 90% so với mua mới)</span>
                )}
              </div>
            </div>

            {/* 📋 CHIC BENTO GRID: ĐẶC TÍNH SẢN PHẨM & CHỈ SỐ VỪA VẶN */}
            <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
              
              {/* Specs Grid */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 pb-2 border-b border-stone-100 flex items-center gap-1.5">
                  <Shirt size={13} className="text-emerald-700" /> Đặc tính trang phục
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-stone-600 uppercase font-semibold">Kích cỡ</span>
                    <p className="font-bold text-[#142A1E] text-sm">{product.size || "FreeSize"}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-stone-600 uppercase font-semibold">Tình trạng</span>
                    <p className="font-bold text-[#142A1E] text-sm">{product.condition || "Tuyệt vời (98%)"}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-stone-600 uppercase font-semibold">Màu sắc</span>
                    <p className="font-bold text-[#142A1E] text-sm">{product.color || "Tiêu chuẩn"}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-stone-600 uppercase font-semibold">Chất liệu</span>
                    <p className="font-bold text-[#142A1E] text-sm">{product.material || "Cao cấp"}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-stone-600 uppercase font-semibold">Thương hiệu</span>
                    <p className="font-bold text-[#142A1E] text-sm">{product.brand || "Thiết kế tuyển chọn"}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-stone-600 uppercase font-semibold">Dịp phù hợp</span>
                    <p className="font-bold text-[#142A1E] text-sm">{product.occasion || "Đi tiệc, Dạo phố"}</p>
                  </div>
                </div>
              </div>

              {/* Fit & Measurements */}
              <div className="pt-2 border-t border-stone-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 pb-2 flex items-center gap-1.5">
                  <Ruler size={13} className="text-emerald-700" /> Chỉ số vóc dáng gợi ý
                </h3>
                <div className="space-y-1.5 pt-1 text-xs text-stone-700">
                  {(product.targetHeight || product.targetWeight) ? (
                    <div className="flex flex-wrap items-center gap-3">
                      {product.targetHeight && (
                        <span className="bg-stone-100 px-2.5 py-1 rounded-lg">Chiều cao: <strong className="text-[#183A2D]">{product.targetHeight} cm</strong></span>
                      )}
                      {product.targetWeight && (
                        <span className="bg-stone-100 px-2.5 py-1 rounded-lg">Cân nặng: <strong className="text-[#183A2D]">{product.targetWeight} kg</strong></span>
                      )}
                    </div>
                  ) : null}

                  {(product.chest || product.waist || product.hips) ? (
                    <div className="bg-stone-100 px-2.5 py-1.5 rounded-lg flex items-center gap-2">
                      <span className="font-semibold text-stone-600">Số đo 3 vòng:</span>
                      <span className="font-mono font-bold text-[#183A2D]">
                        {product.chest ? `V1: ${product.chest} ` : ''} 
                        {product.waist ? `• V2: ${product.waist} ` : ''} 
                        {product.hips ? `• V3: ${product.hips}` : ''}
                      </span>
                    </div>
                  ) : null}

                  {!product.targetHeight && !product.targetWeight && !product.chest && !product.waist && !product.hips && (
                    <p className="text-[11px] text-stone-600 italic">Trang phục thiết kế phom chuẩn, dễ mặc theo size {product.size || "FreeSize"}.</p>
                  )}
                </div>
              </div>
            </div>

            {/* 💬 MÔ TẢ TỪ CHỦ TỦ ĐỒ */}
            <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-2xs space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Lời nhắn từ chủ tủ đồ
              </div>
              <p className="text-xs text-stone-600 leading-relaxed font-light">
                {product.description || "Trang phục tuyển chọn được gìn giữ cẩn thận, phom dáng tôn nét đẹp tự nhiên và thanh lịch cho người mặc."}
              </p>
            </div>

            {/* 🟢 HỘP ĐẶT THUÊ & THANH TOÁN (RentalBookingBox) */}
            <div className="pt-2">
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
      </div>
    </main>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col justify-center items-center min-h-[70vh] bg-[#FAF8F3] space-y-4">
        <div className="w-10 h-10 border-3 border-[#183A2D] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold uppercase tracking-widest text-[#183A2D] font-ui">
          Đang khởi tạo luồng an toàn...
        </p>
      </div>
    }>
      <ProductDetailContent />
    </Suspense>
  );
}