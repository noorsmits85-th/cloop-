"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Bookmark, ArrowRight, Sparkles, ShoppingBag, Clock, Trash2, Store } from "lucide-react";
import { toggleProductInteractionAction } from "@/app/actions/favorite";

interface WishlistProduct {
  id: string;
  title: string;
  size: string;
  category: string;
  brand?: string | null;
  province: string;
  likeCount: number;
  saveCount: number;
  image: string;
  basePrice: number;
  deposit: number;
  owner?: {
    id: string;
    name: string | null;
    avatar: string | null;
    rating: number;
  } | null;
  isAvailable: boolean;
  busyUntil?: Date | string | null;
}

export interface WishlistItem {
  favoriteId: string;
  type: string;
  savedAt: Date | string;
  product: WishlistProduct;
}

interface WishlistClientProps {
  initialItems: WishlistItem[];
  counts: {
    all: number;
    save: number;
    like: number;
  };
}

export default function WishlistClient({ initialItems, counts }: WishlistClientProps) {
  // Chuẩn BigTech: Mặc định mở Tab "Đã lưu (SAVE)" trước vì intent chốt đơn cao nhất!
  const [activeTab, setActiveTab] = useState<"SAVE" | "LIKE" | "ALL">("SAVE");
  const [items, setItems] = useState<WishlistItem[]>(initialItems);
  const [isRemovingId, setIsRemovingId] = useState<string | null>(null);

  const filteredItems = items.filter(item => {
    if (activeTab === "ALL") return true;
    return item.type === activeTab;
  });

  const handleRemove = async (productId: string, type: "LIKE" | "SAVE", favoriteId: string) => {
    setIsRemovingId(favoriteId);
    // Optimistic removal
    setItems(prev => prev.filter(i => i.favoriteId !== favoriteId));
    
    await toggleProductInteractionAction(productId, type);
    setIsRemovingId(null);
  };

  const formatDate = (dateStr?: Date | string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200/70 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-serif font-bold text-[#183A2D] tracking-wide">
            Đồ Đã Thích & Đã Lưu
          </h1>
          <p className="text-xs text-stone-500 font-light mt-1">
            Bộ sưu tập phong cách cá nhân — Dễ dàng theo dõi tình trạng sẵn sàng và thuê ngay khi cần.
          </p>
        </div>

        {/* Tab Filters (Chuẩn UX: Tab Đã Lưu lên đầu) */}
        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("SAVE")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "SAVE"
                ? "bg-white text-[#183A2D] shadow-xs"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Bookmark size={14} className={activeTab === "SAVE" ? "fill-[#183A2D]" : ""} />
            Đã Lưu
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "SAVE" ? "bg-[#183A2D]/10 text-[#183A2D]" : "bg-stone-200 text-stone-600"}`}>
              {counts.save}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("LIKE")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "LIKE"
                ? "bg-white text-rose-600 shadow-xs"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Heart size={14} className={activeTab === "LIKE" ? "fill-rose-500 text-rose-500" : ""} />
            Đã Thả Tim
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "LIKE" ? "bg-rose-50 text-rose-600" : "bg-stone-200 text-stone-600"}`}>
              {counts.like}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "ALL"
                ? "bg-white text-[#183A2D] shadow-xs"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            Tất cả ({counts.all})
          </button>
        </div>
      </div>

      {/* Grid Sản Phẩm */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItems.map(({ favoriteId, type, product }) => (
            <div
              key={favoriteId}
              className="group bg-white rounded-xl border border-stone-200/70 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              {/* Product Image & Badges */}
              <div className="relative aspect-[3/4] bg-stone-100 overflow-hidden">
                <Image
                  src={product.image}
                  alt={product.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  unoptimized
                />

                {/* Tag Loại Tương Tác */}
                <div className="absolute top-2.5 left-2.5 z-10">
                  {type === "SAVE" ? (
                    <span className="bg-[#183A2D]/90 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md flex items-center gap-1 shadow-xs">
                      <Bookmark size={11} className="fill-white" /> Đã Lưu
                    </span>
                  ) : (
                    <span className="bg-rose-600/90 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md flex items-center gap-1 shadow-xs">
                      <Heart size={11} className="fill-white" /> Đã Thích
                    </span>
                  )}
                </div>

                {/* Nút Xóa Khỏi Wishlist */}
                <button
                  onClick={() => handleRemove(product.id, type as "LIKE" | "SAVE", favoriteId)}
                  disabled={isRemovingId === favoriteId}
                  title="Gỡ khỏi danh sách"
                  className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/80 hover:bg-white text-stone-600 hover:text-red-600 backdrop-blur-md flex items-center justify-center transition-colors shadow-xs z-10 cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>

                {/* Trạng Thái Tồn Kho / Sẵn Sàng (Airbnb/Shopee UX) */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10">
                  {product.isAvailable ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1 rounded-md shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> Sẵn sàng cho thuê
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-amber-800/90 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1 rounded-md shadow-xs">
                      <Clock size={11} /> Đang bận đến {formatDate(product.busyUntil)}
                    </span>
                  )}
                </div>
              </div>

              {/* Thông tin Sản Phẩm */}
              <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-stone-500 uppercase tracking-wider mb-1">
                    <span>{product.brand || product.category}</span>
                    <span className="font-semibold text-stone-700">Size {product.size}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-stone-900 line-clamp-1 group-hover:text-[#183A2D] transition-colors">
                    {product.title}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Chủ tủ: <span className="font-medium text-stone-700">{product.owner?.name || "Member"}</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-stone-400">Giá thuê</p>
                    <p className="text-sm font-bold text-[#183A2D]">
                      {product.basePrice.toLocaleString('vi-VN')}đ <span className="text-[10px] font-normal text-stone-500">/ngày</span>
                    </p>
                  </div>

                  {product.isAvailable ? (
                    <Link
                      href={`/checkout/${product.id}`}
                      className="inline-flex items-center gap-1 bg-[#183A2D] hover:bg-[#122b22] text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shadow-xs"
                    >
                      Thuê ngay <ArrowRight size={13} />
                    </Link>
                  ) : (
                    <Link
                      href={`/product/${product.id}`}
                      className="inline-flex items-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                    >
                      Xem lịch trống
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white rounded-2xl border border-stone-200/60 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-4">
            {activeTab === "LIKE" ? <Heart size={28} strokeWidth={1.5} /> : <Bookmark size={28} strokeWidth={1.5} />}
          </div>
          <h3 className="text-base font-semibold text-stone-900 mb-1">
            {activeTab === "LIKE" 
              ? "Bạn chưa thả tim món đồ nào" 
              : activeTab === "SAVE" 
              ? "Bạn chưa lưu món đồ nào vào tủ yêu thích" 
              : "Danh sách yêu thích đang trống"}
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mb-6 font-light leading-relaxed">
            Dạo một vòng quanh Tủ đồ Tuần hoàn CLOOP để tìm kiếm những thiết kế cao cấp và bấm Lưu / Thả tim những món đồ bạn yêu thích nhé!
          </p>
          <Link
            href="/"
            className="border border-[#183A2D] bg-[#183A2D] hover:bg-transparent text-white hover:text-[#183A2D] font-semibold text-xs py-3 px-6 rounded-xl transition-all duration-300 shadow-xs"
          >
            Khám phá tủ đồ ngay
          </Link>
        </div>
      )}
    </div>
  );
}
