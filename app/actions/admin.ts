"use server";

import { prisma } from "@/src/lib/prisma";
import { createClient } from "@/src/utils/supabase/server";
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from "next/cache";
import { settleCompletedRentalOrder } from "@/lib/settlement-engine";

// Hàm tiện ích để check quyền Admin
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user?.id) {
    throw new Error("Không tìm thấy phiên đăng nhập.");
  }

  // Lấy User từ database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, id: true, name: true, email: true }
  });

  if (!user || user.role !== "ADMIN") {
    throw new Error("Bạn không có quyền thực hiện hành động này.");
  }

  return user;
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
        cloopCoins: true,
        role: true,
      }
    });

    if (!user) {
      return { error: "Không tìm thấy user profile với email này." };
    }

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

    const updatedUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: userId },
        data: {
          cloopCoins: {
            increment: amount,
          }
        },
        select: { cloopCoins: true, name: true }
      });

      await tx.coinLedgerEntry.create({
        data: {
          userId,
          type: "TOP_UP_IN",
          amount,
          balanceAfter: u.cloopCoins,
          description: `Admin cấp tặng: +${amount.toLocaleString("vi-VN")} Lá CLOOP`
        }
      });

      return u;
    });

    revalidatePath("/admin");
    return { 
      success: true, 
      message: `Đã bơm thành công ${amount.toLocaleString()} Lá CLOOP cho ${updatedUser.name || "thành viên"}! Số dư mới: ${updatedUser.cloopCoins.toLocaleString()}` 
    };

  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * ⚡ GIẢI NGÂN & HOÀN CỌC ESCROW CHO TỪNG ĐƠN HÀNG CỤ THỂ
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
      message: `Đã hoàn tất giải ngân đơn #${rentalId.slice(0, 8)}! Hoàn cọc: ${result.depositRefunded.toLocaleString()}₫ | Trả chủ tủ: ${result.lenderEarnings.toLocaleString()}₫`
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Lỗi khi giải ngân đơn hàng." };
  }
}

/**
 * ⚡ KÍCH HOẠT NHẢ TIỀN TOÀN BỘ KÉT ESCROW HÀNG LOẠT (TẠM KHÓA TRONG GIAI ĐOẠN MVP/PILOT)
 */
export async function triggerFastEscrowReleaseAction(options?: { minutesThreshold?: number }): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  processedCount: number;
  totalRefunded: number;
  totalPayout: number;
}> {
  return {
    success: false,
    error: "Tính năng giải ngân hàng loạt tạm thời bị vô hiệu hóa trong giai đoạn MVP/Pilot để đảm bảo kiểm soát dòng tiền và tránh giải ngân sai trạng thái.",
    processedCount: 0,
    totalRefunded: 0,
    totalPayout: 0
  };
}

/**
 * 🌟 SEED MẪU DỮ LIỆU ĐƠN HÀNG VẬN HÀNH THỰC TẾ (DEV / DEMO ONLY)
 */
export async function seedOperationalOrdersAction() {
  try {
    const admin = await requireAdmin();

    if (process.env.NODE_ENV === "production") {
      return { success: false, error: "Hành động seed dữ liệu mẫu bị chặn tuyệt đối trên môi trường Production." };
    }

    // 1. Tìm hoặc tạo các sản phẩm mẫu
    const products = await prisma.product.findMany({
      where: { isDeleted: false },
      take: 5
    });

    if (products.length === 0) {
      return { success: false, error: "Cần có ít nhất 1 sản phẩm trên hệ thống để tạo đơn mẫu." };
    }

    const today = new Date();
    const sampleRentalsData = [
      {
        product: products[0],
        status: "BORROWER_RECEIVED" as const,
        rentalFee: 350000,
        depositAmount: 1500000,
        renterName: "Thu Trang (Elena)",
        renterPhone: "0912345678",
        ownerName: "Lê Na (Chloe)",
        ownerPhone: "0987654321",
        daysAgo: 2,
        daysDuration: 4
      },
      {
        product: products[1] || products[0],
        status: "BORROWER_RETURNED" as const,
        rentalFee: 280000,
        depositAmount: 1200000,
        renterName: "Minh Châu",
        renterPhone: "0905123456",
        ownerName: "Mai Chi (Sophie)",
        ownerPhone: "0934567890",
        daysAgo: 5,
        daysDuration: 3
      },
      {
        product: products[2] || products[0],
        status: "OWNER_PACKED" as const,
        rentalFee: 420000,
        depositAmount: 2000000,
        renterName: "Khánh Linh",
        renterPhone: "0978999888",
        ownerName: "Trang Hoàng",
        ownerPhone: "0911223344",
        daysAgo: 0,
        daysDuration: 4
      },
      {
        product: products[3] || products[0],
        status: "LENDER_COMPLETED" as const,
        rentalFee: 320000,
        depositAmount: 1000000,
        renterName: "Thanh Trúc",
        renterPhone: "0944556677",
        ownerName: "Elena Vance",
        ownerPhone: "0988776655",
        daysAgo: 8,
        daysDuration: 3
      }
    ];

    let createdCount = 0;

    for (const sample of sampleRentalsData) {
      const startDate = new Date(today.getTime() - sample.daysAgo * 24 * 3600 * 1000);
      const endDate = new Date(startDate.getTime() + sample.daysDuration * 24 * 3600 * 1000);
      const totalAmount = sample.rentalFee + sample.depositAmount + 35000;
      const platformFee = Math.floor(sample.rentalFee * 0.12);

      await prisma.$transaction(async (tx) => {
        const rental = await tx.rentalHistory.create({
          data: {
            product_id: sample.product.id,
            renterId: admin.id,
            ownerId: sample.product.userId || admin.id,
            renter_name: sample.renterName,
            renter_phone: sample.renterPhone,
            owner_name: sample.ownerName,
            owner_phone: sample.ownerPhone,
            start_date: startDate,
            end_date: endDate,
            status: sample.status,
            shippingCode: `GHN${Math.floor(10000000 + Math.random() * 90000000)}VN`,
            invoice: {
              create: {
                amount: totalAmount,
                rentalFee: sample.rentalFee,
                depositAmount: sample.depositAmount,
                shippingFeeCollected: 35000,
                platformFee: platformFee,
                status: sample.status === "LENDER_COMPLETED" ? "PAID" : "PAID"
              }
            }
          }
        });

        // Tạo giao dịch ledger tương ứng
        if (rental.id) {
          const inv = await tx.invoice.findUnique({ where: { rentalId: rental.id } });
          if (inv) {
            await tx.ledgerTransaction.create({
              data: {
                invoiceId: inv.id,
                type: "FEE_RETAINED",
                amount: platformFee,
                description: `Phí sàn 12% đơn #${rental.id.slice(0, 8)} (${sample.product.title})`
              }
            });
            await tx.ledgerTransaction.create({
              data: {
                invoiceId: inv.id,
                type: "DEPOSIT_IN",
                amount: sample.depositAmount,
                description: `Tiền cọc bảo chứng Escrow đơn #${rental.id.slice(0, 8)}`
              }
            });
          }
        }

        createdCount++;
      });
    }

    revalidatePath("/admin");
    revalidatePath("/admin/accounting");
    revalidatePath("/admin/deposit-vault");
    revalidatePath("/admin/payments");
    revalidatePath("/admin/ledger");
    revalidatePath("/admin/shipments");

    return {
      success: true,
      message: `Đã đồng bộ & khởi tạo thành công ${createdCount} đơn hàng vận hành thực tế kèm số liệu Escrow, Ledger, Invoices!`
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Lỗi khi đồng bộ đơn hàng." };
  }
}
