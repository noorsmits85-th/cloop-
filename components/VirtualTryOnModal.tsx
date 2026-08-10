"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Wand2, RefreshCw, CheckCircle2, Lock, Leaf } from "lucide-react";
import Image from "next/image";

interface VirtualTryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  productImage: string;
}

export default function VirtualTryOnModal({ isOpen, onClose, productImage }: VirtualTryOnModalProps) {
  const [step, setStep] = useState<"UPLOAD" | "PAYWALL" | "SCANNING" | "RESULT">("UPLOAD");
  const [userImage, setUserImage] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Khởi tạo/Kiểm tra số lượt dùng thử
  useEffect(() => {
    if (isOpen) {
      const usageCount = parseInt(localStorage.getItem("cloop_ai_tryon_count") || "0");
      if (usageCount >= 1) {
        setStep("PAYWALL");
      } else {
        setStep("UPLOAD");
      }
    } else {
      setStep("UPLOAD");
      setUserImage(null);
      setAiFeedback("");
    }
  }, [isOpen]);

  const handleUnlock = () => {
    // Giả lập nạp "Lá Cloop" thành công
    alert("Thanh toán thành công 300 VNĐ. Đã trừ 1 🍃 Lá CLOOP!");
    localStorage.setItem("cloop_ai_tryon_count", "0"); // Reset để được dùng 1 lần nữa
    setStep("UPLOAD");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUserImage(url);
      setStep("SCANNING");
      
      // Tăng biến đếm để lần sau sẽ bị chặn bởi Paywall
      const currentCount = parseInt(localStorage.getItem("cloop_ai_tryon_count") || "0");
      localStorage.setItem("cloop_ai_tryon_count", (currentCount + 1).toString());

      try {
        // Chuyển file ảnh người dùng thành base64
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const userImageBase64 = reader.result as string;

          // Gửi cả 2 ảnh lên Gemini
          const response = await fetch("/api/analyze-fit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userImageBase64,
              productImageUrl: productImage
            })
          });

          const data = await response.json();
          if (data.feedback) {
            setAiFeedback(data.feedback);
          } else {
            setAiFeedback("Trang phục này có vẻ rất hợp với bạn. Hãy thử ngay!");
          }
          setStep("RESULT");
        };
      } catch (err) {
        console.error(err);
        setAiFeedback("Lỗi kết nối AI. Trang phục này có vẻ rất hợp với bạn.");
        setStep("RESULT");
      }
    }
  };

  const handleReset = () => {
    const usageCount = parseInt(localStorage.getItem("cloop_ai_tryon_count") || "0");
    if (usageCount >= 1) {
      setStep("PAYWALL");
    } else {
      setStep("UPLOAD");
    }
    setUserImage(null);
    setAiFeedback("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[400px] md:min-h-[500px]"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 z-50 p-2 bg-white/50 hover:bg-white rounded-full backdrop-blur-md transition-colors text-stone-800"
            >
              <X size={20} />
            </button>

            {/* Cột trái: Thông tin sản phẩm */}
            <div className="w-full md:w-4/12 bg-stone-100 p-6 flex flex-col justify-between border-r border-stone-200">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-800/10 text-green-800 text-[10px] font-bold rounded-full mb-6 uppercase tracking-wider">
                  <Wand2 size={12} /> AI Phòng Thử Đồ
                </div>
                <h2 className="text-xl font-bold text-stone-800 leading-tight mb-2">Thử nghiệm trang phục lên chính bạn</h2>
                <p className="text-xs text-stone-500 leading-relaxed mb-6">
                  Công nghệ Vision AI của CLOOP sẽ phân tích vóc dáng và màu da của bạn để đưa ra gợi ý phối đồ chuẩn xác.
                </p>
              </div>

              <div className="w-full aspect-[3/4] relative rounded-2xl overflow-hidden shadow-inner bg-white border border-stone-200">
                <Image src={productImage} alt="Product to try on" fill className="object-cover object-top" unoptimized />
              </div>
            </div>

            {/* Cột phải: Khu vực tương tác */}
            <div className="w-full md:w-8/12 bg-white p-6 md:p-10 flex flex-col items-center justify-center relative overflow-hidden">
              
              <AnimatePresence mode="wait">
                
                {step === "PAYWALL" && (
                  <motion.div 
                    key="paywall"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full flex flex-col items-center text-center space-y-6 max-w-sm"
                  >
                    <div className="w-24 h-24 rounded-full bg-stone-50 flex items-center justify-center border-4 border-stone-100 relative">
                      <Lock size={32} className="text-stone-400" />
                      <div className="absolute -bottom-2 -right-2 bg-emerald-100 text-emerald-800 p-2 rounded-full border-2 border-white shadow-sm">
                        <Leaf size={16} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-stone-800 mb-2">Hết lượt thử miễn phí</h3>
                      <p className="text-xs text-stone-500 leading-relaxed">
                        Bạn đã sử dụng hết đặc quyền trải nghiệm AI Stylist miễn phí. Mở khóa lượt phân tích tiếp theo chỉ với 1 Lá CLOOP.
                      </p>
                    </div>
                    
                    <button 
                      onClick={handleUnlock}
                      className="px-8 py-3 bg-[#183A2D] text-white font-bold text-sm rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all w-full flex flex-col items-center gap-0.5"
                    >
                      <span className="flex items-center gap-1.5">
                        Mở Khóa Phân Tích (1 <Leaf size={14} className="text-emerald-400 fill-emerald-400"/>)
                      </span>
                      <span className="text-[9px] text-emerald-200 font-normal">~ 300 VNĐ</span>
                    </button>

                    <p className="text-[10px] text-stone-400 hover:underline cursor-pointer">
                      Làm thế nào để kiếm Lá CLOOP miễn phí?
                    </p>
                  </motion.div>
                )}

                {step === "UPLOAD" && (
                  <motion.div 
                    key="upload"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full flex flex-col items-center text-center space-y-6"
                  >
                    <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center border-4 border-emerald-100/50">
                      <Upload size={32} className="text-emerald-700" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-stone-800 mb-2">Tải ảnh của bạn lên</h3>
                      <p className="text-xs text-stone-500 max-w-[250px]">Ảnh toàn thân, ánh sáng rõ và trang phục gọn gàng sẽ cho kết quả AI tốt nhất.</p>
                    </div>
                    
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                    
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-8 py-3 bg-[#183A2D] text-white font-bold text-sm rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all w-full md:w-auto"
                    >
                      Chọn Ảnh Từ Máy
                    </button>
                  </motion.div>
                )}

                {step === "SCANNING" && (
                  <motion.div 
                    key="scanning"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full flex flex-col items-center justify-center absolute inset-0 bg-stone-900"
                  >
                    {userImage && (
                      <div className="absolute inset-0 opacity-40">
                        <Image src={userImage} alt="User photo" fill className="object-cover blur-sm grayscale" />
                      </div>
                    )}
                    
                    <motion.div 
                      animate={{ y: ["0%", "100%", "0%"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute top-0 left-0 w-full h-[2px] bg-emerald-400 shadow-[0_0_15px_3px_rgba(52,211,153,0.8)] z-10"
                    />

                    <div className="relative z-20 flex flex-col items-center text-center space-y-6 bg-stone-900/40 p-6 rounded-2xl backdrop-blur-sm border border-white/10">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                        <Wand2 size={24} className="text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white mb-2">CLOOP AI đang phân tích...</h3>
                        <p className="text-xs text-emerald-200/60 font-mono tracking-widest uppercase">Phân tách Form dáng & Tông da</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === "RESULT" && (
                  <motion.div 
                    key="result"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full flex flex-col absolute inset-0 bg-white"
                  >
                    <div className="relative w-full flex-1 bg-stone-900 flex overflow-hidden">
                      {/* Nửa trái: Ảnh gốc */}
                      <div className="relative w-1/2 h-full border-r-2 border-emerald-500/50">
                        {userImage && (
                          <Image src={userImage} alt="User Original" fill className="object-cover opacity-60" />
                        )}
                        <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <span className="text-[9px] text-white font-bold uppercase tracking-wider">Ảnh Gốc</span>
                        </div>
                        <div className="absolute top-1/3 left-1/3 w-1/3 h-1/3 border border-emerald-400/50 border-dashed rounded-lg flex items-center justify-center">
                           <div className="bg-emerald-500/20 w-full h-full animate-pulse" />
                           <div className="absolute -bottom-5 text-[8px] text-emerald-400 font-mono tracking-widest bg-black/50 px-1 rounded">BODY_DETECTED</div>
                        </div>
                      </div>
                      
                      {/* Nửa phải: Kết quả ghép */}
                      <div className="relative w-1/2 h-full bg-stone-100">
                        {userImage && (
                           <Image src={userImage} alt="User BG" fill className="object-cover opacity-20 grayscale" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                           <Image src={productImage} alt="Product Overlay" fill className="object-contain drop-shadow-2xl" unoptimized />
                        </div>
                        <div className="absolute top-4 left-4 z-20 bg-emerald-600/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                          <CheckCircle2 size={14} className="text-white" />
                          <span className="text-[9px] text-white font-bold uppercase tracking-wider">AI Generated</span>
                        </div>
                      </div>
                    </div>

                    {/* BẢNG ĐÁNH GIÁ TỪ GEMINI AI */}
                    <div className="bg-emerald-50 border-y border-emerald-100 p-5 z-20">
                      <div className="flex items-center gap-2 mb-2">
                        <Wand2 size={14} className="text-emerald-700" />
                        <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-widest">Đánh Giá Từ Chuyên Gia AI</h4>
                      </div>
                      <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                        {aiFeedback || "Đang tổng hợp nhận xét..."}
                      </p>
                    </div>

                    <div className="p-4 bg-white flex items-center justify-between z-20">
                      <button 
                        onClick={handleReset}
                        className="flex items-center gap-2 text-xs font-bold text-stone-500 hover:text-stone-800 px-4 py-2"
                      >
                        <RefreshCw size={14} /> Thử lại ảnh khác
                      </button>
                      <button 
                        onClick={onClose}
                        className="px-6 py-2.5 bg-[#183A2D] text-white font-bold text-xs rounded-full"
                      >
                        Lưu vào tủ đồ
                      </button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
