"use client";

interface ClosetSearchProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
}

export default function ClosetSearch({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
}: ClosetSearchProps) {
  const tabs = [
    { key: "ALL", label: "Tất cả đồ" },
    { key: "ACTIVE", label: "Hiển thị" },
    { key: "RENTED", label: "Đang thuê" },
    { key: "HIDDEN", label: "Đã ẩn" },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-3 rounded-xl border border-[#E9E2D8] shadow-sm">
      {/* Thanh tìm kiếm gõ chữ */}
      <div className="relative w-full md:max-w-xs">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Tìm nhanh tên đồ..."
          className="w-full px-4 py-2 text-xs bg-[#FDFBF7] border border-[#E9E2D8] rounded-xl focus:outline-none focus:border-[#183A2D] text-[#183A2D]"
        />
      </div>

      {/* Các tab chuyển trạng thái */}
      <div className="flex flex-wrap gap-1 w-full md:w-auto justify-start md:justify-end">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === tab.key
                ? "bg-[#183A2D] text-[#FDFBF7]"
                : "bg-[#FDFBF7] text-[#183A2D] hover:bg-gray-50 border border-[#E9E2D8]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}