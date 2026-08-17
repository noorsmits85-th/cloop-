"use client";

import { useLiveViewers } from '@/app/hooks/useLiveViewers';
import { Flame } from 'lucide-react'; 

export default function LiveViewerBadge() {
  // Giới hạn số người xem từ 2 đến 7 người để tạo độ hiếm
  const viewers = useLiveViewers(2, 7); 

  // Nếu bằng 0 hoặc 1 (do cấu hình) thì ẩn luôn cho đỡ quê
  if (viewers < 2) return null; 

  return (
    <div className="group relative flex items-center gap-2 w-fit px-3 py-1.5 mt-2 mb-4 bg-red-50/80 hover:bg-red-50 border border-red-200 rounded-full transition-all duration-300 shadow-sm">
      {/* Vòng tròn nhấp nháy đỏ */}
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
      </span>
      <span className="text-xs font-semibold text-red-700">
        <strong className="text-red-700 font-bold">{viewers}</strong> khách đang cân nhắc đồ này
      </span>
    </div>
  );
}
