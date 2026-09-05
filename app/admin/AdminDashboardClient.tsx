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
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { 
  searchUserByEmail, 
  pumpCoins, 
  triggerFastEscrowReleaseAction,
  releaseSingleEscrowOrderAction,
  seedOperationalOrdersAction 
} from "@/app/actions/admin";

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
  pendingWithdrawals?: any[];
}

export default function AdminDashboardClient({
  currentAdmin,
  metrics,
  recentRentals = [],
  recentTopUps = [],
  pendingWithdrawals = []
}: AdminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "ORDERS" | "TOOLS">("OVERVIEW");

  // State cho công cụ hỗ trợ
  const [email, setEmail] = useState("");
  const [targetUser, setTargetUser] = useState<any>(null);
  const [amount, setAmount] = useState<number>(1000);
  const [isSearching, setIsSearching] = useState(false);
  const [isPumping, setIsPumping] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const [isReleasingEscrow, setIsReleasingEscrow] = useState(false);
  const [releasingOrderId, setReleasingOrderId] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);

  // Kích hoạt giải ngân toàn sàn
  const handleTriggerFastEscrowRelease = async () => {
    setIsReleasingEscrow(true);
    setActionResult(null);
    try {
      const res = await triggerFastEscrowReleaseAction({ minutesThreshold: 10 });
      if (res.success) {
        setActionResult({ success: true, message: res.message || "Đã giải ngân thành công!" });
      } else {
        setActionResult({ success: false, message: res.error || "Lỗi khi giải ngân" });
      }
    } catch (err: any) {
      setActionResult({ success: false, message: err.message || "Lỗi hệ thống" });
    } finally {
      setIsReleasingEscrow(false);
    }
  };

  // Kích hoạt giải ngân cho 1 đơn cụ thể
  const handleReleaseSingleOrder = async (rentalId: string) => {
    setReleasingOrderId(rentalId);
    setActionResult(null);
    try {
      const res = await releaseSingleEscrowOrderAction(rentalId);
      if (res.success) {
        setActionResult({ success: true, message: res.message || "Đã giải ngân đơn hàng thành công!" });
      } else {
        setActionResult({ success: false, message: res.error || "Lỗi khi giải ngân đơn hàng" });
      }
    } catch (err: any) {
      setActionResult({ success: false, message: err.message || "Lỗi hệ thống" });
    } finally {
      setReleasingOrderId(null);
    }
  };

  // Đồng bộ / Seed đơn mẫu vận hành
  const handleSeedOrders = async () => {
    setIsSeeding(true);
    setActionResult(null);
    try {
      const res = await seedOperationalOrdersAction();
      if (res.success) {
        setActionResult({ success: true, message: res.message || "Đã đồng bộ đơn hàng thành công!" });
      } else {
        setActionResult({ success: false, message: res.error || "Lỗi khi tạo đơn mẫu" });
      }
    } catch (err: any) {
      setActionResult({ success: false, message: err.message || "Lỗi hệ thống" });
    } finally {
      setIsSeeding(false);
    }
  };

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_APPROVAL":
      case "WAITING_SHIP":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">Chờ duyệt</span>;
      case "OWNER_PACKED":
      case "LENDER_APPROVED":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">Đã gói • Chờ bưu tá</span>;
      case "LENDER_SHIPPED":
      case "SHIPPED":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">Đang giao GHN</span>;
      case "BORROWER_RECEIVED":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">Khách đang mặc</span>;
      case "BORROWER_RETURNED":
      case "RETURNED":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-50 text-orange-800 border border-orange-200">Đã trả • Chờ nhả cọc</span>;
      case "LENDER_COMPLETED":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">✓ Hoàn tất & Đã nhả cọc</span>;
      case "DISPUTE":
      case "DISPUTED":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">Đang tranh chấp</span>;
      case "CANCELLED":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-100 text-stone-500 border border-stone-200">Đã hủy đơn</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">{status}</span>;
    }
  };

  const navigationModules = [
    {
      title: "Két Bảo Chứng Escrow",
      description: "Giám sát quỹ tiền cọc ký quỹ (TK 3386), quản trị thanh khoản ngắn hạn và hoàn cọc.",
      href: "/admin/deposit-vault",
      icon: <ShieldCheck size={20} className="text-teal-700" />,
      badge: "Két cọc"
    },
    {
      title: "Vận Chuyển 2 Chiều GHN & Block 5K",
      description: "Theo dõi hành trình đơn hàng, cước khứ hồi và quỹ đệm bảo vệ dòng tiền.",
      href: "/admin/shipments",
      icon: <Truck size={20} className="text-amber-700" />,
      badge: "Logistics"
    },
    {
      title: "Trọng Tài Khiếu Nại & Bồi Thường",
      description: "Xử lý tranh chấp đồ hỏng, bồi thường trích từ tiền cọc bảo chứng Escrow.",
      href: "/admin/disputes",
      icon: <Scale size={20} className="text-rose-700" />,
      badge: "Tranh chấp"
    },
    {
      title: "Sổ Cái Kép TT 99/2025/TT-BTC",
      description: "Nhật ký ghi sổ kép bất biến ghi nhận mọi dòng tiền vào - ra và bóc tách thuế.",
      href: "/admin/ledger",
      icon: <Layers size={20} className="text-purple-700" />,
      badge: "Sổ cái"
    },
    {
      title: "Chi Trả Payouts Cho Chủ Tủ",
      description: "Danh sách chuyển khoản giải ngân tiền cho thuê cho các chủ tủ trong 24h.",
      href: "/admin/payments",
      icon: <CreditCard size={20} className="text-blue-700" />,
      badge: "Chi trả 24h"
    },
    {
      title: "Kỳ Kế Toán & Báo Cáo P&L",
      description: "Chốt sổ kế toán hàng tháng theo Thông tư 99, ghi nhận Lợi nhuận gộp toàn diện.",
      href: "/admin/accounting",
      icon: <FileText size={20} className="text-emerald-700" />,
      badge: "Kế toán"
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 text-left font-ui">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#183A2D] text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold font-mono text-emerald-200 border border-white/10">
            <Lock size={12} /> BẢNG ĐIỀU HÀNH BAN QUẢN TRỊ & TÀI CHÍNH TOÀN SÀN
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading mt-2">
            Trung Tâm Điều Hành & Vận Hành Thực Tế
          </h1>
          <p className="text-white/70 text-xs sm:text-sm font-light">
            Chào mừng Quản trị viên: <span className="text-emerald-300 font-bold font-mono">{currentAdmin.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={handleSeedOrders}
            disabled={isSeeding}
            className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Đồng bộ lại đơn hàng và tính toán từ database"
          >
            {isSeeding ? <Loader2 size={14} className="animate-spin text-emerald-300" /> : <RefreshCw size={14} />}
            <span>{isSeeding ? "Đang đồng bộ..." : "Đồng Bộ Dữ Liệu"}</span>
          </button>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 shrink-0">
            <Leaf size={16} className="text-emerald-300" />
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-white/60 font-semibold uppercase">Ví Điểm Lá Admin</span>
              <span className="text-base font-mono font-black text-white">{currentAdmin.coins.toLocaleString()} Lá</span>
            </div>
          </div>
        </div>
      </div>

      {/* FEEDBACK TOAST NOTIFICATION */}
      {actionResult && (
        <div className={`p-4 rounded-2xl border text-xs font-medium flex items-center justify-between gap-3 ${
          actionResult.success 
            ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
            : "bg-rose-50 border-rose-200 text-rose-900"
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className={actionResult.success ? "text-emerald-700" : "text-rose-700"} />
            <span>{actionResult.message}</span>
          </div>
          <button onClick={() => setActionResult(null)} className="text-xs font-bold underline opacity-70 hover:opacity-100">
            Đóng
          </button>
        </div>
      )}

      {/* 🔔 BANNER NHẮC DUYỆT LỆNH RÚT TIỀN (PAYOUT ALERT) */}
      {pendingWithdrawals && pendingWithdrawals.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-mono font-black text-lg shadow-sm">
              {pendingWithdrawals.length}
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[10px] font-bold uppercase tracking-wider">Cần chi trả ngay</span>
                <span className="text-xs font-bold text-amber-950">Lệnh rút tiền đang chờ duyệt ({pendingWithdrawals.length} yêu cầu)</span>
              </div>
              <p className="text-xs text-amber-800 font-light">
                Gần nhất: <strong>{pendingWithdrawals[0].amount?.toLocaleString('vi-VN')}₫</strong> về {pendingWithdrawals[0].bankName} ({pendingWithdrawals[0].bankAccountNumber}) - Chủ TK: <strong>{pendingWithdrawals[0].bankAccountHolder}</strong>.
              </p>
            </div>
          </div>
          <Link
            href="/admin/payments"
            className="w-full sm:w-auto px-5 py-3 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-2xl transition flex items-center justify-center gap-2 shrink-0 shadow-md cursor-pointer hover:shadow-lg active:scale-98"
          >
            <CreditCard size={15} /> Vào Duyệt Chuyển Tiền Ngay →
          </Link>
        </div>
      )}

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
          onClick={() => setActiveTab("ORDERS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "ORDERS"
              ? "bg-[#183A2D] text-white shadow-sm"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <ShoppingBag size={14} className="text-emerald-600" /> Vận Hành Đơn Hàng ({recentRentals.length})
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
          <Zap size={14} className="text-yellow-500" /> Công Cụ Hỗ Trợ & Điều Chỉnh Điểm
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "OVERVIEW" && (
        <div className="space-y-8">
          
          {/* LƯỚI 6 PHÂN HỆ QUẢN TRỊ CHUYÊN SÂU */}
          <div>
            <h2 className="text-lg font-bold font-heading text-[#0A2517] mb-4 flex items-center gap-2">
              <Layers size={18} className="text-emerald-800" />
              Các Phân Hệ Báo Cáo & Đối Soát Dành Cho Team
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {navigationModules.map((mod) => (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs hover:shadow-md hover:border-[#183A2D]/50 transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="w-10 h-10 rounded-2xl bg-stone-50 border border-stone-200/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                        {mod.icon}
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-mono">
                        {mod.badge}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-[#0A2517] group-hover:text-emerald-800 transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-stone-500 leading-relaxed font-light">
                      {mod.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-emerald-800 group-hover:translate-x-1 transition-transform">
                    <span>Truy cập phân hệ</span>
                    <ChevronRight size={14} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* BẢNG TÓM TẮT ĐƠN HÀNG MỚI NHẤT TRONG TAB OVERVIEW */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-base font-bold font-heading text-[#0A2517]">
                  Đơn Hàng Vận Hành Cần Theo Dõi Gần Đây
                </h3>
                <p className="text-xs text-stone-500 font-light">
                  Kiểm soát dòng tiền Escrow, giao nhận GHN và giải ngân tiền thuê cho chủ tủ.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("ORDERS")}
                className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Xem tất cả đơn</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {recentRentals.length === 0 ? (
              <div className="text-center py-8 text-stone-400 space-y-3">
                <ShoppingBag size={32} className="mx-auto text-stone-300" />
                <p className="text-xs">Chưa có đơn hàng nào trong hệ thống.</p>
                <button
                  onClick={handleSeedOrders}
                  className="px-4 py-2 rounded-full bg-[#183A2D] text-white text-xs font-bold cursor-pointer hover:bg-[#112a20]"
                >
                  Tạo Đơn Hàng Mẫu Vận Hành
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-100 text-stone-400 uppercase text-[10px] tracking-wider font-bold">
                      <th className="py-2.5">Mã Đơn</th>
                      <th className="py-2.5">Trang Phục</th>
                      <th className="py-2.5">Người Thuê & Chủ Tủ</th>
                      <th className="py-2.5 text-right">Tiền Thuê</th>
                      <th className="py-2.5 text-right">Cọc Escrow</th>
                      <th className="py-2.5 text-center">Trạng Thái</th>
                      <th className="py-2.5 text-right">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-mono">
                    {recentRentals.slice(0, 5).map((order: any) => (
                      <tr key={order.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 font-bold text-stone-900">#{order.code}</td>
                        <td className="py-3 font-sans">
                          <p className="font-bold text-[#0A2517] line-clamp-1">{order.productTitle}</p>
                          <span className="text-[10px] text-stone-400 font-mono">{order.shippingCode}</span>
                        </td>
                        <td className="py-3 font-sans">
                          <p className="text-stone-800 font-medium">Thuê: {order.renterName}</p>
                          <p className="text-[10px] text-stone-400">Chủ: {order.ownerName}</p>
                        </td>
                        <td className="py-3 text-right font-bold text-emerald-800">
                          {order.rentalFee.toLocaleString()}₫
                        </td>
                        <td className="py-3 text-right font-bold text-teal-800">
                          {order.depositAmount.toLocaleString()}₫
                        </td>
                        <td className="py-3 text-center font-sans">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="py-3 text-right font-sans">
                          {order.status !== "LENDER_COMPLETED" ? (
                            <button
                              onClick={() => handleReleaseSingleOrder(order.id)}
                              disabled={releasingOrderId === order.id}
                              className="px-3 py-1 bg-[#183A2D] hover:bg-[#112a20] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                            >
                              {releasingOrderId === order.id ? "Đang xử lý..." : "Nhả Cọc & Trả Tiền"}
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 font-mono">✓ Đã tất toán</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* QUY MÔ HỆ THỐNG */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs">
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
      )}

      {/* TAB 2: TOÀN BỘ ĐƠN HÀNG VẬN HÀNH THỰC TẾ */}
      {activeTab === "ORDERS" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-stone-100">
              <div>
                <h3 className="text-lg font-bold font-heading text-[#0A2517]">
                  Sổ Theo Dõi Chi Tiết Từng Đơn Hàng Vận Hành Toàn Sàn
                </h3>
                <p className="text-xs text-stone-500 font-light">
                  Kiểm soát từng dòng tiền: Tiền thuê, Cọc Escrow, Phí sàn 12%, và Lịch trình giao nhận GHN.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTriggerFastEscrowRelease}
                  disabled={isReleasingEscrow}
                  className="px-4 py-2 rounded-xl bg-[#183A2D] hover:bg-[#112a20] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isReleasingEscrow ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} className="text-amber-400" />}
                  <span>Giải Ngân Toàn Bộ Đơn Đủ Điều Kiện</span>
                </button>
              </div>
            </div>

            {recentRentals.length === 0 ? (
              <div className="text-center py-12 text-stone-400 space-y-3">
                <ShoppingBag size={36} className="mx-auto text-stone-300" />
                <p className="text-sm font-medium">Chưa có đơn hàng nào.</p>
                <button
                  onClick={handleSeedOrders}
                  className="px-5 py-2.5 rounded-full bg-[#183A2D] text-white text-xs font-bold cursor-pointer"
                >
                  Tạo Đơn Hàng Mẫu Thực Tế
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-100 text-stone-400 uppercase text-[10px] tracking-wider font-bold">
                      <th className="py-3">Mã Đơn & Vận Đơn</th>
                      <th className="py-3">Trang Phục</th>
                      <th className="py-3">Khách Thuê (SĐT)</th>
                      <th className="py-3">Chủ Tủ (SĐT)</th>
                      <th className="py-3 text-center">Thời Gian Thuê</th>
                      <th className="py-3 text-right">Tiền Thuê / Cọc</th>
                      <th className="py-3 text-center">Trạng Thái</th>
                      <th className="py-3 text-right">Thao Tác Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-mono">
                    {recentRentals.map((order: any) => (
                      <tr key={order.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5">
                          <span className="font-bold text-stone-900 block">#{order.code}</span>
                          <span className="text-[10px] text-stone-400 font-mono">{order.shippingCode}</span>
                        </td>
                        <td className="py-3.5 font-sans">
                          <p className="font-bold text-[#0A2517] line-clamp-1">{order.productTitle}</p>
                          <span className="text-[10px] text-stone-400">Phí sàn 12%: {order.platformFee.toLocaleString()}₫</span>
                        </td>
                        <td className="py-3.5 font-sans">
                          <p className="font-semibold text-stone-800">{order.renterName}</p>
                          <span className="text-[10px] text-stone-400 font-mono">{order.renterPhone}</span>
                        </td>
                        <td className="py-3.5 font-sans">
                          <p className="font-semibold text-stone-800">{order.ownerName}</p>
                          <span className="text-[10px] text-stone-400 font-mono">{order.ownerPhone}</span>
                        </td>
                        <td className="py-3.5 text-center font-sans text-[11px] text-stone-600">
                          {order.startDate} &rarr; {order.endDate}
                        </td>
                        <td className="py-3.5 text-right">
                          <p className="font-bold text-emerald-800">{order.rentalFee.toLocaleString()}₫</p>
                          <span className="text-[10px] text-teal-700 font-bold">Cọc: {order.depositAmount.toLocaleString()}₫</span>
                        </td>
                        <td className="py-3.5 text-center font-sans">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="py-3.5 text-right font-sans">
                          {order.status !== "LENDER_COMPLETED" ? (
                            <button
                              onClick={() => handleReleaseSingleOrder(order.id)}
                              disabled={releasingOrderId === order.id}
                              className="px-3 py-1.5 bg-[#183A2D] hover:bg-[#112a20] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                            >
                              {releasingOrderId === order.id ? "Đang xử lý..." : "Hoàn Cọc & Giải Ngân"}
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 font-mono bg-emerald-50 px-2 py-1 rounded-md">
                              ✓ Đã tất toán
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TOOLS & ĐIỀU CHỈNH ĐIỂM LÁ */}
      {activeTab === "TOOLS" && (
        <div className="space-y-6">
          
          {/* CÔNG CỤ TẠO ĐƠN MẪU THỰC TẾ */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-base font-bold font-heading text-[#0A2517]">
                  Khởi Tạo / Đồng Bộ Dữ Liệu Vận Hành Toàn Sàn
                </h3>
                <p className="text-xs text-stone-500 font-light">
                  Tự động đồng bộ các đơn hàng mẫu trải dài qua các chu trình: Đang thuê, Chờ cọc, Đã hoàn tất và Ghi sổ cái.
                </p>
              </div>
              <button
                onClick={handleSeedOrders}
                disabled={isSeeding}
                className="px-6 py-2.5 bg-[#183A2D] hover:bg-[#112a20] text-white rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSeeding ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                <span>{isSeeding ? "Đang tạo dữ liệu..." : "Tạo Đơn Hàng Mẫu Thực Tế"}</span>
              </button>
            </div>
          </div>

          {/* CÔNG CỤ BƠM ĐIỂM LÁ CHO USER */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs space-y-5">
            <div className="pb-3 border-b border-stone-100">
              <h3 className="text-base font-bold font-heading text-[#0A2517] flex items-center gap-2">
                <Zap size={18} className="text-amber-500" />
                Cấp Tặng & Điều Chỉnh Điểm Lá CLOOP Cho Thành Viên
              </h3>
              <p className="text-xs text-stone-500 font-light mt-0.5">
                Tìm kiếm tài khoản theo email và cấp tặng Lá CLOOP kèm ghi sổ cái kế toán tự động.
              </p>
            </div>

            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email thành viên cần tìm..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm outline-none focus:border-[#183A2D]"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-6 py-2.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {isSearching ? "Đang tìm..." : "Tìm Kiếm"}
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
