"use client";

import React, { useState } from "react";
import { 
  MapPin, CreditCard, Truck, CheckCircle2, AlertCircle, 
  ChevronRight, X, Save, Loader2, ShieldCheck, Building2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

const POPULAR_BANKS = [
  "MB Bank",
  "Vietcombank",
  "Techcombank",
  "VietinBank",
  "BIDV",
  "ACB",
  "TPBank",
  "VPBank",
  "VIB",
  "Sacombank",
  "MoMo",
  "ZaloPay"
];

interface SmartSellerOnboardingCardProps {
  userProfile?: {
    id?: string;
    pickup_address?: string | null;
    phone?: string | null;
    bank_name?: string | null;
    bank_account?: string | null;
    bank_owner?: string | null;
  } | null;
}

export function SmartSellerOnboardingCard({ userProfile }: SmartSellerOnboardingCardProps) {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<"address" | "bank">("address");

  const [address, setAddress] = useState(userProfile?.pickup_address || "");
  const [phone, setPhone] = useState(userProfile?.phone || "");
  const [bankName, setBankName] = useState(userProfile?.bank_name || "");
  const [bankAccount, setBankAccount] = useState(userProfile?.bank_account || "");
  const [bankOwner, setBankOwner] = useState(userProfile?.bank_owner || "");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const hasAddress = Boolean(address.trim());
  const hasBank = Boolean(bankName.trim() && bankAccount.trim());

  const handleOpenModal = (tab: "address" | "bank") => {
    setActiveModalTab(tab);
    setIsOpenModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentId = session?.user?.id || userProfile?.id;
      if (!currentId) throw new Error("Vui lòng đăng nhập để lưu cấu hình.");

      const { error } = await supabase
        .from("profiles")
        .update({
          pickup_address: address,
          phone: phone,
          bank_name: bankName,
          bank_account: bankAccount,
        })
        .eq("id", currentId);

      if (error) throw error;

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        setIsOpenModal(false);
      }, 1200);
    } catch (err: any) {
      alert("Lỗi lưu cấu hình: " + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const maskBankAccount = (acc: string) => {
    if (!acc || acc.length <= 4) return acc;
    return "•••• " + acc.slice(-4);
  };

  return (
    <>
      <div className="w-full rounded-2xl bg-white border border-[#EBE6D8] p-5 sm:p-6 shadow-sm relative overflow-hidden">
        {/* Decorative background accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/50 rounded-full blur-3xl pointer-events-none -z-0" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#183A2D] text-white text-[10px] font-bold tracking-wider uppercase font-ui">
                THIẾT LẬP DÀNH CHO CHỦ ĐỒ
              </span>
              {(hasAddress && hasBank) ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                  <CheckCircle2 size={13} /> Sẵn sàng cho thuê 100%
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-semibold">
                  <AlertCircle size={13} /> Cần hoàn tất 2 bước nhận tiền
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#142A1E] font-heading mt-1">
              Địa Chỉ Giao Nhận & Tài Khoản Nhận Tiền Thuê
            </h3>
            <p className="text-stone-500 text-xs mt-0.5">
              Shipper sẽ đến lấy đồ đi giao, và tiền thuê của khách sẽ tự động chuyển về đúng STK ngân hàng của bạn.
            </p>
          </div>
        </div>

        {/* 2-STEP BENTO CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 relative z-10">
          
          {/* BƯỚC 1: ĐỊA CHỈ LẤY HÀNG CHO SHIPPER */}
          <div 
            onClick={() => handleOpenModal("address")}
            className={`p-4 rounded-xl border transition-all cursor-pointer group text-left ${
              hasAddress 
                ? "bg-emerald-50/40 border-emerald-200/80 hover:border-emerald-400 hover:bg-emerald-50/70" 
                : "bg-amber-50/40 border-amber-200/80 hover:border-amber-400 hover:bg-amber-50/70"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  hasAddress ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}>
                  <Truck size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-ui">Bước 1</span>
                    {hasAddress && <CheckCircle2 size={12} className="text-emerald-700" />}
                  </div>
                  <h4 className="text-xs font-bold text-stone-900 font-heading">Địa chỉ kho lấy đồ (Cho Shipper)</h4>
                </div>
              </div>

              <span className="text-[11px] font-bold text-emerald-800 group-hover:translate-x-0.5 transition-transform flex items-center shrink-0">
                {hasAddress ? "Sửa" : "Thêm"} <ChevronRight size={13} />
              </span>
            </div>

            <div className="mt-3 pt-2.5 border-t border-stone-200/60">
              {hasAddress ? (
                <div className="flex items-start gap-1.5 text-xs text-stone-700">
                  <MapPin size={13} className="text-emerald-700 shrink-0 mt-0.5" />
                  <span className="font-medium line-clamp-1">{address} {phone ? `(${phone})` : ""}</span>
                </div>
              ) : (
                <p className="text-xs font-medium text-amber-800">
                  Chưa có địa chỉ để Shipper đến lấy đồ. Nhấn để cập nhật ngay!
                </p>
              )}
            </div>
          </div>

          {/* BƯỚC 2: TÀI KHOẢN NGÂN HÀNG NHẬN TIỀN */}
          <div 
            onClick={() => handleOpenModal("bank")}
            className={`p-4 rounded-xl border transition-all cursor-pointer group text-left ${
              hasBank 
                ? "bg-emerald-50/40 border-emerald-200/80 hover:border-emerald-400 hover:bg-emerald-50/70" 
                : "bg-amber-50/40 border-amber-200/80 hover:border-amber-400 hover:bg-amber-50/70"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  hasBank ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}>
                  <Building2 size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-ui">Bước 2</span>
                    {hasBank && <CheckCircle2 size={12} className="text-emerald-700" />}
                  </div>
                  <h4 className="text-xs font-bold text-stone-900 font-heading">Tài khoản ngân hàng nhận tiền</h4>
                </div>
              </div>

              <span className="text-[11px] font-bold text-emerald-800 group-hover:translate-x-0.5 transition-transform flex items-center shrink-0">
                {hasBank ? "Đổi STK" : "Thêm STK"} <ChevronRight size={13} />
              </span>
            </div>

            <div className="mt-3 pt-2.5 border-t border-stone-200/60">
              {hasBank ? (
                <div className="flex items-center gap-2 text-xs text-stone-700">
                  <CreditCard size={13} className="text-emerald-700 shrink-0" />
                  <span className="font-bold text-[#183A2D]">{bankName}</span>
                  <span className="font-mono text-stone-500">{maskBankAccount(bankAccount)}</span>
                </div>
              ) : (
                <p className="text-xs font-medium text-amber-800">
                  Chưa cài STK nhận tiền thuê từ khách. Nhấn để cài đặt trong 30 giây!
                </p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 🚀 MODAL NHẬP NHANH 30 GIÂY TẠI CHỖ */}
      <AnimatePresence>
        {isOpenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden text-left"
            >
              {/* Header */}
              <div className="px-5 py-4 bg-[#122D20] text-white flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider font-heading">
                    Cấu Hình Giao Nhận & Nhận Tiền Thuê
                  </h3>
                  <p className="text-[11px] text-[#A3E39F]">
                    Bảo mật tuyệt đối • Chỉ dùng cho Shipper và Chuyển khoản
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Tab Switcher */}
              <div className="grid grid-cols-2 p-1 bg-stone-100 border-b border-stone-200 text-xs font-bold font-ui">
                <button
                  type="button"
                  onClick={() => setActiveModalTab("address")}
                  className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeModalTab === "address" 
                      ? "bg-white text-[#183A2D] shadow-xs" 
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <Truck size={14} /> 1. Địa Chỉ Shipper Lấy Đồ
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab("bank")}
                  className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeModalTab === "bank" 
                      ? "bg-white text-[#183A2D] shadow-xs" 
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <CreditCard size={14} /> 2. STK Nhận Tiền Thuê
                </button>
              </div>

              <form onSubmit={handleSave} className="p-5 space-y-4">
                {activeModalTab === "address" ? (
                  <div className="space-y-3.5">
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-900 leading-relaxed">
                      💡 <strong>Địa chỉ này dùng để làm gì?</strong> Khi có khách đặt thuê đồ, Shipper của CLOOP sẽ đến đúng địa chỉ này để lấy váy/áo đi giao. Địa chỉ được bảo mật, không hiện công khai.
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                        Số điện thoại liên hệ chủ đồ *
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ví dụ: 0987654321"
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:border-[#183A2D] outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                        Địa chỉ lấy hàng cụ thể *
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Ví dụ: Số 12 ngõ 89 đường Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội"
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:border-[#183A2D] outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-900 leading-relaxed">
                      💡 <strong>Tiền thuê về đâu?</strong> Sau khi người thuê nhận đồ và hoàn tất thời gian thuê, tiền thuê sẽ được chuyển thẳng về Số tài khoản ngân hàng này của bạn.
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                        Ngân hàng thụ hưởng *
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {POPULAR_BANKS.slice(0, 6).map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => setBankName(b)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer transition-all ${
                              bankName === b 
                                ? "bg-[#183A2D] text-white border-[#183A2D]" 
                                : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        required
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="Chọn ở trên hoặc tự gõ: MB Bank, Vietcombank, Techcombank..."
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:border-[#183A2D] outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                        Số tài khoản ngân hàng *
                      </label>
                      <input
                        type="text"
                        required
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value.replace(/\s+/g, ""))}
                        placeholder="Nhập số tài khoản ngân hàng..."
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-mono font-bold focus:border-[#183A2D] outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] text-stone-400 font-medium">
                    <ShieldCheck size={13} className="text-emerald-700" /> Mã hóa an toàn SSL
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOpenModal(false)}
                      className="px-4 py-2 rounded-full text-xs font-bold text-stone-500 hover:bg-stone-100 transition-colors cursor-pointer"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2 rounded-full bg-[#183A2D] hover:bg-[#255C3E] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      {savedSuccess ? "Đã lưu thành công!" : "Lưu Thông Tin"}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
