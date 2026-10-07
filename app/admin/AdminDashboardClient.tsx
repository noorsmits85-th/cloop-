"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  CreditCard, 
  FileText, 
  Truck, 
  Scale, 
  CheckCircle2, 
  Loader2,
  Layers,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { 
  releaseSingleEscrowOrderAction,
  refreshAdminViewsAction 
} from "@/app/actions/admin";

interface AdminDashboardClientProps {
  currentAdmin: {
    name: string;
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
  pendingWithdrawals = []
}: AdminDashboardClientProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [releasingOrderId, setReleasingOrderId] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);

  // Làm mới số liệu thực tế toàn bộ hệ thống
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    setActionResult(null);
    try {
      const res = await refreshAdminViewsAction();
      if (res.success) {
        setActionResult({ success: true, message: res.message || "Đã làm mới số liệu thành công!" });
      } else {
        setActionResult({ success: false, message: res.error || "Lỗi khi làm mới" });
      }
    } catch (err: any) {
      setActionResult({ success: false, message: err.message || "Lỗi hệ thống" });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Kích hoạt tất toán cho 1 đơn cụ thể
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_APPROVAL":
      case "WAITING_SHIP":
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">Chờ duyệt</span>;
      case "OWNER_PACKED":
      case "LENDER_APPROVED":
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200">Đã đóng gói</span>;
      case "LENDER_SHIPPED":
      case "SHIPPED":
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-800 border border-purple-200">Đang giao GHN</span>;
      case "BORROWER_RECEIVED":
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-teal-50 text-teal-800 border border-teal-200">Đang sử dụng</span>;
      case "BORROWER_RETURNED":
      case "RETURNED":
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-orange-50 text-orange-800 border border-orange-200">Đã trả đồ • Chờ duyệt</span>;
      case "LENDER_COMPLETED":
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">Hoàn tất</span>;
      case "DISPUTE":
      case "DISPUTED":
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200">Khiếu nại</span>;
      case "CANCELLED":
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-500 border border-stone-200">Đã hủy</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-700">{status}</span>;
    }
  };

  const getPaymentBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case "ĐÃ_THANH_TOÁN":
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">Đã thanh toán</span>;
      case "CHỜ_THANH_TOÁN":
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">Chờ thanh toán</span>;
      case "CHƯA_CÓ_HÓA_ĐƠN":
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-500 border border-stone-200">Chưa có hóa đơn</span>;
    }
  };

  const navigationModules = [
    {
      title: "Quỹ Tiền Cọc Bảo Chứng",
      description: "Theo dõi số dư tiền cọc ký quỹ đang tạm giữ và lịch sử hoàn cọc cho khách thuê.",
      href: "/admin/deposit-vault",
      icon: <ShieldCheck size={18} className="text-[#183A2D]" />,
      badge: "Tiền cọc"
    },
    {
      title: "Vận Chuyển Giao Nhận GHN",
      description: "Tạo đơn trực tiếp qua API Giao Hàng Nhanh và kiểm soát mã vận đơn khứ hồi 2 chiều.",
      href: "/admin/shipments",
      icon: <Truck size={18} className="text-[#183A2D]" />,
      badge: "Vận chuyển"
    },
    {
      title: "Khiếu Nại & Tranh Chấp",
      description: "Tiếp nhận hình ảnh phản ánh hư hỏng, xác định tỷ lệ khấu trừ cọc và bồi thường chủ tủ.",
      href: "/admin/disputes",
      icon: <Scale size={18} className="text-[#183A2D]" />,
      badge: "Tranh chấp"
    },
    {
      title: "Sổ Cái Kế Toán TT 99",
      description: "Nhật ký ghi sổ kép bất biến theo Thông tư 99/2025/TT-BTC, bóc tách dòng tiền vào - ra.",
      href: "/admin/ledger",
      icon: <Layers size={18} className="text-[#183A2D]" />,
      badge: "Sổ cái"
    },
    {
      title: "Chi Trả Doanh Thu Chủ Tủ",
      description: "Duyệt lệnh rút tiền, tạo mã VietQR chuẩn Napas và đối soát chuyển khoản cho chủ tủ.",
      href: "/admin/payments",
      icon: <CreditCard size={18} className="text-[#183A2D]" />,
      badge: "Chi trả"
    },
    {
      title: "Kỳ Kế Toán & Lợi Nhuận",
      description: "Chốt sổ kế toán theo tháng, đối soát doanh thu thực nhận và báo cáo lợi nhuận toàn sàn.",
      href: "/admin/accounting",
      icon: <FileText size={18} className="text-[#183A2D]" />,
      badge: "Kế toán"
    }
  ];

  return (
    <div className="w-full space-y-6 text-left font-sans">
      
      {/* HEADER TỔNG QUAN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#183A2D] text-white p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Tổng Quan Quản Trị Hệ Thống
          </h1>
          <p className="text-white/75 text-xs mt-1">
            Quản trị viên: <span className="text-emerald-300 font-semibold">{currentAdmin.name}</span>
          </p>
        </div>

        <button
          onClick={handleRefreshData}
          disabled={isRefreshing}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin text-emerald-300" : ""} />
          <span>{isRefreshing ? "Đang cập nhật..." : "Làm mới số liệu"}</span>
        </button>
      </div>

      {/* THÔNG BÁO KẾT QUẢ THAO TÁC */}
      {actionResult && (
        <div className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 ${
          actionResult.success 
            ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
            : "bg-rose-50 border-rose-200 text-rose-900"
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className={actionResult.success ? "text-emerald-700" : "text-rose-700"} />
            <span>{actionResult.message}</span>
          </div>
          <button onClick={() => setActionResult(null)} className="text-xs font-semibold underline opacity-70 hover:opacity-100 cursor-pointer">
            Đóng
          </button>
        </div>
      )}

      {/* CẢNH BÁO LỆNH RÚT TIỀN CHỜ DUYỆT */}
      {pendingWithdrawals && pendingWithdrawals.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {pendingWithdrawals.length}
            </div>
            <div>
              <p className="font-bold text-amber-950">
                Có {pendingWithdrawals.length} yêu cầu rút tiền đang chờ duyệt
              </p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Gần nhất: {pendingWithdrawals[0].amount?.toLocaleString('vi-VN')}₫ • {pendingWithdrawals[0].bankName} ({pendingWithdrawals[0].bankAccountNumber}) - {pendingWithdrawals[0].bankAccountHolder}
              </p>
            </div>
          </div>
          <Link
            href="/admin/payments"
            className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-xl transition text-xs shrink-0 cursor-pointer"
          >
            Xử lý chi trả →
          </Link>
        </div>
      )}

      {/* 4 CHỈ SỐ TÀI CHÍNH CỐT LÕI (SỐ LIỆU DATABASE 100%) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: TỔNG GIÁ TRỊ GIAO DỊCH */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-1">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Tổng Giá Trị Giao Dịch</span>
          <div className="text-2xl font-bold font-mono text-stone-900">
            {metrics.totalGMV.toLocaleString('vi-VN')}₫
          </div>
          <p className="text-[11px] text-stone-400">Tổng tiền khách đã trả qua sàn</p>
        </div>

        {/* KPI 2: TIỀN CỌC ĐANG GIỮ */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-1">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Tiền cọc đang giữ</span>
          <div className="text-2xl font-bold font-mono text-teal-800">
            {metrics.totalDepositEscrow.toLocaleString('vi-VN')}₫
          </div>
          <p className="text-[11px] text-stone-400">Đơn đang trong thời hạn thuê</p>
        </div>

        {/* KPI 3: DOANH THU PHÍ SÀN */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-1">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Doanh thu phí sàn (12%)</span>
          <div className="text-2xl font-bold font-mono text-blue-900">
            {Math.round(metrics.totalPlatformFee).toLocaleString('vi-VN')}₫
          </div>
          <p className="text-[11px] text-stone-400">Trích từ tiền thuê hoàn tất</p>
        </div>

        {/* KPI 4: DOANH THU BÁN XU LÁ */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-1">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Doanh thu bán Xu Lá</span>
          <div className="text-2xl font-bold font-mono text-amber-800">
            {metrics.totalCoinRevenue.toLocaleString('vi-VN')}₫
          </div>
          <p className="text-[11px] text-stone-400">Đã phát hành {metrics.totalCoinsIssued.toLocaleString('vi-VN')} Lá</p>
        </div>
      </div>

      {/* 6 PHÂN HỆ QUẢN TRỊ */}
      <div>
        <h2 className="text-base font-bold text-stone-900 mb-3">
          Phân Hệ Chức Năng
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {navigationModules.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-[#183A2D] hover:shadow-xs transition-all flex flex-col justify-between gap-3 group"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">
                    {mod.icon}
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                    {mod.badge}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-stone-900 group-hover:text-[#183A2D] transition-colors">
                  {mod.title}
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  {mod.description}
                </p>
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-[#183A2D]">
                <span>Truy cập</span>
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* QUY MÔ HỆ THỐNG */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
          Quy Mô Hoạt Động
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center divide-x divide-stone-100">
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[#183A2D]">{metrics.totalUsers}</div>
            <div className="text-xs text-stone-500 mt-0.5">Thành viên</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[#183A2D]">{metrics.totalProducts}</div>
            <div className="text-xs text-stone-500 mt-0.5">Món đồ</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[#183A2D]">{metrics.totalRentals}</div>
            <div className="text-xs text-stone-500 mt-0.5">Lượt thuê</div>
          </div>
        </div>
      </div>

      {/* BẢNG ĐƠN HÀNG VẬN HÀNH GẦN ĐÂY */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-stone-100">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Đơn Hàng Gần Đây ({recentRentals.length})
            </h3>
            <p className="text-xs text-stone-500">
              Dữ liệu đơn hàng thực tế ghi nhận từ cơ sở dữ liệu
            </p>
          </div>
        </div>

        {recentRentals.length === 0 ? (
          <div className="text-center py-8 text-stone-400 text-xs">
            Chưa có đơn hàng nào trong hệ thống.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-2.5">Mã Đơn</th>
                  <th className="py-2.5">Trang Phục</th>
                  <th className="py-2.5">Khách Thuê / Chủ Tủ</th>
                  <th className="py-2.5 text-right">Tiền Thuê</th>
                  <th className="py-2.5 text-right">Tiền Cọc</th>
                  <th className="py-2.5 text-center">Thanh Toán</th>
                  <th className="py-2.5 text-center">Vận Hành</th>
                  <th className="py-2.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {recentRentals.map((order: any) => (
                  <tr key={order.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3 font-mono font-bold text-stone-900">
                      #{order.code}
                      {order.shippingCode && order.shippingCode !== "Chưa tạo mã" && (
                        <span className="block text-[10px] font-normal text-stone-400 font-mono">
                          {order.shippingCode}
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <p className="font-semibold text-stone-900 line-clamp-1">{order.productTitle}</p>
                      <span className="text-[10px] text-stone-400">Ngày tạo: {order.createdAt}</span>
                    </td>
                    <td className="py-3 text-[11px]">
                      <p className="text-stone-800">Thuê: <span className="font-medium">{order.renterName}</span></p>
                      <p className="text-stone-500">Chủ: {order.ownerName}</p>
                    </td>
                    <td className="py-3 text-right font-mono font-semibold text-stone-800">
                      {order.rentalFee.toLocaleString('vi-VN')}₫
                    </td>
                    <td className="py-3 text-right font-mono font-semibold text-stone-800">
                      {order.depositAmount.toLocaleString('vi-VN')}₫
                    </td>
                    <td className="py-3 text-center">
                      {getPaymentBadge(order.paymentStatus)}
                    </td>
                    <td className="py-3 text-center">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="py-3 text-right">
                      {order.status === "LENDER_COMPLETED" ? (
                        <span className="text-[11px] font-semibold text-emerald-700">✓ Đã tất toán</span>
                      ) : (order.status === "BORROWER_RETURNED" || order.status === "RETURNED") ? (
                        <button
                          onClick={() => handleReleaseSingleOrder(order.id)}
                          disabled={releasingOrderId === order.id}
                          className="px-2.5 py-1 bg-[#183A2D] hover:bg-[#112a20] text-white rounded text-[10px] font-semibold transition disabled:opacity-50 cursor-pointer"
                        >
                          {releasingOrderId === order.id ? <Loader2 size={12} className="animate-spin inline" /> : "Tất toán đơn"}
                        </button>
                      ) : (
                        <span className="text-[11px] text-stone-400 font-mono">—</span>
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
  );
}
