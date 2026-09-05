"use server";

import { prisma } from "@/src/lib/prisma";
import { createClient } from "@/src/utils/supabase/server";

export interface NotificationItem {
  id: string;
  type: "ORDER" | "WALLET" | "COIN" | "SHIPMENT" | "SYSTEM";
  title: string;
  message: string;
  timestamp: string; // ISO String
  timeFormatted: string; // "14:30 - 31/08/2026"
  timeRelative: string; // "5 phút trước", "Hôm nay"
  link: string;
  isRead: boolean;
  iconType: "package" | "wallet" | "coin" | "truck" | "check" | "alert" | "star";
  metadata?: Record<string, any>;
}

// ⚡ SWR IN-MEMORY CACHE (10s TTL - Cực nhanh, giảm 99% tải DB)
const notifCache = new Map<string, { data: { notifications: NotificationItem[]; unreadCount: number }; expiry: number }>();

// Hàm format ngày giờ tiếng Việt chuẩn xác theo múi giờ Việt Nam (UTC+7 / Asia/Ho_Chi_Minh)
function formatDateTimeVN(dateInput: Date | string | number): { formatted: string; relative: string } {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Ép định dạng giờ theo múi giờ Việt Nam (Asia/Ho_Chi_Minh)
  const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const timeStr = timeFormatter.format(date);
  const dateStr = dateFormatter.format(date);
  const formatted = `${timeStr} - ${dateStr}`;

  let relative = "Vừa xong";
  if (diffSec < 60) {
    relative = "Vừa xong";
  } else if (diffMin < 60) {
    relative = `${diffMin} phút trước`;
  } else if (diffHours < 24) {
    relative = `${diffHours} giờ trước`;
  } else if (diffDays === 1) {
    relative = `Hôm qua lúc ${timeStr}`;
  } else if (diffDays < 7) {
    relative = `${diffDays} ngày trước`;
  } else {
    relative = dateStr;
  }

  return { formatted, relative };
}

