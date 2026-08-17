"use server";

import { prisma } from "@/src/lib/prisma";
import { createClient } from "@/src/utils/supabase/server";
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Hàm tiện ích để check quyền Admin
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user?.id) {
    throw new Error("Không tìm thấy phiên đăng nhập.");
  }

  // Lấy User từ database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
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

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) throw new Error(authError.message);
    
    const authUser = authData.users.find(u => u.email === email);
    
    if (!authUser) {
      return { error: "Không tìm thấy user với email này trong hệ thống Auth." };
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        name: true,
        avatar: true,
        cloopLeaves: true,
        role: true,
      }
    });

    if (!user) {
      return { error: "Không tìm thấy user profile với email này." };
    }

    // Đính kèm email vào để hiển thị trên UI Admin
    return { success: true, user: { ...user, email: authUser.email } };
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
        cloopLeaves: {
          increment: amount,
        }
      },
      select: { cloopLeaves: true, name: true }
    });

    return { 
      success: true, 
      message: `Đã bơm thành công ${amount.toLocaleString()} Lá CLOOP cho ${updatedUser.name || "thành viên"}! Số dư mới: ${updatedUser.cloopLeaves.toLocaleString()}` 
    };

  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateEcoMetrics(keyword: string, waterFactor: number, co2Factor: number, greenPts: number) {
  try {
    await requireAdmin();
    
    await prisma.ecoMetric.upsert({
      where: { keyword },
      update: { waterFactor, co2Factor, greenPts },
      create: { keyword, waterFactor, co2Factor, greenPts }
    });

    try {
      const { revalidateTag } = require("next/cache");
      revalidateTag('eco-metrics');
    } catch(e) {
      console.error("Cache purge failed:", e);
    }

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
