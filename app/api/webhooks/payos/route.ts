import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { payos } from "@/src/utils/payos";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Xác thực Webhook chữ ký từ PayOS
    try {
      const webhookData = (await payos.webhooks.verify(body)) as any;
      
      // Nếu trạng thái Webhook không phải là thanh toán thành công, có thể bỏ qua hoặc lưu log
      if (webhookData.code !== "00") {
        return NextResponse.json({ message: "Not a successful payment event" }, { status: 200 });
      }

      const orderCode = webhookData.orderCode;

      // 2. Sử dụng Transaction để đảm bảo tính toàn vẹn và Idempotent
      await prisma.$transaction(async (tx) => {
        // Tìm Invoice theo orderCode
        const invoice = await tx.invoice.findUnique({
          where: { orderCode: BigInt(orderCode) }
        });

        if (!invoice) {
          throw new Error("Không tìm thấy Invoice cho orderCode này");
        }

        // Kiểm tra tính Idempotent: Nếu đã PAID rồi thì bỏ qua
        if (invoice.status === "PAID") {
          console.log(`Invoice ${invoice.id} đã thanh toán trước đó. Bỏ qua webhook lặp.`);
          return;
        }

        // Cập nhật Invoice
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: "PAID",
            payosStatus: "00",
          }
        });

        // Cập nhật RentalHistory
        await tx.rentalHistory.update({
          where: { id: invoice.rentalId },
          data: { status: "active" }
        });

        // Có thể sinh thêm dữ liệu Sổ cái (Ledger) tự động ở đây nếu cần thiết, 
        // nhưng theo plan ta chỉ update trạng thái hợp đồng, Sổ cái sẽ được tạo thủ công hoặc hiển thị động.
        // Để giữ tính toàn vẹn của Sổ cái, ta chèn 1 dòng Nạp Tiền (DEPOSIT_IN)
        await tx.ledgerTransaction.create({
          data: {
            invoiceId: invoice.id,
            type: "DEPOSIT_IN",
            amount: invoice.amount,
            status: "COMPLETED",
            description: "Thu tiền thanh toán cọc qua PayOS"
          }
        });

      });

      return NextResponse.json({ message: "Webhook processed successfully" }, { status: 200 });

    } catch (verifyError) {
      console.error("Lỗi xác thực webhook PayOS:", verifyError);
      return NextResponse.json({ error: "Invalid Webhook Signature" }, { status: 400 });
    }

  } catch (error) {
    console.error("Lỗi xử lý webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
