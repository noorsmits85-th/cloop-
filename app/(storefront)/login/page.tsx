'use client';

import { useState, useEffect } from 'react';
import { login, loginWithOtp, verifyOtp, signup, resetPasswordForEmail, verifyRecoveryOtp, fastLoginAction, translateAuthError } from './actions';
import { Mail, Lock, KeyRound, ArrowRight, Loader2, User } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/src/utils/supabase/client';

export default function LoginPage() {
  const [mode, setMode] = useState<'LOGIN' | 'OTP_REQUEST' | 'OTP_VERIFY' | 'FORGOT_PASSWORD' | 'FORGOT_PASSWORD_OTP' | 'SIGNUP'>('LOGIN');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const nextUrl = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('next') 
      || new URLSearchParams(window.location.search).get('returnTo') 
      || new URLSearchParams(window.location.search).get('redirectTo') 
      || '' 
    : '';

  const supabase = createClient();

  // Bắt lỗi từ query params nếu có (ví dụ ?error=InvalidToken hoặc ?error=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const errParam = urlParams.get('error') || urlParams.get('error_description');
      if (errParam) {
        setMessage({ type: 'error', text: translateAuthError(errParam) });
      }
    }
  }, []);

  // ⚡ NẾU ĐÃ ĐĂNG NHẬP SẴN -> TỰ ĐỘNG CHUYỂN TIẾP NGAY LẬP TỨC
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = nextUrl || '/';
      }
    });
  }, [nextUrl]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const formData = new FormData(e.currentTarget);

    try {
      let res: any;
      if (mode === 'LOGIN') {
        res = await login(formData);
      } else if (mode === 'OTP_REQUEST') {
        res = await loginWithOtp(formData);
      } else if (mode === 'OTP_VERIFY') {
        res = await verifyOtp(formData);
      } else if (mode === 'FORGOT_PASSWORD') {
        res = await resetPasswordForEmail(formData);
      } else if (mode === 'FORGOT_PASSWORD_OTP') {
        res = await verifyRecoveryOtp(formData);
      } else if (mode === 'SIGNUP') {
        res = await signup(formData);
      }

      if (res?.error) {
        setMessage({ type: 'error', text: translateAuthError(res.error) });
      } else if (res?.redirectUrl) {
        window.location.href = res.redirectUrl;
      } else if (res?.success) {
        setMessage({ type: 'success', text: res.success });
        if (mode === 'OTP_REQUEST') setMode('OTP_VERIFY');
        if (mode === 'FORGOT_PASSWORD') setMode('FORGOT_PASSWORD_OTP');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: translateAuthError(err?.message || 'Có lỗi xảy ra, vui lòng thử lại.') });
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuthLogin(provider: 'google' | 'facebook') {
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl || '/')}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setMessage({ type: 'error', text: translateAuthError(err?.message || 'Có lỗi xảy ra khi kết nối xác thực.') });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-slate-900 mt-6 font-heading">
          {mode === 'LOGIN' && 'Đăng nhập CLOOP'}
          {mode === 'SIGNUP' && 'Tạo tài khoản mới'}
          {mode === 'OTP_REQUEST' && 'Đăng nhập không cần mật khẩu'}
          {mode === 'OTP_VERIFY' && 'Nhập mã OTP'}
          {mode === 'FORGOT_PASSWORD' && 'Khôi phục mật khẩu'}
          {mode === 'FORGOT_PASSWORD_OTP' && 'Xác nhận OTP khôi phục'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-stone-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <input type="hidden" name="nextUrl" value={nextUrl} />
            
            {mode === 'SIGNUP' && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                  Họ và tên
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="focus:ring-[#183A2D] focus:border-[#183A2D] block w-full pl-10 sm:text-sm border-slate-300 rounded-xl py-3 border bg-slate-50"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
              </div>
            )}

            {(mode === 'LOGIN' || mode === 'OTP_REQUEST' || mode === 'FORGOT_PASSWORD' || mode === 'FORGOT_PASSWORD_OTP' || mode === 'SIGNUP') && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Địa chỉ Email
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="focus:ring-[#183A2D] focus:border-[#183A2D] block w-full pl-10 sm:text-sm border-slate-300 rounded-xl py-3 border bg-slate-50"
                    placeholder="bạn@example.com"
                  />
                </div>
              </div>
            )}

            {/* Password Field - Only in LOGIN and SIGNUP */}
            {(mode === 'LOGIN' || mode === 'SIGNUP') && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Mật khẩu
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="focus:ring-[#183A2D] focus:border-[#183A2D] block w-full pl-10 sm:text-sm border-slate-300 rounded-xl py-3 border bg-slate-50"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {/* Token OTP Field */}
            {(mode === 'OTP_VERIFY' || mode === 'FORGOT_PASSWORD_OTP') && (
              <div>
                <label htmlFor="token" className="block text-sm font-medium text-slate-700">
                  Mã OTP (6 chữ số)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="token"
                    name="token"
                    type="text"
                    maxLength={6}
                    required
                    className="focus:ring-[#183A2D] focus:border-[#183A2D] block w-full pl-10 sm:text-sm border-slate-300 rounded-xl py-3 border bg-slate-50 tracking-widest text-center text-lg font-mono font-bold"
                    placeholder="123456"
                  />
                </div>
              </div>
            )}

            {/* New Password for Forgot Password OTP */}
            {mode === 'FORGOT_PASSWORD_OTP' && (
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700">
                  Mật khẩu mới
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    required
                    className="focus:ring-[#183A2D] focus:border-[#183A2D] block w-full pl-10 sm:text-sm border-slate-300 rounded-xl py-3 border bg-slate-50"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {message && (
              <div className={`p-3 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                {message.text}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-xs text-sm font-bold text-white bg-[#183A2D] hover:bg-[#0A2517] focus:outline-hidden transition-all disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    {mode === 'LOGIN' && 'Đăng nhập'}
                    {mode === 'SIGNUP' && 'Tạo tài khoản'}
                    {mode === 'OTP_REQUEST' && 'Gửi mã OTP'}
                    {mode === 'OTP_VERIFY' && 'Xác thực & Đăng nhập'}
                    {mode === 'FORGOT_PASSWORD' && 'Gửi mã khôi phục'}
                    {mode === 'FORGOT_PASSWORD_OTP' && 'Đặt lại mật khẩu'}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </div>

            {/* Đăng nhập nhanh 1 chạm qua Google & Facebook */}
            {(mode === 'LOGIN' || mode === 'SIGNUP') && (
              <div className="space-y-4 pt-1">
                <div className="relative flex items-center justify-center">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-3 text-xs text-slate-400 font-medium shrink-0">
                    hoặc tiếp tục với
                  </span>
                  <div className="border-t border-slate-200 w-full" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleOAuthLogin('google')}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-300 disabled:opacity-50 cursor-pointer"
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
                    className="flex items-center justify-center gap-2 py-2.5 px-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-300 disabled:opacity-50 cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="#1877F2" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span>Facebook</span>
                  </button>
                </div>

                {/* Nút đăng nhập nhanh 1 chạm cho môi trường Test/Dev */}
                <div className="pt-1">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={async () => {
                      setLoading(true);
                      setMessage(null);
                      try {
                        const res = await fastLoginAction({ redirectTo: nextUrl || '/' });
                        if (res?.error) {
                          setMessage({ type: 'error', text: translateAuthError(res.error) });
                        } else if (res?.redirectUrl) {
                          window.location.href = res.redirectUrl;
                        }
                      } catch (err: any) {
                        setMessage({ type: 'error', text: err?.message || 'Lỗi đăng nhập nhanh' });
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>⚡ Đăng nhập nhanh 1-chạm (Tài khoản mẫu Pilot)</span>
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Navigation Links */}
          <div className="mt-6 border-t border-slate-200 pt-4 text-center space-y-2 text-xs text-slate-600 font-medium">
            {mode === 'LOGIN' && (
              <>
                <div>
                  <button type="button" onClick={() => { setMode('OTP_REQUEST'); setMessage(null); }} className="text-slate-600 hover:text-slate-900 transition">
                    Đăng nhập không cần mật khẩu (Email OTP)
                  </button>
                </div>
                <div>
                  <button type="button" onClick={() => { setMode('FORGOT_PASSWORD'); setMessage(null); }} className="text-slate-500 hover:text-slate-800 transition">
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="pt-2">
                  <span>Chưa có tài khoản? </span>
                  <button type="button" onClick={() => { setMode('SIGNUP'); setMessage(null); }} className="text-[#183A2D] font-bold hover:underline">
                    Đăng ký ngay
                  </button>
                </div>
              </>
            )}

            {(mode === 'SIGNUP' || mode === 'OTP_REQUEST' || mode === 'OTP_VERIFY' || mode === 'FORGOT_PASSWORD' || mode === 'FORGOT_PASSWORD_OTP') && (
              <div>
                <button type="button" onClick={() => { setMode('LOGIN'); setMessage(null); }} className="text-[#183A2D] font-bold hover:underline">
                  &larr; Quay lại Đăng nhập
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
