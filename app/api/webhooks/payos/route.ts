import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';

import { prisma } from "@/src/lib/prisma";
import { payos } from "@/lib/payos";

export async function POST(req: Request) {
  try {
    if (!payos) {
      return NextResponse.json({ success: false, message: "Missing PayOS config" }, { status: 500 });
    }

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

    // 2. Tìm kiếm Invoice (Đơn thuê) hoặc CoinTopUp (Mua gói Lá)
    const invoice = await prisma.invoice.findUnique({
      where: { orderCode: BigInt(orderCode) }
    });

    // ===== NHÁNH 1: THANH TOÁN MUA GÓI ĐIỂM LÁ (CoinTopUp) =====
    if (!invoice) {
      const coinTopUp = await prisma.coinTopUp.findUnique({
        where: { orderCode: BigInt(orderCode) }
      });

      if (!coinTopUp) {
        console.error(`❌ Webhook: Không tìm thấy Invoice hoặc CoinTopUp cho orderCode ${orderCode}`);
        return NextResponse.json({ success: true, message: "Order not found" }, { status: 200 });
      }

      // Kiểm tra số tiền
      if (verifiedData.amount !== coinTopUp.amountVnd) {
        console.error(`⚠️ CẢNH BÁO MUA LÁ: Lệch số tiền! Yêu cầu: ${coinTopUp.amountVnd}, Thực tế: ${verifiedData.amount}`);
        await prisma.coinTopUp.update({
          where: { id: coinTopUp.id },
          data: { status: "AMOUNT_MISMATCH", rawPayload: body }
        });
        return NextResponse.json({ success: true, message: "Amount mismatch detected" }, { status: 200 });
      }

      // Idempotency: Nếu đã PAID thì bỏ qua
      if (coinTopUp.status === "PAID") {
        console.log(`ℹ️ CoinTopUp ${coinTopUp.id} đã hoàn tất từ trước. Bỏ qua webhook trùng.`);
        return NextResponse.json({ success: true, message: "Already processed" }, { status: 200 });
      }

      // Atomic Transaction: Cập nhật CoinTopUp -> Tăng cloopCoins -> Ghi CoinLedgerEntry
      try {
        await prisma.$transaction(async (tx) => {
          await tx.coinTopUp.update({
            where: { id: coinTopUp.id },
            data: {
              status: "PAID",
              payosStatus: "success",
              paidAt: new Date(),
              rawPayload: body
            }
          });

          const updatedUser = await tx.user.update({
            where: { id: coinTopUp.userId },
            data: {
              cloopCoins: { increment: coinTopUp.totalCoins }
            },
            select: { cloopCoins: true }
          });

          await tx.coinLedgerEntry.create({
            data: {
              userId: coinTopUp.userId,
              topUpId: coinTopUp.id,
              type: "TOP_UP_IN",
              amount: coinTopUp.totalCoins,
              balanceAfter: updatedUser.cloopCoins,
              description: `Nạp gói ${coinTopUp.packageCode} (+${coinTopUp.totalCoins.toLocaleString()} Lá)`,
              metadata: {
                orderCode: Number(orderCode),
                amountVnd: coinTopUp.amountVnd,
                baseCoins: coinTopUp.baseCoins,
                bonusCoins: coinTopUp.bonusCoins
              }
            }
          });
        });

        console.log(`✅ [CoinTopUp] Đã cộng thành công ${coinTopUp.totalCoins} Lá cho User ${coinTopUp.userId}`);
      } catch (coinDbErr) {
        console.error("❌ Lỗi DB khi cộng Điểm Lá từ Webhook:", coinDbErr);
        return NextResponse.json({ success: false, message: "Database Error" }, { status: 500 });
      }

      try {
        const { revalidatePath } = require("next/cache");
        revalidatePath("/my-closet/wallet");
      } catch (_) {}

      return NextResponse.json({ success: true, message: "Coin Top-up processed successfully" }, { status: 200 });
    }

    // ===== NHÁNH 2: THANH TOÁN ĐƠN THUÊ TRANG PHỤC (Invoice) =====
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
    let productIdToRevalidate: string | null = null;
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

        console.log(`➤ Cập nhật Invoice thành PAID/COMPLETED và Ghi Sổ Cái DEPOSIT_IN`);
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: 'PAID', payosStatus: 'success' }
        });

        await tx.ledgerTransaction.create({
          data: {
            invoiceId: invoice.id,
            type: 'DEPOSIT_IN',
            amount: verifiedData.amount,
            description: `Tiền nạp thanh toán Đơn thuê Cloop - OrderCode ${orderCode}`,
            status: 'COMPLETED'
          }
        });

        if (invoice.rentalId) {
          const rental = await tx.rentalHistory.findUnique({ where: { id: invoice.rentalId } });
          if (rental) {
            productIdToRevalidate = rental.product_id;
            await tx.rentalHistory.update({
              where: { id: rental.id },
              data: { status: "PENDING_APPROVAL" }
            });
          }
        }
      });
    } catch (err) {
      console.error("❌ Lỗi khi lưu Transaction vào Database:", err);
      // Ném lỗi 500 để PayOS tự động Retry sau 5 phút theo chuẩn "Kế toán thép"
      return NextResponse.json({ success: false, message: "Database Error" }, { status: 500 });
    }

    // Dọn rác cache sau khi giao dịch thành công (đặt trong try-catch riêng để webhook không văng lỗi)
    if (productIdToRevalidate) {
      try {
        const { revalidatePath } = require('next/cache');
        revalidatePath('/shop');
        revalidatePath(`/product/${productIdToRevalidate}`);
        revalidatePath('/my-closet/orders');
      } catch (cacheError) {
        console.error("Lỗi dọn rác cache, nhưng tiền đã vào ví nên cứ kệ nó:", cacheError);
      }
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
