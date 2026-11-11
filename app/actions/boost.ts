"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/auth";
import { payos } from "@/lib/payos";
import { revalidatePath } from "next/cache";
import { generatePayOSOrderCode } from "@/src/utils/order-code";
import { clearShopMemoryCache } from "@/app/actions/product";

// 🔒 KHÓA TUẦN TỰ THEO SẢN PHẨM (PER-PRODUCT MUTEX + DB ROW LOCK)
// Đảm bảo mọi luồng Đẩy Top (Ví tiền, Điểm Lá, VietQR Polling, Webhook) cho cùng 1 sản phẩm
// đều đọc boostExpiresAt mới nhất và cộng dồn chính xác 100% thời hạn mà không ghi đè lên nhau.
const productBoostMutex = new Map<string, Promise<any>>();

export async function withProductBoostLock<T>(productId: string, fn: () => Promise<T>): Promise<T> {
  const previous = productBoostMutex.get(productId) || Promise.resolve();
  let releaseLock!: () => void;
  const current = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  const chained = previous.then(() => current, () => current);
  productBoostMutex.set(productId, chained);

  await previous.catch(() => {});
  try {
    return await fn();
  } finally {
    releaseLock();
    if (productBoostMutex.get(productId) === chained) {
      productBoostMutex.delete(productId);
    }
  }
}

export async function lockAndExtendProductBoostInTx(
  tx: any,
  params: {
    productId: string;
    expectedOwnerId: string;
    hours: number;
    coins: number;
    highlight?: boolean;
  }
): Promise<{ title: string; computedExpiresAt: Date; newBoostScore: number }> {
  const { productId, expectedOwnerId, hours, coins, highlight } = params;

  if (typeof tx.$executeRaw === "function") {
    await tx.$executeRaw`SELECT id FROM "products" WHERE id = ${productId} FOR UPDATE`;
  }

  const currentProduct = await tx.product.findUnique({
    where: { id: productId },
    select: { id: true, userId: true, isDeleted: true, title: true, boostExpiresAt: true, boostScore: true }
  });

  if (!currentProduct || currentProduct.isDeleted || currentProduct.userId !== expectedOwnerId) {
    throw new Error("INVALID_BOOST_TARGET");
  }

  const now = new Date();
  const currentExpiry =
    currentProduct.boostExpiresAt && currentProduct.boostExpiresAt > now
      ? currentProduct.boostExpiresAt
      : now;

  const computedExpiresAt = new Date(currentExpiry.getTime() + hours * 3600 * 1000);

  const updatedProd = await tx.product.update({
    where: { id: productId },
    data: {
      boostExpiresAt: computedExpiresAt,
      lastBumpedAt: now,
      status: "ON_MARKET",
      ...(highlight ? { isHighlighted: true } : {}),
      boostScore: { increment: coins }
    },
    select: { boostScore: true }
  });

  await tx.listing.updateMany({
    where: { productId, isDeleted: false, status: "HIDDEN" },
    data: { status: "AVAILABLE" }
  });

  return {
    title: currentProduct.title,
    computedExpiresAt,
    newBoostScore: updatedProd.boostScore
  };
}

// ==========================================
// 1. TÍNH GIÁ ĐẨY BÀI (HOURS -> VND & LÁ)
// Giai đoạn đầu: 24h = 10.000đ, 1h lẻ = 500đ
// ==========================================
export async function calculateBoostPriceAction(hours: number) {
  return calculateBoostPrice(hours);
}

function calculateBoostPrice(hours: number): {
  safeHours: number;
  amountVnd: number;
  coins: number;
  label: string;
  discountVnd: number;
} {
  const numericHours = Number(hours);
  const safeHours = Number.isFinite(numericHours)
    ? Math.min(720, Math.max(1, Math.round(numericHours)))
    : 24;

  if (safeHours === 24) {
    return {
      safeHours: 24,
      amountVnd: 10000,
      coins: 20,
      label: "Gói 24h (1 Ngày)",
      discountVnd: 2000 // 24 * 500 = 12.000 -> 10.000
    };
  }

  if (safeHours === 72) {
    return {
      safeHours: 72,
      amountVnd: 25000,
      coins: 50,
      label: "Gói 3 Ngày (72h)",
      discountVnd: 11000 // 72 * 500 = 36.000 -> 25.000
    };
  }

  if (safeHours === 168) {
    return {
      safeHours: 168,
      amountVnd: 50000,
      coins: 100,
      label: "Gói 7 Ngày (168h)",
      discountVnd: 34000 // 168 * 500 = 84.000 -> 50.000
    };
  }

  // Tự nhập số giờ tùy ý: 1 giờ = 500đ / 1 Lá
  const amountVnd = safeHours * 500;
  const coins = safeHours; // 1 giờ = 1 Lá

  return {
    safeHours,
    amountVnd,
    coins,
    label: `${safeHours} Giờ`,
    discountVnd: 0
  };
}

