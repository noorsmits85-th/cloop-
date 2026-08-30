"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, 
  Leaf, 
  RotateCcw,
  ShieldCheck, 
  ChevronRight,
  Repeat
} from "lucide-react";

export default function SignatureCircularFlow() {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const DURATION = 3800; // 3.8s punchy dynamic auto-play

  const stages = [
    {
      id: "rent",
      step: "01",
      name: "Thuê Trang Phục",
      badge: "VÒNG ĐỜI #1 • KHỞI ĐẦU",
      tagline: "Trải nghiệm đồ thiết kế với 10% chi phí",
      title: "Trải Nghiệm Đồ Thiết Kế Với 10% Chi Phí",
      desc: "Chiếc đầm dạ hội bắt đầu hành trình từ tủ đồ của một nhà sáng tạo. Khách thuê nhận đồ sạch thơm chuẩn spa và được bảo chứng 100% qua Két Escrow.",
      img: "/step1_phone.jpg",
      garmentDetail: "Đầm Lụa Sequin Prom • CLP-8821",
      lifecycleStory: "Xuất phát từ tủ đồ @olivia.style tại Hà Nội",
      ecoSaving: "Tiết kiệm 90% chi phí mua mới",
      action: "Khám Phá Sàn Thuê",
      href: "/shop"
    },
    {
      id: "wear",
      step: "02",
      name: "Mặc & Tỏa Sáng",
      badge: "VÒNG ĐỜI #2 • GHI DẤU KỶ NIỆM",
      tagline: "Tự tin rực rỡ tại khoảnh khắc đáng nhớ",
      title: "Tự Tin Rực Rỡ Tại Khoảnh Khắc Đáng Nhớ",
      desc: "Đồng hành cùng chủ nhân trong đêm Gala & Prom tốt nghiệp. Khoảnh khắc tỏa sáng được ghi lại và lưu giữ mãi mãi trong Hộ Chiếu Số của trang phục.",
      img: "/evening_dress.jpg",
      garmentDetail: "Đầm Lụa Sequin Prom • CLP-8821",
      lifecycleStory: "Tỏa sáng tại đêm Prom Night cùng @chloe.vintage",
      ecoSaving: "Lưu giữ kỷ niệm độc bản trên Blockchain Passport",
      action: "Đọc Ký Ức Trang Phục",
      href: "/blog"
    },
    {
      id: "pass",
      step: "03",
      name: "Pass Chuyển Nhượng",
      badge: "VÒNG ĐỜI #3 • TRAO TAY CHỦ MỚI",
      tagline: "Sang nhượng minh bạch, tối ưu giá trị",
      title: "Sang Nhượng Minh Bạch, Tối Ưu Giá Trị Tủ Đồ",
      desc: "Khi không còn nhu cầu mặc lại, trang phục được sang nhượng với giá minh bạch cho thành viên khác trong cộng đồng. Tiền chuyển về STK chỉ trong 30 giây.",
      img: "/vintage_coat.jpg",
      garmentDetail: "Đầm Lụa Sequin Prom • CLP-8821",
      lifecycleStory: "Chuyển giao cho @dustin.journey với giá 350k",
      ecoSaving: "Tối ưu hóa giá trị tài sản tủ đồ",
      action: "Vào Sàn Pass Đồ",
      href: "/shop?category=Resale"
    },
    {
      id: "upcycle",
      step: "04",
      name: "Tái Sinh Sáng Tạo",
      badge: "VÒNG ĐỜI #4 • TÁI SINH THÀNH MÓN MỚI",
      tagline: "Vòng đời bất tận tại Chợ Xanh Upcycle",
      title: "Tái Cấu Trúc Sáng Tạo & Vòng Đời Bất Tận",
      desc: "Nguyên liệu vải cao cấp được sinh viên thiết kế & Local Brand tái cấu trúc thành chiếc áo khoác Biker hoặc túi xách mới. Hoàn tất 1 chu trình khép kín và tự động quay lại Bước 01!",
      img: "/hero_group.jpg",
      garmentDetail: "Set Đồ Upcycled Tái Sinh • CLP-8821-UP",
      lifecycleStory: "Tái chế từ vải đầm cũ thành Set Denim độc bản",
      ecoSaving: "Ước tính giảm ~18.2kg CO₂ • Zero-Waste 100%",
      action: "Khám Phá Chợ Xanh",
      href: "/shop?category=Upcycle"
    }
  ];

  // Continuous dynamic auto-play loop (Relentless & Smooth)
  useEffect(() => {
    const intervalTime = 40;
    const increment = (intervalTime / DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveStep((curr) => (curr + 1) % stages.length);
          return 0;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [activeStep]);

  const handleSelect = (idx: number) => {
    setActiveStep(idx);
    setProgress(0);
  };

  return (
    <section className="w-full bg-[#FAF9F5] border-b border-stone-200/80 py-16 md:py-24 text-[#183A2D] font-body relative overflow-hidden select-none">
      
      {/* 🌊 Ambient Aurora Light Beam */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-gradient-to-r from-emerald-100/35 via-teal-50/25 to-amber-50/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 relative z-10 space-y-12">
        
        {/* 🎬 COMMERCIAL AD HEADLINE & CONCEPT STATEMENT */}
        <div className="text-center max-w-3xl mx-auto space-y-3.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-emerald-200 text-emerald-900 text-[10px] font-bold uppercase tracking-[0.25em] font-ui shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            TRIẾT LÝ TUẦN HOÀN CLOOP
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#183A2D] tracking-tight leading-[1.1]">
            MỘT MÓN ĐỒ.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-900">
              VÔ TẬN VÒNG ĐỜI.
            </span>
          </h2>

          <p className="text-stone-600 text-xs sm:text-sm md:text-base font-light leading-relaxed max-w-xl mx-auto">
            Theo chân hành trình bất tận của một trang phục cao cấp qua 4 giai đoạn sống — nơi cái đẹp không bao giờ kết thúc.
          </p>
        </div>

        {/* 🔄 THE LIVING INFINITY LOOP STAGE (CINEMATIC CONTAINER) */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-7 md:p-10 border border-stone-300/80 shadow-xl relative overflow-hidden">
          
          {/* Top Live Broadcast Bar: Always Active */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7 pb-4 border-b border-stone-200/80">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              <div>
                <span className="font-mono text-xs font-bold text-[#183A2D] block">
                  CHU TRÌNH 4 BƯỚC TUẦN HOÀN • TỰ ĐỘNG CHUYỂN BƯỚC
                </span>
                <span className="text-[10px] text-stone-500 font-ui">
                  Hệ thống đang tự động luân chuyển liên tục từng vòng đời
                </span>
              </div>
            </div>

            {/* Loop Counter Indicator */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                <RotateCcw size={12} className="animate-spin text-emerald-700" style={{ animationDuration: '6s' }} />
                Giai Đoạn {activeStep + 1} / 04
              </span>
            </div>
          </div>

          {/* ⚡ 4 CONNECTED INFINITY STAGE NODES (LOOP TIMELINE RIBBON) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8 relative">
            
            {stages.map((stage, idx) => {
              const isActive = activeStep === idx;

              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => handleSelect(idx)}
                  className={`group relative text-left p-4 rounded-2xl transition-all duration-500 cursor-pointer overflow-hidden border ${
                    isActive
                      ? "bg-[#183A2D] text-white border-[#183A2D] shadow-lg scale-[1.02] ring-2 ring-emerald-500/30"
                      : "bg-[#FAF9F5] hover:bg-white text-stone-700 border-stone-200/90 shadow-2xs"
                  }`}
                >
                  {/* Live Continuous Progress Bar Fill */}
                  {isActive && (
                    <div
                      className="absolute top-0 left-0 bottom-0 bg-white/10 z-0 pointer-events-none transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  )}

                  <div className="relative z-10 flex items-center justify-between mb-2.5">
                    <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                      isActive 
                        ? "bg-white/20 text-[#A3E39F]" 
                        : "bg-stone-200/80 text-stone-600 group-hover:bg-emerald-100 group-hover:text-emerald-800"
                    }`}>
                      {stage.step}
                    </span>

                    {isActive && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A3E39F] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A3E39F]"></span>
                      </span>
                    )}
                  </div>

                  <div className="relative z-10 space-y-0.5">
                    <h3 className={`font-heading text-sm sm:text-base font-bold ${
                      isActive ? "text-white" : "text-[#183A2D]"
                    }`}>
                      {stage.name}
                    </h3>
                    <p className={`text-[10.5px] sm:text-[11px] font-light leading-snug ${
                      isActive ? "text-emerald-200" : "text-stone-500"
                    }`}>
                      {stage.tagline}
                    </p>
                  </div>

                  {/* Flowing Laser Bottom Border */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#A3E39F] via-white to-[#A3E39F]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 🌟 CINEMATIC FLUID STAGE DISPLAY (THE ACTIVE LIFE PHASE) */}
          <div className="relative min-h-[380px] sm:min-h-[420px] rounded-2xl overflow-hidden bg-[#FAF9F5] border border-stone-200/90 p-5 sm:p-7 md:p-8 flex items-center">
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, scale: 0.98, x: 20, filter: "blur(4px)" }}
                animate={{ opacity: 1, scale: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.98, x: -20, filter: "blur(4px)" }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-center"
              >
                
                {/* Left Side: Cinematic 4:3 Fashion Visual Showcase */}
                <div className="lg:col-span-5 relative group">
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-md border border-stone-300 bg-stone-900">
                    <Image
                      src={stages[activeStep].img}
                      alt={stages[activeStep].name}
                      fill
                      className="object-cover transition-transform duration-1000 group-hover:scale-105"
                      unoptimized
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/25" />

                    {/* Stage Badge */}
                    <div className="absolute top-3.5 left-3.5 bg-black/75 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-white/20 font-ui shadow-xs">
                      {stages[activeStep].badge}
                    </div>

                    {/* Garment Passport Live Tracker */}
                    <div className="absolute bottom-3.5 left-3.5 right-3.5 bg-[#183A2D]/90 backdrop-blur-md text-white p-2.5 rounded-xl border border-[#A3E39F]/30 shadow-xs">
                      <p className="text-[10px] font-mono text-[#A3E39F] font-bold">
                        {stages[activeStep].garmentDetail}
                      </p>
                      <p className="text-[9.5px] text-stone-300 font-light truncate mt-0.5">
                        {stages[activeStep].lifecycleStory}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Side: Narrative Story, Eco Metrics & Seamless Action */}
                <div className="lg:col-span-7 space-y-4 sm:space-y-5 text-left">
                  
                  <div className="space-y-2">
                    <span className="text-[10.5px] font-mono font-extrabold text-emerald-800 uppercase tracking-widest bg-emerald-100/80 px-2.5 py-0.5 rounded-md border border-emerald-200 font-ui inline-block">
                      {stages[activeStep].name} • VÒNG ĐỜI THỜI TRANG CLOOP
                    </span>
                    <h3 className="font-heading text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#183A2D] tracking-tight leading-snug">
                      {stages[activeStep].title}
                    </h3>
                  </div>

                  <p className="text-stone-600 text-xs sm:text-sm md:text-[15px] font-light leading-relaxed">
                    {stages[activeStep].desc}
                  </p>

                  {/* Eco & Economic Value Highlight */}
                  <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 text-xs sm:text-sm">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                        <Leaf size={14} />
                      </div>
                      <span className="font-semibold text-[#183A2D]">
                        {stages[activeStep].ecoSaving}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono self-end sm:self-center">
                      *Phương pháp LCA
                    </span>
                  </div>

                  {/* Action Link & Step Controls */}
                  <div className="pt-2 flex items-center gap-4 flex-wrap">
                    <Link
                      href={stages[activeStep].href}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#183A2D] hover:bg-[#0d221a] text-white rounded-xl text-xs sm:text-sm uppercase font-bold tracking-wider font-ui transition-all shadow-md hover:scale-102 active:scale-98"
                    >
                      <span>{stages[activeStep].action}</span>
                      <ArrowRight size={14} />
                    </Link>

                    {/* Step dots for quick navigation */}
                    <div className="flex items-center gap-1.5 pl-2">
                      {stages.map((_, dotIdx) => (
                        <button
                          key={dotIdx}
                          onClick={() => handleSelect(dotIdx)}
                          className={`h-2 rounded-full transition-all duration-500 cursor-pointer ${
                            activeStep === dotIdx 
                              ? "w-6 bg-[#183A2D]" 
                              : "w-2 bg-stone-300 hover:bg-stone-400"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                </div>

              </motion.div>
            </AnimatePresence>

          </div>

          {/* 🔁 THE CLOSED LOOP ARROW (VÒNG LẶP TUẦN HOÀN QUAY TRỞ LẠI BƯỚC 01) */}
          <div className="mt-6 pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-600 font-ui bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100">
            <div className="flex items-center gap-2 font-medium text-emerald-950">
              <RotateCcw size={14} className="text-emerald-700 shrink-0" />
              <span>Chu trình khép kín: Sau khi <strong>Tái Sinh</strong>, trang phục quay trở lại làm sản phẩm cho <strong>Thuê (Bước 01)</strong>.</span>
            </div>
            <span className="font-mono text-[10.5px] font-bold text-emerald-800 shrink-0 bg-white px-2.5 py-1 rounded-md border border-emerald-200 shadow-2xs">
              ∞ 100% CIRCULAR ECONOMY
            </span>
          </div>

        </div>

      </div>
    </section>
  );
}
