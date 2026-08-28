"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MarketingLoopShowcase() {
  const [roleTab, setRoleTab] = useState<"RENTER" | "OWNER">("RENTER");
  const [activeStep, setActiveStep] = useState<number>(0);

  const renterSteps = [
    {
      step: "01",
      title: "Chọn Đồ & Ướm Dáng Cùng Stylist",
      desc: "Khám phá hàng ngàn trang phục dạ hội, áo dài & blazer thiết kế tuyển chọn từ các chủ tủ uy tín. Nhận tư vấn mix đồ chuẩn gu trong 60 giây.",
      meta: "Stylist 24/7",
      link: "/shop",
      action: "Khám phá ngay",
      image: "/step1_phone.jpg"
    },
    {
      step: "02",
      title: "Nhận Đồ Tận Tay & Giữ Cọc An Toàn",
      desc: "Giao tận tay thơm tho, là phẳng tươm tất. Tiền cọc được bảo chứng an toàn tuyệt đối qua Két Escrow, sàn chỉ giải ngân khi hai bên hài lòng.",
      meta: "Két Escrow 100%",
      link: "/shop",
      action: "Bảo chứng an toàn",
      image: "/step2_bag.jpg"
    },
    {
      step: "03",
      title: "Tỏa Sáng Rực Rỡ Tại Sự Kiện",
      desc: "Tự tin ghi dấu ấn khó phai tại đêm tiệc hay buổi chụp ảnh với chi phí chỉ từ 10% so với giá mua mới. Không áp lực chi tiêu, tối đa trải nghiệm.",
      meta: "Tiết Kiệm 90%",
      link: "/shop",
      action: "Tỏa sáng lộng lẫy",
      image: "/step3_party.jpg"
    },
    {
      step: "04",
      title: "Hoàn Trả Nhẹ Nhàng & Tích Điểm Xanh",
      desc: "Đóng gói trả đồ tận nơi tiện lợi qua đối tác vận chuyển. Tiền cọc tự động hoàn 100% về ví cùng điểm thưởng Green Pts để giảm giá lần thuê sau.",
      meta: "+50 Green Pts",
      link: "/shop",
      action: "Hoàn cọc tức thì",
      image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=800"
    }
  ];

  const ownerSteps = [
    {
      step: "01",
      title: "Đăng Tủ Đồ Trong 30 Giây",
      desc: "Chụp ảnh váy áo nhàn rỗi trong tủ. Hệ thống tự động đề xuất phân loại, mô tả chi tiết và gợi ý mức giá thuê tối ưu nhất theo thị trường.",
      meta: "Đăng Đồ 30s",
      link: "/my-closet/create",
      action: "Bắt đầu đăng đồ",
      image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=800"
    },
    {
      step: "02",
      title: "Giao Nhận Tận Cửa Thảnh Thơi",
      desc: "Xác nhận lịch thuê trên ứng dụng. Shipper đến lấy hàng tận nhà và giao đến tay khách, chủ tủ không cần tốn thời gian di chuyển.",
      meta: "Lấy Hàng Tại Nhà",
      link: "/my-closet",
      action: "Giao nhận thảnh thơi",
      image: "/step2_bag.jpg"
    },
    {
      step: "03",
      title: "Thu Nhập Thụ Động Tự Động Về Ví",
      desc: "Tiền thuê cộng vào ví ngay khi đơn hàng hoàn tất. Rút về tài khoản ngân hàng chính chủ trong 30 giây, minh bạch 100%.",
      meta: "Rút Tiền Chính Chủ",
      link: "/my-closet",
      action: "Xem ví thu nhập",
      image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=800"
    },
    {
      step: "04",
      title: "Định Danh Xanh & Nâng Hạng Shop",
      desc: "Đo lường lượng CO₂ giảm thải từ mỗi lượt cho thuê, tích lũy điểm ESG để nâng hạng Tủ Đồ Uy Tín và nhận thêm ưu đãi độc quyền.",
      meta: "Shop Uy Tín",
      link: "/my-closet",
      action: "Tích điểm uy tín",
      image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=800"
    }
  ];

  const currentSteps = roleTab === "RENTER" ? renterSteps : ownerSteps;

  const handleRoleChange = (role: "RENTER" | "OWNER") => {
    setRoleTab(role);
    setActiveStep(0);
  };

  return (
    <section className="w-full bg-[#FAF9F5] border-b border-stone-200/70 py-10 md:py-16 text-[#183A2D] font-body">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 space-y-8 md:space-y-10">
        
        {/* HEADER TẠP CHÍ EDITORIAL */}
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

          {/* TAB CHUYỂN ĐỔI */}
          <div className="inline-flex items-center gap-1 p-1 bg-stone-200/70 rounded-lg font-ui self-start md:self-auto shadow-2xs">
            <button
              type="button"
              onClick={() => handleRoleChange("RENTER")}
              className={`px-4 py-2 rounded-md text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                roleTab === "RENTER"
                  ? "bg-[#183A2D] text-white shadow-xs"
                  : "text-stone-600 hover:text-[#183A2D]"
              }`}
            >
              Tôi Muốn Thuê Đồ
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange("OWNER")}
              className={`px-4 py-2 rounded-md text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                roleTab === "OWNER"
                  ? "bg-[#183A2D] text-white shadow-xs"
                  : "text-stone-600 hover:text-[#183A2D]"
              }`}
            >
              Tôi Muốn Cho Thuê
            </button>
          </div>
        </div>

        {/* 🌟 GIAO DIỆN TABS TƯƠNG TÁC (INTERACTIVE STEPPER - STRIPE/APPLE STYLE) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-stretch">
          
          {/* CỘT TRÁI (40% - 5 COLS): DANH SÁCH 4 BƯỚC TƯƠNG TÁC */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-2.5">
            <div className="space-y-2">
              {currentSteps.map((item, idx) => {
                const isActive = activeStep === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveStep(idx)}
                    onMouseEnter={() => setActiveStep(idx)}
                    className={`group cursor-pointer rounded-xl p-3.5 sm:p-4 transition-all duration-300 border text-left ${
                      isActive 
                        ? "bg-white border-[#183A2D] shadow-sm translate-x-1" 
                        : "bg-white/40 border-stone-200/60 hover:bg-white/80 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-mono text-xs font-bold tracking-wider ${isActive ? "text-[#183A2D]" : "text-stone-400"}`}>
                        STEP {item.step}
                      </span>
                      <span className={`font-ui text-[9.5px] font-bold tracking-wider uppercase px-2 py-0.5 rounded ${
                        isActive 
                          ? "bg-emerald-50 text-emerald-900 border border-emerald-200" 
                          : "bg-stone-100 text-stone-500"
                      }`}>
                        {item.meta}
                      </span>
                    </div>

                    <h3 className={`font-heading text-sm sm:text-base font-bold transition-colors ${
                      isActive ? "text-[#183A2D]" : "text-stone-700"
                    }`}>
                      {item.title}
                    </h3>

                    {isActive && (
                      <p className="text-[11.5px] text-stone-500 font-light leading-relaxed mt-1 transition-all">
                        {item.desc}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* NÚT KÊU GỌI HÀNH ĐỘNG */}
            <div className="pt-2">
              {roleTab === "RENTER" ? (
                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[#183A2D] hover:bg-[#2C4233] text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all font-ui shadow-xs hover:shadow-md"
                >
                  Khám Phá Toàn Bộ Tủ Đồ Cho Thuê <ArrowRight size={13} />
                </Link>
              ) : (
                <Link
                  href="/my-closet/create"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[#183A2D] hover:bg-[#2C4233] text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all font-ui shadow-xs hover:shadow-md"
                >
                  Đăng Tủ Đồ & Bắt Đầu Kiếm Tiền <ArrowRight size={13} />
                </Link>
              )}
            </div>
          </div>

          {/* CỘT PHẢI (60% - 7 COLS): 1 KHUNG ẢNH LỚN ĐIỆN ẢNH CHUYỂN MƯỢT MÀ */}
          <div className="lg:col-span-7 relative min-h-[320px] sm:min-h-[380px] lg:min-h-full">
            <div className="relative w-full h-full min-h-[320px] sm:min-h-[380px] rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/80 shadow-md">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${roleTab}-${activeStep}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="absolute inset-0 w-full h-full"
                >
                  <Image
                    src={currentSteps[activeStep].image}
                    alt={currentSteps[activeStep].title}
                    fill
                    className="object-cover"
                    unoptimized
                    priority
                  />
                  {/* Gradient phủ tối mờ ở chân ảnh */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

                  {/* Caption thông tin đè trên ảnh */}
                  <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 text-white space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold bg-white text-[#183A2D] px-2 py-0.5 rounded font-ui uppercase shadow-xs">
                        BƯỚC {currentSteps[activeStep].step}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-300 font-ui uppercase tracking-wider">
                        {currentSteps[activeStep].meta}
                      </span>
                    </div>
                    <h4 className="font-heading text-lg sm:text-2xl font-bold text-white leading-tight drop-shadow-sm">
                      {currentSteps[activeStep].title}
                    </h4>
                    <p className="text-[11.5px] sm:text-xs text-stone-200 font-light line-clamp-2 max-w-xl leading-relaxed">
                      {currentSteps[activeStep].desc}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
