"use client";

import { useState, useRef } from "react";
import Link from "next/link";

export default function VisualSearch() {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [aiTag, setAiTag] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Nhãn hiển thị tiếng Việt cho thân thiện UX
  const categoryLabels: { [key: string]: string } = {
    DRESSES: "👗 Đầm / Váy thời trang",
    TOPS: "👕 Áo kiểu / T-Shirt",
    BOTTOMS: "👖 Quần / Chân váy",
    OUTERWEAR: "🧥 Áo khoác Outerwear",
  };

  const processAndSearch = (file: File) => {
    setLoading(true);
    setAiTag(null);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      setPreviewUrl(img.src);

      img.onload = async () => {
        // Nén ảnh bằng Canvas để máy local chạy siêu mát
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);

        try {
          // Bắn chuỗi Base64 lên để AI quét thể loại thật
          const response = await fetch("/api/visual-search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64Image: compressedBase64 }),
          });

          const resData = await response.json();
          if (resData.success) {
            setProducts(resData.products);
            setAiTag(resData.detectedCategory); // Lưu lại nhãn AI đoán được
          } else {
            alert(resData.message || "Không quét được sản phẩm");
          }
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      };
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processAndSearch(file);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-5 bg-[#0B0F17] text-white rounded-2xl border border-gray-800 shadow-xl my-2">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-gray-800/60 pb-5">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2 text-emerald-400">
            📸 CLOOP Lens <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">Real AI Recognition</span>
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Tải ảnh bất kỳ, AI tự động phân tích phân loại và bốc đồ tương đồng</p>
        </div>

        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
        >
          {loading ? "⏳ AI Đang quét phom dáng..." : "📷 Tải lookbook lên quét ngay"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mt-5">
        {/* Cột trái: Ảnh mẫu */}
        <div className="lg:col-span-1 flex flex-col items-center justify-center bg-black/30 rounded-xl p-3 border border-gray-800/80 min-h-[160px]">
          {previewUrl ? (
            <div className="text-center w-full space-y-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Ảnh cậu tải lên</p>
              <img src={previewUrl} alt="Preview" className="w-full h-36 object-cover rounded-lg border border-gray-700" />
              {aiTag && (
                <div className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-md font-medium">
                  AI đoán: {categoryLabels[aiTag] || aiTag}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center px-4">Hãy quăng một outfit bất kỳ lên để kiểm tra thị giác máy tính của CLOOP!</p>
          )}
        </div>

        {/* Cột phải: Danh sách kết quả */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-800/40 h-44 rounded-xl border border-gray-800"></div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {products.map((product) => (
                <div key={product.id} className="bg-[#121824] rounded-xl border border-gray-800/80 p-3 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
                  <div>
                    <div className="relative overflow-hidden rounded-lg mb-2">
                      <img src={product.images?.[0]} alt={product.name} className="w-full h-32 object-cover" />
                      <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-emerald-400 text-black px-1.5 py-0.5 rounded">
                        {Math.round((product.similarity || 0) * 100)}% Match
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-gray-200 truncate">{product.name}</h4>
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-800/40 flex items-center justify-between">
                    <p className="text-xs font-bold text-emerald-400">{Number(product.price_per_day).toLocaleString()}đ</p>
                    <Link 
                      href={`/product/${product.id}`}
                      className="bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-emerald-400 font-semibold text-[10px] px-2.5 py-1 rounded-md border border-emerald-500/20 transition-all"
                    >
                      Thuê đồ
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center bg-black/10 rounded-xl border border-dashed border-gray-800">
              <p className="text-xs text-gray-500">Hệ thống AI nhận diện thời trang thực tế đang sẵn sàng đợi ảnh của cậu!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}