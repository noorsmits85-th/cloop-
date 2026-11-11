'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/src/utils/supabase/server';
import { translateAuthError } from '@/src/utils/authErrors';
import { checkRateLimit } from '@/src/utils/rate-limit';
import { checkEdgeRateLimit } from '@/src/lib/rate-limit';

const MIN_PASSWORD_LENGTH = 8;

export interface AuthActionResult {
  success?: boolean;
  error?: string;
  redirectUrl?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
}

function getEmail(formData: FormData) {
  return String(formData.get('email') || '').trim().toLowerCase();
}

function getPassword(formData: FormData) {
  return String(formData.get('password') || '');
}

function getSafeRedirectUrl(rawUrl: unknown, fallback: string = '/'): string {
  const str = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (str && str.startsWith('/') && !str.startsWith('//') && !str.startsWith('/\\')) {
    return str;
  }
  return fallback;
}

async function enforceAuthActionRateLimit(
  actionName: string,
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 60 * 1000
): Promise<{ allowed: boolean; resetInSec: number }> {
  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    hdrs.get('x-real-ip') ||
    'unknown';
  const key = `${actionName}:${ip}:${identifier}`;

  const localRl = checkRateLimit(key, maxRequests, windowMs);
  if (!localRl.success) {
    return { allowed: false, resetInSec: localRl.resetInSec };
  }

  const edgeRl = await checkEdgeRateLimit(key, 'auth');
  if (!edgeRl.success) {
    const resetInSec = edgeRl.reset
      ? Math.max(1, Math.ceil((edgeRl.reset - Date.now()) / 1000))
      : 60;
    return { allowed: false, resetInSec };
  }

  return { allowed: true, resetInSec: 0 };
}

export async function login(formData: FormData): Promise<AuthActionResult> {
  const supabase = await createClient();

  const email = getEmail(formData);
  const rawPassword = getPassword(formData);
  const password = rawPassword.trim();

  if (!email || !password) {
    return { error: 'Email và mật khẩu là bắt buộc.' };
  }

  // 🛡️ CHỐNG TẤN CÔNG HYDRA / BRUTE-FORCE: Khóa ngay sau 5 lần thử/phút
  const rl = await enforceAuthActionRateLimit('login', email, 5, 60 * 1000);
  if (!rl.allowed) {
    return {
      error: `Phát hiện quá nhiều lần thử đăng nhập không hợp lệ. Vui lòng thử lại sau ${rl.resetInSec} giây.`,
    };
  }

  // 1. Thử đăng nhập lần 1 với mật khẩu đã trim
  let { data: signInData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // 2. Nếu thất bại và mật khẩu gốc khác mật khẩu trim, thử mật khẩu gốc
  if (error && rawPassword !== password) {
    const rawAttempt = await supabase.auth.signInWithPassword({
      email,
      password: rawPassword,
    });
    if (!rawAttempt.error && rawAttempt.data?.user) {
      signInData = rawAttempt.data;
      error = null;
    }
  }

  if (error || !signInData?.user) {
    return { error: translateAuthError(error?.message || 'Đăng nhập không thành công') };
  }

  // Đồng bộ User Prisma (Tuyệt đối không dùng email_confirmed_at làm định danh pháp lý isVerified)
  try {
    const { prisma } = await import('@/src/lib/prisma');
    const userName =
      signInData.user.user_metadata?.name ||
      signInData.user.user_metadata?.full_name ||
      email.split('@')[0];
    await prisma.user.upsert({
      where: { id: signInData.user.id },
      update: { email: email },
      create: {
        id: signInData.user.id,
        email: email,
        password: 'supabase_auth_managed',
        name: userName,
        walletBalance: 0,
        cloopCoins: 100,
        role: 'USER',
        isVerified: false,
      },
    });
  } catch (syncErr) {
    // TODO: Tích hợp hệ thống tracking (Sentry/LogRocket) để giám sát lỗi đồng bộ User khi đăng nhập
    Sentry.captureException(syncErr);
  }

  const nextUrl = getSafeRedirectUrl(
    formData.get('nextUrl') || formData.get('redirectTo'),
    '/'
  );
  try {
    revalidatePath(nextUrl);
  } catch (_) {}

  return {
    success: true,
    redirectUrl: nextUrl,
    user: {
      id: signInData.user?.id,
      name: signInData.user?.user_metadata?.name || email.split('@')[0],
      email: email,
    },
  };
}

export async function loginWithOtp(formData: FormData) {
  const supabase = await createClient();
  const email = getEmail(formData);

  if (!email) {
    return { error: 'Email là bắt buộc.' };
  }

  const rl = await enforceAuthActionRateLimit('login_otp', email, 3, 60 * 1000);
  if (!rl.allowed) {
    return {
      error: `Bạn đã yêu cầu mã OTP quá nhiều lần. Vui lòng thử lại sau ${rl.resetInSec} giây.`,
    };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloop-sable.vercel.app'}/auth/callback`,
    },
  });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  return {
    success: 'Đã gửi mã OTP (Magic Link) vào Email của bạn! Vui lòng kiểm tra hộp thư.',
  };
}

export async function verifyOtp(formData: FormData) {
  const supabase = await createClient();
  const email = getEmail(formData);
  const token = String(formData.get('token') || '').trim();

  if (!email || !/^\d{6}$/.test(token)) {
    return { error: 'Mã OTP không hợp lệ (cần đủ 6 chữ số).' };
  }

  const rl = await enforceAuthActionRateLimit('verify_otp', email, 5, 5 * 60 * 1000);
  if (!rl.allowed) {
    return {
      error: `Phát hiện quá nhiều lần nhập sai mã OTP. Vui lòng thử lại sau ${rl.resetInSec} giây.`,
    };
  }

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) {
    return {
      error: translateAuthError(error.message) || 'Mã OTP không hợp lệ hoặc đã hết hạn.',
    };
  }

  const nextUrl = getSafeRedirectUrl(formData.get('nextUrl'), '/');
  try {
    revalidatePath(nextUrl, 'layout');
  } catch (_) {}

  return { success: true, redirectUrl: nextUrl };
}

