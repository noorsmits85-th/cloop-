import { prisma } from '@/src/lib/prisma';
import { requireAdminOrRedirect } from '@/src/lib/auth';
import AdminDashboardClient from './AdminDashboardClient';

export const dynamic = "force-dynamic";

const OPEN_RENTAL_STATUSES = [
  "PENDING_APPROVAL",
  "OWNER_PACKED",
  "LENDER_SHIPPED",
  "BORROWER_RECEIVED",
  "BORROWER_RETURNED",
  "DISPUTE"
] as const;

/**
 * Bọc một Promise truy vấn Prisma với thời gian chờ tối đa (timeout) và giá trị fallback an toàn.
 * Đảm bảo KHÔNG BAO GIỜ làm sập React Server Component khi mạng chậm hoặc pooler Supavisor bận.
 */
async function safeQuery<T>(
  queryLabel: string,
  queryFn: () => Promise<T>,
  fallbackValue: T,
  timeoutMs = 8000
): Promise<T> {
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    );
    return await Promise.race([queryFn(), timeoutPromise]);
  } catch (error) {
    console.error(`[AdminSafeQuery Error - ${queryLabel}]:`, error);
    return fallbackValue;
  }
}

/**
 * Giải nén kết quả từ Promise.allSettled an toàn
 */
function unwrapSettled<T>(
  result: PromiseSettledResult<T>,
  fallbackValue: T
): T {
  return result.status === "fulfilled" && result.value !== undefined && result.value !== null
    ? result.value
    : fallbackValue;
}

/**
 * Format ngày tháng an toàn, chống crash khi gặp Invalid Date hoặc null/undefined
 */
function formatDateSafe(
  dateInput: any,
  locale = "vi-VN"
): string {
  if (!dateInput) return "—";
  try {
    const parsedDate = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (Number.isNaN(parsedDate.getTime())) {
      return "—";
    }
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Ho_Chi_Minh"
    }).format(parsedDate);
  } catch {
    return "—";
  }
}

/**
 * Cắt chuỗi ID an toàn, tránh lỗi .slice() trên undefined/null
 */
function formatIdSafe(id: unknown, length = 8): string {
  if (typeof id !== "string" || id.trim().length === 0) return "UNKNOWN";
  return id.slice(0, length).toUpperCase();
}

