"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, UploadCloud, Search, ArrowRight, RefreshCw, CheckCircle2, ScanSearch, Compass, Shirt, Layers } from "lucide-react";

interface MatchedProduct {
  id: string;
  title: string;
  category: string;
  color: string | null;
  primaryImage: string;
  rentalPrice: number;
  salePrice: number;
  matchScore: number;
  matchReason: string;
  ownerName: string;
}

interface DetectedInfo {
  category: string;
  dominantColor: string;
  style: string;
  material?: string;
  itemDescription: string;
  searchKeywords: string[];
  aiModelUsed?: string;
}

interface VisualSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Bộ ảnh Lookbook mẫu để khách bấm thử ngay lập tức
const PRESET_LOOKBOOKS = [
  {
    title: "Blazer Parisian Chic",
    tag: "Blazer",
    url: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=600",
  },
  {
    title: "Đầm Lụa Dạ Tiệc",
    tag: "Dạ hội",
    url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600",
  },
  {
    title: "Áo Dài Cách Tân",
    tag: "Áo dài",
    url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=600",
  },
  {
    title: "Set Tweed Vintage",
    tag: "Set đồ",
    url: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600",
  },
];

async function compressImageForVisualSearch(fileOrDataUrl: File | string): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const maxDim = 640;
        let { width, height } = img;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(typeof fileOrDataUrl === "string" ? fileOrDataUrl : "");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      } catch {
        resolve(typeof fileOrDataUrl === "string" ? fileOrDataUrl : "");
      }
    };
    img.onerror = () => resolve(typeof fileOrDataUrl === "string" ? fileOrDataUrl : "");

    if (typeof fileOrDataUrl === "string") {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) img.src = e.target.result as string;
      };
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}

