"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export default function AppSplashScreen() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Chỉ hiện Splash khi mở app lần đầu trong phiên duyệt (session)
    const hasSeenSplash = sessionStorage.getItem("cloop_app_splash_seen");
    if (!hasSeenSplash) {
      setIsVisible(true);
      sessionStorage.setItem("cloop_app_splash_seen", "true");

      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 2200);

      return () => clearTimeout(timer);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="cloop-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }}
          onClick={() => setIsVisible(false)}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0A2517] text-[#FAF8F3] select-none cursor-pointer overflow-hidden"
        >
          {/* Subtle Organic Background Glow */}
          <div className="absolute w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] rounded-full bg-radial from-emerald-500/15 via-emerald-800/10 to-transparent blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center text-center px-6">
            {/* 🌿 Animated CLOOP Logo */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="relative mb-5"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-b from-[#183A2D] to-[#0A2517] p-1 border border-emerald-500/30 shadow-[0_0_40px_rgba(46,111,85,0.35)] flex items-center justify-center">
                <Image
                  src="/loogo.png"
                  alt="CLOOP"
                  width={64}
                  height={64}
                  priority
                  className="object-contain drop-shadow-md brightness-110"
                />
              </div>
            </motion.div>

            {/* 🌿 Brand Title */}
            <motion.h1
              initial={{ opacity: 0, letterSpacing: "0.25em", y: 10 }}
              animate={{ opacity: 1, letterSpacing: "0.15em", y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="font-brand-title text-4xl sm:text-5xl font-extrabold tracking-[0.15em] text-[#FAF9F5] drop-shadow-sm font-heading"
            >
              CLOOP
            </motion.h1>

            {/* 🌿 Điệu nghệ: "Fashion in a loop" typographic animation */}
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1.0, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="mt-3 flex items-center gap-2"
            >
              <span className="w-6 h-[1px] bg-gradient-to-r from-transparent to-emerald-400/60" />
              <p className="font-handwriting text-xl sm:text-2xl text-emerald-300/90 font-serif italic tracking-wide">
                Fashion in a loop
              </p>
              <span className="w-6 h-[1px] bg-gradient-to-l from-transparent to-emerald-400/60" />
            </motion.div>

            {/* 🌿 Subtitle / Circular Fashion Spirit */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ duration: 0.8, delay: 1.1 }}
              className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-stone-400 font-ui mt-4 font-semibold"
            >
              Tủ Đồ Tuần Hoàn • Thời Trang Bền Vững
            </motion.p>
          </div>

          {/* 🌿 Elegant Minimalist Loading Bar */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 120 }}
              transition={{ duration: 1.8, ease: "easeInOut" }}
              className="h-[2px] bg-gradient-to-r from-emerald-500/20 via-emerald-400 to-emerald-500/20 rounded-full"
            />
            <span className="text-[9px] text-stone-500 font-mono tracking-widest uppercase">
              Chạm để vào app
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
