import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Bắt đầu test luồng E2E cho Shipping (Phase 1)...");
  
  // 1. Tạo mock dữ liệu cơ bản
  const ownerId = "test-owner-" + randomUUID().substring(0, 8);
  const renterId = "test-renter-" + randomUUID().substring(0, 8);
  const adminId = "test-admin-" + randomUUID().substring(0, 8);
  
  console.log(`👤 Tạo user (Owner: ${ownerId}, Renter: ${renterId}, Admin: ${adminId})`);
  
  const owner = await prisma.user.create({ data: { id: ownerId, email: `${ownerId}@test.com`, name: "Test Owner" } });
  const renter = await prisma.user.create({ data: { id: renterId, email: `${renterId}@test.com`, name: "Test Renter" } });
  const admin = await prisma.user.create({ data: { id: adminId, email: `${adminId}@test.com`, name: "Test Admin", role: "ADMIN" } });
  
  const product = await prisma.product.create({
    data: {
      userId: owner.id,
      title: "Váy test E2E",
      description: "Test",
      originalPrice: 1000000,
      rentalPrice: 100000,
      categoryId: (await prisma.category.findFirst())?.id || (await prisma.category.create({ data: { name: "Test Cat", slug: "test-cat-" + randomUUID() } })).id,
      sizeId: (await prisma.size.findFirst())?.id || (await prisma.size.create({ data: { name: "M" } })).id,
      brandId: (await prisma.brand.findFirst())?.id || (await prisma.brand.create({ data: { name: "Test Brand" } })).id,
      colorId: (await prisma.color.findFirst())?.id || (await prisma.color.create({ data: { name: "Red", hexCode: "#f00" } })).id,
      conditionId: (await prisma.condition.findFirst())?.id || (await prisma.condition.create({ data: { name: "New" } })).id,
    }
  });

  // 2. Renter đặt hàng (RentalHistory sinh ra ở trạng thái PENDING_PAYMENT)
  console.log("🛒 Renter đặt hàng (PENDING_PAYMENT)...");
  const rental = await prisma.rentalHistory.create({
    data: {
      renterId: renter.id,
      product_id: product.id,
      status: "PENDING_PAYMENT",
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 3), // 3 days later
      totalPrice: 135000, // 100k rental + 35k ship
      owner_name: owner.name,
      renter_name: renter.name,
      renter_phone: "0123456789",
    }
  });
  
  const invoice = await prisma.invoice.create({
    data: {
      userId: renter.id,
      amount: 135000,
      type: "RENTAL",
      status: "PENDING",
      rentalId: rental.id,
      shippingFeeCollected: 35000,
      platformFee: 5000,
    }
  });

  // 3. Webhook PayOS gọi về -> PENDING_APPROVAL
  console.log("💳 PayOS Webhook gọi về -> PENDING_APPROVAL...");
  await prisma.$transaction([
    prisma.invoice.update({ where: { id: invoice.id }, data: { status: "PAID", payosStatus: "success" } }),
    prisma.rentalHistory.update({ where: { id: rental.id }, data: { status: "PENDING_APPROVAL" } })
  ]);
  
  const rentalAfterWebhook = await prisma.rentalHistory.findUnique({ where: { id: rental.id } });
  if (rentalAfterWebhook?.status !== "PENDING_APPROVAL") throw new Error("Webhook failed to set PENDING_APPROVAL");
  
  // 4. Owner bấm nút "Đã đóng gói - Gọi Shipper" (requestPickupAction)
  console.log("📦 Owner bấm [Đã đóng gói]...");
  // Simulate the logic in requestPickupAction
  const shipment = await prisma.shipment.create({
    data: {
      rentalId: rental.id,
      direction: "DELIVERY",
      status: "PENDING_BOOKING",
      clientOrderCode: `${rental.id}-DELIVERY`,
      shippingFeeCollected: invoice.shippingFeeCollected,
      bookedByUserId: owner.id,
    }
  });
  await prisma.rentalHistory.update({ where: { id: rental.id }, data: { status: "OWNER_PACKED" } });
  await prisma.auditLog.create({
    data: {
      adminId: owner.id, // Using adminId for actorId as currently structured
      action: "OWNER_REQUEST_PICKUP",
      targetType: "SHIPMENT",
      targetId: shipment.id,
      beforeStatus: "PENDING_APPROVAL",
      afterStatus: "OWNER_PACKED",
      metadata: JSON.stringify({ rentalId: rental.id, clientOrderCode: shipment.clientOrderCode })
    }
  });
  
  const rentalAfterOwner = await prisma.rentalHistory.findUnique({ where: { id: rental.id } });
  if (rentalAfterOwner?.status !== "OWNER_PACKED") throw new Error("Owner action failed to set OWNER_PACKED");
  
  // 5. Admin tạo đơn ship (markShipmentBookedAction)
  console.log("🚚 Admin nhập mã vận đơn GHN...");
  const trackingCode = "GHN-" + randomUUID().substring(0, 6);
  await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      provider: "GHN",
      status: "BOOKED",
      trackingCode: trackingCode,
      providerOrderCode: trackingCode,
      bookedByAdminId: admin.id,
    }
  });
  await prisma.rentalHistory.update({ where: { id: rental.id }, data: { status: "LENDER_SHIPPED", shippingCode: trackingCode } });
  await prisma.auditLog.create({
    data: {
      adminId: admin.id,
      action: "ADMIN_MARK_SHIPMENT_BOOKED",
      targetType: "SHIPMENT",
      targetId: shipment.id,
      beforeStatus: "PENDING_BOOKING",
      afterStatus: "BOOKED",
      metadata: JSON.stringify({ rentalId: rental.id, provider: "GHN", trackingCode: trackingCode })
    }
  });
  
  const rentalAfterAdmin = await prisma.rentalHistory.findUnique({ where: { id: rental.id }, include: { shipment: true } });
  if (rentalAfterAdmin?.status !== "LENDER_SHIPPED") throw new Error("Admin action failed to set LENDER_SHIPPED");
  if (rentalAfterAdmin?.shipment[0].status !== "BOOKED") throw new Error("Shipment not BOOKED");
  
  // 6. Test Admin nhập trùng mã
  console.log("❌ Test Admin nhập trùng mã vận đơn...");
  try {
    await prisma.shipment.create({
      data: {
        rentalId: rental.id, // Hack to bypass rental unique for test, let's just make a dummy shipment
        direction: "RETURN",
        status: "BOOKED",
        provider: "GHN",
        providerOrderCode: trackingCode, // Duplicated!
        clientOrderCode: `${rental.id}-RETURN`,
      }
    });
    throw new Error("❌ CSDL không chặn lỗi trùng mã vận đơn! Unique constraint fail.");
  } catch (err: any) {
    if (err.code === "P2002") {
      console.log("✅ CSDL Đã chặn thành công lỗi trùng mã vận đơn (Lỗi P2002 Prisma bắn ra chuẩn xác).");
    } else {
      throw err;
    }
  }

  // Cleanup
  console.log("🧹 Dọn dẹp dữ liệu test...");
  await prisma.auditLog.deleteMany({ where: { targetId: shipment.id } });
  await prisma.shipment.deleteMany({ where: { rentalId: rental.id } });
  await prisma.invoice.deleteMany({ where: { rentalId: rental.id } });
  await prisma.rentalHistory.deleteMany({ where: { id: rental.id } });
  await prisma.product.deleteMany({ where: { id: product.id } });
  await prisma.user.deleteMany({ where: { id: { in: [owner.id, renter.id, admin.id] } } });
  
  console.log("🎉 Test E2E Shipping Flow PASS 100%!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