export default function VisualSearchModal({ isOpen, onClose }: VisualSearchModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedInfo, setDetectedInfo] = useState<DetectedInfo | null>(null);
  const [matchedProducts, setMatchedProducts] = useState<MatchedProduct[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Xử lý gửi ảnh lên API Visual Search
  const processImageSearch = async (imageSrc: string) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setDetectedInfo(null);
    setMatchedProducts([]);

    try {
      // ⚡ Nén ảnh siêu tốc client-side xuống ~35KB để gửi tức thì trong 20ms
      const compressedBase64 = await compressImageForVisualSearch(imageSrc);
      setSelectedImage(compressedBase64 || imageSrc);

      const res = await fetch("/api/visual-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Image: compressedBase64 || imageSrc }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Không thể tìm kiếm ảnh này");
      }

      setDetectedInfo(data.detectedInfo);
      setMatchedProducts(data.products || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Đã xảy ra lỗi khi tìm kiếm bằng AI");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Hiển thị ảnh ngay lập tức và nén ngầm
    const compressed = await compressImageForVisualSearch(file);
    processImageSearch(compressed);
  };

  const handleReset = () => {
    setSelectedImage(null);
    setDetectedInfo(null);
    setMatchedProducts([]);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/75 backdrop-blur-md">
        {/* Backdrop click to close */}
        <div className="fixed inset-0" onClick={onClose}></div>

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-stone-900/95 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 text-white shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                <Camera size={22} className="animate-pulse" />
              </div>
              <div>
                <h3 className="font-heading text-xl sm:text-2xl font-bold tracking-wide flex items-center gap-2">
                  AI Lookbook Visual Search
                  <span className="text-[10px] uppercase font-extrabold tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 font-ui flex items-center gap-1">
                    CLOOP Vision AI
                  </span>
                </h3>
                <p className="text-xs text-stone-400">
                  Phân tích phong cách bằng Trí tuệ nhân tạo CLOOP Vision để tìm đồ tương tự trong kho
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-stone-300 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto py-5 pr-1">
            {!selectedImage ? (
              /* GIAI ĐOẠN 1: CHƯA CHỌN ẢNH -> UPLOAD & MẪU LOOKBOOK */
              <div className="space-y-6">
                {/* Upload Drag & Drop Area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/20 hover:bg-emerald-900/20 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 group flex flex-col items-center justify-center"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 group-hover:bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 transition-transform group-hover:scale-110">
                    <UploadCloud size={32} />
                  </div>
                  <h4 className="text-base sm:text-lg font-bold text-stone-100 mb-1">
                    Bấm để tải ảnh lên từ máy tính hoặc điện thoại
                  </h4>
                  <p className="text-xs text-stone-400 max-w-sm mb-4">
                    Hỗ trợ ảnh chụp người mẫu OOTD, ảnh Pinterest, Instagram hoặc ảnh chụp trực tiếp
                  </p>
                  <button className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-ui text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2">
                    <Camera size={16} /> Chọn ảnh ngay
                  </button>
                </div>

                {/* Gợi ý Lookbook mẫu */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs uppercase tracking-widest text-stone-400 font-bold flex items-center gap-1.5">
                      <Compass size={14} className="text-emerald-400" /> Thử nhanh với các Outfit mẫu:
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {PRESET_LOOKBOOKS.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => processImageSearch(item.url)}
                        className="group relative rounded-2xl overflow-hidden aspect-[3/4] border border-white/10 hover:border-emerald-400/60 cursor-pointer transition-all duration-300 shadow-md"
                      >
                        <Image
                          src={item.url}
                          alt={item.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3">
                          <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-0.5">
                            {item.tag}
                          </span>
                          <span className="text-xs font-semibold text-white leading-tight">
                            {item.title}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* GIAI ĐOẠN 2: ĐÃ CHỌN ẢNH -> HIỂN THỊ QUÉT RADAR & KẾT QUẢ */
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Cột 1: Ảnh gốc & Hiệu ứng quét Scanner */}
                  <div className="relative rounded-2xl overflow-hidden aspect-[3/4] border border-emerald-500/40 bg-stone-950 shadow-xl">
                    <Image
                      src={selectedImage}
                      alt="Lookbook gốc"
                      fill
                      className="object-cover"
                    />

                    {/* Hiệu ứng Radar Laser Scanner khi đang phân tích */}
                    {isAnalyzing && (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <motion.div
                          animate={{ top: ["0%", "100%", "0%"] }}
                          transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981]"
                        />
                        <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-[1px] flex items-center justify-center">
                          <div className="bg-black/80 border border-emerald-400/40 px-4 py-2 rounded-xl text-center shadow-lg">
                            <RefreshCw size={20} className="animate-spin text-emerald-400 mx-auto mb-1" />
                            <p className="text-xs font-bold text-emerald-300">AI đang quét Lookbook...</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Nút Thử ảnh khác */}
                    {!isAnalyzing && (
                      <button
                        onClick={handleReset}
                        className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/70 hover:bg-black text-white text-xs font-medium border border-white/20 backdrop-blur-md transition-all flex items-center gap-1.5"
                      >
                        <RefreshCw size={12} /> Đổi ảnh
                      </button>
                    )}
                  </div>

                  {/* Cột 2 & 3: Bóc tách AI & Danh sách đồ tương đồng */}
                  <div className="md:col-span-2 space-y-4">
                    {/* Bóc tách AI Tags */}
                    {detectedInfo && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4"
                      >
                        <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
                          <CheckCircle2 size={16} /> AI đã nhận diện phom dáng Lookbook:
                        </div>
                        <p className="text-xs text-stone-200 mb-3 italic">
                          &quot;{detectedInfo.itemDescription}&quot;
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
                            👗 Phom: {detectedInfo.category}
                          </span>
                          <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-semibold">
                            🎨 Màu: {detectedInfo.dominantColor}
                          </span>
                          <span className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-semibold">
                            🏷️ Phong cách: {detectedInfo.style}
                          </span>
                          {detectedInfo.material && (
                            <span className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-xs font-semibold">
                              🧵 Chất liệu: {detectedInfo.material}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* Lỗi nếu có */}
                    {errorMessage && (
                      <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
                        {errorMessage}
                      </div>
                    )}

                    {/* Danh sách trang phục tương đồng trong kho */}
                    <div>
                      <h4 className="text-xs uppercase tracking-widest text-stone-400 font-bold mb-3 flex items-center gap-1.5">
                        <ScanSearch size={14} className="text-emerald-400" />
                        Trang phục tương đồng trong tủ đồ CLOOP ({matchedProducts.length}):
                      </h4>

                      {matchedProducts.length === 0 && !isAnalyzing && (
                        <p className="text-xs text-stone-500 py-6 text-center">
                          Chưa tìm thấy món đồ nào hoàn toàn khớp. Hãy thử tải góc chụp rõ hơn nhé!
                        </p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                        {matchedProducts.map((product) => (
                          <Link
                            key={product.id}
                            href={`/product/${product.id}`}
                            onClick={onClose}
                            className="group flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-emerald-950/40 border border-white/10 hover:border-emerald-400/50 transition-all duration-300"
                          >
                            <div className="relative w-16 h-20 rounded-xl overflow-hidden shrink-0 border border-white/10">
                              <Image
                                src={product.primaryImage}
                                alt={product.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-500 text-stone-950 text-[9px] font-extrabold shadow">
                                {product.matchScore}%
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] text-stone-400 block truncate">
                                {product.ownerName}
                              </span>
                              <h5 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors truncate mb-1">
                                {product.title}
                              </h5>
                              <p className="text-[10px] text-stone-400 mb-1.5 truncate">
                                {product.matchReason}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-emerald-400">
                                  {product.rentalPrice.toLocaleString("vi-VN")}đ/ngày
                                </span>
                                <span className="text-[10px] font-bold text-stone-300 group-hover:text-white flex items-center gap-0.5">
                                  Xem <ArrowRight size={10} />
                                </span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
