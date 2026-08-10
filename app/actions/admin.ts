"use server";

import { prisma } from "@/src/lib/prisma";
import { createClient } from "@/src/utils/supabase/server";

// Hàm tiện ích để check quyền Admin
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user?.email) {
    throw new Error("Không tìm thấy phiên đăng nhập.");
  }

  // Lấy User từ database
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true }
  });

  if (!user || user.role !== "ADMIN") {
    throw new Error("Bạn không có quyền thực hiện hành động này.");
  }

  return true;
}

export async function searchUserByEmail(email: string) {
  try {
    await requireAdmin();
    
    if (!email) {
      return { error: "Vui lòng nhập email." };
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        cloopCoins: true,
        role: true,
      }
    });

    if (!user) {
      return { error: "Không tìm thấy user với email này." };
    }

    return { success: true, user };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function pumpCoins(userId: string, amount: number) {
  try {
    await requireAdmin();
    
    if (!userId || amount <= 0) {
      return { error: "Thông tin không hợp lệ." };
    }

    // Bơm coin nguyên tử
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        cloopCoins: {
          increment: amount,
        }
      },
      select: { cloopCoins: true, name: true, email: true }
    });

    return { 
      success: true, 
      message: `Đã bơm thành công ${amount.toLocaleString()} Lá CLOOP cho ${updatedUser.name || updatedUser.email}! Số dư mới: ${updatedUser.cloopCoins.toLocaleString()}` 
    };

  } catch (error: any) {
    return { error: error.message };
  }
}
