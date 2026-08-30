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
      return { success: false, error: "Mã đơn hàng không hợp lệ." };
    }

    const rental = await prisma.rentalHistory.findUnique({
      where: { id: rentalId },
      include: {
        invoice: true,
        product: true,
      },
    });

    if (!rental) {
      return { success: false, error: "Không tìm thấy đơn hàng." };
    }

    // Cập nhật trạng thái đơn hàng sang LENDER_SHIPPED (Shipper đã lấy đồ và đang giao)
    await prisma.rentalHistory.update({
      where: { id: rental.id },
      data: {
        status: "LENDER_SHIPPED",
      },
    });

    // Tạo / cập nhật bản ghi shipment
    try {
      const clientOrderCode = `${rental.id}-DELIVERY`;
      const pickupAddress = {
        name: rental.owner_name || "Chủ tủ",
        phone: rental.owner_phone || "",
        province: rental.product?.province || "Hà Nội",
        districtId: rental.product?.districtId,
        wardCode: rental.product?.wardCode,
        specificAddress: rental.product?.specificAddress,
      };
      const deliveryAddress = {
        name: rental.renter_name || "Khách thuê",
        phone: rental.renter_phone || "",
      };

      await prisma.shipment.upsert({
        where: {
          rentalId_direction: {
            rentalId: rental.id,
            direction: "DELIVERY",
          },
        },
        update: {
          status: "IN_TRANSIT",
          shippingFeeCollected: rental.invoice?.shippingFeeCollected || 0,
          pickupAddress,
          deliveryAddress,
          bookedByUserId: user.id,
          trackingCode: `GHN-${rental.id.slice(0, 8).toUpperCase()}`,
        },
        create: {
          rentalId: rental.id,
          direction: "DELIVERY",
          status: "IN_TRANSIT",
          clientOrderCode,
          shippingFeeCollected: rental.invoice?.shippingFeeCollected || 0,
          pickupAddress,
          deliveryAddress,
          bookedByUserId: user.id,
          trackingCode: `GHN-${rental.id.slice(0, 8).toUpperCase()}`,
        },
      });

      await prisma.auditLog.create({
        data: {
          adminId: user.id,
          action: "OWNER_REQUEST_PICKUP",
          targetType: "SHIPMENT",
          targetId: rental.id,
          beforeStatus: "PENDING_APPROVAL",
          afterStatus: "LENDER_SHIPPED",
          metadata: JSON.stringify({
            rentalId: rental.id,
            clientOrderCode,
          }),
        },
      });
    } catch (shipmentErr) {
      console.warn("Shipment record non-blocking log:", shipmentErr);
    }

    revalidateShipmentViews(rental.id);
    return { success: true, shipmentId: rental.id };
  } catch (error: any) {
    console.error("Lỗi gọi bưu tá:", error);
    const message = error instanceof Error ? error.message : "Không thể gọi lấy hàng.";
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
    }, { timeout: 20000, maxWait: 10000 });

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
