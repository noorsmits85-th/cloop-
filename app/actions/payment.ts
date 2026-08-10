"use server";

import { PrismaClient } from "@prisma/client";
import { payos } from "@/src/utils/payos";

const prisma = new PrismaClient();

import { createClient } from "@/src/utils/supabase/server";

export async function createPayOSPaymentLink(rentalId: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Bạn cần đăng nhập để thanh toán." };
    }

    // 1. Lấy thông tin Hợp đồng thuê (Bảo vệ IDOR)
    const rental = await prisma.rentalHistory.findUnique({
      where: { id: rentalId, renterId: user.id },
      include: {
        product: {
          include: {
            listings: true,
          }
        }
      }
    });

    if (!rental) {
      throw new Error("Không tìm thấy hợp đồng thuê");
    }

    // 2. Tự tính toán số tiền để không phụ thuộc vào Client
    const activeListing = rental.product.listings.find(l => l.listingType === "RENT");
    if (!activeListing) {
      throw new Error("Sản phẩm không có gói thuê hợp lệ");
    }

    const rentalFee = activeListing.basePrice || 0;
    const depositAmount = activeListing.deposit || 0;
    const totalAmount = rentalFee + depositAmount;

    // 3. Khởi tạo Invoice hoặc lấy Invoice cũ
    let invoice = await prisma.invoice.findUnique({
      where: { rentalId: rentalId }
    });

    const orderCode = Number(String(Date.now()).slice(-9)); // Giới hạn độ dài để an toàn với PayOS orderCode

    if (invoice && invoice.payosStatus === "PAID") {
      throw new Error("Hóa đơn này đã được thanh toán thành công, không thể tạo lại QR code.");
    }

    if (!invoice) {
      invoice = await prisma.invoice.create({
        data: {
          rentalId: rentalId,
          amount: totalAmount,
          status: "PENDING",
          orderCode: orderCode,
        }
      });
    } else {
      // Cập nhật lại orderCode mới cho lần gọi payment link này
      invoice = await prisma.invoice.update({
        where: { id: invoice.id },
        data: { orderCode: orderCode, amount: totalAmount }
      });
    }

    // 4. Gọi API PayOS để tạo Payment Link
    const YOUR_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    const body = {
      orderCode: orderCode,
      amount: totalAmount,
      description: `CLOOP GD ${orderCode}`,
      returnUrl: `${YOUR_DOMAIN}/payment/success`,
      cancelUrl: `${YOUR_DOMAIN}/shop`
    };

    const paymentLinkRes = await payos.paymentRequests.create(body);

    // 5. Lưu paymentLinkId vào DB
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { paymentLinkId: paymentLinkRes.paymentLinkId }
    });

    return { success: true, checkoutUrl: paymentLinkRes.checkoutUrl };

  } catch (error: any) {
    console.error("Lỗi tạo PayOS link:", error);
    // Fail-fast: Nếu thiếu key hoặc lỗi API, trả về null để Client tự handle
    return { success: false, error: error.message };
  }
}
