"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/utils/supabase/server";
import { prisma } from "@/src/lib/prisma";
import { Logger } from "next-axiom";
import { calculateUserTrustScore, checkExposureLimit, calculateDynamicDeposit, getItemValuation } from "@/lib/trust-engine";
import { payos } from "@/src/utils/payos";
import { generatePayOSOrderCode } from "@/src/utils/order-code";

export async function createBooking({
  productId,
  startDate,
  endDate,
  renterName,
  renterPhone,
  ownerName,
  ownerPhone,
  isRental,
  shippingMode,
  shippingFee: clientShippingFee,
  fastTrackMode = false,
  deliveryAddress
}: {
  productId: string;
  startDate: string;
  endDate: string;
  renterName: string;
  renterPhone: string;
  ownerName: string;
  ownerPhone: string;
  isRental: boolean;
  shippingMode: "CLOOP_BOOK" | "SELF_BOOK";
  shippingFee?: number;
  fastTrackMode?: boolean;
  deliveryAddress?: any;
}) {
  const log = new Logger();
  
  log.info("Booking Process Started", { productId, isRental, renterPhone, shippingMode });

  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    let user = session?.user || null;
    if (!user) {
      const { data: { user: fetchedUser }, error: authError } = await supabase.auth.getUser();
      user = fetchedUser;
      if (authError || !user) {
        return { success: false, error: "Bạn cần đăng nhập bằng ID Xanh để thực hiện giao dịch này." };
      }
    }

    // 1. Fetch real prices and owner info from the server/DB, NEVER trust client inputs!
    const [product, renterUser] = await Promise.all([
      prisma.product.findUnique({
        where: { id: productId },
        include: {
          listings: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    if (!product || !product.listings || product.listings.length === 0) {
      return { success: false, error: "Sản phẩm không tồn tại hoặc đã bị gỡ." };
    }

    if (product.userId === user.id) {
      return { success: false, error: "Bạn không thể tự thuê sản phẩm của chính mình." };
    }

    const verifiedRenterName = renterUser?.name || renterName || "Khách thuê CLOOP";
    const verifiedRenterPhone = renterPhone || "";
    const verifiedOwnerName = product.user?.name || ownerName || "Chủ đồ CLOOP";
    const verifiedOwnerPhone = ownerPhone || "";

    // Lấy thông tin Listing đầu tiên
    const listing = product.listings[0];
    const basePrice = listing.basePrice || 0;
    const baseDeposit = listing.deposit || 0;
    const serviceFee = 0; // FREE LAUNCH
    
    // 🌟 CLOOP TRUST & RISK ENGINE SERVER-SIDE ENFORCEMENT
    const approxItemValue = getItemValuation(listing);
    const trustBreakdown = await calculateUserTrustScore(user.id);

    // Kiểm tra Hạn Mức Rủi Ro Tài Sản (Exposure Limit)
    const exposureCheck = await checkExposureLimit({
      userId: user.id,
      newItemValue: approxItemValue,
      trustTier: trustBreakdown.tier,
      fastTrackOverride: Boolean(fastTrackMode),
    });

    if (!exposureCheck.allowed) {
      return {
        success: false,
        error: exposureCheck.reason,
        requiresFastTrack: true,
      };
    }

    // Tính toán Tiền Cọc Động (Dynamic Deposit)
    const depositCalculation = calculateDynamicDeposit({
      baseDeposit: baseDeposit,
      itemValue: approxItemValue,
      trustTier: trustBreakdown.tier,
      isRental,
      fastTrackActive: Boolean(fastTrackMode),
    });

    const deposit = depositCalculation.finalDeposit;
    
    // Tính toán số ngày và tổng tiền trên Server đồng bộ 100% quy chuẩn Web
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = isRental && start && end ? Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1) : 0;
    
    let itemPrice = basePrice;
    if (isRental) {
      const pricingTiers = listing.pricing_tiers as Array<{ days: number; price: number }> | null;
      if (pricingTiers && Array.isArray(pricingTiers)) {
        const selectedTier = pricingTiers.find(t => t.days === days);
        if (selectedTier) {
          itemPrice = selectedTier.price;
        } else {
          itemPrice = Math.round(basePrice * days * (days >= 7 ? 0.7 : days >= 3 ? 0.85 : 1) / 1000) * 1000;
        }
      } else {
        itemPrice = Math.round(basePrice * days * (days >= 7 ? 0.7 : days >= 3 ? 0.85 : 1) / 1000) * 1000;
      }
    } else {
      itemPrice = listing.salePrice || basePrice || 0;
    }

    const subTotal = itemPrice;
    const shippingFee = shippingMode === "CLOOP_BOOK" ? (Number(clientShippingFee) || 0) : 0;
    const totalAmount = isRental 
      ? (subTotal + deposit + serviceFee + shippingFee)
      : (subTotal + serviceFee + shippingFee);

    // 🛡️ CHỐT CHẶN BẢO VỆ ĐƠN ĐÃ THANH TOÁN (Risk 1):
    // Tuyệt đối không mở khóa hoặc ghi đè những đơn đã thanh toán thành công (PAID) hoặc đang giao nhận
    const activePaidRental = await prisma.rentalHistory.findFirst({
      where: {
        product_id: productId,
        isDeleted: false,
        OR: [
          { status: { in: ["OWNER_PACKED", "LENDER_SHIPPED", "BORROWER_RECEIVED"] } },
          { invoice: { status: "PAID" } }
        ]
      }
    });

    if (activePaidRental) {
      return {
        success: false,
        error: "Sản phẩm hiện đang có đơn thuê đã thanh toán hoặc đang được giao nhận."
      };
    }

    // 🌟 1.1 IDEMPOTENCY & SOFT-LOCK AUTO-RELEASE (CHỐNG TỰ KHÓA CHÍNH MÌNH & ZOMBIE LOCK)
    const existingPendingRental = await prisma.rentalHistory.findFirst({
      where: {
        product_id: productId,
        status: "PENDING_APPROVAL",
        isDeleted: false,
        invoice: {
          status: "PENDING"
        }
      },
      orderBy: { createdAt: "desc" },
      include: {
        invoice: true
      }
    });

    if (existingPendingRental) {
      const orderAgeMs = Date.now() - new Date(existingPendingRental.createdAt).getTime();
      const isExpired = orderAgeMs > 15 * 60 * 1000; // Quá 15 phút chưa thanh toán
      const isSameUser = existingPendingRental.renterId === user.id || 
        (Boolean(verifiedRenterPhone) && existingPendingRental.renter_phone === verifiedRenterPhone);

      if (!isExpired && isSameUser) {
        // TRƯỜNG HỢP 1: CÙNG MỘT KHÁCH HÀNG BẤM LẠI DO RỚT MẠNG 4G / F5
        log.info("Idempotent booking hit: Resuming pending order", {
          rentalId: existingPendingRental.id,
          orderCode: existingPendingRental.invoice?.orderCode
        });

        const host = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://cloop-sable.vercel.app");
        const inv = existingPendingRental.invoice;
        let qrCode = null;
        let checkoutUrl = inv?.paymentLinkId ? `https://pay.payos.vn/web/${inv.paymentLinkId}` : null;
        let orderCodeNum = inv?.orderCode ? Number(inv.orderCode) : Number(existingPendingRental.id.slice(-6).toUpperCase());
        let accountNumber = "0335805562";
        let accountName = "CLOOP VIETNAM";
        let bin = "970422";
        let description = `CLOOP GD ${String(orderCodeNum).slice(-15)}`;

        if (payos && inv?.orderCode) {
          try {
            const payosInfo: any = await Promise.race([
              (payos as any).paymentRequests.get(inv.orderCode.toString()),
              new Promise((_, reject) => setTimeout(() => reject(new Error("PayOS get timeout")), 4000))
            ]);

            if (payosInfo) {
              if (payosInfo.status === "PAID") {
                return {
                  success: false,
                  error: "Đơn hàng này đã được thanh toán thành công trước đó."
                };
              }
              if (payosInfo.status === "PENDING") {
                if (payosInfo.checkoutUrl) checkoutUrl = payosInfo.checkoutUrl;
                if (payosInfo.qrCode) qrCode = payosInfo.qrCode;
                if (payosInfo.accountNumber) accountNumber = payosInfo.accountNumber;
                if (payosInfo.accountName) accountName = payosInfo.accountName;
                if (payosInfo.bin) bin = payosInfo.bin;
                if (payosInfo.description) description = payosInfo.description;
              } else {
                // Link cũ trên PayOS đã CANCELLED hoặc EXPIRED -> Đặt null để kích hoạt sinh freshOrderCode mới
                checkoutUrl = null;
                qrCode = null;
              }
            }
          } catch (payosCheckErr) {
            console.warn("PayOS check fallback notice:", payosCheckErr);
          }
        }

        // 🛡️ CHỐT CHẶN BẪY ĐƠN RỖNG & TRÁNH TRÙNG ORDER CODE (Risk 2):
        // Nếu đơn cũ chưa có link PayOS (hoặc link đã CANCELLED/EXPIRED), cấp mã orderCode MỚI để không bị PayOS báo "Mã đơn hàng đã tồn tại"
        if (payos && inv && (!checkoutUrl || !inv.paymentLinkId)) {
          try {
            const freshOrderCode = generatePayOSOrderCode();
            const recreatePayos: any = await Promise.race([
              (payos as any).paymentRequests.create({
                orderCode: freshOrderCode,
                amount: inv.amount || totalAmount,
                description: `CLOOP GD ${String(freshOrderCode).slice(-15)}`,
                returnUrl: `${host}/payment/result?orderCode=${freshOrderCode}`,
                cancelUrl: `${host}/app?cancel=true`
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error("PayOS create timeout")), 5000))
            ]);

            if (recreatePayos?.paymentLinkId) {
              checkoutUrl = recreatePayos.checkoutUrl || `https://pay.payos.vn/web/${recreatePayos.paymentLinkId}`;
              qrCode = recreatePayos.qrCode || null;
              accountNumber = recreatePayos.accountNumber || accountNumber;
              accountName = recreatePayos.accountName || accountName;
              bin = recreatePayos.bin || bin;
              orderCodeNum = freshOrderCode;
              description = `CLOOP GD ${String(freshOrderCode).slice(-15)}`;

              await prisma.invoice.update({
                where: { id: inv.id },
                data: {
                  orderCode: BigInt(freshOrderCode),
                  paymentLinkId: recreatePayos.paymentLinkId
                }
              });
            }
          } catch (recreateErr) {
            console.warn("Could not create missing PayOS link on resume:", recreateErr);
          }
        }

        // 🛡️ Nếu sau tất cả vẫn không có link PayOS hợp lệ -> Hủy đơn dở dang để luồng chảy tiếp tạo đơn mới tinh
        if (!checkoutUrl && !inv?.paymentLinkId) {
          log.warn("Resumed order had missing PayOS link, auto-cancelling to recreate cleanly", {
            rentalId: existingPendingRental.id
          });
          try {
            await prisma.$transaction([
              prisma.rentalHistory.update({
                where: { id: existingPendingRental.id },
                data: { status: "CANCELLED" }
              }),
              prisma.invoice.update({
                where: { id: existingPendingRental.invoice!.id },
                data: { status: "CANCELLED" }
              })
            ]);
          } catch (_) {}
          // Luồng sẽ tự động chạy tiếp xuống dưới để tạo đơn mới hoàn chỉnh
        } else {
          return {
            success: true,
            rentalId: existingPendingRental.id,
            orderCode: orderCodeNum,
            qrCode,
            checkoutUrl,
            accountNumber,
            accountName,
            bin,
            description,
            totalAmount: inv?.amount || totalAmount,
            depositAmount: inv?.depositAmount ?? deposit,
            rentalFee: inv?.rentalFee || subTotal,
            depositDiscount: depositCalculation.discountAmount,
            trustTier: trustBreakdown.tier,
            trustScore: trustBreakdown.score,
            depositExplanation: depositCalculation.explanation,
            message: "Khôi phục phiên thanh toán thành công!"
          };
        }
      } else if (isExpired) {
        // TRƯỜNG HỢP 2: ĐƠN GIỮ LỊCH ĐÃ QUÁ 15 PHÚT MÀ KHÔNG THANH TOÁN (ZOMBIE LOCK)
        log.info("Soft-lock TTL expired: Auto-releasing zombie lock", {
          rentalId: existingPendingRental.id,
          ageMinutes: Math.round(orderAgeMs / 60000)
        });

        try {
          await prisma.$transaction([
            prisma.rentalHistory.update({
              where: { id: existingPendingRental.id },
              data: { status: "CANCELLED" }
            }),
            prisma.invoice.update({
              where: { id: existingPendingRental.invoice!.id },
              data: { status: "CANCELLED" }
            }),
            prisma.listing.updateMany({
              where: { productId, status: "RESERVED" },
              data: { status: "AVAILABLE" }
            })
          ]);
        } catch (releaseErr) {
          console.warn("Auto-release zombie lock notice:", releaseErr);
        }
      } else {
        // TRƯỜNG HỢP 3: KHÁCH HÀNG KHÁC ĐANG TRONG 15 PHÚT GIỮ CHỖ
        return {
          success: false,
          error: "Sản phẩm hiện đang có khách hàng khác giữ lịch thanh toán. Vui lòng thử lại sau ít phút!"
        };
      }
    } else if (listing.status === "RESERVED") {
      // Listing bị kẹt RESERVED nhưng không có đơn PENDING nào -> Tự động đưa về AVAILABLE
      await prisma.listing.updateMany({
        where: { productId, status: "RESERVED" },
        data: { status: "AVAILABLE" }
      });
    } else if (listing.status === "RENTED" || listing.status === "SOLD") {
      return {
        success: false,
        error: `Sản phẩm hiện đã được ${listing.status === "RENTED" ? "thuê" : "bán"}.`
      };
    }

    // 2. Chặn trùng lịch (Overlap check) trên Server (Sử dụng Prisma Transaction để an toàn)
    const txResult = await prisma.$transaction(async (tx) => {
      // 🚀 BƯỚC KHÓA BẢNG PESSIMISTIC LOCK: NGĂN CHẶN DOUBLE BOOKING
      // Gọi lệnh này TRƯỚC khi thực hiện bất kỳ lệnh check hay create nào!
      try {
        await tx.$queryRaw`SELECT id FROM "products" WHERE id = ${productId} FOR UPDATE NOWAIT;`;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const code = typeof err === "object" && err && "code" in err ? String((err as Record<string, unknown>).code) : "";
        // Lỗi P2010 là Raw Query Error trong Prisma. Mã lỗi 55P03 trong Postgres nghĩa là "could not obtain lock".
        if (code === "P2010" || message.includes("could not obtain lock") || message.includes("NOWAIT")) {
          throw new Error("Rất tiếc, một khách hàng khác đang thanh toán món đồ này. Vui lòng thử lại sau vài giây!");
        }
        throw err;
      }

      if (isRental) {
        const overlapping = await tx.rentalHistory.findFirst({
          where: {
            product_id: productId,
            status: { in: ["BORROWER_RECEIVED", "LENDER_SHIPPED", "OWNER_PACKED"] },
            start_date: { lte: end },
            end_date: { gte: start },
          }
        });

        if (overlapping) {
          throw new Error("Rất tiếc, sản phẩm đã có người đặt thuê trong khoảng thời gian này. Vui lòng chọn ngày khác!");
        }
      }

      // 3. Tạo mã PayOS OrderCode an toàn
      const orderCode = generatePayOSOrderCode();

      // 4. Tạo Hợp đồng thuê (RentalHistory)
      const rental = await tx.rentalHistory.create({
        data: {
          product_id: productId,
          renterId: user.id, // Lấy ID an toàn từ SSR Session
          ownerId: product.userId,
          renter_name: verifiedRenterName,
          renter_phone: verifiedRenterPhone,
          owner_name: verifiedOwnerName,
          owner_phone: verifiedOwnerPhone,
          start_date: isRental ? start : new Date(),
          end_date: isRental ? end : new Date(),
          status: "PENDING_APPROVAL",
        }
      });

      // Tạo Invoice đính kèm chuẩn quy chuẩn kế toán & PayOS OrderCode
      const invoice = await tx.invoice.create({
        data: {
          rentalId: rental.id,
          amount: totalAmount,
          rentalFee: subTotal,
          depositAmount: deposit,
          shippingFeeCollected: shippingFee,
          platformFee: serviceFee,
          status: "PENDING",
          orderCode: BigInt(orderCode)
        }
      });

      // 4.1. Tạo bản ghi Shipment GHN và lưu địa chỉ chuẩn hóa
      if (deliveryAddress) {
        try {
          const provName = deliveryAddress.province || deliveryAddress.provinceName || "";
          const distName = deliveryAddress.district || deliveryAddress.districtName || "";
          const wardName = deliveryAddress.ward || deliveryAddress.wardName || "";
          const addrDetail = deliveryAddress.address || deliveryAddress.addressDetail || deliveryAddress.specificAddress || "";
          const nt = deliveryAddress.note || deliveryAddress.addressNote || "";
          const ghnParts = [addrDetail, wardName, distName, provName].filter(Boolean);
          const fullAddr = deliveryAddress.fullAddress || (ghnParts.join(", ") + (nt ? ` (Ghi chú: ${nt})` : ""));
          const locStr = [distName, provName].filter(Boolean).join(", ") || provName || "";

          await tx.shipment.create({
            data: {
              rentalId: rental.id,
              direction: "DELIVERY",
              provider: "GHN",
              status: "PENDING_BOOKING",
              shippingFeeCollected: shippingFee,
              deliveryAddress: {
                ...deliveryAddress,
                recipientName: verifiedRenterName,
                phone: verifiedRenterPhone,
                fullAddress: fullAddr
              },
              pickupAddress: {
                province: product.province || "Hà Nội",
                districtId: product.districtId || null,
                wardCode: product.wardCode || null,
                address: product.specificAddress || "",
                phone: verifiedOwnerPhone,
                name: verifiedOwnerName
              }
            }
          });

          // Tự động lưu làm địa chỉ chính chủ của tài khoản vào auth.users
          await tx.$executeRawUnsafe(
            `UPDATE auth.users SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || $1::jsonb WHERE id = $2::uuid;`,
            JSON.stringify({
              province_id: deliveryAddress.provinceId ? Number(deliveryAddress.provinceId) : null,
              district_id: deliveryAddress.districtId ? Number(deliveryAddress.districtId) : null,
              ward_code: deliveryAddress.wardCode ? String(deliveryAddress.wardCode) : null,
              province: provName,
              district: distName,
              ward: wardName,
              specific_address: addrDetail,
              address_note: nt,
              pickup_address: fullAddr,
              full_address: fullAddr,
              location: locStr,
              phone: verifiedRenterPhone || undefined,
              name: verifiedRenterName || undefined
            }),
            user.id
          );
        } catch (shipErr) {
          console.warn("Shipment and user meta sync notice:", shipErr);
        }
      }

      // 5. Đổi trạng thái (State Machine) sang RESERVED
      await tx.listing.updateMany({
        where: {
          productId: productId,
          listingType: isRental ? "RENT" : "SELL",
          status: "AVAILABLE"
        },
        data: {
          status: "RESERVED"
        }
      });
      
      // Ghi log Nghiệp vụ
      log.info("Booking Created Successfully", { rentalId: rental.id, amount: totalAmount, shippingMode, orderCode });

      return { 
        rentalId: rental.id, 
        invoiceId: invoice.id,
        orderCode,
      };
    });

    // 6. Tạo Link PayOS ngoài Transaction Database (Bọc Timeout 6s & Rollback an toàn)
    const host = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://cloop-sable.vercel.app");
    let paymentLinkRes: any = null;

    if (payos) {
      try {
        const payosCreatePromise = (payos as any).paymentRequests.create({
          orderCode: txResult.orderCode,
          amount: totalAmount,
          description: `CLOOP GD ${String(txResult.orderCode).slice(-15)}`,
          returnUrl: `${host}/payment/result?orderCode=${txResult.orderCode}`,
          cancelUrl: `${host}/app?cancel=true`
        });

        const payosTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("PayOS API Timeout (quá 6s không phản hồi)")), 6000)
        );

        paymentLinkRes = await Promise.race([payosCreatePromise, payosTimeout]);

        if (paymentLinkRes?.paymentLinkId) {
          await prisma.invoice.update({
            where: { id: txResult.invoiceId },
            data: { paymentLinkId: paymentLinkRes.paymentLinkId }
          });
        }
      } catch (payosErr: any) {
        console.error("PayOS payment link creation failed, auto-rolling back reservation:", payosErr?.message || payosErr);

        // Tự động Rollback trạng thái Listing về AVAILABLE và hủy đơn để không bị kẹt RESERVED
        try {
          await prisma.$transaction([
            prisma.listing.updateMany({
              where: { productId, status: "RESERVED" },
              data: { status: "AVAILABLE" }
            }),
            prisma.rentalHistory.update({
              where: { id: txResult.rentalId },
              data: { status: "CANCELLED" }
            }),
            prisma.invoice.update({
              where: { id: txResult.invoiceId },
              data: { status: "CANCELLED" }
            })
          ]);
        } catch (rollbackErr) {
          console.error("Rollback failed:", rollbackErr);
        }

        return {
          success: false,
          error: "Cổng thanh toán PayOS đang bận hoặc quá thời gian phản hồi (quá 6s). Trạng thái sản phẩm đã được mở lại an toàn, vui lòng bấm thử lại!"
        };
      }
    }

    return { 
      success: true, 
      rentalId: txResult.rentalId,
      orderCode: txResult.orderCode,
      qrCode: paymentLinkRes?.qrCode || null,
      checkoutUrl: paymentLinkRes?.checkoutUrl || null,
      accountNumber: paymentLinkRes?.accountNumber || "0335805562",
      accountName: paymentLinkRes?.accountName || "CLOOP VIETNAM",
      bin: paymentLinkRes?.bin || "970422",
      description: paymentLinkRes?.description || `CLOOP GD ${String(txResult.orderCode).slice(-15)}`,
      totalAmount,
      depositAmount: deposit,
      rentalFee: subTotal,
      depositDiscount: depositCalculation.discountAmount,
      trustTier: trustBreakdown.tier,
      trustScore: trustBreakdown.score,
      depositExplanation: depositCalculation.explanation,
      message: "Khởi tạo đơn hàng PayOS thành công!" 
    };

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi hệ thống khi tạo đơn hàng.";
    console.error("SERVER ACTION ERROR:", err);
    return { success: false, error: message };
  }
}

export async function confirmManualTransfer(_rentalId: string) {
  return {
    success: false,
    error: "Phương thức tự báo chuyển khoản đã ngừng hoạt động. Hệ thống CLOOP sử dụng cổng PayOS để tự động xác minh giao dịch thực tế."
  };
}
