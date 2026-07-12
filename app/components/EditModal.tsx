"use client";

interface EditModalProps {
  product: any;
  onClose: () => void;
  onRefresh: () => void;
}

export default function EditModal({ product, onClose }: EditModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 border border-[#E9E2D8]">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <h3 className="text-sm font-bold text-[#183A2D]">✏️ Chỉnh sửa: {product?.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Tính năng cập nhật trạng thái đồ vật (`ACTIVE`, `HIDDEN`, `RENTED`) trực tiếp không reload trang sẽ được kích hoạt tại đây ở **Giai đoạn 3**.
        </p>
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="bg-gray-100 text-gray-700 text-xs px-4 py-2 rounded-xl font-medium">
            Hủy bỏ
          </button>
        </div>
      </div>
    </div>
  );
} 