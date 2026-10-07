"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Volume2,
  VolumeX,
  Bell,
  Send,
  User,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  MessageSquare,
  AlertCircle,
  Headphones,
} from "lucide-react";
import {
  getAllSupportTickets,
  getTicketMessages,
  sendAdminMessage,
  markTicketReadByAdmin,
  updateTicketStatus,
  MessageItem,
} from "@/app/actions/support";
import { soundAlert } from "@/lib/sound-alert";
import { SupportTicketStatus } from "@prisma/client";

interface Ticket {
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

export default function AdminSupportClient({
  initialTickets,
}: {
  initialTickets: any[];
}) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    initialTickets.length > 0 ? initialTickets[0].id : null
  );
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [filter, setFilter] = useState<SupportTicketStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<string>("default");

  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const prevUnreadTotalRef = useRef<number>(
    initialTickets.reduce((sum, t) => sum + (t.unreadAdminCount || 0), 0)
  );

  // Khởi tạo trạng thái chuông & thông báo
  useEffect(() => {
    setIsSoundOn(soundAlert.getSoundEnabled());
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Cuộn nội bộ khung chat (KHÔNG cuộn toàn trang web)
  const scrollToBottom = (smooth = true) => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  // Tải tin nhắn khi chọn ticket
  useEffect(() => {
    if (!selectedTicketId) return;

    let isMounted = true;
    const loadMessages = async () => {
      setIsLoadingMessages(true);
      const res = await getTicketMessages(selectedTicketId);
      if (isMounted && res.success) {
        setMessages(res.messages as any);
        // Cuộn xuống tin nhắn cuối cùng một lần duy nhất khi mở ticket
        setTimeout(() => scrollToBottom(false), 50);

        // Đánh dấu đã đọc
        await markTicketReadByAdmin(selectedTicketId);
        // Cập nhật lại unread count trong local state
        setTickets((prev) =>
          prev.map((t) =>
            t.id === selectedTicketId ? { ...t, unreadAdminCount: 0 } : t
          )
        );
      }
      if (isMounted) setIsLoadingMessages(false);
    };

    loadMessages();
    return () => {
      isMounted = false;
    };
  }, [selectedTicketId]);

  // Polling tự động kiểm tra tin nhắn mới mỗi 3 giây & KÍCH HOẠT CHUÔNG BÁO
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await getAllSupportTickets();
      if (res.success && res.tickets) {
        const newTickets = res.tickets as any[];

        // Kiểm tra xem danh sách ticket có thay đổi không trước khi setTickets
        setTickets((prev) => {
          const isSame =
            prev.length === newTickets.length &&
            prev[0]?.id === newTickets[0]?.id &&
            prev[0]?.lastMessageAt === newTickets[0]?.lastMessageAt &&
            prev[0]?.unreadAdminCount === newTickets[0]?.unreadAdminCount;
          return isSame ? prev : newTickets;
        });

        // Tính tổng số tin nhắn chưa đọc của admin
        const currentUnread = newTickets.reduce(
          (sum, t) => sum + (t.unreadAdminCount || 0),
          0
        );

        // NẾU CÓ TIN NHẮN MỚI TỪ KHÁCH -> PHÁT CHUÔNG NGAY LẬP TỨC!
        if (currentUnread > prevUnreadTotalRef.current) {
          soundAlert.playChime();
          soundAlert.showDesktopNotification(
            "🔔 CLOOP CSKH: Có tin nhắn mới!",
            "Khách hàng vừa gửi phản hồi mới, hãy vào hỗ trợ ngay."
          );
          if (typeof document !== "undefined") {
            document.title = "🔴 (Tin mới!) CSKH CLOOP";
          }
        } else if (currentUnread === 0 && typeof document !== "undefined") {
          document.title = "CSKH Trực Tuyến | CLOOP Admin";
        }

        prevUnreadTotalRef.current = currentUnread;

        // Cập nhật messages của ticket đang mở CHỈ KHI CÓ TIN NHẮN THỰC SỰ MỚI
        if (selectedTicketId) {
          const msgRes = await getTicketMessages(selectedTicketId);
          if (msgRes.success && msgRes.messages) {
            setMessages((prev) => {
              if (prev.length !== msgRes.messages.length) {
                setTimeout(() => scrollToBottom(true), 50);
                return msgRes.messages as any;
              }
              const prevLast = prev[prev.length - 1]?.id;
              const newLast = msgRes.messages[msgRes.messages.length - 1]?.id;
              if (prevLast !== newLast) {
                setTimeout(() => scrollToBottom(true), 50);
                return msgRes.messages as any;
              }
              return prev; // Giữ nguyên, KHÔNG re-render, KHÔNG giật lướt màn hình!
            });
          }
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedTicketId]);

  // Bật/tắt âm thanh chuông
  const toggleSound = () => {
    const next = !isSoundOn;
    setIsSoundOn(next);
    soundAlert.setSoundEnabled(next);
    if (next) {
      soundAlert.playChime(); // Kêu nhẹ để xác nhận đã bật
    }
  };

  // Thử chuông âm thanh
  const handleTestSound = () => {
    soundAlert.playChime();
  };

  // Yêu cầu quyền thông báo desktop
  const handleRequestNotification = async () => {
    await soundAlert.requestDesktopPermission();
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === "granted") {
        soundAlert.showDesktopNotification(
          "✅ Thông báo đã sẵn sàng",
          "Bạn sẽ nhận được thông báo nổi ngay khi khách gửi tin nhắn."
        );
      }
    }
  };

  // Gửi tin nhắn phản hồi của Admin
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTicketId || !inputText.trim() || isSending) return;

    const content = inputText.trim();
    setInputText("");
    setIsSending(true);

    const res = await sendAdminMessage({
      ticketId: selectedTicketId,
      content,
      agentTitle: "Chuyên viên CSKH CLOOP",
    });

    if (res.success && res.message) {
      setMessages((prev) => [...prev, res.message as any]);
      setTimeout(() => scrollToBottom(true), 50);
    }
    setIsSending(false);
  };

  // Gửi tin nhắn mẫu nhanh (Quick Presets)
  const handleQuickPreset = (presetText: string) => {
    setInputText(presetText);
  };

  // Đổi trạng thái ticket
  const handleStatusChange = async (newStatus: SupportTicketStatus) => {
    if (!selectedTicketId) return;
    await updateTicketStatus(selectedTicketId, newStatus);
    setTickets((prev) =>
      prev.map((t) => (t.id === selectedTicketId ? { ...t, status: newStatus } : t))
    );
  };

  // Lọc ticket
  const filteredTickets = tickets.filter((t) => {
    if (filter !== "ALL" && t.status !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.customerName?.toLowerCase().includes(q);
      const matchPhone = t.customerPhone?.toLowerCase().includes(q);
      const matchMsg = t.lastMessage?.toLowerCase().includes(q);
      return matchName || matchPhone || matchMsg;
    }
    return true;
  });

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);

  return (
    <div className="flex flex-col h-[calc(100vh-185px)] bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      {/* --- TOP BAR: TRẠNG THÁI & ĐIỀU KHIỂN CHUÔNG BÁO --- */}
      <div className="flex flex-wrap items-center justify-between px-6 py-3.5 bg-stone-50 border-b border-stone-200 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            CSKH Trực Tuyến
          </div>
        </div>

        {/* Cụm điều khiển âm thanh & thông báo */}
        <div className="flex items-center gap-2">
          {/* Nút Thử Chuông */}
          <button
            onClick={handleTestSound}
            title="Thử tiếng chuông Ding-Dong"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <Bell size={13} className="text-emerald-700" />
            <span>Thử Chuông</span>
          </button>

          {/* Nút Bật/Tắt Chuông */}
          <button
            onClick={toggleSound}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
              isSoundOn
                ? "bg-emerald-900 text-white border border-emerald-950"
                : "bg-stone-200 text-stone-600 border border-stone-300"
            }`}
          >
            {isSoundOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span>{isSoundOn ? "Chuông: BẬT" : "Chuông: TẮT"}</span>
          </button>

          {/* Nút Bật Thông Báo Windows / Desktop */}
          {notificationPermission !== "granted" && (
            <button
              onClick={handleRequestNotification}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-300 text-amber-900 hover:bg-amber-500/20 text-xs font-medium transition-colors cursor-pointer"
            >
              <AlertCircle size={13} />
              <span>Bật Thông Báo Màn Hình</span>
            </button>
          )}
        </div>
      </div>

      {/* --- THÂN MÀN HÌNH: 2 CỘT CHUẨN ZENDESK / SHOPEE --- */}
      <div className="flex flex-1 overflow-hidden">
        {/* === CỘT TRÁI: DANH SÁCH KHÁCH HÀNG & PHIÊN CHAT === */}
        <div className="w-full sm:w-80 md:w-96 border-r border-stone-200 flex flex-col bg-stone-50/50">
          {/* Ô tìm kiếm & Bộ lọc */}
          <div className="p-3 border-b border-stone-200 space-y-2 bg-white">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="text"
                placeholder="Tìm khách hàng, SĐT, tin nhắn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-stone-100 rounded-lg border border-transparent focus:border-emerald-600 focus:bg-white focus:outline-hidden transition-all"
              />
            </div>

            <div className="flex gap-1.5">
              {(["ALL", "OPEN", "RESOLVED"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilter(st)}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                    filter === st
                      ? "bg-[#143224] text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {st === "ALL"
                    ? "Tất Cả"
                    : st === "OPEN"
                    ? "Đang Chờ"
                    : "Đã Xong"}
                </button>
              ))}
            </div>
          </div>

          {/* Danh sách thẻ ticket */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                Chưa có cuộc trò chuyện nào phù hợp.
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isSelected = t.id === selectedTicketId;
                const isPending = t.status === "OPEN" || t.unreadAdminCount > 0;
                const hasUnread = t.unreadAdminCount > 0;

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 relative border-b border-stone-100 ${
                      isSelected
                        ? "bg-emerald-50/90 border-l-4 border-l-emerald-800"
                        : isPending
                        ? "bg-amber-50/40 hover:bg-amber-100/50 border-l-4 border-l-amber-500 shadow-2xs"
                        : "bg-white hover:bg-stone-50 border-l-4 border-l-transparent"
                    }`}
                  >
                    {/* Avatar Khách */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm transition-colors ${
                        isPending
                          ? "bg-amber-100 text-amber-950 border-2 border-amber-400 font-black shadow-2xs"
                          : "bg-stone-100 text-stone-400 border border-stone-200 font-medium"
                      }`}
                    >
                      {t.customerName ? t.customerName.charAt(0).toUpperCase() : "K"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`text-xs truncate ${
                            isPending
                              ? "font-black text-stone-950 text-[13px] tracking-tight"
                              : "font-medium text-stone-500"
                          }`}
                        >
                          {t.customerName || "Khách Vãng Lai"}
                        </span>
                        <span
                          className={`text-[10px] shrink-0 ${
                            isPending
                              ? "font-bold text-amber-900"
                              : "text-stone-400 font-normal"
                          }`}
                        >
                          {new Date(t.lastMessageAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Đoạn tin nhắn: Nếu chưa phản hồi thì ĐẬM ĐEN RÕ RÀNG */}
                      <p
                        className={`text-xs truncate mb-1.5 ${
                          isPending
                            ? "font-black text-stone-900 text-[12.5px] leading-snug"
                            : "text-stone-400 font-normal"
                        }`}
                      >
                        {t.lastMessage || "Bắt đầu cuộc trò chuyện..."}
                      </p>

                      <div className="flex items-center gap-1.5">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500 text-white shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            Chưa phản hồi
                          </span>
                        ) : (
                          <span className="text-[9.5px] px-1.5 py-0.5 rounded font-medium bg-stone-100 text-stone-500 border border-stone-200">
                            Đã giải quyết
                          </span>
                        )}

                        {t.customerPhone && (
                          <span
                            className={`text-[10px] font-mono ${
                              isPending ? "text-stone-600 font-semibold" : "text-stone-400"
                            }`}
                          >
                            · {t.customerPhone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Huy hiệu tin chưa đọc nhấp nháy đỏ */}
                    {hasUnread && (
                      <div className="absolute right-3 top-3 px-1.5 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded-full animate-pulse shadow-sm">
                        {t.unreadAdminCount}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* === CỘT PHẢI: KHUNG CHAT TRỰC TIẾP === */}
        {selectedTicket ? (
          <div className="flex-1 flex flex-col bg-stone-100/50">
            {/* Header khung chat */}
            <div className="p-4 bg-white border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-900/10 text-[#143224] font-bold flex items-center justify-center border border-emerald-900/15">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    {selectedTicket.customerName || "Khách Hàng"}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-stone-500">
                    <span>
                      {selectedTicket.customerPhone
                        ? `SĐT: ${selectedTicket.customerPhone}`
                        : "Khách trực tuyến trên website"}
                    </span>
                    {selectedTicket.customerEmail && (
                      <span>· {selectedTicket.customerEmail}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Nút đổi trạng thái Ticket */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedTicket.status}
                  onChange={(e) =>
                    handleStatusChange(e.target.value as SupportTicketStatus)
                  }
                  className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 font-medium text-stone-700 cursor-pointer focus:outline-hidden"
                >
                  <option value="OPEN">Đang Hỗ Trợ (OPEN)</option>
                  <option value="RESOLVED">Đã Giải Quyết (RESOLVED)</option>
                  <option value="CLOSED">Đóng Phiên (CLOSED)</option>
                </select>
              </div>
            </div>

            {/* Nội dung danh sách tin nhắn */}
            <div ref={chatScrollContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3">
              {isLoadingMessages ? (
                <div className="h-full flex items-center justify-center text-xs text-stone-400">
                  <RefreshCw size={14} className="animate-spin mr-2" />
                  Đang tải tin nhắn...
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-stone-400 text-xs">
                  <MessageSquare size={32} className="mb-2 text-stone-300" />
                  Chưa có tin nhắn trong cuộc trò chuyện này.
                </div>
              ) : (
                messages.map((m) => {
                  const isAdmin = m.senderType === "ADMIN";

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${
                        isAdmin ? "items-end" : "items-start"
                      }`}
                    >
                      {/* Tên người gửi */}
                      <span className="text-[10px] text-stone-400 mb-1 px-1">
                        {isAdmin ? "Bạn" : m.senderName} ·{" "}
                        {new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {/* Bong bóng tin nhắn */}
                      <div
                        className={`max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                          isAdmin
                            ? "bg-[#143224] text-[#FAF9F6] rounded-tr-xs"
                            : "bg-white text-stone-800 border border-stone-200 rounded-tl-xs"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Cụm câu trả lời mẫu nhanh (Quick Presets) */}
            <div className="px-4 py-2 bg-stone-50 border-t border-stone-200 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-[10.5px] font-semibold text-stone-500 shrink-0">
                Trả lời nhanh:
              </span>
              <button
                type="button"
                onClick={() =>
                  handleQuickPreset(
                    "Dạ chào bạn! CLOOP có thể hỗ trợ gì cho bạn về các mẫu trang phục tuần hoàn hôm nay ạ?"
                  )
                }
                className="px-2.5 py-1 rounded-full bg-white border border-stone-200 text-stone-600 hover:border-emerald-600 hover:text-emerald-900 text-[11px] whitespace-nowrap transition-colors cursor-pointer"
              >
                Lời chào
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickPreset(
                    "CLOOP hỗ trợ đổi size miễn phí trong vòng 24h kể từ khi nhận đồ bạn nhé!"
                  )
                }
                className="px-2.5 py-1 rounded-full bg-white border border-stone-200 text-stone-600 hover:border-emerald-600 hover:text-emerald-900 text-[11px] whitespace-nowrap transition-colors cursor-pointer"
              >
                Đổi size 24h
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickPreset(
                    "Tiền cọc Escrow sẽ được tự động hoàn lại vào ví của bạn ngay sau khi đồ được bàn giao nguyên vẹn ạ!"
                  )
                }
                className="px-2.5 py-1 rounded-full bg-white border border-stone-200 text-stone-600 hover:border-emerald-600 hover:text-emerald-900 text-[11px] whitespace-nowrap transition-colors cursor-pointer"
              >
                Hoàn tiền cọc
              </button>
            </div>

            {/* Khung soạn thảo & gửi tin nhắn */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-white border-t border-stone-200 flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Nhập nội dung phản hồi khách hàng (Enter để gửi)..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isSending}
                className="flex-1 px-4 py-2.5 text-xs bg-stone-100 rounded-xl border border-transparent focus:border-emerald-700 focus:bg-white focus:outline-hidden transition-all"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="px-5 py-2.5 bg-[#143224] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Send size={13} />
                <span>Gửi</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-400 text-xs">
            <Headphones size={40} className="mb-2 text-stone-300" />
            Chọn một cuộc hội thoại bên trái để bắt đầu hỗ trợ khách hàng.
          </div>
        )}
      </div>
    </div>
  );
}
