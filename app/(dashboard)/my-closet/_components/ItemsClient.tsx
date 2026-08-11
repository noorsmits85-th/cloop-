"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Shirt, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export function ItemsClient({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleToggleBlogVisibility = async (productId: string, currentlyHidden: boolean) => {
    if (isUpdating) return;
    setIsUpdating(true);
    const newStatus = currentlyHidden ? "PUBLIC" : "HIDDEN";
    try {
      const { error } = await supabase
        .from("BlogPost")
        .update({ status: newStatus })
        .eq("productId", productId);
      
      if (error) throw error;
      alert(currentlyHidden ? "🎉 Đã đẩy câu chuyện Lookbook hiển thị lại công khai trên Blog nhé!" : "🛑 Đã ẩn câu chuyện khỏi luồng bài viết công khai thành công nhé!");
      
      // Update local state optimistically
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

  return (
    <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden flex flex-col mt-4">
      <div className="flex border-b border-stone-100 w-full px-2 pt-2 overflow-x-auto no-scrollbar bg-stone-50/50">
        <div className="px-4 py-3 text-xs font-bold border-b-2 border-transparent text-[#183A2D] !border-[#183A2D] bg-white rounded-t-lg transition-all flex items-center gap-2 whitespace-nowrap">
          <Shirt size={16} /> Kho sản phẩm
          <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-[#183A2D]/10 text-[#183A2D]">{items.length}</span>
        </div>
      </div>

      <div className="p-0">
        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/30 text-stone-400 font-bold text-[10px] uppercase tracking-wider">
                  <th className="py-4 px-6 w-16">Sản phẩm</th>
                  <th className="py-4 px-6">Trạng thái</th>
                  <th className="py-4 px-6 text-emerald-800">Blog Lookbook</th>
                  <th className="py-4 px-6 text-right text-emerald-800">Giá Thuê</th>
                  <th className="py-4 px-6 text-right text-blue-800">Giá Bán</th>
                  <th className="py-4 px-6 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-600 text-[13px]">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/50 transition-colors group">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-16 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200/50">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col max-w-[200px]">
                          <span className="font-bold text-[#183A2D] truncate">{item.name}</span>
                          <span className="text-[11px] text-stone-400">Size {item.size}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex flex-col gap-1.5">
                        {item.isRentalActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 w-fit">
                            <CheckCircle2 size={10} /> Cho Thuê
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 w-fit">Không cho thuê</span>
                        )}
                        {item.isSaleActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 w-fit">
                            <CheckCircle2 size={10} /> Bán Thanh Lý
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 w-fit">Không bán</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex flex-col gap-1 max-w-[150px]">
                        <span className="truncate text-xs font-semibold text-stone-700">{item.blogTitle}</span>
                        <span className={`text-[10px] font-bold ${item.hasBlog ? (item.isBlogHidden ? 'text-amber-600' : 'text-emerald-600') : 'text-stone-400'}`}>
                          {item.hasBlog ? (item.isBlogHidden ? 'Đã Ẩn' : 'Đang Hiển Thị') : 'Chưa có bài'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-right font-mono font-bold text-emerald-700">
                      {item.isRentalActive ? `${item.rentalPrice.toLocaleString()}₫` : '-'}
                    </td>
                    <td className="py-3 px-6 text-right font-mono font-bold text-blue-700">
                      {item.isSaleActive ? `${item.salePrice.toLocaleString()}₫` : '-'}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-stone-400 hover:text-[#183A2D] hover:bg-stone-100 rounded-lg transition-colors" title="Chỉnh sửa">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        {item.hasBlog && (
                          <button onClick={() => handleToggleBlogVisibility(item.id, item.isBlogHidden)} disabled={isUpdating} className={`p-1.5 rounded-lg transition-colors ${item.isBlogHidden ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'} ${isUpdating ? 'opacity-50' : ''}`} title={item.isBlogHidden ? 'Hiện Blog' : 'Ẩn Blog'}>
                            {item.isBlogHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center text-stone-300 mb-4">
              <Shirt size={32} />
            </div>
            <h3 className="text-lg font-bold text-stone-800 mb-2">Tủ đồ trống</h3>
            <p className="text-sm text-stone-500 max-w-sm mb-6">Bạn chưa có sản phẩm nào đang niêm yết. Hãy đăng đồ lên CLOOP ngay để bắt đầu cho thuê và bán thanh lý nhé!</p>
            <Link href="/my-closet/create" className="inline-flex items-center gap-2 bg-[#183A2D] text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-[#112a20] transition-colors shadow-sm hover:shadow-md hover:-translate-y-0.5">
              <Plus size={16} /> Đăng bán ngay
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
