"use client";

import { useState, useEffect, useRef } from "react";
import { Heart, Bookmark } from "lucide-react";
import { useAuthModal } from "@/app/AuthModalContext";
import { toggleProductInteractionAction } from "@/app/actions/favorite";

interface ProductLikeSaveButtonsProps {
  productId: string;
  initialLikeCount?: number;
  initialSaveCount?: number;
  initialIsLiked?: boolean;
  initialIsSaved?: boolean;
  variant?: "light" | "dark" | "compact";
  showCounts?: boolean;
  className?: string;
}

export default function ProductLikeSaveButtons({
  productId,
  initialLikeCount = 0,
  initialSaveCount = 0,
  initialIsLiked = false,
  initialIsSaved = false,
  variant = "light",
  showCounts = true,
  className = "",
}: ProductLikeSaveButtonsProps) {
  const { currentUser, handleFeatureRequirement, setShowAuthModal } = useAuthModal();
  
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [saveCount, setSaveCount] = useState(initialSaveCount);

  // Debounce timers to protect DB from spam clicks
  const likeDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const saveDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state if props change
  useEffect(() => {
    setIsLiked(initialIsLiked);
    setLikeCount(initialLikeCount);
    setIsSaved(initialIsSaved);
    setSaveCount(initialSaveCount);
  }, [initialIsLiked, initialLikeCount, initialIsSaved, initialSaveCount]);

  const openLogin = () => {
    if (handleFeatureRequirement) {
      handleFeatureRequirement("Lưu hoặc thả tim sản phẩm");
    } else if (setShowAuthModal) {
      setShowAuthModal(true);
    }
  };

  const handleToggleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      openLogin();
      return;
    }

    // 1. Optimistic Update (Immediate UI response)
    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikeCount(prev => Math.max(0, nextState ? prev + 1 : prev - 1));

    // 2. Debounced Server Action (350ms)
    if (likeDebounceRef.current) clearTimeout(likeDebounceRef.current);
    likeDebounceRef.current = setTimeout(async () => {
      const res = await toggleProductInteractionAction(productId, "LIKE");
      if (res.success && typeof res.newCount === "number") {
        setLikeCount(res.newCount);
        setIsLiked(res.isFavorited);
      } else if (res.error === "AUTH_REQUIRED") {
        openLogin();
      }
    }, 350);
  };

  const handleToggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      openLogin();
      return;
    }

    // 1. Optimistic Update (Immediate UI response)
    const nextState = !isSaved;
    setIsSaved(nextState);
    setSaveCount(prev => Math.max(0, nextState ? prev + 1 : prev - 1));

    // 2. Debounced Server Action (350ms)
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(async () => {
      const res = await toggleProductInteractionAction(productId, "SAVE");
      if (res.success && typeof res.newCount === "number") {
        setSaveCount(res.newCount);
        setIsSaved(res.isFavorited);
      } else if (res.error === "AUTH_REQUIRED") {
        openLogin();
      }
    }, 350);
  };

  const isDark = variant === "dark";
  const isCompact = variant === "compact";

  return (
    <div className={`flex items-center gap-2.5 z-20 ${className}`}>
      {/* NÚT THẢ TIM */}
      <button
        type="button"
        onClick={handleToggleLike}
        title={isLiked ? "Bỏ thích" : "Thả tim yêu thích"}
        className={`group/btn flex items-center gap-1 transition-all duration-200 cursor-pointer ${
          isLiked 
            ? "text-rose-500 scale-105" 
            : isDark 
            ? "text-white/70 hover:text-rose-400" 
            : "text-stone-400 hover:text-rose-500"
        }`}
      >
        <Heart
          size={isCompact ? 15 : 17}
          strokeWidth={isLiked ? 2 : 1.5}
          className={`transition-all duration-300 ${
            isLiked ? "fill-rose-500 stroke-rose-500 scale-110" : "group-hover/btn:scale-110"
          }`}
        />
        {showCounts && likeCount > 0 && (
          <span className={`text-[10px] font-medium tracking-tight ${isDark ? "text-white/90" : "text-stone-600"}`}>
            {likeCount}
          </span>
        )}
      </button>

      {/* NÚT LƯU TỦ ĐỒ (SAVE / WISHLIST) */}
      <button
        type="button"
        onClick={handleToggleSave}
        title={isSaved ? "Đã lưu trong tủ đồ" : "Lưu vào tủ đồ yêu thích"}
        className={`group/btn flex items-center gap-1 transition-all duration-200 cursor-pointer ${
          isSaved 
            ? isDark ? "text-amber-300 scale-105" : "text-[#183A2D] scale-105" 
            : isDark 
            ? "text-white/70 hover:text-amber-200" 
            : "text-stone-400 hover:text-[#183A2D]"
        }`}
      >
        <Bookmark
          size={isCompact ? 15 : 17}
          strokeWidth={isSaved ? 2 : 1.5}
          className={`transition-all duration-300 ${
            isSaved 
              ? isDark ? "fill-amber-300 stroke-amber-300 scale-110" : "fill-[#183A2D] stroke-[#183A2D] scale-110" 
              : "group-hover/btn:scale-110"
          }`}
        />
        {showCounts && saveCount > 0 && (
          <span className={`text-[10px] font-medium tracking-tight ${isDark ? "text-white/90" : "text-stone-600"}`}>
            {saveCount}
          </span>
        )}
      </button>
    </div>
  );
}
