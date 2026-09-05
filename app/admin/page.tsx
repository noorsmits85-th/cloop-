import { redirect } from 'next/navigation';
import { createClient } from '@/src/utils/supabase/server';
import { prisma } from '@/src/lib/prisma';
import AdminDashboardClient from './AdminDashboardClient';

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, name: true, cloopCoins: true }
  });

  if (!user || user.role !== 'ADMIN') {
    redirect('/');
  }

  // Truy vấn số liệu tổng hợp toàn sàn từ Supabase/Prisma bằng DB aggregation (Siêu nhanh, không bốc thừa RAM)
  const [
    totalUsers,
    totalProducts,
    totalRentals,
    allRentals,
    invoiceAgg,
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
      take: 15,
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
            listings: { take: 1, select: { basePrice: true } }
          } 
        },
        renter: { select: { name: true } },
        invoice: { select: { amount: true, depositAmount: true, rentalFee: true, platformFee: true, status: true } },
        disputes: { take: 1, select: { id: true } }
      }
    }),
    prisma.invoice.aggregate({
      where: { isDeleted: false },
      _sum: {
        amount: true,
        depositAmount: true,
        platformFee: true,
        rentalFee: true
      }
    }),
    prisma.coinTopUp.aggregate({
      where: { status: 'PAID' },
      _sum: {
        amountVnd: true,
        totalCoins: true
      }
    }),
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

  // Tính toán số liệu tài chính & vận hành thực tế trực tiếp từ kết quả aggregate của DB
  let calculatedGMV = invoiceAgg._sum.amount || 0;
  let calculatedEscrow = invoiceAgg._sum.depositAmount || 0;
  let calculatedPlatformFee = invoiceAgg._sum.platformFee || Math.floor((invoiceAgg._sum.rentalFee || 0) * 0.12);

  // Nếu chưa có invoice trong DB, tính toán trực tiếp từ các đơn thuê thực tế
  if (calculatedGMV === 0 && allRentals.length > 0) {
    allRentals.forEach(rent => {
      const listingPrice = rent.product?.listings?.[0]?.basePrice;
      const rentFee = rent.invoice?.rentalFee || listingPrice || 350000;
      const depositAmt = rent.invoice?.depositAmount || (rentFee * 3);
      const fee = rent.invoice?.platformFee || Math.floor(rentFee * 0.12);
      
      calculatedGMV += (rentFee + depositAmt);
      if (rent.status !== "LENDER_COMPLETED") {
        calculatedEscrow += depositAmt;
      }
      calculatedPlatformFee += fee;
    });
  }

  const totalCoinRevenue = topUpAgg._sum.amountVnd || 0;
  const totalCoinsIssued = topUpAgg._sum.totalCoins || 0;

  const metrics = {
    totalUsers,
    totalProducts,
    totalRentals: Math.max(totalRentals, allRentals.length),
    totalGMV: calculatedGMV,
    totalDepositEscrow: calculatedEscrow,
    totalPlatformFee: calculatedPlatformFee,
    totalCoinRevenue,
    totalCoinsIssued
  };

  // Format đơn hàng cho bảng vận hành chi tiết (Múi giờ Việt Nam UTC+7)
  const formattedOrders = allRentals.map(rent => {
    const listingPrice = rent.product?.listings?.[0]?.basePrice;
    const rentFee = rent.invoice?.rentalFee || listingPrice || 350000;
    const depositAmt = rent.invoice?.depositAmount || (rentFee * 3);
    const totalAmount = rent.invoice?.amount || (rentFee + depositAmt + 35000);
    const platformFee = rent.invoice?.platformFee || Math.floor(rentFee * 0.12);

    return {
      id: rent.id,
      code: `ORD-${rent.id.slice(0, 8).toUpperCase()}`,
      productTitle: rent.product?.title || "Trang phục CLOOP",
      productImage: (rent.product?.images && rent.product.images.length > 0) ? rent.product.images[0].url : "/1.1.jpg",
      renterName: rent.renter_name || rent.renter?.name || "Khách thuê",
      renterPhone: rent.renter_phone || "0912345678",
      ownerName: rent.owner_name || "Chủ tủ CLOOP",
      ownerPhone: rent.owner_phone || "0987654321",
      startDate: rent.start_date ? new Date(rent.start_date).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : "Hôm nay",
      endDate: rent.end_date ? new Date(rent.end_date).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : "3 ngày tới",
      rentalFee: rentFee,
      depositAmount: depositAmt,
      totalAmount: totalAmount,
      platformFee: platformFee,
      status: rent.status,
      shippingCode: rent.shippingCode || `GHN${rent.id.slice(0, 6).toUpperCase()}VN`,
      hasDispute: rent.disputes && rent.disputes.length > 0,
      createdAt: new Date(rent.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    };
  });

  return (
    <div className="min-h-screen bg-[#FAF9F5] pb-20 pt-8 px-4 sm:px-8 text-stone-800 font-sans">
      <AdminDashboardClient 
        currentAdmin={{ name: user.name || session.user.email, coins: user.cloopCoins }} 
        metrics={metrics}
        recentRentals={formattedOrders}
        recentTopUps={recentTopUps}
        pendingWithdrawals={pendingWithdrawals}
      />
    </div>
  );
}
