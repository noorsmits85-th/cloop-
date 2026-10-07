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
      {/* TIÊU ĐỀ CHÍNH - 100% TIẾNG VIỆT, KHÔNG ICON VỚ VẨN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#183A2D] uppercase">
            Quản Lý Tiền Cọc Bảo Chứng
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            Dữ liệu kế toán thực tế theo thời gian thực từ cổng thanh toán và trạng thái đơn hàng.
          </p>
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
                    {currentTab === "ACTIVE" ? (
                      <div className="space-y-1">
                        <p className="font-bold text-stone-700">
                          Hiện không có đơn hàng nào đang tạm giữ tiền cọc.
                        </p>
                        <p className="text-[11px] text-stone-400">
                          Hệ thống chỉ ghi nhận tiền cọc khi khách thanh toán thành công qua PayOS/VietQR.
                        </p>
                      </div>
                    ) : (
                      <p className="font-bold text-stone-700">Chưa có lịch sử hoàn cọc nào.</p>
                    )}
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
