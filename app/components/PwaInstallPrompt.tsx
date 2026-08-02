"use client";

import { useState, useEffect } from "react";
import { X, Download, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PwaInstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
    }

    // 2. Check if already installed
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
                          || (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) {
      return; // Already installed, do nothing
    }

    // 3. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 4. Handle Android/Chrome Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    });

    // 5. If iOS, show prompt after a short delay (because iOS doesn't fire beforeinstallprompt)
    if (isIosDevice) {
      const timer = setTimeout(() => {
        // Show iOS prompt if not dismissed previously
        const dismissed = localStorage.getItem("pwa_prompt_dismissed");
        if (!dismissed) {
          setShowPrompt(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
    
    // For Android, if beforeinstallprompt didn't fire but we want to show anyway? 
    // We only show Android prompt when deferredPrompt is available.

  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa_prompt_dismissed", "true");
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-4 left-4 right-4 z-[9999] bg-[#183A2D] text-white p-4 rounded-2xl shadow-2xl flex flex-col gap-3 font-ui"
        >
          <button 
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-white/70 hover:text-white p-1"
          >
            <X size={16} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0">
              {/* CLOOP Logo Placeholder */}
              <span className="font-heading font-bold text-[#183A2D] text-xl">C</span>
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide">Thêm CLOOP vào màn hình</h3>
              <p className="text-[10px] text-emerald-100/80">Truy cập mượt mà hơn như một ứng dụng gốc</p>
            </div>
          </div>

          {isIOS ? (
            <div className="bg-black/20 p-3 rounded-xl flex flex-col gap-2 mt-1">
              <p className="text-[11px] flex items-center gap-2">
                1. Nhấn nút chia sẻ <Share size={12} /> ở thanh Safari
              </p>
              <p className="text-[11px] flex items-center gap-2">
                2. Chọn <strong>Thêm vào MH chính</strong> (Add to Home Screen)
              </p>
            </div>
          ) : (
            <button 
              onClick={handleInstallClick}
              className="mt-1 w-full bg-emerald-500 hover:bg-emerald-400 text-[#0A2517] font-bold text-xs py-2.5 rounded-xl uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              <Download size={14} />
              Cài đặt Ứng dụng
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
