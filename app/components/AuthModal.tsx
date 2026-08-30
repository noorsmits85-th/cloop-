'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Lock, Mail, User as UserIcon, Loader2 } from 'lucide-react';
import { createClient } from '@/src/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginWithCredentials, registerWithCredentials } from '@/app/(storefront)/login/actions';

export default function AuthModal({ 
  isOpen, 
  onClose, 
  darkMode,
  onSuccess
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  darkMode: boolean;
  onSuccess: (userSession: any) => void;
}) {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD'>('LOGIN');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string || '').trim();
    const password = (formData.get('password') as string || '');
    const name = (formData.get('username') as string || '').trim();

    try {
      if (mode === 'SIGNUP') {
        const redirectTo = searchParams.get('redirectTo') || undefined;
        const res = await registerWithCredentials({ email, password, name, redirectTo });
        if (res.error) throw new Error(res.error);

        onSuccess({ 
          name: res.user?.name || name || email.split('@')[0], 
          email: email, 
          isLoggedIn: true,
          id: res.user?.id
        });
        onClose();
        if (res.redirectUrl && res.redirectUrl !== '/') {
          router.push(res.redirectUrl);
        } else {
          router.refresh();
        }
      } 
      else if (mode === 'LOGIN') {
        const redirectTo = searchParams.get('redirectTo') || undefined;
        const res = await loginWithCredentials({ email, password, redirectTo });
        if (res.error) throw new Error(res.error);
        
        onSuccess({ 
          name: res.user?.name || email.split('@')[0], 
          email: email, 
          isLoggedIn: true,
          id: res.user?.id
        });
        onClose();

        if (res.redirectUrl && res.redirectUrl !== '/') {
          router.push(res.redirectUrl);
        } else {
          router.refresh();
        }
      }
      else if (mode === 'FORGOT_PASSWORD') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });
        if (error) throw error;
        setSuccessMsg('Đã gửi hướng dẫn khôi phục mật khẩu vào Email của bạn!');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra, vui lòng kiểm tra lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 10 }} 
        className={`p-8 rounded-[2rem] max-w-[420px] w-full text-center shadow-2xl relative space-y-6 mx-auto border transition-colors ${darkMode ? "bg-[#18222B] border-[#2B3946]" : "bg-[#FAF8F3] border-[#E9E2D8]"}`}
      >
        <button 
          type="button" 
          onClick={onClose} 
          className="absolute top-6 right-6 text-gray-400 hover:text-[#183A2D] dark:hover:text-white transition p-1"
        >
          <X size={18} />
        </button>
        
        {/* Header Icon */}
        <div className="w-12 h-12 rounded-2xl bg-[#183A2D]/10 text-[#183A2D] dark:text-emerald-400 flex items-center justify-center mx-auto border border-[#183A2D]/20 shadow-xs">
          <Shield size={22} />
        </div>
        
        {/* Title */}
        <div className="text-center space-y-1">
          <h3 className="font-heading text-2xl font-bold uppercase tracking-wider text-[#183A2D] dark:text-white">
            {mode === 'LOGIN' ? 'Đăng Nhập CLOOP' : mode === 'SIGNUP' ? 'Kích Hoạt ID Xanh' : 'Khôi Phục Mật Khẩu'}
          </h3>
          <p className="text-[11px] text-gray-500 font-medium">
            {mode === 'LOGIN' && 'Đồng bộ hóa tủ đồ và trải nghiệm thời trang tuần hoàn.'}
            {mode === 'SIGNUP' && 'Tạo tài khoản ID Xanh để thuê đồ, quản lý tủ đồ & tích Xu Lá.'}
            {mode === 'FORGOT_PASSWORD' && 'Nhập email để nhận liên kết đặt lại mật khẩu.'}
          </p>
        </div>

        {/* Tab Switcher */}
        {mode !== 'FORGOT_PASSWORD' && (
          <div className="grid grid-cols-2 p-1 rounded-xl bg-stone-200/60 dark:bg-[#0F1720] border border-stone-200 dark:border-[#2B3946]">
            <button
              type="button"
              onClick={() => { setMode('LOGIN'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                mode === 'LOGIN' 
                  ? 'bg-white dark:bg-[#18222B] text-[#183A2D] dark:text-white shadow-xs' 
                  : 'text-gray-500 hover:text-stone-800 dark:hover:text-gray-300'
              }`}
            >
              Đăng Nhập
            </button>
            <button
              type="button"
              onClick={() => { setMode('SIGNUP'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                mode === 'SIGNUP' 
                  ? 'bg-white dark:bg-[#18222B] text-[#183A2D] dark:text-white shadow-xs' 
                  : 'text-gray-500 hover:text-stone-800 dark:hover:text-gray-300'
              }`}
            >
              Đăng Ký
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-left">
          {mode === 'SIGNUP' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <UserIcon size={12} /> Họ và tên / Biệt danh
              </label>
              <input 
                type="text" 
                name="username" 
                autoComplete="name" 
                required 
                placeholder="Ví dụ: Trang Hoàng" 
                className={`w-full px-4 py-2.5 border rounded-xl text-xs font-medium outline-none transition-all ${darkMode ? "bg-[#0F1720] border-[#2B3946] text-white focus:border-emerald-500" : "bg-white border-[#E9E2D8] text-[#183A2D] focus:border-[#183A2D] shadow-xs"}`} 
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Mail size={12} /> Địa chỉ Email
            </label>
            <input 
              type="email" 
              name="email" 
              autoComplete="email" 
              required 
              placeholder="member@cloop.vn" 
              className={`w-full px-4 py-2.5 border rounded-xl text-xs font-medium outline-none transition-all ${darkMode ? "bg-[#0F1720] border-[#2B3946] text-white focus:border-emerald-500" : "bg-white border-[#E9E2D8] text-[#183A2D] focus:border-[#183A2D] shadow-xs"}`} 
            />
          </div>

          {mode !== 'FORGOT_PASSWORD' && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Lock size={12} /> Mật khẩu bảo mật
                </label>
                {mode === 'LOGIN' && (
                  <button 
                    type="button" 
                    onClick={() => { setMode('FORGOT_PASSWORD'); setErrorMsg(''); setSuccessMsg(''); }} 
                    className="text-[10px] font-bold text-gray-400 hover:text-[#183A2D] transition hover:underline"
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <input 
                type="password" 
                name="password" 
                autoComplete={mode === 'LOGIN' ? "current-password" : "new-password"} 
                required 
                placeholder="••••••••" 
                className={`w-full px-4 py-2.5 border rounded-xl text-xs font-medium outline-none transition-all ${darkMode ? "bg-[#0F1720] border-[#2B3946] text-white focus:border-emerald-500" : "bg-white border-[#E9E2D8] text-[#183A2D] focus:border-[#183A2D] shadow-xs"}`} 
              />
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-red-600 text-center font-semibold bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 py-2.5 px-3 rounded-xl">
              {errorMsg}
            </p>
          )}
          {successMsg && (
            <p className="text-xs text-emerald-700 text-center font-semibold bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 py-2.5 px-3 rounded-xl">
              {successMsg}
            </p>
          )}

          <button 
            disabled={loading} 
            type="submit" 
            className="w-full flex items-center justify-center gap-2 font-ui text-xs font-bold uppercase tracking-widest bg-[#183A2D] hover:bg-[#112a20] text-white py-3.5 rounded-full shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer mt-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'ĐANG XỬ LÝ...' : mode === 'SIGNUP' ? 'KÍCH HOẠT TÀI KHOẢN' : mode === 'LOGIN' ? 'ĐĂNG NHẬP NGAY' : 'GỬI YÊU CẦU'}
          </button>
        </form> 

        {mode === 'FORGOT_PASSWORD' && (
          <div className="pt-2 text-center">
            <button 
              type="button" 
              onClick={() => { setMode('LOGIN'); setErrorMsg(''); setSuccessMsg(''); }} 
              className="text-xs font-bold text-[#183A2D] hover:underline"
            >
              ← Quay lại Đăng nhập
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
