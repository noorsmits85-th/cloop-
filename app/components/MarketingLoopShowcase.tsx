"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, RotateCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MarketingLoopShowcase() {
  const [roleTab, setRoleTab] = useState<"RENTER" | "OWNER">("RENTER");

  const renterSteps = [
    {
      step: "01",
      title: "Chọn Đồ & Ướm Dáng",
      desc: "Khám phá hàng ngàn trang phục dạ hội, áo dài & blazer thiết kế tuyển chọn.",
      meta: "Stylist 24/7",
      image: "/step1_phone.jpg",
      link: "/shop"
    },
    {
      step: "02",
      title: "Nhận Đồ & Két Giữ Cọc",
      desc: "Giao tận tay thơm tho tươm tất. Tiền cọc bảo chứng an toàn qua Két Escrow.",
      meta: "Két Escrow 100%",
      image: "/step2_bag.jpg",
      link: "/shop"
    },
    {
      step: "03",
      title: "Diện Đồ & Tỏa Sáng",
      desc: "Tự tin ghi dấu ấn tại các sự kiện với chi phí chỉ từ 10% so với giá mua mới.",
      meta: "Tiết kiệm 90%",
      image: "/step3_party.jpg",
      link: "/shop"
    },
    {
      step: "04",
      title: "Hoàn Trả & Vòng Lặp Mới",
      desc: "Shipper nhận lại tận nhà. Tự động hoàn 100% tiền cọc & tích lũy điểm xanh.",
      meta: "+50 Green Pts",
      image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=800",
      link: "/shop"
    }
  ];

  const ownerSteps = [
    {
      step: "01",
      title: "Đăng Tủ Trong 30 Giây",
      desc: "Chụp ảnh váy áo nhàn rỗi. Tự động đề xuất phân loại & mức giá thuê chuẩn sàn.",
      meta: "Đăng đồ 30s",
      image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=800",
      link: "/my-closet/create"
    },
    {
      step: "02",
      title: "Giao Nhận Tận Cửa",
      desc: "Đối tác vận chuyển lấy hàng tận nơi, chủ tủ không cần tốn thời gian di chuyển.",
      meta: "Lấy hàng tại nhà",
      image: "/step2_bag.jpg",
      link: "/my-closet"
    },
    {
      step: "03",
      title: "Thu Nhập Thụ Động",
      desc: "Tiền thuê tự động cộng vào ví sau mỗi chuyến đi, rút về STK chính chủ trong 30s.",
      meta: "Rút tiền 30s",
      image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=800",
      link: "/my-closet"
    },
    {
      step: "04",
      title: "Định Danh Xanh ESG",
      desc: "Đo lường CO₂ giảm thải, nâng hạng uy tín tủ đồ & nhận ưu đãi độc quyền.",
      meta: "Shop Uy Tín",
      image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=800",
      link: "/my-closet"
    }
  ];

  const currentSteps = roleTab === "RENTER" ? renterSteps : ownerSteps;

  return (
    <section className="w-full bg-[#FAF9F5] border-b border-stone-200/70 py-10 md:py-14 text-[#183A2D] font-body">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 space-y-6 md:space-y-8">
        
        {/* 1. HEADER SECTION ĐỒNG BỘ CHUẨN THỜI TRANG */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200/80 pb-4">
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

          {/* 2 TAB CHUYỂN ĐỔI THANH MẢNH */}
          <div className="inline-flex items-center gap-1 p-1 bg-stone-200/60 rounded-lg font-ui self-start md:self-auto shadow-2xs">
            <button
              type="button"
              onClick={() => setRoleTab("RENTER")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all cursor-pointer ${
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
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                roleTab === "OWNER"
                  ? "bg-[#183A2D] text-white shadow-xs"
                  : "text-stone-600 hover:text-[#183A2D]"
              }`}
            >
              Tôi Muốn Cho Thuê
            </button>
          </div>
        </div>

        {/* 2. DẢI 4 BƯỚC THỜI TRANG TUẦN HOÀN (CLEAN TIMELINE STREAM) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={roleTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 relative"
          >
            {currentSteps.map((item, idx) => (
              <Link
                key={idx}
                href={item.link}
                className="group flex flex-col justify-between bg-white rounded-xl p-3.5 border border-stone-200/80 hover:border-emerald-800/40 hover:shadow-md transition-all duration-300 shadow-2xs"
              >
                {/* Top Timeline Indicator */}
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-stone-100 text-[11px] font-mono">
                  <span className="font-bold text-[#183A2D] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 group-hover:scale-125 transition-transform" />
                    BƯỚC {item.step}
                  </span>
                  <span className="text-[10px] text-emerald-800 bg-[#E8F1E5] px-2 py-0.5 rounded font-ui font-semibold">
                    {item.meta}
                  </span>
                </div>

                {/* Lookbook Image Container */}
                <div className="relative aspect-[16/11] rounded-lg overflow-hidden mb-3 bg-stone-100 border border-stone-200/60">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    unoptimized
                  />
                  {idx === 3 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[8.5px] font-ui font-semibold px-2 py-0.5 rounded flex items-center gap-1 shadow-xs">
                      <RotateCw size={9} className="animate-spin text-emerald-300" />
                      <span>Vòng Lặp Mới</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-1 flex-1 flex flex-col justify-between pt-0.5">
                  <div>
                    <h3 className="font-heading text-sm font-bold text-[#183A2D] group-hover:text-emerald-800 transition-colors leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-[11.5px] text-stone-500 font-light leading-relaxed mt-1 line-clamp-2">
                      {item.desc}
                    </p>
                  </div>

                  <div className="pt-2 mt-2 border-t border-stone-100 flex items-center justify-between text-[10.5px] text-stone-400 font-ui">
                    <span className="text-[#183A2D] font-semibold group-hover:text-emerald-700 transition-colors">
                      Bảo chứng CLOOP
                    </span>
                    <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform text-stone-400 group-hover:text-[#183A2D]" />
                  </div>
                </div>
              </Link>
            ))}
          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
}
