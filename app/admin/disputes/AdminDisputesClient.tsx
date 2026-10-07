"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ShieldAlert, 
  CheckCircle, 
  Video, 
  ArrowLeft, 
  FileText, 
  ExternalLink,
  ChevronRight,
  AlertTriangle
} from "lucide-react";
import { resolveDispute, getDisputeEvidenceUrls } from "@/app/actions/dispute";
import { DigitalEvidenceTimeline } from "@/components/dispute/DigitalEvidenceTimeline";
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
  rentalCreatedAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  actualReturnDate?: string | null;
  rentalStatus?: string | null;
  deliveryTrackingCode?: string | null;
  returnTrackingCode?: string | null;
  deliveryStatus?: string | null;
  returnStatus?: string | null;
}

export default function AdminDisputesClient({ initialDisputes }: { initialDisputes: DisputeItem[] }) {
  const router = useRouter();
  const [disputes] = useState<DisputeItem[]>(initialDisputes);
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
        const urls = await getDisputeEvidenceUrls({
          disputeId: d.id,
          evidenceKeys: d.images,
        });
        setEvidenceUrls(urls);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Không thể lấy link video";
        toast.error("Không thể lấy link video bằng chứng", { description: message });
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Lỗi hệ thống";
      toast.error("Lỗi hệ thống", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full font-sans pb-16">
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

              {/* Digital Evidence Timeline (6 Chặng Vòng Đời & Phân Định Hư Hại) */}
              <DigitalEvidenceTimeline 
                rentalId={selectedDispute.rentalId} 
                productTitle={selectedDispute.productTitle}
                rentalDetails={{
                  createdAt: selectedDispute.rentalCreatedAt,
                  startDate: selectedDispute.startDate,
                  endDate: selectedDispute.endDate,
                  actualReturnDate: selectedDispute.actualReturnDate,
                  status: selectedDispute.rentalStatus,
                  renterName: selectedDispute.renterName,
                  ownerName: selectedDispute.ownerName,
                  deliveryTrackingCode: selectedDispute.deliveryTrackingCode,
                  returnTrackingCode: selectedDispute.returnTrackingCode,
                  deliveryStatus: selectedDispute.deliveryStatus,
                  returnStatus: selectedDispute.returnStatus,
                }}
                initialDispute={{
                  damageCategory: (selectedDispute.severity === "LOW" ? "WEAR_AND_TEAR" : selectedDispute.severity === "MEDIUM" ? "REPAIRABLE_DAMAGE" : "TOTAL_LOSS"),
                  suggestedDeduction: selectedDispute.suggestedDeduction,
                  finalDeduction: selectedDispute.finalDeduction,
                  description: selectedDispute.description,
                  evidenceUrls: evidenceUrls,
                  adminNotes: selectedDispute.adminNotes,
                  createdAt: selectedDispute.createdAt,
                }}
              />

              {/* ⚖️ Burden of Proof Audit Card */}
              {(() => {
                let parsedAdminNotes: any = {};
                try {
                  if (selectedDispute.adminNotes) parsedAdminNotes = JSON.parse(selectedDispute.adminNotes);
                } catch {}

                const hasOwnerVideo = (selectedDispute.images || []).some(url => {
                  const lower = (url || "").toLowerCase();
                  return lower.includes("#video") || lower.includes("type=video") || lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm") || lower.includes("video") || lower.includes("drive.google.com/file");
                });

                const renterVideos = (parsedAdminNotes.renterCounterVideos || []) as string[];
                const hasRenterVideo = renterVideos.some(url => {
                  const lower = (url || "").toLowerCase();
                  return lower.includes("#video") || lower.includes("type=video") || lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm") || lower.includes("video") || lower.includes("drive.google.com/file");
                });

                return (
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                        <ShieldAlert size={14} className="text-amber-800" />
                        Đối Soát Nghĩa Vụ Chứng Minh (Burden of Proof Audit)
                      </h4>
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300/60">
                        Chuẩn P2P
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className={`p-3 rounded-xl border ${hasOwnerVideo ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900' : 'bg-rose-50/80 border-rose-300 text-rose-900'}`}>
                        <div className="font-bold flex items-center gap-1.5">
                          {hasOwnerVideo ? <CheckCircle size={14} className="text-emerald-700" /> : <AlertTriangle size={14} className="text-rose-700" />}
                          Chủ tủ: {hasOwnerVideo ? "Có video mở hộp đối soát" : "KHÔNG CÓ video mở hộp"}
                        </div>
                        <p className="text-[11px] mt-1 opacity-80 leading-snug">
                          {hasOwnerVideo 
                            ? "Đủ điều kiện pháp lý để đề xuất khấu trừ theo hóa đơn dịch vụ." 
                            : "Chủ tủ không có video mở hộp = Tự chịu 100% trách nhiệm (Đề xuất: Bác bỏ khiếu nại, hoàn 100% cọc)."}
                        </p>
                      </div>

                      <div className={`p-3 rounded-xl border ${hasRenterVideo ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900' : 'bg-stone-100 border-stone-300 text-stone-700'}`}>
                        <div className="font-bold flex items-center gap-1.5">
                          {hasRenterVideo ? <CheckCircle size={14} className="text-emerald-700" /> : <AlertTriangle size={14} className="text-stone-500" />}
                          Khách thuê: {hasRenterVideo ? "Có video bảo chứng đối ứng" : "Không có video bảo chứng"}
                        </div>
                        <p className="text-[11px] mt-1 opacity-80 leading-snug">
                          {hasRenterVideo 
                            ? "Khách đã tải video nhận/gửi đối chứng. Admin cần so sánh chéo 2 video." 
                            : "Khách không có video bảo chứng = Mặc định chấp nhận bồi thường theo hóa đơn chủ tủ."}
                        </p>
                      </div>
                    </div>

                    {/* Gợi ý phán quyết nhanh cho Admin */}
                    <div className="p-3 rounded-xl bg-white border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-stone-700">
                        <span className="font-semibold text-stone-900">Gợi ý phán quyết: </span>
                        {!hasOwnerVideo ? (
                          <span className="text-rose-700 font-bold">Bác bỏ khiếu nại - Khấu trừ 0đ (Hoàn 100% cọc cho khách)</span>
                        ) : !hasRenterVideo ? (
                          <span className="text-emerald-800 font-bold">Chấp nhận khiếu nại - Khấu trừ {selectedDispute.suggestedDeduction.toLocaleString("vi-VN")}đ theo hóa đơn</span>
                        ) : (
                          <span className="text-amber-800 font-bold">Cần Admin đối chiếu chéo video bàn giao và video trả đồ</span>
                        )}
                      </div>
                      {!hasOwnerVideo ? (
                        <button
                          type="button"
                          onClick={() => {
                            setFinalDeduction(0);
                            setAdminNotes("Bác bỏ khiếu nại do Chủ tủ không cung cấp video mở hộp đối soát theo Quy định Nghĩa vụ Chứng minh.");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-rose-100 text-rose-800 font-bold text-[11px] hover:bg-rose-200 transition-colors cursor-pointer shrink-0"
                        >
                          Áp dụng Khấu trừ 0đ
                        </button>
                      ) : !hasRenterVideo ? (
                        <button
                          type="button"
                          onClick={() => {
                            setFinalDeduction(selectedDispute.suggestedDeduction || 0);
                            setAdminNotes("Chấp nhận bồi thường theo hóa đơn do Khách thuê không cung cấp được video bảo chứng theo Quy chế.");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px] hover:bg-emerald-200 transition-colors cursor-pointer shrink-0"
                        >
                          Áp dụng Theo Hóa đơn
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })()}

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
