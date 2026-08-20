import { createClient } from "@/src/utils/supabase/server";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";

const prisma = new PrismaClient();

/**
 * Lấy User Session hiện tại từ Supabase HTTP-only Cookies và đồng bộ với bảng Prisma User
 */
export async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error("Unauthorized: Không tìm thấy phiên đăng nhập.");
  }

  // 1. Tìm trong DB Prisma theo ID
  let dbUser = await prisma.user.findUnique({
    where: { id: user.id }
  });

  // 2. Nếu chưa có theo ID, tìm theo email
  if (!dbUser && user.email) {
    dbUser = await prisma.user.findUnique({
      where: { email: user.email }
    });
  }

  // 3. Nếu chưa có bất kỳ bản ghi nào trong Prisma User, tạo mới tự động
  if (!dbUser) {
    try {
      dbUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email || `${user.id}@cloop.vn`,
          password: "supabase_auth_managed",
          name: user.user_metadata?.name || user.email?.split("@")[0] || "Thành viên CLOOP",
          walletBalance: 0,
          cloopCoins: 100
        }
      });
    } catch (createErr) {
      if (user.email) {
        dbUser = await prisma.user.findUnique({
          where: { email: user.email }
        });
      }
    }
  }
  
  return dbUser || {
    id: user.id,
    email: user.email || "",
    name: user.user_metadata?.name || "Thành viên CLOOP",
    role: "USER"
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
