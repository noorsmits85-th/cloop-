"use server";

import { prisma } from "@/src/lib/prisma";
import { createClient } from "@/src/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { settleCompletedRentalOrder } from "@/lib/settlement-engine";

// Xác thực quyền Admin
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user?.id) {
    throw new Error("Không tìm thấy phiên đăng nhập.");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, id: true, name: true, email: true }
  });

  if (!user || user.role !== "ADMIN") {
    throw new Error("Bạn không có quyền thực hiện hành động này.");
  }

  return user;
}

/**
 * Giải ngân và hoàn cọc cho một đơn thuê hoàn tất
 */
export async function releaseSingleEscrowOrderAction(rentalId: string) {
  try {
    const admin = await requireAdmin();

    const result = await settleCompletedRentalOrder(rentalId, {
      actorId: admin.id,
      actorRole: "ADMIN",
    });

    revalidatePath("/admin");
    revalidatePath("/admin/payments");
    revalidatePath("/admin/deposit-vault");
    revalidatePath("/admin/ledger");

    return {
      success: true,
      message: `Đã hoàn tất giải ngân đơn #${rentalId.slice(0, 8)}! Hoàn cọc: ${result.depositRefunded.toLocaleString('vi-VN')}₫ | Trả chủ tủ: ${result.lenderEarnings.toLocaleString('vi-VN')}₫`
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Lỗi khi giải ngân đơn hàng." };
  }
}

/**
 * Làm mới toàn bộ cache số liệu các phân hệ Admin
 */
export async function refreshAdminViewsAction() {
  try {
    await requireAdmin();

    revalidatePath("/admin");
    revalidatePath("/admin/accounting");
    revalidatePath("/admin/deposit-vault");
    revalidatePath("/admin/payments");
    revalidatePath("/admin/ledger");
    revalidatePath("/admin/shipments");

    return {
      success: true,
      message: "Đã làm mới số liệu thực tế toàn bộ hệ thống quản trị.",
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Lỗi khi làm mới số liệu." };
  }
}
