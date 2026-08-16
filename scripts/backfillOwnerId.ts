import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Bắt đầu tiến trình Backfill ownerId cho RentalHistory...");
  let totalUpdated = 0;
  
  while (true) {
    // 1. Chia Lô Nhỏ (Chunking): Lấy lô 100 đơn hàng chưa có ownerId
    const rentals = await prisma.rentalHistory.findMany({
      where: { ownerId: null },
      take: 100,
      include: {
        product: { select: { userId: true } }
      }
    });

    if (rentals.length === 0) {
      console.log("✅ Không còn đơn hàng nào bị thiếu ownerId. Tiến trình hoàn tất!");
      break;
    }

    console.log(`⏳ Đang xử lý lô ${rentals.length} đơn hàng...`);

    // 2. Mapping và Cập nhật đa luồng có kiểm soát (Promise.all)
    await Promise.all(rentals.map(async (rental) => {
      const ownerId = rental.product?.userId;
      
      if (ownerId) {
        await prisma.rentalHistory.update({
          where: { id: rental.id },
          data: { ownerId }
        });
      } else {
        console.warn(`⚠️ Cảnh báo: Đơn hàng ${rental.id} không tìm thấy product.userId`);
      }
    }));

    totalUpdated += rentals.length;
    console.log(`✅ Lô hiện tại xong. Tổng số đã cập nhật: ${totalUpdated} đơn hàng.`);

    // 3. Nhịp Nghỉ (Throttling): Giảm tải cho Connection Pool
    await new Promise(res => setTimeout(res, 500));
  }
}

main()
  .catch(e => {
    console.error("❌ Lỗi trong quá trình backfill:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
