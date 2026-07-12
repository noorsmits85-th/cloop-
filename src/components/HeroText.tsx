"use client";
import { motion } from "framer-motion";

export default function HeroText() {
  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.25, delayChildren: 0.2 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 35 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="visible" className="space-y-8 z-10">
      {/* Tiêu đề mỏng, thanh thoát chuẩn tạp chí */}
      <motion.h1 variants={item} className="font-heading text-6xl md:text-7xl font-normal text-[#183A2D] tracking-tight leading-[1.15]">
        Mặc đẹp hơn. <br />
        Tiêu ít hơn. <br />
        <span className="gradient-text italic font-medium">Sống xanh hơn.</span>
      </motion.h1>
      
      {/* Mô tả ngắn */}
      <motion.p variants={item} className="font-body text-sm md:text-base text-gray-500 max-w-md leading-relaxed tracking-wide font-normal">
        CLOOP là nền tảng thời trang tuần hoàn. Thuê, cho thuê, mua bán và tái chế thời trang để kéo dài vòng đời – vì một tương lai bền vững.
      </motion.p>
      
      {/* Cặp nút bấm phát sáng tinh tế */}
      <motion.div variants={item} className="font-body flex space-x-4 pt-2 text-[11px] font-bold tracking-[0.2em] uppercase">
        <motion.button 
          whileHover={{ scale: 1.04, y: -4, boxShadow: "0 15px 35px rgba(24,58,45,0.25)" }} 
          whileTap={{ scale: 0.97 }}
          className="bg-[#183A2D] text-white px-8 py-4 rounded-full flex items-center transition-all duration-300 shadow-md"
        >
          Khám phá ngay <span className="ml-2 text-sm">→</span>
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.02, y: -2 }} 
          whileTap={{ scale: 0.98 }}
          className="bg-white/80 border border-gray-200 text-gray-700 px-8 py-4 rounded-full flex items-center transition-all duration-300 backdrop-blur-sm shadow-sm"
        >
          Tìm hiểu thêm <span className="ml-3 bg-[#183A2D] text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] p-0.5">▶</span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}