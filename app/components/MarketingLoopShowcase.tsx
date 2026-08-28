"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ArrowRight, 
  Sparkles, 
  RefreshCw, 
  Play, 
  Pause, 
  ShieldCheck, 
  ChevronRight, 
  ChevronLeft,
  Leaf,
  Lock,
  Flame,
  Award,
  Compass
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MarketingLoopShowcase() {
  const [roleTab, setRoleTab] = useState<"RENTER" | "OWNER">("RENTER");
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const STEP_DURATION = 4000; // 4 giây mỗi scene

  const renterMoments = [
    {
      num: "01",
      stepTotal: "04",
      tagline: "SELECT & AI FIT",
      badge: "Stylist 24/7",
      title: "Chọn Đồ & Ướm Dáng Chuẩn Gu",
      quote: "Bốc trúng chiếc váy lụa dạ tiệc trong 60 giây nhờ AI Stylist.",
      desc: "Khám phá hàng ngàn outfit độc bản từ các chủ tủ uy tín. Nhận phân tích phom dáng, chiều cao cân nặng để chọn size chuẩn xác không cần thử đồ.",
      image: "/step1_phone.jpg",
      highlight: "TIẾT KIỆM 90% CHI PHÍ",
      statBadge: "⚡ 60s Chốt Size Chuẩn",
      subStats: { label: "Kho trang phục", value: "3.200+ Mẫu", icon: Sparkles },
      memoryPill: "Đã có 48 bạn ướm thử trang phục này tuần qua",
      actionLabel: "Khám Phá Tủ Đồ Ngay",
      actionLink: "/shop"
    },
    {
      num: "02",
      stepTotal: "04",
      tagline: "RECEIVE & ESCROW",
      badge: "Két Escrow 100%",
      title: "Giao Tận Cửa & Bảo Chứng Tiền Cọc",
      quote: "Đóng gói thơm tho, là phẳng tươm tất chuẩn boutique cao cấp.",
      desc: "Shipper giao tận tay đúng hẹn. Toàn bộ tiền cọc được giữ an toàn trong Két Escrow, sàn chỉ hoàn tất giải ngân khi bạn hoàn toàn hài lòng.",
      image: "/step2_bag.jpg",
      highlight: "BẢO CHỨNG AN TOÀN 100%",
      statBadge: "🔒 Két Escrow Độc Lập",
      subStats: { label: "Tỷ lệ giao đúng giờ", value: "99.4%", icon: ShieldCheck },
      memoryPill: "Tiền cọc được khóa bảo mật qua HMAC-SHA256",
      actionLabel: "Xem Cơ Chế Két Escrow",
      actionLink: "/shop"
    },
    {
      num: "03",
      stepTotal: "04",
      tagline: "WEAR & SHINE",
      badge: "Độc Bản Sự Kiện",
      title: "Tỏa Sáng Dạ Tiệc & Ghi Dấu Ấn",
      quote: "Tự tin chiếm trọn spotlight sự kiện với chi phí bằng một bữa tối.",
      desc: "Diện đầm dạ hội thiết kế, blazer da cao cấp hay áo dài di sản. Sống trọn vẹn khoảnh khắc rực rỡ mà không chịu gánh nặng tài chính mua mới.",
      image: "/step3_party.jpg",
      highlight: "TỎA SÁNG KHÔNG ÁP LỰC",
      statBadge: "✨ 100% Ảnh Thật",
      subStats: { label: "Độ hài lòng sự kiện", value: "5.0/5.0 ★", icon: Flame },
      memoryPill: "Đồng hành qua 8 đêm tiệc lớn tại HN & TP.HCM",
      actionLabel: "Chọn Đồ Đi Tiệc Ngay",
      actionLink: "/shop"
    },
    {
      num: "04",
      stepTotal: "04",
      tagline: "RETURN & LOOP",
      badge: "+50 Green Pts",
      title: "Hoàn Trả Nhẹ Nhàng & Khởi Đầu Vòng Lặp",
      quote: "Một hành trình khép lại, một kỷ niệm mới lại được trao gửi.",
      desc: "Đóng gói trả đồ tận nơi thảnh thơi. Tiền cọc tự động hoàn 100% tức thì về ví kèm 50 điểm xanh Green Pts tích lũy cho những lần diện đồ sau.",
      image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=900",
      highlight: "HOÀN CỌC 100% TỰ ĐỘNG",
      statBadge: "🌿 Giảm 24.5kg CO₂",
      subStats: { label: "Điểm xanh tích lũy", value: "+50 Pts", icon: Leaf },
      memoryPill: "Trang phục sẵn sàng cho người bạn kế tiếp",
      actionLabel: "Khám Phá Ký Ức Tuần Hoàn",
      actionLink: "/shop"
    }
  ];

  const ownerMoments = [
    {
      num: "01",
      stepTotal: "04",
      tagline: "FAST LISTING 30S",
      badge: "Đăng Đồ 30s",
      title: "Đánh Thức Tủ Đồ & Định Giá Thông Minh",
      quote: "Những bộ váy nằm im xứng đáng có cuộc đời thứ hai rực rỡ.",
      desc: "Chụp ảnh váy áo nhàn rỗi trong tủ. Hệ thống tự động điền form, bốc tách chất liệu và đề xuất mức giá thuê tối ưu nhất theo thị trường.",
      image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=900",
      highlight: "TỰ ĐỘNG ĐỀ XUẤT GIÁ",
      statBadge: "⚡ 30 Giây Lên Sàn",
      subStats: { label: "Tủ đồ đã kích hoạt", value: "480+ Tủ", icon: Compass },
      memoryPill: "Biến tủ đồ ngủ yên thành tài sản sinh lời",
      actionLabel: "Đăng Tủ Đồ Ngay",
      actionLink: "/my-closet/create"
    },
    {
      num: "02",
      stepTotal: "04",
      tagline: "DOORSTEP PICKUP",
      badge: "Lấy Hàng Tại Nhà",
      title: "Giao Nhận Thảnh Thơi Tận Cửa",
      quote: "Bạn chỉ việc đóng gói xinh xắn, mọi khâu giao nhận sàn lo trọn.",
      desc: "Xác nhận lịch thuê trên app. Đối tác vận chuyển chuyên nghiệp đến lấy đồ tận nơi và chuyển giao an toàn đến người thuê đúng hẹn.",
      image: "/step2_bag.jpg",
      highlight: "KHÔNG TỐN CÔNG DI CHUYỂN",
      statBadge: "🚚 Shipper Tận Cửa",
      subStats: { label: "Phủ sóng giao nhận", value: "63 Tỉnh Thành", icon: ShieldCheck },
      memoryPill: "Bảo quản váy áo với túi chống sốc chuyên dụng",
      actionLabel: "Quản Lý Lịch Cho Thuê",
      actionLink: "/my-closet"
    },
    {
      num: "03",
      stepTotal: "04",
      tagline: "PASSIVE INCOME",
      badge: "Rút Tiền 30s",
      title: "Dòng Tiền Thụ Động Tự Động Về Ví",
      quote: "Mỗi chuyến du ngoạn của bộ váy là một khoản thu nhập tăng thêm.",
      desc: "Tiền thuê cộng vào ví ngay sau khi chuyến đi hoàn tất. Rút về tài khoản ngân hàng chính chủ trong 30 giây với biểu phí 0% trong 3 tháng đầu.",
      image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=900",
      highlight: "NHẬN 100% DOANH THU",
      statBadge: "💰 Thu Nhập Đều Đặn",
      subStats: { label: "Thu nhập trung bình", value: "4.5Tr/Tháng", icon: Flame },
      memoryPill: "Tủ đồ tự nuôi sống chính nó và sinh lời",
      actionLabel: "Xem Ví Thu Nhập",
      actionLink: "/my-closet"
    },
    {
      num: "04",
      stepTotal: "04",
      tagline: "ESG & TRUST BADGE",
      badge: "Shop Uy Tín",
      title: "Định Danh Xanh & Tích Lũy Điểm ESG",
      quote: "Tự hào khi tủ đồ của bạn giảm phát thải hàng trăm kg CO₂.",
      desc: "Mỗi lượt cho thuê được cấp chứng chỉ bảo vệ môi trường, nâng hạng Tủ Đồ Uy Tín và mở khóa thuật toán đẩy top tự động trên sàn.",
      image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=900",
      highlight: "CHỨNG NHẬN SINH THÁI",
      statBadge: "🌿 Huy Hiệu Xanh ESG",
      subStats: { label: "CO₂ giảm thải", value: "196kg CO₂", icon: Leaf },
      memoryPill: "Mở khóa ưu đãi & quyền lợi Pioneer Club",
      actionLabel: "Xem Bảng Điểm Xanh",
      actionLink: "/my-closet"
    }
  ];

  const currentMoments = roleTab === "RENTER" ? renterMoments : ownerMoments;
  const currentMoment = currentMoments[activeStep] || currentMoments[0];

  // Logic chạy Story Reel Progress Bar tự động
  useEffect(() => {
    if (!isPlaying) return;

    const intervalTime = 40; // cập nhật mỗi 40ms
    const stepIncrement = (intervalTime / STEP_DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveStep((curr) => (curr + 1) % 4);
          return 0;
        }
        return prev + stepIncrement;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPlaying, activeStep]);

  const handleSelectStep = (idx: number) => {
    setActiveStep(idx);
    setProgress(0);
  };

  const handleNext = () => {
    setActiveStep((prev) => (prev + 1) % 4);
    setProgress(0);
  };

  const handlePrev = () => {
    setActiveStep((prev) => (prev - 1 + 4) % 4);
    setProgress(0);
  };

  const handleRoleChange = (role: "RENTER" | "OWNER") => {
    setRoleTab(role);
    setActiveStep(0);
    setProgress(0);
  };

  return (
    <section className="w-full bg-[#FAF9F5] border-b border-stone-200/80 py-12 md:py-20 text-[#183A2D] font-body relative overflow-hidden">
      
      {/* 🌟 Background Visual Effects: Vòng Quỹ Đạo Xanh Rêu Phóng Khoáng */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-emerald-100/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-amber-100/30 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 space-y-8 md:space-y-12 relative z-10">
        
        {/* 1. HEADER EDITORIAL MANIFESTO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-stone-300/60 pb-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E5EFE2] border border-[#C5DAC2] text-[#2A4B2E] text-[10px] uppercase font-bold tracking-[0.25em] font-ui shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
              LIVING CIRCULAR REEL • THE CLOOP JOURNEY
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#183A2D] tracking-tight leading-tight">
              Một Bộ Đồ. <span className="text-emerald-800 font-serif italic font-normal">Bốn Khoảnh Khắc Tuần Hoàn.</span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 font-light leading-relaxed">
              Theo dõi thước phim vòng đời của một trang phục cao cấp — từ lúc chọn đồ, diện tiệc đến khi quay lại vòng lặp.
            </p>
          </div>

          {/* EDITORIAL NAVIGATION TABS */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-200/60 rounded-xl font-ui self-start md:self-auto border border-stone-300/50 shadow-2xs">
            <button
              type="button"
              onClick={() => handleRoleChange("RENTER")}
              className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                roleTab === "RENTER"
                  ? "bg-[#183A2D] text-white shadow-xs"
                  : "text-stone-600 hover:text-[#183A2D]"
              }`}
            >
              <span>Tôi Muốn Mặc</span>
              <span className="text-[9px] opacity-75 font-mono px-1 py-0.2 rounded bg-black/20">Thuê</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange("OWNER")}
              className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                roleTab === "OWNER"
                  ? "bg-[#183A2D] text-white shadow-xs"
                  : "text-stone-600 hover:text-[#183A2D]"
              }`}
            >
              <span>Tôi Muốn Chia Sẻ</span>
              <span className="text-[9px] opacity-75 font-mono px-1 py-0.2 rounded bg-black/20">Cho thuê</span>
            </button>
          </div>
        </div>

        {/* 2. LIVING REEL THEATER (GIAO DIỆN PHÒNG CHIẾU PHIM THỜI TRANG ĐA TẦNG) */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 lg:p-8 border border-stone-200/90 shadow-lg space-y-6">
          
          {/* 🎬 4 THANH STORY PROGRESS BARS (TỰ ĐỘNG CHẠY TUA NHANH NHƯ TIKTOK/INSTAGRAM REELS) */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {currentMoments.map((item, idx) => {
              const isActive = activeStep === idx;
              const isPast = activeStep > idx;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectStep(idx)}
                  className="group flex flex-col text-left space-y-1.5 cursor-pointer"
                >
                  {/* Progress Line */}
                  <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full bg-[#183A2D] transition-all duration-75 rounded-full ${
                        isPast ? "w-full" : isActive ? "" : "w-0"
                      }`}
                      style={{ width: isActive ? `${progress}%` : isPast ? "100%" : "0%" }}
                    />
                  </div>

                  {/* Step Label */}
                  <div className="flex items-center justify-between pt-0.5">
                    <span className={`text-[10px] sm:text-[11px] font-mono font-bold transition-colors ${
                      isActive ? "text-[#183A2D]" : "text-stone-400 group-hover:text-stone-600"
                    }`}>
                      0{idx + 1}. {idx === 0 ? "CHỌN" : idx === 1 ? "NHẬN" : idx === 2 ? "MẶC" : "TRẢ"}
                    </span>
                    <span className={`text-[9px] font-ui uppercase tracking-wider hidden sm:inline ${
                      isActive ? "text-emerald-800 font-bold" : "text-stone-400"
                    }`}>
                      {item.badge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 3. MAIN CINEMATIC REEL STAGE (2 CỘT TƯƠNG TÁC ĐẬM ĐẶC HÌNH ẢNH & ĐỒ HỌA) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-stretch">
            
            {/* CỘT TRÁI (5 COLS): ĐỒ HỌA TƯƠNG TÁC & THÔNG TIN ĐẬM ĐẶC (KHÔNG CÒN TRỐNG TRẢI) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-5 bg-[#FAF9F5] p-5 sm:p-6 rounded-2xl border border-stone-200/70">
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${roleTab}-${activeStep}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* Top Badge & Live Indicator */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-extrabold text-[#183A2D] bg-[#E8F1E5] px-3 py-1 rounded-md border border-[#CDE1C8] shadow-2xs">
                      KHOẢNH KHẮC 0{activeStep + 1} / 04
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-md border border-stone-200 shadow-2xs">
                      <currentMoment.subStats.icon size={13} className="text-emerald-700 animate-pulse" />
                      <span>{currentMoment.subStats.value}</span>
                    </div>
                  </div>

                  {/* Title & Emotional Quote */}
                  <div>
                    <h3 className="font-heading text-xl sm:text-2xl font-extrabold text-[#183A2D] leading-tight">
                      {currentMoment.title}
                    </h3>
                    <p className="font-scrapbook text-stone-600 text-sm sm:text-base italic mt-2 text-emerald-950 leading-relaxed font-normal">
                      "{currentMoment.quote}"
                    </p>
                  </div>

                  {/* Narrative Text */}
                  <p className="text-xs sm:text-sm text-stone-600 font-light leading-relaxed">
                    {currentMoment.desc}
                  </p>

                  {/* 📊 Visual Mini Metric Grid (Lấp đầy không gian bằng đồ họa) */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="p-3 bg-white rounded-xl border border-stone-200/80 shadow-2xs space-y-0.5">
                      <span className="text-[9.5px] uppercase font-bold text-stone-400 font-ui tracking-wider block">
                        Đặc Quyền
                      </span>
                      <p className="text-xs font-bold text-[#183A2D] font-heading">
                        {currentMoment.badge}
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-stone-200/80 shadow-2xs space-y-0.5">
                      <span className="text-[9.5px] uppercase font-bold text-stone-400 font-ui tracking-wider block">
                        Hiệu Quả
                      </span>
                      <p className="text-xs font-bold text-emerald-800 font-mono">
                        {currentMoment.statBadge}
                      </p>
                    </div>
                  </div>

                  {/* 📜 Memory Capsule Banner */}
                  <div className="p-3 bg-[#FAF7F0] rounded-xl border border-[#E5DEC9] flex items-center gap-2.5 text-[11.5px] text-stone-700 shadow-2xs">
                    <Sparkles size={16} className="text-amber-700 shrink-0" />
                    <span className="italic font-light">{currentMoment.memoryPill}</span>
                  </div>

                </motion.div>
              </AnimatePresence>

              {/* Action Button */}
              <div className="pt-2">
                <Link
                  href={currentMoment.actionLink}
                  className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-[#183A2D] hover:bg-[#2C4233] text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all font-ui shadow-xs hover:shadow-md group"
                >
                  <span>{currentMoment.actionLabel}</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

            </div>

            {/* CỘT PHẢI (7 COLS): KHUNG PHIM LOOKBOOK TOÀN CẢNH (CINEMATIC REEL) */}
            <div className="lg:col-span-7 relative min-h-[380px] sm:min-h-[440px] rounded-2xl overflow-hidden bg-stone-900 border border-stone-300/80 shadow-md group">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${roleTab}-${activeStep}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.04 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="absolute inset-0 w-full h-full"
                >
                  <Image
                    src={currentMoment.image}
                    alt={currentMoment.title}
                    fill
                    className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                    unoptimized
                    priority
                  />
                  
                  {/* Gradient phủ tối điện ảnh */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent pointer-events-none" />

                  {/* Top Floating Badges */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-white/95 backdrop-blur-md text-[#183A2D] px-2.5 py-1 rounded-md font-ui uppercase shadow-xs">
                        SCENE 0{activeStep + 1}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-950 bg-emerald-100/90 backdrop-blur-md px-2.5 py-1 rounded-md font-ui uppercase border border-emerald-300/60 shadow-xs">
                        {currentMoment.badge}
                      </span>
                    </div>

                    {/* Nút Play / Pause Reel */}
                    <button
                      type="button"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-colors border border-white/20 cursor-pointer shadow-xs"
                      title={isPlaying ? "Tạm dừng tua" : "Tiếp tục chạy"}
                    >
                      {isPlaying ? <Pause size={12} /> : <Play size={12} className="translate-x-0.5" />}
                    </button>
                  </div>

                  {/* Nút Chuyển Tiếp Trái/Phải Nhanh (Reel Arrows) */}
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 transition-all border border-white/20 cursor-pointer opacity-0 group-hover:opacity-100 shadow-md"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 transition-all border border-white/20 cursor-pointer opacity-0 group-hover:opacity-100 shadow-md"
                  >
                    <ChevronRight size={18} />
                  </button>

                  {/* Bottom Cinematic Overlay */}
                  <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 text-white space-y-1 z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase tracking-[0.3em] text-emerald-300 font-mono font-bold">
                        CLOOP LIVING REEL
                      </span>
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping"></span>
                    </div>

                    <h4 className="font-heading text-lg sm:text-2xl font-extrabold text-white leading-tight drop-shadow-sm">
                      {currentMoment.highlight}
                    </h4>

                    <p className="text-xs sm:text-sm text-stone-200 font-light line-clamp-1 max-w-lg leading-relaxed drop-shadow-xs">
                      {currentMoment.quote}
                    </p>
                  </div>

                </motion.div>
              </AnimatePresence>
            </div>

          </div>

        </div>

        {/* 4. MOMENT TUYÊN NGÔN BẤT HỦ (WORN. LOVED. LOOPED.) */}
        <div className="pt-4 text-center space-y-2">
          <div className="inline-flex items-center gap-3 text-xs sm:text-sm font-heading font-extrabold tracking-[0.4em] text-[#183A2D] uppercase">
            <span>WORN</span>
            <span className="text-emerald-600 animate-pulse">•</span>
            <span>LOVED</span>
            <span className="text-emerald-600 animate-pulse">•</span>
            <span>LOOPED</span>
          </div>
          <p className="text-xs text-stone-500 font-light italic">
            Mỗi lần một món đồ được mặc lại, một vòng đời mới đầy cảm xúc lại bắt đầu.
          </p>
        </div>

      </div>
    </section>
  );
}
