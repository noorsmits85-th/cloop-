import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { payos } from '../lib/payos';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Helper tạo Chữ ký giả lập giống cách PayOS tạo chữ ký (để test)
function generateMockSignature(data: any, checksumKey: string): string {
  const sortedDataByKey = Object.keys(data)
    .sort()
    .reduce((acc: any, key: string) => {
      acc[key] = data[key];
      return acc;
    }, {});
    
  const signData = Object.entries(sortedDataByKey)
    .filter(([key, value]) => value !== undefined && value !== null && key !== 'signature')
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return crypto.createHmac('sha256', checksumKey).update(signData).digest('hex');
}

async function testWebhookFirstLedger() {
  console.log("🚀 Bắt đầu test luồng Webhook-first ledger...");

  // 1. Dọn dẹp test data cũ (nếu có)
  const mockOrderCode = 9999999999n;
  // Bỏ qua tạo RentalHistory giả, Insert trực tiếp Invoice bằng Raw SQL để test luồng Webhook
  const invoiceId = "test-invoice-12345";
  const invoiceAmount = 500000;
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "Invoice" ("id", "rentalId", "amount", "status", "orderCode", "updatedAt")
    VALUES ($1, $2, $3, 'PENDING', $4, NOW())
    ON CONFLICT ("orderCode") DO UPDATE SET "amount" = $3, "status" = 'PENDING';
  `, invoiceId, "dummy-rental-123", invoiceAmount, Number(mockOrderCode));
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
  
  const targetInvoice = await prisma.invoice.findUnique({ where: { orderCode: mockOrderCode } });
  if (!targetInvoice) throw new Error("Insert raw sql thất bại.");

  // 3. Giả lập PayOS Webhook Payload
  console.log("\n📡 Nhận tín hiệu Webhook từ PayOS...");
  const webhookData: any = {
    code: "00",
    desc: "success",
    data: {
      orderCode: Number(mockOrderCode),
      amount: invoiceAmount, // Trùng amount
      description: "CLOOP NẠP TIỀN",
      accountNumber: "123456789",
      reference: "FT1234567",
      transactionDateTime: "2026-08-17 00:00:00",
      currency: "VND",
      paymentLinkId: "xyz123",
      code: "00",
      desc: "success",
      counterAccountBankId: "vcb",
      counterAccountBankName: "Vietcombank",
      counterAccountName: "NGUYEN VAN A",
      counterAccountNumber: "0987654321",
      virtualAccountName: "CLOOP",
      virtualAccountNumber: "19001560"
    }
  };

  // Ký payload này bằng ChecksumKey thật
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY!;
  webhookData.signature = generateMockSignature(webhookData.data, checksumKey);

  // --- HÀM XỬ LÝ WEBHOOK CORE ---
  try {
    console.log("🛡️ Lớp Khiên 1: Xác minh Chữ ký (Signature Verification)...");
    const verifiedData = await payos.webhooks.verify(webhookData);
    console.log("✅ Chữ ký HỢP LỆ!", verifiedData);

    console.log("🔍 Đang truy xuất Invoice...");
    const targetInvoice = await prisma.invoice.findUnique({
      where: { orderCode: BigInt(verifiedData.orderCode) }
    });

    if (!targetInvoice) {
      throw new Error(`Invoice với orderCode ${verifiedData.orderCode} không tồn tại.`);
    }

    console.log("⚖️ Luật Cross-check Tiền Tệ...");
    if (verifiedData.amount !== targetInvoice.amount) {
      console.log(`❌ LỆCH TIỀN! Yêu cầu: ${targetInvoice.amount}, Nhận được: ${verifiedData.amount}`);
      // Lưu lại với trạng thái AMOUNT_MISMATCH
      await prisma.transactionHistory.create({
        data: {
          eventId: verifiedData.reference,
          orderCode: BigInt(verifiedData.orderCode),
          invoiceId: targetInvoice.id,
          amount: verifiedData.amount,
          invoiceAmount: targetInvoice.amount,
          status: 'AMOUNT_MISMATCH',
          rawPayload: webhookData
        }
      });
      // Return 200 OK để PayOS không gửi lại, nhưng không xử lý Ledger
      return;
    }
    console.log("✅ Khớp số tiền!");

    if (targetInvoice.status !== 'PENDING') {
      console.log("ℹ️ Invoice không còn ở trạng thái PENDING. Có thể đã được xử lý. Bỏ qua.");
      return;
    }

    console.log("🛡️ Lớp Khiên 2: Kiểm tra Lũy Đẳng (Idempotency) & Lớp Kế Toán Thép (Atomic Transaction)...");
    
    // Gộp tất cả vào $transaction
    await prisma.$transaction(async (tx) => {
      // Thử Insert TransactionHistory. Nếu reference đã tồn tại, nó sẽ văng lỗi UniqueConstraint
      // Hoặc ta check tay trước:
      const existingTx = await tx.transactionHistory.findUnique({
        where: { orderCode: BigInt(verifiedData.orderCode) }
      });

      if (existingTx) {
        console.log("ℹ️ Transaction đã tồn tại (Lặp Webhook). Đánh dấu DUPLICATE...");
        // Cập nhật existingTx nếu cần
        return; // Thoát an toàn
      }

      console.log("   ➤ Ghi nhận TransactionHistory (VERIFIED -> PROCESSED)");
      const history = await tx.transactionHistory.create({
        data: {
          eventId: verifiedData.reference,
          orderCode: BigInt(verifiedData.orderCode),
          invoiceId: targetInvoice.id,
          amount: verifiedData.amount,
          invoiceAmount: targetInvoice.amount,
          status: 'PROCESSED',
          rawPayload: webhookData,
          processedAt: new Date()
        }
      });

      console.log("   ➤ Cập nhật Invoice thành PAID/COMPLETED");
      await tx.invoice.update({
        where: { id: targetInvoice.id },
        data: { status: 'PAID', payosStatus: 'success' }
      });

      console.log("   ➤ (Mô phỏng) Ghi vào Sổ cái và Cộng Tiền vào Ví...");
      // ... await tx.wallet.update ...

      console.log("✅ Atomic Transaction Hoàn tất không có lỗi!");
    });

  } catch (error: any) {
    console.error("❌ Lỗi Xử lý Webhook:", error.message);
    // Nếu lỗi chữ ký -> 403 Forbidden
  }

  // 4. Kiểm tra lại DB sau cùng
  console.log("\n📊 TRẠNG THÁI DATABASE CUỐI CÙNG:");
  const finalInvoice = await prisma.invoice.findUnique({ where: { orderCode: mockOrderCode } });
  const finalTx = await prisma.transactionHistory.findUnique({ where: { orderCode: mockOrderCode } });
  
  console.log("Invoice Status:", finalInvoice?.status);
  console.log("TransactionHistory Status:", finalTx?.status);

  console.log("\n🛡️ Lớp Khiên 3 (Realtime): Supabase sẽ tự động bắt sự kiện Insert TransactionHistory và bắn về Client (Client-side implementation)!");
}

testWebhookFirstLedger()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
