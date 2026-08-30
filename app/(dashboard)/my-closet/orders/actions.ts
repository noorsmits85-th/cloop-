"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/auth";
import { revalidatePath } from "next/cache";


export async function renterReceivedAction(orderId: string) {
  try {
    const userAuth = await requireUser();

    await prisma.$transaction(async (tx) => {
      const updateResult = await tx.rentalHistory.updateMany({
        where: { 
          id: orderId,
          status: "LENDER_SHIPPED",
          renterId: userAuth.id 
        },
        data: { status: "BORROWER_RECEIVED" }
      });

      if (updateResult.count === 0) {
        throw new Error("Không thể cập nhật. Đơn hàng không ở trạng thái đang giao hoặc bạn không phải người thuê.");
      }

      await tx.auditLog.create({
        data: {
          adminId: userAuth.id,
          action: "RENTER_RECEIVED_ITEM",
          targetType: "RENTAL",
          targetId: orderId,
          beforeStatus: "LENDER_SHIPPED",
          afterStatus: "BORROWER_RECEIVED"
        }
      });
    });

    revalidatePath("/my-closet/orders");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Lỗi khi xác nhận nhận hàng." };
  }
}

export async function renterReturnAction(orderId: string) {
  try {
    const userAuth = await requireUser();

    await prisma.$transaction(async (tx) => {
      const rental = await tx.rentalHistory.findUnique({
        where: { id: orderId },
        include: { invoice: true, product: true }
      });

      if (!rental || rental.renterId !== userAuth.id) {
        throw new Error("Không tìm thấy đơn hàng hoặc bạn không phải người thuê.");
      }

      const updateResult = await tx.rentalHistory.updateMany({
        where: { 
          id: orderId,
          status: "BORROWER_RECEIVED"
        },
        data: { status: "BORROWER_RETURNED" }
      });

      if (updateResult.count === 0) {
        throw new Error("Không thể cập nhật. Đơn hàng chưa được nhận.");
      }

      // Tạo Shipment chiều về
      const pickupAddress = {
        name: rental.renter_name,
        phone: rental.renter_phone,
      };
      
      const deliveryAddress = {
        name: rental.owner_name,
        phone: rental.owner_phone,
        province: rental.product.province,
        districtId: rental.product.districtId,
        wardCode: rental.product.wardCode,
        specificAddress: rental.product.specificAddress,
      };

      await tx.shipment.create({
        data: {
          rentalId: rental.id,
          direction: "RETURN",
          status: "PENDING_BOOKING",
          clientOrderCode: `${rental.id}-RETURN`,
          shippingFeeCollected: 0, // Phí ship chiều về do các bên tự thỏa thuận hoặc Renter trả
          pickupAddress,
          deliveryAddress,
          bookedByUserId: userAuth.id,
        }
      });

      await tx.auditLog.create({
        data: {
          adminId: userAuth.id,
          action: "RENTER_RETURNED_ITEM",
          targetType: "RENTAL",
          targetId: orderId,
          beforeStatus: "BORROWER_RECEIVED",
          afterStatus: "BORROWER_RETURNED"
        }
      });
    });

    revalidatePath("/my-closet/orders");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Lỗi khi báo trả hàng." };
  }
}

