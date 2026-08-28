"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ArrowRight, 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MarketingLoopShowcase() {
  const [roleTab, setRoleTab] = useState<"RENTER" | "OWNER">("RENTER");

  const renterSteps = [
    {
      step: "01",
      title: "Chọn đồ & Ướm dáng",
      desc: "Khám phá hàng ngàn trang phục dạ hội, áo dài & blazer thiết kế tuyển chọn từ các chủ tủ uy tín.",
      meta: "Stylist 24/7",
      link: "/shop",
      action: "Khám phá ngay",
      image: "/step1_phone.jpg"
    },
    {
      step: "02",
      title: "Nhận đồ & Giữ cọc",
      desc: "Giao tận tay thơm tho tươm tất. Tiền cọc được bảo chứng an toàn tuyệt đối qua Két Escrow.",
      meta: "Két Escrow 100%",
      link: "/shop",
      action: "Bảo chứng an toàn",
      image: "/step2_bag.jpg"
    },
    {
      step: "03",
      title: "Tỏa sáng sự kiện",
      desc: "Tự tin ghi dấu ấn rực rỡ tại các bữa tiệc với chi phí chỉ từ 10% so với giá mua mới.",
      meta: "Tiết kiệm 90%",
      link: "/shop",
      action: "Tỏa sáng lộng lẫy",
      image: "/step3_party.jpg"
    },
    {
      step: "04",
      title: "Hoàn trả & Tích điểm",
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
      title: "Đăng tủ 30 giây",
      desc: "Chụp ảnh váy áo nhàn rỗi. Tự động đề xuất phân loại chuẩn xác & mức giá thuê chuẩn sàn.",
      meta: "Đăng đồ 30s",
      link: "/my-closet/create",
      action: "Bắt đầu đăng đồ",
      image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=600"
    },
    {
      step: "02",
      title: "Giao nhận tận cửa",
      desc: "Đối tác vận chuyển lấy hàng tận nơi, chủ tủ không cần tốn thời gian di chuyển.",
      meta: "Lấy hàng tại nhà",
      link: "/my-closet",
      action: "Giao nhận thảnh thơi",
      image: "/step2_bag.jpg"
    },
    {
      step: "03",
      title: "Thu nhập thụ động",
      desc: "Tiền thuê tự động cộng vào ví sau mỗi chuyến đi, rút về số tài khoản ngân hàng trong 30s.",
      meta: "Rút tiền chính chủ",
      link: "/my-closet",
      action: "Xem ví thu nhập",
      image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=600"
    },
    {
      step: "04",
      title: "Định danh xanh ESG",
      desc: "Đo lường CO₂ giảm thải, nâng hạng uy tín tủ đồ & nhận ưu đãi độc quyền từ CLOOP.",
      meta: "Huy hiệu Trustworthy",
      link: "/my-closet",
      action: "Tích điểm uy tín",
      image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=600"
    }
  ];

  const currentSteps = roleTab === "RENTER" ? renterSteps : ownerSteps;

  return (
    <section className="w-full bg-[#FAF9F5] border-b border-stone-200/70 py-8 md:py-12 text-[#183A2D] font-body">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 space-y-6 md:space-y-8">
        
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
              <Link
                key={idx}
                href={item.link}
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
              </Link>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* NÚT KÊU GỌI HÀNH ĐỘNG CHUẨN BY ROTATION */}
        <div className="flex justify-center pt-2">
          {roleTab === "RENTER" ? (
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#183A2D] hover:bg-[#2C4233] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all font-ui shadow-xs hover:shadow-md"
            >
              Khám Phá Toàn Bộ Tủ Đồ Cho Thuê <ArrowRight size={13} />
            </Link>
          ) : (
            <Link
              href="/my-closet/create"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#183A2D] hover:bg-[#2C4233] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all font-ui shadow-xs hover:shadow-md"
            >
              Đăng Tủ Đồ & Bắt Đầu Kiếm Tiền <ArrowRight size={13} />
            </Link>
          )}
        </div>

      </div>
    </section>
  );
}
