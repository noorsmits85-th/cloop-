"use client";

import React from "react";
import Link from "next/link";
import { 
  Sparkles, 
  Leaf, 
  TrendingUp, 
  Shirt, 
  ArrowRight, 
  CheckCircle2
} from "lucide-react";

export default function AboutCloopSection() {
  const valueProps = [
    {
      id: "renter",
      role: "DÀNH CHO NGƯỜI THUÊ",
      tag: "TIẾT KIỆM 90% CHI PHÍ",
      title: "Tự Do Biến Hóa Phong Cách",
      desc: "Trải nghiệm hàng ngàn thiết kế dạ hội, áo dài, váy tiệc hàng hiệu chỉ với 10% giá gốc. Mặc đẹp lung linh mọi sự kiện mà không lo chật tủ quần áo.",
      icon: Shirt,
      accentBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
      pillColor: "bg-[#183A2D] text-white",
      benefits: [
        "Thuê đồ linh hoạt 1 - 3 - 7 ngày theo nhu cầu",
        "Trang phục giặt ủi hấp thơm tho, giao tận cửa",
        "Két Escrow tự động hoàn cọc 100% khi trả đồ",
        "Tích lũy Điểm Lá (CloopCoins) đổi voucher giảm giá"
      ],
      linkText: "Khám Phá Sàn Thuê Đồ",
      linkHref: "/shop?type=rent"
    },
    {
      id: "lender",
      role: "DÀNH CHO CHỦ TỦ",
      tag: "THU NHẬP THỤ ĐỘNG",
      title: "Biến Tủ Đồ Nhàn Rỗi Thành Tiền",
      desc: "Quần áo bạn chỉ mặc 1-2 lần có thể mang lại 3 - 10 triệu/tháng. Đăng tải tủ đồ trong 1 phút, nhận tiền thuê tự động và bảo chứng an toàn tuyệt đối.",
      icon: TrendingUp,
      accentBg: "bg-amber-50 text-amber-900 border-amber-200",
      pillColor: "bg-amber-800 text-white",
      benefits: [
        "Bảo hiểm cọc Escrow 100% giá trị trang phục",
        "Shipper GHN đến tận nhà lấy & giao trả đồ",
        "Kiểm soát lịch thuê & duyệt đơn linh hoạt",
        "Thưởng +25 Lá mỗi đơn để Đẩy Top miễn phí"
      ],
      linkText: "Đăng Tủ Đồ Cho Thuê Ngay",
      linkHref: "/my-closet/create?mode=rent"
    },
    {
      id: "eco",
      role: "DÀNH CHO HÀNH TINH",
      tag: "LỐI SỐNG TUẦN HOÀN",
      title: "Thời Trang Bền Vững & Nhân Văn",
      desc: "Mỗi lượt thuê giúp kéo dài vòng đời trang phục, giảm thiểu hàng tấn khí thải carbon và rác thải dệt may. Cùng xây dựng thế hệ tiêu dùng thông thái.",
      icon: Leaf,
      accentBg: "bg-teal-50 text-teal-900 border-teal-200",
      pillColor: "bg-teal-800 text-white",
      benefits: [
        "Hộ chiếu số (Digital Passport) theo dõi CO₂ giảm",
        "Chợ Xanh Upcycle tái sinh vải thừa & đồ cũ",
        "Bảo tàng ký ức lưu giữ câu chuyện trang phục",
        "Cộng đồng tín đồ thời trang xanh gắn kết"
      ],
      linkText: "Khám Phá Sứ Mệnh Xanh",
      linkHref: "/my-closet/eco"
    }
  ];

  return (
    <section className="w-full py-14 sm:py-20 bg-gradient-to-b from-[#FAF9F5] via-[#F4F1EA] to-[#FAF9F5] border-b border-stone-200/80 relative overflow-hidden">
      
      {/* Background Decorative Blur */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        
        {/* ========================================================
            PHẦN 1: GIỚI THIỆU CLOOP LÀ GÌ? (WHAT IS CLOOP?)
        ======================================================== */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100/80 border border-emerald-300 text-[#183A2D] text-[11px] font-bold uppercase tracking-widest font-ui shadow-2xs">
            <Sparkles size={13} className="text-emerald-700 animate-spin-slow" />
            <span>Nền Tảng Thời Trang Tuần Hoàn Tiên Phong</span>
          </div>

          <h2 className="font-heading text-2xl sm:text-4xl md:text-5xl font-extrabold text-[#0A2517] leading-tight tracking-tight">
            CLOOP Là Gì? <br />
            <span className="text-[#183A2D] font-normal italic font-heading">
              Tủ Đồ Vô Tận — Tuần Hoàn Không Lãng Phí
            </span>
          </h2>

          <p className="text-stone-600 text-sm sm:text-base font-light leading-relaxed font-body">
            <strong>CLOOP</strong> (viết tắt của <em>Fashion In A Loop</em>) là nền tảng công nghệ thời trang tuần hoàn hàng đầu Việt Nam. Chúng tôi kết nối hàng ngàn tủ đồ thời trang cá nhân thành một <strong>"Tủ Đồ Đám Mây"</strong> dùng chung — nơi bạn có thể tự do <strong>Thuê trang phục</strong>, <strong>Cho thuê tủ đồ nhàn rỗi</strong>, <strong>Thanh lý đồ hiệu</strong> và <strong>Tái sinh nguyên liệu</strong> một cách văn minh, an toàn qua <strong>Két Bảo Chứng Escrow</strong> và <strong>Hộ Chiếu Số Garment Passport</strong>.
          </p>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
              <span className="font-mono text-xl sm:text-2xl font-extrabold text-[#183A2D] block">90%</span>
              <span className="text-[11px] text-stone-500 font-ui">Tiết kiệm chi phí mua</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
              <span className="font-mono text-xl sm:text-2xl font-extrabold text-emerald-800 block">100%</span>
              <span className="text-[11px] text-stone-500 font-ui">Bảo chứng cọc Escrow</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
              <span className="font-mono text-xl sm:text-2xl font-extrabold text-amber-800 block">12.000+</span>
              <span className="text-[11px] text-stone-500 font-ui">Món đồ trên hệ sinh thái</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
              <span className="font-mono text-xl sm:text-2xl font-extrabold text-teal-800 block">-45 Tấn</span>
              <span className="text-[11px] text-stone-500 font-ui">CO₂ giảm thiểu ra tự nhiên</span>
            </div>
          </div>
        </div>

        {/* ========================================================
            PHẦN 2: NHỮNG GIÁ TRỊ CLOOP MANG ĐẾN CHO BẠN (VALUE PROPOSITIONS)
        ======================================================== */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 border-b border-stone-200 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#183A2D] bg-[#E5EFE2] px-2.5 py-1 rounded-md border border-[#C5DAC2] font-ui">
                GIÁ TRỊ VƯỢT TRỘI
              </span>
              <h3 className="font-heading text-xl sm:text-3xl text-[#0A2517] font-bold tracking-normal mt-1.5">
                Những Gì CLOOP Mang Đến Cho Bạn
              </h3>
            </div>
            <p className="text-xs text-stone-500 font-ui max-w-sm sm:text-right">
              Giải pháp toàn diện tối ưu tài chính, phong cách và trách nhiệm xã hội.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            {valueProps.map((prop) => {
              const IconComp = prop.icon;
              return (
                <div 
                  key={prop.id}
                  className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-xs hover:shadow-xl transition-all duration-500 flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${prop.accentBg} transition-transform duration-500 group-hover:scale-110`}>
                        <IconComp size={24} />
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full font-ui ${prop.pillColor}`}>
                        {prop.tag}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest font-ui">
                        {prop.role}
                      </span>
                      <h4 className="font-heading text-xl font-bold text-[#0A2517] mt-1 group-hover:text-emerald-800 transition-colors">
                        {prop.title}
                      </h4>
                      <p className="text-xs text-stone-600 font-light leading-relaxed mt-2 font-body">
                        {prop.desc}
                      </p>
                    </div>

                    {/* Bullet Points */}
                    <div className="space-y-2 pt-2 border-t border-stone-100">
                      {prop.benefits.map((benefit, bIdx) => (
                        <div key={bIdx} className="flex items-start gap-2 text-xs text-stone-700 font-ui">
                          <CheckCircle2 size={14} className="text-emerald-700 shrink-0 mt-0.5" />
                          <span className="leading-tight">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-6 mt-4">
                    <Link
                      href={prop.linkHref}
                      className="w-full py-3 bg-[#FAF9F5] hover:bg-[#183A2D] text-[#183A2D] hover:text-white border border-[#E9E2D8] hover:border-[#183A2D] rounded-xl font-ui text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 group-hover:shadow-sm"
                    >
                      <span>{prop.linkText}</span>
                      <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
