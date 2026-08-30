'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/src/utils/supabase/server';

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

export async function login(formData: FormData): Promise<AuthActionResult> {
  const supabase = await createClient();

  const email = getEmail(formData);
  const password = getPassword(formData);

  if (!email || !password) {
    return { error: 'Email và mật khẩu là bắt buộc.' };
  }

  // Tự động gỡ rào cản email_confirmed_at nếu tài khoản chưa confirm
  try {
    const { prisma } = await import('@/src/lib/prisma');
    await prisma.$executeRawUnsafe(
      `UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = $1 AND email_confirmed_at IS NULL;`,
      email
    );
  } catch (_) {}

  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Đảm bảo sync vào Prisma User
  if (signInData.user?.id) {
    try {
      const { prisma } = await import('@/src/lib/prisma');
      const userName = signInData.user.user_metadata?.name || signInData.user.user_metadata?.full_name || email.split('@')[0];
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
          isVerified: true
        }
      });
    } catch (_) {}
  }

  const nextUrl = (formData.get('nextUrl') as string) || (formData.get('redirectTo') as string) || '/';
  try {
    revalidatePath(nextUrl, 'layout');
  } catch (_) {}

  return { 
    success: true, 
    redirectUrl: nextUrl,
    user: {
      id: signInData.user?.id,
      name: signInData.user?.user_metadata?.name || email.split('@')[0],
      email: email
    }
  };
}

export async function loginWithOtp(formData: FormData) {
  const supabase = await createClient();
  const email = getEmail(formData);

  if (!email) {
    return { error: 'Email là bắt buộc.' };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloop-sable.vercel.app'}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: 'Đã gửi mã OTP (Magic Link) vào Email của bạn! Vui lòng kiểm tra hộp thư.' };
}

export async function verifyOtp(formData: FormData) {
  const supabase = await createClient();
  const email = getEmail(formData);
  const token = String(formData.get('token') || '').trim();

  if (!email || !/^\d{6}$/.test(token)) {
    return { error: 'Mã OTP không hợp lệ.' };
  }

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) {
    return { error: 'Mã OTP không hợp lệ hoặc đã hết hạn.' };
  }

  const nextUrl = (formData.get('nextUrl') as string) || '/';
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

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloop-sable.vercel.app'}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
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

  const { error: otpError } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'recovery',
  });

  if (otpError) {
    return { error: 'Mã OTP khôi phục không đúng hoặc đã hết hạn.' };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { error: updateError.message };
  }

  return { success: 'Mật khẩu đã được cập nhật thành công! Bạn có thể đăng nhập ngay.', redirectUrl: '/login' };
}

export async function signup(formData: FormData): Promise<AuthActionResult> {
  const supabase = await createClient();

  const email = getEmail(formData);
  const password = getPassword(formData);
  const name = String(formData.get('name') || formData.get('username') || '').trim() || email.split('@')[0];

  if (!email || !password) {
    return { error: 'Email và mật khẩu là bắt buộc.' };
  }

  if (password.length < 6) {
    return { error: `Mật khẩu phải có ít nhất 6 ký tự.` };
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
    // Nếu tài khoản đã tồn tại, tự động chuyển sang đăng nhập
    if (signUpError.message?.includes("already registered") || signUpError.message?.includes("User already exists")) {
      return login(formData);
    }
    return { error: signUpError.message };
  }

  const authUserId = signUpData.user?.id;

  // 2. Tự động xác thực email trực tiếp trên Postgres (Tránh kẹt Email Confirmation)
  try {
    const { prisma } = await import('@/src/lib/prisma');
    await prisma.$executeRawUnsafe(
      `UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = $1;`,
      email
    );
    if (authUserId) {
      await prisma.user.upsert({
        where: { id: authUserId },
        update: { name },
        create: {
          id: authUserId,
          email,
          password: 'supabase_auth_managed',
          name,
          walletBalance: 0,
          cloopCoins: 100,
          role: 'USER',
          isVerified: true
        }
      });
    }
  } catch (dbSyncErr) {
    console.error('DB Sync Error during signup:', dbSyncErr);
  }

  // 3. Đăng nhập ngay lập tức để cấp Cookie Session cho trình duyệt
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.warn('Auto signIn after signup notice:', signInError.message);
  }

  const nextUrl = (formData.get('nextUrl') as string) || (formData.get('redirectTo') as string) || '/';
  try {
    revalidatePath(nextUrl, 'layout');
  } catch (_) {}

  return { 
    success: true, 
    redirectUrl: nextUrl,
    user: {
      id: authUserId || signInData?.user?.id,
      name,
      email
    }
  };
}

export async function loginWithCredentials({ email, password, redirectTo }: { email: string; password: string; redirectTo?: string }): Promise<AuthActionResult> {
  const formData = new FormData();
  formData.set('email', email);
  formData.set('password', password);
  if (redirectTo) formData.set('redirectTo', redirectTo);
  return login(formData);
}

export async function registerWithCredentials({ email, password, name, redirectTo }: { email: string; password: string; name?: string; redirectTo?: string }): Promise<AuthActionResult> {
  const formData = new FormData();
  formData.set('email', email);
  formData.set('password', password);
  if (name) formData.set('name', name);
  if (redirectTo) formData.set('redirectTo', redirectTo);
  return signup(formData);
}
