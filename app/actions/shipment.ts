"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin, requireUser } from "@/src/lib/auth";

const manualBookingSchema = z.object({
  shipmentId: z.string().min(1),
  provider: z.enum(["GHN", "GHTK", "MANUAL"]),
  trackingCode: z.string().trim().min(3).max(80),
  providerOrderCode: z.string().trim().min(3).max(80).optional(),
  actualShippingFee: z.coerce.number().int().min(0).optional(),
});

function revalidateShipmentViews(rentalId?: string | null) {
  revalidatePath("/admin/shipments");
  revalidatePath("/my-closet/orders");
  if (rentalId) {
    revalidatePath(`/checkout/${rentalId}`);
  }
}

export async function requestPickupAction(rentalId: string) {
  try {
    const user = await requireUser();

    if (!rentalId || rentalId.length < 8) {
      return { success: false, error: "Ma don hang khong hop le." };
    }

    const result = await prisma.$transaction(async (tx) => {
      const rental = await tx.rentalHistory.findUnique({
        where: { id: rentalId },
        include: {
          invoice: true,
          product: true,
        },
      });

      if (!rental) {
        throw new Error("Khong tim thay don hang.");
      }

      const ownerId = rental.ownerId || rental.product.userId;
      if (ownerId !== user.id) {
        throw new Error("Forbidden: Ban khong phai chu tu cua don hang nay.");
      }

      if (rental.status !== "PENDING_APPROVAL") {
        throw new Error("Don hang khong o trang thai cho chu do dong goi.");
      }

      const clientOrderCode = `${rental.id}-DELIVERY`;
      const pickupAddress = {
        name: rental.owner_name,
        phone: rental.owner_phone,
        province: rental.product.province,
        districtId: rental.product.districtId,
        wardCode: rental.product.wardCode,
        specificAddress: rental.product.specificAddress,
      };
      const deliveryAddress = {
        name: rental.renter_name,
        phone: rental.renter_phone,
      };

      const updateResult = await tx.rentalHistory.updateMany({
        where: {
          id: rental.id,
          status: "PENDING_APPROVAL",
        },
        data: {
          status: "OWNER_PACKED",
        },
      });

      if (updateResult.count === 0) {
        throw new Error("Trang thai don hang da thay doi. Hay tai lai trang.");
      }

      const shipment = await tx.shipment.upsert({
        where: {
          rentalId_direction: {
            rentalId: rental.id,
            direction: "DELIVERY",
          },
        },
        update: {
          status: "PENDING_BOOKING",
          shippingFeeCollected: rental.invoice?.shippingFeeCollected || 0,
          pickupAddress,
          deliveryAddress,
          bookedByUserId: user.id,
        },
        create: {
          rentalId: rental.id,
          direction: "DELIVERY",
          status: "PENDING_BOOKING",
          clientOrderCode,
          shippingFeeCollected: rental.invoice?.shippingFeeCollected || 0,
          pickupAddress,
          deliveryAddress,
          bookedByUserId: user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          adminId: user.id,
          action: "OWNER_REQUEST_PICKUP",
          targetType: "SHIPMENT",
          targetId: shipment.id,
          beforeStatus: "PENDING_APPROVAL",
          afterStatus: "OWNER_PACKED",
          metadata: JSON.stringify({
            rentalId: rental.id,
            clientOrderCode,
          }),
        },
      });

      return { rentalId: rental.id, shipmentId: shipment.id };
    });

    revalidateShipmentViews(result.rentalId);
    return { success: true, shipmentId: result.shipmentId };
  } catch (error) {
    // TODO: Pipe important shipment failures to Sentry/LogRocket before production scale.
    const message = error instanceof Error ? error.message : "Khong the goi lay hang.";
    return { success: false, error: message };
  }
}

export async function markShipmentBookedAction(input: unknown) {
  try {
    const { profile: admin } = await requireAdmin();
    const data = manualBookingSchema.parse(input);
    const providerOrderCode = data.providerOrderCode || data.trackingCode;

    const result = await prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.findUnique({
        where: { id: data.shipmentId },
        include: {
          rental: true,
        },
      });

      if (!shipment) {
        throw new Error("Khong tim thay yeu cau van chuyen.");
      }

      if (shipment.status !== "PENDING_BOOKING" && shipment.status !== "BOOKED") {
        throw new Error("Yeu cau van chuyen khong con o trang thai cho tao van don.");
      }

      const updatedShipment = await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          provider: data.provider,
          status: "BOOKED",
          trackingCode: data.trackingCode,
          providerOrderCode,
          actualShippingFee: data.actualShippingFee,
          bookedByAdminId: admin.id,
          providerRawPayload: {
            source: "ADMIN_MANUAL",
            provider: data.provider,
            trackingCode: data.trackingCode,
            providerOrderCode,
          },
        },
      });

      await tx.rentalHistory.updateMany({
        where: {
          id: shipment.rentalId,
          status: "OWNER_PACKED",
        },
        data: {
          status: "LENDER_SHIPPED",
          shippingCode: data.trackingCode,
        },
      });

      await tx.auditLog.create({
        data: {
          adminId: admin.id,
          action: "ADMIN_MARK_SHIPMENT_BOOKED",
          targetType: "SHIPMENT",
          targetId: shipment.id,
          beforeStatus: shipment.status,
          afterStatus: "BOOKED",
          metadata: JSON.stringify({
            rentalId: shipment.rentalId,
            provider: data.provider,
            trackingCode: data.trackingCode,
            actualShippingFee: data.actualShippingFee,
          }),
        },
      });

      return updatedShipment;
    });

    revalidateShipmentViews(result.rentalId);
    return { success: true, shipmentId: result.id };
  } catch (error: any) {
    // TODO: Pipe important shipment failures to Sentry/LogRocket before production scale.
    if (error?.code === "P2002") {
      return { success: false, error: "Mã vận đơn này đã được sử dụng. Vui lòng kiểm tra lại." };
    }
    const message = error instanceof Error ? error.message : "Khong the cap nhat van don.";
    return { success: false, error: message };
  }
}
