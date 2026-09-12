"use server";

import { DamageSeverity } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { requireUser, requireAdmin } from "@/src/lib/auth";
import { generateDisputeVideoReadUrl } from "@/src/services/gcsStorage";

export type DamageCategory = "WEAR_AND_TEAR" | "REPAIRABLE_DAMAGE" | "TOTAL_LOSS";

export async function createDispute(data: {
  rentalId: string;
  invoiceId?: string;
  description: string;
  severity: DamageSeverity;
  damageCategory?: DamageCategory;
  suggestedDeduction: number;
  evidenceUrls?: string[];
  idempotencyKey?: string;
}) {
  try {
    const user = await requireUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Kiểm tra đơn thuê và quyền hạn (Authorization)
    const rental = await prisma.rentalHistory.findUnique({
      where: { id: data.rentalId },
      include: {
        product: true,
        invoice: true,
      },
    });

    if (!rental) {
      return { success: false, error: "Không tìm thấy đơn thuê" };
    }

    const isRenter = rental.renterId === user.id;
    const isOwner = rental.ownerId === user.id || rental.product?.userId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isRenter && !isOwner && !isAdmin) {
      return { success: false, error: "Bạn không có quyền khiếu nại cho đơn thuê này" };
    }

    // 1b. DIGITAL DAMAGE PROTOCOL: Chặn đứng hành vi đòi cọc với Hao mòn thông thường (Wear & Tear)
    const category: DamageCategory = data.damageCategory || 
      (data.severity === "LOW" ? "WEAR_AND_TEAR" : data.severity === "MEDIUM" ? "REPAIRABLE_DAMAGE" : "TOTAL_LOSS");

    if (category === "WEAR_AND_TEAR" && data.suggestedDeduction > 0) {
      return {
        success: false,
        error: "Theo Chính Sách Vận Hành CLOOP: Vết bẩn bề mặt (son môi, phấn trang điểm nhẹ, mồ hôi, nếp nhăn) thuộc phạm vi Hao Mòn Thông Thường (Wear & Tear) đã được tính trong giá thuê. Chủ tủ tự xử lý giặt ủi, không được khấu trừ tiền cọc của khách!",
      };
    }

    if (category === "REPAIRABLE_DAMAGE" && data.suggestedDeduction > 500000) {
      return {
        success: false,
        error: "Đối với Hư hỏng có thể khắc phục (Repairable Damage), mức khấu trừ tối đa là 500.000đ theo chi phí giặt hấp/khâu vá thực tế, không được yêu cầu tịch thu toàn bộ tiền cọc!",
      };
    }

    // 1c. OWNER RISK ENGINE: Soi xét tần suất khiếu nại của Chủ tủ (Phát hiện Moral Hazard)
    let isHighDisputeOwner = false;
    let ownerDisputeRate = 0;
    if (isOwner) {
      const ownerId = rental.ownerId || rental.product?.userId;
      if (ownerId) {
        const pastRentals = await prisma.rentalHistory.findMany({
          where: { ownerId },
          take: 10,
          select: { id: true },
        });
        if (pastRentals.length >= 3) {
          const pastRentalIds = pastRentals.map((r) => r.id);
          const pastDisputes = await prisma.dispute.count({
            where: { rentalId: { in: pastRentalIds } },
          });
          ownerDisputeRate = Math.round((pastDisputes / pastRentals.length) * 100);
          if (ownerDisputeRate >= 25) {
            isHighDisputeOwner = true;
          }
        }
      }
    }

    // 2. IDEMPOTENCY CHECK: Chặn tạo khiếu nại trùng lặp khi đang có khiếu nại chưa xử lý
    const existingDispute = await prisma.dispute.findFirst({
      where: {
        rentalId: data.rentalId,
        status: { in: ["PENDING_REVIEW", "DISPUTED"] },
      },
    });

    if (existingDispute) {
      return {
        success: false,
        error: "Đơn thuê này hiện đã có khiếu nại đang chờ Admin giải quyết. Vui lòng không gửi trùng lặp!",
      };
    }

    const targetInvoiceId = data.invoiceId || rental.invoice?.id;

    // 3. Dùng Transaction để đảm bảo tạo Dispute và Audit Log cùng lúc (Atomic)
    const result = await prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.create({
        data: {
          rentalId: data.rentalId,
          invoiceId: targetInvoiceId || null,
          description: data.description,
          severity: data.severity,
          suggestedDeduction: data.suggestedDeduction,
          images: data.evidenceUrls || [],
          status: "PENDING_REVIEW",
        },
      });

      // LƯU VẾT KIỂM TOÁN (AUDIT LOG)
      await tx.auditLog.create({
        data: {
          adminId: user.id,
          action: "CREATE_DISPUTE",
          targetType: "DISPUTE",
          targetId: dispute.id,
          afterStatus: "PENDING_REVIEW",
          metadata: JSON.stringify({
            severity: data.severity,
            damageCategory: category,
            deduction: data.suggestedDeduction,
            evidenceCount: (data.evidenceUrls || []).length,
            creatorRole: isAdmin ? "ADMIN" : isOwner ? "OWNER" : "RENTER",
            isHighDisputeOwner,
            ownerDisputeRate: `${ownerDisputeRate}%`,
            idempotencyKey: data.idempotencyKey,
          }),
        },
      });

      // Cập nhật trạng thái Invoice nếu có
      if (targetInvoiceId) {
        await tx.invoice.update({
          where: { id: targetInvoiceId },
          data: { payosStatus: "DISPUTED" },
        });
      }

      // Cập nhật trạng thái Đơn thuê sang DISPUTE
      await tx.rentalHistory.update({
        where: { id: data.rentalId },
        data: { status: "DISPUTE" },
      });

      return dispute;
    });

    return { success: true, dispute: result };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi xử lý khiếu nại";
    console.error("Lỗi tạo Dispute:", message);
    return { success: false, error: message };
  }
}

