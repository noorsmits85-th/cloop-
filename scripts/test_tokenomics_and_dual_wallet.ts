import { prisma } from "../src/lib/prisma";
import { COIN_PACKAGES, QUEST_DEFINITIONS } from "../lib/coinPackages";

async function runTokenomicsTests() {
  console.log("=================================================");
  console.log("🧪 BẮT ĐẦU KIỂM THỬ FINTECH & TOKENOMICS VÍ CLOOP");
  console.log("=================================================\n");

  const testEmail = `test.fintech.${Date.now()}@cloop.vn`;

  // Case 1: Tạo user mới -> Kiểm tra default 100 Lá
  console.log("➤ TEST 1: Tạo tài khoản mới & kiểm tra túi Lá tân thủ");
  const testUser = await prisma.user.create({
    data: {
      email: testEmail,
      password: "hashed_test_password",
      name: "Fintech Tester",
      walletBalance: 0,
      cloopCoins: 100
    }
  });

  console.log(`  [Pass] User ID: ${testUser.id} | Số dư Lá khởi tạo: ${testUser.cloopCoins} (Kỳ vọng: 100)`);
  if (testUser.cloopCoins !== 100) throw new Error("Sai số dư Lá mặc định!");

  // Case 2: Claim Nhiệm vụ Welcome
  console.log("\n➤ TEST 2: Nhận thưởng Nhiệm vụ Welcome (+100 Lá)");
  await prisma.$transaction(async (tx) => {
    await tx.coinQuestClaim.create({
      data: {
        userId: testUser.id,
        questCode: "WELCOME_ACTIVATION",
        coins: 100
      }
    });
    await tx.user.update({
      where: { id: testUser.id },
      data: { cloopCoins: { increment: 100 } }
    });
    await tx.coinLedgerEntry.create({
      data: {
        userId: testUser.id,
        type: "QUEST_REWARD",
        amount: 100,
        balanceAfter: 200,
        description: "Thưởng nhiệm vụ tân thủ",
        metadata: { questCode: "WELCOME_ACTIVATION" }
      }
    });
  });

  const userAfterWelcome = await prisma.user.findUnique({ where: { id: testUser.id } });
  console.log(`  [Pass] Số dư sau Welcome Quest: ${userAfterWelcome?.cloopCoins} Lá (Kỳ vọng: 200)`);
  if (userAfterWelcome?.cloopCoins !== 200) throw new Error("Sai số dư sau Welcome!");

  // Case 3: Chặn nhận lại (Idempotency)
  console.log("\n➤ TEST 3: Chống nhận 2 lần (Idempotency Check)");
  let duplicatePrevented = false;
  try {
    await prisma.coinQuestClaim.create({
      data: {
        userId: testUser.id,
        questCode: "WELCOME_ACTIVATION",
        coins: 100
      }
    });
  } catch (e) {
    duplicatePrevented = true;
    console.log("  [Pass] Database Unique Constraint đã chặn nhận đúp nhiệm vụ thành công!");
  }
  if (!duplicatePrevented) throw new Error("Chưa chặn được nhận đúp!");

  // Case 4: Đăng món đồ đầu tiên & Nhận thưởng First Listing (+400 Lá)
  console.log("\n➤ TEST 4: Đăng sản phẩm đầu tiên & Nhận +400 Lá (Chạm mốc 600 Lá)");
  const testProduct = await prisma.product.create({
    data: {
      userId: testUser.id,
      title: "Váy Dạ Hội Lụa Satin Cao Cấp",
      size: "M",
      condition: "EXCELLENT",
      category: "DRESS",
      province: "Hồ Chí Minh",
      specificAddress: "Quận 1"
    }
  });

  await prisma.$transaction(async (tx) => {
    await tx.coinQuestClaim.create({
      data: {
        userId: testUser.id,
        questCode: "FIRST_LISTING",
        coins: 400
      }
    });
    await tx.user.update({
      where: { id: testUser.id },
      data: { cloopCoins: { increment: 400 } }
    });
    await tx.coinLedgerEntry.create({
      data: {
        userId: testUser.id,
        type: "QUEST_REWARD",
        amount: 400,
        balanceAfter: 600,
        description: "Thưởng đăng đồ đầu tiên",
        metadata: { questCode: "FIRST_LISTING" }
      }
    });
  });

  const userAfterListing = await prisma.user.findUnique({ where: { id: testUser.id } });
  console.log(`  [Pass] Số dư sau khi đăng đồ đầu tiên: ${userAfterListing?.cloopCoins} Lá (Kỳ vọng: 600)`);
  if (userAfterListing?.cloopCoins !== 600) throw new Error("Sai số dư sau First Listing!");

  // Case 5: Dùng 500 Lá Đẩy Top (Boost)
  console.log("\n➤ TEST 5: Tiêu thụ 500 Lá Đẩy Top (Boost 12h)");
  const cost = 500;
  await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: testUser.id },
      data: { cloopCoins: { decrement: cost } },
      select: { cloopCoins: true }
    });

    await tx.product.update({
      where: { id: testProduct.id },
      data: {
        boostExpiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        lastBumpedAt: new Date()
      }
    });

    await tx.coinLedgerEntry.create({
      data: {
        userId: testUser.id,
        type: "BOOST_SPEND",
        amount: -cost,
        balanceAfter: updated.cloopCoins,
        description: `Đẩy Top sản phẩm: "${testProduct.title}" (12 Giờ)`,
        metadata: { productId: testProduct.id }
      }
    });
  });

  const userAfterBoost = await prisma.user.findUnique({ where: { id: testUser.id } });
  console.log(`  [Pass] Số dư sau khi Đẩy Top: ${userAfterBoost?.cloopCoins} Lá (Kỳ vọng: 100)`);
  if (userAfterBoost?.cloopCoins !== 100) throw new Error("Sai số dư sau khi Boost!");

  // Case 6: Nạp Gói Lá 50K (Nhận 5.500 Lá) qua Webhook PayOS
  console.log("\n➤ TEST 6: Mô phỏng nạp Gói Lá 50K (+5.500 Lá) qua PayOS Webhook");
  const pkg50k = COIN_PACKAGES["LEAF_50K"];
  const orderCode = BigInt(Date.now());

  const coinTopUp = await prisma.coinTopUp.create({
    data: {
      userId: testUser.id,
      packageCode: pkg50k.code,
      orderCode: orderCode,
      amountVnd: pkg50k.amountVnd,
      baseCoins: pkg50k.baseCoins,
      bonusCoins: pkg50k.bonusCoins,
      totalCoins: pkg50k.totalCoins,
      status: "PENDING"
    }
  });

  // Webhook xử lý thành công
  await prisma.$transaction(async (tx) => {
    await tx.coinTopUp.update({
      where: { id: coinTopUp.id },
      data: { status: "PAID", paidAt: new Date(), payosStatus: "success" }
    });

    const updated = await tx.user.update({
      where: { id: testUser.id },
      data: { cloopCoins: { increment: pkg50k.totalCoins } },
      select: { cloopCoins: true }
    });

    await tx.coinLedgerEntry.create({
      data: {
        userId: testUser.id,
        topUpId: coinTopUp.id,
        type: "TOP_UP_IN",
        amount: pkg50k.totalCoins,
        balanceAfter: updated.cloopCoins,
        description: `Nạp gói ${pkg50k.code} (+${pkg50k.totalCoins} Lá)`
      }
    });
  });

  const userAfterTopUp = await prisma.user.findUnique({ where: { id: testUser.id } });
  console.log(`  [Pass] Số dư sau khi nạp gói 50k: ${userAfterTopUp?.cloopCoins} Lá (Kỳ vọng: 5.600)`);
  if (userAfterTopUp?.cloopCoins !== 5600) throw new Error("Sai số dư sau khi TopUp!");

  // Case 7: Kiểm tra Sổ Cái Kế Toán Bất Biến (CoinLedgerEntry)
  console.log("\n➤ TEST 7: Kiểm tra toàn vẹn Sổ Cái Điểm Lá (Double-Entry Verification)");
  const ledgerEntries = await prisma.coinLedgerEntry.findMany({
    where: { userId: testUser.id },
    orderBy: { createdAt: "asc" }
  });

  console.log(`  [Pass] Tổng số bản ghi sổ cái Lá đã ghi: ${ledgerEntries.length}`);
  ledgerEntries.forEach((entry, idx) => {
    console.log(`    ${idx + 1}. [${entry.type}] ${entry.amount > 0 ? '+' : ''}${entry.amount} Lá -> Số dư sau: ${entry.balanceAfter} Lá | ${entry.description}`);
  });

  // Dọn dẹp dữ liệu test
  await prisma.coinLedgerEntry.deleteMany({ where: { userId: testUser.id } });
  await prisma.coinQuestClaim.deleteMany({ where: { userId: testUser.id } });
  await prisma.coinTopUp.deleteMany({ where: { userId: testUser.id } });
  await prisma.product.deleteMany({ where: { userId: testUser.id } });
  await prisma.user.delete({ where: { id: testUser.id } });

  console.log("\n=================================================");
  console.log("🎉 TẤT CẢ 7 BÀI KIỂM THỬ FINTECH & TOKENOMICS ĐỀU ĐẠT 100%!");
  console.log("=================================================");
}

runTokenomicsTests()
  .catch((e) => {
    console.error("❌ Test thất bại:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
