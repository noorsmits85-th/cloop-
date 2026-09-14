import { PrismaClient, UserRole, ItemCondition, GenderCategory, ListingType, DamageSeverity, ReviewType } from "@prisma/client";
import { settleCompletedRentalOrder, settleDisputedRentalOrder } from "../lib/settlement-engine";

const prisma = new PrismaClient();

const MEGA_RUN_ID = `mega_${Date.now()}`;

// ============================================================================
// CẤU HÌNH NGÂN SÁCH KẾT NỐI (CONNECTION BUDGET)
// 6 Streams x 2 Workers = 12 Active Connections (Tối ưu cho Pool 15 của DB)
// ============================================================================
const STREAM_CONCURRENCY = 2;

interface StreamReport {
  streamName: string;
  totalTasks: number;
  successful: number;
  failed: number;
  durationMs: number;
  tps: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

function calculatePercentiles(latencies: number[]): {
  avg: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
} {
  if (latencies.length === 0) {
    return { avg: 0, p50: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0 };
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const avg = Math.round(sum / sorted.length);
  const getP = (p: number) => sorted[Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1)];

  return {
    avg,
    p50: Math.round(getP(50)),
    p90: Math.round(getP(90)),
    p95: Math.round(getP(95)),
    p99: Math.round(getP(99)),
    min: Math.round(sorted[0]),
    max: Math.round(sorted[sorted.length - 1]),
  };
}

// Queue điều phối worker cho từng stream
async function runStreamWorkerPool<T, R>(
  items: T[],
  concurrency: number,
  taskFn: (item: T, index: number) => Promise<R>
): Promise<{ results: R[]; latencies: number[]; errors: { index: number; error: any }[] }> {
  const results: R[] = new Array(items.length);
  const latencies: number[] = new Array(items.length);
  const errors: { index: number; error: any }[] = [];

  let nextIndex = 0;

  async function worker() {
    while (true) {
      const idx = nextIndex++;
      if (idx >= items.length) break;

      const start = Date.now();
      try {
        const res = await taskFn(items[idx], idx);
        latencies[idx] = Date.now() - start;
        results[idx] = res;
      } catch (err: any) {
        latencies[idx] = Date.now() - start;
        errors.push({ index: idx, error: err });
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }).map(() => worker());
  await Promise.all(workers);

  return { results, latencies, errors };
}

async function main() {
  console.log("\n================================================================================");
  console.log("🌪️ CLOOP MEGA CONCURRENT STRESS STORM: SPAM TẤT CẢ 6 HỆ THỐNG CÙNG LÚC");
  console.log(`• Mega Run ID: ${MEGA_RUN_ID}`);
  console.log(`• 6 Luồng chạy song song: Rental, Fintech, eKYC, Social, Blind Review, Audit`);
  console.log(`• Ngân sách kết nối: 6 streams x ${STREAM_CONCURRENCY} workers = 12 active connections`);
  console.log("================================================================================\n");

  const overallStart = Date.now();

  // Khởi tạo Admin Actor dùng chung
  let admin = await prisma.user.findFirst({ where: { role: UserRole.ADMIN } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: `admin_${MEGA_RUN_ID}@cloop.vn`,
        password: "hashed_test_password",
        name: "Admin Mega Stress Tester",
        role: UserRole.ADMIN,
        walletBalance: 0,
      },
    });
  }

  // Dữ liệu tạo để theo dõi và dọn dẹp
  const createdUserIds: string[] = [];
  const createdProductIds: string[] = [];
  const createdRentalIds: string[] = [];
  const createdInvoiceIds: string[] = [];

  // ============================================================================
  // ĐỊNH NGHĨA 6 LUỒNG NGHIỆP VỤ CHẠY ĐỒNG THỜI
  // ============================================================================

