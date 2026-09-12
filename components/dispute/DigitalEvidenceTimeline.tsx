"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  Camera, 
  Truck, 
  PackageCheck, 
  Sparkles, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock
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

interface DigitalEvidenceTimelineProps {
  rentalId: string;
  productTitle: string;
  events?: EvidenceEvent[];
  initialDispute?: {
    damageCategory: DamageCategory;
    suggestedDeduction: number;
    description: string;
  };
}

export function DigitalEvidenceTimeline({
  rentalId,
  productTitle,
  events,
  initialDispute,
}: DigitalEvidenceTimelineProps) {
  const [expandedStage, setExpandedStage] = useState<number | null>(6);

  // Mẫu sự kiện 6 chặng chuẩn Digital Evidence Timeline
  const defaultEvents: EvidenceEvent[] = [
    {
      id: "ev-1",
      stage: 1,
      title: "Chủ tủ ghi nhận hiện trạng & Niêm phong",
      actor: "Chủ tủ (Lender)",
      timestamp: "10:30 • 12/10/2026",
      status: "COMPLETED",
      description: "Quay video 360 độ hiện trạng váy dạ hội, kiểm tra khóa kéo, đường may và dán tem niêm phong CLOOP xanh.",
      mediaUrls: ["https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop&q=60"],
      notes: "Tình trạng ban đầu: Mới 98%, không vết ố, cúc áo đầy đủ.",
    },
    {
      id: "ev-2",
      stage: 2,
      title: "Đơn vị vận chuyển (GHN) tiếp nhận kiện hàng",
      actor: "Shipper GHN",
      timestamp: "11:45 • 12/10/2026",
      status: "COMPLETED",
      description: "Tài xế quét mã QR vận đơn GHN, xác nhận hộp nguyên vẹn và niêm phong không rách.",
      notes: "Mã vận đơn: GHN-CLOOP-889921",
    },
    {
      id: "ev-3",
      stage: 3,
      title: "Khách hàng nhận đồ & Video Unboxing",
      actor: "Khách thuê (Renter)",
      timestamp: "14:20 • 13/10/2026",
      status: "COMPLETED",
      description: "Khách quay video mở hộp unboxing, đối chiếu hiện trạng ban đầu trong vòng 3 giờ kể từ khi nhận hàng.",
      mediaUrls: ["https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&auto=format&fit=crop&q=60"],
      notes: "Xác nhận đúng mẫu, đúng size, tem niêm phong còn nguyên.",
    },
    {
      id: "ev-4",
      stage: 4,
      title: "Thời gian trải nghiệm sự kiện (Occasion Window)",
      actor: "Khách thuê (Renter)",
      timestamp: "18:00 • 14/10/2026",
      status: "COMPLETED",
      description: "Trang phục được mặc tham dự dạ hội tốt nghiệp. Áp dụng quy tắc bảo quản vải cao cấp.",
      notes: "Thời gian thuê: Gói Cuối Tuần (3 ngày)",
    },
    {
      id: "ev-5",
      stage: 5,
      title: "Khách hàng đóng gói & Bàn giao gửi trả",
      actor: "Khách thuê (Renter)",
      timestamp: "09:15 • 16/10/2026",
      status: "COMPLETED",
      description: "Gấp gọn trang phục vào hộp nguyên bản, bàn giao shipper GHN chiều về (Cước trả đồ 0đ).",
      notes: "Shipper đã lấy hàng thành công.",
    },
    {
      id: "ev-6",
      stage: 6,
      title: "Chủ tủ nghiệm thu & Áp dụng Digital Damage Protocol",
      actor: "Hệ thống / Chủ tủ",
      timestamp: "15:40 • 17/10/2026",
      status: "ACTIVE",
      description: "Kiểm tra đối chiếu Before / After. Phân định rạch ròi giữa Hao mòn thông thường và Hư hại tài sản.",
      damageCategory: initialDispute?.damageCategory || "WEAR_AND_TEAR",
      deductionAmount: initialDispute?.suggestedDeduction || 0,
      notes: "Phát hiện vết son môi nhẹ ở cổ áo. Thuộc danh mục WEAR_AND_TEAR (0đ khấu trừ cọc).",
    },
  ];

  const timeline = events || defaultEvents;

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
            Lưu vết chuỗi hành trình của món đồ {productTitle} với mốc thời gian (Timestamp) không thể làm giả.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 bg-stone-50 px-3.5 py-1.5 rounded-xl border border-stone-200 text-xs font-mono text-stone-700">
          <Clock size={14} className="text-emerald-700" />
          <span>6/6 Chặng Đã Lưu Vết</span>
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
                 ev.stage === 4 ? <Sparkles size={14} /> :
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
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.2 rounded font-ui">
                        {ev.actor}
                      </span>
                      <span className="text-[10.5px] text-stone-400 font-mono">{ev.timestamp}</span>
                    </div>
                    <h4 className="font-heading font-bold text-sm sm:text-base text-[#0A2517]">
                      {ev.title}
                    </h4>
                  </div>

                  <button className="text-stone-400 hover:text-stone-600 p-1">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-stone-100 space-y-3 text-xs text-stone-600">
                    <p className="leading-relaxed font-light">{ev.description}</p>

                    {/* Media Attachments */}
                    {ev.mediaUrls && ev.mediaUrls.length > 0 && (
                      <div className="flex gap-3 pt-1">
                        {ev.mediaUrls.map((url, i) => (
                          <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-stone-200 bg-stone-100 shrink-0">
                            <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}

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
                              ✅ Vết son bề mặt / phấn trang điểm / nếp nhăn được phân loại là <strong>Hao mòn thông thường</strong>. Đơn hàng hoàn cọc 100% cho khách (0đ khấu trừ).
                            </p>
                          ) : ev.damageCategory === "REPAIRABLE_DAMAGE" ? (
                            <p className="text-amber-900 font-medium">
                              ⚠️ Hư hỏng nhẹ (bung cúc, xước chỉ). Khấu trừ tối đa theo hóa đơn tiệm giặt/sửa thực tế: <strong>{(ev.deductionAmount || 0).toLocaleString('vi-VN')}đ</strong>.
                            </p>
                          ) : (
                            <p className="text-rose-900 font-medium">
                              ❌ Tổn thất nghiêm trọng. Bồi thường theo giá trị khấu hao thực tế của trang phục.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {ev.notes && (
                      <div className="text-[11px] text-stone-500 italic bg-stone-50 p-2.5 rounded-lg border border-stone-200/60">
                        Ghi chú: {ev.notes}
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
          Chứng cứ số được niêm phong mật mã và đối soát tự động bởi CLOOP Orchestration Layer.
        </span>
        <span className="font-mono text-[10px] text-stone-400">ISO/IEC 27001 & Law 91/2025</span>
      </div>
    </div>
  );
}
