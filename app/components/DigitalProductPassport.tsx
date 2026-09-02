"use client";

import React, { useState } from "react";
import { 
  Leaf, 
  QrCode, 
  ShieldCheck, 
  Sparkles, 
  RotateCcw, 
  Layers, 
  Award, 
  X, 
  CheckCircle2,
  ExternalLink,
  Info
} from "lucide-react";

interface DigitalProductPassportProps {
  productId: string;
  productTitle: string;
  material?: string;
  category?: string;
  province?: string;
  brand?: string;
  ownerName?: string;
}

export default function DigitalProductPassport({
  productId,
  productTitle,
  material = "Lụa satin hữu cơ",
  category = "Dạ hội",
  province = "Nghệ An",
  brand = "CLOOP Signature",
  ownerName = "Chủ tủ CLOOP"
}: DigitalProductPassportProps) {
  const [showQrModal, setShowQrModal] = useState(false);

  // Sinh mã DPP định danh duy nhất theo chuẩn ESPR Châu Âu
  const dppSerial = `DPP-VN-CLP-${productId.slice(0, 8).toUpperCase()}`;
  const currentUrl = typeof window !== "undefined" ? window.location.href : `https://cloop.vn/product/${productId}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(currentUrl)}&color=18-58-45`;

  return (
    <>
      <div className="rounded-2xl border-2 border-emerald-900/20 bg-gradient-to-br from-[#F4F9F4] to-[#EBF5EC] p-4 sm:p-5 shadow-sm space-y-3.5 relative overflow-hidden">
        
        {/* Background Watermark */}
        <div className="absolute -right-6 -bottom-6 text-emerald-900/5 pointer-events-none select-none">
          <Leaf size={140} />
        </div>

        {/* Header: EU Standard Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-800/15 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#183A2D] text-white shadow-xs">
              <Leaf size={13} className="text-emerald-300" />
            </span>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#183A2D] block font-mono">
                EU ESPR Standard • DPP Certified
              </span>
              <h4 className="text-xs sm:text-sm font-heading font-extrabold text-[#142A1E]">
                Hộ Chiếu Số Thời Trang (Digital Product Passport)
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#183A2D] text-[11px] font-bold border border-emerald-800/20 shadow-2xs hover:bg-emerald-50 transition-colors cursor-pointer"
          >
            <QrCode size={13} className="text-emerald-700" />
            <span>Quét Mã DPP</span>
          </button>
        </div>

        {/* DPP Serial & Identity */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-white/80 p-2.5 rounded-xl border border-emerald-800/10">
          <div>
            <span className="text-[10px] text-stone-500 uppercase font-semibold block">Mã Định Danh Duy Nhất:</span>
            <span className="font-mono font-bold text-[#183A2D] text-[11.5px] tracking-wider">{dppSerial}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-stone-500 uppercase font-semibold block">Trạng Thái Vòng Đời:</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-800 text-[11px]">
              <CheckCircle2 size={11} className="text-emerald-700" /> Đang Xoay Vòng Tuần Hoàn
            </span>
          </div>
        </div>

        {/* 3 Chỉ Số Đo Lường ESG & Net Zero */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-800/10 shadow-2xs">
            <span className="text-[10px] text-stone-500 font-semibold block">Giảm Phát Thải CO₂</span>
            <p className="text-sm sm:text-base font-black font-mono text-[#183A2D] pt-0.5">-2.8 kg</p>
            <span className="text-[9px] text-emerald-700 font-medium">~1 cây xanh / 3 tháng</span>
          </div>

          <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-800/10 shadow-2xs">
            <span className="text-[10px] text-stone-500 font-semibold block">Tiết Kiệm Nước</span>
            <p className="text-sm sm:text-base font-black font-mono text-[#183A2D] pt-0.5">3.200 Lít</p>
            <span className="text-[9px] text-emerald-700 font-medium">So với may mới</span>
          </div>

          <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-800/10 shadow-2xs">
            <span className="text-[10px] text-stone-500 font-semibold block">Vòng Đời Tuần Hoàn</span>
            <p className="text-sm sm:text-base font-black font-mono text-[#183A2D] pt-0.5">3 / 10</p>
            <span className="text-[9px] text-emerald-700 font-medium">Độ bền tối ưu</span>
          </div>
        </div>

        {/* Traceability & Material Breakdown */}
        <div className="space-y-1.5 text-[11px] text-stone-700 bg-white/70 p-3 rounded-xl border border-emerald-800/10">
          <div className="flex justify-between items-center">
            <span className="text-stone-500">Chất liệu sợi định danh:</span>
            <strong className="text-[#142A1E]">{material}</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-stone-500">Khả năng tái chế & phục hồi:</span>
            <strong className="text-emerald-800">94% (Eco-grade A+)</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-stone-500">Phương thức định danh vật lý:</span>
            <strong className="text-[#142A1E]">NFC Smart Tag & Dynamic QR Code</strong>
          </div>
        </div>

      </div>

      {/* MODAL QUÉT MÃ DPP */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl border border-stone-200 space-y-4">
            
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Modal Title */}
            <div className="space-y-1">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-extrabold uppercase tracking-wider font-mono">
                EU Standard Digital Passport
              </span>
              <h3 className="text-lg font-heading font-extrabold text-[#183A2D]">
                Hộ Chiếu Số Trang Phục
              </h3>
              <p className="text-xs text-stone-500">
                {productTitle}
              </p>
            </div>

            {/* QR Image Box */}
            <div className="flex flex-col items-center justify-center p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80">
              <img 
                src={qrCodeUrl} 
                alt="QR Hộ Chiếu Số CLOOP DPP"
                className="w-48 h-48 rounded-xl shadow-xs border border-white" 
              />
              <p className="text-[11px] font-mono font-bold text-[#183A2D] mt-2.5">
                {dppSerial}
              </p>
            </div>

            {/* NFC & QR Instructions */}
            <div className="text-left text-xs bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1 text-stone-600">
              <p className="font-bold text-[#142A1E] flex items-center gap-1 text-[11.5px]">
                <Info size={13} className="text-emerald-700" /> Cách tra cứu danh tính số:
              </p>
              <p className="text-[11px]">1. Mở camera điện thoại quét mã QR ở trên để tra cứu lịch sử vòng đời.</p>
              <p className="text-[11px]">2. Hoặc chạm mặt lưng điện thoại vào mác áo gắn chip NFC của CLOOP khi nhận hàng.</p>
            </div>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-[#183A2D] text-white font-bold text-xs rounded-xl hover:bg-[#2A6E46] transition-colors cursor-pointer"
            >
              Đóng Cửa Sổ
            </button>
          </div>
        </div>
      )}
    </>
  );
}