export async function completeOrderAction(orderId: string) {
  try {
    // 🛡️ 1. Authentication Check
    const userAuth = await requireUser();

    // 🛡️ 2. IDOR, Optimistic Locking & Partial Failure Prevention (ACID Transaction)
    // Sống cùng sống, chết cùng chết!
    let productIdToRevalidate: string | null = null;
    await prisma.$transaction(async (tx) => {
      // Fetch renterId and invoice to calculate dynamic refund amount
      const rental = await tx.rentalHistory.findUnique({
        where: { id: orderId },
        include: { invoice: true }
      });

      if (!rental) {
        throw new Error("Không tìm thấy đơn hàng.");
      }
      
      productIdToRevalidate = rental.product_id;

      // Atomic updateMany guarantees EXACTLY-ONCE execution.
      // Dùng cột ownerId đã phi chuẩn hóa, Prisma sẽ không báo lỗi!
      const updateResult = await tx.rentalHistory.updateMany({
        where: { 
          id: orderId,
          status: { in: ["BORROWER_RETURNED", "BORROWER_RECEIVED", "LENDER_SHIPPED"] },
          ownerId: userAuth.id 
        },
        data: { 
          status: "LENDER_COMPLETED",
          completedAt: new Date()
        }
      });

      if (updateResult.count === 0) {
        throw new Error("Giao dịch đã được hoàn tất trước đó, sai trạng thái, hoặc bạn không có quyền.");
      }

      const depositAmount = rental.invoice?.depositAmount || 0;
      const rentalFee = rental.invoice?.rentalFee || 0;
      const platformFee = rental.invoice?.platformFee || Math.floor(rentalFee * 0.1);
      const shippingFee = rental.invoice?.shippingFeeCollected || 0;
      const invoiceId = rental.invoice?.id;

      // 💸 1. Hoàn Tiền Cọc (Refund Escrow) & Tặng 15 Xu Lá (CloopCoins) cho Khách Thuê:
      if (depositAmount > 0) {
        await tx.user.update({
          where: { id: rental.renterId },
          data: { 
            walletBalance: { increment: depositAmount },
            cloopCoins: { increment: 15 } // 🎁 Thưởng 15 Xu Lá tuần hoàn
          }
        });
        if (invoiceId) {
          await tx.ledgerTransaction.create({
            data: { invoiceId, type: 'REFUND_OUT', amount: depositAmount, description: `Hoàn cọc đơn ${orderId} & Thưởng 15 Xu Lá` }
          });
        }
      } else {
        await tx.user.update({
          where: { id: rental.renterId },
          data: { cloopCoins: { increment: 15 } }
        });
      }

      // 💸 2. Thanh Toán Tiền Thuê (Rental Fee) cho Chủ Tủ (trừ 10% phí nền tảng):
      if (rentalFee > 0) {
        const lenderEarnings = rentalFee - platformFee;

        await tx.user.update({
          where: { id: userAuth.id }, // userAuth is the owner according to our IDOR check
          data: { walletBalance: { increment: lenderEarnings } }
        });
        
        if (invoiceId) {
          await tx.ledgerTransaction.create({
            data: { invoiceId, type: 'PAYOUT_OUT', amount: lenderEarnings, description: `Thanh toán tiền thuê đơn ${orderId}` }
          });
          await tx.ledgerTransaction.create({
            data: { invoiceId, type: 'FEE_RETAINED', amount: platformFee, description: `Phí nền tảng đơn ${orderId}` }
          });
        }
      }
      
      // 💸 3. Thu phí Ship cho Platform:
      if (shippingFee > 0 && invoiceId) {
        await tx.ledgerTransaction.create({
          data: { invoiceId, type: 'SHIPPING_RETAINED', amount: shippingFee, description: `Phí vận chuyển giữ lại đơn ${orderId}` }
        });
      }
      
      // 🔄 KHI HOÀN TẤT ĐỒ VỀ TAY CHỦ TỦ: Tự động kích hoạt lại trạng thái Sẵn Sàng Cho Thuê trên Sàn & Tủ đồ
      if (rental.product_id) {
        await tx.listing.updateMany({
          where: { productId: rental.product_id, isDeleted: false },
          data: { status: "AVAILABLE" }
        });
        await tx.product.update({
          where: { id: rental.product_id },
          data: { status: "ON_MARKET" }
        });
      }

      // Ghi Audit
      await tx.auditLog.create({
        data: {
          adminId: userAuth.id,
          action: "SETTLEMENT_COMPLETED",
          targetType: "RENTAL",
          targetId: orderId,
          metadata: JSON.stringify({ depositAmount, rentalFee, platformFee, shippingFee })
        }
      });
    });

    try {
      revalidatePath("/my-closet/orders");
      if (productIdToRevalidate) {
        revalidatePath(`/product/${productIdToRevalidate}`);
      }
    } catch(e) {
      console.error("Cache purge failed:", e);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi khi hoàn tất đơn:", error);
    return { success: false, error: error.message || "Lỗi khi hoàn tất đơn hàng." };
  }
}

export async function raiseDisputeWithProposalAction(
  orderId: string,
  description: string,
  images: string[],
  suggestedDeduction: number = 0
) {
  try {
    const userAuth = await requireUser();

    // 🛡️ 1. Sanitize & Validate Inputs
    if (!description || description.trim().length < 5) {
      return { success: false, error: "Vui lòng nhập mô tả chi tiết sự cố (tối thiểu 5 ký tự)." };
    }

    if (!Array.isArray(images) || images.length === 0) {
      return { success: false, error: "Bắt buộc phải đính kèm ít nhất 1 ảnh bằng chứng." };
    }

    // URL validation: must be secure HTTPS from trusted media hosts
    const isValidImages = images.every(img => 
      typeof img === "string" && 
      (img.startsWith("https://res.cloudinary.com/") || img.startsWith("https://") || img.startsWith("/"))
    );
    if (!isValidImages) {
      return { success: false, error: "Định dạng hình ảnh không hợp lệ hoặc không an toàn." };
    }

    const cleanDeduction = Math.floor(Math.max(0, Number(suggestedDeduction) || 0));

    // 🛡️ 2. Fetch Order and Check Authorization
    const rental = await prisma.rentalHistory.findUnique({
      where: { id: orderId },
      include: { product: true, invoice: true }
    });

    if (!rental) {
      return { success: false, error: "Không tìm thấy đơn hàng." };
    }

    if (rental.status === "LENDER_COMPLETED" || rental.status === "CANCELLED") {
      return { success: false, error: "Đơn hàng đã hoàn tất hoặc đã bị hủy, không thể mở khiếu nại." };
    }

    if (rental.invoice && rental.invoice.status !== "PAID") {
      return { success: false, error: "Đơn hàng chưa được thanh toán thành công, không thể khiếu nại." };
    }

    const isRenter = rental.renterId === userAuth.id;
    const isOwner = rental.product.userId === userAuth.id || rental.ownerId === userAuth.id;

    if (!isRenter && !isOwner) {
      return { success: false, error: "Forbidden: Bạn không có quyền khiếu nại đơn hàng này." };
    }

    const depositAmount = rental.invoice?.depositAmount || 0;
    if (cleanDeduction > depositAmount) {
      return { success: false, error: `Số tiền bồi thường đề xuất (${cleanDeduction.toLocaleString('vi-VN')}đ) không được vượt quá số tiền cọc (${depositAmount.toLocaleString('vi-VN')}đ).` };
    }

    // 🛡️ 3. Atomic State Update & Optimistic Lock
    const result = await prisma.$transaction(async (tx) => {
      const updateCount = await tx.rentalHistory.updateMany({
        where: {
          id: orderId,
          status: { in: ["BORROWER_RECEIVED", "BORROWER_RETURNED", "LENDER_SHIPPED", "OWNER_PACKED", "PENDING_APPROVAL"] }
        },
        data: { status: "DISPUTE" }
      });

      if (updateCount.count === 0) {
        throw new Error("Đơn hàng đã hoàn tất, đã bị hủy hoặc đang có tranh chấp xử lý.");
      }

      const initiatorRole = isOwner ? "OWNER" : "RENTER";

      const dispute = await tx.dispute.create({
        data: {
          rentalId: orderId,
          invoiceId: rental.invoice?.id || null,
          description: description.trim(),
          images: images.slice(0, 5),
          severity: cleanDeduction > 200000 ? "HIGH" : cleanDeduction > 0 ? "MEDIUM" : "LOW",
          suggestedDeduction: cleanDeduction,
          status: "PENDING_REVIEW",
          adminNotes: JSON.stringify({
            initiatorId: userAuth.id,
            initiatorRole: initiatorRole,
            proposedAt: new Date().toISOString(),
          })
        }
      });

      await tx.auditLog.create({
        data: {
          adminId: userAuth.id,
          action: "DISPUTE_RAISED_P2P_PROPOSAL",
          targetType: "DISPUTE",
          targetId: dispute.id,
          beforeStatus: rental.status,
          afterStatus: "DISPUTE",
          metadata: JSON.stringify({
            suggestedDeduction: cleanDeduction,
            initiatorRole,
            depositAmount
          })
        }
      });

      return dispute;
    });

    try {
      revalidatePath("/my-closet/orders");
      if (rental?.product_id) revalidatePath(`/product/${rental.product_id}`);
    } catch (e) {}

    return { success: true, disputeId: result.id };
  } catch (error: any) {
    console.error("Lỗi khi tạo đề xuất khiếu nại:", error);
    return { success: false, error: error.message || "Lỗi xử lý khiếu nại." };
  }
}

export async function acceptDisputeProposalAction(disputeId: string) {
  try {
    const userAuth = await requireUser();

    // 🛡️ 1. Fetch Dispute with full relations
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        rental: {
          include: {
            product: true,
            invoice: true
          }
        }
      }
    });

    if (!dispute || !dispute.rental || !dispute.rental.invoice) {
      return { success: false, error: "Không tìm thấy thông tin khiếu nại hoặc hóa đơn thanh toán." };
    }

    const rental = dispute.rental;
    const invoice = dispute.rental.invoice;
    const isRenter = rental.renterId === userAuth.id;
    const isOwner = rental.product.userId === userAuth.id || rental.ownerId === userAuth.id;

    if (!isRenter && !isOwner) {
      return { success: false, error: "Forbidden: Bạn không thuộc giao dịch này." };
    }

    // 🛡️ 2. Invoice PAID status validation
    if (invoice.status !== "PAID") {
      return { success: false, error: "Hóa đơn chưa ở trạng thái thanh toán thành công (Invoice không ở trạng thái PAID), không thể quyết toán dòng tiền." };
    }

    // 🛡️ 3. Parse initiator to enforce counterparty authorization
    let initiatorId = "";
    try {
      if (dispute.adminNotes) {
        const parsed = JSON.parse(dispute.adminNotes);
        initiatorId = parsed.initiatorId || "";
      }
    } catch (e) {}

    if (initiatorId && initiatorId === userAuth.id) {
      return { success: false, error: "Bạn không thể tự chấp nhận đề xuất do chính mình khởi tạo." };
    }

    // 🛡️ 4. State validations
    if (dispute.status !== "PENDING_REVIEW") {
      return { success: false, error: "Đề xuất này không ở trạng thái chờ phản hồi." };
    }

    if (rental.status !== "DISPUTE") {
      return { success: false, error: "Trạng thái đơn hàng không hợp lệ để hòa giải tranh chấp." };
    }

    // 🛡️ 5. Double-Settlement Guard (Ledger Check)
    const existingPayout = await prisma.ledgerTransaction.findFirst({
      where: {
        invoiceId: invoice.id,
        type: { in: ["PAYOUT_OUT", "REFUND_OUT"] }
      }
    });

    if (existingPayout) {
      return { success: false, error: "Giao dịch này đã được quyết toán trên sổ cái từ trước." };
    }

    // 🛡️ 6. Zero-Sum Balance Mathematical Invariant Verification
    const totalAmount = Number(invoice.amount) || 0;
    const rentalFee = Number(invoice.rentalFee) || 0;
    const depositAmount = Number(invoice.depositAmount) || 0;
    const platformFee = Number(invoice.platformFee) || 0;
    const shippingFee = Number(invoice.shippingFeeCollected) || 0;
    const deduction = Math.floor(Math.max(0, Number(dispute.suggestedDeduction) || 0));

    if (deduction > depositAmount) {
      return { success: false, error: "Lỗi bảo mật: Số tiền khấu trừ vượt quá số tiền cọc." };
    }

    const refundDepositToRenter = depositAmount - deduction;
    const compensationToOwner = deduction;
    const ownerRentalPayout = Math.max(0, rentalFee - platformFee);
    const platformFeeCollected = platformFee;
    const shippingFeeCollected = shippingFee;

    const totalCalculated = refundDepositToRenter + compensationToOwner + ownerRentalPayout + platformFeeCollected + shippingFeeCollected;

    if (totalCalculated !== totalAmount) {
      console.error(`[CRITICAL MONEY INVARIANT ERROR] totalCalculated (${totalCalculated}) !== totalAmount (${totalAmount})`);
      return { success: false, error: "LỖI KẾ TOÁN: Bất biến cân sổ tài chính bị lệch." };
    }

    // 🛡️ 7. Atomic Execution (ACID Transaction with Row-Level Optimistic Locks)
    await prisma.$transaction(async (tx) => {
      // 7a. Atomic Row Lock on Dispute (Double-submit prevention)
      const disputeLock = await tx.dispute.updateMany({
        where: { id: disputeId, status: "PENDING_REVIEW" },
        data: {
          status: "RESOLVED",
          finalDeduction: deduction,
          adminNotes: JSON.stringify({
            resolvedVia: "P2P_SELF_MEDIATION",
            acceptedByUserId: userAuth.id,
            resolvedAt: new Date().toISOString(),
            deduction
          })
        }
      });

      if (disputeLock.count === 0) {
        throw new Error("Xung đột dữ liệu: Đề xuất khiếu nại đã được giải quyết hoặc không còn ở trạng thái chờ phản hồi.");
      }

      // 7b. Atomic Row Lock on Order
      const lockCount = await tx.rentalHistory.updateMany({
        where: { id: rental.id, status: "DISPUTE" },
        data: { status: "LENDER_COMPLETED" }
      });

      if (lockCount.count === 0) {
        throw new Error("Xung đột dữ liệu: Đơn hàng đã được xử lý bởi tiến trình khác.");
      }

      // 7c. Update Invoice
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: "PAID" }
      });

      // 7d. Update User Wallets
      if (refundDepositToRenter > 0) {
        await tx.user.update({
          where: { id: rental.renterId },
          data: { walletBalance: { increment: refundDepositToRenter } }
        });
      }

      const ownerId = rental.ownerId || rental.product?.userId;
      const totalOwnerCredit = ownerRentalPayout + compensationToOwner;
      if (totalOwnerCredit > 0 && ownerId) {
        await tx.user.update({
          where: { id: ownerId },
          data: { walletBalance: { increment: totalOwnerCredit } }
        });
      }

      // 7e. Record Immutable Double-Entry Ledger Transactions
      const ledgerRows: any[] = [];

      if (compensationToOwner > 0) {
        ledgerRows.push({
          invoiceId: invoice.id,
          type: "COMPENSATION_OUT",
          amount: compensationToOwner,
          description: `Bồi thường tổn thất từ cọc khách thuê cho chủ đồ (P2P Thỏa thuận)`,
          adminId: userAuth.id,
          status: "COMPLETED"
        });
      }

      if (refundDepositToRenter > 0) {
        ledgerRows.push({
          invoiceId: invoice.id,
          type: "REFUND_OUT",
          amount: refundDepositToRenter,
          description: `Hoàn phần tiền cọc còn lại về ví khách thuê sau khấu trừ bồi thường`,
          adminId: userAuth.id,
          status: "COMPLETED"
        });
      }

      if (ownerRentalPayout > 0) {
        ledgerRows.push({
          invoiceId: invoice.id,
          type: "PAYOUT_OUT",
          amount: ownerRentalPayout,
          description: `Giải ngân tiền cho thuê trang phục vào ví chủ đồ (sau trừ phí sàn)`,
          adminId: userAuth.id,
          status: "COMPLETED"
        });
      }

      if (platformFeeCollected > 0) {
        ledgerRows.push({
          invoiceId: invoice.id,
          type: "FEE_RETAINED",
          amount: platformFeeCollected,
          description: `Thu phí dịch vụ nền tảng CLOOP`,
          adminId: userAuth.id,
          status: "COMPLETED"
        });
      }

      if (shippingFeeCollected > 0) {
        ledgerRows.push({
          invoiceId: invoice.id,
          type: "SHIPPING_RETAINED",
          amount: shippingFeeCollected,
          description: `Giữ phí vận chuyển để đối soát với nhà vận chuyển`,
          adminId: userAuth.id,
          status: "COMPLETED"
        });
      }

      if (ledgerRows.length > 0) {
        await tx.ledgerTransaction.createMany({ data: ledgerRows });
      }

      // 🔄 KHI GIẢI QUYẾT XONG KHIẾU NẠI & ĐỒ VỀ TAY CHỦ TỦ: Kích hoạt lại trạng thái Sẵn Sàng Cho Thuê
      if (rental.product_id) {
        await tx.listing.updateMany({
          where: { productId: rental.product_id, isDeleted: false },
          data: { status: "AVAILABLE" }
        });
        await tx.product.update({
          where: { id: rental.product_id },
          data: { status: "ON_MARKET" }
        });
      }

      // 7f. Audit Log
      await tx.auditLog.create({
        data: {
          adminId: userAuth.id,
          action: "DISPUTE_P2P_ACCEPTED_AND_SETTLED",
          targetType: "DISPUTE",
          targetId: disputeId,
          beforeStatus: "PENDING_REVIEW",
          afterStatus: "RESOLVED",
          metadata: JSON.stringify({
            compensationToOwner,
            refundDepositToRenter,
            ownerRentalPayout,
            platformFeeCollected,
            shippingFeeCollected
          })
        }
      });
    });

    try {
      revalidatePath("/my-closet/orders");
      if (rental?.product_id) revalidatePath(`/product/${rental.product_id}`);
    } catch (e) {}

    return { success: true };
  } catch (error: any) {
    console.error("Lỗi khi chấp nhận thỏa thuận hòa giải:", error);
    return { success: false, error: error.message || "Lỗi xử lý thỏa thuận." };
  }
}

