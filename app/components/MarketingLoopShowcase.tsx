"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ShieldCheck, 
  Lock, 
  Leaf, 
  Award,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MarketingLoopShowcase() {
  const [roleTab, setRoleTab] = useState<"RENTER" | "OWNER">("RENTER");

  const renterSteps = [
    {
      step: "01",
      title: "Lướt & Chọn Đồ",
      meta: "AI Stylist 24/7",
      img: "/step1_phone.jpg",
      caption: "Ướm dáng chuẩn xác qua AI"
    },
    {
      step: "02",
      title: "Nhận Đồ Chuẩn Spa",
      meta: "Két Escrow 100%",
      img: "/step2_bag.jpg",
      caption: "Giao tận tay, cọc an toàn"
    },
    {
      step: "03",
      title: "Tỏa Sáng Sự Kiện",
      meta: "Tiết Kiệm 90%",
      img: "/evening_dress.jpg",
      caption: "Diện thiết kế cao cấp"
    },
    {
      step: "04",
      title: "Thu Hồi & Nhả Cọc",
      meta: "+50 Green Pts",
      img: "/hero_warm.jpg",
      caption: "Shipper nhận lại tận nơi"
    }
  ];

  const ownerSteps = [
    {
      step: "01",
      title: "Đăng Tủ 30 Giây",
      meta: "AI Auto-Fill",
      img: "/vintage_coat.jpg",
      caption: "Tự điền thông số & giá thuê"
    },
    {
      step: "02",
      title: "Lấy Hàng Tận Cửa",
      meta: "Shipper Thu Gom",
      img: "/step2_bag.jpg",
      caption: "Chủ tủ không cần di chuyển"
    },
    {
      step: "03",
      title: "Thu Nhập Thụ Động",
      meta: "Rút Về STK 30s",
      img: "/1.1.jpg",
      caption: "Tiền thuê cộng vào ví tức thì"
    },
    {
      step: "04",
      title: "Hạng Xanh ESG",
      meta: "Shop Uy Tín",
      img: "/hero_group.jpg",
      caption: "Đo lường CO₂ giảm phát thải"
    }
  ];

  const currentSteps = roleTab === "RENTER" ? renterSteps : ownerSteps;

  return (
    <section className="w-full bg-[#F5F2EB] border-y border-stone-200/80 py-12 md:py-16 text-[#183A2D] font-body">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 space-y-8">
        
        {/* HEADER CANH GIỮA HOẶC 2 BÊN GỌN GÀNG */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-300/60 pb-4">
          <div className="space-y-1">
            <span className="text-[9.5px] uppercase font-bold tracking-[0.2em] text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-md border border-emerald-200 font-ui inline-block">
              QUY TRÌNH THỜI TRANG TUẦN HOÀN
            </span>
            <h2 className="font-heading text-xl sm:text-2xl md:text-3xl font-extrabold text-[#183A2D] tracking-normal mt-1">
              Vận Hành Tủ Đồ Trong 4 Bước
            </h2>
          </div>

          {/* TAB CHUYỂN ĐỔI THANH LỊCH */}
          <div className="inline-flex items-center gap-1 p-1 bg-white rounded-xl border border-stone-200 shadow-2xs font-ui self-start md:self-auto">
            <button
              type="button"
              onClick={() => setRoleTab("RENTER")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                roleTab === "OWNER"
                  ? "bg-[#183A2D] text-white shadow-xs"
                  : "text-stone-600 hover:text-[#183A2D]"
              }`}
            >
              Tôi Muốn Cho Thuê
            </button>
          </div>
        </div>

        {/* 4 BƯỚC HÌNH ẢNH LOOKBOOK THỜI TRANG (ÍT CHỮ, TẬP TRUNG THỊ GIÁC) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={roleTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {currentSteps.map((item, idx) => (
              <div
                key={idx}
                className="group bg-white rounded-2xl p-3 border border-stone-200/80 hover:border-emerald-800/60 hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Visual Lookbook Image */}
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3 bg-stone-100">
                  <Image 
                    src={item.img} 
                    alt={item.title} 
                    fill 
                    className="object-cover transition-transform duration-700 group-hover:scale-105" 
                    unoptimized 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                  
                  {/* Step Number Badge */}
                  <div className="absolute top-2.5 left-2.5 bg-[#183A2D]/90 backdrop-blur-xs text-white text-[10.5px] font-mono font-extrabold px-2 py-0.5 rounded-md shadow-xs">
                    {item.step}
                  </div>

                  {/* Feature Tag */}
                  <div className="absolute bottom-2 left-2.5 bg-black/70 backdrop-blur-xs text-white text-[8.5px] font-ui font-semibold px-2 py-0.5 rounded">
                    {item.meta}
                  </div>
                </div>

                {/* Punchy Editorial Caption (Zero Wall of Text) */}
                <div className="px-1 space-y-0.5">
                  <h3 className="text-sm font-bold text-[#183A2D] font-heading group-hover:text-emerald-800 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-stone-500 font-light line-clamp-1">
                    {item.caption}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* 4 THANH CAM KẾT BẢO CHỨNG MINH BẠCH - NỀN TRẮNG TINH TẾ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-stone-200/80 text-left shadow-2xs">
            <ShieldCheck size={18} strokeWidth={1.5} className="text-emerald-800 shrink-0" />
            <div className="leading-tight">
              <p className="text-xs font-bold text-[#183A2D]">Két Cọc Escrow</p>
              <p className="text-[10px] text-stone-500 font-light">Hoàn cọc 100% khi trả đồ</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-stone-200/80 text-left shadow-2xs">
            <Lock size={18} strokeWidth={1.5} className="text-emerald-800 shrink-0" />
            <div className="leading-tight">
              <p className="text-xs font-bold text-[#183A2D]">Định Danh Bank-KYC</p>
              <p className="text-[10px] text-stone-500 font-light">Rút tiền về STK chính chủ</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-stone-200/80 text-left shadow-2xs">
            <Leaf size={18} strokeWidth={1.5} className="text-emerald-800 shrink-0" />
            <div className="leading-tight">
              <p className="text-xs font-bold text-[#183A2D]">Điểm Green Pts</p>
              <p className="text-[10px] text-stone-500 font-light">Giảm đến 50% tiền cọc</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-stone-200/80 text-left shadow-2xs">
            <Award size={18} strokeWidth={1.5} className="text-emerald-800 shrink-0" />
            <div className="leading-tight">
              <p className="text-xs font-bold text-[#183A2D]">Đánh Giá 2 Chiều</p>
              <p className="text-[10px] text-stone-500 font-light">Minh bạch chuẩn Airbnb</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
