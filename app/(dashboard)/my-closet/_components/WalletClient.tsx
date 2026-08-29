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
  Clock,
  Sparkles,
  Shirt,
  Flame,
  Star,
  Users,
  Copy,
  ExternalLink,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createCoinTopUpPayment, checkCoinTopUpStatusAction, claimQuestRewardAction } from "@/app/actions/coin";
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
    weeklyProductCount?: number;
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
  const [activeTopUpData, setActiveTopUpData] = useState<any>(null);
  const [isTopUpSuccess, setIsTopUpSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [claimingCode, setClaimingCode] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    showToast("Đã sao chép vào bộ nhớ tạm!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Đồng bộ claimedQuests từ Server Component
  useEffect(() => {
    if (initialClaimed && initialClaimed.length > 0) {
      setClaimedQuests(prev => Array.from(new Set([...prev, ...initialClaimed])));
    }
  }, [initialClaimed]);

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
      showToast("🎉 Nạp Điểm Lá thành công! Điểm Lá đã được cộng vào tài khoản.");
      window.history.replaceState(null, '', '/my-closet/wallet');
    } else if (paymentStatus === "coin_cancel") {
      showToast("🚫 Giao dịch nạp Lá đã bị hủy.", "error");
      window.history.replaceState(null, '', '/my-closet/wallet');
    }
  }, [paymentStatus]);

  // Lắng nghe thanh toán VietQR thời gian thực (Polling Check)
  useEffect(() => {
    if (!activeTopUpData?.orderCode || isTopUpSuccess) return;

    const interval = setInterval(async () => {
      try {
        const res = await checkCoinTopUpStatusAction(activeTopUpData.orderCode);
        if (res.success && res.status === "PAID") {
          setIsTopUpSuccess(true);
          const updatedCoins = res.newBalance || (coins + (activeTopUpData.totalCoins || 0));
          setCoins(updatedCoins);
          showToast(`🎉 Nạp thành công +${activeTopUpData.totalCoins} Lá!`);
          clearInterval(interval);
          setTimeout(() => {
            setShowCoinStoreModal(false);
            setActiveTopUpData(null);
            setIsTopUpSuccess(false);
          }, 3000);
        }
      } catch (err) {
        console.error("Polling check failed:", err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [activeTopUpData, isTopUpSuccess, coins]);

  // Xử lý nạp Điểm Lá qua PayOS (Tức thì 0.01s - Không giật lag)
  const handleBuyCoinPackage = async () => {
    const pkg = COIN_PACKAGES[selectedPackage];
    if (!pkg) return;

    // ⚡ SINH MÃ VÀ HIỂN THỊ VIETQR NGAY LẬP TỨC (0.01 GIÂY)
    const clientOrderCode = Number(String(Date.now()).slice(-6) + Math.floor(100 + Math.random() * 900));
    const instantData = {
      orderCode: clientOrderCode,
      amount: pkg.amountVnd,
      totalCoins: pkg.totalCoins,
      accountNumber: "LOCCASS000340028",
      accountName: "HOANG THI TRANG",
      bin: "970416",
      checkoutUrl: ""
    };
    setActiveTopUpData(instantData);

    // Gửi request ngầm đồng bộ với PayOS & Database
    try {
      const res = await createCoinTopUpPayment(selectedPackage, clientOrderCode);
      if (res.success) {
        setActiveTopUpData((prev: any) => ({
          ...prev,
          ...res
        }));
      }
    } catch (error) {
      console.error("Background payos sync error:", error);
    }
  };

  // Xử lý nhận thưởng nhiệm vụ (Optimistic 0ms - Không đơ, không chặn UI)
  const handleClaimQuest = async (questCode: string) => {
    const quest = QUEST_DEFINITIONS[questCode];
    if (!quest) return;

    // ⚡ 1. PHẢN HỒI TỨC THÌ 0MS: Đổi ngay sang "Đã nhận" và cộng Lá lập tức
    setClaimedQuests(prev => Array.from(new Set([...prev, questCode])));
    const reward = quest.rewardCoins || 0;
    setCoins(prev => prev + reward);
    showToast(`🎉 Nhận thành công +${reward} Lá vào ví!`);

    // ⚡ 2. Gửi Server Action đồng bộ ngầm
    try {
      const res = await claimQuestRewardAction(questCode);
      if (res.success && res.newBalance) {
        setCoins(res.newBalance);
      } else if (!res.success && res.message?.includes("đã nhận")) {
        // Đã nhận trước đó, giữ nguyên trạng thái
      } else if (!res.success) {
        showToast(res.message || "Không thể nhận thưởng.", "error");
      }
    } catch (error) {
      console.error("Claim quest error:", error);
    }
  };

  // Xử lý rút tiền VNĐ
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || !password) return showToast("Vui lòng nhập số tiền cần rút và mật khẩu.", "error");
    if (!bankName.trim() || !bankAccount.trim()) return showToast("Vui lòng nhập đầy đủ Tên ngân hàng và Số tài khoản nhận tiền.", "error");
    
    const numericAmount = parseInt(withdrawAmount.replace(/\D/g, ''));
    if (numericAmount > balance) return showToast(`Số dư khả dụng (${balance.toLocaleString()}₫) không đủ để rút ${numericAmount.toLocaleString()}₫.`, "error");
    if (numericAmount < 50000) return showToast("Số tiền rút tối thiểu là 50,000đ.", "error");
    
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

        showToast("🎉 " + res.message);
        setShowWithdrawModal(false);
        setWithdrawAmount("");
        setPassword("");
        setIsEditingBankInModal(false);
      } else {
        showToast(res.message || "Không thể tạo lệnh rút tiền.", "error");
      }
    } catch (err: any) {
      showToast("Lỗi kết nối khi tạo lệnh rút tiền.", "error");
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-[100] px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-2.5 text-xs font-bold font-ui backdrop-blur-md ${
              toast.type === "success" 
                ? "bg-[#183A2D] text-white border-emerald-500/40 shadow-emerald-950/30" 
                : "bg-rose-950 text-white border-rose-600/40 shadow-rose-950/30"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> : <AlertCircle size={16} className="text-rose-400 shrink-0" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
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

              {activeTopUpData ? (
                <div className="flex flex-col items-center text-center space-y-4">
                  {isTopUpSuccess ? (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      className="py-8 flex flex-col items-center space-y-3"
                    >
                      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 shadow-sm">
                        <CheckCircle2 size={36} />
                      </div>
                      <h4 className="text-xl font-bold text-stone-900 font-heading">Nạp Điểm Lá Thành Công!</h4>
                      <p className="text-sm text-stone-600 font-body">
                        +{activeTopUpData.totalCoins?.toLocaleString()} Lá đã được cộng ngay vào ví của bạn.
                      </p>
                    </motion.div>
                  ) : (
                    <>
                      <div className="w-full flex justify-between items-center pb-3 border-b border-stone-100">
                        <button 
                          type="button" 
                          onClick={() => setActiveTopUpData(null)} 
                          className="text-xs font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1.5 font-ui cursor-pointer"
                        >
                          <ArrowLeft size={14} /> Chọn gói khác
                        </button>
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 font-mono">
                          Mã #{activeTopUpData.orderCode}
                        </span>
                      </div>

                      {/* Mã VietQR */}
                      <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-xs">
                        <img 
                          src={activeTopUpData.qrCode 
                            ? `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(activeTopUpData.qrCode)}`
                            : `https://img.vietqr.io/image/970416-LOCCASS000340028-compact2.png?amount=${activeTopUpData.amount}&addInfo=${encodeURIComponent(activeTopUpData.description || `NAP LA ${activeTopUpData.orderCode}`)}&accountName=HOANG%20THI%20TRANG`
                          } 
                          alt="Mã VietQR ACB Nạp Lá" 
                          className="w-52 h-52 sm:w-56 sm:h-56 object-contain mx-auto"
                        />
                      </div>

                      {/* Thông tin chuyển khoản 1-chạm copy */}
                      <div className="w-full bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E9E2D8] text-left text-xs space-y-2 font-ui">
                        <div className="flex justify-between items-center">
                          <span className="text-stone-500">Số tiền:</span>
                          <span className="font-bold text-emerald-800 font-mono text-sm">{activeTopUpData.amount?.toLocaleString()}₫ (+{activeTopUpData.totalCoins?.toLocaleString()} Lá)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-stone-500">Ngân hàng:</span>
                          <span className="font-bold text-stone-800">ACB (Ngân hàng Á Châu)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-stone-500">Số tài khoản:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-stone-900">{activeTopUpData.accountNumber || "LOCCASS000340028"}</span>
                            <button 
                              type="button" 
                              onClick={() => copyToClipboard(activeTopUpData.accountNumber || "LOCCASS000340028", "stk")}
                              className="text-emerald-800 hover:text-emerald-950 p-1 hover:bg-emerald-100 rounded transition-colors cursor-pointer"
                              title="Sao chép STK"
                            >
                              <Copy size={12} />
                            </button>
                            {copiedField === "stk" && <span className="text-[9px] text-emerald-700 font-bold">Đã chép!</span>}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-stone-500">Nội dung CK:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {activeTopUpData.description || `NAP LA ${activeTopUpData.orderCode}`}
                            </span>
                            <button 
                              type="button" 
                              onClick={() => copyToClipboard(activeTopUpData.description || `NAP LA ${activeTopUpData.orderCode}`, "content")}
                              className="text-amber-800 hover:text-amber-950 p-1 hover:bg-amber-100 rounded transition-colors cursor-pointer"
                              title="Sao chép nội dung"
                            >
                              <Copy size={12} />
                            </button>
                            {copiedField === "content" && <span className="text-[9px] text-amber-700 font-bold">Đã chép!</span>}
                          </div>
                        </div>
                      </div>

                      {/* Trạng thái lắng nghe thời gian thực */}
                      <div className="w-full flex flex-col gap-2">
                        <div className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50/90 py-2.5 px-4 rounded-xl border border-emerald-200/60 font-ui">
                          <Loader2 size={13} className="animate-spin text-emerald-700 shrink-0" />
                          <span>Mở App ngân hàng quét mã QR – Tự động cộng Lá sau 1s</span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            showToast("Đang kiểm tra giao dịch ngân hàng...");
                            try {
                              const res = await checkCoinTopUpStatusAction(activeTopUpData.orderCode);
                              if (res.success && res.status === "PAID") {
                                setIsTopUpSuccess(true);
                                setCoins(res.newBalance || (coins + (activeTopUpData.totalCoins || 0)));
                                showToast(`🎉 Nạp thành công +${activeTopUpData.totalCoins} Lá!`);
                              } else {
                                showToast("Chưa nhận được tiền. Vui lòng quét QR chuyển khoản trước.", "error");
                              }
                            } catch (e) {
                              showToast("Lỗi kiểm tra giao dịch.", "error");
                            }
                          }}
                          className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition-all cursor-pointer font-ui flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 size={14} className="text-emerald-700" /> Tôi đã chuyển khoản xong (Kiểm tra ngay)
                        </button>
                      </div>

                      {activeTopUpData.checkoutUrl && (
                        <a 
                          href={activeTopUpData.checkoutUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[11px] text-stone-400 hover:text-stone-700 underline flex items-center gap-1 font-ui"
                        >
                          Hoặc mở trang thanh toán PayOS <ExternalLink size={11} />
                        </a>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {Object.values(COIN_PACKAGES).map((pkg) => {
                      const isSelected = selectedPackage === pkg.code;
                      return (
                        <button
                          key={pkg.code}
                          type="button"
                          onClick={() => setSelectedPackage(pkg.code)}
                          className={`relative p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
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
                            <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500 font-ui">{pkg.name}</span>
                            <div className="text-2xl font-mono font-black text-[#183A2D] mt-0.5">
                              {pkg.totalCoins.toLocaleString()} <span className="text-xs font-bold font-ui">Lá</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-stone-900 font-mono">{pkg.amountVnd.toLocaleString()}₫</span>
                            {isSelected && <CheckCircle2 size={16} className="text-emerald-700" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-3.5 mb-5 flex items-start gap-2.5 font-body">
                    <HelpCircle size={16} className="text-amber-700 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-900 leading-relaxed font-light">
                      <strong>Quy ước Tokenomics:</strong> Điểm Lá dùng để mua dịch vụ Đẩy Top tin đăng, đổi voucher. Điểm Lá không có giá trị quy đổi ngược ra tiền mặt.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleBuyCoinPackage}
                    disabled={isBuyingCoins}
                    className="w-full py-3.5 bg-[#183A2D] text-white text-xs font-bold uppercase tracking-widest rounded-2xl shadow hover:bg-[#23452F] transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 cursor-pointer font-ui"
                  >
                    {isBuyingCoins ? (
                      <><Loader2 size={16} className="animate-spin" /> Đang tạo mã VietQR PayOS...</>
                    ) : (
                      `Tiến hành thanh toán ${COIN_PACKAGES[selectedPackage]?.amountVnd.toLocaleString()}₫`
                    )}
                  </button>
                </>
              )}
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
              <div className="p-6 overflow-y-auto space-y-3.5 divide-y divide-stone-100 font-body">
                {Object.values(QUEST_DEFINITIONS).map((quest) => {
                  const isClaimed = claimedQuests.includes(quest.code);
                  
                  // Kiểm tra điều kiện chính xác
                  let isEligible = false;
                  let progressText = "";
                  if (quest.code === "WELCOME_ACTIVATION") {
                    isEligible = true;
                    progressText = "Đã kích hoạt tài khoản";
                  } else if (quest.code === "FIRST_LISTING") {
                    isEligible = (stats.productCount || 0) >= 1;
                    progressText = `${Math.min(stats.productCount || 0, 1)}/1 món đồ`;
                  } else if (quest.code === "WEEKLY_LISTING_1") {
                    const weeklyCount = stats.weeklyProductCount ?? (stats.productCount > 0 ? 1 : 0);
                    isEligible = weeklyCount >= 1;
                    progressText = `${Math.min(weeklyCount, 1)}/1 món tuần này`;
                  } else if (quest.code === "FIVE_STAR_ORDER") {
                    isEligible = (stats.fiveStarCount || 0) >= 1;
                    progressText = `${Math.min(stats.fiveStarCount || 0, 1)}/1 đánh giá 5★`;
                  } else if (quest.code === "REFERRAL_FIRST_ORDER") {
                    isEligible = false;
                    progressText = "0/1 bạn bè";
                  }

                  const isClaiming = claimingCode === quest.code;

                  const renderQuestIcon = () => {
                    switch (quest.code) {
                      case "WELCOME_ACTIVATION":
                        return <Sparkles size={18} className="text-[#183A2D]" />;
                      case "FIRST_LISTING":
                        return <Shirt size={18} className="text-[#183A2D]" />;
                      case "WEEKLY_LISTING_1":
                        return <Flame size={18} className="text-[#183A2D]" />;
                      case "FIVE_STAR_ORDER":
                        return <Star size={18} className="text-[#183A2D]" />;
                      case "REFERRAL_FIRST_ORDER":
                        return <Users size={18} className="text-[#183A2D]" />;
                      default:
                        return <Leaf size={18} className="text-[#183A2D]" />;
                    }
                  };

                  return (
                    <div key={quest.code} className="pt-3.5 first:pt-0 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-[#FAF9F5] border border-[#E9E2D8] flex items-center justify-center shrink-0 shadow-2xs">
                          {renderQuestIcon()}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-800 text-xs sm:text-sm font-heading">{quest.title}</span>
                            <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2 py-0.5 rounded-md font-mono font-bold">
                              +{quest.rewardCoins} Lá
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed font-light font-body">{quest.description}</p>
                          {progressText && (
                            <span className="text-[10px] text-stone-400 font-mono mt-1">Tiến độ: {progressText}</span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 pt-0.5">
                        {isClaimed ? (
                          <span className="px-3 py-1 bg-stone-100 text-stone-400 rounded-lg text-[11px] font-bold font-ui flex items-center gap-1 border border-stone-200/50">
                            <CheckCircle2 size={12} className="text-emerald-700" /> Đã nhận
                          </span>
                        ) : isEligible ? (
                          <button
                            type="button"
                            onClick={() => handleClaimQuest(quest.code)}
                            disabled={isClaiming}
                            className="px-3.5 py-1.5 bg-[#183A2D] hover:bg-[#23452F] text-white rounded-lg text-xs font-bold font-ui shadow-xs transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50 cursor-pointer"
                          >
                            {isClaiming ? <Loader2 size={12} className="animate-spin" /> : "Nhận Lá"}
                          </button>
                        ) : (
                          quest.actionUrl ? (
                            <Link
                              href={quest.actionUrl}
                              className="px-3 py-1.5 bg-white hover:bg-stone-50 text-[#183A2D] rounded-lg text-xs font-semibold font-ui transition-all border border-stone-200 shadow-2xs inline-block text-center"
                            >
                              {quest.actionText}
                            </Link>
                          ) : (
                            <span className="px-3 py-1 bg-stone-50 text-stone-300 rounded-lg text-[11px] font-medium font-ui">
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
