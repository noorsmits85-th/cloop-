import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
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

    // 3. ĐẠI KHAI SÁT GIỚI: Cập nhật đồng loạt bảng listings
    const result = await prisma.listing.updateMany({
      where: {
        status: 'RESERVED',
        updatedAt: {
          lt: fifteenMinutesAgo, // Cũ hơn 15 phút
        },
      },
      data: {
        status: 'AVAILABLE',
      },
    });

    // 4. KÍCH NỔ CACHE: Nếu có món đồ được giải phóng, phải báo cho Frontend
    if (result.count > 0) {
      revalidatePath('/', 'page');
      revalidatePath('/shop', 'page');
    }

    return NextResponse.json({ success: true, releasedCount: result.count });
  } catch (error) {
    console.error('Cron Job Failed:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
