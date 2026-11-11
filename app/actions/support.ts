"use server";

import { prismaAdmin } from "@/src/lib/prisma";
import { SupportTicketStatus, SupportSenderType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createClient } from "@/src/utils/supabase/server";
import { requireAdmin } from "@/src/lib/auth";

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
          role: true,
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
      role: dbUser?.role || "USER",
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

const GUEST_TICKET_COOKIE_NAME = "cloop_guest_support_ticket";

function getGuestTicketSecret(): string {
  const s = (
    process.env.WALLET_SEAL_SECRET ||
    process.env.PAYOS_CHECKSUM_KEY ||
    process.env.SHIPPING_QUOTE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();
  return s;
}

async function computeGuestTicketSignature(ticketId: string): Promise<string | null> {
  try {
    const secret = getGuestTicketSecret();
    if (!secret || !ticketId) return null;
    const cryptoMod = await import("node:crypto");
    return cryptoMod
      .createHmac("sha256", secret)
      .update(`cloop_guest_ticket_v1|${ticketId}`)
      .digest("hex")
      .slice(0, 32);
  } catch {
    return null;
  }
}

async function setGuestTicketCookie(ticketId: string): Promise<void> {
  try {
    const sig = await computeGuestTicketSignature(ticketId);
    if (!sig) return;
    const headersMod = await import("next/headers");
    const cookieStore = await headersMod.cookies();
    if (typeof (cookieStore as any)?.set === "function") {
      (cookieStore as any).set(GUEST_TICKET_COOKIE_NAME, `${ticketId}:${sig}`, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "strict",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });
    }
  } catch {
    // Non-fatal in environments without mutable response cookies
  }
}

async function hasValidGuestTicketOwnership(ticketId: string): Promise<boolean> {
  try {
    if (!ticketId) return false;
    const expectedSig = await computeGuestTicketSignature(ticketId);
    if (!expectedSig) return false;
    const headersMod = await import("next/headers");
    const cookieStore = await headersMod.cookies();
    const rawCookie =
      typeof (cookieStore as any)?.get === "function"
        ? (cookieStore as any).get(GUEST_TICKET_COOKIE_NAME)?.value
        : undefined;
    if (!rawCookie || typeof rawCookie !== "string") return false;
    const [cookieTicketId, cookieSig] = rawCookie.split(":");
    if (cookieTicketId !== ticketId || !cookieSig) return false;
    const cryptoMod = await import("node:crypto");
    const a = Buffer.from(cookieSig, "utf8");
    const b = Buffer.from(expectedSig, "utf8");
    return a.length === b.length && cryptoMod.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function sanitizeClientTicket(ticket: any, isAuthenticatedOwnerOrAdmin: boolean) {
  if (!ticket || typeof ticket !== "object") return ticket;
  if (isAuthenticatedOwnerOrAdmin) return ticket;
  return {
    ...ticket,
    customerEmail: null,
    customerPhone: null,
  };
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
    // Không bao giờ tin params.userId từ client để mạo danh
    const resolvedUserId = profile?.userId || null;
    const isAdmin = profile?.role === "ADMIN";
    const resolvedName =
      (params?.customerName && params.customerName !== "Khách hàng" && params.customerName !== "Khách Hàng")
        ? params.customerName.trim().slice(0, 80)
        : (profile?.name || "Khách Hàng");
    const resolvedPhone = params?.customerPhone || profile?.phone || null;
    const resolvedEmail = params?.customerEmail || profile?.email || null;

    // Nếu có ticketId lưu ở client, kiểm tra còn tồn tại và BẮT BUỘC chứng minh quyền sở hữu
    if (params?.ticketId) {
      const existing = await prismaAdmin.supportTicket.findUnique({
        where: { id: params.ticketId },
      });
      if (existing) {
        const isAccountOwner = Boolean(resolvedUserId && existing.userId && existing.userId === resolvedUserId);
        const isGuestOwner = !existing.userId ? await hasValidGuestTicketOwnership(existing.id) : false;
        const canAccessExisting = isAdmin || isAccountOwner || isGuestOwner;

        if (!canAccessExisting) {
          // Chặn IDOR & chiếm đoạt ticket khách vãng lai: nếu không chứng minh được quyền sở hữu, từ chối tiết lộ ticket cũ
          if (typeof prismaAdmin.supportTicket.create !== "function") {
            return {
              success: false,
              error: "Forbidden: Bạn không có quyền truy cập phiên hỗ trợ này.",
              ticket: null,
            };
          }
        } else {
          if (
            (resolvedUserId && !existing.userId && isGuestOwner) ||
            (resolvedName && existing.customerName === "Khách hàng") ||
            (resolvedPhone && !existing.customerPhone)
          ) {
            const updated = await prismaAdmin.supportTicket.update({
              where: { id: existing.id },
              data: {
                userId: existing.userId || resolvedUserId,
                customerName: resolvedName !== "Khách Hàng" ? resolvedName : existing.customerName,
                customerPhone: resolvedPhone || existing.customerPhone,
                customerEmail: resolvedEmail || existing.customerEmail,
              },
            });
            return {
              success: true,
              ticket: sanitizeClientTicket(updated, Boolean(resolvedUserId || isAdmin)),
            };
          }
          return {
            success: true,
            ticket: sanitizeClientTicket(existing, Boolean(resolvedUserId || isAdmin)),
          };
        }
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

    if (!resolvedUserId && newTicket?.id) {
      await setGuestTicketCookie(newTicket.id);
    }

    return {
      success: true,
      ticket: sanitizeClientTicket(newTicket, Boolean(resolvedUserId || isAdmin)),
    };
  } catch (error: any) {
    console.error("Error in getOrCreateSupportTicket:", error);
    return { success: false, error: "Không thể tạo phiên chat", ticket: null };
  }
}

/**
 * 2. Lấy toàn bộ tin nhắn của một ticket (chống IDOR cho cả tài khoản và khách vãng lai)
 */
export async function getTicketMessages(ticketId: string) {
  try {
    const ticket = await prismaAdmin.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, userId: true },
    });
    if (!ticket) {
      return { success: false, error: "Không tìm thấy phiên hỗ trợ", messages: [] };
    }

    const profile = await getCurrentCustomerProfile();
    let isAdmin = profile?.role === "ADMIN";
    if (!isAdmin) {
      try {
        await requireAdmin();
        isAdmin = true;
      } catch {
        isAdmin = false;
      }
    }

    if (!isAdmin) {
      if (ticket.userId) {
        if (profile?.userId !== ticket.userId) {
          return { success: false, error: "Bạn không có quyền xem cuộc trò chuyện này.", messages: [] };
        }
      } else {
        const isGuestOwner = await hasValidGuestTicketOwnership(ticket.id);
        if (!isGuestOwner) {
          return { success: false, error: "Bạn không có quyền xem cuộc trò chuyện khách vãng lai này.", messages: [] };
        }
      }
    }

    const messages = await prismaAdmin.supportMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
    });
    return { success: true, messages };
  } catch (error: any) {
    console.error("Error in getTicketMessages:", error);
    return { success: false, error: "Không thể tải tin nhắn", messages: [] };
  }
}

