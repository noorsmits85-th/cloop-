"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Shirt, 
  Share2, 
  Tag, 
  Recycle, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Heart,
  Layers
} from "lucide-react";

export default function CloopCategoryPillars() {
  const categories = [
    {
      id: "rent",
      number: "01",
      badge: "THUÊ TRANG PHỤC",
      title: "Thuê Đồ Sự Kiện & Dạ Hội",
      subtitle: "Mặc đẹp không giới hạn • Tiết kiệm 90%",
      desc: "Hàng ngàn mẫu váy dạ hội, áo dài truyền thống, set đồ du lịch & blazer thiết kế tuyển chọn. Giặt ủi thơm tho, giao tận tay, hoàn cọc tức thì.",
      image: "/evening_dress.jpg",
      hoverImage: "/step1_phone.jpg",
      tag: "Chỉ từ 80k/ngày",
      icon: Shirt,
      link: "/shop?type=rent",
      actionText: "Khám Phá Sàn Thuê",
      accentColor: "from-emerald-900/90 to-emerald-950/95",
      borderHover: "hover:border-emerald-600"
    },
    {
      id: "lend",
      number: "02",
      badge: "CHO THUÊ TỦ ĐỒ",
      title: "Cho Thuê Đồ Nhàn Rỗi",
      subtitle: "Tủ đồ sinh lời • Kiếm 3-10Tr/tháng",
      desc: "Biến những bộ cánh ít mặc thành nguồn thu nhập thụ động. Đăng đồ trong 1 phút, an tâm 100% nhờ Két Bảo Chứng Escrow và Shipper đến tận nhà nhận đồ.",
      image: "/anhbia.png",
      hoverImage: "/hero_warm.jpg",
      tag: "Bảo hiểm cọc 100%",
      icon: Share2,
      link: "/my-closet/create?mode=rent",
      actionText: "Đăng Tủ Đồ Cho Thuê",
      accentColor: "from-[#183A2D]/90 to-[#0A2517]/95",
      borderHover: "hover:border-emerald-500"
    },
    {
      id: "resale",
      number: "03",
      badge: "THANH LÝ & PASS ĐỒ",
      title: "Thanh Lý & Chuyển Nhượng",
      subtitle: "Pass nhanh • Giá tốt • Đồ thật 100%",
      desc: "Chuyển nhượng những món đồ hiệu, phụ kiện hoặc quần áo còn mới 90-99%. Thu hồi vốn nhanh chóng và tìm cho trang phục người chủ mới trân quý.",
      image: "/vintage_coat.jpg",
      hoverImage: "/macro_fabric.jpg",
      tag: "Giảm đến 70%",
      icon: Tag,
      link: "/shop?type=sell",
      actionText: "Săn Đồ Thanh Lý",
      accentColor: "from-amber-950/90 to-stone-950/95",
      borderHover: "hover:border-amber-600"
    },
    {
      id: "upcycle",
      number: "04",
      badge: "TÁI SINH & UPCYCLE",
      title: "Chợ Xanh & Tái Chế Vải",
      subtitle: "Nguyên liệu sáng tạo • Vòng đời tuần hoàn",
      desc: "Nơi cung cấp vải thừa, phụ kiện tái sinh và đồ cũ chất lượng cao cho sinh viên thiết kế, local brand và các nghệ nhân thời trang Upcycling sáng tạo.",
      image: "/hero_group.jpg",
      hoverImage: "/2.1.jpg",
      tag: "Đổi Điểm Lá",
      icon: Recycle,
      link: "/shop?category=Upcycle",
      actionText: "Vào Chợ Nguyên Liệu",
      accentColor: "from-teal-950/90 to-emerald-950/95",
      borderHover: "hover:border-teal-500"
    }
  ];

  return (
    <section className="w-full py-14 sm:py-20 bg-[#FAF9F5] border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 mb-10 border-b border-stone-200 pb-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#183A2D] bg-[#E5EFE2] px-2.5 py-1 rounded-md border border-[#C5DAC2] font-ui">
              HỆ SINH THÁI ĐA DỊCH VỤ
            </span>
            <h2 className="font-heading text-2xl sm:text-4xl text-[#0A2517] font-extrabold tracking-tight mt-1.5">
              Các Danh Mục Dịch Vụ Của CLOOP
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 font-ui max-w-md md:text-right">
            Lựa chọn hình thức phù hợp nhất để trải nghiệm và tối ưu giá trị tủ đồ của bạn.
          </p>
        </div>

        {/* 4 Editorial Pillar Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {categories.map((cat) => {
            const IconComp = cat.icon;
            return (
              <div
                key={cat.id}
                className={`group relative rounded-3xl overflow-hidden shadow-xs hover:shadow-2xl transition-all duration-700 flex flex-col justify-between border border-stone-200/80 ${cat.borderHover} bg-white`}
              >
                {/* Visual Image Banner with smooth zoom */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
                  <Image 
                    src={cat.image} 
                    alt={cat.title} 
                    fill 
                    className="object-cover transition-opacity duration-700 opacity-100 group-hover:opacity-0" 
                    unoptimized 
                  />
                  <Image 
                    src={cat.hoverImage} 
                    alt={cat.title} 
                    fill 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-100" 
                    unoptimized 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
                    <span className="text-[9px] uppercase tracking-widest font-extrabold text-[#183A2D] bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full border border-stone-200 shadow-2xs font-ui">
                      {cat.badge}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-white bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full">
                      {cat.tag}
                    </span>
                  </div>

                  {/* Category Number */}
                  <div className="absolute bottom-2 left-3 z-10">
                    <span className="font-mono text-xl font-black text-white/90 drop-shadow-sm">
                      {cat.number}
                    </span>
                  </div>
                </div>

                {/* Content Info */}
                <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                        <IconComp size={15} />
                      </div>
                      <h3 className="font-heading text-base font-bold text-[#0A2517] group-hover:text-emerald-800 transition-colors leading-snug">
                        {cat.title}
                      </h3>
                    </div>

                    <p className="text-[11px] font-semibold text-emerald-800 font-ui">
                      {cat.subtitle}
                    </p>

                    <p className="text-xs text-stone-600 font-light leading-relaxed font-body line-clamp-3">
                      {cat.desc}
                    </p>
                  </div>

                  {/* Action Link Button */}
                  <div className="pt-3 border-t border-stone-100">
                    <Link
                      href={cat.link}
                      className="w-full py-2.5 bg-[#FAF9F5] hover:bg-[#183A2D] text-[#183A2D] hover:text-white border border-[#E9E2D8] hover:border-[#183A2D] rounded-xl font-ui text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <span>{cat.actionText}</span>
                      <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
