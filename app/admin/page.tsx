import { redirect } from 'next/navigation';
import { createClient } from '@/src/utils/supabase/server';
import { prisma } from '@/src/lib/prisma';
import { ADMIN_EMAILS } from '@/src/lib/auth';
import AdminDashboardClient from './AdminDashboardClient';

export const dynamic = "force-dynamic";

const OPEN_RENTAL_STATUSES = [
  "PENDING_APPROVAL",
  "OWNER_PACKED",
  "LENDER_SHIPPED",
  "BORROWER_RECEIVED",
  "BORROWER_RETURNED",
  "DISPUTE"
] as const;

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: session.user.id },
        { email: session.user.email }
      ]
    },
    select: { id: true, role: true, name: true, cloopCoins: true }
  });

  if (user && ADMIN_EMAILS.includes(session.user.email.toLowerCase())) {
    if (user.role !== 'ADMIN') {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' }
      });
      user.role = 'ADMIN';
    }
  }

  if (!user || user.role !== 'ADMIN') {
    redirect('/');
  }

  // Truy vấn số liệu tổng hợp toàn sàn từ Database (Chính xác từng đồng, không giả định)
  const [
    totalUsers,
    totalProducts,
    totalRentals,
    allRentals,
    paidInvoiceAgg,
    activeEscrowRentals,
    feeRetainedAgg,
    topUpAgg,
    recentTopUps,
    pendingWithdrawals
  ] = await Promise.all([
    prisma.user.count(),
    prisma.product.count({ where: { isDeleted: false } }),
    prisma.rentalHistory.count({ where: { isDeleted: false } }),
    prisma.rentalHistory.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        start_date: true,
        end_date: true,
        renter_name: true,
        renter_phone: true,
        owner_name: true,
        owner_phone: true,
        shippingCode: true,
        createdAt: true,
        product: { 
          select: { 
            title: true, 
            images: { take: 1, select: { url: true } }, 
            listings: { take: 1, select: { basePrice: true, deposit: true } },
            user: { select: { name: true } }
          } 
        },
        renter: { select: { name: true } },
        invoice: { select: { amount: true, depositAmount: true, rentalFee: true, platformFee: true, status: true } },
        disputes: { take: 1, select: { id: true } }
      }
    }),
    // 1. GMV thực tế từ các hóa đơn đã thanh toán
    prisma.invoice.aggregate({
      where: { isDeleted: false, status: 'PAID' },
      _sum: {
        amount: true,
        depositAmount: true,
        platformFee: true,
        rentalFee: true
      }
    }),
    // 2. Két cọc bảo chứng Escrow thực tế đang quản lý (các đơn chưa kết thúc)
    prisma.rentalHistory.findMany({
      where: {
        isDeleted: false,
        status: { in: [...OPEN_RENTAL_STATUSES] },
        invoice: { status: 'PAID' }
      },
      select: {
        invoice: { select: { depositAmount: true } }
      }
    }),
    // 3. Phí dịch vụ sàn thực tế đã ghi nhận trong Sổ cái
    prisma.ledgerTransaction.aggregate({
      where: {
        type: 'FEE_RETAINED',
        status: 'COMPLETED'
      },
      _sum: { amount: true }
    }),
    // 4. Doanh thu bán Xu Lá thực tế từ CoinTopUp
    prisma.coinTopUp.aggregate({
      where: { status: 'PAID' },
      _sum: {
        amountVnd: true,
        totalCoins: true
      }
    }),
    // 5. Giao dịch nạp xu gần nhất
    prisma.coinTopUp.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      where: { status: 'PAID' },
      select: {
        id: true,
        amountVnd: true,
        totalCoins: true,
        createdAt: true,
        user: { select: { name: true } }
      }
    }),
    // 6. Yêu cầu rút tiền chờ duyệt
    prisma.withdrawalRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        amount: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountHolder: true,
        createdAt: true
      }
    })
  ]);

  // Tính toán chính xác từng đồng
  const totalGMV = paidInvoiceAgg._sum.amount || 0;
  const totalDepositEscrow = activeEscrowRentals.reduce((sum, r) => sum + (r.invoice?.depositAmount || 0), 0);
  const totalPlatformFee = feeRetainedAgg._sum.amount || (paidInvoiceAgg._sum.platformFee || 0);
  const totalCoinRevenue = topUpAgg._sum.amountVnd || 0;
  const totalCoinsIssued = topUpAgg._sum.totalCoins || 0;

  const metrics = {
    totalUsers,
    totalProducts,
    totalRentals,
    totalGMV,
    totalDepositEscrow,
    totalPlatformFee,
    totalCoinRevenue,
    totalCoinsIssued
  };

  // Format đơn hàng thực tế từ Database (Không dùng giá niêm yết để giả định hóa đơn)
  const formattedOrders = allRentals.map(rent => {
    const inv = rent.invoice;
    const isPaid = inv?.status === 'PAID';
    const isPending = inv?.status === 'PENDING';

    return {
      id: rent.id,
      code: `ORD-${rent.id.slice(0, 8).toUpperCase()}`,
      productTitle: rent.product?.title || "Trang phục CLOOP",
      productImage: (rent.product?.images && rent.product.images.length > 0) ? rent.product.images[0].url : "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790530424/cloop_mobile_closet/pt4xccwmvrjsrnhrgnib.png",
      renterName: rent.renter_name || rent.renter?.name || "Khách thuê",
      renterPhone: rent.renter_phone || "—",
      ownerName: rent.owner_name || rent.product?.user?.name || "Chủ tủ",
      ownerPhone: rent.owner_phone || "—",
      startDate: rent.start_date ? new Date(rent.start_date).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : "—",
      endDate: rent.end_date ? new Date(rent.end_date).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : "—",
      rentalFee: inv?.rentalFee || 0,
      depositAmount: inv?.depositAmount || 0,
      totalAmount: inv?.amount || 0,
      platformFee: inv?.platformFee || 0,
      paymentStatus: isPaid ? 'ĐÃ_THANH_TOÁN' : (isPending ? 'CHỜ_THANH_TOÁN' : 'CHƯA_CÓ_HÓA_ĐƠN'),
      status: rent.status,
      shippingCode: rent.shippingCode || "Chưa tạo mã",
      hasDispute: Boolean(rent.disputes && rent.disputes.length > 0),
      createdAt: new Date(rent.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    };
  });

  const safeTopUps = (recentTopUps || []).map((t) => ({
    ...t,
    createdAt: t.createdAt ? new Date(t.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : ''
  }));

  const safeWithdrawals = (pendingWithdrawals || []).map((w) => ({
    ...w,
    createdAt: w.createdAt ? new Date(w.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : ''
  }));

  return (
    <div className="w-full pb-16 text-stone-800 font-sans">
      <AdminDashboardClient 
        currentAdmin={{ name: user.name || session.user.email || 'Quản trị viên' }} 
        metrics={metrics}
        recentRentals={formattedOrders}
        recentTopUps={safeTopUps}
        pendingWithdrawals={safeWithdrawals}
      />
    </div>
  );
}
