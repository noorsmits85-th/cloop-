"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MarketingLoopShowcase() {
  const [roleTab, setRoleTab] = useState<"RENTER" | "OWNER">("RENTER");

  const renterSteps = [
    {
      step: "01",
      title: "Chọn Đồ & Ướm Dáng",
      desc: "Khám phá hàng ngàn trang phục dạ hội, áo dài & blazer thiết kế tuyển chọn từ các chủ tủ uy tín.",
      meta: "Stylist 24/7",
      link: "/shop",
      action: "Khám phá ngay",
      image: "/step1_phone.jpg"
    },
    {
      step: "02",
      title: "Nhận Đồ & Giữ Cọc",
      desc: "Giao tận tay thơm tho tươm tất. Tiền cọc được bảo chứng an toàn tuyệt đối qua Két Escrow.",
      meta: "Két Escrow 100%",
      link: "/shop",
      action: "Bảo chứng an toàn",
      image: "/step2_bag.jpg"
    },
    {
      step: "03",
      title: "Tỏa Sáng Sự Kiện",
      desc: "Tự tin ghi dấu ấn rực rỡ tại các bữa tiệc với chi phí chỉ từ 10% so với giá mua mới.",
      meta: "Tiết Kiệm 90%",
      link: "/shop",
      action: "Tỏa sáng lộng lẫy",
      image: "/step3_party.jpg"
    },
    {
      step: "04",
      title: "Hoàn Trả & Tích Điểm",
      desc: "Giao nhận trả đồ tận nơi tiện lợi. Tự động hoàn cọc 100% về ví & tích lũy điểm xanh Eco.",
      meta: "+50 Green Pts",
      link: "/shop",
      action: "Hoàn cọc tức thì",
      image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=600"
    }
  ];

  const ownerSteps = [
    {
      step: "01",
      title: "Đăng Tủ 30 Giây",
      desc: "Chụp ảnh váy áo nhàn rỗi. Tự động đề xuất phân loại chuẩn xác & mức giá thuê chuẩn sàn.",
      meta: "Đăng Đồ 30s",
      link: "/my-closet/create",
      action: "Bắt đầu đăng đồ",
      image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=600"
    },
    {
      step: "02",
      title: "Giao Nhận Tận Cửa",
      desc: "Đối tác vận chuyển lấy hàng tận nơi, chủ tủ không cần tốn thời gian di chuyển.",
      meta: "Lấy Hàng Tại Nhà",
      link: "/my-closet",
      action: "Giao nhận thảnh thơi",
      image: "/step2_bag.jpg"
    },
    {
      step: "03",
      title: "Thu Nhập Thụ Động",
      desc: "Tiền thuê tự động cộng vào ví sau mỗi chuyến đi, rút về số tài khoản ngân hàng trong 30s.",
      meta: "Rút Tiền Chính Chủ",
      link: "/my-closet",
      action: "Xem ví thu nhập",
      image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=600"
    },
    {
      step: "04",
      title: "Định Danh Xanh ESG",
      desc: "Đo lường CO₂ giảm thải, nâng hạng uy tín tủ đồ & nhận ưu đãi độc quyền từ CLOOP.",
      meta: "Shop Uy Tín",
      link: "/my-closet",
      action: "Tích điểm uy tín",
      image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=600"
    }
  ];

  const currentSteps = roleTab === "RENTER" ? renterSteps : ownerSteps;

  return (
    <section className="w-full bg-[#FAF9F5] border-b border-stone-200/70 py-10 md:py-16 text-[#183A2D] font-body">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 space-y-8 md:space-y-10">
        
        {/* HEADER TẠP CHÍ EDITORIAL SANG TRỌNG */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200/80 pb-5">
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-emerald-900/80 font-ui flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-700"></span>
              QUY TRÌNH THỜI TRANG TUẦN HOÀN
            </span>
            <h2 className="font-heading text-xl sm:text-2xl md:text-3xl font-extrabold text-[#183A2D] tracking-tight">
              Mặc Đẹp Thông Minh • Tủ Đồ Tuần Hoàn
            </h2>
          </div>

          {/* TAB CHUYỂN ĐỔI PHONG CÁCH TỐI GIẢN */}
          <div className="inline-flex items-center gap-1 p-1 bg-stone-200/60 rounded-md font-ui self-start md:self-auto">
            <button
              type="button"
              onClick={() => setRoleTab("RENTER")}
              className={`px-4 py-1.5 rounded text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
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
              className={`px-4 py-1.5 rounded text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
                roleTab === "OWNER"
                  ? "bg-[#183A2D] text-white shadow-xs"
                  : "text-stone-600 hover:text-[#183A2D]"
              }`}
            >
              Tôi Muốn Cho Thuê
            </button>
          </div>
        </div>

        {/* 4 CỘT LOOKBOOK BIÊN TẬP (EDITORIAL MAGAZINE STYLE - KHÔNG HỘP BO TRÒN) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={roleTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
          >
            {currentSteps.map((item, idx) => (
              <Link
                key={idx}
                href={item.link}
                className="group flex flex-col space-y-3.5 cursor-pointer"
              >
                {/* 1. SỐ BƯỚC & NHÃN BIÊN TẬP */}
                <div className="flex items-baseline justify-between border-b border-stone-300/70 pb-2">
                  <span className="font-mono text-xs font-bold text-stone-400 group-hover:text-[#183A2D] transition-colors tracking-widest">
                    STEP {item.step}
                  </span>
                  <span className="font-ui text-[10px] tracking-widest uppercase text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-100">
                    {item.meta}
                  </span>
                </div>

                {/* 2. KHUNG ẢNH LOOKBOOK DỌC THỜI TRANG */}
                <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-stone-100 border border-stone-200/70 shadow-2xs">
                  <Image 
                    src={item.image} 
                    alt={item.title} 
                    fill 
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" 
                    unoptimized 
                  />
                </div>

                {/* 3. NỘI DUNG MÔ TẢ BIÊN TẬP */}
                <div className="space-y-1.5 flex-1 flex flex-col justify-between pt-0.5">
                  <div>
                    <h3 className="font-heading text-base font-bold text-[#183A2D] group-hover:text-emerald-800 transition-colors leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-[11.5px] text-stone-500 font-light leading-relaxed mt-1">
                      {item.desc}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#183A2D] group-hover:text-emerald-700 font-ui transition-colors">
                    <span className="uppercase tracking-wider text-[10px]">{item.action}</span>
                    <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* NÚT KÊU GỌI HÀNH ĐỘNG CHUẨN BY ROTATION */}
        <div className="flex justify-center pt-4 border-t border-stone-200/60">
          {roleTab === "RENTER" ? (
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-7 py-3 bg-[#183A2D] hover:bg-[#2C4233] text-white font-bold rounded-md text-xs uppercase tracking-widest transition-all font-ui shadow-xs hover:shadow-md"
            >
              Khám Phá Toàn Bộ Tủ Đồ Cho Thuê <ArrowRight size={13} />
            </Link>
          ) : (
            <Link
              href="/my-closet/create"
              className="inline-flex items-center gap-2 px-7 py-3 bg-[#183A2D] hover:bg-[#2C4233] text-white font-bold rounded-md text-xs uppercase tracking-widest transition-all font-ui shadow-xs hover:shadow-md"
            >
              Đăng Tủ Đồ & Bắt Đầu Kiếm Tiền <ArrowRight size={13} />
            </Link>
          )}
        </div>

      </div>
    </section>
  );
}
