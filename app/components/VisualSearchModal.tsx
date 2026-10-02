"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Cropper, { type Area } from "react-easy-crop";
import {
  Camera,
  X,
  UploadCloud,
  Search,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  ScanSearch,
  Compass,
  Crop,
  ZoomIn,
  ZoomOut,
  Maximize2,
  SlidersHorizontal,
  Shirt,
  Sparkles as LucideSparkles, // Only imported if needed for icon, or use ScanSearch
  Layers,
  ShoppingBag,
  Info,
} from "lucide-react";

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

// Bộ ảnh Lookbook mẫu để khách bấm trải nghiệm ngay lập tức
const PRESET_LOOKBOOKS = [
  {
    title: "Blazer Parisian Chic",
    tag: "Blazer",
    url: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=700",
  },
  {
    title: "Đầm Lụa Dạ Tiệc",
    tag: "Dạ hội",
    url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=700",
  },
  {
    title: "Áo Dài Cách Tân",
    tag: "Áo dài",
    url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=700",
  },
  {
    title: "Set Tweed Vintage",
    tag: "Set đồ",
    url: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=700",
  },
];

// Helper nén ảnh toàn phần
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
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(typeof fileOrDataUrl === "string" ? fileOrDataUrl : "");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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

// Helper cắt ảnh theo bounding box (Crop Box Shopee/TikTok)
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<string> {
  const image = new window.Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = (e) => reject(e);
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  const maxDim = 640;
  let targetWidth = pixelCrop.width;
  let targetHeight = pixelCrop.height;

  if (targetWidth > maxDim || targetHeight > maxDim) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
      targetWidth = maxDim;
    } else {
      targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
      targetHeight = maxDim;
    }
  }

  canvas.width = Math.max(1, targetWidth);
  canvas.height = Math.max(1, targetHeight);

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return canvas.toDataURL("image/jpeg", 0.82);
}

const SCAN_STATUS_STEPS = [
  "Đang quét phom dáng & tỷ lệ cắt may...",
  "Bóc tách chất liệu vải & dải màu sắc...",
  "Đối soát kho tủ đồ thực tế tại CLOOP...",
];

