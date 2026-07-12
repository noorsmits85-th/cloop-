"use client";
import { motion } from "framer-motion";

export default function HeroImages() {
  return (
    <div className="lg:w-1/2 mt-12 lg:mt-0 relative flex justify-center lg:justify-end w-full items-center h-[580px]">
      
      {/* 1. Khung Lookbook 01 - Đổi sang màu kem sữa sáng, viền xanh mỏng tinh tế */}
      <motion.div 
        animate={{ y: [0, -8, 0], rotate: [-4, -3, -4] }} 
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        whileHover={{ scale: 1.05, zIndex: 30 }}
        className="absolute left-4 md:left-20 w-[240px] h-[360px] bg-[#FDFDFB] rounded-[2rem] border border-[#A5D6A7]/30 shadow-[0_20px_40px_rgba(27,94,32,0.04)] overflow-hidden flex flex-col items-center justify-center text-center p-4 cursor-pointer"
      >
        <div className="w-12 h-12 rounded-full bg-[#F2F7F2] flex items-center justify-center mb-3">
          <span className="text-[#1B5E20] text-xs">🌿</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#365C42] font-body">Lookbook 01</span>
      </motion.div>

      {/* 2. Khung Lookbook 02 - Tone trắng kem thanh lịch */}
      <motion.div 
        animate={{ y: [0, 8, 0], rotate: [6, 4, 6] }} 
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        whileHover={{ scale: 1.05, zIndex: 30 }}
        className="absolute right-0 w-[220px] h-[340px] bg-[#FDFDFB] rounded-[2rem] border border-[#A5D6A7]/30 shadow-[0_20px_40px_rgba(27,94,32,0.04)] overflow-hidden flex flex-col items-center justify-center text-center p-4 cursor-pointer"
      >
        <div className="w-12 h-12 rounded-full bg-[#F2F7F2] flex items-center justify-center mb-3">
          <span className="text-[#1B5E20] text-xs">✨</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#365C42] font-body">Lookbook 02</span>
      </motion.div>

      {/* 3. KHUNG CHÍNH Ở GIỮA - Nền trắng tinh khiết, viền xanh lục bảo ngọc sang trọng và đổ bóng phát sáng nhẹ */}
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="w-[320px] h-[480px] bg-white rounded-[2.5rem] border-[8px] border-white shadow-[0_30px_60px_rgba(27,94,32,0.08)] overflow-hidden relative shine-card flex items-center justify-center z-20 ring-1 ring-[#1B5E20]/10"
      >
         {/* Nhãn hiệu ứng kính mờ chữ xanh ngọc chủ đạo */}
         <div className="text-[11px] tracking-[0.2em] text-[#1B5E20] uppercase font-bold font-body bg-[#FAF8F2]/90 backdrop-blur-md px-6 py-3 rounded-full border border-[#1B5E20]/20 shadow-sm">
           Outfit nổi bật
         </div>
      </motion.div>
    </div>
  );
}