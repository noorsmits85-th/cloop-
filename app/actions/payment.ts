"use server";

import { prisma } from "@/src/lib/prisma";
import { payos } from "@/src/utils/payos";
import { generatePayOSOrderCode } from "@/src/utils/order-code";

import { createClient } from "@/src/utils/supabase/server";

export async function createPayOSPaymentLink(rentalId: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Bạn cần đăng nhập để thanh toán." };
    }

    if (!payos) {
      return { success: false, error: "Cau hinh PayOS chua san sang tren server." };
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

    const orderCode = generatePayOSOrderCode();

    if (invoice && invoice.payosStatus === "PAID") {
      throw new Error("Hóa đơn này đã được thanh toán thành công, không thể tạo lại QR code.");
    }

    if (!invoice) {
      invoice = await prisma.invoice.create({
        data: {
          rentalId: rentalId,
          amount: totalAmount,
          rentalFee: rentalFee,
          depositAmount: depositAmount,
          status: "PENDING",
          orderCode: orderCode,
        }
      });
    } else {
      // Cập nhật lại orderCode mới cho lần gọi payment link này
      invoice = await prisma.invoice.update({
        where: { id: invoice.id },
        data: { 
          orderCode: orderCode, 
          amount: totalAmount,
          rentalFee: rentalFee,
          depositAmount: depositAmount
        }
      });
    }

    // 4. Gọi API PayOS để tạo Payment Link
    const { headers } = await import("next/headers");
    let dynamicDomain = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://cloop-sable.vercel.app");
    try {
      const headerList = await headers();
      const host = headerList.get("x-forwarded-host") || headerList.get("host");
      const proto = headerList.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
      const origin = headerList.get("origin") || (host ? `${proto}://${host}` : null);
      if (origin) dynamicDomain = origin;
    } catch {}

    const YOUR_DOMAIN = dynamicDomain;

    const body = {
      orderCode: orderCode,
      amount: totalAmount,
      description: `CLOOP GD ${orderCode}`,
      returnUrl: `${YOUR_DOMAIN}/payment/result?orderCode=${orderCode}`,
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

    if (!payos) {
      return { success: false, error: "Cau hinh PayOS chua san sang tren server." };
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
          const updateResult = await tx.invoice.updateMany({
            where: { id: invoice.id, status: "PENDING" },
            data: { status: "PAID", payosStatus: "success" }
          });

          if (updateResult.count === 0) return;

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

