"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin, requireUser } from "@/src/lib/auth";
import { createGhnShippingOrder } from "@/src/lib/ghn";

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

export async function requestPickupAction(rentalId: string, packagingProofUrls: string[] = []) {
  try {
    const user = await requireUser();
    if (!user) {
      return { success: false, error: "Chưa đăng nhập." };
    }

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

    // Cập nhật trạng thái đơn hàng sang LENDER_SHIPPED
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
          status: "PENDING_BOOKING",
          shippingFeeCollected: rental.invoice?.shippingFeeCollected || 0,
          pickupAddress,
          deliveryAddress,
          bookedByUserId: user.id,
          providerRawPayload: packagingProofUrls.length > 0 ? { packagingProofUrls } : undefined,
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
          providerRawPayload: packagingProofUrls.length > 0 ? { packagingProofUrls } : undefined,
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
            packagingProofUrls,
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

/**
 * ⚡ TẠO VẬN ĐƠN TỰ ĐỘNG TRỰC TIẾP QUA GHN GATEWAY API
 * Gửi yêu cầu thẳng sang máy chủ Giao Hàng Nhanh, nhận Mã Vận Đơn thực và Cước Phí chuẩn từng đồng
 */
export async function createGhnShipmentAction(shipmentId: string) {
  try {
    const { profile: admin } = await requireAdmin();

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        rental: {
          include: {
            product: true,
            invoice: true,
          },
        },
      },
    });

    if (!shipment) {
      return { success: false, error: "Không tìm thấy thông tin đơn giao vận." };
    }

    const rental = shipment.rental;
    if (!rental) {
      return { success: false, error: "Không tìm thấy dữ liệu đơn thuê tương ứng." };
    }

    const isDelivery = shipment.direction === "DELIVERY";

    // 1. Phân loại người gửi và người nhận dựa theo chiều giao (DELIVERY: Chủ tủ -> Khách thuê; RETURN: Khách thuê -> Chủ tủ)
    const sender = isDelivery
      ? {
          name: rental.owner_name || (shipment.pickupAddress as any)?.name || "Chủ tủ CLOOP",
          phone: rental.owner_phone || (shipment.pickupAddress as any)?.phone || "",
          province: rental.product?.province || (shipment.pickupAddress as any)?.province,
          districtId: rental.product?.districtId || (shipment.pickupAddress as any)?.districtId,
          wardCode: rental.product?.wardCode || (shipment.pickupAddress as any)?.wardCode,
          specificAddress: rental.product?.specificAddress || (shipment.pickupAddress as any)?.specificAddress,
        }
      : {
          name: rental.renter_name || (shipment.pickupAddress as any)?.name || "Khách thuê CLOOP",
          phone: rental.renter_phone || (shipment.pickupAddress as any)?.phone || "",
          province: (shipment.pickupAddress as any)?.province,
          districtId: (shipment.pickupAddress as any)?.districtId,
          wardCode: (shipment.pickupAddress as any)?.wardCode,
          specificAddress: (shipment.pickupAddress as any)?.specificAddress || (shipment.pickupAddress as any)?.address,
        };

    const receiver = isDelivery
      ? {
          name: rental.renter_name || (shipment.deliveryAddress as any)?.name || "Khách thuê CLOOP",
          phone: rental.renter_phone || (shipment.deliveryAddress as any)?.phone || "",
          province: (shipment.deliveryAddress as any)?.province,
          districtId: (shipment.deliveryAddress as any)?.districtId,
          wardCode: (shipment.deliveryAddress as any)?.wardCode,
          specificAddress: (shipment.deliveryAddress as any)?.specificAddress || (shipment.deliveryAddress as any)?.address,
        }
      : {
          name: rental.owner_name || (shipment.deliveryAddress as any)?.name || "Chủ tủ CLOOP",
          phone: rental.owner_phone || (shipment.deliveryAddress as any)?.phone || "",
          province: rental.product?.province || (shipment.deliveryAddress as any)?.province,
          districtId: rental.product?.districtId || (shipment.deliveryAddress as any)?.districtId,
          wardCode: rental.product?.wardCode || (shipment.deliveryAddress as any)?.wardCode,
          specificAddress: rental.product?.specificAddress || (shipment.deliveryAddress as any)?.specificAddress,
        };

    const clientOrderCode = shipment.clientOrderCode || `${shipment.id.slice(0, 8).toUpperCase()}-${shipment.direction}`;

    // 2. Gửi yêu cầu tự động sang Gateway API của Giao Hàng Nhanh (GHN)
    const ghnResult = await createGhnShippingOrder({
      clientOrderCode,
      sender,
      receiver,
      product: {
        title: rental.product?.title || "Sản phẩm thời trang CLOOP",
        declaredValue: rental.invoice?.depositAmount || 0,
        weightGram: 500,
      },
      note: `CLOOP #${rental.id.slice(0, 8).toUpperCase()} - ${isDelivery ? "Chiều giao" : "Chiều hoàn trả"}`,
    });

    if (!ghnResult.success) {
      return {
        success: false,
        error: `Lỗi GHN Gateway: ${ghnResult.error}`,
      };
    }

    // 3. Cập nhật vào cơ sở dữ liệu với mã vận đơn thật và cước phí thực tế từng đồng từ GHN
    await prisma.$transaction(async (tx) => {
      await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          provider: "GHN",
          status: "BOOKED",
          trackingCode: ghnResult.trackingCode,
          providerOrderCode: ghnResult.orderCode,
          actualShippingFee: ghnResult.actualShippingFee,
          bookedByAdminId: admin.id,
          providerRawPayload: ghnResult.raw,
        },
      });

      // Cập nhật trạng thái đơn hàng
      if (isDelivery) {
        await tx.rentalHistory.updateMany({
          where: {
            id: rental.id,
            status: { in: ["OWNER_PACKED", "PENDING_APPROVAL"] },
          },
          data: {
            status: "LENDER_SHIPPED",
            shippingCode: ghnResult.trackingCode,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          adminId: admin.id,
          action: "ADMIN_AUTO_CREATE_GHN_SHIPMENT",
          targetType: "SHIPMENT",
          targetId: shipment.id,
          beforeStatus: shipment.status,
          afterStatus: "BOOKED",
          metadata: JSON.stringify({
            rentalId: rental.id,
            trackingCode: ghnResult.trackingCode,
            orderCode: ghnResult.orderCode,
            actualShippingFee: ghnResult.actualShippingFee,
          }),
        },
      });
    }, { timeout: 20000, maxWait: 10000 });

    revalidateShipmentViews(rental.id);

    return {
      success: true,
      trackingCode: ghnResult.trackingCode,
      actualShippingFee: ghnResult.actualShippingFee,
      message: `Đã tạo vận đơn GHN thành công! Mã vận đơn: ${ghnResult.trackingCode}, Cước thực tế: ${ghnResult.actualShippingFee.toLocaleString("vi-VN")}₫`,
    };
  } catch (error: any) {
    console.error("Lỗi tạo vận đơn GHN tự động:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Không thể tạo vận đơn qua GHN.",
    };
  }
}

/**
 * Cập nhật mã vận đơn thủ công (dành cho trường hợp gửi tại bưu cục hoặc đơn vị khác)
 */
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
        throw new Error("Không tìm thấy yêu cầu vận chuyển.");
      }

      if (shipment.status !== "PENDING_BOOKING" && shipment.status !== "BOOKED") {
        throw new Error("Yêu cầu vận chuyển không còn ở trạng thái chờ tạo vận đơn.");
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
    return { success: true, shipmentId: result.id, message: "Đã cập nhật mã vận đơn thành công." };
  } catch (error: any) {
    if (error?.code === "P2002") {
      return { success: false, error: "Mã vận đơn này đã được sử dụng. Vui lòng kiểm tra lại." };
    }
    const message = error instanceof Error ? error.message : "Không thể cập nhật mã vận đơn.";
    return { success: false, error: message };
  }
}
