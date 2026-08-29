"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  TrendingUp, 
  ShieldCheck, 
  CreditCard, 
  Leaf, 
  Users, 
  ShoppingBag, 
  FileText, 
  Truck, 
  Scale, 
  Search, 
  Zap, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  Lock,
  Layers,
  ChevronRight
} from "lucide-react";
import { searchUserByEmail, pumpCoins } from "@/app/actions/admin";

interface AdminDashboardClientProps {
  currentAdmin: {
    name: string;
    coins: number;
  };
  metrics: {
    totalUsers: number;
    totalProducts: number;
    totalRentals: number;
    totalGMV: number;
    totalDepositEscrow: number;
    totalPlatformFee: number;
    totalCoinRevenue: number;
    totalCoinsIssued: number;
  };
  recentRentals: any[];
  recentTopUps: any[];
}

export default function AdminDashboardClient({
  currentAdmin,
  metrics,
  recentRentals = [],
  recentTopUps = []
}: AdminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "TOOLS">("OVERVIEW");

  // State cho công cụ hỗ trợ
  const [email, setEmail] = useState("");
  const [targetUser, setTargetUser] = useState<any>(null);
  const [amount, setAmount] = useState<number>(1000);
  const [isSearching, setIsSearching] = useState(false);
  const [isPumping, setIsPumping] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setMessage(null);
    setTargetUser(null);

    const res = await searchUserByEmail(email);
    if (res.error) {
      setMessage({ type: "error", text: res.error });
    } else if (res.user) {
      setTargetUser(res.user);
    }
    setIsSearching(false);
  };

  const handlePump = async () => {
    if (!targetUser) return;
    setIsPumping(true);
    setMessage(null);

    const res = await pumpCoins(targetUser.id, amount);
    if (res.error) {
      setMessage({ type: "error", text: res.error });
    } else {
      setMessage({ type: "success", text: res.message || "Thành công" });
      setTargetUser({ ...targetUser, cloopCoins: targetUser.cloopCoins + amount });
    }
    setIsPumping(false);
  };

  const navigationModules = [
    {
      title: "Kỳ Kế Toán & Đối Soát Sàn",
      description: "Chốt sổ kế toán hàng tháng, ghi nhận Lợi nhuận gộp và quản lý Payouts.",
      href: "/admin/accounting",
      icon: <FileText size={20} className="text-emerald-700" />,
      badge: "Kế toán"
    },
    {
      title: "Két Bảo Chứng Escrow",
      description: "Giám sát quỹ tiền cọc ký quỹ, quản trị thanh khoản ngắn hạn và hoàn cọc.",
      href: "/admin/deposit-vault",
      icon: <ShieldCheck size={20} className="text-teal-700" />,
      badge: "Két cọc"
    },
    {
      title: "Chi Trả Payouts Cho Chủ Tủ",
      description: "Danh sách chuyển khoản giải ngân tiền cho thuê cho các chủ tủ trong 24h.",
      href: "/admin/payments",
      icon: <CreditCard size={20} className="text-blue-700" />,
      badge: "Chi trả 24h"
    },
    {
      title: "Sổ Cái Tài Chính Toàn Hệ Thống",
      description: "Nhật ký ghi sổ kép bất biến ghi nhận mọi dòng tiền vào - ra của nền tảng.",
      href: "/admin/ledger",
      icon: <Layers size={20} className="text-purple-700" />,
      badge: "Sổ cái"
    },
    {
      title: "Vận Chuyển 2 Chiều GHN & Block 5K",
      description: "Theo dõi hành trình đơn hàng, cước khứ hồi và biên độ bảo vệ dòng tiền.",
      href: "/admin/shipments",
      icon: <Truck size={20} className="text-amber-700" />,
      badge: "Logistics"
    },
    {
      title: "Trọng Tài Khiếu Nại & Bồi Thường",
      description: "Xử lý tranh chấp đồ hỏng, bồi thường từ tiền cọc bảo chứng Escrow.",
      href: "/admin/disputes",
      icon: <Scale size={20} className="text-rose-700" />,
      badge: "Tranh chấp"
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 text-left font-sans">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-[#183A2D] to-[#244E3E] text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold font-mono text-emerald-200 border border-white/10">
            <Lock size={12} /> BẢNG ĐIỀU KHIỂN BAN QUẢN TRỊ CLOOP (TECHFEST 2026)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading mt-2">
            Trung Tâm Điều Hành & Tài Chính Toàn Sàn
          </h1>
          <p className="text-white/70 text-xs sm:text-sm font-light">
            Chào mừng Quản trị viên: <span className="text-emerald-300 font-bold font-mono">{currentAdmin.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 shrink-0">
          <Leaf size={16} className="text-emerald-300" />
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-white/60 font-semibold uppercase">Ví Điểm Lá Admin</span>
            <span className="text-base font-mono font-black text-white">{currentAdmin.coins.toLocaleString()} Lá</span>
          </div>
        </div>
      </div>

      {/* 4 THẺ CHỈ SỐ TÀI CHÍNH CỐT LÕI (KEY FINANCIAL METRICS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: TỔNG GMV */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase font-bold text-stone-400 tracking-wider">Tổng GMV Toàn Sàn</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-stone-900">{metrics.totalGMV.toLocaleString()}₫</div>
            <p className="text-[11px] text-stone-400 mt-0.5">Tổng giá trị giao dịch thuê & cọc</p>
          </div>
        </div>

        {/* KPI 2: KÉT BẢO CHỨNG ESCROW */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase font-bold text-stone-400 tracking-wider">Quỹ Két Escrow</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-teal-900">{metrics.totalDepositEscrow.toLocaleString()}₫</div>
            <p className="text-[11px] text-stone-400 mt-0.5">Tiền cọc bảo chứng đang quản lý</p>
          </div>
        </div>

        {/* KPI 3: DOANH THU PHÍ SÀN 12% */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase font-bold text-stone-400 tracking-wider">Lợi Nhuận Sàn (12%)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center">
              <CreditCard size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-blue-900">{Math.round(metrics.totalPlatformFee).toLocaleString()}₫</div>
            <p className="text-[11px] text-stone-400 mt-0.5">Phí dịch vụ 12% giữ lại trên gói thuê</p>
          </div>
        </div>

        {/* KPI 4: DOANH THU NẠP LÁ */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase font-bold text-stone-400 tracking-wider">Doanh Thu Nạp Lá</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
              <Leaf size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-amber-900">{metrics.totalCoinRevenue.toLocaleString()}₫</div>
            <p className="text-[11px] text-stone-400 mt-0.5">+{metrics.totalCoinsIssued.toLocaleString()} Lá đã phát hành</p>
          </div>
        </div>

      </div>

      {/* THANH TAB CHUYỂN ĐỔI */}
      <div className="flex items-center gap-3 border-b border-stone-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("OVERVIEW")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "OVERVIEW"
              ? "bg-[#183A2D] text-white shadow-sm"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          📊 Tổng Quan & Phân Hệ Quản Trị
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("TOOLS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "TOOLS"
              ? "bg-[#183A2D] text-white shadow-sm"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <Zap size={14} className="text-yellow-400" /> Công Cụ Hỗ Trợ & Điều Chỉnh Điểm
        </button>
      </div>

      {activeTab === "OVERVIEW" ? (
        <div className="space-y-8">
          
          {/* LƯỚI 6 PHÂN HỆ QUẢN TRỊ CHUYÊN SÂU */}
          <div>
            <h2 className="text-lg font-bold font-heading text-stone-900 mb-4 flex items-center gap-2">
              <Layers size={18} className="text-emerald-800" />
              Các Phân Hệ Báo Cáo & Đối Soát Dành Cho Team
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {navigationModules.map((mod) => (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs hover:shadow-md hover:border-emerald-700/50 transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                        {mod.icon}
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-mono">
                        {mod.badge}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-stone-900 group-hover:text-emerald-800 transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-stone-500 leading-relaxed font-light">
                      {mod.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-emerald-800 group-hover:translate-x-1 transition-transform">
                    <span>Truy cập báo cáo</span>
                    <ChevronRight size={14} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* QUY MÔ HỆ THỐNG */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 mb-4">
              Quy Mô Cộng Đồng Tủ Đồ CLOOP
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center divide-x divide-stone-100">
              <div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-[#183A2D]">{metrics.totalUsers}</div>
                <div className="text-xs text-stone-500 font-medium mt-1">Thành viên đăng ký</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-[#183A2D]">{metrics.totalProducts}</div>
                <div className="text-xs text-stone-500 font-medium mt-1">Món đồ trên tủ đồ</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-[#183A2D]">{metrics.totalRentals}</div>
                <div className="text-xs text-stone-500 font-medium mt-1">Chuyến thuê phát sinh</div>
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* TAB 2: CÔNG CỤ HỖ TRỢ VÀ BƠM ĐIỂM TEST */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-base font-bold font-heading text-stone-900 mb-3 flex items-center gap-2">
              <Search size={16} className="text-emerald-700" /> Tìm Kiếm Tài Khoản Thành Viên
            </h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input 
                type="email" 
                placeholder="Nhập email user cần tra cứu..." 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-xs text-stone-900 focus:outline-none focus:border-emerald-700 transition-all font-mono"
                required
              />
              <button 
                type="submit" 
                disabled={isSearching}
                className="bg-[#183A2D] hover:bg-[#23452F] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSearching ? <Loader2 size={14} className="animate-spin" /> : "Tìm"}
              </button>
            </form>

            {message && message.type === "error" && (
              <div className="mt-4 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <p>{message.text}</p>
              </div>
            )}
          </div>

          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold font-heading text-stone-900 mb-3 flex items-center gap-2">
                <Zap size={16} className="text-yellow-500" /> Bảng Điều Khiển Cấp Điểm Lá
              </h2>
              {targetUser ? (
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Tên:</span>
                    <span className="font-bold text-stone-900">{targetUser.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Email:</span>
                    <span className="font-mono text-stone-800">{targetUser.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Số dư Điểm Lá:</span>
                    <span className="font-mono font-bold text-emerald-800">{targetUser.cloopCoins.toLocaleString()} Lá</span>
                  </div>
                  <div className="pt-2 border-t border-stone-200 flex gap-2 items-center">
                    <input 
                      type="number" 
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-28 bg-white border border-stone-200 px-3 py-1.5 rounded-xl font-mono text-xs text-stone-900"
                    />
                    <button
                      type="button"
                      onClick={handlePump}
                      disabled={isPumping}
                      className="flex-1 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      {isPumping ? <Loader2 size={12} className="animate-spin" /> : "Cộng Lá Cho User"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-stone-400 text-xs font-light">
                  Vui lòng tìm kiếm email người dùng ở ô bên trái trước.
                </div>
              )}
            </div>
            {message && message.type === "success" && (
              <div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0" />
                <p>{message.text}</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
