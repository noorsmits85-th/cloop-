"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Search, MapPin, Star, SlidersHorizontal, ArrowLeft, ArrowUpDown } from "lucide-react";
import Link from "next/link";

interface Product {
  id: number;
  image: string;
  type: string;
  title: string;
  price: string;
  location: string;
  rating: string;
  condition: string;
  category: string;
}

export default function CLOOPMarketplace() {
  const [filter, setFilter] = useState<string>("all");

  const catalogProducts: Product[] = [
    { id: 1, image: "/1.2.(2).jpg", type: "Thuê", title: "Váy dáng ngắn Sporty Black", price: "65.000đ / ngày", location: "Nghệ An", rating: "4.9", condition: "Like New 99%", category: "rent" },
    { id: 2, image: "/1.1.jpg", type: "Thuê", title: "Set Halter Top & Quần Suông Trendy", price: "110.000đ / ngày", location: "Nghệ An", rating: "4.8", condition: "Like New 99%", category: "rent" },
    { id: 3, image: "/2.1.jpg", type: "Thuê", title: "Áo Len Nhung Snowy & Mũ Nồi Cozy", price: "80.000đ / ngày", location: "Nghệ An", rating: "4.7", condition: "Like New 99%", category: "rent" },
    { id: 4, image: "/3.1.jpg", type: "Mua", title: "Set Blazer Thu Đông Luxury", price: "1.250.000đ", location: "Nghệ An", rating: "4.9", condition: "Mới 100%", category: "buy" }
  ];

  const filteredProducts = filter === "all" 
    ? catalogProducts 
    : catalogProducts.filter(p => p.category === filter);

  return (
    <main className="min-h-screen bg-[#FAF8F3] text-[#183A2D] font-sans antialiased px-6 lg:px-12 py-8">
      
      {/* THANH ĐIỀU HƯỚNG QUAY LẠI TRANG CHỦ */}
      <div className="max-w-[1400px] mx-auto flex items-center justify-between border-b border-[#E9E2D8] pb-6 mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-[#183A2D] transition group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition" /> Quay lại trang chủ
        </Link>
        <div className="text-right">
          <span className="text-[10px] bg-[#6BA37A]/10 text-[#183A2D] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            CLOOP Marketplace
          </span>
        </div>
      </div>

      {/* TIÊU ĐỀ & THANH ĐIỀU KHIỂN BỘ LỌC */}
      <div className="max-w-[1400px] mx-auto text-left space-y-6">
        <div>
          <h1 className="font-serif text-3xl lg:text-4xl font-bold">Sàn Thời Trang Tuần Hoàn</h1>
          <p className="text-xs text-gray-400 mt-1">Khám phá và tái sinh vòng đời cho hàng ngàn bộ trang phục độc đáo xung quanh vị trí của bạn.</p>
        </div>

        {/* CỤM THANH TÌM KIẾM VÀ BỘ LỌC TAB */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white p-4 rounded-2xl border border-[#E9E2D8] shadow-sm">
          
          {/* Tabs bộ lọc */}
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
            <button 
              type="button"
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-full text-xs font-bold transition ${filter === "all" ? "bg-[#183A2D] text-white" : "bg-[#FAF8F3] text-[#183A2D] hover:bg-gray-100"}`}
            >
              Tất cả kho đồ
            </button>
            <button 
              type="button"
              onClick={() => setFilter("rent")}
              className={`px-4 py-2 rounded-full text-xs font-bold transition ${filter === "rent" ? "bg-[#183A2D] text-white" : "bg-[#FAF8F3] text-[#183A2D] hover:bg-gray-100"}`}
            >
              Trang phục thuê
            </button>
            <button 
              type="button"
              onClick={() => setFilter("buy")}
              className={`px-4 py-2 rounded-full text-xs font-bold transition ${filter === "buy" ? "bg-[#183A2D] text-white" : "bg-[#FAF8F3] text-[#183A2D] hover:bg-gray-100"}`}
            >
              Sản phẩm mua bán
            </button>
          </div>

          {/* Ô tìm kiếm nội bộ */}
          <div className="flex items-center gap-3 bg-[#FAF8F3] border border-[#E9E2D8] px-4 py-2 rounded-full flex-1 max-w-md">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input className="bg-transparent text-xs outline-none text-[#183A2D] w-full placeholder:text-gray-400" placeholder="Tìm tên váy, áo, local brand..." />
          </div>

          {/* Nút lọc nâng cao mô phỏng */}
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" className="inline-flex items-center gap-2 border border-[#E9E2D8] px-4 py-2 rounded-full text-xs font-medium hover:border-[#183A2D] transition bg-white">
              <SlidersHorizontal size={12} /> Bộ lọc nâng cao
            </button>
            <button type="button" className="inline-flex items-center gap-2 border border-[#E9E2D8] px-4 py-2 rounded-full text-xs font-medium hover:border-[#183A2D] transition bg-white">
              <ArrowUpDown size={12} /> Sắp xếp
            </button>
          </div>
        </div>

        {/* LƯỚI DANH SÁCH SẢN PHẨM KHÔNG GIAN SÀN THƯƠNG MẠI CHUẨN */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-4">
          {filteredProducts.map((prod) => (
            <motion.div 
              key={prod.id}
              whileHover={{ y: -5, boxShadow: "0px 12px 30px rgba(24,58,45,0.06)" }}
              className="bg-white border border-[#E9E2D8] rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group cursor-pointer"
            >
              <div className="relative w-full h-[280px] bg-[#FAF8F3] overflow-hidden">
                <Image 
                  src={prod.image} 
                  alt={prod.title} 
                  fill 
                  sizes="(max-w-768px) 50vw, 25vw"
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-104" 
                />
                
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md text-white ${prod.type === "Thuê" ? "bg-[#183A2D]" : "bg-amber-700"}`}>
                    {prod.type}
                  </span>
                  <span className="text-[8.5px] font-bold bg-white/90 text-gray-600 px-2 py-0.5 rounded shadow-sm border border-black/5">
                    {prod.condition}
                  </span>
                </div>

                <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-bold text-[#183A2D] flex items-center gap-0.5">
                  <Star size={10} className="fill-amber-400 stroke-none" /> {prod.rating}
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#183A2D] line-clamp-1 group-hover:text-[#6BA37A] transition-colors">{prod.title}</h4>
                  <div className="text-xs text-gray-500 font-semibold mt-1.5">{prod.price}</div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-4 border-t border-gray-50 pt-2.5">
                  <MapPin size={10} className="text-[#6BA37A]" /> <span className="font-medium text-gray-600">{prod.location}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

    </main>
  );
}