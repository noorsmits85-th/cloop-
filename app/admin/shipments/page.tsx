import ShipmentQueueClient from "./ShipmentQueueClient";
import { prisma } from "@/src/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminShipmentsPage() {
  const shipments = await prisma.shipment.findMany({
    where: {
      status: {
        in: ["PENDING_BOOKING", "BOOKED", "PICKING", "IN_TRANSIT"],
      },
    },
    include: {
      rental: {
        include: {
          product: {
            select: {
              title: true,
              province: true,
              specificAddress: true,
            },
          },
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { createdAt: "desc" },
    ],
    take: 40,
  });

  const rows = shipments.map((shipment) => ({
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
    rental: {
      renter_name: shipment.rental.renter_name,
      renter_phone: shipment.rental.renter_phone,
      owner_name: shipment.rental.owner_name,
      owner_phone: shipment.rental.owner_phone,
      product: shipment.rental.product,
    },
  }));

  return <ShipmentQueueClient shipments={rows} />;
}
