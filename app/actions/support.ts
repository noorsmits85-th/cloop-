"use server";

import { prisma, prismaAdmin } from "@/src/lib/prisma";
import { SupportTicketStatus, SupportSenderType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface TicketSummary {
  id: string;
  userId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
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
 * 1. Khách hàng: Lấy hoặc tạo ticket hỗ trợ
 */
export async function getOrCreateSupportTicket(params: {
  ticketId?: string | null;
  userId?: string | null;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}) {
  try {
    // Nếu có ticketId lưu ở client, kiểm tra còn tồn tại không
    if (params.ticketId) {
      const existing = await prismaAdmin.supportTicket.findUnique({
        where: { id: params.ticketId },
      });
      if (existing) {
        return { success: true, ticket: existing };
      }
    }

    // Nếu có userId, tìm ticket đang OPEN gần nhất
    if (params.userId) {
      const userTicket = await prismaAdmin.supportTicket.findFirst({
        where: {
          userId: params.userId,
          status: SupportTicketStatus.OPEN,
        },
        orderBy: { lastMessageAt: "desc" },
      });
      if (userTicket) {
        return { success: true, ticket: userTicket };
      }
    }

    // Tạo ticket mới
    const newTicket = await prismaAdmin.supportTicket.create({
      data: {
        userId: params.userId || null,
        customerName: params.customerName || "Khách hàng",
        customerPhone: params.customerPhone || null,
        customerEmail: params.customerEmail || null,
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
    const { ticketId, content, senderName } = params;
    if (!content.trim()) return { success: false, error: "Nội dung trống" };

    const message = await prismaAdmin.supportMessage.create({
      data: {
        ticketId,
        senderType: SupportSenderType.USER,
        senderName: senderName || "Khách hàng",
        content: content.trim(),
        isRead: false,
      },
    });

    // Cập nhật ticket: tăng unreadAdminCount để kích hoạt chuông báo cho Admin
    await prismaAdmin.supportTicket.update({
      where: { id: ticketId },
      data: {
        lastMessage: content.trim(),
        lastMessageAt: new Date(),
        status: SupportTicketStatus.OPEN,
        unreadAdminCount: { increment: 1 },
      },
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
 * 4. Admin gửi tin nhắn cho khách (ẨN DANH 100%: hiển thị 'CLOOP Support')
 */
export async function sendAdminMessage(params: {
  ticketId: string;
  content: string;
  agentTitle?: string;
}) {
  try {
    const { ticketId, content, agentTitle } = params;
    if (!content.trim()) return { success: false, error: "Nội dung trống" };

    // Danh tính chuẩn sàn: "Hỗ Trợ Viên CLOOP" (hoàn toàn ẩn danh)
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
 * 5. Admin: Lấy danh sách tất cả các ticket
 */
export async function getAllSupportTickets(statusFilter?: SupportTicketStatus | "ALL") {
  try {
    const where: any = {};
    if (statusFilter && statusFilter !== "ALL") {
      where.status = statusFilter;
    }

    const tickets = await prismaAdmin.supportTicket.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: 50,
    });

    return { success: true, tickets };
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
