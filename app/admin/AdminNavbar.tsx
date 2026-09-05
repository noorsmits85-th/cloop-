"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ShieldCheck, 
  Truck, 
  Scale, 
  Layers, 
  CreditCard, 
  FileText, 
  ArrowRight, 
  ExternalLink, 
  Zap, 
  X, 
  CheckCircle2, 
  HelpCircle,
  Sparkles
} from "lucide-react";

export default function AdminNavbar() {
  const pathname = usePathname();
  const [showCircuitModal, setShowCircuitModal] = useState(false);

  const navItems = [
    {
      label: "Tổng Quan",
      href: "/admin",
      exact: true,
      icon: <LayoutDashboard size={15} />,
      badge: "Dashboard"
    },
    {
      label: "Két Cọc Escrow",
      href: "/admin/deposit-vault",
      icon: <ShieldCheck size={15} />,
      badge: "Két cọc"
    },
    {
      label: "Vận Chuyển GHN",
      href: "/admin/shipments",
      icon: <Truck size={15} />,
      badge: "Block 5K"
    },
    {
      label: "Khiếu Nại",
      href: "/admin/disputes",
      icon: <Scale size={15} />,
      badge: "Trọng tài"
    },
    {
      label: "Sổ Cái Kép TT 99",
      href: "/admin/ledger",
      icon: <Layers size={15} />,
      badge: "Nợ/Có"
    },
    {
      label: "Chi Trả Payouts",
      href: "/admin/payments",
      icon: <CreditCard size={15} />,
      badge: "24h"
    },
    {
      label: "Kỳ Kế Toán",
      href: "/admin/accounting",
      icon: <FileText size={15} />,
      badge: "P&L"
    },
  ];

  const circuitSteps = [
    {
      step: "01",
      name: "Khách Đặt Thuê & Nạp Cọc",
      route: "/admin",
      code: "VietQR / PayOS",
      desc: "Khách thanh toán 100% tiền cọc (1.000.000đ) + Tiền thuê (350.000đ) + Ship đi (25.000đ). Tổng vào TK 112 = 1.375.000đ.",
      color: "bg-blue-50 text-blue-900 border-blue-200"
    },
    {
      step: "02",
      name: "Cô Lập Vào Két Escrow",
      route: "/admin/deposit-vault",
      code: "TK 3386 / 33881",
      desc: "1.000.000đ tiền cọc được giữ an toàn trong Két Escrow, không hạch toán vào doanh thu, đảm bảo thanh khoản hoàn trả.",
      color: "bg-teal-50 text-teal-900 border-teal-200"
    },
    {
      step: "03",
      name: "Logistics 2 Chiều & Block 5K",
      route: "/admin/shipments",
      code: "TK 33883 / 331",
      desc: "Thu 50.000đ (2 bên), chi trả bưu tá GHN 42.000đ. Phần dôi dư 8.000đ giữ lại quỹ đệm bảo hiểm rủi ro giao lại.",
      color: "bg-amber-50 text-amber-900 border-amber-200"
    },
    {
      step: "04",
      name: "Giám Sát & Trọng Tài Khiếu Nại",
      route: "/admin/disputes",
      code: "TK 3386 ➔ Khấu trừ",
      desc: "Nếu trang phục bị rách hỏng, Admin phân xử video mở hộp, trích tiền từ cọc bảo chứng bồi thường cho chủ đồ.",
      color: "bg-rose-50 text-rose-900 border-rose-200"
    },
    {
      step: "05",
      name: "Đối Soát Sổ Cái Kép Bất Biến",
      route: "/admin/ledger",
      code: "Chuẩn TT 99/2025",
      desc: "Tất toán hợp đồng: Hoàn 100% cọc (Nợ 3386/Có 112), bóc tách phí sàn 12% (Có 5113: 38.182đ + Có 33311: 3.818đ).",
      color: "bg-purple-50 text-purple-900 border-purple-200"
    },
    {
      step: "06",
      name: "Giải Ngân Payouts & Báo Cáo Kỳ",
      route: "/admin/payments",
      code: "Payout 24h & P&L",
      desc: "Chuyển khoản 283.000đ cho chủ tủ đồ trong 24h và chốt sổ kỳ kế toán kết quả kinh doanh toàn diện trên /admin/accounting.",
      color: "bg-emerald-50 text-emerald-900 border-emerald-200"
    }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6">
        
        {/* TOP ROW: LOGO + CIRCUIT MODAL TRIGGER + STOREFRONT LINK */}
        <div className="flex items-center justify-between py-3 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-[#183A2D] text-white flex items-center justify-center font-black text-sm shadow-xs group-hover:scale-105 transition-transform">
                C
              </div>
              <span className="font-heading font-black text-base text-stone-900 tracking-tight">
                CLOOP <span className="text-emerald-700 font-bold text-xs uppercase tracking-wider ml-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Admin Circuit</span>
              </span>
            </Link>

            <span className="hidden md:inline-block text-stone-300">|</span>

            {/* INTERACTIVE CIRCUIT FLOW BUTTON */}
            <button
              onClick={() => setShowCircuitModal(true)}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-[#183A2D] border border-emerald-200/80 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Zap size={13} className="text-emerald-700 fill-emerald-700 animate-pulse" />
              <span>Sơ Đồ Mạch Dòng Tiền (6 Bước)</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-stone-600 hover:text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-stone-100 transition-colors"
              title="Mở giao diện sàn thời trang CLOOP cho người dùng"
            >
              <span>Về Sàn CLOOP</span>
              <ExternalLink size={13} />
            </Link>
          </div>
        </div>

        {/* BOTTOM ROW: UNIFIED HORIZONTAL NAVIGATION CIRCUIT */}
        <nav className="flex items-center gap-1 py-2 overflow-x-auto no-scrollbar text-xs font-medium">
          {navItems.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href 
              : pathname === item.href || pathname?.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl transition-all whitespace-nowrap font-bold ${
                  isActive
                    ? "bg-[#183A2D] text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                }`}
              >
                <span className={isActive ? "text-emerald-300" : "text-stone-400"}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono uppercase font-normal ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-stone-100 text-stone-500"
                }`}>
                  {item.badge}
                </span>
              </Link>
            );
          })}
        </nav>

      </div>

      {/* POPUP MODAL: SƠ ĐỒ MẠCH DÒNG TIỀN VẬN HÀNH KHÉP KÍN */}
      {showCircuitModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200 p-6 sm:p-8 animate-in fade-in zoom-in duration-200">
            
            <div className="flex items-start justify-between border-b border-stone-200 pb-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider mb-2">
                  <Sparkles size={13} /> Mạch Dòng Tiền & Vận Hành Khép Kín CLOOP
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                  Sơ Đồ Kết Nối Mạch Dòng Tiền Giữa Các Phân Hệ
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 mt-1">
                  Mỗi đơn hàng trên CLOOP di chuyển liền mạch qua 6 trạm kiểm soát tài chính & logistics tự động.
                </p>
              </div>

              <button
                onClick={() => setShowCircuitModal(false)}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* 6 CIRCUIT STATIONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {circuitSteps.map((s, idx) => (
                <div 
                  key={s.step} 
                  className={`p-4 rounded-2xl border transition-all hover:shadow-sm ${s.color} relative flex flex-col justify-between`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-black opacity-60">BƯỚC {s.step}</span>
                      <span className="text-[10px] font-mono font-bold bg-white/70 px-2 py-0.5 rounded-md border border-current">
                        {s.code}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold tracking-tight">{s.name}</h3>
                    <p className="text-xs opacity-90 leading-relaxed font-normal">{s.desc}</p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-current/15 flex justify-end">
                    <Link
                      href={s.route}
                      onClick={() => setShowCircuitModal(false)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold bg-white text-stone-800 hover:text-emerald-900 px-3 py-1.5 rounded-xl border border-stone-200 shadow-2xs transition hover:border-emerald-300"
                    >
                      <span>Vào trang này</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* FOOTER NOTE */}
            <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-700" />
                <span>Toàn bộ 6 phân hệ đã được nối mạch dữ liệu và định khoản chuẩn Thông tư 99/2025/TT-BTC.</span>
              </span>
              <button
                onClick={() => setShowCircuitModal(false)}
                className="bg-[#183A2D] hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ml-3"
              >
                Đã hiểu
              </button>
            </div>

          </div>
        </div>
      )}
    </header>
  );
}
