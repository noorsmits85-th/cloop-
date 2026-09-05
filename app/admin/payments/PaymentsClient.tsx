"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle, Clock, User, CreditCard, ArrowRight, ShieldCheck, RefreshCw, FileText, CheckCircle2, Phone, AlertCircle } from "lucide-react";
import { PayoutItem, markPayoutCompletedAction } from "./actions";

export default function PaymentsClient({ initialItems }: { initialItems: PayoutItem[] }) {
  const [items, setItems] = useState<PayoutItem[]>(initialItems);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(text);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const handleMarkAsPaid = async (item: PayoutItem) => {
    setProcessingId(item.id);
    try {
      const res = await markPayoutCompletedAction(item.id);
      if (res.success) {
        setCompletedIds(prev => [...prev, item.id]);
        alert(`✅ Đã xác nhận chuyển tiền thành công cho chủ tủ ${item.ownerName} (${item.netPayoutAmount.toLocaleString()}đ)! Dòng tiền đã được ghi vết kiểm toán.`);
      } else {
        alert("Lỗi: " + res.error);
      }
    } catch (err: any) {
      alert("Lỗi hệ thống: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const activeItems = items.filter(it => !completedIds.includes(it.id));
  const totalPendingAmount = activeItems.reduce((sum, it) => sum + it.netPayoutAmount, 0);

  return (
    <div className="p-6 sm:p-10 bg-[#FAF9F5] min-h-screen text-left font-sans">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">
              <CreditCard size={16} /> Mạch Giải Ngân & Payouts (24h)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Khung Quản Lý Chi Trả CLOOP
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Danh sách các đơn thuê đã hoàn tất cần chuyển khoản trả tiền cho chủ tủ đồ trong vòng 24 giờ.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/ledger"
              className="bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 border border-stone-300 hover:border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <FileText size={14} className="text-emerald-700" /> Xem Sổ Cái TT 99
            </Link>
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
              <Clock size={14} /> Cam kết Payout 24h
            </div>
          </div>
        </div>

        {/* STATS BANNER */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Số đơn chờ chi trả</span>
            <p className="text-2xl font-black font-mono text-stone-800 mt-1">{activeItems.length} đơn</p>
            <p className="text-[10px] text-amber-600 font-semibold mt-1">Cần hoàn tất trong hôm nay</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Tổng tiền cần chuyển</span>
            <p className="text-2xl font-black font-mono text-emerald-700 mt-1">{totalPendingAmount.toLocaleString()}₫</p>
            <p className="text-[10px] text-stone-400 mt-1">Đã cấn trừ 12% phí sàn & ship chiều về</p>
          </div>
          <div className="bg-[#183A2D] text-white p-5 rounded-2xl shadow-md">
            <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">Đã chuyển hoàn tất</span>
            <p className="text-2xl font-black font-mono text-white mt-1">{completedIds.length} lượt</p>
            <p className="text-[10px] text-emerald-300 mt-1">✓ Đã đồng bộ vào sổ cái kế toán</p>
          </div>
        </div>

        {/* LIST OF PENDING PAYOUTS */}
        <div className="space-y-4">
          {activeItems.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-stone-800">Tuyệt vời! Không còn đơn nào tồn đọng</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Toàn bộ tiền thuê của chủ tủ đã được giải ngân đúng cam kết 24h. Dòng tiền đối soát trên sàn hoàn toàn cân bằng.
              </p>
              <div className="pt-2">
                <Link
                  href="/admin/accounting"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-xl transition"
                >
                  Chuyển sang Kỳ Kế Toán & Báo Cáo P&L <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            activeItems.map((order) => (
              <div
                key={order.id}
                className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs hover:border-emerald-200 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
              >
                {/* THÔNG TIN CHỦ TỦ & TÀI KHOẢN NGÂN HÀNG */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md">
                      {order.orderCode}
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Clock size={10} /> Chờ chuyển khoản (24h)
                    </span>
                    <span className="text-xs text-stone-400 font-mono">
                      {order.completedAt}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-stone-900 flex items-center gap-1.5">
                      <User size={16} className="text-stone-400" />
                      Chủ đồ: <span className="text-emerald-800 font-extrabold">{order.ownerName}</span>
                      <span className="text-xs text-stone-400 font-normal font-mono flex items-center gap-0.5 ml-2">
                        <Phone size={12} /> {order.ownerPhone}
                      </span>
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Sản phẩm: <strong>{order.productTitle}</strong>
                    </p>
                  </div>

                  {/* THẺ TÀI KHOẢN NGÂN HÀNG COPY NHANH */}
                  <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80 space-y-1 text-xs">
                    <p className="flex items-center justify-between text-stone-600">
                      <span className="flex items-center gap-1.5"><CreditCard size={14} className="text-emerald-700" /> Ngân hàng: <b>{order.bankName}</b></span>
                      <span className="text-[11px] font-bold text-stone-700">Chủ TK: {order.bankHolder}</span>
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-stone-700">
                        Số tài khoản: <strong className="font-mono text-sm font-bold text-stone-900 tracking-wider bg-white px-2 py-0.5 rounded border border-stone-200">{order.bankAccount}</strong>
                      </p>
                      <button
                        onClick={() => handleCopy(order.bankAccount)}
                        className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-50 px-2.5 py-1 rounded-lg border border-stone-200 transition cursor-pointer"
                      >
                        {copiedAccount === order.bankAccount ? "✓ Đã copy STK" : "Sao chép STK"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* SỐ TIỀN CHI TIẾT & NÚT XÁC NHẬN */}
                <div className="text-right space-y-2 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 shrink-0">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Tiền thuê gốc: {order.rentalFee.toLocaleString()}đ</p>
                    <p className="text-[11px] text-stone-500 font-mono">
                      - Phí sàn (12%): <span className="text-amber-700">-{order.platformFee.toLocaleString()}đ</span>
                    </p>
                    {order.returnShippingFee > 0 && (
                      <p className="text-[11px] text-stone-500 font-mono">
                        - Ship chiều về: <span className="text-blue-700">-{order.returnShippingFee.toLocaleString()}đ</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-1">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Số tiền thực chuyển (Net):</p>
                    <p className="text-2xl font-black font-mono text-emerald-700">{order.netPayoutAmount.toLocaleString()}₫</p>
                  </div>

                  <button
                    onClick={() => handleMarkAsPaid(order)}
                    disabled={processingId === order.id}
                    className="bg-[#183A2D] hover:bg-emerald-800 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all flex items-center gap-1.5 w-full justify-center md:w-auto shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle size={14} />
                    {processingId === order.id ? "Đang ghi vết..." : "Tôi đã chuyển khoản xong"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* CĂN CỨ VẬN HÀNH */}
        <div className="p-4 bg-white rounded-2xl border border-stone-200 text-xs text-stone-500 flex items-start gap-3">
          <ShieldCheck size={18} className="text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-stone-800">Quy tắc Mạch Giải ngân Khép kín CLOOP:</p>
            <p>
              1. Sau khi khách thuê trả đồ và chủ tủ xác nhận không tranh chấp, cọc của khách được Két Escrow hoàn trả $100\%$ qua VietQR.
            </p>
            <p>
              2. Tiền thuê của chủ tủ được cấn trừ $12\%$ phí sàn CLOOP và $25.000đ$ cước thu hồi tài sản. Số tiền còn lại được chuyển khoản trực tiếp vào tài khoản ngân hàng trong 24 giờ.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
