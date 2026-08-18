"use server";

import { prisma } from "@/src/lib/prisma"; // Giả định có prisma setup ở đây

export async function purchaseBoostPackage(productId: string, userId: string, packageType: 'BOOST' | 'HIGHLIGHT') {
  if (!productId || !userId) {
    return { success: false, error: "Thiếu thông tin đầu vào" };
  }

  const cost = packageType === 'BOOST' ? 20 : 10;

  try {
    // 🛡️ ACID TRANSACTION: Chạy tuần tự nhưng nguyên tử (Atomic)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Kiểm tra số dư người dùng
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { cloopCoins: true }
      });

      if (!user) {
        throw new Error("Không tìm thấy người dùng");
      }

      if (user.cloopCoins < cost) {
        throw new Error("Tài khoản của bạn không đủ Lá CLOOP. Vui lòng nạp thêm!");
      }

      // 2. Trừ tiền bằng phép tính Atomic (decrement) để chống Race Condition / Auto-clicker
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          cloopCoins: {
            decrement: cost
          }
        }
      });

      // Kiểm tra lần cuối (Double-check an toàn)
      if (updatedUser.cloopCoins < 0) {
         throw new Error("Không đủ Lá CLOOP. Lỗi bảo mật phát sinh!");
      }

      // 3. Cập nhật Sản phẩm
      if (packageType === 'BOOST') {
        // Gói Đẩy Tín: Hết hạn sau 24h kể từ hiện tại
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await tx.product.update({
          where: { id: productId },
          data: {
            boostExpiresAt: expiresAt
          }
        });
      } else if (packageType === 'HIGHLIGHT') {
        // Gói Hào Quang: Bật cờ Vĩnh viễn
        await tx.product.update({
          where: { id: productId },
          data: {
            isHighlighted: true
          }
        });
      }

      return updatedUser.cloopCoins; // Trả về số dư mới để cập nhật Client
    });

    return { success: true, newBalance: result };
  } catch (error: any) {
    console.error("Giao dịch lỗi:", error.message);
    return { success: false, error: error.message || "Giao dịch không thành công" };
  }
}
