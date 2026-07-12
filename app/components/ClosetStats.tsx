"use client";

interface ClosetStatsProps {
  products: any[];
}

export default function ClosetStats({ products }: ClosetStatsProps) {
  const totalItems = products.length;
  const activeItems = products.filter((p) => p.status === "ACTIVE").length;
  const rentedItems = products.filter((p) => p.status === "RENTED").length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white p-4 rounded-xl border border-[#E9E2D8] shadow-sm">
        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Tổng đồ chia sẻ</p>
        <p className="text-xl font-bold text-[#183A2D] mt-1">{totalItems} <span className="text-xs font-normal text-gray-400">món</span></p>
      </div>
      <div className="bg-white p-4 rounded-xl border border-[#E9E2D8] shadow-sm">
        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">🟢 Đang hiển thị</p>
        <p className="text-xl font-bold text-emerald-600 mt-1">{activeItems}</p>
      </div>
      <div className="bg-white p-4 rounded-xl border border-[#E9E2D8] shadow-sm">
        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">👜 Đang được thuê</p>
        <p className="text-xl font-bold text-blue-600 mt-1">{rentedItems}</p>
      </div>
      <div className="bg-white p-4 rounded-xl border border-[#E9E2D8] shadow-sm">
        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">⭐ Green Points</p>
        <p className="text-xl font-bold text-amber-500 mt-1">420</p>
      </div>
    </div>
  );
}