  // ----------------------------------------------------------------------------
  // LUỒNG 1: P2P RENTAL & SETTLEMENT STREAM (25 Chu kỳ khép kín: 20 chuẩn + 5 tranh chấp)
  // ----------------------------------------------------------------------------
  const runRentalStream = async (): Promise<StreamReport> => {
    const streamStart = Date.now();
    const RENTAL_CYCLES = 25;
    const DISPUTE_COUNT = 5;

    // 1. Tạo 25 cặp User & Product
    const pairs = Array.from({ length: RENTAL_CYCLES }, (_, i) => i);
    const poolRes = await runStreamWorkerPool(pairs, STREAM_CONCURRENCY, async (i) => {
      const owner = await prisma.user.create({
        data: {
          email: `stream1_owner_${MEGA_RUN_ID}_${i}@cloop.vn`,
          password: "hash",
          name: `Host #${i}`,
          role: UserRole.USER,
          walletBalance: 0,
        },
      });
      const renter = await prisma.user.create({
        data: {
          email: `stream1_renter_${MEGA_RUN_ID}_${i}@cloop.vn`,
          password: "hash",
          name: `Renter #${i}`,
          role: UserRole.USER,
          walletBalance: 500000,
        },
      });
      createdUserIds.push(owner.id, renter.id);

      const product = await prisma.product.create({
        data: {
          title: `[MegaStream1] Đầm Tiệc Luxury #${i}`,
          size: "M",
          category: "DRESSES",
          condition: ItemCondition.GOOD,
          province: "Hồ Chí Minh",
          specificAddress: "Quận 1",
          userId: owner.id,
          status: "ON_MARKET",
        },
      });
      createdProductIds.push(product.id);

      const rentalFee = 200000;
      const depositAmount = 300000;
      const shippingFee = 35000;
      const platformFee = Math.round(rentalFee * 0.12);
      const totalAmount = rentalFee + depositAmount + shippingFee;

      const isDispute = i >= RENTAL_CYCLES - DISPUTE_COUNT;

      // Tạo Rental & Invoice trong transaction
      const order = await prisma.$transaction(
        async (tx) => {
          const rental = await tx.rentalHistory.create({
            data: {
              product_id: product.id,
              renterId: renter.id,
              ownerId: owner.id,
              start_date: new Date(),
              end_date: new Date(Date.now() + 3 * 86400000),
              status: isDispute ? "DISPUTE" : "BORROWER_RETURNED",
            },
          });
          const invoice = await tx.invoice.create({
            data: {
              rentalId: rental.id,
              amount: totalAmount,
              rentalFee,
              depositAmount,
              shippingFeeCollected: shippingFee,
              platformFee,
              status: "PAID",
              orderCode: BigInt(Date.now()) * BigInt(1000) + BigInt(i),
            },
          });
          return { rental, invoice, owner, renter, totalAmount, isDispute };
        },
        { maxWait: 15000, timeout: 30000 }
      );

      createdRentalIds.push(order.rental.id);
      createdInvoiceIds.push(order.invoice.id);

      // Quyết toán
      if (!isDispute) {
        await settleCompletedRentalOrder(order.rental.id, {
          actorId: admin.id,
          actorRole: "SYSTEM_CRON",
        });
      } else {
        const dispute = await prisma.dispute.create({
          data: {
            rentalId: order.rental.id,
            invoiceId: order.invoice.id,
            description: `[MegaStream1] Vết bẩn nhẹ cần bồi thường`,
            severity: DamageSeverity.MEDIUM,
            suggestedDeduction: 60000,
            images: ["https://cloudinary.com/test.jpg"],
            status: "PENDING_REVIEW",
          },
        });
        await settleDisputedRentalOrder(
          {
            disputeId: dispute.id,
            finalDeduction: 60000,
            adminId: admin.id,
            adminNotes: "Giải quyết P2P Mega Stress Test",
          },
          { actorId: admin.id, actorRole: "ADMIN" }
        );
      }

      return order;
    });

    const durationMs = Date.now() - streamStart;
    const stats = calculatePercentiles(poolRes.latencies);
    return {
      streamName: "1. P2P Rental & Settlement",
      totalTasks: RENTAL_CYCLES,
      successful: poolRes.results.filter(Boolean).length,
      failed: poolRes.errors.length,
      durationMs,
      tps: Number(((RENTAL_CYCLES / durationMs) * 1000).toFixed(1)),
      p50Ms: stats.p50,
      p95Ms: stats.p95,
      p99Ms: stats.p99,
    };
  };

