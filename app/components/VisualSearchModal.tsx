"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Cropper, { type Area } from "react-easy-crop";
import {
  Camera,
  X,
  UploadCloud,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  ScanSearch,
  Compass,
  Crop,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Shirt,
  Layers,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

export interface MatchedProduct {
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
  rawProduct?: any;
}

interface DetectedInfo {
  category: string;
  dominantColor: string;
  dominantHex?: string;
  style: string;
  material?: string;
  itemDescription: string;
  searchKeywords: string[];
  aiModelUsed?: string;
  scanTimeMs?: number;
}

interface VisualSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogProducts?: any[];
  onSelectProduct?: (product: any) => void;
  onApplyKeywordToShop?: (keyword: string) => void;
}

const DEFAULT_LOOKBOOKS = [
  {
    title: "Đầm Lụa Dự Tiệc",
    tag: "Đầm & Váy",
    garmentHint: "Đầm dự tiệc",
    colorHint: "đỏ",
    url: "/evening_dress.jpg",
  },
  {
    title: "Áo Dài Gấm Lễ Hội",
    tag: "Áo dài",
    garmentHint: "Áo dài",
    colorHint: "đỏ",
    url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=700",
  },
  {
    title: "Đầm Dạ Hội Thanh Lịch",
    tag: "Đầm dạ hội",
    garmentHint: "Đầm váy",
    colorHint: "đen",
    url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=700",
  },
  {
    title: "Set Tweed Tiểu Thư",
    tag: "Set đồ",
    garmentHint: "Set đồ chân váy",
    colorHint: "trắng",
    url: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=700",
  },
];

function normalizeVi(text: string = ""): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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
        resolve(canvas.toDataURL("image/jpeg", 0.82));
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

  return canvas.toDataURL("image/jpeg", 0.84);
}

// Bộ trích xuất đặc trưng thị giác (Spatial Color Histogram + HEX Swatch + Silhouette) trên trình duyệt (~6ms)
async function extractVisualSignature(imageSrc: string): Promise<{
  colorName: string | null;
  hexSwatch: string;
  isLongSilhouette: boolean;
}> {
  try {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("load"));
      img.src = imageSrc;
    });
    const size = 44;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { colorName: null, hexSwatch: "#C26475", isLongSilhouette: true };

    const sx = img.width * 0.18;
    const sy = img.height * 0.15;
    ctx.drawImage(img, sx, sy, img.width * 0.64, img.height * 0.7, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    const votes: Record<string, { count: number; rSum: number; gSum: number; bSum: number }> = {};
    for (let i = 0; i < data.length; i += 4) {
      const r255 = data[i], g255 = data[i + 1], b255 = data[i + 2];
      const r = r255 / 255, g = g255 / 255, b = b255 / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const l = (max + min) / 2;
      const d = max - min;
      const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
      let h = 0;
      if (d !== 0) {
        if (max === r) h = 60 * (((g - b) / d) % 6);
        else if (max === g) h = 60 * ((b - r) / d + 2);
        else h = 60 * ((r - g) / d + 4);
      }
      if (h < 0) h += 360;

      let name: string;
      if (l > 0.85 && s < 0.32) name = "trắng";
      else if (l < 0.17) name = "đen";
      else if (s < 0.14) name = "xám";
      else if ((h < 50 && l < 0.45 && s < 0.6) || (h < 40 && s < 0.45)) name = h < 40 && l > 0.6 ? "be" : "nâu";
      else if (h < 16 || h >= 345) name = "đỏ";
      else if (h < 40) name = "cam";
      else if (h < 68) name = l > 0.7 && s < 0.5 ? "be" : "vàng";
      else if (h < 170) name = "xanh lá";
      else if (h < 255) name = "xanh dương";
      else if (h < 295) name = "tím";
      else name = "hồng";

      if (!votes[name]) votes[name] = { count: 0, rSum: 0, gSum: 0, bSum: 0 };
      votes[name].count += 1;
      votes[name].rSum += r255;
      votes[name].gSum += g255;
      votes[name].bSum += b255;
    }

    const bestEntry = Object.entries(votes).sort((a, b) => b[1].count - a[1].count)[0];
    if (!bestEntry) return { colorName: null, hexSwatch: "#C26475", isLongSilhouette: img.height >= img.width };

    const [bestName, stats] = bestEntry;
    const avgR = Math.round(stats.rSum / stats.count);
    const avgG = Math.round(stats.gSum / stats.count);
    const avgB = Math.round(stats.bSum / stats.count);
    const hexSwatch = `#${[avgR, avgG, avgB].map((x) => x.toString(16).padStart(2, "0")).join("")}`;

    return {
      colorName: bestName,
      hexSwatch,
      isLongSilhouette: img.height >= img.width * 1.15,
    };
  } catch {
    return { colorName: null, hexSwatch: "#C26475", isLongSilhouette: true };
  }
}

