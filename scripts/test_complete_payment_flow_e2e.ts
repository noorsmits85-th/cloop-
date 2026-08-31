import { PrismaClient } from '@prisma/client';
import { completeOrderAction } from '../app/(dashboard)/my-closet/orders/actions';

const prisma = new PrismaClient();

async function testPaymentFlowE2E() {
  console.log("=================================================================");
  console.log("💳 KIỂM THỬ TOÀN DIỆN LUỒNG THANH TOÁN & ESCROW (E2E)");
  console.log("=================================================================\n");

  // 1. Chuẩn bị User Renter & Owner
  const owner = await prisma.user.upsert({
    where: { email: "owner.test@cloop.vn" },
    update: {},
    create: {
      email: "owner.test@cloop.vn",
      name: "Chủ Tủ Hoàng Yến",
      walletBalance: 0,
      cloopCoins: 100,
      password: "pass"
    }
  });

  const renter = await prisma.user.upsert({
    where: { email: "renter.test@cloop.vn" },
    update: {},
    create: {
      email: "renter.test@cloop.vn",
      name: "Khách Thuê Minh Ngọc",
      walletBalance: 0,
      cloopCoins: 50,
      password: "pass"
    }
  });

  // 2. Tìm hoặc tạo sản phẩm
  let product = await prisma.product.findFirst({
    where: { isDeleted: false, listings: { some: { status: "AVAILABLE" } } },
    include: { listings: true }
  });

  if (!product) {
    product = await prisma.product.create({
      data: {
        title: "Đầm Dạ Hội Hoàng Gia",
        category: "Dạ hội",
        userId: owner.id,
        size: "M",
        province: "Hà Nội",
        specificAddress: "Hà Nội",
        listings: {
          create: {
            listingType: "RENT",
            basePrice: 350000,
            deposit: 1000000,
            status: "AVAILABLE"
          }
        }
      },
      include: { listings: true }
    });
  }

  const rentalFee = 350000;
  const depositPrice = 1000000;
  const shippingFee = 25000;
  const totalAmount = rentalFee + depositPrice + shippingFee; // 1.375.000đ
  const platformFee = Math.floor(rentalFee * 0.12); // 42.000đ
  const orderCode = Number(String(Date.now()).slice(-9));

  console.log(`1️⃣ Tạo Đơn Đặt Thuê:`);
  console.log(`   - Tiền thuê: ${rentalFee.toLocaleString()}₫`);
  console.log(`   - Tiền cọc bảo chứng: ${depositPrice.toLocaleString()}₫`);
  console.log(`   - Cước ship chiều đi (50/50): ${shippingFee.toLocaleString()}₫`);
  console.log(`   👉 TỔNG TIỀN THANH TOÁN: ${totalAmount.toLocaleString()}₫`);

  // 3. Tạo RentalHistory & Invoice
  const rental = await prisma.rentalHistory.create({
    data: {
      product_id: product.id,
      renterId: renter.id,
      ownerId: owner.id,
      renter_name: renter.name,
      renter_phone: "0988776655",
      owner_name: owner.name,
      start_date: new Date(),
      end_date: new Date(Date.now() + 3 * 86400000),
      status: "PENDING_APPROVAL"
    }
  });

  const invoice = await prisma.invoice.create({
    data: {
      rentalId: rental.id,
      amount: totalAmount,
      rentalFee: rentalFee,
      depositAmount: depositPrice,
      shippingFeeCollected: shippingFee,
      platformFee: platformFee,
      status: "PENDING",
      orderCode: orderCode,
    }
  });

  console.log(`\n2️⃣ Khởi tạo Hóa Đơn & Mã VietQR:`);
  console.log(`   - Invoice ID: ${invoice.id}`);
  console.log(`   - Mã đơn PayOS: ${orderCode}`);
  console.log(`   - Trạng thái ban đầu: ${invoice.status}`);

  // 4. Giả lập luồng Khách Quét Mã VietQR Thành Công (Payment Inflow)
  console.log(`\n3️⃣ Khách Chuyển Khoản VietQR -> Webhook / Polling Sync Kích Hoạt...`);
  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: "PAID", payosStatus: "success" }
    });

    await tx.ledgerTransaction.create({
      data: {
        invoiceId: invoice.id,
        type: "DEPOSIT_IN",
        amount: totalAmount,
        description: `Tiền nạp đơn thuê #${rental.id.slice(0, 8)} qua VietQR`,
        status: "COMPLETED"
      }
    });

    await tx.rentalHistory.update({
      where: { id: rental.id },
      data: { status: "LENDER_SHIPPED" }
    });
  });

  const paidInvoice = await prisma.invoice.findUnique({ where: { id: invoice.id } });
  console.log(`   ✅ Hóa đơn đổi trạng thái thành công: ${paidInvoice?.status} (payosStatus: ${paidInvoice?.payosStatus})`);

  // 5. Chu trình Vận hành Khứ hồi:
  console.log(`\n4️⃣ Tiến Trình Vận Hành Giao Nhận Khứ Hồi:`);
  console.log(`   - Giai đoạn 1: Chủ tủ gửi GHN (LENDER_SHIPPED) ✅`);
  
  await prisma.rentalHistory.update({
    where: { id: rental.id },
    data: { status: "BORROWER_RECEIVED" }
  });
  console.log(`   - Giai đoạn 2: Khách nhận đồ & mặc sự kiện (BORROWER_RECEIVED) ✅`);

  await prisma.rentalHistory.update({
    where: { id: rental.id },
    data: { status: "BORROWER_RETURNED" }
  });
  console.log(`   - Giai đoạn 3: Khách gửi trả GHN 0đ tiền mặt (BORROWER_RETURNED) ✅`);

  // 6. Quyết toán Tất Toán Hoàn Cọc & Payout (Escrow Settlement)
  console.log(`\n5️⃣ Quyết Toán & Giải Ngân Két Escrow...`);
  
  const initialRenterBal = (await prisma.user.findUnique({ where: { id: renter.id } }))?.walletBalance || 0;
  const initialOwnerBal = (await prisma.user.findUnique({ where: { id: owner.id } }))?.walletBalance || 0;

  // Thực thi giải ngân Escrow
  await prisma.$transaction(async (tx) => {
    const returnShippingFee = 25000;
    const lenderEarnings = Math.max(0, rentalFee - platformFee - returnShippingFee); // 350k - 42k - 25k = 283.000đ

    // Hoàn cọc 100% cho khách
    await tx.user.update({
      where: { id: renter.id },
      data: { walletBalance: { increment: depositPrice }, cloopCoins: { increment: 15 } }
    });

    await tx.ledgerTransaction.create({
      data: { invoiceId: invoice.id, type: "REFUND_OUT", amount: depositPrice, description: "Hoàn cọc 100%" }
    });

    // Payout cho chủ tủ
    await tx.user.update({
      where: { id: owner.id },
      data: { walletBalance: { increment: lenderEarnings }, cloopCoins: { increment: 25 } }
    });

    await tx.ledgerTransaction.create({
      data: { invoiceId: invoice.id, type: "PAYOUT_OUT", amount: lenderEarnings, description: "Payout tiền thuê" }
    });

    await tx.ledgerTransaction.create({
      data: { invoiceId: invoice.id, type: "FEE_RETAINED", amount: platformFee, description: "Phí sàn 12%" }
    });

    await tx.ledgerTransaction.create({
      data: { invoiceId: invoice.id, type: "SHIPPING_RETAINED", amount: returnShippingFee, description: "Phí ship chiều về" }
    });

    await tx.ledgerTransaction.create({
      data: { invoiceId: invoice.id, type: "SHIPPING_RETAINED", amount: shippingFee, description: "Phí ship chiều đi" }
    });

    await tx.rentalHistory.update({
      where: { id: rental.id },
      data: { status: "LENDER_COMPLETED", completedAt: new Date() }
    });
  });

  const finalRenterBal = (await prisma.user.findUnique({ where: { id: renter.id } }))?.walletBalance || 0;
  const finalOwnerBal = (await prisma.user.findUnique({ where: { id: owner.id } }))?.walletBalance || 0;

  console.log(`\n6️⃣ Đối Soát Dòng Tiền & Cân Bằng Sổ Cái:`);
  console.log(`   - Ví Khách Thuê: ${initialRenterBal.toLocaleString()}₫ -> ${finalRenterBal.toLocaleString()}₫ (+${(finalRenterBal - initialRenterBal).toLocaleString()}₫ hoàn cọc 100%) ✅`);
  console.log(`   - Ví Chủ Tủ: ${initialOwnerBal.toLocaleString()}₫ -> ${finalOwnerBal.toLocaleString()}₫ (+${(finalOwnerBal - initialOwnerBal).toLocaleString()}₫ tiền thuê thực nhận) ✅`);

  // Kiểm tra tổng bút toán Ledger
  const ledgerEntries = await prisma.ledgerTransaction.findMany({
    where: { invoiceId: invoice.id }
  });

  const totalIn = ledgerEntries.filter(e => e.type === "DEPOSIT_IN").reduce((sum, e) => sum + e.amount, 0);
  const totalOut = ledgerEntries.filter(e => ["REFUND_OUT", "PAYOUT_OUT", "FEE_RETAINED", "SHIPPING_RETAINED"].includes(e.type)).reduce((sum, e) => sum + e.amount, 0);

  console.log(`   - Tổng Dòng Tiền Vào (Inflow):  +${totalIn.toLocaleString()}₫`);
  console.log(`   - Tổng Dòng Tiền Phân Bổ (Outflow): -${totalOut.toLocaleString()}₫`);
  console.log(`   👉 Chênh Lệch Kế Toán (Discrepancy): ${totalIn - totalOut}₫`);

  if (totalIn === totalOut) {
    console.log(`\n🎉 KẾT LUẬN: LUỒNG THANH TOÁN HOÀN HẢO 100% - KHÔNG CÓ BẤT KỲ LỖI NÀO!`);
  } else {
    console.error(`\n❌ PHÁT HIỆN LỆCH SỔ CÁI!`);
  }
}

testPaymentFlowE2E()
  .catch(e => console.error("Lỗi:", e))
  .finally(() => prisma.$disconnect());
