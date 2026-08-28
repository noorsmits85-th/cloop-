"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Cropper from "react-easy-crop";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image"; // 🟢 Đã fix: Trả lại thẻ Image cho Next.js
import { Heart, Sparkles, Shirt, Info, MapPin, BadgePercent, ShieldAlert, Camera, Feather, Quote, ArrowLeft, Leaf } from "lucide-react"; 
import { createProductAction } from "./actions";
const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600";
const PAPER_BG = "https://www.transparenttextures.com/patterns/cream-paper.png";

const SECTION_HEADING_CLASS = "font-sans text-sm font-semibold uppercase tracking-widest text-emerald-900";
const SECTION_NUMBER_CLASS = "font-sans italic text-xl text-emerald-700 font-bold mr-2 opacity-60";


// Hoa lá khô decor nền
const DRIED_LEAF = "https://images.unsplash.com/photo-1621274220349-2e06cb388ea2?q=80&w=500";
const VINTAGE_PAPER = "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?q=80&w=500"; 

interface ProductSpecifications {
  name: string; category: string; size: "S" | "M" | "L" | "XL"; targetHeight: string; targetWeight: string;
  bust?: string; waist?: string; hips?: string; color: string; material: string;
  condition: string; province: string; district: string; ward: string; address: string;
  originalPrice: number; 
  ownerPhone: string;
  occasion: string; 
  description: string;
}

interface ListingConfig {
  isRental: boolean; rentalPrice: number; depositPercent: number;
  isSale: boolean; salePrice: number; isRecycle: boolean; greenPoints: number;
}

interface ImageItem { file: File; previewUrl: string; }
interface UploadedImageMeta {
  url: string;
  storageProvider: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
}