// Quét kho tức thì trên RAM (< 5ms) từ danh sách sản phẩm đã nạp sẵn
function instantScanLocalCatalog(
  catalogProducts: any[],
  colorHint: string | null,
  garmentHint: string | null,
  isLongSilhouette: boolean
): MatchedProduct[] {
  if (!Array.isArray(catalogProducts) || catalogProducts.length === 0) return [];

  const normColor = normalizeVi(colorHint || "");
  const normGarment = normalizeVi(garmentHint || "");

  return catalogProducts
    .map((p: any) => {
      const text = normalizeVi([p.title, p.category, p.occasion, p.color, p.description].join(" "));
      let score = 62;
      const reasons: string[] = [];

      const isDressOrGown =
        text.includes("dam") ||
        text.includes("vay") ||
        text.includes("ao dai") ||
        text.includes("da hoi") ||
        text.includes("tiec") ||
        text.includes("chan vay");

      if (normGarment) {
        const gWords = normGarment.split(" ").filter((w) => w.length >= 2);
        const matchedWords = gWords.filter((w) => text.includes(w));
        if (matchedWords.length > 0) {
          score += 24;
          reasons.push("Cùng kiểu dáng");
        }
      } else if (isLongSilhouette && isDressOrGown) {
        score += 18;
        reasons.push("Phom đầm & váy");
      }

      if (normColor && text.includes(normColor)) {
        score += 14;
        reasons.push(`Tông màu ${colorHint}`);
      }

      if (isDressOrGown && score < 88) {
        score += 6;
      }

      return {
        id: p.id,
        title: p.title,
        category: p.category || p.occasion || "Trang phục",
        color: p.color || null,
        primaryImage: p.image || p.primaryImage || "/evening_dress.jpg",
        rentalPrice: Number(p.rentalPrice || p.price) || 80000,
        salePrice: Number(p.salePrice) || 0,
        matchScore: Math.min(98, Math.max(65, score)),
        matchReason: reasons.length > 0 ? reasons.join(" • ") : "Tương đồng phom dáng & sắc độ",
        ownerName: p.ownerName || p.owner || "Chủ tủ CLOOP",
        rawProduct: p,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 12);
}

export default function VisualSearchModal({
  isOpen,
  onClose,
  catalogProducts = [],
  onSelectProduct,
  onApplyKeywordToShop,
}: VisualSearchModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [viewMode, setViewMode] = useState<"upload" | "crop" | "results">("upload");
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [activeSearchImage, setActiveSearchImage] = useState<string | null>(null);

  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(3 / 4);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedInfo, setDetectedInfo] = useState<DetectedInfo | null>(null);
  const [matchedProducts, setMatchedProducts] = useState<MatchedProduct[]>([]);
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string>("ALL");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const searchRequestRef = useRef(0);

  // Tự động lấy các mẫu Đầm / Váy / Áo dài đẹp nhất từ kho thực tế để làm Lookbook mẫu
  const dynamicLookbooks = useMemo(() => {
    const dressItems = (catalogProducts || []).filter((p: any) => {
      const t = normalizeVi([p.title, p.category, p.occasion].join(" "));
      return t.includes("dam") || t.includes("vay") || t.includes("ao dai") || t.includes("set");
    });

    if (dressItems.length >= 4) {
      return dressItems.slice(0, 4).map((p: any) => ({
        title: p.title,
        tag: p.occasion || p.category || "Đầm & Váy",
        garmentHint: p.category || p.title,
        colorHint: p.color && p.color !== "Tự nhiên" ? p.color : null,
        url: p.image || p.primaryImage || "/evening_dress.jpg",
      }));
    }
    return DEFAULT_LOOKBOOKS;
  }, [catalogProducts]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Quét 2 tầng: Tầng 1 Quét Kho Tức Thì (<15ms trên RAM) + Tầng 2 AI Vision tinh chỉnh ngầm
  const executeSearch = async (imageSrc: string, presetGarmentHint?: string | null, presetColorHint?: string | null) => {
    const requestId = ++searchRequestRef.current;
    const t0 = performance.now();
    setErrorMessage(null);
    setSelectedQuickFilter("ALL");
    setViewMode("results");
    setActiveSearchImage(imageSrc);

    // TẦNG 1: QUÉT KHO TỨC THÌ TRÊN TRÌNH DUYỆT (<15ms)
    const sig = await extractVisualSignature(imageSrc);
    const effectiveColor = presetColorHint || sig.colorName;
    const effectiveGarment = presetGarmentHint || (sig.isLongSilhouette ? "Đầm & Váy" : null);

    const instantMatches = instantScanLocalCatalog(
      catalogProducts,
      effectiveColor,
      effectiveGarment,
      sig.isLongSilhouette
    );
    const instantMs = Math.max(4, Math.round(performance.now() - t0));

    if (instantMatches.length > 0) {
      setMatchedProducts(instantMatches);
      setDetectedInfo({
        category: effectiveGarment || "Đầm & Trang phục thiết kế",
        dominantColor: effectiveColor || "Tự nhiên",
        dominantHex: sig.hexSwatch,
        style: "Thanh lịch • Tiệc & Dạo phố",
        itemDescription: "Các mẫu trang phục có phom dáng và tông màu tương đồng",
        searchKeywords: [effectiveGarment || "Đầm váy", effectiveColor || "Thời trang"].filter(Boolean),
        scanTimeMs: instantMs,
      });
    }

    setIsAnalyzing(true);
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
        body: JSON.stringify({
          base64Image: finalBase64,
          colorHint: effectiveColor,
          garmentHint: effectiveGarment,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json();
      if (requestId !== searchRequestRef.current) return;

      if (res.ok && data.success) {
        const serverProducts: MatchedProduct[] = (data.products || []).map((sp: any) => {
          const foundRaw = catalogProducts.find((cp: any) => cp.id === sp.id);
          return {
            ...sp,
            rawProduct: foundRaw || sp,
          };
        });

        if (serverProducts.length > 0) {
          setMatchedProducts(serverProducts);
        }
        setDetectedInfo({
          ...data.detectedInfo,
          dominantHex: sig.hexSwatch,
          scanTimeMs: instantMs,
        });
      }
    } catch {
      clearTimeout(timeoutId);
      // Nếu mạng chậm hoặc offline, vẫn giữ nguyên kết quả quét kho tức thì ở Tầng 1!
    } finally {
      if (requestId === searchRequestRef.current) setIsAnalyzing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageForVisualSearch(file);
      setRawImage(compressed);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      executeSearch(compressed);
    } catch (err) {
      console.error("Lỗi nén ảnh:", err);
    }
  };

  const handleSelectPreset = async (item: { url: string; garmentHint?: string; colorHint?: string | null }) => {
    setRawImage(item.url);
    executeSearch(item.url, item.garmentHint, item.colorHint);
  };

  const handleApplyCropAndSearch = async () => {
    if (!rawImage) return;
    try {
      if (croppedAreaPixels && croppedAreaPixels.width > 20 && croppedAreaPixels.height > 20) {
        const cropped = await getCroppedImg(rawImage, croppedAreaPixels);
        executeSearch(cropped);
      } else {
        const fullCompressed = await compressImageForVisualSearch(rawImage);
        executeSearch(fullCompressed);
      }
    } catch {
      executeSearch(rawImage);
    }
  };

  const handleReset = () => {
    setRawImage(null);
    setActiveSearchImage(null);
    setDetectedInfo(null);
    setMatchedProducts([]);
    setErrorMessage(null);
    setViewMode("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Lọc nhanh kết quả quét theo nhóm Váy/Đầm, Áo dài, Chân váy...
  const displayedMatches = useMemo(() => {
    if (selectedQuickFilter === "ALL") return matchedProducts;
    return matchedProducts.filter((item) => {
      const t = normalizeVi([item.title, item.category].join(" "));
      if (selectedQuickFilter === "DRESS") return t.includes("dam") || t.includes("vay") || t.includes("maxi");
      if (selectedQuickFilter === "AODAI") return t.includes("ao dai") || t.includes("co phuc");
      if (selectedQuickFilter === "SKIRT") return t.includes("chan vay") || t.includes("set");
      if (selectedQuickFilter === "TOP") return t.includes("ao") && !t.includes("ao dai");
      return true;
    });
  }, [matchedProducts, selectedQuickFilter]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/65 backdrop-blur-xs">
        <div className="fixed inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          className="relative w-full max-w-[430px] bg-[#FAF5F2] border border-[#EBD5CE] rounded-t-[28px] sm:rounded-[28px] text-[#2B1E21] shadow-2xl overflow-hidden z-10 max-h-[90dvh] flex flex-col font-sans"
        >
          {/* Header thanh lịch chuẩn Boutique */}
          <div className="flex items-center justify-between px-4 py-3 bg-white/95 border-b border-[#EFE0DA] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-[#C26475] to-[#E295A3] flex items-center justify-center text-white shadow-xs">
                <Camera size={17} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[14px] font-black tracking-tight text-[#2B1E21]">
                    Tìm Trang Phục Bằng Ảnh
                  </h3>
                </div>
                <p className="text-[10.5px] text-[#7D656A]">
                  {viewMode === "crop"
                    ? "Khoanh vùng chiếc váy hoặc áo bạn muốn tìm"
                    : "Tải ảnh mẫu lên để tìm đầm dự tiệc, áo dài tương tự"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7.5 h-7.5 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Nội dung chính */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 no-scrollbar">
            {/* MÀN 1: CHỌN ẢNH HOẶC THỬ MẪU ĐẦM VÁY */}
            {viewMode === "upload" && (
              <div className="space-y-3.5">
                {/* Khung bấm tải ảnh thời trang */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative overflow-hidden border-2 border-dashed border-[#DFB8C2] hover:border-[#C26475] bg-gradient-to-b from-white to-[#FDF3F0] rounded-2xl p-5 text-center cursor-pointer transition-all group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#FCEAEF] text-[#C26475] flex items-center justify-center mx-auto mb-2.5 group-hover:scale-105 transition-transform shadow-2xs">
                    <UploadCloud size={24} />
                  </div>
                  <h4 className="text-[13px] font-extrabold text-[#2B1E21]">
                    Tải ảnh hoặc chụp chiếc váy bạn đang tìm
                  </h4>
                  <p className="text-[11px] text-[#7D656A] mt-0.5 mb-3">
                    Hỗ trợ ảnh chụp màn hình, ảnh mẫu hoặc chụp trực tiếp
                  </p>
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C26475] text-white text-[11.5px] font-bold shadow-xs">
                    <Camera size={14} /> Chọn ảnh từ máy / Chụp ảnh
                  </span>
                </div>

                {/* Bộ sưu tập mẫu Váy Đầm có sẵn để bấm thử 1 chạm */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-extrabold text-[#2B1E21] flex items-center gap-1">
                      <Sparkles size={13} className="text-[#C26475]" />
                      Hoặc chọn thử một mẫu trang phục dưới đây:
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {dynamicLookbooks.map((item, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => handleSelectPreset(item)}
                        className="group relative rounded-2xl overflow-hidden aspect-[3/4] border border-[#EBD5CE] bg-white text-left cursor-pointer shadow-2xs hover:border-[#C26475] transition-all"
                      >
                        <Image
                          src={item.url}
                          alt={item.title}
                          fill
                          sizes="190px"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent flex flex-col justify-end p-2.5">
                          <span className="self-start text-[9px] font-extrabold bg-white/90 text-[#2B1E21] px-2 py-0.5 rounded-md mb-1">
                            {item.tag}
                          </span>
                          <span className="text-[11.5px] font-bold text-white line-clamp-1 leading-tight">
                            {item.title}
                          </span>
                          <span className="text-[9.5px] text-rose-200 font-semibold mt-0.5 flex items-center gap-1">
                            <ScanSearch size={11} /> Xem mẫu tương tự
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MÀN 2: CẮT KHOANH VÙNG MÓN ĐỒ */}
            {viewMode === "crop" && rawImage && (
              <div className="space-y-3">
                <div className="relative w-full h-[300px] rounded-2xl overflow-hidden bg-stone-900 border border-[#EBD5CE]">
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
                </div>

                {/* Chỉnh tỷ lệ khung cắt */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { ratio: 3 / 4, label: "3:4 Đầm/Váy" },
                    { ratio: 1, label: "1:1 Áo/Túi" },
                    { ratio: 4 / 5, label: "4:5 Nguyên bộ" },
                    { ratio: undefined, label: "Tự do" },
                  ].map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAspectRatio(opt.ratio)}
                      className={`py-1.5 px-2 rounded-xl text-[10.5px] font-bold border transition cursor-pointer ${
                        aspectRatio === opt.ratio
                          ? "bg-[#2B1E21] text-white border-[#2B1E21]"
                          : "bg-white text-stone-700 border-stone-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-stone-200">
                  <ZoomOut size={14} className="text-stone-500" />
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.05}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-stone-200 rounded-lg accent-[#C26475] cursor-pointer"
                  />
                  <ZoomIn size={14} className="text-stone-500" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode("results")}
                    className="py-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 text-xs font-bold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyCropAndSearch}
                    className="py-2.5 rounded-xl bg-[#C26475] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <ScanSearch size={14} /> Quét vùng đã chọn
                  </button>
                </div>
              </div>
            )}

            {/* MÀN 3: KẾT QUẢ QUÉT KHO TỨC THÌ + BỘ LỌC NHANH VÁY ĐẦM */}
            {viewMode === "results" && (
              <div className="space-y-3">
                {/* Thẻ tóm tắt ảnh đang quét + Swatch màu + Nút khoanh vùng lại */}
                <div className="bg-white p-2.5 rounded-2xl border border-[#EBD5CE] shadow-2xs flex items-center gap-3">
                  <div className="relative w-16 h-20 rounded-xl overflow-hidden border border-[#EBD5CE] shrink-0 bg-stone-100">
                    {activeSearchImage && (
                      <Image
                        src={activeSearchImage}
                        alt="Ảnh tìm kiếm"
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    )}
                    {isAnalyzing && (
                      <motion.div
                        animate={{ top: ["5%", "90%", "5%"] }}
                        transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                        className="absolute left-0 right-0 h-0.5 bg-[#C26475] shadow-[0_0_8px_#C26475]"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#FDF0ED] text-[#B04A5E] border border-[#F2C6CE]">
                        {detectedInfo?.category || "Đầm & Trang phục"}
                      </span>
                      {detectedInfo?.dominantColor && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-stone-300"
                            style={{ backgroundColor: detectedInfo.dominantHex || "#C26475" }}
                          />
                          Màu: {detectedInfo.dominantColor}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-[#5C474B] line-clamp-2 leading-snug">
                      {detectedInfo?.itemDescription || "Các mẫu trang phục có kiểu dáng và màu sắc tương đồng."}
                    </p>

                    <div className="flex items-center gap-1.5 pt-0.5">
                      {rawImage && (
                        <button
                          type="button"
                          onClick={() => setViewMode("crop")}
                          className="px-2.5 py-1 rounded-lg bg-[#FCEAEF] text-[#B04A5E] text-[10px] font-extrabold flex items-center gap-1 cursor-pointer"
                        >
                          <Crop size={11} /> Cắt vùng khác
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleReset}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw size={11} /> Đổi ảnh khác
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dãy chip lọc nhanh kết quả sau khi quét */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {[
                    { id: "ALL", label: "Tất cả" },
                    { id: "DRESS", label: "Đầm & Váy" },
                    { id: "AODAI", label: "Áo dài" },
                    { id: "SKIRT", label: "Chân váy & Set" },
                    { id: "TOP", label: "Áo kiểu" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedQuickFilter(tab.id)}
                      className={`h-7 px-2.5 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition cursor-pointer ${
                        selectedQuickFilter === tab.id
                          ? "bg-[#2B1E21] text-white"
                          : "bg-white text-stone-700 border border-stone-200/90"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {errorMessage}
                  </div>
                )}

                {/* Lưới kết quả 2 cột đồng bộ chuẩn Fashion Boutique */}
                <div className="grid grid-cols-2 gap-2.5">
                  {displayedMatches.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => {
                        if (onSelectProduct && product.rawProduct) {
                          onSelectProduct(product.rawProduct);
                          onClose();
                        }
                      }}
                      className="group bg-white rounded-2xl border border-[#EBD5CE] overflow-hidden shadow-2xs hover:border-[#C26475] transition-all flex flex-col cursor-pointer"
                    >
                      <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden">
                        <Image
                          src={product.primaryImage}
                          alt={product.title}
                          fill
                          sizes="185px"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#2B1E21]/85 backdrop-blur-xs text-white text-[9.5px] font-extrabold">
                          Khớp {product.matchScore}%
                        </span>
                      </div>

                      <div className="p-2.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h5 className="text-[11.5px] font-bold text-[#2B1E21] line-clamp-1">
                            {product.title}
                          </h5>
                          <p className="text-[9.5px] text-[#7D656A] truncate mt-0.5">
                            {product.matchReason}
                          </p>
                        </div>

                        <div className="mt-2 pt-1.5 border-t border-stone-100 flex items-center justify-between">
                          <div>
                            <span className="text-[12px] font-black text-[#B04A5E] font-mono">
                              {product.rentalPrice.toLocaleString("vi-VN")}đ
                            </span>
                            <span className="text-[9px] text-stone-400">/ngày</span>
                          </div>

                          {onSelectProduct && product.rawProduct ? (
                            <span className="px-2 py-1 rounded-lg bg-[#C26475] text-white text-[9.5px] font-bold">
                              Chọn đồ
                            </span>
                          ) : (
                            <Link
                              href={`/product/${product.id}`}
                              onClick={onClose}
                              className="px-2 py-1 rounded-lg bg-[#C26475] text-white text-[9.5px] font-bold"
                            >
                              Xem đồ
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
