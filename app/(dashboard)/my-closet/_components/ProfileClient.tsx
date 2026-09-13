"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  CheckCircle2, 
  User, 
  Camera, 
  ExternalLink, 
  Save, 
  Loader2, 
  MapPin, 
  Quote, 
  FileText,
  Heart,
  Award,
  Lock,
  Copy,
  Check,
  Fingerprint,
  Phone,
  Smartphone,
  ShieldAlert,
  AlertCircle,
  X,
  RefreshCw,
  Sparkles,
  QrCode,
  Coins,
  ArrowRight,
  Download
} from "lucide-react";
import { TRUST_TIERS, type TrustScoreBreakdown } from "@/lib/trust-types";
import { updateUserProfileWithValidation } from "@/app/actions/user";
import { 
  VIETNAM_34_PROVINCES, 
  normalizeProvince, 
  formatClooperCode, 
  formatCleanUsername 
} from "@/lib/constants/provinces";
import { 
  isValidVietnamPhone, 
  normalizeVietnamPhone, 
  maskPhoneNumber, 
  getVietnamCarrier 
} from "@/lib/validations/phone";
import { 
  createMicroKycPaymentAction, 
  checkMicroKycStatusAction, 
  type MicroKycPaymentResult 
} from "@/app/actions/kyc-verification";

export interface UserProfileData {
  id?: string;
  email?: string | null;
  phone?: string | null;
  isVerified?: boolean | null;
  name?: string | null;
  full_name?: string | null;
  username?: string | null;
  location?: string | null;
  quote?: string | null;
  bio?: string | null;
  todaysMemory?: string | null;
  avatar?: string | null;
  avatar_url?: string | null;
  coverImage?: string | null;
  kyc_status?: string | null;
}

