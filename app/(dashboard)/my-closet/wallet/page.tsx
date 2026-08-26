import React from "react";
import { requireUser } from "@/src/lib/auth";
import { WalletClient } from "../_components/WalletClient";
import { prisma } from "@/src/lib/prisma";
import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function WalletPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  let userAuth;
  try {
    userAuth = await requireUser();
  } catch (error) {
    // Không tìm thấy session SSR
  }

  if (!userAuth) {
    redirect("/login");
  }

  const userId = userAuth.id;
  const status = searchParams?.status as string;

  // ⚡ TỐI ƯU SIÊU TỐC: Gom toàn bộ 7 truy vấn Database chạy song song cùng lúc (Parallel Fetching)
  const [
    userProfile,
    profileRecord,
    claims,
    productCount,
    fiveStarCount,
    coinLedger,
    realWithdrawals,
    realInvoices
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true, cloopCoins: true, name: true }
    }),
    supabase
      .from("profiles")
      .select("bank_name, bank_account, bank_owner, name")
      .eq("id", userId)
      .maybeSingle(),
    prisma.coinQuestClaim.findMany({
      where: { userId: userId },
      select: { questCode: true }
    }),
    prisma.product.count({
      where: { userId: userId, isDeleted: false }
    }),
    prisma.review.count({
      where: { revieweeId: userId, rating: { gte: 5 } }
    }),
    prisma.coinLedgerEntry.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.withdrawalRequest.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.invoice.findMany({
      where: { 
        rental: { ownerId: userId }, 
        status: "PAID" 
      },
      include: { 
        rental: { 
          include: { product: true } 
        } 
      },
      orderBy: { createdAt: "desc" },
      take: 10
    })
  ]);

  const bankInfo = {
    bankName: profileRecord?.data?.bank_name || "",
    bankAccount: profileRecord?.data?.bank_account || "",
    bankOwner: profileRecord?.data?.bank_owner || profileRecord?.data?.name || userProfile?.name || ""
  };

  const claimedQuestCodes = claims.map(c => c.questCode);

  const vndTransactions = [
    ...realWithdrawals.map(w => ({
      id: w.id,
      type: "WITHDRAW",
      amount: -w.amount,
      desc: `Lệnh rút tiền về ${w.bankName} (${w.bankAccountNumber})`,
      date: w.createdAt.toISOString(),
      status: w.status === "COMPLETED" ? "SUCCESS" : w.status === "PENDING" ? "PENDING" : "FAILED"
    })),
    ...realInvoices.map(inv => ({
      id: inv.id,
      type: "INCOME",
      amount: inv.amount,
      desc: `Thu nhập cho thuê "${inv.rental?.product?.title || "Sản phẩm"}"`,
      date: inv.createdAt.toISOString(),
      status: "SUCCESS"
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-8 px-4 sm:px-8 text-stone-800 antialiased">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50/90 px-3 py-0.5 rounded-full border border-emerald-200/60">
              Fintech & Tokenomics
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-normal text-[#183A2D] mt-2">
            Hệ Thống Ví CLOOP
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1.5">
            Quản lý doanh thu tiền mặt (VNĐ) và Điểm Lá tuần hoàn (CloopCoins) của tủ đồ.
          </p>
        </div>
        
        <WalletClient 
          balance={userProfile?.walletBalance || 0} 
          coins={userProfile?.cloopCoins || 0}
          claimedQuests={claimedQuestCodes}
          stats={{ productCount, fiveStarCount }}
          bankInfo={bankInfo}
          coinLedger={coinLedger.map(item => ({
            id: item.id,
            type: item.type,
            amount: item.amount,
            balanceAfter: item.balanceAfter,
            description: item.description || "Giao dịch Điểm Lá",
            createdAt: item.createdAt.toISOString()
          }))}
          transactions={vndTransactions} 
          paymentStatus={status}
        />
      </div>
    </div>
  );
}

