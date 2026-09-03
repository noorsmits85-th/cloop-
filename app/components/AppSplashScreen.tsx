"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export default function AppSplashScreen() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Chỉ hiện Splash khi mở app lần đầu trong phiên
    const hasSeenSplash = sessionStorage.getItem("cloop_app_splash_seen");
    if (!hasSeenSplash) {
      setIsVisible(true);
      sessionStorage.setItem("cloop_app_splash_seen", "true");

      // Tự động lướt mở vào app êm ái sau 1.8 giây, không bắt người dùng bấm chờ
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 1900);

      return () => clearTimeout(timer);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="cloop-splash-couture"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0, 
            scale: 1.03,
            filter: "blur(8px)",
            transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] } 
          }}
          onClick={() => setIsVisible(false)}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none cursor-pointer overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at 50% 40%, #FFFFFF 0%, #F5FAF6 40%, #E2EFE7 100%)",
          }}
        >
          {/* 🍃 1. LỚP LỤA MATCHA BAY BAY BỒNG BỀNH (AURA SILK FLOW) */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 15, 0],
              x: [-20, 20, -20],
              y: [-15, 20, -15],
            }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/6 -left-12 w-[340px] h-[340px] rounded-full bg-gradient-to-tr from-[#C2E0CC]/50 via-[#DCEFE3]/40 to-transparent blur-3xl pointer-events-none"
          />

          <motion.div
            animate={{
              scale: [1.15, 0.95, 1.15],
              rotate: [0, -20, 0],
              x: [20, -25, 20],
              y: [20, -15, 20],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-1/6 -right-12 w-[360px] h-[360px] rounded-full bg-gradient-to-bl from-[#B8DBC4]/45 via-[#E6F3EB]/50 to-transparent blur-3xl pointer-events-none"
          />

          {/* Họa tiết giấy lụa mỏng nhẹ tự nhiên */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply"
            style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/cream-paper.png')` }}
          />

          {/* 🌿 2. KHỐI LOGO & TYPOGRAPHY TRUNG TÂM */}
          <div className="relative z-10 flex flex-col items-center text-center px-6">
            
            {/* 🎀 BIỂU TƯỢNG VÒNG LỤA TUẦN HOÀN 3D CHÂN THỰC (KHÔNG BỊ VIỀN VUÔNG) */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 15 }}
              animate={{ 
                scale: [0.95, 1.05, 1],
                opacity: 1, 
                y: 0 
              }}
              transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-28 h-28 mb-3 flex items-center justify-center"
            >
              {/* Vầng sáng matcha ấm tỏa tròn sau logo */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#98C8A8]/40 via-[#B4DCBF]/30 to-[#E8F4EC]/60 rounded-full blur-2xl scale-110 animate-pulse" />

              <div className="relative w-24 h-24 flex items-center justify-center">
                <Image
                  src="/loogo.png"
                  alt="CLOOP Silk Loop"
                  width={96}
                  height={96}
                  priority
                  className="object-contain mix-blend-multiply drop-shadow-[0_8px_20px_rgba(24,58,45,0.18)]"
                />
              </div>
            </motion.div>

            {/* 🌿 CHỮ CLOOP ĐIỆU ĐÀ, SANG TRỌNG VỚI HIỆU ỨNG ÁNH KIM THỜI TRANG */}
            <motion.div
              initial={{ opacity: 0, y: 12, letterSpacing: "0.22em" }}
              animate={{ opacity: 1, y: 0, letterSpacing: "0.14em" }}
              transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative select-none"
            >
              <h1 className="font-brand-title text-4xl sm:text-5xl font-extrabold tracking-[0.14em] pl-[0.14em] leading-none animate-brand-shimmer drop-shadow-sm">
                CLOOP
              </h1>
            </motion.div>

            {/* 🌿 CHỮ "Fashion in a loop" VIẾT TAY UỐN LƯỢN ĐIỆU NGHỆ */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1.0, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="mt-3 relative flex items-center justify-center gap-3"
            >
              {/* Dải chỉ lụa vàng matcha mảnh mềm mại */}
              <motion.span 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 24, opacity: 0.6 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="h-[1px] bg-gradient-to-r from-transparent to-[#4A785D]"
              />

              <p 
                className="font-handwriting text-2xl sm:text-3xl text-[#1E4B35] font-normal tracking-wide drop-shadow-xs"
                style={{ 
                  fontFamily: "var(--font-dancing-script), cursive",
                  textShadow: "0 1px 2px rgba(24,58,45,0.1)" 
                }}
              >
                Fashion in a loop
              </p>

              <motion.span 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 24, opacity: 0.6 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="h-[1px] bg-gradient-to-l from-transparent to-[#4A785D]"
              />
            </motion.div>

            {/* 🌿 ĐỊNH VỊ THƯƠNG HIỆU */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.75 }}
              transition={{ duration: 0.8, delay: 0.85 }}
              className="text-[9.5px] uppercase tracking-[0.32em] text-[#36634A] font-ui mt-3 font-semibold"
            >
              Tủ Đồ Tuần Hoàn • Thời Trang Bền Vững
            </motion.p>
          </div>

          {/* 🌿 VÒNG XOAY LỤA NHẸ NHÀNG DƯỚI ĐÁY THAY VÌ NÚT BẤM CỨNG */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 opacity-60">
            <motion.span 
              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
              className="w-1.5 h-1.5 rounded-full bg-[#4A785D]"
            />
            <motion.span 
              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
              className="w-1.5 h-1.5 rounded-full bg-[#6C9E80]"
            />
            <motion.span 
              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
              className="w-1.5 h-1.5 rounded-full bg-[#9DC6AD]"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
