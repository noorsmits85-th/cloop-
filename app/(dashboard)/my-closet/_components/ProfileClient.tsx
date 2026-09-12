"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Camera, 
  ExternalLink, 
  Sparkles, 
  Save, 
  Loader2, 
  MapPin, 
  Quote, 
  FileText,
  Heart,
  Award,
  Zap,
  Lock,
  ArrowUpRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { TRUST_TIERS, type TrustScoreBreakdown } from "@/lib/trust-engine";

export function ProfileClient({ 
  userProfile,
  trustBreakdown
}: { 
  userProfile: any;
  trustBreakdown?: TrustScoreBreakdown;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUploadingId, setIsUploadingId] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [kycStatus, setKycStatus] = useState(userProfile?.kyc_status || 'unverified');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const userId = userProfile?.id || "";

  // Form state for live public profile editing
  const [formData, setFormData] = useState({
    name: userProfile?.name || userProfile?.full_name || "Thành viên CLOOP",
    username: userProfile?.username || (userId ? userId.substring(0, 8) : "user"),
    location: userProfile?.location || "Hà Nội, Việt Nam",
    quote: userProfile?.quote || "Lưu giữ ký ức qua từng chiếc váy.",
    bio: userProfile?.bio || "Mình là một người yêu thời trang vintage và những chuyến đi. Mình tin rằng mỗi món đồ đều có một câu chuyện đẹp để kể lại.",
    todaysMemory: userProfile?.todaysMemory || "Hôm nay mình vừa cho thuê chiếc váy đầu tiên trên CLOOP. Một khởi đầu thật đáng nhớ!",
    avatar: userProfile?.avatar || userProfile?.avatar_url || "",
    coverImage: userProfile?.coverImage || "",
  });

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

      // Cập nhật ngay vào database
      if (userId) {
        await supabase
          .from("profiles")
          .update({ avatar: newAvatarUrl, avatar_url: newAvatarUrl })
          .eq("id", userId);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      alert(`Lỗi upload ảnh đại diện: ${error.message}`);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: formData.name,
          username: formData.username,
          location: formData.location,
          quote: formData.quote,
          bio: formData.bio,
          todaysMemory: formData.todaysMemory,
          avatar: formData.avatar,
          coverImage: formData.coverImage,
        })
        .eq("id", userId);

      if (error) throw error;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Có lỗi xảy ra khi lưu: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadId = () => {
    setIsUploadingId(true);
    setTimeout(() => {
      setIsUploadingId(false);
      setKycStatus('pending');
      alert("Đã tải lên giấy tờ tuỳ thân thành công. Hệ thống CLOOP sẽ xét duyệt trong 24h.");
    }, 1500);
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

          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A2517] font-heading">{formData.name}</h2>
            <p className="text-xs text-stone-400 font-mono">@{formData.username}</p>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200/80 flex items-center gap-1">
                <Sparkles size={11} className="text-emerald-600" /> Thành viên CLOOP
              </span>
              <span className="px-3 py-1 bg-amber-50 text-amber-900 text-[10px] font-bold rounded-full border border-amber-200/80 flex items-center gap-1">
                <MapPin size={11} className="text-amber-700" /> {formData.location}
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

            {/* Username / Handle */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Tên tài khoản (@username):
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="VD: elena.closet, the.archive..."
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-[#183A2D] focus:ring-1 focus:ring-[#183A2D] outline-none text-xs sm:text-sm font-mono"
                required
              />
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1">
                <MapPin size={13} /> Tỉnh / Thành phố:
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="VD: Hà Nội, TP. Hồ Chí Minh, Đà Nẵng..."
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-[#183A2D] focus:ring-1 focus:ring-[#183A2D] outline-none text-xs sm:text-sm font-medium"
              />
            </div>

            {/* Fashion Quote */}
            <div className="space-y-1.5">
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
              <Heart size={13} className="text-rose-500" /> Kỷ niệm hôm nay (Today's Memory):
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
            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200/60">
              <span className="text-stone-600 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600" /> Xác thực Email & Điện thoại
              </span>
              <span className="font-bold font-mono text-emerald-700">+20 PTS</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200/60">
              <span className="text-stone-600 flex items-center gap-2">
                <CheckCircle2 size={15} className={trustBreakdown?.factors.isStudent ? "text-emerald-600" : "text-stone-300"} />
                Email Sinh Viên (@edu.vn)
              </span>
              <span className="font-bold font-mono text-emerald-700">
                {trustBreakdown?.factors.isStudent ? "+15 PTS" : "Chưa kích hoạt"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200/60">
              <span className="text-stone-600 flex items-center gap-2">
                <Sparkles size={15} className="text-amber-500" />
                Lịch sử thuê thành công ({trustBreakdown?.factors.completedOrders || 0} đơn)
              </span>
              <span className="font-bold font-mono text-emerald-700">
                +{trustBreakdown?.factors.orderPoints || 0} PTS
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200/60">
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

    </div>
  );
}
