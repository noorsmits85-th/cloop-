"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Wallet, Receipt, Calendar, BookOpen, X, FileText, AlertTriangle, Download } from "lucide-react";
import { processReconciliation } from "@/app/actions/ledger";
import { createDispute } from "@/app/actions/dispute";

export interface InvoiceData {
  id: string;
  rentalId: string;
  productName: string;
  renter: string;
  owner: string;
  totalDepositIn: number;
  depositRefund: number;
  rentalFee: number;
  status: string;
  createdAt: string; // Thêm thời gian giao dịch chi tiết
}

interface LedgerClientProps {
  initialInvoices: InvoiceData[];
  totalPlatformFee: number;
  totalIn: number;
  totalOut: number;
}

export default function LedgerClient({ initialInvoices, totalPlatformFee, totalIn, totalOut }: LedgerClientProps) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [activeTab, setActiveTab] = useState<"accounting" | "dispute">("accounting");
  
  // States cho form tranh chấp
  const [disputeDesc, setDisputeDesc] = useState("");
  const [disputeSeverity, setDisputeSeverity] = useState<"LOW" | "MEDIUM" | "HIGH">("LOW");
  const [disputeAmount, setDisputeAmount] = useState<number>(0);
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [showVatBreakdown, setShowVatBreakdown] = useState(true);

  const handleReconcile = async (invoice: any) => {
    setIsProcessing(invoice.id);
    
    // Tính toán số liệu phân bổ theo chuẩn Techfest & TT 99
    const platformFee = Math.floor(invoice.rentalFee * 0.12) || 42000;
    const vatFee = Math.round(platformFee * 0.1);
    const netPlatformFee = platformFee - vatFee;
    const payoutToOwner = Math.max(0, invoice.rentalFee - platformFee - 25000);
    const refundToRenter = invoice.depositRefund;

    try {
      const res = await processReconciliation(invoice.id, refundToRenter, payoutToOwner);
      
      if (!res.success) {
        throw new Error(res.error);
      }

      // Update state local
      setInvoices(prev => 
        prev.map(inv => inv.id === invoice.id ? { ...inv, status: "COMPLETED" } : inv)
      );
      if (selectedInvoice?.id === invoice.id) {
        setSelectedInvoice({ ...invoice, status: "COMPLETED" });
      }
      
      alert(`✅ Đối soát thành công Sổ cái (Chuẩn TT 99)!\n- Hoàn cọc (TK 3386 -> 112): ${refundToRenter.toLocaleString()}đ\n- Chuyển chủ đồ (TK 33882 -> 112): ${payoutToOwner.toLocaleString()}đ\n- Phí dịch vụ sàn (TK 5113): ${netPlatformFee.toLocaleString()}đ\n- Thuế GTGT đầu ra (TK 33311): ${vatFee.toLocaleString()}đ\n- Cước GHN 2 chiều: 42.000đ | Đệm 5K: 8.000đ`);
    } catch (error: any) {
      alert("Lỗi đối soát: " + error.message);
    } finally {
      setIsProcessing(null);
    }
  };

  const exportToExcel = () => {
    const headers = [
      "Mã Chứng Từ",
      "Ngày Hạch Toán",
      "Sản Phẩm / Đơn Thuê",
      "Người Thuê",
      "Chủ Tủ Đồ",
      "Diễn Giải Nghiệp Vụ",
      "Tài Khoản Nợ",
      "Tài Khoản Có",
      "Số Tiền (VNĐ)",
      "Trạng Thái Sổ"
    ];

    const rows: string[][] = [];

    invoices.forEach(inv => {
      const code = `PC-${inv.id.substring(0, 8).toUpperCase()}`;
      const rentalFee = inv.rentalFee;
      const depositRefund = inv.depositRefund;
      const platformFee = Math.floor(rentalFee * 0.12) || 10000;
      const vatFee = Math.round(platformFee * 0.1);
      const netPlatformFee = platformFee - vatFee;
      const payoutToOwner = Math.max(0, rentalFee - platformFee - 25000);

      // 1. Khách nạp tiền cọc + thuê + ship
      rows.push([
        code,
        inv.createdAt,
        inv.productName,
        inv.renter,
        inv.owner,
        "Khách nạp tiền cọc, tiền thuê và cước ship qua VietQR",
        "TK 112 (Tiền gửi không kỳ hạn)",
        "TK 3386 / TK 33882 / TK 33883",
        inv.totalDepositIn.toString(),
        inv.status === "COMPLETED" ? "Đã đối soát" : "Chờ đối soát"
      ]);

      // 2. Hoàn cọc cho khách
      rows.push([
        code,
        inv.createdAt,
        inv.productName,
        inv.renter,
        inv.owner,
        "Tất toán hoàn trả 100% tiền ký cược cọc đồ",
        "TK 3386 (Két cọc Escrow)",
        "TK 112 (Tiền gửi không kỳ hạn)",
        depositRefund.toString(),
        inv.status === "COMPLETED" ? "Đã đối soát" : "Chờ đối soát"
      ]);

      // 3. Payout chủ tủ
      rows.push([
        code,
        inv.createdAt,
        inv.productName,
        inv.renter,
        inv.owner,
        "Thanh toán tiền thuê cho Chủ tủ sau khi cấn trừ phí sàn & ship chiều về",
        "TK 33882 (Phải trả Chủ tủ)",
        "TK 112 (Tiền gửi không kỳ hạn)",
        payoutToOwner.toString(),
        inv.status === "COMPLETED" ? "Đã đối soát" : "Chờ đối soát"
      ]);

      // 4. Doanh thu thuần sàn
      rows.push([
        code,
        inv.createdAt,
        inv.productName,
        inv.renter,
        inv.owner,
        "Doanh thu thuần dịch vụ nền tảng CLOOP",
        "TK 33882 (Phải trả Chủ tủ)",
        "TK 5113 (Doanh thu cung cấp dịch vụ)",
        netPlatformFee.toString(),
        inv.status === "COMPLETED" ? "Đã đối soát" : "Chờ đối soát"
      ]);

      // 5. Thuế GTGT đầu ra
      rows.push([
        code,
        inv.createdAt,
        inv.productName,
        inv.renter,
        inv.owner,
        "Thuế GTGT đầu ra dịch vụ TMĐT theo Thông tư 99",
        "TK 33882 (Phải trả Chủ tủ)",
        "TK 33311 (Thuế GTGT đầu ra)",
        vatFee.toString(),
        inv.status === "COMPLETED" ? "Đã đối soát" : "Chờ đối soát"
      ]);

      // 6. Cước GHN thực tế
      rows.push([
        code,
        inv.createdAt,
        inv.productName,
        inv.renter,
        inv.owner,
        "Chi trả cước giao hàng thực tế bưu tá GHN",
        "TK 33883 (Thu hộ vận chuyển)",
        "TK 331 (Phải trả bưu tá GHN)",
        "42000",
        inv.status === "COMPLETED" ? "Đã đối soát" : "Chờ đối soát"
      ]);

      // 7. Thặng dư đệm Block 5K
      rows.push([
        code,
        inv.createdAt,
        inv.productName,
        inv.renter,
        inv.owner,
        "Thặng dư thuật toán Block 5K (Quỹ phòng vệ giao lại)",
        "TK 33883 (Thu hộ vận chuyển)",
        "TK 3388_BUFFER (hoặc TK 711)",
        "8000",
        inv.status === "COMPLETED" ? "Đã đối soát" : "Chờ đối soát"
      ]);
    });

    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(e => e.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(","))
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `So_Nhat_Ky_Chung_CLOOP_TT99_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8 border-b border-[#E9E2D5] pb-6">
          <div className="flex items-center gap-4">
            <ShieldCheck className="w-10 h-10 text-emerald-800" />
            <div>
              <h1 className="text-3xl font-bold text-stone-800 tracking-tight">Sổ Nhật Ký Chung (Ledger)</h1>
              <p className="text-stone-500 mt-1">Nền tảng Ghi nhận & Định khoản dòng tiền theo Chuẩn mực Kế toán</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/payments"
              className="bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 border border-stone-300 hover:border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <span>Chi Trả Payouts</span>
              <ArrowRight size={14} className="text-emerald-700" />
            </Link>
            <button
              onClick={exportToExcel}
              className="bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 border border-stone-300 hover:border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Download size={14} className="text-emerald-700" /> Xuất Sổ Kế Toán (Excel/CSV)
            </button>
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <BookOpen size={14} /> Chuẩn TT 99/2025/TT-BTC (Nợ/Có)
            </div>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl border border-[#E9E2D5] shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center">
              <Wallet className="text-amber-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Tổng Dòng Tiền Vào</p>
              <p className="text-2xl font-mono font-bold text-stone-800">{totalIn.toLocaleString()}đ</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-[#E9E2D5] shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
              <Receipt className="text-emerald-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Đã Hoàn/Chuyển</p>
              <p className="text-2xl font-mono font-bold text-stone-800">{totalOut.toLocaleString()}đ</p>
            </div>
          </div>

          <div className="bg-[#1C3F30] p-6 rounded-xl shadow-lg flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
              <ShieldCheck className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1">Doanh thu CLOOP</p>
              <p className="text-2xl font-mono font-bold text-white">+{totalPlatformFee.toLocaleString()}đ</p>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white border border-[#E9E2D5] rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-[#E9E2D5]">
                <th className="p-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Chứng Từ</th>
                <th className="p-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Diễn giải Hợp đồng</th>
                <th className="p-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Tiền vào (Nợ 112 / Có 3388)</th>
                <th className="p-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Định khoản Phân bổ (OUT)</th>
                <th className="p-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-center">Trạng Thái Sổ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9E2D5]">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-stone-500">
                    Sổ cái hiện đang trống. Hãy thực hiện giao dịch thuê đồ để ghi nhận dòng tiền đầu tiên!
                  </td>
                </tr>
              ) : invoices.map((inv) => (
                <tr 
                  key={inv.id} 
                  onClick={() => setSelectedInvoice(inv)}
                  className="hover:bg-stone-50/80 transition-colors cursor-pointer group"
                >
                  <td className="p-4">
                    <span className="font-mono text-xs font-bold text-stone-600 bg-stone-100 px-2 py-1 rounded group-hover:bg-[#183A2D] group-hover:text-white transition-colors">PC-{inv.id.substring(0,6).toUpperCase()}</span>
                    <p className="text-[10px] text-stone-400 mt-2 font-mono flex items-center gap-1"><Calendar size={10} /> {inv.createdAt}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-stone-800 text-sm mb-1">{inv.productName}</p>
                    <p className="text-xs text-stone-500">Thuê: {inv.renter} ➔ {inv.owner}</p>
                  </td>
                  <td className="p-4">
                    <span className="font-mono font-bold text-emerald-700">+{inv.totalDepositIn.toLocaleString()}đ</span>
                  </td>
                  <td className="p-4">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between w-64 items-center">
                        <div>
                          <p className="text-stone-700 font-medium">Hoàn cọc thuê</p>
                          <p className="text-[10px] text-stone-400">Nợ TK 3388 / Có TK 112</p>
                        </div>
                        <span className="font-mono font-medium text-stone-700">{inv.depositRefund.toLocaleString()}đ</span>
                      </div>
                      <div className="flex justify-between w-64 items-center border-t border-stone-100 pt-1.5">
                        <div>
                          <p className="text-stone-700 font-medium">Trả tiền chủ đồ</p>
                          <p className="text-[10px] text-stone-400">Nợ TK 3388 / Có TK 112</p>
                        </div>
                        <span className="font-mono font-medium text-stone-700">{(inv.rentalFee - 10000).toLocaleString()}đ</span>
                      </div>
                      <div className="flex justify-between w-64 items-center border-t border-stone-200 pt-1.5 mt-1 bg-amber-50 p-1.5 rounded">
                        <div>
                          <p className="text-amber-700 font-bold">Phí nền tảng (Doanh thu)</p>
                          <p className="text-[10px] text-amber-600">Nợ TK 3388 / Có TK 5113</p>
                        </div>
                        <span className="font-mono font-bold text-amber-700">10.000đ</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    {inv.status === "COMPLETED" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                        <CheckCircle2 size={14} /> ĐÃ ĐỐI SOÁT
                      </span>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleReconcile(inv); }}
                        disabled={isProcessing === inv.id}
                        className="inline-flex items-center gap-2 bg-[#1C3F30] hover:bg-[#2A5A46] text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isProcessing === inv.id ? "ĐANG XỬ LÝ..." : (
                          <>DUYỆT HOÀN TRẢ <ArrowRight size={14} /></>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* Modal Chi tiết Hóa Đơn (Sổ phụ) */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-stone-200" onClick={(e) => e.stopPropagation()}>
            {/* Header Modal */}
            <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-800">Chi tiết Chứng từ PC-{selectedInvoice.id.substring(0,6).toUpperCase()}</h2>
                  <p className="text-xs text-stone-500 font-mono mt-0.5 flex items-center gap-1"><Calendar size={12}/> Thời gian GD: <strong className="text-emerald-700">{selectedInvoice.createdAt}</strong></p>
                </div>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-200/50 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Content Modal */}
            <div className="p-6">
              {/* Thông tin chung */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Hợp đồng thuê động sản</p>
                  <p className="text-sm font-bold text-stone-800">{selectedInvoice.productName}</p>
                  <div className="mt-2 text-xs text-stone-600 space-y-1">
                    <p>Bên Thuê: <span className="font-semibold">{selectedInvoice.renter}</span></p>
                    <p>Bên Cho Thuê: <span className="font-semibold">{selectedInvoice.owner}</span></p>
                  </div>
                </div>
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-col justify-center">
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Tổng tiền cọc (Nợ 112)</p>
                  <p className="text-2xl font-mono font-bold text-emerald-800">+{selectedInvoice.totalDepositIn.toLocaleString()}đ</p>
                </div>
              </div>
              {/* TABS */}
              <div className="flex gap-6 border-b border-stone-200 mb-6">
                <button 
                  onClick={() => setActiveTab("accounting")}
                  className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === "accounting" ? "text-stone-800 border-stone-800" : "text-stone-400 border-transparent hover:text-stone-600"}`}
                >
                  Sổ Nhật Ký Chung
                </button>
                <button 
                  onClick={() => setActiveTab("dispute")}
                  className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 ${activeTab === "dispute" ? "text-red-700 border-red-700" : "text-stone-400 border-transparent hover:text-stone-600"}`}
                >
                  <AlertTriangle size={16} /> Báo cáo Tranh chấp
                </button>
              </div>

              {activeTab === "accounting" ? (
                <>
                  {(() => {
                    const modalPlatformFee = Math.floor(selectedInvoice.rentalFee * 0.12) || 42000;
                    const modalVatFee = Math.round(modalPlatformFee * 0.1);
                    const modalNetPlatformFee = modalPlatformFee - modalVatFee;
                    const modalPayoutToOwner = Math.max(0, selectedInvoice.rentalFee - modalPlatformFee - 25000);

                    return (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                            <BookOpen size={14} /> Trích lục Sổ Nhật Ký Kế Toán
                          </h3>
                          <button
                            onClick={() => setShowVatBreakdown(!showVatBreakdown)}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer bg-white text-stone-600 hover:text-emerald-800 hover:border-emerald-300"
                            title="Bấm để chuyển đổi giữa chế độ chi tiết thuế hoặc rút gọn"
                          >
                            <span className={`w-2 h-2 rounded-full ${showVatBreakdown ? "bg-emerald-500" : "bg-stone-400"}`}></span>
                            {showVatBreakdown ? "Chế độ: Bóc tách Thuế GTGT (TT 99)" : "Chế độ: Gộp Phí dịch vụ (Rút gọn)"}
                          </button>
                        </div>
                        <div className="border border-stone-200 rounded-xl overflow-hidden mb-6">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-stone-50 text-stone-500 font-medium text-xs">
                              <tr>
                                <th className="px-4 py-2 border-b border-stone-200">Diễn giải</th>
                                <th className="px-4 py-2 border-b border-stone-200 text-center">Nợ</th>
                                <th className="px-4 py-2 border-b border-stone-200 text-center">Có</th>
                                <th className="px-4 py-2 border-b border-stone-200 text-right">Số tiền</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                              <tr className="bg-white">
                                <td className="px-4 py-3 text-stone-800 font-medium">
                                  <span>Hoàn trả tiền cọc cho khách thuê</span>
                                  <p className="text-[11px] text-stone-400">Két cọc Escrow - Hoàn bảo toàn 100%</p>
                                </td>
                                <td className="px-4 py-3 text-center font-mono text-stone-600 font-bold">3386</td>
                                <td className="px-4 py-3 text-center font-mono text-stone-600 font-bold">112</td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-stone-700">{selectedInvoice.depositRefund.toLocaleString()}đ</td>
                              </tr>
                              <tr className="bg-white">
                                <td className="px-4 py-3 text-stone-800 font-medium">
                                  <span>Thanh toán tiền thuê cho chủ đồ</span>
                                  <p className="text-[11px] text-stone-400">Thu hộ - Chi hộ chủ tủ (đã cấn trừ 12% phí sàn & 25k ship về)</p>
                                </td>
                                <td className="px-4 py-3 text-center font-mono text-stone-600 font-bold">33882</td>
                                <td className="px-4 py-3 text-center font-mono text-stone-600 font-bold">112</td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-stone-700">{modalPayoutToOwner.toLocaleString()}đ</td>
                              </tr>

                              {showVatBreakdown ? (
                                <>
                                  <tr className="bg-amber-50/50">
                                    <td className="px-4 py-3 text-amber-900 font-medium">
                                      <span>Doanh thu phí dịch vụ sàn CLOOP (chưa VAT)</span>
                                      <p className="text-[11px] text-amber-600">Hoa hồng đại lý nền tảng kết nối (90.91%)</p>
                                    </td>
                                    <td className="px-4 py-3 text-center font-mono text-amber-800 font-bold">33882</td>
                                    <td className="px-4 py-3 text-center font-mono text-amber-800 font-bold">5113</td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-800">{modalNetPlatformFee.toLocaleString()}đ</td>
                                  </tr>
                                  <tr className="bg-amber-50/30">
                                    <td className="px-4 py-3 text-amber-900 font-medium">
                                      <span>Thuế GTGT đầu ra phải nộp (VAT 10%)</span>
                                      <p className="text-[11px] text-amber-600">Nghĩa vụ thuế sàn TMĐT theo Thông tư 99/2025/TT-BTC</p>
                                    </td>
                                    <td className="px-4 py-3 text-center font-mono text-amber-800 font-bold">33882</td>
                                    <td className="px-4 py-3 text-center font-mono text-amber-800 font-bold">33311</td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-800">{modalVatFee.toLocaleString()}đ</td>
                                  </tr>
                                </>
                              ) : (
                                <tr className="bg-amber-50/50">
                                  <td className="px-4 py-3 text-amber-900 font-medium">
                                    <span>Phí dịch vụ nền tảng CLOOP (Trọn gói 12%)</span>
                                    <p className="text-[11px] text-amber-600">Hoa hồng môi giới kết nối tủ đồ tuần hoàn</p>
                                  </td>
                                  <td className="px-4 py-3 text-center font-mono text-amber-800 font-bold">33882</td>
                                  <td className="px-4 py-3 text-center font-mono text-amber-800 font-bold">5113</td>
                                  <td className="px-4 py-3 text-right font-mono font-bold text-amber-800">{modalPlatformFee.toLocaleString()}đ</td>
                                </tr>
                              )}

                              <tr className="bg-blue-50/30">
                                <td className="px-4 py-3 text-blue-950 font-medium">
                                  <span>Chi trả cước giao hàng thực tế bưu tá GHN</span>
                                  <p className="text-[11px] text-blue-600">Thanh toán cước 2 chiều giao & nhận (21.000đ x 2)</p>
                                </td>
                                <td className="px-4 py-3 text-center font-mono text-blue-800 font-bold">33883</td>
                                <td className="px-4 py-3 text-center font-mono text-blue-800 font-bold">331</td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-blue-900">42.000đ</td>
                              </tr>
                              <tr className="bg-emerald-50/30">
                                <td className="px-4 py-3 text-emerald-950 font-medium">
                                  <span>Thặng dư thuật toán đệm Block 5K</span>
                                  <p className="text-[11px] text-emerald-600">Quỹ phòng vệ rủi ro phát lại (50.000đ - 42.000đ)</p>
                                </td>
                                <td className="px-4 py-3 text-center font-mono text-emerald-800 font-bold">33883</td>
                                <td className="px-4 py-3 text-center font-mono text-emerald-800 font-bold">3388_BUFFER</td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-emerald-900">8.000đ</td>
                              </tr>
                            </tbody>
                            <tfoot className="bg-stone-50 border-t border-stone-200">
                              <tr>
                                <td colSpan={3} className="px-4 py-3 text-right font-bold text-stone-600 uppercase text-xs">Tổng cộng (Cân đối kép):</td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">{selectedInvoice.totalDepositIn.toLocaleString()}đ</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600 space-y-1 mb-6">
                          <p className="font-bold text-stone-800">📌 Căn cứ Pháp lý & Chuẩn mực Kế toán Doanh nghiệp (Thông tư 99/2025/TT-BTC):</p>
                          <p>• <strong>TK 112:</strong> Tiền gửi không kỳ hạn (kết nối trực tiếp cổng thanh toán VietQR / PayOS).</p>
                          <p>• <strong>TK 3386 / 33881:</strong> Két Ký quỹ cọc Escrow (Tự chủ thiết kế tiểu khoản theo TT 99, bảo toàn 100% dòng tiền).</p>
                          <p>• <strong>TK 33882:</strong> Phải trả thu hộ tiền thuê cho Chủ đồ (CLOOP đóng vai trò đại lý sàn kết nối).</p>
                          <p>• <strong>TK 3388_BUFFER (hoặc TK 711):</strong> Thặng dư đệm an toàn Block 5K (+8.000đ) khớp chính xác công nợ bưu tá GHN (TK 331: 42.000đ).</p>
                          <p>• <strong>TK 33311:</strong> Thuế GTGT đầu ra (VAT 10%) bóc tách minh bạch từ hoa hồng sàn.</p>
                        </div>
                      </>
                    );
                  })()}
                </>
              ) : (
                <div className="bg-red-50/50 border border-red-100 p-5 rounded-xl mb-6">
                  <h3 className="text-sm font-bold text-red-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    Lập Biên Bản Khấu Trừ Cọc
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Mô tả hiện trạng hư hỏng / vi phạm</label>
                      <textarea 
                        value={disputeDesc}
                        onChange={(e) => setDisputeDesc(e.target.value)}
                        placeholder="Vd: Váy bị rách phần đuôi dài 5cm..." 
                        className="w-full border border-red-200 rounded-lg p-3 text-sm focus:outline-none focus:border-red-400 bg-white"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">Mức độ thiệt hại</label>
                        <select 
                          value={disputeSeverity}
                          onChange={(e: any) => setDisputeSeverity(e.target.value)}
                          className="w-full border border-red-200 rounded-lg p-3 text-sm bg-white"
                        >
                          <option value="LOW">Nhẹ (Xước, bẩn có thể giặt)</option>
                          <option value="MEDIUM">Vừa (Rách nhỏ, phai màu)</option>
                          <option value="HIGH">Nghiêm trọng (Hỏng hoàn toàn)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">Đề xuất trừ cọc (VNĐ)</label>
                        <input 
                          type="number"
                          value={disputeAmount}
                          onChange={(e) => setDisputeAmount(Number(e.target.value))}
                          className="w-full border border-red-200 rounded-lg p-3 text-sm bg-white font-mono"
                        />
                      </div>
                    </div>
                    
                    <button 
                      onClick={async () => {
                        setIsSubmittingDispute(true);
                        const res = await createDispute({
                          rentalId: selectedInvoice.rentalId,
                          invoiceId: selectedInvoice.id,
                          description: disputeDesc,
                          severity: disputeSeverity,
                          suggestedDeduction: disputeAmount
                        });
                        setIsSubmittingDispute(false);
                        if (res.success) {
                          alert("Đã tạo biên bản tranh chấp thành công. Trạng thái Invoice chuyển thành DISPUTED.");
                          setSelectedInvoice(null); // Đóng modal để refresh
                        } else {
                          alert("Lỗi: " + res.error);
                        }
                      }}
                      disabled={isSubmittingDispute}
                      className="w-full py-3 bg-red-700 text-white font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-red-800 transition-colors shadow-sm"
                    >
                      {isSubmittingDispute ? "ĐANG XỬ LÝ..." : "XÁC NHẬN TẠO BIÊN BẢN TRANH CHẤP"}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setSelectedInvoice(null)} 
                  className="px-5 py-2.5 rounded-lg text-sm font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors"
                >
                  ĐÓNG
                </button>
                {selectedInvoice.status !== "COMPLETED" && (
                  <button 
                    onClick={() => handleReconcile(selectedInvoice)}
                    disabled={isProcessing === selectedInvoice.id}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-[#1C3F30] hover:bg-[#2A5A46] transition-colors disabled:opacity-50"
                  >
                    {isProcessing === selectedInvoice.id ? "ĐANG XỬ LÝ..." : (
                      <>DUYỆT ĐỐI SOÁT <CheckCircle2 size={16} /></>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
