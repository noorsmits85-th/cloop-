"use client";

import { Trash2, Edit, Copy, Shirt, Plus } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price_per_day: number;
  status: "active" | "hidden" | "rented" | "trash";
  category: string;
  images: string[];
  owner_id: string;
}

interface ClosetProductGridProps {
  products: Product[];
  loading: boolean;
  onOpenEdit: (product: Product) => void;
  onDuplicate: (product: Product) => void; 
  onMoveToTrash: (id: string) => void;     
  onOpenUpload: () => void; // 🔌 Đấu mạch kết nối sang nút Đăng đồ tổng
}

export default function ClosetProductGrid({
  products,
  loading,
  onOpenEdit,
  onDuplicate,
  onMoveToTrash,
  onOpenUpload,
}: ClosetProductGridProps) {
  
  // ✅ ĐÃ KHỬ HIỆU ỨNG NHẢY NHÓT: Trả lại không gian phẳng tối giản, sang trọng
  if (products.length === 0) {
    return (
      <div className="relative overflow-hidden text-center py-20 px-8 bg-white rounded-3xl border border-stone-200/80 shadow-[0_12px_40px_rgba(24,58,45,0.04)] w-full col-span-full flex flex-col items-center justify-center space-y-6">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-gradient-to-b from-emerald-50/30 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Icon hộp chứa gọn gàng, nghiêm túc */}
        <div className="relative w-20 h-20 bg-[#183A2D] text-[#FDFBF7] rounded-2xl flex items-center justify-center shadow-md">
          <Shirt className="w-10 h-10" />
        </div>
        
        <div className="space-y-2 max-w-md relative z-10">
          <h3 className="text-[#183A2D] font-black text-xl tracking-tight">
            Tủ đồ chưa có sản phẩm nhé Trang
          </h3>
          <p className="text-stone-500 text-sm leading-relaxed">
            Hệ thống cơ sở dữ liệu đã thông mạch. Hãy kích hoạt món đồ đầu tiên để bắt đầu quá trình hạch toán thời trang tuần hoàn.
          </p>
        </div>

        {/* 🎯 NỐI MẠCH THỰC TẾ: Bấm vào đây sẽ kích hoạt mở thẳng Form Đăng đồ */}
        <div className="pt-2 relative z-10">
          <button 
            onClick={onOpenUpload}
            className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-[#183A2D] hover:bg-[#245341] text-[#FDFBF7] font-bold text-sm shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Kích hoạt tủ đồ ngay</span>
          </button>
        </div>

      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full">
      {products.map((product) => (
        <div key={product.id} className="bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm flex flex-col justify-between">
          <div className="relative aspect-[3/4] bg-stone-100 w-full overflow-hidden">
            <img 
              src={product.images?.[0] || "https://placehold.co/300x400/png"} 
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 z-10">
              {product.status === "active" && <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">✨ Đang hiển thị</span>}
              {product.status === "rented" && <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">💎 Đang được thuê</span>}
              {product.status === "hidden" && <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">🔒 Tạm ẩn</span>}
              {product.status === "trash" && <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">🗑️ Thùng rác</span>}
            </div>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-semibold text-base text-[#183A2D] line-clamp-1">{product.name}</h3>
              <p className="text-sm font-semibold text-emerald-700 mt-1">
                {product.price_per_day.toLocaleString('vi-VN')}đ <span className="text-stone-400 font-normal text-xs">/ ngày</span>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-50">
              <button onClick={() => onOpenEdit(product)} className="flex items-center justify-center space-x-1 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-medium">
                <Edit className="w-3.5 h-3.5" /> <span>Sửa</span>
              </button>
              <button onClick={() => onDuplicate(product)} className="flex items-center justify-center space-x-1 py-2 rounded-xl bg-stone-50 hover:bg-emerald-50 hover:text-emerald-700 text-stone-700 text-xs font-medium">
                <Copy className="w-3.5 h-3.5" /> <span>Sao chép</span>
              </button>
              <button onClick={() => onMoveToTrash(product.id)} disabled={product.status === "trash"} className="flex items-center justify-center space-x-1 py-2 rounded-xl bg-stone-50 hover:bg-rose-50 hover:text-rose-700 text-stone-700 text-xs font-medium">
                <Trash2 className="w-3.5 h-3.5" /> <span>Gỡ</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}