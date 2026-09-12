"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  Camera, 
  Truck, 
  PackageCheck, 
  RotateCcw, 
  CheckCircle2, 
  ChevronDown,
  ChevronUp,
  Clock,
  FileText
} from "lucide-react";
import type { DamageCategory } from "@/app/actions/dispute";

export interface EvidenceEvent {
  id: string;
  stage: number;
  title: string;
  actor: string;
  timestamp: string;
  status: "COMPLETED" | "ACTIVE" | "PENDING";
  description: string;
  mediaUrls?: string[];
  notes?: string;
  damageCategory?: DamageCategory;
  deductionAmount?: number;
}

export interface RentalTimelineDetails {
  createdAt?: string | Date | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  actualReturnDate?: string | Date | null;
  status?: string | null;
  renterName?: string | null;
  ownerName?: string | null;
  deliveryTrackingCode?: string | null;
  returnTrackingCode?: string | null;
  deliveryStatus?: string | null;
  returnStatus?: string | null;
}

export interface DisputeTimelineDetails {
  damageCategory?: DamageCategory;
  suggestedDeduction?: number;
  finalDeduction?: number | null;
  description?: string;
  evidenceUrls?: string[];
  adminNotes?: string | null;
  createdAt?: string | Date | null;
}

interface DigitalEvidenceTimelineProps {
  rentalId: string;
  productTitle: string;
  events?: EvidenceEvent[];
  rentalDetails?: RentalTimelineDetails;
  initialDispute?: DisputeTimelineDetails;
}

function formatTimelineDate(dateInput?: string | Date | null): string {
  if (!dateInput) return "Đang cập nhật";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "Đang cập nhật";
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "Đang cập nhật";
  }
}

