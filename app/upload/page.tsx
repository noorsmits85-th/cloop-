"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; 
import { createOutfitAction } from "../../src/actions/create-outfit";

const listingConfigs = {
  RENT: {
    label: "✨ Cấu hình phân hệ: CHIA SẺ TỦ ĐỒ (CHO THUÊ)",
    fields: ["pricePerDay", "depositFee", "minDuration"],
    placeholders: {
      pricePerDay: "Phí chia sẻ / ngày (đ)",
      depositFee: "Tiền cọc bảo an phòng ngừa hư hại (đ)",
      minDuration: "Số ngày chia sẻ tối thiểu",
      greenPoints: "" 
    }
  },
  SELL: {
    label: "💰 Cấu hình phân hệ: CHUYỂN NHƯỢNG SỞ HỮU (BÁN ĐỨT)",
    fields: ["pricePerDay"],
    placeholders: {
      pricePerDay: "Chi phí chuyển nhượng quyền sở hữu (đ)",
      depositFee: "",
      minDuration: "",
      greenPoints: ""
    }
  },
  RECYCLE: {
    label: "🍃 Cấu hình phân hệ: VÒNG ĐỜI XANH (TÁI CHẾ)",
    fields: ["greenPoints"],
    placeholders: {
      pricePerDay: "",
      depositFee: "",
      minDuration: "",
      greenPoints: "Điểm xanh tích lũy nhận được"
    }
  }
};

