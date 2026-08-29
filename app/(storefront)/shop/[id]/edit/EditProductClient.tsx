"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Save, 
  Shirt, 
  Tag, 
  Sparkles, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  DollarSign,
  ShieldCheck,
  Image as ImageIcon
} from "lucide-react";
import { updateProductAction } from "@/app/(dashboard)/my-closet/create/actions";

interface EditProductClientProps {
  product: {
    id: string;
    title: string;
    category: string;
    size: string;
    material: string;
    color: string;
    condition: string;
    occasion: string;
    description: string;
    bust: string;
    waist: string;
    hips: string;
    targetHeight: string;
    targetWeight: string;
    images: string[];
    listings: {
      isRental: boolean;
      rentalPrice: number;
      depositPercent: number;
      isSale: boolean;
      salePrice: number;
    };
  };
}

const CATEGORIES = [
  "Dạ hội & Sự kiện",
  "Áo dài & Truyền thống",
  "Công sở & Thanh lịch",
  "Dạo phố & Hàng ngày",
  "Tiệc cưới & Phù dâu",
  "Vintage & Y2K",
  "Khác"
];

const SIZES = ["S", "M", "L", "XL"];

export default function EditProductClient({ product }: EditProductClientProps) {
  const router = useRouter();

  const [title, setTitle] = useState(product.title || "");
  const [category, setCategory] = useState(product.category || "Dạ hội & Sự kiện");
  const [size, setSize] = useState(product.size || "M");
  const [material, setMaterial] = useState(product.material || "");
  const [color, setColor] = useState(product.color || "");
  const [condition, setCondition] = useState(product.condition || "Độ mới 99% (Như mới)");
  const [occasion, setOccasion] = useState(product.occasion || "");
  const [description, setDescription] = useState(product.description || "");

  // Measurements
  const [bust, setBust] = useState(product.bust || "");
  const [waist, setWaist] = useState(product.waist || "");
  const [hips, setHips] = useState(product.hips || "");
  const [targetHeight, setTargetHeight] = useState(product.targetHeight || "");
  const [targetWeight, setTargetWeight] = useState(product.targetWeight || "");

  // Listings
  const [isRental, setIsRental] = useState(product.listings.isRental ?? true);
  const [rentalPrice, setRentalPrice] = useState(product.listings.rentalPrice || 150000);
  const [depositPercent, setDepositPercent] = useState(product.listings.depositPercent || 70);
  const [isSale, setIsSale] = useState(product.listings.isSale ?? false);
  const [salePrice, setSalePrice] = useState(product.listings.salePrice || 0);

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return showToast("Vui lòng nhập tên món đồ", "error");
    if (isRental && rentalPrice < 10000) return showToast("Giá thuê tối thiểu là 10.000₫", "error");
    if (isSale && salePrice < 10000) return showToast("Giá bán tối thiểu là 10.000₫", "error");

    setIsSaving(true);
    try {
      const payload = {
        title,
        category,
        size,
        material,
        color,
        condition,
        occasion,
        description,
        bust,
        waist,
        hips,
        targetHeight,
        targetWeight,
        listings: {
          isRental,
          rentalPrice: Number(rentalPrice),
          depositPercent: Number(depositPercent),
          isSale,
          salePrice: Number(salePrice)
        }
      };

      const res = await updateProductAction(product.id, payload);
      if (res.success) {
        showToast("🎉 Cập nhật món đồ thành công!");
        setTimeout(() => {
          router.push("/my-closet/items");
        }, 1500);
      } else {
        showToast(res.error || "Không thể cập nhật món đồ.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Lỗi khi cập nhật.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {toast && (
        <div className={'fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold font-ui flex items-center gap-2 transition-all ' + (toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-emerald-900 border-emerald-700 text-white')}>
          {toast.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} className="text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="flex justify-between items-center pb-4 border-b border-stone-200">
        <Link 
          href="/my-closet/items"
          className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-stone-900 uppercase tracking-wider font-ui transition-colors"
        >
          <ArrowLeft size={16} /> Quay lại Tủ đồ
        </Link>
        <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          ID: #{product.id.slice(0, 8)}
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-5 text-left">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
            <Shirt size={18} className="text-emerald-800" />
            <h2 className="text-base font-bold font-heading text-stone-900">Thông Tin Món Đồ</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 font-ui">Tên món đồ *</label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs text-stone-900 font-ui focus:outline-none focus:border-emerald-700 transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 font-ui">Danh mục</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-stone-900 font-ui focus:outline-none focus:border-emerald-700 transition-all cursor-pointer"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 font-ui">Size</label>
                <div className="flex gap-2">
                  {SIZES.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={'flex-1 py-2 rounded-xl text-xs font-bold font-mono border transition-all cursor-pointer ' + (size === s ? 'bg-[#183A2D] text-white border-[#183A2D]' : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100')}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 font-ui">Chất liệu</label>
                <input 
                  type="text" 
                  value={material} 
                  onChange={(e) => setMaterial(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 font-ui"
                  placeholder="Lụa, Taffeta, Voan..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 font-ui">Màu sắc</label>
                <input 
                  type="text" 
                  value={color} 
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 font-ui"
                  placeholder="Đỏ Ruby, Trắng Kem..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 font-ui">Tình trạng</label>
                <select 
                  value={condition} 
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 font-ui cursor-pointer"
                >
                  <option value="Độ mới 99% (Như mới)">Độ mới 99% (Như mới)</option>
                  <option value="Độ mới 95%">Độ mới 95%</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 font-ui">Mô tả & Câu chuyện món đồ</label>
              <textarea 
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-900 font-ui focus:outline-none focus:border-emerald-700 transition-all resize-none"
                placeholder="Chia sẻ về kiểu dáng, xuất xứ hoặc kỷ niệm gắn liền..."
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-5 text-left">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <DollarSign size={18} className="text-emerald-800" />
              <h2 className="text-base font-bold font-heading text-stone-900">Chính Sách Cho Thuê & Tiền Cọc</h2>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
              <input 
                type="checkbox" 
                checked={isRental} 
                onChange={(e) => setIsRental(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-500 accent-emerald-800"
              />
              Bật cho thuê
            </label>
          </div>

          {isRental && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 font-ui">Giá thuê / ngày (VNĐ) *</label>
                <input 
                  type="number" 
                  value={rentalPrice} 
                  onChange={(e) => setRentalPrice(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 font-mono text-xs text-stone-900 font-bold focus:outline-none focus:border-emerald-700 transition-all"
                  step={10000}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 font-ui">Tỷ lệ cọc bảo chứng Escrow (%)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min={30} 
                    max={100} 
                    step={5}
                    value={depositPercent}
                    onChange={(e) => setDepositPercent(Number(e.target.value))}
                    className="flex-1 accent-emerald-800 cursor-pointer"
                  />
                  <span className="font-mono font-bold text-xs bg-emerald-50 text-emerald-800 px-3 py-1 rounded-lg border border-emerald-200">
                    {depositPercent}%
                  </span>
                </div>
                <p className="text-[10px] text-stone-400 mt-1">Cọc đề xuất: 70% giá trị đồ để đảm bảo quyền lợi chủ tủ.</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-5 text-left">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Tag size={18} className="text-amber-800" />
              <h2 className="text-base font-bold font-heading text-stone-900">Chính Sách Bán / Pass Lại</h2>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
              <input 
                type="checkbox" 
                checked={isSale} 
                onChange={(e) => setIsSale(e.target.checked)}
                className="w-4 h-4 rounded text-amber-700 focus:ring-amber-500 accent-amber-800"
              />
              Bật bán đứt
            </label>
          </div>

          {isSale && (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 font-ui">Giá bán mong muốn (VNĐ) *</label>
              <input 
                type="number" 
                value={salePrice} 
                onChange={(e) => setSalePrice(Number(e.target.value))}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 font-mono text-xs text-stone-900 font-bold focus:outline-none focus:border-amber-700 transition-all"
                step={50000}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href="/my-closet/items"
            className="px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl text-xs font-bold font-ui transition-all"
          >
            Hủy bỏ
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-[#183A2D] hover:bg-[#224A3B] text-white rounded-2xl text-xs font-bold font-ui shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? "Đang lưu..." : "Lưu Thay Đổi"}
          </button>
        </div>
      </form>
    </div>
  );
}