// ==========================================
// 2. LẤY DANH SÁCH BÀI ĐĂNG CỦA TÔI ĐỂ CHỌN ĐẨY
// ==========================================
export async function getMyClosetItemsForBoostAction(_clientUserId?: string) {
  try {
    let authUser: any = null;
    try {
      authUser = await requireUser();
    } catch {
      return { success: false, error: "Vui lòng đăng nhập" };
    }

    const userId = authUser.id;

    const [user, rawProducts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, cloopCoins: true, walletBalance: true }
      }),
      prisma.product.findMany({
        where: { userId, isDeleted: false },
        orderBy: [
          { lastBumpedAt: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" }
        ],
        include: {
          images: {
            select: { url: true, isPrimary: true },
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }]
          },
          listings: {
            where: { isDeleted: false }
          }
        }
      })
    ]);

    const now = new Date();
    const items = rawProducts.map((p) => {
      const rentListing = p.listings.find((l) => l.listingType === "RENT");
      const sellListing = p.listings.find((l) => l.listingType === "SELL" || l.listingType === "RECYCLE");
      const primaryImg = p.images[0]?.url || "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790530424/cloop_mobile_closet/pt4xccwmvrjsrnhrgnib.png";

      const isBoostActive = Boolean(p.boostExpiresAt && new Date(p.boostExpiresAt) > now);
      let boostRemainingHours = 0;
      if (isBoostActive && p.boostExpiresAt) {
        boostRemainingHours = Math.max(1, Math.round((new Date(p.boostExpiresAt).getTime() - now.getTime()) / (3600 * 1000)));
      }

      return {
        id: p.id,
        title: p.title,
        size: p.size || "M",
        image: primaryImg,
        rentalPrice: rentListing ? Number(rentListing.basePrice) : 0,
        salePrice: sellListing ? Number(sellListing.basePrice) : 0,
        boostExpiresAt: p.boostExpiresAt ? p.boostExpiresAt.toISOString() : null,
        isBoostActive,
        boostRemainingHours,
        boostScore: p.boostScore || 0,
        lastBumpedAt: p.lastBumpedAt ? p.lastBumpedAt.toISOString() : null
      };
    });

    return {
      success: true,
      coins: user?.cloopCoins || 0,
      walletBalance: user?.walletBalance || 0,
      items
    };
  } catch (err: any) {
    console.error("Lỗi getMyClosetItemsForBoostAction:", err);
    return { success: false, error: "Không thể tải danh sách sản phẩm." };
  }
}

