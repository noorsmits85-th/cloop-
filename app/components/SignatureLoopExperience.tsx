"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Leaf, RotateCcw, Sparkles, ArrowRight, 
  ShoppingBag, Repeat, RefreshCw, HeartHandshake, 
  Archive, Play, Pause, ShieldCheck, TrendingUp, CheckCircle2
} from "lucide-react";

interface LifecycleStage {
  id: number;
  stageName: string;
  tagline: string;
  badge: string;
  image: string;
  detailTitle: string;
  story: string;
  co2Impact: string;
  co2Number: number;
  financialStat: string;
  financialLabel: string;
  lifeCycles: string;
  ownerStory: string;
  icon: any;
  color: string;
  accentBg: string;
}

const LIFECYCLE_STAGES: LifecycleStage[] = [
  {
    id: 0,
    stageName: "1. MUA MỚI",
    tagline: "Khởi Nguyên Bản Sắc",
    badge: "Giai Đoạn 01 • Day 1",
    image: "/1.1.jpg",
    detailTitle: "Váy Dạ Hội Lụa Satin Cao Cấp",
    story: "Chiếc váy được may đo thủ công từ sợi lụa satin nguyên bản với giá 4.500.000đ. Thay vì nằm im trong tủ sau 1 lần mặc, chủ nhân quyết định đưa nó vào Vòng Lặp CLOOP.",
    co2Impact: "+24.0 kg CO₂",
    co2Number: 24,
    financialStat: "4.500.000đ",
    financialLabel: "Giá Trị Đầu Tư Ban Đầu",
    lifeCycles: "Vòng Đời #1",
    ownerStory: "Chủ sở hữu ban đầu: @the.archive • Hà Nội",
    icon: ShoppingBag,
    color: "#E2E8F0",
    accentBg: "bg-stone-800",
  },
  {
    id: 1,
    stageName: "2. CHO THUÊ",
    tagline: "12 Lần Tỏa Sáng",
    badge: "Giai Đoạn 02 • Tháng 3 - 12",
    image: "/1.1 (1).jpg",
    detailTitle: "12 Cô Gái • 12 Đêm Tiệc Rực Rỡ",
    story: "Chiếc váy được thuê xoay vòng 12 lần với giá 350k/ngày. Giúp 12 khách hàng tiết kiệm 90% chi phí mua sắm mới, đồng thời tạo nguồn thu thụ động cho chủ tủ.",
    co2Impact: "-144.0 kg CO₂",
    co2Number: -144,
    financialStat: "+4.200.000đ",
    financialLabel: "Thu Nhập Hoàn Vốn 93%",
    lifeCycles: "12 Lượt Thuê Hoàn Hảo",
    ownerStory: "Đã chu du qua: Hà Nội ➔ Đà Lạt ➔ TP.HCM",
    icon: Repeat,
    color: "#A3E39F",
    accentBg: "bg-emerald-950",
  },
  {
    id: 2,
    stageName: "3. PASS LẠI",
    tagline: "Chuyển Giao Yêu Thương",
    badge: "Giai Đoạn 03 • Năm Thứ 2",
    image: "/2.1.jpg",
    detailTitle: "Sang Nhượng & Tìm Chủ Nhân Mới",
    story: "Sau 1 năm cho thuê, váy được một khách quen yêu thích mua lại (Pass) với giá 1.500.000đ. Váy tiếp tục vòng đời mới thay vì bị lãng quên hay thải loại.",
    co2Impact: "-176.0 kg CO₂",
    co2Number: -176,
    financialStat: "+1.500.000đ",
    financialLabel: "Giá Trị Chuyển Nhượng",
    lifeCycles: "Vòng Đời Thứ 13",
    ownerStory: "Chủ nhân thứ 2: @linhdan.ootd • Đà Nẵng",
    icon: HeartHandshake,
    color: "#FDE047",
    accentBg: "bg-amber-950",
  },
  {
    id: 3,
    stageName: "4. KÝ GỬI",
    tagline: "Bảo Tàng Ký Ức",
    badge: "Giai Đoạn 04 • Năm Thứ 4",
    image: "/vintage_coat.jpg",
    detailTitle: "Lưu Bút Hộ Chiếu Thời Trang",
    story: "Váy được ký gửi vào bộ sưu tập Archive Vintage của CLOOP. Hộ Chiếu Số ghi nhận đầy đủ 14 chặng hành trình, trở thành chứng nhân nghệ thuật cho các buổi chụp ảnh hoài niệm.",
    co2Impact: "-224.0 kg CO₂",
    co2Number: -224,
    financialStat: "8 Cuốn Lưu Bút",
    financialLabel: "Ký Ức Cảm Xúc Vô Giá",
    lifeCycles: "Di Sản Archive CLOOP",
    ownerStory: "Được triển lãm tại CLOOP Fashion Space 2026",
    icon: Archive,
    color: "#C084FC",
    accentBg: "bg-purple-950",
  },
  {
    id: 4,
    stageName: "5. TÁI SINH",
    tagline: "Upcycle Vĩnh Cửu",
    badge: "Giai Đoạn 05 • Năm Thứ 6+",
    image: "/hero_group.jpg",
    detailTitle: "Zero-Waste: Tái Chế Thành Corset & Túi Lụa",
    story: "Mảnh lụa satin bền bỉ được nghệ nhân CLOOP rã may thành 1 áo Corset thời thượng và 1 túi xách lụa độc bản. Không một sợi vải nào phải ra bãi chôn lấp.",
    co2Impact: "-248.5 kg CO₂",
    co2Number: -248.5,
    financialStat: "100% Zero-Waste",
    financialLabel: "Tái Sinh Thành 2 Món Đồ Mới",
    lifeCycles: "Vòng Lặp Vĩnh Cửu ♾️",
    ownerStory: "Tái sinh hoàn toàn • 0% rác thải sinh thái",
    icon: RefreshCw,
    color: "#38BDF8",
    accentBg: "bg-cyan-950",
  },
];

