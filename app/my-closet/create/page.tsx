"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Cropper from "react-easy-crop";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, Shirt, Info, MapPin, BadgePercent, ShieldAlert } from "lucide-react"; 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600";

interface ProductSpecifications {
  name: string; size: "S" | "M" | "L" | "XL"; targetHeight: string; targetWeight: string;
  bust?: string; waist?: string; hips?: string; color: string; material: string;
  condition: string; province: string; ward: string;
  originalPrice: number; 
  ownerPhone: string;
  occasion: string; 
}

interface ListingConfig {
  isRental: boolean; rentalPrice: number; depositPercent: number;
  isSale: boolean; salePrice: number; isRecycle: boolean; greenPoints: number;
}

interface ImageItem { file: File; previewUrl: string; }

async function getCroppedImageBlob(imageSrc: string, cropPixels: any, maxSize = 1200, quality = 0.75): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const scale = Math.min(1, maxSize / Math.max(cropPixels.width, cropPixels.height));
  canvas.width = cropPixels.width * scale;
  canvas.height = cropPixels.height * scale;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
    0, 0, canvas.width, canvas.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/jpeg", quality);
  });
}

export default function CreateProductListingPage() {
  const router = useRouter();
  
  const [product, setProduct] = useState<ProductSpecifications>({
    name: "", size: "M", targetHeight: "", targetWeight: "",
    bust: "", waist: "", hips: "", color: "", material: "",
    condition: "Mới 95%", province: "Nghệ An", ward: "Phường Bến Thủy",
    originalPrice: 500000, 
    ownerPhone: "",
    occasion: "Dạo phố",
  });

  const [listings, setListings] = useState<ListingConfig>({
    isRental: true, rentalPrice: 150000, depositPercent: 200000, 
    isSale: false, salePrice: 850000, isRecycle: false, greenPoints: 100,
  });

  const [images, setImages] = useState<ImageItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [currentCropSrc, setCurrentCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const [hasStory, setHasStory] = useState(false);
  const [storyText, setStoryText] = useState("");
  const [storyWarning, setStoryWarning] = useState("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files).slice(0, 5 - images.length);
      setCropQueue((prev) => [...prev, ...fileArray]);
    }
  };

  useEffect(() => {
    if (!currentCropSrc && cropQueue.length > 0) {
      const nextFile = cropQueue[0];
      const url = URL.createObjectURL(nextFile);
      setCurrentCropSrc(url);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
  }, [cropQueue, currentCropSrc]);

  const handleCropConfirm = async () => {
    if (!currentCropSrc || !croppedAreaPixels) return;
    try {
      const blob = await getCroppedImageBlob(currentCropSrc, croppedAreaPixels);
      const croppedFile = new File([blob], `cropped_${Date.now()}.jpg`, { type: "image/jpeg" });

      setImages((prev) => [...prev, { file: croppedFile, previewUrl: URL.createObjectURL(croppedFile) }]);
    } catch (error) {
      console.error("Xử lý cắt/nén hình ảnh thất bại:", error);
    } finally {
      URL.revokeObjectURL(currentCropSrc);
      setCurrentCropSrc(null);
      setCropQueue((prev) => prev.slice(1));
    }
  };

  const handleCropSkip = () => {
    if (currentCropSrc) URL.revokeObjectURL(currentCropSrc);
    setCurrentCropSrc(null);
    setCropQueue((prev) => prev.slice(1));
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => {
      const updated = prev.filter((_, index) => index !== indexToRemove);
      URL.revokeObjectURL(prev[indexToRemove].previewUrl);
      return updated;
    });
  };

  const checkContactInfoLeak = (text: string): boolean => {
    if (!text) return false;
    const normalized = text.replace(/[\s.\-]/g, "");
    const digitSequenceRegex = /\d{9,11}/;
    const urlRegex = /https?:\/\/[^\s]+|www\.[^\s]+|\.(com|vn|net|me)\b/i;
    const platformRegex = /\bzalo\b|\bfacebook\b|\binstagram\b|\btelegram\b|\bshopee\b|\bfb\b|\big\b|zalo\.me|m\.me/i;
    return digitSequenceRegex.test(normalized) || urlRegex.test(text) || platformRegex.test(text);
  };

  const handleStoryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setStoryText(val);
    if (checkContactInfoLeak(val)) {
      setStoryWarning("⚠️ Câu chuyện có vẻ chứa số điện thoại, Zalo, FB hoặc link — nội dung này sẽ tạm ẩn trên Blog chung để bảo vệ quyền riêng tư của cậu nhen.");
    } else {
      setStoryWarning("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldsToScan = [product.name, product.material, product.color, product.province, product.ward];
    for (const field of fieldsToScan) {
      if (checkContactInfoLeak(field)) {
        alert("Thông báo bảo mật: Để bảo vệ an toàn giao dịch công bằng, vui lòng không cung cấp thông tin liên hệ trực tiếp tại các ô văn bản công khai nhen cậu!");
        return;
      }
    }
    if (images.length === 0) {
      alert("Yêu cầu hệ thống: Hãy tải lên ít nhất 1 bức ảnh thật sắc nét của món đồ nhen Trang!");
      return;
    }

    setIsSubmitting(true);

    try {
      let finalUserId = null;
      if (typeof window !== "undefined") {
        finalUserId = localStorage.getItem("cloop_user_id");
      }

      if (!finalUserId) {
        alert("Yêu cầu hệ thống: Bạn ơi, vui lòng đăng nhập thông qua cổng ID Xanh trước để xác định đúng chủ nhân tủ đồ nhen! 😊");
        setIsSubmitting(false);
        return;
      }

      const uploadPromises = images.map(async (imgItem) => {
        const formData = new FormData();
        formData.append("file", imgItem.file);
        formData.append("upload_preset", "cloop_uploads");

        const response = await fetch("https://api.cloudinary.com/v1_1/dfqbxmgqi/image/upload", { 
          method: "POST", 
          body: formData 
        });
        if (!response.ok) throw new Error("Tiến trình truyền tải hình ảnh lên hệ thống gặp sự cố.");
        const imageData = await response.json();
        return imageData.secure_url;
      });

      const uploadedImageUrls = await Promise.all(uploadPromises);
      const formattedCondition = product.condition.includes("95") ? "GOOD" : "EXCELLENT";

      const { data: insertedProduct, error: productError } = await supabase
        .from("products")
        .insert([{
          title: product.name,
          size: product.size,
          material: product.material,
          color: product.color, 
          condition: formattedCondition,
          province: product.province,
          ward: product.ward,
          specificAddress: `${product.ward}, ${product.province}`,
          category: "UNISEX",
          targetHeight: String(product.targetHeight),
          targetWeight: String(product.targetWeight),
          bust: product.bust || null,
          waist: product.waist || null,
          hips: product.hips || null,
          image_url: uploadedImageUrls[0],
          is_recycle: listings.isRecycle,
          original_price: Number(product.originalPrice),
          userId: finalUserId, 
          owner_phone: product.ownerPhone,
          occasion: product.occasion,
        }])
        .select()
        .single();

      if (productError) {
        alert(`🚨 Chi tiết lỗi cơ sở dữ liệu Supabase:\n- Thông điệp: ${productError.message}`);
        setIsSubmitting(false);
        return;
      }

      if (insertedProduct) {
        if (uploadedImageUrls.length > 0) {
          const imagePayload = uploadedImageUrls.map((url) => ({
            id: crypto.randomUUID(), 
            productId: insertedProduct.id, 
            url: url
          }));
          try {
            await supabase.from("ProductImage").insert(imagePayload);
          } catch (e) { console.error(e); }
        }

        const currentTime = new Date().toISOString();
        const listingsToInsert: any[] = [];

        if (listings.isRental) {
          listingsToInsert.push({
            id: crypto.randomUUID(),
            productId: insertedProduct.id,
            status: "AVAILABLE",
            listingType: "RENT",
            basePrice: Number(listings.rentalPrice),
            deposit: Number(listings.depositPercent), 
            minDays: 3,
            createdAt: currentTime,
            updatedAt: currentTime
          });
        }

        if (listings.isSale) {
          listingsToInsert.push({
            id: crypto.randomUUID(),
            productId: insertedProduct.id,
            status: "AVAILABLE",
            listingType: "SELL", 
            basePrice: Number(listings.salePrice),
            deposit: 0,
            minDays: 0,
            createdAt: currentTime,
            updatedAt: currentTime
          });
        }

        if (listingsToInsert.length > 0) {
          const { error: listErr } = await supabase.from("Listing").insert(listingsToInsert);
          if (listErr) {
            alert(`🚨 LỖI LƯU BẢNG GIÁ:\n${listErr.message}`);
          }
        }

        if (hasStory && storyText.trim() !== "") {
          const isSafe = !checkContactInfoLeak(storyText);
          if (isSafe) {
            // 🟢 ĐÃ ĐỒNG BỘ: Giữ chặt trạng thái PUBLIC và kết nối khóa ngoại khép kín với Blog Diary 3 cột
            await supabase.from("BlogPost").insert([{
              title: `Kỷ niệm cùng ${insertedProduct.title}`,
              content: storyText.trim(),
              coverImage: uploadedImageUrls[0] || null,
              productId: insertedProduct.id, 
              userId: finalUserId,
              status: "PUBLIC",   
              isPinned: false,    
            }]);
          } else {
            console.warn("Nội dung câu chuyện dính dấu hiệu leak thông tin liên hệ, hủy bộ ghim lên trang Blog.");
          }
        }
      }

      alert("Món đồ xinh đẹp của cậu đã được update lên CLOOP Network thành công rồi nhen! ✨");
      router.push("/my-closet");

    } catch (error: any) {
      alert(`Lỗi tiến trình vận hành: ${error.message || error}`);
    // 🔐 ĐÃ VÁ LỖI CÚ PHÁP: Chuyển cụm lỗi tiếng Việt 'final hành:' cũ thành 'finally' sạch bóng lỗi
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-12 px-4 sm:px-6 lg:px-8 text-stone-800 tracking-tight font-sans selection:bg-[#183A2D] selection:text-white">
      <div className="max-w-3xl mx-auto bg-white rounded-[2rem] border-2 border-stone-900/5 shadow-xs overflow-hidden">
        
        {/* BANNER ĐẦU TRANG EDITORIAL LUXURY */}
        <div className="bg-[#183A2D] p-8 text-[#FAF9F6] text-left relative">
          <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#FAF9F6_1px,transparent_1px)] bg-[size:12px_12px] pointer-events-none" />
          <div className="mb-3 relative z-10">
            <Link href="/my-closet" className="inline-flex items-center text-[10px] uppercase tracking-widest text-emerald-300 font-bold hover:text-white transition-all">
              ← Quay lại tủ đồ của cậu
            </Link>
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-wide uppercase flex items-center gap-2 relative z-10">
            <Sparkles size={18} className="text-amber-300 animate-pulse" />
            <span>Cập nhật Tủ đồ Tuần hoàn</span>
          </h1>
          <p className="text-stone-300 text-xs mt-1 font-medium tracking-normal relative z-10">Phát triển vòng đời sản phẩm thông qua mô hình chia sẻ thời trang xanh bền vững cùng giới trẻ.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 sm:p-10 space-y-10 text-left">
          
          {/* KHỐI 1: TẢI HÌNH ẢNH */}
          <section className="space-y-4">
            <div className="border-b-2 border-stone-100 pb-2 flex items-center justify-between">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                <span>01 / Hình ảnh thực tế sản phẩm</span>
                <span className="text-pink-500 font-sans">✦</span>
              </h2>
              <span className="text-[10px] font-bold text-stone-400 font-mono">Tối đa 5 ảnh</span>
            </div>
            <div 
              className="border-2 border-dashed border-stone-200 rounded-2xl p-8 bg-[#FAF9F6]/50 hover:border-pink-400 hover:bg-pink-50/10 transition-all cursor-pointer text-center space-y-1.5 group"
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageChange} />
              <div className="w-10 h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center mx-auto text-stone-500 group-hover:bg-stone-900 group-hover:text-white transition-all">
                <Shirt size={16} />
              </div>
              <p className="text-xs font-bold text-stone-800">Chọn tệp tin hình ảnh từ thiết bị</p>
              <p className="text-[11px] text-stone-400">Tải lên góc chụp sắc nét giúp thuật toán AI nhận diện phong cách nhanh chóng</p>
            </div>
            
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-stone-200 group shadow-2xs">
                    <img src={img.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button" onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                      className="absolute top-1.5 right-1.5 bg-stone-900/80 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-bold shadow-md cursor-pointer transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* KHỐI 2: THÔNG TIN CỐ ĐỊNH */}
          <section className="space-y-4">
            <div className="border-b-2 border-stone-100 pb-2">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                <span>02 / Thông tin sản phẩm cố định</span>
                <span className="text-pink-500 font-sans">✦</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Tên sản phẩm / Tên món đồ</label>
                <input type="text" required placeholder="Ví dụ: Đầm lụa tơ tằm thêu hoa..." className="w-full px-4 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-stone-900 bg-[#FCFCFB]" value={product.name} onChange={(e) => setProduct({...product, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Phân loại kích cỡ (Size)</label>
                <select className="w-full px-3 py-3 rounded-xl border border-stone-200 bg-[#FCFCFB] text-xs focus:outline-none focus:border-stone-900 text-stone-800 cursor-pointer" value={product.size} onChange={(e) => setProduct({...product, size: e.target.value as any})}>
                  <option value="S">Size S</option><option value="M">Size M</option><option value="L">Size L</option><option value="XL">Size XL</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Độ mới thực tế</label>
                <input type="text" required className="w-full px-4 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-stone-900 bg-[#FCFCFB]" value={product.condition} onChange={(e) => setProduct({...product, condition: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Cấu trúc chất liệu</label>
                <input type="text" required placeholder="Ví dụ: Lụa, Tweed, Kha ki..." className="w-full px-4 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-stone-900 bg-[#FCFCFB]" value={product.material} onChange={(e) => setProduct({...product, material: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Màu sắc chủ đạo</label>
                <input type="text" required className="w-full px-4 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-stone-900 bg-[#FCFCFB]" value={product.color} onChange={(e) => setProduct({...product, color: e.target.value})} />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Dịp / Phong cách phù hợp</label>
                <select className="w-full px-3 py-3 rounded-xl border border-stone-200 bg-[#FCFCFB] text-xs focus:outline-none focus:border-stone-900 text-stone-800 cursor-pointer" value={product.occasion} onChange={(e) => setProduct({...product, occasion: e.target.value})}>
                  <option value="Dạo phố">Dạo phố</option>
                  <option value="Tiệc cưới">Tiệc cưới</option>
                  <option value="Dạ hội">Dạ hội</option>
                  <option value="Áo dài">Áo dài</option>
                  <option value="Đi biển">Đi biển</option>
                  <option value="Lễ hội">Lễ hội</option>
                  <option value="Công sở">Công sở</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Giá gốc lúc mua mới ngoài Store (VNĐ) — Cơ sở tự động tính % Tiết kiệm</label>
                <input type="number" required className="w-full px-4 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-stone-900 bg-[#FCFCFB] font-mono font-bold text-stone-900" value={product.originalPrice} onChange={(e) => setProduct({...product, originalPrice: Number(e.target.value)})} />
              </div>
            </div>
          </section>

          {/* KHỐI 3: THÔNG SỐ NHÂN TRẮC HỌC */}
          <section className="space-y-4">
            <div className="border-b-2 border-stone-100 pb-2">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                <span>03 / Thông số số đo khuyến nghị</span>
                <span className="text-pink-500 font-sans">✦</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Chiều cao (cm) *</label>
                <input type="number" required className="w-full px-3 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-stone-900 bg-[#FCFCFB] font-mono" value={product.targetHeight} onChange={(e) => setProduct({...product, targetHeight: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Cân nặng (kg) *</label>
                <input type="number" required className="w-full px-3 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-stone-900 bg-[#FCFCFB] font-mono" value={product.targetWeight} onChange={(e) => setProduct({...product, targetWeight: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Vòng ngực (cm)</label>
                <input type="number" className="w-full px-3 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-stone-900 bg-[#FCFCFB] font-mono" value={product.bust} onChange={(e) => setProduct({...product, bust: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Vòng eo (cm)</label>
                <input type="number" className="w-full px-3 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-stone-900 bg-[#FCFCFB] font-mono" value={product.waist} onChange={(e) => setProduct({...product, waist: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Vòng mông (cm)</label>
                <input type="number" className="w-full px-3 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-stone-900 bg-[#FCFCFB] font-mono" value={product.hips} onChange={(e) => setProduct({...product, hips: e.target.value})} />
              </div>
            </div>
          </section>

          {/* KHỐI 4: ĐỊA ĐIỂM & BẢO MẶT */}
          <section className="space-y-4">
            <div className="border-b-2 border-stone-100 pb-2">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                <span>04 / Địa điểm tủ đồ & Bảo mật thông tin</span>
                <span className="text-pink-500 font-sans">✦</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Tỉnh / Thành phố</label>
                <input type="text" required className="w-full px-4 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-stone-900 bg-[#FCFCFB]" value={product.province} onChange={(e) => setProduct({...product, province: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Xã / Phường hiển thị</label>
                <input type="text" required className="w-full px-4 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-stone-900 bg-[#FCFCFB]" value={product.ward} onChange={(e) => setProduct({...product, ward: e.target.value})} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Số điện thoại liên hệ cá nhân (Chỉ mở khóa hiển thị sau khi ký quỹ đơn hàng) *</label>
                <input type="tel" required placeholder="Nhập số điện thoại của cậu..." className="w-full px-4 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-stone-900 bg-[#FCFCFB] font-mono font-bold text-stone-900" value={product.ownerPhone} onChange={(e) => setProduct({...product, ownerPhone: e.target.value})} />
              </div>

              <div className="md:col-span-2 bg-[#FAF8F2] border border-stone-200/60 p-4 rounded-xl text-stone-600 text-xs leading-relaxed flex items-start gap-2 shadow-3xs">
                <MapPin size={16} className="text-[#183A2D] shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-stone-900 block mb-0.5">Lưu ý bảo chứng quyền riêng tư công khai:</span> 
                  Tên của cậu sẽ luôn hiển thị công khai dạng đường link kết nối trực tiếp đến toàn bộ không gian tủ đồ cá nhân. Tuy nhiên, số điện thoại và thông tin liên hệ cụ thể sẽ được CLOOP tạm ẩn bảo mật nghiêm ngặt và chỉ tự động kích hoạt hiển thị cho đối tác sau khi luồng chuyển khoản ký quỹ được khớp lệnh thành công.
                </div>
              </div>
            </div>
          </section>

          {/* KHỐI 5: MÔ HÌNH TUẦN HOÀN */}
          <section className="space-y-4">
            <div className="border-b-2 border-stone-100 pb-2">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                <span>05 / Thiết lập mô hình giao dịch tuần hoàn</span>
                <span className="text-pink-500 font-sans">✦</span>
              </h2>
            </div>
            <div className="space-y-4">
              {/* PHÂN HỆ CHO THUÊ */}
              <div className={`p-5 rounded-2xl border-2 transition-all ${listings.isRental ? "bg-[#FAFDF9] border-[#183A2D]/20 shadow-3xs" : "bg-white border-stone-200"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" id="rental" className="w-4 h-4 text-stone-900 border-stone-300 rounded focus:ring-stone-900 cursor-pointer" checked={listings.isRental} onChange={(e) => setListings({...listings, isRental: e.target.checked})} />
                    <label htmlFor="rental" className="font-bold text-stone-800 text-xs uppercase tracking-wider cursor-pointer select-none">Kích hoạt nghiệp vụ cho thuê (Rental Service)</label>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-800">Cốt lõi</span>
                </div>
                {listings.isRental && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 animate-fadeIn">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Giá thuê đề xuất (VNĐ / Ngày)</label>
                      <input type="number" className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-stone-900 bg-white font-mono font-bold" value={listings.rentalPrice} onChange={(e) => setListings({...listings, rentalPrice: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Số tiền đặt cọc bảo chứng tài sản (VNĐ)</label>
                      <input type="number" className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-stone-900 bg-white font-mono font-bold" value={listings.depositPercent} onChange={(e) => setListings({...listings, depositPercent: Number(e.target.value)})} />
                    </div>
                  </div>
                )}
              </div>

              {/* PHÂN HỆ CHUYỂN NHƯỢNG */}
              <div className={`p-5 rounded-2xl border-2 transition-all ${listings.isSale ? "bg-blue-50/10 border-blue-600/10 shadow-3xs" : "bg-white border-stone-200"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" id="sale" className="w-4 h-4 text-blue-700 border-stone-300 rounded focus:ring-blue-600 cursor-pointer" checked={listings.isSale} onChange={(e) => setListings({...listings, isSale: e.target.checked})} />
                    <label htmlFor="sale" className="font-bold text-blue-900 text-xs uppercase tracking-wider cursor-pointer select-none">Kích hoạt nghiệp vụ chuyển nhượng (Sale Service)</label>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm bg-blue-50 text-blue-800">Thanh lý</span>
                </div>
                {listings.isSale && (
                  <div className="mt-2 max-w-xs animate-fadeIn">
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Chi phí chuyển nhượng đứt điểm (VNĐ)</label>
                    <input type="number" className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-mono font-bold" value={listings.salePrice} onChange={(e) => setListings({...listings, salePrice: Number(e.target.value)})} />
                  </div>
                )}
              </div>

              {/* PHÂN HỆ TÁI CHẾ */}
              <div className={`p-5 rounded-2xl border-2 transition-all ${listings.isRecycle ? "bg-teal-50/10 border-teal-600/10 shadow-3xs" : "bg-white border-stone-200"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" id="recycle" className="w-4 h-4 text-teal-700 border-stone-300 rounded focus:ring-teal-600 cursor-pointer" checked={listings.isRecycle} onChange={(e) => setListings({...listings, isRecycle: e.target.checked})} />
                    <label htmlFor="recycle" className="font-bold text-teal-900 text-xs uppercase tracking-wider cursor-pointer select-none">Ký gửi trạm thu hồi & Tái chế (Lifecycle End)</label>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm bg-teal-50 text-teal-800">ESG Xanh</span>
                </div>
                {listings.isRecycle && (
                  <div className="mt-2 text-xs text-stone-400 bg-stone-50 p-4 rounded-xl border border-stone-200/50 leading-relaxed font-normal animate-fadeIn flex items-center gap-2">
                    <BadgePercent size={16} className="text-teal-600 shrink-0" />
                    <span>Khi bộ đồ kết thúc chu kỳ khai thác thương mại, hệ thống hỗ trợ thu hồi tự động chuyển giao đến mạng lưới Upcycle Việt Nam. Cậu tích lũy ngay <strong className="text-stone-800 font-mono">{listings.greenPoints} Green Points</strong> đổi voucher ưu đãi.</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 🌿 PHÂN ĐOẠN 6: CHIA SẺ CÂU CHUYỆN LƯU BÚT ĐỒNG BỘ BLOG DIARY KHÔNG GIAN RIÊNG */}
          <section className="space-y-4">
            <div className="border-b-2 border-stone-100 pb-2">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                <span>06 / Ghi chép câu chuyện nhật ký (Tùy chọn)</span>
                <span className="text-pink-500 font-sans">✦</span>
              </h2>
            </div>
            <div className={`p-5 rounded-[2rem] border-2 transition-all duration-300 ${hasStory ? "bg-[#FFFDF9] border-pink-200 shadow-2xs" : "bg-white border-stone-200"}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3 w-full">
                  <input 
                    type="checkbox" 
                    id="hasStory" 
                    className="w-4 h-4 text-pink-500 border-stone-300 rounded focus:ring-pink-400 cursor-pointer" 
                    checked={hasStory} 
                    onChange={(e) => setHasStory(e.target.checked)} 
                  />
                  <label htmlFor="hasStory" className="font-bold text-stone-800 text-xs uppercase tracking-wider cursor-pointer select-none flex items-center gap-1.5">
                    <Heart size={12} strokeWidth={3} className="text-pink-500 fill-pink-100 shrink-0" />
                    <span>Thổi hồn vào phục trang • Kể câu chuyện hồi ức gắn liền với bộ đồ của cậu</span>
                  </label>
                </div>
              </div>

              <AnimatePresence>
                {hasStory && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-wider mb-1">
                      Trang nhật ký / Lưu ký hồi ức thanh xuân:
                    </label>
                    <textarea
                      value={storyText}
                      onChange={handleStoryChange}
                      placeholder="Chiếc váy xinh xắn này đã cùng mình ghi lại những khoảnh khắc rực rỡ nhất tại..."
                      className="w-full px-4 py-3 rounded-xl border-2 border-stone-100 text-xs focus:outline-none focus:border-pink-400 bg-[#FCFBF7] font-serif italic text-stone-700 h-28 resize-none leading-relaxed"
                    />
                    {storyWarning && (
                      <p className="text-xs text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100 leading-relaxed font-normal flex items-center gap-1.5 animate-pulse">
                        <ShieldAlert size={14} className="shrink-0" />
                        <span>{storyWarning}</span>
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* NÚT BẤM KÍCH HOẠT PHÁT HÀNH */}
          <div className="pt-6 border-t border-stone-100">
            <button
              type="submit" disabled={isSubmitting}
              className="w-full bg-stone-900 hover:bg-pink-600 text-white font-bold py-4 rounded-xl hover:shadow-md transition-all duration-300 active:scale-[0.99] text-xs uppercase tracking-widest disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Đang khóa đồng bộ hóa cơ sở dữ liệu..." : "Phát hành sản phẩm lên CLOOP Network"}
            </button>
          </div>

        </form>
      </div>

      {/* GIAO DIỆN MODAL OVERLAY HỖ TRỢ CẮT ẢNH CHUẨN TỶ LỆ 3:4 */}
      {currentCropSrc && (
        <div className="fixed inset-0 z-[999] bg-black/80 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-md h-[400px] bg-black rounded-2xl overflow-hidden">
            <Cropper
              image={currentCropSrc}
              crop={crop}
              zoom={zoom}
              aspect={3 / 4}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
            />
          </div>
          <input 
            type="range" 
            min={1} 
            max={3} 
            step={0.1} 
            value={zoom} 
            onChange={(e) => setZoom(Number(e.target.value))} 
            className="w-full max-w-md mt-4 accent-stone-900 cursor-pointer" 
          />
          <div className="flex gap-3 mt-4">
            <button 
              type="button" 
              onClick={handleCropSkip} 
              className="px-5 py-2.5 bg-stone-700 text-white text-xs font-bold rounded-full transition-all hover:bg-stone-600 active:scale-95 cursor-pointer"
            >
              Bỏ qua ảnh này
            </button>
            <button 
              type="button" 
              onClick={handleCropConfirm} 
              className="px-5 py-2.5 bg-stone-900 text-white text-xs font-bold rounded-full transition-all hover:bg-stone-800 active:scale-95 cursor-pointer"
            >
              Xác nhận cắt ảnh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}