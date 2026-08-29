import React from "react";
import { requireUser } from "@/src/lib/auth";
import { WalletClient } from "../_components/WalletClient";
import { prisma } from "@/src/lib/prisma";
import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WalletPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined } 
}) {
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
  const resolvedSearchParams = await searchParams;
  const status = resolvedSearchParams?.status as string;

  // Safe data containers with defaults
  let userProfile: any = null;
  let profileRecord: any = null;
  let claims: any[] = [];
  let productCount = 0;
  let weeklyProductCount = 0;
  let fiveStarCount = 0;
  let coinLedger: any[] = [];
  let realWithdrawals: any[] = [];
  let realInvoices: any[] = [];

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const [
      userRes,
      profRes,
      claimsRes,
      prodCntRes,
      weeklyProdRes,
      fiveStarRes,
      ledgerRes,
      withdrawRes,
      invoicesRes
    ] = await Promise.allSettled([
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
      prisma.product.count({
        where: { userId: userId, isDeleted: false, createdAt: { gte: oneWeekAgo } }
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

    if (userRes.status === "fulfilled") userProfile = userRes.value;
    if (profRes.status === "fulfilled") profileRecord = profRes.value;
    if (claimsRes.status === "fulfilled") claims = claimsRes.value || [];
    if (prodCntRes.status === "fulfilled") productCount = prodCntRes.value || 0;
    if (weeklyProdRes.status === "fulfilled") weeklyProductCount = weeklyProdRes.value || 0;
    if (fiveStarRes.status === "fulfilled") fiveStarCount = fiveStarRes.value || 0;
    if (ledgerRes.status === "fulfilled") coinLedger = ledgerRes.value || [];
    if (withdrawRes.status === "fulfilled") realWithdrawals = withdrawRes.value || [];
    if (invoicesRes.status === "fulfilled") realInvoices = invoicesRes.value || [];

  } catch (fetchErr) {
    console.error("⚠️ [WalletPage Data Fetch Error]:", fetchErr);
  }

  const bankInfo = {
    bankName: profileRecord?.data?.bank_name || "",
    bankAccount: profileRecord?.data?.bank_account || "",
    bankOwner: profileRecord?.data?.bank_owner || profileRecord?.data?.name || userProfile?.name || ""
  };

  const rawClaimedCodes = (claims || []).map(c => c.questCode);
  // Khóa nhận đúp: Nếu user đã có số dư Lá ban đầu (tân thủ) -> tự động đánh dấu đã nhận quà chào mừng
  const claimedQuestCodes = Array.from(new Set([
    ...rawClaimedCodes,
    ...(userProfile ? ["WELCOME_ACTIVATION"] : [])
  ]));

  const vndTransactions = [
    ...(realWithdrawals || []).map(w => ({
      id: w.id,
      type: "WITHDRAW",
      amount: -w.amount,
      desc: `Lệnh rút tiền về ${w.bankName} (${w.bankAccountNumber})`,
      date: w.createdAt?.toISOString ? w.createdAt.toISOString() : new Date().toISOString(),
      status: w.status === "COMPLETED" ? "SUCCESS" : w.status === "PENDING" ? "PENDING" : "FAILED"
    })),
    ...(realInvoices || []).map(inv => ({
      id: inv.id,
      type: "INCOME",
      amount: inv.amount,
      desc: `Thu nhập cho thuê "${inv.rental?.product?.title || "Sản phẩm"}"`,
      date: inv.createdAt?.toISOString ? inv.createdAt.toISOString() : new Date().toISOString(),
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
          stats={{ productCount, weeklyProductCount, fiveStarCount }}
          bankInfo={bankInfo}
          coinLedger={(coinLedger || []).map(item => ({
            id: item.id,
            type: item.type,
            amount: item.amount,
            balanceAfter: item.balanceAfter,
            description: item.description || "Giao dịch Điểm Lá",
            createdAt: item.createdAt?.toISOString ? item.createdAt.toISOString() : new Date().toISOString()
          }))}
          transactions={vndTransactions} 
          paymentStatus={status}
        />
      </div>
    </div>
  );
}

