'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
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
    return { error: 'Email va mat khau la bat buoc.' };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const nextUrl = formData.get('nextUrl') as string;
  revalidatePath(nextUrl || '/', 'layout');
  redirect(nextUrl || '/');
}

export async function loginWithOtp(formData: FormData) {
  const supabase = await createClient();
  const email = getEmail(formData);

  if (!email) {
    return { error: 'Email la bat buoc.' };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
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
    return { error: 'Ma OTP khong hop le.' };
  }

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) {
    return { error: 'Mã OTP không hợp lệ hoặc đã hết hạn.' };
  }

  const nextUrl = formData.get('nextUrl') as string;
  revalidatePath(nextUrl || '/', 'layout');
  redirect(nextUrl || '/');
}

export async function resetPasswordForEmail(formData: FormData) {
  const supabase = await createClient();
  const email = getEmail(formData);

  if (!email) {
    return { error: 'Email la bat buoc.' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: 'Đã gửi link khôi phục mật khẩu vào Email của bạn!' };
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = getEmail(formData);
  const password = getPassword(formData);

  if (!email || password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Mat khau phai co it nhat ${MIN_PASSWORD_LENGTH} ky tu.` };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: 'Đăng ký thành công! Vui lòng kiểm tra Email để xác nhận tài khoản.' };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
