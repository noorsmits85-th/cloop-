"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function TropicalAmbient() {
  const [drops, setDrops] = useState<any[]>([]);

  useEffect(() => {
    // Generate 15 random water drops
    const newDrops = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage of screen width
      delay: Math.random() * 15,
      duration: 10 + Math.random() * 20, // 10s to 30s fall duration
      size: 4 + Math.random() * 8, // 4px to 12px
      opacity: 0.1 + Math.random() * 0.3
    }));
    setDrops(newDrops);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Tropical Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F5F8F6] via-[#E8F1EB] to-[#F5F8F6] opacity-60"></div>
      
      {/* Waterfall / Dew drops */}
      {drops.map((drop) => (
        <motion.div
          key={drop.id}
          initial={{ y: "-10vh", x: `${drop.x}vw`, opacity: 0 }}
          animate={{ 
            y: "110vh", 
            opacity: [0, drop.opacity, drop.opacity, 0] 
          }}
          transition={{
            duration: drop.duration,
            repeat: Infinity,
            delay: drop.delay,
            ease: "linear",
          }}
          className="absolute rounded-full bg-[#183A2D] blur-[1px]"
          style={{ 
            width: drop.size, 
            height: drop.size * 1.5,
          }}
        />
      ))}
      
      {/* Soft light glowing orbs (like sunlight through leaves) */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-200/40 rounded-full blur-[100px]"
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.5, 1],
          opacity: [0.05, 0.15, 0.05]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] bg-blue-200/40 rounded-full blur-[120px]"
      />
    </div>
  );
}
