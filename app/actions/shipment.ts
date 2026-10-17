"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin, requireUser } from "@/src/lib/auth";
import { createGhnShippingOrder } from "@/src/lib/ghn";
import { createGhtkShippingOrder } from "@/src/lib/ghtk";

const manualBookingSchema = z.object({
  shipmentId: z.string().min(1),
  provider: z.enum(["GHN", "GHTK", "GRAB", "MANUAL"]),
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
        shipments: true,
      },
    });

    if (!rental) {
      return { success: false, error: "Không tìm thấy đơn hàng." };
    }

    // 🛡️ Kiểm tra quyền: Phải là chủ tủ đồ của món hàng này
    if (rental.ownerId !== user.id && rental.product?.userId !== user.id) {
      return { success: false, error: "Bạn không có quyền thao tác trên đơn hàng này." };
    }

    // 1. Phân loại phương thức giao nhận theo Multi-Carrier: GHN | GHTK | GRAB | SELF_PICKUP
    const existingShipment = rental.shipments.find((s) => s.direction === "DELIVERY");
    const rawShippingMode = String((existingShipment?.deliveryAddress as any)?.shippingMode || "").toUpperCase();
    const rawProvider = String(existingShipment?.provider || "").toUpperCase();

    const isSelfPickup =
      rawProvider === "SELF_PICKUP" ||
      rawShippingMode === "SELF_BOOK" ||
      rawShippingMode === "SELF_PICKUP" ||
      (rental.invoice?.shippingFeeCollected === 0 && (rawShippingMode === "SELF_BOOK" || rawShippingMode === "SELF_PICKUP"));

    const isGrab = rawProvider === "GRAB" || rawShippingMode === "GRAB";
    const isGhtk = rawProvider === "GHTK" || rawShippingMode === "GHTK";

    // ==========================================
    // NHÁNH 1: ĐƠN TỰ ĐẾN LẤY TẠI TRẠM CHỦ TỦ / TEST NỘI BỘ (0Đ)
    // ==========================================
    if (isSelfPickup) {
      await prisma.$transaction(async (tx) => {
        await tx.rentalHistory.update({
          where: { id: rental.id },
          data: {
            status: "OWNER_PACKED",
          },
        });

        await tx.shipment.upsert({
          where: {
            rentalId_direction: {
              rentalId: rental.id,
              direction: "DELIVERY",
            },
          },
          update: {
            provider: "SELF_PICKUP",
            status: "BOOKED",
            bookedByUserId: user.id,
            providerRawPayload: packagingProofUrls.length > 0 ? { packagingProofUrls, type: "SELF_PICKUP" } : { type: "SELF_PICKUP" },
          },
          create: {
            rentalId: rental.id,
            direction: "DELIVERY",
            provider: "SELF_PICKUP",
            status: "BOOKED",
            clientOrderCode: `${rental.id.slice(0, 8).toUpperCase()}-SELF`,
            shippingFeeCollected: 0,
            bookedByUserId: user.id,
            providerRawPayload: packagingProofUrls.length > 0 ? { packagingProofUrls, type: "SELF_PICKUP" } : { type: "SELF_PICKUP" },
          },
        });

        await tx.auditLog.create({
          data: {
            adminId: user.id,
            action: "OWNER_PREPARED_STATION_PICKUP",
            targetType: "SHIPMENT",
            targetId: rental.id,
            beforeStatus: rental.status,
            afterStatus: "OWNER_PACKED",
            metadata: JSON.stringify({
              rentalId: rental.id,
              packagingProofUrls,
              mode: "SELF_PICKUP",
            }),
          },
        });
      });

      revalidateShipmentViews(rental.id);
      return {
        success: true,
        isSelfPickup: true,
        status: "OWNER_PACKED",
        message: "👗 Trang phục đã sẵn sàng tại trạm chủ tủ! Vui lòng chờ khách đến nhận đồ.",
      };
    }

    // ==========================================
    // NHÁNH 2: ĐƠN GIAO HỎA TỐC GRABEXPRESS (1H)
    // ==========================================
    if (isGrab) {
      const grabTrackingCode = existingShipment?.trackingCode || `GRAB-${rental.id.slice(0, 8).toUpperCase()}`;

      await prisma.$transaction(async (tx) => {
        await tx.rentalHistory.update({
          where: { id: rental.id },
          data: {
            status: "OWNER_PACKED",
            shippingCode: grabTrackingCode,
          },
        });

        await tx.shipment.upsert({
          where: {
            rentalId_direction: {
              rentalId: rental.id,
              direction: "DELIVERY",
            },
          },
          update: {
            provider: "GRAB",
            status: "BOOKED",
            trackingCode: grabTrackingCode,
            bookedByUserId: user.id,
            providerRawPayload: {
              ...((existingShipment?.providerRawPayload as any) || {}),
              packagingProofUrls,
              type: "GRABEXPRESS",
              expressMode: "INSTANT_1H",
            },
          },
          create: {
            rentalId: rental.id,
            direction: "DELIVERY",
            provider: "GRAB",
            status: "BOOKED",
            trackingCode: grabTrackingCode,
            clientOrderCode: `${rental.id.slice(0, 8).toUpperCase()}-GRAB`,
            shippingFeeCollected: rental.invoice?.shippingFeeCollected || 0,
            bookedByUserId: user.id,
            providerRawPayload: {
              packagingProofUrls,
              type: "GRABEXPRESS",
              expressMode: "INSTANT_1H",
            },
          },
        });

        await tx.auditLog.create({
          data: {
            adminId: user.id,
            action: "OWNER_PACKED_GRABEXPRESS",
            targetType: "SHIPMENT",
            targetId: rental.id,
            beforeStatus: rental.status,
            afterStatus: "OWNER_PACKED",
            metadata: JSON.stringify({
              rentalId: rental.id,
              trackingCode: grabTrackingCode,
              packagingProofUrls,
            }),
          },
        });
      });

      revalidateShipmentViews(rental.id);
      return {
        success: true,
        isGrab: true,
        status: "OWNER_PACKED",
        trackingCode: grabTrackingCode,
        message: `⚡ Đơn GrabExpress Hỏa tốc đã sẵn sàng! Mã chuyến: ${grabTrackingCode}. Vui lòng bàn giao kiện hàng cho tài xế Grab trong 15-30 phút.`,
      };
    }

    // ==========================================
    // NHÁNH 3: ĐƠN GIAO TIẾT KIỆM GHTK (TEXT-BASED API)
    // ==========================================
    if (isGhtk) {
      if (existingShipment?.trackingCode && existingShipment.status === "BOOKED") {
        await prisma.rentalHistory.updateMany({
          where: { id: rental.id, status: { in: ["PENDING_APPROVAL", "OWNER_PACKED"] } },
          data: { status: "OWNER_PACKED", shippingCode: existingShipment.trackingCode },
        });
        revalidateShipmentViews(rental.id);
        return {
          success: true,
          provider: "GHTK",
          trackingCode: existingShipment.trackingCode,
          actualShippingFee: existingShipment.actualShippingFee,
          message: `✅ Đơn hàng đã có mã vận đơn GHTK: ${existingShipment.trackingCode}. Bưu tá GHTK sẽ sớm liên hệ lấy hàng.`,
        };
      }

      await prisma.rentalHistory.update({
        where: { id: rental.id },
        data: { status: "OWNER_PACKED" },
      });

      const clientOrderCode = existingShipment?.clientOrderCode || `${rental.id.slice(0, 8).toUpperCase()}-DELIVERY`;
      const pickupAddress = {
        name: rental.owner_name || (existingShipment?.pickupAddress as any)?.name || "Chủ tủ CLOOP",
        phone: rental.owner_phone || (existingShipment?.pickupAddress as any)?.phone || "",
        province: rental.product?.province || (existingShipment?.pickupAddress as any)?.province || "Hà Nội",
        specificAddress: rental.product?.specificAddress || (existingShipment?.pickupAddress as any)?.specificAddress || (existingShipment?.pickupAddress as any)?.address || "",
      };

      const deliveryAddress = {
        name: rental.renter_name || (existingShipment?.deliveryAddress as any)?.recipientName || (existingShipment?.deliveryAddress as any)?.name || "Khách thuê CLOOP",
        phone: rental.renter_phone || (existingShipment?.deliveryAddress as any)?.phone || "",
        province: (existingShipment?.deliveryAddress as any)?.province || (existingShipment?.deliveryAddress as any)?.provinceName || "Hà Nội",
        district: (existingShipment?.deliveryAddress as any)?.district || (existingShipment?.deliveryAddress as any)?.districtName || "",
        ward: (existingShipment?.deliveryAddress as any)?.ward || (existingShipment?.deliveryAddress as any)?.wardName || "",
        specificAddress: (existingShipment?.deliveryAddress as any)?.fullAddress || (existingShipment?.deliveryAddress as any)?.specificAddress || (existingShipment?.deliveryAddress as any)?.address || "",
      };

      const savedGhtkShipment = await prisma.shipment.upsert({
        where: {
          rentalId_direction: {
            rentalId: rental.id,
            direction: "DELIVERY",
          },
        },
        update: {
          provider: "GHTK",
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
          provider: "GHTK",
          status: "PENDING_BOOKING",
          clientOrderCode,
          shippingFeeCollected: rental.invoice?.shippingFeeCollected || 0,
          pickupAddress,
          deliveryAddress,
          bookedByUserId: user.id,
          providerRawPayload: packagingProofUrls.length > 0 ? { packagingProofUrls } : undefined,
        },
      });

      const ghtkResult = await createGhtkShippingOrder({
        clientOrderCode,
        sender: pickupAddress,
        receiver: deliveryAddress,
        product: {
          title: rental.product?.title || "Sản phẩm thời trang CLOOP",
          declaredValue: rental.invoice?.depositAmount || 0,
          weightGram: 500,
        },
        note: `CLOOP #${rental.id.slice(0, 8).toUpperCase()} - Giao GHTK`,
      });

      if (ghtkResult.success) {
        await prisma.$transaction(async (tx) => {
          await tx.shipment.update({
            where: { id: savedGhtkShipment.id },
            data: {
              provider: "GHTK",
              status: "BOOKED",
              trackingCode: ghtkResult.trackingCode,
              providerOrderCode: ghtkResult.orderCode,
              actualShippingFee: ghtkResult.actualShippingFee,
              providerRawPayload: {
                ...((savedGhtkShipment.providerRawPayload as any) || {}),
                packagingProofUrls,
                ghtkRaw: ghtkResult.raw,
              },
            },
          });

          await tx.rentalHistory.update({
            where: { id: rental.id },
            data: { shippingCode: ghtkResult.trackingCode },
          });

          await tx.auditLog.create({
            data: {
              adminId: user.id,
              action: "AUTO_CREATED_GHTK_SHIPMENT",
              targetType: "SHIPMENT",
              targetId: savedGhtkShipment.id,
              beforeStatus: "PENDING_BOOKING",
              afterStatus: "BOOKED",
              metadata: JSON.stringify({
                rentalId: rental.id,
                trackingCode: ghtkResult.trackingCode,
              }),
            },
          });
        });

        revalidateShipmentViews(rental.id);
        return {
          success: true,
          provider: "GHTK",
          trackingCode: ghtkResult.trackingCode,
          actualShippingFee: ghtkResult.actualShippingFee,
          message: `✅ Đã đóng gói & lên đơn GHTK thành công! Mã vận đơn: ${ghtkResult.trackingCode}. Bưu tá GHTK sẽ sớm liên hệ lấy hàng.`,
        };
      }

      await prisma.shipment.update({
        where: { id: savedGhtkShipment.id },
        data: {
          status: "PENDING_BOOKING",
          providerRawPayload: {
            ...((savedGhtkShipment.providerRawPayload as any) || {}),
            packagingProofUrls,
            lastGhtkError: ghtkResult.error,
            failedAt: new Date().toISOString(),
          },
        },
      });

      revalidateShipmentViews(rental.id);
      return {
        success: true,
        fallback: true,
        errorDetail: ghtkResult.error,
        message: "📦 Đã lưu bằng chứng đóng gói! Hệ thống đang điều phối bưu tá GHTK cho đơn hàng của bạn.",
      };
    }

    // ==========================================
    // NHÁNH 2: ĐƠN GIAO QUA SHIPPER GHN (Auto-First + Graceful Fallback)
    // ==========================================

    // 🛡️ CHỐT CHẶN CHỐNG TRÙNG VẬN ĐƠN (Idempotency Guard)
    if (existingShipment?.trackingCode && existingShipment.status === "BOOKED") {
      await prisma.rentalHistory.updateMany({
        where: { id: rental.id, status: { in: ["PENDING_APPROVAL", "OWNER_PACKED"] } },
        data: { status: "OWNER_PACKED", shippingCode: existingShipment.trackingCode },
      });
      revalidateShipmentViews(rental.id);
      return {
        success: true,
        trackingCode: existingShipment.trackingCode,
        actualShippingFee: existingShipment.actualShippingFee,
        message: `✅ Đơn hàng đã có mã vận đơn GHN: ${existingShipment.trackingCode}. Bưu tá GHN sẽ sớm liên hệ lấy hàng.`,
      };
    }

    // LỚP 1: Lưu an toàn nội bộ trước (Cập nhật OWNER_PACKED, KHÔNG nhảy cóc sang LENDER_SHIPPED)
    await prisma.rentalHistory.update({
      where: { id: rental.id },
      data: {
        status: "OWNER_PACKED",
      },
    });

    const clientOrderCode = existingShipment?.clientOrderCode || `${rental.id.slice(0, 8).toUpperCase()}-DELIVERY`;
    const pickupAddress = {
      name: rental.owner_name || (existingShipment?.pickupAddress as any)?.name || "Chủ tủ CLOOP",
      phone: rental.owner_phone || (existingShipment?.pickupAddress as any)?.phone || "",
      province: rental.product?.province || (existingShipment?.pickupAddress as any)?.province || "Hà Nội",
      districtId: rental.product?.districtId || (existingShipment?.pickupAddress as any)?.districtId,
      wardCode: rental.product?.wardCode || (existingShipment?.pickupAddress as any)?.wardCode,
      specificAddress: rental.product?.specificAddress || (existingShipment?.pickupAddress as any)?.specificAddress || (existingShipment?.pickupAddress as any)?.address || "",
    };

    const deliveryAddress = {
      name: rental.renter_name || (existingShipment?.deliveryAddress as any)?.recipientName || (existingShipment?.deliveryAddress as any)?.name || "Khách thuê CLOOP",
      phone: rental.renter_phone || (existingShipment?.deliveryAddress as any)?.phone || "",
      province: (existingShipment?.deliveryAddress as any)?.province || (existingShipment?.deliveryAddress as any)?.provinceName || "Hà Nội",
      districtId: (existingShipment?.deliveryAddress as any)?.districtId ? Number((existingShipment?.deliveryAddress as any)?.districtId) : undefined,
      wardCode: (existingShipment?.deliveryAddress as any)?.wardCode ? String((existingShipment?.deliveryAddress as any)?.wardCode) : undefined,
      specificAddress: (existingShipment?.deliveryAddress as any)?.fullAddress || (existingShipment?.deliveryAddress as any)?.specificAddress || (existingShipment?.deliveryAddress as any)?.address || "",
      shippingMode: (existingShipment?.deliveryAddress as any)?.shippingMode || "CLOOP_BOOK",
    };

    const savedShipment = await prisma.shipment.upsert({
      where: {
        rentalId_direction: {
          rentalId: rental.id,
          direction: "DELIVERY",
        },
      },
      update: {
        provider: "GHN",
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
        provider: "GHN",
        status: "PENDING_BOOKING",
        clientOrderCode,
        shippingFeeCollected: rental.invoice?.shippingFeeCollected || 0,
        pickupAddress,
        deliveryAddress,
        bookedByUserId: user.id,
        providerRawPayload: packagingProofUrls.length > 0 ? { packagingProofUrls } : undefined,
      },
    });

    // LỚP 2: Tự động gọi API GHN Gateway ngay lập tức kèm Timeout Guard 6s
    let ghnResult: any = null;
    try {
      const ghnPromise = createGhnShippingOrder({
        clientOrderCode,
        sender: {
          name: pickupAddress.name,
          phone: pickupAddress.phone,
          province: pickupAddress.province,
          districtId: pickupAddress.districtId,
          wardCode: pickupAddress.wardCode,
          specificAddress: pickupAddress.specificAddress,
        },
        receiver: {
          name: deliveryAddress.name,
          phone: deliveryAddress.phone,
          province: deliveryAddress.province,
          districtId: deliveryAddress.districtId,
          wardCode: deliveryAddress.wardCode,
          specificAddress: deliveryAddress.specificAddress,
        },
        product: {
          title: rental.product?.title || "Sản phẩm thời trang CLOOP",
          declaredValue: rental.invoice?.depositAmount || 0,
          weightGram: 500,
        },
        note: `CLOOP #${rental.id.slice(0, 8).toUpperCase()} - Chiều giao đồ`,
      });

      const timeoutPromise = new Promise<{ success: false; error: string }>((_, reject) =>
        setTimeout(() => reject(new Error("GHN Gateway timeout sau 6 giây")), 6000)
      );

      ghnResult = await Promise.race([ghnPromise, timeoutPromise]);
    } catch (err: any) {
      ghnResult = {
        success: false,
        error: err?.message || "Lỗi kết nối cổng GHN",
      };
    }

    // TRƯỜNG HỢP A: GHN TẠO THÀNH CÔNG (Có mã vận đơn thật)
    if (ghnResult?.success && ghnResult.trackingCode) {
      await prisma.$transaction(async (tx) => {
        await tx.shipment.update({
          where: { id: savedShipment.id },
          data: {
            provider: "GHN",
            status: "BOOKED",
            trackingCode: ghnResult.trackingCode,
            providerOrderCode: ghnResult.orderCode,
            actualShippingFee: ghnResult.actualShippingFee,
            providerRawPayload: {
              ...((savedShipment.providerRawPayload as any) || {}),
              packagingProofUrls,
              ghnRaw: ghnResult.raw,
            },
          },
        });

        await tx.rentalHistory.update({
          where: { id: rental.id },
          data: {
            status: "OWNER_PACKED",
            shippingCode: ghnResult.trackingCode,
          },
        });

        await tx.auditLog.create({
          data: {
            adminId: user.id,
            action: "AUTO_CREATED_GHN_SHIPMENT",
            targetType: "SHIPMENT",
            targetId: savedShipment.id,
            beforeStatus: "PENDING_BOOKING",
            afterStatus: "BOOKED",
            metadata: JSON.stringify({
              rentalId: rental.id,
              trackingCode: ghnResult.trackingCode,
              orderCode: ghnResult.orderCode,
              actualShippingFee: ghnResult.actualShippingFee,
              packagingProofUrls,
            }),
          },
        });
      });

      revalidateShipmentViews(rental.id);

      return {
        success: true,
        trackingCode: ghnResult.trackingCode,
        actualShippingFee: ghnResult.actualShippingFee,
        message: `✅ Đã đóng gói & lên đơn GHN thành công! Mã vận đơn: ${ghnResult.trackingCode}. Bưu tá GHN sẽ sớm liên hệ lấy hàng.`,
      };
    }

    // TRƯỜNG HỢP B: NGOẠI LỆ / THIẾU MÃ QUẬN PHƯỜNG / GHN QUÁ TẢI (Graceful Fallback)
    // Tuyệt đối không làm sập request! Giữ PENDING_BOOKING để Admin can thiệp ở /admin/shipments
    console.warn("GHN Auto-Dispatch Fallback Notice:", ghnResult?.error);

    await prisma.shipment.update({
      where: { id: savedShipment.id },
      data: {
        status: "PENDING_BOOKING",
        providerRawPayload: {
          ...((savedShipment.providerRawPayload as any) || {}),
          packagingProofUrls,
          lastGhnError: ghnResult?.error || "Không thể kết nối cổng GHN",
          failedAt: new Date().toISOString(),
        },
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          adminId: user.id,
          action: "GHN_AUTO_DISPATCH_FALLBACK",
          targetType: "SHIPMENT",
          targetId: savedShipment.id,
          beforeStatus: rental.status,
          afterStatus: "OWNER_PACKED",
          metadata: JSON.stringify({
            rentalId: rental.id,
            packagingProofUrls,
            ghnError: ghnResult?.error,
          }),
        },
      });
    } catch (logErr) {
      console.warn("Audit non-blocking log error:", logErr);
    }

    revalidateShipmentViews(rental.id);

    return {
      success: true,
      fallback: true,
      errorDetail: ghnResult?.error,
      message: "📦 Đã lưu bằng chứng đóng gói! Hệ thống đang điều phối bưu tá cho địa chỉ của bạn, mã vận đơn sẽ cập nhật sau ít phút.",
    };
  } catch (error: any) {
    console.error("Lỗi xác nhận đóng gói:", error);
    const message = error instanceof Error ? error.message : "Không thể hoàn tất đóng gói.";
    return { success: false, error: message };
  }
}

