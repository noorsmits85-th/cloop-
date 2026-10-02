"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Plus,
  Trash2,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Check,
  Leaf,
  Info,
  ChevronRight,
  Shirt,
  Search,
  X
} from "lucide-react";

export interface StudioProduct {
  id: string;
  title: string;
  category: string;
  color: string | null;
  image: string;
  price: number;
  ownerName: string;
}

interface CanvasItem {
  instanceId: string;
  productId: string;
  title: string;
  image: string;
  price: number;
  ownerName: string;
  x: number;
  y: number;
  scale: number;
  zIndex: number;
}

interface MixMatchClientProps {
  initialProducts: StudioProduct[];
  preselectedProductId?: string;
}

const CATEGORY_TABS = [
  "Tất cả",
  "Áo",
  "Quần & Chân váy",
  "Đầm & Váy liền",
  "Áo khoác & Blazer",
  "Túi & Phụ kiện",
];

export default function MixMatchClient({ initialProducts, preselectedProductId }: MixMatchClientProps) {
  const [products] = useState<StudioProduct[]>(initialProducts);
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [selectedItemInstanceId, setSelectedItemInstanceId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showRentModal, setShowRentModal] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const draggingItemRef = useRef<{ instanceId: string; startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  // If a preselected product is passed from product detail page, auto-add it to center
  useEffect(() => {
    if (preselectedProductId && canvasItems.length === 0) {
      const match = products.find((p) => p.id === preselectedProductId);
      if (match) {
        addItemToCanvas(match, 180, 120);
      }
    }
  }, [preselectedProductId]);

  // Add an item to the canvas
  const addItemToCanvas = (prod: StudioProduct, customX?: number, customY?: number) => {
    const newInstanceId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const highestZ = canvasItems.reduce((max, it) => Math.max(max, it.zIndex), 0);

    const defaultPositions = [
      { x: 160, y: 80 },  // Center top (Top/Dress)
      { x: 170, y: 220 }, // Center bottom (Pants/Skirt)
      { x: 300, y: 150 }, // Right side (Bag/Accessory)
      { x: 60, y: 140 },  // Left side (Jacket)
    ];

    const pos = defaultPositions[canvasItems.length % defaultPositions.length];

    const newItem: CanvasItem = {
      instanceId: newInstanceId,
      productId: prod.id,
      title: prod.title,
      image: prod.image,
      price: prod.price,
      ownerName: prod.ownerName,
      x: customX !== undefined ? customX : pos.x,
      y: customY !== undefined ? customY : pos.y,
      scale: 1,
      zIndex: highestZ + 1,
    };

    setCanvasItems((prev) => [...prev, newItem]);
    setSelectedItemInstanceId(newInstanceId);
  };

  const removeItem = (instanceId: string) => {
    setCanvasItems((prev) => prev.filter((it) => it.instanceId !== instanceId));
    if (selectedItemInstanceId === instanceId) {
      setSelectedItemInstanceId(null);
    }
  };

  const clearCanvas = () => {
    setCanvasItems([]);
    setSelectedItemInstanceId(null);
  };

  // Adjust zoom/scale of selected item
  const updateScale = (instanceId: string, delta: number) => {
    setCanvasItems((prev) =>
      prev.map((it) => {
        if (it.instanceId === instanceId) {
          const newScale = Math.min(Math.max(0.6, it.scale + delta), 1.8);
          return { ...it, scale: Number(newScale.toFixed(2)) };
        }
        return it;
      })
    );
  };

  // Bring to front
  const bringToFront = (instanceId: string) => {
    const highestZ = canvasItems.reduce((max, it) => Math.max(max, it.zIndex), 0);
    setCanvasItems((prev) =>
      prev.map((it) => (it.instanceId === instanceId ? { ...it, zIndex: highestZ + 1 } : it))
    );
  };

  // Dragging handlers (Mouse & Touch supported)
  const handlePointerDown = (e: React.PointerEvent, instanceId: string) => {
    e.stopPropagation();
    setSelectedItemInstanceId(instanceId);

    const targetItem = canvasItems.find((it) => it.instanceId === instanceId);
    if (!targetItem) return;

    draggingItemRef.current = {
      instanceId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: targetItem.x,
      initialY: targetItem.y,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingItemRef.current) return;
    const { instanceId, startX, startY, initialX, initialY } = draggingItemRef.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    setCanvasItems((prev) =>
      prev.map((it) => {
        if (it.instanceId === instanceId) {
          return {
            ...it,
            x: Math.round(initialX + deltaX),
            y: Math.round(initialY + deltaY),
          };
        }
        return it;
      })
    );
  };

  const handlePointerUp = () => {
    draggingItemRef.current = null;
  };

  // Filter products for dock
  const filteredProducts = products.filter((p) => {
    const matchCat =
      selectedCategory === "Tất cả" ||
      (selectedCategory === "Áo" && (p.category.includes("Áo") || p.title.toLowerCase().includes("áo"))) ||
      (selectedCategory === "Quần & Chân váy" && (p.category.includes("Quần") || p.category.includes("Chân váy") || p.title.toLowerCase().includes("quần") || p.title.toLowerCase().includes("váy"))) ||
      (selectedCategory === "Đầm & Váy liền" && (p.category.includes("Đầm") || p.category.includes("Váy") || p.category.includes("DRESSES"))) ||
      (selectedCategory === "Áo khoác & Blazer" && (p.category.includes("khoác") || p.category.includes("Blazer") || p.title.toLowerCase().includes("blazer"))) ||
      (selectedCategory === "Túi & Phụ kiện" && (p.category.includes("Túi") || p.category.includes("Phụ kiện")));

    const matchSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ownerName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchCat && matchSearch;
  });

  // Calculate pricing & combo discount
  const rawTotalPrice = canvasItems.reduce((sum, it) => sum + it.price, 0);
  const isCombo = canvasItems.length >= 2;
  const comboDiscount = isCombo ? Math.round(rawTotalPrice * 0.1) : 0;
  const finalTotalPrice = rawTotalPrice - comboDiscount;
  const co2Saved = (canvasItems.length * 3.6).toFixed(1);

  // Export Lookbook Image via Client HTML5 Canvas
  const handleExportLookbook = async () => {
    if (canvasItems.length === 0) return;
    setIsExporting(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 900;
      canvas.height = 1100;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Studio background
      ctx.fillStyle = "#FAF8F5";
      ctx.fillRect(0, 0, 900, 1100);

      // Draw subtle grid dots
      ctx.fillStyle = "rgba(24, 58, 45, 0.06)";
      for (let x = 30; x < 900; x += 30) {
        for (let y = 30; y < 1100; y += 30) {
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw top header
      ctx.fillStyle = "#183A2D";
      ctx.font = "bold 32px serif";
      ctx.fillText("CLOOP OUTFIT LOOKBOOK", 50, 70);

      ctx.fillStyle = "#6BA37A";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(`CIRCULAR STYLING • ${canvasItems.length} MÓN TRANG PHỤC`, 50, 100);

      // Sort items by zIndex
      const sorted = [...canvasItems].sort((a, b) => a.zIndex - b.zIndex);

      // Canvas element dimensions in DOM
      const domRect = canvasRef.current?.getBoundingClientRect();
      const domW = domRect ? domRect.width : 500;
      const domH = domRect ? domRect.height : 500;
      const scaleX = 800 / domW;
      const scaleY = 800 / domH;

      for (const item of sorted) {
        await new Promise<void>((resolve) => {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const itemW = 180 * item.scale * scaleX;
            const itemH = 220 * item.scale * scaleY;
            const itemX = 50 + item.x * scaleX;
            const itemY = 120 + item.y * scaleY;

            // Draw soft shadow
            ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
            ctx.shadowBlur = 20;
            ctx.shadowOffsetY = 10;

            ctx.drawImage(img, itemX, itemY, itemW, itemH);

            // Reset shadow
            ctx.shadowColor = "transparent";
            resolve();
          };
          img.onerror = () => resolve();
          img.src = item.image;
        });
      }

      // Draw footer banner
      ctx.fillStyle = "#183A2D";
      ctx.fillRect(50, 960, 800, 90);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText(`Giá thuê trọn set: ${finalTotalPrice.toLocaleString("vi-VN")}đ/ngày`, 80, 1005);

      ctx.fillStyle = "#A3E39F";
      ctx.font = "14px sans-serif";
      ctx.fillText(`Cứu giảm ${co2Saved}kg CO₂ so với may mới • cloop.vn/mix-match`, 80, 1032);

      // Download
      const link = document.createElement("a");
      link.download = `cloop-lookbook-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Lỗi xuất ảnh lookbook:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#183A2D] py-6 px-3 sm:px-6 antialiased">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/80 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/shop"
              className="text-xs font-bold text-stone-500 hover:text-[#183A2D] uppercase tracking-wider transition-colors"
            >
              ← Quay lại Sàn
            </Link>
            <span className="text-stone-300">/</span>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#183A2D] text-white flex items-center justify-center shadow-xs">
                <Layers size={16} className="text-emerald-300" />
              </span>
              <div>
                <h1 className="font-heading text-lg sm:text-2xl font-bold tracking-tight text-[#142A1E]">
                  Mix & Match Styling Studio
                </h1>
                <p className="text-[11px] text-stone-500">
                  Tự do phối trang phục từ nhiều tủ đồ khác nhau trên một khung hình
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearCanvas}
              disabled={canvasItems.length === 0}
              className="px-3 py-1.5 rounded-full border border-stone-200 bg-white text-stone-600 hover:text-red-600 hover:border-red-200 text-xs font-semibold transition-all disabled:opacity-40 cursor-pointer"
            >
              Đặt lại bảng
            </button>
            <button
              type="button"
              onClick={handleExportLookbook}
              disabled={canvasItems.length === 0 || isExporting}
              className="px-4 py-1.5 rounded-full bg-white border border-[#183A2D]/30 hover:bg-emerald-50 text-[#183A2D] text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-40 cursor-pointer"
            >
              <Download size={14} />
              <span>{isExporting ? "Đang xuất ảnh..." : "Lưu ảnh Lookbook"}</span>
            </button>
          </div>
        </div>

        {/* Main Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* CỘT TRÁI (7 cols): KHUNG CANVAS KÉO THẢ LOOKBOOK */}
          <div className="lg:col-span-7 space-y-3">
            <div className="relative rounded-3xl bg-white border-2 border-[#183A2D]/15 shadow-sm overflow-hidden flex flex-col">
              
              {/* Top Canvas Controls Bar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-stone-50/80 border-b border-stone-200/70 text-xs">
                <span className="text-stone-500 font-medium text-[11px]">
                  Bảng phối đồ ({canvasItems.length} món) • Chạm & kéo để sắp xếp
                </span>

                {selectedItemInstanceId && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateScale(selectedItemInstanceId, -0.1)}
                      className="p-1 rounded-md hover:bg-stone-200 text-stone-600 cursor-pointer"
                      title="Thu nhỏ"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateScale(selectedItemInstanceId, 0.1)}
                      className="p-1 rounded-md hover:bg-stone-200 text-stone-600 cursor-pointer"
                      title="Phóng to"
                    >
                      <ZoomIn size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => bringToFront(selectedItemInstanceId)}
                      className="px-2 py-0.5 rounded-md hover:bg-stone-200 text-[10.5px] font-bold text-stone-600 cursor-pointer"
                      title="Đưa lên trên"
                    >
                      Lên trên
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(selectedItemInstanceId)}
                      className="p-1 rounded-md hover:bg-red-50 text-red-600 cursor-pointer"
                      title="Xóa món này"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Interactive Canvas Surface */}
              <div
                ref={canvasRef}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onClick={() => setSelectedItemInstanceId(null)}
                className="relative w-full h-[460px] sm:h-[520px] bg-[#FAF8F5] overflow-hidden select-none cursor-crosshair touch-none"
                style={{
                  backgroundImage: "radial-gradient(#183a2d18 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              >
                {/* Empty State Hint */}
                {canvasItems.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-emerald-950/5 flex items-center justify-center text-emerald-800 mb-3">
                      <Shirt size={28} />
                    </div>
                    <h3 className="font-heading font-bold text-sm sm:text-base text-stone-700 mb-1">
                      Bảng phối đồ đang trống
                    </h3>
                    <p className="text-xs text-stone-400 max-w-xs">
                      Bấm vào các món trang phục ở tủ đồ bên cạnh để đưa lên bảng và tự do kéo phối đồ!
                    </p>
                  </div>
                )}

                {/* Render Canvas Garments */}
                {canvasItems.map((item) => {
                  const isSelected = selectedItemInstanceId === item.instanceId;

                  return (
                    <div
                      key={item.instanceId}
                      onPointerDown={(e) => handlePointerDown(e, item.instanceId)}
                      style={{
                        transform: `translate(${item.x}px, ${item.y}px) scale(${item.scale})`,
                        zIndex: item.zIndex,
                      }}
                      className={`absolute top-0 left-0 cursor-grab active:cursor-grabbing transition-shadow duration-150 ${
                        isSelected
                          ? "ring-2 ring-emerald-500 rounded-2xl shadow-xl shadow-emerald-900/20"
                          : "hover:ring-1 hover:ring-stone-300 rounded-2xl"
                      }`}
                    >
                      <div className="relative w-36 h-48 sm:w-44 sm:h-56 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-xs border border-white/60 p-2 shadow-sm">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-contain pointer-events-none select-none rounded-xl"
                        />
                        <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md rounded-lg p-1.5 text-white text-center">
                          <p className="text-[10px] font-bold truncate">{item.title}</p>
                          <p className="text-[9px] text-emerald-300 font-mono">
                            {item.price.toLocaleString("vi-VN")}đ/ngày
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Canvas Footer: ESG summary */}
              <div className="p-3.5 bg-white border-t border-stone-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                    <Leaf size={11} />
                  </span>
                  <span className="text-[11.5px] text-stone-600">
                    Giảm <strong className="text-emerald-800 font-bold">{co2Saved} kg CO₂</strong> khi thuê set đồ này
                  </span>
                </div>

                <div className="text-[11px] text-stone-400">
                  Chuẩn hóa Lookbook số CLOOP 2026
                </div>
              </div>

            </div>

            {/* Giá & Hành Động Thuê Cả Set */}
            {canvasItems.length > 0 && (
              <div className="rounded-2xl bg-gradient-to-r from-[#183A2D] to-[#255644] p-4 sm:p-5 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#A3E39F] bg-white/10 px-2 py-0.5 rounded-full">
                      {canvasItems.length} Món Đã Phối
                    </span>
                    {isCombo && (
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full">
                        Giảm 10% Combo Set
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-heading text-2xl sm:text-3xl font-black text-white">
                      {finalTotalPrice.toLocaleString("vi-VN")}đ
                      <span className="text-xs font-normal text-stone-300">/ngày</span>
                    </span>
                    {isCombo && (
                      <span className="text-xs text-stone-300 line-through">
                        {rawTotalPrice.toLocaleString("vi-VN")}đ
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowRentModal(true)}
                  className="px-6 py-3 rounded-full bg-[#A3E39F] hover:bg-emerald-300 text-stone-950 font-heading font-extrabold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <ShoppingBag size={15} />
                  <span>Thuê Trọn Bộ Set Này</span>
                </button>
              </div>
            )}
          </div>

          {/* CỘT PHẢI (5 cols): KHO TRANG PHỤC CLOOP ĐỂ CHỌN PHỐI ĐỒ */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl bg-white border border-stone-200/80 p-4 sm:p-5 shadow-sm space-y-3.5">
              
              <div>
                <h3 className="font-heading font-bold text-base text-[#183A2D] flex items-center gap-2">
                  <Shirt size={16} className="text-emerald-700" /> Chọn Trang Phục Ghép Đồ
                </h3>
                <p className="text-xs text-stone-500">
                  Bấm vào món đồ bất kỳ để thêm vào bảng phối Lookbook
                </p>
              </div>

              {/* Tìm kiếm nhanh */}
              <div className="flex items-center gap-2 border border-stone-200 bg-stone-50 rounded-xl px-3 py-1.5 focus-within:bg-white focus-within:border-[#183A2D] transition-colors">
                <Search size={14} className="text-stone-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Lọc theo tên áo, đầm, váy..."
                  className="bg-transparent border-none outline-none text-xs w-full text-stone-800 placeholder:text-stone-400"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-stone-400 hover:text-stone-600">
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {CATEGORY_TABS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-[#183A2D] text-white shadow-2xs"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Product Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredProducts.map((p) => {
                  const isAdded = canvasItems.some((it) => it.productId === p.id);

                  return (
                    <div
                      key={p.id}
                      onClick={() => addItemToCanvas(p)}
                      className={`group relative rounded-2xl border p-2 bg-stone-50/60 hover:bg-emerald-50/40 hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between ${
                        isAdded ? "border-emerald-500 bg-emerald-50/30" : "border-stone-200/80"
                      }`}
                    >
                      <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-white mb-2">
                        <img
                          src={p.image}
                          alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {isAdded && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                            <Check size={11} />
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="text-[11px] font-bold text-stone-800 line-clamp-1 group-hover:text-[#183A2D]">
                          {p.title}
                        </h4>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-emerald-800 font-mono">
                            {p.price.toLocaleString("vi-VN")}đ
                          </span>
                          <span className="text-[9px] text-stone-400 truncate max-w-[60px]">
                            {p.ownerName}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="mt-1.5 w-full py-1 rounded-lg bg-white border border-stone-200 group-hover:bg-[#183A2D] group-hover:text-white group-hover:border-transparent text-[10px] font-bold text-stone-600 transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus size={11} /> Thêm vào bảng
                      </button>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* MODAL DANH SÁCH THUÊ THEO SET */}
      {showRentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 space-y-4">
            
            <button
              type="button"
              onClick={() => setShowRentModal(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-extrabold uppercase tracking-wider font-mono">
                CLOOP Combo Set
              </span>
              <h3 className="text-lg font-heading font-extrabold text-[#183A2D]">
                Danh Sách Thuê Bộ Outfit ({canvasItems.length} Món)
              </h3>
              <p className="text-xs text-stone-500">
                Bạn có thể bấm vào từng món để tiến hành đặt thuê ngay:
              </p>
            </div>

            <div className="divide-y divide-stone-100 max-h-[300px] overflow-y-auto pr-1">
              {canvasItems.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-12 h-14 object-cover rounded-lg border border-stone-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-stone-800 truncate">{item.title}</p>
                      <p className="text-[10px] text-stone-400 truncate">Chủ tủ: {item.ownerName}</p>
                      <p className="text-[11px] font-mono font-bold text-emerald-800">
                        {item.price.toLocaleString("vi-VN")}đ/ngày
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/product/${item.productId}`}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#183A2D] text-xs font-bold transition-colors shrink-0 flex items-center gap-1"
                  >
                    <span>Xem & Thuê</span>
                    <ArrowRight size={11} />
                  </Link>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Tổng giá thuê gốc:</span>
                <span>{rawTotalPrice.toLocaleString("vi-VN")}đ</span>
              </div>
              {isCombo && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Ưu đãi Combo Set (10%):</span>
                  <span>-{comboDiscount.toLocaleString("vi-VN")}đ</span>
                </div>
              )}
              <div className="flex justify-between text-stone-900 font-bold text-sm pt-1 border-t border-stone-200">
                <span>Tổng thanh toán dự kiến:</span>
                <span className="text-emerald-800 font-black">{finalTotalPrice.toLocaleString("vi-VN")}đ/ngày</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowRentModal(false)}
              className="w-full py-2.5 bg-[#183A2D] text-white font-bold text-xs rounded-xl hover:bg-[#2A6E46] transition-colors cursor-pointer"
            >
              Đóng Cửa Sổ
            </button>

          </div>
        </div>
      )}
    </div>
  );
}