export async function getUserNotificationsAction(): Promise<{
  success: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    const userId = user?.id;

    // Cache hit check
    if (userId) {
      const cached = notifCache.get(userId);
      if (cached && Date.now() < cached.expiry) {
        return { success: true, notifications: cached.data.notifications, unreadCount: cached.data.unreadCount };
      }
    }

    const notifList: NotificationItem[] = [];

    if (userId) {
      // ⚡ TỐI ƯU SIÊU TỐC: Chỉ gọi 3 truy vấn tinh gọn có chọn lọc trường (Không bốc thừa dữ liệu)
      const [userRentals, coinLedgerEntries, withdrawals] = await Promise.all([
        // 1. Toàn bộ đơn thuê liên quan đến User (cả vai trò Chủ tủ & Khách thuê)
        prisma.rentalHistory.findMany({
          where: {
            OR: [
              { renterId: userId },
              { ownerId: userId },
              { product: { userId } }
            ]
          },
          select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            completedAt: true,
            renterId: true,
            ownerId: true,
            renter_name: true,
            product: {
              select: {
                title: true,
                userId: true,
                user: { select: { name: true } }
              }
            },
            invoice: {
              select: {
                rentalFee: true,
                depositAmount: true,
                shippingFeeCollected: true,
                platformFee: true,
                amount: true
              }
            },
            renter: {
              select: { name: true }
            }
          },
          orderBy: { updatedAt: "desc" },
          take: 8
        }),

        // 2. Lịch sử điểm lá ESG (Chỉ lấy 4 dòng mới nhất)
        prisma.coinLedgerEntry.findMany({
          where: { userId },
          select: {
            id: true,
            type: true,
            amount: true,
            description: true,
            balanceAfter: true,
            createdAt: true
          },
          orderBy: { createdAt: "desc" },
          take: 4
        }),

        // 3. Lệnh rút tiền (Chỉ lấy 3 dòng mới nhất)
        prisma.withdrawalRequest.findMany({
          where: { userId },
          select: {
            id: true,
            amount: true,
            status: true,
            bankName: true,
            bankAccountNumber: true,
            bankAccountHolder: true,
            createdAt: true,
            processedAt: true
          },
          orderBy: { createdAt: "desc" },
          take: 3
        })
      ]);

      // ===== A. XỬ LÝ THÔNG BÁO CHO ĐƠN HÀNG (CẢ CHỦ TỦ & KHÁCH THUÊ) =====
      for (const order of userRentals) {
        const itemTitle = order.product?.title || "Trang phục";
        const orderShortId = order.id.slice(0, 8).toUpperCase();
        const rentalFee = order.invoice?.rentalFee || 0;
        const depositAmount = order.invoice?.depositAmount || 0;
        const isOwner = order.ownerId === userId || order.product?.userId === userId;
        const isRenter = order.renterId === userId;

        // Nếu tôi là Chủ tủ
        if (isOwner) {
          const renterName = order.renter?.name || order.renter_name || "Khách thuê";
          if (order.status === "PENDING_APPROVAL" || order.status === "OWNER_PACKED") {
            const { formatted, relative } = formatDateTimeVN(order.createdAt);
            notifList.push({
              id: `order-owner-new-${order.id}`,
              type: "ORDER",
              title: `Đơn thuê mới: "${itemTitle}"`,
              message: `${renterName} vừa đặt cọc & thanh toán đơn #${orderShortId}. Vui lòng đóng gói và bàn giao cho GHN.`,
              timestamp: order.createdAt.toISOString(),
              timeFormatted: formatted,
              timeRelative: relative,
              link: "/my-closet/orders?mode=owner",
              isRead: false,
              iconType: "package",
              metadata: { orderId: order.id, status: order.status }
            });
          } else if (order.status === "BORROWER_RETURNED") {
            const dateObj = order.updatedAt || order.createdAt;
            const { formatted, relative } = formatDateTimeVN(dateObj);
            notifList.push({
              id: `order-owner-returned-${order.id}`,
              type: "ORDER",
              title: `Khách đã gửi trả đồ: "${itemTitle}"`,
              message: `Khách thuê đã gửi trả hàng về tủ đồ của bạn (Mã #${orderShortId}). Hãy kiểm tra đồ và bấm "Đã nhận lại đồ" để nhận tiền thuê.`,
              timestamp: dateObj.toISOString(),
              timeFormatted: formatted,
              timeRelative: relative,
              link: "/my-closet/orders?mode=owner",
              isRead: false,
              iconType: "truck",
              metadata: { orderId: order.id, status: order.status }
            });
          } else if (order.status === "LENDER_COMPLETED") {
            const dateObj = order.completedAt || order.updatedAt || order.createdAt;
            const { formatted, relative } = formatDateTimeVN(dateObj);
            const platformFee = order.invoice?.platformFee || Math.floor(rentalFee * 0.12);
            const shippingFee = order.invoice?.shippingFeeCollected || 0;
            const payoutEst = Math.max(0, rentalFee - platformFee - shippingFee);
            notifList.push({
              id: `order-owner-completed-${order.id}`,
              type: "WALLET",
              title: `Tiền thuê đã về ví: +${payoutEst.toLocaleString("vi-VN")}₫`,
              message: `Đơn thuê #${orderShortId} ("${itemTitle}") hoàn tất thành công. Tiền thuê khả dụng đã cộng vào Ví CLOOP.`,
              timestamp: dateObj.toISOString(),
              timeFormatted: formatted,
              timeRelative: relative,
              link: "/my-closet/wallet",
              isRead: true,
              iconType: "wallet",
              metadata: { orderId: order.id, amount: payoutEst }
            });
          } else if (order.status === "DISPUTE") {
            const dateObj = order.updatedAt || order.createdAt;
            const { formatted, relative } = formatDateTimeVN(dateObj);
            notifList.push({
              id: `order-owner-dispute-${order.id}`,
              type: "ORDER",
              title: `Khiếu nại đơn thuê #${orderShortId}`,
              message: `Đơn hàng "${itemTitle}" đang có yêu cầu hòa giải/khiếu nại. Vui lòng kiểm tra phương án đề xuất.`,
              timestamp: dateObj.toISOString(),
              timeFormatted: formatted,
              timeRelative: relative,
              link: "/my-closet/orders?mode=owner",
              isRead: false,
              iconType: "alert",
              metadata: { orderId: order.id }
            });
          }
        }

        // Nếu tôi là Khách thuê
        if (isRenter) {
          if (order.status === "PENDING_APPROVAL") {
            const { formatted, relative } = formatDateTimeVN(order.createdAt);
            notifList.push({
              id: `order-renter-paid-${order.id}`,
              type: "ORDER",
              title: `Đặt thuê thành công: "${itemTitle}"`,
              message: `Thanh toán cọc & phí thuê đơn #${orderShortId} thành công qua PayOS VietQR. Chủ tủ đang chuẩn bị gửi đồ.`,
              timestamp: order.createdAt.toISOString(),
              timeFormatted: formatted,
              timeRelative: relative,
              link: "/my-closet/orders?mode=renter",
              isRead: false,
              iconType: "check",
              metadata: { orderId: order.id }
            });
          } else if (order.status === "LENDER_SHIPPED") {
            const dateObj = order.updatedAt || order.createdAt;
            const { formatted, relative } = formatDateTimeVN(dateObj);
            notifList.push({
              id: `order-renter-shipped-${order.id}`,
              type: "SHIPMENT",
              title: `Đồ đang giao đến bạn: "${itemTitle}"`,
              message: `Chủ tủ đã gửi hàng qua GHN cho đơn #${orderShortId}. Vui lòng chú ý điện thoại để nhận đồ diện tiệc nhé!`,
              timestamp: dateObj.toISOString(),
              timeFormatted: formatted,
              timeRelative: relative,
              link: "/my-closet/orders?mode=renter",
              isRead: false,
              iconType: "truck",
              metadata: { orderId: order.id }
            });
          } else if (order.status === "LENDER_COMPLETED") {
            const dateObj = order.completedAt || order.updatedAt || order.createdAt;
            const { formatted, relative } = formatDateTimeVN(dateObj);
            notifList.push({
              id: `order-renter-refund-${order.id}`,
              type: "WALLET",
              title: `Hoàn cọc 100%: +${depositAmount.toLocaleString("vi-VN")}₫`,
              message: `Đơn thuê #${orderShortId} hoàn tất. Toàn bộ tiền cọc bảo chứng đã được mở khóa về ví của bạn an toàn.`,
              timestamp: dateObj.toISOString(),
              timeFormatted: formatted,
              timeRelative: relative,
              link: "/my-closet/wallet",
              isRead: true,
              iconType: "wallet",
              metadata: { orderId: order.id, amount: depositAmount }
            });
          }
        }
      }

      // ===== C. XỬ LÝ BIẾN ĐỘNG ĐIỂM LÁ ESG (COIN LEDGER) =====
      for (const coin of coinLedgerEntries) {
        const { formatted, relative } = formatDateTimeVN(coin.createdAt);
        if (coin.type === "QUEST_REWARD") {
          notifList.push({
            id: `coin-reward-${coin.id}`,
            type: "COIN",
            title: `Thưởng +${coin.amount} Xu Lá ESG 🌿`,
            message: coin.description || `Bạn nhận được +${coin.amount} Xu Lá vì đã đóng góp vào vòng đời thời trang tuần hoàn.`,
            timestamp: coin.createdAt.toISOString(),
            timeFormatted: formatted,
            timeRelative: relative,
            link: "/my-closet/eco",
            isRead: true,
            iconType: "coin",
            metadata: { amount: coin.amount, balanceAfter: coin.balanceAfter }
          });
        } else if (coin.type === "TOP_UP_IN") {
          notifList.push({
            id: `coin-topup-${coin.id}`,
            type: "COIN",
            title: `Nạp thành công +${coin.amount.toLocaleString("vi-VN")} Xu Lá 🍃`,
            message: coin.description || `Giao dịch mua gói Xu Lá thành công qua VietQR PayOS.`,
            timestamp: coin.createdAt.toISOString(),
            timeFormatted: formatted,
            timeRelative: relative,
            link: "/my-closet/wallet",
            isRead: true,
            iconType: "coin",
            metadata: { amount: coin.amount }
          });
        } else if (coin.type === "BOOST_SPEND") {
          notifList.push({
            id: `coin-boost-${coin.id}`,
            type: "COIN",
            title: `Đẩy sản phẩm lên Top (-${coin.amount} Xu Lá) 🚀`,
            message: coin.description || `Món đồ của bạn đã được đẩy lên vị trí nổi bật trên Sàn CLOOP.`,
            timestamp: coin.createdAt.toISOString(),
            timeFormatted: formatted,
            timeRelative: relative,
            link: "/my-closet/items",
            isRead: true,
            iconType: "star",
            metadata: { amount: coin.amount }
          });
        }
      }

      // ===== D. XỬ LÝ LỆNH RÚT TIỀN (WITHDRAWALS) =====
      for (const w of withdrawals) {
        const { formatted, relative } = formatDateTimeVN(w.createdAt);
        if (w.status === "COMPLETED") {
          notifList.push({
            id: `withdrawal-success-${w.id}`,
            type: "WALLET",
            title: `Rút tiền thành công: ${w.amount.toLocaleString("vi-VN")}₫`,
            message: `Lệnh rút tiền về tài khoản ${w.bankName} - ${w.bankAccountNumber} (${w.bankAccountHolder}) đã hoàn tất.`,
            timestamp: (w.processedAt || w.createdAt).toISOString(),
            timeFormatted: formatted,
            timeRelative: relative,
            link: "/my-closet/wallet",
            isRead: true,
            iconType: "wallet",
            metadata: { amount: w.amount }
          });
        } else if (w.status === "PENDING" || w.status === "PROCESSING") {
          notifList.push({
            id: `withdrawal-pending-${w.id}`,
            type: "WALLET",
            title: `Lệnh rút tiền đang xử lý: ${w.amount.toLocaleString("vi-VN")}₫`,
            message: `Yêu cầu rút về ${w.bankName} đang được đối soát tự động. Dự kiến hoàn tất trong 5 - 15 phút.`,
            timestamp: w.createdAt.toISOString(),
            timeFormatted: formatted,
            timeRelative: relative,
            link: "/my-closet/wallet",
            isRead: false,
            iconType: "wallet",
            metadata: { amount: w.amount }
          });
        }
      }
    }

    // ===== E. NẾU USER CHƯA CÓ HOẠT ĐỘNG: CHỈ HIỂN THỊ THÔNG BÁO CHÀO MỪNG & THIẾT LẬP THỰC SỰ =====
    if (notifList.length === 0) {
      const accountCreatedDate = user?.created_at ? new Date(user.created_at) : new Date();
      const { formatted, relative } = formatDateTimeVN(accountCreatedDate);

      // Thông báo chào mừng thành viên mới
      notifList.push({
        id: "welcome-system-1",
        type: "SYSTEM",
        title: "Chào mừng bạn đến với CLOOP! 🌿",
        message: "Cảm ơn bạn đã tham gia cộng đồng thời trang tuần hoàn. Tủ đồ của bạn đã sẵn sàng chia sẻ và trải nghiệm hàng ngàn thiết kế.",
        timestamp: accountCreatedDate.toISOString(),
        timeFormatted: formatted,
        timeRelative: relative,
        link: "/shop",
        isRead: false,
        iconType: "star"
      });

      // Tặng 100 Xu Lá khởi nghiệp
      notifList.push({
        id: "welcome-system-2",
        type: "COIN",
        title: "Kích hoạt Ví Lá: Tặng 100 Xu Khởi Nghiệp 🎁",
        message: "Hệ thống đã tặng bạn 100 Xu Lá để trải nghiệm dịch vụ đẩy tin và thuê trang phục tuần hoàn.",
        timestamp: accountCreatedDate.toISOString(),
        timeFormatted: formatted,
        timeRelative: relative,
        link: "/my-closet/wallet",
        isRead: true,
        iconType: "coin"
      });

      // Nhắc nhở thiết lập tài khoản
      notifList.push({
        id: "welcome-system-3",
        type: "SYSTEM",
        title: "Hoàn tất hồ sơ cá nhân ⚙️",
        message: "Cập nhật địa chỉ nhận đồ và số tài khoản ngân hàng tại mục Cài đặt để sẵn sàng cho thuê hoặc nhận tiền hoàn cọc.",
        timestamp: accountCreatedDate.toISOString(),
        timeFormatted: formatted,
        timeRelative: relative,
        link: "/my-closet/settings",
        isRead: true,
        iconType: "check"
      });
    }

    // Sắp xếp giảm dần theo mốc thời gian thực tế mới nhất
    notifList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const unreadCount = notifList.filter(n => !n.isRead).length;

    const result = {
      success: true,
      notifications: notifList,
      unreadCount
    };

    if (userId) {
      notifCache.set(userId, { data: result, expiry: Date.now() + 10000 }); // 10s cache
    }

    return result;
  } catch (error: any) {
    console.error("❌ Lỗi lấy danh sách thông báo:", error);
    return {
      success: false,
      notifications: [],
      unreadCount: 0,
      error: error.message || "Lỗi nạp thông báo"
    };
  }
}