/**
 * 🚚 XÁC NHẬN BÀN GIAO BƯU TÁ
 * Chủ tủ bấm nút này khi bưu tá GHN đã đến nhà nhận kiện hàng
 */
export async function confirmHandoverAction(rentalId: string) {
  try {
    const user = await requireUser();
    if (!user) {
      return { success: false, error: "Chưa đăng nhập." };
    }

    const rental = await prisma.rentalHistory.findUnique({
      where: { id: rentalId },
      include: { product: true },
    });

    if (!rental) {
      return { success: false, error: "Không tìm thấy đơn hàng." };
    }

    if (rental.ownerId !== user.id && rental.product?.userId !== user.id) {
      return { success: false, error: "Bạn không có quyền thao tác trên đơn hàng này." };
    }

    await prisma.rentalHistory.update({
      where: { id: rental.id },
      data: { status: "LENDER_SHIPPED" },
    });

    await prisma.shipment.updateMany({
      where: { rentalId: rental.id, direction: "DELIVERY" },
      data: { status: "IN_TRANSIT" },
    });

    try {
      await prisma.auditLog.create({
        data: {
          adminId: user.id,
          action: "OWNER_CONFIRMED_HANDOVER",
          targetType: "RENTAL",
          targetId: rental.id,
          beforeStatus: rental.status,
          afterStatus: "LENDER_SHIPPED",
        },
      });
    } catch (e) {
      console.warn("Audit non-blocking log:", e);
    }

    revalidateShipmentViews(rental.id);
    return {
      success: true,
      message: "🚚 Đã xác nhận bàn giao cho Shipper! Đơn hàng đã chuyển sang trạng thái Đang Vận Chuyển.",
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Lỗi xác nhận bàn giao." };
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

    // 🛡️ CHỐT CHẶN CHỐNG GỌI TRÙNG GHN (Idempotency Guard)
    if (shipment.status === "BOOKED" && shipment.trackingCode) {
      return {
        success: true,
        trackingCode: shipment.trackingCode,
        actualShippingFee: shipment.actualShippingFee || 0,
        message: `Đơn giao vận đã có sẵn mã GHN: ${shipment.trackingCode}. Không gọi lại API.`,
      };
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
            status: "OWNER_PACKED",
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
