import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { payos } from "@/src/utils/payos";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Xác thực Webhook chữ ký từ PayOS
    let webhookData: any;
    try {
      webhookData = await payos.webhooks.verify(body);
    } catch (verifyError) {
      console.error("Lỗi xác thực webhook PayOS:", verifyError);
      return NextResponse.json({ success: true, message: "Webhook received but signature invalid" }, { status: 200 }); // Trả về 200 để ngắt loop PayOS
    }

    if (webhookData.code !== "00") {
      return NextResponse.json({ success: true, message: "Not a successful payment event" }, { status: 200 });
    }

    const orderCode = webhookData.orderCode;

    // 2. Kiểm tra tính toàn vẹn của số tiền (Chống "Quét QR sửa giá")
    const invoice = await prisma.invoice.findUnique({
      where: { orderCode: BigInt(orderCode) }
    });

    if (!invoice) {
      console.error(`Webhook: Không tìm thấy Invoice cho orderCode ${orderCode}`);
      return NextResponse.json({ success: true, message: "Invoice not found" }, { status: 200 });
    }

    if (webhookData.amount !== invoice.amount) {
      console.error(`CẢNH BÁO BẢO MẬT: Khách hàng cố tình chuyển sai số tiền! Yêu cầu: ${invoice.amount}, Thực tế: ${webhookData.amount}`);
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { 
          status: "CANCELLED", // Hoặc tạo thêm status PAYMENT_DISCREPANCY trong Enum sau này
          payosStatus: "AMOUNT_MISMATCH"
        }
      });
      return NextResponse.json({ success: true, message: "Amount mismatch detected" }, { status: 200 });
    }

    // 3. Khóa Nguyên Tử (Atomic Update) - Giải quyết dứt điểm Idempotency Race Condition
    // Chỉ cập nhật nếu trạng thái hiện tại đang là PENDING
    const updateResult = await prisma.invoice.updateMany({
      where: { 
        id: invoice.id,
        status: "PENDING"
      },
      data: {
        status: "PAID",
        payosStatus: "00",
      }
    });

    // Nếu count === 0 nghĩa là Webhook thứ 2 đến sau khi Webhook thứ 1 đã xử lý xong, 
    // HOẶC đơn đã hết hạn và chuyển sang CANCELLED trước đó. -> An toàn tuyệt đối, bỏ qua.
    if (updateResult.count === 0) {
      console.log(`Invoice ${invoice.id} đã xử lý xong hoặc không còn PENDING. Bỏ qua webhook rác.`);
      return NextResponse.json({ success: true, message: "Already processed or invalid state" }, { status: 200 });
    }

    // 4. Nếu update thành công, kích hoạt các side-effects khác
    await prisma.rentalHistory.update({
      where: { id: invoice.rentalId },
      data: { status: "LENDER_SHIPPED" } // Xác nhận hợp đồng
    });

    // Có thể chèn dữ liệu Sổ cái (Ledger) hoặc bắn Event cho Hệ thống vận chuyển ở đây
    await prisma.ledgerTransaction.create({
      data: {
        invoiceId: invoice.id,
        type: "DEPOSIT_IN",
        amount: invoice.amount,
        status: "COMPLETED",
        description: "Thu tiền qua PayOS Webhook"
      }
    });

    return NextResponse.json({ success: true, message: "Webhook processed perfectly" }, { status: 200 });

  } catch (error) {
    console.error("Lỗi hệ thống khi xử lý webhook:", error);
    // Vẫn trả về 200 để ngắt loop của PayOS, tránh Spam
    return NextResponse.json({ success: true, message: "Server error but acknowledged" }, { status: 200 });
  }
}
