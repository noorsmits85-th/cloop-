"use client";

interface UploadModalProps {
  onClose: () => void;
  onRefresh: () => void;
}

export default function UploadModal({ onClose }: UploadModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 border border-[#E9E2D8]">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <h3 className="text-sm font-bold text-[#183A2D]">➕ Đăng trang phục tuần hoàn mới</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Form hạch toán siêu dữ liệu thực tế và tải lên bộ ảnh lookbook của cậu sẽ được bọc gọn và bung mở tại đây ở **Giai đoạn 2** nhé Trang!
        </p>
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="bg-[#183A2D] text-white text-xs px-4 py-2 rounded-xl font-medium">
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
}