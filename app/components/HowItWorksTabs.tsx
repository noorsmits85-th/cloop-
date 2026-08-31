"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  Truck, 
  RotateCcw, 
  Camera, 
  ShieldCheck, 
  Wallet, 
  ArrowRight,
  CheckCircle2
} from "lucide-react";

export default function HowItWorksTabs() {
  const [activeTab, setActiveTab] = useState<"renter" | "lender">("renter");

  const renterSteps = [
    {
      step: "01",
      icon: Calendar,
      title: "Chọn Món Đồ & Ngày Thuê",
      desc: "Khám phá hàng nghìn thiết kế độc quyền từ tủ đồ của cộng đồng với chi phí chỉ bằng 10% giá mua mới.",
      highlight: "Két Escrow bảo chứng 100% tiền cọc an toàn"
    },
    {
      step: "02",
      icon: Truck,
      title: "Nhận Đồ Chuẩn Spa Tại Nhà",
      desc: "Trang phục được giặt hấp thơm tho, kiểm định chất lượng và giao tận cửa trước ngày sự kiện của bạn.",
      highlight: "Miễn phí bảo hiểm hư tổn nhẹ"
    },
    {
      step: "03",
      icon: RotateCcw,
      title: "Tỏa Sáng & Shipper Đến Lấy",
      desc: "Mặc đẹp tại bữa tiệc, sau đó chỉ cần đóng gói lại. Shipper sẽ đến lấy trả đồ và cọc được tự động hoàn về ví.",
      highlight: "Không cần tự giặt ủi sau khi mặc"
    }
  ];

  const lenderSteps = [
    {
      step: "01",
      icon: Camera,
      title: "Đăng Đồ Trong 2 Phút",
      desc: "Chụp ảnh chiếc đầm hoặc phụ kiện nhàn rỗi, đặt mức giá thuê mong muốn và tải lên CLOOP hoàn toàn miễn phí.",
      highlight: "Tự do duyệt hoặc từ chối yêu cầu thuê"
    },
    {
      step: "02",
      icon: ShieldCheck,
      title: "Bảo Chứng Cọc 100%",
      desc: "Khách thuê đặt cọc 100% giá trị qua Két Escrow trước khi bạn gửi đồ, đảm bảo tài sản luôn an toàn.",
      highlight: "Hợp đồng điện tử minh bạch từng đơn"
    },
    {
      step: "03",
      icon: Wallet,
      title: "Nhận Thu Nhập Thụ Động",
      desc: "Tiền thuê chuyển thẳng về ví sau khi đơn hoàn tất. Rút về tài khoản ngân hàng bất kỳ chỉ trong 30 giây.",
      highlight: "Kiếm trung bình 5–15 triệu/tháng từ tủ đồ"
    }
  ];

  return (
    <section className="w-full py-16 md:py-20 bg-[#FAF9F5] border-y border-stone-200/80 font-ui">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[10.5px] font-bold uppercase tracking-widest">
            QUY TRÌNH THỜI TRANG CHIA SẺ
          </span>
          <h2 className="font-heading text-2xl sm:text-4xl md:text-5xl font-extrabold text-[#0A2517] tracking-tight">
            Cách CLOOP Hoạt Động
          </h2>
          <p className="font-body text-stone-600 text-xs sm:text-sm md:text-base font-light leading-relaxed">
            Dù bạn muốn thuê đồ đi tiệc hay chia sẻ tủ đồ kiếm thêm thu nhập, mọi quy trình đều diễn ra nhanh chóng, minh bạch và an toàn tuyệt đối.
          </p>
        </div>

        {/* Dual Switch Tabs */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex p-1.5 rounded-full bg-stone-200/70 border border-stone-300/80 shadow-inner">
            <button
              onClick={() => setActiveTab("renter")}
              className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-heading font-extrabold tracking-wider uppercase transition-all duration-300 cursor-pointer ${
                activeTab === "renter"
                  ? "bg-[#183A2D] text-white shadow-md"
                  : "text-stone-600 hover:text-[#183A2D]"
              }`}
            >
              👗 Dành Cho Người Thuê
            </button>
            <button
              onClick={() => setActiveTab("lender")}
              className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-heading font-extrabold tracking-wider uppercase transition-all duration-300 cursor-pointer ${
                activeTab === "lender"
                  ? "bg-[#183A2D] text-white shadow-md"
                  : "text-stone-600 hover:text-[#183A2D]"
              }`}
            >
              💎 Dành Cho Chủ Tủ
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "renter" ? (
            <motion.div
              key="renter-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-10"
            >
              {/* 3 Step Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {renterSteps.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl p-7 md:p-8 border border-stone-200/80 shadow-xs hover:shadow-md hover:border-[#183A2D]/40 transition-all flex flex-col justify-between space-y-6"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-[#183A2D] flex items-center justify-center">
                            <Icon size={22} />
                          </div>
                          <span className="font-mono text-2xl font-extrabold text-stone-300">
                            {item.step}
                          </span>
                        </div>
                        <h3 className="font-heading text-lg sm:text-xl font-bold text-[#0A2517]">
                          {item.title}
                        </h3>
                        <p className="font-body text-xs sm:text-sm text-stone-600 font-light leading-relaxed">
                          {item.desc}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-stone-100 flex items-center gap-2 text-[11px] font-semibold text-emerald-800">
                        <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                        <span>{item.highlight}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Button */}
              <div className="flex justify-center pt-2">
                <Link
                  href="/shop?type=rent"
                  className="px-8 py-4 bg-[#183A2D] hover:bg-[#112a20] text-white font-heading font-extrabold rounded-full text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 shadow-md hover:scale-105 flex items-center gap-2"
                >
                  <span>Khám Phá & Thuê Đồ Ngay</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="lender-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-10"
            >
              {/* 3 Step Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {lenderSteps.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl p-7 md:p-8 border border-stone-200/80 shadow-xs hover:shadow-md hover:border-[#183A2D]/40 transition-all flex flex-col justify-between space-y-6"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-900 flex items-center justify-center">
                            <Icon size={22} />
                          </div>
                          <span className="font-mono text-2xl font-extrabold text-stone-300">
                            {item.step}
                          </span>
                        </div>
                        <h3 className="font-heading text-lg sm:text-xl font-bold text-[#0A2517]">
                          {item.title}
                        </h3>
                        <p className="font-body text-xs sm:text-sm text-stone-600 font-light leading-relaxed">
                          {item.desc}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-stone-100 flex items-center gap-2 text-[11px] font-semibold text-amber-900">
                        <CheckCircle2 size={14} className="shrink-0 text-amber-700" />
                        <span>{item.highlight}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Button */}
              <div className="flex justify-center pt-2">
                <Link
                  href="/my-closet/create?mode=rent"
                  className="px-8 py-4 bg-[#183A2D] hover:bg-[#112a20] text-white font-heading font-extrabold rounded-full text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 shadow-md hover:scale-105 flex items-center gap-2"
                >
                  <span>Bắt Đầu Đăng Tủ Cho Thuê</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}