export default function SignatureLoopExperience() {
  const [currentStage, setCurrentStage] = useState(1); // Mặc định ở giai đoạn 2 (Cho thuê)
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play loop timeline
  useEffect(() => {
    if (!isPlaying) {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      return;
    }

    const intervalTime = 50; // ms
    const totalDuration = 5500; // 5.5s per stage
    const step = (intervalTime / totalDuration) * 100;

    autoPlayRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentStage((curr) => (curr + 1) % LIFECYCLE_STAGES.length);
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isPlaying, currentStage]);

  const handleSelectStage = (idx: number) => {
    setCurrentStage(idx);
    setProgress(0);
  };

  const stage = LIFECYCLE_STAGES[currentStage];

  return (
    <section className="relative w-full py-16 md:py-24 bg-[#081C12] text-white overflow-hidden border-y border-[#123824] select-none">
      
      {/* 🌌 AMBIENT COSMIC CIRCULAR GLOW */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(16,52,34,0.75)_0%,_rgba(8,28,18,0.85)_45%,_rgba(4,14,9,0.98)_100%)] pointer-events-none" />

      {/* Background Decorative Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] md:w-[950px] aspect-square rounded-full border border-white/5 pointer-events-none animate-[spin_120s_linear_infinite]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] md:w-[650px] aspect-square rounded-full border border-[#A3E39F]/10 pointer-events-none animate-[spin_80s_linear_infinite_reverse]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 👑 1. HAUTE SIGNATURE HEADER (Tuyên ngôn biểu tượng) */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-[#A3E39F]/40 text-[#A3E39F] text-[10.5px] font-extrabold uppercase tracking-widest mb-4 shadow-lg font-ui">
            <Sparkles size={13} className="text-[#A3E39F]" />
            CLOOP SIGNATURE EXPERIENCE • FASHION IN A LOOP
          </div>

          <h2 className="font-heading text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-none mb-3">
            MỘT MÓN ĐỒ.
          </h2>
          <h2 className="font-heading text-3xl sm:text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#A3E39F] via-white to-[#D4FFD0] tracking-tight leading-none mb-5 drop-shadow-[0_4px_24px_rgba(163,227,159,0.4)]">
            VÔ TẬN VÒNG ĐỜI.
          </h2>

          <p className="font-body text-xs sm:text-sm md:text-base text-stone-300 font-light leading-relaxed max-w-xl mx-auto">
            Trang phục không sinh ra để nằm im trong góc tủ. Tại CLOOP, một chiếc đầm lụa được sinh ra, sống qua hàng chục cuộc đời rực rỡ, tích lũy ký ức và trả lại màu xanh cho Trái Đất.
          </p>
        </div>

        {/* 🔄 2. FIVE-STAGE INTERACTIVE NAVIGATION TABS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 mb-8 sm:mb-12">
          {LIFECYCLE_STAGES.map((s, idx) => {
            const isActive = currentStage === idx;
            const Icon = s.icon;

            return (
              <button
                key={s.id}
                onClick={() => handleSelectStage(idx)}
                className={`relative p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 text-left flex flex-col justify-between overflow-hidden cursor-pointer group ${
                  isActive
                    ? "bg-[#0D281B] border-[#A3E39F] shadow-[0_0_25px_rgba(163,227,159,0.3)] ring-1 ring-[#A3E39F]/50 scale-102"
                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                {/* Active Stage Animated Progress Bar */}
                {isActive && isPlaying && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#A3E39F] to-white transition-all duration-100 ease-linear"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between w-full mb-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                    isActive ? "bg-[#A3E39F] text-[#071C12]" : "bg-white/10 text-stone-300 group-hover:text-white"
                  }`}>
                    <Icon size={16} />
                  </div>
                  <span className="text-[9px] font-mono font-bold text-stone-400">
                    0{idx + 1}
                  </span>
                </div>

                <div>
                  <h4 className={`text-xs font-heading font-bold uppercase tracking-wider mb-0.5 transition-colors ${
                    isActive ? "text-[#A3E39F]" : "text-white"
                  }`}>
                    {s.stageName.split(". ")[1]}
                  </h4>
                  <p className="text-[10px] text-stone-400 font-ui truncate">
                    {s.tagline}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* 🎭 3. IMMERSIVE SPOTLIGHT STAGE (Trưng bày sống động chiếc váy biến hóa) */}
        <div className="bg-[#0B2317]/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 sm:p-8 md:p-10 shadow-[0_25px_70px_rgba(0,0,0,0.6)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center">
            
            {/* Left Col (5 Cols): Morphing Photo Showcase with Luminous Loop Aura */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              <div className="relative w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-stone-950 group">
                
                {/* Luminous Pulsing Halo */}
                <div 
                  className="absolute -inset-2 rounded-3xl opacity-40 blur-xl transition-all duration-700 pointer-events-none"
                  style={{ backgroundColor: stage.color }}
                />

                <AnimatePresence mode="wait">
                  <motion.div
                    key={stage.id}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="relative w-full h-full"
                  >
                    <Image
                      src={stage.image}
                      alt={stage.detailTitle}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  </motion.div>
                </AnimatePresence>

                {/* Top Badge: Current Stage */}
                <div className="absolute top-3.5 left-3.5 z-20">
                  <span className="text-[9px] uppercase font-mono font-bold tracking-wider bg-black/75 backdrop-blur-md text-[#A3E39F] px-3 py-1 rounded-full border border-white/20 shadow-md">
                    {stage.badge}
                  </span>
                </div>

                {/* Bottom Overlay on Image */}
                <div className="absolute bottom-3.5 left-3.5 right-3.5 z-20 text-white">
                  <p className="text-xs font-heading font-extrabold line-clamp-1">{stage.detailTitle}</p>
                  <p className="text-[10px] text-stone-300 font-ui flex items-center gap-1 mt-0.5">
                    <ShieldCheck size={12} className="text-[#A3E39F]" /> {stage.lifeCycles}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Col (7 Cols): Deep Metrics, Storytelling & Proof of Loop */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Header Title & Subtitle */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#A3E39F] font-ui flex items-center gap-1.5">
                    <CheckCircle2 size={13} /> {stage.stageName} • {stage.tagline}
                  </span>
                  
                  {/* Play / Pause Toggle Button */}
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white text-[10px] font-ui font-semibold flex items-center gap-1 transition-colors border border-white/10 cursor-pointer"
                  >
                    {isPlaying ? <Pause size={10} /> : <Play size={10} />}
                    {isPlaying ? "Tạm Dừng" : "Tự Động Chạy"}
                  </button>
                </div>

                <h3 className="font-heading text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                  {stage.detailTitle}
                </h3>
              </div>

              {/* Rich Story Narrative */}
              <p className="font-body text-xs sm:text-sm text-stone-300 font-light leading-relaxed">
                {stage.story}
              </p>

              {/* 📊 PROOF OF CIRCULARITY (3 Key Metric Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                
                {/* Metric 1: ESG Carbon Avoided */}
                <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 flex items-center gap-3.5 shadow-inner">
                  <div className="w-10 h-10 rounded-xl bg-[#A3E39F]/20 text-[#A3E39F] flex items-center justify-center shrink-0">
                    <Leaf size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-stone-400 font-ui">Tác Động Sinh Thái Tích Lũy</p>
                    <p className="text-base sm:text-lg font-heading font-extrabold text-[#A3E39F]">
                      {stage.co2Impact}
                    </p>
                  </div>
                </div>

                {/* Metric 2: Financial Circular Value */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/15 flex items-center gap-3.5 shadow-inner">
                  <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-stone-400 font-ui">{stage.financialLabel}</p>
                    <p className="text-base sm:text-lg font-heading font-extrabold text-white">
                      {stage.financialStat}
                    </p>
                  </div>
                </div>

              </div>

              {/* Travel Footprint & Emotional Heritage Note */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5 text-xs text-stone-300 font-ui italic">
                <RotateCcw size={15} className="text-[#A3E39F] shrink-0" />
                <span>{stage.ownerStory}</span>
              </div>

              {/* Bottom Action CTA Row */}
              <div className="pt-3 flex flex-col sm:flex-row items-center gap-3.5 border-t border-white/10">
                <Link
                  href="/upload"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white hover:bg-stone-100 text-[#071C12] font-heading font-extrabold text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_4px_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2 font-ui"
                >
                  Đưa Tủ Đồ Của Bạn Vào Vòng Lặp
                  <ArrowRight size={14} />
                </Link>

                <Link
                  href="/shop"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-heading font-bold text-xs uppercase tracking-wider transition-all duration-300 border border-white/20 font-ui text-center"
                >
                  Khám Phá Tủ Đồ Tuần Hoàn
                </Link>
              </div>

            </div>

          </div>
        </div>

        {/* 🌟 4. OVERALL CUMULATIVE ESG SCOREBOARD BANNER */}
        <div className="mt-10 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#0C2417] via-[#0E2C1D] to-[#0A1F13] border border-[#A3E39F]/30 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#A3E39F]/20 border border-[#A3E39F]/50 flex items-center justify-center text-[#A3E39F] shrink-0">
              <RotateCcw size={24} className="animate-spin-slow" />
            </div>
            <div>
              <h4 className="font-heading text-sm sm:text-base font-bold text-white">
                Tổng Kết Vòng Đời 1 Chiếc Váy Sau 6 Năm Tuần Hoàn:
              </h4>
              <p className="text-xs text-stone-300 font-light">
                Cứu sống <span className="text-[#A3E39F] font-bold">-248.5 kg CO₂</span> • Tạo ra <span className="text-white font-bold">18 khoảnh khắc tỏa sáng</span> • <span className="text-[#A3E39F] font-bold">0% rác thải dệt may</span>.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#A3E39F] text-[#071C12] hover:bg-white font-ui text-xs font-extrabold uppercase tracking-wider transition-colors shadow-sm"
            >
              Xem Ký Ức Chiếc Váy <ArrowRight size={12} />
            </Link>
          </div>
        </div>

      </div>

    </section>
  );
}
