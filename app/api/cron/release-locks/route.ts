import { NextResponse } from 'next/server';
import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from 'next/cache';

export async function GET(request: Request) {
  // 1. KHIÊN BẢO VỆ: Chặn mọi truy cập không từ Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // 2. TÍNH TOÁN THỜI GIAN: Lùi lại 15 phút so với hiện tại
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    // 3. TÌM VÀ HỦY ĐƠN PENDING QUÁ HẠN (CHƯA THANH TOÁN)
    const expiredRentals = await prisma.rentalHistory.findMany({
      where: {
        status: "PENDING_APPROVAL",
        createdAt: { lt: fifteenMinutesAgo },
        invoice: {
          status: "PENDING"
        }
      },
      select: { id: true, product_id: true, invoice: { select: { id: true } } }
    });

    let releasedCount = 0;
    if (expiredRentals.length > 0) {
      const rentalIds = expiredRentals.map(r => r.id);
      const invoiceIds = expiredRentals.map(r => r.invoice?.id).filter(Boolean) as string[];
      const productIds = Array.from(new Set(expiredRentals.map(r => r.product_id)));

      // 🛡️ CHỐT CHẶN BẢO VỆ: Loại trừ bất kỳ sản phẩm nào ĐÃ CÓ ĐƠN THANH TOÁN (PAID) HOẶC ĐANG GIAO NHẬN
      const paidRentals = await prisma.rentalHistory.findMany({
        where: {
          product_id: { in: productIds },
          OR: [
            { status: { in: ["OWNER_PACKED", "LENDER_SHIPPED", "BORROWER_RECEIVED"] } },
            { invoice: { status: "PAID" } }
          ]
        },
        select: { product_id: true }
      });
      const paidProductIds = new Set(paidRentals.map(p => p.product_id));
      const safeToReleaseProductIds = productIds.filter(id => !paidProductIds.has(id));

      await prisma.$transaction([
        prisma.rentalHistory.updateMany({
          where: { id: { in: rentalIds } },
          data: { status: "CANCELLED" }
        }),
        prisma.invoice.updateMany({
          where: { id: { in: invoiceIds } },
          data: { status: "CANCELLED" }
        }),
        prisma.listing.updateMany({
          where: {
            productId: { in: safeToReleaseProductIds },
            status: "RESERVED"
          },
          data: { status: "AVAILABLE" }
        })
      ]);
      releasedCount = safeToReleaseProductIds.length;
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