export function DigitalEvidenceTimeline({
  rentalId,
  productTitle,
  events,
  rentalDetails,
  initialDispute,
}: DigitalEvidenceTimelineProps) {
  const [expandedStage, setExpandedStage] = useState<number | null>(6);

  // Xây dựng 6 chặng dòng thời gian động từ dữ liệu thực tế trong CSDL
  const dynamicEvents: EvidenceEvent[] = events || [
    {
      id: "ev-stage-1",
      stage: 1,
      title: "Chủ tủ ghi nhận hiện trạng & Niêm phong",
      actor: rentalDetails?.ownerName ? `Chủ tủ (${rentalDetails.ownerName})` : "Chủ tủ (Lender)",
      timestamp: formatTimelineDate(rentalDetails?.createdAt),
      status: rentalDetails?.createdAt ? "COMPLETED" : "PENDING",
      description: "Chủ tủ hoàn tất kiểm tra hiện trạng sản phẩm, đối chiếu mô tả và niêm phong kiện hàng sẵn sàng bàn giao vận chuyển.",
      notes: "Niêm phong ban đầu được xác lập tại thời điểm tạo đơn.",
    },
    {
      id: "ev-stage-2",
      stage: 2,
      title: "Đơn vị vận chuyển tiếp nhận kiện hàng chiều đi",
      actor: "Đối tác giao vận (GHN / GHTK)",
      timestamp: rentalDetails?.deliveryTrackingCode ? "Đã xuất vận đơn" : "Đang xử lý vận đơn",
      status: rentalDetails?.deliveryTrackingCode ? "COMPLETED" : "PENDING",
      description: rentalDetails?.deliveryTrackingCode
        ? `Kiện hàng đã được tiếp nhận và gán mã vận đơn giao hàng.`
        : "Đơn vị vận chuyển đang chờ xác nhận lấy kiện hàng từ địa chỉ chủ tủ.",
      notes: rentalDetails?.deliveryTrackingCode ? `Mã vận đơn chiều đi: ${rentalDetails.deliveryTrackingCode}` : undefined,
    },
    {
      id: "ev-stage-3",
      stage: 3,
      title: "Khách hàng nhận đồ & Video Unboxing",
      actor: rentalDetails?.renterName ? `Khách thuê (${rentalDetails.renterName})` : "Khách thuê (Renter)",
      timestamp: formatTimelineDate(rentalDetails?.startDate),
      status: rentalDetails?.status && ["BORROWER_RECEIVED", "RETURNED", "DISPUTED", "LENDER_COMPLETED"].includes(rentalDetails.status) 
        ? "COMPLETED" 
        : "PENDING",
      description: "Khách hàng tiếp nhận kiện hàng, quay video mở hộp unboxing và kiểm tra tem niêm phong trong vòng 3 giờ.",
      notes: "Thời điểm kích hoạt thời hạn thuê chính thức theo hợp đồng.",
    },
    {
      id: "ev-stage-4",
      stage: 4,
      title: "Thời gian trải nghiệm sự kiện (Occasion Window)",
      actor: rentalDetails?.renterName ? `Khách thuê (${rentalDetails.renterName})` : "Khách thuê (Renter)",
      timestamp: rentalDetails?.startDate && rentalDetails?.endDate 
        ? `${formatTimelineDate(rentalDetails.startDate)} → ${formatTimelineDate(rentalDetails.endDate)}` 
        : "Đang diễn ra",
      status: rentalDetails?.actualReturnDate || (rentalDetails?.status && ["RETURNED", "DISPUTED", "LENDER_COMPLETED"].includes(rentalDetails.status))
        ? "COMPLETED"
        : "ACTIVE",
      description: "Thời gian trải nghiệm trang phục của khách thuê theo gói hợp đồng được bảo vệ bởi Quỹ Rủi Ro & Cơ Chế Cọc Động.",
    },
    {
      id: "ev-stage-5",
      stage: 5,
      title: "Khách hàng đóng gói & Bàn giao gửi trả",
      actor: rentalDetails?.renterName ? `Khách thuê (${rentalDetails.renterName})` : "Khách thuê (Renter)",
      timestamp: formatTimelineDate(rentalDetails?.actualReturnDate || rentalDetails?.endDate),
      status: rentalDetails?.actualReturnDate || (rentalDetails?.status && ["RETURNED", "DISPUTED", "LENDER_COMPLETED"].includes(rentalDetails.status))
        ? "COMPLETED"
        : "PENDING",
      description: "Khách hàng hoàn tất đóng gói trang phục nguyên bản, bàn giao cho shipper vận chuyển chiều thu hồi về chủ tủ.",
      notes: rentalDetails?.returnTrackingCode ? `Mã vận đơn thu hồi: ${rentalDetails.returnTrackingCode}` : undefined,
    },
    {
      id: "ev-stage-6",
      stage: 6,
      title: "Chủ tủ nghiệm thu & Áp dụng Digital Damage Protocol",
      actor: "Hệ thống Trọng tài CLOOP & Chủ tủ",
      timestamp: formatTimelineDate(initialDispute?.createdAt),
      status: initialDispute?.finalDeduction !== null && initialDispute?.finalDeduction !== undefined ? "COMPLETED" : "ACTIVE",
      description: initialDispute?.description || "Kiểm tra đối chiếu Before / After khi nhận lại đồ. Phân định rạch ròi giữa Hao mòn thông thường và Hư hại tài sản.",
      damageCategory: initialDispute?.damageCategory || "WEAR_AND_TEAR",
      deductionAmount: initialDispute?.finalDeduction ?? initialDispute?.suggestedDeduction ?? 0,
      mediaUrls: initialDispute?.evidenceUrls && initialDispute.evidenceUrls.length > 0 ? initialDispute.evidenceUrls : undefined,
      notes: initialDispute?.adminNotes ? `Ghi chú trọng tài: ${initialDispute.adminNotes}` : "Đang chờ phán quyết trọng tài BQT",
    },
  ];

  const timeline = dynamicEvents;

  return (
    <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs p-6 sm:p-8 space-y-6 font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 font-ui">
              CHỨNG CỨ SỐ MINH BẠCH
            </span>
            <span className="text-[10px] text-stone-400 font-mono">ID: {rentalId.substring(0, 8)}</span>
          </div>
          <h3 className="font-heading font-extrabold text-lg sm:text-xl text-[#0A2517]">
            Dòng Thời Gian Chứng Cứ Số (Digital Evidence Timeline)
          </h3>
          <p className="text-xs text-stone-500 font-light mt-0.5">
            Lưu vết chuỗi hành trình của món đồ {productTitle} với mốc thời gian (Timestamp) thực tế từ cơ sở dữ liệu.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 bg-stone-50 px-3.5 py-1.5 rounded-xl border border-stone-200 text-xs font-mono text-stone-700">
          <Clock size={14} className="text-emerald-700" />
          <span>6/6 Chặng Hành Trình</span>
        </div>
      </div>

      {/* Timeline Steps */}
      <div className="relative border-l-2 border-emerald-100 ml-4 sm:ml-6 space-y-6 py-2">
        {timeline.map((ev) => {
          const isExpanded = expandedStage === ev.stage;
          const isFinalStage = ev.stage === 6;

          return (
            <div key={ev.id} className="relative pl-6 sm:pl-8 group">
              {/* Dot Icon */}
              <div 
                className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                  ev.status === "COMPLETED" 
                    ? "bg-emerald-600 border-white text-white" 
                    : ev.status === "ACTIVE" 
                    ? "bg-amber-500 border-white text-white animate-pulse" 
                    : "bg-stone-100 border-stone-300 text-stone-400"
                }`}
              >
                {ev.stage === 1 ? <Camera size={14} /> :
                 ev.stage === 2 ? <Truck size={14} /> :
                 ev.stage === 3 ? <PackageCheck size={14} /> :
                 ev.stage === 4 ? <Clock size={14} /> :
                 ev.stage === 5 ? <RotateCcw size={14} /> :
                 <ShieldCheck size={14} />}
              </div>

              {/* Card */}
              <div className={`rounded-2xl border transition-all p-4 sm:p-5 ${
                isFinalStage 
                  ? "bg-amber-50/50 border-amber-200/90 shadow-xs" 
                  : "bg-white border-stone-200/70 hover:border-stone-300"
              }`}>
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedStage(isExpanded ? null : ev.stage)}
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-stone-400 font-mono">CHẶNG {ev.stage}</span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-ui">
                        {ev.actor}
                      </span>
                      <span className="text-[10.5px] text-stone-400 font-mono">{ev.timestamp}</span>
                    </div>
                    <h4 className="font-heading font-bold text-sm sm:text-base text-[#0A2517]">
                      {ev.title}
                    </h4>
                  </div>

                  <button className="text-stone-400 hover:text-stone-600 p-1" aria-label="Toggle stage details">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-stone-100 space-y-3 text-xs text-stone-600">
                    <p className="leading-relaxed font-light">{ev.description}</p>

                    {/* Media Attachments - Real evidence only */}
                    {ev.mediaUrls && ev.mediaUrls.length > 0 ? (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-medium text-stone-700 flex items-center gap-1">
                          <FileText size={12} className="text-emerald-700" /> Tệp chứng cứ số đính kèm:
                        </span>
                        <div className="flex flex-wrap gap-3">
                          {ev.mediaUrls.map((url, i) => (
                            <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-stone-200 bg-stone-100 shrink-0">
                              <img src={url} alt={`Evidence file ${i + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : isFinalStage ? (
                      <div className="text-[11px] text-stone-400 italic">
                        Chưa có ảnh/video tải lên trực tiếp cho chặng này (hoặc chưa kích hoạt signed URL).
                      </div>
                    ) : null}

                    {/* Stage 6 Digital Damage Protocol Breakdown */}
                    {isFinalStage && (
                      <div className="p-3.5 bg-white rounded-xl border border-amber-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-950 flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-emerald-700" />
                            Phân định theo Digital Damage Protocol:
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                            ev.damageCategory === "WEAR_AND_TEAR" 
                              ? "bg-emerald-100 text-emerald-800" 
                              : ev.damageCategory === "REPAIRABLE_DAMAGE" 
                              ? "bg-amber-100 text-amber-800" 
                              : "bg-rose-100 text-rose-800"
                          }`}>
                            {ev.damageCategory || "WEAR_AND_TEAR"}
                          </span>
                        </div>

                        <div className="text-[11px] text-stone-600 space-y-1 font-light leading-relaxed">
                          {ev.damageCategory === "WEAR_AND_TEAR" ? (
                            <p className="text-emerald-900 font-medium">
                              ✅ Vết son bề mặt / phấn trang điểm / nếp nhăn nhẹ được phân loại là <strong>Hao mòn thông thường</strong>. Đơn hàng hoàn cọc 100% cho khách (0đ khấu trừ).
                            </p>
                          ) : ev.damageCategory === "REPAIRABLE_DAMAGE" ? (
                            <p className="text-amber-900 font-medium">
                              ⚠️ Hư hỏng nhẹ có thể khắc phục (bung cúc, xước đường may nhỏ). Khấu trừ tối đa theo chi phí giặt hấp/sửa chữa thực tế: <strong>{(ev.deductionAmount || 0).toLocaleString('vi-VN')}đ</strong>.
                            </p>
                          ) : (
                            <p className="text-rose-900 font-medium">
                              ❌ Tổn thất nghiêm trọng / rách rưới không thể phục hồi. Bồi thường khấu trừ theo định giá tài sản được ghi nhận.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {ev.notes && (
                      <div className="text-[11px] text-stone-500 italic bg-stone-50 p-2.5 rounded-lg border border-stone-200/60">
                        {ev.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Audit Statement */}
      <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 text-[11px] text-stone-500 flex items-center justify-between flex-wrap gap-2">
        <span className="flex items-center gap-1.5 font-medium text-stone-700">
          <CheckCircle2 size={14} className="text-emerald-700" />
          Chứng cứ số được lưu vết bảo mật và đối soát theo quy trình trọng tài CLOOP.
        </span>
        <span className="font-mono text-[10px] text-stone-400">Luật 91/2025/QH15 & NĐ 356/2025</span>
      </div>
    </div>
  );
}

