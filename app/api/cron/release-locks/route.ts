import { NextResponse } from 'next/server';
import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from 'next/cache';
import { verifyCronRequest } from "@/src/lib/cron-auth";
import { releasePendingWalletHoldForInvoice } from "@/src/lib/wallet-reconciliation";

export async function GET(request: Request) {
  // 1. KHIÊN BẢO VỆ: Chặn mọi truy cập không từ Vercel Cron (timingSafeEqual, fail-closed)
  if (!verifyCronRequest(request)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // 2. TÍNH TOÁN THỜI GIAN: Lùi lại 15 phút so với hiện tại
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    // 3. TÌM CÁC ĐƠN PENDING QUÁ HẠN (CHƯA THANH TOÁN)
    const expiredRentals = await prisma.rentalHistory.findMany({
      where: {
        status: "PENDING_APPROVAL",
        createdAt: { lt: fifteenMinutesAgo },
        invoice: {
          status: "PENDING"
        }
      },
      select: {
        id: true,
        product_id: true,
        renterId: true,
        invoice: { select: { id: true, orderCode: true, status: true } }
      }
    });

    let releasedCount = 0;
    if (expiredRentals.length > 0) {
      const productIds = Array.from(new Set(expiredRentals.map(r => r.product_id))).sort();

      // 🔒 INTERACTIVE TRANSACTION: Khóa dòng sản phẩm, kiểm tra lại điều kiện và giải phóng từng mục bên trong CÙNG 1 transaction
      await prisma.$transaction(async (tx) => {
        for (const pid of productIds) {
          if (typeof tx.$executeRaw === 'function') {
            await tx.$executeRaw`SELECT id FROM "products" WHERE id = ${pid} FOR UPDATE`;
          } else if (typeof (tx as any).$queryRaw === 'function') {
            await (tx as any).$queryRaw`SELECT id FROM "products" WHERE id = ${pid} FOR UPDATE`;
          }
        }

        // Đọc lại danh sách đơn đang hoạt động / đã PAID BÊN TRONG khóa (loại trừ đơn LENDER_COMPLETED / CANCELLED lịch sử)
        const activeOrPaidRentals = await tx.rentalHistory.findMany({
          where: {
            product_id: { in: productIds },
            status: { notIn: ["LENDER_COMPLETED", "CANCELLED"] },
            OR: [
              { status: { in: ["OWNER_PACKED", "LENDER_SHIPPED", "BORROWER_RECEIVED", "BORROWER_RETURNED"] } },
              { invoice: { status: "PAID" } }
            ]
          },
          select: { id: true, product_id: true }
        });

        const activeProductIds = new Set(activeOrPaidRentals.map(p => p.product_id));
        const activeRentalIds = new Set(activeOrPaidRentals.map((p: any) => p.id).filter(Boolean));
        const releasedProductIds = new Set<string>();

        for (const rental of expiredRentals) {
          if (
            activeProductIds.has(rental.product_id) ||
            activeRentalIds.has(rental.id) ||
            !rental.invoice?.id ||
            (rental.invoice.status && rental.invoice.status !== "PENDING")
          ) {
            continue;
          }

          // 1. Chỉ hủy Invoice nếu trạng thái hiện tại vẫn là PENDING
          const invCancel = await tx.invoice.updateMany({
            where: {
              id: rental.invoice.id,
              status: "PENDING"
            },
            data: { status: "CANCELLED" }
          });

          // Nếu Invoice vừa chuyển sang PAID (count === 0), tuyệt đối KHÔNG hủy Rental và KHÔNG mở lại Listing!
          if (!invCancel || invCancel.count === 0) {
            continue;
          }

          // 2. Hủy Rental tương ứng có điều kiện trạng thái PENDING_APPROVAL
          const rentalCancel = await tx.rentalHistory.updateMany({
            where: {
              id: rental.id,
              status: "PENDING_APPROVAL"
            },
            data: { status: "CANCELLED" }
          });

          if (!rentalCancel || rentalCancel.count === 0) {
            throw new Error(`CRON_STATE_MISMATCH: Invoice ${rental.invoice.id} cancelled but rental ${rental.id} not in PENDING_APPROVAL`);
          }

          // 3. Giải phóng số dư Ví đang tạm khóa trên Invoice này (nếu có)
          if ((rental as any).renterId && typeof releasePendingWalletHoldForInvoice === "function") {
            await releasePendingWalletHoldForInvoice(tx, {
              invoiceId: rental.invoice.id,
              renterId: (rental as any).renterId,
              orderCode: (rental.invoice as any).orderCode,
              reason: "Tự động giải phóng giữ chỗ quá hạn 15 phút"
            });
          }

          // 4. Kiểm tra xem sản phẩm còn đơn sống nào khác không trước khi giải phóng Listing
          const otherLiveOrder =
            typeof tx.rentalHistory.findFirst === "function"
              ? await tx.rentalHistory.findFirst({
                  where: {
                    product_id: rental.product_id,
                    id: { not: rental.id },
                    isDeleted: false,
                    status: { notIn: ["LENDER_COMPLETED", "CANCELLED"] }
                  },
                  select: { id: true }
                })
              : null;

          if (!otherLiveOrder) {
            releasedProductIds.add(rental.product_id);
          }
        }

        if (releasedProductIds.size > 0) {
          const productsToRelease = Array.from(releasedProductIds);
          await tx.listing.updateMany({
            where: {
              productId: { in: productsToRelease },
              status: "RESERVED"
            },
            data: { status: "AVAILABLE" }
          });
          releasedCount = productsToRelease.length;
        }
      });
    }

    // 4. KÍCH NỔ CACHE: Nếu có món đồ được giải phóng an toàn, cập nhật Frontend
    if (releasedCount > 0) {
      try {
        const { revalidateTag } = require('next/cache');
        revalidateTag('products');
        revalidateTag('shop-products');
      } catch (_) {}
      revalidatePath('/', 'page');
      revalidatePath('/shop', 'page');
    }

    return NextResponse.json({ success: true, releasedCount });
  } catch (error) {
    console.error('Cron Job Failed:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
