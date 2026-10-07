"use server";

import { prismaAdmin } from "@/src/lib/prisma";
import { SupportTicketStatus, SupportSenderType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createClient } from "@/src/utils/supabase/server";

export interface TicketSummary {
  id: string;
  userId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress?: string | null;
  userAvatar?: string | null;
  userRating?: number;
  userReviewCount?: number;
  userCompletedOrders?: number;
  userWalletBalance?: number;
  status: SupportTicketStatus;
  lastMessage: string | null;
  lastMessageAt: Date;
  unreadAdminCount: number;
  unreadUserCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageItem {
  id: string;
  ticketId: string;
  senderType: SupportSenderType;
  senderName: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

/**
 * Lấy thông tin người dùng đang đăng nhập (từ Supabase auth + Prisma + raw_user_meta_data)
 */
async function getCurrentCustomerProfile() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const [dbUser, metaRows] = await Promise.all([
      prismaAdmin.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          rating: true,
          reviewCount: true,
          completedOrders: true,
          walletBalance: true,
        },
      }),
      prismaAdmin.$queryRawUnsafe<any[]>(
        `SELECT raw_user_meta_data FROM auth.users WHERE id = $1::uuid;`,
        user.id
      ).catch(() => []),
    ]);

    const authMeta = metaRows?.[0]?.raw_user_meta_data || user.user_metadata || {};
    const fullName =
      dbUser?.name ||
      authMeta.full_name ||
      authMeta.name ||
      authMeta.displayName ||
      user.email?.split("@")[0] ||
      "Thành viên CLOOP";

    const phone = authMeta.phone || null;
    const email = dbUser?.email || user.email || null;
    const address =
      authMeta.pickup_address ||
      authMeta.full_address ||
      authMeta.location ||
      null;

    return {
      userId: user.id,
      name: fullName,
      phone,
      email,
      address,
      avatar: dbUser?.avatar || authMeta.avatar_url || authMeta.avatar || null,
      rating: dbUser?.rating ? Number(dbUser.rating) : 5.0,
      reviewCount: dbUser?.reviewCount || 0,
      completedOrders: dbUser?.completedOrders || 0,
      walletBalance: dbUser?.walletBalance || 0,
    };
  } catch (err: any) {
    if (!err?.message?.includes("cookies")) {
      console.warn("Không thể lấy profile người dùng:", err?.message || err);
    }
    return null;
  }
}

/**
 * 1. Khách hàng: Lấy hoặc tạo ticket hỗ trợ (Đồng bộ danh tính chính chủ & minh bạch 100%)
 */
export async function getOrCreateSupportTicket(params?: {
  ticketId?: string | null;
  userId?: string | null;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}) {
  try {
    const profile = await getCurrentCustomerProfile();
    const resolvedUserId = params?.userId || profile?.userId || null;
    const resolvedName =
      (params?.customerName && params.customerName !== "Khách hàng" && params.customerName !== "Khách Hàng")
        ? params.customerName
        : (profile?.name || "Khách Hàng");
    const resolvedPhone = params?.customerPhone || profile?.phone || null;
    const resolvedEmail = params?.customerEmail || profile?.email || null;

    // Nếu có ticketId lưu ở client, kiểm tra còn tồn tại không
    if (params?.ticketId) {
      const existing = await prismaAdmin.supportTicket.findUnique({
        where: { id: params.ticketId },
      });
      if (existing) {
        // Cập nhật thông tin chính chủ nếu ticket cũ chưa có hoặc là "Khách hàng"
        if (
          (resolvedUserId && !existing.userId) ||
          (resolvedName && existing.customerName === "Khách hàng") ||
          (resolvedPhone && !existing.customerPhone)
        ) {
          const updated = await prismaAdmin.supportTicket.update({
            where: { id: existing.id },
            data: {
              userId: resolvedUserId || existing.userId,
              customerName: resolvedName !== "Khách Hàng" ? resolvedName : existing.customerName,
              customerPhone: resolvedPhone || existing.customerPhone,
              customerEmail: resolvedEmail || existing.customerEmail,
            },
          });
          return { success: true, ticket: updated };
        }
        return { success: true, ticket: existing };
      }
    }

    // Nếu có userId, tìm ticket đang OPEN gần nhất
    if (resolvedUserId) {
      const userTicket = await prismaAdmin.supportTicket.findFirst({
        where: {
          userId: resolvedUserId,
          status: SupportTicketStatus.OPEN,
        },
        orderBy: { lastMessageAt: "desc" },
      });
      if (userTicket) {
        // Đồng bộ lại tên/sđt nếu có thay đổi
        if (
          (resolvedName && resolvedName !== "Khách Hàng" && userTicket.customerName !== resolvedName) ||
          (resolvedPhone && userTicket.customerPhone !== resolvedPhone)
        ) {
          const synced = await prismaAdmin.supportTicket.update({
            where: { id: userTicket.id },
            data: {
              customerName: resolvedName,
              customerPhone: resolvedPhone || userTicket.customerPhone,
              customerEmail: resolvedEmail || userTicket.customerEmail,
            },
          });
          return { success: true, ticket: synced };
        }
        return { success: true, ticket: userTicket };
      }
    }

    // Tạo ticket mới chính chủ & minh bạch
    const newTicket = await prismaAdmin.supportTicket.create({
      data: {
        userId: resolvedUserId,
        customerName: resolvedName,
        customerPhone: resolvedPhone,
        customerEmail: resolvedEmail,
        status: SupportTicketStatus.OPEN,
        lastMessage: "Bắt đầu cuộc trò chuyện với CSKH",
        lastMessageAt: new Date(),
        unreadAdminCount: 1,
        unreadUserCount: 0,
      },
    });

    return { success: true, ticket: newTicket };
  } catch (error: any) {
    console.error("Error in getOrCreateSupportTicket:", error);
    return { success: false, error: error.message || "Không thể tạo phiên chat" };
  }
}

