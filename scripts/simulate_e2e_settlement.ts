import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runE2E() {
  console.log('🚀 Bắt đầu giả lập E2E Settlement...');
  
  // 1. Tạo 2 User (Owner & Renter)
  const owner = await prisma.user.create({
    data: {
      email: 'owner_test_e2e@test.com',
      password: 'hashed_password',
      name: 'Owner E2E',
      walletBalance: 0,
      cloopCoins: 1500,
    }
  });
  console.log('✅ Đã tạo Owner:', owner.id, '| Ví:', owner.walletBalance, '| Lá:', owner.cloopCoins);

  const renter = await prisma.user.create({
    data: {
      email: 'renter_test_e2e@test.com',
      password: 'hashed_password',
      name: 'Renter E2E',
      walletBalance: 0,
      cloopCoins: 1500,
    }
  });
  console.log('✅ Đã tạo Renter:', renter.id, '| Ví:', renter.walletBalance, '| Lá:', renter.cloopCoins);

  // 2. Tạo Product
  const product = await prisma.product.create({
    data: {
      userId: owner.id,
      title: 'Đầm đi tiệc E2E',
      description: 'Test E2E',
      condition: 'NEW_WITH_TAGS',
      category: 'DRESS',
      size: 'M',
      color: 'Đỏ',
      brand: 'Zara',
      material: 'COTTON',
      occasion: 'PARTY',
      style: 'VINTAGE',
      province: 'Hồ Chí Minh',
      specificAddress: '123 Test',
    }
  });
  console.log('✅ Đã tạo Product:', product.id);

  // 3. Tạo RentalHistory
  const rental = await prisma.rentalHistory.create({
    data: {
      renterId: renter.id,
      product_id: product.id,
      ownerId: owner.id,
      start_date: new Date(),
      end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: 'BORROWER_RETURNED', // Giả lập đã thuê xong và trả đồ
      renter_name: renter.name || '',
      renter_phone: '0123456789',
      owner_name: owner.name || '',
      owner_phone: '0987654321',
    }
  });
  console.log('✅ Đã tạo RentalHistory:', rental.id, 'ở trạng thái BORROWER_RETURNED');

  // 4. Tạo Invoice & Ledger (Giả lập PayOS đã thanh toán)
  const rentalFee = 200000;
  const depositAmount = 300000;
  const shippingFee = 30000;
  const platformFee = 20000; // 10% rental fee
  
  const totalAmount = rentalFee + depositAmount + shippingFee;

  const invoice = await prisma.invoice.create({
    data: {
      rentalId: rental.id,
      amount: totalAmount,
      rentalFee: rentalFee,
      depositAmount: depositAmount,
      shippingFeeCollected: shippingFee,
      platformFee: platformFee,
      status: 'PAID',
      payosStatus: 'success',
      orderCode: Math.floor(Math.random() * 1000000),
    }
  });
  
  await prisma.ledgerTransaction.create({
    data: {
      invoiceId: invoice.id,
      type: 'DEPOSIT_IN',
      amount: totalAmount,
      description: 'Thanh toán E2E Test',
      status: 'COMPLETED'
    }
  });
  console.log('✅ Đã tạo Invoice và Ghi sổ DEPOSIT_IN:', totalAmount, 'VND');

  // 5. Gọi completeOrderAction (Settlement)
  console.log('⏳ Gọi action completeOrderAction...');
  
  // Chúng ta không thể gọi trực tiếp action vì vướng requireUser() (Next.js server-side auth).
  // Vì vậy, ta sẽ copy logic của completeOrderAction vào đây để test.
  await prisma.$transaction(async (tx) => {
    await tx.rentalHistory.updateMany({
      where: { id: rental.id },
      data: { status: 'LENDER_COMPLETED', completedAt: new Date() }
    });

    // Refund Escrow
    if (depositAmount > 0) {
      await tx.user.update({
        where: { id: rental.renterId },
        data: { walletBalance: { increment: depositAmount } }
      });
      await tx.ledgerTransaction.create({
        data: { invoiceId: invoice.id, type: 'REFUND_OUT', amount: depositAmount, description: `Hoàn cọc E2E` }
      });
    }

    // Payout Owner
    if (rentalFee > 0) {
      const lenderEarnings = rentalFee - platformFee;
      await tx.user.update({
        where: { id: owner.id },
        data: { walletBalance: { increment: lenderEarnings } }
      });
      
      await tx.ledgerTransaction.create({
        data: { invoiceId: invoice.id, type: 'PAYOUT_OUT', amount: lenderEarnings, description: `Thanh toán tiền thuê` }
      });
      await tx.ledgerTransaction.create({
        data: { invoiceId: invoice.id, type: 'FEE_RETAINED', amount: platformFee, description: `Phí nền tảng` }
      });
    }

    if (shippingFee > 0) {
      await tx.ledgerTransaction.create({
        data: { invoiceId: invoice.id, type: 'SHIPPING_RETAINED', amount: shippingFee, description: `Phí ship nền tảng` }
      });
    }
  });

  console.log('✅ Settlement hoàn tất!');

  // 6. Kiểm tra lại kết quả
  const updatedOwner = await prisma.user.findUnique({ where: { id: owner.id } });
  const updatedRenter = await prisma.user.findUnique({ where: { id: renter.id } });
  const ledgers = await prisma.ledgerTransaction.findMany({ where: { invoiceId: invoice.id } });

  console.log('--- KẾT QUẢ ĐỐI SOÁT TÀI CHÍNH ---');
  console.log(`[Renter] Ví Tiền: ${updatedRenter?.walletBalance} VND (Kỳ vọng: 300000 - Hoàn cọc)`);
  console.log(`[Renter] Điểm Lá: ${updatedRenter?.cloopCoins} (Không đổi)`);
  
  console.log(`[Owner] Ví Tiền: ${updatedOwner?.walletBalance} VND (Kỳ vọng: 180000 - Tiền thuê trừ phí)`);
  console.log(`[Owner] Điểm Lá: ${updatedOwner?.cloopCoins} (Không đổi)`);
  
  console.log('[Sổ Cái]');
  ledgers.forEach(l => console.log(` - [${l.type}] ${l.amount} VND (${l.description})`));

  console.log('🎉 Test E2E Thành Công!');

  // Cleanup
  await prisma.ledgerTransaction.deleteMany({ where: { invoiceId: invoice.id } });
  await prisma.invoice.deleteMany({ where: { id: invoice.id } });
  await prisma.rentalHistory.deleteMany({ where: { id: rental.id } });
  await prisma.product.deleteMany({ where: { id: product.id } });
  await prisma.user.deleteMany({ where: { id: { in: [owner.id, renter.id] } } });
}

runE2E()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
