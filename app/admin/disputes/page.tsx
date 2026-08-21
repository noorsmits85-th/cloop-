import React from "react";
import { prisma } from "@/src/lib/prisma";
import { requireAdminOrRedirect } from "@/src/lib/auth";
import AdminDisputesClient from "./AdminDisputesClient";

export const dynamic = "force-dynamic";

export default async function AdminDisputesPage() {
  await requireAdminOrRedirect();

  const disputes = await prisma.dispute.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      invoice: true,
      rental: {
        include: {
          product: {
            include: {
              images: true,
              user: true,
            },
          },
          renter: true,
        },
      },
    },
  });

  const formattedDisputes = disputes.map((d) => ({
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
  }));

  return <AdminDisputesClient initialDisputes={formattedDisputes} />;
}
