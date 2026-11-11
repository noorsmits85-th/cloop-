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

  // Lấy toàn bộ danh sách vận đơn thực tế của các đơn đã thanh toán hoặc đang lưu thông (Read-only GET render)
  const shipments = await prisma.shipment.findMany({
    where: {
      status: {
        in: ["PENDING_BOOKING", "BOOKED", "PICKING", "IN_TRANSIT", "DELIVERED"],
      },
      rental: {
        isDeleted: false,
        invoice: {
          status: "PAID",
        },
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
              status: true,
              orderCode: true,
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