export function ProfileClient({ 
  userProfile,
  trustBreakdown
}: { 
  userProfile: UserProfileData;
  trustBreakdown?: TrustScoreBreakdown;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const userId = userProfile?.id || "";
  const clooperCode = formatClooperCode(userId);
  const [copiedCode, setCopiedCode] = useState(false);

  // 🟢 QUẢN LÝ ĐỊNH DANH SỐ THỰC CHẤT QUA VIETQR 1.000đ (MICRO-DEPOSIT BANK eKYC)
  const initialPhoneVerified = Boolean(userProfile?.isVerified || trustBreakdown?.factors?.phoneVerified);
  const [isPhoneVerified, setIsPhoneVerified] = useState<boolean>(initialPhoneVerified);
  const [currentPhone, setCurrentPhone] = useState<string>(userProfile?.phone || "");
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState(userProfile?.phone || "");
  const [kycStep, setKycStep] = useState<"PHONE" | "QR" | "SUCCESS">("PHONE");
  const [kycLoading, setKycLoading] = useState(false);
  const [kycError, setKycError] = useState("");
  const [kycPaymentData, setKycPaymentData] = useState<MicroKycPaymentResult | null>(null);
  const [kycCountdown, setKycCountdown] = useState(900);
  const [copiedTransferContent, setCopiedTransferContent] = useState(false);

  // Tự động kiểm tra trạng thái thanh toán VietQR eKYC mỗi 2.5 giây khi đang ở bước QR
  React.useEffect(() => {
    if (kycStep !== "QR" || !kycPaymentData?.orderCode || isPhoneVerified) return;

    const interval = setInterval(async () => {
      try {
        const res = await checkMicroKycStatusAction(kycPaymentData.orderCode!, phoneInput);
        if (res.isPaid) {
          setIsPhoneVerified(true);
          setCurrentPhone(phoneInput);
          setKycStep("SUCCESS");
          clearInterval(interval);
          router.refresh();
        }
      } catch (err) {
        console.warn("Polling kyc status error:", err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [kycStep, kycPaymentData, phoneInput, isPhoneVerified, router]);

  // Đếm ngược 15 phút cho mã VietQR
  React.useEffect(() => {
    if (kycStep === "QR" && kycCountdown > 0) {
      const timer = setTimeout(() => setKycCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [kycStep, kycCountdown]);

  const handleCreateKycQr = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setKycError("");
    setKycLoading(true);

    try {
      const res = await createMicroKycPaymentAction({ phone: phoneInput });
      if (!res.success) {
        throw new Error(res.error);
      }
      setKycPaymentData(res);
      setKycCountdown(900);
      setKycStep("QR");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể tạo mã VietQR";
      setKycError(msg);
    } finally {
      setKycLoading(false);
    }
  };

  const handleManualCheckKyc = async () => {
    if (!kycPaymentData?.orderCode) return;
    setKycLoading(true);
    setKycError("");
    try {
      const res = await checkMicroKycStatusAction(kycPaymentData.orderCode, phoneInput);
      if (res.isPaid) {
        setIsPhoneVerified(true);
        setCurrentPhone(phoneInput);
        setKycStep("SUCCESS");
        router.refresh();
      } else {
        setKycError("Hệ thống chưa nhận được tín hiệu chuyển khoản từ ngân hàng. Nếu bạn vừa quét mã, vui lòng đợi 2-3 giây.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi kiểm tra trạng thái";
      setKycError(msg);
    } finally {
      setKycLoading(false);
    }
  };

  // Form state for live public profile editing
  const [formData, setFormData] = useState({
    name: userProfile?.name || userProfile?.full_name || "Thành viên CLOOP",
    username: formatCleanUsername(userProfile?.username || (userId ? userId.substring(0, 8) : "user")),
    location: normalizeProvince(userProfile?.location),
    quote: userProfile?.quote || "Lưu giữ ký ức qua từng chiếc váy.",
    bio: userProfile?.bio || "Mình là một người yêu thời trang vintage và những chuyến đi. Mình tin rằng mỗi món đồ đều có một câu chuyện đẹp để kể lại.",
    todaysMemory: userProfile?.todaysMemory || "Hôm nay mình vừa cho thuê chiếc váy đầu tiên trên CLOOP. Một khởi đầu thật đáng nhớ!",
    avatar: userProfile?.avatar || userProfile?.avatar_url || "",
    coverImage: userProfile?.coverImage || "",
  });

  const handleCopyClooperCode = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(clooperCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const trustScore = trustBreakdown?.score ?? 45;
  const maxScore = 100;
  const progressPercent = Math.min((trustScore / maxScore) * 100, 100);
  const currentTier = trustBreakdown?.tier || (trustScore >= 85 ? "LEVEL_3_VIP" : trustScore >= 60 ? "LEVEL_2_TRUSTED" : trustScore >= 30 ? "LEVEL_1_VERIFIED" : "LEVEL_0_NEW");
  const tierConfig = trustBreakdown?.config || TRUST_TIERS[currentTier];

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    const form = new FormData();
    form.append("file", file);
    form.append("folder", "cloop_profiles");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Không thể tải ảnh lên.");

      const newAvatarUrl = data.url;
      setFormData(prev => ({ ...prev, avatar: newAvatarUrl }));

      // Cập nhật an toàn qua Server Action với quyền hạn session
      const updateRes = await updateUserProfileWithValidation({
        ...formData,
        avatar: newAvatarUrl,
      });

      if (!updateRes.success) {
        throw new Error(updateRes.error);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Lỗi upload ảnh";
      alert(`Lỗi upload ảnh đại diện: ${message}`);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Xác thực và lưu qua Server Action
      const res = await updateUserProfileWithValidation({
        name: formData.name,
        username: formData.username,
        location: formData.location,
        quote: formData.quote,
        bio: formData.bio,
        todaysMemory: formData.todaysMemory,
        avatar: formData.avatar,
        coverImage: formData.coverImage,
      });

      if (!res.success) {
        throw new Error(res.error);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Lỗi hệ thống";
      alert(`Có lỗi xảy ra khi lưu: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-ui">
      
      {/* 🌟 1. TỔNG QUAN TÀI KHOẢN & KẾT NỐI TỦ ĐỒ CÔNG KHAI (CHIA SẺ LINK IN BIO) */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Left: Avatar Upload & Info */}
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          
          {/* Avatar with click-to-upload */}
          <div className="flex flex-col items-center gap-2">
            <div 
              className="relative group cursor-pointer" 
              onClick={() => fileInputRef.current?.click()}
              title="Nhấn để tải lên ảnh đại diện mới"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-stone-100 border-4 border-emerald-50 shadow-sm overflow-hidden flex items-center justify-center text-stone-300 relative">
                {formData.avatar ? (
                  <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={38} />
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  <Camera size={18} />
                  <span className="text-[9px] font-bold mt-0.5 uppercase">Đổi ảnh</span>
                </div>
              </div>
              
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="absolute bottom-0 right-0 w-8 h-8 bg-[#183A2D] hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-md border-2 border-white transition-colors cursor-pointer"
                title="Tải ảnh đại diện mới"
              >
                {isUploadingAvatar ? <Loader2 size={13} className="animate-spin text-emerald-300" /> : <Camera size={13} />}
              </button>

              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleAvatarFileChange} 
              />
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] font-bold text-[#183A2D] hover:text-emerald-700 hover:underline flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer mt-1"
            >
              <Camera size={13} className="shrink-0" />
              <span>{isUploadingAvatar ? "Đang tải ảnh..." : "Đổi ảnh đại diện"}</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A2517] font-heading">{formData.name}</h2>
            
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <span className="text-xs text-stone-600 font-mono font-bold bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                @{formData.username}
              </span>
              <button
                type="button"
                onClick={handleCopyClooperCode}
                className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200/80 flex items-center gap-1 cursor-pointer transition-colors"
                title="Mã định danh độc bản duy nhất của bạn trên hệ thống CLOOP. Nhấn để chép."
              >
                <Fingerprint size={12} className="text-emerald-700" /> #{clooperCode.replace("CLOOP-", "")}
              </button>
            </div>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200/80 flex items-center gap-1">
                <ShieldCheck size={11} className="text-emerald-600" /> Thành viên CLOOP
              </span>
              <span className="px-3 py-1 bg-amber-50 text-amber-900 text-[10px] font-bold rounded-full border border-amber-200/80 flex items-center gap-1">
                <MapPin size={11} className="text-amber-700" /> {formData.location}
              </span>
              <span className="px-2.5 py-1 bg-stone-100 text-stone-600 text-[10px] font-medium rounded-full border border-stone-200 flex items-center gap-1" title="Bảo mật địa chỉ nhà riêng theo chuẩn Privacy by Design">
                <Lock size={10} className="text-stone-500" /> Cấp Tỉnh (Bảo mật riêng tư)
              </span>
            </div>
          </div>
        </div>

        {/* Right: Public Closet Button */}
        <div className="flex items-center w-full md:w-auto">
          <Link
            href={`/closet/${userId}`}
            target="_blank"
            className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-[#183A2D] hover:bg-[#112a20] text-white font-heading font-extrabold text-xs uppercase tracking-wider transition-all duration-300 shadow-sm hover:scale-105 flex items-center justify-center gap-2"
          >
            <span>Xem Tủ Đồ Công Khai</span>
            <ExternalLink size={14} />
          </Link>
        </div>

      </div>

      {/* ✏️ 2. CHỈNH SỬA THÔNG TIN TỦ ĐỒ CÔNG KHAI (LIVE SYNC VỚI /closet/[id]) */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="px-6 sm:px-8 py-5 border-b border-stone-100 bg-[#FAF9F5] flex justify-between items-center">
          <div>
            <h3 className="font-heading font-extrabold text-base sm:text-lg text-[#0A2517]">
              Thông Tin Tủ Đồ & Trang Cá Nhân
            </h3>
            <p className="text-xs text-stone-500 font-light mt-0.5">
              Những thông tin này sẽ hiển thị trực tiếp trên trang Tủ đồ công khai mà khách thuê nhìn thấy.
            </p>
          </div>
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 animate-bounce">
              <CheckCircle2 size={13} /> Đã đồng bộ thành công!
            </span>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Họ và tên hiển thị:
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Elena Vance, Thu Trang..."
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-[#183A2D] focus:ring-1 focus:ring-[#183A2D] outline-none text-xs sm:text-sm font-medium"
                required
              />
            </div>

            {/* Unique Clooper ID (Độc bản, Hệ thống cấp) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Fingerprint size={13} className="text-emerald-700" /> Mã Ký Hiệu Clooper (Độc Bản):
                </label>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  Hệ thống cấp
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    readOnly
                    value={clooperCode}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/80 text-[#183A2D] font-mono font-bold text-xs sm:text-sm cursor-not-allowed select-all"
                  />
                  <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
                </div>
                <button
                  type="button"
                  onClick={handleCopyClooperCode}
                  className="px-3.5 py-2.5 rounded-xl border border-stone-200 hover:border-emerald-600 bg-white hover:bg-emerald-50 text-stone-600 hover:text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
                  title="Sao chép mã định danh độc bản"
                >
                  {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedCode ? "Đã chép" : "Sao chép"}</span>
                </button>
              </div>
              <p className="text-[11px] text-stone-400 font-light">
                Mã độc bản duy nhất gắn liền với tài khoản, giúp chống giả mạo và phân biệt người dùng.
              </p>
            </div>

            {/* Username / Handle */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1">
                <User size={13} /> Tên tài khoản (@username):
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-sm font-semibold">@</span>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => {
                    const cleaned = formatCleanUsername(e.target.value);
                    setFormData({ ...formData, username: cleaned });
                  }}
                  placeholder="elena_closet"
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-stone-200 focus:border-[#183A2D] focus:ring-1 focus:ring-[#183A2D] outline-none text-xs sm:text-sm font-mono"
                  required
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-400">
                <span>Chỉ gồm ký tự a-z, 0-9, gạch dưới</span>
                <span className="font-mono text-emerald-800 font-semibold">
                  @{formData.username || "user"} #{clooperCode.replace("CLOOP-", "")}
                </span>
              </div>
            </div>

            {/* Location (Standardized 34 Provinces dropdown + Privacy Notice) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1">
                  <MapPin size={13} className="text-emerald-700" /> Tỉnh / Thành phố:
                </label>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                  <ShieldCheck size={10} /> 34 Tỉnh thành chuẩn
                </span>
              </div>
              <select
                value={normalizeProvince(formData.location)}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-[#183A2D] focus:ring-1 focus:ring-[#183A2D] outline-none text-xs sm:text-sm font-medium bg-white text-stone-800 cursor-pointer"
              >
                <optgroup label="── MIỀN BẮC ──">
                  {VIETNAM_34_PROVINCES.filter(p => p.region === "NORTH").map(p => (
                    <option key={p.id} value={p.name}>
                      {p.name} {p.mergerNote ? `(${p.mergerNote})` : ""}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="── MIỀN TRUNG & TÂY NGUYÊN ──">
                  {VIETNAM_34_PROVINCES.filter(p => p.region === "CENTRAL").map(p => (
                    <option key={p.id} value={p.name}>
                      {p.name} {p.mergerNote ? `(${p.mergerNote})` : ""}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="── MIỀN NAM ──">
                  {VIETNAM_34_PROVINCES.filter(p => p.region === "SOUTH").map(p => (
                    <option key={p.id} value={p.name}>
                      {p.name} {p.mergerNote ? `(${p.mergerNote})` : ""}
                    </option>
                  ))}
                </optgroup>
              </select>

              {/* Privacy Notice Reassurance (Privacy by Design - Luật 91/2025/QH15) */}
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-[11px] text-emerald-950 leading-relaxed flex items-start gap-2">
                <ShieldCheck size={14} className="text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-900">Bảo mật địa chỉ riêng tư (Privacy by Design):</span> Hệ thống chỉ lưu và hiển thị cấp Tỉnh/Thành để tính cước vận chuyển (GHN/GHTK) và gợi ý kết nối. Địa chỉ nhà riêng, xóm/phường của bạn tuyệt đối không công khai trên hồ sơ.
                </div>
              </div>
            </div>

            {/* Fashion Quote */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1">
                <Quote size={13} /> Châm ngôn thời trang (Quote):
              </label>
              <input
                type="text"
                value={formData.quote}
                onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                placeholder="VD: Lưu giữ ký ức qua từng chiếc váy."
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-[#183A2D] focus:ring-1 focus:ring-[#183A2D] outline-none text-xs sm:text-sm italic font-serif"
              />
            </div>

          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1">
              <FileText size={13} /> Giới thiệu bản thân (Bio):
            </label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Chia sẻ gu thời trang, phong cách và thông điệp bạn muốn gửi tới khách thuê..."
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-[#183A2D] focus:ring-1 focus:ring-[#183A2D] outline-none text-xs sm:text-sm font-light leading-relaxed"
            />
          </div>

          {/* Today's Memory */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1">
              <Heart size={13} className="text-rose-500" /> Kỷ niệm hôm nay (Today&apos;s Memory):
            </label>
            <input
              type="text"
              value={formData.todaysMemory}
              onChange={(e) => setFormData({ ...formData, todaysMemory: e.target.value })}
              placeholder="VD: Hôm nay mình vừa cho thuê chiếc váy dạ hội đầu tiên trên CLOOP..."
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-[#183A2D] focus:ring-1 focus:ring-[#183A2D] outline-none text-xs sm:text-sm italic"
            />
          </div>

          {/* Save Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-7 py-3 rounded-full bg-[#183A2D] hover:bg-[#112a20] text-white font-heading font-extrabold text-xs uppercase tracking-wider transition-all duration-300 shadow-sm hover:scale-105 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Lưu & Cập Nhật Tủ Đồ Công Khai</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 🛡️ 3. CLOOP TRUST STACK & EXPOSURE LIMIT DASHBOARD */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${tierConfig.badgeColor}`}>
                {tierConfig.label}
              </span>
              <span className="text-[10px] text-stone-400 font-mono">CLOOP TRUST STACK</span>
            </div>
            <h3 className="font-heading font-extrabold text-lg sm:text-xl text-[#0A2517] flex items-center gap-2">
              <ShieldCheck className="text-emerald-700" size={22} /> Điểm Uy Tín & Hạn Mức Tín Nhiệm
            </h3>
            <p className="text-xs text-stone-500 font-light mt-1">
              Điểm tín nhiệm lũy tiến theo lịch sử giao dịch và xác thực liên lạc. Không cần chụp giấy tờ tùy thân rườm rà.
            </p>
          </div>
          <div className="flex items-baseline gap-1 bg-stone-50 px-4 py-2 rounded-2xl border border-stone-200/80 shrink-0">
            <span className="text-3xl sm:text-4xl font-mono font-extrabold text-[#183A2D]">{trustScore}</span>
            <span className="text-xs text-stone-400 font-bold uppercase">/ {maxScore} PTS</span>
          </div>
        </div>

        {/* Thanh Tiến Trình TrustScore */}
        <div>
          <div className="w-full h-3.5 bg-stone-100 rounded-full overflow-hidden relative">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 via-emerald-500 to-emerald-700 rounded-full transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2 text-center text-[10px] font-bold text-stone-400">
            <span className={currentTier === "LEVEL_0_NEW" ? "text-emerald-800 font-extrabold" : ""}>Level 0 (Mới)</span>
            <span className={currentTier === "LEVEL_1_VERIFIED" ? "text-emerald-800 font-extrabold" : ""}>Level 1 (Xác thực)</span>
            <span className={currentTier === "LEVEL_2_TRUSTED" ? "text-emerald-800 font-extrabold" : ""}>Level 2 (Khách quen)</span>
            <span className={currentTier === "LEVEL_3_VIP" ? "text-amber-800 font-extrabold" : ""}>Level 3 (VIP Club)</span>
          </div>
        </div>

        {/* Thẻ Chỉ Số Quản Trị Rủi Ro (Exposure Limit & Deposit Rate) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#E9E2D8] space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Hạn mức rủi ro tài sản (Exposure Limit)</span>
            <div className="text-xl sm:text-2xl font-mono font-bold text-[#183A2D]">
              {tierConfig.exposureLimit.toLocaleString('vi-VN')}đ
            </div>
            <p className="text-[11px] text-stone-500 font-light leading-relaxed">
              Tổng giá trị trang phục tối đa bạn được phép giữ trong vòng thuê đồng thời.
            </p>
          </div>

          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Đặc quyền tiền cọc hiện tại</span>
            <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-900">
              {tierConfig.depositRate === 1 ? "Cọc 100%" : `Giảm ${(1 - tierConfig.depositRate) * 100}% Tiền Cọc`}
            </div>
            <p className="text-[11px] text-emerald-800/80 font-light leading-relaxed">
              {tierConfig.perks[0]}
            </p>
          </div>
        </div>

        {/* 4 Yếu Tố Tín Nhiệm (Trust Factors) */}
        <div className="pt-2">
          <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-3">
            Chi tiết các yếu tố cấu thành điểm uy tín
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* 1. Xác thực Email */}
            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200/60">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <div>
                  <span className="text-stone-800 font-semibold block">Xác thực Email tài khoản</span>
                  <span className="text-[10px] text-stone-400 font-mono">{userProfile.email || "Đã liên kết"}</span>
                </div>
              </div>
              <span className="font-bold font-mono text-emerald-700">+10 PTS</span>
            </div>

            {/* 2. Xác thực Định danh VietQR & SĐT */}
            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200/60">
              <div className="flex items-center gap-2">
                {isPhoneVerified ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                ) : (
                  <ShieldAlert size={16} className="text-amber-500 shrink-0" />
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-stone-800 font-semibold">Định danh VietQR & SĐT chính chủ</span>
                    {isPhoneVerified ? (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">Đã định danh</span>
                    ) : (
                      <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold">Chưa định danh</span>
                    )}
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {isPhoneVerified ? maskPhoneNumber(currentPhone) : "Định danh cấp ngân hàng • Hoàn 200% vào ví"}
                  </span>
                </div>
              </div>

              {isPhoneVerified ? (
                <span className="font-bold font-mono text-emerald-700">+10 PTS</span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setKycStep("PHONE");
                    setKycError("");
                    setPhoneInput(currentPhone);
                    setIsKycModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-[#183A2D] hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <QrCode size={12} />
                  <span>Xác thực ngay</span>
                </button>
              )}
            </div>

            {/* 3. Email Sinh Viên */}
            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200/60">
              <span className="text-stone-600 flex items-center gap-2">
                <CheckCircle2 size={15} className={trustBreakdown?.factors.isStudent ? "text-emerald-600" : "text-stone-300"} />
                Email Sinh Viên (@edu.vn)
              </span>
              <span className="font-bold font-mono text-emerald-700">
                {trustBreakdown?.factors.isStudent ? "+10 PTS" : "Chưa kích hoạt"}
              </span>
            </div>

            {/* 4. Lịch sử thuê thành công */}
            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200/60">
              <span className="text-stone-600 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-amber-500" />
                Lịch sử thuê thành công ({trustBreakdown?.factors.completedOrders || 0} đơn)
              </span>
              <span className="font-bold font-mono text-emerald-700">
                +{trustBreakdown?.factors.orderPoints || 0} PTS
              </span>
            </div>

            {/* 5. Đánh giá 5 sao */}
            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200/60 sm:col-span-2">
              <span className="text-stone-600 flex items-center gap-2">
                <Award size={15} className="text-blue-500" />
                Đánh giá 5 sao ({trustBreakdown?.factors.fiveStarReviews || 0} lượt)
              </span>
              <span className="font-bold font-mono text-emerald-700">
                +{trustBreakdown?.factors.reviewPoints || 0} PTS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 🔒 4. PRIVACY BY DESIGN & DATA PROTECTION MODULE */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="px-6 sm:px-8 py-4 border-b border-stone-100 bg-[#FAF9F5] flex justify-between items-center">
          <h3 className="font-heading font-extrabold text-sm sm:text-base text-[#0A2517] uppercase tracking-wider flex items-center gap-2">
            <Lock size={16} className="text-emerald-800" /> Quản Trị Quyền Riêng Tư (Privacy By Design)
          </h3>
          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full font-mono">
            Luật 91/2025/QH15
          </span>
        </div>
        
        <div className="p-6 sm:p-8 space-y-4">
          <div className="text-xs text-stone-600 bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100/80 space-y-2">
            <p className="font-bold text-emerald-950 flex items-center gap-2 text-xs">
              <ShieldCheck size={16} className="text-emerald-700" /> Nguyên tắc &quot;Collect Less → Verify Smarter&quot;
            </p>
            <p className="text-[11px] text-emerald-900/80 font-light leading-relaxed">
              CLOOP cam kết tuân thủ nghiêm ngặt Luật Bảo vệ Dữ liệu Cá nhân số 91/2025/QH15 và Nghị định 356/2025/NĐ-CP. Chúng tôi KHÔNG thu thập ảnh CCCD hay dữ liệu sinh trắc học của bạn khi không cần thiết. Uy tín được xây dựng tự nhiên qua từng giao dịch hoàn tất an toàn.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
            <div className="p-3.5 rounded-xl border border-stone-200/70 space-y-1 bg-stone-50/50">
              <span className="font-bold text-stone-800 text-[11px] block">Cấp 1-2: Dữ liệu Tài khoản</span>
              <p className="text-[10.5px] text-stone-500 font-light">Email và SĐT được mã hóa SSL/TLS, chỉ phục vụ thông báo tình trạng đơn và đối soát thanh toán.</p>
            </div>
            <div className="p-3.5 rounded-xl border border-stone-200/70 space-y-1 bg-stone-50/50">
              <span className="font-bold text-stone-800 text-[11px] block">Cấp 3: Dòng tiền Escrow</span>
              <p className="text-[10.5px] text-stone-500 font-light">Chứng từ kế toán và mã VietQR được lưu trữ theo quy chuẩn Nghị định 52/2024/NĐ-CP.</p>
            </div>
            <div className="p-3.5 rounded-xl border border-stone-200/70 space-y-1 bg-stone-50/50">
              <span className="font-bold text-stone-800 text-[11px] block">Cấp 5: Bằng chứng số</span>
              <p className="text-[10.5px] text-stone-500 font-light">Video niêm phong và mở gói được lưu trữ trên Cold Storage và tự động tiêu hủy sau khi hoàn tất đơn.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 💳 POPUP ĐỊNH DANH SỐ VIETQR eKYC 1.000đ (MICRO-DEPOSIT BANK eKYC MODAL) */}
      {isKycModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-stone-100 bg-[#FAF9F5] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center shadow-2xs">
                  <QrCode size={18} />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-sm sm:text-base text-[#0A2517]">
                    Định Danh Số VietQR eKYC
                  </h3>
                  <p className="text-[10px] text-stone-400 font-mono">CHUẨN NGÂN HÀNG • BẢO MẬT DỮ LIỆU CÁ NHÂN</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsKycModalOpen(false)}
                className="w-8 h-8 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {kycError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                  <span className="leading-relaxed">{kycError}</span>
                </div>
              )}

              {/* BƯỚC 1: NHẬP SỐ ĐIỆN THOẠI & ĐỌC LỜI GIẢI THÍCH TINH TẾ */}
              {kycStep === "PHONE" && (
                <form onSubmit={handleCreateKycQr} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                        Số điện thoại di động chính chủ:
                      </label>
                      {phoneInput && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getVietnamCarrier(phoneInput).badgeColor}`}>
                          {getVietnamCarrier(phoneInput).name}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-mono font-bold">+84</span>
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="0987654321"
                        maxLength={11}
                        className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-stone-200 focus:border-[#183A2D] focus:ring-1 focus:ring-[#183A2D] outline-none text-sm font-mono font-bold"
                        required
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-stone-400">
                      Chấp nhận đầu số 10 số của Viettel, VinaPhone, MobiFone, Vietnamobile, Wintel.
                    </p>
                  </div>

                  {/* KHỐI TRẤN AN VÀ GIẢI THÍCH TÂM LÝ KHÉO LÉO */}
                  <div className="space-y-2.5 bg-stone-50 p-4 rounded-2xl border border-stone-200/80 text-xs">
                    <div className="flex items-start gap-2 text-emerald-950">
                      <ShieldCheck size={16} className="text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-stone-900 font-bold">Vì sao xác thực bằng giao dịch 1.000đ?</strong>
                        <p className="text-stone-600 text-[11px] leading-relaxed font-light mt-0.5">
                          Theo <strong>Quyết định 2345/QĐ-NHNN</strong>, 100% tài khoản ngân hàng tại Việt Nam đều đã được đối soát CCCD gắn chip và sinh trắc học. Đây là cách nhanh nhất để xác minh người dùng thật mà <strong>không cần bạn phải chụp ảnh CCCD gửi lên mạng</strong> (tuân thủ Luật 91/2025/QH15).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-emerald-950 pt-2 border-t border-stone-200/60">
                      <Coins size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-stone-900 font-bold">Cam kết Hoàn tiền 200% vào Ví CLOOP:</strong>
                        <p className="text-stone-600 text-[11px] leading-relaxed font-light mt-0.5">
                          1.000đ chuyển khoản sẽ được nạp <strong>100% vào ví</strong> và được sàn <strong>tặng thêm 10 Xu Xanh (tổng nhận 20 Xu Xanh = 2.000đ)</strong>. Bạn hoàn toàn không mất tiền, số xu này được trừ trực tiếp khi bạn thuê váy áo!
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-emerald-950 pt-2 border-t border-stone-200/60">
                      <Sparkles size={16} className="text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-stone-900 font-bold">Tự động 100% & Nhận điểm Tín nhiệm:</strong>
                        <p className="text-stone-600 text-[11px] leading-relaxed font-light mt-0.5">
                          Quét mã VietQR trên app ngân hàng bất kỳ, hệ thống nhận diện sau 1-3 giây, tự động cộng <strong>+10 PTS</strong> và mở khóa đặc quyền giảm cọc.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={kycLoading || !phoneInput.trim()}
                    className="w-full py-3.5 rounded-xl bg-[#183A2D] hover:bg-emerald-800 text-white font-heading font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {kycLoading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Đang kết nối cổng VietQR...</span>
                      </>
                    ) : (
                      <>
                        <QrCode size={14} />
                        <span>Tạo Mã VietQR Định Danh (1.000đ)</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* BƯỚC 2: HIỂN THỊ MÃ VIETQR ĐỘNG & TỰ ĐỘNG LẮNG NGHE POLLING */}
              {kycStep === "QR" && kycPaymentData && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <span className="text-xs text-stone-500">Mã VietQR Định Danh cho SĐT:</span>
                    <div className="text-base font-mono font-bold text-[#183A2D]">
                      {maskPhoneNumber(kycPaymentData.phone || phoneInput)}
                    </div>
                  </div>

                  {/* THẺ HIỂN THỊ MÃ QR */}
                  <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 text-center space-y-3">
                    {kycPaymentData.qrCode ? (
                      <div className="inline-block bg-white p-2.5 rounded-2xl border border-stone-200 shadow-xs">
                        <img 
                          src={kycPaymentData.qrCode.startsWith("data:") ? kycPaymentData.qrCode : `https://api.vietqr.io/image/${kycPaymentData.bin}-${kycPaymentData.accountNumber}-compact2.jpg?amount=1000&addInfo=${encodeURIComponent(`KYC CLOOP ${kycPaymentData.orderCode?.toString().slice(-6)}`)}&accountName=${encodeURIComponent(kycPaymentData.accountName || "CLOOP")}`}
                          alt="VietQR eKYC 1000d"
                          className="w-48 h-48 object-contain mx-auto rounded-xl"
                        />
                      </div>
                    ) : (
                      <div className="py-8 space-y-2">
                        <QrCode size={48} className="mx-auto text-emerald-800" />
                        <p className="text-xs text-stone-600 font-bold">Chuyển khoản 1.000đ qua PayOS</p>
                      </div>
                    )}

                    {/* THÔNG TIN CHUYỂN KHOẢN CHI TIẾT */}
                    <div className="bg-white p-3 rounded-xl border border-stone-200/80 text-left text-xs space-y-1.5 font-mono">
                      <div className="flex justify-between items-center text-stone-500 text-[11px]">
                        <span>Ngân hàng:</span>
                        <span className="font-bold text-stone-900">MBBank / VietinBank</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-stone-500 text-[11px]">Số tài khoản:</span>
                        <span className="font-bold text-emerald-900 select-all">{kycPaymentData.accountNumber || "Theo mã QR"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-stone-500 text-[11px]">Số tiền nạp:</span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">1.000 đ (Nhận lại 20 Xu)</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-stone-100">
                        <span className="text-stone-500 text-[11px]">Nội dung CK:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-stone-900 select-all">KYC CLOOP {kycPaymentData.orderCode?.toString().slice(-6)}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`KYC CLOOP ${kycPaymentData.orderCode?.toString().slice(-6)}`);
                              setCopiedTransferContent(true);
                              setTimeout(() => setCopiedTransferContent(false), 2000);
                            }}
                            className="p-1 text-emerald-800 hover:bg-emerald-50 rounded"
                            title="Sao chép nội dung"
                          >
                            {copiedTransferContent ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* VÒNG QUAY TỰ ĐỘNG LẮNG NGHE POLLING */}
                    <div className="flex items-center justify-center gap-2 text-xs text-stone-500 pt-1">
                      <Loader2 size={13} className="animate-spin text-emerald-700" />
                      <span>Đang tự động lắng nghe giao dịch từ Ngân hàng...</span>
                    </div>

                    <div className="text-[11px] text-stone-400 font-mono">
                      Mã thanh toán tự động hết hạn sau: <strong className="text-stone-700">{Math.floor(kycCountdown / 60)}:{String(kycCountdown % 60).padStart(2, "0")}</strong>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleManualCheckKyc}
                      disabled={kycLoading}
                      className="w-full py-3 rounded-xl bg-[#183A2D] hover:bg-emerald-800 text-white font-heading font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      {kycLoading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Đang kiểm tra giao dịch...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          <span>Tôi Đã Chuyển Khoản Xong</span>
                        </>
                      )}
                    </button>

                    {kycPaymentData.checkoutUrl && (
                      <a
                        href={kycPaymentData.checkoutUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                      >
                        <span>Mở Cổng Thanh Toán PayOS Trực Tiếp</span>
                        <ExternalLink size={13} />
                      </a>
                    )}

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => { setKycStep("PHONE"); setKycError(""); }}
                        className="text-[11px] text-stone-500 hover:text-stone-800 hover:underline font-medium"
                      >
                        ← Đổi số điện thoại khác
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* BƯỚC 3: THÀNH CÔNG RỰC RỠ */}
              {kycStep === "SUCCESS" && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto animate-bounce shadow-sm">
                    <CheckCircle2 size={36} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-bold text-stone-900 font-heading">
                      Định Danh Chính Chủ Thành Công!
                    </h4>
                    <p className="text-xs text-stone-500 font-light">
                      Giao dịch VietQR eKYC 1.000đ đã được Ngân hàng & PayOS xác thực thành công.
                    </p>
                  </div>

                  <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600">Điểm Tín Nhiệm:</span>
                      <strong className="text-emerald-800 font-mono font-black text-sm">+10 PTS</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600">Số điện thoại xác thực:</span>
                      <strong className="font-mono text-stone-900">{maskPhoneNumber(currentPhone)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600">Hoàn tiền vào Ví CLOOP:</span>
                      <strong className="text-amber-700 font-mono font-bold">+20 Xu Xanh (2.000đ)</strong>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60">
                      <span className="text-stone-600">Đặc quyền mới:</span>
                      <span className="text-emerald-900 font-bold">Mở khóa chiết khấu tiền cọc</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsKycModalOpen(false)}
                    className="w-full py-3 rounded-xl bg-[#183A2D] hover:bg-emerald-800 text-white font-heading font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                  >
                    Hoàn Tất & Khám Phá Tủ Đồ
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