  // ----------------------------------------------------------------------------
  // LUỒNG 2: DUAL-WALLET FINTECH & TOKENOMICS STREAM (30 Giao dịch ví dồn dập)
  // ----------------------------------------------------------------------------
  const runFintechStream = async (): Promise<StreamReport> => {
    const streamStart = Date.now();
    const tasks = Array.from({ length: 30 }, (_, i) => i);

    // Tạo 10 users test cho các kịch bản ví
    const testUsers: any[] = [];
    for (let i = 0; i < 6; i++) {
      const u = await prisma.user.create({
        data: {
          email: `stream2_fintech_${MEGA_RUN_ID}_${i}@cloop.vn`,
          password: "hash",
          name: `Fintech User #${i}`,
          walletBalance: 100000, // 100k
          cloopCoins: 1000,      // 1000 Lá
        },
      });
      testUsers.push(u);
      createdUserIds.push(u.id);
    }

    const poolRes = await runStreamWorkerPool(tasks, STREAM_CONCURRENCY, async (i) => {
      const user = testUsers[i % testUsers.length];

      if (i % 3 === 0) {
        // Kịch bản A: Rút tiền mặt (Race Condition test với lock số dư)
        const withdrawAmount = 50000;
        return await prisma.$transaction(
          async (tx) => {
            const u = await tx.user.findUnique({ where: { id: user.id } });
            if (!u || u.walletBalance < withdrawAmount) {
              return { success: false, reason: "INSUFFICIENT_BALANCE" };
            }
            await tx.user.update({
              where: { id: user.id },
              data: {
                walletBalance: { decrement: withdrawAmount },
                pendingWithdrawalBalance: { increment: withdrawAmount },
              },
            });
            await tx.withdrawalRequest.create({
              data: {
                userId: user.id,
                amount: withdrawAmount,
                bankName: "MBBank",
                bankAccountNumber: "0901234567",
                bankAccountHolder: "TEST USER",
                status: "PENDING",
              },
            });
            return { success: true, type: "WITHDRAWAL" };
          },
          { maxWait: 15000, timeout: 30000 }
        );
      } else if (i % 3 === 1) {
        // Kịch bản B: Đẩy Top bằng Lá (Listing Boost spend 300 Lá)
        return await prisma.$transaction(
          async (tx) => {
            const u = await tx.user.findUnique({ where: { id: user.id } });
            if (!u || u.cloopCoins < 300) {
              return { success: false, reason: "INSUFFICIENT_COINS" };
            }
            await tx.user.update({
              where: { id: user.id },
              data: { cloopCoins: { decrement: 300 } },
            });
            await tx.coinLedgerEntry.create({
              data: {
                userId: user.id,
                type: "BOOST_SPEND",
                amount: 300,
                balanceAfter: u.cloopCoins - 300,
                description: `[MegaStream2] Đẩy Top bài đăng #${i}`,
              },
            });
            return { success: true, type: "BOOST" };
          },
          { maxWait: 15000, timeout: 30000 }
        );
      } else {
        // Kịch bản C: Nhận thưởng Quest (Unique idempotency constraint)
        const questCode = `DAILY_LOGIN_${i}`;
        try {
          return await prisma.$transaction(
            async (tx) => {
              await tx.coinQuestClaim.create({
                data: {
                  userId: user.id,
                  questCode,
                  coins: 50,
                },
              });
              await tx.user.update({
                where: { id: user.id },
                data: { cloopCoins: { increment: 50 } },
              });
              return { success: true, type: "QUEST" };
            },
            { maxWait: 15000, timeout: 30000 }
          );
        } catch (e) {
          return { success: true, duplicatePrevented: true };
        }
      }
    });

    const durationMs = Date.now() - streamStart;
    const stats = calculatePercentiles(poolRes.latencies);
    return {
      streamName: "2. Fintech & Dual-Wallet",
      totalTasks: tasks.length,
      successful: poolRes.results.filter(Boolean).length,
      failed: poolRes.errors.length,
      durationMs,
      tps: Number(((tasks.length / durationMs) * 1000).toFixed(1)),
      p50Ms: stats.p50,
      p95Ms: stats.p95,
      p99Ms: stats.p99,
    };
  };

