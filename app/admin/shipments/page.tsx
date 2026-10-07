import ShipmentQueueClient from "./ShipmentQueueClient";
import { prisma } from "@/src/lib/prisma";
import { requireAdminOrRedirect } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

const STATUS_PRIORITY: Record<string, number> = {
  PENDING_BOOKING: 1,
  BOOKED: 2,
  PICKING: 3,
  IN_TRANSIT: 4,
  DELIVERED: 5,
};

export default async function AdminShipmentsPage() {
  await requireAdminOrRedirect();

  // 1. Tự động kiểm tra các đơn hàng đang cần vận chuyển nhưng chưa có bản ghi shipment
  const activeRentals = await prisma.rentalHistory.findMany({
    where: {
      status: { in: ["OWNER_PACKED", "LENDER_SHIPPED", "BORROWER_RETURNED"] },
      shipments: { none: {} },
    },
    include: {
      product: true,
      invoice: true,
    },
  });

  for (const rental of activeRentals) {
    const isDelivery = rental.status !== "BORROWER_RETURNED";
    await prisma.shipment.create({
      data: {
        rentalId: rental.id,
        direction: isDelivery ? "DELIVERY" : "RETURN",
        status: "PENDING_BOOKING",
        clientOrderCode: `CLP-${rental.id.slice(0, 8).toUpperCase()}`,
        shippingFeeCollected: rental.invoice?.shippingFeeCollected || 35000,
        pickupAddress: {
          name: isDelivery ? rental.owner_name || "Chủ tủ" : rental.renter_name || "Khách thuê",
          phone: isDelivery ? rental.owner_phone || "" : rental.renter_phone || "",
          province: rental.product?.province || "Hà Nội",
          districtId: rental.product?.districtId,
          wardCode: rental.product?.wardCode,
          specificAddress: rental.product?.specificAddress || "Cầu Giấy, Hà Nội",
        },
        deliveryAddress: {
          name: isDelivery ? rental.renter_name || "Khách thuê" : rental.owner_name || "Chủ tủ",
          phone: isDelivery ? rental.renter_phone || "" : rental.owner_phone || "",
          province: "Hà Nội",
          specificAddress: "Đống Đa, Hà Nội",
        },
      },
    }).catch(() => null);
  }

  // 2. Lấy toàn bộ danh sách vận đơn thực tế
  const shipments = await prisma.shipment.findMany({
    where: {
      status: {
        in: ["PENDING_BOOKING", "BOOKED", "PICKING", "IN_TRANSIT", "DELIVERED"],
      },
    },
    include: {
      rental: {
        include: {
          product: {
            select: {
              title: true,
              province: true,
              districtId: true,
              wardCode: true,
              specificAddress: true,
            },
          },
          invoice: {
            select: {
              shippingFeeCollected: true,
              depositAmount: true,
            },
          },
        },
      },
    },
    take: 50,
  });

  // Ưu tiên hiển thị đơn CHỜ TẠO VẬN ĐƠN lên trên cùng
  shipments.sort((a, b) => {
    const pA = STATUS_PRIORITY[a.status] || 99;
    const pB = STATUS_PRIORITY[b.status] || 99;
    if (pA !== pB) return pA - pB;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const rows = shipments.map((shipment) => {
    const pickup = shipment.pickupAddress as any;
    const delivery = shipment.deliveryAddress as any;

    return {
      id: shipment.id,
      rentalId: shipment.rentalId,
      direction: shipment.direction,
      status: shipment.status,
      provider: shipment.provider,
      trackingCode: shipment.trackingCode,
      clientOrderCode: shipment.clientOrderCode,
      shippingFeeCollected: shipment.shippingFeeCollected,
      actualShippingFee: shipment.actualShippingFee,
      createdAt: shipment.createdAt.toISOString(),
      pickupAddress: pickup || null,
      deliveryAddress: delivery || null,
      rental: {
        id: shipment.rental?.id || shipment.rentalId,
        status: shipment.rental?.status || "PENDING_APPROVAL",
        renter_name: shipment.rental?.renter_name || delivery?.name || "Khách thuê",
        renter_phone: shipment.rental?.renter_phone || delivery?.phone || "",
        owner_name: shipment.rental?.owner_name || pickup?.name || "Chủ tủ",
        owner_phone: shipment.rental?.owner_phone || pickup?.phone || "",
        depositAmount: shipment.rental?.invoice?.depositAmount || 0,
        product: shipment.rental?.product || null,
      },
    };
  });

  return <ShipmentQueueClient shipments={rows} />;
}
