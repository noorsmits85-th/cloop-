import { createClient } from "@/src/utils/supabase/server";
import { prisma } from "@/src/lib/prisma";
import { redirect } from "next/navigation";

/**
 * Lấy User Session hiện tại từ Supabase HTTP-only Cookies và đồng bộ với bảng Prisma User
 */
export async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error("Unauthorized: Không tìm thấy phiên đăng nhập.");
  }

  const name = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Thành viên CLOOP";
  const email = user.email || `${user.id}@cloop.vn`;

  // Đảm bảo bản ghi User luôn tồn tại trong PostgreSQL qua lệnh Upsert nguyên tử 2ms
  try {
    const profile = await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: email,
        name: name,
      },
      create: {
        id: user.id,
        email: email,
        password: "supabase_auth_managed",
        name: name,
        walletBalance: 0,
        cloopCoins: 100,
        role: "USER"
      },
      select: {
        role: true,
        walletBalance: true,
        cloopCoins: true,
      }
    });

    return {
      id: user.id,
      email: email,
      name: name,
      role: profile.role,
      avatar: user.user_metadata?.avatar_url || null,
      walletBalance: profile.walletBalance,
      cloopCoins: profile.cloopCoins,
    };
  } catch (syncErr) {
    try {
      if (user.email) {
        const profile = await prisma.user.update({
          where: { email: user.email },
          data: { id: user.id, name },
          select: {
            role: true,
            walletBalance: true,
            cloopCoins: true,
          }
        });

        return {
          id: user.id,
          email: email,
          name: name,
          role: profile.role,
          avatar: user.user_metadata?.avatar_url || null,
          walletBalance: profile.walletBalance,
          cloopCoins: profile.cloopCoins,
        };
      }
    } catch (_) {}
  }

  return {
    id: user.id,
    email: email,
    name: name,
    role: "USER",
    avatar: user.user_metadata?.avatar_url || null,
    walletBalance: 0,
    cloopCoins: 100,
  };
}

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
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      redirect("/");
    }

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, role: true, name: true }
    });

    if (!profile || profile.role !== "ADMIN") {
      redirect("/");
    }

    return { authUser: user, profile };
  } catch (error) {
    // Nếu có lỗi do redirect (NEXT_REDIRECT) thì throw tiếp
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error;
    }
    redirect("/");
  }
}
