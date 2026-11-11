import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/src/utils/supabase/server";
import { prisma } from "@/src/lib/prisma";
import { redirect } from "next/navigation";

// Short-lived per-user profile cache (10s TTL) to avoid redundant prisma.user.findUnique
// calls across rapid tab switches and concurrent Server Actions in the same session.
const USER_PROFILE_CACHE_TTL_MS = 10_000;
const userProfileCache = new Map<
  string,
  {
    profile: {
      id: string;
      name: string | null;
      avatar: string | null;
      role: string;
      walletBalance: number;
      cloopCoins: number;
      isVerified: boolean;
    };
    expiry: number;
  }
>();

export function clearUserAuthCache(userId?: string) {
  if (userId) {
    userProfileCache.delete(userId);
  } else {
    userProfileCache.clear();
  }
}

/**
 * Kiểm tra nhanh cookie phiên đăng nhập và xác thực JWT qua getUser().
 * Được bọc bởi React.cache() để RootLayout và các Server Component con dùng chung
 * đúng 1 lời gọi duy nhất trong suốt vòng đời của 1 HTTP request.
 * Nếu khách vãng lai không có cookie sb-*, trả về null ngay lập tức (0ms).
 */
export const getOptionalAuthUser = cache(async () => {
  try {
    const cookieStore = await cookies();
    const hasSupabaseCookie = cookieStore
      .getAll()
      .some((c) => c.name.startsWith("sb-") || c.name.includes("auth-token"));

    if (!hasSupabaseCookie) {
      return null;
    }

    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
});

/**
 * Lấy User hiện tại từ Supabase Auth (luôn xác thực chữ ký JWT qua getUser())
 * và đồng bộ với bảng Prisma User.
 * Sử dụng React.cache() để deduplicate trong phạm vi 1 HTTP request.
 */
export const requireUser = cache(async () => {
  const user = await getOptionalAuthUser();

  if (!user) {
    throw new Error("Unauthorized: Không tìm thấy phiên đăng nhập hợp lệ.");
  }

  const name =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Thành viên CLOOP";
  const email = user.email || `${user.id}@cloop.vn`;

  try {
    const now = Date.now();
    const cached = userProfileCache.get(user.id);
    let profile = cached && cached.expiry > now ? cached.profile : null;

    if (!profile) {
      profile = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          avatar: true,
          role: true,
          walletBalance: true,
          cloopCoins: true,
          isVerified: true,
        },
      });

      // Chỉ khi user chưa có trong database mới thực hiện tạo hồ sơ mặc định với quyền USER
      if (!profile) {
        profile = await prisma.user.create({
          data: {
            id: user.id,
            email: email,
            password: "supabase_auth_managed",
            name: name,
            walletBalance: 0,
            cloopCoins: 100,
            role: "USER",
          },
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
            walletBalance: true,
            cloopCoins: true,
            isVerified: true,
          },
        });
      }

      userProfileCache.set(user.id, {
        profile,
        expiry: now + USER_PROFILE_CACHE_TTL_MS,
      });
    }

    const effectiveName = profile.name || name;
    const effectiveAvatar =
      profile.avatar ||
      user.user_metadata?.avatar_url ||
      user.user_metadata?.avatar ||
      null;

    return {
      id: user.id,
      email: email,
      name: effectiveName,
      role: profile.role,
      isVerified: profile.isVerified === true,
      avatar: effectiveAvatar,
      walletBalance: profile.walletBalance,
      cloopCoins: profile.cloopCoins,
      metadata: {
        ...(user.user_metadata || {}),
        name: effectiveName,
        avatar: effectiveAvatar,
        avatar_url: effectiveAvatar,
      },
    };
  } catch (syncErr) {
    // TODO: Tích hợp hệ thống tracking (Sentry/LogRocket) để giám sát lỗi đồng bộ hồ sơ người dùng
    Sentry.captureException(syncErr);
  }

  return {
    id: user.id,
    email: email,
    name: name,
    role: "USER",
    isVerified: false,
    avatar: user.user_metadata?.avatar_url || null,
    walletBalance: 0,
    cloopCoins: 100,
    metadata: user.user_metadata || {},
  };
});

async function verifyAdminMfaAssurance(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const mfaApi = (supabase as any)?.auth?.mfa;
    if (!mfaApi || typeof mfaApi.getAuthenticatorAssuranceLevel !== "function") {
      return false;
    }
    const { data, error } = await mfaApi.getAuthenticatorAssuranceLevel();
    if (error || !data) {
      return false;
    }
    return data.currentLevel === "aal2";
  } catch {
    return false;
  }
}

/**
 * Dành cho API / Server Actions: Kiểm tra role ADMIN kèm bắt buộc xác thực MFA (AAL2).
 * Tái sử dụng kết quả từ requireUser() để không phải gọi prisma.user.findUnique lần 2.
 */
export async function requireAdmin() {
  const user = await requireUser();

  if (user.role !== "ADMIN") {
    throw new Error("Forbidden: Yêu cầu quyền Quản trị viên (ADMIN).");
  }

  const hasMfa = await verifyAdminMfaAssurance();
  if (!hasMfa) {
    throw new Error("Forbidden: Quản trị viên bắt buộc phải xác thực đa nhân tố MFA (AAL2).");
  }

  return {
    authUser: user,
    profile: { id: user.id, role: user.role, name: user.name },
  };
}

/**
 * Dành cho Pages / Layouts: Kiểm tra role ADMIN kèm bắt buộc xác thực MFA (AAL2).
 * Chuyển hướng về trang chủ nếu không phải Admin hoặc chưa hoàn tất MFA AAL2.
 */
export async function requireAdminOrRedirect() {
  let user = null;
  try {
    user = await requireUser();
  } catch {
    user = null;
  }

  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const hasMfa = await verifyAdminMfaAssurance();
  if (!hasMfa) {
    redirect("/");
  }

  return { authUser: user, profile: user };
}
