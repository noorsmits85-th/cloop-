"use server";

import { createClient } from "@/src/utils/supabase/server";
import { prisma } from "@/src/lib/prisma";

import { Logger } from "next-axiom";

export async function createBooking({
  productId,
  startDate,
  endDate,
  renterName,
  renterPhone,
  ownerName,
  ownerPhone,
  isRental,
  shippingMode
}: {
  productId: string;
  startDate: string;
  endDate: string;
  renterName: string;
  renterPhone: string;
  ownerName: string;
  ownerPhone: string;
  isRental: boolean;
  shippingMode: "CLOOP_BOOK" | "SELF_BOOK";
}) {
  const log = new Logger();
  
  log.info("Booking Process Started", { productId, isRental, renterPhone, shippingMode });

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
    
    const shippingFee = shippingMode === "CLOOP_BOOK" ? 35000 : 0;
    const subTotal = isRental ? (days > 0 ? days * basePrice : 0) : basePrice; 
    const totalAmount = isRental 
      ? (days > 0 ? subTotal + deposit + serviceFee + shippingFee : 0)
      : (basePrice + serviceFee + shippingFee);

    // 2. Chặn trùng lịch (Overlap check) trên Server (Sử dụng Prisma Transaction để an toàn)
    return await prisma.$transaction(async (tx) => {
      // 🚀 BƯỚC KHÓA BẢNG PESSIMISTIC LOCK: NGĂN CHẶN DOUBLE BOOKING
      // Gọi lệnh này TRƯỚC khi thực hiện bất kỳ lệnh check hay create nào!
      try {
        await tx.$queryRaw`SELECT id FROM "products" WHERE id = ${productId} FOR UPDATE NOWAIT;`;
      } catch (err: any) {
        // Lỗi P2010 là Raw Query Error trong Prisma. Mã lỗi 55P03 trong Postgres nghĩa là "could not obtain lock".
        if (err.code === "P2010" || err.message.includes("could not obtain lock") || err.message.includes("NOWAIT")) {
          throw new Error("Rất tiếc, một khách hàng khác đang thanh toán món đồ này. Vui lòng thử lại sau vài giây!");
        }
        throw err;
      }

      if (isRental) {
        const overlapping = await tx.rentalHistory.findFirst({
          where: {
            product_id: productId,
            status: "BORROWER_RECEIVED",
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
          status: "PENDING_APPROVAL", // Giai đoạn Pilot: Tạo pending trước, sau đó Pilot sẽ check
        }
      });

      // Tạo Invoice đính kèm chuẩn quy chuẩn kế toán (Tách rõ Cọc, Thuê, Ship, Phí sàn)
      await tx.invoice.create({
        data: {
          rentalId: rental.id,
          amount: totalAmount,
          rentalFee: subTotal,
          depositAmount: deposit,
          shippingFeeCollected: shippingFee,
          platformFee: serviceFee,
          status: "PENDING"
        }
      });

      // 4. Đổi trạng thái (State Machine) sang RESERVED
      // Nếu thuê thì khóa listing RENT, mua thì khóa listing SELL
      await tx.listing.updateMany({
        where: {
          productId: productId,
          listingType: isRental ? "RENT" : "SELL",
          status: "AVAILABLE"
        },
        data: {
          status: "RESERVED"
        }
      });
      
      // Ghi log Nghiệp vụ
      log.info("Booking Created Successfully", { rentalId: rental.id, amount: totalAmount, shippingMode });

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
  } finally {
    // 5. Kích nổ Cache của Next.js để tránh ảo giác giao diện!
    // Tuyệt đối không dùng revalidatePath('/', 'layout') vì sẽ phá sập DB.
    try {
      const { revalidatePath } = require("next/cache");
      revalidatePath(`/product/${productId}`, "page");
      revalidatePath("/", "page");
      revalidatePath("/shop", "page");
      revalidatePath("/my-closet/orders", "page");
    } catch (e) {
      console.error("Cache purge failed:", e);
    }
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
      data: { status: "LENDER_SHIPPED" } // In reality, an Admin should do this or PayOS Webhook
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
