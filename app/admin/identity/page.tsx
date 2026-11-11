import { prisma } from '@/src/lib/prisma';
import { requireAdminOrRedirect } from '@/src/lib/auth';
import IdentityVerificationClient, { AdminUserItem } from './IdentityVerificationClient';
import Link from 'next/link';
import { UserCheck, ArrowUpRight } from 'lucide-react';

export const dynamic = "force-dynamic";

export default async function AdminIdentityPage() {
  await requireAdminOrRedirect();

  // 1. Truy vấn dữ liệu người dùng cần hiển thị trước
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
    },
  });

  const userIds = rawUsers.map((u) => u.id);

  // 2. Truy vấn song song số điện thoại và giao dịch KYC chỉ cho đúng 100 user trên trang này (tránh quét toàn bảng)
  const [rentalsWithPhone, kycTopUps] = userIds.length > 0
    ? await Promise.all([
        prisma.rentalHistory.findMany({
          where: {
            OR: [
              { renterId: { in: userIds }, renter_phone: { not: null } },
              { ownerId: { in: userIds }, owner_phone: { not: null } },
            ],
          },
          select: {
            renterId: true,
            ownerId: true,
            renter_phone: true,
            owner_phone: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 250,
        }),
        prisma.coinTopUp.findMany({
          where: {
            userId: { in: userIds },
            packageCode: { in: ["KYC_1K", "KYC_2K"] },
            status: "PAID",
          },
          select: {
            userId: true,
            orderCode: true,
            paidAt: true,
            rawPayload: true,
          },
          orderBy: { paidAt: 'desc' },
        }),
      ])
    : [[], []];

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
    <div className="w-full font-sans text-slate-800 text-left pb-16">
      <div className="w-full space-y-6">
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
