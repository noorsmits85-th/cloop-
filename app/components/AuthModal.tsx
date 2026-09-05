'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Shield } from 'lucide-react';
import { createClient } from '@/src/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginWithCredentials, registerWithCredentials } from '@/app/(storefront)/login/actions';
import { translateAuthError } from '@/src/utils/authErrors';

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
      setErrorMsg(translateAuthError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(translateAuthError(err.message || 'Lỗi kết nối dịch vụ xác thực'));
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

          <button disabled={loading} type="submit" className="w-full font-body text-xs font-bold uppercase tracking-widest bg-[#183A2D] text-white py-3.5 rounded-full shadow-md text-center hover:bg-[#254F3B] transition mt-2 disabled:opacity-50 cursor-pointer">
            {loading ? 'ĐANG XỬ LÝ...' : mode === 'SIGNUP' ? 'KÍCH HOẠT TÀI KHOẢN NGAY' : mode === 'LOGIN' ? 'ĐĂNG NHẬP NGAY' : 'GỬI YÊU CẦU'}
          </button>

          {/* Nút đăng nhập Google & Facebook */}
          {(mode === 'LOGIN' || mode === 'SIGNUP') && (
            <div className="space-y-3 pt-2">
              <div className="relative flex items-center justify-center">
                <div className={`border-t w-full ${darkMode ? "border-[#2B3946]" : "border-[#E9E2D8]"}`} />
                <span className={`px-2.5 text-[11px] font-medium shrink-0 ${darkMode ? "text-gray-400 bg-[#18222B]" : "text-gray-400 bg-[#FAF8F3]"}`}>
                  hoặc
                </span>
                <div className={`border-t w-full ${darkMode ? "border-[#2B3946]" : "border-[#E9E2D8]"}`} />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleOAuthLogin('google')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 border rounded-full text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer ${
                    darkMode 
                      ? "bg-[#0F1720] border-[#2B3946] text-white hover:bg-[#1f2c38]" 
                      : "bg-white border-[#E9E2D8] text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleOAuthLogin('facebook')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 border rounded-full text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer ${
                    darkMode 
                      ? "bg-[#0F1720] border-[#2B3946] text-white hover:bg-[#1f2c38]" 
                      : "bg-white border-[#E9E2D8] text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>Facebook</span>
                </button>
              </div>
            </div>
          )}
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
