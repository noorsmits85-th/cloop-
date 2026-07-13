"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Cropper from "react-easy-crop";
import { Heart } from "lucide-react"; // 🔐 ĐÃ THÊM: Import biểu tượng trái tim hoài niệm cao cấp

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ProductSpecifications {
  name: string; size: "S" | "M" | "L" | "XL"; targetHeight: string; targetWeight: string;
  bust?: string; waist?: string; hips?: string; color: string; material: string;
  condition: string; province: string; ward: string;
  originalPrice: number; 
  ownerPhone: string;
  occasion: string; // Cấu trúc thuộc tính dịp/phong cách phù hợp
}

interface ListingConfig {
  isRental: boolean; rentalPrice: number; depositPercent: number;
  isSale: boolean; salePrice: number; isRecycle: boolean; greenPoints: number;
}

interface ImageItem { file: File; previewUrl: string; }

// Hàm cắt ảnh theo vùng crop, xuất ra Blob đã nén
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
    condition: "95%", province: "Nghệ An", ward: "Phường Bến Thủy",
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

  // States quản lý hàng đợi và thao tác Crop ảnh bổ sung
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [currentCropSrc, setCurrentCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // States nâng cấp cho phân hệ cấu trúc Blog/Journal (Mục 06)
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
      setStoryWarning("⚠️ Câu chuyện có vẻ chứa số điện thoại, Zalo, FB, IG hoặc link — nội dung này sẽ không được đăng lên Blog để đảm bảo an toàn.");
    } else {
      setStoryWarning("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldsToScan = [product.name, product.material, product.color, product.province, product.ward];
    for (const field of fieldsToScan) {
      if (checkContactInfoLeak(field)) {
        alert("Thông báo bảo mật: Để bảo vệ an toàn giao dịch, vui lòng không cung cấp thông tin liên hệ cá nhân trực tiếp tại các trường văn bản công khai.");
        return;
      }
    }
    if (images.length === 0) {
      alert("Yêu cầu hệ thống: Vui lòng cung cấp tối thiểu 1 hình ảnh thực tế của sản phẩm.");
      return;
    }

    setIsSubmitting(true);

    try {
      let finalUserId = null;
      if (typeof window !== "undefined") {
        finalUserId = localStorage.getItem("cloop_user_id");
      }

      if (!finalUserId) {
        alert("Yêu cầu hệ thống: Bạn ơi, vui lòng đăng nhập tài khoản thông qua cổng ID Xanh trước để xác định đúng chủ tủ đồ đăng bài nhé! 😊");
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
        if (!response.ok) throw new Error("Tiến trình truyền tải hình ảnh lên Cloudinary gặp sự cố.");
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
            const { error: blogError } = await supabase.from("BlogPost").insert([{
              title: `Kỷ niệm cùng ${insertedProduct.title}`,
              content: storyText.trim(),
              coverImage: uploadedImageUrls[0] || null,
              productId: insertedProduct.id,
              userId: finalUserId,
            }]);
            if (blogError) console.error("Lỗi hệ thống tự động đồng bộ hóa lên Blog:", blogError.message);
          } else {
            console.warn("Nội dung câu chuyện dính dấu hiệu leak thông tin liên hệ, hủy đồng bộ lên trang Blog.");
          }
        }
      }

      alert("Sản phẩm và cấu hình luồng giá tuần hoàn đã được lưu trữ thành công.");
      router.push("/my-closet");

    } catch (error: any) {
      alert(`Lỗi tiến trình vận hành: ${error.message || error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7F5] py-12 px-4 sm:px-6 lg:px-8 text-stone-800 tracking-tight">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-emerald-100 shadow-md overflow-hidden">
        
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-8 text-white text-left">
          <div className="mb-4">
            <Link href="/my-closet" className="inline-flex items-center text-[11px] uppercase tracking-widest text-emerald-200 hover:text-white transition-all font-medium">
              ← Quay lại tủ đồ của bạn
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-wide uppercase text-white">Cập nhật Tủ đồ Tuần hoàn</h1>
          <p className="text-emerald-100/80 text-xs mt-1.5 font-normal tracking-normal">Phát triển vòng đời sản phẩm thông qua mô hình đa phương thức giao dịch xanh bền vững.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-10 text-left">
          
          <section className="space-y-4">
            <div className="border-b-2 border-emerald-800/10 pb-2">
              <h2 className="text-[12px] font-bold uppercase tracking-widest text-emerald-800">01 / Hình ảnh thực tế sản phẩm</h2>
            </div>
            <div 
              className="border border-dashed border-emerald-200 rounded-2xl p-8 bg-[#FBFDFB] hover:border-emerald-600 hover:bg-emerald-50/10 transition-all cursor-pointer text-center space-y-1.5"
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageChange} />
              <p className="text-xs font-semibold text-emerald-900">Chọn tệp tin hình ảnh từ thiết bị</p>
              <p className="text-[11px] text-stone-400">Khuyến nghị tải lên từ 1 đến 5 góc chụp độ phân giải cao để tăng tỷ lệ kết nối</p>
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-emerald-100 group shadow-sm">
                    <img src={img.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button" onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                      className="absolute top-1 right-1 bg-emerald-900/90 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-bold shadow-md"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="border-b-2 border-emerald-800/10 pb-2">
              <h2 className="text-[12px] font-bold uppercase tracking-widest text-emerald-800">02 / Thông tin sản phẩm cố định</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-emerald-800/80 uppercase tracking-wider mb-1.5">Tên sản phẩm / Tên món đồ</label>
                <input type="text" required className="w-full px-4 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-emerald-600 bg-[#FCFCFB]" value={product.name} onChange={(e) => setProduct({...product, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-emerald-800/80 uppercase tracking-wider mb-1.5">Phân loại kích cỡ (Size)</label>
                <select className="w-full px-3 py-3 rounded-xl border border-stone-200 bg-[#FCFCFB] text-xs focus:outline-none focus:border-emerald-600 text-stone-800" value={product.size} onChange={(e) => setProduct({...product, size: e.target.value as any})}>
                  <option value="S">Size S</option><option value="M">Size M</option><option value="L">Size L</option><option value="XL">Size XL</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-emerald-800/80 uppercase tracking-wider mb-1.5">Độ mới thực tế</label>
                <input type="text" required className="w-full px-4 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-emerald-600 bg-[#FCFCFB]" value={product.condition} onChange={(e) => setProduct({...product, condition: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-emerald-800/80 uppercase tracking-wider mb-1.5">Cấu trúc chất liệu</label>
                <input type="text" required className="w-full px-4 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-emerald-600 bg-[#FCFCFB]" value={product.material} onChange={(e) => setProduct({...product, material: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-emerald-800/80 uppercase tracking-wider mb-1.5">Màu sắc chủ đạo</label>
                <input type="text" required className="w-full px-4 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-emerald-600 bg-[#FCFCFB]" value={product.color} onChange={(e) => setProduct({...product, color: e.target.value})} />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-800/80 uppercase tracking-wider mb-1.5">Dịp / Phong cách phù hợp</label>
                <select className="w-full px-3 py-3 rounded-xl border border-stone-200 bg-[#FCFCFB] text-xs focus:outline-none focus:border-emerald-600 text-stone-800" value={product.occasion} onChange={(e) => setProduct({...product, occasion: e.target.value})}>
                  <option value="Dạ hội">Dạ hội</option>
                  <option value="Đi biển">Đi biển</option>
                  <option value="Lễ hội">Lễ hội</option>
                  <option value="Áo dài">Áo dài</option>
                  <option value="Dạo phố">Dạo phố</option>
                  <option value="Công sở">Công sở</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-emerald-800/80 uppercase tracking-wider mb-1.5">Giá gốc mua mới ngoài Store (VNĐ) — Cơ sở tính toán % Tiết kiệm cho Sinh viên</label>
                <input type="number" required className="w-full px-4 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-emerald-600 bg-[#FCFCFB] font-mono font-bold text-emerald-950" value={product.originalPrice} onChange={(e) => setProduct({...product, originalPrice: Number(e.target.value)})} />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="border-b-2 border-emerald-800/10 pb-2">
              <h2 className="text-[12px] font-bold uppercase tracking-widest text-emerald-800">03 / Thông số nhân trắc học khuyến nghị</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-emerald-800/80 uppercase tracking-wider mb-1.5">Chiều cao (cm) *</label>
                <input type="number" required className="w-full px-3 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-emerald-600 bg-[#FCFCFB] font-mono" value={product.targetHeight} onChange={(e) => setProduct({...product, targetHeight: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-emerald-800/80 uppercase tracking-wider mb-1.5">Cân nặng (kg) *</label>
                <input type="number" required className="w-full px-3 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-emerald-600 bg-[#FCFCFB] font-mono" value={product.targetWeight} onChange={(e) => setProduct({...product, targetWeight: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Vòng ngực (cm)</label>
                <input type="number" className="w-full px-3 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-emerald-600 bg-[#FCFCFB] font-mono" value={product.bust} onChange={(e) => setProduct({...product, bust: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Vòng eo (cm)</label>
                <input type="number" className="w-full px-3 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-emerald-600 bg-[#FCFCFB] font-mono" value={product.waist} onChange={(e) => setProduct({...product, waist: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Vòng mông (cm)</label>
                <input type="number" className="w-full px-3 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-emerald-600 bg-[#FCFCFB] font-mono" value={product.hips} onChange={(e) => setProduct({...product, hips: e.target.value})} />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="border-b-2 border-emerald-800/10 pb-2">
              <h2 className="text-[12px] font-bold uppercase tracking-widest text-emerald-800">04 / Địa điểm điều phối & Bảo mật thông tin</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-emerald-800/80 uppercase tracking-wider mb-1.5">Tỉnh / Thành phố</label>
                <input type="text" required className="w-full px-4 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-emerald-600 bg-[#FCFCFB]" value={product.province} onChange={(e) => setProduct({...product, province: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-emerald-800/80 uppercase tracking-wider mb-1.5">Xã / Phường hiển thị chung</label>
                <input type="text" required className="w-full px-4 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-emerald-600 bg-[#FCFCFB]" value={product.ward} onChange={(e) => setProduct({...product, ward: e.target.value})} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-emerald-800/80 uppercase tracking-wider mb-1.5">Số điện thoại chủ tủ đồ liên hệ (Bảo mật - Chỉ hiện sau khi quét QR) *</label>
                <input type="tel" required placeholder="Nhập SĐT chính chủ để khách kết nối nhận đồ..." className="w-full px-4 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-emerald-600 bg-[#FCFCFB] font-mono font-bold" value={product.ownerPhone} onChange={(e) => setProduct({...product, ownerPhone: e.target.value})} />
              </div>

              <div className="md:col-span-2 bg-[#F6FAF7] border border-emerald-600/10 p-5 rounded-2xl text-xs text-emerald-950 leading-relaxed font-normal shadow-sm">
                <span className="font-bold text-emerald-900 block mb-1">Lưu ý về quyền riêng tư và an toàn giao dịch:</span> 
                Để bảo vệ quyền lợi cá nhân và tối ưu hóa trải nghiệm an toàn trước khi giao dịch chính thức bắt đầu, CLOOP xin phép tạm ẩn thông tin liên hệ trực tiếp và địa chỉ số nhà cụ thể của bạn trên bài đăng công khai. Hệ thống sẽ tự động kích hoạt và hiển thị đầy đủ các thông tin định danh này ngay sau khi quy trình ký quỹ bảo chứng được xác nhận thành công. Rất mong bạn thông cảm cho giải pháp bảo mật kỹ lưỡng này của chúng mình.
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="border-b-2 border-emerald-800/10 pb-2">
              <h2 className="text-[12px] font-bold uppercase tracking-widest text-emerald-800">05 / Thiết lập mô hình giao dịch tuần hoàn</h2>
            </div>
            <div className="space-y-4">
              <div className={`p-6 rounded-2xl border transition-all ${listings.isRental ? "bg-[#F4F9F6] border-emerald-600/30 shadow-sm" : "bg-white border-stone-200"}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" id="rental" className="w-4 h-4 text-emerald-700 border-stone-300 rounded focus:ring-emerald-600 cursor-pointer" checked={listings.isRental} onChange={(e) => setListings({...listings, isRental: e.target.checked})} />
                    <label htmlFor="rental" className="font-bold text-emerald-900 text-xs uppercase tracking-wider cursor-pointer select-none">Kích hoạt nghiệp vụ cho thuê (Rental Service)</label>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-50 text-emerald-900">Cốt lõi</span>
                </div>
                {listings.isRental && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">Giá thuê đề xuất (VNĐ / Ngày)</label>
                      <input type="number" className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-emerald-600 bg-white font-mono" value={listings.rentalPrice} onChange={(e) => setListings({...listings, rentalPrice: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">Số tiền đặt cọc bảo chứng rủi ro món đồ (VNĐ)</label>
                      <input type="number" className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-emerald-600 bg-white font-mono" value={listings.depositPercent} onChange={(e) => setListings({...listings, depositPercent: Number(e.target.value)})} />
                    </div>
                  </div>
                )}
              </div>

              <div className={`p-6 rounded-2xl border transition-all ${listings.isSale ? "bg-blue-50/20 border-blue-600/20 shadow-sm" : "bg-white border-stone-200"}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" id="sale" className="w-4 h-4 text-blue-700 border-stone-300 rounded focus:ring-blue-600 cursor-pointer" checked={listings.isSale} onChange={(e) => setListings({...listings, isSale: e.target.checked})} />
                    <label htmlFor="sale" className="font-bold text-blue-900 text-xs uppercase tracking-wider cursor-pointer select-none">Kích hoạt nghiệp vụ chuyển nhượng (Sale Service)</label>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-blue-100 text-blue-800">Thanh lý</span>
                </div>
                {listings.isSale && (
                  <div className="mt-2 max-w-xs">
                    <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">Chi phí chuyển nhượng dứt điểm (VNĐ)</label>
                    <input type="number" className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-mono" value={listings.salePrice} onChange={(e) => setListings({...listings, salePrice: Number(e.target.value)})} />
                  </div>
                )}
              </div>

              <div className={`p-6 rounded-2xl border transition-all ${listings.isRecycle ? "bg-teal-50/20 border-teal-600/20 shadow-sm" : "bg-white border-stone-200"}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" id="recycle" className="w-4 h-4 text-teal-700 border-stone-300 rounded focus:ring-teal-600 cursor-pointer" checked={listings.isRecycle} onChange={(e) => setListings({...listings, isRecycle: e.target.checked})} />
                    <label htmlFor="recycle" className="font-bold text-teal-900 text-xs uppercase tracking-wider cursor-pointer select-none">Ký gửi trạm thu hồi & Tái chế (Lifecycle End)</label>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-teal-100 text-teal-800">ESG Bền vững</span>
                </div>
                {listings.isRecycle && (
                  <div className="mt-2 text-xs text-stone-600 bg-[#FAFAFA] p-4 rounded-xl border border-stone-200/50 leading-relaxed font-normal">
                    Khi sản phẩm kết thúc chu kỳ khai thác thương mại, hệ thống hỗ trợ thu hồi tự động để chuyển giao đến mạng lưới đối tác Upcycle địa phương. Bạn sẽ tích lũy ngay <span className="font-bold text-emerald-900 font-mono">{listings.greenPoints} Green Points</span> nhằm quy đổi các đặc quyền ưu đãi trên hệ thống.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 🌿 NÂNG CẤP MỤC 06: PHÂN HỆ ĐỒNG BỘ CÂU CHUYỆN LÊN BLOG/JOURNAL (TÙY CHỌN) */}
          <section className="space-y-4">
            <div className="border-b-2 border-emerald-800/10 pb-2">
              <h2 className="text-[12px] font-bold uppercase tracking-widest text-emerald-800">06 / Chia sẻ câu chuyện truyền cảm hứng (Tùy chọn)</h2>
            </div>
            <div className={`p-6 rounded-2xl border transition-all ${hasStory ? "bg-[#F4F9F6] border-emerald-600/30 shadow-sm" : "bg-white border-stone-200"}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3 w-full">
                  <input 
                    type="checkbox" 
                    id="hasStory" 
                    className="w-4 h-4 text-emerald-700 border-stone-300 rounded focus:ring-emerald-600 cursor-pointer" 
                    checked={hasStory} 
                    onChange={(e) => setHasStory(e.target.checked)} 
                  />
                  {/* ✨ ĐÃ SỬA: Thay thế icon lấp lánh và văn bản kỹ thuật cũ sang phom hoài niệm, đầy cảm xúc */}
                  <label htmlFor="hasStory" className="font-bold text-emerald-900 text-xs uppercase tracking-wider cursor-pointer select-none flex items-center gap-2">
                    <Heart size={13} strokeWidth={2.5} className="text-stone-600 fill-stone-100 shrink-0" />
                    <span>Thổi hồn vào trang phục • Kể câu chuyện kỷ niệm gắn liền với bộ quần áo của bạn</span>
                  </label>
                </div>
              </div>

              {hasStory && (
                <div className="space-y-3 animate-fadeIn">
                  <label className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                    Nhật ký / Kỷ niệm ngắn về bộ quần áo:
                  </label>
                  <textarea
                    value={storyText}
                    onChange={handleStoryChange}
                    placeholder="Chiếc váy này đã cùng mình lưu giữ những khoảnh khắc tuyệt vời tại..."
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-emerald-600 bg-white text-stone-700 h-28 resize-none leading-relaxed"
                  />
                  {storyWarning && (
                    <p className="text-xs text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100 leading-relaxed font-normal">
                      {storyWarning}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          <div className="pt-6 border-t border-stone-100">
            <button
              type="submit" disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-emerald-700 to-emerald-800 text-white font-semibold py-4 rounded-xl hover:from-emerald-800 hover:to-emerald-950 hover:shadow-md transition-all active:scale-[0.99] text-xs uppercase tracking-widest disabled:opacity-50"
            >
              {isSubmitting ? "Đang khóa đồng bộ hóa cơ sở dữ liệu..." : "Phát hành sản phẩm lên CLOOP Network"}
            </button>
          </div>

        </form>
      </div>

      {/* Giao diện Overlay Modal hỗ trợ cắt ảnh (Crop) tỉ lệ 3:4 chuẩn mực */}
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
            className="w-full max-w-md mt-4 accent-emerald-600" 
          />
          <div className="flex gap-3 mt-4">
            <button 
              type="button" 
              onClick={handleCropSkip} 
              className="px-5 py-2.5 bg-stone-700 text-white text-xs font-bold rounded-full transition-all hover:bg-stone-600 active:scale-95"
            >
              Bỏ qua ảnh này
            </button>
            <button 
              type="button" 
              onClick={handleCropConfirm} 
              className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-full transition-all hover:bg-emerald-500 active:scale-95"
            >
              Xác nhận cắt ảnh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}