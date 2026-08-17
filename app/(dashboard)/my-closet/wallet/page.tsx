import React from "react";
import { supabase } from "@/src/lib/supabase";
import { WalletClient } from "../_components/WalletClient";

export const revalidate = 0;

export default async function WalletPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  const status = searchParams?.status as string;

  if (!userId) {
    return <div className="p-10 text-center">Vui lòng đăng nhập</div>;
  }

  // Fetch user profile to get wallet balance
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("wallet_balance, cloopCoins")
    .eq("id", userId)
    .single();

  // Giả lập lịch sử giao dịch (thực tế sẽ lấy từ bảng transactions)
  const mockTransactions = [
    { id: "TX1", type: "INCOME", amount: 150000, desc: "Thu nhập từ đơn cho thuê váy Boho", date: new Date().toISOString(), status: "SUCCESS" },
    { id: "TX2", type: "WITHDRAW", amount: -50000, desc: "Rút tiền về ngân hàng VCB", date: new Date(Date.now() - 86400000).toISOString(), status: "PENDING" },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-10 px-4 sm:px-8 text-stone-800 antialiased">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col mb-6">
          <h1 className="text-xl font-bold tracking-tight text-[#183A2D] uppercase font-mono">Ví CLOOP</h1>
          <p className="text-stone-500 text-xs mt-1">Quản lý số dư và doanh thu từ việc chia sẻ tủ đồ của bạn.</p>
        </div>
        
        <WalletClient 
          balance={userProfile?.wallet_balance || 0} 
          coins={userProfile?.cloopCoins || 0}
          transactions={mockTransactions} 
          paymentStatus={status}
        />
      </div>
    </div>
  );
}
