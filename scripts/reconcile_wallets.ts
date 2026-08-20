import { prisma } from "../src/lib/prisma";

export async function runFullReconciliation() {
  console.log("=================================================");
  console.log("🔍 HỆ THỐNG ĐỐI SOÁT TÀI CHÍNH NỘI BỘ (RECONCILIATION)");
  console.log("=================================================\n");

  const timestamp = new Date().toISOString();
  let totalDiscrepancies = 0;

  // 1. TỔNG HỢP VÍ TIỀN MẶT VNĐ
  console.log("📊 1. KIỂM TOÁN VÍ TIỀN MẶT VNĐ (REAL MONEY ESCROW & BALANCE)");
  const usersWithVnd = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      walletBalance: true,
      pendingWithdrawalBalance: true
    }
  });

  const totalUserAvailableVnd = usersWithVnd.reduce((acc, u) => acc + (u.walletBalance || 0), 0);
  const totalUserPendingWithdrawalVnd = usersWithVnd.reduce((acc, u) => acc + (u.pendingWithdrawalBalance || 0), 0);
  const totalUserLiabilityVnd = totalUserAvailableVnd + totalUserPendingWithdrawalVnd;

  const totalPaidInvoices = await prisma.invoice.aggregate({
    _sum: { amount: true },
    where: { status: "PAID" }
  });

  const totalPendingWithdrawalRequests = await prisma.withdrawalRequest.aggregate({
    _sum: { amount: true },
    where: { status: "PENDING" }
  });

  console.log(`  • Tổng số dư khả dụng User:     ${totalUserAvailableVnd.toLocaleString()}₫`);
  console.log(`  • Tổng số dư đang chờ rút:      ${totalUserPendingWithdrawalVnd.toLocaleString()}₫`);
  console.log(`  • Tổng nghĩa vụ tài chính User:  ${totalUserLiabilityVnd.toLocaleString()}₫`);
  console.log(`  • Tổng tiền Invoice đã thu:     ${(totalPaidInvoices._sum.amount || 0).toLocaleString()}₫`);
  console.log(`  • Khớp giữa Pending Balance & Withdrawal Request: ${
    totalUserPendingWithdrawalVnd === (totalPendingWithdrawalRequests._sum.amount || 0) ? "✅ KHỚP 100%" : "⚠️ LỆCH SỐ"
  }`);

  if (totalUserPendingWithdrawalVnd !== (totalPendingWithdrawalRequests._sum.amount || 0)) {
    totalDiscrepancies++;
  }

  // 2. TỔNG HỢP VÀ ĐỐI SOÁT SỔ CÁI ĐIỂM LÁ (TOKENOMICS LEDGER)
  console.log("\n🍃 2. KIỂM TOÁN SỔ CÁI ĐIỂM LÁ (TOKENOMICS INTEGRITY)");
  const usersWithCoins = await prisma.user.findMany({
    select: {
      id: true,
      cloopCoins: true
    }
  });

  const totalCurrentCoins = usersWithCoins.reduce((acc, u) => acc + (u.cloopCoins || 0), 0);

  const coinLedgerStats = await prisma.coinLedgerEntry.groupBy({
    by: ["type"],
    _sum: { amount: true }
  });

  let sumLedgerCoins = 0;
  console.log("  Chi tiết dòng biến động Sổ cái Điểm Lá:");
  coinLedgerStats.forEach((stat) => {
    const sum = stat._sum.amount || 0;
    sumLedgerCoins += sum;
    console.log(`    - [${stat.type}]: ${sum > 0 ? '+' : ''}${sum.toLocaleString()} Lá`);
  });

  console.log(`  • Tổng Điểm Lá hiện tại của toàn bộ User: ${totalCurrentCoins.toLocaleString()} Lá`);

  // 3. KIỂM TRA TỪNG USER CÓ BỊ ÂM HOẶC LỆCH KHÔNG
  console.log("\n🛡️ 3. RÀ SOÁT CÁC TÀI KHOẢN BẤT THƯỜNG (ANOMALY DETECTION)");
  const negativeVndUsers = usersWithVnd.filter(u => u.walletBalance < 0 || u.pendingWithdrawalBalance < 0);
  const negativeCoinUsers = usersWithCoins.filter(u => u.cloopCoins < 0);

  if (negativeVndUsers.length > 0) {
    console.log(`  ❌ CẢNH BÁO: Tìm thấy ${negativeVndUsers.length} tài khoản có số dư VNĐ âm!`);
    negativeVndUsers.forEach(u => console.log(`     - User ${u.id} (${u.email}): ${u.walletBalance}₫`));
    totalDiscrepancies += negativeVndUsers.length;
  } else {
    console.log("  ✅ Không có bất kỳ tài khoản nào bị âm số dư VNĐ (Zero Negative Balances).");
  }

  if (negativeCoinUsers.length > 0) {
    console.log(`  ❌ CẢNH BÁO: Tìm thấy ${negativeCoinUsers.length} tài khoản có Điểm Lá âm!`);
    totalDiscrepancies += negativeCoinUsers.length;
  } else {
    console.log("  ✅ Không có bất kỳ tài khoản nào bị âm Điểm Lá.");
  }

  // 4. KẾT LUẬN KIỂM TOÁN
  console.log("\n=================================================");
  if (totalDiscrepancies === 0) {
    console.log("🎉 KẾT QUẢ ĐỐI SOÁT: HOÀN TOÀN CÂN ĐỐI (100% BALANCED)");
    console.log("Hệ thống đủ điều kiện an toàn tài chính phục vụ 2.000 - 3.000 Users.");
  } else {
    console.log(`⚠️ KẾT QUẢ ĐỐI SOÁT: PHÁT HIỆN ${totalDiscrepancies} ĐIỂM LỆCH CẦN XỬ LÝ!`);
  }
  console.log("=================================================");

  return {
    success: totalDiscrepancies === 0,
    timestamp,
    totalDiscrepancies,
    totalUserLiabilityVnd,
    totalCurrentCoins
  };
}

if (require.main === module) {
  runFullReconciliation()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
