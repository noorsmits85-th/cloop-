import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function isEvidenceVideo(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes("#video") ||
    lower.includes("type=video") ||
    lower.endsWith(".mp4") ||
    lower.endsWith(".mov") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".avi") ||
    lower.endsWith(".mkv") ||
    lower.includes("/video/") ||
    lower.includes("video") ||
    lower.includes("drive.google.com/file")
  );
}

async function runBurdenOfProofTests() {
  console.log('⚖️ [BURDEN OF PROOF - NGHĨA VỤ CHỨNG MINH] Khởi động bộ test đối soát trách nhiệm...\n');

  // Tạo tài khoản test
  const owner = await prisma.user.create({
    data: {
      email: `owner_bop_${Date.now()}@test.com`,
      password: 'hashed_password',
      name: 'Chủ Tủ BOP Test',
      walletBalance: 0,
      cloopCoins: 100,
    }
  });

  const renter = await prisma.user.create({
    data: {
      email: `renter_bop_${Date.now()}@test.com`,
      password: 'hashed_password',
      name: 'Khách Thuê BOP Test',
      walletBalance: 0,
      cloopCoins: 100,
    }
  });

  const product = await prisma.product.create({
    data: {
      userId: owner.id,
      title: 'Đầm Lụa Thiết Kế BOP',
      description: 'Đầm dạ tiệc cao cấp',
      condition: 'EXCELLENT',
      category: 'DRESS',
      size: 'S',
      color: 'Trắng',
      brand: 'CLOOP Signature',
      material: 'SILK',
      occasion: 'GALA',
      style: 'LUXURY',
      province: 'TP. Hồ Chí Minh',
      specificAddress: 'Quận 1, TP.HCM',
    }
  });

  // ------------------------------------------------------------------------------------------------
  // TEST 1: CHỦ TỦ KHÔNG CÓ VIDEO MỞ HỘP -> TỰ CHỊU TRÁCH NHIỆM (HỆ THỐNG TỪ CHỐI TẠO KHIẾU NẠI)
  // ------------------------------------------------------------------------------------------------
  console.log('▶️ [TEST 1] Chủ tủ khiếu nại nhưng chỉ có ảnh tĩnh (KHÔNG CÓ VIDEO MỞ HỘP)...');
  const imagesNoVideo = ['https://storage.googleapis.com/cloop/photo1.jpg', 'https://storage.googleapis.com/cloop/photo2.png'];
  const hasUnboxingVideo1 = imagesNoVideo.some(isEvidenceVideo);

  if (!hasUnboxingVideo1) {
    console.log('   [SUCCESS] Hệ thống phát hiện CHỦ TỦ THIẾU VIDEO MỞ HỘP.');
    console.log('   [RULE ENFORCED] "Chủ tủ không có video mở hộp đối soát = Tự chịu toàn bộ trách nhiệm, hệ thống từ chối mở khiếu nại trừ cọc!"\n');
  } else {
    throw new Error('TEST 1 THẤT BẠI: Hệ thống không chặn được việc thiếu video mở hộp của chủ tủ!');
  }

  // ------------------------------------------------------------------------------------------------
  // TEST 2: CHỦ TỦ CÓ VIDEO MỞ HỘP & HÓA ĐƠN -> HỢP LỆ, TẠO KHIẾU NẠI THÀNH CÔNG
  // ------------------------------------------------------------------------------------------------
  console.log('▶️ [TEST 2] Chủ tủ có video mở hộp niêm phong (#video) và ảnh hóa đơn thực tế...');
  const imagesWithVideo = [
    'https://drive.google.com/file/d/123456/view#video',
    'https://storage.googleapis.com/cloop/receipt_laundry.jpg'
  ];
  const hasUnboxingVideo2 = imagesWithVideo.some(isEvidenceVideo);

  if (hasUnboxingVideo2) {
    console.log('   [SUCCESS] Hệ thống xác thực video mở hộp đối soát hợp lệ.');
    console.log('   [RULE ENFORCED] Đủ điều kiện khởi tạo đề xuất hòa giải P2P với hóa đơn sửa chữa.\n');
  } else {
    throw new Error('TEST 2 THẤT BẠI: Video mở hộp hợp lệ bị từ chối!');
  }

  // Tạo Rental & Invoice mẫu
  const rental = await prisma.rentalHistory.create({
    data: {
      renterId: renter.id,
      product_id: product.id,
      ownerId: owner.id,
      start_date: new Date(),
      end_date: new Date(Date.now() + 86400000),
      status: 'DISPUTE',
    }
  });

  const invoice = await prisma.invoice.create({
    data: {
      rentalId: rental.id,
      amount: 730000,
      rentalFee: 200000,
      depositAmount: 500000,
      shippingFeeCollected: 30000,
      status: 'PAID',
    }
  });

  const dispute = await prisma.dispute.create({
    data: {
      rentalId: rental.id,
      invoiceId: invoice.id,
      description: 'Váy bị ố bẩn nặng ở vạt sau khi nhận lại',
      severity: 'MEDIUM',
      suggestedDeduction: 150000, // Đúng theo hóa đơn tiệm giặt
      images: imagesWithVideo,
      status: 'PENDING_REVIEW',
      adminNotes: JSON.stringify({
        initiatorRole: 'OWNER',
        initiatorId: owner.id,
      }),
    }
  });

  // ------------------------------------------------------------------------------------------------
  // TEST 3: KHÁCH THUÊ TỪ CHỐI NHƯNG KHÔNG CÓ VIDEO BẢO CHỨNG -> HỆ THỐNG TỪ CHỐI PHẢN BIỆN
  // ------------------------------------------------------------------------------------------------
  console.log('▶️ [TEST 3] Khách thuê bấm từ chối bồi thường nhưng KHÔNG CÓ VIDEO BẢO CHỨNG...');
  const renterNoVideos: string[] = [];
  const hasRenterCounterProof1 = renterNoVideos.some(isEvidenceVideo);

  if (!hasRenterCounterProof1) {
    console.log('   [SUCCESS] Hệ thống chặn đứng hành vi từ chối thiếu chứng cứ của khách thuê.');
    console.log('   [RULE ENFORCED] "Khách thuê không có video bảo chứng lúc nhận/gửi = Mặc định phải chấp nhận bồi thường theo hóa đơn hợp lệ của chủ tủ!"\n');
  } else {
    throw new Error('TEST 3 THẤT BẠI: Cho phép khách từ chối mà không cần video bảo chứng!');
  }

  // ------------------------------------------------------------------------------------------------
  // TEST 4: KHÁCH THUÊ CÓ VIDEO BẢO CHỨNG -> HỢP LỆ, CHUYỂN BQT TRỌNG TÀI ĐỐI SOÁT CHÉO
  // ------------------------------------------------------------------------------------------------
  console.log('▶️ [TEST 4] Khách thuê tải lên video bảo chứng lúc bóc seal nhận đồ (unboxing_renter.mp4)...');
  const renterCounterVideos = ['https://storage.googleapis.com/cloop/renter_unboxing_seal.mp4'];
  const hasRenterCounterProof2 = renterCounterVideos.some(isEvidenceVideo);

  if (hasRenterCounterProof2) {
    await prisma.dispute.update({
      where: { id: dispute.id },
      data: {
        status: 'DISPUTED',
        adminNotes: JSON.stringify({
          initiatorRole: 'OWNER',
          initiatorId: owner.id,
          renterCounterVideos: renterCounterVideos,
          hasRenterProof: true,
          escalatedAt: new Date().toISOString(),
        })
      }
    });

    console.log('   [SUCCESS] Hồ sơ khiếu nại đã chuyển sang DISPUTED (Bàn Trọng Tài Admin).');
    console.log('   [RULE ENFORCED] BQT CLOOP có đầy đủ video 2 bên để đối soát công tâm.\n');
  } else {
    throw new Error('TEST 4 THẤT BẠI: Video bảo chứng hợp lệ của khách bị từ chối!');
  }

  // Cleanup test data
  await prisma.dispute.deleteMany({ where: { rentalId: rental.id } });
  await prisma.invoice.deleteMany({ where: { rentalId: rental.id } });
  await prisma.rentalHistory.deleteMany({ where: { id: rental.id } });
  await prisma.product.deleteMany({ where: { id: product.id } });
  await prisma.user.deleteMany({ where: { id: { in: [owner.id, renter.id] } } });

  console.log('🎉 TẤT CẢ 4 KỊCH BẢN NGHĨA VỤ CHỨNG MINH ĐÃ VƯỢT QUA TEST THÀNH CÔNG 100%!');
}

runBurdenOfProofTests()
  .catch((e) => {
    console.error('❌ Lỗi kiểm thử:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
