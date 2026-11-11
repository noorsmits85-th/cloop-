"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/src/lib/auth";
import { settleCompletedRentalOrder } from "@/lib/settlement-engine";
import { toSafeActionError } from "@/src/lib/safe-error";

/**
 * Giải ngân và hoàn cọc cho một đơn thuê hoàn tất
 */
export async function releaseSingleEscrowOrderAction(rentalId: string) {
  try {
    const { profile } = await requireAdmin();

    const result = await settleCompletedRentalOrder(rentalId, {
      actorId: profile.id,
      actorRole: "ADMIN",
    });

    revalidatePath("/admin");
    revalidatePath("/admin/payments");
    revalidatePath("/admin/deposit-vault");
    revalidatePath("/admin/ledger");

    return {
      success: true,
      message: `Đã hoàn tất giải ngân đơn #${rentalId.slice(0, 8)}! Hoàn cọc: ${result.depositRefunded.toLocaleString("vi-VN")}₫ | Trả chủ tủ: ${result.lenderEarnings.toLocaleString("vi-VN")}₫`,
      error: undefined as string | undefined,
    };
  } catch (error: unknown) {
    // TODO: Tích hợp hệ thống tracking (Sentry/LogRocket) để theo dõi lỗi giải ngân Escrow
    return toSafeActionError(error, "Lỗi khi giải ngân đơn hàng.");
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
      error: undefined as string | undefined,
    };
  } catch (error: unknown) {
    // TODO: Tích hợp hệ thống tracking (Sentry/LogRocket) để theo dõi lỗi làm mới số liệu Admin
    return toSafeActionError(error, "Lỗi khi làm mới số liệu.");
  }
}