export async function rejectAndEscalateDisputeAction(disputeId: string, reason: string = "") {
  try {
    const userAuth = await requireUser();

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { rental: { include: { product: true } } }
    });

    if (!dispute || !dispute.rental) {
      return { success: false, error: "Không tìm thấy khiếu nại." };
    }

    const rental = dispute.rental;
    const isRenter = rental.renterId === userAuth.id;
    const isOwner = rental.product.userId === userAuth.id || rental.ownerId === userAuth.id;

    if (!isRenter && !isOwner) {
      return { success: false, error: "Forbidden: Bạn không thuộc giao dịch này." };
    }

    let initiatorId = "";
    try {
      if (dispute.adminNotes) {
        const parsed = JSON.parse(dispute.adminNotes);
        initiatorId = parsed.initiatorId || "";
      }
    } catch (e) {}

    if (initiatorId && initiatorId === userAuth.id) {
      return { success: false, error: "Bạn không thể tự từ chối đề xuất do chính mình tạo ra." };
    }

    if (dispute.status !== "PENDING_REVIEW") {
      return { success: false, error: "Đề xuất này đã được phản hồi hoặc đang được BQT xử lý." };
    }

    await prisma.$transaction(async (tx) => {
      const disputeLock = await tx.dispute.updateMany({
        where: { id: disputeId, status: "PENDING_REVIEW" },
        data: {
          status: "DISPUTED",
          adminNotes: JSON.stringify({
            escalatedByUserId: userAuth.id,
            escalateReason: reason || "Bên còn lại không đồng ý với mức bồi thường đề xuất.",
            escalatedAt: new Date().toISOString()
          })
        }
      });

      if (disputeLock.count === 0) {
        throw new Error("Xung đột dữ liệu: Đề xuất khiếu nại đã được xử lý từ trước.");
      }

      await tx.auditLog.create({
        data: {
          adminId: userAuth.id,
          action: "DISPUTE_ESCALATED_TO_ADMIN",
          targetType: "DISPUTE",
          targetId: disputeId,
          beforeStatus: "PENDING_REVIEW",
          afterStatus: "DISPUTED",
          metadata: JSON.stringify({ reason })
        }
      });
    });

    try {
      revalidatePath("/my-closet/orders");
      if (rental?.product_id) revalidatePath(`/product/${rental.product_id}`);
    } catch (e) {}

    return { success: true };
  } catch (error: any) {
    console.error("Lỗi khi từ chối và đẩy lên BQT:", error);
    return { success: false, error: error.message || "Lỗi xử lý." };
  }
}