/**
 * ⚖️ RESOLVE DISPUTE WITH FULL DOUBLE-ENTRY FINANCIAL SETTLEMENT
 * Kiểm tra chặt chẽ tiền cọc, ghi sổ cái LedgerTransaction, cập nhật ví chủ đồ và hoàn cọc cho khách.
 */
export async function resolveDispute(data: {
  disputeId: string;
  finalDeduction: number;
  adminNotes: string;
}) {
  try {
    const { profile: admin } = await requireAdmin();
    if (!admin) throw new Error("Unauthorized Admin");

    // 1. Kiểm tra tranh chấp và giá trị cọc hợp lệ
    const targetDispute = await prisma.dispute.findUnique({
      where: { id: data.disputeId },
      include: {
        rental: {
          include: {
            invoice: true,
            product: true,
          },
        },
      },
    });

    if (!targetDispute) {
      return { success: false, error: "Không tìm thấy hồ sơ khiếu nại." };
    }

    if (targetDispute.status !== "PENDING_REVIEW" && targetDispute.status !== "DISPUTED") {
      return { success: false, error: "Khiếu nại này đã được xử lý trước đó (Idempotent lock)." };
    }

    const depositAmount = targetDispute.rental?.invoice?.depositAmount || 0;
    if (data.finalDeduction < 0) {
      return { success: false, error: "Số tiền khấu trừ không thể âm." };
    }
    if (data.finalDeduction > depositAmount) {
      return {
        success: false,
        error: `Số tiền khấu trừ (${data.finalDeduction.toLocaleString("vi-VN")}đ) không được vượt quá số tiền cọc (${depositAmount.toLocaleString("vi-VN")}đ).`,
      };
    }

    const refundAmount = depositAmount - data.finalDeduction;
    const rental = targetDispute.rental;
    const invoice = rental.invoice;
    const ownerId = rental.ownerId || rental.product?.userId;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Cập nhật trạng thái Dispute
      const updatedDispute = await tx.dispute.update({
        where: { id: data.disputeId },
        data: {
          finalDeduction: data.finalDeduction,
          adminNotes: data.adminNotes,
          status: "APPROVED_DEDUCTION",
        },
      });

      // 2. GHI SỔ CÁI KẾ TOÁN (LEDGER TRANSACTIONS)
      // 2a. Nếu có bồi thường hư hại cho chủ tủ
      if (data.finalDeduction > 0) {
        await tx.ledgerTransaction.create({
          data: {
            invoiceId: invoice?.id,
            type: "COMPENSATION_OUT",
            amount: data.finalDeduction,
            description: `Bồi thường thiệt hại cho chủ tủ từ tiền cọc đơn ${rental.id}`,
            adminId: admin.id,
            status: "COMPLETED",
          },
        });

        // Cộng tiền bồi thường vào số dư ví của Chủ đồ
        if (ownerId) {
          await tx.user.update({
            where: { id: ownerId },
            data: {
              walletBalance: { increment: data.finalDeduction },
            },
          });
        }
      }

      // 2b. Nếu có hoàn cọc phần còn lại cho khách thuê
      if (refundAmount > 0) {
        await tx.ledgerTransaction.create({
          data: {
            invoiceId: invoice?.id,
            type: "REFUND_OUT",
            amount: refundAmount,
            description: `Hoàn trả cọc còn lại cho khách thuê đơn ${rental.id}`,
            adminId: admin.id,
            status: "COMPLETED",
          },
        });
      }

      // 3. Cập nhật trạng thái Hóa đơn
      if (invoice?.id) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: "PAID",
            payosStatus: "RESOLVED",
          },
        });
      }

      // 4. Cập nhật trạng thái Đơn thuê hoàn tất
      await tx.rentalHistory.update({
        where: { id: rental.id },
        data: {
          status: "LENDER_COMPLETED",
          completedAt: new Date(),
          actual_return_date: rental.actual_return_date || new Date(),
        },
      });

      // 5. GHI AUDIT LOG ĐẦY ĐỦ METADATA TÀI CHÍNH
      await tx.auditLog.create({
        data: {
          adminId: admin.id,
          action: "RESOLVE_DISPUTE_SETTLEMENT",
          targetType: "DISPUTE",
          targetId: data.disputeId,
          beforeStatus: "PENDING_REVIEW",
          afterStatus: "APPROVED_DEDUCTION",
          metadata: JSON.stringify({
            finalDeduction: data.finalDeduction,
            refundAmount,
            depositAmount,
            ownerId,
            renterId: rental.renterId,
            adminNotes: data.adminNotes,
          }),
        },
      });

      return updatedDispute;
    });

    return { success: true, dispute: result };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi giải quyết khiếu nại";
    console.error("Lỗi giải quyết Dispute:", message);
    return { success: false, error: message };
  }
}

