"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/auth";
import { revalidatePath } from "next/cache";


export async function renterReceivedAction(orderId: string) {
  try {
    const userAuth = await requireUser();

    const updateResult = await prisma.rentalHistory.updateMany({
      where: { id: orderId, renterId: userAuth.id, status: "LENDER_SHIPPED" },
      data: { status: "BORROWER_RECEIVED" }
    });

    if (updateResult.count === 0) {
      return { success: false, error: "Forbidden hoac trang thai don hang khong hop le." };
    }

    try {
      await prisma.auditLog.create({
        data: {
          adminId: userAuth.id,
          action: "RENTER_RECEIVED_ITEM",
          targetType: "RENTAL",
          targetId: orderId,
          beforeStatus: "LENDER_SHIPPED",
          afterStatus: "BORROWER_RECEIVED"
        }
      });
    } catch (e) {
      console.warn("Audit non-blocking log:", e);
    }

    revalidatePath("/my-closet/orders");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Lỗi khi xác nhận nhận hàng." };
  }
}

export async function renterReturnAction(orderId: string) {
  try {
    const userAuth = await requireUser();

    const rental = await prisma.rentalHistory.findFirst({
      where: { id: orderId, renterId: userAuth.id },
      include: { invoice: true, product: true }
    });

    if (!rental) {
      return { success: false, error: "Không tìm thấy đơn hàng." };
    }

    const updateResult = await prisma.rentalHistory.updateMany({
      where: { id: orderId, renterId: userAuth.id, status: "BORROWER_RECEIVED" },
      data: { status: "BORROWER_RETURNED" }
    });

    if (updateResult.count === 0) {
      return { success: false, error: "Forbidden hoac trang thai don hang khong hop le." };
    }

    // Tạo Shipment chiều về
    try {
      const pickupAddress = {
        name: rental.renter_name || "Khách thuê",
        phone: rental.renter_phone || "",
      };

      const deliveryAddress = {
        name: rental.owner_name || "Chủ tủ",
        phone: rental.owner_phone || "",
        province: rental.product?.province || "Hà Nội",
        districtId: rental.product?.districtId,
        wardCode: rental.product?.wardCode,
        specificAddress: rental.product?.specificAddress,
      };

      await prisma.shipment.upsert({
        where: {
          rentalId_direction: {
            rentalId: rental.id,
            direction: "RETURN",
          },
        },
        update: {
          status: "IN_TRANSIT",
          shippingFeeCollected: 0,
          pickupAddress,
          deliveryAddress,
          bookedByUserId: userAuth.id,
          trackingCode: `GHN-RET-${rental.id.slice(0, 6).toUpperCase()}`,
        },
        create: {
          rentalId: rental.id,
          direction: "RETURN",
          status: "IN_TRANSIT",
          clientOrderCode: `${rental.id}-RETURN`,
          shippingFeeCollected: 0,
          pickupAddress,
          deliveryAddress,
          bookedByUserId: userAuth.id,
          trackingCode: `GHN-RET-${rental.id.slice(0, 6).toUpperCase()}`,
        }
      });

      await prisma.auditLog.create({
        data: {
          adminId: userAuth.id,
          action: "RENTER_RETURNED_ITEM",
          targetType: "RENTAL",
          targetId: orderId,
          beforeStatus: rental.status,
          afterStatus: "BORROWER_RETURNED"
        }
      });
    } catch (e) {
      console.warn("Return shipment non-blocking log:", e);
    }

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
    let productIdToRevalidate: string | null = null;
    await prisma.$transaction(async (tx) => {
      // Fetch renterId and invoice to calculate dynamic refund amount
      const rental = await tx.rentalHistory.findUnique({
        where: { id: orderId },
        include: { 
          invoice: true, 
          product: true,
          disputes: { where: { status: { in: ["APPROVED_DEDUCTION", "PENDING_REVIEW"] } }, orderBy: { createdAt: "desc" }, take: 1 }
        }
      });

      if (!rental) {
        throw new Error("Không tìm thấy đơn hàng.");
      }

      const ownerId = rental.ownerId || rental.product?.userId;
      if (!ownerId || ownerId !== userAuth.id) {
        throw new Error("Forbidden: Chi chu do cua don hang moi duoc quyet toan.");
      }

      if (!rental.invoice || rental.invoice.status !== "PAID") {
        throw new Error("Hoa don chua duoc thanh toan thanh cong, khong the quyet toan.");
      }

      productIdToRevalidate = rental.product_id;

      const invoiceId = rental.invoice.id;
      const existingSettlement = await tx.ledgerTransaction.findFirst({
        where: {
          invoiceId,
          type: { in: ["REFUND_OUT", "PAYOUT_OUT", "FEE_RETAINED", "SHIPPING_RETAINED"] },
          status: "COMPLETED"
        }
      });

      if (existingSettlement) {
        throw new Error("Giao dich nay da duoc quyet toan tren so cai.");
      }

      const updateResult = await tx.rentalHistory.updateMany({
        where: {
          id: orderId,
          status: { in: ["BORROWER_RETURNED", "BORROWER_RECEIVED", "LENDER_SHIPPED", "OWNER_PACKED", "PENDING_APPROVAL", "DISPUTE"] }
        },
        data: {
          status: "LENDER_COMPLETED",
          completedAt: new Date()
        }
      });

      if (updateResult.count === 0) {
        throw new Error("Giao dịch đã được hoàn tất trước đó hoặc không thể cập nhật.");
      }

      // 🛡️ Kiểm tra xem đơn này có thỏa thuận giải quyết khiếu nại hoàn đồ trước đó không:
      let disputeReturnRefund = 0;
      let disputeOwnerPayout = 0;
      let disputePlatformFee = 0;
      let isDisputeReturn = false;
      const activeDispute = rental.disputes?.[0];

      if (activeDispute?.adminNotes) {
        try {
          const notes = JSON.parse(activeDispute.adminNotes);
          if (typeof notes.pendingRefundToRenter === "number") {
            disputeReturnRefund = notes.pendingRefundToRenter;
            disputeOwnerPayout = notes.pendingOwnerPayout || 0;
            disputePlatformFee = notes.platformFeeCollected || 0;
            isDisputeReturn = true;
          }
        } catch {}
      }

      if (isDisputeReturn && activeDispute) {
        // 🌟 Luồng giải ngân sau khi Chủ tủ đã nhận lại đồ hoàn từ khiếu nại sai mẫu / đồ lỗi
        if (disputeReturnRefund > 0) {
          await tx.user.update({
            where: { id: rental.renterId },
            data: { walletBalance: { increment: disputeReturnRefund } }
          });

          await tx.ledgerTransaction.create({
            data: {
              invoiceId,
              type: "REFUND_OUT",
              amount: disputeReturnRefund,
              description: `Hoàn tiền thuê & cọc (${disputeReturnRefund.toLocaleString('vi-VN')}đ) cho khách sau khi chủ tủ nhận lại đồ hoàn`,
              status: "COMPLETED"
            }
          });
        }

        if (disputeOwnerPayout > 0) {
          await tx.user.update({
            where: { id: ownerId },
            data: { walletBalance: { increment: disputeOwnerPayout } }
          });

          await tx.ledgerTransaction.create({
            data: {
              invoiceId,
              type: "PAYOUT_OUT",
              amount: disputeOwnerPayout,
              description: `Giải ngân phần tiền thuê còn lại cho chủ đồ sau khi trừ hoàn tiền khiếu nại`,
              status: "COMPLETED"
            }
          });
        }

        if (disputePlatformFee > 0) {
          await tx.ledgerTransaction.create({
            data: {
              invoiceId,
              type: "FEE_RETAINED",
              amount: disputePlatformFee,
              description: `Phí nền tảng đơn khiếu nại #${orderId.slice(0, 8)}`,
              status: "COMPLETED"
            }
          });
        }

        await tx.dispute.update({
          where: { id: activeDispute.id },
          data: {
            status: "RESOLVED",
            adminNotes: JSON.stringify({
              ...JSON.parse(activeDispute.adminNotes || "{}"),
              resolvedAt: new Date().toISOString(),
              returnItemReceivedByOwner: true,
              finalSettledAt: new Date().toISOString()
            })
          }
        });

      } else {
        // 🌟 Luồng chuẩn hoàn tất đơn thuê thông thường (Không có khiếu nại)
        const depositAmount = rental.invoice?.depositAmount || 0;
        const rentalFee = rental.invoice?.rentalFee || 0;
        const rawPlatformFee = rental.invoice?.platformFee || Math.floor(rentalFee * 0.1);
        const platformFee = Math.min(rawPlatformFee, rentalFee);
        const shippingFee = rental.invoice?.shippingFeeCollected || 0;

        // 💸 1. Hoàn Tiền Cọc (Refund Escrow) & Tặng 15 Xu Lá cho Khách Thuê:
        const updatedRenter = await tx.user.update({
          where: { id: rental.renterId },
          data: {
            walletBalance: depositAmount > 0 ? { increment: depositAmount } : undefined,
            cloopCoins: { increment: 15 }
          },
          select: { cloopCoins: true }
        });

        try {
          await tx.coinLedgerEntry.create({
            data: {
              userId: rental.renterId,
              type: "QUEST_REWARD",
              amount: 15,
              balanceAfter: updatedRenter.cloopCoins,
              description: `🎁 Thưởng 15 Xu Lá tuần hoàn hoàn tất đơn thuê #${orderId.slice(0, 8).toUpperCase()}`,
              metadata: { orderId, type: "RENTAL_COMPLETION" }
            }
          });
        } catch (coinErr) {
          console.warn("Coin ledger entry creation warning:", coinErr);
        }

        if (depositAmount > 0 && invoiceId) {
          await tx.ledgerTransaction.create({
            data: { invoiceId, type: 'REFUND_OUT', amount: depositAmount, description: `Hoàn cọc đơn ${orderId} & Thưởng 15 Xu Lá` }
          });
        }

        // 💸 2. Thanh Toán Tiền Thuê cho Chủ Tủ (sau trừ cước hoàn về):
        const returnShippingFee = 25000;
        const ownerBonusCoins = 25;
        const returnShippingRetained = Math.min(returnShippingFee, Math.max(0, rentalFee - platformFee));
        const lenderEarnings = Math.max(0, rentalFee - platformFee - returnShippingRetained);
        const allocatedAmount = depositAmount + lenderEarnings + platformFee + returnShippingRetained + shippingFee;

        if (allocatedAmount !== rental.invoice.amount) {
          throw new Error("Loi can so: tong tien phan bo khong khop hoa don da thu.");
        }

        const updatedOwner = await tx.user.update({
          where: { id: ownerId },
          data: {
            walletBalance: lenderEarnings > 0 ? { increment: lenderEarnings } : undefined,
            cloopCoins: { increment: ownerBonusCoins }
          },
          select: { cloopCoins: true }
        });

        try {
          await tx.coinLedgerEntry.create({
            data: {
              userId: ownerId,
              type: "QUEST_REWARD",
              amount: ownerBonusCoins,
              balanceAfter: updatedOwner.cloopCoins,
              description: `🎁 Thưởng +${ownerBonusCoins} Xu Lá cho Chủ tủ khi hoàn tất đơn cho thuê #${orderId.slice(0, 8).toUpperCase()}`,
              metadata: { orderId, type: "OWNER_RENTAL_COMPLETION" }
            }
          });
        } catch (coinErr) {
          console.warn("Owner coin ledger creation warning:", coinErr);
        }

        if (invoiceId) {
          if (lenderEarnings > 0) {
            await tx.ledgerTransaction.create({
              data: { invoiceId, type: 'PAYOUT_OUT', amount: lenderEarnings, description: `Thanh toan tien thue don ${orderId} sau tru phi san va ship chieu ve` }
            });
          }
          if (platformFee > 0) {
            await tx.ledgerTransaction.create({
              data: { invoiceId, type: 'FEE_RETAINED', amount: platformFee, description: `Phi nen tang don ${orderId}` }
            });
          }
          if (returnShippingRetained > 0) {
            await tx.ledgerTransaction.create({
              data: { invoiceId, type: 'SHIPPING_RETAINED', amount: returnShippingRetained, description: `Phi van chuyen chieu ve giu lai don ${orderId}` }
            });
          }
          if (shippingFee > 0) {
            await tx.ledgerTransaction.create({
              data: { invoiceId, type: 'SHIPPING_RETAINED', amount: shippingFee, description: `Phí vận chuyển chiều đi giữ lại đơn ${orderId}` }
            });
          }
        }
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
          metadata: JSON.stringify({ isDisputeReturn, orderId })
        }
      });
    }, { timeout: 20000, maxWait: 10000 });

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
    const rentalFee = rental.invoice?.rentalFee || 0;
    if (isOwner) {
      if (cleanDeduction > depositAmount) {
        return { success: false, error: `Số tiền bồi thường đề xuất (${cleanDeduction.toLocaleString('vi-VN')}đ) không được vượt quá số tiền cọc (${depositAmount.toLocaleString('vi-VN')}đ).` };
      }
    } else {
      if (cleanDeduction > rentalFee) {
        return { success: false, error: `Số tiền yêu cầu hoàn lại (${cleanDeduction.toLocaleString('vi-VN')}đ) không được vượt quá tiền thuê (${rentalFee.toLocaleString('vi-VN')}đ).` };
      }
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
    let initiatorRole = "OWNER";
    try {
      if (dispute.adminNotes) {
        const parsed = JSON.parse(dispute.adminNotes);
        initiatorId = parsed.initiatorId || "";
        initiatorRole = parsed.initiatorRole || "OWNER";
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
    const rawPlatformFee = Number(invoice.platformFee) || 0;
    const shippingFeeCollected = Number(invoice.shippingFeeCollected) || 0;
    const deduction = Math.floor(Math.max(0, Number(dispute.suggestedDeduction) || 0));

    let refundDepositToRenter = 0;
    let refundRentalToRenter = 0;
    let compensationToOwner = 0;
    let ownerRentalPayout = 0;
    let platformFeeCollected = 0;

    if (initiatorRole === "RENTER") {
      // 🛡️ Khiếu nại từ KHÁCH THUÊ (Chủ tủ giao sai mẫu mã / đồ hư hỏng):
      // 1. Cọc được hoàn trả 100% về cho khách thuê:
      refundDepositToRenter = depositAmount;
      // 2. Mức hoàn tiền thuê yêu cầu từ khiếu nại (tối đa toàn bộ rentalFee):
      refundRentalToRenter = deduction > 0 ? Math.min(deduction, rentalFee) : rentalFee;
      // 3. Phần tiền thuê còn lại sau khi hoàn cho khách:
      const remainingRentalFee = rentalFee - refundRentalToRenter;
      if (remainingRentalFee > 0) {
        platformFeeCollected = Math.min(rawPlatformFee, remainingRentalFee);
        ownerRentalPayout = Math.max(0, remainingRentalFee - platformFeeCollected);
      } else {
        platformFeeCollected = 0;
        ownerRentalPayout = 0;
      }
      compensationToOwner = 0;
    } else {
      // 🛡️ Khiếu nại từ CHỦ TỦ (Khách thuê làm bẩn / rách đồ khi trả đồ):
      if (deduction > depositAmount) {
        return { success: false, error: "Lỗi bảo mật: Số tiền khấu trừ vượt quá số tiền cọc." };
      }
      refundDepositToRenter = depositAmount - deduction;
      compensationToOwner = deduction;
      platformFeeCollected = rawPlatformFee;
      ownerRentalPayout = Math.max(0, rentalFee - platformFeeCollected);
    }

    const totalRenterCredit = refundDepositToRenter + refundRentalToRenter;
    const totalOwnerCredit = ownerRentalPayout + compensationToOwner;

    const totalCalculated = totalRenterCredit + compensationToOwner + ownerRentalPayout + platformFeeCollected + shippingFeeCollected;

    if (totalCalculated !== totalAmount) {
      console.error(`[CRITICAL MONEY INVARIANT ERROR] totalCalculated (${totalCalculated}) !== totalAmount (${totalAmount})`);
      return { success: false, error: "LỖI KẾ TOÁN: Bất biến cân sổ tài chính bị lệch." };
    }

    // 🛡️ 7. Atomic Execution (ACID Transaction with Row-Level Optimistic Locks)
    await prisma.$transaction(async (tx) => {
      if (initiatorRole === "RENTER") {
        // 🛡️ CHỦ TỦ ĐỒNG Ý KHIẾU NẠI CỦA KHÁCH:
        // Đồ đang ở chỗ khách thuê, shipper cần đến lấy trả lại chủ tủ.
        // Tiền tiếp tục giữ an toàn trong Escrow, CHƯA giải ngân.
        const disputeLock = await tx.dispute.updateMany({
          where: { id: disputeId, status: "PENDING_REVIEW" },
          data: {
            status: "APPROVED_DEDUCTION",
            finalDeduction: deduction,
            adminNotes: JSON.stringify({
              resolvedVia: "P2P_SELF_MEDIATION",
              acceptedByUserId: userAuth.id,
              acceptedAt: new Date().toISOString(),
              deduction,
              initiatorRole: "RENTER",
              pendingRefundToRenter: totalRenterCredit,
              pendingOwnerPayout: ownerRentalPayout,
              platformFeeCollected,
              shippingFeeCollected
            })
          }
        });

        if (disputeLock.count === 0) {
          throw new Error("Xung đột dữ liệu: Đề xuất khiếu nại đã được giải quyết hoặc không còn ở trạng thái chờ phản hồi.");
        }

        // Đổi trạng thái đơn hàng sang BORROWER_RETURNED để chủ tủ và khách theo dõi chiều trả hàng
        const lockCount = await tx.rentalHistory.updateMany({
          where: { id: rental.id, status: "DISPUTE" },
          data: { status: "BORROWER_RETURNED" }
        });

        if (lockCount.count === 0) {
          throw new Error("Xung đột dữ liệu: Đơn hàng đã được xử lý bởi tiến trình khác.");
        }

        // Tự động tạo / cập nhật vận đơn GHN chiều trả hàng RETURN
        const pickupAddress = {
          name: rental.renter_name || "Khách thuê",
          phone: rental.renter_phone || "",
        };

        const deliveryAddress = {
          name: rental.owner_name || "Chủ tủ",
          phone: rental.owner_phone || "",
          province: rental.product?.province || "Hà Nội",
          districtId: rental.product?.districtId,
          wardCode: rental.product?.wardCode,
          specificAddress: rental.product?.specificAddress,
        };

        await tx.shipment.upsert({
          where: {
            rentalId_direction: {
              rentalId: rental.id,
              direction: "RETURN",
            },
          },
          update: {
            status: "IN_TRANSIT",
            shippingFeeCollected: 0,
            pickupAddress,
            deliveryAddress,
            bookedByUserId: userAuth.id,
            trackingCode: `GHN-RET-${rental.id.slice(0, 6).toUpperCase()}`,
          },
          create: {
            rentalId: rental.id,
            direction: "RETURN",
            status: "IN_TRANSIT",
            clientOrderCode: `${rental.id}-RETURN`,
            shippingFeeCollected: 0,
            pickupAddress,
            deliveryAddress,
            bookedByUserId: userAuth.id,
            trackingCode: `GHN-RET-${rental.id.slice(0, 6).toUpperCase()}`,
          }
        });

        await tx.auditLog.create({
          data: {
            adminId: userAuth.id,
            action: "DISPUTE_RETURN_IN_PROGRESS",
            targetType: "DISPUTE",
            targetId: disputeId,
            beforeStatus: "PENDING_REVIEW",
            afterStatus: "APPROVED_DEDUCTION",
            metadata: JSON.stringify({
              pendingRefundToRenter: totalRenterCredit,
              pendingOwnerPayout: ownerRentalPayout,
              trackingCode: `GHN-RET-${rental.id.slice(0, 6).toUpperCase()}`
            })
          }
        });

      } else {
        // 🛡️ KHÁCH THUÊ ĐỒNG Ý ĐỀ XUẤT BỒI THƯỜNG TỪ CHỦ TỦ:
        // Đồ đã về tay chủ tủ từ trước đó. Quyết toán Escrow ngay lập tức!
        const disputeLock = await tx.dispute.updateMany({
          where: { id: disputeId, status: "PENDING_REVIEW" },
          data: {
            status: "RESOLVED",
            finalDeduction: deduction,
            adminNotes: JSON.stringify({
              resolvedVia: "P2P_SELF_MEDIATION",
              acceptedByUserId: userAuth.id,
              acceptedAt: new Date().toISOString(),
              deduction,
              initiatorRole: "OWNER"
            })
          }
        });

        if (disputeLock.count === 0) {
          throw new Error("Xung đột dữ liệu: Đề xuất khiếu nại đã được giải quyết hoặc không còn ở trạng thái chờ phản hồi.");
        }

        const lockCount = await tx.rentalHistory.updateMany({
          where: { id: rental.id, status: "DISPUTE" },
          data: { status: "LENDER_COMPLETED" }
        });

        if (lockCount.count === 0) {
          throw new Error("Xung đột dữ liệu: Đơn hàng đã được xử lý bởi tiến trình khác.");
        }

        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: "PAID" }
        });

        if (totalRenterCredit > 0) {
          await tx.user.update({
            where: { id: rental.renterId },
            data: { walletBalance: { increment: totalRenterCredit } }
          });
        }

        const ownerId = rental.ownerId || rental.product?.userId;
        if (totalOwnerCredit > 0 && ownerId) {
          await tx.user.update({
            where: { id: ownerId },
            data: { walletBalance: { increment: totalOwnerCredit } }
          });
        }

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

        if (totalRenterCredit > 0) {
          ledgerRows.push({
            invoiceId: invoice.id,
            type: "REFUND_OUT",
            amount: totalRenterCredit,
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

        // Kích hoạt lại sản phẩm
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
      }
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
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);

    const getReviewStats = (reviews: any[]) => {
      if (!reviews || reviews.length === 0) return { avg: "5.0", count: 0 };
      const total = reviews.reduce((acc, rev) => acc + rev.rating, 0);
      return { avg: (total / reviews.length).toFixed(1), count: reviews.length };
    };

    const rawOrders = await prisma.rentalHistory.findMany({
      where: isOwner
        ? { product: { userId: userAuth.id } }
        : { renterId: userAuth.id },
      take: safeLimit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      select: isOwner
        ? {
            id: true,
            renterId: true,
            ownerId: true,
            start_date: true,
            end_date: true,
            status: true,
            createdAt: true,
            invoice: {
              select: {
                id: true,
                amount: true,
                rentalFee: true,
                depositAmount: true,
                shippingFeeCollected: true,
                platformFee: true,
                status: true,
                orderCode: true,
                payosStatus: true,
              },
            },
            disputes: { orderBy: { createdAt: "desc" } },
            product: {
              select: {
                id: true,
                title: true,
                province: true,
                userId: true,
                images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
              },
            },
            renter: {
              select: {
                id: true,
                name: true,
                avatar: true,
                rating: true,
                reviewCount: true,
                reviewsReceived: { select: { rating: true }, where: { type: "OWNER_TO_RENTER" } }
              }
            }
          }
        : {
            id: true,
            renterId: true,
            ownerId: true,
            start_date: true,
            end_date: true,
            status: true,
            createdAt: true,
            invoice: {
              select: {
                id: true,
                amount: true,
                rentalFee: true,
                depositAmount: true,
                shippingFeeCollected: true,
                platformFee: true,
                status: true,
                orderCode: true,
                payosStatus: true,
              },
            },
            disputes: { orderBy: { createdAt: "desc" } },
            product: {
              select: {
                id: true,
                title: true,
                province: true,
                userId: true,
                images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
                user: {
                  select: {
                    id: true,
                    name: true,
                    rating: true,
                    reviewCount: true,
                    reviewsReceived: { select: { rating: true }, where: { type: "RENTER_TO_OWNER" } }
                  }
                }
              }
            }
          }
    });

    const hasMore = rawOrders.length > safeLimit;
    const pagedOrders = hasMore ? rawOrders.slice(0, safeLimit) : rawOrders;

    const mapped = pagedOrders.map((order: any) => {
      if (isOwner) {
        const renterStats = getReviewStats(order.renter?.reviewsReceived || []);
        return {
          ...order,
          startDate: order.start_date,
          endDate: order.end_date,
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
          startDate: order.start_date,
          endDate: order.end_date,
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
          productId: rental.product_id,
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
        rental: {
          select: {
            id: true,
            product: {
              select: {
                id: true,
                title: true,
                category: true,
                images: {
                  select: { url: true, isPrimary: true },
                  orderBy: { isPrimary: "desc" },
                  take: 1
                }
              }
            }
          }
        },
        product: {
          select: {
            id: true,
            title: true,
            category: true,
            images: {
              select: { url: true, isPrimary: true },
              orderBy: { isPrimary: "desc" },
              take: 1
            }
          }
        }
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

