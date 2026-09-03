"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion"; 
import { 
  MapPin, Star, ShieldCheck, ArrowLeft, Shirt, Settings, 
  Calendar, Leaf, Heart, Share2, Plus, BookOpen,
  X, Camera, Save, Loader2 
} from "lucide-react";
import ReviewSection from "./ReviewSection";
import { 
  ClosetUserProfile, 
  FormattedClosetProduct, 
  ClosetMemory, 
  updateClosetProfileAction 
} from "@/app/actions/closet";
import { toast } from "sonner";

const DEFAULT_VINTAGE_COVER = "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=800"; 
const PAPER_BG = "https://www.transparenttextures.com/patterns/cream-paper.png"; 

interface ClosetProfileClientProps {
  userId: string;
  initialOwnerInfo: ClosetUserProfile;
  initialProducts: FormattedClosetProduct[];
  initialMemories: ClosetMemory[];
  rawProductCount: number;
  isCurrentUser: boolean;
}

export default function ClosetProfileClient({
  userId,
  initialOwnerInfo,
  initialProducts,
  initialMemories,
  rawProductCount,
  isCurrentUser,
}: ClosetProfileClientProps) {
  const [ownerInfo, setOwnerInfo] = useState<ClosetUserProfile>(initialOwnerInfo);
  const [allProducts] = useState<FormattedClosetProduct[]>(initialProducts);
  const [memories] = useState<ClosetMemory[]>(initialMemories);
  const [activeTab, setActiveTab] = useState<"ALL" | "RENT" | "SALE">("ALL");

  // ==========================================
  // 🟢 STATE QUẢN LÝ POPUPS CHỈNH SỬA
  // ==========================================
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<"avatar" | "coverImage" | null>(null);
  
  const [editForm, setEditForm] = useState({
    name: ownerInfo.name || "",
    bio: ownerInfo.bio || "",
    quote: ownerInfo.quote || "",
    location: ownerInfo.location || "",
    todaysMemory: ownerInfo.todaysMemory || "",
    avatar: ownerInfo.avatar || null,
    coverImage: ownerInfo.coverImage || null,
  });

  const handleOpenEditModal = () => {
    setEditForm({
      name: ownerInfo.name,
      bio: ownerInfo.bio,
      quote: ownerInfo.quote,
      location: ownerInfo.location,
      todaysMemory: ownerInfo.todaysMemory,
      avatar: ownerInfo.avatar,
      coverImage: ownerInfo.coverImage,
    });
    setIsEditModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "avatar" | "coverImage") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField(field);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", field === "avatar" ? "cloop_profiles" : "cloop_profile_covers"); 

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data?.error || "Tải ảnh thất bại");
      }

      if (data.url) {
        setEditForm(prev => ({ ...prev, [field]: data.url }));
        toast.success(`Đã tải ảnh ${field === 'avatar' ? 'đại diện' : 'bìa'} thành công!`);
      }
    } catch (err: any) {
      toast.error(`Lỗi upload ảnh: ${err.message}`);
    } finally {
      setUploadingField(null);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const res = await updateClosetProfileAction({
        userId,
        name: editForm.name,
        avatar: editForm.avatar,
      });

      if (!res.success) {
        throw new Error(res.error || "Không thể cập nhật hồ sơ");
      }

      setOwnerInfo(prev => ({
        ...prev,
        name: editForm.name,
        avatar: editForm.avatar,
        bio: editForm.bio,
        quote: editForm.quote,
        location: editForm.location,
        todaysMemory: editForm.todaysMemory,
        coverImage: editForm.coverImage,
      }));

      setIsEditModalOpen(false);
      toast.success("🎉 Cập nhật hồ sơ thành công!");
    } catch (err: any) {
      toast.error(`Có lỗi xảy ra: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const displayProducts = allProducts.filter(p => {
    if (activeTab === "ALL") return true;
    if (activeTab === "RENT") return p.type === "Thuê";
    if (activeTab === "SALE") return p.type === "Mua sắm";
    return true;
  });

  const co2Saved = Math.max(rawProductCount, allProducts.length) * 6;

  return (
    <main 
      className="min-h-screen text-stone-800 antialiased pb-20 pt-6 relative overflow-hidden"
      style={{ backgroundColor: "#F5F2EB", backgroundImage: `url(${PAPER_BG})` }}
    >
      <style>{`
        .font-handwriting { font-family: cursive !important; }
        .tape {
          position: absolute;
          background-color: rgba(255, 235, 150, 0.6);
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          backdrop-filter: blur(1px);
          z-index: 10;
        }
        .polaroid {
          background: white;
          padding: 10px 10px 16px 10px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.08);
          border-radius: 4px;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .polaroid:hover {
          transform: scale(1.05) rotate(0deg) !important;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
          z-index: 20;
        }
      `}</style>

      {/* BACKGROUND ELEMENTS */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-100/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-amber-100/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
        
        {/* TOP BAR / BREADCRUMB */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-stone-500 hover:text-[#183A2D] text-xs font-semibold uppercase tracking-wider transition-colors"
        >
          <ArrowLeft size={14} /> Quay lại trang chủ
        </Link>

        {/* 🌿 HERO SECTION */}
        <div className="relative bg-[#FCFBFA] border border-[#EBE6D8] rounded-[2.5rem] p-6 shadow-sm flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="tape w-24 h-6 -top-2 left-10 -rotate-3" />
          <div className="tape w-16 h-5 -bottom-2 right-20 rotate-2" />

          <div className="w-full md:w-[280px] h-[360px] rounded-3xl overflow-hidden relative shrink-0 shadow-inner border border-stone-100 group">
            <Image 
              src={ownerInfo.coverImage || DEFAULT_VINTAGE_COVER} 
              alt="Cover" 
              fill 
              unoptimized 
              className="object-cover transition-transform duration-500 group-hover:scale-105" 
            />
            {isCurrentUser && (
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/60 hover:bg-[#183A2D] text-white text-[10px] font-bold backdrop-blur-md transition-all flex items-center gap-1.5 shadow-md cursor-pointer opacity-90 group-hover:opacity-100"
                title="Đổi ảnh bìa / mẫu tủ đồ"
              >
                <Camera size={12} /> Đổi ảnh bìa
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left space-y-4 w-full">
            <div className="flex items-center gap-2">
              <span className="font-handwriting text-2xl text-stone-500 -rotate-6">hello</span>
              <Heart size={16} className="text-stone-400 -rotate-12" />
            </div>
            
            <div className="relative group">
              <div className="w-24 h-24 rounded-full p-1 bg-[#F5F2EB] shadow-sm border border-[#EBE6D8]">
                <div className="w-full h-full rounded-full overflow-hidden bg-stone-100 flex items-center justify-center border border-white relative">
                  {ownerInfo.avatar ? (
                    <Image src={ownerInfo.avatar} fill unoptimized className="w-full h-full object-cover" alt={ownerInfo.name} />
                  ) : (
                    <span className="text-[#183A2D] font-bold text-3xl font-heading">{(ownerInfo.name || "C").charAt(0).toUpperCase()}</span>
                  )}
                </div>
              </div>
              {isCurrentUser ? (
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="absolute bottom-0 right-0 bg-[#183A2D] hover:bg-emerald-700 text-white p-1.5 rounded-full border-2 border-white shadow-sm cursor-pointer transition-colors"
                  title="Đổi ảnh đại diện"
                >
                  <Camera size={11} />
                </button>
              ) : (
                <div className="absolute bottom-0 right-0 bg-emerald-500 text-white p-1 rounded-full border-2 border-white shadow-sm">
                  <ShieldCheck size={12} />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-4xl font-bold text-[#183A2D] font-heading">{ownerInfo.name || "Thành viên CLOOP"}</h1>
                {isCurrentUser && (
                  <button
                    type="button"
                    onClick={handleOpenEditModal}
                    className="text-stone-400 hover:text-[#183A2D] p-1 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
                    title="Chỉnh sửa tên và thông tin"
                  >
                    <Settings size={16} />
                  </button>
                )}
              </div>
              <p className="font-heading text-lg text-stone-600 italic">"{ownerInfo.quote}"</p>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-medium text-stone-500">
              <span className="flex items-center gap-1.5"><MapPin size={14} className="text-stone-400" /> {ownerInfo.location}</span>
              <span className="flex items-center gap-1.5"><Calendar size={14} className="text-stone-400" /> Thành viên từ {ownerInfo.joinDate}</span>
            </div>

            <p className="text-[13px] text-stone-500 leading-relaxed max-w-md mx-auto md:mx-0">
              {ownerInfo.bio}
            </p>

            <div className="flex items-center gap-3 pt-2">
              {isCurrentUser ? (
                <button onClick={handleOpenEditModal} className="bg-[#183A2D] hover:bg-[#234F3E] text-white text-xs font-bold px-6 py-3.5 rounded-full transition-all flex items-center gap-2 shadow-sm cursor-pointer">
                  <Settings size={14} /> CHỈNH SỬA HỒ SƠ
                </button>
              ) : (
                <button 
                  onClick={() => {
                    document.getElementById("wardrobe-section")?.scrollIntoView({ behavior: "smooth" });
                    setActiveTab("RENT");
                  }}
                  className="bg-[#183A2D] hover:bg-[#234F3E] text-white text-xs font-bold px-6 py-3.5 rounded-full transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Shirt size={14} /> THUÊ ĐỒ TỪ TỦ NÀY
                </button>
              )}
              <button 
                onClick={() => {
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("🎉 Đã sao chép link tủ đồ! Bạn có thể dán vào Bio Instagram, TikTok hoặc gửi cho bạn bè.");
                  }
                }}
                className="w-11 h-11 rounded-full border border-stone-200 flex items-center justify-center text-stone-500 hover:text-[#183A2D] hover:bg-stone-50 transition-colors bg-white shadow-3xs cursor-pointer"
                title="Sao chép link tủ đồ để chia sẻ"
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>

          {/* SỔ LƯU BÚT / GHI CHÚ HÔM NAY */}
          <div className="w-full md:w-64 bg-[#FFFDF4] border border-[#EBE6D8] p-5 rounded-2xl relative shadow-xs rotate-1 self-stretch flex flex-col justify-between">
            <div className="tape w-12 h-4 -top-2 right-1/2 translate-x-1/2" />
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold tracking-widest text-amber-600 uppercase">
                <span>Today's Memory</span>
                <span>★</span>
              </div>
              <p className="font-handwriting text-stone-600 text-sm leading-relaxed">
                {ownerInfo.todaysMemory}
              </p>
            </div>
            <div className="text-right text-[10px] text-stone-400 font-mono mt-4">
              ~ CLOOP Scrapbook ~
            </div>
          </div>
        </div>

        {/* 📊 STATS GRID */}
        <div className="relative bg-[#FCFBFA] border border-[#EBE6D8] rounded-[2rem] p-6 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#EBE6D8]">
            
            <div className="flex flex-col items-center text-center p-2 group">
              <div className="w-10 h-10 rounded-full bg-[#F5F2EB] flex items-center justify-center text-[#183A2D] mb-2 group-hover:scale-110 transition-transform">
                <Shirt size={18} />
              </div>
              <div className="text-2xl font-bold font-heading text-stone-900">{rawProductCount || allProducts.length}</div>
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mt-1">Sản phẩm</div>
              <div className="text-[9px] text-stone-400">Đang hiển thị</div>
            </div>
            
            <div className="flex flex-col items-center text-center p-2 group">
              <div className="w-10 h-10 rounded-full bg-[#F5F2EB] flex items-center justify-center text-[#183A2D] mb-2 group-hover:scale-110 transition-transform">
                <Shirt size={18} />
              </div>
              <div className="text-2xl font-bold font-heading text-stone-900">{ownerInfo.completedOrders || 0}</div>
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mt-1">Lượt thuê</div>
              <div className="text-[9px] text-stone-400">Đã hoàn thành</div>
            </div>

            <div className="flex flex-col items-center text-center p-2 group">
              <div className="w-10 h-10 rounded-full bg-[#F5F2EB] flex items-center justify-center text-[#183A2D] mb-2 group-hover:scale-110 transition-transform">
                <Star size={18} className="fill-[#183A2D]" />
              </div>
              <div className="text-2xl font-bold font-heading text-stone-900">{(ownerInfo.rating || 5.0).toFixed(1)}</div>
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mt-1">Uy tín</div>
              <div className="text-[9px] text-stone-400">Đánh giá trung bình</div>
            </div>

            <div className="flex flex-col items-center text-center p-2 group">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 mb-2 group-hover:scale-110 transition-transform">
                <Leaf size={18} className="fill-emerald-700" />
              </div>
              <div className="text-2xl font-bold font-heading text-emerald-800">{co2Saved} kg</div>
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mt-1">CO₂ tiết kiệm</div>
              <div className="text-[9px] text-stone-400">Cùng CLOOP sống xanh</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 📸 GÓC KÝ ỨC */}
          <div className="bg-[#FCFBFA] border border-[#EBE6D8] rounded-[2rem] p-6 lg:p-8 shadow-sm relative">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Leaf size={18} className="text-[#183A2D]" />
                <div>
                  <h2 className="text-lg font-bold text-[#183A2D] font-heading tracking-wide uppercase">Góc Ký Ức</h2>
                  <p className="text-[10px] text-stone-400 font-medium">Những khoảnh khắc đẹp gắn với CLOOP</p>
                </div>
              </div>
              <Link 
                href={`/closet/${userId}/memories`}
                className="text-xs font-semibold text-stone-500 hover:text-[#183A2D] transition-colors cursor-pointer"
              >
                Xem tất cả →
              </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-6 pt-2 px-2 -mx-2">
              {memories.slice(0, 3).map((mem, idx) => (
                <div key={mem.id} className={`polaroid w-36 shrink-0 relative ${idx % 2 === 0 ? '-rotate-2' : 'rotate-3'} mt-${idx % 2 === 0 ? '0' : '4'}`}>
                  <div className="tape w-8 h-3 -top-1.5 left-1/2 -translate-x-1/2" />
                  <div className="w-full aspect-square bg-stone-100 overflow-hidden relative mb-3">
                    <Image src={mem.image} alt={mem.title} fill unoptimized className="object-cover" />
                  </div>
                  <h4 className="text-[10px] font-bold text-stone-800 text-center font-heading leading-tight line-clamp-2 mb-1">{mem.title}</h4>
                  <p className="text-[8px] text-stone-400 text-center font-mono">{mem.date}</p>
                </div>
              ))}
              {isCurrentUser && (
                <Link href="/blog/create" className="polaroid w-36 shrink-0 border border-dashed border-stone-300 bg-[#F5F2EB]/50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-[#F5F2EB]">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-xs text-stone-400">
                    <Plus size={16} />
                  </div>
                  <span className="text-[10px] font-medium text-stone-500 text-center">Thêm kỷ niệm<br/>của bạn</span>
                </Link>
              )}
            </div>
          </div>

          {/* 📸 LOOKBOOK */}
          <div className="bg-[#FCFBFA] border border-[#EBE6D8] rounded-[2rem] p-6 lg:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-[#183A2D]" />
                <div>
                  <h2 className="text-lg font-bold text-[#183A2D] font-heading tracking-wide uppercase">Lookbook</h2>
                  <p className="text-[10px] text-stone-400 font-medium">Phong cách của {ownerInfo.name}</p>
                </div>
              </div>
              <Link 
                href={`/closet/${userId}/memories`}
                className="text-xs font-semibold text-stone-500 hover:text-[#183A2D] cursor-pointer transition-colors"
              >
                Xem tất cả →
              </Link>
            </div>

            <div className="grid grid-cols-3 grid-rows-2 gap-3 h-[220px]">
              <div className="col-span-2 row-span-2 rounded-2xl overflow-hidden relative group bg-stone-50">
                <Image 
                  src={allProducts[0]?.image || "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600"} 
                  alt="Look 1" 
                  fill 
                  unoptimized 
                  className="object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 to-transparent flex items-end p-4">
                  <span className="font-handwriting text-2xl text-white">Summer Collection</span>
                </div>
              </div>
              <div className="col-span-1 row-span-1 rounded-2xl overflow-hidden relative group bg-stone-50">
                <Image 
                  src={allProducts[1]?.image || allProducts[0]?.image || "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=400"} 
                  alt="Look 2" 
                  fill 
                  unoptimized 
                  className="object-cover group-hover:scale-105 transition-transform duration-500" 
                />
              </div>
              <div className="col-span-1 row-span-1 rounded-2xl overflow-hidden relative group bg-stone-50">
                <Image 
                  src={allProducts[2]?.image || allProducts[0]?.image || "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=400"} 
                  alt="Look 3" 
                  fill 
                  unoptimized 
                  className="object-cover group-hover:scale-105 transition-transform duration-500" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* 👗 TỦ ĐỒ CỦA USER */}
        <div id="wardrobe-section" className="bg-[#FCFBFA] border border-[#EBE6D8] rounded-[2rem] p-6 lg:p-8 shadow-sm scroll-mt-24">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 border-b border-[#EBE6D8] pb-6">
            <div className="flex items-center gap-2">
              <Leaf size={20} className="text-[#183A2D]" />
              <h2 className="text-xl font-bold text-[#183A2D] font-heading tracking-wide uppercase">Tủ Đồ Của {ownerInfo.name}</h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "ALL", label: "Tất cả" },
                { id: "RENT", label: "Đang cho thuê" },
                { id: "SALE", label: "Đã bán/Thanh lý" }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-5 py-2 rounded-full text-xs font-bold transition-all shadow-3xs cursor-pointer
                    ${activeTab === tab.id 
                      ? "bg-[#183A2D] text-white border border-[#183A2D]" 
                      : "bg-white text-stone-500 border border-stone-200 hover:bg-stone-50"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {displayProducts.length === 0 ? (
            <div className="py-16 text-center text-stone-400 font-medium bg-white rounded-3xl border border-dashed border-stone-200">
              <Shirt size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm font-heading italic">Tủ đồ hiện tại chưa có sản phẩm nào thuộc mục này.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6">
              {displayProducts.map((p) => (
                <Link href={`/product/${p.productId}`} key={p.id} className="block group relative">
                  <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/40 shadow-3xs">
                    <Image 
                      src={p.image} 
                      alt={p.title} 
                      fill 
                      unoptimized 
                      className="object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                    
                    <span className={`absolute top-3 left-3 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white shadow-xs font-heading
                      ${p.type === 'Thuê' ? 'bg-[#183A2D]' : 'bg-blue-700'}`}>
                      {p.type === 'Thuê' ? 'RENTAL' : 'BUY OUT'}
                    </span>

                    <button className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-stone-400 hover:text-red-500 shadow-sm transition-colors z-20">
                      <Heart size={12} />
                    </button>
                    
                    <span className="absolute bottom-3 left-3 bg-stone-900/70 backdrop-blur-md text-[9px] font-bold text-white px-2 py-0.5 rounded-md font-heading">
                      SIZE {p.size}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 px-1">
                    <p className="text-sm font-bold text-stone-800 line-clamp-1 font-heading group-hover:text-[#183A2D] transition-colors">{p.title}</p>
                    <div className="flex flex-col gap-0.5 text-[11px] text-stone-400">
                      <span className="flex items-center gap-0.5 truncate"><MapPin size={10} className="text-[#6BA37A] shrink-0" /> {p.location}</span>
                      <span className="font-mono font-bold text-[#183A2D] text-xs mt-0.5">{p.priceText}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <ReviewSection targetUserId={userId} />
      </div>

      {/* ========================================================
          🟢 MODAL (POPUP) CHỈNH SỬA HỒ SƠ 
          ======================================================== */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#FCFBFA] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-2xl border border-stone-200"
            >
              <div className="sticky top-0 bg-[#FCFBFA]/90 backdrop-blur-md px-6 py-4 border-b border-stone-200 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-lg font-bold text-[#183A2D] font-heading">Chỉnh sửa hồ sơ Scrapbook</h2>
                  <p className="text-[10px] text-stone-400 uppercase tracking-widest mt-0.5">Tùy biến góc nhìn của bạn</p>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-700">Ảnh Bìa (Cover)</label>
                    <div className="relative w-full h-32 bg-stone-100 rounded-2xl overflow-hidden border border-stone-200 group">
                      <Image src={editForm.coverImage || DEFAULT_VINTAGE_COVER} alt="Cover Preview" fill className="object-cover" />
                      <label className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer">
                        {uploadingField === "coverImage" ? <Loader2 className="animate-spin" size={24} /> : <Camera size={24} />}
                        <span className="text-[10px] mt-1 font-medium">Thay đổi</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "coverImage")} disabled={!!uploadingField} />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-700">Ảnh Đại Diện (Avatar)</label>
                    <div className="relative w-24 h-24 bg-stone-100 rounded-full overflow-hidden border-4 border-white shadow-sm group mx-auto sm:mx-0">
                      {editForm.avatar ? (
                        <Image src={editForm.avatar} alt="Avatar Preview" fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#F5F2EB] text-[#183A2D] text-3xl font-bold font-heading">
                          {(editForm.name || "C").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <label className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer">
                        {uploadingField === "avatar" ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "avatar")} disabled={!!uploadingField} />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Tên hiển thị</label>
                    <input 
                      type="text" 
                      value={editForm.name} 
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:border-[#183A2D] transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Địa điểm (Vị trí)</label>
                    <input 
                      type="text" 
                      value={editForm.location} 
                      onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:border-[#183A2D] transition-colors"
                      placeholder="VD: Nghệ An, Việt Nam"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Câu trích dẫn tâm đắc (Quote)</label>
                  <input 
                    type="text" 
                    value={editForm.quote} 
                    onChange={(e) => setEditForm({...editForm, quote: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:border-[#183A2D] transition-colors italic font-serif"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Tiểu sử bản thân (Bio)</label>
                  <textarea 
                    rows={3}
                    value={editForm.bio} 
                    onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:border-[#183A2D] transition-colors resize-none"
                  />
                </div>

                <div className="space-y-1.5 p-4 bg-[#FFFDF4] border border-[#EBE6D8] rounded-xl relative">
                  <div className="tape w-8 h-3 -top-1.5 left-6 -rotate-2" />
                  <label className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block mb-2">Lời ghi chú trên Note vàng (Today's Memory)</label>
                  <textarea 
                    rows={2}
                    value={editForm.todaysMemory} 
                    onChange={(e) => setEditForm({...editForm, todaysMemory: e.target.value})}
                    className="w-full px-0 py-0 bg-transparent border-none text-sm focus:outline-none text-stone-700 italic font-serif resize-none"
                  />
                </div>

              </div>

              <div className="sticky bottom-0 bg-[#FCFBFA]/90 backdrop-blur-md px-6 py-4 border-t border-stone-200 flex justify-end gap-3 rounded-b-[2rem]">
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-stone-500 hover:bg-stone-100 transition-colors"
                >
                  HỦY
                </button>
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSaving || !!uploadingField}
                  className="bg-[#183A2D] hover:bg-[#234F3E] text-white px-8 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                  {isSaving ? "ĐANG LƯU..." : "LƯU HỒ SƠ"}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
