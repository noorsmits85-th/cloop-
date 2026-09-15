"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  ArrowLeft, Camera, MapPin, Tag, 
  BookOpen, Heart, UploadCloud, X, CheckCircle2, Feather, Shirt, PlusCircle, ExternalLink
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { 
  getUserClosetItemsForBlogAction, 
  createBlogPostAction, 
  type UserClosetItemForBlog 
} from "@/app/actions/blog";

const CATEGORIES = [
  { id: "gala", label: "Dạ Hội & Tiệc Đêm" },
  { id: "daily", label: "Thanh Lịch Hằng Ngày" },
  { id: "heritage", label: "Di Sản Áo Dài" },
  { id: "upcycle", label: "Cải Tạo & Upcycling" },
  { id: "vintage", label: "Thời Trang Vintage" },
];

const POPULAR_LOCATIONS = ["Hà Nội", "TP. Hồ Chí Minh", "Đà Lạt", "Hội An", "Đà Nẵng", "Nha Trang", "Phú Quốc"];

export default function CreateBlogPostPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [myProducts, setMyProducts] = useState<any[]>([]);

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("gala");
  const [location, setLocation] = useState("Hà Nội");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);

  const handleGenerateAiStory = async () => {
    setIsGeneratingStory(true);
    try {
      const selectedProd = myProducts.find(p => p.id === selectedProductId);
      const res = await fetch("/api/ai-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          location,
          productName: selectedProd?.title || title || "Chiếc váy yêu thích"
        })
      });
      const data = await res.json();
      if (data.story) {
        setContent(data.story);
        if (!title.trim()) {
          setTitle(`Kỷ niệm cùng ${selectedProd?.title || "chiếc váy yêu thích"} tại ${location}`);
        }
      }
    } catch (err) {
      console.error("AI Story err:", err);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  // Presets sample photos if user wants quick inspiration
  const SAMPLE_PHOTOS = [
    "/1.1.jpg",
    "/1.2.jpeg",
    "/anhbia.png",
    "/evening_dress.jpg",
    "/vintage_coat.jpg",
    "/hero_warm.jpg",
    "/step3_party.jpg"
  ];

  useEffect(() => {
    async function loadUserSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
        const meta = session.user.user_metadata || {};
        setUserProfile({
          id: session.user.id,
          name: meta.name || meta.full_name || "Thành viên CLOOP",
          avatar: meta.avatar_url || meta.avatar || null,
          isVip: false
        });

        // 🌟 Lấy danh sách đồ trong tủ của user qua Server Action an toàn
        try {
          const res = await getUserClosetItemsForBlogAction();
          if (res.success && res.items && res.items.length > 0) {
            setMyProducts(res.items);
            return;
          }
        } catch (e) {
          console.warn("Server action load closet items failed, falling back to direct query:", e);
        }

        // Fallback: truy vấn trực tiếp từ bảng products
        try {
          const { data: prods } = await supabase
            .from("products")
            .select("id, title, size, category, Listing(basePrice, listingType), ProductImage(url, isPrimary)")
            .eq("userId", session.user.id);

          if (prods && prods.length > 0) {
            const formatted = prods.map((p: any) => {
              const rentListing = p.Listing?.find((l: any) => l.listingType === "RENT");
              const saleListing = p.Listing?.find((l: any) => l.listingType === "SELL");
              const price = rentListing?.basePrice || saleListing?.basePrice || 0;
              const img = p.ProductImage?.[0]?.url || "/1.1.jpg";
              return {
                id: p.id,
                title: p.title,
                size: p.size,
                category: p.category,
                price,
                imageUrl: img
              };
            });
            setMyProducts(formatted);
          }
        } catch (err) {
          console.error("Lỗi lấy danh sách đồ trong tủ:", err);
        }
      }
    }
    loadUserSession();
  }, []);

  // Xử lý upload ảnh (hoặc thêm URL ảnh)
  const handleAddSamplePhoto = (url: string) => {
    if (imageUrls.includes(url)) return;
    if (imageUrls.length >= 5) {
      alert("Bạn có thể đăng tối đa 5 bức ảnh cho mỗi ký ức!");
      return;
    }
    setImageUrls(prev => [...prev, url]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (imageUrls.length + files.length > 5) {
      alert("Tối đa 5 bức ảnh cho một câu chuyện!");
      return;
    }

    setUploadingImage(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `blog-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `blog_images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("products")
          .upload(filePath, file);

        if (uploadError) {
          // Nếu storage chưa cấu hình, dùng Base64 Preview
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              setImageUrls(prev => [...prev, event.target!.result as string]);
            }
          };
          reader.readAsDataURL(file);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from("products")
            .getPublicUrl(filePath);
          setImageUrls(prev => [...prev, publicUrl]);
        }
      }
    } catch (err) {
      console.error("Lỗi upload ảnh:", err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImageUrls(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Submit bài viết
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Vui lòng nhập tiêu đề câu chuyện!");
      return;
    }
    if (!content.trim()) {
      alert("Vui lòng viết đôi dòng cảm nghĩ / ký ức của bạn!");
      return;
    }
    if (imageUrls.length === 0) {
      alert("Vui lòng chọn ít nhất một bức ảnh lookbook kỷ niệm!");
      return;
    }

    setIsSubmitting(true);
    try {
      // 🌟 Ưu tiên sử dụng Server Action để insert chuẩn vào Prisma BlogPost
      const res = await createBlogPostAction({
        title: title.trim(),
        content: content.trim(),
        coverImage: imageUrls[0],
        productId: selectedProductId || null,
        location: location || "Việt Nam",
      });

      if (!res.success) {
        // Fallback: Thử insert qua Supabase client vào BlogPost
        const { error: sbErr } = await supabase
          .from("BlogPost")
          .insert([{
            title: title.trim(),
            content: content.trim(),
            cover_image: imageUrls[0],
            productId: selectedProductId || null,
            userId: currentUserId || null,
            status: "PUBLIC",
          }]);

        if (sbErr) {
          console.warn("Lưu Supabase có thể bị hạn chế RLS, lưu Local Storage fallback:", sbErr);
          const existingLocal = JSON.parse(localStorage.getItem("cloop_custom_blogs") || "[]");
          existingLocal.unshift({
            id: `local-blog-${Date.now()}`,
            title: title.trim(),
            content: content.trim(),
            coverImage: imageUrls[0],
            productId: selectedProductId || null,
            userId: currentUserId || null,
            location: location || "Việt Nam",
            status: "PUBLIC",
            createdAt: new Date().toISOString(),
            author: userProfile || { name: "Bạn (Tác giả)", avatar: "/logo2.png" },
            allImages: imageUrls,
            likesCount: 1,
            savesCount: 0,
            hasLiked: true,
            hasSaved: false
          });
          localStorage.setItem("cloop_custom_blogs", JSON.stringify(existingLocal));
        }
      }

      setSuccessMessage("Ký ức của bạn đã được đính lên Bảo Tàng Ký Ức Tuần Hoàn thành công!");
      setTimeout(() => {
        router.push("/blog");
      }, 1500);

    } catch (err) {
      console.error("Lỗi đăng ký ức:", err);
      alert("Đã xảy ra lỗi khi đăng ký ức, vui lòng thử lại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF8F5] py-10 px-4 sm:px-6 lg:px-8 font-sans text-stone-800">
      
      {/* Background Subtle Texture */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[url('/giaynhau.png')] bg-cover bg-center opacity-30 mix-blend-multiply" />

      <div className="max-w-4xl mx-auto relative z-10 space-y-6">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-600 hover:text-[#183A2D] transition-colors bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-stone-200 shadow-2xs font-ui"
          >
            <ArrowLeft size={14} /> Quay lại Bảo Tàng Ký Ức
          </Link>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2A4B2E] bg-[#E5EFE2] border border-[#C5DAC2] px-3 py-1 rounded-full font-ui flex items-center gap-1.5 shadow-2xs">
              <Feather size={11} className="text-[#37503F]" /> Lưu Bút Thời Trang 2026
            </span>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 animate-fade-in shadow-sm">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
            <p className="text-xs font-bold">{successMessage}</p>
          </div>
        )}

        {/* Form Scrapbook Container */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-stone-200/90 p-6 sm:p-10 shadow-[0_16px_40px_rgba(24,58,45,0.06)] relative overflow-hidden">
          
          {/* Header */}
          <div className="text-center space-y-2 mb-8 pb-6 border-b border-stone-100">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F0F5EE] border border-[#C8DAC4] flex items-center justify-center text-[#183A2D] shadow-2xs mb-2">
              <Feather size={22} />
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#0A2517] tracking-tight">
              Viết Tiếp Ký Ức Cho Tủ Đồ
            </h1>
            <p className="font-body text-xs sm:text-sm text-stone-500 max-w-lg mx-auto leading-relaxed">
              Mỗi bộ cánh bạn từng diện đều ghi dấu một khoảnh khắc thanh xuân đáng nhớ. Hãy chia sẻ câu chuyện để truyền cảm hứng cho người mặc kế tiếp!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. Tiêu đề câu chuyện */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-ui mb-2">
                Tiêu Đề Ký Ức <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Chiếc đầm lụa Satin đỏ rượu và đêm dạ vũ tốt nghiệp khó quên..."
                className="w-full px-4 py-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 font-heading font-bold text-sm sm:text-base placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#183A2D] focus:bg-white transition-all shadow-inner"
                required
              />
            </div>

            {/* 2. Danh mục & Địa điểm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-ui mb-2 flex items-center gap-1.5">
                  <Tag size={13} className="text-[#37503F]" /> Phong Cách / Chủ Đề
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-stone-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#183A2D] focus:bg-white transition-all"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-ui mb-2 flex items-center gap-1.5">
                  <MapPin size={13} className="text-[#37503F]" /> Nơi Ghi Dấu Kỷ Niệm
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="VD: Hà Nội, Đà Lạt, Hội An..."
                  list="locations-list"
                  className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-stone-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#183A2D] focus:bg-white transition-all"
                />
                <datalist id="locations-list">
                  {POPULAR_LOCATIONS.map(loc => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* 3. Tải lên Album ảnh Lookbook */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 font-ui flex items-center gap-1.5">
                  <Camera size={13} className="text-[#37503F]" /> Album Ảnh Kỷ Niệm ({imageUrls.length}/5) <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-stone-400 font-medium">Chọn từ 1 - 5 ảnh sắc nét</span>
              </div>

              {/* Upload Dropzone */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
                {imageUrls.map((url, idx) => (
                  <div key={idx} className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-stone-300 group shadow-sm bg-stone-100">
                    <Image src={url} alt={`Preview ${idx}`} fill className="object-cover" unoptimized />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-md z-10"
                    >
                      <X size={12} />
                    </button>
                    {idx === 0 && (
                      <span className="absolute bottom-2 left-2 bg-[#183A2D] text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-ui shadow-xs">
                        Ảnh bìa
                      </span>
                    )}
                  </div>
                ))}

                {imageUrls.length < 5 && (
                  <label className="aspect-[3/4] rounded-2xl border-2 border-dashed border-stone-300 hover:border-[#183A2D] bg-stone-50/70 hover:bg-[#F0F5EE]/50 flex flex-col items-center justify-center cursor-pointer transition-all p-3 text-center group">
                    <UploadCloud size={24} className="text-stone-400 group-hover:text-[#183A2D] transition-colors mb-1.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 group-hover:text-[#183A2D] font-ui">
                      {uploadingImage ? "Đang tải..." : "Thêm ảnh"}
                    </span>
                    <span className="text-[8.5px] text-stone-400 mt-0.5">JPG, PNG, WebP</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                )}
              </div>

              {/* Quick Sample Photos Bar */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] font-bold text-stone-500 shrink-0 font-ui uppercase tracking-wider flex items-center gap-1">
                  <Tag size={11} className="text-[#37503F]" /> Gợi ý ảnh nhanh:
                </span>
                <div className="flex gap-2">
                  {SAMPLE_PHOTOS.map((sampleUrl, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => handleAddSamplePhoto(sampleUrl)}
                      className="relative w-10 h-10 rounded-lg overflow-hidden border border-stone-300 hover:border-[#183A2D] hover:scale-105 transition-all shrink-0"
                    >
                      <Image src={sampleUrl} alt="sample" fill className="object-cover" unoptimized />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Nội dung bài viết / Tâm sự ký ức */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 font-ui flex items-center gap-1.5">
                  <Feather size={13} className="text-[#37503F]" /> Lời Lưu Bút / Câu Chuyện Của Bạn <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateAiStory}
                  disabled={isGeneratingStory}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[#183A2D] to-[#2D5A47] hover:from-[#112a20] hover:to-[#224738] text-white rounded-full text-[10px] font-bold shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Feather size={11} className="text-emerald-200" />
                  {isGeneratingStory ? "AI đang chắp bút..." : "AI Chắp Bút (Gemini Pro)"}
                </button>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="Hãy kể về khoảnh khắc bạn mặc chiếc váy này: Bạn đã đi đâu, cảm xúc thế nào, chiếc váy mang lại cho bạn sự tự tin ra sao, và bạn mong muốn người mặc kế tiếp sẽ có trải nghiệm tuyệt vời như thế nào..."
                className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 font-body text-xs sm:text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#183A2D] focus:bg-white transition-all leading-relaxed shadow-inner"
                required
              />
            </div>

            {/* 5. Liên kết trang phục trong tủ đồ (nếu có) */}
            <div className="p-4 sm:p-5 bg-[#F7F5EE] rounded-2xl border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#183A2D] font-ui flex items-center gap-1.5">
                  <Shirt size={14} /> Gắn Thẻ Trang Phục Trong Tủ Đồ Của Bạn (Tùy chọn)
                </label>
                <Link
                  href="/my-closet/create"
                  target="_blank"
                  className="text-[10.5px] font-bold text-[#183A2D] hover:underline inline-flex items-center gap-1"
                >
                  <PlusCircle size={12} /> Thêm đồ mới vào tủ
                </Link>
              </div>

              {myProducts.length > 0 ? (
                <>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#183A2D]"
                  >
                    <option value="">-- Không gắn thẻ trang phục nào --</option>
                    {myProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} (Size: {p.size || "M"}{p.price ? ` - ${p.price.toLocaleString('vi-VN')}₫` : ''})
                      </option>
                    ))}
                  </select>

                  {/* Visual Preview of selected product */}
                  {selectedProductId && (() => {
                    const selectedItem = myProducts.find(p => p.id === selectedProductId);
                    if (!selectedItem) return null;
                    return (
                      <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-stone-100 shrink-0 border border-stone-100">
                          <img
                            src={selectedItem.imageUrl || "/1.1.jpg"}
                            alt={selectedItem.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-stone-800 truncate">{selectedItem.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-stone-500">
                            <span className="bg-stone-100 px-1.5 py-0.5 rounded font-mono font-bold">SZ {selectedItem.size}</span>
                            {selectedItem.price > 0 && (
                              <span className="text-emerald-700 font-bold">{selectedItem.price.toLocaleString('vi-VN')}₫</span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200 shrink-0">
                          ✓ Đã liên kết
                        </span>
                      </div>
                    );
                  })()}

                  <p className="text-[10.5px] text-stone-500 leading-relaxed">
                    💡 Khi gắn thẻ, người đọc câu chuyện có thể bấm xem chi tiết hoặc thuê trực tiếp món đồ này từ tủ đồ của bạn!
                  </p>
                </>
              ) : (
                <div className="p-3 bg-white rounded-xl border border-dashed border-stone-300 text-center space-y-2">
                  <p className="text-xs text-stone-500">
                    Bạn chưa có trang phục nào trong tủ đồ cá nhân. Bạn vẫn có thể đăng bài viết kỷ niệm bình thường!
                  </p>
                  <Link
                    href="/my-closet/create"
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#183A2D] text-white text-[11px] font-bold hover:bg-[#112a20] transition-colors"
                  >
                    <PlusCircle size={13} /> Đăng trang phục lên tủ đồ ngay
                  </Link>
                </div>
              )}
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
              <Link
                href="/blog"
                className="px-6 py-3 rounded-full border border-stone-300 text-stone-700 hover:bg-stone-100 font-heading font-bold text-xs uppercase tracking-wider transition-all font-ui"
              >
                Hủy bỏ
              </Link>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 rounded-full bg-[#0A2517] hover:bg-[#183A2D] text-white font-heading font-extrabold text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2 font-ui"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang Đính Ký Ức...
                  </>
                ) : (
                  <>
                    <Feather size={15} /> Đăng Ký Ức Ngay
                  </>
                )}
              </button>
            </div>

          </form>

        </div>

      </div>
    </main>
  );
}
