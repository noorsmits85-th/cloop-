import { redirect } from 'next/navigation';
import { createClient } from '@/src/utils/supabase/server';
import { prisma } from '@/src/lib/prisma';
import IdentityVerificationClient, { AdminUserItem } from './IdentityVerificationClient';
import Link from 'next/link';
import { UserCheck, ArrowUpRight } from 'lucide-react';

export const dynamic = "force-dynamic";

export default async function AdminIdentityPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user?.email) {
    redirect('/login');
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true }
  });

  if (!currentUser || currentUser.role !== 'ADMIN') {
    redirect('/');
  }

  const rawUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isVerified: true,
      completedOrders: true,
      createdAt: true,
      rentalHistory: {
        select: {
          renter_phone: true,
          owner_phone: true,
        },
        take: 3,
        orderBy: { createdAt: 'desc' },
      },
      coinTopUps: {
        where: { packageCode: { in: ["KYC_1K", "KYC_2K"] }, status: "PAID" },
        take: 1,
        orderBy: { paidAt: 'desc' },
        select: {
          orderCode: true,
          amountVnd: true,
          paidAt: true,
          rawPayload: true,
        },
      },
    },
  });

  const formattedUsers: AdminUserItem[] = rawUsers.map((u) => {
    const phone = u.rentalHistory.find((r) => r.renter_phone || r.owner_phone)?.renter_phone ||
                  u.rentalHistory.find((r) => r.owner_phone)?.owner_phone ||
                  undefined;

    const kycTopUp = u.coinTopUps?.[0];
    const kycPhone = (kycTopUp?.rawPayload as any)?.phone;
    const finalPhone = kycPhone || phone || undefined;

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isVerified: Boolean(u.isVerified),
      completedOrders: u.completedOrders ?? 0,
      createdAt: u.createdAt.toISOString(),
      phone: finalPhone,
      kycOrderCode: kycTopUp?.orderCode ? kycTopUp.orderCode.toString() : undefined,
      kycPaidAt: kycTopUp?.paidAt ? kycTopUp.paidAt.toISOString() : undefined,
    };
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 font-sans text-slate-800 text-left">
      <div className="max-w-[1500px] mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-emerald-100 text-[#183A2D] shadow-2xs">
              <UserCheck size={22} />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                Kiểm Duyệt Định Danh & SĐT (KYC)
              </h1>
              <p className="text-slate-500 text-xs mt-0.5">
                Rào chắn bảo vệ Két Escrow, chống tài khoản ảo/spam số điện thoại và tuân thủ Luật Bảo vệ Dữ liệu Cá nhân số 91/2025/QH15.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/deposit-vault"
              className="inline-flex items-center gap-1.5 bg-white border border-stone-300 text-stone-700 hover:text-stone-900 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-stone-50 shadow-2xs transition-all"
            >
              <span>Két Cọc Escrow</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        {/* CLIENT COMPONENT */}
        <IdentityVerificationClient initialUsers={formattedUsers} />
      </div>
    </div>
  );
}
