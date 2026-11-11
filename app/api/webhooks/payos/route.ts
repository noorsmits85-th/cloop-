import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';

import { prisma } from "@/src/lib/prisma";
import { payos } from "@/lib/payos";
import * as Sentry from "@sentry/nextjs";
import {
  getActiveWalletHoldForInvoice,
  releasePendingWalletHoldForInvoice,
  verifyWalletRolloverEntry,
  buildLatePaymentRefundDescription,
} from "@/src/lib/wallet-reconciliation";
import { withProductBoostLock, lockAndExtendProductBoostInTx } from "@/app/actions/boost";

const settledLateRefundKeys = new Set<string>();

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

    const orderCode = verifiedData?.orderCode ?? body?.data?.orderCode;

    if (body.code !== "00") {
      const statusHint = String(
        body?.data?.status || body?.status || body?.desc || verifiedData?.desc || ""
      ).toUpperCase();
      const isCancelledOrExpired =
        body?.cancel === true ||
        statusHint.includes("CANCEL") ||
        statusHint.includes("EXPIRE");

      if (isCancelledOrExpired && orderCode) {
        try {
          await prisma.$transaction(async (tx) => {
            const pendingInv = await tx.invoice.findUnique({
              where: { orderCode: BigInt(orderCode) },
              include: { rental: { select: { id: true, renterId: true, product_id: true } } },
            });
            if (pendingInv && pendingInv.status === "PENDING") {
              if (pendingInv.rental?.product_id && typeof tx.$executeRaw === "function") {
                await tx.$executeRaw`SELECT id FROM "products" WHERE id = ${pendingInv.rental.product_id} FOR UPDATE`;
              }
              const updated = await tx.invoice.updateMany({
                where: { id: pendingInv.id, status: "PENDING" },
                data: { status: "CANCELLED", payosStatus: statusHint || "CANCELLED" },
              });
              if (updated.count > 0) {
                if (pendingInv.rental?.renterId) {
                  await releasePendingWalletHoldForInvoice(tx, {
                    invoiceId: pendingInv.id,
                    renterId: pendingInv.rental.renterId,
                    orderCode,
                    reason: "Hủy/Hết hạn mã QR PayOS qua Webhook",
                  });
                }
                if (pendingInv.rental?.id) {
                  await tx.rentalHistory.updateMany({
                    where: { id: pendingInv.rental.id, status: "PENDING_APPROVAL" },
                    data: { status: "CANCELLED" },
                  });
                }
                if (pendingInv.rental?.product_id && typeof tx.listing?.updateMany === "function") {
                  const otherLive =
                    typeof tx.rentalHistory?.findFirst === "function"
                      ? await tx.rentalHistory.findFirst({
                          where: {
                            product_id: pendingInv.rental.product_id,
                            id: { not: pendingInv.rental.id },
                            isDeleted: false,
                            status: { notIn: ["LENDER_COMPLETED", "CANCELLED"] },
                          },
                          select: { id: true },
                        })
                      : null;
                  if (!otherLive) {
                    await tx.listing.updateMany({
                      where: { productId: pendingInv.rental.product_id, status: "RESERVED" },
                      data: { status: "AVAILABLE" },
                    });
                  }
                }
              }
            }
            await tx.coinTopUp.updateMany({
              where: { orderCode: BigInt(orderCode), status: "PENDING" },
              data: { status: "CANCELLED", payosStatus: statusHint || "CANCELLED" },
            });
          });
        } catch (cancelErr) {
          console.warn("Webhook cancel status update warning:", cancelErr);
        }
      }

      return NextResponse.json({ success: true, message: "Not a successful payment event" }, { status: 200 });
    }

    // 2. Tìm kiếm Invoice (Đơn thuê) hoặc CoinTopUp (Mua gói Lá)
    const invoice = await prisma.invoice.findUnique({
      where: { orderCode: BigInt(orderCode) },
      include: { rental: { select: { id: true, renterId: true, product_id: true, status: true, isDeleted: true } } },
    });

    // ===== NHÁNH 1: THANH TOÁN MUA GÓI ĐIỂM LÁ / ĐẨY TOP (CoinTopUp) =====
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

      const existingRaw = (coinTopUp.rawPayload as any) || {};
      const isBoostPackage =
        coinTopUp.packageCode.startsWith("BOOST_QR_") ||
        coinTopUp.packageCode.startsWith("BOOST_") ||
        existingRaw.type === "PRODUCT_BOOST";

      // Atomic Transaction: Cập nhật CoinTopUp -> Tăng cloopCoins hoặc Kích hoạt Boost -> Ghi CoinLedgerEntry
      try {
        const boostTargetId = isBoostPackage
          ? String(
              existingRaw.productId ||
                (coinTopUp.packageCode.startsWith("BOOST_QR_")
                  ? coinTopUp.packageCode.replace("BOOST_QR_", "").split("_")[0]
                  : "")
            ).trim()
          : "";

        if (isBoostPackage && !boostTargetId) {
          return NextResponse.json({ success: false, message: "Missing boost productId" }, { status: 400 });
        }

        const runTopUpTransaction = () =>
          prisma.$transaction(async (tx) => {
            // Kiểm tra xem Sổ cái đã có bản ghi này chưa (Idempotency kép)
            const existingLedger = await tx.coinLedgerEntry.findFirst({
              where: { topUpId: coinTopUp.id, type: { in: ["TOP_UP_IN", "BOOST_SPEND"] } }
            });
            if (existingLedger) {
              return;
            }

            if (isBoostPackage) {
              const hours = Math.min(720, Math.max(1, Math.round(Number(existingRaw.hours || 24))));
              // 🔒 Khóa sản phẩm & kiểm tra hợp lệ TRƯỚC khi tiêu thụ CoinTopUp
              const boostOut = await lockAndExtendProductBoostInTx(tx, {
                productId: boostTargetId,
                expectedOwnerId: coinTopUp.userId,
                hours,
                coins: coinTopUp.totalCoins,
                highlight: true
              });

              const updateResult = await tx.coinTopUp.updateMany({
                where: { id: coinTopUp.id, status: { in: ["PENDING", "AMOUNT_MISMATCH"] } },
                data: {
                  status: "PAID",
                  payosStatus: "success",
                  paidAt: new Date(),
                  rawPayload: { ...existingRaw, webhookBody: body }
                }
              });

              if (updateResult.count === 0) {
                throw new Error("ALREADY_CONSUMED_CONCURRENTLY");
              }

              const currentUser = await tx.user.findUnique({
                where: { id: coinTopUp.userId },
                select: { cloopCoins: true }
              });

              await tx.coinLedgerEntry.create({
                data: {
                  userId: coinTopUp.userId,
                  topUpId: coinTopUp.id,
                  type: "TOP_UP_IN",
                  amount: coinTopUp.totalCoins,
                  balanceAfter: (currentUser?.cloopCoins || 0) + coinTopUp.totalCoins,
                  description: `Nạp trực tiếp VietQR cho gói Đẩy Top (${coinTopUp.packageCode})`,
                  metadata: {
                    productId: boostTargetId,
                    hours,
                    coins: coinTopUp.totalCoins,
                    orderCode: Number(orderCode),
                    amountVnd: coinTopUp.amountVnd
                  }
                }
              });

              await tx.coinLedgerEntry.create({
                data: {
                  userId: coinTopUp.userId,
                  topUpId: coinTopUp.id,
                  type: "BOOST_SPEND",
                  amount: -coinTopUp.totalCoins,
                  balanceAfter: currentUser?.cloopCoins || 0,
                  description: `Đẩy Top bài viết "${boostOut.title}" (+${hours}h, +${coinTopUp.totalCoins} Lá đua Top qua VietQR)`,
                  metadata: {
                    productId: boostTargetId,
                    hours,
                    coins: coinTopUp.totalCoins,
                    orderCode: Number(orderCode),
                    amountVnd: coinTopUp.amountVnd
                  }
                }
              });
              return;
            }

            // 🛡️ CHỐT CHẶN NGUYÊN TỬ CHO GÓI NẠP LÁ THƯỜNG & KYC
            const updateResult = await tx.coinTopUp.updateMany({
              where: { id: coinTopUp.id, status: { in: ["PENDING", "AMOUNT_MISMATCH"] } },
              data: {
                status: "PAID",
                payosStatus: "success",
                paidAt: new Date(),
                rawPayload: { ...existingRaw, webhookBody: body }
              }
            });

            if (updateResult.count === 0) {
              console.log(`ℹ️ CoinTopUp ${coinTopUp.id} đã được luồng khác xử lý thành công. Bỏ qua duplicate.`);
              return;
            }

            const isKycPackage = coinTopUp.packageCode === "KYC_1K" || coinTopUp.packageCode === "KYC_2K";
            const updatedUser = await tx.user.update({
              where: { id: coinTopUp.userId },
              data: {
                cloopCoins: { increment: coinTopUp.totalCoins },
                ...(isKycPackage ? { 
                  isVerified: true,
                  walletBalance: { increment: Math.min(2000, Math.max(0, coinTopUp.amountVnd)) } 
                } : {}),
              },
              select: { cloopCoins: true, walletBalance: true }
            });

            if (isKycPackage && existingRaw?.phone) {
              try {
                await tx.$executeRawUnsafe(
                  `UPDATE auth.users
                   SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
                     'phone', $1::text,
                     'phone_verified', true,
                     'kyc_method', 'VIETQR_EKYC_2K',
                     'kyc_verified_at', $2::text
                   )
                   WHERE id = $3::uuid;`,
                  String(existingRaw.phone),
                  new Date().toISOString(),
                  coinTopUp.userId
                );
              } catch (_) {}
            }

            await tx.coinLedgerEntry.create({
              data: {
                userId: coinTopUp.userId,
                topUpId: coinTopUp.id,
                type: "TOP_UP_IN",
                amount: coinTopUp.totalCoins,
                balanceAfter: updatedUser.cloopCoins,
                description: `Nạp gói ${coinTopUp.packageCode} (+${coinTopUp.totalCoins.toLocaleString("vi-VN")} Lá)`,
                metadata: {
                  orderCode: Number(orderCode),
                  amountVnd: coinTopUp.amountVnd,
                  baseCoins: coinTopUp.baseCoins,
                  bonusCoins: coinTopUp.bonusCoins
                }
              }
            });
          });

        if (isBoostPackage) {
          await withProductBoostLock(boostTargetId, runTopUpTransaction);
        } else {
          await runTopUpTransaction();
        }

        console.log(`✅ [CoinTopUp] Đã xử lý thành công giao dịch ${coinTopUp.packageCode} cho User ${coinTopUp.userId}`);
      } catch (coinDbErr) {
        console.error("❌ Lỗi DB khi cộng Điểm Lá từ Webhook:", coinDbErr);
        return NextResponse.json({ success: false, message: "Database Error" }, { status: 500 });
      }

      try {
        const { revalidatePath } = require("next/cache");
        revalidatePath("/my-closet/wallet");
        revalidatePath("/my-closet/profile");
        revalidatePath("/admin/identity");
      } catch (_) {}

      return NextResponse.json({ success: true, message: "Coin Top-up processed successfully" }, { status: 200 });
    }

    // ===== NHÁNH 2: THANH TOÁN ĐƠN THUÊ TRANG PHỤC (Invoice) =====
    const holdState = await getActiveWalletHoldForInvoice(invoice.id);
    const walletHoldAmount = Number(holdState?.walletHoldAmount || 0);
    const originalHoldAmount = Number((holdState as any)?.originalHoldAmount || walletHoldAmount || 0);
    const holdDescription = holdState?.holdDescription || null;
    const holdAlreadyRefunded =
      Boolean((holdState as any)?.alreadyRefunded) ||
      (originalHoldAmount > 0 && walletHoldAmount === 0);

    let expectedPayosAmount = invoice.amount;
    const effectiveHoldForSeal = walletHoldAmount > 0 ? walletHoldAmount : originalHoldAmount;

    if (effectiveHoldForSeal > 0 && invoice.rental?.renterId && holdDescription) {
      const sealCheck = verifyWalletRolloverEntry({
        description: holdDescription,
        userId: invoice.rental.renterId,
        invoiceId: invoice.id,
        orderCode: BigInt(orderCode),
        walletUsedAmount: effectiveHoldForSeal,
        invoiceTotalAmount: invoice.amount,
      });

      if (sealCheck.valid) {
        expectedPayosAmount = sealCheck.payosAmountToCollect;
      } else {
        console.error(`⚠️ CẢNH BÁO BẢO MẬT: Chữ ký số SEAL của bút toán giữ Ví không hợp lệ cho Invoice ${invoice.id}`);
      }
    }

    const isInvoiceAlreadyCancelled =
      invoice.status === "CANCELLED" ||
      invoice.rental?.status === "CANCELLED" ||
      Boolean((invoice.rental as any)?.isDeleted);

    // Nếu đơn đã CANCELLED (hoặc phần tiền giữ Ví của đơn kết hợp đã được giải phóng khi hủy),
    // khoản tiền thực nhận hợp lệ từ PayOS (0 < verifiedData.amount <= invoice.amount) phải được đưa vào nhánh hoàn trả tự động (late-payment refund)
    // thay vì bị từ chối bởi AMOUNT_MISMATCH!
    const isValidLateSplitOrFullReceipt =
      (isInvoiceAlreadyCancelled || holdAlreadyRefunded) &&
      verifiedData.amount > 0 &&
      verifiedData.amount <= invoice.amount &&
      (effectiveHoldForSeal === 0 || verifiedData.amount === expectedPayosAmount);

    if (verifiedData.amount !== expectedPayosAmount && !isValidLateSplitOrFullReceipt) {
      console.error(
        `⚠️ CẢNH BÁO: Lệch số tiền! Yêu cầu PayOS: ${expectedPayosAmount} (Tổng HĐ: ${invoice.amount}, Ví giữ: ${walletHoldAmount}), Thực tế: ${verifiedData.amount}`
      );

      // Ghi log TransactionHistory với trạng thái AMOUNT_MISMATCH
      await prisma.transactionHistory.upsert({
        where: { orderCode: BigInt(orderCode) },
        update: {
          eventId: verifiedData.reference,
          amount: verifiedData.amount,
          invoiceAmount: invoice.amount,
          status: 'AMOUNT_MISMATCH',
          rawPayload: body
        },
        create: {
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

    if (invoice.status === 'PAID') {
      console.log(`ℹ️ Invoice ${invoice.id} đã PAID từ trước. Bỏ qua webhook trùng.`);
      return NextResponse.json({ success: true, message: "Already processed" }, { status: 200 });
    }

    // 3. Khóa Nguyên Tử (Atomic Update) CÓ AWAIT để đảm bảo Serverless không bị đóng băng
    let productIdToRevalidate: string | null = null;
    try {
      await prisma.$transaction(async (tx) => {
        const existingTx = await tx.transactionHistory.findUnique({
          where: { orderCode: BigInt(orderCode) }
        });

        // 🛡️ CHỐNG POISON TRANSACTION: Chỉ bỏ qua nếu transaction trước đó đã được xử lý THÀNH CÔNG (PROCESSED)
        if (existingTx && existingTx.status === 'PROCESSED') {
          console.log(`ℹ️ Transaction ${orderCode} đã tồn tại (PROCESSED). Bỏ qua duplicate...`);
          return;
        }

        // 🔒 Đồng bộ Khóa Sản Phẩm với luồng Xóa/Lưu trữ (deleteProductAction) và Cron hết hạn (release-locks)
        let isCancelledOrArchivedBeforePayment =
          invoice.status === 'CANCELLED' ||
          holdAlreadyRefunded ||
          (verifiedData.amount !== expectedPayosAmount && isValidLateSplitOrFullReceipt);
        let lateRefundRenterId: string | null = invoice.rental?.renterId || null;

        if (invoice.rentalId) {
          const rental = await tx.rentalHistory.findUnique({
            where: { id: invoice.rentalId },
            select: { id: true, product_id: true, renterId: true, status: true, isDeleted: true }
          });
          if (rental?.renterId) {
            lateRefundRenterId = rental.renterId;
          }
          if (rental?.product_id && typeof tx.$executeRaw === 'function') {
            await tx.$executeRaw`SELECT id FROM "products" WHERE id = ${rental.product_id} FOR UPDATE`;
          }
          const targetProduct = rental?.product_id
            ? await tx.product.findUnique({
                where: { id: rental.product_id },
                select: { id: true, isDeleted: true }
              })
            : null;
          if (!rental || rental.isDeleted || rental.status === 'CANCELLED' || !targetProduct || targetProduct.isDeleted) {
            isCancelledOrArchivedBeforePayment = true;
          } else {
            productIdToRevalidate = rental.product_id;
          }
        }

        // 🔒 KIỂM TRA LẠI TRẠNG THÁI TRANSACTION BÊN TRONG KHÓA SẢN PHẨM (CHỐNG CỘNG VÍ 2 LẦN DO WEBHOOK TRÙNG SONG SONG)
        const existingTxAfterLock = await tx.transactionHistory.findUnique({
          where: { orderCode: BigInt(orderCode) }
        });
        if (existingTxAfterLock && existingTxAfterLock.status === 'PROCESSED') {
          console.log(`ℹ️ Transaction ${orderCode} đã được xử lý bởi luồng song song dưới khóa. Bỏ qua duplicate...`);
          return;
        }

        const invoiceUpdate = !isCancelledOrArchivedBeforePayment
          ? await tx.invoice.updateMany({
              where: { id: invoice.id, status: 'PENDING' },
              data: { status: 'PAID', payosStatus: 'success' }
            })
          : { count: 0 };

        if (invoiceUpdate.count === 0) {
          // Kiểm tra xem hóa đơn đã PAID bởi luồng song song hay đã CANCELLED do quá hạn
          const freshInvoice =
            typeof tx.invoice?.findUnique === 'function'
              ? await tx.invoice.findUnique({ where: { id: invoice.id }, select: { status: true, payosStatus: true } })
              : { status: invoice.status, payosStatus: (invoice as any).payosStatus };
          if (freshInvoice?.status === 'PAID' || freshInvoice?.payosStatus === 'LATE_REFUNDED') {
            return;
          }

          if (typeof tx.ledgerTransaction?.findFirst === 'function') {
            const existingRefundLedger = await tx.ledgerTransaction.findFirst({
              where: {
                invoiceId: invoice.id,
                type: 'REFUND_OUT',
                status: 'COMPLETED',
                description: { contains: `OrderCode ${orderCode}` }
              }
            });
            if (existingRefundLedger) {
              return;
            }
          }

          if (typeof tx.invoice?.updateMany === 'function') {
            const claimLateRefund = await tx.invoice.updateMany({
              where: {
                id: invoice.id,
                status: { in: ['CANCELLED', 'PENDING'] },
                OR: [{ payosStatus: null }, { payosStatus: { not: 'LATE_REFUNDED' } }]
              },
              data: { status: 'CANCELLED', payosStatus: 'LATE_REFUNDED' }
            });
            if (claimLateRefund && typeof claimLateRefund.count === 'number' && claimLateRefund.count === 0) {
              return;
            }
          } else {
            const claimKey = `${invoice.id}:${String(orderCode)}:${String(verifiedData.reference || '')}`;
            if (settledLateRefundKeys.has(claimKey)) {
              return;
            }
            settledLateRefundKeys.add(claimKey);
          }

          // Nếu khoản giữ Ví vẫn chưa được giải phóng trên đơn bị hủy/lưu trữ, giải phóng nguyên tử về Ví trước
          if (walletHoldAmount > 0 && lateRefundRenterId && typeof releasePendingWalletHoldForInvoice === 'function') {
            await releasePendingWalletHoldForInvoice(tx, {
              invoiceId: invoice.id,
              renterId: lateRefundRenterId,
              orderCode: BigInt(orderCode),
              reason: 'Giải phóng giữ Ví khi hoàn tiền thanh toán trễ'
            });
          }

          // Phối hợp hoàn trả tự động vào Ví nội bộ cho khoản thanh toán đến trễ sau khi đơn đã hết hạn/hủy (Cron-before-Webhook)
          await tx.transactionHistory.upsert({
            where: { orderCode: BigInt(orderCode) },
            update: {
              eventId: verifiedData.reference,
              invoiceId: invoice.id,
              amount: verifiedData.amount,
              invoiceAmount: invoice.amount,
              status: 'PROCESSED',
              rawPayload: { ...body, latePaymentRefundedToWallet: true },
              processedAt: new Date()
            },
            create: {
              eventId: verifiedData.reference,
              orderCode: BigInt(orderCode),
              invoiceId: invoice.id,
              amount: verifiedData.amount,
              invoiceAmount: invoice.amount,
              status: 'PROCESSED',
              rawPayload: { ...body, latePaymentRefundedToWallet: true },
              processedAt: new Date()
            }
          });

          if (lateRefundRenterId && typeof tx.user?.update === 'function') {
            await tx.user.update({
              where: { id: lateRefundRenterId },
              data: { walletBalance: { increment: verifiedData.amount } }
            });
          }

          const refundDescription =
            typeof buildLatePaymentRefundDescription === 'function'
              ? buildLatePaymentRefundDescription({
                  userId: lateRefundRenterId || 'UNKNOWN',
                  invoiceId: invoice.id,
                  orderCode: BigInt(orderCode),
                  amount: verifiedData.amount
                })
              : `[LATE_PAYMENT_REFUND] Hoàn tự động vào Ví khoản thanh toán đến trễ sau khi đơn hết hạn/hủy - OrderCode ${orderCode} | INV:${invoice.id} | AMOUNT:${verifiedData.amount}`;

          await tx.ledgerTransaction.create({
            data: {
              invoiceId: invoice.id,
              type: 'REFUND_OUT',
              amount: verifiedData.amount,
              description: refundDescription,
              status: 'COMPLETED'
            }
          });
          return;
        }

        console.log(`➤ Cập nhật Invoice thành PAID/COMPLETED và Ghi Sổ Cái DEPOSIT_IN`);

        console.log(`➤ Ghi nhận/Cập nhật TransactionHistory (VERIFIED -> PROCESSED) cho orderCode ${orderCode}`);
        await tx.transactionHistory.upsert({
          where: { orderCode: BigInt(orderCode) },
          update: {
            eventId: verifiedData.reference,
            invoiceId: invoice.id,
            amount: verifiedData.amount,
            invoiceAmount: invoice.amount,
            status: 'PROCESSED',
            rawPayload: body,
            processedAt: new Date()
          },
          create: {
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

        const depositDesc =
          walletHoldAmount > 0
            ? `Tiền nạp Két bảo chứng Đơn thuê CLOOP (PayOS: ${verifiedData.amount.toLocaleString("vi-VN")}đ + Ví nội bộ: ${walletHoldAmount.toLocaleString("vi-VN")}đ) - OrderCode ${orderCode}`
            : `Tiền nạp thanh toán Đơn thuê Cloop - OrderCode ${orderCode}`;

        await tx.ledgerTransaction.create({
          data: {
            invoiceId: invoice.id,
            type: 'DEPOSIT_IN',
            amount: invoice.amount,
            description: depositDesc,
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
      Sentry.captureException(err, { extra: { orderCode, context: "PAYOS_WEBHOOK_DATABASE_ERROR" } });
      console.error("❌ Lỗi khi lưu Transaction vào Database:", err);
      // Ném lỗi 500 để PayOS tự động Retry sau 5 phút theo chuẩn "Kế toán thép"
      return NextResponse.json({ success: false, message: "Database Error" }, { status: 500 });
    }

    // Dọn rác cache sau khi giao dịch thành công (đặt trong try-catch riêng để webhook không văng lỗi)
    try {
      const { revalidatePath, revalidateTag } = require('next/cache');
      revalidateTag('products');
      revalidateTag('shop-products');
      revalidatePath('/shop');
      revalidatePath('/');
      revalidatePath('/app');
      if (productIdToRevalidate) {
        revalidatePath(`/product/${productIdToRevalidate}`);
      }
      revalidatePath('/my-closet/orders');
    } catch (cacheError) {
      console.error("Lỗi dọn rác cache, nhưng tiền đã vào ví nên cứ kệ nó:", cacheError);
    }

    // Phản hồi 200 OK cho PayOS sau khi đã cầm chắc tiền trong Database
    return NextResponse.json({ success: true, message: "Webhook processed perfectly" }, { status: 200 });

  } catch (error) {
    Sentry.captureException(error, { extra: { context: "PAYOS_WEBHOOK_GLOBAL_ERROR" } });
    console.error("❌ Lỗi hệ thống khi xử lý webhook:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
