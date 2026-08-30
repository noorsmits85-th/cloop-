'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Shield } from 'lucide-react';
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
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP' | 'OTP' | 'FORGOT_PASSWORD'>('LOGIN');
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
      else if (mode === 'OTP') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setSuccessMsg('Đã gửi mã OTP (Magic Link) vào Email của bạn!');
      }
      else if (mode === 'FORGOT_PASSWORD') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });
        if (error) throw error;
        setSuccessMsg('Đã gửi link khôi phục mật khẩu vào Email!');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (mode === 'SIGNUP') return 'KÍCH HOẠT ID XANH CLOOP';
    if (mode === 'LOGIN') return 'ĐĂNG NHẬP CLOOP';
    if (mode === 'OTP') return 'ĐĂNG NHẬP BẰNG OTP';
    if (mode === 'FORGOT_PASSWORD') return 'KHÔI PHỤC MẬT KHẨU';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        exit={{ opacity: 0, scale: 0.95 }} 
        className={`p-8 rounded-[2.5rem] max-w-[420px] w-full text-center shadow-2xl relative space-y-5 mx-auto border ${darkMode ? "bg-[#18222B] border-[#2B3946]" : "bg-[#FAF8F3] border-[#E9E2D8]"}`}
      >
        <button type="button" onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-[#183A2D] transition">
          <X size={18} />
        </button>
        
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2 mx-auto border border-emerald-200">
          <Shield size={20} className="animate-pulse" />
        </div>
        
        <div className="text-center space-y-1">
          <h3 className="font-heading text-xl sm:text-2xl font-bold uppercase tracking-wide">
            {getTitle()}
          </h3>
          <p className="text-[11px] text-gray-500">
            {mode === 'SIGNUP' && 'Đăng ký tài khoản bảo mật để đồng bộ hóa và quản lý kệ đồ cá nhân.'}
            {mode === 'LOGIN' && 'Chào mừng trở lại! Đăng nhập để tiếp tục khám phá tủ đồ xanh.'}
            {mode === 'OTP' && 'Nhập email để nhận liên kết đăng nhập không cần mật khẩu.'}
            {mode === 'FORGOT_PASSWORD' && 'Nhập email để nhận liên kết đặt lại mật khẩu của bạn.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-left">
          {mode === 'SIGNUP' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Biệt danh công khai</label>
              <input type="text" name="username" autoComplete="username" required placeholder="Ví dụ: abc..." className={`w-full px-4 py-2.5 border rounded-xl text-xs font-medium outline-none transition-colors ${darkMode ? "bg-[#0F1720] border-[#2B3946] text-white focus:border-emerald-500" : "bg-[#F4F1EA] border-[#E9E2D8] text-[#183A2D] focus:border-[#183A2D] focus:bg-white"}`} />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Địa chỉ Email</label>
            <input type="email" name="email" autoComplete="email" required placeholder="member@cloop.vn" className={`w-full px-4 py-2.5 border rounded-xl text-xs font-medium outline-none transition-colors ${darkMode ? "bg-[#0F1720] border-[#2B3946] text-white focus:border-emerald-500" : "bg-[#F4F1EA] border-[#E9E2D8] text-[#183A2D] focus:border-[#183A2D] focus:bg-white"}`} />
          </div>

          {(mode === 'LOGIN' || mode === 'SIGNUP') && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Mật khẩu bảo mật</label>
              <input type="password" name="password" autoComplete="current-password" required placeholder="••••••••" className={`w-full px-4 py-2.5 border rounded-xl text-xs font-medium outline-none transition-colors ${darkMode ? "bg-[#0F1720] border-[#2B3946] text-white focus:border-emerald-500" : "bg-[#F4F1EA] border-[#E9E2D8] text-[#183A2D] focus:border-[#183A2D] focus:bg-white"}`} />
            </div>
          )}

          {errorMsg && <p className="text-xs text-red-500 text-center font-medium bg-red-50 py-2 rounded-lg">{errorMsg}</p>}
          {successMsg && <p className="text-xs text-emerald-600 text-center font-medium bg-emerald-50 py-2 rounded-lg">{successMsg}</p>}

          <button disabled={loading} type="submit" className="w-full font-body text-xs font-bold uppercase tracking-widest bg-[#183A2D] text-white py-3.5 rounded-full shadow-md text-center hover:bg-[#254F3B] transition mt-2 disabled:opacity-50">
            {loading ? 'ĐANG XỬ LÝ...' : mode === 'SIGNUP' ? 'KÍCH HOẠT TÀI KHOẢN NGAY' : mode === 'LOGIN' ? 'ĐĂNG NHẬP NGAY' : 'GỬI YÊU CẦU'}
          </button>
        </form> 

        <div className="pt-3 border-t border-gray-200/50 flex flex-col space-y-2">
          {mode === 'LOGIN' && (
            <>
              <button onClick={() => { setMode('FORGOT_PASSWORD'); setErrorMsg(''); setSuccessMsg(''); }} className="text-xs font-medium text-gray-500 hover:text-[#183A2D] transition">
                Quên mật khẩu?
              </button>
              <button onClick={() => { setMode('OTP'); setErrorMsg(''); setSuccessMsg(''); }} className="text-xs font-medium text-emerald-700 hover:text-emerald-800 transition">
                Đăng nhập bằng mã OTP (Email)
              </button>
              <button onClick={() => { setMode('SIGNUP'); setErrorMsg(''); setSuccessMsg(''); }} className="text-xs font-bold text-[#183A2D] hover:underline transition pt-2">
                Chưa có tài khoản? Kích hoạt ngay
              </button>
            </>
          )}
          
          {mode !== 'LOGIN' && (
            <button onClick={() => { setMode('LOGIN'); setErrorMsg(''); setSuccessMsg(''); }} className="text-xs font-medium text-gray-500 hover:text-[#183A2D] transition">
              Quay lại Đăng nhập bằng Mật khẩu
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
