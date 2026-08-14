"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Shirt, Eye, EyeOff, MoreHorizontal, Edit, PackageX, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export function ItemsClient({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<"ALL" | "SELLING" | "RENTING" | "HIDDEN">("ALL");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const router = useRouter();

  const handleToggleBlogVisibility = async (productId: string, currentlyHidden: boolean) => {
    if (isUpdating) return;
    setIsUpdating(true);
    const newStatus = currentlyHidden ? "PUBLIC" : "HIDDEN";
    try {
      const { error } = await supabase
        .from("blog_posts")
        .update({ status: newStatus })
        .eq("productId", productId);
      
      if (error) throw error;
      alert(currentlyHidden ? "🎉 Đã đẩy câu chuyện Lookbook hiển thị lại công khai trên Blog!" : "🛑 Đã ẩn câu chuyện khỏi luồng bài viết công khai!");
      
      setItems(items.map(item => 
        item.id === productId ? { ...item, isBlogHidden: !currentlyHidden } : item
      ));
      
      router.refresh();
    } catch (err: any) {
      alert(`Lỗi xử lý cổng Blog: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleActionClick = (action: string, itemId: string) => {
    setOpenMenuId(null);
    if (action === 'boost') {
      alert('Đã thêm sản phẩm vào hàng đợi Boost (Đẩy tin) 🚀');
    } else if (action === 'edit') {
      router.push(`/shop/${itemId}/edit`); 
    } else if (action === 'hide') {
      alert('Tính năng ẩn sản phẩm đang được xây dựng.');
    }
  };

  const filteredItems = items.filter(item => {
    if (activeTab === "ALL") return true;
    if (activeTab === "SELLING") return item.isSaleActive;
    if (activeTab === "RENTING") return item.isRentalActive;
    if (activeTab === "HIDDEN") return item.isShopHidden;
    return true;
  });

  return (
    <div className="bg-transparent flex flex-col mt-4">
      {/* TABS */}
      <div className="flex w-full overflow-x-auto no-scrollbar gap-2 mb-6">
        <button 
          onClick={() => setActiveTab("ALL")} 
          className={`px-4 py-2 text-xs font-bold rounded-full transition-all whitespace-nowrap ${activeTab === "ALL" ? "bg-[#183A2D] text-white shadow-md" : "bg-white text-stone-500 hover:bg-stone-100 border border-stone-200/60"}`}
        >
          Tất cả ({items.length})
        </button>
        <button 
          onClick={() => setActiveTab("SELLING")} 
          className={`px-4 py-2 text-xs font-bold rounded-full transition-all whitespace-nowrap ${activeTab === "SELLING" ? "bg-blue-600 text-white shadow-md" : "bg-white text-stone-500 hover:bg-stone-100 border border-stone-200/60"}`}
        >
          Đang Bán ({items.filter(i => i.isSaleActive).length})
        </button>
        <button 
          onClick={() => setActiveTab("RENTING")} 
          className={`px-4 py-2 text-xs font-bold rounded-full transition-all whitespace-nowrap ${activeTab === "RENTING" ? "bg-emerald-600 text-white shadow-md" : "bg-white text-stone-500 hover:bg-stone-100 border border-stone-200/60"}`}
        >
          Đang Cho Thuê ({items.filter(i => i.isRentalActive).length})
        </button>
        <button 
          onClick={() => setActiveTab("HIDDEN")} 
          className={`px-4 py-2 text-xs font-bold rounded-full transition-all whitespace-nowrap ${activeTab === "HIDDEN" ? "bg-stone-600 text-white shadow-md" : "bg-white text-stone-500 hover:bg-stone-100 border border-stone-200/60"}`}
        >
          Đã Ẩn ({items.filter(i => i.isShopHidden).length})
        </button>
      </div>

      {/* GRID VIEW */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          <AnimatePresence>
            {filteredItems.map((item) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                key={item.id} 
                className="bg-white rounded-2xl border border-stone-200/60 shadow-sm hover:shadow-md transition-shadow overflow-hidden group relative flex flex-col"
              >
                {/* QUICK ACTIONS MENU */}
                <div className="absolute top-2 right-2 z-20">
                  <button 
                    onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                    className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-stone-700 hover:bg-white shadow-sm border border-stone-200 transition-colors"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  
                  {openMenuId === item.id && (
                    <div className="absolute top-10 right-0 w-36 bg-white rounded-xl shadow-xl border border-stone-200/60 py-2 flex flex-col z-30">
                      <button onClick={() => handleActionClick('edit', item.id)} className="px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 flex items-center gap-2 text-left">
                        <Edit size={14} /> Sửa giá
                      </button>
                      <button onClick={() => handleActionClick('boost', item.id)} className="px-4 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 flex items-center gap-2 text-left">
                        <TrendingUp size={14} /> Đẩy tin (Boost)
                      </button>
                      <div className="h-px w-full bg-stone-100 my-1"></div>
                      <button onClick={() => handleActionClick('hide', item.id)} className="px-4 py-2 text-xs font-medium text-stone-500 hover:bg-stone-50 flex items-center gap-2 text-left">
                        <PackageX size={14} /> Ẩn sản phẩm
                      </button>
                    </div>
                  )}
                </div>

                {/* OVERLAY CLICK ĐÓNG MENU */}
                {openMenuId === item.id && (
                  <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)}></div>
                )}

                {/* IMAGE */}
                <div className="relative aspect-[3/4] bg-stone-100 overflow-hidden">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  
                  {/* BADGES THÔNG MINH */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
                    {item.isShopHidden && (
                      <span className="px-2 py-1 bg-stone-800/80 backdrop-blur-sm text-white text-[10px] font-bold rounded-md shadow-sm">
                        Đã Ẩn
                      </span>
                    )}
                    {!item.isShopHidden && item.isCurrentlyRenting && (
                      <span className="px-2 py-1 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-md shadow-sm flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> Đang có người thuê
                      </span>
                    )}
                    {!item.isShopHidden && !item.isCurrentlyRenting && (item.isRentalActive || item.isSaleActive) && (
                      <span className="px-2 py-1 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-md shadow-sm">
                        Sẵn sàng
                      </span>
                    )}
                  </div>
                </div>

                {/* INFO */}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <h3 className="font-bold text-[#183A2D] text-sm line-clamp-1 flex-1" title={item.name}>{item.name}</h3>
                    <span className="text-[10px] font-bold text-stone-400 uppercase bg-stone-100 px-1.5 py-0.5 rounded shrink-0">SZ {item.size}</span>
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
                  <div className={`px-4 py-2 text-[10px] font-bold flex justify-between items-center border-t ${item.isBlogHidden ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-stone-50 text-stone-600 border-stone-100'}`}>
                    <span>Lookbook: {item.isBlogHidden ? 'Đang ẩn' : 'Công khai'}</span>
                    <button 
                      onClick={() => handleToggleBlogVisibility(item.id, item.isBlogHidden)}
                      disabled={isUpdating}
                      className="hover:text-[#183A2D] transition-colors"
                      title={item.isBlogHidden ? 'Hiện Lookbook' : 'Ẩn Lookbook'}
                    >
                      {item.isBlogHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-2xl border border-stone-200/60 border-dashed">
          <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center text-stone-300 mb-4">
            <Shirt size={32} />
          </div>
          <h3 className="text-lg font-bold text-stone-800 mb-2">Không tìm thấy sản phẩm</h3>
          <p className="text-sm text-stone-500 max-w-sm mb-6">Bạn chưa có sản phẩm nào thuộc danh mục này. Hãy đăng đồ lên CLOOP ngay để bắt đầu nhé!</p>
          <Link href="/my-closet/create" className="inline-flex items-center gap-2 bg-[#183A2D] text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-[#112a20] transition-colors shadow-sm hover:shadow-md hover:-translate-y-0.5">
            <Plus size={16} /> Đăng bán ngay
          </Link>
        </div>
      )}
    </div>
  );
}