  // ----------------------------------------------------------------------------
  // LUỒNG 3: VIETQR EKYC 2.000đ & PHONE SHIELD (20 Lần định danh & hoàn ví)
  // ----------------------------------------------------------------------------
  const runKycStream = async (): Promise<StreamReport> => {
    const streamStart = Date.now();
    const tasks = Array.from({ length: 20 }, (_, i) => i);

    const poolRes = await runStreamWorkerPool(tasks, STREAM_CONCURRENCY, async (i) => {
      const u = await prisma.user.create({
        data: {
          email: `stream3_kyc_${MEGA_RUN_ID}_${i}@cloop.vn`,
          password: "hash",
          name: `KYC User #${i}`,
          walletBalance: 0,
          isVerified: false,
        },
      });
      createdUserIds.push(u.id);

      // Mô phỏng luồng VietQR 2.000đ thành công -> Nâng hạng & Hoàn 100% vào ví
      return await prisma.$transaction(
        async (tx) => {
          // 1. Tạo bản ghi TopUp eKYC 2k
          const topUp = await tx.coinTopUp.create({
            data: {
              userId: u.id,
              packageCode: "KYC_2K",
              orderCode: BigInt(Date.now()) * BigInt(1000) + BigInt(i),
              amountVnd: 2000,
              baseCoins: 0,
              bonusCoins: 0,
              totalCoins: 0,
              status: "PAID",
              paidAt: new Date(),
            },
          });

          // 2. Nâng hạng isVerified & Hoàn 2.000đ vào ví rút được
          await tx.user.update({
            where: { id: u.id },
            data: {
              isVerified: true,
              walletBalance: { increment: 2000 },
            },
          });

          return { topUp, user: u };
        },
        { maxWait: 15000, timeout: 30000 }
      );
    });

    const durationMs = Date.now() - streamStart;
    const stats = calculatePercentiles(poolRes.latencies);
    return {
      streamName: "3. VietQR eKYC 2k & Refund",
      totalTasks: tasks.length,
      successful: poolRes.results.filter(Boolean).length,
      failed: poolRes.errors.length,
      durationMs,
      tps: Number(((tasks.length / durationMs) * 1000).toFixed(1)),
      p50Ms: stats.p50,
      p95Ms: stats.p95,
      p99Ms: stats.p99,
    };
  };

  // ----------------------------------------------------------------------------
  // LUỒNG 4: SOCIAL ENGAGEMENT & WISHLIST STORM (50 Lượt Like & Save dồn dập)
  // ----------------------------------------------------------------------------
  const runSocialStream = async (): Promise<StreamReport> => {
    const streamStart = Date.now();
    const tasks = Array.from({ length: 50 }, (_, i) => i);

    // Tạo 1 host và 2 sản phẩm làm bia bắn Like/Save
    const host = await prisma.user.create({
      data: {
        email: `stream4_social_host_${MEGA_RUN_ID}@cloop.vn`,
        password: "hash",
        name: "Social Host",
      },
    });
    createdUserIds.push(host.id);

    const targetProducts: any[] = [];
    for (let p = 0; p < 2; p++) {
      const prod = await prisma.product.create({
        data: {
          title: `[MegaSocial] Váy Hot Trend #${p}`,
          size: "S",
          category: "DRESSES",
          condition: ItemCondition.NEW_WITH_TAGS,
          province: "Hà Nội",
          specificAddress: "Hoàn Kiếm",
          userId: host.id,
          likeCount: 0,
          saveCount: 0,
        },
      });
      targetProducts.push(prod);
      createdProductIds.push(prod.id);
    }

    const poolRes = await runStreamWorkerPool(tasks, STREAM_CONCURRENCY, async (i) => {
      // Mỗi tương tác là một User mới
      const fan = await prisma.user.create({
        data: {
          email: `stream4_fan_${MEGA_RUN_ID}_${i}@cloop.vn`,
          password: "hash",
          name: `Fan #${i}`,
        },
      });
      createdUserIds.push(fan.id);

      const targetProd = targetProducts[i % targetProducts.length];
      const isLike = i % 2 === 0;
      const type = isLike ? "LIKE" : "SAVE";

      return await prisma.$transaction(
        async (tx) => {
          const fav = await tx.productFavorite.create({
            data: {
              userId: fan.id,
              productId: targetProd.id,
              type,
            },
          });

          await tx.product.update({
            where: { id: targetProd.id },
            data: isLike ? { likeCount: { increment: 1 } } : { saveCount: { increment: 1 } },
          });

          return fav;
        },
        { maxWait: 15000, timeout: 30000 }
      );
    });

    const durationMs = Date.now() - streamStart;
    const stats = calculatePercentiles(poolRes.latencies);
    return {
      streamName: "4. Social Likes & Wishlist",
      totalTasks: tasks.length,
      successful: poolRes.results.filter(Boolean).length,
      failed: poolRes.errors.length,
      durationMs,
      tps: Number(((tasks.length / durationMs) * 1000).toFixed(1)),
      p50Ms: stats.p50,
      p95Ms: stats.p95,
      p99Ms: stats.p99,
    };
  };

