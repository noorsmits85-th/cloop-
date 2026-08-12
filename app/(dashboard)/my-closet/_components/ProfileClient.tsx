"use client";

import React, { useState } from "react";
import { ShieldCheck, Upload, AlertCircle, CheckCircle2, User, Camera } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function ProfileClient({ userProfile }: { userProfile: any }) {
  const [isUploading, setIsUploading] = useState(false);
  const [kycStatus, setKycStatus] = useState(userProfile?.kyc_status || 'unverified'); // 'unverified', 'pending', 'verified'

  const trustScore = 45; // Giả lập: Điểm uy tín
  const maxScore = 100;
  const progressPercent = Math.min((trustScore / maxScore) * 100, 100);

  const handleUploadId = () => {
    setIsUploading(true);
    // Giả lập delay upload ảnh
    setTimeout(() => {
      setIsUploading(false);
      setKycStatus('pending');
      alert("Đã tải lên giấy tờ tuỳ thân thành công. Hệ thống CLOOP sẽ xét duyệt trong 24h.");
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* TỔNG QUAN TÀI KHOẢN */}
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-10">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-stone-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center text-stone-300">
            {userProfile?.avatar_url ? (
              <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={40} />
            )}
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-[#183A2D] text-white rounded-full flex items-center justify-center shadow-sm hover:bg-[#23452F] transition-colors border-2 border-white">
            <Camera size={14} />
          </button>
        </div>
        
        <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1">
          <h2 className="text-xl font-bold text-stone-800">{userProfile?.full_name || 'Người dùng CLOOP'}</h2>
          <span className="text-sm text-stone-500 font-mono mt-1">@{userProfile?.username || userProfile?.id?.substring(0,8)}</span>
          
          <div className="flex items-center gap-2 mt-3">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-100 flex items-center gap-1">
              <ShieldCheck size={12} /> Thành viên Cloop
            </span>
            {kycStatus === 'verified' && (
              <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-100 flex items-center gap-1">
                <CheckCircle2 size={12} /> Đã xác thực KYC
              </span>
            )}
          </div>
        </div>
      </div>

      {/* TRUST SCORE BAR */}
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-6">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="font-bold text-stone-800 flex items-center gap-2">
              <ShieldCheck className="text-emerald-600" size={18} /> Điểm Uy Tín (Trustworthy)
            </h3>
            <p className="text-xs text-stone-500 mt-1">Hoàn thành xác minh và nhận đánh giá tốt để tăng điểm.</p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-2xl font-mono font-bold text-[#183A2D]">{trustScore}</span>
            <span className="text-[10px] text-stone-400 font-bold uppercase">/ {maxScore} Pts</span>
          </div>
        </div>
        
        <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden relative">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 rounded-full transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between items-center mt-3 text-[10px] font-bold text-stone-400">
          <span>0 (Mới tham gia)</span>
          <span>100 (Uy tín tuyệt đối)</span>
        </div>
      </div>

      {/* KYC UPLOAD MODULE */}
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50">
          <h3 className="font-bold text-stone-800 text-sm uppercase tracking-wider">Xác thực danh tính (KYC)</h3>
        </div>
        
        <div className="p-6">
          {kycStatus === 'verified' ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="font-bold text-emerald-800">Đã xác minh danh tính</h4>
              <p className="text-xs text-emerald-600/80 mt-1 max-w-sm">Tài khoản của bạn đã được kiểm duyệt. Biểu tượng tick xanh đã được cấp cho các bài đăng của bạn.</p>
            </div>
          ) : kycStatus === 'pending' ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-amber-50 rounded-xl border border-amber-100">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                <AlertCircle size={32} />
              </div>
              <h4 className="font-bold text-amber-800">Đang chờ xét duyệt</h4>
              <p className="text-xs text-amber-600/80 mt-1 max-w-sm">Hệ thống đang kiểm tra hình ảnh thẻ Sinh viên / CCCD của bạn. Quá trình này có thể mất tới 24h.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="text-sm text-stone-600 bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="font-bold text-blue-800 mb-1 flex items-center gap-2"><AlertCircle size={16} /> Tại sao cần xác thực?</p>
                <ul className="list-disc pl-5 text-xs text-blue-700/80 space-y-1 mt-2">
                  <li>Tăng độ tin cậy khi người khác muốn thuê đồ của bạn.</li>
                  <li>Mở khóa tính năng rút tiền về thẻ ngân hàng.</li>
                  <li>Được cộng ngay +20 Điểm Uy Tín.</li>
                </ul>
              </div>
              
              <div className="border-2 border-dashed border-stone-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-stone-50 transition-colors">
                <div className="w-12 h-12 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mb-3">
                  <Upload size={20} />
                </div>
                <h4 className="font-bold text-stone-800 text-sm">Tải lên Thẻ Sinh Viên hoặc CCCD</h4>
                <p className="text-[10px] text-stone-400 mt-1 mb-4">Chấp nhận JPG, PNG. Tối đa 5MB.</p>
                
                <button 
                  onClick={handleUploadId}
                  disabled={isUploading}
                  className="px-6 py-2.5 bg-[#183A2D] text-white text-xs font-bold uppercase tracking-widest rounded-lg shadow-sm hover:bg-[#23452F] transition-colors disabled:opacity-50"
                >
                  {isUploading ? "Đang tải lên..." : "Chọn ảnh tải lên"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
