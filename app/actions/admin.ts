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
        cloopCoins: true,
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

    // Bơm coin nguyên tử kèm Sổ Cái Kế Toán
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

    return { 
      success: true, 
      message: `Đã bơm thành công ${amount.toLocaleString()} Lá CLOOP cho ${updatedUser.name || "thành viên"}! Số dư mới: ${updatedUser.cloopCoins.toLocaleString()}` 
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

/**
 * ⚡ BỘ KÍCH HOẠT NHẢ TIỀN KÉT ESCROW (DEMO TECHFEST & SANDBOX TESTING)
 * Cho phép Quản trị viên kích hoạt giải ngân tiền thuê cho chủ tủ và hoàn 100% tiền cọc cho khách thuê
 * trong vòng 10 phút sau khi trả đồ hoặc bấm kích hoạt tức thì.
 */
export async function triggerFastEscrowReleaseAction(options?: { minutesThreshold?: number }) {
  try {
    await requireAdmin();

    const minutes = options?.minutesThreshold ?? 10;
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

    // Tìm tất cả các đơn thuê ở trạng thái BORROWER_RETURNED hoặc BORROWER_RECEIVED đủ điều kiện giải ngân
    const eligibleRentals = await prisma.rentalHistory.findMany({
      where: {
        status: { in: ["BORROWER_RETURNED", "BORROWER_RECEIVED", "LENDER_SHIPPED"] },
        disputes: {
          none: {
            status: { in: ["PENDING_REVIEW", "DISPUTED"] },
          },
        },
      },
      include: {
        invoice: true,
        renter: true,
        product: true
      },
      take: 20
    });

    if (eligibleRentals.length === 0) {
      return {
        success: true,
        message: "Hiện chưa có đơn thuê nào cần giải ngân (Tất cả đơn đều đã hoàn tất hoặc chưa có đơn test).",
        processedCount: 0,
        totalRefunded: 0,
        totalPayout: 0
      };
    }

    let processedCount = 0;
    let totalRefunded = 0;
    let totalPayout = 0;

    for (const rental of eligibleRentals) {
      try {
        await prisma.$transaction(async (tx) => {
          // Khóa nguyên tử kiểm tra trạng thái
          const updateResult = await tx.rentalHistory.updateMany({
            where: {
              id: rental.id,
              status: { in: ["BORROWER_RETURNED", "BORROWER_RECEIVED", "LENDER_SHIPPED"] }
            },
            data: {
              status: "LENDER_COMPLETED",
              completedAt: new Date()
            }
          });

          if (updateResult.count === 0) return;

          const depositAmount = rental.invoice?.depositAmount || 0;
          const rentalFee = rental.invoice?.rentalFee || (rental.invoice?.amount ? Math.max(0, rental.invoice.amount - depositAmount) : 0);
          const platformFee = Math.floor(rentalFee * 0.1);
          const lenderEarnings = Math.max(0, rentalFee - platformFee);
          const invoiceId = rental.invoice?.id;

          // 1. Hoàn cọc cho khách thuê
          if (depositAmount > 0) {
            await tx.user.update({
              where: { id: rental.renterId },
              data: {
                walletBalance: { increment: depositAmount },
                cloopCoins: { increment: 15 }
              }
            });
            if (invoiceId) {
              await tx.ledgerTransaction.create({
                data: {
                  invoiceId,
                  type: "REFUND_OUT",
                  amount: depositAmount,
                  description: `[Fast Release 10m] Hoàn 100% cọc đơn #${rental.id.slice(0, 8)} cho khách thuê`
                }
              });
            }
            totalRefunded += depositAmount;
          }

          // 2. Trả tiền thuê cho chủ đồ
          const ownerId = rental.ownerId || rental.product?.userId;
          if (ownerId && lenderEarnings > 0) {
            await tx.user.update({
              where: { id: ownerId },
              data: {
                walletBalance: { increment: lenderEarnings }
              }
            });
            if (invoiceId) {
              await tx.ledgerTransaction.create({
                data: {
                  invoiceId,
                  type: "PAYOUT_OUT",
                  amount: lenderEarnings,
                  description: `[Fast Release 10m] Thanh toán tiền thuê đơn #${rental.id.slice(0, 8)} cho chủ tủ`
                }
              });
              await tx.ledgerTransaction.create({
                data: {
                  invoiceId,
                  type: "FEE_RETAINED",
                  amount: platformFee,
                  description: `[Fast Release 10m] Phí nền tảng 10% đơn #${rental.id.slice(0, 8)}`
                }
              });
            }
            totalPayout += lenderEarnings;
          }

          // 3. Ghi vết Audit Log
          await tx.auditLog.create({
            data: {
              adminId: rental.renterId,
              action: "FAST_ESCROW_RELEASE_DEMO",
              targetType: "RENTAL",
              targetId: rental.id,
              metadata: JSON.stringify({ depositAmount, rentalFee, lenderEarnings, platformFee })
            }
          });

          processedCount++;
        });
      } catch (err) {
        console.error(`Lỗi giải ngân đơn ${rental.id}:`, err);
      }
    }

    try {
      const { revalidatePath } = require("next/cache");
      revalidatePath("/admin");
      revalidatePath("/my-closet/wallet");
      revalidatePath("/my-closet/orders");
    } catch (e) {
      console.error("Revalidate failed:", e);
    }

    return {
      success: true,
      message: `Đã nhả tiền thành công cho ${processedCount} đơn hàng! Hoàn cọc: ${totalRefunded.toLocaleString()}₫ | Giải ngân chủ tủ: ${totalPayout.toLocaleString()}₫`,
      processedCount,
      totalRefunded,
      totalPayout
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Lỗi khi kích hoạt giải ngân Escrow." };
  }
}

