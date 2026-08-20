import { prisma } from "../src/lib/prisma";

async function runConcurrencyStressTests() {
  console.log("=================================================");
  console.log("⚡ KIỂM THỬ BẢO VỆ ĐỒNG THỜI (CONCURRENCY & RACE CONDITIONS)");
  console.log("=================================================\n");

  const testEmail = `stress.tester.${Date.now()}@cloop.vn`;

  // 1. Tạo user test với 100,000 VNĐ và 600 Lá
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      password: "hashed_stress_password",
      name: "Stress Tester",
      walletBalance: 100000,
      pendingWithdrawalBalance: 0,
      cloopCoins: 600
    }
  });

  console.log(`👤 Tạo User Test: ${user.id}`);
  console.log(`   Số dư ban đầu: ${user.walletBalance.toLocaleString()}₫ | ${user.cloopCoins} Lá\n`);

  // ===== TEST 1: 5 LỆNH RÚT TIỀN 100,000đ SONG SONG (RACE CONDITION) =====
  console.log("➤ TEST 1: Thử nghiệm 5 lệnh rút 100,000đ chạy SONG SONG (Đua số dư)");
  
  const withdrawAmount = 100000;
  let successfulWithdrawals = 0;
  let failedWithdrawals = 0;

  const withdrawalPromises = Array.from({ length: 5 }).map(async (_, idx) => {
    try {
      await prisma.$transaction(async (tx) => {
        const u = await tx.user.findUnique({ where: { id: user.id } });
        if (!u || u.walletBalance < withdrawAmount) {
          throw new Error("Số dư không đủ");
        }

        const updated = await tx.user.update({
          where: { id: user.id },
          data: {
            walletBalance: { decrement: withdrawAmount },
            pendingWithdrawalBalance: { increment: withdrawAmount }
          }
        });

        if (updated.walletBalance < 0) {
          throw new Error("Xung đột số dư âm!");
        }

        await tx.withdrawalRequest.create({
          data: {
            userId: user.id,
            amount: withdrawAmount,
            bankName: "VCB",
            bankAccountNumber: `1012345${idx}`,
            bankAccountHolder: "TEST USER",
            status: "PENDING"
          }
        });
      });
      successfulWithdrawals++;
    } catch (err: any) {
      failedWithdrawals++;
    }
  });

  await Promise.all(withdrawalPromises);

  const userAfterWithdraw = await prisma.user.findUnique({ where: { id: user.id } });
  console.log(`  • Kết quả: Thành công ${successfulWithdrawals}/5 | Bị chặn ${failedWithdrawals}/5`);
  console.log(`  • Số dư khả dụng còn lại: ${userAfterWithdraw?.walletBalance}₫ | Chờ rút: ${userAfterWithdraw?.pendingWithdrawalBalance}₫`);
  
  if (successfulWithdrawals !== 1 || userAfterWithdraw?.walletBalance !== 0 || userAfterWithdraw?.pendingWithdrawalBalance !== 100000) {
    throw new Error("❌ Thất bại: Race condition rút tiền không an toàn!");
  }
  console.log("  ✅ PASS: Đã chặn thành công 4 lệnh rút vượt quá số dư!\n");

  // ===== TEST 2: 5 LỆNH ĐẨY TOP 500 LÁ SONG SONG KHI CHỈ CÓ 600 LÁ =====
  console.log("➤ TEST 2: Thử nghiệm 5 lệnh Đẩy Top 500 Lá SONG SONG khi chỉ có 600 Lá");
  let successfulBoosts = 0;
  let failedBoosts = 0;

  const boostPromises = Array.from({ length: 5 }).map(async () => {
    try {
      await prisma.$transaction(async (tx) => {
        const u = await tx.user.findUnique({ where: { id: user.id } });
        if (!u || u.cloopCoins < 500) {
          throw new Error("Không đủ Lá");
        }

        const updated = await tx.user.update({
          where: { id: user.id },
          data: { cloopCoins: { decrement: 500 } }
        });

        if (updated.cloopCoins < 0) {
          throw new Error("Số dư Lá bị âm!");
        }
      });
      successfulBoosts++;
    } catch (err) {
      failedBoosts++;
    }
  });

  await Promise.all(boostPromises);

  const userAfterBoost = await prisma.user.findUnique({ where: { id: user.id } });
  console.log(`  • Kết quả: Thành công ${successfulBoosts}/5 | Bị chặn ${failedBoosts}/5`);
  console.log(`  • Số dư Lá còn lại: ${userAfterBoost?.cloopCoins} Lá (Kỳ vọng: 100 Lá)`);

  if (successfulBoosts !== 1 || userAfterBoost?.cloopCoins !== 100) {
    throw new Error("❌ Thất bại: Race condition Boost làm âm Lá!");
  }
  console.log("  ✅ PASS: Đã chặn thành công 4 lệnh Boost vượt quá số dư Lá!\n");

  // Dọn dẹp
  await prisma.withdrawalRequest.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });

  console.log("=================================================");
  console.log("🎉 TẤT CẢ CÁC BÀI TEST ĐỒNG THỜI (CONCURRENCY) ĐỀU ĐẠT 100%!");
  console.log("=================================================");
}

runConcurrencyStressTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
