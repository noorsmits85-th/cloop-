"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export default function ShareClosetButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <button 
      onClick={handleShare}
      className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-medium transition-colors"
    >
      {copied ? <Check size={18} /> : <Share2 size={18} />}
      {copied ? "Đã sao chép link!" : "Chia sẻ tủ đồ"}
    </button>
  );
}
