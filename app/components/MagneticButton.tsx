"use client";

import { useRef, useState, ReactNode } from "react";
import { motion } from "framer-motion";

export default function MagneticButton({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = buttonRef.current!.getBoundingClientRect();
    
    // Tính toán tâm của nút
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    
    // Di chuyển nút theo hướng con trỏ chuột (tạo lực hút)
    setPosition({ x: middleX * 0.2, y: middleY * 0.2 });
  };

  const handleMouseLeave = () => {
    // Trả nút về vị trí cũ khi chuột rời đi
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      className={`relative inline-flex items-center justify-center overflow-hidden cursor-pointer ${className}`}
      onClick={onClick}
    >
      {/* Vòng sáng viền (Glow effect) ẩn hiện */}
      <span className="absolute inset-0 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 blur-md pointer-events-none" />
      <span className="relative z-10 w-full h-full flex items-center justify-center">
        {children}
      </span>
    </motion.button>
  );
}
