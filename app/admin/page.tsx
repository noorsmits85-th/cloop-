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

  // Truy vấn số liệu tổng hợp toàn sàn
  const [
    totalUsers,
    totalProducts,
    totalRentals,
    invoices,
    topUps,
    recentRentals,
    recentTopUps
  ] = await Promise.all([
    prisma.user.count(),
    prisma.product.count({ where: { isDeleted: false } }),
    prisma.rentalHistory.count({ where: { isDeleted: false } }),
    prisma.invoice.findMany({
      where: { status: 'PAID' },
      select: { amount: true, depositAmount: true, rentalFee: true, platformFee: true }
    }),
    prisma.coinTopUp.findMany({
      where: { status: 'PAID' },
      select: { amountVnd: true, totalCoins: true }
    }),
    prisma.rentalHistory.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { title: true, images: true } },
        renter: { select: { name: true } },
        invoice: { select: { amount: true, status: true } }
      }
    }),
    prisma.coinTopUp.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      where: { status: 'PAID' },
      include: {
        user: { select: { name: true } }
      }
    })
  ]);

  const totalGMV = invoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  const totalDepositEscrow = invoices.reduce((sum, inv) => sum + (Number(inv.depositAmount) || 0), 0);
  const totalPlatformFee = invoices.reduce((sum, inv) => sum + (Number(inv.platformFee) || (Number(inv.rentalFee) * 0.12) || 0), 0);
  const totalCoinRevenue = topUps.reduce((sum, top) => sum + (Number(top.amountVnd) || 0), 0);
  const totalCoinsIssued = topUps.reduce((sum, top) => sum + (Number(top.totalCoins) || 0), 0);

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

  return (
    <div className="min-h-screen bg-[#FAF9F5] pb-20 pt-8 px-4 sm:px-8 text-stone-800">
      <AdminDashboardClient 
        currentAdmin={{ name: user.name || session.user.email, coins: user.cloopCoins }} 
        metrics={metrics}
        recentRentals={recentRentals}
        recentTopUps={recentTopUps}
      />
    </div>
  );
}
