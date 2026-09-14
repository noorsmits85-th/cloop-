import { redirect } from 'next/navigation';
import { createClient } from '@/src/utils/supabase/server';
import { prisma } from '@/src/lib/prisma';
import IdentityVerificationClient, { AdminUserItem } from './IdentityVerificationClient';
import Link from 'next/link';
import { UserCheck, ArrowUpRight } from 'lucide-react';

export const dynamic = "force-dynamic";

export default async function AdminIdentityPage() {
  // 1. Tận dụng lớp bảo mật Admin của layout, truy vấn dữ liệu song song (0ms blocking)
  const [rawUsers, rentalsWithPhone, kycTopUps] = await Promise.all([
    prisma.user.findMany({
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
      },
    }),
    prisma.rentalHistory.findMany({
      where: {
        OR: [
          { renter_phone: { not: null } },
          { owner_phone: { not: null } },
        ],
      },
      select: {
        renterId: true,
        ownerId: true,
        renter_phone: true,
        owner_phone: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.coinTopUp.findMany({
      where: { packageCode: { in: ["KYC_1K", "KYC_2K"] }, status: "PAID" },
      select: {
        userId: true,
        orderCode: true,
        paidAt: true,
        rawPayload: true,
      },
      orderBy: { paidAt: 'desc' },
    }),
  ]);

  // Tạo Map lookup số điện thoại và KYC Topup O(1)
  const phoneMap = new Map<string, string>();
  rentalsWithPhone.forEach((r) => {
    if (r.renterId && r.renter_phone && !phoneMap.has(r.renterId)) {
      phoneMap.set(r.renterId, r.renter_phone);
    }
    if (r.ownerId && r.owner_phone && !phoneMap.has(r.ownerId)) {
      phoneMap.set(r.ownerId, r.owner_phone);
    }
  });

  const kycMap = new Map<string, typeof kycTopUps[0]>();
  kycTopUps.forEach((k) => {
    if (!kycMap.has(k.userId)) {
      kycMap.set(k.userId, k);
    }
  });

  const formattedUsers: AdminUserItem[] = rawUsers.map((u) => {
    const kycTopUp = kycMap.get(u.id);
    const kycPhone = (kycTopUp?.rawPayload as any)?.phone;
    const finalPhone = kycPhone || phoneMap.get(u.id) || undefined;

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
