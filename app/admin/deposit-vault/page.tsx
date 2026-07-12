"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Wallet, ArrowUpRight, ArrowDownLeft, ShieldCheck, TrendingUp, RefreshCw } from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function DepositVaultAdmin() {
  const [vaultSummary, setVaultSummary] = useState({
    totalVault: 0,       // Tổng tiền cọc đang giữ
    pendingReturn: 0,    // Tiền cọc sắp phải hoàn trả trong tuần
    availableLiquidity: 0, // Dòng tiền nhàn rỗi có thể tối ưu sinh lời
    estimatedInterest: 0  // Lợi nhuận phát sinh dự kiến (lãi suất tích lũy ngắn hạn)
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function calculateVaultMetrics() {
    try {
      setLoading(true);
      
      // 1. Quét toàn bộ lịch sử thuê đồ để tính toán dòng tiền cọc
      const { data: rentalHistory } = await supabase.from("rental_history").select("*, products(title)");
      const { data: listingsData } = await supabase.from("Listing").select("*");

      if (!rentalHistory || !listingsData) return;

      let totalVault = 0;
      let pendingReturn = 0;
      const today = new Date();

      const formattedTx = (rentalHistory || []).map((rent: any) => {
        // Tìm cấu trúc giá cọc của sản phẩm tương ứng
        const listing = (listingsData || []).find((l: any) => String(l.productId) === String(rent.product_id));
        const rentPrice = listing?.basePrice || 0;
        const depositPercent = listing?.deposit || 100;
        
        // Tính toán số tiền cọc thật sự của đơn này
        const startDate = new Date(rent.start_date);
        const endDate = new Date(rent.end_date);
        const days = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
        const depositAmount = Math.round(((rentPrice * days) * depositPercent) / 100);

        // Phân loại trạng thái dòng tiền cọc
        if (rent.status === "active") {
          totalVault += depositAmount;
          
          // Nếu đơn hàng sắp kết thúc trong 3 ngày tới, xếp vào nhóm sắp hoàn trả
          const timeDiffToInvoceEnd = endDate.getTime() - today.getTime();
          const daysToReturn = Math.ceil(timeDiffToInvoceEnd / 86400000);
          if (daysToReturn <= 3 && daysToReturn >= 0) {
            pendingReturn += depositAmount;
          }
        }

        return {
          id: rent.id,
          productName: rent.products?.title || "Trang phục CLOOP",
          renterName: rent.renter_name,
          amount: depositAmount,
          status: rent.status,
          date: rent.start_date
        };
      });

      // Bài toán kinh tế: Tiền nhàn rỗi khả dụng = Tổng tiền đang giữ - Tiền bắt buộc phải trả trong 3 ngày tới
      const availableLiquidity = Math.max(0, totalVault - pendingReturn);
      
      // Giả định lãi suất tích lũy qua đêm / ngắn hạn hợp tác với Ngân hàng là 4.5%/năm
      const estimatedInterest = Math.round((availableLiquidity * 0.045) / 365);

      setVaultSummary({
        totalVault,
        pendingReturn,
        availableLiquidity,
        estimatedInterest
      });

      setTransactions(formattedTx.filter(t => t.amount > 0).slice(0, 5)); // Lấy 5 giao dịch tiền cọc gần nhất

    } catch (error) {
      console.error("Lỗi tính toán quỹ bảo chứng:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    calculateVaultMetrics();
  }, []);

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex justify-center items-center text-xs text-slate-500 font-bold uppercase tracking-wider">Đang phân tích két sắt tiền cọc...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 font-sans text-slate-800 text-left">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">Hệ thống Quản lý Quỹ Bảo chứng (Deposit Vault)</h1>
            <p className="text-slate-500 text-xs mt-1">Hệ thống giám sát tối ưu hóa thanh khoản và quản trị dòng tiền ngắn hạn của CLOOP Network.</p>
          </div>
          <button onClick={calculateVaultMetrics} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-50 shadow-sm transition-all">
            <RefreshCw size={14} /> Làm mới số liệu
          </button>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* CARD 1: TOTAL VAULT */}
          <div className="bg-white border p-5 rounded-2xl shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng tiền cọc đang giữ</span>
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700"><Wallet size={16} /></div>
            </div>
            <div>
              <h3 className="text-2xl font-bold font-mono text-slate-900">{vaultSummary.totalVault.toLocaleString()}đ</h3>
              <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-0.5">✓ Két sắt bảo chứng an toàn</p>
            </div>
          </div>

          {/* CARD 2: PENDING RETURNS */}
          <div className="bg-white border p-5 rounded-2xl shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hạn trả trong 3 ngày</span>
              <div className="p-2 bg-amber-50 rounded-xl text-amber-700"><ArrowDownLeft size={16} /></div>
            </div>
            <div>
              <h3 className="text-2xl font-bold font-mono text-slate-900">{vaultSummary.pendingReturn.toLocaleString()}đ</h3>
              <p className="text-[10px] text-slate-400 mt-1">Dòng tiền bắt buộc phải giữ cố định</p>
            </div>
          </div>

          {/* CARD 3: AVAILABLE LIQUIDITY */}
          <div className="bg-white border p-5 rounded-2xl shadow-sm space-y-3 border-blue-100 bg-gradient-to-b from-blue-50/10 to-white">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Vốn nhàn rỗi khả dụng</span>
              <div className="p-2 bg-blue-50 rounded-xl text-blue-700"><ShieldCheck size={16} /></div>
            </div>
            <div>
              <h3 className="text-2xl font-bold font-mono text-blue-900">{vaultSummary.availableLiquidity.toLocaleString()}đ</h3>
              <p className="text-[10px] text-blue-600 font-medium mt-1">🚀 Có thể đem đi tối ưu sinh lời ngắn hạn</p>
            </div>
          </div>

          {/* CARD 4: ESTIMATED INTEREST */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-md space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-center relative z-10">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lợi nhuận ngày dự kiến</span>
              <div className="p-2 bg-white/10 rounded-xl text-emerald-400"><TrendingUp size={16} /></div>
            </div>
            <div className="relative z-10">
              <h3 className="text-2xl font-bold font-mono text-emerald-400">+{vaultSummary.estimatedInterest.toLocaleString()}đ<span className="text-xs text-white/60 font-sans"> / ngày</span></h3>
              <p className="text-[10px] text-slate-300 mt-1">Ước tính theo gói tích lũy 4.5%/năm</p>
            </div>
          </div>

        </div>

        {/* LỊCH SỬ BIẾN ĐỘNG QUỸ BẢO CHỨNG */}
        <div className="bg-white rounded-2xl border p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Nhật ký dòng tiền bảo chứng gần đây</h2>
            <p className="text-xs text-slate-400">Biến động quỹ ký quỹ thực tế từ các lệnh giao dịch của khách hàng.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="pb-3">Sản phẩm điều phối</th>
                  <th className="pb-3">Khách hàng</th>
                  <th className="pb-3 text-center">Giá trị cọc</th>
                  <th className="pb-3 text-center">Trạng thái Quỹ</th>
                  <th className="pb-3 text-right">Ngày kích hoạt</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium text-slate-600">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 font-semibold text-slate-900">{tx.productName}</td>
                    <td className="py-3.5">{tx.renterName}</td>
                    <td className="py-3.5 text-center font-mono font-bold text-slate-950">+{tx.amount.toLocaleString()}đ</td>
                    <td className="py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        tx.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-400"
                      }`}>
                        {tx.status === "active" ? "Đang tạm giữ" : "Đã hoàn trả"}
                      </span>
                    </td>
                    <td className="py-3.5 text-right font-mono text-slate-400">{tx.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-left">
          <Link href="/my-closet" className="text-xs font-semibold uppercase text-slate-400 hover:text-slate-900 transition-colors">
            ← Quay lại tủ đồ của bạn
          </Link>
        </div>

      </div>
    </div>
  );
}