"use client";

interface ClosetHeaderProps {
  onOpenUpload: () => void;
}

export default function ClosetHeader({ onOpenUpload }: ClosetHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#E9E2D8] pb-5 gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#183A2D]">Tủ đồ của tôi</h1>
        <p className="text-xs text-gray-500 mt-1">Quản lý kho đồ tuần hoàn cá nhân, theo dõi trạng thái và tối ưu Green Points.</p>
      </div>
      <button
        onClick={onOpenUpload}
        className="w-full md:w-auto bg-[#183A2D] hover:opacity-90 text-[#FDFBF7] font-medium text-xs px-5 py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
      >
        ➕ Đăng trang phục mới
      </button>
    </div>
  );
}