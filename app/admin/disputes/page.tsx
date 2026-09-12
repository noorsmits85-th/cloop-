import React from "react";
import { prisma } from "@/src/lib/prisma";
import { requireAdminOrRedirect } from "@/src/lib/auth";
import AdminDisputesClient from "./AdminDisputesClient";

export const dynamic = "force-dynamic";

export default async function AdminDisputesPage() {
  await requireAdminOrRedirect();

  const disputes = await prisma.dispute.findMany({
    take: 40,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rentalId: true,
      description: true,
      images: true,
      severity: true,
      suggestedDeduction: true,
      finalDeduction: true,
      status: true,
      adminNotes: true,
      createdAt: true,
      invoice: {
        select: {
          depositAmount: true,
          rentalFee: true,
        },
      },
      rental: {
        select: {
          renterId: true,
          ownerId: true,
          start_date: true,
          end_date: true,
          actual_return_date: true,
          status: true,
          shippingCode: true,
          createdAt: true,
          shipments: {
            select: {
              direction: true,
              status: true,
              trackingCode: true,
            },
          },
          renter: { select: { name: true } },
          product: {
            select: {
              title: true,
              images: { take: 1, select: { url: true } },
              user: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  const formattedDisputes = disputes.map((d) => {
    const deliveryShipment = d.rental?.shipments?.find((s) => s.direction === "DELIVERY");
    const returnShipment = d.rental?.shipments?.find((s) => s.direction === "RETURN");

    return {
      id: d.id,
      rentalId: d.rentalId,
      description: d.description,
      images: d.images,
      severity: d.severity,
      suggestedDeduction: d.suggestedDeduction,
      finalDeduction: d.finalDeduction,
      status: d.status,
      adminNotes: d.adminNotes,
      createdAt: d.createdAt.toISOString(),
      productTitle: d.rental?.product?.title || "Trang phục",
      productImage: d.rental?.product?.images?.[0]?.url || "",
      renterName: d.rental?.renter?.name || d.rental?.renterId || "Khách thuê",
      ownerName: d.rental?.product?.user?.name || d.rental?.ownerId || "Chủ tủ",
      depositAmount: d.invoice?.depositAmount || 0,
      rentalFee: d.invoice?.rentalFee || 0,
      rentalCreatedAt: d.rental?.createdAt?.toISOString() || null,
      startDate: d.rental?.start_date?.toISOString() || null,
      endDate: d.rental?.end_date?.toISOString() || null,
      actualReturnDate: d.rental?.actual_return_date?.toISOString() || null,
      rentalStatus: d.rental?.status || null,
      deliveryTrackingCode: deliveryShipment?.trackingCode || d.rental?.shippingCode || null,
      returnTrackingCode: returnShipment?.trackingCode || null,
      deliveryStatus: deliveryShipment?.status || null,
      returnStatus: returnShipment?.status || null,
    };
  });

  return <AdminDisputesClient initialDisputes={formattedDisputes} />;
}