export default async function AdminPage() {
  // 1. Đồng bộ xác thực an toàn (tự động redirect nếu không có quyền)
  // Lưu ý: Đặt bên ngoài try-catch để Next.js xử lý NEXT_REDIRECT nội bộ bình thường.
  const { authUser, profile } = await requireAdminOrRedirect();

  // 2. Khởi tạo giá trị mặc định phòng thủ an toàn (Fault-Tolerant Defaults)
  let totalUsers = 0;
  let totalProducts = 0;
  let totalRentals = 0;
  let allRentals: any[] = [];
  let paidInvoiceAgg: any = { _sum: { amount: 0, depositAmount: 0, platformFee: 0, rentalFee: 0 } };
  let activeEscrowRentals: any[] = [];
  let feeRetainedAgg: any = { _sum: { amount: 0 } };
  let topUpAgg: any = { _sum: { amountVnd: 0, totalCoins: 0 } };
  let recentTopUps: any[] = [];
  let pendingWithdrawals: any[] = [];

  // 3. Khối try-catch tổng bảo vệ toàn bộ tầng Data Fetching, chia làm 3 đợt Batching
  // nhằm tránh làm nghẽn hàng đợi kết nối Supavisor Pooler (connection_limit=1).
  try {
    // ĐỢT 1: Chạy các truy vấn đếm (Count) nhẹ trước
    const batch1Results = await Promise.allSettled([
      safeQuery("totalUsers", () => prisma.user.count(), 0),
      safeQuery("totalProducts", () => prisma.product.count({ where: { isDeleted: false } }), 0),
      safeQuery("totalRentals", () => prisma.rentalHistory.count({ where: { isDeleted: false } }), 0),
    ]);

    totalUsers = unwrapSettled(batch1Results[0], 0);
    totalProducts = unwrapSettled(batch1Results[1], 0);
    totalRentals = unwrapSettled(batch1Results[2], 0);

    // ĐỢT 2: Chạy các truy vấn tổng hợp tài chính (Aggregations)
    const batch2Results = await Promise.allSettled([
      // GMV thực tế từ các hóa đơn đã thanh toán
      safeQuery(
        "paidInvoiceAgg",
        () => prisma.invoice.aggregate({
          where: { isDeleted: false, status: 'PAID' },
          _sum: { amount: true, depositAmount: true, platformFee: true, rentalFee: true }
        }),
        { _sum: { amount: 0, depositAmount: 0, platformFee: 0, rentalFee: 0 } }
      ),
      // Tiền cọc Escrow thực tế đang giữ
      safeQuery(
        "activeEscrowRentals",
        () => prisma.rentalHistory.findMany({
          where: {
            isDeleted: false,
            status: { in: [...OPEN_RENTAL_STATUSES] },
            invoice: { status: 'PAID' }
          },
          select: { invoice: { select: { depositAmount: true } } }
        }),
        []
      ),
      // Phí dịch vụ sàn thực tế trong Sổ cái
      safeQuery(
        "feeRetainedAgg",
        () => prisma.ledgerTransaction.aggregate({
          where: { type: 'FEE_RETAINED', status: 'COMPLETED' },
          _sum: { amount: true }
        }),
        { _sum: { amount: 0 } }
      ),
      // Doanh thu bán Xu Lá thực tế
      safeQuery(
        "topUpAgg",
        () => prisma.coinTopUp.aggregate({
          where: { status: 'PAID' },
          _sum: { amountVnd: true, totalCoins: true }
        }),
        { _sum: { amountVnd: 0, totalCoins: 0 } }
      ),
    ]);

    paidInvoiceAgg = unwrapSettled(batch2Results[0], { _sum: { amount: 0, depositAmount: 0, platformFee: 0, rentalFee: 0 } });
    activeEscrowRentals = unwrapSettled(batch2Results[1], []);
    feeRetainedAgg = unwrapSettled(batch2Results[2], { _sum: { amount: 0 } });
    topUpAgg = unwrapSettled(batch2Results[3], { _sum: { amountVnd: 0, totalCoins: 0 } });

    // ĐỢT 3: Chạy các truy vấn lấy danh sách gần nhất (findMany)
    const batch3Results = await Promise.allSettled([
      safeQuery(
        "allRentals",
        () => prisma.rentalHistory.findMany({
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            status: true,
            start_date: true,
            end_date: true,
            renter_name: true,
            renter_phone: true,
            owner_name: true,
            owner_phone: true,
            shippingCode: true,
            createdAt: true,
            product: { 
              select: { 
                title: true, 
                images: { take: 1, select: { url: true } }, 
                listings: { take: 1, select: { basePrice: true, deposit: true } },
                user: { select: { name: true } }
              } 
            },
            renter: { select: { name: true } },
            invoice: { select: { amount: true, depositAmount: true, rentalFee: true, platformFee: true, status: true } },
            disputes: { take: 1, select: { id: true } }
          }
        }),
        []
      ),
      safeQuery(
        "recentTopUps",
        () => prisma.coinTopUp.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          where: { status: 'PAID' },
          select: {
            id: true,
            amountVnd: true,
            totalCoins: true,
            createdAt: true,
            user: { select: { name: true } }
          }
        }),
        []
      ),
      safeQuery(
        "pendingWithdrawals",
        () => prisma.withdrawalRequest.findMany({
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            amount: true,
            bankName: true,
            bankAccountNumber: true,
            bankAccountHolder: true,
            createdAt: true
          }
        }),
        []
      ),
    ]);

    allRentals = unwrapSettled(batch3Results[0], []);
    recentTopUps = unwrapSettled(batch3Results[1], []);
    pendingWithdrawals = unwrapSettled(batch3Results[2], []);

  } catch (globalCatchError) {
    // Lớp phòng thủ cuối cùng: Ghi nhận lỗi và tiếp tục render với fallback mặc định
    console.error("[AdminDashboard Global Catch]:", globalCatchError);
  }

  // 4. Tính toán chỉ số tài chính với kiểm tra an toàn
  const totalGMV = paidInvoiceAgg?._sum?.amount || 0;
  const totalDepositEscrow = Array.isArray(activeEscrowRentals)
    ? activeEscrowRentals.reduce((sum, r) => sum + (r?.invoice?.depositAmount || 0), 0)
    : 0;
  const totalPlatformFee = feeRetainedAgg?._sum?.amount || (paidInvoiceAgg?._sum?.platformFee || 0);
  const totalCoinRevenue = topUpAgg?._sum?.amountVnd || 0;
  const totalCoinsIssued = topUpAgg?._sum?.totalCoins || 0;

  const metrics = {
    totalUsers: Number(totalUsers || 0),
    totalProducts: Number(totalProducts || 0),
    totalRentals: Number(totalRentals || 0),
    totalGMV: Number(totalGMV || 0),
    totalDepositEscrow: Number(totalDepositEscrow || 0),
    totalPlatformFee: Number(totalPlatformFee || 0),
    totalCoinRevenue: Number(totalCoinRevenue || 0),
    totalCoinsIssued: Number(totalCoinsIssued || 0)
  };

  // 5. Chuẩn hóa danh sách đơn hàng an toàn (Không bao giờ văng Exception)
  const formattedOrders = (allRentals || []).map((rent, idx) => {
    const inv = rent?.invoice;
    const isPaid = inv?.status === 'PAID';
    const isPending = inv?.status === 'PENDING';
    const rentId = rent?.id || `ORD-FB-${idx}`;

    return {
      id: rentId,
      code: `ORD-${formatIdSafe(rentId, 8)}`,
      productTitle: rent?.product?.title || "Trang phục CLOOP",
      productImage: (rent?.product?.images && rent.product.images.length > 0)
        ? rent.product.images[0].url
        : "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790530424/cloop_mobile_closet/pt4xccwmvrjsrnhrgnib.png",
      renterName: rent?.renter_name || rent?.renter?.name || "Khách thuê",
      renterPhone: rent?.renter_phone || "—",
      ownerName: rent?.owner_name || rent?.product?.user?.name || "Chủ tủ",
      ownerPhone: rent?.owner_phone || "—",
      startDate: formatDateSafe(rent?.start_date),
      endDate: formatDateSafe(rent?.end_date),
      rentalFee: Number(inv?.rentalFee || 0),
      depositAmount: Number(inv?.depositAmount || 0),
      totalAmount: Number(inv?.amount || 0),
      platformFee: Number(inv?.platformFee || 0),
      paymentStatus: isPaid ? 'ĐÃ_THANH_TOÁN' : (isPending ? 'CHỜ_THANH_TOÁN' : 'CHƯA_CÓ_HÓA_ĐƠN'),
      status: rent?.status || "PENDING_APPROVAL",
      shippingCode: rent?.shippingCode || "Chưa tạo mã",
      hasDispute: Boolean(rent?.disputes && rent.disputes.length > 0),
      createdAt: formatDateSafe(rent?.createdAt)
    };
  });

  const safeTopUps = (recentTopUps || []).map((t) => ({
    ...t,
    amountVnd: Number(t?.amountVnd || 0),
    totalCoins: Number(t?.totalCoins || 0),
    createdAt: formatDateSafe(t?.createdAt)
  }));

  const safeWithdrawals = (pendingWithdrawals || []).map((w) => ({
    ...w,
    amount: Number(w?.amount || 0),
    createdAt: formatDateSafe(w?.createdAt)
  }));

  const adminDisplayName = profile?.name || authUser?.name || authUser?.email?.split('@')[0] || "Quản trị viên";

  return (
    <div className="w-full pb-16 text-stone-800 font-sans">
      <AdminDashboardClient 
        currentAdmin={{ name: adminDisplayName }} 
        metrics={metrics}
        recentRentals={formattedOrders}
        recentTopUps={safeTopUps}
        pendingWithdrawals={safeWithdrawals}
      />
    </div>
  );
}