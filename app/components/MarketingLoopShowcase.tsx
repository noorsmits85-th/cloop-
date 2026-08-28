"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles, RefreshCw, Heart, ShieldCheck, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MarketingLoopShowcase() {
  const [roleTab, setRoleTab] = useState<"RENTER" | "OWNER">("RENTER");
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);

  const renterMoments = [
    {
      num: "01 / 04",
      tagline: "SELECT & FIT",
      title: "Khởi Đầu Hành Trình: Chọn Đồ & Ướm Dáng",
      quote: "Tìm thấy chiếc đầm lụa chân ái chỉ trong 60 giây cùng Stylist.",
      desc: "Khám phá hàng ngàn trang phục dạ hội, áo dài & blazer thiết kế tuyển chọn từ các tủ đồ uy tín khắp cả nước.",
      meta: "Stylist 24/7",
      highlight: "Tiết kiệm 90% chi phí",
      image: "/step1_phone.jpg",
      storyNote: "Khoảnh khắc mở đầu của một bộ cánh trước giờ tỏa sáng.",
      actionLabel: "Khám Phá Tủ Đồ",
      actionLink: "/shop"
    },
    {
      num: "02 / 04",
      tagline: "RECEIVE & ESCROW",
      title: "Chạm Vào Sự Tươm Tất: Nhận Đồ & Két Bảo Chứng",
      quote: "Đóng gói thơm tho, là phẳng như bước ra từ boutique cao cấp.",
      desc: "Giao tận tay đúng lịch hẹn. Tiền cọc được giữ an toàn tuyệt đối qua Két Escrow, sàn chỉ giải ngân khi hai bên trọn vẹn an tâm.",
      meta: "Két Escrow 100%",
      highlight: "Bảo chứng an toàn 100%",
      image: "/step2_bag.jpg",
      storyNote: "Mỗi nếp vải được nâng niu và trao gửi bằng sự tin cậy.",
      actionLabel: "Xem Cam Kết Bảo Chứng",
      actionLink: "/shop"
    },
    {
      num: "03 / 04",
      tagline: "WEAR & SHINE",
      title: "Khoảnh Khắc Tỏa Sáng: Diện Đồ & Lưu Kỷ Niệm",
      quote: "Tự tin ghi dấu ấn rực rỡ tại sự kiện quan trọng nhất đời bạn.",
      desc: "Không cần mua chiếc váy chỉ để mặc một lần. Bạn sở hữu diện mạo lộng lẫy nhất với chi phí chỉ bằng một bữa tối.",
      meta: "Độc Bản Sự Kiện",
      highlight: "Ghi dấu ấn dạ tiệc",
      image: "/step3_party.jpg",
      storyNote: "Bộ đồ sống trọn vẹn sứ mệnh khi cùng bạn tỏa sáng.",
      actionLabel: "Chọn Đồ Đi Tiệc Ngay",
      actionLink: "/shop"
    },
    {
      num: "04 / 04",
      tagline: "RETURN & LOOP",
      title: "Vòng Lặp Bất Tận: Hoàn Trả & Lưu Ký Ức",
      quote: "Chiếc váy này đã đi qua 3 đêm tiệc và sẵn sàng cho người bạn tiếp theo.",
      desc: "Gửi trả nhẹ nhàng qua shipper tận nhà. Tiền cọc tự động hoàn 100% về ví cùng điểm xanh Green Pts tích lũy cho lần diện sau.",
      meta: "+50 Green Pts",
      highlight: "Hoàn cọc 100% tức thì",
      image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=900",
      storyNote: "Một vòng đời khép lại, một hành trình mới lại bắt đầu.",
      actionLabel: "Khám Phá Ký Ức Tuần Hoàn",
      actionLink: "/shop"
    }
  ];

  const ownerMoments = [
    {
      num: "01 / 04",
      tagline: "LIST & SHARE",
      title: "Đánh Thức Tủ Đồ: Đăng Đồ Trong 30 Giây",
      quote: "Những bộ váy nằm im trong tủ xứng đáng có cuộc đời thứ hai.",
      desc: "Chụp ảnh trang phục nhàn rỗi. Hệ thống tự động đề xuất phân loại, mô tả chi tiết và mức giá thuê lý tưởng nhất.",
      meta: "Đăng Đồ 30s",
      highlight: "Gợi ý giá thông minh",
      image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=900",
      storyNote: "Biến góc tủ ngủ yên thành dòng tiền thụ động đều đặn.",
      actionLabel: "Đăng Tủ Đồ Ngay",
      actionLink: "/my-closet/create"
    },
    {
      num: "02 / 04",
      tagline: "DOORSTEP PICKUP",
      title: "Giao Nhận Thảnh Thơi: Shipper Lấy Tận Nhà",
      quote: "Bạn chỉ cần đóng gói xinh xắn, mọi việc giao nhận sàn lo trọn vẹn.",
      desc: "Xác nhận lịch thuê trên app, đối tác vận chuyển đến lấy đồ tận cửa và giao đến tay người thuê với quy trình bảo quản tiêu chuẩn.",
      meta: "Lấy Hàng Tận Nơi",
      highlight: "Không tốn công di chuyển",
      image: "/step2_bag.jpg",
      storyNote: "Trao gửi phong cách đến người cùng gu một cách êm ái.",
      actionLabel: "Quản Lý Lịch Đồ",
      actionLink: "/my-closet"
    },
    {
      num: "03 / 04",
      tagline: "PASSIVE INCOME",
      title: "Dòng Tiền Thụ Động: Thu Nhập Tự Động Về Ví",
      quote: "Mỗi chuyến du ngoạn của bộ váy là một khoản thu nhập tăng thêm.",
      desc: "Tiền thuê tự động cộng vào ví ngay sau chuyến đi. Rút về tài khoản ngân hàng trong 30 giây với biểu phí minh bạch.",
      meta: "Rút Tiền 30s",
      highlight: "Nhận 100% doanh thu",
      image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=900",
      storyNote: "Tủ đồ tự nuôi sống chính nó và tạo ra nguồn thu bền vững.",
      actionLabel: "Xem Ví Doanh Thu",
      actionLink: "/my-closet"
    },
    {
      num: "04 / 04",
      tagline: "ESG & TRUST",
      title: "Định Danh Xanh: Tích Lũy Điểm Sinh Thái",
      quote: "Tự hào khi tủ đồ của bạn giảm thải hàng chục kg CO₂ cho Trái Đất.",
      desc: "Mỗi lượt cho thuê được cấp chứng nhận giảm phát thải khí nhà kính, nâng hạng Tủ Đồ Uy Tín và mở khóa các đặc quyền độc quyền.",
      meta: "Huy Hiệu Shop Xanh",
      highlight: "Chứng nhận sinh thái ESG",
      image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=900",
      storyNote: "Thời trang tuần hoàn không chỉ đẹp, mà còn tử tế.",
      actionLabel: "Xem Bảng Điểm Xanh",
      actionLink: "/my-closet"
    }
  ];

  const currentMoments = roleTab === "RENTER" ? renterMoments : ownerMoments;
  const currentMoment = currentMoments[activeStep] || currentMoments[0];

  // Auto-play vòng lặp tuần hoàn nếu người dùng không tương tác
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const handleManualSelect = (idx: number) => {
    setIsAutoPlaying(false);
    setActiveStep(idx);
  };

  const handleRoleChange = (role: "RENTER" | "OWNER") => {
    setRoleTab(role);
    setActiveStep(0);
    setIsAutoPlaying(false);
  };

  return (
    <section className="w-full bg-[#FAF9F5] border-b border-stone-200/70 py-12 md:py-20 text-[#183A2D] font-body relative overflow-hidden">
      
      {/* Nền Texture Vòng Lặp Mờ Mảnh Phía Sau */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.035]">
        <div className="w-[600px] sm:w-[900px] h-[600px] sm:h-[900px] rounded-full border-[60px] sm:border-[100px] border-[#183A2D]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 space-y-10 md:space-y-14 relative z-10">
        
        {/* 1. HEADER TUYÊN NGÔN THỜI TRANG (EDITORIAL MANIFESTO) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-stone-300/60 pb-6">
          <div className="space-y-2 max-w-2xl">
            <span className="text-[10.5px] uppercase font-bold tracking-[0.3em] text-emerald-900/80 font-ui flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-700 animate-pulse"></span>
              CÁCH CLOOP HOẠT ĐỘNG • THE CIRCULAR JOURNEY
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#183A2D] tracking-tight leading-tight">
              Một Bộ Đồ. <span className="text-emerald-800 font-serif italic font-normal">Bốn Khoảnh Khắc.</span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 font-light leading-relaxed">
              Từ lúc bạn chạm tay chọn món đồ yêu thích đến khi nó tiếp tục bước vào một vòng đời mới rực rỡ.
            </p>
          </div>

          {/* EDITORIAL NAVIGATION (TÔI MUỐN MẶC / TÔI MUỐN CHIA SẺ) */}
          <div className="flex items-center gap-2 p-1 bg-stone-200/50 rounded-lg font-ui self-start md:self-auto border border-stone-300/40">
            <button
              type="button"
              onClick={() => handleRoleChange("RENTER")}
              className={`px-4 py-2 rounded-md text-xs font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                roleTab === "RENTER"
                  ? "bg-[#183A2D] text-white shadow-xs"
                  : "text-stone-600 hover:text-[#183A2D]"
              }`}
            >
              <span>Tôi Muốn Mặc</span>
              <span className="text-[9px] opacity-70 font-normal hidden sm:inline">• Thuê đồ</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange("OWNER")}
              className={`px-4 py-2 rounded-md text-xs font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                roleTab === "OWNER"
                  ? "bg-[#183A2D] text-white shadow-xs"
                  : "text-stone-600 hover:text-[#183A2D]"
              }`}
            >
              <span>Tôi Muốn Chia Sẻ</span>
              <span className="text-[9px] opacity-70 font-normal hidden sm:inline">• Cho thuê</span>
            </button>
          </div>
        </div>

        {/* 2. KHUNG NGHỆ THUẬT TRUNG TÂM & QUỸ ĐẠO TUẦN HOÀN */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* CỘT TRÁI (5 COLS): CÂU CHUYỆN BIÊN TẬP CỦA TỪNG KHOẢNH KHẮC */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            
            <AnimatePresence mode="wait">
              <motion.div
                key={`${roleTab}-${activeStep}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-4 text-left"
              >
                {/* Số bước và Nhãn */}
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold tracking-[0.25em] text-[#183A2D] bg-[#E8F1E5] px-2.5 py-1 rounded border border-[#CDE1C8]">
                    {currentMoment.num}
                  </span>
                  <span className="font-ui text-[11px] font-extrabold tracking-widest uppercase text-emerald-800">
                    {currentMoment.tagline}
                  </span>
                </div>

                {/* Tiêu đề & Câu danh ngôn cảm xúc */}
                <div>
                  <h3 className="font-heading text-xl sm:text-2xl font-bold text-[#183A2D] leading-snug">
                    {currentMoment.title}
                  </h3>
                  <p className="font-scrapbook text-stone-600 text-sm sm:text-base italic mt-2 text-emerald-950 font-normal">
                    "{currentMoment.quote}"
                  </p>
                </div>

                {/* Đoạn mô tả chi tiết */}
                <p className="text-xs sm:text-sm text-stone-600 font-light leading-relaxed">
                  {currentMoment.desc}
                </p>

                {/* Ghi chú Kỷ niệm / Ký ức thời trang */}
                <div className="p-3.5 bg-[#FAF7F0] rounded-xl border border-[#E5DEC9] flex items-start gap-2.5 text-[11.5px] text-stone-700">
                  <Sparkles size={16} className="text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-stone-900 block font-ui uppercase text-[9.5px] tracking-wider">Ký Ức Tuần Hoàn</span>
                    <span className="italic font-light">{currentMoment.storyNote}</span>
                  </div>
                </div>

                {/* Nút hành động trực tiếp */}
                <div className="pt-2">
                  <Link
                    href={currentMoment.actionLink}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#183A2D] hover:bg-[#2C4233] text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all font-ui shadow-xs hover:shadow-md group"
                  >
                    <span>{currentMoment.actionLabel}</span>
                    <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

              </motion.div>
            </AnimatePresence>

          </div>

          {/* CỘT PHẢI (7 COLS): TẤM ẢNH ĐIỆN ẢNH TRUNG TÂM & QUỸ ĐẠO 4 ĐIỂM */}
          <div className="lg:col-span-7 flex flex-col items-center space-y-6">
            
            {/* KHUNG ẢNH POLAROID / CAMPAIGN PHÁ KHUNG */}
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/11] rounded-2xl overflow-hidden bg-stone-100 border border-stone-300/80 shadow-lg group">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${roleTab}-${activeStep}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.03 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="absolute inset-0 w-full h-full"
                >
                  <Image
                    src={currentMoment.image}
                    alt={currentMoment.title}
                    fill
                    className="object-cover transition-transform duration-1000 ease-out group-hover:scale-104"
                    unoptimized
                    priority
                  />
                  {/* Gradient phủ tối sang trọng */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                  {/* Nhãn dán trên góc ảnh */}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="font-mono text-[10.5px] font-bold bg-white/95 backdrop-blur-md text-[#183A2D] px-2.5 py-1 rounded-md font-ui uppercase shadow-xs">
                      {currentMoment.num}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-900 bg-emerald-100/90 backdrop-blur-md px-2.5 py-1 rounded-md font-ui uppercase border border-emerald-300/50 shadow-xs">
                      {currentMoment.meta}
                    </span>
                  </div>

                  {/* Tuyên ngôn thời trang ở chân ảnh */}
                  <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 text-white flex justify-between items-end">
                    <div>
                      <span className="text-[9px] uppercase tracking-[0.25em] text-emerald-300 font-mono font-bold block mb-0.5">
                        CLOOP SIGNATURE
                      </span>
                      <p className="font-heading text-lg sm:text-xl font-extrabold text-white leading-tight drop-shadow-sm">
                        {currentMoment.highlight}
                      </p>
                    </div>

                    <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-stone-300 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-md border border-white/15">
                      <RefreshCw size={11} className="animate-spin text-emerald-400" />
                      <span>The Circular Flow</span>
                    </div>
                  </div>

                </motion.div>
              </AnimatePresence>
            </div>

            {/* 3. QUỸ ĐẠO 4 ĐIỂM CHẠM TƯƠNG TÁC (CIRCULAR TIMELINE ORBIT) */}
            <div className="w-full bg-white/80 backdrop-blur-xs rounded-2xl p-2.5 sm:p-3 border border-stone-200/80 shadow-xs">
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {currentMoments.map((m, idx) => {
                  const isActive = activeStep === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleManualSelect(idx)}
                      className={`relative p-2 sm:p-3 rounded-xl transition-all duration-300 text-left flex flex-col justify-between cursor-pointer border ${
                        isActive
                          ? "bg-[#183A2D] text-white border-[#183A2D] shadow-sm scale-[1.02]"
                          : "bg-transparent text-stone-600 border-transparent hover:bg-stone-100/70"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-mono text-[9.5px] sm:text-[10.5px] font-bold ${isActive ? "text-emerald-300" : "text-stone-400"}`}>
                          0{idx + 1}
                        </span>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-400 animate-ping" : "bg-stone-300"}`} />
                      </div>

                      <p className={`font-heading text-[11px] sm:text-xs font-bold line-clamp-1 ${isActive ? "text-white" : "text-[#183A2D]"}`}>
                        {idx === 0 ? "1. Chọn" : idx === 1 ? "2. Nhận" : idx === 2 ? "3. Mặc" : "4. Trả"}
                      </p>

                      <span className={`text-[8.5px] sm:text-[9.5px] font-ui uppercase tracking-wider block mt-0.5 line-clamp-1 ${
                        isActive ? "text-stone-300" : "text-stone-400"
                      }`}>
                        {m.tagline.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* 4. MOMENT TUYÊN NGÔN BẤT HỦ (WORN. LOVED. LOOPED.) */}
        <div className="pt-6 border-t border-stone-300/50 text-center space-y-2">
          <div className="inline-flex items-center gap-3 text-xs sm:text-sm font-heading font-extrabold tracking-[0.35em] text-[#183A2D] uppercase">
            <span>WORN</span>
            <span className="text-emerald-600">•</span>
            <span>LOVED</span>
            <span className="text-emerald-600">•</span>
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
