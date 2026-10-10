"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/auth";
import { payos } from "@/lib/payos";
import { revalidatePath } from "next/cache";
import { generatePayOSOrderCode } from "@/src/utils/order-code";
import { clearShopMemoryCache } from "@/app/actions/product";

// ==========================================
// 1. TÍNH GIÁ ĐẨY BÀI (HOURS -> VND & LÁ)
// Giai đoạn đầu: 24h = 10.000đ, 1h lẻ = 500đ
// ==========================================
export async function calculateBoostPriceAction(hours: number) {
  return calculateBoostPrice(hours);
}

function calculateBoostPrice(hours: number): { amountVnd: number; coins: number; label: string; discountVnd: number } {
  const safeHours = Math.max(1, Math.round(hours));

  if (safeHours === 24) {
    return {
      amountVnd: 10000,
      coins: 20,
      label: "Gói 24h (1 Ngày)",
      discountVnd: 2000 // 24 * 500 = 12.000 -> 10.000
    };
  }

  if (safeHours === 72) {
    return {
      amountVnd: 25000,
      coins: 50,
      label: "Gói 3 Ngày (72h)",
      discountVnd: 11000 // 72 * 500 = 36.000 -> 25.000
    };
  }

  if (safeHours === 168) {
    return {
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
    amountVnd,
    coins,
    label: `${safeHours} Giờ`,
    discountVnd: 0
  };
}

// ==========================================
// 2. LẤY DANH SÁCH BÀI ĐĂNG CỦA TÔI ĐỂ CHỌN ĐẨY
// ==========================================
export async function getMyClosetItemsForBoostAction(clientUserId?: string) {
  try {
    let authUser: any = null;
    try {
      authUser = await requireUser();
    } catch {}

    const userId = authUser?.id || clientUserId;
    if (!userId) {
      return { success: false, error: "Vui lòng đăng nhập" };
    }

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
    return { success: false, error: err.message || "Không thể tải danh sách sản phẩm." };
  }
}

// ==========================================
// 3. TẠO THANH TOÁN VIETQR PAYOS TỰ ĐỘNG (SHOPEE STYLE)
// ==========================================
export async function createBoostPayOSPaymentAction({
  productId,
  hours,
  clientUserId
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
    } catch {}

    const userId = authUser?.id || clientUserId;
    if (!userId) {
      return { success: false, error: "Vui lòng đăng nhập để tiếp tục." };
    }

    // Kiểm tra quyền sở hữu sản phẩm
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, userId: true, title: true, boostExpiresAt: true }
    });

    if (!product || product.userId !== userId) {
      return { success: false, error: "Bạn chỉ có thể đẩy sản phẩm trong tủ đồ của bạn." };
    }

    const { amountVnd, coins, label } = calculateBoostPrice(hours);
    const orderCode = generatePayOSOrderCode();

    // Tạo bản ghi CoinTopUp PENDING trong DB
    const topUp = await prisma.coinTopUp.create({
      data: {
        userId,
        packageCode: `BOOST_${hours}H`,
        orderCode: BigInt(orderCode),
        amountVnd,
        baseCoins: coins,
        bonusCoins: 0,
        totalCoins: coins,
        status: "PENDING",
        rawPayload: {
          type: "PRODUCT_BOOST",
          productId: product.id,
          hours,
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
    return { success: false, error: err.message || "Không thể khởi tạo mã thanh toán." };
  }
}

// ==========================================
// 3.5. ĐẨY BÀI TRỰC TIẾP TỪ VÍ TIỀN CLOOP (1 CHẠM TỨC THÌ)
// ==========================================
export async function boostWithWalletBalanceAction({
  productId,
  hours,
  clientUserId
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
    } catch {}

    const userId = authUser?.id || clientUserId;
    if (!userId) {
      return { success: false, error: "Vui lòng đăng nhập để tiếp tục." };
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, userId: true, title: true, boostExpiresAt: true }
    });

    if (!product || product.userId !== userId) {
      return { success: false, error: "Bạn chỉ có thể đẩy sản phẩm trong tủ đồ của mình." };
    }

    const { amountVnd, coins } = calculateBoostPrice(hours);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true }
      });

      if (!user || user.walletBalance < amountVnd) {
        throw new Error(
          `Số dư ví (${(user?.walletBalance || 0).toLocaleString("vi-VN")}đ) không đủ ${amountVnd.toLocaleString("vi-VN")}đ.`
        );
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          walletBalance: { decrement: amountVnd }
        },
        select: { walletBalance: true }
      });

      const now = new Date();
      const currentExpiry =
        product.boostExpiresAt && product.boostExpiresAt > now ? product.boostExpiresAt : now;
      const newExpiresAt = new Date(currentExpiry.getTime() + hours * 3600 * 1000);

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          boostExpiresAt: newExpiresAt,
          lastBumpedAt: now,
          status: "ON_MARKET",
          boostScore: { increment: coins }
        },
        select: { boostScore: true }
      });

      await tx.listing.updateMany({
        where: { productId, isDeleted: false, status: "HIDDEN" },
        data: { status: "AVAILABLE" }
      });

      return {
        newWalletBalance: updatedUser.walletBalance,
        boostExpiresAt: newExpiresAt,
        boostScore: updatedProduct.boostScore,
        addedCoins: coins
      };
    });

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
    const topUp = await prisma.coinTopUp.findUnique({
      where: { orderCode: BigInt(orderCode) },
      include: { user: { select: { id: true, cloopCoins: true } } }
    });

    if (!topUp) {
      return { success: false, status: "NOT_FOUND" };
    }

    const payload = (topUp.rawPayload as any) || {};
    const productId = payload.productId;
    const hours = Number(payload.hours || 24);
    const coins = Number(payload.coins || (hours === 24 ? 20 : hours === 72 ? 50 : hours === 168 ? 100 : hours));

    // Nếu đã PAID từ trước (do Webhook xử lý)
    if (topUp.status === "PAID") {
      const product = productId
        ? await prisma.product.findUnique({
            where: { id: productId },
            select: { boostExpiresAt: true, title: true, boostScore: true }
          })
        : null;

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
        if (
          payosInfo &&
          (payosInfo.status === "PAID" ||
            (payosInfo.amountPaid && payosInfo.amountPaid >= topUp.amountVnd))
        ) {
          // Thực hiện kích hoạt nguyên tử qua Transaction
          const txResult = await prisma.$transaction(async (tx) => {
            // Chốt chặn nguyên tử tránh race condition
            const updateCount = await tx.coinTopUp.updateMany({
              where: { id: topUp.id, status: "PENDING" },
              data: { status: "PAID", paidAt: new Date() }
            });

            if (updateCount.count === 0) {
              return null; // Luồng khác đã xử lý
            }

            let computedExpiresAt = new Date();
            let newBoostScore = 0;
            if (productId) {
              const currentProduct = await tx.product.findUnique({
                where: { id: productId },
                select: { id: true, title: true, boostExpiresAt: true, boostScore: true }
              });

              if (currentProduct) {
                const now = new Date();
                const currentExpiry =
                  currentProduct.boostExpiresAt && currentProduct.boostExpiresAt > now
                    ? currentProduct.boostExpiresAt
                    : now;

                computedExpiresAt = new Date(currentExpiry.getTime() + hours * 3600 * 1000);

                const updatedProd = await tx.product.update({
                  where: { id: productId },
                  data: {
                    boostExpiresAt: computedExpiresAt,
                    lastBumpedAt: now,
                    status: "ON_MARKET",
                    boostScore: { increment: coins }
                  },
                  select: { boostScore: true }
                });
                newBoostScore = updatedProd.boostScore;

                await tx.listing.updateMany({
                  where: { productId, isDeleted: false, status: "HIDDEN" },
                  data: { status: "AVAILABLE" }
                });

                await tx.coinLedgerEntry.create({
                  data: {
                    userId: topUp.userId,
                    topUpId: topUp.id,
                    type: "BOOST_SPEND",
                    amount: 0,
                    balanceAfter: topUp.user?.cloopCoins || 0,
                    description: `Đẩy Top bài viết "${currentProduct.title}" (+${hours}h, +${coins} Lá đua Top qua VietQR)`,
                    metadata: {
                      productId,
                      hours,
                      coins,
                      orderCode,
                      amountVnd: topUp.amountVnd
                    }
                  }
                });
              }
            }

            return { computedExpiresAt, newBoostScore };
          });

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
  clientUserId
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
    } catch {}

    const userId = authUser?.id || clientUserId;
    if (!userId) {
      return { success: false, error: "Vui lòng đăng nhập để sử dụng tính năng." };
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, userId: true, title: true, boostExpiresAt: true }
    });

    if (!product || product.userId !== userId) {
      return { success: false, error: "Bạn chỉ có thể đẩy sản phẩm trong tủ đồ của chính mình." };
    }

    const { coins: requiredCoins } = calculateBoostPrice(hours);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { cloopCoins: true }
      });

      if (!user || user.cloopCoins < requiredCoins) {
        throw new Error(`Bạn cần ${requiredCoins} Lá. Số dư hiện tại: ${user?.cloopCoins || 0} Lá.`);
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          cloopCoins: { decrement: requiredCoins }
        },
        select: { cloopCoins: true }
      });

      const now = new Date();
      const currentExpiry =
        product.boostExpiresAt && product.boostExpiresAt > now ? product.boostExpiresAt : now;
      const newExpiresAt = new Date(currentExpiry.getTime() + hours * 3600 * 1000);

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          boostExpiresAt: newExpiresAt,
          lastBumpedAt: now,
          status: "ON_MARKET",
          boostScore: { increment: requiredCoins }
        },
        select: { boostScore: true }
      });

      await tx.listing.updateMany({
        where: { productId, isDeleted: false, status: "HIDDEN" },
        data: { status: "AVAILABLE" }
      });

      await tx.coinLedgerEntry.create({
        data: {
          userId,
          type: "BOOST_SPEND",
          amount: -requiredCoins,
          balanceAfter: updatedUser.cloopCoins,
          description: `Đẩy Top sản phẩm "${product.title}" (${hours} giờ, +${requiredCoins} Lá tích lũy)`,
          metadata: {
            productId: product.id,
            hours,
            costCoins: requiredCoins
          }
        }
      });

      return {
        newBalance: updatedUser.cloopCoins,
        boostExpiresAt: newExpiresAt,
        boostScore: updatedProduct.boostScore,
        addedCoins: requiredCoins
      };
    });

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
  requestedUserId?: string,
  packageType: "BOOST" | "HIGHLIGHT" = "BOOST"
) {
  if (packageType === "BOOST") {
    return boostWithCoinsAction({ productId, hours: 24, clientUserId: requestedUserId });
  }

  // Highlight hào quang vĩnh viễn (300 Lá)
  try {
    let authUser: any = null;
    try {
      authUser = await requireUser();
    } catch {}
    const userId = authUser?.id || requestedUserId;
    if (!userId) return { success: false, error: "Vui lòng đăng nhập" };

    const cost = 300;
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { cloopCoins: true }
      });
      if (!user || user.cloopCoins < cost) {
        throw new Error(`Cần ${cost} Lá để kích hoạt.`);
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { cloopCoins: { decrement: cost } },
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
    return { success: false, error: err.message };
  }
}
