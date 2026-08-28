"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  Leaf, 
  ArrowRight, 
  Camera, 
  Lock, 
  Award,
  Sparkle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MarketingLoopShowcase() {
  const [roleTab, setRoleTab] = useState<"RENTER" | "OWNER">("RENTER");

  const renterSteps = [
    {
      step: "01",
      title: "Chọn đồ & Ướm dáng",
      desc: "Trang phục dạ hội, áo dài & blazer thiết kế tuyển chọn.",
      meta: "Stylist 24/7"
    },
    {
      step: "02",
      title: "Nhận đồ & Giữ cọc",
      desc: "Giao tận tay thơm tho. Tiền cọc bảo chứng an toàn qua Két Escrow.",
      meta: "Két Escrow 100%"
    },
    {
      step: "03",
      title: "Tỏa sáng sự kiện",
      desc: "Diện đồ cao cấp với chi phí chỉ từ 10% giá mua mới.",
      meta: "Tiết kiệm 90%"
    },
    {
      step: "04",
      title: "Hoàn trả & Tích điểm",
      desc: "Giao nhận trả đồ tận nơi qua đối tác vận chuyển. Tự động hoàn cọc & tích Green Pts.",
      meta: "+50 Green Pts"
    }
  ];

  const ownerSteps = [
    {
      step: "01",
      title: "Đăng tủ 30 giây",
      desc: "Chụp ảnh váy áo nhàn rỗi. Tự động đề xuất phân loại & mức giá thuê chuẩn sàn.",
      meta: "Đăng đồ 30s"
    },
    {
      step: "02",
      title: "Giao nhận tận cửa",
      desc: "Đối tác vận chuyển lấy hàng tận nơi, chủ tủ không cần di chuyển.",
      meta: "Lấy hàng tại nhà"
    },
    {
      step: "03",
      title: "Thu nhập thụ động",
      desc: "Tiền thuê cộng vào ví sau mỗi chuyến đi, rút về STK trong 30s.",
      meta: "Rút tiền chính chủ"
    },
    {
      step: "04",
      title: "Định danh xanh ESG",
      desc: "Đo lường CO₂ giảm thải & nâng hạng huy hiệu Shop Uy Tín.",
      meta: "Huy hiệu Trustworthy"
    }
  ];

  const currentSteps = roleTab === "RENTER" ? renterSteps : ownerSteps;

  return (
    <section className="w-full bg-[#FAF9F5] border-b border-stone-200/70 py-8 md:py-10 text-[#183A2D] font-body">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 space-y-6">
        
        {/* HEADER GỌN GÀNG & THANH LỊCH */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200/60 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-700"></span>
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-emerald-900/80 font-ui">
                QUY TRÌNH THỜI TRANG TUẦN HOÀN
              </span>
            </div>
            <h2 className="font-heading text-lg sm:text-xl md:text-2xl font-bold text-[#183A2D] tracking-tight">
              Mặc Đẹp Thông Minh • Tủ Đồ Tuần Hoàn
            </h2>
          </div>

          {/* TAB CHUYỂN ĐỔI THANH MẢNH */}
          <div className="inline-flex items-center gap-1 p-1 bg-stone-100/90 rounded-lg border border-stone-200/80 font-ui self-start md:self-auto">
            <button
              type="button"
              onClick={() => setRoleTab("RENTER")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                roleTab === "RENTER"
                  ? "bg-[#183A2D] text-white shadow-xs"
                  : "text-stone-600 hover:text-[#183A2D]"
              }`}
            >
              Tôi Muốn Thuê Đồ
            </button>
            <button
              type="button"
              onClick={() => setRoleTab("OWNER")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                roleTab === "OWNER"
                  ? "bg-[#183A2D] text-white shadow-xs"
                  : "text-stone-600 hover:text-[#183A2D]"
              }`}
            >
              Tôi Muốn Cho Thuê
            </button>
          </div>
        </div>

        {/* 4 BƯỚC NẰM GỌN TRÊN 1 HÀNG */}
        <AnimatePresence mode="wait">
          <motion.div
            key={roleTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5"
          >
            {currentSteps.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl p-4 border border-stone-200/80 hover:border-emerald-700/50 transition-all text-left flex flex-col justify-between space-y-2.5 shadow-2xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono font-medium text-stone-400">
                    <span>BƯỚC {item.step}</span>
                    <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-ui font-semibold">
                      {item.meta}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#183A2D] font-heading">
                    {item.title}
                  </h3>
                  <p className="text-[11.5px] text-stone-500 font-light leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[10.5px] text-stone-400 font-ui">
                  <span className="text-[#183A2D] font-medium">Bảo chứng CLOOP</span>
                  <ArrowRight size={11} className="text-stone-400" />
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* DẢI BẢO CHỨNG MINH BẠCH - NỀN TRẮNG TINH TẾ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="flex items-center gap-2.5 p-2.5 bg-stone-50/80 rounded-lg border border-stone-200/60 text-left">
            <ShieldCheck size={16} strokeWidth={1.5} className="text-emerald-800 shrink-0" />
            <div className="leading-tight">
              <p className="text-[11px] font-bold text-[#183A2D]">Két Cọc Escrow</p>
              <p className="text-[9.5px] text-stone-500 font-light">Hoàn cọc 100% khi trả đồ</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 bg-stone-50/80 rounded-lg border border-stone-200/60 text-left">
            <Lock size={16} strokeWidth={1.5} className="text-emerald-800 shrink-0" />
            <div className="leading-tight">
              <p className="text-[11px] font-bold text-[#183A2D]">Định Danh Bank-KYC</p>
              <p className="text-[9.5px] text-stone-500 font-light">Rút tiền về STK chính chủ</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 bg-stone-50/80 rounded-lg border border-stone-200/60 text-left">
            <Leaf size={16} strokeWidth={1.5} className="text-emerald-800 shrink-0" />
            <div className="leading-tight">
              <p className="text-[11px] font-bold text-[#183A2D]">Điểm Green Pts</p>
              <p className="text-[9.5px] text-stone-500 font-light">Giảm đến 50% tiền cọc</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 bg-stone-50/80 rounded-lg border border-stone-200/60 text-left">
            <Award size={16} strokeWidth={1.5} className="text-emerald-800 shrink-0" />
            <div className="leading-tight">
              <p className="text-[11px] font-bold text-[#183A2D]">Đánh Giá Mù 2 Chiều</p>
              <p className="text-[9.5px] text-stone-500 font-light">Minh bạch chuẩn Airbnb</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
