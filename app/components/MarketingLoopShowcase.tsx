"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function MarketingLoopShowcase() {
  const [roleTab, setRoleTab] = useState<"RENTER" | "OWNER">("RENTER");
  const [hoveredIdx, setHoveredIdx] = useState<number>(0);

  const renterSteps = [
    {
      num: "01",
      title: "Tìm & Ướm Dáng",
      subtitle: "Bốc đồ chuẩn gu",
      desc: "Khám phá hàng ngàn outfit độc bản. Stylist tư vấn thông số chiều cao cân nặng để chọn size chuẩn xác.",
      image: "/step1_phone.jpg",
      link: "/shop"
    },
    {
      num: "02",
      title: "Nhận & An Tâm",
      subtitle: "Két cọc an toàn",
      desc: "Giao tận tay thơm tho tươm tất. Tiền cọc được giữ an toàn qua Két Escrow, chỉ giải ngân khi bạn ưng ý.",
      image: "/step2_bag.jpg",
      link: "/shop"
    },
    {
      num: "03",
      title: "Diện & Tỏa Sáng",
      subtitle: "Tối đa trải nghiệm",
      desc: "Tự tin ghi dấu ấn rực rỡ tại sự kiện với chi phí chỉ từ 10% giá mua mới. Diện đồ hiệu không áp lực tài chính.",
      image: "/step3_party.jpg",
      link: "/shop"
    },
    {
      num: "04",
      title: "Trả & Tuần Hoàn",
      subtitle: "Hoàn cọc tức thì",
      desc: "Shipper nhận lại tận nhà. Tiền cọc tự động hoàn 100% về ví cùng điểm xanh tích lũy cho lần thuê kế tiếp.",
      image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=900",
      link: "/shop"
    }
  ];

  const ownerSteps = [
    {
      num: "01",
      title: "Đăng Tủ 30 Giây",
      subtitle: "Gợi ý giá chuẩn",
      desc: "Chụp ảnh trang phục nhàn rỗi. Hệ thống tự động phân loại chất liệu và đề xuất mức giá thuê hấp dẫn nhất.",
      image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=900",
      link: "/my-closet/create"
    },
    {
      num: "02",
      title: "Giao Nhận Tận Cửa",
      subtitle: "Không tốn công đi",
      desc: "Xác nhận lịch thuê trên app. Shipper đến lấy hàng tận nhà và giao đến khách, bạn chỉ việc đóng gói xinh xắn.",
      image: "/step2_bag.jpg",
      link: "/my-closet"
    },
    {
      num: "03",
      title: "Thu Nhập Thụ Động",
      subtitle: "Rút tiền chính chủ",
      desc: "Tiền thuê tự động cộng vào ví sau mỗi chuyến đi. Rút về tài khoản ngân hàng trong 30 giây với 0% phí sàn 3 tháng đầu.",
      image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=900",
      link: "/my-closet"
    },
    {
      num: "04",
      title: "Định Danh Xanh",
      subtitle: "Huy hiệu uy tín",
      desc: "Tích lũy chỉ số giảm phát thải CO₂, nâng hạng Tủ Đồ Uy Tín và mở khóa thuật toán ưu tiên hiển thị trên toàn sàn.",
      image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=900",
      link: "/my-closet"
    }
  ];

  const currentSteps = roleTab === "RENTER" ? renterSteps : ownerSteps;

  return (
    <section className="w-full bg-[#FAF9F5] border-b border-stone-200/80 py-10 md:py-16 text-[#183A2D] font-body">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 space-y-6 md:space-y-8">
        
        {/* 1. HEADER TINH GỌN, SANG TRỌNG */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200/80 pb-4">
          <div>
            <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-stone-400 font-mono">
              THE CIRCULAR JOURNEY • 01 — 04
            </span>
            <h2 className="font-heading text-xl sm:text-2xl md:text-3xl font-extrabold text-[#183A2D] tracking-tight mt-0.5">
              Hành Trình Tủ Đồ Tuần Hoàn
            </h2>
          </div>

          {/* 2 TAB TỐI GIẢN CHUẨN FASHION EDITORIAL */}
          <div className="inline-flex items-center gap-1 p-1 bg-stone-200/60 rounded-full font-ui self-start md:self-auto text-xs">
            <button
              type="button"
              onClick={() => { setRoleTab("RENTER"); setHoveredIdx(0); }}
              className={`px-4 py-1.5 rounded-full font-bold tracking-wider transition-all cursor-pointer ${
                roleTab === "RENTER"
                  ? "bg-[#183A2D] text-white shadow-xs"
                  : "text-stone-600 hover:text-[#183A2D]"
              }`}
            >
              Tôi muốn thuê đồ
            </button>
            <button
              type="button"
              onClick={() => { setRoleTab("OWNER"); setHoveredIdx(0); }}
              className={`px-4 py-1.5 rounded-full font-bold tracking-wider transition-all cursor-pointer ${
                roleTab === "OWNER"
                  ? "bg-[#183A2D] text-white shadow-xs"
                  : "text-stone-600 hover:text-[#183A2D]"
              }`}
            >
              Tôi muốn cho thuê
            </button>
          </div>
        </div>

        {/* 2. DÀI THỜI TRANG KINETIC ACCORDION (CHUYỂN ĐỘNG CO GIÃN MƯỢT MÀ THEO CHUẨN LUXURY) */}
        <div className="hidden md:flex gap-3 h-[420px] w-full items-stretch">
          {currentSteps.map((step, idx) => {
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-700 ease-out border border-stone-200/80 flex flex-col justify-end p-5 lg:p-6 ${
                  isHovered 
                    ? "flex-[3.5] shadow-xl border-[#183A2D]" 
                    : "flex-[1] hover:flex-[1.2] shadow-2xs opacity-85 hover:opacity-100"
                }`}
              >
                {/* Background Image */}
                <Image
                  src={step.image}
                  alt={step.title}
                  fill
                  className={`object-cover transition-transform duration-1000 ease-out ${
                    isHovered ? "scale-105 brightness-95" : "scale-100 brightness-[0.75]"
                  }`}
                  unoptimized
                />

                {/* Dark Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-t transition-opacity duration-500 pointer-events-none ${
                  isHovered ? "from-black/85 via-black/20 to-transparent" : "from-black/90 via-black/40 to-transparent"
                }`} />

                {/* Step Number Top */}
                <div className="absolute top-4 left-4 z-10">
                  <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md backdrop-blur-md transition-colors ${
                    isHovered ? "bg-white text-[#183A2D] shadow-xs" : "bg-black/40 text-white/80 border border-white/20"
                  }`}>
                    0{idx + 1}
                  </span>
                </div>

                {/* Content Overlay */}
                <div className="relative z-10 text-white space-y-1.5">
                  <span className="text-[9.5px] uppercase font-bold tracking-widest text-emerald-300 font-ui block">
                    {step.subtitle}
                  </span>

                  <h3 className={`font-heading font-extrabold leading-tight transition-all ${
                    isHovered ? "text-lg lg:text-xl text-white" : "text-sm text-white/90 line-clamp-1"
                  }`}>
                    {step.title}
                  </h3>

                  {isHovered ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-3 pt-1"
                    >
                      <p className="text-xs text-stone-200 font-light leading-relaxed max-w-md line-clamp-3">
                        {step.desc}
                      </p>

                      <Link
                        href={step.link}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-white uppercase tracking-wider font-ui pt-1 transition-colors group"
                      >
                        <span>{roleTab === "RENTER" ? "Khám phá ngay" : "Bắt đầu ngay"}</span>
                        <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </motion.div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* 📱 MOBILE VIEW: 4 Thẻ Vuông Gọn Gàng */}
        <div className="md:hidden grid grid-cols-2 gap-3">
          {currentSteps.map((step, idx) => (
            <Link
              key={idx}
              href={step.link}
              className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-stone-200 flex flex-col justify-end p-3 shadow-xs"
            >
              <Image
                src={step.image}
                alt={step.title}
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              
              <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                0{idx + 1}
              </div>

              <div className="relative z-10 text-white space-y-0.5">
                <span className="text-[8.5px] uppercase font-bold text-emerald-300 font-ui block">{step.subtitle}</span>
                <h3 className="font-heading font-bold text-xs leading-snug line-clamp-1">{step.title}</h3>
              </div>
            </Link>
          ))}
        </div>

        {/* 3. TUYÊN NGÔN BẤT HỦ & CTA CHUẨN BY ROTATION */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-stone-200/70 text-stone-500 text-xs">
          <div className="font-heading font-bold tracking-[0.3em] uppercase text-[#183A2D] text-xs sm:text-sm">
            WORN • LOVED • LOOPED
          </div>

          <Link
            href={roleTab === "RENTER" ? "/shop" : "/my-closet/create"}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#183A2D] hover:bg-[#2C4233] text-white font-bold rounded-full text-xs uppercase tracking-wider transition-all font-ui shadow-xs hover:shadow-md"
          >
            <span>{roleTab === "RENTER" ? "Khám Phá Tủ Đồ Cho Thuê" : "Đăng Tủ Đồ Ngay"}</span>
            <ArrowRight size={13} />
          </Link>
        </div>

      </div>
    </section>
  );
}
