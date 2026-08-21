"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Video, 
  ArrowLeft, 
  Clock, 
  FileText, 
  User, 
  AlertTriangle,
  PlayCircle,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { resolveDispute, getDisputeEvidenceUrls } from "@/app/actions/dispute";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DisputeItem {
  id: string;
  rentalId: string;
  description: string;
  images: string[];
  severity: string;
  suggestedDeduction: number;
  finalDeduction: number | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  productTitle: string;
  productImage: string;
  renterName: string;
  ownerName: string;
  depositAmount: number;
  rentalFee: number;
}

export default function AdminDisputesClient({ initialDisputes }: { initialDisputes: DisputeItem[] }) {
  const router = useRouter();
  const [disputes, setDisputes] = useState<DisputeItem[]>(initialDisputes);
  const [selectedDispute, setSelectedDispute] = useState<DisputeItem | null>(null);
  const [filterTab, setFilterTab] = useState<"ALL" | "PENDING" | "RESOLVED">("PENDING");
  
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);
  
  const [finalDeduction, setFinalDeduction] = useState<number>(0);
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredDisputes = disputes.filter((d) => {
    if (filterTab === "PENDING") return d.status === "PENDING_REVIEW" || d.status === "DISPUTED";
    if (filterTab === "RESOLVED") return d.status === "APPROVED_DEDUCTION" || d.status === "RESOLVED" || d.status === "REJECTED";
    return true;
  });

  const handleSelectDispute = async (d: DisputeItem) => {
    setSelectedDispute(d);
    setFinalDeduction(d.suggestedDeduction || 0);
    setAdminNotes(d.adminNotes || "");
    setEvidenceUrls([]);

    if (d.images && d.images.length > 0) {
      setIsLoadingEvidence(true);
      try {
        const urls = await getDisputeEvidenceUrls(d.images);
        setEvidenceUrls(urls);
      } catch (err: any) {
        toast.error("Không thể lấy link video bằng chứng", { description: err.message });
      } finally {
        setIsLoadingEvidence(false);
      }
    }
  };

  const handleResolve = async (disputeId: string) => {
    if (finalDeduction < 0) {
      toast.error("Số tiền khấu trừ không thể âm");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resolveDispute({
        disputeId,
        finalDeduction: Number(finalDeduction),
        adminNotes: adminNotes || "Admin đã phân xử hồ sơ khiếu nại dựa trên video bằng chứng.",
      });

      if (res.success) {
        toast.success("Phân xử khiếu nại thành công!", {
          description: `Đã khấu trừ ${Number(finalDeduction).toLocaleString("vi-VN")}đ tiền cọc và cập nhật sổ cái.`,
        });
        setSelectedDispute(null);
        router.refresh();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dispute-updated"));
        }
      } else {
        toast.error("Lỗi phân xử", { description: res.error });
      }
    } catch (err: any) {
      toast.error("Lỗi hệ thống", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 p-6 md:p-10 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">
            <ShieldAlert size={16} /> Trung tâm Trọng tài BQT
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-stone-900 tracking-tight">
            Quản Lý Khiếu Nại & Đối Soát Bằng Chứng (GCS)
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Xem video riêng tư (Signed URL 15 phút) và ra quyết định hoàn/trừ cọc công minh
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-100 transition-colors w-fit"
        >
          <ArrowLeft size={14} /> Quay lại Admin Portal
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 my-6">
        <button
          onClick={() => setFilterTab("PENDING")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filterTab === "PENDING"
              ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          Chờ xử lý ({disputes.filter((d) => d.status === "PENDING_REVIEW" || d.status === "DISPUTED").length})
        </button>
        <button
          onClick={() => setFilterTab("RESOLVED")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filterTab === "RESOLVED"
              ? "bg-emerald-700 text-white shadow-md shadow-emerald-700/20"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          Đã phân xử
        </button>
        <button
          onClick={() => setFilterTab("ALL")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filterTab === "ALL"
              ? "bg-stone-900 text-white shadow-md"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          Tất cả ({disputes.length})
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: List of disputes */}
        <div className="lg:col-span-1 space-y-3 max-h-[75vh] overflow-y-auto pr-1">
          {filteredDisputes.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-400 text-xs">
              Không có khiếu nại nào trong danh mục này.
            </div>
          ) : (
            filteredDisputes.map((d) => (
              <div
                key={d.id}
                onClick={() => handleSelectDispute(d)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedDispute?.id === d.id
                    ? "bg-emerald-50/70 border-emerald-600 shadow-md ring-1 ring-emerald-600"
                    : "bg-white border-stone-200 hover:border-stone-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-mono">
                    Đơn: {d.rentalId.slice(0, 8)}...
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      d.status === "PENDING_REVIEW" || d.status === "DISPUTED"
                        ? "bg-rose-100 text-rose-700 animate-pulse"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {d.status === "PENDING_REVIEW" ? "Chờ duyệt" : d.status === "DISPUTED" ? "Tranh chấp" : "Đã xong"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-14 rounded-lg overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                    <Image
                      src={d.productImage || "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=120"}
                      alt={d.productTitle}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-stone-900 truncate">{d.productTitle}</h4>
                    <p className="text-[11px] text-stone-500 truncate mt-0.5">
                      {d.renterName} ↔ {d.ownerName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-semibold text-rose-600">
                        Đề xuất trừ: {d.suggestedDeduction.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-stone-400 shrink-0" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right column: Dispute Details & Evidence Player */}
        <div className="lg:col-span-2">
          {selectedDispute ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-sm space-y-6">
              {/* Top Banner */}
              <div className="flex items-start justify-between pb-5 border-b border-stone-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                    Mức độ tổn thất: {selectedDispute.severity}
                  </span>
                  <h3 className="text-lg font-bold text-stone-900 mt-2">
                    {selectedDispute.productTitle}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Bên thuê: <strong className="text-stone-800">{selectedDispute.renterName}</strong> | Bên cho thuê: <strong className="text-stone-800">{selectedDispute.ownerName}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-400 block">Tổng tiền cọc đơn</span>
                  <span className="text-sm font-extrabold text-stone-900">
                    {selectedDispute.depositAmount.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 flex items-center gap-1.5">
                  <FileText size={14} /> Nội dung phản ánh từ đương sự:
                </h4>
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-800 leading-relaxed italic">
                  &quot;{selectedDispute.description}&quot;
                </div>
              </div>

              {/* Evidence Player Section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-2 flex items-center gap-1.5">
                  <Video size={14} className="text-emerald-700" /> Bằng chứng Google Cloud Storage (Private Signed URL):
                </h4>

                {isLoadingEvidence ? (
                  <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-500 animate-pulse">
                    Đang sinh link bảo mật 15 phút từ máy chủ Google Cloud...
                  </div>
                ) : evidenceUrls.length === 0 ? (
                  <div className="p-6 text-center bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-400">
                    Không có tệp video/ảnh đính kèm.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {evidenceUrls.map((url, idx) => {
                      const isVideo = url.includes(".mp4") || url.includes(".mov") || url.includes(".webm") || url.includes("video");
                      return (
                        <div key={idx} className="rounded-2xl overflow-hidden border border-stone-200 bg-stone-900 relative">
                          {isVideo ? (
                            <video
                              src={url}
                              controls
                              className="w-full aspect-video object-contain"
                            />
                          ) : (
                            <div className="relative aspect-video w-full">
                              <Image src={url} alt="Bằng chứng" fill className="object-contain" />
                            </div>
                          )}
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="absolute top-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-[10px] font-bold flex items-center gap-1 hover:bg-black"
                          >
                            Mở tab mới <ExternalLink size={10} />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Resolution Form */}
              <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  Quyết Định Phân Xử Của Quản Trị Viên (Admin Verdict)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Số tiền cọc khấu trừ (VNĐ):
                    </label>
                    <input
                      type="number"
                      value={finalDeduction}
                      onChange={(e) => setFinalDeduction(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs font-bold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-500"
                      max={selectedDispute.depositAmount}
                      min={0}
                    />
                    <p className="text-[10px] text-stone-500 mt-1">
                      Tối đa: {selectedDispute.depositAmount.toLocaleString("vi-VN")}đ
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Ghi chú phân xử (gửi cho cả 2 bên):
                    </label>
                    <input
                      type="text"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Lý do khấu trừ hoặc bác bỏ..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs text-stone-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleResolve(selectedDispute.id)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition-all flex items-center gap-2"
                  >
                    <CheckCircle size={15} /> Xác Nhận Quyết Định & Quyết Toán
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center bg-white rounded-3xl border border-stone-200 text-stone-400">
              <ShieldAlert size={36} className="mx-auto mb-2 text-stone-300" />
              <p className="text-xs font-semibold">Chọn một hồ sơ khiếu nại bên trái để đối soát bằng chứng</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