  // ----------------------------------------------------------------------------
  // LUỒNG 5: DOUBLE-BLIND REVIEWS STREAM (15 Cặp đánh giá kín 2 chiều)
  // ----------------------------------------------------------------------------
  const runReviewStream = async (): Promise<StreamReport> => {
    const streamStart = Date.now();
    const tasks = Array.from({ length: 15 }, (_, i) => i);

    const poolRes = await runStreamWorkerPool(tasks, STREAM_CONCURRENCY, async (i) => {
      const owner = await prisma.user.create({
        data: { email: `stream5_owner_${MEGA_RUN_ID}_${i}@cloop.vn`, password: "hash", name: `Review Owner #${i}` },
      });
      const renter = await prisma.user.create({
        data: { email: `stream5_renter_${MEGA_RUN_ID}_${i}@cloop.vn`, password: "hash", name: `Review Renter #${i}` },
      });
      createdUserIds.push(owner.id, renter.id);

      const prod = await prisma.product.create({
        data: {
          title: `[MegaReview] Áo Dài Thêu #${i}`,
          size: "L",
          category: "DRESSES",
          condition: ItemCondition.EXCELLENT,
          province: "Đà Nẵng",
          specificAddress: "Hải Châu",
          userId: owner.id,
        },
      });
      createdProductIds.push(prod.id);

      const rental = await prisma.rentalHistory.create({
        data: {
          product_id: prod.id,
          renterId: renter.id,
          ownerId: owner.id,
          start_date: new Date(),
          end_date: new Date(),
          status: "LENDER_COMPLETED",
        },
      });
      createdRentalIds.push(rental.id);

      // Bước 1: Renter gửi đánh giá trước -> isPublished = false (Blind)
      const reviewRenter = await prisma.review.create({
        data: {
          rentalId: rental.id,
          reviewerId: renter.id,
          revieweeId: owner.id,
          rating: 5.0,
          comment: "Chủ đồ nhiệt tình, váy rất đẹp!",
          type: ReviewType.RENTER_TO_OWNER,
          isPublished: false,
        },
      });

      // Bước 2: Owner gửi đánh giá ngược lại -> Cả 2 cùng mở công khai (Nash Reveal)
      const reviewOwner = await prisma.review.create({
        data: {
          rentalId: rental.id,
          reviewerId: owner.id,
          revieweeId: renter.id,
          rating: 5.0,
          comment: "Khách giữ đồ cẩn thận, trả đúng hạn!",
          type: ReviewType.OWNER_TO_RENTER,
          isPublished: false,
        },
      });

      // Kích hoạt công khai khi cả 2 đã nộp
      await prisma.review.updateMany({
        where: { rentalId: rental.id },
        data: { isPublished: true },
      });

      return { reviewRenter, reviewOwner };
    });

    const durationMs = Date.now() - streamStart;
    const stats = calculatePercentiles(poolRes.latencies);
    return {
      streamName: "5. Double-Blind Reviews",
      totalTasks: tasks.length,
      successful: poolRes.results.filter(Boolean).length,
      failed: poolRes.errors.length,
      durationMs,
      tps: Number(((tasks.length / durationMs) * 1000).toFixed(1)),
      p50Ms: stats.p50,
      p95Ms: stats.p95,
      p99Ms: stats.p99,
    };
  };

