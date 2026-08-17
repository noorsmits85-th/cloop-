import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  console.log("🧹 Dọn dẹp Mock Data (Nếu có)...");
  
  // Xóa các user có prefix 'test-'
  const testUsers = await prisma.user.findMany({
    where: { id: { startsWith: 'test-' } }
  });
  
  if (testUsers.length === 0) {
    console.log("✅ Không tìm thấy dữ liệu test nào cần xóa.");
    return;
  }
  
  const userIds = testUsers.map(u => u.id);
  
  console.log(`Tìm thấy ${userIds.length} users test. Tiến hành xóa relations...`);
  
  try {
    // AuditLog
    await prisma.auditLog.deleteMany({
      where: { adminId: { in: userIds } }
    });
    
    // Shipments & Invoices from rentals associated with these users
    const rentals = await prisma.rentalHistory.findMany({
      where: { OR: [{ renterId: { in: userIds } }, { ownerId: { in: userIds } }] }
    });
    const rentalIds = rentals.map(r => r.id);
    
    if (rentalIds.length > 0) {
      await prisma.shipment.deleteMany({ where: { rentalId: { in: rentalIds } } });
      await prisma.invoice.deleteMany({ where: { rentalId: { in: rentalIds } } });
      await prisma.rentalHistory.deleteMany({ where: { id: { in: rentalIds } } });
    }
    
    // Products
    await prisma.product.deleteMany({
      where: { userId: { in: userIds } }
    });
    
    // Finally Users
    await prisma.user.deleteMany({
      where: { id: { in: userIds } }
    });
    
    console.log("✅ Dọn dẹp hoàn tất.");
  } catch (error) {
    console.error("❌ Lỗi khi dọn dẹp:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