export default function VisualSearchModal({ isOpen, onClose }: VisualSearchModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mounted check for SSR safety with cropper
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Workflow states: 'upload' | 'crop' | 'results'
  const [viewMode, setViewMode] = useState<"upload" | "crop" | "results">("upload");
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [activeSearchImage, setActiveSearchImage] = useState<string | null>(null);

  // Cropper states
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(3 / 4);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Scanning & API states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [detectedInfo, setDetectedInfo] = useState<DetectedInfo | null>(null);
  const [matchedProducts, setMatchedProducts] = useState<MatchedProduct[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cycle status ticker during scanning
  useEffect(() => {
    if (!isAnalyzing) return;
    const interval = setInterval(() => {
      setScanStepIndex((prev) => (prev + 1) % SCAN_STATUS_STEPS.length);
    }, 1600);
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Xử lý gửi ảnh đã chọn/đã crop lên API Visual Search
  const executeSearch = async (imageSrc: string) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setDetectedInfo(null);
    setMatchedProducts([]);
    setViewMode("results");
    setActiveSearchImage(imageSrc);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    try {
      let finalBase64 = imageSrc;
      if (!imageSrc.startsWith("data:image/")) {
        finalBase64 = await compressImageForVisualSearch(imageSrc);
      }

      const res = await fetch("/api/visual-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Image: finalBase64 }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Không thể tìm kiếm ảnh này");
      }

      setDetectedInfo(data.detectedInfo);
      setMatchedProducts(data.products || []);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        setErrorMessage(
          "Thời gian phản hồi AI vượt quá 6s. Đang hiển thị các trang phục liên quan từ kho CLOOP."
        );
      } else {
        setErrorMessage(err.message || "Đã xảy ra lỗi khi tìm kiếm bằng AI");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Người dùng chọn ảnh từ máy tính / điện thoại
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageForVisualSearch(file);
      setRawImage(compressed);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      // Bắt đầu quét ngay lập tức không để khách chờ lâu
      executeSearch(compressed);
    } catch (err) {
      console.error("Lỗi nén ảnh ban đầu:", err);
    }
  };

  // Người dùng chọn một mẫu Lookbook có sẵn
  const handleSelectPreset = async (url: string) => {
    setRawImage(url);
    // Bắt đầu quét ngay với lookbook mẫu, cho phép người dùng khoanh vùng lại bất cứ lúc nào
    executeSearch(url);
  };

  // Áp dụng vùng crop và tìm kiếm
  const handleApplyCropAndSearch = async () => {
    if (!rawImage) return;

    try {
      if (croppedAreaPixels && croppedAreaPixels.width > 20 && croppedAreaPixels.height > 20) {
        const cropped = await getCroppedImg(rawImage, croppedAreaPixels);
        executeSearch(cropped);
      } else {
        // Fallback dùng toàn ảnh
        const fullCompressed = await compressImageForVisualSearch(rawImage);
        executeSearch(fullCompressed);
      }
    } catch (err: any) {
      console.warn("Lỗi crop ảnh:", err);
      // Fallback nếu crop lỗi
      executeSearch(rawImage);
    }
  };

  // Quét toàn bộ ảnh mà không cần crop
  const handleScanFullImage = async () => {
    if (!rawImage) return;
    const fullCompressed = await compressImageForVisualSearch(rawImage);
    executeSearch(fullCompressed);
  };

  // Quay lại giao diện khoanh vùng để chọn món đồ khác trên cùng bức ảnh
  const handleBackToCrop = () => {
    setViewMode("crop");
  };

  // Reset về ban đầu
  const handleReset = () => {
    setRawImage(null);
    setActiveSearchImage(null);
    setDetectedInfo(null);
    setMatchedProducts([]);
    setErrorMessage(null);
    setViewMode("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-md">
        {/* Backdrop click to close */}
        <div className="fixed inset-0" onClick={onClose} />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-5xl bg-stone-950/95 border border-emerald-500/30 rounded-3xl p-5 sm:p-7 text-white shadow-2xl overflow-hidden z-10 max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Camera size={22} className="animate-pulse" />
              </div>
              <div>
                <h3 className="font-heading text-xl sm:text-2xl font-bold tracking-wide flex items-center gap-2">
                  Tìm kiếm bằng hình ảnh
                  <span className="text-[10px] uppercase font-extrabold tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 font-ui flex items-center gap-1 shadow-sm">
                    AI Lens
                  </span>
                </h3>
                <p className="text-xs text-stone-400">
                  {viewMode === "crop"
                    ? "Khoanh vùng chi tiết trang phục để AI quét chuẩn xác từng món đồ"
                    : "Khám phá trang phục tương đồng ngay trong kho đồ tuần hoàn CLOOP"}
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
          <div className="flex-1 overflow-y-auto py-4 pr-1">
            {/* ------------------------------------------------------------- */}
            {/* GIAI ĐOẠN 1: CHƯA CÓ ẢNH -> TẢI ẢNH HOẶC CHỌN LOOKBOOK MẪU   */}
            {/* ------------------------------------------------------------- */}
            {viewMode === "upload" && (
              <div className="space-y-6">
                {/* Upload Drag & Drop Area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/20 hover:bg-emerald-900/20 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 group flex flex-col items-center justify-center"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 group-hover:bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 transition-transform group-hover:scale-110 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    <UploadCloud size={32} />
                  </div>
                  <h4 className="text-base sm:text-lg font-bold text-stone-100 mb-1">
                    Bấm để tải ảnh lên từ điện thoại hoặc máy tính
                  </h4>
                  <p className="text-xs text-stone-400 max-w-sm mb-4">
                    Hỗ trợ ảnh OOTD, ảnh Pinterest, Instagram hoặc ảnh chụp trực tiếp góc đồ
                  </p>
                  <button className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-ui text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2">
                    <Camera size={16} /> Chọn ảnh trang phục
                  </button>
                </div>

                {/* Gợi ý Lookbook mẫu */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs uppercase tracking-widest text-stone-400 font-bold flex items-center gap-1.5">
                      <Compass size={14} className="text-emerald-400" /> Thử nhanh với các Outfit phong cách:
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {PRESET_LOOKBOOKS.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectPreset(item.url)}
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
            )}

            {/* ------------------------------------------------------------- */}
            {/* GIAI ĐOẠN 2: CHẾ ĐỘ KHOANH VÙNG (SHOPEE / TIKTOK STYLE CROP)  */}
            {/* ------------------------------------------------------------- */}
            {viewMode === "crop" && rawImage && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 h-full">
                {/* Khung Interactive Crop Studio */}
                <div className="md:col-span-8 flex flex-col">
                  <div className="relative w-full h-[360px] sm:h-[440px] rounded-2xl overflow-hidden bg-stone-900 border border-emerald-500/40 shadow-inner">
                    {isMounted && (
                      <Cropper
                        image={rawImage}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspectRatio}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                        showGrid={true}
                      />
                    )}

                    {/* Cyber HUD Corner Overlays */}
                    <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-emerald-400 pointer-events-none z-10 opacity-80" />
                    <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-emerald-400 pointer-events-none z-10 opacity-80" />
                    <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-emerald-400 pointer-events-none z-10 opacity-80" />
                    <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-emerald-400 pointer-events-none z-10 opacity-80" />

                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/75 border border-white/10 text-[11px] text-stone-300 pointer-events-none backdrop-blur-md z-10">
                      Kéo hoặc phóng to để khoanh đúng món đồ bạn muốn tìm
                    </div>
                  </div>

                  {/* Thanh điều khiển Zoom */}
                  <div className="mt-3 flex items-center justify-between gap-4 px-2">
                    <div className="flex items-center gap-2 text-stone-300 text-xs">
                      <ZoomOut size={16} />
                      <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.05}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-32 sm:w-48 h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                      />
                      <ZoomIn size={16} />
                      <span className="text-[11px] text-stone-400 ml-1">{Math.round(zoom * 100)}%</span>
                    </div>

                    <button
                      onClick={() => {
                        setCrop({ x: 0, y: 0 });
                        setZoom(1);
                      }}
                      className="text-[11px] text-stone-400 hover:text-white underline cursor-pointer"
                    >
                      Đặt lại vị trí
                    </button>
                  </div>
                </div>

                {/* Bảng công cụ điều khiển & Tỉ lệ khung */}
                <div className="md:col-span-4 flex flex-col justify-between space-y-4 bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs uppercase tracking-widest text-emerald-300 font-bold mb-1 flex items-center gap-1.5">
                        <Crop size={14} /> Chọn vùng trọng tâm
                      </h4>
                      <p className="text-[11px] text-stone-400">
                        Chọn tỷ lệ để AI khoanh vùng chính xác chi tiết trang phục:
                      </p>
                    </div>

                    {/* Nút chọn tỷ lệ */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAspectRatio(3 / 4)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          aspectRatio === 3 / 4
                            ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm shadow-emerald-500/20"
                            : "bg-white/5 border-white/10 text-stone-300 hover:bg-white/10"
                        }`}
                      >
                        <Shirt size={14} /> 3:4 Dáng áo/váy
                      </button>

                      <button
                        type="button"
                        onClick={() => setAspectRatio(1)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          aspectRatio === 1
                            ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm shadow-emerald-500/20"
                            : "bg-white/5 border-white/10 text-stone-300 hover:bg-white/10"
                        }`}
                      >
                        <ShoppingBag size={14} /> 1:1 Phụ kiện/túi
                      </button>

                      <button
                        type="button"
                        onClick={() => setAspectRatio(4 / 5)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          aspectRatio === 4 / 5
                            ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm shadow-emerald-500/20"
                            : "bg-white/5 border-white/10 text-stone-300 hover:bg-white/10"
                        }`}
                      >
                        <Layers size={14} /> 4:5 Chân dung
                      </button>

                      <button
                        type="button"
                        onClick={() => setAspectRatio(undefined)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          aspectRatio === undefined
                            ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm shadow-emerald-500/20"
                            : "bg-white/5 border-white/10 text-stone-300 hover:bg-white/10"
                        }`}
                      >
                        <Maximize2 size={14} /> Tự do
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-emerald-200/90 leading-relaxed flex items-start gap-2">
                      <Info size={14} className="shrink-0 text-emerald-400 mt-0.5" />
                      <span>
                        Mẹo: Nếu ảnh có cả set đồ (áo + chân váy), hãy khoanh vùng riêng từng món để tìm được kết quả trùng khớp cao nhất!
                      </span>
                    </div>
                  </div>

                  {/* Nhóm nút hành động */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <button
                      onClick={handleApplyCropAndSearch}
                      className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-ui text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <ScanSearch size={16} /> Quét vùng đã chọn
                    </button>

                    <button
                      onClick={handleScanFullImage}
                      className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-stone-200 font-ui text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Quét toàn bộ ảnh
                    </button>

                    <button
                      onClick={handleReset}
                      className="w-full py-2 text-stone-400 hover:text-white text-[11px] transition-colors flex items-center justify-center gap-1"
                    >
                      <RefreshCw size={12} /> Đổi ảnh khác
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* GIAI ĐOẠN 3: HIỂN THỊ QUÉT SCANNER & KẾT QUẢ KHO HÀNG THỰC TẾ */}
            {/* ------------------------------------------------------------- */}
            {viewMode === "results" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Cột 1 (md:col-span-4): Ảnh đang quét / đã quét & Laser Scanner */}
                  <div className={`md:col-span-4 space-y-3 ${!isAnalyzing ? "hidden md:block" : "block"}`}>
                    <div className="relative rounded-2xl overflow-hidden aspect-[3/4] border border-emerald-500/40 bg-stone-950 shadow-2xl">
                      {activeSearchImage && (
                        <Image
                          src={activeSearchImage}
                          alt="Vùng ảnh đang tìm kiếm"
                          fill
                          className="object-cover"
                        />
                      )}

                      {/* Hiệu ứng Laser Neon Scanner siêu mượt chuẩn Shopee/TikTok */}
                      {isAnalyzing && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                          {/* Tia quét Laser Neon sáng rực di chuyển dọc */}
                          <motion.div
                            animate={{ top: ["4%", "94%", "4%"] }}
                            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_20px_#10b981]"
                          >
                            <div className="absolute left-1/2 -top-1 -translate-x-1/2 w-10 h-3 bg-emerald-300 rounded-full blur-xs opacity-90" />
                          </motion.div>

                          {/* Radar Ping và vệt phủ mờ cyber */}
                          <div className="absolute inset-0 bg-emerald-950/20 backdrop-blur-[0.5px] flex flex-col items-center justify-center p-4 text-center">
                            <div className="relative w-16 h-16 flex items-center justify-center mb-3">
                              <span className="absolute w-full h-full rounded-full border border-emerald-400/50 animate-ping" />
                              <span className="absolute w-12 h-12 rounded-full border border-emerald-400/70 animate-pulse" />
                              <RefreshCw size={24} className="animate-spin text-emerald-400 relative z-10" />
                            </div>

                            {/* Ticker trạng thái theo nhịp quét */}
                            <div className="bg-black/85 border border-emerald-400/40 px-3.5 py-2 rounded-xl text-center shadow-xl backdrop-blur-md">
                              <p className="text-[11px] font-bold text-emerald-300 tracking-wide">
                                {SCAN_STATUS_STEPS[scanStepIndex]}
                              </p>
                              <p className="text-[10px] text-stone-400 mt-0.5">
                                Đang đối chiếu kho dữ liệu thực tế
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Cyber HUD Corner Reticles */}
                      <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-emerald-400 pointer-events-none z-10" />
                      <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-emerald-400 pointer-events-none z-10" />
                      <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-emerald-400 pointer-events-none z-10" />
                      <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-emerald-400 pointer-events-none z-10" />

                      {/* Badge trạng thái */}
                      <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/70 border border-white/20 text-[10px] font-medium text-stone-200 backdrop-blur-md z-10">
                        Vùng ảnh tìm kiếm
                      </div>
                    </div>

                    {/* Nút Khoanh vùng lại hoặc Đổi ảnh khi quét xong */}
                    {!isAnalyzing && (
                      <div className="grid grid-cols-2 gap-2">
                        {rawImage && (
                          <button
                            onClick={handleBackToCrop}
                            className="py-2.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <Crop size={14} /> Khoanh vùng lại
                          </button>
                        )}
                        <button
                          onClick={handleReset}
                          className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 border border-white/15 text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw size={14} /> Đổi ảnh mới
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Cột 2 & 3 (md:col-span-8): Phân tích đặc tính AI & Danh sách đồ tương đồng */}
                  <div className="md:col-span-8 space-y-4">
                    {/* Shopee-style Compact Search Bar for Mobile */}
                    {!isAnalyzing && (
                      <div className="md:hidden flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 mb-2">
                        <div className="relative w-14 h-18 rounded-xl overflow-hidden border-2 border-emerald-400 shrink-0 bg-stone-900 shadow-md">
                          {activeSearchImage && (
                            <Image
                              src={activeSearchImage}
                              alt="Vùng tìm kiếm"
                              fill
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30">
                              {detectedInfo?.category || "CLOOP Lens"}
                            </span>
                            {detectedInfo?.dominantColor && (
                              <span className="text-[10px] text-amber-300 px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/30 truncate">
                                {detectedInfo.dominantColor}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-300 line-clamp-1 italic mb-2">
                            {detectedInfo?.itemDescription || "Đã đối chiếu với tủ đồ thực tế"}
                          </p>
                          <div className="flex items-center gap-2">
                            {rawImage && (
                              <button
                                onClick={handleBackToCrop}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Crop size={12} /> Khoanh vùng lại
                              </button>
                            )}
                            <button
                              onClick={handleReset}
                              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-stone-300 text-[10px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <RefreshCw size={12} /> Đổi ảnh
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bóc tách AI Tags (Desktop) */}
                    {detectedInfo && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="hidden md:block bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 shadow-lg"
                      >
                        <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
                          <CheckCircle2 size={16} /> AI đã nhận diện phom dáng Lookbook:
                        </div>
                        <p className="text-xs text-stone-200 mb-3 italic">
                          &quot;{detectedInfo.itemDescription}&quot;
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
                            Phom: {detectedInfo.category}
                          </span>
                          <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-semibold">
                            Màu: {detectedInfo.dominantColor}
                          </span>
                          <span className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-semibold">
                            Phong cách: {detectedInfo.style}
                          </span>
                          {detectedInfo.material && (
                            <span className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-xs font-semibold">
                              Chất liệu: {detectedInfo.material}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* Lỗi nếu có */}
                    {errorMessage && (
                      <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center justify-between">
                        <span>{errorMessage}</span>
                        {rawImage && (
                          <button
                            onClick={handleBackToCrop}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white font-bold text-xs underline cursor-pointer"
                          >
                            Khoanh vùng lại
                          </button>
                        )}
                      </div>
                    )}

                    {/* Danh sách trang phục tương đồng trong kho */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs uppercase tracking-widest text-stone-400 font-bold flex items-center gap-1.5">
                          <ScanSearch size={14} className="text-emerald-400" />
                          Trang phục tương đồng trong tủ đồ CLOOP ({matchedProducts.length}):
                        </h4>
                      </div>

                      {matchedProducts.length === 0 && !isAnalyzing && !errorMessage && (
                        <div className="p-8 text-center bg-white/5 border border-white/10 rounded-2xl">
                          <p className="text-xs text-stone-400 mb-3">
                            Chưa tìm thấy món đồ nào hoàn toàn khớp với góc chụp này.
                          </p>
                          {rawImage && (
                            <button
                              onClick={handleBackToCrop}
                              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Crop size={14} /> Khoanh vùng gần hơn vào món đồ
                            </button>
                          )}
                        </div>
                      )}

                      {/* Lưới sản phẩm khớp 2 cột chuẩn Shopee Fashion Grid */}
                      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 max-h-[440px] overflow-y-auto pr-1">
                        {matchedProducts.map((product) => {
                          const isHighMatch = product.matchScore >= 85;
                          const isMediumMatch = product.matchScore >= 70;

                          return (
                            <Link
                              key={product.id}
                              href={`/product/${product.id}`}
                              onClick={onClose}
                              className="group flex flex-col rounded-2xl bg-white/5 hover:bg-emerald-950/40 border border-white/10 hover:border-emerald-400/50 transition-all duration-300 shadow-sm hover:shadow-lg overflow-hidden"
                            >
                              {/* Product Image */}
                              <div className="relative w-full aspect-[3/4] bg-stone-900 overflow-hidden">
                                <Image
                                  src={product.primaryImage}
                                  alt={product.title}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div
                                  className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-black shadow-md ${
                                    isHighMatch
                                      ? "bg-emerald-400 text-stone-950"
                                      : isMediumMatch
                                      ? "bg-teal-400 text-stone-950"
                                      : "bg-cyan-400 text-stone-950"
                                  }`}
                                >
                                  {product.matchScore}%
                                </div>
                              </div>

                              {/* Details */}
                              <div className="p-2.5 sm:p-3 flex flex-col flex-1 justify-between">
                                <div>
                                  <span className="text-[10px] text-stone-400 block truncate font-medium mb-0.5">
                                    Chủ tủ: {product.ownerName}
                                  </span>
                                  <h5 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2 leading-tight mb-1">
                                    {product.title}
                                  </h5>
                                  <p className="text-[10px] text-stone-400 mb-2 truncate">
                                    {product.matchReason}
                                  </p>
                                </div>

                                <div>
                                  <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-xs sm:text-sm font-extrabold text-emerald-400">
                                      {product.rentalPrice.toLocaleString("vi-VN")}đ
                                    </span>
                                    <span className="text-[9px] text-stone-400 font-normal">/ngày</span>
                                  </div>

                                  <div className="w-full py-1.5 rounded-lg bg-emerald-500/20 group-hover:bg-emerald-500 text-emerald-300 group-hover:text-stone-950 text-[11px] font-bold transition-colors flex items-center justify-center gap-1 border border-emerald-500/30">
                                    Thuê ngay <ArrowRight size={11} />
                                  </div>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
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
