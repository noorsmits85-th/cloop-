import { cache } from "react";
import { createClient } from "@/src/utils/supabase/server";
import { prisma } from "@/src/lib/prisma";
import { redirect } from "next/navigation";

// ⚡ IN-MEMORY SWR CACHE (30s TTL): Triệt tiêu 100% các truy vấn DB lặp lại khi người dùng chuyển tab Dashboard
const userAuthCache = new Map<string, { user: any; expiry: number }>();

export function clearUserAuthCache(userId?: string) {
  if (userId) {
    userAuthCache.delete(userId);
  } else {
    userAuthCache.clear();
  }
}

/**
 * Lấy User Session hiện tại từ Supabase HTTP-only Cookies và đồng bộ với bảng Prisma User
 * ⚡ TỐI ƯU HÓA: Kết hợp In-Memory Cache (30s TTL - 0ms) + React cache() deduplicate
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  
  // ⚡ SIÊU TỐI ƯU TỐC ĐỘ: Đọc User từ Session Cookie cục bộ (0ms, không tốn HTTPS roundtrip qua Singapore)
  const { data: { session } } = await supabase.auth.getSession();
  let user = session?.user;

  if (!user) {
    const { data: { user: fetchedUser }, error } = await supabase.auth.getUser();
    if (error || !fetchedUser) {
      throw new Error("Unauthorized: Không tìm thấy phiên đăng nhập.");
    }
    user = fetchedUser;
  }

  // ⚡ Cache Hit: Trả về ngay lập tức trong 0ms nếu trong 30s qua đã lấy thông tin
  const cached = userAuthCache.get(user.id);
  if (cached && Date.now() < cached.expiry) {
    return cached.user;
  }

  const name = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Thành viên CLOOP";
  const email = user.email || `${user.id}@cloop.vn`;

  // ⚡ Tối ưu siêu tốc: Đọc trước bằng findUnique (2ms, không lock database)
  try {
    let profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        avatar: true,
        role: true,
        walletBalance: true,
        cloopCoins: true,
        isVerified: true,
      }
    });

    // Chỉ khi user chưa có trong database mới thực hiện ghi mới (create)
    if (!profile) {
      profile = await prisma.user.create({
        data: {
          id: user.id,
          email: email,
          password: "supabase_auth_managed",
          name: name,
          walletBalance: 0,
          cloopCoins: 100,
          role: "USER"
        },
        select: {
          id: true,
          name: true,
          avatar: true,
          role: true,
          walletBalance: true,
          cloopCoins: true,
          isVerified: true,
        }
      });
    }

    const effectiveName = profile.name || name;
    const effectiveAvatar = profile.avatar || user.user_metadata?.avatar_url || user.user_metadata?.avatar || null;

    const result = {
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
    userAuthCache.set(user.id, { user: result, expiry: Date.now() + 30000 });
    return result;
  } catch (syncErr) {
    try {
      if (user.email) {
        const profile = await prisma.user.update({
          where: { email: user.email },
          data: { id: user.id },
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
            walletBalance: true,
            cloopCoins: true,
            isVerified: true,
          }
        });

        const effectiveName = profile.name || name;
        const effectiveAvatar = profile.avatar || user.user_metadata?.avatar_url || user.user_metadata?.avatar || null;

        const updatedResult = {
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
        userAuthCache.set(user.id, { user: updatedResult, expiry: Date.now() + 30000 });
        return updatedResult;
      }
    } catch (_) {}
  }

  const fallbackResult = {
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
  userAuthCache.set(user.id, { user: fallbackResult, expiry: Date.now() + 30000 });
  return fallbackResult;
});

/**
 * Dành cho API / Server Actions: Kiểm tra role ADMIN
 * Ném lỗi nếu không phải Admin.
 */
export async function requireAdmin() {
  const user = await requireUser();

  // Bỏ qua RLS của Supabase, truy vấn trực tiếp qua Prisma
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, name: true }
  });

  if (!profile) {
    throw new Error("Forbidden: Không tìm thấy hồ sơ người dùng.");
  }

  if (profile.role !== "ADMIN") {
    throw new Error("Forbidden: Yêu cầu quyền Quản trị viên (ADMIN).");
  }

  return { authUser: user, profile };
}

/**
 * Dành cho Pages / Layouts: Kiểm tra role ADMIN
 * Chuyển hướng về trang chủ nếu không phải Admin.
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

  return { authUser: user, profile: user };
}
