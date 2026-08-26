"use client";

import React, { useState, useEffect } from "react";
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Eye, 
  EyeOff, 
  Loader2, 
  Leaf, 
  Zap, 
  Gift, 
  ShieldCheck, 
  HelpCircle,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createCoinTopUpPayment, claimQuestRewardAction } from "@/app/actions/coin";
import { requestWithdrawalAction } from "@/app/actions/withdrawal";
import { COIN_PACKAGES, QUEST_DEFINITIONS } from "@/lib/coinPackages";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface WalletClientProps {
  balance: number;
  coins: number;
  claimedQuests?: string[];
  stats?: {
    productCount: number;
    fiveStarCount: number;
  };
  bankInfo?: {
    bankName?: string;
    bankAccount?: string;
    bankOwner?: string;
  };
  coinLedger?: Array<{
    id: string;
    type: string;
    amount: number;
    balanceAfter: number;
    description: string;
    createdAt: string;
  }>;
  transactions?: any[];
  paymentStatus?: string;
}

export function WalletClient({ 
  balance, 
  coins: initialCoins, 
  claimedQuests: initialClaimed = [],
  stats = { productCount: 0, fiveStarCount: 0 },
  bankInfo,
  coinLedger: initialCoinLedger = [],
  transactions = [], 
  paymentStatus 
}: WalletClientProps) {
  const [coins, setCoins] = useState(initialCoins);
  const [claimedQuests, setClaimedQuests] = useState<string[]>(initialClaimed);
  const [coinLedger, setCoinLedger] = useState(initialCoinLedger);

  const [activeTab, setActiveTab] = useState<"VND" | "COINS">("COINS");
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showCoinStoreModal, setShowCoinStoreModal] = useState(false);
  const [showQuestModal, setShowQuestModal] = useState(false);

  const [selectedPackage, setSelectedPackage] = useState<string>("LEAF_50K");
  const [isBuyingCoins, setIsBuyingCoins] = useState(false);
  const [claimingCode, setClaimingCode] = useState<string | null>(null);

  // Form rút tiền VNĐ
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Thông tin tài khoản ngân hàng thực tế
  const [bankName, setBankName] = useState(bankInfo?.bankName || "");
  const [bankAccount, setBankAccount] = useState(bankInfo?.bankAccount || "");
  const [bankOwner, setBankOwner] = useState(bankInfo?.bankOwner || "");
  const [isEditingBankInModal, setIsEditingBankInModal] = useState(!bankInfo?.bankAccount);

  useEffect(() => {
    if (paymentStatus === "coin_success") {
      alert("🎉 Nạp Điểm Lá thành công! Điểm Lá đã được cộng vào tài khoản của bạn.");
      window.history.replaceState(null, '', '/my-closet/wallet');
    } else if (paymentStatus === "coin_cancel") {
      alert("🚫 Giao dịch nạp Lá đã bị hủy.");
      window.history.replaceState(null, '', '/my-closet/wallet');
    }
  }, [paymentStatus]);

  // Xử lý nạp Điểm Lá qua PayOS
  const handleBuyCoinPackage = async () => {
    setIsBuyingCoins(true);
    try {
      const res = await createCoinTopUpPayment(selectedPackage);
      if (res.success && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        alert(res.message || "Không thể khởi tạo thanh toán.");
        setIsBuyingCoins(false);
      }
    } catch (error) {
      alert("Lỗi kết nối khi nạp Lá.");
      setIsBuyingCoins(false);
    }
  };

  // Xử lý nhận thưởng nhiệm vụ (Quest Claim)
  const handleClaimQuest = async (questCode: string) => {
    setClaimingCode(questCode);
    try {
      const res = await claimQuestRewardAction(questCode);
      if (res.success) {
        setCoins(res.newBalance || (coins + (res.rewardCoins || 0)));
        setClaimedQuests([...claimedQuests, questCode]);
        alert(res.message || "Nhận thưởng thành công!");
      } else {
        alert(res.message || "Không thể nhận thưởng.");
      }
    } catch (error) {
      alert("Lỗi khi kết nối với máy chủ.");
    } finally {
      setClaimingCode(null);
    }
  };

  // Xử lý rút tiền VNĐ
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || !password) return alert("Vui lòng nhập số tiền cần rút và mật khẩu.");
    if (!bankName.trim() || !bankAccount.trim()) return alert("Vui lòng nhập đầy đủ Tên ngân hàng và Số tài khoản nhận tiền.");
    
    const numericAmount = parseInt(withdrawAmount.replace(/\D/g, ''));
    if (numericAmount > balance) return alert(`Số dư khả dụng (${balance.toLocaleString()}₫) không đủ để rút ${numericAmount.toLocaleString()}₫.`);
    if (numericAmount < 50000) return alert("Số tiền rút tối thiểu là 50,000đ.");
    
    setIsSubmittingWithdraw(true);
    try {
      const res = await requestWithdrawalAction({
        amount: numericAmount,
        bankName: bankName.trim(),
        bankAccountNumber: bankAccount.trim().replace(/\s+/g, ''),
        bankAccountHolder: bankOwner.trim() || "Chủ tài khoản",
        password: password
      });

      if (res.success) {
        // Lưu lại STK vào profiles để lần sau không cần nhập lại
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            await supabase.from("profiles").update({
              bank_name: bankName.trim(),
              bank_account: bankAccount.trim(),
              bank_owner: bankOwner.trim().toUpperCase()
            }).eq("id", session.user.id);
          }
        } catch (saveErr) {
          console.warn("Lỗi lưu STK:", saveErr);
        }

        alert("🎉 " + res.message);
        setShowWithdrawModal(false);
        setWithdrawAmount("");
        setPassword("");
        setIsEditingBankInModal(false);
      } else {
        alert(res.message || "Không thể tạo lệnh rút tiền.");
      }
    } catch (err: any) {
      alert("Lỗi kết nối khi tạo lệnh rút tiền.");
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      
      {/* ===== VÙNG THẺ VÍ KÉP (DUAL CARDS) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* THẺ 1: VÍ TIỀN MẶT VNĐ */}
        <div className="bg-gradient-to-br from-[#0F281E] via-[#183A2D] to-[#244E3E] p-6 sm:p-7 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-emerald-900/40">
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-white/70 text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                <CreditCard size={15} /> Ví Tiền Mặt (VNĐ)
              </span>
              <span className="text-[10px] bg-white/10 backdrop-blur-md px-2.5 py-0.5 rounded-full text-emerald-200 border border-white/10 flex items-center gap-1 font-mono font-medium">
                <ShieldCheck size={12} /> Ký Quỹ Escrow
              </span>
            </div>

            <div className="my-2">
              <span className="text-xs text-stone-300 font-light">Số dư khả dụng</span>
              <h2 className="text-3xl sm:text-4xl font-mono font-bold tracking-tight mt-0.5 text-white">
                {balance.toLocaleString()}₫
              </h2>
            </div>
            
            <p className="text-[11px] text-emerald-200/70 font-light mt-1">
              Doanh thu từ việc cho thuê và pass đồ. Rút về mọi tài khoản ngân hàng Việt Nam.
            </p>
          </div>

          <div className="pt-6 mt-4 border-t border-white/10 flex items-center justify-between gap-3">
            <button 
              onClick={() => setShowWithdrawModal(true)}
              className="flex-1 px-5 py-2.5 bg-white text-[#183A2D] rounded-full text-xs font-bold shadow-md hover:bg-stone-100 transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <ArrowUpRight size={15} /> Rút tiền về ngân hàng
            </button>
            <button 
              onClick={() => setActiveTab("VND")}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-medium transition-all"
            >
              Sổ cái VNĐ
            </button>
          </div>
        </div>

        {/* THẺ 2: TÚI ĐIỂM LÁ CLOOP (TOKENOMICS) */}
        <div className="bg-gradient-to-br from-[#064E3B] via-[#047857] to-[#0D9488] p-6 sm:p-7 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-emerald-500/30">
          <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-amber-300/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-white/80 text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                <Leaf size={15} className="text-amber-300 fill-amber-300" /> Túi Điểm Lá (CloopCoins)
              </span>
              <span className="text-[10px] bg-amber-400/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-amber-200 border border-amber-300/30 font-semibold flex items-center gap-1">
                <Zap size={11} className="text-amber-300 fill-amber-300" /> Đẩy Top & Quyền Lợi
              </span>
            </div>

            <div className="my-2">
              <span className="text-xs text-emerald-100 font-light">Điểm Lá tích lũy</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h2 className="text-3xl sm:text-4xl font-mono font-black tracking-tight text-white">
                  {coins.toLocaleString()}
                </h2>
                <span className="text-base font-bold text-amber-200">Lá 🍃</span>
              </div>
            </div>

            <p className="text-[11px] text-emerald-100/70 font-light mt-1">
              Dùng để Đẩy Top sản phẩm lên Trang chủ (500 Lá/12h), đổi voucher giảm phí sàn. <span className="underline opacity-80">Không quy đổi ra tiền mặt</span>.
            </p>
          </div>

          <div className="pt-6 mt-4 border-t border-white/15 flex items-center justify-between gap-3">
            <button 
              onClick={() => setShowCoinStoreModal(true)}
              className="flex-1 px-4 py-2.5 bg-amber-300 hover:bg-amber-400 text-stone-900 rounded-full text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Zap size={14} className="fill-stone-900" /> Nạp thêm Lá
            </button>
            <button 
              onClick={() => setShowQuestModal(true)}
              className="flex-1 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Gift size={14} /> Cày Lá (Nhiệm vụ)
            </button>
          </div>
        </div>

      </div>

      {/* ===== BẢNG LỊCH SỬ KẾ TOÁN & SỔ CÁI (TÁCH 2 TAB) ===== */}
      <div className="bg-white rounded-3xl border border-stone-200/70 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-stone-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-stone-50/40">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("COINS")}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === "COINS" 
                  ? "bg-[#183A2D] text-white shadow-sm" 
                  : "text-stone-500 hover:text-stone-900 hover:bg-stone-100"
              }`}
            >
              <Leaf size={14} className={activeTab === "COINS" ? "text-emerald-400 fill-emerald-400" : "text-emerald-600"} /> Sổ Cái Điểm Lá ({coinLedger.length})
            </button>
            <button
              onClick={() => setActiveTab("VND")}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === "VND" 
                  ? "bg-[#183A2D] text-white shadow-sm" 
                  : "text-stone-500 hover:text-stone-900 hover:bg-stone-100"
              }`}
            >
              <CreditCard size={14} /> Giao Dịch Tiền Mặt VNĐ ({transactions.length})
            </button>
          </div>

          <span className="text-[11px] text-stone-400 font-mono">
            {activeTab === "COINS" ? "Lá nội bộ (Không đổi VNĐ)" : "Đối soát tài khoản ngân hàng"}
          </span>
        </div>

        <div className="p-0 divide-y divide-stone-100">
          {/* TAB 1: SỔ CÁI ĐIỂM LÁ */}
          {activeTab === "COINS" && (
            coinLedger.length > 0 ? (
              <div className="flex flex-col">
                {coinLedger.map((item) => (
                  <div key={item.id} className="p-4 sm:px-6 sm:py-4.5 hover:bg-stone-50/50 transition-colors flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        item.amount > 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
                      }`}>
                        {item.amount > 0 ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-stone-800 text-xs sm:text-sm">{item.description}</span>
                        <span className="text-[11px] text-stone-400 font-mono mt-0.5">
                          {new Date(item.createdAt).toLocaleString("vi-VN")}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end shrink-0">
                      <span className={`font-mono font-bold text-xs sm:text-sm ${
                        item.amount > 0 ? "text-emerald-600" : "text-stone-700"
                      }`}>
                        {item.amount > 0 ? `+${item.amount.toLocaleString()}` : item.amount.toLocaleString()} Lá
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        Số dư sau: {item.balanceAfter.toLocaleString()} Lá
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-stone-400 text-xs flex flex-col items-center gap-2">
                <Gift size={24} className="opacity-40" />
                Chưa có giao dịch Điểm Lá nào. Hãy làm nhiệm vụ hoặc nạp gói Lá đầu tiên!
              </div>
            )
          )}

          {/* TAB 2: GIAO DỊCH TIỀN MẶT VNĐ */}
          {activeTab === "VND" && (
            transactions.length > 0 ? (
              <div className="flex flex-col">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-4 sm:px-6 sm:py-4.5 hover:bg-stone-50/50 transition-colors flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        tx.type === 'INCOME' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {tx.type === 'INCOME' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-stone-800 text-xs sm:text-sm">{tx.desc}</span>
                        <span className="text-[11px] text-stone-400 font-mono mt-0.5">
                          {new Date(tx.date).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end shrink-0">
                      <span className={`font-mono font-bold text-xs sm:text-sm ${
                        tx.type === 'INCOME' ? 'text-emerald-600' : 'text-stone-800'
                      }`}>
                        {tx.type === 'INCOME' ? '+' : ''}{tx.amount.toLocaleString()}₫
                      </span>
                      {tx.status === 'SUCCESS' && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={10} /> Đã quyết toán</span>}
                      {tx.status === 'PENDING' && <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1"><Clock size={10} /> Đang xử lý</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-stone-400 text-xs">Chưa có giao dịch tiền mặt nào.</div>
            )
          )}
        </div>
      </div>

      {/* ===== MODAL 1: CỬA HÀNG GÓI NẠP LÁ (IAP COIN STORE) ===== */}
      <AnimatePresence>
        {showCoinStoreModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" 
              onClick={() => setShowCoinStoreModal(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 15 }} 
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden z-10 p-6 sm:p-7 flex flex-col"
            >
              <div className="flex justify-between items-start mb-5">
                <div>
                  <div className="flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider text-emerald-700">
                    <Leaf size={14} className="text-emerald-700 fill-emerald-700" /> Nạp Điểm Lá Tủ Đồ
                  </div>
                  <h3 className="text-xl font-bold text-stone-800 font-heading mt-0.5">Chọn Gói Lá Nạp Nhanh</h3>
                  <p className="text-stone-500 text-xs mt-1">Quét mã VietQR PayOS tự động – Nhận Lá ngay sau 1 giây.</p>
                </div>
                <button 
                  onClick={() => setShowCoinStoreModal(false)} 
                  className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {Object.values(COIN_PACKAGES).map((pkg) => {
                  const isSelected = selectedPackage === pkg.code;
                  return (
                    <button
                      key={pkg.code}
                      type="button"
                      onClick={() => setSelectedPackage(pkg.code)}
                      className={`relative p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-3 ${
                        isSelected 
                          ? "border-emerald-700 bg-emerald-50/50 shadow-sm" 
                          : "border-stone-200 hover:border-stone-300 bg-white"
                      }`}
                    >
                      {pkg.badge && (
                        <span className="absolute top-3 right-3 bg-amber-400 text-stone-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs">
                          {pkg.badge}
                        </span>
                      )}

                      <div>
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500">{pkg.name}</span>
                        <div className="text-2xl font-mono font-black text-[#183A2D] mt-0.5">
                          {pkg.totalCoins.toLocaleString()} <span className="text-xs font-bold">Lá</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-900">{pkg.amountVnd.toLocaleString()}₫</span>
                        {isSelected && <CheckCircle2 size={16} className="text-emerald-700" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-3.5 mb-5 flex items-start gap-2.5">
                <HelpCircle size={16} className="text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-900 leading-relaxed font-light">
                  <strong>Quy ước Tokenomics:</strong> Điểm Lá dùng để mua dịch vụ Đẩy Top tin đăng, đổi voucher. Điểm Lá không có giá trị quy đổi ngược ra tiền mặt.
                </p>
              </div>

              <button
                type="button"
                onClick={handleBuyCoinPackage}
                disabled={isBuyingCoins}
                className="w-full py-3.5 bg-[#183A2D] text-white text-xs font-bold uppercase tracking-widest rounded-2xl shadow hover:bg-[#23452F] transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                {isBuyingCoins ? (
                  <><Loader2 size={16} className="animate-spin" /> Đang tạo mã VietQR PayOS...</>
                ) : (
                  `Tiến hành thanh toán ${COIN_PACKAGES[selectedPackage]?.amountVnd.toLocaleString()}₫`
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===== MODAL 2: TRUNG TÂM NHIỆM VỤ CÀY LÁ (QUEST CENTER) ===== */}
      <AnimatePresence>
        {showQuestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" 
              onClick={() => setShowQuestModal(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 15 }} 
              className="relative bg-white w-full max-w-xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-stone-100 flex justify-between items-start bg-emerald-50/40">
                <div>
                  <div className="flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider text-emerald-700">
                    <Gift size={14} /> Proof of Value
                  </div>
                  <h3 className="text-xl font-bold text-stone-800 font-heading mt-0.5">Nhiệm Vụ Nhận Lá Tuần Hoàn</h3>
                  <p className="text-stone-500 text-xs mt-1">Cày Lá miễn phí bằng hành vi tạo giá trị thật cho cộng đồng tủ đồ.</p>
                </div>
                <button 
                  onClick={() => setShowQuestModal(false)} 
                  className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Danh sách nhiệm vụ */}
              <div className="p-6 overflow-y-auto space-y-3.5 divide-y divide-stone-100">
                {Object.values(QUEST_DEFINITIONS).map((quest) => {
                  const isClaimed = claimedQuests.includes(quest.code);
                  
                  // Kiểm tra điều kiện
                  let isEligible = false;
                  let progressText = "";
                  if (quest.code === "WELCOME_ACTIVATION") {
                    isEligible = true;
                  } else if (quest.code === "FIRST_LISTING") {
                    isEligible = (stats.productCount || 0) >= 1;
                    progressText = `${Math.min(stats.productCount || 0, 1)}/1 món đồ`;
                  } else if (quest.code === "WEEKLY_LISTING_1") {
                    isEligible = (stats.productCount || 0) >= 1;
                    progressText = `${Math.min(stats.productCount || 0, 3)}/3 món`;
                  } else if (quest.code === "FIVE_STAR_ORDER") {
                    isEligible = (stats.fiveStarCount || 0) >= 1;
                    progressText = `${Math.min(stats.fiveStarCount || 0, 1)}/1 đánh giá 5★`;
                  } else if (quest.code === "REFERRAL_FIRST_ORDER") {
                    isEligible = false;
                  }

                  const isClaiming = claimingCode === quest.code;

                  return (
                    <div key={quest.code} className="pt-3.5 first:pt-0 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl shrink-0">
                          {quest.icon}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-800 text-xs sm:text-sm">{quest.title}</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono font-bold">
                              +{quest.rewardCoins} Lá
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed font-light">{quest.description}</p>
                          {progressText && (
                            <span className="text-[10px] text-stone-400 font-mono mt-1">Tiến độ: {progressText}</span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isClaimed ? (
                          <span className="px-3 py-1.5 bg-stone-100 text-stone-400 rounded-full text-[11px] font-bold flex items-center gap-1">
                            <CheckCircle2 size={12} /> Đã nhận
                          </span>
                        ) : isEligible ? (
                          <button
                            type="button"
                            onClick={() => handleClaimQuest(quest.code)}
                            disabled={isClaiming}
                            className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full text-xs font-bold shadow-sm transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50"
                          >
                            {isClaiming ? <Loader2 size={12} className="animate-spin" /> : "Nhận Lá"}
                          </button>
                        ) : (
                          quest.actionUrl ? (
                            <Link
                              href={quest.actionUrl}
                              className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-full text-xs font-semibold transition-all inline-block text-center"
                            >
                              {quest.actionText}
                            </Link>
                          ) : (
                            <span className="px-3 py-1.5 bg-stone-50 text-stone-300 rounded-full text-[11px] font-medium">
                              Chưa đủ
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===== MODAL 3: RÚT TIỀN VNĐ ===== */}
      <AnimatePresence>
        {showWithdrawModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" 
              onClick={() => setShowWithdrawModal(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 15 }} 
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-7 z-10"
            >
              <div className="flex justify-between items-center border-b pb-4 mb-4">
                <h3 className="text-sm font-bold text-[#183A2D] uppercase tracking-wider">
                  Rút Tiền Về Ngân Hàng
                </h3>
                <button 
                  type="button" 
                  onClick={() => setShowWithdrawModal(false)} 
                  className="text-stone-400 hover:text-stone-700 p-1 bg-stone-100 rounded-full"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleWithdraw} className="space-y-4">
                {/* HIỂN THỊ TÀI KHOẢN NGÂN HÀNG THỰC TẾ */}
                {bankAccount && !isEditingBankInModal ? (
                  <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#183A2D] text-white rounded-xl flex items-center justify-center text-[10px] font-bold shrink-0">
                        {bankName.slice(0, 4).toUpperCase() || "BANK"}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-stone-900">{bankName} • {bankAccount}</span>
                        <span className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider mt-0.5">
                          Chủ TK: {bankOwner || "CHƯA ĐẶT TÊN"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingBankInModal(true)}
                      className="text-[10px] font-bold text-emerald-800 hover:underline px-2.5 py-1 bg-white rounded-lg border border-emerald-200 shadow-2xs cursor-pointer"
                    >
                      Đổi STK
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] text-amber-900 font-extrabold uppercase tracking-wider">
                        🛡️ Tài khoản ngân hàng chính chủ nhận tiền
                      </span>
                      {bankInfo?.bankAccount && (
                        <button
                          type="button"
                          onClick={() => setIsEditingBankInModal(false)}
                          className="text-[10px] font-bold text-stone-500 hover:text-stone-800 underline cursor-pointer"
                        >
                          Hủy
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider">
                          1. Ngân hàng thụ hưởng *
                        </label>
                        <input
                          type="text"
                          required
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="VD: MB Bank, Vietcombank, Techcombank..."
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white focus:border-[#183A2D] outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider">
                          2. Số tài khoản ngân hàng *
                        </label>
                        <input
                          type="text"
                          required
                          value={bankAccount}
                          onChange={(e) => setBankAccount(e.target.value.replace(/\s+/g, ""))}
                          placeholder="Nhập số tài khoản ngân hàng..."
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono font-bold bg-white focus:border-[#183A2D] outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider">
                          3. Họ & Tên chủ tài khoản (In hoa không dấu) *
                        </label>
                        <input
                          type="text"
                          required
                          value={bankOwner}
                          onChange={(e) => setBankOwner(e.target.value.toUpperCase())}
                          placeholder="VD: NGUYEN VAN A hoặc HOANG THI THU TRANG"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs uppercase font-bold bg-white focus:border-[#183A2D] outline-none"
                        />
                        <p className="text-[9.5px] text-amber-800 leading-tight italic pt-0.5">
                          * Tên chủ tài khoản phải trùng với thẻ ATM/CCCD để tiền về đúng chính chủ, chống kẻ gian đánh cắp.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">Số tiền cần rút (VNĐ)</label>
                  <input
                    type="text"
                    value={withdrawAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setWithdrawAmount(val ? parseInt(val).toLocaleString() : '');
                    }}
                    placeholder="Tối thiểu 50,000"
                    className="w-full px-4 py-3 font-mono font-bold text-lg rounded-2xl border border-stone-200 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                  <span className="text-[10px] text-stone-400 font-mono">Khả dụng: {balance.toLocaleString()}₫</span>
                </div>

                <div className="space-y-1 relative">
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">Mật khẩu giao dịch</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="w-full px-4 py-3 text-sm rounded-2xl border border-stone-200 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[26px] p-2 text-stone-400 hover:text-stone-700">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingWithdraw}
                  className="w-full mt-2 py-3.5 bg-[#183A2D] text-white text-xs font-bold uppercase tracking-widest rounded-2xl shadow hover:bg-[#23452F] transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  {isSubmittingWithdraw ? <Loader2 size={16} className="animate-spin" /> : "Xác nhận lệnh rút"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
