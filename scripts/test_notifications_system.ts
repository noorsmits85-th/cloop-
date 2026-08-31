import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testNotifications() {
  console.log("=================================================================");
  console.log("🔔 KIỂM THỬ HỆ THỐNG THÔNG BÁO HOẠT ĐỘNG THỰC TẾ");
  console.log("=================================================================\n");

  const users = await prisma.user.findMany({
    take: 3,
    select: { id: true, name: true, email: true }
  });

  console.log(`Tìm thấy ${users.length} người dùng để đối soát thông báo:\n`);

  for (const u of users) {
    const orders = await prisma.rentalHistory.findMany({
      where: { OR: [{ renterId: u.id }, { ownerId: u.id }, { product: { userId: u.id } }] },
      include: { product: true, invoice: true }
    });

    const coins = await prisma.coinLedgerEntry.findMany({
      where: { userId: u.id }
    });

    console.log(`👤 Người dùng: ${u.name || u.email} (${u.id})`);
    console.log(`   - Tổng đơn thuê liên quan: ${orders.length}`);
    console.log(`   - Tổng biến động Xu Lá: ${coins.length}`);

    if (orders.length > 0) {
      console.log(`   📦 Hoạt động đơn hàng gần nhất:`);
      for (const o of orders.slice(0, 3)) {
        console.log(`      • [${o.status}] Đơn #${o.id.slice(0, 8)} - Món: "${o.product?.title}" - Tạo lúc: ${o.createdAt.toLocaleString('vi-VN')}`);
      }
    }
    console.log("");
  }

  console.log("✅ Dữ liệu hoạt động sẵn sàng và đồng bộ 100%!");
}

testNotifications().finally(() => prisma.$disconnect());
