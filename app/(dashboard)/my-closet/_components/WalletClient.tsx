"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, AlertCircle, X, Eye, EyeOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createDepositPayment } from "../wallet/actions";

export function WalletClient({ balance, coins, transactions, paymentStatus }: { balance: number, coins: number, transactions: any[], paymentStatus?: string }) {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState(50000);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (paymentStatus === "success") {
      alert("🎉 Nạp tiền thành công! Vui lòng chờ hệ thống xử lý trong giây lát.");
      // In real app, we should clean the URL params to prevent re-alerting
      window.history.replaceState(null, '', '/my-closet/wallet');
    } else if (paymentStatus === "cancel") {
      alert("🚫 Thanh toán đã bị hủy.");
      window.history.replaceState(null, '', '/my-closet/wallet');
    }
  }, [paymentStatus]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || !password) return alert("Vui lòng nhập đủ thông tin.");
    if (parseInt(withdrawAmount.replace(/,/g, '')) > balance) return alert("Số dư không đủ.");
    
    setIsSubmitting(true);
    // Giả lập API call
    setTimeout(() => {
      alert("🎉 Yêu cầu rút tiền thành công! Tiền sẽ về tài khoản liên kết trong 24h.");
      setShowWithdrawModal(false);
      setIsSubmitting(false);
      setWithdrawAmount("");
      setPassword("");
    }, 1500);
  };

  const handleDeposit = async () => {
    if (depositAmount < 10000) return alert("Số tiền nạp tối thiểu là 10,000đ");
    
    setIsDepositing(true);
    try {
      const res = await createDepositPayment(depositAmount);
      if (res.success && res.checkoutUrl) {
        // Redirect to PayOS checkout
        window.location.href = res.checkoutUrl;
      } else {
        alert(res.message || "Có lỗi xảy ra khi tạo link thanh toán.");
        setIsDepositing(false);
      }
    } catch (error) {
      alert("Lỗi kết nối.");
      setIsDepositing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* THẺ ATM CLOOP */}
      <div className="bg-gradient-to-br from-[#183A2D] to-[#2A5C4A] p-6 sm:p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-[#B5A48B]/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col gap-2 z-10">
          <span className="text-white/70 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <CreditCard size={16} /> Số dư khả dụng
          </span>
          <h2 className="text-4xl sm:text-5xl font-mono font-bold tracking-tight">
            {balance.toLocaleString()}₫
          </h2>
          <span className="text-[#B5A48B] text-sm font-medium mt-1">
            + {coins} CloopCoins (Tương đương {(coins * 100).toLocaleString()}₫)
          </span>
        </div>

        <div className="flex gap-3 w-full md:w-auto z-10">
          <button 
            onClick={() => setShowWithdrawModal(true)}
            className="flex-1 md:flex-none px-6 py-3 bg-white text-[#183A2D] rounded-full text-sm font-bold shadow-md hover:bg-stone-100 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowUpRight size={18} /> Rút tiền
          </button>
          <button 
            onClick={() => setShowDepositModal(true)}
            className="flex-1 md:flex-none px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full text-sm font-bold shadow-sm hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
          >
            Nạp CloopCoins
          </button>
        </div>
      </div>

      {/* LỊCH SỬ GIAO DỊCH */}
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
          <h3 className="font-bold text-stone-800 text-sm uppercase tracking-wider">Lịch sử giao dịch</h3>
          <button className="text-[10px] font-bold text-stone-400 hover:text-stone-700 uppercase tracking-widest transition-colors">Xem tất cả</button>
        </div>
        
        <div className="p-0">
          {transactions.length > 0 ? (
            <div className="flex flex-col">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4 sm:px-6 sm:py-5 border-b border-stone-100 hover:bg-stone-50/50 transition-colors flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'INCOME' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {tx.type === 'INCOME' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-stone-800 text-sm line-clamp-1">{tx.desc}</span>
                      <span className="text-[11px] text-stone-400">{new Date(tx.date).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`font-mono font-bold ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-stone-800'}`}>
                      {tx.type === 'INCOME' ? '+' : ''}{tx.amount.toLocaleString()}₫
                    </span>
                    {tx.status === 'SUCCESS' && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={10} /> Thành công</span>}
                    {tx.status === 'PENDING' && <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1"><Clock size={10} /> Đang xử lý</span>}
                    {tx.status === 'FAILED' && <span className="text-[10px] font-bold text-red-600 flex items-center gap-1"><AlertCircle size={10} /> Thất bại</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-stone-400 text-sm">Chưa có giao dịch nào.</div>
          )}
        </div>
      </div>

      {/* WITHDRAW MODAL */}
      <AnimatePresence>
        {showWithdrawModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-stone-200/60 rounded-[2rem] max-w-[400px] w-full shadow-2xl p-6 text-left"
            >
              <div className="flex justify-between items-center border-b pb-4 mb-4">
                <h3 className="text-sm font-bold text-[#183A2D] uppercase tracking-wider">
                  Rút tiền về tài khoản
                </h3>
                <button 
                  type="button" 
                  onClick={() => setShowWithdrawModal(false)} 
                  className="text-stone-400 hover:text-stone-700 transition-colors p-1 bg-stone-100 rounded-full"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                  <span className="text-[11px] text-stone-500 font-bold uppercase tracking-wider">Tài khoản nhận</span>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="w-8 h-8 bg-[#183A2D] text-white rounded-md flex items-center justify-center text-[10px] font-bold">VCB</div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-stone-800">1012345678</span>
                      <span className="text-[10px] text-stone-500">NGUYEN VAN A</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">Số tiền cần rút (VNĐ)</label>
                  <input
                    type="text"
                    value={withdrawAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setWithdrawAmount(val ? parseInt(val).toLocaleString() : '');
                    }}
                    placeholder="VD: 50,000"
                    className="w-full px-4 py-3 font-mono font-bold text-lg rounded-xl border border-stone-200 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                  <span className="text-[10px] text-stone-400">Số dư khả dụng: {balance.toLocaleString()}₫</span>
                </div>

                <div className="space-y-1.5 relative">
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">Mật khẩu rút tiền</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu giao dịch"
                    className="w-full px-4 py-3 text-sm rounded-xl border border-stone-200 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[26px] p-2 text-stone-400 hover:text-stone-700">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3.5 bg-[#183A2D] text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow transition-all flex items-center justify-center gap-2 hover:bg-[#23452F] disabled:opacity-50"
                >
                  {isSubmitting ? "Đang xử lý..." : "Xác nhận lệnh rút"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDepositModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowDepositModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col z-10 p-6 sm:p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-stone-800">Nạp CloopCoins</h3>
                  <p className="text-stone-500 text-xs mt-1">Chọn số tiền nạp (1đ = 1 CloopCoin)</p>
                </div>
                <button onClick={() => setShowDepositModal(false)} className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  {[50000, 100000, 200000, 500000, 1000000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setDepositAmount(amt)}
                      className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                        depositAmount === amt 
                          ? "border-[#183A2D] bg-[#183A2D] text-white" 
                          : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                      }`}
                    >
                      {amt.toLocaleString()}đ
                    </button>
                  ))}
                  <button
                    onClick={() => setDepositAmount(0)}
                    className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                      ![50000, 100000, 200000, 500000, 1000000].includes(depositAmount) && depositAmount > 0
                        ? "border-[#183A2D] bg-[#183A2D] text-white" 
                        : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                    }`}
                  >
                    Khác
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">Hoặc nhập số tiền khác</label>
                  <input
                    type="text"
                    value={depositAmount ? depositAmount.toLocaleString() : ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setDepositAmount(val ? parseInt(val) : 0);
                    }}
                    placeholder="Tối thiểu 10,000đ"
                    className="w-full px-4 py-3 font-mono font-bold text-lg rounded-xl border border-stone-200 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>

                <button
                  onClick={handleDeposit}
                  disabled={isDepositing || depositAmount < 10000}
                  className="w-full py-4 bg-[#183A2D] text-white text-sm font-bold uppercase tracking-widest rounded-xl shadow transition-all flex items-center justify-center gap-2 hover:bg-[#23452F] disabled:opacity-50"
                >
                  {isDepositing ? (
                    <><Loader2 size={18} className="animate-spin" /> Đang tạo mã QR...</>
                  ) : (
                    `Nạp ${depositAmount.toLocaleString()}đ`
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
