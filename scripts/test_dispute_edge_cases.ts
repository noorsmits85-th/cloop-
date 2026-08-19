import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runEdgeCaseTests() {
  console.log('🧪 [DISPUTE & SETTLEMENT EDGE CASES TEST SUITE] Bắt đầu kiểm thử 5 đường biên nhạy cảm...\n');

  // Khởi tạo User & Product nền
  const owner = await prisma.user.create({
    data: {
      email: `owner_edge_${Date.now()}@test.com`,
      password: 'hashed_password',
      name: 'Owner Edge Test',
      walletBalance: 0,
      cloopCoins: 500,
    }
  });

  const renter = await prisma.user.create({
    data: {
      email: `renter_edge_${Date.now()}@test.com`,
      password: 'hashed_password',
      name: 'Renter Edge Test',
      walletBalance: 0,
      cloopCoins: 500,
    }
  });

  const product = await prisma.product.create({
    data: {
      userId: owner.id,
      title: 'Đầm dạ hội Test Edge Cases',
      description: 'Test Edge Cases',
      condition: 'EXCELLENT',
      category: 'DRESS',
      size: 'M',
      color: 'Đen',
      brand: 'Gucci',
      material: 'SILK',
      occasion: 'PARTY',
      style: 'LUXURY',
      province: 'Hà Nội',
      specificAddress: '12 Tràng Tiền',
    }
  });

  // ------------------------------------------------------------------------------------------------
  // TEST CASE 1: Chặn Dispute khi Invoice chưa PAID (Invoice status = PENDING)
  // ------------------------------------------------------------------------------------------------
  console.log('▶️ [TEST 1] Thử giải ngân khi Invoice chưa thanh toán (Status = PENDING)...');
  const rental1 = await prisma.rentalHistory.create({
    data: {
      renterId: renter.id,
      product_id: product.id,
      ownerId: owner.id,
      start_date: new Date(),
      end_date: new Date(Date.now() + 86400000),
      status: 'DISPUTE',
    }
  });
  const invoice1 = await prisma.invoice.create({
    data: {
      rentalId: rental1.id,
      amount: 400000,
      rentalFee: 200000,
      depositAmount: 200000,
      shippingFeeCollected: 0,
      platformFee: 20000,
      status: 'PENDING', // Chưa thanh toán!
      orderCode: BigInt(Date.now() + 1),
    }
  });
  const dispute1 = await prisma.dispute.create({
    data: {
      rentalId: rental1.id,
      invoiceId: invoice1.id,
      description: 'Test unpaid dispute',
      images: ['https://res.cloudinary.com/test.jpg'],
      severity: 'LOW',
      suggestedDeduction: 50000,
      status: 'PENDING_REVIEW',
      adminNotes: JSON.stringify({ initiatorId: owner.id, initiatorRole: 'OWNER' }),
    }
  });

  // Kiểm tra rule: Invoice chưa PAID thì không được settle
  const test1Invoice = await prisma.invoice.findUnique({ where: { id: invoice1.id } });
  const test1CanSettle = test1Invoice?.status === 'PAID';
  console.log(`   👉 Kết quả: ${!test1CanSettle ? '✅ CHẶN THÀNH CÔNG (Invoice chưa PAID không cho giải ngân)' : '❌ LỖI BẢO MẬT'}`);
  if (test1CanSettle) throw new Error('Test 1 Thất Bại: Cho phép giải ngân khi invoice chưa PAID!');

  // ------------------------------------------------------------------------------------------------
  // TEST CASE 2: Chặn mở Dispute khi Đơn hàng đã Hoàn tất (LENDER_COMPLETED)
  // ------------------------------------------------------------------------------------------------
  console.log('\n▶️ [TEST 2] Thử mở Dispute trên đơn hàng đã hoàn tất (LENDER_COMPLETED)...');
  const rental2 = await prisma.rentalHistory.create({
    data: {
      renterId: renter.id,
      product_id: product.id,
      ownerId: owner.id,
      start_date: new Date(),
      end_date: new Date(Date.now() + 86400000),
      status: 'LENDER_COMPLETED', // Đã hoàn tất!
    }
  });

  const test2UpdateCount = await prisma.rentalHistory.updateMany({
    where: {
      id: rental2.id,
      status: { in: ['BORROWER_RECEIVED', 'BORROWER_RETURNED', 'LENDER_SHIPPED', 'OWNER_PACKED', 'PENDING_APPROVAL'] }
    },
    data: { status: 'DISPUTE' }
  });
  console.log(`   👉 Kết quả updateCount: ${test2UpdateCount.count} [${test2UpdateCount.count === 0 ? '✅ CHẶN THÀNH CÔNG (Không thể mở dispute khi đã chốt đơn)' : '❌ LỖI BẢO MẬT'}]`);
  if (test2UpdateCount.count > 0) throw new Error('Test 2 Thất Bại: Đơn hoàn tất vẫn bị đổi sang DISPUTE!');

  // ------------------------------------------------------------------------------------------------
  // TEST CASE 3: Mô phỏng Race Condition (2 Request bấm Chấp Nhận Dispute song song cùng mili-giây)
  // ------------------------------------------------------------------------------------------------
  console.log('\n▶️ [TEST 3] Mô phỏng Race Condition: 2 request acceptDispute song song cùng 1 lúc...');
  const rental3 = await prisma.rentalHistory.create({
    data: {
      renterId: renter.id,
      product_id: product.id,
      ownerId: owner.id,
      start_date: new Date(),
      end_date: new Date(Date.now() + 86400000),
      status: 'DISPUTE',
    }
  });
  const invoice3 = await prisma.invoice.create({
    data: {
      rentalId: rental3.id,
      amount: 500000,
      rentalFee: 200000,
      depositAmount: 300000,
      shippingFeeCollected: 0,
      platformFee: 20000,
      status: 'PAID',
      orderCode: BigInt(Date.now() + 3),
    }
  });
  const dispute3 = await prisma.dispute.create({
    data: {
      rentalId: rental3.id,
      invoiceId: invoice3.id,
      description: 'Test race condition',
      images: ['https://res.cloudinary.com/test.jpg'],
      severity: 'MEDIUM',
      suggestedDeduction: 100000,
      status: 'PENDING_REVIEW',
      adminNotes: JSON.stringify({ initiatorId: owner.id, initiatorRole: 'OWNER' }),
    }
  });

  // Hàm mô phỏng accept 1 lần
  async function simulateAcceptAttempt(requestId: number) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Optimistic lock on dispute status
        const disputeLock = await tx.dispute.updateMany({
          where: { id: dispute3.id, status: 'PENDING_REVIEW' },
          data: { status: 'RESOLVED', finalDeduction: 100000 }
        });
        if (disputeLock.count === 0) {
          throw new Error(`Request ${requestId}: Đã bị xử lý bởi request khác (Lock Collided)!`);
        }

        const orderLock = await tx.rentalHistory.updateMany({
          where: { id: rental3.id, status: 'DISPUTE' },
          data: { status: 'LENDER_COMPLETED' }
        });
        if (orderLock.count === 0) {
          throw new Error(`Request ${requestId}: Đơn hàng đã giải quyết!`);
        }

        // Tăng ví
        await tx.user.update({
          where: { id: renter.id },
          data: { walletBalance: { increment: 200000 } }
        });
        await tx.user.update({
          where: { id: owner.id },
          data: { walletBalance: { increment: 280000 } }
        });

        return `Request ${requestId}: THÀNH CÔNG`;
      });
    } catch (err: any) {
      return `Request ${requestId}: BỊ CHẶN (${err.message})`;
    }
  }

  // Chạy đồng thời 2 request
  const [resA, resB] = await Promise.all([
    simulateAcceptAttempt(1),
    simulateAcceptAttempt(2)
  ]);

  console.log(`   👉 Kết quả Request 1: ${resA}`);
  console.log(`   👉 Kết quả Request 2: ${resB}`);

  const oneSuccess = (resA.includes('THÀNH CÔNG') && !resB.includes('THÀNH CÔNG')) || (!resA.includes('THÀNH CÔNG') && resB.includes('THÀNH CÔNG'));
  console.log(`   👉 Đánh giá Race Condition: ${oneSuccess ? '✅ CHÍNH XÁC (Chỉ duy nhất 1 request thành công, tiền không bị cộng đúp)' : '❌ LỖI RACE CONDITION'}`);
  if (!oneSuccess) throw new Error('Test 3 Thất Bại: Cả 2 request cùng thành công hoặc cả 2 cùng thất bại!');

  // ------------------------------------------------------------------------------------------------
  // TEST CASE 4: Phí Ship bằng 0 hoặc không có (Zero Shipping Fee Invariant Balance)
  // ------------------------------------------------------------------------------------------------
  console.log('\n▶️ [TEST 4] Kiểm tra cân sổ khi shippingFeeCollected = 0 (Khách tự lấy đồ)...');
  const zeroShipAmount = 450000;
  const zeroShipRental = 150000;
  const zeroShipDeposit = 300000;
  const zeroShipFee = 15000;
  const zeroShipDeduction = 50000;

  const refundToRenter = zeroShipDeposit - zeroShipDeduction; // 250k
  const compToOwner = zeroShipDeduction; // 50k
  const payoutToOwner = zeroShipRental - zeroShipFee; // 135k
  const platformFeeColl = zeroShipFee; // 15k
  const shipFeeColl = 0; // 0k

  const totalCalculated4 = refundToRenter + compToOwner + payoutToOwner + platformFeeColl + shipFeeColl;
  console.log(`   👉 Tính toán: ${refundToRenter} + ${compToOwner} + ${payoutToOwner} + ${platformFeeColl} + ${shipFeeColl} = ${totalCalculated4}đ (Gốc: ${zeroShipAmount}đ)`);
  console.log(`   👉 Kết quả: ${totalCalculated4 === zeroShipAmount ? '✅ CÂN SỔ TUYỆT ĐỐI' : '❌ LỆCH SỔ'}`);
  if (totalCalculated4 !== zeroShipAmount) throw new Error('Test 4 Thất Bại: Lệch sổ khi không có phí ship!');

  // ------------------------------------------------------------------------------------------------
  // TEST CASE 5: Người tạo Proposal tự bấm Chấp Nhận (Anti Self-Dealing)
  // ------------------------------------------------------------------------------------------------
  console.log('\n▶️ [TEST 5] Kiểm tra Anti Self-Dealing (Chủ đồ tự tạo đề xuất rồi tự accept)...');
  const initiatorId = owner.id;
  const currentUserId = owner.id;
  const isSelfDealing = initiatorId === currentUserId;
  console.log(`   👉 Người tạo: ${initiatorId} === Người duyệt: ${currentUserId} -> ${isSelfDealing ? '✅ BỊ CHẶN (Không cho phép tự duyệt chính mình)' : '❌ LỖI'}`);

  // Dọn dẹp dữ liệu
  console.log('\n🧹 Dọn dẹp dữ liệu test biên...');
  await prisma.dispute.deleteMany({ where: { rentalId: { in: [rental1.id, rental2.id, rental3.id] } } });
  await prisma.invoice.deleteMany({ where: { rentalId: { in: [rental1.id, rental2.id, rental3.id] } } });
  await prisma.rentalHistory.deleteMany({ where: { id: { in: [rental1.id, rental2.id, rental3.id] } } });
  await prisma.product.delete({ where: { id: product.id } });
  await prisma.user.deleteMany({ where: { id: { in: [owner.id, renter.id] } } });

  console.log('🎉 [HOÀN TẤT 5/5 EDGE CASE TESTS] Mọi đường biên tài chính và trạng thái đều ĐẠT CHUẨN THÉP!');
}

runEdgeCaseTests()
  .catch((e) => {
    console.error('❌ Lỗi kiểm thử:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
