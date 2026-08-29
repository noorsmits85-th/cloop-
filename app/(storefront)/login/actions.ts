'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/src/utils/supabase/server';

const MIN_PASSWORD_LENGTH = 8;

function getEmail(formData: FormData) {
  return String(formData.get('email') || '').trim().toLowerCase();
}

function getPassword(formData: FormData) {
  return String(formData.get('password') || '');
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = getEmail(formData);
  const password = getPassword(formData);

  if (!email || !password) {
    return { error: 'Email và mật khẩu là bắt buộc.' };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const nextUrl = (formData.get('nextUrl') as string) || '/';
  try {
    revalidatePath(nextUrl, 'layout');
  } catch (_) {}

  return { success: true, redirectUrl: nextUrl };
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

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = getEmail(formData);
  const password = getPassword(formData);
  const name = String(formData.get('name') || '').trim();

  if (!email || !password) {
    return { error: 'Email và mật khẩu là bắt buộc.' };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.` };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name || email.split('@')[0],
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  const nextUrl = (formData.get('nextUrl') as string) || '/';
  try {
    revalidatePath(nextUrl, 'layout');
  } catch (_) {}

  return { success: true, redirectUrl: nextUrl };
}