export async function raiseDisputeAction(orderId: string, description: string, images: string[]) {
  return raiseDisputeWithProposalAction(orderId, description, images, 0);
}

export async function loadMoreOrdersAction({
  mode,
  cursor,
  limit = 20
}: {
  mode: "owner" | "renter";
  cursor?: string | null;
  limit?: number;
}) {
  try {
    const userAuth = await requireUser();
    const isOwner = mode === "owner";

    const getReviewStats = (reviews: any[]) => {
      if (!reviews || reviews.length === 0) return { avg: "5.0", count: 0 };
      const total = reviews.reduce((acc, rev) => acc + rev.rating, 0);
      return { avg: (total / reviews.length).toFixed(1), count: reviews.length };
    };

    const rawOrders = await prisma.rentalHistory.findMany({
      where: isOwner
        ? { product: { userId: userAuth.id } }
        : { renterId: userAuth.id },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: isOwner
        ? {
            product: { include: { images: true } },
            renter: {
              include: {
                reviewsReceived: { where: { type: "OWNER_TO_RENTER" } }
              }
            }
          }
        : {
            product: {
              include: {
                images: true,
                user: {
                  include: {
                    reviewsReceived: { where: { type: "RENTER_TO_OWNER" } }
                  }
                }
              }
            }
          }
    });

    const hasMore = rawOrders.length > limit;
    const pagedOrders = hasMore ? rawOrders.slice(0, limit) : rawOrders;

    const mapped = pagedOrders.map((order: any) => {
      if (isOwner) {
        const renterStats = getReviewStats(order.renter?.reviewsReceived || []);
        return {
          ...order,
          renter_name: order.renter?.name || order.renterId,
          renterAvg: renterStats.avg,
          renterReviewCount: renterStats.count,
          products: {
            title: order.product?.title,
            image_url: order.product?.images?.[0]?.url
          }
        };
      } else {
        const ownerStats = getReviewStats(order.product?.user?.reviewsReceived || []);
        return {
          ...order,
          owner_name: order.product?.user?.name || order.product?.userId,
          ownerAvg: ownerStats.avg,
          ownerReviewCount: ownerStats.count,
          products: {
            title: order.product?.title,
            image_url: order.product?.images?.[0]?.url
          }
        };
      }
    });

    const serializedOrders = JSON.parse(
      JSON.stringify(mapped, (key, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return {
      success: true,
      orders: serializedOrders,
      hasMore,
      nextCursor: serializedOrders.length > 0 ? serializedOrders[serializedOrders.length - 1].id : null
    };
  } catch (error: any) {
    console.error("Lỗi khi tải thêm đơn hàng:", error);
    return { success: false, error: error.message || "Lỗi khi tải thêm đơn hàng." };
  }
}

export async function submitReviewAction({
  rentalId,
  rating,
  comment,
  type
}: {
  rentalId: string;
  rating: number;
  comment: string;
  type: "RENTER_TO_OWNER" | "OWNER_TO_RENTER";
}) {
  try {
    const userAuth = await requireUser();

    return await prisma.$transaction(async (tx) => {
      // 1. Validate rental and permissions
      const rental = await tx.rentalHistory.findUnique({
        where: { id: rentalId }
      });

      if (!rental) {
        throw new Error("Không tìm thấy giao dịch.");
      }

      if (rental.status !== "LENDER_COMPLETED") {
        throw new Error("Chỉ có thể đánh giá khi giao dịch đã hoàn tất.");
      }

      const isRenter = rental.renterId === userAuth.id;
      const isOwner = rental.ownerId === userAuth.id;

      if (type === "RENTER_TO_OWNER" && !isRenter) {
        throw new Error("Forbidden: Bạn không phải Khách thuê của đơn này.");
      }
      if (type === "OWNER_TO_RENTER" && !isOwner) {
        throw new Error("Forbidden: Bạn không phải Chủ tủ của đơn này.");
      }

      const reviewerId = userAuth.id;
      const revieweeId = type === "RENTER_TO_OWNER" ? rental.ownerId! : rental.renterId;

      // 2. Kiểm tra xem user đã đánh giá chưa (tránh spam)
      const existingReview = await tx.review.findFirst({
        where: { rentalId, reviewerId, type }
      });

      if (existingReview) {
        throw new Error("Bạn đã đánh giá giao dịch này rồi.");
      }

      // 3. Tạo Review mới (Blind State)
      const newReview = await tx.review.create({
        data: {
          rentalId,
          reviewerId,
          revieweeId,
          rating,
          comment,
          type,
          isPublished: false
        }
      });

      // 4. Kiểm tra xem đối phương đã đánh giá chưa
      const oppositeType = type === "RENTER_TO_OWNER" ? "OWNER_TO_RENTER" : "RENTER_TO_OWNER";
      const oppositeReview = await tx.review.findFirst({
        where: { rentalId, type: oppositeType }
      });

      // Nếu đối phương đã đánh giá => Cả 2 đều nộp bài => LẬT BÀI NGỬA (Reveal)
      if (oppositeReview) {
        // Cập nhật isPublished = true cho cả 2
        await tx.review.updateMany({
          where: { rentalId },
          data: { isPublished: true }
        });

        // Hàm helper để update rating trung bình (O(1) Aggregation)
        const updateAvgRating = async (userId: string, newRating: number) => {
          const user = await tx.user.findUnique({ where: { id: userId }, select: { rating: true, reviewCount: true } });
          if (user) {
            const currentCount = user.reviewCount || 0;
            const currentTotal = user.rating * currentCount;
            const newCount = currentCount + 1;
            const newAvg = (currentTotal + newRating) / newCount;

            await tx.user.update({
              where: { id: userId },
              data: {
                rating: newAvg,
                reviewCount: newCount
              }
            });
          }
        };

        // Cập nhật cho CẢ HAI user
        await updateAvgRating(revieweeId, newReview.rating); // Update người vừa bị đánh giá
        await updateAvgRating(reviewerId, oppositeReview.rating); // Update người vừa đánh giá (từ bài review cũ của đối phương)
      }

      try {
        revalidatePath("/my-closet/orders");
        revalidatePath(`/closet/${revieweeId}`);
        if (rental?.product_id) {
          revalidatePath(`/product/${rental.product_id}`);
        }
      } catch(e) {
        console.error("Cache purge failed:", e);
      }
      return { success: true };
    });
  } catch (error: any) {
    console.error("Lỗi khi gửi đánh giá:", error);
    return { success: false, error: error.message || "Lỗi khi gửi đánh giá." };
  }
}

export async function getScrubbedReviewsAction(targetUserId: string, currentUserId?: string) {
  try {
    const rawReviews = await prisma.review.findMany({
      where: { revieweeId: targetUserId },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: { select: { id: true, name: true, avatar: true } },
        rental: { select: { id: true, product: { select: { title: true } } } }
      }
    });

    const scrubbed = rawReviews.map(review => {
      // THE BLIND LOGIC: Mask data if not published AND viewer is the reviewee
      if (!review.isPublished && review.revieweeId === currentUserId) {
        return {
          ...review,
          rating: null,
          comment: "HIDDEN_BY_SERVER", // Absolute server-side scrubbing
          isMasked: true
        };
      }
      return {
        ...review,
        isMasked: false
      };
    });

    return { success: true, reviews: scrubbed };
  } catch (error: any) {
    console.error("Lỗi fetch reviews:", error);
    return { success: false, error: "Không thể lấy đánh giá." };
  }
}
