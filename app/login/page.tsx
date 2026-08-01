'use client';

import { useState } from 'react';
import { login, loginWithOtp, verifyOtp, signup, resetPasswordForEmail } from './actions';
import { Mail, Lock, KeyRound, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [mode, setMode] = useState<'LOGIN' | 'OTP_REQUEST' | 'OTP_VERIFY' | 'FORGOT_PASSWORD' | 'SIGNUP'>('LOGIN');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const formData = new FormData(e.currentTarget);

    try {
      let result;
      if (mode === 'LOGIN') {
        result = await login(formData);
      } else if (mode === 'OTP_REQUEST') {
        result = await loginWithOtp(formData);
      } else if (mode === 'OTP_VERIFY') {
        result = await verifyOtp(formData);
      } else if (mode === 'FORGOT_PASSWORD') {
        result = await resetPasswordForEmail(formData);
      } else if (mode === 'SIGNUP') {
        result = await signup(formData);
      }

      if (result?.error) {
        setMessage({ type: 'error', text: result.error });
      } else if (result?.success) {
        setMessage({ type: 'success', text: result.success });
        if (mode === 'OTP_REQUEST') setMode('OTP_VERIFY');
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Có lỗi xảy ra, vui lòng thử lại.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-green-600 mb-6">
          <Sparkles className="w-12 h-12" />
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900">
          {mode === 'LOGIN' && 'Đăng nhập CLOOP'}
          {mode === 'SIGNUP' && 'Tạo tài khoản mới'}
          {mode === 'OTP_REQUEST' && 'Đăng nhập không cần mật khẩu'}
          {mode === 'OTP_VERIFY' && 'Nhập mã OTP'}
          {mode === 'FORGOT_PASSWORD' && 'Khôi phục mật khẩu'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Field - Used in all modes */}
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
                  className="focus:ring-green-500 focus:border-green-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-xl py-3 border bg-slate-50"
                  placeholder="bạn@example.com"
                />
              </div>
            </div>

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
                    className="focus:ring-green-500 focus:border-green-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-xl py-3 border bg-slate-50"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {/* OTP Token Field - Only in OTP_VERIFY */}
            {mode === 'OTP_VERIFY' && (
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
                    required
                    className="focus:ring-green-500 focus:border-green-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-xl py-3 border bg-slate-50 text-center tracking-widest font-bold text-lg"
                    placeholder="123456"
                  />
                </div>
              </div>
            )}

            {/* Messages */}
            {message && (
              <div className={`p-4 rounded-xl text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {message.text}
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                  <>
                    {mode === 'LOGIN' && 'Đăng nhập'}
                    {mode === 'SIGNUP' && 'Tạo tài khoản'}
                    {mode === 'OTP_REQUEST' && 'Gửi mã OTP'}
                    {mode === 'OTP_VERIFY' && 'Xác nhận OTP'}
                    {mode === 'FORGOT_PASSWORD' && 'Khôi phục mật khẩu'}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Mode Switchers */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">Hoặc</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3">
              {mode === 'LOGIN' && (
                <>
                  <button onClick={() => { setMode('OTP_REQUEST'); setMessage(null); }} className="w-full inline-flex justify-center py-2 px-4 border border-slate-300 rounded-xl shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Đăng nhập bằng mã OTP (Email)
                  </button>
                  <button onClick={() => { setMode('FORGOT_PASSWORD'); setMessage(null); }} className="w-full text-center text-sm font-medium text-green-600 hover:text-green-500">
                    Quên mật khẩu?
                  </button>
                  <button onClick={() => { setMode('SIGNUP'); setMessage(null); }} className="w-full text-center text-sm font-medium text-slate-600 hover:text-slate-900 mt-2">
                    Chưa có tài khoản? Đăng ký ngay
                  </button>
                </>
              )}
              {mode !== 'LOGIN' && (
                <button onClick={() => { setMode('LOGIN'); setMessage(null); }} className="w-full inline-flex justify-center py-2 px-4 border border-slate-300 rounded-xl shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Quay lại Đăng nhập bằng Mật khẩu
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