export async function resetPasswordForEmail(formData: FormData) {
  const supabase = await createClient();
  const email = getEmail(formData);

  if (!email) {
    return { error: 'Email là bắt buộc.' };
  }

  const rl = await enforceAuthActionRateLimit('reset_password', email, 3, 5 * 60 * 1000);
  if (!rl.allowed) {
    return {
      error: `Bạn đã yêu cầu khôi phục mật khẩu quá nhiều lần. Vui lòng thử lại sau ${rl.resetInSec} giây.`,
    };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloop-sable.vercel.app'}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  return { success: 'Đã gửi mã OTP khôi phục mật khẩu vào Email!' };
}

export async function verifyRecoveryOtp(formData: FormData) {
  const supabase = await createClient();
  const email = getEmail(formData);
  const token = String(formData.get('token') || '').trim();
  const newPassword = String(formData.get('newPassword') || '');

  if (!email || !token || !newPassword) {
    return { error: 'Vui lòng điền đầy đủ thông tin.' };
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { error: `Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.` };
  }

  const rl = await enforceAuthActionRateLimit(
    'verify_recovery_otp',
    email,
    5,
    5 * 60 * 1000
  );
  if (!rl.allowed) {
    return {
      error: `Quá nhiều lần thử mã khôi phục không hợp lệ. Vui lòng thử lại sau ${rl.resetInSec} giây.`,
    };
  }

  const { error: otpError } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'recovery',
  });

  if (otpError) {
    return {
      error:
        translateAuthError(otpError.message) ||
        'Mã OTP khôi phục không đúng hoặc đã hết hạn.',
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { error: translateAuthError(updateError.message) };
  }

  return {
    success: 'Mật khẩu đã được cập nhật thành công! Bạn có thể đăng nhập ngay.',
    redirectUrl: '/login',
  };
}

export async function signup(formData: FormData): Promise<AuthActionResult> {
  const supabase = await createClient();

  const email = getEmail(formData);
  const password = getPassword(formData);
  const name =
    String(formData.get('name') || formData.get('username') || '').trim() ||
    email.split('@')[0];

  if (!email || !password) {
    return { error: 'Email và mật khẩu là bắt buộc.' };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.` };
  }

  const rl = await enforceAuthActionRateLimit('signup', email, 5, 60 * 1000);
  if (!rl.allowed) {
    return {
      error: `Thao tác đăng ký quá nhanh. Vui lòng thử lại sau ${rl.resetInSec} giây.`,
    };
  }

  // 1. Tạo tài khoản trong Supabase Auth
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        full_name: name,
      },
    },
  });

  if (signUpError) {
    if (
      signUpError.message?.includes('already registered') ||
      signUpError.message?.includes('User already exists')
    ) {
      return login(formData);
    }
    return { error: translateAuthError(signUpError.message) };
  }

  const authUserId = signUpData.user?.id;

  // 2. Đồng bộ hồ sơ người dùng vào Prisma (không ghi đè tên của tài khoản đã tồn tại/đã xác thực)
  try {
    const { prisma } = await import('@/src/lib/prisma');
    if (authUserId) {
      const existingUser =
        typeof prisma.user.findUnique === 'function'
          ? await prisma.user.findUnique({
              where: { id: authUserId },
              select: { id: true, name: true, isVerified: true },
            })
          : null;
      const shouldSetInitialName =
        !existingUser?.isVerified && !existingUser?.name?.trim();
      await prisma.user.upsert({
        where: { id: authUserId },
        update: {
          email,
          ...(shouldSetInitialName ? { name } : {}),
        },
        create: {
          id: authUserId,
          email,
          password: 'supabase_auth_managed',
          name,
          walletBalance: 0,
          cloopCoins: 100,
          role: 'USER',
          isVerified: false,
        },
      });
    }
  } catch (dbSyncErr) {
    // TODO: Tích hợp hệ thống tracking (Sentry/LogRocket) để theo dõi lỗi đồng bộ hồ sơ khi đăng ký
    Sentry.captureException(dbSyncErr);
  }

  // 3. Đăng nhập nếu Supabase đã cấp phiên
  const { data: signInData } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  const nextUrl = getSafeRedirectUrl(
    formData.get('nextUrl') || formData.get('redirectTo'),
    '/'
  );
  try {
    revalidatePath(nextUrl, 'layout');
  } catch (_) {}

  return {
    success: true,
    redirectUrl: nextUrl,
    user: {
      id: authUserId || signInData?.user?.id,
      name,
      email,
    },
  };
}

export async function loginWithCredentials({
  email,
  password,
  redirectTo,
}: {
  email: string;
  password: string;
  redirectTo?: string;
}): Promise<AuthActionResult> {
  const formData = new FormData();
  formData.set('email', email.trim().toLowerCase());
  formData.set('password', password);
  if (redirectTo) formData.set('redirectTo', redirectTo);
  return login(formData);
}

export async function registerWithCredentials({
  email,
  password,
  name,
  redirectTo,
}: {
  email: string;
  password: string;
  name?: string;
  redirectTo?: string;
}): Promise<AuthActionResult> {
  const formData = new FormData();
  formData.set('email', email.trim().toLowerCase());
  formData.set('password', password);
  if (name) formData.set('name', name.trim());
  if (redirectTo) formData.set('redirectTo', redirectTo);
  return signup(formData);
}