/**
 * 3. Khách hàng gửi tin nhắn cho CSKH (chống IDOR & chống chiếm đoạt ticket)
 */
export async function sendCustomerMessage(params: {
  ticketId: string;
  content: string;
  senderName?: string;
}) {
  try {
    const { ticketId, content } = params;
    const cleanContent = (content || "").trim().slice(0, 2000);
    if (!cleanContent) return { success: false, error: "Nội dung trống" };

    const ticket = await prismaAdmin.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, userId: true },
    });
    if (!ticket) {
      return { success: false, error: "Không tìm thấy phiên hỗ trợ" };
    }

    const profile = await getCurrentCustomerProfile();
    const isAdmin = profile?.role === "ADMIN";
    let isGuestOwner = false;

    if (!isAdmin) {
      if (ticket.userId) {
        if (profile?.userId !== ticket.userId) {
          return { success: false, error: "Bạn không có quyền gửi tin nhắn vào phiên hỗ trợ này." };
        }
      } else {
        isGuestOwner = await hasValidGuestTicketOwnership(ticket.id);
        if (!isGuestOwner) {
          return { success: false, error: "Bạn không có quyền gửi tin nhắn vào phiên hỗ trợ khách vãng lai này." };
        }
      }
    }

    const displayName =
      (params.senderName && params.senderName !== "Khách hàng" && params.senderName !== "Khách Hàng")
        ? params.senderName.trim().slice(0, 80)
        : (profile?.name || "Khách Hàng");

    const message = await prismaAdmin.supportMessage.create({
      data: {
        ticketId,
        senderType: SupportSenderType.USER,
        senderName: displayName,
        content: cleanContent,
        isRead: false,
      },
    });

    const updateData: any = {
      lastMessage: cleanContent,
      lastMessageAt: new Date(),
      status: SupportTicketStatus.OPEN,
      unreadAdminCount: { increment: 1 },
    };

    // Chỉ gán userId nếu ticket trước đó là của chính khách vãng lai này (đã xác minh isGuestOwner)
    if (profile?.userId && !ticket.userId && isGuestOwner) {
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
    return { success: false, error: "Không thể gửi tin nhắn" };
  }
}

/**
 * 4. Admin gửi tin nhắn cho khách (Bắt buộc xác thực quyền Admin)
 */
export async function sendAdminMessage(params: {
  ticketId: string;
  content: string;
  agentTitle?: string;
}) {
  try {
    await requireAdmin();
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
    return { success: false, error: "Bạn không có quyền thực hiện thao tác này." };
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
    await requireAdmin();
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
    return { success: false, error: "Bạn không có quyền truy cập danh sách hỗ trợ.", tickets: [] };
  }
}

/**
 * 6. Admin: Đánh dấu đã đọc ticket (tắt chuông cảnh báo cho ticket này)
 */
export async function markTicketReadByAdmin(ticketId: string) {
  try {
    await requireAdmin();
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
    return { success: false, error: "Unauthorized" };
  }
}

/**
 * 7. Admin: Đóng hoặc giải quyết ticket
 */
export async function updateTicketStatus(ticketId: string, status: SupportTicketStatus) {
  try {
    await requireAdmin();
    const updated = await prismaAdmin.supportTicket.update({
      where: { id: ticketId },
      data: { status },
    });
    revalidatePath("/admin/support");
    return { success: true, ticket: updated };
  } catch (error: any) {
    console.error("Error in updateTicketStatus:", error);
    return { success: false, error: "Unauthorized" };
  }
}

/**
 * 8. Admin: Lấy tổng số tin nhắn chưa đọc để rung chuông
 */
export async function getAdminUnreadTotal() {
  try {
    await requireAdmin();
    const aggregate = await prismaAdmin.supportTicket.aggregate({
      _sum: { unreadAdminCount: true },
      where: { status: SupportTicketStatus.OPEN },
    });
    return { success: true, unreadTotal: aggregate._sum.unreadAdminCount || 0 };
  } catch (error: any) {
    return { success: false, unreadTotal: 0 };
  }
}
