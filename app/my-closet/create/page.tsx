"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Cropper from "react-easy-crop";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image"; // 🟢 Đã fix: Trả lại thẻ Image cho Next.js
import { Heart, Sparkles, Shirt, Info, MapPin, BadgePercent, ShieldAlert, Camera, Feather, Quote, ArrowLeft, Leaf } from "lucide-react"; // 🟢 Đã fix: Thêm ArrowLeft và Leaf

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600";
const PAPER_BG = "https://www.transparenttextures.com/patterns/cream-paper.png";

// Hoa lá khô decor nền
const DRIED_LEAF = "https://images.unsplash.com/photo-1621274220349-2e06cb388ea2?q=80&w=500";
const VINTAGE_PAPER = "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?q=80&w=500"; 

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

    setIsSubmitting(true);

    try {
      let finalUserId = null;
      if (typeof window !== "undefined") {
        finalUserId = localStorage.getItem("cloop_user_id");
      }

      if (!finalUserId) {
        alert("Cậu nhớ đăng nhập trước khi gửi đồ vào tủ nhé!");
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
        if (!response.ok) throw new Error("Ảnh bị lỗi khi dán vào trang rồi, cậu thử lại nhé.");
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
        alert(`Oái, có lỗi khi cất đồ vào tủ rồi:\n${productError.message}`);
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
            alert(`Lỗi khi dán thẻ giá: ${listErr.message}`);
          }
        }

        if (hasStory && storyText.trim() !== "") {
          const isSafe = !checkContactInfoLeak(storyText);
          if (isSafe) {
            await supabase.from("BlogPost").insert([{
              title: `Kỷ niệm cùng ${insertedProduct.title}`,
              content: storyText.trim(),
              coverImage: uploadedImageUrls[0] || null,
              productId: insertedProduct.id, 
              userId: finalUserId,
              status: "PUBLIC",   
              isPinned: false,    
            }]);
          }
        }
      }

      alert("Món đồ xinh xắn của cậu đã được cất vào tủ CLOOP thành công! ✨");
      router.push("/my-closet");

    } catch (error: any) {
      alert(`Đã xảy ra lỗi nhỏ: ${error.message || error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main 
      className="min-h-screen py-10 md:py-16 px-4 sm:px-6 relative overflow-x-hidden selection:bg-[#183A2D] selection:text-white font-sans"
      style={{ backgroundColor: "#EBE6DA", backgroundImage: `url(${PAPER_BG})` }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600;700&family=Caveat:wght@400;500;600;700&display=swap');
        h1, h2, h3, .font-heading { font-family: 'Cormorant Garamond', serif !important; }
        .font-handwriting { font-family: 'Caveat', cursive !important; }
        
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
            mix-blend-mode: multiply;
            z-index: 20;
            clip-path: polygon(1% 5%, 100% 0%, 98% 95%, 0% 100%);
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
            background: #FFFDF9;
            border: 1px solid #E9E2D5;
            border-radius: 0.25rem;
            font-size: 0.875rem;
            color: #333;
            transition: all 0.2s;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.02);
        }
        .scrapbook-input:focus {
            outline: none;
            border-color: #91714E;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.02), 0 0 0 2px rgba(145,113,78,0.1);
        }

        .blend-multiply {
            mix-blend-mode: multiply;
            filter: grayscale(20%) sepia(30%) contrast(1.1); 
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
            
            {/* 01: HÌNH ẢNH */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <span className="font-heading italic text-2xl text-amber-700/60">01.</span>
                <h2 className="text-[13px] font-bold uppercase tracking-widest text-stone-700">Chân dung món đồ</h2>
              </div>
              
              <div 
                className="border-2 border-dashed border-[#D5C6B1] rounded-sm p-10 bg-[#FAF9F5] hover:bg-[#F4F1EA] transition-all cursor-pointer text-center relative group"
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageChange} />
                <div className="w-12 h-12 rounded-full bg-white border border-[#D5C6B1] flex items-center justify-center mx-auto text-stone-400 group-hover:bg-[#1C3F30] group-hover:text-white transition-all mb-3 shadow-sm">
                  <Camera size={20} />
                </div>
                <p className="font-handwriting text-xl text-stone-700 mb-1">Dán ảnh vào đây nhé</p>
                <p className="text-[11px] text-stone-400 font-sans">Chọn tối đa 5 tấm ảnh rõ nét nhất (chụp bằng ánh sáng tự nhiên thì càng xinh).</p>
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
              <div className="flex items-center gap-3 mb-5">
                <span className="font-heading italic text-2xl text-amber-700/60">02.</span>
                <h2 className="text-[13px] font-bold uppercase tracking-widest text-stone-700">Giới thiệu đôi nét</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">Tên món đồ</label>
                  <input type="text" required placeholder="Ví dụ: Váy hoa nhí mùa hè..." className="scrapbook-input font-medium text-stone-800" value={product.name} onChange={(e) => setProduct({...product, name: e.target.value})} />
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">Độ mới hiện tại</label>
                  <input type="text" required placeholder="Mới 95%, mặc 1 lần..." className="scrapbook-input" value={product.condition} onChange={(e) => setProduct({...product, condition: e.target.value})} />
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">Chất liệu chính</label>
                  <input type="text" required placeholder="Lụa, linen, cotton..." className="scrapbook-input" value={product.material} onChange={(e) => setProduct({...product, material: e.target.value})} />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">Màu sắc</label>
                  <input type="text" required className="scrapbook-input" value={product.color} onChange={(e) => setProduct({...product, color: e.target.value})} />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">Phong cách / Dịp</label>
                  <select className="scrapbook-input cursor-pointer" value={product.occasion} onChange={(e) => setProduct({...product, occasion: e.target.value})}>
                    <option value="Dạo phố">Dạo phố</option><option value="Tiệc cưới">Tiệc cưới</option><option value="Dạ hội">Dạ hội</option>
                    <option value="Áo dài">Áo dài</option><option value="Đi biển">Đi biển</option><option value="Kỷ yếu">Kỷ yếu</option>
                    <option value="Lễ hội">Lễ hội</option><option value="Công sở">Công sở</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">Giá mua ban đầu lúc mới (VNĐ)</label>
                  <input type="number" required className="scrapbook-input font-mono font-bold text-stone-800" value={product.originalPrice} onChange={(e) => setProduct({...product, originalPrice: Number(e.target.value)})} />
                  <p className="text-[10px] text-stone-400 mt-1.5 italic font-serif">Để CLOOP giúp cậu tính mức giá thuê hợp lý và % tiết kiệm nhé.</p>
                </div>
              </div>
            </section>

            {/* 03: FORM KÍCH CỠ */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <span className="font-heading italic text-2xl text-amber-700/60">03.</span>
                <h2 className="text-[13px] font-bold uppercase tracking-widest text-stone-700">Vừa vặn hoàn hảo</h2>
              </div>
              <div className="bg-[#FAF9F5] p-6 border border-[#E9E2D5] rounded-sm relative">
                <div className="absolute top-3 right-3 opacity-20"><Shirt size={40} /></div>
                
                <div className="mb-4">
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">Size đồ</label>
                  <select className="scrapbook-input cursor-pointer w-full md:w-1/3" value={product.size} onChange={(e) => setProduct({...product, size: e.target.value as any})}>
                    <option value="S">Size S</option><option value="M">Size M</option><option value="L">Size L</option><option value="XL">Size XL</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div><label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Cao (cm)*</label><input type="number" required className="scrapbook-input font-mono px-2" value={product.targetHeight} onChange={(e) => setProduct({...product, targetHeight: e.target.value})} /></div>
                  <div><label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Nặng (kg)*</label><input type="number" required className="scrapbook-input font-mono px-2" value={product.targetWeight} onChange={(e) => setProduct({...product, targetWeight: e.target.value})} /></div>
                  <div><label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Ngực (cm)</label><input type="number" className="scrapbook-input font-mono px-2" value={product.bust} onChange={(e) => setProduct({...product, bust: e.target.value})} /></div>
                  <div><label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Eo (cm)</label><input type="number" className="scrapbook-input font-mono px-2" value={product.waist} onChange={(e) => setProduct({...product, waist: e.target.value})} /></div>
                  <div><label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Mông (cm)</label><input type="number" className="scrapbook-input font-mono px-2" value={product.hips} onChange={(e) => setProduct({...product, hips: e.target.value})} /></div>
                </div>
              </div>
            </section>

            {/* 04: ĐỊA ĐIỂM & BẢO MẶT */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <span className="font-heading italic text-2xl text-amber-700/60">04.</span>
                <h2 className="text-[13px] font-bold uppercase tracking-widest text-stone-700">Tọa độ & Trạm gửi</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div><label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">Tỉnh / Thành phố</label><input type="text" required className="scrapbook-input" value={product.province} onChange={(e) => setProduct({...product, province: e.target.value})} /></div>
                <div><label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">Quận / Phường hiển thị</label><input type="text" required className="scrapbook-input" value={product.ward} onChange={(e) => setProduct({...product, ward: e.target.value})} /></div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">Số điện thoại của cậu *</label>
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
              <div className="flex items-center gap-3 mb-5">
                <span className="font-heading italic text-2xl text-amber-700/60">05.</span>
                <h2 className="text-[13px] font-bold uppercase tracking-widest text-stone-700">Hành trình tiếp theo</h2>
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
                      <div><label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Giá thuê / Ngày (VNĐ)</label><input type="number" className="scrapbook-input font-mono" value={listings.rentalPrice} onChange={(e) => setListings({...listings, rentalPrice: Number(e.target.value)})} /></div>
                      <div><label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Tiền cọc đảm bảo (VNĐ)</label><input type="number" className="scrapbook-input font-mono" value={listings.depositPercent} onChange={(e) => setListings({...listings, depositPercent: Number(e.target.value)})} /></div>
                    </div>
                  )}
                </div>

                {/* Thanh lý */}
                <div className={`p-6 rounded-sm border transition-all ${listings.isSale ? "bg-[#F5F8FA] border-blue-800/20 shadow-sm" : "bg-[#FFFDF9] border-[#E9E2D5]"}`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="sale" className="w-4 h-4 accent-blue-700 cursor-pointer" checked={listings.isSale} onChange={(e) => setListings({...listings, isSale: e.target.checked})} />
                    <label htmlFor="sale" className="font-bold text-stone-800 text-[13px] uppercase tracking-wider cursor-pointer">Thanh lý luôn</label>
                  </div>
                  {listings.isSale && (
                    <div className="mt-4 ml-7 w-full sm:w-1/2 animate-fadeIn">
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Giá pass (VNĐ)</label>
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
              <div className="flex items-center gap-3 mb-5">
                <span className="font-heading italic text-2xl text-amber-700/60">06.</span>
                <h2 className="text-[13px] font-bold uppercase tracking-widest text-stone-700">Ký ức bỏ túi (Tùy chọn)</h2>
              </div>
              <div className="bg-[#FFFDF9] p-6 border border-[#E9E2D5] rounded-sm relative">
                <div className="flex items-center gap-3 mb-4">
                  <input type="checkbox" id="hasStory" className="w-4 h-4 accent-pink-600 cursor-pointer" checked={hasStory} onChange={(e) => setHasStory(e.target.checked)} />
                  <label htmlFor="hasStory" className="font-bold text-stone-800 text-[13px] uppercase tracking-wider cursor-pointer">
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
                className="group relative px-10 py-4 bg-[#1C3F30] hover:bg-[#2A5A46] text-[#FDFBF7] font-heading font-bold text-xl md:text-2xl uppercase tracking-widest rounded-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-[2px_4px_10px_rgba(28,63,48,0.3)] hover:shadow-[4px_6px_15px_rgba(28,63,48,0.4)]"
              >
                {/* Vintage border inside button */}
                <div className="absolute inset-1 border border-[#FDFBF7]/30 pointer-events-none" />
                {isSubmitting ? "Đang nhẹ nhàng xếp vào tủ..." : "Cất vào Tủ Đồ CLOOP"}
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