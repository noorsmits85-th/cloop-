"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AppSplashScreen() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Chỉ hiện Splash khi mở app lần đầu trong phiên duyệt
    const hasSeenSplash = sessionStorage.getItem("cloop_app_splash_seen");
    if (!hasSeenSplash) {
      setIsVisible(true);
      sessionStorage.setItem("cloop_app_splash_seen", "true");

      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="cloop-splash-silk"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } }}
          onClick={() => setIsVisible(false)}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none cursor-pointer overflow-hidden"
          style={{
            background: "linear-gradient(175deg, #FAF8F5 0%, #F1F6F2 45%, #E3EFE7 100%)",
          }}
        >
          {/* 🌿 LỚP LỤA BAY BAY MIX TRẮNG & XANH MATCHA (AIRY FLOATING SILK MIST) */}
          <motion.div
            animate={{
              scale: [1, 1.18, 1],
              x: [-15, 20, -15],
              y: [-10, 15, -10],
            }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 -left-20 w-[380px] h-[380px] rounded-full bg-gradient-to-tr from-[#C5DFD0]/40 to-[#E8F3EC]/50 blur-3xl pointer-events-none"
          />

          <motion.div
            animate={{
              scale: [1.1, 0.95, 1.1],
              x: [20, -15, 20],
              y: [15, -20, 15],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-1/4 -right-16 w-[400px] h-[400px] rounded-full bg-gradient-to-bl from-[#D4E8DC]/50 via-[#F5F8F5]/60 to-transparent blur-3xl pointer-events-none"
          />

          {/* Họa tiết vân giấy lụa mỏng nhẹ */}
          <div 
            className="absolute inset-0 opacity-25 pointer-events-none mix-blend-multiply"
            style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/cream-paper.png')` }}
          />

          {/* 🌿 KHỐI TRUNG TÂM NGHỆ THUẬT */}
          <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm">
            
            {/* 🎀 DẢI LỤA VÔ CỰC TUẦN HOÀN (VECTOR SVG SILK INFINITY LOOP - THAY THẾ LOGO HỘP VUÔNG) */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-28 h-20 mb-3 flex items-center justify-center"
            >
              {/* Vầng sáng matcha mềm mại phía sau */}
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-200/50 via-[#99C5A8]/30 to-emerald-200/50 rounded-full blur-xl scale-90 animate-pulse" />

              <svg 
                viewBox="0 0 130 90" 
                className="w-full h-full drop-shadow-[0_4px_12px_rgba(40,90,65,0.15)] overflow-visible"
              >
                <defs>
                  {/* Dải gradient matcha lụa cao cấp */}
                  <linearGradient id="matchaSilkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2D5A43" />
                    <stop offset="35%" stopColor="#6C9E80" />
                    <stop offset="65%" stopColor="#A8CBB5" />
                    <stop offset="85%" stopColor="#C89D56" />
                    <stop offset="100%" stopColor="#1E4432" />
                  </linearGradient>

                  <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7DAF91" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#E9D7A5" stopOpacity="0.9" />
                  </linearGradient>
                </defs>

                {/* Đường dẫn bóng mờ mềm mại */}
                <path
                  d="M 35,45 C 35,26, 49,26, 65,45 C 81,64, 95,64, 95,45 C 95,26, 81,26, 65,45 C 49,64, 35,64, 35,45 Z"
                  fill="none"
                  stroke="#8FA697"
                  strokeWidth="5"
                  strokeLinecap="round"
                  opacity="0.15"
                />

                {/* Dải lụa chính uốn lượn tự vẽ (Draw-in animation) */}
                <motion.path
                  d="M 35,45 C 35,26, 49,26, 65,45 C 81,64, 95,64, 95,45 C 95,26, 81,26, 65,45 C 49,64, 35,64, 35,45 Z"
                  fill="none"
                  stroke="url(#matchaSilkGrad)"
                  strokeWidth="3.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
                />

                {/* Hạt ngọc lụa chuyển động theo quỹ đạo */}
                <motion.circle
                  r="3"
                  fill="url(#glowGrad)"
                  filter="drop-shadow(0 0 4px #D4AF37)"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    offsetDistance: ["0%", "100%"],
                  }}
                  transition={{
                    duration: 2.2,
                    ease: "easeInOut",
                    repeat: Infinity,
                  }}
                  style={{
                    offsetPath: "path('M 35,45 C 35,26, 49,26, 65,45 C 81,64, 95,64, 95,45 C 95,26, 81,26, 65,45 C 49,64, 35,64, 35,45 Z')",
                  }}
                />
              </svg>
            </motion.div>

            {/* 🌿 CHỮ CLOOP ĐIỆU ĐÀ, THANH THOÁT (HAUTE COUTURE EDITORIAL TYPOGRAPHY) */}
            <motion.div
              initial={{ opacity: 0, y: 8, letterSpacing: "0.42em" }}
              animate={{ opacity: 1, y: 0, letterSpacing: "0.32em" }}
              transition={{ duration: 1.0, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mt-1"
            >
              <h1 className="font-serif text-3xl sm:text-4xl font-light text-[#1B3B2B] tracking-[0.32em] pl-[0.32em] uppercase select-none drop-shadow-xs">
                C L O O P
              </h1>
            </motion.div>

            {/* 🌿 DÒNG CHỮ "Fashion in a loop" XUẤT HIỆN ĐIỆU NGHỆ, UỐN LƯỢN MỀM MẠI */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1.1, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="mt-2.5 flex items-center justify-center gap-3 w-full"
            >
              {/* Dải nhánh lụa trái */}
              <motion.span 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 28, opacity: 0.5 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="h-[1px] bg-gradient-to-r from-transparent to-[#6B967C]"
              />

              <p 
                className="font-serif italic text-xl sm:text-2xl text-[#2F5843] font-normal tracking-wide drop-shadow-3xs"
                style={{ fontFamily: "var(--font-dancing-script), 'Playfair Display', Georgia, cursive" }}
              >
                Fashion in a loop
              </p>

              {/* Dải nhánh lụa phải */}
              <motion.span 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 28, opacity: 0.5 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="h-[1px] bg-gradient-to-l from-transparent to-[#6B967C]"
              />
            </motion.div>

            {/* 🌿 SUBTITLE TINH TẾ & BỀN VỮNG */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.65 }}
              transition={{ duration: 0.8, delay: 1.0 }}
              className="text-[9.5px] uppercase tracking-[0.28em] text-[#486B58] font-ui mt-3.5 font-semibold"
            >
              Tủ Đồ Tuần Hoàn • Thời Trang Xanh
            </motion.p>
          </div>

          {/* 🌿 THANH TIẾN TRÌNH MATCHA THANH MẢNH DƯỚI ĐÁY */}
          <div className="absolute bottom-9 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <div className="w-24 h-[2px] bg-[#D1E3D7] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.0, ease: "easeInOut" }}
                className="h-full bg-gradient-to-r from-[#6B9A7D] via-[#3B6E52] to-[#6B9A7D] rounded-full"
              />
            </div>
            <span className="text-[8.5px] text-[#7A9886] font-ui tracking-widest uppercase font-medium">
              Chạm nhẹ để tiếp tục
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
