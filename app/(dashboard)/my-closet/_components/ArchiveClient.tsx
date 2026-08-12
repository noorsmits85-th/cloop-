"use client";

import React, { useState } from "react";
import { ArchiveRestore, Trash2, Box } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export function ArchiveClient({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleRestore = async (id: string) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({ isShopHidden: false })
        .eq("id", id);
      
      if (error) throw error;
      alert("Đã khôi phục sản phẩm về tủ đồ công khai thành công!");
      setItems(items.filter(i => i.id !== id));
      router.refresh();
    } catch (err: any) {
      alert("Lỗi khôi phục: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRecycle = () => {
    alert("Đã gửi yêu cầu thu gom tái chế (CLOOP Return). Bạn sẽ được cộng +50 CloopCoins khi đối tác đến nhận đồ!");
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-2xl border border-stone-200/60 border-dashed">
        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center text-stone-300 mb-4">
          <Box size={32} />
        </div>
        <h3 className="text-lg font-bold text-stone-800 mb-2">Kho lưu trữ trống</h3>
        <p className="text-sm text-stone-500 max-w-sm">Những món đồ bạn ẩn khỏi Tủ Đồ sẽ xuất hiện ở đây.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(item => (
        <div key={item.id} className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden flex gap-4 p-4 grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100">
          <img src={item.image} alt={item.name} className="w-24 h-28 object-cover rounded-lg bg-stone-100" />
          <div className="flex flex-col flex-1">
            <h3 className="font-bold text-stone-800 text-sm line-clamp-1">{item.name}</h3>
            <p className="text-[10px] text-stone-500 mt-1">Đã ẩn khỏi Tủ đồ</p>
            
            <div className="mt-auto flex flex-col gap-2">
              <button 
                onClick={() => handleRestore(item.id)}
                disabled={isUpdating}
                className="w-full py-1.5 text-[10px] font-bold bg-[#183A2D] text-white rounded-lg flex items-center justify-center gap-1.5 hover:bg-[#23452F] transition-colors"
              >
                <ArchiveRestore size={12} /> Đăng bán lại
              </button>
              <button 
                onClick={handleRecycle}
                className="w-full py-1.5 text-[10px] font-bold bg-stone-100 text-stone-600 rounded-lg flex items-center justify-center gap-1.5 hover:bg-stone-200 transition-colors"
              >
                <Trash2 size={12} /> Tái chế (+50 Coins)
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