export default function UploadPage() {
  const router = useRouter(); 
  const [listingType, setListingType] = useState<"RENT" | "SELL" | "RECYCLE">("RENT");
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Đầm");
  const [brand, setBrand] = useState("Local Brand");
  const [sizeGeneral, setSizeGeneral] = useState("M");
  const [breast, setBreast] = useState("82");
  const [waist, setWaist] = useState("60");
  const [hip, setHip] = useState("88");
  const [material, setMaterial] = useState("Co giãn vừa");
  const [location, setLocation] = useState("Tuyên Quang");
  const [specificAddress, setSpecificAddress] = useState("");
  
  const [pricePerDay, setPricePerDay] = useState(0);
  const [depositFee, setDepositFee] = useState(0);
  const [minDuration, setMinDuration] = useState(3);
  const [greenPoints, setGreenPoints] = useState(10);

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [createdId, setCreatedId] = useState<string>(""); 

  useEffect(() => {
    const savedUserId = localStorage.getItem("cloop_user_id");
    if (savedUserId) {
      setCurrentUserId(savedUserId);
    } else {
      setCurrentUserId(null); 
    }
    setCheckingAuth(false);
  }, []);

  const config = listingConfigs[listingType];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (files.length + imageFiles.length > 3) {
      alert("Trang ơi, tối đa chỉ được đăng tải 3 ảnh lookbook thôi nhé!");
      return;
    }
    setImageFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) {
      setStatusMessage("❌ Lỗi: Bạn cần đăng nhập để thực hiện quyền đăng tải dữ liệu.");
      return;
    }
    if (imageFiles.length === 0) {
      setStatusMessage("❌ Trang ơi, cậu chưa chọn ảnh lookbook thực tế kìa!");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("⚡ Đang tải hình ảnh trực tiếp lên đám mây Cloudinary...");

    let uploadedUrls: string[] = [];
    setIsUploadingImages(true);

    for (const file of imageFiles) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "cloop_assets"); 

        const res = await fetch("https://api.cloudinary.com/v1_1/dfqbxmgqi/image/upload", {
          method: "POST",
          body: formData,
        });

        // 🎯 ĐỌC TIẾNG ANH THÔ: Ép Cloudinary phun chữ thật ra màn hình nếu từ chối ảnh
        const textResponse = await res.text();
        
        if (res.ok) {
          const data = JSON.parse(textResponse);
          if (data.secure_url) uploadedUrls.push(data.secure_url);
        } else {
          console.error("❌ Cloudinary từ chối nhận ảnh:", textResponse);
          alert(`🚨 LỖI TÀI KHOẢN CLOUDINARY THỰC TẾ:\nStatus: ${res.status}\nMessage: ${textResponse}`);
          setIsSubmitting(false);
          setIsUploadingImages(false);
          return; // Ngắt mạch, không cho chạy xuống Supabase
        }
      } catch (err: any) {
        alert(`🚨 Lỗi kết nối mạng khi tải ảnh: ${err.message}`);
        setIsSubmitting(false);
        setIsUploadingImages(false);
        return;
      }
    }
    setIsUploadingImages(false);

    // 🎯 TUYỆT ĐỐI XANH CHÍN: Không có ảnh thật từ Cloudinary là dừng hình ngay lập tức!
    if (uploadedUrls.length === 0) {
      alert("⛔ HỆ THỐNG ĐÃ CHẶN ĐỨNG:\nKhông bốc được link ảnh chính chủ nào từ Cloudinary. Dừng tiến trình!");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        name,
        description,
        category,
        brand,
        sizeGeneral,
        breast,
        waist,
        hip,
        material,
        location,
        specificAddress,
        lat: 21.8234, 
        lng: 105.2145,
        listingType,
        pricePerDay: Number(pricePerDay),
        depositFee: Number(depositFee),
        minDuration: Number(minDuration),
        greenPoints: Number(greenPoints),
        images: uploadedUrls, // Chỉ dùng ảnh thật
        owner_id: currentUserId, 
      };

      const result = await createOutfitAction(payload);
      setIsSubmitting(false);

      if (result.success) {
        setStatusMessage(result.message);
        alert(`🎉 TUYỆT VỜI TRANG ƠI! ĐÃ ĐĂNG ĐỒ THẬT THÀNH CÔNG!\n\nMã UUID lưu kho database: ${result.outfitId}\n\nHệ thống đưa cậu về trang chủ xem ảnh chính chủ nhé!`);
        router.push("/"); 
      } else {
        setStatusMessage(result.message);
        alert(`❌ Database từ chối: ${result.message}`);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setStatusMessage("❌ Trục trặc đường truyền cơ sở dữ liệu Supabase.");
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-500 font-medium text-sm">
        ⚡ Đang kiểm tra danh tính bảo mật hệ thống CLOOP...
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="max-w-md mx-auto p-8 bg-white shadow-lg rounded-lg text-center mt-20 border border-gray-100">
        <span className="text-4xl block mb-4">🔐</span>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Yêu cầu xác thực tài khoản</h3>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed">
          Hệ thống bảo mật phát hiện phiên làm việc của bạn chưa được kích hoạt. Vui lòng thực hiện đăng ký tài khoản mới để trải nghiệm tính năng này nhé!
        </p>
        <Link href="/register" className="inline-block px-6 py-2.5 bg-green-800 hover:bg-green-900 text-white rounded font-bold text-xs uppercase tracking-wider transition-colors w-full shadow">
          Đi tới phân hệ Đăng Nhập / Đăng Ký
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 mt-5 text-gray-800">
      <div className="mb-5">
        <Link href="/" className="text-xs font-bold text-gray-400 hover:text-green-800 transition-colors uppercase tracking-wider">
          ‹ Quay lại trang chủ Cloop
        </Link>
      </div>

      <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white shadow rounded-lg p-6 h-fit">
          <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wide">Bộ ảnh gốc chụp thực tế</h3>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-green-600 transition-colors relative bg-gray-50">
            <input type="file" multiple accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <div className="space-y-2 pointer-events-none py-6">
              <span className="text-3xl block text-gray-400">☁️</span>
              <p className="text-xs text-gray-600 font-medium">Bấm hoặc kéo thả ảnh vào đây</p>
              <p className="text-[10px] text-gray-400">Tối đa 3 ảnh lookbook</p>
            </div>
          </div>
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {imagePreviews.map((url, index) => (
                <div key={index} className="relative aspect-square border rounded bg-gray-100 overflow-hidden group">
                  <img src={url} alt="Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow">✕</button>
                  {index === 0 && <span className="absolute bottom-0 inset-x-0 bg-green-800 text-white text-[8px] text-center py-0.5 font-bold uppercase">Ảnh bìa</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-2 bg-white shadow rounded-lg p-6 space-y-6">
          <h2 className="text-xl font-bold text-green-800 border-b pb-2">MẠNG LƯỚI TỦ ĐỒ CLOOP • KIẾN TRÚC PHẦN TÁN 3.0</h2>
          
          <div className="bg-green-50/60 p-4 rounded-lg border border-green-100">
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-green-800">Lựa chọn hình thức tuần hoàn cho trang phục của bạn:</label>
            <div className="flex gap-4 bg-white p-1.5 rounded-lg border w-fit shadow-sm">
              {(["RENT", "SELL", "RECYCLE"] as const).map((type) => (
                <button key={type} type="button" onClick={() => setListingType(type)} className={`px-6 py-2 rounded-md text-xs font-bold transition-all ${listingType === type ? "bg-green-800 text-white shadow" : "text-gray-600 hover:bg-gray-100"}`}>
                  {type === "RENT" && "🔄 Chia sẻ tủ đồ"}
                  {type === "SELL" && "💵 Chuyển nhượng sở hữu"}
                  {type === "RECYCLE" && "🍃 Vòng đời xanh"}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border">
            <h4 className="font-bold text-xs text-gray-700 mb-3 uppercase tracking-wider">{config.label}</h4>
            <div className="grid grid-cols-3 gap-4">
              {config.fields.includes("pricePerDay") && (
                <div>
                  <label className="text-xs font-medium block mb-1">Giá trị giao dịch (đ)</label>
                  <input type="number" onChange={e => setPricePerDay(Number(e.target.value))} placeholder={config.placeholders.pricePerDay} className="w-full border p-2 rounded bg-white" required />
                </div>
              )}
              {config.fields.includes("depositFee") && (
                <div>
                  <label className="text-xs font-medium block mb-1">Tiền cọc bảo an (đ)</label>
                  <input type="number" onChange={e => setDepositFee(Number(e.target.value))} placeholder={config.placeholders.depositFee} className="w-full border p-2 rounded bg-white" />
                </div>
              )}
              {config.fields.includes("minDuration") && (
                <div>
                  <label className="text-xs font-medium block mb-1">Tối thiểu (Ngày)</label>
                  <input type="number" value={minDuration} onChange={e => setMinDuration(Number(e.target.value))} placeholder={config.placeholders.minDuration} className="w-full border p-2 rounded bg-white" />
                </div>
              )}
              {config.fields.includes("greenPoints") && (
                <div>
                  <label className="text-xs font-medium block mb-1">Điểm xanh tặng thưởng</label>
                  <input type="number" value={greenPoints} className="w-full border p-2 rounded bg-gray-200 text-gray-500 font-bold" readOnly />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tên định danh phục trang</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ví dụ: Váy dáng ngắn Sporty Black..." className="w-full border p-2 rounded" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Thương hiệu / Xuất xứ</label>
              <input type="text" value={brand} onChange={e => setBrand(e.target.value)} className="w-full border p-2 rounded" />
            </div>
          </div>

          <div className="bg-gray-50/50 p-4 rounded-lg border">
            <h4 className="font-semibold text-xs text-gray-700 uppercase tracking-wider mb-3">📏 Bộ thông số phom dáng chi tiết (cm) phục vụ AI Stylist</h4>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-gray-500">Kích cỡ</label>
                <select value={sizeGeneral} onChange={e => setSizeGeneral(e.target.value)} className="w-full border p-2 rounded bg-white">
                  <option>S</option><option>M</option><option>L</option><option>XL</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Vòng ngực</label>
                <input type="number" value={breast} onChange={e => setBreast(e.target.value)} className="w-full border p-2 rounded bg-white" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Vòng eo</label>
                <input type="number" value={waist} onChange={e => setWaist(e.target.value)} className="w-full border p-2 rounded bg-white" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Vòng mông</label>
                <input type="number" value={hip} onChange={e => setHip(e.target.value)} className="w-full border p-2 rounded bg-white" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tỉnh / Thành phố</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Địa chỉ cụ thể (Số nhà, ngõ ngách...)</label>
              <input type="text" value={specificAddress} onChange={e => setSpecificAddress(e.target.value)} placeholder="Số 24 ngõ 3 đường Lê Lợi..." className="w-full border p-2 rounded" />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting || isUploadingImages} className="w-full py-3 bg-green-800 text-white rounded font-bold hover:bg-green-900 transition-colors disabled:bg-gray-400 uppercase tracking-wider text-sm shadow-md">
            {isSubmitting ? "⚡ Đang đồng bộ cấu trúc tuần hoàn..." : "🚀 KÍCH HOẠT ĐĂNG TẢI HỆ THỐNG TUẦN HOÀN"}
          </button>

          {statusMessage && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 text-center rounded text-xs font-medium">
              {statusMessage}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}