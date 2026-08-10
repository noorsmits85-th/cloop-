"use server";

import { createClient } from "@/src/utils/supabase/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function createBooking({
  productId,
  startDate,
  endDate,
  renterName,
  renterPhone,
  ownerName,
  ownerPhone,
  isRental
}: {
  productId: string;
  startDate: string;
  endDate: string;
  renterName: string;
  renterPhone: string;
  ownerName: string;
  ownerPhone: string;
  isRental: boolean;
}) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Bạn cần đăng nhập bằng ID Xanh để thực hiện giao dịch này." };
    }

    // 1. Fetch real prices and owner info from the server/DB, NEVER trust client inputs!
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        listings: true,
      }
    });

    if (!product || !product.listings || product.listings.length === 0) {
      return { success: false, error: "Sản phẩm không tồn tại hoặc đã bị gỡ." };
    }

    // Lấy thông tin Listing đầu tiên
    const listing = product.listings[0];
    const basePrice = listing.basePrice || 0;
    const deposit = listing.deposit || 0;
    const serviceFee = 0; // FREE LAUNCH
    
    // Tính toán số ngày và tổng tiền trên Server
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = isRental && start && end ? Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1) : 0;
    
    const subTotal = isRental ? (days > 0 ? days * basePrice : 0) : basePrice; 
    const totalAmount = isRental 
      ? (days > 0 ? subTotal + deposit + serviceFee : 0)
      : (basePrice + serviceFee);

    // 2. Chặn trùng lịch (Overlap check) trên Server (Sử dụng Prisma Transaction để an toàn)
    return await prisma.$transaction(async (tx) => {
      if (isRental) {
        const overlapping = await tx.rentalHistory.findFirst({
          where: {
            product_id: productId,
            status: "active",
            start_date: { lte: end },
            end_date: { gte: start },
          }
        });

        if (overlapping) {
          throw new Error("Rất tiếc, sản phẩm đã có người đặt thuê trong khoảng thời gian này. Vui lòng chọn ngày khác!");
        }
      }

      // 3. Tạo Đơn hàng (Invoice) với trạng thái PENDING_PAYMENT
      // Giai đoạn Pilot: Vẫn cho là active sau khi bấm "Đã chuyển khoản" theo luồng Pilot 50 user.
      // Tuy nhiên vì user click "Đã chuyển khoản" ở form VNPAY, chúng ta sẽ lưu trạng thái là PENDING_PAYMENT
      // đợi Admin duyệt, hoặc cho Active luôn theo đúng luồng cũ để không vỡ giao diện.
      
      const rental = await tx.rentalHistory.create({
        data: {
          product_id: productId,
          renterId: user.id, // Lấy ID an toàn từ SSR Session
          renter_name: renterName,
          renter_phone: renterPhone,
          owner_name: ownerName,
          owner_phone: ownerPhone,
          start_date: isRental ? start : new Date(),
          end_date: isRental ? end : new Date(),
          status: "pending_payment", // Giai đoạn Pilot: Tạo pending trước, sau đó Pilot sẽ check
        }
      });

      // Tạo Invoice đính kèm
      await tx.invoice.create({
        data: {
          rentalId: rental.id,
          amount: totalAmount,
          status: "PENDING"
        }
      });

      return { 
        success: true, 
        rentalId: rental.id, 
        totalAmount,
        message: "Tạo đơn hàng thành công! Vui lòng chuyển khoản." 
      };
    });

  } catch (err: any) {
    console.error("SERVER ACTION ERROR:", err);
    return { success: false, error: err.message || "Lỗi hệ thống khi tạo đơn hàng." };
  }
}

export async function confirmManualTransfer(rentalId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Chưa đăng nhập." };

    // Fake confirmation for Pilot (changes status to active upon click "Tôi đã chuyển khoản")
    // This allows the demo UI to work while retaining security (we know WHO clicked it).
    await prisma.rentalHistory.update({
      where: { id: rentalId, renterId: user.id },
      data: { status: "active" } // In reality, an Admin should do this or PayOS Webhook
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
