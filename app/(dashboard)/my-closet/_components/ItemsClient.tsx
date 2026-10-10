"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Plus, 
  Shirt, 
  Eye, 
  EyeOff, 
  MoreHorizontal, 
  Edit, 
  PackageX, 
  TrendingUp, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  EyeIcon,
  Zap,
  Layers,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  Leaf,
  Share2,
  ExternalLink,
  Copy
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { deleteProductAction, toggleProductHideAction } from "../items/actions";
import { toggleBlogPostStatusAction } from "@/app/actions/blog";
import BoostListingModal from "@/app/components/BoostListingModal";

interface ItemData {
  id: string;
  name: string;
  category?: string;
  size: string;
  image: string;
  images: string[];
  isRentalActive: boolean;
  rentalPrice: number;
  activeRentals: any[];
  isCurrentlyRenting: boolean;
  isSaleActive: boolean;
  salePrice: number;
  listingIds: string[];
  isShopHidden: boolean;
  hasBlog: boolean;
  blogTitle: string;
  isBlogHidden: boolean;
  boostExpiresAt?: string | null;
  isHighlighted?: boolean;
}

function ClosetItemCard({
  item,
  onToggleBlog,
  onDelete,
  onToggleHide,
  onBoost,
  isUpdating,
}: {
  item: ItemData;
  onToggleBlog: (productId: string, currentlyHidden: boolean) => void;
  onDelete: (productId: string, title: string) => void;
  onToggleHide: (productId: string, currentIsHidden: boolean) => void;
  onBoost: (item: ItemData) => void;
  isUpdating: boolean;
}) {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [openMenu, setOpenMenu] = useState(false);
  const router = useRouter();

  const imagesList = item.images && item.images.length > 0 ? item.images : [item.image];
  const hasMultipleImages = imagesList.length > 1;

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIdx((prev) => (prev > 0 ? prev - 1 : imagesList.length - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIdx((prev) => (prev < imagesList.length - 1 ? prev + 1 : 0));
  };

  const isBoosted = item.boostExpiresAt && new Date(item.boostExpiresAt) > new Date();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`bg-white rounded-2xl border transition-all overflow-hidden group relative flex flex-col ${
        isBoosted ? "border-amber-400 ring-2 ring-amber-300/40 shadow-md" : "border-stone-200/70 shadow-sm hover:shadow-md"
      }`}
    >
      {/* QUICK ACTIONS MENU */}
      <div className="absolute top-2.5 right-2.5 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenu(!openMenu);
          }}
          className="w-8 h-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-stone-700 hover:bg-white shadow-sm border border-stone-200 transition-colors"
          title="Tùy chọn"
        >
          <MoreHorizontal size={16} />
        </button>

        {openMenu && (
          <div className="absolute top-10 right-0 w-44 bg-white rounded-2xl shadow-2xl border border-stone-200/80 py-1.5 flex flex-col z-30 overflow-hidden text-xs">
            <button
              onClick={() => {
                setOpenMenu(false);
                router.push(`/shop/${item.id}/edit`);
              }}
              className="px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 flex items-center gap-2.5 text-left cursor-pointer"
            >
              <Edit size={14} className="text-stone-500" /> Sửa món đồ
            </button>
            <button
              onClick={() => {
                setOpenMenu(false);
                onBoost(item);
              }}
              className="px-4 py-2.5 font-medium text-amber-600 hover:bg-amber-50 flex items-center gap-2.5 text-left cursor-pointer"
            >
              <TrendingUp size={14} /> Đẩy tin (Boost)
            </button>
            <button
              onClick={() => {
                setOpenMenu(false);
                onToggleHide(item.id, item.isShopHidden);
              }}
              className="px-4 py-2.5 font-medium text-stone-600 hover:bg-stone-50 flex items-center gap-2.5 text-left cursor-pointer"
            >
              {item.isShopHidden ? (
                <>
                  <EyeIcon size={14} className="text-emerald-600" /> Hiện trên sàn
                </>
              ) : (
                <>
                  <PackageX size={14} className="text-stone-500" /> Ẩn khỏi sàn
                </>
              )}
            </button>
            <div className="h-px w-full bg-stone-100 my-1"></div>
            <button
              onClick={() => {
                setOpenMenu(false);
                onDelete(item.id, item.name);
              }}
              className="px-4 py-2.5 font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 text-left cursor-pointer"
            >
              <Trash2 size={14} /> Xóa món đồ
            </button>
          </div>
        )}
      </div>

      {openMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(false)}></div>
      )}

      {/* MULTI-IMAGE CAROUSEL (BY ROTATION STYLE) */}
      <div className="relative aspect-[3/4] bg-stone-100 overflow-hidden select-none">
        <img
          src={imagesList[activeImageIdx]}
          alt={item.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Carousel Navigation Arrows */}
        {hasMultipleImages && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 z-10 shadow-sm"
              title="Ảnh trước"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 z-10 shadow-sm"
              title="Ảnh sau"
            >
              <ChevronRight size={16} />
            </button>

            {/* Navigation Dots */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {imagesList.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIdx(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    activeImageIdx === idx ? "w-3.5 bg-white shadow-sm" : "w-1.5 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>

            {/* Photo Counter Tag */}
            <div className="absolute bottom-2.5 right-2.5 z-10">
              <span className="px-2 py-0.5 bg-black/50 backdrop-blur-md text-white text-[9px] font-bold rounded-full tracking-wider">
                {activeImageIdx + 1}/{imagesList.length}
              </span>
            </div>
          </>
        )}

        {/* BADGES THÔNG MINH */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10 pointer-events-none">
          {isBoosted && (
            <span className="px-2.5 py-1 bg-[#183A2D] text-white text-[10px] font-bold rounded-lg shadow-sm flex items-center gap-1">
              <Zap size={11} className="fill-white" /> Đang Đẩy Top
            </span>
          )}
          {item.isShopHidden && (
            <span className="px-2.5 py-1 bg-stone-800/85 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg shadow-sm">
              Đã Ẩn
            </span>
          )}
          {!item.isShopHidden && item.isCurrentlyRenting && (
            <span className="px-2.5 py-1 bg-amber-500/95 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> Đang có người thuê
            </span>
          )}
          {!item.isShopHidden && !item.isCurrentlyRenting && (item.isRentalActive || item.isSaleActive) && (
            <span className="px-2.5 py-1 bg-emerald-600/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg shadow-sm">
              Sẵn sàng
            </span>
          )}
        </div>
      </div>

      {/* INFO */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-1 gap-2">
          <h3 className="font-bold text-[#183A2D] text-sm line-clamp-1 flex-1" title={item.name}>
            {item.name}
          </h3>
          <span className="text-[10px] font-bold text-stone-400 uppercase bg-stone-100 px-1.5 py-0.5 rounded shrink-0">
            SZ {item.size}
          </span>
        </div>

        <div className="flex flex-col gap-1 mt-auto pt-3 border-t border-stone-100">
          {item.isRentalActive && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-500 font-medium">Thuê</span>
              <span className="font-bold text-emerald-700">{item.rentalPrice.toLocaleString()}₫</span>
            </div>
          )}
          {item.isSaleActive && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-500 font-medium">Bán</span>
              <span className="font-bold text-blue-700">{item.salePrice.toLocaleString()}₫</span>
            </div>
          )}
        </div>
      </div>

      {/* BLOG TOGGLE BAR */}
      {item.hasBlog && (
        <div
          className={`px-4 py-2 text-[10px] font-bold flex justify-between items-center border-t ${
            item.isBlogHidden
              ? "bg-amber-50 text-amber-700 border-amber-100"
              : "bg-stone-50 text-stone-600 border-stone-100"
          }`}
        >
          <span>Lookbook: {item.isBlogHidden ? "Đang ẩn" : "Công khai"}</span>
          <button
            onClick={() => onToggleBlog(item.id, item.isBlogHidden)}
            disabled={isUpdating}
            className="hover:text-[#183A2D] transition-colors"
            title={item.isBlogHidden ? "Hiện Lookbook" : "Ẩn Lookbook"}
          >
            {item.isBlogHidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      )}
    </motion.div>
  );
}

export function ItemsClient({ 
  initialItems, 
  userId 
}: { 
  initialItems: ItemData[]; 
  userId?: string;
}) {
  const [items, setItems] = useState<ItemData[]>(initialItems);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<"ALL" | "SELLING" | "RENTING" | "HIDDEN">("ALL");
  const router = useRouter();

  // Boost Modal State
  const [selectedBoostItem, setSelectedBoostItem] = useState<ItemData | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 🌟 Sao chép link Tủ Đồ Công Khai
  const handleCopyClosetLink = async () => {
    if (!userId) {
      showToast("Không tìm thấy mã định danh tài khoản để tạo link.", "error");
      return;
    }
    const closetUrl = typeof window !== "undefined" 
      ? `${window.location.origin}/closet/${userId}` 
      : `/closet/${userId}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(closetUrl);
      } else {
        const input = document.createElement("input");
        input.value = closetUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      showToast("😊 Đã sao chép liên kết Tủ Đồ Công Khai.");
    } catch {
      showToast("Không thể sao chép liên kết. Vui lòng thử lại sau.", "error");
    }
  };


  const handleToggleBlogVisibility = async (productId: string, currentlyHidden: boolean) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      // Dùng Server Action an toàn với Prisma BlogPost
      const res = await toggleBlogPostStatusAction(productId, currentlyHidden);
      if (res.success) {
        showToast(
          currentlyHidden
            ? "😊 Đã hiển thị lại câu chuyện Lookbook trên Blog."
            : "Đã ẩn câu chuyện khỏi luồng bài viết công khai."
        );
        setItems(
          items.map((item) =>
            item.id === productId ? { ...item, isBlogHidden: !currentlyHidden } : item
          )
        );
        router.refresh();
      } else {
        // Fallback: Thử update qua Supabase vào BlogPost
        const newStatus = currentlyHidden ? "PUBLIC" : "HIDDEN";
        const { error } = await supabase
          .from("BlogPost")
          .update({ status: newStatus })
          .eq("productId", productId);

        if (error) throw error;
        showToast(
          currentlyHidden
            ? "😊 Đã hiển thị lại câu chuyện Lookbook."
            : "Đã ẩn câu chuyện Lookbook."
        );

        setItems(
          items.map((item) =>
            item.id === productId ? { ...item, isBlogHidden: !currentlyHidden } : item
          )
        );

        router.refresh();
      }
    } catch (err: any) {
      showToast(`Lỗi xử lý cổng Blog: ${err.message}`, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteProduct = async (productId: string, title: string) => {
    const isConfirmed = window.confirm(`Bạn có chắc chắn muốn xóa "${title}" khỏi tủ đồ của bạn không?`);
    if (!isConfirmed) return;

    try {
      const res = await deleteProductAction(productId);
      if (!res.success) {
        showToast("Lỗi khi xóa: " + res.error, "error");
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== productId));
      showToast("Đã xóa món đồ khỏi tủ đồ thành công!");
      router.refresh();
    } catch (err: any) {
      showToast("Lỗi khi xóa món đồ: " + (err.message || err), "error");
    }
  };

  const handleToggleHide = async (productId: string, currentIsHidden: boolean) => {
    try {
      const res = await toggleProductHideAction(productId, currentIsHidden);
      if (!res.success) {
        showToast("Lỗi: " + res.error, "error");
        return;
      }
      setItems((prev) =>
        prev.map((item) => (item.id === productId ? { ...item, isShopHidden: !currentIsHidden } : item))
      );
      showToast(currentIsHidden ? "🟢 Đã hiển thị món đồ lên Sàn!" : "📦 Đã ẩn món đồ khỏi Sàn!");
      router.refresh();
    } catch (err: any) {
      showToast("Lỗi khi đổi trạng thái: " + (err.message || err), "error");
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "SELLING") return item.isSaleActive;
    if (activeTab === "RENTING") return item.isRentalActive;
    if (activeTab === "HIDDEN") return item.isShopHidden;
    return true;
  });

  return (
    <div className="bg-transparent flex flex-col mt-4">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold font-ui flex items-center gap-2 transition-all ${
          toast.type === "error" 
            ? "bg-rose-50 border-rose-200 text-rose-900" 
            : "bg-emerald-900 border-emerald-700 text-white"
        }`}>
          {toast.type === "error" ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} className="text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* 🌟 BỘ TIỆN ÍCH LIÊN KẾT & QUẢN LÝ TỦ ĐỒ CÔNG KHAI */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-4 sm:p-5 shadow-2xs mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#183A2D] flex items-center justify-center shrink-0 border border-emerald-100">
            <Shirt size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#183A2D]">Tủ Đồ Của Tôi & Hồ Sơ Công Khai</h2>
            <p className="text-[11px] text-stone-500">
              Chia sẻ liên kết tủ đồ để bạn bè và khách hàng có thể khám phá, thuê hoặc mua trang phục của bạn.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          {userId && (
            <>
              <button
                type="button"
                onClick={handleCopyClosetLink}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                title="Sao chép liên kết tủ đồ để chia sẻ"
              >
                <Share2 size={14} /> Sao chép link tủ đồ
              </button>
              <Link
                href={`/closet/${userId}`}
                target="_blank"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#183A2D] border border-emerald-200/70 text-xs font-bold transition-all shadow-2xs"
              >
                <ExternalLink size={14} /> Xem Tủ Đồ Công Khai
              </Link>
            </>
          )}
          <Link
            href="/my-closet/create"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#183A2D] hover:bg-[#112a20] text-white text-xs font-bold transition-all shadow-xs"
          >
            <Plus size={14} /> Đăng trang phục mới
          </Link>
        </div>
      </div>

      {/* TABS */}
      <div className="flex w-full overflow-x-auto no-scrollbar gap-2 mb-6">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-4 py-2 text-xs font-bold rounded-full transition-all whitespace-nowrap ${
            activeTab === "ALL"
              ? "bg-[#183A2D] text-white shadow-md"
              : "bg-white text-stone-500 hover:bg-stone-100 border border-stone-200/60"
          }`}
        >
          Tất cả ({items.length})
        </button>
        <button
          onClick={() => setActiveTab("SELLING")}
          className={`px-4 py-2 text-xs font-bold rounded-full transition-all whitespace-nowrap ${
            activeTab === "SELLING"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-white text-stone-500 hover:bg-stone-100 border border-stone-200/60"
          }`}
        >
          Đang Bán ({items.filter((i) => i.isSaleActive).length})
        </button>
        <button
          onClick={() => setActiveTab("RENTING")}
          className={`px-4 py-2 text-xs font-bold rounded-full transition-all whitespace-nowrap ${
            activeTab === "RENTING"
              ? "bg-emerald-600 text-white shadow-md"
              : "bg-white text-stone-500 hover:bg-stone-100 border border-stone-200/60"
          }`}
        >
          Đang Cho Thuê ({items.filter((i) => i.isRentalActive).length})
        </button>
        <button
          onClick={() => setActiveTab("HIDDEN")}
          className={`px-4 py-2 text-xs font-bold rounded-full transition-all whitespace-nowrap ${
            activeTab === "HIDDEN"
              ? "bg-stone-600 text-white shadow-md"
              : "bg-white text-stone-500 hover:bg-stone-100 border border-stone-200/60"
          }`}
        >
          Đã Ẩn ({items.filter((i) => i.isShopHidden).length})
        </button>
      </div>

      {/* GRID VIEW */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          <AnimatePresence>
            {filteredItems.map((item) => (
              <ClosetItemCard
                key={item.id}
                item={item}
                onToggleBlog={handleToggleBlogVisibility}
                onDelete={handleDeleteProduct}
                onToggleHide={handleToggleHide}
                onBoost={(it) => setSelectedBoostItem(it)}
                isUpdating={isUpdating}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-2xl border border-stone-200/60 border-dashed">
          <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center text-stone-300 mb-4">
            <Shirt size={32} />
          </div>
          <h3 className="text-lg font-bold text-stone-800 mb-2">Không tìm thấy sản phẩm</h3>
          <p className="text-sm text-stone-500 max-w-sm mb-6">
            Bạn chưa có sản phẩm nào thuộc danh mục này. Hãy đăng đồ lên CLOOP ngay để bắt đầu nhé!
          </p>
          <Link
            href="/my-closet/create"
            className="inline-flex items-center gap-2 bg-[#183A2D] text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-[#112a20] transition-colors shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <Plus size={16} /> Đăng bán ngay
          </Link>
        </div>
      )}

      {/* MODAL NẠP LÁ ĐẨY BÀI LÊN TOP (VIETQR TỰ ĐỘNG NHƯ SHOPEE / DÙNG LÁ) */}
      <BoostListingModal
        isOpen={Boolean(selectedBoostItem)}
        onClose={() => setSelectedBoostItem(null)}
        items={items.map((item) => ({
          id: item.id,
          title: item.name,
          image: item.image,
          size: item.size,
          rentalPrice: item.rentalPrice,
          salePrice: item.salePrice,
          boostExpiresAt: item.boostExpiresAt,
          isBoostActive: Boolean(item.boostExpiresAt && new Date(item.boostExpiresAt) > new Date()),
          boostRemainingHours:
            item.boostExpiresAt && new Date(item.boostExpiresAt) > new Date()
              ? Math.max(1, Math.round((new Date(item.boostExpiresAt).getTime() - Date.now()) / (3600 * 1000)))
              : 0
        }))}
        preSelectedItemId={selectedBoostItem?.id}
        clientUserId={userId}
        onSuccess={(productId, newExpiresAt) => {
          setItems((prev) =>
            prev.map((i) =>
              i.id === productId
                ? { ...i, boostExpiresAt: newExpiresAt }
                : i
            )
          );
          showToast("⚡ Đã kích hoạt Đẩy Top thành công!");
          setSelectedBoostItem(null);
          router.refresh();
        }}
      />

    </div>
  );
}
