import React from "react";
import { requireUser } from "@/src/lib/auth";
import { WalletClient } from "../_components/WalletClient";
import { prisma } from "@/src/lib/prisma";
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

  // 1. Lấy thông tin số dư
  const userProfile = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletBalance: true, cloopCoins: true }
  });

  // 2. Lấy danh sách nhiệm vụ đã claim
  const claims = await prisma.coinQuestClaim.findMany({
    where: { userId: userId },
    select: { questCode: true }
  });
  const claimedQuestCodes = claims.map(c => c.questCode);

  // 3. Thống kê tiến độ nhiệm vụ
  const productCount = await prisma.product.count({
    where: { userId: userId, isDeleted: false }
  });
  const fiveStarCount = await prisma.review.count({
    where: { revieweeId: userId, rating: { gte: 5 } }
  });

  // 4. Lấy lịch sử biến động Điểm Lá
  const coinLedger = await prisma.coinLedgerEntry.findMany({
    where: { userId: userId },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  // 5. Lấy lịch sử giao dịch VNĐ
  const vndTransactions = [
    { id: "TX1", type: "INCOME", amount: 150000, desc: "Thu nhập từ đơn cho thuê váy Boho", date: new Date().toISOString(), status: "SUCCESS" },
    { id: "TX2", type: "WITHDRAW", amount: -50000, desc: "Rút tiền về ngân hàng VCB", date: new Date(Date.now() - 86400000).toISOString(), status: "PENDING" },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-8 px-4 sm:px-8 text-stone-800 antialiased">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
              Fintech & Tokenomics
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#183A2D] font-heading mt-2">
            Hệ Thống Ví CLOOP
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1">
            Quản lý doanh thu tiền mặt (VNĐ) và Điểm Lá tuần hoàn (CloopCoins) của tủ đồ.
          </p>
        </div>
        
        <WalletClient 
          balance={userProfile?.walletBalance || 0} 
          coins={userProfile?.cloopCoins || 0}
          claimedQuests={claimedQuestCodes}
          stats={{ productCount, fiveStarCount }}
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

