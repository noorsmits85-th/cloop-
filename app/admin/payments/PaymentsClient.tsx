"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle, Clock, User, CreditCard, ArrowRight, ShieldCheck, RefreshCw, FileText, CheckCircle2, Phone, AlertCircle, QrCode, X, Search, Check, Info } from "lucide-react";
import { PayoutItem, markPayoutCompletedAction, syncPayosTransactionStatusAction } from "./actions";

function getVietQRBankId(bankName: string): string {
  const b = (bankName || "").toLowerCase();
  if (b.includes("techcom") || b.includes("tcb")) return "970407"; // Techcombank
  if (b.includes("vietcom") || b.includes("vcb")) return "970436"; // Vietcombank
  if (b.includes("mb") || b.includes("quân đội")) return "970422"; // MBBank
  if (b.includes("vietin") || b.includes("ctg")) return "970415"; // VietinBank
  if (b.includes("vp") || b.includes("vpb")) return "970432"; // VPBank
  if (b.includes("acb") || b.includes("á châu")) return "970416"; // ACB
  if (b.includes("tp") || b.includes("tpb") || b.includes("tiên phong")) return "970423"; // TPBank
  if (b.includes("bidv") || b.includes("đầu tư")) return "970418"; // BIDV
  if (b.includes("sacom") || b.includes("stb")) return "970403"; // Sacombank
  if (b.includes("hd") || b.includes("hdb")) return "970437"; // HDBank
  if (b.includes("agri") || b.includes("nông nghiệp") || b.includes("vba")) return "970405"; // Agribank
  if (b.includes("vib")) return "970441"; // VIB
  if (b.includes("shb")) return "970443"; // SHB
  if (b.includes("ocb")) return "970448"; // OCB
  if (b.includes("sea") || b.includes("seab")) return "970440"; // SeABank
  return "970407"; // Mặc định Techcombank
}

