"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle, Clock, User, CreditCard, ArrowRight, ShieldCheck, RefreshCw, FileText, CheckCircle2, Phone, AlertCircle, QrCode, X } from "lucide-react";
import { PayoutItem, markPayoutCompletedAction } from "./actions";

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

  const handleCopy = (text: string, typeKey: string = "account") => {
    navigator.clipboard.writeText(text);
    setCopiedType(typeKey);
    setTimeout(() => setCopiedType(null), 2500);
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
                    {order.type === "WITHDRAWAL" ? (
                      <span className="text-[10px] font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                        <ShieldCheck size={11} className="text-emerald-700" /> Rút tiền Ví CLOOP (Thực tế)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Clock size={10} /> Chờ chuyển khoản (24h)
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
                      Sản phẩm: <strong>{order.productTitle}</strong>
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
                          onClick={() => {
                            setSelectedQrItem(order);
                            setQrTemplate("compact");
                          }}
                          className="text-[11px] font-bold text-emerald-800 hover:text-white bg-emerald-100 hover:bg-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-300 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <QrCode size={13} /> Quét VietQR (2s)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SỐ TIỀN CHI TIẾT & NÚT XÁC NHẬN */}
                <div className="text-right space-y-2 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 shrink-0">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Tiền gốc: {order.rentalFee.toLocaleString()}đ</p>
                    {order.platformFee > 0 && (
                      <p className="text-[11px] text-stone-500 font-mono">
                        - Phí sàn (12%): <span className="text-amber-700">-{order.platformFee.toLocaleString()}đ</span>
                      </p>
                    )}
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

                  <div className="flex flex-col sm:flex-row md:flex-col gap-2 pt-1">
                    <button
                      onClick={() => {
                        setSelectedQrItem(order);
                        setQrTemplate("compact");
                      }}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <QrCode size={14} /> Mở VietQR Chuyển Tiền (2s)
                    </button>
                    <button
                      onClick={() => handleMarkAsPaid(order)}
                      disabled={processingId === order.id}
                      className="bg-[#183A2D] hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 justify-center shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle size={14} />
                      {processingId === order.id ? "Đang ghi vết..." : "Tôi đã chuyển khoản xong"}
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
            <p className="font-bold text-stone-800">Quy tắc Mạch Giải ngân Khép kín CLOOP:</p>
            <p>
              1. Sau khi khách thuê trả đồ và chủ tủ xác nhận không tranh chấp, cọc của khách được Két Escrow hoàn trả 100% qua VietQR.
            </p>
            <p>
              2. Tiền thuê của chủ tủ được cấn trừ phí sàn CLOOP (12% hoặc 0% nếu đơn lỗi) và cước chuyển hoàn (nếu có). Số tiền còn lại được chuyển khoản trực tiếp vào tài khoản ngân hàng trong vòng 24 giờ.
            </p>
          </div>
        </div>

        {/* MODAL QUÉT VIETQR CHUYỂN KHOẢN TỰ ĐỘNG (0đ PHÍ) */}
        {selectedQrItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white rounded-3xl border border-stone-100 max-w-[440px] w-full p-6 sm:p-7 text-center shadow-2xl space-y-4 relative my-8">
              <button
                type="button"
                onClick={() => setSelectedQrItem(null)}
                className="absolute right-4 top-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  VietQR Chuẩn Napas 247 (0đ Phí)
                </span>
                <h3 className="text-lg font-black text-stone-900 pt-1">
                  Quét Mã Chuyển Tiền Tức Thì
                </h3>
                <p className="text-xs text-stone-500 font-light">
                  Mở App ngân hàng bất kỳ (ACB ONE, Techcombank, VCB, MB...) để quét. Toàn bộ STK, người nhận & số tiền được điền tự động 100%.
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
                  ⚡ QR Nét Siêu Nhạy (Không che tâm)
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
                  className="w-64 h-64 mx-auto rounded-xl border border-stone-200 shadow-sm object-contain bg-white p-2"
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

              {/* Mẹo quét màn hình */}
              <div className="text-[11px] text-stone-500 bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 text-left space-y-0.5">
                <span className="font-bold text-amber-900 block">💡 Mẹo quét QR trên màn hình:</span>
                Nếu ứng dụng ngân hàng báo lỗi hoặc khó quét do lóa sáng màn hình, bạn hãy bấm chọn tab <strong>&ldquo;⚡ QR Nét Siêu Nhạy&rdquo;</strong> ở trên hoặc bấm nút <strong>Copy STK</strong> để chuyển khoản 24/7 tức thì!
              </div>

              {/* Action buttons */}
              <div className="pt-1 space-y-2">
                <button
                  disabled={processingId === selectedQrItem.id}
                  onClick={async () => {
                    await handleMarkAsPaid(selectedQrItem);
                    setSelectedQrItem(null);
                  }}
                  className="w-full py-3.5 bg-[#183A2D] hover:bg-[#23452F] text-white text-xs font-bold uppercase tracking-wider rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {processingId === selectedQrItem.id ? (
                    <><RefreshCw size={15} className="animate-spin" /> Đang chốt sổ cái...</>
                  ) : (
                    <><CheckCircle2 size={16} /> Tôi đã chuyển khoản xong (Chốt sổ)</>
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