/**
 * 2. Lấy toàn bộ tin nhắn của một ticket
 */
export async function getTicketMessages(ticketId: string) {
  try {
    const messages = await prismaAdmin.supportMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
    });
    return { success: true, messages };
  } catch (error: any) {
    console.error("Error in getTicketMessages:", error);
    return { success: false, error: error.message, messages: [] };
  }
}

/**
 * 3. Khách hàng gửi tin nhắn cho CSKH
 */
export async function sendCustomerMessage(params: {
  ticketId: string;
  content: string;
  senderName?: string;
}) {
  try {
    const { ticketId, content } = params;
    if (!content.trim()) return { success: false, error: "Nội dung trống" };

    // Tìm profile người gửi để ghi nhận danh tính chuẩn
    const profile = await getCurrentCustomerProfile();
    const displayName =
      (params.senderName && params.senderName !== "Khách hàng" && params.senderName !== "Khách Hàng")
        ? params.senderName
        : (profile?.name || "Khách Hàng");

    const message = await prismaAdmin.supportMessage.create({
      data: {
        ticketId,
        senderType: SupportSenderType.USER,
        senderName: displayName,
        content: content.trim(),
        isRead: false,
      },
    });

    // Cập nhật ticket: tăng unreadAdminCount để kích hoạt chuông báo cho Admin
    // Đồng thời đồng bộ tên khách nếu trước đó chưa có
    const updateData: any = {
      lastMessage: content.trim(),
      lastMessageAt: new Date(),
      status: SupportTicketStatus.OPEN,
      unreadAdminCount: { increment: 1 },
    };

    if (profile?.userId) {
      updateData.userId = profile.userId;
      if (profile.name && profile.name !== "Khách Hàng") {
        updateData.customerName = profile.name;
      }
      if (profile.phone) {
        updateData.customerPhone = profile.phone;
      }
      if (profile.email) {
        updateData.customerEmail = profile.email;
      }
    }

    await prismaAdmin.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    try {
      revalidatePath("/admin/support");
    } catch {}
    return { success: true, message };
  } catch (error: any) {
    console.error("Error in sendCustomerMessage:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 4. Admin gửi tin nhắn cho khách (Hiển thị 'Chuyên viên CSKH CLOOP')
 */
export async function sendAdminMessage(params: {
  ticketId: string;
  content: string;
  agentTitle?: string;
}) {
  try {
    const { ticketId, content, agentTitle } = params;
    if (!content.trim()) return { success: false, error: "Nội dung trống" };

    const displayName = agentTitle || "Chuyên viên CSKH CLOOP";

    const message = await prismaAdmin.supportMessage.create({
      data: {
        ticketId,
        senderType: SupportSenderType.ADMIN,
        senderName: displayName,
        content: content.trim(),
        isRead: false,
      },
    });

    // Cập nhật ticket: reset unreadAdminCount, tăng unreadUserCount
    await prismaAdmin.supportTicket.update({
      where: { id: ticketId },
      data: {
        lastMessage: content.trim(),
        lastMessageAt: new Date(),
        unreadAdminCount: 0,
        unreadUserCount: { increment: 1 },
      },
    });

    try {
      revalidatePath("/admin/support");
    } catch {}
    return { success: true, message };
  } catch (error: any) {
    console.error("Error in sendAdminMessage:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 5. Admin: Lấy danh sách tất cả các ticket kèm thông tin chi tiết đầy đủ của khách hàng
 */
export async function getAllSupportTickets(statusFilter?: SupportTicketStatus | "ALL"): Promise<{
  success: boolean;
  tickets: TicketSummary[];
  error?: string;
}> {
  try {
    const where: any = {};
    if (statusFilter && statusFilter !== "ALL") {
      where.status = statusFilter;
    }

    const tickets = await prismaAdmin.supportTicket.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            rating: true,
            reviewCount: true,
            completedOrders: true,
            walletBalance: true,
            createdAt: true,
          },
        },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 60,
    });

    // Thu thập danh sách userId để truy vấn auth.users lấy SĐT và Địa chỉ chuẩn GHN
    const userIds = tickets.map((t) => t.userId).filter(Boolean) as string[];
    const metaMap: Record<string, any> = {};

    if (userIds.length > 0) {
      try {
        const rows = await prismaAdmin.$queryRawUnsafe<any[]>(
          `SELECT id, email, raw_user_meta_data FROM auth.users WHERE id::text = ANY($1);`,
          userIds
        );
        rows.forEach((r) => {
          metaMap[r.id] = { email: r.email, ...(r.raw_user_meta_data || {}) };
        });
      } catch (err) {
        console.warn("Lỗi đọc auth.users raw_user_meta_data:", err);
      }
    }

    const enrichedTickets: TicketSummary[] = tickets.map((t) => {
      const authMeta = t.userId ? metaMap[t.userId] || {} : {};

      // Xác định tên khách chuẩn (không hiển thị generic "Khách Hàng" nếu có tên thực)
      const rawCustomerName = t.customerName?.trim();
      const hasSpecificSavedName =
        rawCustomerName &&
        rawCustomerName.toLowerCase() !== "khách hàng" &&
        rawCustomerName.toLowerCase() !== "khách vãng lai" &&
        rawCustomerName.toLowerCase() !== "guest";

      const realName =
        t.user?.name ||
        authMeta.full_name ||
        authMeta.name ||
        authMeta.displayName ||
        (hasSpecificSavedName ? rawCustomerName : null) ||
        authMeta.email?.split("@")[0] ||
        t.customerEmail?.split("@")[0] ||
        (t.userId ? "Thành viên CLOOP" : "Khách Trực Tuyến");

      const realPhone =
        authMeta.phone ||
        t.customerPhone ||
        null;

      const realEmail =
        t.user?.email ||
        authMeta.email ||
        t.customerEmail ||
        null;

      const realAddress =
        authMeta.pickup_address ||
        authMeta.full_address ||
        authMeta.location ||
        null;

      // Đồng bộ ngầm vào database nếu thông tin trong ticket cũ đang thiếu
      if (
        (realName && (!t.customerName || t.customerName === "Khách hàng" || t.customerName === "Khách Hàng")) ||
        (realPhone && !t.customerPhone)
      ) {
        prismaAdmin.supportTicket.update({
          where: { id: t.id },
          data: {
            customerName: realName,
            customerPhone: realPhone || t.customerPhone,
            customerEmail: realEmail || t.customerEmail,
          },
        }).catch(() => {});
      }

      return {
        id: t.id,
        userId: t.userId,
        customerName: realName,
        customerPhone: realPhone,
        customerEmail: realEmail,
        customerAddress: realAddress,
        userAvatar: t.user?.avatar || authMeta.avatar_url || authMeta.avatar || null,
        userRating: t.user?.rating !== undefined ? Number(t.user.rating) : 5.0,
        userReviewCount: t.user?.reviewCount || 0,
        userCompletedOrders: t.user?.completedOrders || 0,
        userWalletBalance: t.user?.walletBalance || 0,
        status: t.status,
        lastMessage: t.lastMessage,
        lastMessageAt: t.lastMessageAt,
        unreadAdminCount: t.unreadAdminCount,
        unreadUserCount: t.unreadUserCount,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
    });

    return { success: true, tickets: enrichedTickets };
  } catch (error: any) {
    console.error("Error in getAllSupportTickets:", error);
    return { success: false, error: error.message, tickets: [] };
  }
}

/**
 * 6. Admin: Đánh dấu đã đọc ticket (tắt chuông cảnh báo cho ticket này)
 */
export async function markTicketReadByAdmin(ticketId: string) {
  try {
    await prismaAdmin.supportTicket.update({
      where: { id: ticketId },
      data: { unreadAdminCount: 0 },
    });

    await prismaAdmin.supportMessage.updateMany({
      where: { ticketId, senderType: SupportSenderType.USER, isRead: false },
      data: { isRead: true },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error in markTicketReadByAdmin:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 7. Admin: Đóng hoặc giải quyết ticket
 */
export async function updateTicketStatus(ticketId: string, status: SupportTicketStatus) {
  try {
    const updated = await prismaAdmin.supportTicket.update({
      where: { id: ticketId },
      data: { status },
    });
    revalidatePath("/admin/support");
    return { success: true, ticket: updated };
  } catch (error: any) {
    console.error("Error in updateTicketStatus:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 8. Admin: Lấy tổng số tin nhắn chưa đọc để rung chuông
 */
export async function getAdminUnreadTotal() {
  try {
    const aggregate = await prismaAdmin.supportTicket.aggregate({
      _sum: { unreadAdminCount: true },
      where: { status: SupportTicketStatus.OPEN },
    });
    return { success: true, unreadTotal: aggregate._sum.unreadAdminCount || 0 };
  } catch (error: any) {
    return { success: false, unreadTotal: 0 };
  }
}