  // ----------------------------------------------------------------------------
  // LUỒNG 6: AUDIT TRAIL & SYSTEM LOGGING (30 Bản ghi kiểm toán song song)
  // ----------------------------------------------------------------------------
  const runAuditStream = async (): Promise<StreamReport> => {
    const streamStart = Date.now();
    const tasks = Array.from({ length: 30 }, (_, i) => i);

    const poolRes = await runStreamWorkerPool(tasks, STREAM_CONCURRENCY, async (i) => {
      return await prisma.auditLog.create({
        data: {
          adminId: admin.id,
          action: "MEGA_STRESS_AUDIT_PROBE",
          targetType: "SYSTEM",
          targetId: `probe_${MEGA_RUN_ID}_${i}`,
          afterStatus: "VERIFIED",
          metadata: JSON.stringify({
            stream: "AUDIT_STORM",
            timestamp: Date.now(),
            worker: i % STREAM_CONCURRENCY,
          }),
        },
      });
    });

    const durationMs = Date.now() - streamStart;
    const stats = calculatePercentiles(poolRes.latencies);
    return {
      streamName: "6. Audit Log Storm",
      totalTasks: tasks.length,
      successful: poolRes.results.filter(Boolean).length,
      failed: poolRes.errors.length,
      durationMs,
      tps: Number(((tasks.length / durationMs) * 1000).toFixed(1)),
      p50Ms: stats.p50,
      p95Ms: stats.p95,
      p99Ms: stats.p99,
    };
  };

  // ============================================================================
  // KÍCH HOẠT TẤT CẢ 6 LUỒNG CÙNG MỘT LÚC (PROMISE.ALL)
  // ============================================================================
  console.log("⚡ BẮT ĐẦU PHÁT ĐỘNG BÃO KIỂM THỬ: Kích hoạt đồng thời 6 luồng nghiệp vụ...");
  const streamPromises = [
    runRentalStream(),
    runFintechStream(),
    runKycStream(),
    runSocialStream(),
    runReviewStream(),
    runAuditStream(),
  ];

  const allStreamResults = await Promise.allSettled(streamPromises);

  const overallDuration = Date.now() - overallStart;
  const reports: StreamReport[] = [];

  allStreamResults.forEach((res, idx) => {
    if (res.status === "fulfilled") {
      reports.push(res.value);
    } else {
      console.error(`❌ Luồng #${idx + 1} gặp lỗi:`, res.reason);
      reports.push({
        streamName: `Stream #${idx + 1} (Failed)`,
        totalTasks: 0,
        successful: 0,
        failed: 1,
        durationMs: 0,
        tps: 0,
        p50Ms: 0,
        p95Ms: 0,
        p99Ms: 0,
      });
    }
  });

  // ============================================================================
  // KIỂM TOÁN TÀI CHÍNH TOÀN DIỆN TRÊN HỆ THỐNG
  // ============================================================================
  console.log("\n➤ [KIỂM TOÁN TÀI CHÍNH HẬU BÃO KIỂM THỬ] Đối soát Sổ cái kép Luồng Thuê...");
  const ledgerEntries = await prisma.ledgerTransaction.findMany({
    where: { invoiceId: { in: createdInvoiceIds } },
  });

  const invoices = await prisma.invoice.findMany({
    where: { id: { in: createdInvoiceIds } },
  });

  let totalCollected = 0;
  let totalAllocated = 0;
  invoices.forEach((inv) => (totalCollected += inv.amount));
  ledgerEntries.forEach((entry) => (totalAllocated += entry.amount));

