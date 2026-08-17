"use client";

import { useState, useEffect } from 'react';

export function useLiveViewers(min = 2, max = 9) {
  // 1. Khởi tạo một số ngẫu nhiên ban đầu nằm trong giới hạn
  const [viewers, setViewers] = useState<number>(() => {
    if (typeof window === 'undefined') return min; // Tránh lỗi Hydration trên SSR
    return Math.floor(Math.random() * (max - min + 1)) + min;
  });

  useEffect(() => {
    // 2. Tạo nhịp đập bất quy tắc (cập nhật sau mỗi 4s - 8s)
    const updateInterval = setInterval(() => {
      setViewers((prev) => {
        // Xác suất 30% đứng im, 70% biến động
        if (Math.random() < 0.3) return prev;

        // Tăng hoặc giảm 1 người (+1 hoặc -1)
        const change = Math.random() > 0.5 ? 1 : -1;
        let newValue = prev + change;

        // 3. Giữ con số không bị lố ranh giới (min, max)
        if (newValue < min) return min + 1;
        if (newValue > max) return max - 1;
        
        return newValue;
      });
    }, Math.floor(Math.random() * 4000) + 4000); 

    return () => clearInterval(updateInterval); // Dọn dẹp rác khi thoát trang
  }, [min, max]);

  return viewers;
}