// ==========================================
// 3. TẠO THANH TOÁN VIETQR PAYOS TỰ ĐỘNG (Tiêu chuẩn)
// ==========================================
export async function createBoostPayOSPaymentAction({
  productId,
  hours,
  clientUserId: _clientUserId
}: {
  productId: string;
  hours: number;
  clientUserId?: string;
}) {
  try {
    if (!productId) {
      return { success: false, error: "Chưa chọn sản phẩm cần đẩy." };
    }

    let authUser: any = null;
    try {
      authUser = await requireUser();
    } catch {
      return { success: false, error: "Vui lòng đăng nhập để tiếp tục." };
    }

    const userId = authUser.id;

    // Kiểm tra quyền sở hữu sản phẩm
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, userId: true, title: true, boostExpiresAt: true }
    });

    if (!product || product.userId !== userId) {
      return { success: false, error: "Bạn chỉ có thể đẩy sản phẩm trong tủ đồ của bạn." };
    }

    const { safeHours, amountVnd, coins, label } = calculateBoostPrice(hours);
    const orderCode = generatePayOSOrderCode();

    // Tạo bản ghi CoinTopUp PENDING trong DB
    const topUp = await prisma.coinTopUp.create({
      data: {
        userId,
        packageCode: `BOOST_${safeHours}H`,
        orderCode: BigInt(orderCode),
        amountVnd,
        baseCoins: coins,
        bonusCoins: 0,
        totalCoins: coins,
        status: "PENDING",
        rawPayload: {
          type: "PRODUCT_BOOST",
          productId: product.id,
          hours: safeHours,
          coins,
          productTitle: product.title
        }
      }
    });

    const DOMAIN =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://cloop-sable.vercel.app");

    // PayOS mô tả tối đa 25 ký tự không dấu
    const shortDesc = `DAY TOP ${String(orderCode).slice(-6)}`;

    let paymentLink: any = null;
    if (payos) {
      try {
        paymentLink = await payos.paymentRequests.create({
          orderCode,
          amount: amountVnd,
          description: shortDesc,
          returnUrl: `${DOMAIN}/my-closet/items?status=boost_success&orderCode=${orderCode}`,
          cancelUrl: `${DOMAIN}/my-closet/items?status=boost_cancel&orderCode=${orderCode}`
        });

        if (paymentLink?.paymentLinkId) {
          await prisma.coinTopUp.update({
            where: { id: topUp.id },
            data: { paymentLinkId: paymentLink.paymentLinkId }
          });
        }
      } catch (payosError: any) {
        console.warn("PayOS create link warning:", payosError);
      }
    }

    // Fallback thông tin VietQR ngân hàng thụ hưởng (970416 - VietinBank hoặc cổng thanh toán)
    const accountNumber = paymentLink?.accountNumber || "LOCCASS000340028";
    const accountName = paymentLink?.accountName || "CLOOP VIETNAM";
    const bin = paymentLink?.bin || "970416";
    const vietqrUrl = `https://img.vietqr.io/image/${bin}-${accountNumber}-compact2.png?amount=${amountVnd}&addInfo=${encodeURIComponent(shortDesc)}&accountName=${encodeURIComponent(accountName)}`;

    return {
      success: true,
      orderCode,
      amountVnd,
      hours,
      label,
      productTitle: product.title,
      accountNumber,
      accountName,
      bin,
      qrCodeUrl: vietqrUrl,
      rawQrString: paymentLink?.qrCode || "",
      description: shortDesc,
      checkoutUrl: paymentLink?.checkoutUrl || ""
    };
  } catch (err: any) {
    console.error("Lỗi createBoostPayOSPaymentAction:", err);
    return { success: false, error: "Không thể khởi tạo mã thanh toán." };
  }
}

// ==========================================
// 3.5. ĐẨY BÀI TRỰC TIẾP TỪ VÍ TIỀN CLOOP (1 CHẠM TỨC THÌ)
// ==========================================
export async function boostWithWalletBalanceAction({
  productId,
  hours,
  clientUserId: _clientUserId
}: {
  productId: string;
  hours: number;
  clientUserId?: string;
}) {
  try {
    if (!productId) {
      return { success: false, error: "Chưa chọn sản phẩm cần đẩy." };
    }

    let authUser: any = null;
    try {
      authUser = await requireUser();
    } catch {
      return { success: false, error: "Vui lòng đăng nhập để tiếp tục." };
    }

    const userId = authUser.id;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, userId: true, title: true, boostExpiresAt: true }
    });

    if (!product || product.userId !== userId) {
      return { success: false, error: "Bạn chỉ có thể đẩy sản phẩm trong tủ đồ của mình." };
    }

    const { safeHours, amountVnd, coins } = calculateBoostPrice(hours);

    const result = await withProductBoostLock(productId, () =>
      prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { walletBalance: true }
        });

        if (!user || user.walletBalance < amountVnd) {
          throw new Error(
            `Số dư ví (${(user?.walletBalance || 0).toLocaleString("vi-VN")}đ) không đủ ${amountVnd.toLocaleString("vi-VN")}đ.`
          );
        }

        // Trừ tiền ví nguyên tử (Atomic Update chống Race Condition)
        const chargeResult = await tx.user.updateMany({
          where: {
            id: userId,
            walletBalance: { gte: amountVnd }
          },
          data: {
            walletBalance: { decrement: amountVnd }
          }
        });

        if (chargeResult.count === 0) {
          throw new Error("Số dư không đủ hoặc giao dịch bị trùng lặp.");
        }

        const updatedUser = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { walletBalance: true }
        });

        const boostOut = await lockAndExtendProductBoostInTx(tx, {
          productId,
          expectedOwnerId: userId,
          hours: safeHours,
          coins
        });

        return {
          newWalletBalance: updatedUser.walletBalance,
          boostExpiresAt: boostOut.computedExpiresAt,
          boostScore: boostOut.newBoostScore,
          addedCoins: coins
        };
      })
    );

    try {
      await clearShopMemoryCache();
      revalidatePath("/shop");
      revalidatePath("/my-closet");
      revalidatePath("/my-closet/wallet");
      revalidatePath("/app");
      revalidatePath("/");
    } catch (_) {}

    return {
      success: true,
      newWalletBalance: result.newWalletBalance,
      boostExpiresAt: result.boostExpiresAt.toISOString(),
      boostScore: result.boostScore,
      addedCoins: result.addedCoins,
      message: `Đã kích hoạt Đẩy Top thành công cho "${product.title}" (+${coins} Lá tích lũy đua Top)!`
    };
  } catch (err: any) {
    console.error("Lỗi boostWithWalletBalanceAction:", err);
    return { success: false, error: err.message || "Giao dịch không thành công." };
  }
}

