"use client";

import React, { useState } from "react";
import Image from "next/image";
import { 
  ShieldCheck, 
  Lock,
  Leaf,
  Award,
  ArrowRight, 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MarketingLoopShowcase() {
  const [roleTab, setRoleTab] = useState<"RENTER" | "OWNER">("RENTER");

  const renterSteps = [
    {
      step: "01",
      title: "Chọn đồ & Ướm dáng",
      desc: "Khám phá hàng ngàn trang phục dạ hội, áo dài & blazer thiết kế tuyển chọn.",
      meta: "Stylist 24/7",
      action: "Khám phá ngay",
      image: "/step1_phone.jpg"
    },
    {
      step: "02",
      title: "Nhận đồ & Giữ cọc",
      desc: "Giao tận tay thơm tho tươm tất. Tiền cọc được bảo chứng an toàn qua Két Escrow.",
      meta: "Két Escrow 100%",
      action: "Bảo chứng an toàn",
      image: "/step2_bag.jpg"
    },
    {
      step: "03",
      title: "Tỏa sáng sự kiện",
      desc: "Tự tin ghi dấu ấn rực rỡ với chi phí chỉ từ 10% so với giá mua mới.",
      meta: "Tiết kiệm 90%",
      action: "Tỏa sáng lộng lẫy",
      image: "/step3_party.jpg"
    },
    {
      step: "04",
      title: "Hoàn trả & Tích điểm",
      desc: "Giao nhận trả đồ tận nơi tiện lợi. Tự động hoàn cọc 100% & tích lũy điểm xanh.",
      meta: "+50 Green Pts",
      action: "Hoàn cọc tức thì",
      image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=600"
    }
  ];

  const ownerSteps = [
    {
      step: "01",
      title: "Đăng tủ 30 giây",
      desc: "Chụp ảnh váy áo nhàn rỗi. Tự động đề xuất phân loại & mức giá thuê chuẩn sàn.",
      meta: "Đăng đồ 30s",
      action: "Bắt đầu đăng đồ",
      image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=600"
    },
    {
      step: "02",
      title: "Giao nhận tận cửa",
      desc: "Đối tác vận chuyển lấy hàng tận nơi, chủ tủ không cần tốn công di chuyển.",
      meta: "Lấy hàng tại nhà",
      action: "Giao nhận thảnh thơi",
      image: "/step2_bag.jpg"
    },
    {
      step: "03",
      title: "Thu nhập thụ động",
      desc: "Tiền thuê tự động cộng vào ví sau mỗi chuyến đi, rút về STK nhanh gọn.",
      meta: "Rút tiền chính chủ",
      action: "Xem ví thu nhập",
      image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=600"
    },
    {
      step: "04",
      title: "Định danh xanh ESG",
      desc: "Đo lường CO₂ giảm thải, nâng hạng uy tín tủ đồ & nhận ưu đãi độc quyền.",
      meta: "Huy hiệu Trustworthy",
      action: "Tích điểm uy tín",
      image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=600"
    }
  ];

  const currentSteps = roleTab === "RENTER" ? renterSteps : ownerSteps;

  return (
    <section className="w-full bg-[#FAF9F5] border-b border-stone-200/70 py-8 md:py-12 text-[#183A2D] font-body">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 space-y-6 md:space-y-7">
        
        {/* HEADER GỌN GÀNG & THANH LỊCH */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200/60 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-700"></span>
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-emerald-900/80 font-ui">
                QUY TRÌNH THỜI TRANG TUẦN HOÀN
              </span>
            </div>
            <h2 className="font-heading text-lg sm:text-xl md:text-2xl font-bold text-[#183A2D] tracking-tight">
              Mặc Đẹp Thông Minh • Tủ Đồ Tuần Hoàn
            </h2>
          </div>

          {/* TAB CHUYỂN ĐỔI THANH MẢNH */}
          <div className="inline-flex items-center gap-1 p-1 bg-stone-100/90 rounded-lg border border-stone-200/80 font-ui self-start md:self-auto shadow-2xs">
            <button
              type="button"
              onClick={() => setRoleTab("RENTER")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                roleTab === "RENTER"
                  ? "bg-[#183A2D] text-white shadow-xs"
                  : "text-stone-600 hover:text-[#183A2D]"
              }`}
            >
              Tôi Muốn Thuê Đồ
            </button>
            <button
              type="button"
              onClick={() => setRoleTab("OWNER")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                roleTab === "OWNER"
                  ? "bg-[#183A2D] text-white shadow-xs"
                  : "text-stone-600 hover:text-[#183A2D]"
              }`}
            >
              Tôi Muốn Cho Thuê
            </button>
          </div>
        </div>

        {/* 4 BƯỚC EDITORIAL FASHION CARDS CÓ ẢNH LOOKBOOK SỐNG ĐỘNG */}
        <AnimatePresence mode="wait">
          <motion.div
            key={roleTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5"
          >
            {currentSteps.map((item, idx) => (
              <div
                key={idx}
                className="group bg-white rounded-2xl p-3 border border-stone-200/80 hover:border-emerald-800/40 hover:shadow-lg transition-all duration-300 text-left flex flex-col justify-between shadow-2xs"
              >
                {/* 📷 KHUNG ẢNH LOOKBOOK THỜI TRANG */}
                <div className="relative aspect-[16/11] rounded-xl overflow-hidden mb-3.5 bg-stone-100 border border-stone-200/50">
                  <Image 
                    src={item.image} 
                    alt={item.title} 
                    fill 
                    className="object-cover transition-transform duration-700 group-hover:scale-106" 
                    unoptimized 
                  />
                  
                  {/* Tag số bước */}
                  <div className="absolute top-2.5 left-2.5 bg-[#183A2D]/90 backdrop-blur-md text-white text-[10.5px] font-mono font-bold px-2.5 py-0.5 rounded-md shadow-xs">
                    {item.step}
                  </div>

                  {/* Tag tính năng nổi bật */}
                  <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-md text-emerald-900 text-[9.5px] font-ui font-bold px-2 py-0.5 rounded-md shadow-xs border border-stone-200/60">
                    {item.meta}
                  </div>
                </div>

                {/* 📝 NỘI DUNG MÔ TẢ */}
                <div className="space-y-1.5 px-1 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#183A2D] font-heading group-hover:text-emerald-800 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-[11.5px] text-stone-500 font-light leading-relaxed mt-1 line-clamp-2">
                      {item.desc}
                    </p>
                  </div>

                  <div className="pt-2.5 mt-2 border-t border-stone-100 flex items-center justify-between text-[10.5px] text-stone-400 font-ui">
                    <span className="text-[#183A2D] font-semibold">{item.action}</span>
                    <ArrowRight size={12} className="text-stone-400 group-hover:text-[#183A2D] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* 🛡️ DẢI BẢO CHỨNG NGUYÊN KHỐI LIỀN MẠCH (SINGLE UNIFIED TRUST RIBBON) */}
        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-stone-200/70">
            
            {/* 1. Két Escrow */}
            <div className="flex items-center gap-3 p-3.5 sm:px-4.5 hover:bg-stone-50/60 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-[#EAF2E8] flex items-center justify-center shrink-0 border border-[#D2E4CE] text-[#183A2D]">
                <ShieldCheck size={18} strokeWidth={2} />
              </div>
              <div className="leading-tight">
                <p className="text-[11.5px] font-bold text-[#183A2D] font-ui">Két Cọc Escrow 100%</p>
                <p className="text-[10px] text-stone-500 font-light mt-0.5">Hoàn cọc tự động khi trả đồ</p>
              </div>
            </div>

            {/* 2. KYC Bank */}
            <div className="flex items-center gap-3 p-3.5 sm:px-4.5 hover:bg-stone-50/60 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-[#EAF2E8] flex items-center justify-center shrink-0 border border-[#D2E4CE] text-[#183A2D]">
                <Lock size={16} strokeWidth={2} />
              </div>
              <div className="leading-tight">
                <p className="text-[11.5px] font-bold text-[#183A2D] font-ui">Định Danh Bank-KYC</p>
                <p className="text-[10px] text-stone-500 font-light mt-0.5">Rút tiền về STK chính chủ</p>
              </div>
            </div>

            {/* 3. Green Pts */}
            <div className="flex items-center gap-3 p-3.5 sm:px-4.5 hover:bg-stone-50/60 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-[#EAF2E8] flex items-center justify-center shrink-0 border border-[#D2E4CE] text-[#183A2D]">
                <Leaf size={16} strokeWidth={2} />
              </div>
              <div className="leading-tight">
                <p className="text-[11.5px] font-bold text-[#183A2D] font-ui">Điểm Xanh Green Pts</p>
                <p className="text-[10px] text-stone-500 font-light mt-0.5">Giảm đến 50% tiền cọc</p>
              </div>
            </div>

            {/* 4. Đánh giá mù */}
            <div className="flex items-center gap-3 p-3.5 sm:px-4.5 hover:bg-stone-50/60 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-[#EAF2E8] flex items-center justify-center shrink-0 border border-[#D2E4CE] text-[#183A2D]">
                <Award size={16} strokeWidth={2} />
              </div>
              <div className="leading-tight">
                <p className="text-[11.5px] font-bold text-[#183A2D] font-ui">Đánh Giá Mù 2 Chiều</p>
                <p className="text-[10px] text-stone-500 font-light mt-0.5">Minh bạch chuẩn Airbnb</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
