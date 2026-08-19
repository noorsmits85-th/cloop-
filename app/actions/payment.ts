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

export async function checkAndSyncPaymentStatusAction(orderCode: number) {
  try {
    if (!orderCode) {
      return { success: false, error: "Mã đơn hàng không hợp lệ" };
    }

    const invoice = await prisma.invoice.findUnique({
      where: { orderCode: BigInt(orderCode) },
      include: { rental: true }
    });

    if (!invoice) {
      return { success: false, error: "Không tìm thấy hóa đơn" };
    }

    // Nếu DB đã PAID rồi thì trả về ngay
    if (invoice.status === "PAID") {
      return { success: true, isPaid: true, status: "PAID" };
    }

    // 🛡️ Webhook Fallback: Gọi trực tiếp PayOS API để hỏi thăm trạng thái
    try {
      const paymentInfo = await payos.paymentRequests.get(orderCode);
      
      if (paymentInfo && (paymentInfo.status as string === "PAID" || paymentInfo.status as string === "SUCCESS")) {
        // Thực thi Atomic Settlement Inflow giống Webhook
        await prisma.$transaction(async (tx) => {
          const checkInvoice = await tx.invoice.findUnique({ where: { id: invoice.id } });
          if (checkInvoice?.status === "PAID") return; // Idempotent check

          await tx.invoice.update({
            where: { id: invoice.id },
            data: { status: "PAID", payosStatus: "success" }
          });

          await tx.ledgerTransaction.create({
            data: {
              invoiceId: invoice.id,
              type: "DEPOSIT_IN",
              amount: invoice.amount,
              description: `Tiền nạp qua Webhook Fallback Sync - OrderCode ${orderCode}`,
              status: "COMPLETED"
            }
          });

          if (invoice.rentalId) {
            await tx.rentalHistory.update({
              where: { id: invoice.rentalId },
              data: { status: "PENDING_APPROVAL" }
            });
          }

          await tx.transactionHistory.create({
            data: {
              orderCode: BigInt(orderCode),
              invoiceId: invoice.id,
              amount: invoice.amount,
              invoiceAmount: invoice.amount,
              status: "PROCESSED",
              rawPayload: paymentInfo as any,
              processedAt: new Date()
            }
          });
        });

        return { success: true, isPaid: true, status: "PAID" };
      }

      return { success: true, isPaid: false, status: paymentInfo?.status || "PENDING" };
    } catch (payosErr: any) {
      console.warn("PayOS status check query error:", payosErr.message);
      return { success: true, isPaid: false, status: invoice.status };
    }
  } catch (error: any) {
    console.error("Lỗi đồng bộ thanh toán:", error);
    return { success: false, error: error.message || "Lỗi đồng bộ" };
  }
}