// ==========================================
// 4. KIỂM TRA TRẠNG THÁI VIETQR TỰ ĐỘNG (ACTIVE POLLING 1.5s)
// Tự động kích hoạt Đẩy Top ngay khi phát hiện PAID
// ==========================================
export async function checkBoostPaymentStatusAction(orderCode: number) {
  try {
    let authUser: any = null;
    try {
      authUser = await requireUser();
    } catch {
      return { success: false, status: "UNAUTHORIZED" };
    }

    const topUp = await prisma.coinTopUp.findUnique({
      where: { orderCode: BigInt(orderCode) },
      include: { user: { select: { id: true, cloopCoins: true } } }
    });

    if (!topUp) {
      return { success: false, status: "NOT_FOUND" };
    }

    if (topUp.userId !== authUser.id && authUser.role !== "ADMIN") {
      return { success: false, status: "FORBIDDEN" };
    }

    const payload = (topUp.rawPayload as any) || {};
    const isBoostFlow =
      (typeof topUp.packageCode === "string" && topUp.packageCode.startsWith("BOOST_")) ||
      payload.type === "PRODUCT_BOOST";
    const productId = typeof payload.productId === "string" ? payload.productId.trim() : "";

    // 🛡️ CHỐT CHẶN REVERSE CROSS-FLOW EXPLOIT:
    // Bắt buộc bản ghi phải là gói Đẩy Top (BOOST_* / PRODUCT_BOOST) và có productId hợp lệ.
    // Tuyệt đối không tiêu thụ (đánh dấu PAID) bản ghi nạp Lá thường (PACK_*) hoặc KYC_* tại đây!
    if (!isBoostFlow || !productId) {
      return { success: false, status: "INVALID_FLOW" };
    }

    const { safeHours: hours, coins: calculatedCoins } = calculateBoostPrice(Number(payload.hours || 24));
    const coins = Number.isFinite(Number(payload.coins)) && Number(payload.coins) > 0
      ? Math.round(Number(payload.coins))
      : calculatedCoins;

    // Nếu đã PAID từ trước (do Webhook xử lý)
    if (topUp.status === "PAID") {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { boostExpiresAt: true, title: true, boostScore: true }
      });

      return {
        success: true,
        status: "PAID",
        boostExpiresAt: product?.boostExpiresAt ? product.boostExpiresAt.toISOString() : null,
        boostScore: product?.boostScore || 0,
        addedCoins: coins,
        productTitle: product?.title || ""
      };
    }

    // Nếu vẫn PENDING -> Kiểm tra trực tiếp với cổng PayOS
    if (topUp.status === "PENDING" && payos) {
      try {
        const payosInfo = await payos.paymentRequests.get(orderCode);
        const expectedAmount = topUp.amountVnd;
        if (
          payosInfo &&
          payosInfo.status === "PAID" &&
          Number(payosInfo.amountPaid ?? expectedAmount) >= expectedAmount
        ) {
          // Thực hiện kích hoạt nguyên tử qua Khóa Sản Phẩm + Transaction
          const txResult = await withProductBoostLock(productId, () =>
            prisma.$transaction(async (tx) => {
              // Khóa sản phẩm, kiểm tra chủ sở hữu & cộng dồn boostExpiresAt mới nhất
              const boostOut = await lockAndExtendProductBoostInTx(tx, {
                productId,
                expectedOwnerId: topUp.userId,
                hours,
                coins
              });

              // Chốt chặn nguyên tử tránh race condition cùng 1 mã đơn
              const updateCount = await tx.coinTopUp.updateMany({
                where: { id: topUp.id, status: "PENDING" },
                data: { status: "PAID", paidAt: new Date() }
              });

              if (updateCount.count === 0) {
                throw new Error("ALREADY_CONSUMED_CONCURRENTLY");
              }

              await tx.coinLedgerEntry.create({
                data: {
                  userId: topUp.userId,
                  topUpId: topUp.id,
                  type: "TOP_UP_IN",
                  amount: coins,
                  balanceAfter: (topUp.user?.cloopCoins || 0) + coins,
                  description: `Nạp trực tiếp VietQR cho gói Đẩy Top (${topUp.packageCode})`,
                  metadata: {
                    productId,
                    hours,
                    coins,
                    orderCode,
                    amountVnd: topUp.amountVnd
                  }
                }
              });

              await tx.coinLedgerEntry.create({
                data: {
                  userId: topUp.userId,
                  topUpId: topUp.id,
                  type: "BOOST_SPEND",
                  amount: -coins,
                  balanceAfter: topUp.user?.cloopCoins || 0,
                  description: `Đẩy Top bài viết "${boostOut.title}" (+${hours}h, +${coins} Lá đua Top qua VietQR)`,
                  metadata: {
                    productId,
                    hours,
                    coins,
                    orderCode,
                    amountVnd: topUp.amountVnd
                  }
                }
              });

              return boostOut;
            })
          );

          try {
            await clearShopMemoryCache();
            revalidatePath("/shop");
            revalidatePath("/my-closet");
            revalidatePath("/app");
            revalidatePath("/");
          } catch (_) {}

          return {
            success: true,
            status: "PAID",
            boostExpiresAt: txResult?.computedExpiresAt ? txResult.computedExpiresAt.toISOString() : null,
            boostScore: txResult?.newBoostScore || 0,
            addedCoins: coins,
            productTitle: payload.productTitle || ""
          };
        }
      } catch (checkErr) {
        console.warn("Lỗi kiểm tra PayOS:", checkErr);
      }
    }

    return {
      success: true,
      status: topUp.status
    };
  } catch (err: any) {
    console.error("Lỗi checkBoostPaymentStatusAction:", err);
    return { success: false, status: "ERROR" };
  }
}

