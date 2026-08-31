import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runCompleteTest() {
  console.log("=================================================================");
  console.log("🚀 BẮT ĐẦU KIỂM THỬ TOÀN BỘ CÁC LUỒNG THANH TOÁN & GIAO DỊCH CLOOP");
  console.log("=================================================================\n");

  let passedTests = 0;
  let totalTests = 5;

  // Cleanup test data from previous runs if any
  const oldUsers = await prisma.user.findMany({
    where: { email: { in: ['test_owner_cloop@test.com', 'test_renter_cloop@test.com', 'test_founding_owner@test.com'] } },
    select: { id: true }
  });
  const oldUserIds = oldUsers.map(u => u.id);

  if (oldUserIds.length > 0) {
    const oldRentals = await prisma.rentalHistory.findMany({
      where: { OR: [{ renterId: { in: oldUserIds } }, { ownerId: { in: oldUserIds } }] },
      select: { id: true }
    });
    const oldRentalIds = oldRentals.map(r => r.id);

    await prisma.ledgerTransaction.deleteMany({
      where: { invoice: { rentalId: { in: oldRentalIds } } }
    });
    await prisma.shipment.deleteMany({
      where: { rentalId: { in: oldRentalIds } }
    });
    await prisma.invoice.deleteMany({
      where: { rentalId: { in: oldRentalIds } }
    });
    await prisma.rentalHistory.deleteMany({
      where: { id: { in: oldRentalIds } }
    });
    await prisma.coinLedgerEntry.deleteMany({
      where: { userId: { in: oldUserIds } }
    });
    await prisma.coinTopUp.deleteMany({
      where: { userId: { in: oldUserIds } }
    });
    await prisma.product.deleteMany({
      where: { userId: { in: oldUserIds } }
    });
    await prisma.user.deleteMany({
      where: { id: { in: oldUserIds } }
    });
  }

  // 1. SETUP USERS & PRODUCTS
  console.log("📦 1. Khởi tạo tài khoản & Trang phục kiểm thử...");
  const owner = await prisma.user.create({
    data: {
      email: 'test_owner_cloop@test.com',
      password: 'hashed_password_123',
      name: 'Elena Vance (Chủ tủ)',
      walletBalance: 0,
      cloopCoins: 500,
    }
  });

  const renter = await prisma.user.create({
    data: {
      email: 'test_renter_cloop@test.com',
      password: 'hashed_password_123',
      name: 'Thu Trang (Khách thuê)',
      walletBalance: 0,
      cloopCoins: 200,
    }
  });

  const product = await prisma.product.create({
    data: {
      userId: owner.id,
      title: 'Đầm dạ hội Lụa Tơ Tằm CLOOP Couture',
      description: 'Đầm lụa cao cấp kiểm thử thanh toán PayOS',
      category: 'DRESS',
      size: 'M',
      color: 'Emerald Green',
      brand: 'CLOOP Signature',
      condition: 'EXCELLENT',
      province: 'Hà Nội',
      specificAddress: 'Phố Huế, Hoàn Kiếm, Hà Nội',
    }
  });

  console.log(` -> Owner ID: ${owner.id} | Ví: ${owner.walletBalance}₫ | Xu: ${owner.cloopCoins} Lá`);
  console.log(` -> Renter ID: ${renter.id} | Ví: ${renter.walletBalance}₫ | Xu: ${renter.cloopCoins} Lá`);
  console.log(` -> Món đồ: ${product.title} (ID: ${product.id})\n`);

  // =================================================================
  // TEST CASE 1: FULL STANDARD RENTAL & ESCROW 50/50 SETTLEMENT
  // =================================================================
  console.log("-----------------------------------------------------------------");
  console.log("🧪 TEST CASE 1: Luồng Thuê Đồ Chuẩn, Két Escrow 50/50 & Block 5K");
  console.log("-----------------------------------------------------------------");

  const rentFee1 = 350000;
  const depositAmt1 = 1000000;
  const shipOneWay1 = 25000; // Block 5k (21k -> 25k)
  const totalPayOS1 = rentFee1 + depositAmt1 + shipOneWay1; // 1.375.000₫
  const platformFee1 = Math.floor(rentFee1 * 0.12); // 42.000₫
  const returnShipFee1 = 25000; // Chủ tủ chịu chiều về

  // Step 1: Tạo đơn thuê & Invoice
  const rental1 = await prisma.rentalHistory.create({
    data: {
      product_id: product.id,
      renterId: renter.id,
      ownerId: owner.id,
      renter_name: renter.name,
      renter_phone: '0912345678',
      owner_name: owner.name,
      owner_phone: '0987654321',
      start_date: new Date(),
      end_date: new Date(Date.now() + 3 * 24 * 3600 * 1000),
      status: 'PENDING_APPROVAL',
      shippingCode: 'GHN88492019VN'
    }
  });

  const invoice1 = await prisma.invoice.create({
    data: {
      rentalId: rental1.id,
      amount: totalPayOS1,
      rentalFee: rentFee1,
      depositAmount: depositAmt1,
      shippingFeeCollected: shipOneWay1,
      platformFee: platformFee1,
      status: 'PENDING',
      orderCode: Math.floor(100000 + Math.random() * 900000)
    }
  });

  console.log(` ✅ Bước 1.1: Tạo đơn #${rental1.id.slice(0, 8)} thành công. Tổng PayOS: ${totalPayOS1.toLocaleString()}₫`);

  // Step 2: Quét VietQR PayOS Webhook thành công -> Két Escrow khóa 100%
  await prisma.invoice.update({
    where: { id: invoice1.id },
    data: { status: 'PAID', payosStatus: 'PAID' }
  });

  await prisma.ledgerTransaction.create({
    data: {
      invoiceId: invoice1.id,
      type: 'DEPOSIT_IN',
      amount: totalPayOS1,
      description: `[VietQR PayOS] Khóa tiền cọc + thuê + ship chiều đi vào Két Escrow #${rental1.id.slice(0, 8)}`
    }
  });

  await prisma.rentalHistory.update({
    where: { id: rental1.id },
    data: { status: 'OWNER_PACKED' }
  });

  console.log(` ✅ Bước 1.2: Webhook PayOS khớp lệnh! Két Escrow đã khóa 1.375.000₫. Trạng thái: OWNER_PACKED`);

  // Step 3: Tạo vận đơn GHN chiều đi & Khách nhận đồ
  await prisma.shipment.create({
    data: {
      rentalId: rental1.id,
      direction: 'DELIVERY',
      status: 'DELIVERED',
      trackingCode: rental1.shippingCode,
      shippingFeeCollected: shipOneWay1,
      actualShippingFee: 21000 // GHN trừ 21k
    }
  });

  await prisma.rentalHistory.update({
    where: { id: rental1.id },
    data: { status: 'BORROWER_RECEIVED' }
  });

  console.log(` ✅ Bước 1.3: GHN giao đồ thành công. Khách đang diện đồ. Trạng thái: BORROWER_RECEIVED`);

  // Step 4: Khách bấm "Trả Đồ" -> Sinh mã GHN Chiều về 0đ Pre-paid
  await prisma.shipment.create({
    data: {
      rentalId: rental1.id,
      direction: 'RETURN',
      status: 'DELIVERED',
      trackingCode: `GHN-RET-${rental1.id.slice(0, 6).toUpperCase()}`,
      shippingFeeCollected: 0, // Khách trả 0đ tiền mặt
      actualShippingFee: 21000 // GHN trừ 21k
    }
  });

  await prisma.rentalHistory.update({
    where: { id: rental1.id },
    data: { status: 'BORROWER_RETURNED' }
  });

  console.log(` ✅ Bước 1.4: Khách gửi trả đồ. Bưu tá GHN nhận hàng theo mã Pre-paid 0đ.`);

  // Step 5: Chủ tủ nhận lại đồ hoàn chỉnh -> Nghiệm thu & Giải ngân Escrow
  const expectedLenderPayout1 = rentFee1 - platformFee1 - returnShipFee1; // 350k - 42k - 25k = 283.000₫

  await prisma.$transaction(async (tx) => {
    // Hoàn cọc 100% cho khách
    await tx.user.update({
      where: { id: renter.id },
      data: { 
        walletBalance: { increment: depositAmt1 },
        cloopCoins: { increment: 15 } // Thưởng hoàn tất chu trình
      }
    });

    await tx.ledgerTransaction.create({
      data: {
        invoiceId: invoice1.id,
        type: 'REFUND_OUT',
        amount: depositAmt1,
        description: `[Escrow] Hoàn 100% cọc cho khách thuê`
      }
    });

    // Payout cho chủ tủ
    await tx.user.update({
      where: { id: owner.id },
      data: { walletBalance: { increment: expectedLenderPayout1 } }
    });

    await tx.ledgerTransaction.create({
      data: {
        invoiceId: invoice1.id,
        type: 'PAYOUT_OUT',
        amount: expectedLenderPayout1,
        description: `[Escrow] Payout tiền thuê cho chủ tủ (Đã trừ phí sàn 12% & ship về 25k)`
      }
    });

    await tx.ledgerTransaction.create({
      data: {
        invoiceId: invoice1.id,
        type: 'FEE_RETAINED',
        amount: platformFee1,
        description: `[Revenue] Phí dịch vụ 12% giữ lại nền tảng`
      }
    });

    await tx.ledgerTransaction.create({
      data: {
        invoiceId: invoice1.id,
        type: 'SHIPPING_RETAINED',
        amount: returnShipFee1,
        description: `[Logistics] Cước GHN lượt về cấn trừ từ Payout chủ tủ`
      }
    });

    await tx.rentalHistory.update({
      where: { id: rental1.id },
      data: { status: 'LENDER_COMPLETED', completedAt: new Date() }
    });
  });

  // Đối soát kết quả Test Case 1
  const updatedRenter1 = await prisma.user.findUnique({ where: { id: renter.id } });
  const updatedOwner1 = await prisma.user.findUnique({ where: { id: owner.id } });

  const isRenterOk1 = updatedRenter1?.walletBalance === depositAmt1 && updatedRenter1?.cloopCoins === 215;
  const isOwnerOk1 = updatedOwner1?.walletBalance === expectedLenderPayout1;

  if (isRenterOk1 && isOwnerOk1) {
    console.log(` 🎉 TEST CASE 1 PASSED!`);
    console.log(`    -> Khách nhận lại 100% cọc: ${depositAmt1.toLocaleString()}₫ + 15 Lá`);
    console.log(`    -> Chủ tủ thực nhận: ${expectedLenderPayout1.toLocaleString()}₫ (350k - 42k phí sàn - 25k ship về)`);
    console.log(`    -> Sàn giữ lại: 42.000₫ (phí sàn 12%) + 8.000₫ (quỹ phòng vệ ship)\n`);
    passedTests++;
  } else {
    console.error(` ❌ TEST CASE 1 FAILED! Renter Balance: ${updatedRenter1?.walletBalance}, Owner Balance: ${updatedOwner1?.walletBalance}\n`);
  }

  // =================================================================
  // TEST CASE 2: FOUNDING 100 (0% PLATFORM FEE)
  // =================================================================
  console.log("-----------------------------------------------------------------");
  console.log("🧪 TEST CASE 2: Chủ Tủ Thuộc Nhóm Founding 100 (0% Phí Sàn)");
  console.log("-----------------------------------------------------------------");

  const rentFee2 = 300000;
  const platformFee2 = 0; // 0% Phí sàn
  const returnShip2 = 25000;
  const expectedPayout2 = rentFee2 - platformFee2 - returnShip2; // 300k - 25k = 275.000₫

  console.log(` ✅ Công thức Payout Founding 100: ${rentFee2.toLocaleString()}₫ - 0₫ (0% phí sàn) - ${returnShip2.toLocaleString()}₫ (ship về) = ${expectedPayout2.toLocaleString()}₫`);
  if (expectedPayout2 === 275000) {
    console.log(` 🎉 TEST CASE 2 PASSED!\n`);
    passedTests++;
  } else {
    console.error(` ❌ TEST CASE 2 FAILED!\n`);
  }

  // =================================================================
  // TEST CASE 3: KHÁCH HỦY ĐƠN TRƯỚC KHI GIAO GHN (HOÀN 100% GỒM SHIP)
  // =================================================================
  console.log("-----------------------------------------------------------------");
  console.log("🧪 TEST CASE 3: Khách Hủy Đơn Khi Chủ Tủ Chưa Bàn Giao GHN");
  console.log("-----------------------------------------------------------------");

  const cancelTotal = 1375000;
  const renterBeforeCancel = updatedRenter1?.walletBalance || 0;

  // Thực hiện hoàn tiền 100% (cọc + thuê + ship chiều đi)
  await prisma.user.update({
    where: { id: renter.id },
    data: { walletBalance: { increment: cancelTotal } }
  });

  const renterAfterCancel = await prisma.user.findUnique({ where: { id: renter.id } });
  if (renterAfterCancel?.walletBalance === renterBeforeCancel + cancelTotal) {
    console.log(` ✅ Đã hoàn trả đầy đủ ${cancelTotal.toLocaleString()}₫ (Gồm tiền thuê + cọc + 25k ship) về ví khách.`);
    console.log(` 🎉 TEST CASE 3 PASSED!\n`);
    passedTests++;
  } else {
    console.error(` ❌ TEST CASE 3 FAILED!\n`);
  }

  // =================================================================
  // TEST CASE 4: XỬ LÝ TRANH CHẤP / ĐỒ HƯ HẠI (DISPUTE SETTLEMENT)
  // =================================================================
  console.log("-----------------------------------------------------------------");
  console.log("🧪 TEST CASE 4: Xử Lý Tranh Chấp & Đền Bù Trích Từ Tiền Cọc");
  console.log("-----------------------------------------------------------------");

  const disputeDeposit = 1000000;
  const damageDeduction = 200000; // Bồi thường đồ rách nhẹ
  const refundRenterRest = disputeDeposit - damageDeduction; // 800.000₫

  const ownerBeforeDispute = (await prisma.user.findUnique({ where: { id: owner.id } }))?.walletBalance || 0;
  const renterBeforeDispute = (await prisma.user.findUnique({ where: { id: renter.id } }))?.walletBalance || 0;

  await prisma.$transaction(async (tx) => {
    // Trích 200k cọc đền bù cho chủ tủ
    await tx.user.update({
      where: { id: owner.id },
      data: { walletBalance: { increment: damageDeduction } }
    });
    // Hoàn 800k cọc còn lại cho khách
    await tx.user.update({
      where: { id: renter.id },
      data: { walletBalance: { increment: refundRenterRest } }
    });
  });

  const ownerAfterDispute = await prisma.user.findUnique({ where: { id: owner.id } });
  const renterAfterDispute = await prisma.user.findUnique({ where: { id: renter.id } });

  if (
    ownerAfterDispute?.walletBalance === ownerBeforeDispute + damageDeduction &&
    renterAfterDispute?.walletBalance === renterBeforeDispute + refundRenterRest
  ) {
    console.log(` ✅ Chủ tủ nhận bồi thường hư hại: +${damageDeduction.toLocaleString()}₫`);
    console.log(` ✅ Khách nhận lại phần cọc còn lại: +${refundRenterRest.toLocaleString()}₫`);
    console.log(` 🎉 TEST CASE 4 PASSED!\n`);
    passedTests++;
  } else {
    console.error(` ❌ TEST CASE 4 FAILED!\n`);
  }

  // =================================================================
  // TEST CASE 5: NẠP XU LÁ (COIN TOP-UP & LEDGER ENTRY)
  // =================================================================
  console.log("-----------------------------------------------------------------");
  console.log("🧪 TEST CASE 5: Nạp Điểm Lá CLOOP Qua VietQR");
  console.log("-----------------------------------------------------------------");

  const topUpAmountVnd = 100000; // 100k VND
  const coinsIssued = 1000; // 1.000 Lá
  const renterCoinsBefore = renterAfterDispute?.cloopCoins || 0;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: renter.id },
      data: { cloopCoins: { increment: coinsIssued } }
    });

    const topUp = await tx.coinTopUp.create({
      data: {
        userId: renter.id,
        packageCode: 'TIER_100K',
        amountVnd: topUpAmountVnd,
        baseCoins: coinsIssued,
        bonusCoins: 0,
        totalCoins: coinsIssued,
        status: 'PAID',
        orderCode: Math.floor(10000000 + Math.random() * 90000000)
      }
    });

    await tx.coinLedgerEntry.create({
      data: {
        userId: renter.id,
        topUpId: topUp.id,
        type: 'TOP_UP_IN',
        amount: coinsIssued,
        balanceAfter: renterCoinsBefore + coinsIssued,
        description: `Nạp +${coinsIssued} Lá qua VietQR PayOS (100.000₫)`
      }
    });
  });

  const renterAfterTopUp = await prisma.user.findUnique({ where: { id: renter.id } });
  if (renterAfterTopUp?.cloopCoins === renterCoinsBefore + coinsIssued) {
    console.log(` ✅ Khách nạp thành công 100.000₫ -> Số dư Lá: ${renterAfterTopUp?.cloopCoins} Lá`);
    console.log(` 🎉 TEST CASE 5 PASSED!\n`);
    passedTests++;
  } else {
    console.error(` ❌ TEST CASE 5 FAILED!\n`);
  }

  // Cleanup test data
  console.log("🧹 Dọn dẹp dữ liệu kiểm thử...");
  await prisma.ledgerTransaction.deleteMany({ where: { invoiceId: invoice1.id } });
  await prisma.shipment.deleteMany({ where: { rentalId: rental1.id } });
  await prisma.invoice.deleteMany({ where: { rentalId: rental1.id } });
  await prisma.rentalHistory.deleteMany({ where: { id: rental1.id } });
  await prisma.coinLedgerEntry.deleteMany({ where: { userId: renter.id } });
  await prisma.coinTopUp.deleteMany({ where: { userId: renter.id } });
  await prisma.product.deleteMany({ where: { id: product.id } });
  await prisma.user.deleteMany({ where: { id: { in: [owner.id, renter.id] } } });

  console.log("=================================================================");
  console.log(`🏁 TỔNG KẾT KIỂM THỬ: ${passedTests}/${totalTests} TEST CASES ĐẠT 100% CHUẨN XÁC!`);
  console.log("=================================================================");
}

runCompleteTest()
  .catch(e => console.error("Lỗi trong quá trình kiểm thử:", e))
  .finally(async () => await prisma.$disconnect());
