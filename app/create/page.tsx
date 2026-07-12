"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { ArrowLeft, UploadCloud, CheckCircle, Info } from "lucide-react";
import Link from "next/link";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 📡 1. ĐÃ CẬP NHẬT INTERFACE: Bổ sung ownerName và ownerPhone vào cấu trúc kiểm định dữ liệu
interface ProductSpecifications {
  title: string;
  size: string;
  condition: string;
  material: string;
  targetHeight: string;
  targetWeight: string;
  province: string;
  description: string;
  rentalPrice: number;
  salePrice: number;
  isRental: boolean;
  isSale: boolean;
  imageUrl: string;
  ownerName: string;  // Cột mới
  ownerPhone: string; // Cột mới
}

export default function CreateProductPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 📡 2. ĐÃ CẬP NHẬT STATE KHỞI TẠO: Thêm trường trống chuẩn bị thu thập thông tin người đăng
  const [product, setProduct] = useState<ProductSpecifications>({
    title: "",
    size: "S",
    condition: "GOOD",
    material: "",
    targetHeight: "",
    targetWeight: "",
    province: "",
    description: "",
    rentalPrice: 0,
    salePrice: 0,
    isRental: true,
    isSale: false,
    imageUrl: "",
    ownerName: "",  // Điểm nạp mới
    ownerPhone: "", // Point nạp mới
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product.title.trim()) { alert("Vui lòng nhập tên trang phục nhé!"); return; }
    if (!product.ownerName.trim() || !product.ownerPhone.trim()) { 
      alert("Cậu ơi, nhập đầy đủ Tên và SĐT chủ tủ để hệ thống làm lệnh bảo chứng ký quỹ khi có người đặt thuê nhé! 😊"); 
      return; 
    }

    setIsSubmitting(true);
    try {
      // 📡 3. ĐÃ CẬP NHẬT OBJECT INSERT: Đấu nối đẩy chính xác trường dữ liệu vào bảng của Supabase
      const { data, error } = await supabase.from("products").insert([
        {
          title: product.title,
          size: product.size,
          condition: product.condition,
          material: product.material,
          targetHeight: product.targetHeight ? Number(product.targetHeight) : null,
          targetWeight: product.targetWeight ? Number(product.targetWeight) : null,
          province: product.province || "Nghệ An",
          description: product.description,
          rental_price: product.isRental ? Number(product.rentalPrice) : 0,
          sale_price: product.isSale ? Number(product.salePrice) : 0,
          image_url: product.imageUrl || "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600",
          owner_name: product.ownerName,   // Đẩy lên SQL cột owner_name
          owner_phone: product.ownerPhone, // Đẩy lên SQL cột owner_phone
        },
      ]).select();

      if (error) throw error;

      alert("🎉 Đăng phục trang lên kho tủ đồ tuần hoàn CLOOP thành công!");
      router.push("/shop");
    } catch (err: any) {
      alert(`Lỗi đăng sản phẩm: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF8F3] text-[#183A2D] antialiased p-4 md:p-12 font-sans selection:bg-[#183A2D] selection:text-white">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" />
      <style>{`body, h1, h2, label, input, textarea, select, button { font-family: 'Plus Jakarta Sans', sans-serif !important; }`}</style>

      <div className="max-w-3xl mx-auto space-y-8">
        {/* THANH HEADER ĐIỀU HƯỚNG */}
        <div className="flex justify-between items-center">
          <Link href="/shop" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-green-800 transition-colors">
            <ArrowLeft size={12} /> — Hủy và quay lại sàn
          </Link>
          <span className="bg-white border text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full text-stone-500 shadow-sm">
            CLOOP STUDIO ENGINE
          </span>
        </div>

        <div className="text-left space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#183A2D]">Đăng Tải Trang Phục Tuần Hoàn</h1>
          <p className="text-xs text-gray-400 max-w-[500px] leading-relaxed">
            Điền đầy đủ thông tin để thuật toán AI phân loại kích cỡ chuẩn nhân trắc học và hiển thị lên New Feed hàng đầu.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-[#E9E2D8] rounded-[2.5rem] p-6 md:p-10 shadow-sm space-y-8 text-left">
          
          {/* MỤC 01: TÊN VÀ LINK ẢNH */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-green-800 flex items-center gap-2 border-b border-stone-100 pb-2">
              <span>01.</span> Thông tin cơ bản phục trang
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#183A2D] uppercase tracking-wider mb-1.5">Tên sản phẩm *</label>
                <input type="text" required placeholder="Ví dụ: Váy Ngắn Sport Đen" value={product.title} onChange={(e) => setProduct({...product, title: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-[#E9E2D8] text-xs focus:outline-none focus:border-green-800 bg-stone-50/50" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#183A2D] uppercase tracking-wider mb-1.5">Đường dẫn ảnh Lookbook (URL) *</label>
                <input type="text" required placeholder="Dán link ảnh sản phẩm vào đây..." value={product.imageUrl} onChange={(e) => setProduct({...product, imageUrl: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-[#E9E2D8] text-xs focus:outline-none focus:border-green-800 bg-stone-50/50" />
              </div>
            </div>
          </div>

          {/* MỤC 02: PHÂN LOẠI LUỒNG THƯƠNG MẠI */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-green-800 flex items-center gap-2 border-b border-stone-100 pb-2">
              <span>02.</span> Luồng thương mại kinh doanh
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-stone-50/60 p-4 rounded-2xl border border-stone-200/40">
              <div className="flex items-start gap-3">
                <input type="checkbox" id="check-rent" checked={product.isRental} onChange={(e) => setProduct({...product, isRental: e.target.checked})} className="mt-1 w-4 h-4 rounded text-green-800 focus:ring-green-800 border-stone-300" />
                <div className="space-y-1.5 flex-1">
                  <label htmlFor="check-rent" className="block text-xs font-bold text-[#183A2D] cursor-pointer select-none">Kích hoạt Luồng Cho Thuê đồ</label>
                  {product.isRental && (
                    <input type="number" required placeholder="Giá thuê/ngày (đ)..." value={product.rentalPrice || ""} onChange={(e) => setProduct({...product, rentalPrice: Number(e.target.value)})} className="w-full px-3 py-2 rounded-lg border border-[#E9E2D8] text-xs bg-white focus:outline-none focus:border-green-800" />
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <input type="checkbox" id="check-sale" checked={product.isSale} onChange={(e) => setProduct({...product, isSale: e.target.checked})} className="mt-1 w-4 h-4 rounded text-green-800 focus:ring-green-800 border-stone-300" />
                <div className="space-y-1.5 flex-1">
                  <label htmlFor="check-sale" className="block text-xs font-bold text-[#183A2D] cursor-pointer select-none">Kích hoạt Bán Đứt (Chuyển nhượng)</label>
                  {product.isSale && (
                    <input type="number" required placeholder="Giá bán đứt (đ)..." value={product.salePrice || ""} onChange={(e) => setProduct({...product, salePrice: Number(e.target.value)})} className="w-full px-3 py-2 rounded-lg border border-[#E9E2D8] text-xs bg-white focus:outline-none focus:border-green-800" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* MỤC 03: ĐẶC TÍNH SẢN PHẨM */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-green-800 flex items-center gap-2 border-b border-stone-100 pb-2">
              <span>03.</span> Thông số kỹ thuật & Nhân trắc học
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#183A2D] uppercase tracking-wider mb-1.5">Kích cỡ (Size)</label>
                <select value={product.size} onChange={(e) => setProduct({...product, size: e.target.value})} className="w-full px-3 py-3 rounded-xl border border-[#E9E2D8] text-xs bg-stone-50/50 focus:outline-none focus:border-green-800 font-medium">
                  <option value="XS">Size XS</option>
                  <option value="S">Size S</option>
                  <option value="M">Size M</option>
                  <option value="L">Size L</option>
                  <option value="XL">Size XL</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#183A2D] uppercase tracking-wider mb-1.5">Độ mới (%)</label>
                <select value={product.condition} onChange={(e) => setProduct({...product, condition: e.target.value})} className="w-full px-3 py-3 rounded-xl border border-[#E9E2D8] text-xs bg-stone-50/50 focus:outline-none focus:border-green-800 font-medium">
                  <option value="EXCELLENT">Mới 98% (Like New)</option>
                  <option value="GOOD">Mới 95% (Good)</option>
                  <option value="FAIR">Mới 90% (Fair)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#183A2D] uppercase tracking-wider mb-1.5">Cao khuyến nghị (cm)</label>
                <input type="number" placeholder="Ví dụ: 155" value={product.targetHeight} onChange={(e) => setProduct({...product, targetHeight: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-[#E9E2D8] text-xs focus:outline-none focus:border-green-800 bg-stone-50/50 font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#183A2D] uppercase tracking-wider mb-1.5">Nặng khuyến nghị (kg)</label>
                <input type="number" placeholder="Ví dụ: 48" value={product.targetWeight} onChange={(e) => setProduct({...product, targetWeight: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-[#E9E2D8] text-xs focus:outline-none focus:border-green-800 bg-stone-50/50 font-mono" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#183A2D] uppercase tracking-wider mb-1.5">Chất liệu vải</label>
              <input type="text" placeholder="Ví dụ: Lụa, Vải Tweed, Cotton thun..." value={product.material} onChange={(e) => setProduct({...product, material: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-[#E9E2D8] text-xs focus:outline-none focus:border-green-800 bg-stone-50/50" />
            </div>
          </div>

          {/* MỤC 04: ĐỒNG BỘ DỮ LIỆU ĐỊA CHỈ VÀ THÔNG TIN CHỦ ĐỒ THẬT */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-green-800 flex items-center gap-2 border-b border-stone-100 pb-2">
              <span>04.</span> Địa chỉ bàn giao & Thông tin chủ tủ bảo chứng
            </h3>
            
            {/* 🎯 ĐÃ BỔ SUNG: 2 Ô INPUT THU THẬP TÊN + SĐT CHỦ ĐỒ THẬT ĐÚNG THIẾT KẾ YÊU CẦU */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#183A2D] uppercase tracking-wider mb-1.5">Họ và tên chủ tủ đồ *</label>
                <input type="text" required placeholder="Nhập tên đầy đủ (Ví dụ: Hoàng Thị Trang)" value={product.ownerName} onChange={(e) => setProduct({...product, ownerName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-[#E9E2D8] text-xs focus:outline-none focus:border-green-800 bg-stone-50/50" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#183A2D] uppercase tracking-wider mb-1.5">Số điện thoại liên hệ (Mở khoá sau cọc) *</label>
                <input type="tel" required placeholder="Nhập số điện thoại thật..." value={product.ownerPhone} onChange={(e) => setProduct({...product, ownerPhone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-[#E9E2D8] text-xs focus:outline-none focus:border-green-800 bg-stone-50/50 font-mono" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#183A2D] uppercase tracking-wider mb-1.5">Khu vực / Tỉnh thành bàn giao đồ *</label>
              <input type="text" required placeholder="Ví dụ: Nghệ An, Hà Nội..." value={product.province} onChange={(e) => setProduct({...product, province: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-[#E9E2D8] text-xs focus:outline-none focus:border-green-800 bg-stone-50/50" />
            </div>
          </div>

          {/* MỤC 05: MÔ TẢ CHỦ ĐỒ */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-green-800 flex items-center gap-2 border-b border-stone-100 pb-2">
              <span>05.</span> Câu chuyện & Mô tả sản phẩm
            </h3>
            <div>
              <label className="block text-[11px] font-bold text-[#183A2D] uppercase tracking-wider mb-1.5">Mô tả từ chủ tủ đồ</label>
              <textarea rows={4} placeholder="Chia sẻ về tình trạng váy, số lần mặc hoặc tips phối phụ kiện tôn dáng nhé..." value={product.description} onChange={(e) => setProduct({...product, description: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-[#E9E2D8] text-xs focus:outline-none focus:border-green-800 bg-stone-50/50 resize-none leading-relaxed" />
            </div>
          </div>

          {/* CHÚ THÍCH CƠ CHẾ KÝ QUỸ CHUYÊN NGHIỆP */}
          <div className="bg-[#FAF8F3] border border-dashed border-[#E9E2D8] p-4 rounded-2xl flex items-start gap-3">
            <Info size={16} className="text-green-800 shrink-0 mt-0.5" />
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Thông tin Họ tên và Số điện thoại cá nhân của cậu sẽ được mã hóa bảo mật trên hệ thống Core Escrow của CLOOP, và chỉ được xuất trình minh bạch cho đối tác khi đơn đặt thuê quét thành công dòng tiền ký quỹ bảo chứng.
            </p>
          </div>

          {/* NÚT SUBMIT ĐĂNG ĐỒ TỔNG THỂ */}
          <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-[#183A2D] text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-[#23452F] transition-all shadow-md flex items-center justify-center gap-2">
            {isSubmitting ? "ĐANG ĐẨY DỮ LIỆU LÊN HỆ THỐNG THẬT..." : "XÁC NHẬN ĐĂNG PHỤC TRANG LÊN SÀN"}
          </button>

        </form>
      </div>
    </main>
  );
}