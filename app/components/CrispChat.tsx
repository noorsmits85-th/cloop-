"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    $crisp: any[];
    CRISP_WEBSITE_ID: string;
  }
}

/**
 * Tích hợp Crisp Live Chat (Cách 1)
 * Hoạt động tự động khi có NEXT_PUBLIC_CRISP_WEBSITE_ID trong .env
 * Cung cấp ứng dụng di động (iOS / Android) cho Admin nhận chuông báo và trả lời khách mọi lúc mọi nơi.
 * Thiết lập ẩn danh 100% (Khách chỉ thấy tên thương hiệu CLOOP).
 */
export default function CrispChat() {
  const crispId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;

  useEffect(() => {
    if (!crispId || typeof window === "undefined") return;

    window.$crisp = [];
    window.CRISP_WEBSITE_ID = crispId;

    const script = document.createElement("script");
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [crispId]);

  return null;
}
