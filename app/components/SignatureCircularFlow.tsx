"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  RotateCcw, 
  ArrowRight, 
  ShieldCheck, 
  Leaf, 
  Layers, 
  Feather,
  RefreshCw,
  ShoppingBag,
  Sparkles
} from "lucide-react";

export default function SignatureCircularFlow() {
  const [activeStep, setActiveStep] = useState(0);

  const loopStages = [
    {
      id: "rent",
      step: "01",
      name: "Thuê (Rent)",
      tagline: "Trải nghiệm 10% chi phí",
      desc: "Lướt hàng ngàn trang phục dạ hội, áo dài & blazer thiết kế tuyển chọn từ các tủ đồ uy tín. Nhận đồ thơm tho chuẩn spa.",
      img: "/step1_phone.jpg",
      metric: "Tiết kiệm 90% chi phí mua mới",
      badge: "Két Escrow Bảo Chứng"
    },
    {
      id: "wear",
      step: "02",
      name: "Mặc (Wear)",
      tagline: "Tỏa sáng từng khoảnh khắc",
      desc: "Tự tin xuất hiện rạng rỡ tại sự kiện, dạ tiệc hay chuyến du lịch. Ghi dấu ấn cá nhân và lưu lại kỷ niệm đáng nhớ.",
      img: "/evening_dress.jpg",
      metric: "Định danh mã Hộ Chiếu Số",
      badge: "Kỷ Niệm Độc Bản"
    },
    {
      id: "pass",
      step: "03",
      name: "Pass (Resale)",
      tagline: "Trao quyền sở hữu tiếp theo",
      desc: "Khi không còn nhu cầu sử dụng, chuyển nhượng món đồ cho thành viên khác trong cộng đồng với mức giá minh bạch.",
      img: "/vintage_coat.jpg",
      metric: "Tối ưu hóa giá trị tài sản tủ đồ",
      badge: "Chuyển Nhượng 1-Click"
    },
    {
      id: "upcycle",
      step: "04",
      name: "Tái Sinh (Upcycle)",
      tagline: "Vòng đời mới tại Chợ Xanh",
      desc: "Nguyên liệu vải cao cấp được các sinh viên thiết kế & local brand tái cấu trúc thành tác phẩm độc bản mới.",
      img: "/hero_group.jpg",
      metric: "Ước tính giảm ~18.2kg CO₂/món",
      badge: "Tuần Hoàn Zero-Waste"
    }
  ];

  return (
    <section className="w-full bg-[#FAF9F5] border-b border-stone-200/80 py-14 md:py-20 text-[#183A2D] font-body relative overflow-hidden">
      
      {/* Background Decorative Circular Accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-900/[0.02] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 relative z-10 space-y-10">
        
        {/* EDITORIAL CAMPAIGN MANIFESTO (SIGNATURE HEADER) */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/70 border border-emerald-200/80 text-emerald-900 text-[10px] font-bold uppercase tracking-[0.2em] font-ui">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-pulse"></span>
            TRIẾT LÝ TUẦN HOÀN CLOOP
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#183A2D] tracking-tight leading-tight">
            MỘT MÓN ĐỒ.<br />
            <span className="text-emerald-800">VÔ TẬN VÒNG ĐỜI.</span>
          </h2>

          <p className="text-stone-600 text-xs sm:text-sm font-light leading-relaxed max-w-lg mx-auto">
            Tại CLOOP, mỗi trang phục không kết thúc sau một lần mặc. Chúng tôi tạo ra một dòng chảy khép kín nơi cái đẹp liên tục được tái sinh.
          </p>
        </div>

        {/* 👗 INTERACTIVE 4-STAGE CIRCULAR TIMELINE */}
        <div className="relative pt-4">
          
          {/* Connecting Track Line */}
          <div className="hidden md:block absolute top-[52px] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-emerald-200 via-emerald-700 to-emerald-200 z-0" />

          {/* 4 Stage Interactive Node Selector */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
            {loopStages.map((stage, idx) => {
              const isSelected = activeStep === idx;

              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setActiveStep(idx)}
                  className={`group flex flex-col items-center text-center p-4 rounded-2xl transition-all duration-300 cursor-pointer border ${
                    isSelected
                      ? "bg-white border-emerald-800 shadow-md scale-102 ring-1 ring-emerald-800/20"
                      : "bg-white/70 hover:bg-white border-stone-200 hover:border-stone-300 shadow-2xs"
                  }`}
                >
                  {/* Step Node Dot */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all duration-300 mb-2.5 ${
                    isSelected
                      ? "bg-[#183A2D] text-white shadow-sm ring-4 ring-emerald-100"
                      : "bg-stone-100 text-stone-600 group-hover:bg-emerald-50 group-hover:text-emerald-800"
                  }`}>
                    {stage.step}
                  </div>

                  <h3 className={`font-heading text-sm sm:text-base font-bold transition-colors ${
                    isSelected ? "text-[#183A2D]" : "text-stone-700 group-hover:text-[#183A2D]"
                  }`}>
                    {stage.name}
                  </h3>

                  <p className="text-[10.5px] text-stone-500 font-light mt-0.5 line-clamp-1">
                    {stage.tagline}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 🌟 EXPANDED DETAIL OF ACTIVE STAGE */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center"
            >
              {/* Left Column: Stage Image & Badge */}
              <div className="md:col-span-5 relative">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-sm border border-stone-200">
                  <Image
                    src={loopStages[activeStep].img}
                    alt={loopStages[activeStep].name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute top-3 left-3 bg-[#183A2D]/90 backdrop-blur-xs text-white text-[9.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full font-ui shadow-2xs">
                    {loopStages[activeStep].badge}
                  </div>
                </div>
              </div>

              {/* Right Column: Stage Description & Metrics */}
              <div className="md:col-span-7 space-y-4 text-left">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-widest">
                    GIAI ĐOẠN {loopStages[activeStep].step} TRÊN HÀNH TRÌNH
                  </span>
                  <h3 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#183A2D]">
                    {loopStages[activeStep].name}
                  </h3>
                  <p className="text-emerald-900/80 text-xs font-semibold font-ui">
                    {loopStages[activeStep].tagline}
                  </p>
                </div>

                <p className="text-stone-600 text-xs sm:text-sm font-light leading-relaxed">
                  {loopStages[activeStep].desc}
                </p>

                {/* Eco & Economic Value Highlight */}
                <div className="p-3 bg-[#FAF9F5] rounded-xl border border-stone-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Leaf size={14} className="text-emerald-700 shrink-0" />
                    <span className="font-medium text-[#183A2D]">{loopStages[activeStep].metric}</span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">*Ước tính LCA</span>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <Link
                    href="/shop"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#183A2D] hover:bg-[#10291f] text-white rounded-xl text-xs uppercase font-bold tracking-wider font-ui transition-all shadow-xs"
                  >
                    Khám Phá Giai Đoạn Này <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
