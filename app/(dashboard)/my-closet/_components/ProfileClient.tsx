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
  Copy, 
  Check, 
  Sparkles, 
  Save, 
  Loader2, 
  MapPin, 
  Quote, 
  FileText,
  Heart
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export function ProfileClient({ userProfile }: { userProfile: any }) {
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUploadingId, setIsUploadingId] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [kycStatus, setKycStatus] = useState(userProfile?.kyc_status || 'unverified');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const userId = userProfile?.id || "";
  const publicClosetUrl = typeof window !== "undefined" ? `${window.location.origin}/closet/${userId}` : `/closet/${userId}`;

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

  const trustScore = 45;
  const maxScore = 100;
  const progressPercent = Math.min((trustScore / maxScore) * 100, 100);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicClosetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

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
              className="text-[11px] font-bold text-[#183A2D] hover:text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Camera size={12} />
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

        {/* Right: 2 Social Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* View Public Closet Button */}
          <Link
            href={`/closet/${userId}`}
            target="_blank"
            className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-[#183A2D] hover:bg-[#112a20] text-white font-heading font-extrabold text-xs uppercase tracking-wider transition-all duration-300 shadow-sm hover:scale-105 flex items-center justify-center gap-2"
          >
            <span>Xem Tủ Đồ Công Khai</span>
            <ExternalLink size={14} />
          </Link>

          {/* Copy Public Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full sm:w-auto px-5 py-3.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-stone-200 cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-600" />
                <span className="text-emerald-700">Đã Copy Link!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Sao Chép Link</span>
              </>
            )}
          </button>
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

      {/* 🛡️ 3. TRUST SCORE BAR */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs p-6 sm:p-8">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="font-heading font-extrabold text-base sm:text-lg text-[#0A2517] flex items-center gap-2">
              <ShieldCheck className="text-emerald-700" size={20} /> Điểm Uy Tín (TrustScore)
            </h3>
            <p className="text-xs text-stone-500 font-light mt-1">Hoàn thành xác minh KYC và nhận đánh giá 5 sao từ khách thuê để tăng điểm.</p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-2xl sm:text-3xl font-mono font-extrabold text-[#183A2D]">{trustScore}</span>
            <span className="text-[10px] text-stone-400 font-bold uppercase">/ {maxScore} Pts</span>
          </div>
        </div>
        
        <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden relative">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 to-emerald-600 rounded-full transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between items-center mt-3 text-[10px] font-bold text-stone-400">
          <span>0 (Mới tham gia)</span>
          <span>50 (Chủ tủ đáng tin)</span>
          <span>100 (Uy tín tuyệt đối)</span>
        </div>
      </div>

      {/* 🪪 4. KYC UPLOAD MODULE */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="px-6 sm:px-8 py-4 border-b border-stone-100 bg-[#FAF9F5]">
          <h3 className="font-heading font-extrabold text-sm sm:text-base text-[#0A2517] uppercase tracking-wider">
            Xác Thực Danh Tính (KYC)
          </h3>
        </div>
        
        <div className="p-6 sm:p-8">
          {kycStatus === 'verified' ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="font-heading font-bold text-emerald-900 text-base">Đã xác minh danh tính</h4>
              <p className="text-xs text-emerald-700/90 mt-1 max-w-sm">Tài khoản của bạn đã được kiểm duyệt. Biểu tượng tick xanh đã được cấp cho các bài đăng của bạn.</p>
            </div>
          ) : kycStatus === 'pending' ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-amber-50 rounded-2xl border border-amber-100">
              <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mb-4">
                <AlertCircle size={32} />
              </div>
              <h4 className="font-heading font-bold text-amber-900 text-base">Đang chờ xét duyệt</h4>
              <p className="text-xs text-amber-700/90 mt-1 max-w-sm">Hệ thống đang kiểm tra hình ảnh thẻ Sinh viên / CCCD của bạn. Quá trình này có thể mất tới 24h.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="text-sm text-stone-600 bg-emerald-50/60 p-5 rounded-2xl border border-emerald-100">
                <p className="font-bold text-emerald-900 mb-1 flex items-center gap-2">
                  <AlertCircle size={16} /> Tại sao cần xác thực danh tính?
                </p>
                <ul className="list-disc pl-5 text-xs text-emerald-800/80 space-y-1 mt-2 font-light">
                  <li>Tăng độ tin cậy khi người khác muốn thuê đồ từ tủ của bạn.</li>
                  <li>Mở khóa tính năng rút tiền thuê về tài khoản ngân hàng.</li>
                  <li>Được cộng ngay <strong>+20 Điểm Uy Tín</strong> vào TrustScore.</li>
                </ul>
              </div>
              
              <div className="border-2 border-dashed border-stone-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-stone-50 transition-colors">
                <div className="w-12 h-12 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mb-3">
                  <Upload size={20} />
                </div>
                <h4 className="font-heading font-bold text-stone-800 text-sm sm:text-base">Tải lên Thẻ Sinh Viên hoặc CCCD</h4>
                <p className="text-[10px] text-stone-400 mt-1 mb-4">Chấp nhận JPG, PNG. Tối đa 5MB.</p>
                
                <button 
                  onClick={handleUploadId}
                  disabled={isUploadingId}
                  className="px-7 py-3 bg-[#183A2D] text-white text-xs font-bold uppercase tracking-widest rounded-full shadow-sm hover:bg-[#112a20] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isUploadingId ? "Đang tải lên..." : "Chọn ảnh tải lên"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
