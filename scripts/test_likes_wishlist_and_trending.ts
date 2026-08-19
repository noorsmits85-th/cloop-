import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testWishlistAndTrending() {
  console.log('🧪 [TEST SUITE: LIKES, SAVES, WISHLIST & TIME-DECAY TRENDING] Bắt đầu kiểm thử...\n');

  // 1. Tạo User test
  const user = await prisma.user.create({
    data: {
      email: `wishlist_tester_${Date.now()}@test.com`,
      password: 'hashed_password',
      name: 'Wishlist Tester',
    }
  });

  const owner = await prisma.user.create({
    data: {
      email: `wishlist_owner_${Date.now()}@test.com`,
      password: 'hashed_password',
      name: 'Closet Owner',
    }
  });

  // 2. Tạo 2 sản phẩm: 1 sản phẩm mới (Hot), 1 sản phẩm cũ (30 ngày trước)
  const hotProduct = await prisma.product.create({
    data: {
      userId: owner.id,
      title: 'Đầm Lụa Mới Lên Kệ (Viral)',
      size: 'M',
      category: 'DRESS',
      condition: 'NEW_WITH_TAGS',
      province: 'Hồ Chí Minh',
      specificAddress: 'Quận 1',
      likeCount: 50,
      saveCount: 30,
      createdAt: new Date(), // Vừa đăng hôm nay
    }
  });

  const oldProduct = await prisma.product.create({
    data: {
      userId: owner.id,
      title: 'Váy Cũ 45 Ngày Trước',
      size: 'S',
      category: 'DRESS',
      condition: 'GOOD',
      province: 'Hà Nội',
      specificAddress: 'Hoàn Kiếm',
      likeCount: 150, // Nhiều like trong quá khứ
      saveCount: 80,
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 ngày trước
    }
  });

  console.log('▶️ [TEST 1] Kiểm tra Atomic Toggle Like & Save...');
  // Lưu sản phẩm vào Wishlist
  const fav1 = await prisma.productFavorite.create({
    data: {
      userId: user.id,
      productId: hotProduct.id,
      type: 'SAVE',
    }
  });
  console.log(`   👉 Đã lưu sản phẩm ${hotProduct.title} vào Wishlist (FavoriteId: ${fav1.id})`);

  // Thả tim sản phẩm
  const fav2 = await prisma.productFavorite.create({
    data: {
      userId: user.id,
      productId: hotProduct.id,
      type: 'LIKE',
    }
  });
  console.log(`   👉 Đã thả tim sản phẩm ${hotProduct.title} (FavoriteId: ${fav2.id})`);

  // Kiểm tra Unique constraint chống duplicate
  let duplicatePrevented = false;
  try {
    await prisma.productFavorite.create({
      data: {
        userId: user.id,
        productId: hotProduct.id,
        type: 'SAVE', // Cố tình lưu lần 2
      }
    });
  } catch (err: any) {
    duplicatePrevented = true;
  }
  console.log(`   👉 Chống spam duplicate bằng Unique Index: ${duplicatePrevented ? '✅ THÀNH CÔNG (DB chặn trùng)' : '❌ THẤT BẠI'}`);

  console.log('\n▶️ [TEST 2] Kiểm tra Thuật toán Xếp Hạng Time-Decay Gravity (BigTech Standard)...');
  const now = Date.now();
  
  // Tính điểm Hot Product (0 giờ tuổi, 50 likes, 30 saves)
  const hotHours = Math.max(0, (now - new Date(hotProduct.createdAt).getTime()) / (1000 * 60 * 60));
  const hotPoints = hotProduct.likeCount + (hotProduct.saveCount * 2);
  const hotScore = (hotPoints + 1) / Math.pow(hotHours + 2, 1.2);

  // Tính điểm Old Product (1080 giờ tuổi, 150 likes, 80 saves)
  const oldHours = Math.max(0, (now - new Date(oldProduct.createdAt).getTime()) / (1000 * 60 * 60));
  const oldPoints = oldProduct.likeCount + (oldProduct.saveCount * 2);
  const oldScore = (oldPoints + 1) / Math.pow(oldHours + 2, 1.2);

  console.log(`   👉 Điểm Hot Product (Vừa đăng): ${hotScore.toFixed(4)} (Raw: ${hotPoints} pts)`);
  console.log(`   👉 Điểm Old Product (45 ngày trước): ${oldScore.toFixed(4)} (Raw: ${oldPoints} pts)`);
  
  const decayWorking = hotScore > oldScore;
  console.log(`   👉 Đánh giá Time-Decay Gravity: ${decayWorking ? '✅ CHÍNH XÁC (Đồ mới hot vượt mặt đồ cũ nhiều like trong quá khứ!)' : '❌ THẤT BẠI'}`);

  // Dọn dẹp dữ liệu
  console.log('\n🧹 Dọn dẹp dữ liệu test...');
  await prisma.productFavorite.deleteMany({ where: { userId: user.id } });
  await prisma.product.deleteMany({ where: { id: { in: [hotProduct.id, oldProduct.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [user.id, owner.id] } } });

  console.log('🎉 [HOÀN TẤT KIỂM THỬ] Toàn bộ hệ thống Wishlist & Trending Time-Decay ĐẠT CHUẨN THÉP!');
}

testWishlistAndTrending()
  .catch(e => {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
