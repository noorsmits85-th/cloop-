"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getDepositVaultMetricsAction } from "./actions";

function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}₫`;
}

export default function DepositVaultAdmin() {
  const [vaultSummary, setVaultSummary] = useState({
    totalVault: 0,
    pendingReturn: 0,
    activeRentalDeposit: 0,
    activeCount: 0,
    totalHistoricalSettled: 0,
    settledCount: 0,
  });
  const [floatStrategy, setFloatStrategy] = useState<any>(null);
  const [activeTransactions, setActiveTransactions] = useState<any[]>([]);
  const [settledTransactions, setSettledTransactions] = useState<any[]>([]);
  const [currentTab, setCurrentTab] = useState<"ACTIVE" | "SETTLED">("ACTIVE");
  const [loading, setLoading] = useState(true);

  async function calculateVaultMetrics() {
    try {
      setLoading(true);
      const res = await getDepositVaultMetricsAction();
      if (res.success && res.data) {
        setVaultSummary(res.data.vaultSummary);
        setFloatStrategy(res.data.floatStrategy);
        setActiveTransactions(res.data.activeTransactions);
        setSettledTransactions(res.data.settledTransactions);
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu tiền cọc:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    calculateVaultMetrics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[400px] flex justify-center items-center text-xs text-stone-500 font-bold uppercase tracking-wider">
        Đang tải dữ liệu quỹ tiền cọc...
      </div>
    );
  }

  const displayedTransactions = currentTab === "ACTIVE" ? activeTransactions : settledTransactions;

  return (
    <div className="w-full text-stone-900 pb-16 space-y-6">
      {/* TIÊU ĐỀ CHÍNH */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#183A2D] uppercase">
            Quản Lý Tiền Cọc Bảo Chứng
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/ledger"
            className="border border-stone-300 bg-white text-stone-700 px-3.5 py-2 rounded-md text-xs font-bold hover:bg-stone-50 transition"
          >
            Xem Sổ Cái TT 99
          </Link>
          <button
            type="button"
            onClick={calculateVaultMetrics}
            className="border border-stone-300 bg-white text-stone-700 px-3.5 py-2 rounded-md text-xs font-bold hover:bg-stone-50 transition cursor-pointer"
          >
            Làm mới số liệu
          </button>
        </div>
      </div>

      {/* 4 KHỐI SỐ LIỆU CHÍNH XÁC TỪNG ĐỒNG */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 p-5 rounded-lg space-y-2">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            Tổng tiền cọc đang giữ
          </span>
          <p className="text-2xl font-bold font-mono text-[#183A2D]">
            {formatVnd(vaultSummary.totalVault)}
          </p>
        </div>

        <div className="bg-white border border-stone-200 p-5 rounded-lg space-y-2">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            Đến hạn hoàn trả (trong 3 ngày)
          </span>
          <p className="text-2xl font-bold font-mono text-amber-800">
            {formatVnd(vaultSummary.pendingReturn)}
          </p>
        </div>

        <div className="bg-white border border-stone-200 p-5 rounded-lg space-y-2">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            Tiền cọc trong hạn thuê
          </span>
          <p className="text-2xl font-bold font-mono text-stone-900">
            {formatVnd(vaultSummary.activeRentalDeposit)}
          </p>
        </div>

        <div className="bg-white border border-stone-200 p-5 rounded-lg space-y-2">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            Số đơn đang tạm giữ cọc
          </span>
          <p className="text-2xl font-bold font-mono text-stone-900">
            {vaultSummary.activeCount} đơn
          </p>
        </div>
      </div>

      {/* PHÂN BỔ VỐN KÝ QUỸ FLOAT 70/30 */}
      {floatStrategy && (
        <div className="bg-white rounded-lg border border-stone-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-200">
                Tỷ Lệ 70/30
              </span>
              <h2 className="text-sm font-bold text-[#183A2D] uppercase">
                Phân Bổ Vốn Ký Quỹ Nhàn Rỗi (Escrow Float)
              </h2>
            </div>
            <div className="text-xs font-mono">
              <span className="text-stone-400">Lợi tức: </span>
              <span className="font-bold text-emerald-700">+{formatVnd(floatStrategy.estimatedAnnualYield)}/năm</span>
              <span className="text-stone-400"> (~{formatVnd(floatStrategy.estimatedMonthlyYield)}/tháng)</span>
            </div>
          </div>

          {/* Thanh Tiến Trình Phân Bổ */}
          <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden flex border border-stone-200">
            <div
              style={{ width: "30%" }}
              className="bg-[#183A2D] h-full flex items-center justify-center text-[9px] font-bold text-white tracking-wider"
              title="30% Thanh khoản tức thời (T+0)"
            >
              30% T+0
            </div>
            <div
              style={{ width: "45%" }}
              className="bg-emerald-600 h-full flex items-center justify-center text-[9px] font-bold text-white tracking-wider"
              title="45% Sinh lời linh hoạt (T+1)"
            >
              45% T+1
            </div>
            <div
              style={{ width: "25%" }}
              className="bg-amber-600 h-full flex items-center justify-center text-[9px] font-bold text-white tracking-wider"
              title="25% Kỳ hạn 1 tháng (T+30)"
            >
              25% T+30
            </div>
          </div>

          {/* 3 Thẻ Danh Mục Ngắn Gọn */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-md bg-stone-50 border border-stone-200 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase text-stone-500 block">Thanh khoản tức thời (30%)</span>
                <p className="text-xl font-bold font-mono text-[#183A2D]">{formatVnd(floatStrategy.liquidityBuffer)}</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-stone-600 border border-stone-200">
                T+0 tức thì
              </span>
            </div>

            <div className="p-3.5 rounded-md bg-emerald-50/50 border border-emerald-200/80 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-800 block">Sinh lời linh hoạt (45%)</span>
                <p className="text-xl font-bold font-mono text-emerald-900">{formatVnd(floatStrategy.flexibleInvestment)}</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-emerald-800 border border-emerald-200">
                Lãi ~4.8%/năm
              </span>
            </div>

            <div className="p-3.5 rounded-md bg-amber-50/50 border border-amber-200/80 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase text-amber-800 block">Kỳ hạn 1 tháng (25%)</span>
                <p className="text-xl font-bold font-mono text-amber-900">{formatVnd(floatStrategy.fixedInvestment)}</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-amber-800 border border-amber-200">
                Lãi ~6.2%/năm
              </span>
            </div>
          </div>

          {/* Phân bổ Lấy ngắn nuôi dài: 4 ô gọn trên 1 hàng */}
          <div className="pt-2 border-t border-stone-100">
            <span className="text-[10px] font-bold uppercase text-stone-400 block mb-2 font-mono">
              Tái Đầu Tư Lợi Tức (Lấy Ngắn Nuôi Dài)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-stone-50 rounded border border-stone-200 flex justify-between items-center">
                <span className="text-stone-600 text-[11px] font-medium">50% Quỹ Bảo Chứng</span>
                <span className="font-mono font-bold text-emerald-800">{formatVnd(floatStrategy.reinvestmentBreakdown.reserveFund)}</span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded border border-stone-200 flex justify-between items-center">
                <span className="text-stone-600 text-[11px] font-medium">25% Bù Phí PayOS</span>
                <span className="font-mono font-bold text-stone-800">{formatVnd(floatStrategy.reinvestmentBreakdown.paymentFeeOffset)}</span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded border border-stone-200 flex justify-between items-center">
                <span className="text-stone-600 text-[11px] font-medium">15% Xu Leaf Coins</span>
                <span className="font-mono font-bold text-stone-800">{formatVnd(floatStrategy.reinvestmentBreakdown.greenRewards)}</span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded border border-stone-200 flex justify-between items-center">
                <span className="text-stone-600 text-[11px] font-medium">10% Dự Phòng Hệ Thống</span>
                <span className="font-mono font-bold text-stone-800">{formatVnd(floatStrategy.reinvestmentBreakdown.techBuffer)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BẢNG DỮ LIỆU THẬT */}
      <div className="bg-white rounded-lg border border-stone-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-stone-100 pb-3">
          <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wide">
            {currentTab === "ACTIVE"
              ? "Danh Sách Tiền Cọc Đang Tạm Giữ Thực Tế"
              : "Lịch Sử Tiền Cọc Đã Hoàn Trả / Giải Ngân"}
          </h2>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentTab("ACTIVE")}
              className={`rounded px-3 py-1 text-xs font-bold transition ${
                currentTab === "ACTIVE"
                  ? "bg-[#183A2D] text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Đang tạm giữ ({vaultSummary.activeCount})
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab("SETTLED")}
              className={`rounded px-3 py-1 text-xs font-bold transition ${
                currentTab === "SETTLED"
                  ? "bg-[#183A2D] text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Lịch sử hoàn cọc ({vaultSummary.settledCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px] tracking-wider text-left">
                <th className="pb-3">Mã đơn</th>
                <th className="pb-3">Sản phẩm</th>
                <th className="pb-3">Khách thuê</th>
                <th className="pb-3">Chủ tủ</th>
                <th className="pb-3 text-right">Tiền cọc</th>
                <th className="pb-3 text-center">Trạng thái</th>
                <th className="pb-3 text-right">Thời hạn thuê</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
              {displayedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-stone-500">
                    <p className="text-stone-400 text-xs">
                      {currentTab === "ACTIVE"
                        ? "Hiện chưa có giao dịch nào đang giữ cọc."
                        : "Chưa có lịch sử hoàn cọc."}
                    </p>
                  </td>
                </tr>
              ) : (
                displayedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-stone-50 transition">
                    <td className="py-3 font-mono font-bold text-[#183A2D]">
                      {tx.orderCode}
                    </td>
                    <td className="py-3 font-semibold text-stone-900 max-w-[200px] truncate">
                      {tx.productTitle}
                    </td>
                    <td className="py-3">
                      <p className="font-semibold text-stone-900">{tx.renterName}</p>
                      <p className="font-mono text-[11px] text-stone-400">{tx.renterPhone}</p>
                    </td>
                    <td className="py-3">
                      <p className="font-semibold text-stone-900">{tx.ownerName}</p>
                      <p className="font-mono text-[11px] text-stone-400">{tx.ownerPhone}</p>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-stone-900">
                      {formatVnd(tx.depositAmount)}
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded border text-[10px] font-bold ${
                          tx.isSettled
                            ? "border-stone-200 bg-stone-100 text-stone-600"
                            : "border-emerald-200 bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        {tx.statusLabel}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-[11px] text-stone-500 whitespace-nowrap">
                      {tx.startDate} → {tx.endDate}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
