import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';

import prisma from "@/src/lib/prisma";
import { payos } from "@/lib/payos";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Xác thực Webhook chữ ký từ PayOS
    let verifiedData: any;
    try {
      verifiedData = await payos.webhooks.verify(body);
    } catch (verifyError) {
      console.error("❌ Lỗi xác thực webhook PayOS:", verifyError);
      // Chữ ký sai -> 403 Forbidden để block spoof attempt
      return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 403 });
    }

    if (body.code !== "00") {
      return NextResponse.json({ success: true, message: "Not a successful payment event" }, { status: 200 });
    }

    const orderCode = verifiedData.orderCode;

    // 2. Kiểm tra tính toàn vẹn của số tiền
    const invoice = await prisma.invoice.findUnique({
      where: { orderCode: BigInt(orderCode) }
    });

    if (!invoice) {
      console.error(`❌ Webhook: Không tìm thấy Invoice cho orderCode ${orderCode}`);
      return NextResponse.json({ success: true, message: "Invoice not found" }, { status: 200 });
    }

    if (verifiedData.amount !== invoice.amount) {
      console.error(`⚠️ CẢNH BÁO: Lệch số tiền! Yêu cầu: ${invoice.amount}, Thực tế: ${verifiedData.amount}`);
      
      // Ghi log TransactionHistory với trạng thái AMOUNT_MISMATCH
      await prisma.transactionHistory.create({
        data: {
          eventId: verifiedData.reference,
          orderCode: BigInt(orderCode),
          invoiceId: invoice.id,
          amount: verifiedData.amount,
          invoiceAmount: invoice.amount,
          status: 'AMOUNT_MISMATCH',
          rawPayload: body
        }
      });

      return NextResponse.json({ success: true, message: "Amount mismatch detected" }, { status: 200 });
    }

    if (invoice.status !== 'PENDING') {
      console.log(`ℹ️ Invoice ${invoice.id} không còn PENDING. Bỏ qua webhook.`);
      return NextResponse.json({ success: true, message: "Already processed" }, { status: 200 });
    }

    // 3. Khóa Nguyên Tử (Atomic Update) CÓ AWAIT để đảm bảo Serverless không bị đóng băng
    try {
      await prisma.$transaction(async (tx) => {
        const existingTx = await tx.transactionHistory.findUnique({
          where: { orderCode: BigInt(orderCode) }
        });

        if (existingTx) {
          console.log(`ℹ️ Transaction ${orderCode} đã tồn tại (Lặp Webhook). Đánh dấu DUPLICATE...`);
          return;
        }

        console.log(`➤ Ghi nhận TransactionHistory (VERIFIED -> PROCESSED) cho orderCode ${orderCode}`);
        await tx.transactionHistory.create({
          data: {
            eventId: verifiedData.reference,
            orderCode: BigInt(orderCode),
            invoiceId: invoice.id,
            amount: verifiedData.amount,
            invoiceAmount: invoice.amount,
            status: 'PROCESSED',
            rawPayload: body,
            processedAt: new Date()
          }
        });

        console.log(`➤ Cập nhật Invoice thành PAID/COMPLETED`);
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: 'PAID', payosStatus: 'success' }
        });

        if (invoice.rentalId) {
          const rental = await tx.rentalHistory.findUnique({ where: { id: invoice.rentalId } });
          if (rental) {
            await tx.rentalHistory.update({
              where: { id: rental.id },
              data: { status: "AWAITING_SHIPMENT" }
            });
          }
        }
      });
    } catch (err) {
      console.error("❌ Lỗi khi lưu Transaction vào Database:", err);
      // Ném lỗi 500 để PayOS tự động Retry sau 5 phút theo chuẩn "Kế toán thép"
      return NextResponse.json({ success: false, message: "Database Error" }, { status: 500 });
    }

    // Phản hồi 200 OK cho PayOS sau khi đã cầm chắc tiền trong Database
    return NextResponse.json({ success: true, message: "Webhook processed perfectly" }, { status: 200 });

  } catch (error) {
    console.error("❌ Lỗi hệ thống khi xử lý webhook:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
