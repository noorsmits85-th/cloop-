"use client";
import { motion } from "framer-motion";

export default function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-gradient-to-br from-[#F8F6F0] via-[#FFFFFF] to-[#E9F0E0]">
      {/* Hoa văn chấm bi cực mờ tạo cảm giác luxury */}
      <div 
        className="absolute inset-0 opacity-[0.02]" 
        style={{ 
          backgroundImage: "radial-gradient(#183A2D 1px, transparent 1px)", 
          backgroundSize: "32px 32px" 
        }} 
      />

      {/* Ánh sáng góc trên trái */}
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3] 
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-[#C9D8B6] blur-[120px]"
      />

      {/* Ánh sáng góc dưới phải */}
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2] 
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[#5E8B67] blur-[150px]"
      />

      {/* Ánh sáng trung tâm */}
      <motion.div
        animate={{ 
          y: [0, -20, 0] 
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-1/3 top-1/4 w-[700px] h-[700px] bg-[#FFFFFF]/60 rounded-full blur-[160px]"
      />
    </div>
  );
}