"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface StepNode {
  id: number;
  stepNumber: string;
  title: string;
  loopName: string;
  image: string;
  xPercent: number;
  yPercent: number;
  labelPosition: "top" | "bottom" | "left" | "right";
}

export default function HowItWorksTabs() {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // 6 bước thanh lịch bố trí hài hòa theo dải lụa voan mềm mại
  const steps: StepNode[] = [
    // --- VÒNG TRÁI: KÝ GỬI PHONG CÁCH ---
    {
      id: 0,
      stepNumber: "01",
      title: "Niêm Yết Tinh Gọn",
      loopName: "Vòng 1 · Ký Gửi Phong Cách",
      image: "/step01_v3.jpg",
      xPercent: 30,
      yPercent: 23,
      labelPosition: "top",
    },
    {
      id: 1,
      stepNumber: "02",
      title: "Giao Nhận 0 Đồng",
      loopName: "Vòng 1 · Ký Gửi Phong Cách",
      image: "/step02_v3.jpg",
      xPercent: 18,
      yPercent: 50,
      labelPosition: "left",
    },
    {
      id: 2,
      stepNumber: "03",
      title: "Sinh Lời Tự Động",
      loopName: "Vòng 1 · Ký Gửi Phong Cách",
      image: "/step03_v3.jpg",
      xPercent: 30,
      yPercent: 77,
      labelPosition: "bottom",
    },

    // --- VÒNG PHẢI: TRẢI NGHIỆM THĂNG HOA ---
    {
      id: 3,
      stepNumber: "04",
      title: "Khám Phá Bộ Sưu Tập",
      loopName: "Vòng 2 · Trải Nghiệm Thăng Hoa",
      image: "/step04_v3.jpg",
      xPercent: 70,
      yPercent: 23,
      labelPosition: "top",
    },
    {
      id: 4,
      stepNumber: "05",
      title: "Trang Phục Chuẩn Spa",
      loopName: "Vòng 2 · Trải Nghiệm Thăng Hoa",
      image: "/step05_v3.jpg",
      xPercent: 82,
      yPercent: 50,
      labelPosition: "right",
    },
    {
      id: 5,
      stepNumber: "06",
      title: "Tỏa Sáng & Trả Hàng",
      loopName: "Vòng 2 · Trải Nghiệm Thăng Hoa",
      image: "/step06_v3.jpg",
      xPercent: 70,
      yPercent: 77,
      labelPosition: "bottom",
    },
  ];

  // Tự động chuyển bước mượt mà (tạm dừng khi rê chuột)
  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [steps.length, isHovered]);

  return (
    <section 
      className="w-full py-16 md:py-24 bg-[#FAF9F6] border-y border-stone-200/60 font-ui relative overflow-hidden select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* --- TIÊU ĐỀ: TRIẾT LÝ TUẦN HOÀN XANH (THIẾT KẾ BADGE TINH TẾ) --- */}
        <div className="text-center max-w-2xl mx-auto mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-emerald-900/[0.04] border border-emerald-900/10 backdrop-blur-sm shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-700/80 animate-pulse" />
            <span className="text-xs sm:text-[13px] md:text-sm font-semibold tracking-[0.25em] uppercase text-emerald-950/90">
              Triết Lý Tuần Hoàn Xanh
            </span>
          </div>
        </div>

        {/* --- TIÊU ĐỀ 2 VÒNG DẠNG NGHỆ THUẬT TRIỂN LÃM --- */}
        <div className="hidden md:grid grid-cols-2 gap-8 max-w-4xl mx-auto mb-4 px-10">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-serif font-bold text-emerald-900/70 bg-emerald-100/60 w-6 h-6 rounded-full flex items-center justify-center border border-emerald-800/10">
              I
            </span>
            <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#143224]">
              VÒNG 1: KÝ GỬI PHONG CÁCH
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 text-right">
            <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#143224]">
              VÒNG 2: TRẢI NGHIỆM THĂNG HOA
            </div>
            <span className="text-[11px] font-serif font-bold text-emerald-900/70 bg-emerald-100/60 w-6 h-6 rounded-full flex items-center justify-center border border-emerald-800/10">
              II
            </span>
          </div>
        </div>

        {/* --- KHU VỰC VÒNG LẶP DẢI LỤA VOAN TRONG SUỐT (KHÔNG HỘP NỀN TRẮNG) --- */}
        <div className="relative w-full max-w-5xl mx-auto h-[440px] sm:h-[500px] md:h-[540px] flex items-center justify-center">
          
          {/* TÁC PHẨM DẢI LỤA VOAN TRONG SUỐT HOÀN TOÀN (PNG TRANSPARENT) */}
          <div className="absolute inset-0 w-full h-full pointer-events-none select-none flex items-center justify-center">
            <div className="relative w-full h-full">
              <Image
                src="/soft_silk_infinity.png"
                alt="CLOOP Soft Silk Infinity"
                fill
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-contain pointer-events-none"
                priority
              />
            </div>
          </div>

          {/* TRUNG TÂM GIAO THOA: HUY HIỆU LOGO CHÍNH HÃNG */}
          <div
            style={{ left: "50%", top: "50%" }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-30 select-none cursor-pointer"
            onClick={() => setActiveStep((prev) => (prev + 1) % steps.length)}
          >
            <div className="relative group w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-white/90 backdrop-blur-md border border-emerald-900/10 shadow-[0_8px_30px_rgba(20,50,36,0.08)] flex items-center justify-center p-3 transition-transform duration-500 hover:scale-106">
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-sm pointer-events-none animate-pulse" />

              <div className="relative w-full h-full">
                <Image
                  src="/loogo.png"
                  alt="CLOOP Circular Fashion"
                  fill
                  sizes="120px"
                  className="mix-blend-multiply object-contain transition-transform duration-500 group-hover:scale-108"
                  priority
                />
              </div>
            </div>
          </div>

          {/* 6 ĐIỂM NÚT ẢNH CAMEO THANH LỊCH --- */}
          {steps.map((node, index) => {
            const isActive = activeStep === index;

            return (
              <div
                key={node.id}
                style={{ left: `${node.xPercent}%`, top: `${node.yPercent}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
                onClick={() => setActiveStep(node.id)}
              >
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    type: "spring",
                    damping: 18,
                    stiffness: 120,
                    delay: 0.08 * index,
                  }}
                  className="relative flex flex-col items-center"
                >
                  {/* NHÃN BƯỚC NẰM PHÍA TRÊN */}
                  {node.labelPosition === "top" && (
                    <motion.div
                      animate={isActive ? { y: -4 } : { y: 0 }}
                      className={`absolute -top-10 sm:-top-11 md:-top-12 left-1/2 -translate-x-1/2 whitespace-nowrap px-3.5 py-1 rounded-full backdrop-blur-md transition-all duration-300 pointer-events-none ${
                        isActive
                          ? "bg-white text-[#143224] border border-emerald-600/50 shadow-md scale-105 font-bold"
                          : "bg-white/90 text-stone-700 border border-stone-200/70 shadow-2xs font-medium"
                      }`}
                    >
                      <span className="text-[11px] sm:text-xs tracking-wide">
                        {node.title}
                      </span>
                    </motion.div>
                  )}

                  {/* NHÃN BƯỚC NẰM PHÍA BÊN TRÁI */}
                  {node.labelPosition === "left" && (
                    <>
                      <motion.div
                        animate={isActive ? { x: -4 } : { x: 0 }}
                        className={`hidden md:block absolute -left-36 top-1/2 -translate-y-1/2 whitespace-nowrap px-3.5 py-1 rounded-full backdrop-blur-md transition-all duration-300 pointer-events-none ${
                          isActive
                            ? "bg-white text-[#143224] border border-emerald-600/50 shadow-md scale-105 font-bold"
                            : "bg-white/90 text-stone-700 border border-stone-200/70 shadow-2xs font-medium"
                        }`}
                      >
                        <span className="text-xs tracking-wide">
                          {node.title}
                        </span>
                      </motion.div>
                      <motion.div
                        className={`md:hidden absolute top-18 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 rounded-full backdrop-blur-md transition-all duration-300 pointer-events-none ${
                          isActive
                            ? "bg-white text-[#143224] border border-emerald-600/50 shadow-sm font-bold"
                            : "bg-white/90 text-stone-700 border border-stone-200/70 font-medium"
                        }`}
                      >
                        <span className="text-[10px] tracking-wide">{node.title}</span>
                      </motion.div>
                    </>
                  )}

                  {/* KHUNG ẢNH TRÒN CAMEO NHẸ NHÀNG */}
                  <motion.div
                    animate={
                      isActive
                        ? {
                            scale: 1.16,
                            y: -6,
                            transition: { duration: 0.35, ease: "easeOut" },
                          }
                        : { scale: 1, y: 0 }
                    }
                    whileHover={{ scale: 1.1, y: -3 }}
                    className={`relative rounded-full transition-all duration-300 ${
                      isActive
                        ? "ring-3 ring-emerald-600/50 shadow-[0_10px_25px_rgba(20,50,36,0.18)]"
                        : "ring-1 ring-emerald-950/10 shadow-sm hover:ring-emerald-700/30 hover:shadow-md"
                    }`}
                  >
                    {/* Ảnh chân dung nhỏ gọn, tinh tế */}
                    <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-white shadow-md relative bg-stone-100">
                      <Image
                        src={node.image}
                        alt={node.title}
                        fill
                        sizes="100px"
                        className={`object-cover transition-transform duration-700 ${
                          isActive ? "scale-110" : "scale-100 opacity-95"
                        }`}
                      />
                    </div>

                    {/* Huy hiệu số thứ tự thanh lịch */}
                    <div
                      className={`absolute -bottom-1 -right-1 w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full text-[10px] sm:text-[11px] font-serif font-semibold flex items-center justify-center shadow-xs border transition-transform duration-300 ${
                        isActive
                          ? "bg-[#143224] text-[#FAF9F6] border-emerald-700 scale-105"
                          : "bg-white text-stone-700 border-stone-200"
                      }`}
                    >
                      {node.stepNumber}
                    </div>
                  </motion.div>

                  {/* NHÃN BƯỚC NẰM PHÍA BÊN PHẢI */}
                  {node.labelPosition === "right" && (
                    <>
                      <motion.div
                        animate={isActive ? { x: 4 } : { x: 0 }}
                        className={`hidden md:block absolute -right-36 top-1/2 -translate-y-1/2 whitespace-nowrap px-3.5 py-1 rounded-full backdrop-blur-md transition-all duration-300 pointer-events-none ${
                          isActive
                            ? "bg-white text-[#143224] border border-emerald-600/50 shadow-md scale-105 font-bold"
                            : "bg-white/90 text-stone-700 border border-stone-200/70 shadow-2xs font-medium"
                        }`}
                      >
                        <span className="text-xs tracking-wide">
                          {node.title}
                        </span>
                      </motion.div>
                      <motion.div
                        className={`md:hidden absolute top-18 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 rounded-full backdrop-blur-md transition-all duration-300 pointer-events-none ${
                          isActive
                            ? "bg-white text-[#143224] border border-emerald-600/50 shadow-sm font-bold"
                            : "bg-white/90 text-stone-700 border border-stone-200/70 font-medium"
                        }`}
                      >
                        <span className="text-[10px] tracking-wide">{node.title}</span>
                      </motion.div>
                    </>
                  )}

                  {/* NHÃN BƯỚC NẰM PHÍA DƯỚI */}
                  {node.labelPosition === "bottom" && (
                    <motion.div
                      animate={isActive ? { y: 4 } : { y: 0 }}
                      className={`absolute top-18 sm:top-21 md:top-24 left-1/2 -translate-x-1/2 whitespace-nowrap px-3.5 py-1 rounded-full backdrop-blur-md transition-all duration-300 pointer-events-none ${
                        isActive
                          ? "bg-white text-[#143224] border border-emerald-600/50 shadow-md scale-105 font-bold"
                          : "bg-white/90 text-stone-700 border border-stone-200/70 shadow-2xs font-medium"
                      }`}
                    >
                      <span className="text-[11px] sm:text-xs tracking-wide">
                        {node.title}
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