async function getCroppedImageBlob(imageSrc: string, cropPixels: any, maxSize = 1200, quality = 0.75): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image(); // 🟢 Đã fix: Gọi thẳng window.Image để không bị giành tên với next/image
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
    name: "", category: "Dạ hội & Sự kiện", size: "M", targetHeight: "", targetWeight: "",
    bust: "", waist: "", hips: "", color: "", material: "",
    condition: "Mới 95%", province: "Hà Nội", district: "Quận Hoàn Kiếm", ward: "Phường Hàng Đào", address: "",
    originalPrice: 500000, 
    ownerPhone: "",
    occasion: "Dạo phố",
    description: "",
  });

  const [listings, setListings] = useState<ListingConfig>({
    isRental: true, rentalPrice: 150000, depositPercent: 200000, 
    isSale: false, salePrice: 850000, isRecycle: false, greenPoints: 100,
  });

  const [images, setImages] = useState<ImageItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [currentCropSrc, setCurrentCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const [hasStory, setHasStory] = useState(false);
  const [storyText, setStoryText] = useState("");
  const [storyWarning, setStoryWarning] = useState("");

  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiAutofillSuccess, setAiAutofillSuccess] = useState(false);

  const triggerAiAutofill = async (file: File) => {
    try {
      setIsAiScanning(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const res = await fetch("/api/ai-autofill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64Image: base64 }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          const ai = data.data;
          setProduct((prev) => ({
            ...prev,
            name: ai.name || prev.name,
            category: ai.category || prev.category,
            color: ai.color || prev.color,
            material: ai.material || prev.material,
            occasion: ai.occasion || prev.occasion,
            condition: ai.condition || prev.condition,
            size: (ai.size as any) || prev.size,
            description: ai.description || prev.description,
            originalPrice: ai.originalPrice || ai.salePrice || prev.originalPrice,
          }));
          if (ai.rentalPrice) {
            setListings((prev) => ({
              ...prev,
              rentalPrice: ai.rentalPrice || prev.rentalPrice,
              salePrice: ai.salePrice || prev.salePrice,
            }));
          }
          setAiAutofillSuccess(true);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn("AI Auto-fill error:", err);
    } finally {
      setIsAiScanning(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files).slice(0, 5 - images.length);
      setCropQueue((prev) => [...prev, ...fileArray]);
      // Quét AI ngay tấm đầu tiên
      triggerAiAutofill(fileArray[0]);
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
      console.error("Lỗi khi xử lý ảnh:", error);
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
      setStoryWarning("Cậu ơi, câu chuyện có vẻ chứa số điện thoại hoặc link nền tảng khác. Để đảm bảo riêng tư, đoạn này sẽ được làm mờ trên trang chủ nha.");
    } else {
      setStoryWarning("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || submittingRef.current) return;

    const fieldsToScan = [product.name, product.material, product.color, product.province, product.ward];
    for (const field of fieldsToScan) {
      if (checkContactInfoLeak(field)) {
        alert("Cậu nhớ giữ kín thông tin cá nhân ở các mục giới thiệu chung nha. Sân chơi chung cần sự riêng tư một chút nè!");
        return;
      }
    }
    if (images.length === 0) {
      alert("Chưa có ảnh món đồ mất rồi! Cậu dán thêm ít nhất một tấm ảnh thật xinh vào sổ nhé.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      // 1. Upload ảnh
      const uploadPromises = images.map(async (imgItem) => {
        const formData = new FormData();
        formData.append("file", imgItem.file);
        formData.append("folder", "cloop_products");

        const response = await fetch("/api/upload", { 
          method: "POST", 
          body: formData 
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || "Ảnh bị lỗi khi dán vào trang rồi, cậu thử lại nhé.");
        }
        const imageData = await response.json();
        return imageData as UploadedImageMeta;
      });

      const uploadedImages = await Promise.all(uploadPromises);

      // 2. Chuẩn bị payload và gọi Server Action
      const payload = {
        title: product.name,
        category: product.category || "Dạ hội & Sự kiện",
        size: product.size,
        targetHeight: product.targetHeight || undefined,
        targetWeight: product.targetWeight || undefined,
        material: product.material,
        color: product.color,
        condition: product.condition,
        province: product.province,
        ward: product.ward,
        occasion: product.occasion,
        description: product.description || undefined,
        bust: product.bust ? Number(product.bust) : null,
        waist: product.waist ? Number(product.waist) : null,
        hips: product.hips ? Number(product.hips) : null,
        uploadedImages,
        listings,
        storyText: hasStory ? storyText : undefined
      };

      const result = await createProductAction(payload);

      if (!result.success) {
        alert("Lỗi máy chủ rùi: " + result.error);
        setIsSubmitting(false);
        return;
      }

      alert("Món đồ xinh xắn của cậu đã được cất vào tủ CLOOP thành công! ✨");
      router.push("/my-closet");

    } catch (error: any) {
      alert(`Đã xảy ra lỗi nhỏ: ${error.message || error}`);
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  return (
    <main 
      className="min-h-screen py-10 md:py-16 px-4 sm:px-6 relative overflow-x-hidden selection:bg-[#183A2D] selection:text-white font-sans"
      style={{ backgroundColor: "#EBE6DA", backgroundImage: `url(${PAPER_BG})` }}
    >
      <style>{`
        .font-handwriting { font-family: cursive !important; }
        
        .torn-paper {
            background: #FFFDF9;
            box-shadow: 2px 4px 15px rgba(0,0,0,0.05);
            border-radius: 2px 2px 10px 2px;
            border: 1px solid #E9E2D5;
        }

        .washi-tape {
            position: absolute;
            background-color: rgba(220, 205, 175, 0.85);
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            backdrop-filter: blur(2px);
            z-index: 20;
            clip-path: polygon(1% 5%, 100% 0%, 98% 95%, 0% 100%);
        }
        @media (min-width: 768px) {
            .washi-tape { mix-blend-mode: multiply; }
        }

        .polaroid-frame {
            background: #fff;
            padding: 8px 8px 30px 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.02);
            border: 1px solid #E9E2D5;
        }

        .scrapbook-input {
            width: 100%;
            padding: 0.75rem 1rem;
            background: #ffffff;
            border: 1px solid #d1d5db;
            border-radius: 0.25rem;
            font-size: 0.875rem;
            color: #111827;
            transition: all 0.2s;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.02);
        }
        .scrapbook-input::placeholder {
            color: #9ca3af;
        }
        .scrapbook-input:focus {
            outline: none;
            border-color: #059669;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.02), 0 0 0 2px rgba(16, 185, 129, 0.2);
        }

        .blend-multiply {
            filter: grayscale(20%) sepia(30%) contrast(1.1); 
        }
        @media (min-width: 768px) {
            .blend-multiply { mix-blend-mode: multiply; }
        }
      `}</style>

      {/* BACKGROUND ĐỒ HỌA MẶT BÀN */}
      <div className="fixed top-0 left-0 w-[600px] h-[600px] opacity-20 pointer-events-none z-0" style={{ background: "radial-gradient(circle, rgba(107,163,122,0.2) 0%, rgba(245,242,235,0) 70%)" }} />
      <div className="fixed -bottom-10 -left-10 w-[280px] h-[280px] opacity-40 pointer-events-none z-0 blend-multiply -rotate-6">
        <Image src={VINTAGE_PAPER} alt="Vintage paper" fill unoptimized className="object-contain" />
      </div>
      <div className="fixed -top-16 right-0 w-[350px] h-[350px] opacity-50 pointer-events-none z-0 blend-multiply rotate-45 hidden lg:block">
        <Image src={DRIED_LEAF} alt="Dried leaves" fill unoptimized className="object-contain" />
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        
        {/* THANH ĐIỀU HƯỚNG */}
        <div className="mb-6 flex items-center justify-between">
            <Link href="/my-closet" className="inline-flex items-center gap-2 text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors uppercase tracking-wider bg-white/50 px-4 py-2 rounded-full border border-stone-200/50 backdrop-blur-md">
              <ArrowLeft size={14} /> Gấp sổ lại
            </Link>
        </div>

        {/* CONTAINER CHÍNH CỦA SỔ */}
        <div className="torn-paper w-full relative">
          
          {/* HEADER GHI CHÚ */}
          <div className="relative pt-12 pb-8 px-8 sm:px-12 text-center border-b border-[#E9E2D5]/80">
            <div className="washi-tape w-24 h-6 -top-2 left-1/2 -translate-x-1/2 -rotate-1 bg-[#D1C5B4]/80" />
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-[#1C3F30] leading-tight mb-3">
              Gửi gắm món đồ
            </h1>
            <p className="font-handwriting text-xl text-stone-500 max-w-lg mx-auto leading-relaxed">
              "Mỗi chiếc váy, cái áo đều có một câu chuyện riêng. Hãy cùng CLOOP viết tiếp hành trình mới cho người bạn nhỏ này nhé."
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 sm:p-12 space-y-12">
            
            {/* 🤖 AI AUTO-FILL STATUS BANNER */}
            {isAiScanning && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-ui shadow-xs animate-pulse">
                <div className="w-5 h-5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin shrink-0" />
                <div>
                  <p className="font-bold">Trí tuệ nhân tạo CLOOP Vision đang quét ảnh...</p>
                  <p className="text-[11px] text-emerald-700">Tự động nhận diện tên món đồ, màu sắc, chất liệu, dịp và đề xuất giá thuê giúp bạn.</p>
                </div>
              </div>
            )}

            {aiAutofillSuccess && !isAiScanning && (
              <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-ui shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-700 shrink-0" />
                  <div>
                    <p className="font-bold">Đã tự động nhận diện & điền trọn bộ thông số!</p>
                    <p className="text-[11px] text-emerald-700">Bạn chỉ cần kiểm tra lại các thông tin bên dưới và bấm đăng nhé.</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setAiAutofillSuccess(false)} 
                  className="text-stone-400 hover:text-stone-700 text-xs font-bold px-2 py-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* 01: HÌNH ẢNH */}
            <section>
              <div className="flex items-center mb-5 group/heading cursor-default">
                <span className={SECTION_NUMBER_CLASS}>01.</span>
                <h2 className={SECTION_HEADING_CLASS}>Gương mặt thương hiệu</h2>
                <div className="flex-grow h-[1px] bg-emerald-900/10 ml-6 origin-left scale-x-0 group-hover/heading:scale-x-100 transition-transform duration-1000 ease-out" />
              </div>
              
              <div 
                className="border-2 border-dashed border-[#D5C6B1] rounded-sm p-10 bg-[#FAF9F5] hover:bg-[#F4F1EA] transition-all cursor-pointer text-center relative group"
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageChange} />
                <div className="w-12 h-12 rounded-full bg-white border border-[#D5C6B1] flex items-center justify-center mx-auto text-stone-400 group-hover:bg-[#1C3F30] group-hover:text-white transition-all mb-3 shadow-sm">
                  <Camera size={20} />
                </div>
                <p className="font-medium text-lg text-gray-700 mb-1">Chụp ảnh hoặc dán ảnh vào đây</p>
                <p className="text-[11px] text-emerald-800 font-semibold font-sans">Trí tuệ nhân tạo CLOOP sẽ tự động nhìn ảnh và điền hết thông số cho bạn!</p>
              </div>
              
              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  {images.map((img, index) => (
                    <div key={index} className="polaroid-frame relative transform transition-transform hover:-translate-y-1 hover:rotate-1">
                      <div className="w-full aspect-[3/4] bg-stone-100 relative overflow-hidden">
                        <Image src={img.previewUrl} alt="Preview" fill unoptimized className="object-cover" />
                      </div>
                      <button
                        type="button" onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                        className="absolute -top-2 -right-2 bg-red-800 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-[10px] shadow-sm z-10 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 02: THÔNG TIN CƠ BẢN */}
            <section>
              <div className="flex items-center mb-5 group/heading cursor-default">
                <span className={SECTION_NUMBER_CLASS}>02.</span>
                <h2 className={SECTION_HEADING_CLASS}>Giới thiệu đôi nét</h2>
                <div className="flex-grow h-[1px] bg-emerald-900/10 ml-6 origin-left scale-x-0 group-hover/heading:scale-x-100 transition-transform duration-1000 ease-out" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Tên món đồ</label>
                  <input type="text" required placeholder="Ví dụ: Váy hoa nhí mùa hè..." className="scrapbook-input font-medium text-stone-800 placeholder:text-gray-400" value={product.name} onChange={(e) => setProduct({...product, name: e.target.value})} />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Độ mới hiện tại</label>
                  <input type="text" required placeholder="Mới 95%, mặc 1 lần..." className="scrapbook-input" value={product.condition} onChange={(e) => setProduct({...product, condition: e.target.value})} />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Chất liệu chính</label>
                  <input type="text" required placeholder="Lụa, linen, cotton..." className="scrapbook-input" value={product.material} onChange={(e) => setProduct({...product, material: e.target.value})} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Màu sắc</label>
                  <input type="text" required className="scrapbook-input" value={product.color} onChange={(e) => setProduct({...product, color: e.target.value})} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Danh mục sản phẩm</label>
                  <select className="scrapbook-input cursor-pointer" value={product.category} onChange={(e) => setProduct({...product, category: e.target.value})}>
                    <option value="Dạ hội & Sự kiện">Dạ hội & Sự kiện</option>
                    <option value="Tiệc cưới">Tiệc cưới</option>
                    <option value="Áo dài truyền thống">Áo dài truyền thống</option>
                    <option value="Đồ hoài cổ 90s">Đồ hoài cổ 90s</option>
                    <option value="Tối giản">Tối giản</option>
                    <option value="Công sở & Blazer">Công sở & Blazer</option>
                    <option value="Set đồ & Dạo phố">Set đồ & Dạo phố</option>
                    <option value="Túi xách & Phụ kiện">Túi xách & Phụ kiện</option>
                    <option value="Giày & Boots">Giày & Boots</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Phong cách / Dịp</label>
                  <select className="scrapbook-input cursor-pointer" value={product.occasion} onChange={(e) => setProduct({...product, occasion: e.target.value})}>
                    <option value="Dạo phố">Dạo phố</option>
                    <option value="Tiệc cưới">Tiệc cưới</option>
                    <option value="Dạ hội">Dạ hội</option>
                    <option value="Áo dài">Áo dài</option>
                    <option value="Đi biển">Đi biển</option>
                    <option value="Kỷ yếu">Kỷ yếu</option>
                    <option value="Lễ hội">Lễ hội</option>
                    <option value="Công sở">Công sở</option>
                    <option value="Vintage & Hoài cổ">Vintage & Hoài cổ</option>
                    <option value="Tối giản">Tối giản</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Mô tả chi tiết từ chủ đồ</label>
                  <textarea 
                    rows={4} 
                    placeholder="Mô tả form dáng, cảm giác khi mặc, hoặc lưu ý bảo quản..." 
                    className="scrapbook-input text-stone-800 resize-none placeholder:text-gray-400" 
                    value={product.description} 
                    onChange={(e) => setProduct({...product, description: e.target.value})} 
                  />
                </div>


                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Giá mua ban đầu lúc mới (VNĐ)</label>
                  <input type="number" required className="scrapbook-input font-mono font-bold text-stone-800" value={product.originalPrice} onChange={(e) => setProduct({...product, originalPrice: Number(e.target.value)})} />
                  <p className="text-[10px] text-stone-400 mt-1.5 italic font-serif">Để CLOOP giúp cậu tính mức giá thuê hợp lý và % tiết kiệm nhé.</p>
                </div>
              </div>
            </section>

            {/* 03: FORM KÍCH CỠ */}
            <section>
              <div className="flex items-center mb-5 group/heading cursor-default">
                <span className={SECTION_NUMBER_CLASS}>03.</span>
                <h2 className={SECTION_HEADING_CLASS}>Vừa vặn hoàn hảo</h2>
                <div className="flex-grow h-[1px] bg-emerald-900/10 ml-6 origin-left scale-x-0 group-hover/heading:scale-x-100 transition-transform duration-1000 ease-out" />
              </div>
              <div className="bg-[#FAF9F5] p-6 border border-[#E9E2D5] rounded-sm relative">
                <div className="absolute top-3 right-3 opacity-20"><Shirt size={40} /></div>
                
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Size đồ</label>
                  <select className="scrapbook-input cursor-pointer w-full md:w-1/3" value={product.size} onChange={(e) => setProduct({...product, size: e.target.value as any})}>
                    <option value="S">Size S</option><option value="M">Size M</option><option value="L">Size L</option><option value="XL">Size XL</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Cao (cm)*</label><input type="number" required className="scrapbook-input font-mono px-2" value={product.targetHeight} onChange={(e) => setProduct({...product, targetHeight: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Nặng (kg)*</label><input type="number" required className="scrapbook-input font-mono px-2" value={product.targetWeight} onChange={(e) => setProduct({...product, targetWeight: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Ngực (cm)</label><input type="number" className="scrapbook-input font-mono px-2" value={product.bust} onChange={(e) => setProduct({...product, bust: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Eo (cm)</label><input type="number" className="scrapbook-input font-mono px-2" value={product.waist} onChange={(e) => setProduct({...product, waist: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Mông (cm)</label><input type="number" className="scrapbook-input font-mono px-2" value={product.hips} onChange={(e) => setProduct({...product, hips: e.target.value})} /></div>
                </div>
              </div>
            </section>

            {/* 04: ĐỊA ĐIỂM & BẢO MẶT */}
            <section>
              <div className="flex items-center mb-5 group/heading cursor-default">
                <span className={SECTION_NUMBER_CLASS}>04.</span>
                <h2 className={SECTION_HEADING_CLASS}>Tọa độ & trạm gửi</h2>
                <div className="flex-grow h-[1px] bg-emerald-900/10 ml-6 origin-left scale-x-0 group-hover/heading:scale-x-100 transition-transform duration-1000 ease-out" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Tỉnh / Thành phố</label><input type="text" required placeholder="VD: Hà Nội..." className="scrapbook-input font-bold text-stone-700" value={product.province} onChange={(e) => setProduct({...product, province: e.target.value})} /></div>
                <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Quận / Huyện</label><input type="text" required placeholder="VD: Quận Hoàn Kiếm..." className="scrapbook-input font-bold text-stone-700" value={product.district} onChange={(e) => setProduct({...product, district: e.target.value})} /></div>
                <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Phường / Xã</label><input type="text" required placeholder="VD: Phường Hàng Đào..." className="scrapbook-input font-bold text-stone-700" value={product.ward} onChange={(e) => setProduct({...product, ward: e.target.value})} /></div>
                <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Địa chỉ cụ thể (Tên đường, số nhà)</label><input type="text" required placeholder="VD: Số 123 Đường XYZ..." className="scrapbook-input font-bold text-stone-700" value={product.address} onChange={(e) => setProduct({...product, address: e.target.value})} /></div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Số điện thoại của cậu *</label>
                  <input type="tel" required placeholder="SĐT liên hệ..." className="scrapbook-input font-mono font-bold text-stone-800" value={product.ownerPhone} onChange={(e) => setProduct({...product, ownerPhone: e.target.value})} />
                </div>

                <div className="md:col-span-2 bg-[#FDFBF7] p-5 rounded-sm border border-[#E9E2D5] flex gap-3 shadow-sm relative">
                  <div className="washi-tape w-10 h-3 -top-1.5 left-6 -rotate-2" />
                  <Heart size={18} className="text-amber-700/50 shrink-0 mt-0.5" />
                  <p className="text-stone-600 text-[13px] leading-relaxed font-sans">
                    <span className="font-bold text-stone-800">Góc bảo mật:</span> Tên cậu sẽ hiện trên món đồ, nhưng số điện thoại thì được CLOOP giấu kỹ nhé. Số này chỉ được bật mí cho người mượn khi họ đã cọc thành công thôi nè!
                  </p>
                </div>
              </div>
            </section>

            {/* 05: NGHIỆP VỤ */}
            <section>
              <div className="flex items-center mb-5 group/heading cursor-default">
                <span className={SECTION_NUMBER_CLASS}>05.</span>
                <h2 className={SECTION_HEADING_CLASS}>Hành trình tiếp theo</h2>
                <div className="flex-grow h-[1px] bg-emerald-900/10 ml-6 origin-left scale-x-0 group-hover/heading:scale-x-100 transition-transform duration-1000 ease-out" />
              </div>
              
              <div className="space-y-4 font-sans">
                {/* Cho Thuê */}
                <div className={`p-6 rounded-sm border transition-all ${listings.isRental ? "bg-[#F4F7F4] border-[#1C3F30]/30 shadow-sm" : "bg-[#FFFDF9] border-[#E9E2D5]"}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <input type="checkbox" id="rental" className="w-4 h-4 accent-[#1C3F30] cursor-pointer" checked={listings.isRental} onChange={(e) => setListings({...listings, isRental: e.target.checked})} />
                    <label htmlFor="rental" className="font-bold text-stone-800 text-[13px] uppercase tracking-wider cursor-pointer">Cho thuê món đồ này</label>
                  </div>
                  {listings.isRental && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 ml-7 animate-fadeIn">
                      <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Giá thuê / Ngày (VNĐ)</label><input type="number" className="scrapbook-input font-mono" value={listings.rentalPrice} onChange={(e) => setListings({...listings, rentalPrice: Number(e.target.value)})} /></div>
                      <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Tiền cọc đảm bảo (VNĐ)</label><input type="number" className="scrapbook-input font-mono" value={listings.depositPercent} onChange={(e) => setListings({...listings, depositPercent: Number(e.target.value)})} /></div>
                    </div>
                  )}
                </div>

                {/* Thanh lý */}
                <div className={`p-6 rounded-sm border transition-all ${listings.isSale ? "bg-[#F5F8FA] border-blue-800/20 shadow-sm" : "bg-[#FFFDF9] border-[#E9E2D5]"}`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="sale" className="w-4 h-4 accent-blue-700 cursor-pointer" checked={listings.isSale} onChange={(e) => setListings({...listings, isSale: e.target.checked})} />
                    <label htmlFor="sale" className="font-bold text-stone-800 text-[13px] uppercase tracking-wider cursor-pointer">Nhượng lại món đồ này (Thanh lý)</label>
                  </div>
                  {listings.isSale && (
                    <div className="mt-4 ml-7 w-full sm:w-1/2 animate-fadeIn">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Giá pass (VNĐ)</label>
                      <input type="number" className="scrapbook-input font-mono" value={listings.salePrice} onChange={(e) => setListings({...listings, salePrice: Number(e.target.value)})} />
                    </div>
                  )}
                </div>

                {/* Tái chế */}
                <div className={`p-6 rounded-sm border transition-all ${listings.isRecycle ? "bg-[#F4FAFA] border-teal-700/20 shadow-sm" : "bg-[#FFFDF9] border-[#E9E2D5]"}`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="recycle" className="w-4 h-4 accent-teal-600 cursor-pointer" checked={listings.isRecycle} onChange={(e) => setListings({...listings, isRecycle: e.target.checked})} />
                    <label htmlFor="recycle" className="font-bold text-stone-800 text-[13px] uppercase tracking-wider cursor-pointer flex items-center gap-1.5">Ủng hộ quỹ tái chế <Leaf size={14} className="text-teal-600"/></label>
                  </div>
                  {listings.isRecycle && (
                    <div className="mt-3 ml-7 text-xs text-stone-500 leading-relaxed font-sans italic">
                      Đồng ý quyên góp cho quỹ tái chế Upcycle khi đồ cũ nát. Cậu sẽ nhận được <span className="font-bold not-italic">{listings.greenPoints} Green Points</span> nha.
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 06: CÂU CHUYỆN */}
            <section>
              <div className="flex items-center mb-5 group/heading cursor-default">
                <span className={SECTION_NUMBER_CLASS}>06.</span>
                <h2 className={SECTION_HEADING_CLASS}>Ký ức bỏ túi (Tùy chọn)</h2>
                <div className="flex-grow h-[1px] bg-emerald-900/10 ml-6 origin-left scale-x-0 group-hover/heading:scale-x-100 transition-transform duration-1000 ease-out" />
              </div>
              <div className="bg-[#FFFDF9] p-6 border border-[#E9E2D5] rounded-sm relative">
                <div className="flex items-center gap-3 mb-4">
                  <input type="checkbox" id="hasStory" className="w-4 h-4 accent-pink-600 cursor-pointer" checked={hasStory} onChange={(e) => setHasStory(e.target.checked)} />
                  <label htmlFor="hasStory" className="block text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer mb-0">
                    Viết một lời tựa nhỏ cho trang nhật ký
                  </label>
                </div>

                <AnimatePresence>
                  {hasStory && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="relative">
                        <Feather size={20} className="absolute top-3 right-3 text-stone-200" />
                        <textarea
                          value={storyText} onChange={handleStoryChange}
                          placeholder="Ngày hôm đó nắng rất trong, chiếc váy này đã cùng mình..."
                          className="w-full p-4 rounded-sm border border-[#E9E2D5] bg-[#FDFBF7] font-handwriting text-xl text-stone-700 h-32 resize-none focus:outline-none focus:border-amber-700/40 shadow-inner"
                        />
                      </div>
                      {storyWarning && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 p-2 mt-2 border border-amber-200/50 flex gap-1.5 rounded-sm font-sans">
                          <Info size={14} className="shrink-0" />
                          <span>{storyWarning}</span>
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>

            {/* BUTTON SUBMIT CỰC NGHỆ */}
            <div className="pt-8 flex justify-center">
              <button
                type="submit" disabled={isSubmitting}
                className="group relative overflow-hidden px-12 py-5 bg-[#1C3F30] text-[#FDFBF7] font-sans font-bold text-xl md:text-2xl uppercase tracking-widest rounded-sm transition-all duration-500 disabled:opacity-60 disabled:cursor-not-allowed shadow-xl hover:shadow-emerald-900/40 hover:-translate-y-1"
              >
                {/* Shine effect */}
                <div className="absolute inset-0 -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                {/* Vintage border inside button */}
                <div className="absolute inset-1 border border-[#FDFBF7]/30 pointer-events-none" />
                <span className="relative z-10">{isSubmitting ? "Đang xếp vào tủ..." : "Cất vào Tủ Đồ CLOOP"}</span>
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* CROPPER MODAL (Giữ nguyên chức năng, fix lỗi UI) */}
      {currentCropSrc && (
        <div className="fixed inset-0 z-[999] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md h-[500px] bg-black rounded-lg overflow-hidden shadow-2xl border border-stone-800">
            <Cropper
              image={currentCropSrc} crop={crop} zoom={zoom} aspect={3 / 4}
              onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
            />
          </div>
          <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full max-w-md mt-6 accent-[#D5C6B1] cursor-pointer h-1 bg-stone-700 rounded-full appearance-none" />
          <div className="flex gap-4 mt-6">
            <button type="button" onClick={handleCropSkip} className="px-6 py-2.5 bg-stone-800 text-stone-300 font-sans text-xs uppercase tracking-widest font-bold rounded-full transition-colors hover:bg-stone-700">
              Bỏ qua
            </button>
            <button type="button" onClick={handleCropConfirm} className="px-8 py-2.5 bg-[#D5C6B1] text-stone-900 font-sans text-xs uppercase tracking-widest font-bold rounded-full transition-all hover:bg-white">
              Cắt và Lưu
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