function getVietQrUrl(
  bankName: string,
  accountNo: string,
  amount: number,
  accountName: string,
  orderCode: string,
  template: "compact" | "compact2" | "qr_only" = "compact"
): string {
  const bankBin = getVietQRBankId(bankName);
  const cleanAccount = (accountNo || "").replace(/\D/g, "");
  const cleanAmount = Math.max(0, Math.floor(amount));
  // Chuẩn Napas: Nội dung không dấu, không ký tự đặc biệt, tối đa 19 ký tự
  const cleanCode = (orderCode || "").replace(/[^A-Za-z0-9]/g, "");
  const desc = encodeURIComponent(`CLOOP ${cleanCode}`.substring(0, 19));
  const cleanName = encodeURIComponent(
    (accountName || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
  );
  return `https://img.vietqr.io/image/${bankBin}-${cleanAccount}-${template}.png?amount=${cleanAmount}&addInfo=${desc}&accountName=${cleanName}`;
}

export default function PaymentsClient({ initialItems }: { initialItems: PayoutItem[] }) {
  const [selectedQrItem, setSelectedQrItem] = useState<PayoutItem | null>(null);
  const [qrTemplate, setQrTemplate] = useState<"compact" | "qr_only">("compact");
  const [items, setItems] = useState<PayoutItem[]>(initialItems);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Trạng thái đối soát ngân hàng & PayOS
  const [bankRefCode, setBankRefCode] = useState<string>("");
  const [payoutNote, setPayoutNote] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [syncingPayos, setSyncingPayos] = useState<boolean>(false);
  const [payosSyncResult, setPayosSyncResult] = useState<{
    checked: boolean;
    isPaid?: boolean;
    message: string;
    source?: string;
  } | null>(null);

  const handleCopy = (text: string, typeKey: string = "account") => {
    navigator.clipboard.writeText(text);
    setCopiedType(typeKey);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleOpenModal = (item: PayoutItem) => {
    setSelectedQrItem(item);
    setQrTemplate("compact");
    setBankRefCode("");
    setPayoutNote("");
    setFormError(null);
    setPayosSyncResult(null);
  };

  const handleSyncPayos = async () => {
    if (!selectedQrItem) return;
    setSyncingPayos(true);
    setFormError(null);
    try {
      const res = await syncPayosTransactionStatusAction(selectedQrItem.id);
      setPayosSyncResult({
        checked: true,
        isPaid: res.isPaid,
        message: res.message || (res.success ? "PayOS đã phản hồi dữ liệu." : "Không thể kiểm tra PayOS."),
        source: res.source
      });
      if (res.isPaid && res.referenceId) {
        setBankRefCode(res.referenceId);
      }
    } catch (err: any) {
      setPayosSyncResult({
        checked: true,
        isPaid: false,
        message: "Lỗi kết nối cổng PayOS: " + (err.message || "Timeout"),
      });
    } finally {
      setSyncingPayos(false);
    }
  };

  const handleMarkAsPaid = async (item: PayoutItem) => {
    const cleanRef = bankRefCode.trim().toUpperCase();
    if (!cleanRef || cleanRef.length < 5) {
      setFormError("Vui lòng nhập Mã giao dịch ngân hàng thực tế (FT Code - tối thiểu 5 ký tự) trước khi chốt sổ cái.");
      return;
    }

    setProcessingId(item.id);
    setFormError(null);
    try {
      const res = await markPayoutCompletedAction(item.id, cleanRef, payoutNote);
      if (res.success) {
        setCompletedIds(prev => [...prev, item.id]);
        setSelectedQrItem(null);
        alert(`😊 Đã giải ngân thành công [Mã GD: ${res.bankRefCode}] cho ${item.ownerName} (${item.netPayoutAmount.toLocaleString()}₫) và đồng bộ Sổ Cái Kế Toán.`);
      } else {
        setFormError(res.error || "Không thể hoàn tất đối soát.");
      }
    } catch (err: any) {
      setFormError("Lỗi hệ thống: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const activeItems = items.filter(it => !completedIds.includes(it.id));
  const totalPendingAmount = activeItems.reduce((sum, it) => sum + it.netPayoutAmount, 0);

  return (
    <div className="w-full text-left font-sans pb-16">
      <div className="w-full space-y-6">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1 flex items-center gap-1.5">
              <span>Mạch Giải Ngân Doanh Thu & Rút Tiền Ví</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Khung Quản Lý Chi Trả & Đối Soát
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Quy trình giải ngân minh bạch: Quét VietQR 24/7, đồng bộ trạng thái cổng PayOS và lưu vết Mã giao dịch ngân hàng (FT Code) vào Sổ Cái Kế Toán.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/ledger"
              className="bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 border border-stone-300 hover:border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              Xem Sổ Cái TT 99
            </Link>
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2 rounded-xl text-xs font-bold">
              Đối soát 2 bước chuẩn kế toán
            </div>
          </div>
        </div>

        {/* STATS BANNER */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Số đơn chờ chi trả</span>
            <p className="text-2xl font-black font-mono text-stone-800 mt-1">{activeItems.length} đơn</p>
            <p className="text-[10px] text-amber-600 font-semibold mt-1">Cần đối soát và giải ngân</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Tổng tiền cần chuyển</span>
            <p className="text-2xl font-black font-mono text-emerald-700 mt-1">{totalPendingAmount.toLocaleString()}₫</p>
            <p className="text-[10px] text-stone-400 mt-1">Số dư đối soát thực tế từ quỹ sàn</p>
          </div>
          <div className="bg-[#183A2D] text-white p-5 rounded-2xl shadow-md">
            <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">Đã chuyển hoàn tất</span>
            <p className="text-2xl font-black font-mono text-white mt-1">{completedIds.length} lượt</p>
            <p className="text-[10px] text-emerald-300 mt-1">Đã lưu vết kiểm toán và chốt sổ cái</p>
          </div>
        </div>

        {/* LIST OF PENDING PAYOUTS */}
        <div className="space-y-4">
          {activeItems.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center space-y-3">
              <h3 className="text-lg font-bold text-stone-800">Không còn đơn nào tồn đọng</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Toàn bộ tiền thuê và yêu cầu rút tiền của chủ tủ đã được giải ngân. Dòng tiền đối soát trên sàn hoàn toàn cân bằng.
              </p>
              <div className="pt-2">
                <Link
                  href="/admin/accounting"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-xl transition"
                >
                  Chuyển sang Kỳ Kế Toán & Lợi Nhuận
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
                    {order.type === "WITHDRAWAL" ? (
                      <span className="text-[10px] font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                        <ShieldCheck size={11} className="text-emerald-700" /> Rút tiền Ví CLOOP
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Clock size={10} /> Đơn thuê hoàn tất (24h)
                      </span>
                    )}
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
                      Nội dung: <strong>{order.productTitle}</strong>
                    </p>
                  </div>

                  {/* THẺ TÀI KHOẢN NGÂN HÀNG COPY NHANH */}
                  <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80 space-y-1 text-xs">
                    <p className="flex items-center justify-between text-stone-600">
                      <span className="flex items-center gap-1.5"><CreditCard size={14} className="text-emerald-700" /> Ngân hàng: <b>{order.bankName}</b></span>
                      <span className="text-[11px] font-bold text-stone-700">Chủ TK: {order.bankHolder}</span>
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200/60 mt-1">
                      <p className="text-stone-700">
                        Số tài khoản: <strong className="font-mono text-sm font-bold text-stone-900 tracking-wider bg-white px-2.5 py-1 rounded-md border border-stone-200">{order.bankAccount}</strong>
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(order.bankAccount, `${order.id}-stk`)}
                          className="text-[11px] font-bold text-stone-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-stone-200 transition cursor-pointer shadow-2xs"
                        >
                          {copiedType === `${order.id}-stk` ? "✓ Đã copy STK" : "Sao chép STK"}
                        </button>
                        <button
                          onClick={() => handleOpenModal(order)}
                          className="text-[11px] font-bold text-emerald-800 hover:text-white bg-emerald-100 hover:bg-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-300 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <QrCode size={13} /> Quét VietQR (2s)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SỐ TIỀN CHI TIẾT & NÚT ĐỐI SOÁT */}
                <div className="text-right space-y-2 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 shrink-0">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Tiền gốc: {order.rentalFee.toLocaleString()}₫</p>
                    {order.platformFee > 0 && (
                      <p className="text-[11px] text-stone-500 font-mono">
                        - Phí sàn (12%): <span className="text-amber-700">-{order.platformFee.toLocaleString()}₫</span>
                      </p>
                    )}
                    {order.returnShippingFee > 0 && (
                      <p className="text-[11px] text-stone-500 font-mono">
                        - Ship chiều về: <span className="text-blue-700">-{order.returnShippingFee.toLocaleString()}₫</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-1">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Số tiền thực chuyển (Net):</p>
                    <p className="text-2xl font-black font-mono text-emerald-700">{order.netPayoutAmount.toLocaleString()}₫</p>
                  </div>

                  <div className="flex flex-col sm:flex-row md:flex-col gap-2 pt-1">
                    <button
                      onClick={() => handleOpenModal(order)}
                      className="bg-[#183A2D] hover:bg-[#23452F] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 justify-center shadow-sm cursor-pointer"
                    >
                      <ShieldCheck size={14} />
                      Đối Soát & Xác Thực Chi Trả
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* CĂN CỨ VẬN HÀNH */}
        <div className="p-4 bg-white rounded-2xl border border-stone-200 text-xs text-stone-500 flex items-start gap-3">
          <ShieldCheck size={18} className="text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-stone-800">Quy tắc Kiểm toán & Đối soát Kép CLOOP:</p>
            <p>
              1. <strong>Chiều Thu (Khách thanh toán thuê / nạp Lá)</strong>: Tự động 100% qua cổng PayOS (Webhook + Polling thời gian thực, không cần duyệt thủ công).
            </p>
            <p>
              2. <strong>Chiều Chi (Rút tiền / Giải ngân chủ tủ)</strong>: Chuyển khoản trực tiếp từ tài khoản sàn qua VietQR 24/7. Để chốt sổ, quản trị viên bắt buộc phải nhập Mã giao dịch ngân hàng thực tế (FT Code) để hệ thống ghi vết vào Sổ Cái Bất Biến (Ledger) và Nhật Ký Kiểm Toán (Audit Log).
            </p>
          </div>
        </div>

        {/* MODAL ĐỐI SOÁT & XÁC THỰC GIẢI NGÂN */}
        {selectedQrItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white rounded-3xl border border-stone-100 max-w-[480px] w-full p-6 sm:p-7 text-center shadow-2xl space-y-4 relative my-8">
              <button
                type="button"
                onClick={() => setSelectedQrItem(null)}
                className="absolute right-4 top-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Đối Soát Chi Trả & Ghi Sổ Cái
                </span>
                <h3 className="text-lg font-black text-stone-900 pt-1">
                  Xác Thực Giải Ngân Ngân Hàng
                </h3>
                <p className="text-xs text-stone-500 font-light">
                  Mã đơn: <strong className="font-mono text-stone-800">{selectedQrItem.orderCode}</strong> &bull; Số tiền: <strong className="text-emerald-700">{selectedQrItem.netPayoutAmount.toLocaleString()}₫</strong>
                </p>
              </div>

              {/* Chuyển đổi định dạng hiển thị QR để tăng khả năng nhận diện khi quét qua màn hình */}
              <div className="flex bg-stone-100 p-1 rounded-xl gap-1 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setQrTemplate("compact")}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition cursor-pointer ${qrTemplate === "compact" ? "bg-white text-emerald-900 shadow-xs font-bold" : "text-stone-500 hover:text-stone-800"}`}
                >
                  Khung VietQR Tiêu Chuẩn
                </button>
                <button
                  type="button"
                  onClick={() => setQrTemplate("qr_only")}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition cursor-pointer ${qrTemplate === "qr_only" ? "bg-emerald-800 text-white shadow-xs font-bold" : "text-stone-500 hover:text-stone-800"}`}
                >
                  QR Nét Siêu Nhạy (Không che tâm)
                </button>
              </div>

              {/* QR Image */}
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 inline-block shadow-inner">
                <img
                  src={getVietQrUrl(
                    selectedQrItem.bankName,
                    selectedQrItem.bankAccount,
                    selectedQrItem.netPayoutAmount,
                    selectedQrItem.bankHolder,
                    selectedQrItem.orderCode,
                    qrTemplate
                  )}
                  alt="VietQR Payout"
                  className="w-56 h-56 mx-auto rounded-xl border border-stone-200 shadow-sm object-contain bg-white p-2"
                />
              </div>

              {/* Chi tiết người nhận & Copy nhanh */}
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-left space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-sans">Người nhận:</span>
                  <strong className="font-bold text-stone-900 font-sans">{selectedQrItem.bankHolder}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-sans">Ngân hàng:</span>
                  <span className="font-semibold text-stone-800 font-sans">{selectedQrItem.bankName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-sans">Số tài khoản:</span>
                  <div className="flex items-center gap-1.5">
                    <strong className="font-bold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200 tracking-wider">
                      {selectedQrItem.bankAccount}
                    </strong>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedQrItem.bankAccount, "modal-stk")}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-white border border-stone-200 text-emerald-800 font-bold hover:bg-emerald-50 transition cursor-pointer"
                    >
                      {copiedType === "modal-stk" ? "✓" : "Copy"}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-stone-200">
                  <span className="text-stone-600 font-bold font-sans">Số tiền:</span>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-base font-black text-emerald-700 font-sans">
                      {selectedQrItem.netPayoutAmount.toLocaleString('vi-VN')}₫
                    </strong>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedQrItem.netPayoutAmount.toString(), "modal-amount")}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-white border border-stone-200 text-emerald-800 font-bold hover:bg-emerald-50 transition cursor-pointer"
                    >
                      {copiedType === "modal-amount" ? "✓" : "Copy"}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-sans">Nội dung CK:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-stone-700 bg-white px-1.5 py-0.5 rounded border border-stone-200 text-[11px]">
                      CLOOP {selectedQrItem.orderCode.replace(/[^A-Za-z0-9]/g, "")}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(`CLOOP ${selectedQrItem.orderCode.replace(/[^A-Za-z0-9]/g, "")}`, "modal-memo")}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-white border border-stone-200 text-emerald-800 font-bold hover:bg-emerald-50 transition cursor-pointer"
                    >
                      {copiedType === "modal-memo" ? "✓" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>

              {/* BƯỚC 1: ĐỒNG BỘ CỔNG PAYOS */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <RefreshCw size={13} className="text-emerald-700" />
                    Đồng bộ trạng thái cổng PayOS
                  </span>
                  <button
                    type="button"
                    onClick={handleSyncPayos}
                    disabled={syncingPayos}
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {syncingPayos ? (
                      <><RefreshCw size={11} className="animate-spin" /> Đang tra soát...</>
                    ) : (
                      "Kiểm tra PayOS"
                    )}
                  </button>
                </div>

                {payosSyncResult && (
                  <div className={`text-[11px] p-2.5 rounded-xl border ${
                    payosSyncResult.isPaid 
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                      : "bg-amber-50 border-amber-200 text-amber-900"
                  }`}>
                    <p className="font-semibold">{payosSyncResult.message}</p>
                  </div>
                )}
              </div>

              {/* BƯỚC 2: XÁC THỰC MÃ GIAO DỊCH NGÂN HÀNG (FT CODE) */}
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-3.5 text-left space-y-2.5">
                <div>
                  <label className="block text-xs font-bold text-stone-900 mb-1">
                    Mã giao dịch ngân hàng / FT Code *
                  </label>
                  <input
                    type="text"
                    value={bankRefCode}
                    onChange={(e) => {
                      setBankRefCode(e.target.value.toUpperCase());
                      setFormError(null);
                    }}
                    placeholder="VD: FT2409..., 9704..., hoặc Số bút toán ngân hàng"
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-mono font-bold tracking-wider text-stone-900 focus:outline-none focus:border-emerald-700"
                  />
                  <p className="text-[10px] text-stone-500 mt-1">
                    Mở app ngân hàng sau khi chuyển khoản, copy <strong>Mã giao dịch (FT Code / Mã tham chiếu)</strong> và dán vào đây để đối soát.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Ghi chú đối soát (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={payoutNote}
                    onChange={(e) => setPayoutNote(e.target.value)}
                    placeholder="Ghi chú kế toán nội bộ (nếu có)..."
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-emerald-700"
                  />
                </div>

                {formError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium flex items-start gap-1.5">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-1 space-y-2">
                <button
                  disabled={processingId === selectedQrItem.id || !bankRefCode.trim() || bankRefCode.trim().length < 5}
                  onClick={() => handleMarkAsPaid(selectedQrItem)}
                  className="w-full py-3.5 bg-[#183A2D] hover:bg-[#23452F] text-white text-xs font-bold uppercase tracking-wider rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {processingId === selectedQrItem.id ? (
                    <><RefreshCw size={15} className="animate-spin" /> Đang ghi vết sổ cái & kiểm toán...</>
                  ) : (
                    <><CheckCircle2 size={16} /> Xác Nhận Đã Chuyển & Chốt Sổ Cái</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedQrItem(null)}
                  className="w-full py-2 text-stone-400 hover:text-stone-700 text-xs font-medium transition cursor-pointer"
                >
                  Đóng lại
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
