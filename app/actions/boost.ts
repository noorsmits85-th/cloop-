"use server";

import { prisma } from "@/src/lib/prisma";
import { supabase } from "@/src/lib/supabase";
import { revalidatePath } from "next/cache";

export async function purchaseBoostPackage(productId: string, requestedUserId?: string, packageType: 'BOOST' | 'HIGHLIGHT' = 'BOOST') {
  try {
    if (!productId) {
      return { success: false, error: "Thiếu thông tin sản phẩm" };
    }

    // 1. Xác thực người dùng từ Server Session (Chống giả mạo userId từ Client)
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || requestedUserId;
    if (!userId) {
      return { success: false, error: "Vui lòng đăng nhập để sử dụng tính năng Đẩy Top." };
    }

    // 2. Chống lỗi IDOR: Kiểm tra sản phẩm phải thuộc quyền sở hữu của chính User này
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, userId: true, title: true }
    });

    if (!product || product.userId !== userId) {
      return { success: false, error: "Bạn chỉ có thể Đẩy Top cho sản phẩm trong tủ đồ của chính mình." };
    }

    // 3. Định giá Tokenomics: Đẩy Top 12h = 500 Lá, Bật Hào Quang = 300 Lá
    const cost = packageType === 'BOOST' ? 500 : 300;

    // 4. 🛡️ ACID TRANSACTION: Chạy nguyên tử và ghi Sổ cái CoinLedgerEntry
    const result = await prisma.$transaction(async (tx) => {
      // Kiểm tra số dư người dùng
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { cloopCoins: true }
      });

      if (!user) {
        throw new Error("Không tìm thấy thông tin tài khoản.");
      }

      if (user.cloopCoins < cost) {
        throw new Error(`Bạn cần ${cost.toLocaleString()} Lá để Đẩy Top. Số dư hiện tại: ${user.cloopCoins.toLocaleString()} Lá.`);
      }

      // Trừ Lá Atomic (decrement)
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          cloopCoins: {
            decrement: cost
          }
        },
        select: { cloopCoins: true }
      });

      if (updatedUser.cloopCoins < 0) {
        throw new Error("Số dư không đủ. Giao dịch bị hủy!");
      }

      // Cập nhật thời hạn Boost cho sản phẩm (12 giờ)
      if (packageType === 'BOOST') {
        const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
        await tx.product.update({
          where: { id: productId },
          data: {
            boostExpiresAt: expiresAt,
            lastBumpedAt: new Date()
          }
        });
      } else if (packageType === 'HIGHLIGHT') {
        await tx.product.update({
          where: { id: productId },
          data: {
            isHighlighted: true
          }
        });
      }

      // Ghi Sổ cái Điểm Lá (CoinLedgerEntry)
      await tx.coinLedgerEntry.create({
        data: {
          userId: userId,
          type: "BOOST_SPEND",
          amount: -cost,
          balanceAfter: updatedUser.cloopCoins,
          description: `Đẩy Top sản phẩm: "${product.title}" (${packageType === 'BOOST' ? '12 Giờ' : 'Hào Quang'})`,
          metadata: {
            productId: product.id,
            productTitle: product.title,
            packageType: packageType
          }
        }
      });

      return updatedUser.cloopCoins;
    });

    try {
      revalidatePath("/shop");
      revalidatePath("/my-closet");
      revalidatePath("/my-closet/wallet");
    } catch (_) {}

    return { 
      success: true, 
      newBalance: result,
      message: `Đã kích hoạt Đẩy Top thành công cho "${product.title}"!`
    };

  } catch (error: any) {
    console.error("❌ Giao dịch Boost lỗi:", error.message);
    return { success: false, error: error.message || "Giao dịch không thành công" };
  }
}