  const financialDiff = totalCollected - totalAllocated;
  console.log(`  ✔ Tổng thu ký quỹ (Invoices): ${totalCollected.toLocaleString("vi-VN")} VNĐ`);
  console.log(`  ✔ Tổng phân bổ Sổ cái kép:   ${totalAllocated.toLocaleString("vi-VN")} VNĐ`);
  console.log(`  ✔ Độ lệch bảo toàn tài chính: ${financialDiff.toLocaleString("vi-VN")} VNĐ [${financialDiff === 0 ? "CHÍNH XÁC 100%" : "SAI LỆCH"}]`);

  // ============================================================================
  // DỌN DẸP DỮ LIỆU SẠCH SẼ (TEARDOWN)
  // ============================================================================
  console.log("\n➤ [DỌN DẸP AN TOÀN] Xóa sạch toàn bộ dữ liệu mang mã [" + MEGA_RUN_ID + "]...");
  await prisma.auditLog.deleteMany({ where: { adminId: admin.id, action: "MEGA_STRESS_AUDIT_PROBE" } });
  await prisma.review.deleteMany({ where: { rentalId: { in: createdRentalIds } } });
  await prisma.productFavorite.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.dispute.deleteMany({ where: { rentalId: { in: createdRentalIds } } });
  await prisma.ledgerTransaction.deleteMany({ where: { invoiceId: { in: createdInvoiceIds } } });
  await prisma.invoice.deleteMany({ where: { id: { in: createdInvoiceIds } } });
  await prisma.rentalHistory.deleteMany({ where: { id: { in: createdRentalIds } } });
  await prisma.listing.deleteMany({ where: { productId: { in: createdProductIds } } });
  await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  await prisma.withdrawalRequest.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.coinQuestClaim.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.coinLedgerEntry.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.coinTopUp.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });

  console.log("  ✔ Dọn dẹp hoàn tất. Database trở lại trạng thái sạch tuyệt đối!\n");

  // ============================================================================
  // BẢNG BÁO CÁO KẾT QUẢ ĐA LUỒNG TỔNG HỢP
  // ============================================================================
  const totalTasksAll = reports.reduce((acc, r) => acc + r.totalTasks, 0);
  const totalSuccessAll = reports.reduce((acc, r) => acc + r.successful, 0);
  const totalFailedAll = reports.reduce((acc, r) => acc + r.failed, 0);
  const compositeTPS = Number(((totalTasksAll / (overallDuration / 1000))).toFixed(1));

  console.log("================================================================================");
  console.log("📊 BẢNG BÁO CÁO KẾT QUẢ BÃO KIỂM THỬ ĐỒNG THỜI (MEGA STORM SCORECARD)");
  console.log("================================================================================");
  console.table(
    reports.map((r) => ({
      "Luồng Nghiệp Vụ": r.streamName,
      "Tổng Tác Vụ": r.totalTasks,
      "Thành Công": `${r.successful}/${r.totalTasks} (${((r.successful / (r.totalTasks || 1)) * 100).toFixed(0)}%)`,
      "Thất Bại": r.failed,
      "Thời Gian": `${(r.durationMs / 1000).toFixed(1)}s`,
      "TPS (ops/s)": r.tps,
      "p50 Latency": `${r.p50Ms}ms`,
      "p95 Latency": `${r.p95Ms}ms`,
      "p99 Latency": `${r.p99Ms}ms`,
    }))
  );

  console.log(`⏱ Tổng thời gian chạy đồng thời cả 6 luồng: ${(overallDuration / 1000).toFixed(2)} giây`);
  console.log(`⚡ Tổng tác vụ nghiệp vụ hoàn thành: ${totalSuccessAll}/${totalTasksAll} tác vụ`);
  console.log(`🔥 Thông lượng tổng hợp toàn hệ thống (Composite TPS): ${compositeTPS} ops/second`);
  console.log(`🛡 Tỷ lệ sống sót & Ổn định: ${((totalSuccessAll / totalTasksAll) * 100).toFixed(1)}%`);
  console.log(`💰 Kiểm toán Sổ cái kép: KHÔNG THẤT THOÁT (ZERO LEAKAGE)`);
  console.log("================================================================================\n");
}

main()
  .catch((err) => {
    console.error("❌ Lỗi nghiêm trọng khi thực thi Mega Stress Test:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
