"use client";
import { motion } from "framer-motion";

export default function FloatingStats() {
  const stats = [
    { value: "12.500+", label: "Người dùng" },
    { value: "4.800+", label: "Sản phẩm" },
    { value: "96%", label: "Đánh giá tốt" }
  ];

  return (
    <div className="pt-8 border-t border-gray-200/60 max-w-md grid grid-cols-3 gap-6 font-body">
      {stats.map((stat, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 + i * 0.1 }}
          whileHover={{ scale: 1.05, y: -2 }}
          className="cursor-pointer p-2 rounded-xl hover:bg-white/40 hover:shadow-[0_10px_30px_rgba(0,0,0,0.02)] transition-all duration-300"
        >
          <div className="font-heading text-2xl text-[#183A2D] font-medium tracking-tight">
            {stat.value}
          </div>
          <div className="text-[10px] text-gray-400 font-bold tracking-wider uppercase mt-1">
            {stat.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
}