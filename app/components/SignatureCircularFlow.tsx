"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, 
  ShieldCheck, 
  Leaf, 
  RotateCcw,
  Sparkles,
  Play,
  Pause,
  CheckCircle2
} from "lucide-react";

export default function SignatureCircularFlow() {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const DURATION = 4500; // 4.5s per step

  const loopStages = [
    {
      id: "rent",
      step: "01",
      name: "Thuê (Rent)",
      shortDesc: "10% chi phí mua mới",
      title: "Trải Nghiệm Đồ Thiết Kế 10% Chi Phí",
      desc: "Lướt qua hàng ngàn trang phục dạ hội, blazer và áo dài may đo từ các tủ đồ uy tín. Nhận đồ thơm tho chuẩn spa, được bảo chứng 100% bằng Két Cọc Escrow.",
      img: "/step1_phone.jpg",
      metric: "Tiết kiệm ~90% chi phí • Hoàn cọc 100%",
      badge: "GIAI ĐOẠN 01 • KHỞI ĐẦU VÒNG ĐỜI",
      accent: "from-emerald-600 to-teal-500",
      cta: "Khám Phá Sàn Thuê",
      href: "/shop"
    },
    {
      id: "wear",
      step: "02",
      name: "Mặc (Wear)",
      shortDesc: "Tỏa sáng từng khoảnh khắc",
      title: "Tự Tin Tỏa Sáng Tại Mọi Sự Kiện",
      desc: "Tự tin xuất hiện rạng rỡ tại Prom, tiệc cưới, sự kiện hay lookbook du lịch. Mỗi lần mặc là một kỷ niệm độc bản được định danh trên Hộ Chiếu Số.",
      img: "/evening_dress.jpg",
      metric: "Định danh Hộ Chiếu Số • Ghi dấu câu chuyện",
      badge: "GIAI ĐOẠN 02 • TẬN HƯỞNG & LƯU KỶ NIỆM",
      accent: "from-teal-600 to-emerald-600",
      cta: "Đọc Ký Ức Trang Phục",
      href: "/blog"
    },
    {
      id: "pass",
      step: "03",
      name: "Pass (Resale)",
      shortDesc: "Chuyển nhượng minh bạch",
      title: "Chuyển Giao Tủ Đồ Cho Chủ Nhân Mới",
      desc: "Khi không còn nhu cầu diện lại, dễ dàng sang nhượng trang phục cho các thành viên đồng điệu trong cộng đồng CLOOP với giá trị tối ưu.",
      img: "/vintage_coat.jpg",
      metric: "Tối ưu hóa giá trị tài sản • Rút tiền STK 30s",
      badge: "GIAI ĐOẠN 03 • SANG NHƯỢNG 1-CLICK",
      accent: "from-emerald-700 to-green-600",
      cta: "Vào Sàn Pass Đồ",
      href: "/shop?category=Resale"
    },
    {
      id: "upcycle",
      step: "04",
      name: "Tái Sinh (Upcycle)",
      shortDesc: "Vòng đời mới tại Chợ Xanh",
      title: "Tái Cấu Trúc Sáng Tạo Tại Chợ Xanh",
      desc: "Trang phục hết vòng đời cho thuê được sinh viên thiết kế & Local Brand tái sinh thành tác phẩm nghệ thuật mới, không một sợi vải thừa thải ra môi trường.",
      img: "/hero_group.jpg",
      metric: "Ước tính giảm ~18.2kg CO₂ • Zero-Waste 100%",
      badge: "GIAI ĐOẠN 04 • VÒNG ĐỜI BẤT TẬN",
      accent: "from-green-600 to-emerald-800",
      cta: "Khám Phá Chợ Xanh Upcycling",
      href: "/shop?category=Upcycle"
    }
  ];

  // Auto-advance loop with smooth continuous progress
  useEffect(() => {
    if (!isPlaying) return;

    const interval = 50; // update every 50ms
    const stepIncrement = (interval / DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveStep((curr) => (curr + 1) % loopStages.length);
          return 0;
        }
        return prev + stepIncrement;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, activeStep]);

  const handleStepSelect = (idx: number) => {
    setActiveStep(idx);
    setProgress(0);
  };

  return (
    <section 
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
      className="w-full bg-[#FAF9F5] border-b border-stone-200/80 py-16 md:py-24 text-[#183A2D] font-body relative overflow-hidden select-none"
    >
      
      {/* 🌊 AMBIENT GG FLOW FLUID AURORA BACKDROP */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[550px] bg-gradient-to-tr from-emerald-100/40 via-teal-50/30 to-amber-50/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 relative z-10 space-y-12">
        
        {/* 🌟 EDITORIAL HEADER: FASHION IN A LOOP */}
        <div className="text-center max-w-2xl mx-auto space-y-3.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-emerald-200/80 text-emerald-900 text-[10px] font-bold uppercase tracking-[0.25em] font-ui shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            GOOGLE FLOW • FASHION IN A LOOP
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#183A2D] tracking-tight leading-[1.1]">
            MỘT MÓN ĐỒ.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-900">
              VÔ TẬN VÒNG ĐỜI.
            </span>
          </h2>

          <p className="text-stone-600 text-xs sm:text-sm font-light leading-relaxed max-w-lg mx-auto">
            Khám phá dòng chảy tuần hoàn 4 bước khép kín — nơi giá trị trang phục được tối ưu hóa và liên tục tái sinh cùng cộng đồng CLOOP.
          </p>
        </div>

        {/* 🔄 UNIFIED GG FLOW CONNECTED TIMELINE STAGE */}
        <div className="bg-white/85 backdrop-blur-md rounded-3xl p-5 sm:p-7 md:p-9 border border-stone-300/70 shadow-lg relative overflow-hidden">
          
          {/* Top Interactive Pipeline Tracker Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 mb-8 relative z-10">
            {loopStages.map((stage, idx) => {
              const isActive = activeStep === idx;
              const isPassed = activeStep > idx;

              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => handleStepSelect(idx)}
                  className={`group relative text-left p-3.5 sm:p-4 rounded-2xl transition-all duration-500 cursor-pointer overflow-hidden border ${
                    isActive
                      ? "bg-[#183A2D] text-white border-[#183A2D] shadow-md scale-[1.02]"
                      : "bg-[#FAF9F5] hover:bg-stone-100/80 text-stone-700 border-stone-200"
                  }`}
                >
                  {/* Active Step Progress Fill Bar (Top Edge) */}
                  {isActive && (
                    <motion.div
                      className="absolute top-0 left-0 bottom-0 bg-white/10 z-0 pointer-events-none"
                      style={{ width: `${progress}%` }}
                      transition={{ ease: "linear" }}
                    />
                  )}

                  <div className="relative z-10 flex items-center justify-between mb-2">
                    <span className={`font-mono text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md ${
                      isActive 
                        ? "bg-white/20 text-[#A3E39F]" 
                        : "bg-stone-200 text-stone-600 group-hover:bg-emerald-100 group-hover:text-emerald-800"
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
                    <h3 className={`font-heading text-xs sm:text-sm font-bold ${
                      isActive ? "text-white" : "text-[#183A2D]"
                    }`}>
                      {stage.name}
                    </h3>
                    <p className={`text-[10px] sm:text-[11px] font-light truncate ${
                      isActive ? "text-emerald-200" : "text-stone-500"
                    }`}>
                      {stage.shortDesc}
                    </p>
                  </div>

                  {/* Flowing Laser Bottom Border for Active Card */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#A3E39F] via-white to-[#A3E39F]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 🌟 SEAMLESS FLUID STAGE CONTENT (GOOGLE FLOW TRANSITION) */}
          <div className="relative min-h-[380px] sm:min-h-[420px] md:min-h-[440px] rounded-2xl overflow-hidden bg-[#FAF9F5] border border-stone-200/80 p-5 sm:p-7 md:p-8 flex items-center">
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 25, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -25, filter: "blur(4px)" }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-center"
              >
                
                {/* Left Side: Editorial 4:3 Fashion Visual Canvas with Shimmer Overlay */}
                <div className="lg:col-span-5 relative group">
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-md border border-stone-300/80 bg-stone-900">
                    <Image
                      src={loopStages[activeStep].img}
                      alt={loopStages[activeStep].title}
                      fill
                      className="object-cover transition-transform duration-1000 group-hover:scale-105"
                      unoptimized
                    />
                    
                    {/* Dark gradient base */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />

                    {/* Top Stage Tag */}
                    <div className="absolute top-3.5 left-3.5 bg-black/70 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-white/20 font-ui shadow-xs">
                      {loopStages[activeStep].badge}
                    </div>

                    {/* Bottom Floating Step Number */}
                    <div className="absolute bottom-3.5 right-3.5 bg-[#183A2D]/90 backdrop-blur-md text-[#A3E39F] font-mono text-xs font-extrabold px-3 py-1 rounded-lg border border-[#A3E39F]/30 shadow-xs flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#A3E39F] animate-pulse"></span>
                      LOOP {loopStages[activeStep].step} / 04
                    </div>
                  </div>
                </div>

                {/* Right Side: Narrative, Eco Metrics & Smooth Action */}
                <div className="lg:col-span-7 space-y-4 sm:space-y-5 text-left">
                  
                  {/* Step Title & Badge */}
                  <div className="space-y-1.5">
                    <span className="text-[10.5px] font-mono font-extrabold text-emerald-800 uppercase tracking-widest bg-emerald-100/80 px-2.5 py-0.5 rounded-md border border-emerald-200 font-ui inline-block">
                      {loopStages[activeStep].name} • VÒNG ĐỜI CLOOP
                    </span>
                    <h3 className="font-heading text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#183A2D] tracking-tight leading-snug">
                      {loopStages[activeStep].title}
                    </h3>
                  </div>

                  {/* Body Narrative */}
                  <p className="text-stone-600 text-xs sm:text-sm md:text-[15px] font-light leading-relaxed">
                    {loopStages[activeStep].desc}
                  </p>

                  {/* Live Impact & Economic Value Chip */}
                  <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 text-xs sm:text-sm">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                        <Leaf size={14} />
                      </div>
                      <span className="font-semibold text-[#183A2D]">
                        {loopStages[activeStep].metric}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono self-end sm:self-center">
                      *Phương pháp LCA
                    </span>
                  </div>

                  {/* Action Link & Step Controls */}
                  <div className="pt-2 flex items-center gap-4 flex-wrap">
                    <Link
                      href={loopStages[activeStep].href}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#183A2D] hover:bg-[#0d221a] text-white rounded-xl text-xs sm:text-sm uppercase font-bold tracking-wider font-ui transition-all shadow-md hover:scale-102 active:scale-98"
                    >
                      <span>{loopStages[activeStep].cta}</span>
                      <ArrowRight size={14} />
                    </Link>

                    {/* Step dots for quick navigation */}
                    <div className="flex items-center gap-1.5 pl-2">
                      {loopStages.map((_, dotIdx) => (
                        <button
                          key={dotIdx}
                          onClick={() => handleStepSelect(dotIdx)}
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

        </div>

      </div>
    </section>
  );
}
