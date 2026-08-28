"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  Leaf, 
  ArrowRight, 
  Wallet, 
  Camera, 
  Award, 
  HeartHandshake,
  CheckCircle2,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MarketingLoopShowcase() {
  const [roleTab, setRoleTab] = useState<"RENTER" | "OWNER">("RENTER");

  const renterSteps = [
    {
      step: "01",
      icon: "✨",
      title: "Chọn Đồ & AI Stylist Gợi Ý",
      desc: "Lướt hàng nghìn mẫu đầm dạ hội, áo dài, blazer thiết kế. Dùng AI Stylist quét dáng người hoặc tải ảnh để tìm mẫu ưng ý chỉ trong 1 giây.",
      tag: "AI Trợ Lý 24/7"
    },
    {
      step: "02",
      icon: "🚚",
      title: "Giao Tận Nơi & Két Cọc Escrow",
      desc: "Shipper giao trang phục thơm tho tận cửa. Tiền cọc được khóa bảo chứng an toàn 100% trong Két Escrow trung gian của CLOOP.",
      tag: "Bảo Chứng 100%"
    },
    {
      step: "03",
      icon: "💃",
      title: "Tỏa Sáng Trong Mọi Sự Kiện",
      desc: "Tự tin diện đồ xịn chụp ảnh, dự tiệc, đám cưới, kỷ yếu sang chảnh mà chỉ tốn từ 10% giá mua mới. Không còn nỗi lo 'mặc 1 lần rồi bỏ xó'.",
      tag: "Tiết Kiệm 90%"
    },
    {
      step: "04",
      icon: "🌿",
      title: "Hoàn Trả & Tích Điểm Green Pts",
      desc: "Shipper đến tận nơi lấy đồ về. Tiền cọc tự động hoàn 100% về ví, cộng thêm +50 Điểm Green Pts nâng hạng uy tín Trustworthy.",
      tag: "+50 Green Pts"
    }
  ];

  const ownerSteps = [
    {
      step: "01",
      icon: "📸",
      title: "Chụp Ảnh Đăng Tủ Trong 30 Giây",
      desc: "Chụp ảnh váy áo nhàn rỗi trong tủ. AI Gemini tự động nhận diện thương hiệu, chất liệu, màu sắc và đề xuất giá thuê tối ưu.",
      tag: "AI Tự Điền Form"
    },
    {
      step: "02",
      icon: "📦",
      title: "Shipper Đến Tận Nhà Nhận Đồ",
      desc: "Khi có khách thuê, shipper GHTK/Ahamove đến tận nhà lấy hàng mang đi giao. Bạn không cần tự chạy đi gửi hàng vất vả.",
      tag: "Lấy Hàng Tận Cửa"
    },
    {
      step: "03",
      icon: "💰",
      title: "Nhận Tiền Thuê & Rút Về STK",
      desc: "Sau khi đơn thuê hoàn tất, tiền thuê cộng thẳng vào Ví CLOOP. Rút tiền về bất kỳ tài khoản ngân hàng chính chủ nào trong 30 giây.",
      tag: "Thu Nhập Thụ Động"
    },
    {
      step: "04",
      icon: "🏆",
      title: "Tích Lũy Chỉ Số ESG & Huy Hiệu Shop",
      desc: "Tủ đồ của bạn được vinh danh trong mạng lưới sống xanh: đo lường lượng CO₂ giảm thải, tiết kiệm nước và gắn huy hiệu Top Shop.",
      tag: "Chứng Nhận Xanh ESG"
    }
  ];

  const currentSteps = roleTab === "RENTER" ? renterSteps : ownerSteps;

  return (
    <section className="w-full py-14 md:py-20 bg-gradient-to-b from-[#FAF9F5] via-[#F4F1EA] to-[#FAF9F5] text-stone-800 relative overflow-hidden border-y border-stone-200/70 font-body">
      
      {/* Background Subtle Patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(#183A2D_0.75px,transparent_0.75px)] opacity-[0.035] [background-size:20px_20px] pointer-events-none" />
      <div className="absolute -left-32 top-1/4 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -right-32 bottom-1/4 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 relative z-10 space-y-12">
        
        {/* HEADER MARKETING BANNER */}
        <div className="text-center max-w-3xl mx-auto space-y-3.5">
          <div className="inline-flex items-center gap-2 bg-[#183A2D] text-white px-3.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-widest shadow-xs font-ui">
            <Leaf size={13} className="text-emerald-400" />
            HỆ SINH THÁI THỜI TRANG TUẦN HOÀN CLOOP
          </div>
          
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-extrabold text-[#183A2D] tracking-normal leading-tight">
            Mặc Đẹp Không Giới Hạn • Tủ Đồ Sinh Lợi Nhuận
          </h2>
          
          <p className="text-stone-600 text-xs sm:text-sm md:text-base font-light leading-relaxed max-w-2xl mx-auto">
            Khám phá phương thức tiêu dùng thông minh thế hệ mới: Thuê đồ dạ hội thiết kế chỉ từ <span className="font-bold text-[#183A2D]">10% giá gốc</span> hoặc biến tủ đồ đang ngủ đông thành <span className="font-bold text-[#183A2D]">dòng tiền thụ động an toàn 100%</span>.
          </p>

          {/* ROLE SWITCHER PILL */}
          <div className="pt-3 flex justify-center">
            <div className="bg-stone-200/80 p-1.5 rounded-full inline-flex gap-1 border border-stone-300/80 shadow-inner">
              <button
                type="button"
                onClick={() => setRoleTab("RENTER")}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer font-ui flex items-center gap-2 ${
                  roleTab === "RENTER"
                    ? "bg-[#183A2D] text-white shadow-md scale-100"
                    : "text-stone-600 hover:text-[#183A2D]"
                }`}
              >
                <span>👗</span> Tôi Muốn Thuê Đồ Mặc Tiệc
              </button>
              <button
                type="button"
                onClick={() => setRoleTab("OWNER")}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer font-ui flex items-center gap-2 ${
                  roleTab === "OWNER"
                    ? "bg-[#183A2D] text-white shadow-md scale-100"
                    : "text-stone-600 hover:text-[#183A2D]"
                }`}
              >
                <span>📦</span> Tôi Muốn Cho Thuê Kiếm Tiền
              </button>
            </div>
          </div>
        </div>

        {/* 4-STEP WORKFLOW CARDS */}
        <AnimatePresence mode="wait">
          <motion.div
            key={roleTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {currentSteps.map((item, idx) => (
              <div
                key={idx}
                className="group relative bg-white/90 backdrop-blur-xs border border-stone-200/90 rounded-2xl p-6 shadow-xs hover:shadow-xl hover:border-emerald-700/40 transition-all duration-300 flex flex-col justify-between text-left hover:-translate-y-1"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl p-2.5 bg-[#FAF9F5] rounded-xl border border-stone-200/60 shadow-2xs group-hover:scale-110 transition-transform">
                      {item.icon}
                    </span>
                    <span className="font-mono text-2xl font-black text-stone-200 group-hover:text-emerald-800/30 transition-colors">
                      {item.step}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="inline-block text-[9.5px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 font-ui uppercase tracking-wider">
                      {item.tag}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-[#183A2D] font-heading leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-stone-600 leading-relaxed font-light">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400 group-hover:text-[#183A2D] font-bold transition-colors">
                  <span>Bước {item.step}</span>
                  <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* 4 PILLARS BENTO GRID: TẠI SAO CHỌN CLOOP? */}
        <div className="bg-[#183A2D] text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 font-ui">
                CAM KẾT CHUẨN MỰC THƯƠNG MẠI ĐIỆN TỬ
              </span>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold font-heading text-white">
                4 Bảo Chứng Vàng Khi Tham Gia CLOOP
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Pillar 1 */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xs space-y-2 hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                  <ShieldCheck size={22} />
                </div>
                <h4 className="text-sm font-bold text-white">Két Escrow Giữ Cọc</h4>
                <p className="text-xs text-stone-300 leading-relaxed font-light">
                  Tiền cọc được khóa trung gian bởi hệ thống, tự động hoàn trả 100% khi nhận lại đồ nguyên vẹn.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xs space-y-2 hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                  <Lock size={22} />
                </div>
                <h4 className="text-sm font-bold text-white">Định Danh Bank-KYC</h4>
                <p className="text-xs text-stone-300 leading-relaxed font-light">
                  So khớp danh tính tài khoản ngân hàng chính chủ, chống 100% rửa tiền và gian lận rút trộm.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xs space-y-2 hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold">
                  <Award size={22} />
                </div>
                <h4 className="text-sm font-bold text-white">Điểm Xanh Green Pts</h4>
                <p className="text-xs text-stone-300 leading-relaxed font-light">
                  Đo lường chỉ số CO₂ & Nước tiết kiệm được, nâng hạng Trustworthy và giảm đến 50% tiền cọc.
                </p>
              </div>

              {/* Pillar 4 */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xs space-y-2 hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                  <HeartHandshake size={22} />
                </div>
                <h4 className="text-sm font-bold text-white">Đánh Giá Mù 2 Chiều</h4>
                <p className="text-xs text-stone-300 leading-relaxed font-light">
                  Cơ chế Double-Blind chuẩn Airbnb: Chỉ công khai khi cả hai bên cùng đánh giá, chấm dứt việc trả thù sao xấu.
                </p>
              </div>

            </div>

            {/* CALL TO ACTION BUTTONS */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/shop"
                className="w-full sm:w-auto px-7 py-3.5 bg-white text-[#183A2D] hover:bg-stone-100 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-xl text-center font-ui"
              >
                👗 Khám Phá Kho Đồ Thuê Ngay
              </Link>
              <Link
                href="/my-closet/create"
                className="w-full sm:w-auto px-7 py-3.5 bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all border border-emerald-600/50 shadow-md text-center font-ui flex items-center justify-center gap-2"
              >
                <Camera size={15} /> Đăng Tủ Đồ Kiếm Tiền (30s)
              </Link>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
