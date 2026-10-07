"use client";

import React, { useState } from "react";
import { executeMonthlyClosing } from "@/app/actions/accounting";
import { Calculator, CheckCircle2, AlertTriangle, CalendarDays, Loader2, Info } from "lucide-react";

export default function AccountingClient({ initialPeriods }: { initialPeriods: any[] }) {
  const [periods, setPeriods] = useState(initialPeriods);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form values
  const now = new Date();
  const [targetMonth, setTargetMonth] = useState(now.getMonth() + 1);
  const [targetYear, setTargetYear] = useState(now.getFullYear());
  const [allowInterim, setAllowInterim] = useState(false);

  const handleClosePeriod = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await executeMonthlyClosing(targetMonth, targetYear, allowInterim);
      if (!result.success) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || "Lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Cột trái: Form Chốt Sổ */}
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm sticky top-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
              <Calculator size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Chốt Sổ Kỳ Kế Toán</h2>
              <p className="text-sm text-stone-500">Kết chuyển doanh thu & chi phí thực tế</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm flex items-start gap-3">
              <AlertTriangle className="shrink-0" size={18} />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">Tháng</label>
              <input 
                type="number" 
                min={1} max={12}
                value={targetMonth}
                onChange={e => setTargetMonth(Number(e.target.value))}
                className="w-full border border-stone-300 rounded-lg p-3 text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">Năm</label>
              <input 
                type="number" 
                min={2020} max={2100}
                value={targetYear}
                onChange={e => setTargetYear(Number(e.target.value))}
                className="w-full border border-stone-300 rounded-lg p-3 text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="allowInterim" 
                  checked={allowInterim}
                  onChange={e => setAllowInterim(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="allowInterim" className="text-sm text-stone-700 font-medium cursor-pointer">
                  Chốt sổ tạm tính giữa kỳ
                </label>
              </div>
              <p className="text-[11px] text-stone-500 leading-tight">
                Sử dụng khi kỳ kế toán hiện tại chưa hết tháng nhưng Ban Quản trị cần khóa số liệu tạm tính để báo cáo.
              </p>
            </div>

            <button
              onClick={handleClosePeriod}
              disabled={loading}
              className="w-full mt-4 bg-[#183A2D] hover:bg-[#112a20] text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
              Thực hiện Chốt sổ {targetMonth}/{targetYear}
            </button>
          </div>
        </div>
      </div>

      {/* Cột phải: Lịch sử Kỳ Kế toán */}
      <div className="lg:col-span-2">
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="p-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Kỳ Kế Toán</th>
                <th className="p-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">Doanh Thu Thuần</th>
                <th className="p-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">Chi Phí</th>
                <th className="p-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">Lợi Nhuận Gộp</th>
                <th className="p-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {periods.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-stone-500">
                    Chưa có kỳ kế toán nào được đóng.
                  </td>
                </tr>
              ) : periods.map((period: any) => {
                let meta: any = null;
                try {
                  meta = period.metadata ? JSON.parse(period.metadata) : null;
                } catch (e) {
                  meta = null;
                }

                return (
                  <tr key={period.id} className="hover:bg-stone-50 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                          <CalendarDays size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-stone-900">Tháng {period.month}/{period.year}</p>
                          <p className="text-xs text-stone-500">Chốt lúc: {period.closedAt ? new Date(period.closedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'N/A'}</p>
                          {meta?.isInterim && (
                            <span className="inline-block mt-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Tạm tính giữa kỳ
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-mono font-bold text-stone-800">
                        {(period.revenueTotal ?? 0).toLocaleString()}đ
                      </div>
                      {meta && (meta.feeRevenue > 0 || meta.coinRevenue > 0) && (
                        <div className="text-[10px] text-stone-400 font-sans mt-0.5">
                          {meta.feeRevenue > 0 && <span>Sàn: {meta.feeRevenue.toLocaleString()}đ </span>}
                          {meta.coinRevenue > 0 && <span>• Xu: {meta.coinRevenue.toLocaleString()}đ</span>}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right font-mono font-medium text-stone-700">
                      {(period.expenseTotal ?? 0).toLocaleString()}đ
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-700">
                      {(period.netProfit ?? 0).toLocaleString()}đ
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold tracking-wide">
                        <CheckCircle2 size={14} />
                        ĐÃ ĐÓNG KỲ
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