/**
 * 🔒 LẤY LINK BẰNG CHỨNG TRANH CHẤP CÓ PHÂN QUYỀN CHẶT CHẼ
 * Chỉ cho phép Renter, Owner hoặc Admin của đúng hồ sơ đó xem video/ảnh.
 */
export async function getDisputeEvidenceUrls(params: {
  disputeId: string;
  evidenceKeys?: string[];
} | string[]): Promise<string[]> {
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");

  let disputeId: string | undefined;
  let requestedKeys: string[] = [];

  if (Array.isArray(params)) {
    requestedKeys = params;
  } else {
    disputeId = params.disputeId;
    requestedKeys = params.evidenceKeys || [];
  }

  if (disputeId) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        rental: {
          include: { product: true },
        },
      },
    });

    if (!dispute) {
      throw new Error("Không tìm thấy hồ sơ khiếu nại.");
    }

    const isRenter = dispute.rental.renterId === user.id;
    const isOwner = dispute.rental.ownerId === user.id || dispute.rental.product?.userId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isRenter && !isOwner && !isAdmin) {
      throw new Error("Forbidden: Bạn không có quyền truy cập bằng chứng của hồ sơ tranh chấp này.");
    }

    // Nếu không truyền requestedKeys thì lấy toàn bộ ảnh/video của dispute
    if (requestedKeys.length === 0) {
      requestedKeys = dispute.images;
    } else {
      // Chỉ cho phép lấy các key nằm trong dispute.images
      requestedKeys = requestedKeys.filter((k) => dispute.images.includes(k));
    }
  }

  const urls = await Promise.all(
    requestedKeys.map(async (key) => {
      // Nếu là URL trực tiếp, chỉ cho phép các domain tin cậy đã được cấu hình
      if (key.startsWith("http://") || key.startsWith("https://")) {
        const parsed = new URL(key);
        const trustedDomains = ["storage.googleapis.com", "res.cloudinary.com", "supabase.co"];
        const isTrusted = trustedDomains.some((d) => parsed.hostname.endsWith(d));
        if (!isTrusted) {
          throw new Error("Bằng chứng chứa liên kết từ nguồn không tin cậy.");
        }
        return key;
      }
      return generateDisputeVideoReadUrl(key);
    })
  );

  return urls;
}