// ==========================================
// 5. ĐẨY BÀI BẰNG ĐIỂM LÁ SẴN CÓ TRONG VÍ
// ==========================================
export async function boostWithCoinsAction({
  productId,
  hours,
  clientUserId: _clientUserId
}: {
  productId: string;
  hours: number;
  clientUserId?: string;
}) {
  try {
    if (!productId) {
      return { success: false, error: "Chưa chọn sản phẩm cần đẩy." };
    }

    let authUser: any = null;
    try {
      authUser = await requireUser();
    } catch {
      return { success: false, error: "Vui lòng đăng nhập để sử dụng tính năng." };
    }

    const userId = authUser.id;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, userId: true, title: true, boostExpiresAt: true }
    });

    if (!product || product.userId !== userId) {
      return { success: false, error: "Bạn chỉ có thể đẩy sản phẩm trong tủ đồ của chính mình." };
    }

    const { safeHours, coins: requiredCoins } = calculateBoostPrice(hours);

    const result = await withProductBoostLock(productId, () =>
      prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { cloopCoins: true }
        });

        if (!user || user.cloopCoins < requiredCoins) {
          throw new Error(`Bạn cần ${requiredCoins} Lá. Số dư hiện tại: ${user?.cloopCoins || 0} Lá.`);
        }

        // 🛡️ CHỐNG RACE CONDITION DOUBLE-SPEND: Trừ Lá nguyên tử có điều kiện cloopCoins >= requiredCoins
        const coinCharge = await tx.user.updateMany({
          where: {
            id: userId,
            cloopCoins: { gte: requiredCoins }
          },
          data: {
            cloopCoins: { decrement: requiredCoins }
          }
        });

        if (coinCharge.count === 0) {
          throw new Error("Số dư Lá không đủ hoặc giao dịch bị trùng lặp.");
        }

        const updatedUser = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { cloopCoins: true }
        });

        const boostOut = await lockAndExtendProductBoostInTx(tx, {
          productId,
          expectedOwnerId: userId,
          hours: safeHours,
          coins: requiredCoins
        });

        await tx.coinLedgerEntry.create({
          data: {
            userId,
            type: "BOOST_SPEND",
            amount: -requiredCoins,
            balanceAfter: updatedUser.cloopCoins,
            description: `Đẩy Top sản phẩm "${boostOut.title}" (${safeHours} giờ, +${requiredCoins} Lá tích lũy)`,
            metadata: {
              productId,
              hours: safeHours,
              costCoins: requiredCoins
            }
          }
        });

        return {
          newBalance: updatedUser.cloopCoins,
          boostExpiresAt: boostOut.computedExpiresAt,
          boostScore: boostOut.newBoostScore,
          addedCoins: requiredCoins
        };
      })
    );

    try {
      await clearShopMemoryCache();
      revalidatePath("/shop");
      revalidatePath("/my-closet");
      revalidatePath("/my-closet/wallet");
      revalidatePath("/app");
      revalidatePath("/");
    } catch (_) {}

    return {
      success: true,
      newBalance: result.newBalance,
      boostExpiresAt: result.boostExpiresAt.toISOString(),
      boostScore: result.boostScore,
      addedCoins: result.addedCoins,
      message: `Đã kích hoạt Đẩy Top thành công cho "${product.title}" (+${requiredCoins} Lá tích lũy đua Top)!`
    };
  } catch (err: any) {
    console.error("Lỗi boostWithCoinsAction:", err);
    return { success: false, error: err.message || "Giao dịch không thành công." };
  }
}

