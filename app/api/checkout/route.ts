import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/auth";
import { verifyShippingQuoteToken, extractProvince } from "@/src/utils/shipping";
import { payos } from "@/src/utils/payos";
import { generatePayOSOrderCode } from "@/src/utils/order-code";
import { checkRateLimit } from "@/src/utils/rate-limit";
import { startOfDay, endOfDay, addDays, subDays } from "date-fns";
import { calculateUserTrustScore, checkExposureLimit, calculateDynamicDeposit, getItemValuation, getLiveReserveFundStatus, getUserActiveGuaranteeStatus } from "@/lib/trust-engine";
import {
  computeUserWalletReconciliation,
  buildWalletRolloverOutDescription,
  releasePendingWalletHoldForInvoice,
} from "@/src/lib/wallet-reconciliation";
import { z } from "zod";

// Schema Validate dữ liệu đầu vào chuẩn Server-side
const CheckoutSchema = z.object({
  productId: z.string().uuid("ID Sản phẩm không hợp lệ"),
  userId: z.string().optional(), // Client có thể gửi hoặc không, server luôn dùng session
  shippingToken: z.string().min(10, "Thiếu Token Vận Chuyển"),
  buyerName: z.string().max(120).optional(),
  buyerAddress: z.string().min(10, "Địa chỉ nhận hàng quá ngắn, vui lòng nhập rõ số nhà, tên đường."),
  buyerSpecificAddress: z.string().max(255).optional(),
  buyerProvince: z.string().max(100).optional(),
  buyerDistrictName: z.string().max(100).optional(),
  buyerDistrictId: z.number().int().positive().optional(),
  buyerWardName: z.string().max(100).optional(),
  buyerWardCode: z.string().max(40).optional(),
  buyerPhone: z.string().regex(/(84|0[3|5|7|8|9])+([0-9]{8})\b/, "Số điện thoại không đúng định dạng (Ví dụ: 0987654321)"),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ")),
  packageDays: z.number().int().positive().refine(val => [1, 3, 7].includes(val), "Gói thuê không hợp lệ (Chỉ chấp nhận 1, 3, 7 ngày)"),
  fastTrackMode: z.boolean().optional(),
  useWalletBalance: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    if (!payos) {
      return NextResponse.json({ error: "Cau hinh PayOS chua san sang tren server." }, { status: 500 });
    }

    // 1. Xác thực Phiên Người Dùng Server-Side (Chống IDOR & Giả mạo danh tính)
    const sessionUser = await requireUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Bạn cần đăng nhập để thực hiện giao dịch!" }, { status: 401 });
    }
    const realUserId = sessionUser.id;

    // Rate Limit 5 request / phút / user
    const rateLimit = checkRateLimit(`checkout_${realUserId}`, 5, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Bạn đang thao tác quá nhanh, vui lòng chờ 1 phút." }, { status: 429 });
    }

    // 2. Parse & Validate Payload bằng Zod
    const body = await req.json();
    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const {
      productId,
      shippingToken,
      buyerName,
      buyerAddress,
      buyerSpecificAddress,
      buyerProvince,
      buyerDistrictName,
      buyerDistrictId,
      buyerWardName,
      buyerWardCode,
      buyerPhone,
      startDate,
      packageDays,
      fastTrackMode,
      useWalletBalance,
    } = parsed.data;

    // 3. Truy vấn Sản phẩm & Gói Listing từ Database (Bắt buộc sản phẩm ON_MARKET & Listing RENT đang AVAILABLE)
    const product = await prisma.product.findUnique({
      where: { id: productId, isDeleted: false },
      include: {
        listings: {
          where: {
            isDeleted: false,
            status: "AVAILABLE",
            listingType: "RENT"
          }
        },
        user: { select: { id: true, name: true } }
      }
    });

    if (!product || product.isDeleted || product.status !== "ON_MARKET" || product.listings.length === 0) {
      return NextResponse.json({ error: "Sản phẩm không tồn tại, đã tạm ẩn khỏi sàn hoặc không mở cho thuê!" }, { status: 404 });
    }

    // Chặn người bán tự thuê đồ của chính mình
    if (product.userId === realUserId) {
      return NextResponse.json({ error: "Bạn không thể tự mua/thuê đồ của chính mình!" }, { status: 400 });
    }

    const activeListing = product.listings.find(
      (l: any) => !l.isDeleted && l.status === "AVAILABLE" && l.listingType === "RENT"
    );
    if (!activeListing) {
      return NextResponse.json({ error: "Sản phẩm hiện không có gói cho thuê khả dụng!" }, { status: 400 });
    }

    // Tìm giá thuê trong JSONB pricing_tiers
    let itemPrice = activeListing.basePrice || 0;
    const pricingTiers = activeListing.pricing_tiers as Array<{ days: number; price: number }> | null;
    if (pricingTiers && Array.isArray(pricingTiers)) {
      const selectedTier = pricingTiers.find(t => t.days === packageDays && Number.isFinite(Number(t.price)) && Number(t.price) > 0);
      if (selectedTier) {
        itemPrice = Math.round(Number(selectedTier.price));
      } else {
        itemPrice = Math.round((activeListing.basePrice || 0) * packageDays * (packageDays >= 7 ? 0.7 : packageDays >= 3 ? 0.85 : 1) / 1000) * 1000;
      }
    } else {
      itemPrice = Math.round((activeListing.basePrice || 0) * packageDays * (packageDays >= 7 ? 0.7 : packageDays >= 3 ? 0.85 : 1) / 1000) * 1000;
    }

    if (!Number.isFinite(itemPrice) || itemPrice <= 0) {
      return NextResponse.json({ error: "Giá thuê sản phẩm không hợp lệ." }, { status: 400 });
    }

    const approxItemValue = getItemValuation(activeListing);
    let baseDepositPrice = activeListing.deposit || 0;

    // 🛡️ Fail-Closed: Đồ cho thuê bắt buộc phải có tiền cọc > 0 để bảo toàn dòng tiền
    if (baseDepositPrice <= 0) {
      baseDepositPrice = Math.max(300000, Math.round(approxItemValue * 0.5));
    }

    // 🌟 CLOOP TRUST & RISK ENGINE SERVER-SIDE VERIFICATION
    const trustBreakdown = await calculateUserTrustScore(realUserId);
    
    // Kiểm tra Hạn Mức Rủi Ro Tài Sản (Exposure Limit)
    const exposureCheck = await checkExposureLimit({
      userId: realUserId,
      newItemValue: approxItemValue,
      trustTier: trustBreakdown.tier,
      fastTrackOverride: Boolean(fastTrackMode),
    });

    if (!exposureCheck.allowed) {
      return NextResponse.json({
        error: exposureCheck.reason,
        requiresFastTrack: true,
        currentExposure: exposureCheck.currentExposure,
        exposureLimit: exposureCheck.exposureLimit,
        projectedExposure: exposureCheck.projectedExposure,
      }, { status: 400 });
    }

    // Lấy số liệu Quỹ dự phòng và Hạn mức bảo lãnh thực tế từ Database
    const [liveFundStatus, userGuaranteeStatus] = await Promise.all([
      getLiveReserveFundStatus(),
      getUserActiveGuaranteeStatus(realUserId),
    ]);

    // Tính toán Tiền Cọc Động (Dynamic Deposit) với dữ liệu DB thật (Không dùng quỹ ảo)
    const depositCalculation = calculateDynamicDeposit({
      baseDeposit: baseDepositPrice,
      itemValue: approxItemValue,
      trustTier: trustBreakdown.tier,
      isRental: true,
      fastTrackActive: Boolean(fastTrackMode),
      fundStatus: liveFundStatus,
      userGuaranteeStatus,
    });

    const depositPrice = depositCalculation.finalDeposit;

    // 4. Xác thực "Signed Quote Token" của Vận chuyển
    let shippingFee = 0;
    let estimatedTransitDays = 3; // Mặc định 3 ngày đi đường
    let quoteServiceId = "standard";
    let quoteProviderName = "GHN";
    try {
      const shippingQuote = verifyShippingQuoteToken(
        shippingToken, 
        product.province, 
        buyerAddress.split(", ").pop() || "", 
        500 
      );
      if (!Number.isFinite(shippingQuote.fee) || shippingQuote.fee < 0) {
        return NextResponse.json({ error: "Phí vận chuyển không hợp lệ." }, { status: 400 });
      }
      shippingFee = shippingQuote.fee;
      estimatedTransitDays = shippingQuote.estimatedDays > 0 ? shippingQuote.estimatedDays : 1;
      quoteServiceId = shippingQuote.serviceId || "standard";
      quoteProviderName = shippingQuote.provider || "GHN";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Lỗi xác thực phí vận chuyển";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const totalAmount = itemPrice + depositPrice + shippingFee;

    // Chuẩn hóa Timezone về 00:00:00 và 23:59:59
    const normStartDate = startOfDay(new Date(startDate));
    const normEndDate = endOfDay(addDays(normStartDate, packageDays - 1));

    // Tổng Buffer = Ngày chủ đồ cần giặt giũ + Ngày ship đi đường
    const totalBufferDays = (activeListing.turnaround_days || 2) + estimatedTransitDays;

    // Mở rộng ranh giới để check đụng lịch
    const bufferedNewStartDate = subDays(normStartDate, totalBufferDays);
    const bufferedNewEndDate = addDays(normEndDate, totalBufferDays);

    let checkoutResult: {
      invoice: { id: string };
      rental: { id: string };
      orderCode: number;
      walletUsedAmount: number;
      payosAmountToCollect: number;
      paidFullyByWallet: boolean;
    } | null = null;

    // 5. Khóa Nguyên Tử (Pessimistic Locking) & Tạo Dữ Liệu
    try {
      checkoutResult = await prisma.$transaction(async (tx) => {
        // 5a. Khóa Product (Pessimistic Lock Row) chống Race Condition
        await tx.$executeRaw`SELECT id FROM products WHERE id = ${productId} FOR UPDATE`;

        // 5a.1. Kiểm tra lại trạng thái Product & Listing BÊN TRONG khóa (Chống TOCTOU)
        const [lockedProduct, lockedListing] = await Promise.all([
          tx.product.findUnique({
            where: { id: productId },
            select: { id: true, isDeleted: true, status: true }
          }),
          tx.listing.findUnique({
            where: { id: activeListing.id },
            select: { id: true, isDeleted: true, status: true, listingType: true }
          })
        ]);

        if (
          !lockedProduct ||
          lockedProduct.isDeleted ||
          lockedProduct.status !== "ON_MARKET" ||
          !lockedListing ||
          lockedListing.isDeleted ||
          lockedListing.status !== "AVAILABLE" ||
          lockedListing.listingType !== "RENT"
        ) {
          throw new Error("Sản phẩm vừa được cập nhật trạng thái hoặc đã có khách khác đặt trước!");
        }

        if (useWalletBalance) {
          // Khóa hàng User trong DB chống Race Condition đa tab khi tiêu số dư Ví
          await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${realUserId} FOR UPDATE`;

          // Lớp Giáp 5: Tự động thu hồi các lệnh giữ Ví PENDING cũ của chính user này (nếu khách từng mở QR rồi đóng/F5)
          const stalePendingInvoices = await tx.invoice.findMany({
            where: {
              status: "PENDING",
              rental: { renterId: realUserId },
            },
            select: {
              id: true,
              rentalId: true,
              orderCode: true,
            },
          });

          for (const staleInv of stalePendingInvoices) {
            await releasePendingWalletHoldForInvoice(tx, {
              invoiceId: staleInv.id,
              renterId: realUserId,
              orderCode: staleInv.orderCode,
              reason: "Tự động giải phóng giữ chỗ cũ khi tạo đơn mới",
            });
            await tx.invoice.update({
              where: { id: staleInv.id },
              data: { status: "CANCELLED", payosStatus: "SUPERSEDED" },
            });
            await tx.rentalHistory.update({
              where: { id: staleInv.rentalId },
              data: { status: "CANCELLED" },
            });
          }
        }

        // 5b. Check đụng lịch (sau khi đã dọn các đơn PENDING cũ chưa thanh toán của chính user này)
        const conflicting = await tx.rentalHistory.findFirst({
          where: {
            product_id: productId,
            isDeleted: false,
            status: { notIn: ["CANCELLED", "LENDER_COMPLETED"] },
            actual_return_date: null,
            start_date: { lt: bufferedNewEndDate },
            end_date: { gt: bufferedNewStartDate }
          }
        });

        if (conflicting) {
          throw new Error("Lịch thuê quá sát nhau, không kịp vận chuyển và giặt ủi. Vui lòng chọn ngày khác!");
        }

        // 5b.1. Đặt giữ chỗ nguyên tử cho Listing RENT (Chống 2 khách tạo đơn trùng nhau)
        const reservedListing = await tx.listing.updateMany({
          where: {
            id: activeListing.id,
            productId: productId,
            listingType: "RENT",
            isDeleted: false,
            status: "AVAILABLE"
          },
          data: {
            status: "RESERVED"
          }
        });

        if (reservedListing.count === 0) {
          throw new Error("Rất tiếc, sản phẩm vừa được khách hàng khác đặt giữ chỗ trước đó một tích tắc!");
        }

        let walletUsedAmount = 0;
        let payosAmountToCollect = totalAmount;
        let verifiedSourceOrderCodes: string[] = [];

        if (useWalletBalance) {
          // Lớp Giáp 2: Đối soát chéo 3 bên (3-Way Reconciliation) truy vết ngược về mã giao dịch PayOS gốc
          const reconciliation = await computeUserWalletReconciliation(realUserId, tx);
          if (!reconciliation.isReconciled) {
            await tx.auditLog.create({
              data: {
                adminId: realUserId,
                action: "WALLET_CHECKOUT_RECONCILIATION_BLOCKED",
                targetType: "User",
                targetId: realUserId,
                beforeStatus: `BALANCE_${reconciliation.currentAvailableBalance}`,
                afterStatus: "BLOCKED_RECONCILIATION_MISMATCH",
                metadata: JSON.stringify(reconciliation),
              },
            });
            throw new Error(
              "Hệ thống phát hiện sai lệch đối soát số dư Ví so với lịch sử thanh toán gốc. Vui lòng liên hệ CSKH để kiểm tra bảo mật."
            );
          }

          verifiedSourceOrderCodes = reconciliation.sourceOrderCodes;
          const safeSpendableBalance = Math.max(
            0,
            Math.min(reconciliation.currentAvailableBalance, reconciliation.verifiedMaxRemainingBalance)
          );

          if (safeSpendableBalance >= totalAmount) {
            walletUsedAmount = totalAmount;
            payosAmountToCollect = 0;
          } else if (safeSpendableBalance > 0) {
            walletUsedAmount = safeSpendableBalance;
            payosAmountToCollect = totalAmount - walletUsedAmount;

            // Lớp Giáp 5b: Cổng PayOS yêu cầu số tiền tạo mã VietQR tối thiểu 2.000 VNĐ
            if (payosAmountToCollect > 0 && payosAmountToCollect < 2000) {
              walletUsedAmount = Math.max(0, totalAmount - 2000);
              payosAmountToCollect = totalAmount - walletUsedAmount;
            }
          }
        }

        const paidFullyByWallet = walletUsedAmount === totalAmount && payosAmountToCollect === 0;
        const orderCode = generatePayOSOrderCode();
        const resolvedRenterName =
          buyerName?.trim() ||
          sessionUser.name ||
          (sessionUser as any).email?.split("@")[0] ||
          "Khách thuê CLOOP";

        const isSelfPickupQuote =
          quoteServiceId === "self_pickup" ||
          quoteProviderName.toLowerCase().includes("trực tiếp") ||
          (shippingFee === 0 && quoteServiceId === "self_pickup");

        const shipmentProvider = isSelfPickupQuote
          ? "SELF_PICKUP"
          : quoteServiceId === "grab_instant" || quoteProviderName.toUpperCase().includes("GRAB")
          ? "GRAB"
          : quoteServiceId === "ghtk_standard" || quoteProviderName.toUpperCase().includes("GHTK")
          ? "GHTK"
          : "GHN";

        // 5c. Tạo Hợp đồng thuê (Order) với realUserId đã xác thực
        const rental = await tx.rentalHistory.create({
          data: {
            product_id: productId,
            renterId: realUserId,
            ownerId: product.userId,
            renter_name: resolvedRenterName,
            renter_phone: buyerPhone,
            owner_name: product.user?.name,
            shippingCode: isSelfPickupQuote ? "SELF_PICKUP" : undefined,
            start_date: normStartDate,
            end_date: normEndDate,
            status: "PENDING_APPROVAL"
          }
        });

        // 5d. Tạo Hóa Đơn (Invoice) với biểu phí hoa hồng sàn C2C chuẩn 12% (hoặc 0% nếu cấu hình FOUNDING_ZERO_FEE=true)
        const IS_FOUNDING_LAUNCH_0_FEE = process.env.FOUNDING_ZERO_FEE === "true";
        const platformFee = IS_FOUNDING_LAUNCH_0_FEE ? 0 : Math.floor(itemPrice * 0.12);

        const invoice = await tx.invoice.create({
          data: {
            rentalId: rental.id,
            amount: totalAmount,
            rentalFee: itemPrice,
            depositAmount: depositPrice,
            shippingFeeCollected: shippingFee,
            platformFee: platformFee,
            status: paidFullyByWallet ? "PAID" : "PENDING",
            orderCode: orderCode,
            payosStatus: paidFullyByWallet ? "WALLET_100" : undefined,
            paymentLinkId: paidFullyByWallet ? `WALLET_INTERNAL_${orderCode}` : undefined,
          }
        });

        // 5e. Nếu có dùng Số dư Ví (100% hoặc kết hợp QR), khấu trừ nguyên tử & đóng dấu HMAC-SHA256 vào Sổ cái
        if (walletUsedAmount > 0) {
          const deductRes = await tx.user.updateMany({
            where: {
              id: realUserId,
              walletBalance: { gte: walletUsedAmount },
            },
            data: {
              walletBalance: { decrement: walletUsedAmount },
            },
          });

          if (deductRes.count === 0) {
            throw new Error("Số dư khả dụng trong Ví không đủ để khấu trừ. Vui lòng tải lại trang và thử lại.");
          }

          const rolloverDesc = buildWalletRolloverOutDescription({
            userId: realUserId,
            invoiceId: invoice.id,
            orderCode,
            walletUsedAmount,
            payosAmountToCollect,
            sourceOrderCodes: verifiedSourceOrderCodes,
          });

          await tx.ledgerTransaction.create({
            data: {
              invoiceId: invoice.id,
              type: "WITHDRAWAL_HOLD",
              amount: -walletUsedAmount,
              status: "COMPLETED",
              description: rolloverDesc,
            },
          });
        }

        // 5f. Nếu Số dư Ví thanh toán đủ 100% đơn hàng -> Kích hoạt ngay tức thì không cần qua cổng PayOS
        if (paidFullyByWallet) {
          await tx.ledgerTransaction.create({
            data: {
              invoiceId: invoice.id,
              type: "DEPOSIT_IN",
              amount: totalAmount,
              status: "COMPLETED",
              description: `[WALLET_ROLLOVER_IN] Két bảo chứng nhận 100% từ Số dư Ví CLOOP - OrderCode ${orderCode}`,
            },
          });

          await tx.transactionHistory.create({
            data: {
              eventId: `WALLET_100_${orderCode}`,
              orderCode: BigInt(orderCode),
              invoiceId: invoice.id,
              amount: totalAmount,
              invoiceAmount: totalAmount,
              status: "PROCESSED",
              rawPayload: {
                paymentMethod: "WALLET_100",
                walletUsedAmount,
                payosAmountToCollect: 0,
                sourceOrderCodes: verifiedSourceOrderCodes,
              } as any,
              processedAt: new Date(),
            },
          });

          await tx.auditLog.create({
            data: {
              adminId: realUserId,
              action: "WALLET_INSTANT_CHECKOUT_100",
              targetType: "Invoice",
              targetId: invoice.id,
              beforeStatus: "PENDING",
              afterStatus: "PAID",
              metadata: JSON.stringify({
                orderCode,
                totalAmount,
                walletUsedAmount,
                sourceOrderCodes: verifiedSourceOrderCodes,
              }),
            },
          });
        }

        // 5g. Tạo bản ghi Vận đơn chiều đi (DELIVERY) ngay từ Checkout để lưu trọn vẹn địa chỉ nhận hàng của khách
        const pickupAddress = {
          name: product.user?.name || "Chủ tủ CLOOP",
          phone: "",
          province: product.province || "Hà Nội",
          districtId: product.districtId || undefined,
          wardCode: product.wardCode || undefined,
          specificAddress: product.specificAddress || product.province || "Hà Nội",
        };

        const deliveryAddress = {
          name: resolvedRenterName,
          recipientName: resolvedRenterName,
          phone: buyerPhone,
          province: buyerProvince || extractProvince(buyerAddress) || "Hà Nội",
          district: buyerDistrictName || "",
          districtId: buyerDistrictId || undefined,
          ward: buyerWardName || "",
          wardCode: buyerWardCode || undefined,
          specificAddress: buyerSpecificAddress || buyerAddress,
          fullAddress: buyerAddress,
          address: buyerAddress,
          shippingMode: isSelfPickupQuote ? "SELF_PICKUP" : "CLOOP_BOOK",
        };

        await tx.shipment.create({
          data: {
            rentalId: rental.id,
            direction: "DELIVERY",
            provider: shipmentProvider,
            status: "PENDING_BOOKING",
            clientOrderCode: `${rental.id.slice(0, 8).toUpperCase()}-DELIVERY`,
            shippingFeeCollected: shippingFee,
            pickupAddress,
            deliveryAddress,
            bookedByUserId: realUserId,
          }
        });

        return {
          invoice,
          rental,
          orderCode,
          walletUsedAmount,
          payosAmountToCollect,
          paidFullyByWallet,
        };
      });
    } catch (dbErr: unknown) {
      const message = dbErr instanceof Error ? dbErr.message : "Lỗi khóa dữ liệu";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // 5h. Nếu đơn hàng đã được thanh toán 100% bằng Số dư Ví -> Trả kết quả thành công tức thì!
    if (checkoutResult.paidFullyByWallet) {
      try {
        const { revalidatePath, revalidateTag } = require("next/cache");
        revalidateTag("products");
        revalidateTag("shop-products");
        revalidatePath("/shop");
        revalidatePath("/");
        revalidatePath("/app");
        revalidatePath("/my-closet/orders");
        revalidatePath("/my-closet/wallet");
      } catch (_) {}

      return NextResponse.json({
        success: true,
        paidFullyByWallet: true,
        orderCode: checkoutResult.orderCode,
        amount: 0,
        walletUsedAmount: checkoutResult.walletUsedAmount,
        totalAmount,
        description: `CLOOP VI ${checkoutResult.orderCode}`,
        trustTier: trustBreakdown.tier,
        trustScore: trustBreakdown.score,
        depositDiscount: depositCalculation.discountAmount,
        depositExplanation: depositCalculation.explanation,
      });
    }

    // 6. Tạo Link PayOS cho phần tiền còn lại (payosAmountToCollect)
    const YOUR_DOMAIN =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://cloop-sable.vercel.app";

    const payosBody = {
      orderCode: checkoutResult.orderCode,
      amount: checkoutResult.payosAmountToCollect,
      description: `CLOOP GD ${checkoutResult.orderCode}`,
      returnUrl: `${YOUR_DOMAIN}/payment/result?orderCode=${checkoutResult.orderCode}`,
      cancelUrl: `${YOUR_DOMAIN}/checkout/${productId}?cancel=true`
    };

    try {
      const paymentLinkRes = await payos.paymentRequests.create(payosBody);

      // Lưu lại paymentLinkId
      await prisma.invoice.update({
        where: { id: checkoutResult.invoice.id },
        data: { paymentLinkId: paymentLinkRes.paymentLinkId }
      });

      return NextResponse.json({ 
        success: true, 
        paidFullyByWallet: false,
        checkoutUrl: paymentLinkRes.checkoutUrl,
        orderCode: checkoutResult.orderCode,
        qrCode: paymentLinkRes.qrCode,
        accountNumber: paymentLinkRes.accountNumber,
        accountName: paymentLinkRes.accountName,
        bin: paymentLinkRes.bin,
        amount: checkoutResult.payosAmountToCollect,
        walletUsedAmount: checkoutResult.walletUsedAmount,
        totalAmount,
        description: paymentLinkRes.description || `CLOOP GD ${checkoutResult.orderCode}`,
        trustTier: trustBreakdown.tier,
        trustScore: trustBreakdown.score,
        depositDiscount: depositCalculation.discountAmount,
        depositExplanation: depositCalculation.explanation,
      });

    } catch (payosErr: unknown) {
      console.error("PayOS Error:", payosErr);
      // Thử hủy link thanh toán trên cổng PayOS (nếu timeout nhưng phía PayOS đã tạo)
      if (payos?.paymentRequests?.cancel && checkoutResult?.orderCode) {
        try {
          await payos.paymentRequests.cancel(
            checkoutResult.orderCode,
            "Rollback do lỗi khởi tạo liên kết thanh toán"
          );
        } catch (_) {}
      }

      // COMPENSATING ACTION: Dưới khóa Product, hoàn lại ngay số dư Ví đã tạm khóa (nếu có), hủy đơn PENDING và giải phóng Listing về AVAILABLE
      await prisma.$transaction(async (tx) => {
        if (typeof tx.$executeRaw === "function") {
          await tx.$executeRaw`SELECT id FROM products WHERE id = ${productId} FOR UPDATE`;
        }

        let invoiceCancelled = true;
        if (typeof tx.invoice.updateMany === "function") {
          const invCancelRes = await tx.invoice.updateMany({
            where: { id: checkoutResult!.invoice.id, status: "PENDING" },
            data: { status: "CANCELLED" },
          });
          invoiceCancelled = invCancelRes.count > 0;
        } else {
          await tx.invoice.update({
            where: { id: checkoutResult!.invoice.id },
            data: { status: "CANCELLED" },
          });
        }

        if (!invoiceCancelled) {
          return;
        }

        if (checkoutResult && checkoutResult.walletUsedAmount > 0) {
          await releasePendingWalletHoldForInvoice(tx, {
            invoiceId: checkoutResult.invoice.id,
            renterId: realUserId,
            orderCode: checkoutResult.orderCode,
            reason: "Hoàn tự động do lỗi khởi tạo mã QR PayOS",
          });
        }

        if (typeof tx.rentalHistory.updateMany === "function") {
          await tx.rentalHistory.updateMany({
            where: { id: checkoutResult!.rental.id, status: "PENDING_APPROVAL" },
            data: { status: "CANCELLED" },
          });
        } else {
          await tx.rentalHistory.update({
            where: { id: checkoutResult!.rental.id },
            data: { status: "CANCELLED" },
          });
        }

        const otherActiveOrder =
          typeof tx.rentalHistory.findFirst === "function"
            ? await tx.rentalHistory.findFirst({
                where: {
                  product_id: productId,
                  id: { not: checkoutResult!.rental.id },
                  isDeleted: false,
                  status: { notIn: ["CANCELLED", "LENDER_COMPLETED"] },
                },
                select: { id: true },
              })
            : null;

        if (!otherActiveOrder) {
          if (typeof tx.listing?.updateMany === "function") {
            await tx.listing.updateMany({
              where: {
                id: activeListing.id,
                productId: productId,
                status: "RESERVED",
              },
              data: { status: "AVAILABLE" },
            });
          } else if (typeof tx.listing?.update === "function") {
            await tx.listing.update({
              where: { id: activeListing.id },
              data: { status: "AVAILABLE" },
            });
          }
        }
      });

      return NextResponse.json({ error: "Lỗi kết nối cổng thanh toán. Đã hoàn lại số dư Ví và hủy lệnh đặt chỗ." }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error("Lỗi API Checkout:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
