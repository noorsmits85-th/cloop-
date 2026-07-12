"use client";
import { motion } from "framer-motion";
import HeroText from "./HeroText";
import FloatingStats from "./FloatingStats";
import HeroImages from "./HeroImages";

export default function Hero() {
  return (
    <section className="flex flex-col lg:flex-row items-center justify-between px-8 md:px-16 py-12 max-w-[1400px] mx-auto min-h-[calc(100vh-90px)] relative">
      {/* Khung chứa nội dung bên trái */}
      <div className="lg:w-1/2 space-y-8 z-10">
        <HeroText />
        <FloatingStats />
      </div>

      {/* Bộ ảnh Lookbook bên phải */}
      <HeroImages />

      {/* Hiệu ứng chuột cuộn xuống Indicator */}
      <motion.div 
        animate={{ y: [0, 8, 0] }} 
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden md:block"
      >
        <div className="w-5 h-9 border border-gray-300 rounded-full flex justify-center p-1 bg-white/50 backdrop-blur-sm">
          <motion.div 
            animate={{ y: [0, 12, 0] }} 
            transition={{ duration: 1.5, repeat: Infinity }} 
            className="w-1 h-1.5 bg-gray-400 rounded-full" 
          />
        </div>
      </motion.div>
    </section>
  );
}