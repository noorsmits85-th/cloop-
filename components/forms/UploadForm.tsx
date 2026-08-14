"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { uploadProductSchema, UploadProductInput } from "@/lib/validations/product";
import { CldUploadWidget } from "next-cloudinary";
import { createProductAction } from "@/app/actions/product";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, X, Plus, Info } from "lucide-react";

export default function UploadForm() {
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: zodResolver(uploadProductSchema),
    defaultValues: {
      isRental: true,
      isSale: false,
      condition: "99",
      minDays: 3,
      images: []
    }
  });

  const isRental = watch("isRental");
  const isSale = watch("isSale");

  const onSubmit = async (data: any) => {
    if (images.length === 0) {
      alert("Bạn ơi, chưa có ảnh nào được tải lên cả!");
      return;
    }
    
    setIsSubmitting(true);
    
    // Convert form data to match the Server Action format
    const productPayload = {
      name: data.title,
      description: data.description,
      size: data.size,
      material: data.material,
      color: data.color || "",
      condition: data.condition,
      province: data.province,
      ward: data.ward,
      occasion: data.occasion || "",
    };

    const listingsPayload = {
      isRental: data.isRental,
      isSale: data.isSale,
      rentalPrice: data.rentalPrice,
      salePrice: data.salePrice,
      deposit: data.deposit,
      minDays: data.minDays
    };

    try {
      const res = await createProductAction({
        product: productPayload,
        listings: listingsPayload,
        uploadedImageUrls: images,
        hasStory: false,
        storyText: ""
      });

      if (res.success && res.productId) {
        router.push(`/product/${res.productId}`);
      } else {
        alert(res.error || "Có lỗi xảy ra khi tạo sản phẩm.");
      }
    } catch (e: any) {
      alert("Lỗi máy chủ: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadSuccess = (result: any) => {
    if (result.info && result.info.secure_url) {
      const newImages = [...images, result.info.secure_url];
      setImages(newImages);
      setValue("images", newImages); // Update Zod state
    }
  };

  const handleRemoveImage = (idx: number) => {
    const newImages = images.filter((_, i) => i !== idx);
    setImages(newImages);
    setValue("images", newImages);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-stone-100">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[#183A2D] uppercase tracking-tight">Ký Gửi Tủ Đồ</h1>
        <p className="text-sm text-gray-500 mt-2">Đăng một món đồ và bắt đầu kiếm tiền thụ động từ tủ quần áo của bạn.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* KHU VỰC UPLOAD ẢNH */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
            Hình ảnh sản phẩm <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {images.map((url, idx) => (
              <div key={idx} className="relative w-28 aspect-[3/4] rounded-2xl overflow-hidden shrink-0 group border border-stone-200">
                <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                <button 
                  type="button" 
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-2 right-2 bg-white/80 p-1.5 rounded-full text-stone-700 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            
            <CldUploadWidget 
                uploadPreset="cloop_uploads"
                options={{ 
                  maxFiles: 5, 
                  multiple: true, 
                  clientAllowedFormats: ["png", "jpeg", "jpg", "webp"],
                  cropping: true,
                  croppingAspectRatio: 0.75 // 3/4
                }}
                onSuccess={handleUploadSuccess}
              >
              {({ open }) => (
                <button 
                  type="button" 
                  onClick={() => open()} 
                  className="w-28 aspect-[3/4] rounded-2xl border-2 border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-400 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 transition-all shrink-0 gap-2"
                >
                  <ImagePlus size={24} />
                  <span className="text-[10px] font-bold uppercase">Thêm ảnh</span>
                </button>
              )}
            </CldUploadWidget>
          </div>
          {errors.images && <p className="text-red-500 text-xs mt-1">{errors.images.message}</p>}
        </div>

        {/* THÔNG TIN CƠ BẢN */}
        <div className="space-y-5 border-t border-stone-100 pt-8">
          <h2 className="text-sm font-bold text-[#183A2D] uppercase tracking-wider">Thông tin sản phẩm</h2>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tên sản phẩm</label>
            <input {...register("title")} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" placeholder="Váy thiết kế GIA STUDIOS..." />
            {errors.title && <p className="text-red-500 text-xs">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mô tả chi tiết</label>
            <textarea {...register("description")} rows={3} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" placeholder="Tình trạng, form dáng, lưu ý khi giặt ủi..." />
            {errors.description && <p className="text-red-500 text-xs">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Size</label>
              <select {...register("size")} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none">
                <option value="">Chọn Size</option>
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="Freesize">Freesize</option>
              </select>
              {errors.size && <p className="text-red-500 text-xs">{errors.size.message}</p>}
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Độ Mới (Condition)</label>
              <select {...register("condition")} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none">
                <option value="99">99% (Như mới)</option>
                <option value="95">95% (Qua sử dụng)</option>
                <option value="NEW">New with Tag</option>
              </select>
              {errors.condition && <p className="text-red-500 text-xs">{errors.condition.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Chất liệu</label>
              <input {...register("material")} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" placeholder="Lụa, Linen..." />
              {errors.material && <p className="text-red-500 text-xs">{errors.material.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Màu sắc</label>
              <input {...register("color")} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" placeholder="Trắng ngà..." />
            </div>
          </div>
        </div>

        {/* LOGISTIC */}
        <div className="space-y-5 border-t border-stone-100 pt-8">
          <h2 className="text-sm font-bold text-[#183A2D] uppercase tracking-wider">Giao nhận</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tỉnh / Thành phố</label>
              <input {...register("province")} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" placeholder="Hà Nội, TP.HCM..." />
              {errors.province && <p className="text-red-500 text-xs">{errors.province.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quận / Phường</label>
              <input {...register("ward")} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" placeholder="Quận 1..." />
              {errors.ward && <p className="text-red-500 text-xs">{errors.ward.message}</p>}
            </div>
          </div>
        </div>

        {/* ĐỊNH GIÁ & TÀI CHÍNH */}
        <div className="space-y-5 border-t border-stone-100 pt-8">
          <h2 className="text-sm font-bold text-[#183A2D] uppercase tracking-wider">Định giá & Dòng tiền</h2>
          
          <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" {...register("isSale")} id="isSale" className="w-5 h-5 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500" />
              <label htmlFor="isSale" className="text-sm font-bold text-stone-800">Cho phép Mua Đứt (Sang nhượng)</label>
            </div>
            {isSale && (
              <div className="pl-8 space-y-1.5">
                <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Giá Sở Hữu (VNĐ)</label>
                <div className="relative">
                  <input type="number" {...register("salePrice", { valueAsNumber: true })} className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none" placeholder="2000000" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-xs">VND</span>
                </div>
                {errors.salePrice && <p className="text-red-500 text-xs">{errors.salePrice.message}</p>}
              </div>
            )}
          </div>

          <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" {...register("isRental")} id="isRental" className="w-5 h-5 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500" />
              <label htmlFor="isRental" className="text-sm font-bold text-stone-800">Cho Thuê Tuần Hoàn (3 Ngày)</label>
            </div>
            {isRental && (
              <div className="pl-8 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Giá Thuê (VNĐ)</label>
                  <div className="relative">
                    <input type="number" {...register("rentalPrice", { valueAsNumber: true })} className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" placeholder="300000" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-xs">VND</span>
                  </div>
                  {errors.rentalPrice && <p className="text-red-500 text-xs">{errors.rentalPrice.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Tiền Cọc Bảo Chứng</label>
                    <Info size={12} className="text-emerald-500" />
                  </div>
                  <div className="relative">
                    <input type="number" {...register("deposit", { valueAsNumber: true })} className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" placeholder="2500000" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-xs">VND</span>
                  </div>
                  {errors.deposit && <p className="text-red-500 text-xs">{errors.deposit.message}</p>}
                </div>
              </div>
            )}
            
            {errors.isRental && <p className="text-red-500 text-xs">{errors.isRental.message}</p>}
          </div>

        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full py-4 mt-4 bg-[#183A2D] text-white font-bold text-sm uppercase tracking-widest rounded-2xl hover:bg-[#23452F] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> ĐANG XỬ LÝ...</> : "ĐĂNG TỦ ĐỒ"}
        </button>
      </form>
    </div>
  );
}