// ==========================================
// 6. TƯƠNG THÍCH NGƯỢC HÀM CŨ (PURCHASE BOOST)
// ==========================================
export async function purchaseBoostPackage(
  productId: string,
  _requestedUserId?: string,
  packageType: "BOOST" | "HIGHLIGHT" = "BOOST"
) {
  if (packageType === "BOOST") {
    return boostWithCoinsAction({ productId, hours: 24 });
  }

  // Highlight hào quang vĩnh viễn (300 Lá)
  try {
    let authUser: any = null;
    try {
      authUser = await requireUser();
    } catch {
      return { success: false, error: "Vui lòng đăng nhập" };
    }
    const userId = authUser.id;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, userId: true }
    });
    if (!product || product.userId !== userId) {
      return { success: false, error: "Bạn chỉ có thể kích hoạt Hào Quang cho sản phẩm của chính mình." };
    }

    const cost = 300;
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { cloopCoins: true }
      });
      if (!user || user.cloopCoins < cost) {
        throw new Error(`Cần ${cost} Lá để kích hoạt.`);
      }

      const coinCharge = await tx.user.updateMany({
        where: { id: userId, cloopCoins: { gte: cost } },
        data: { cloopCoins: { decrement: cost } }
      });
      if (coinCharge.count === 0) {
        throw new Error(`Cần ${cost} Lá để kích hoạt hoặc giao dịch bị trùng lặp.`);
      }
      const updatedUser = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { cloopCoins: true }
      });

      await tx.product.update({
        where: { id: productId },
        data: { isHighlighted: true }
      });

      await tx.coinLedgerEntry.create({
        data: {
          userId,
          type: "BOOST_SPEND",
          amount: -cost,
          balanceAfter: updatedUser.cloopCoins,
          description: "Bật Hào Quang Nổi Bật vĩnh viễn"
        }
      });

      return updatedUser.cloopCoins;
    });

    try {
      revalidatePath("/shop");
      revalidatePath("/my-closet");
    } catch (_) {}

    return { success: true, newBalance: result, message: "Đã bật Hào Quang thành công!" };
  } catch (err: any) {
    return { success: false, error: err.message || "Không thể bật Hào Quang." };
  }
}
