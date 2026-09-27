'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/src/utils/supabase/server';
import { translateAuthError } from '@/src/utils/authErrors';
import { checkRateLimit } from '@/src/utils/rate-limit';

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
  const rawPassword = getPassword(formData);
  const password = rawPassword.trim();

  if (!email || !password) {
    return { error: 'Email và mật khẩu là bắt buộc.' };
  }

  // 🛡️ CHỐNG TẤN CÔNG HYDRA / BRUTE-FORCE: Khóa ngay sau 5 lần thử/phút
  const rl = checkRateLimit(`login_${email}`, 5, 60 * 1000);
  if (!rl.success) {
    return { error: `Phát hiện quá nhiều lần thử đăng nhập không hợp lệ. Vui lòng thử lại sau ${rl.resetInSec} giây.` };
  }

  // 1. Thử đăng nhập lần 1 với mật khẩu đã trim (loại bỏ khoảng trắng thừa do bàn phím di động)
  let { data: signInData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // 2. Nếu thất bại và mật khẩu gốc khác mật khẩu trim (người dùng cố ý đặt space), thử mật khẩu gốc
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

  // 3. TỰ ĐỘNG GỠ KẸT "SAI MẬT KHẨU" DO EMAIL CHƯA CONFIRM HOẶC LỆCH HOA/THƯỜNG TRONG AUTH.USERS
  // Supabase mặc định trả về "Invalid login credentials" khi tài khoản unconfirmed để tránh lộ email
  if (error) {
    try {
      const { prisma } = await import('@/src/lib/prisma');
      const matchingUsers: any = await prisma.$queryRawUnsafe(
        `SELECT id, email, email_confirmed_at FROM auth.users WHERE LOWER(email) = LOWER($1) LIMIT 1;`,
        email
      );

      if (matchingUsers && matchingUsers.length > 0) {
        const dbUser = matchingUsers[0];
        const actualEmail = dbUser.email;

        // Tự động kích hoạt email_confirmed_at nếu chưa confirm
        if (!dbUser.email_confirmed_at) {
          await prisma.$executeRawUnsafe(
            `UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = $1;`,
            dbUser.id
          );
        }

        // Thử lại với email chính xác lưu trong database
        let retry = await supabase.auth.signInWithPassword({ email: actualEmail, password });
        if (!retry.error && retry.data?.user) {
          signInData = retry.data;
          error = null;
        } else if (rawPassword !== password) {
          retry = await supabase.auth.signInWithPassword({ email: actualEmail, password: rawPassword });
          if (!retry.error && retry.data?.user) {
            signInData = retry.data;
            error = null;
          }
        }
      }
    } catch (dbErr) {
      console.error("Lỗi tự động gỡ khóa unconfirmed auth user:", dbErr);
    }
  }

  if (error || !signInData?.user) {
    return { error: translateAuthError(error?.message || "Đăng nhập không thành công") };
  }

  // Đồng bộ User Prisma không làm nghẽn luồng phản hồi
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

  const nextUrl = (formData.get('nextUrl') as string) || (formData.get('redirectTo') as string) || '/';
  try {
    revalidatePath(nextUrl);
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
    return { error: translateAuthError(error.message) };
  }

  return { success: 'Đã gửi mã OTP (Magic Link) vào Email của bạn! Vui lòng kiểm tra hộp thư.' };
}

export async function verifyOtp(formData: FormData) {
  const supabase = await createClient();
  const email = getEmail(formData);
  const token = String(formData.get('token') || '').trim();

  if (!email || !/^\d{6}$/.test(token)) {
    return { error: 'Mã OTP không hợp lệ (cần đủ 6 chữ số).' };
  }

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) {
    return { error: translateAuthError(error.message) || 'Mã OTP không hợp lệ hoặc đã hết hạn.' };
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

  const { error: otpError } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'recovery',
  });

  if (otpError) {
    return { error: translateAuthError(otpError.message) || 'Mã OTP khôi phục không đúng hoặc đã hết hạn.' };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { error: translateAuthError(updateError.message) };
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

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.` };
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
    return { error: translateAuthError(signUpError.message) };
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
  formData.set('email', email.trim().toLowerCase());
  formData.set('password', password);
  if (redirectTo) formData.set('redirectTo', redirectTo);
  return login(formData);
}

export async function registerWithCredentials({ email, password, name, redirectTo }: { email: string; password: string; name?: string; redirectTo?: string }): Promise<AuthActionResult> {
  const formData = new FormData();
  formData.set('email', email.trim().toLowerCase());
  formData.set('password', password);
  if (name) formData.set('name', name.trim());
  if (redirectTo) formData.set('redirectTo', redirectTo);
  return signup(formData);
}

export async function fastLoginAction({ redirectTo }: { redirectTo?: string } = {}): Promise<AuthActionResult> {
  const email = process.env.DEMO_PILOT_EMAIL || "th4212044@gmail.com";
  const password = process.env.DEMO_PILOT_PASSWORD || "CloopPassword2026!";
  const name = "Trang";

  const supabase = await createClient();
  
  // 1. Luôn đồng bộ mật khẩu bcrypt chuẩn và xác thực email trong auth.users trước khi đăng nhập
  try {
    const { prisma } = await import('@/src/lib/prisma');
    await prisma.$executeRawUnsafe(
      `UPDATE auth.users SET encrypted_password = crypt($1, gen_salt('bf')), email_confirmed_at = NOW() WHERE email = $2;`,
      password,
      email
    );
  } catch (_) {}

  let signInRes = await supabase.auth.signInWithPassword({ email, password });
  
  if (signInRes.error) {
    await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, full_name: name } }
    });
    
    try {
      const { prisma } = await import('@/src/lib/prisma');
      await prisma.$executeRawUnsafe(
        `UPDATE auth.users SET encrypted_password = crypt($1, gen_salt('bf')), email_confirmed_at = NOW() WHERE email = $2;`,
        password,
        email
      );
    } catch (_) {}

    signInRes = await supabase.auth.signInWithPassword({ email, password });
  }

  // 2. Chặn đứng kịch bản trả về thành công ảo nếu không có Session Cookie thật từ Supabase
  if (signInRes.error || !signInRes.data?.user?.id) {
    return {
      error: signInRes.error 
        ? translateAuthError(signInRes.error.message) 
        : "Không thể tạo phiên đăng nhập bảo mật. Vui lòng thử lại."
    };
  }

  const userId = signInRes.data.user.id;

  try {
    const { prisma } = await import('@/src/lib/prisma');
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatar: true }
    });

    await prisma.user.upsert({
      where: { id: userId },
      update: {
        email,
        ...(existing?.name ? {} : { name }),
      },
      create: {
        id: userId,
        email,
        password: 'supabase_auth_managed',
        name,
        walletBalance: 0,
        cloopCoins: 100,
        role: 'USER',
        isVerified: true
      }
    });
  } catch (_) {}

  const nextUrl = redirectTo || '/my-closet';
  try {
    revalidatePath(nextUrl, 'layout');
  } catch (_) {}

  return {
    success: true,
    redirectUrl: nextUrl,
    user: {
      id: userId,
      name,
      email
    }
  };
}
