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
  RefreshCw,
  Search,
  MessageSquare,
  AlertCircle,
  Headphones,
  Paperclip,
  Film,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Phone,
  Mail,
  MapPin,
  Star,
  ShoppingBag,
  Wallet,
  ShieldCheck,
  X,
  Info,
  ChevronRight,
} from "lucide-react";
import {
  getAllSupportTickets,
  getTicketMessages,
  sendAdminMessage,
  markTicketReadByAdmin,
  updateTicketStatus,
  MessageItem,
  TicketSummary,
} from "@/app/actions/support";
import { soundAlert } from "@/lib/sound-alert";
import { parseMediaContent } from "@/lib/support-utils";
import { SupportTicketStatus } from "@prisma/client";
import Link from "next/link";

export default function AdminSupportClient({
  initialTickets,
}: {
  initialTickets: TicketSummary[];
}) {
  const [tickets, setTickets] = useState<TicketSummary[]>(initialTickets);
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
  const [showCustomerDetails, setShowCustomerDetails] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Quản lý đính kèm tệp cho Admin (Lưu kho Google Drive 10TB)
  const [adminAttachment, setAdminAttachment] = useState<{
    file: File;
    previewUrl: string;
    isVideo: boolean;
    name: string;
    sizeStr: string;
  } | null>(null);
  const adminFileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Cuộn nội bộ khung chat
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
        setTimeout(() => scrollToBottom(false), 50);

        // Đánh dấu đã đọc
        await markTicketReadByAdmin(selectedTicketId);
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

  // Polling tự động kiểm tra tin nhắn mới mỗi 3.5 giây & KÍCH HOẠT CHUÔNG BÁO
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await getAllSupportTickets();
      if (res.success && res.tickets) {
        const newTickets = res.tickets as TicketSummary[];

        setTickets((prev) => {
          const isSame =
            prev.length === newTickets.length &&
            prev[0]?.id === newTickets[0]?.id &&
            prev[0]?.lastMessageAt === newTickets[0]?.lastMessageAt &&
            prev[0]?.unreadAdminCount === newTickets[0]?.unreadAdminCount;
          return isSame ? prev : newTickets;
        });

        const currentUnread = newTickets.reduce(
          (sum, t) => sum + (t.unreadAdminCount || 0),
          0
        );

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

        // Cập nhật messages của ticket đang mở khi có tin nhắn mới
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
              return prev;
            });
          }
        }
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [selectedTicketId]);

  const toggleSound = () => {
    const next = !isSoundOn;
    setIsSoundOn(next);
    soundAlert.setSoundEnabled(next);
    if (next) {
      soundAlert.playChime();
    }
  };

  const handleTestSound = () => {
    soundAlert.playChime();
  };

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

  // Chọn tệp đính kèm gửi cho khách (ảnh hoặc video)
  const handleAdminFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVid = file.type.startsWith("video/");
    const maxMb = isVid ? 50 : 15;
    if (file.size > maxMb * 1024 * 1024) {
      alert(`Tệp quá lớn. Vui lòng chọn tệp nhỏ hơn ${maxMb}MB.`);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";
    setAdminAttachment({
      file,
      previewUrl,
      isVideo: isVid,
      name: file.name,
      sizeStr,
    });
    if (adminFileInputRef.current) adminFileInputRef.current.value = "";
  };

  // Gửi tin nhắn phản hồi của Admin (kèm ảnh/video Google Drive 10TB nếu có)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = inputText.trim();
    if (!selectedTicketId || (!content && !adminAttachment) || isSending) return;

    setIsSending(true);

    let finalContent = content;

    // 🛡️ Tải ảnh/video lên Kho Google Drive 10TB
    if (adminAttachment) {
      try {
        const formData = new FormData();
        formData.append("file", adminAttachment.file);
        formData.append("targetKho", "auto");

        const upRes = await fetch("/api/upload-drive", {
          method: "POST",
          body: formData,
        });

        if (upRes.ok) {
          const data = await upRes.json();
          if (data.success && data.url) {
            const tag = data.isVideo ? `[VIDEO:${data.url}]` : `[IMAGE:${data.url}]`;
            finalContent = finalContent ? `${tag} ${finalContent}` : tag;
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải tệp lên Google Drive:", err);
      }
    }

    if (finalContent.trim()) {
      const res = await sendAdminMessage({
        ticketId: selectedTicketId,
        content: finalContent.trim(),
        agentTitle: "Chuyên viên CSKH CLOOP",
      });

      if (res.success && res.message) {
        setMessages((prev) => [...prev, res.message as any]);
        setInputText("");
        setAdminAttachment(null);
        setTimeout(() => scrollToBottom(true), 50);
      }
    }

    setIsSending(false);
  };

  const handleQuickPreset = (presetText: string) => {
    setInputText(presetText);
  };

  const handleStatusChange = async (newStatus: SupportTicketStatus) => {
    if (!selectedTicketId) return;
    await updateTicketStatus(selectedTicketId, newStatus);
    setTickets((prev) =>
      prev.map((t) => (t.id === selectedTicketId ? { ...t, status: newStatus } : t))
    );
  };

  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Lọc ticket
  const filteredTickets = tickets.filter((t) => {
    if (filter !== "ALL" && t.status !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.customerName?.toLowerCase().includes(q);
      const matchPhone = t.customerPhone?.toLowerCase().includes(q);
      const matchEmail = t.customerEmail?.toLowerCase().includes(q);
      const matchMsg = t.lastMessage?.toLowerCase().includes(q);
      return matchName || matchPhone || matchEmail || matchMsg;
    }
    return true;
  });

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);

  return (
    <div className="flex flex-col h-[calc(100vh-175px)] bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden font-ui">
      {/* --- TOP BAR: TRẠNG THÁI & ĐIỀU KHIỂN CHUÔNG BÁO --- */}
      <div className="flex flex-wrap items-center justify-between px-6 py-3 bg-stone-50 border-b border-stone-200 gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/90 border border-emerald-300 text-[#183A2D] text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            CSKH Trực Tuyến · Minh Bạch & Chính Chủ
          </div>
          <span className="text-xs text-stone-500 hidden sm:inline">
            Tổng {tickets.length} cuộc hội thoại
          </span>
        </div>

        {/* Cụm điều khiển âm thanh & thông báo */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTestSound}
            title="Thử tiếng chuông Ding-Dong"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <Bell size={13} className="text-[#183A2D]" />
            <span>Thử Chuông</span>
          </button>

          <button
            onClick={toggleSound}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
              isSoundOn
                ? "bg-[#183A2D] text-white border border-[#122D22]"
                : "bg-stone-200 text-stone-600 border border-stone-300"
            }`}
          >
            {isSoundOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span>{isSoundOn ? "Chuông: BẬT" : "Chuông: TẮT"}</span>
          </button>

          {notificationPermission !== "granted" && (
            <button
              onClick={handleRequestNotification}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-300 text-amber-900 hover:bg-amber-500/20 text-xs font-medium transition-colors cursor-pointer"
            >
              <AlertCircle size={13} />
              <span>Bật Thông Báo</span>
            </button>
          )}
        </div>
      </div>

      {/* --- THÂN MÀN HÌNH: 2 CỘT CHUẨN ZENDESK + PANEL THÔNG TIN KHÁCH HÀNG --- */}
      <div className="flex flex-1 overflow-hidden">
        {/* === CỘT TRÁI: DANH SÁCH KHÁCH HÀNG & PHIÊN CHAT === */}
        <div className="w-full sm:w-80 md:w-92 border-r border-stone-200 flex flex-col bg-stone-50/50 shrink-0">
          {/* Ô tìm kiếm & Bộ lọc */}
          <div className="p-3 border-b border-stone-200 space-y-2 bg-white shrink-0">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="text"
                placeholder="Tìm tên khách hàng, SĐT, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-stone-100 rounded-lg border border-transparent focus:border-emerald-700 focus:bg-white focus:outline-hidden transition-all"
              />
            </div>

            <div className="flex gap-1.5">
              {(["ALL", "OPEN", "RESOLVED"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilter(st)}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                    filter === st
                      ? "bg-[#183A2D] text-white"
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
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100 scrollbar-thin">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                Chưa có cuộc trò chuyện nào phù hợp.
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isSelected = t.id === selectedTicketId;
                const isPending = t.status === "OPEN" || t.unreadAdminCount > 0;
                const hasUnread = t.unreadAdminCount > 0;
                const displayName = t.customerName || "Thành viên CLOOP";

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 relative border-b border-stone-100 ${
                      isSelected
                        ? "bg-emerald-50/90 border-l-4 border-l-[#183A2D]"
                        : isPending
                        ? "bg-amber-50/40 hover:bg-amber-100/50 border-l-4 border-l-amber-500 shadow-2xs"
                        : "bg-white hover:bg-stone-50 border-l-4 border-l-transparent"
                    }`}
                  >
                    {/* Avatar Khách */}
                    {t.userAvatar ? (
                      <img
                        src={t.userAvatar}
                        alt={displayName}
                        className="w-10 h-10 rounded-full object-cover border border-stone-200 shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold transition-colors ${
                          isPending
                            ? "bg-amber-100 text-amber-950 border border-amber-300"
                            : "bg-[#183A2D]/10 text-[#183A2D] border border-stone-200"
                        }`}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={`text-xs truncate font-bold ${
                              isPending ? "text-stone-950 text-[13px]" : "text-stone-700"
                            }`}
                          >
                            {displayName}
                          </span>
                          {t.userId && (
                            <span title="Tài khoản chính chủ" className="inline-flex">
                              <ShieldCheck size={12} className="text-emerald-700 shrink-0" />
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] shrink-0 font-mono ${
                            isPending ? "font-bold text-amber-900" : "text-stone-400 font-normal"
                          }`}
                        >
                          {new Date(t.lastMessageAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Tin nhắn mới nhất */}
                      <p
                        className={`text-xs truncate mb-1.5 ${
                          isPending
                            ? "font-semibold text-stone-900 text-[12px]"
                            : "text-stone-400 font-normal"
                        }`}
                      >
                        {t.lastMessage?.includes("[IMAGE:")
                          ? "📷 [Hình ảnh đính kèm]"
                          : t.lastMessage?.includes("[VIDEO:")
                          ? "🎥 [Video đính kèm]"
                          : t.lastMessage || "Bắt đầu cuộc trò chuyện..."}
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
                          <span className="text-[10px] font-mono text-stone-600">
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
          <div className="flex-1 flex flex-col bg-stone-100/50 min-w-0">
            {/* Header khung chat: Hiển thị đầy đủ tên khách + Trỏ thẳng trang cá nhân */}
            <div className="p-3.5 bg-white border-b border-stone-200 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {selectedTicket.userAvatar ? (
                  <img
                    src={selectedTicket.userAvatar}
                    alt={selectedTicket.customerName || ""}
                    className="w-10 h-10 rounded-full object-cover border border-stone-200 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#183A2D]/10 text-[#183A2D] font-bold flex items-center justify-center border border-emerald-900/15 shrink-0 text-sm">
                    {selectedTicket.customerName ? selectedTicket.customerName.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-stone-900 truncate">
                      {selectedTicket.customerName || "Thành viên CLOOP"}
                    </h3>
                    {selectedTicket.userId && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold shrink-0">
                        Chính Chủ
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-stone-500 truncate">
                    {selectedTicket.customerPhone && (
                      <span className="font-mono text-stone-700 font-medium">
                        SĐT: {selectedTicket.customerPhone}
                      </span>
                    )}
                    {selectedTicket.customerEmail && (
                      <span className="truncate">· {selectedTicket.customerEmail}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Nút Trỏ Thẳng Trang Cá Nhân / Tủ Đồ + Đổi trạng thái */}
              <div className="flex items-center gap-2 shrink-0">
                {selectedTicket.userId ? (
                  <a
                    href={`/closet/${selectedTicket.userId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#183A2D] border border-emerald-300 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    title="Mở tủ đồ & trang cá nhân của khách hàng trên tab mới"
                  >
                    <ExternalLink size={13} />
                    <span className="hidden md:inline">Trang Cá Nhân / Tủ Đồ</span>
                    <span className="md:hidden">Tủ Đồ</span>
                  </a>
                ) : (
                  <span className="text-[11px] text-stone-400 italic px-2">Khách vãng lai</span>
                )}

                <button
                  type="button"
                  onClick={() => setShowCustomerDetails(!showCustomerDetails)}
                  className={`p-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    showCustomerDetails
                      ? "bg-stone-200 text-stone-800 border-stone-300"
                      : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                  }`}
                  title="Bật/Tắt xem chi tiết thông tin khách hàng"
                >
                  <Info size={14} />
                </button>

                <select
                  value={selectedTicket.status}
                  onChange={(e) =>
                    handleStatusChange(e.target.value as SupportTicketStatus)
                  }
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 font-medium text-stone-700 cursor-pointer focus:outline-hidden"
                >
                  <option value="OPEN">Đang Hỗ Trợ (OPEN)</option>
                  <option value="RESOLVED">Đã Giải Quyết (RESOLVED)</option>
                  <option value="CLOSED">Đóng Phiên (CLOSED)</option>
                </select>
              </div>
            </div>

            {/* Khung thân chat + Khung Chi Tiết Khách Hàng */}
            <div className="flex-1 flex overflow-hidden">
              {/* Vùng tin nhắn */}
              <div className="flex-1 flex flex-col min-w-0">
                <div ref={chatScrollContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin">
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
                      const parsed = parseMediaContent(m.content);

                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${
                            isAdmin ? "items-end" : "items-start"
                          }`}
                        >
                          {/* Tên người gửi */}
                          <span className="text-[10px] text-stone-400 mb-1 px-1 font-mono">
                            {isAdmin ? "Bạn (CSKH)" : m.senderName} ·{" "}
                            {new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>

                          {/* Bong bóng tin nhắn */}
                          <div
                            className={`max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed shadow-2xs space-y-2 ${
                              isAdmin
                                ? "bg-[#183A2D] text-[#FAF9F6] rounded-tr-xs"
                                : "bg-white text-stone-800 border border-stone-200 rounded-tl-xs"
                            }`}
                          >
                            {/* Render hình ảnh nếu có */}
                            {parsed.images.map((imgUrl, idx) => (
                              <a
                                key={idx}
                                href={imgUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded-xl overflow-hidden border border-black/10 group/img relative cursor-pointer"
                              >
                                <img
                                  src={imgUrl}
                                  alt="Media"
                                  className="max-h-64 max-w-full rounded-xl object-cover hover:scale-102 transition-transform duration-200"
                                  loading="lazy"
                                />
                                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1 opacity-80 group-hover/img:opacity-100 transition-opacity">
                                  <ExternalLink size={10} />
                                  <span>Xem ảnh gốc</span>
                                </div>
                              </a>
                            ))}

                            {/* Render video nếu có */}
                            {parsed.videos.map((vidUrl, idx) => (
                              <div key={idx} className="rounded-xl overflow-hidden border border-black/10 bg-black/10">
                                <video
                                  src={vidUrl}
                                  controls
                                  preload="metadata"
                                  className="max-h-64 max-w-full rounded-xl w-full"
                                />
                              </div>
                            ))}

                            {/* Nội dung chữ */}
                            {parsed.text && (
                              <p className="whitespace-pre-wrap">{parsed.text}</p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Cụm câu trả lời mẫu nhanh */}
                <div className="px-4 py-1.5 bg-stone-50 border-t border-stone-200 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
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
                    className="px-2.5 py-0.8 rounded-full bg-white border border-stone-200 text-stone-600 hover:border-emerald-600 hover:text-emerald-900 text-[11px] whitespace-nowrap transition-colors cursor-pointer"
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
                    className="px-2.5 py-0.8 rounded-full bg-white border border-stone-200 text-stone-600 hover:border-emerald-600 hover:text-emerald-900 text-[11px] whitespace-nowrap transition-colors cursor-pointer"
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
                    className="px-2.5 py-0.8 rounded-full bg-white border border-stone-200 text-stone-600 hover:border-emerald-600 hover:text-emerald-900 text-[11px] whitespace-nowrap transition-colors cursor-pointer"
                  >
                    Hoàn tiền cọc
                  </button>
                </div>

                {/* Preview file đính kèm trước khi Admin gửi */}
                {adminAttachment && (
                  <div className="px-4 py-2 bg-stone-100/90 border-t border-stone-200 flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {adminAttachment.isVideo ? (
                        <div className="w-8 h-8 rounded-lg bg-emerald-900/10 text-[#183A2D] flex items-center justify-center shrink-0">
                          <Film size={16} />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-stone-300 shrink-0">
                          <img
                            src={adminAttachment.previewUrl}
                            alt="preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="truncate min-w-0">
                        <p className="text-xs font-semibold text-stone-800 truncate">
                          {adminAttachment.name}
                        </p>
                        <p className="text-[10px] text-stone-500 font-mono">
                          {adminAttachment.sizeStr}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAdminAttachment(null)}
                      disabled={isSending}
                      className="p-1 hover:bg-stone-200 rounded-full text-stone-500 transition-colors cursor-pointer"
                      title="Hủy đính kèm"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Khung soạn thảo & gửi tin nhắn */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 bg-white border-t border-stone-200 flex items-center gap-2 shrink-0"
                >
                  <input
                    ref={adminFileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleAdminFileSelect}
                  />
                  <button
                    type="button"
                    onClick={() => adminFileInputRef.current?.click()}
                    disabled={isSending}
                    title="Đính kèm ảnh hoặc video"
                    className="p-2 text-stone-500 hover:text-[#183A2D] hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    <Paperclip size={16} />
                  </button>

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
                    disabled={(!inputText.trim() && !adminAttachment) || isSending}
                    className="px-5 py-2.5 bg-[#183A2D] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
                  >
                    {isSending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Send size={13} />
                    )}
                    <span>Gửi</span>
                  </button>
                </form>
              </div>

              {/* === BẢNG CHI TIẾT THÔNG TIN KHÁCH HÀNG (PANEL BÊN PHẢI) === */}
              {showCustomerDetails && (
                <div className="w-72 sm:w-80 border-l border-stone-200 bg-white p-4 overflow-y-auto space-y-4 shrink-0 scrollbar-thin">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                      <User size={13} className="text-[#183A2D]" />
                      Chi Tiết Khách Hàng
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowCustomerDetails(false)}
                      className="text-stone-400 hover:text-stone-600 p-0.5 rounded cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  {/* Thẻ định danh khách */}
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2">
                    <div className="flex items-center gap-2.5">
                      {selectedTicket.userAvatar ? (
                        <img
                          src={selectedTicket.userAvatar}
                          alt="avatar"
                          className="w-11 h-11 rounded-full object-cover border border-stone-200"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-[#183A2D] text-white font-bold flex items-center justify-center text-sm">
                          {selectedTicket.customerName?.charAt(0).toUpperCase() || "K"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-900 truncate">
                          {selectedTicket.customerName || "Thành viên CLOOP"}
                        </p>
                        <p className="text-[10px] text-stone-500 font-mono truncate">
                          ID: {selectedTicket.userId ? selectedTicket.userId.slice(0, 12) + "..." : "Khách vãng lai"}
                        </p>
                      </div>
                    </div>

                    {/* Nút bấm trỏ thẳng đến trang cá nhân & tủ đồ */}
                    {selectedTicket.userId ? (
                      <a
                        href={`/closet/${selectedTicket.userId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 w-full py-1.5 px-3 rounded-lg bg-[#183A2D] text-white hover:bg-emerald-900 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ExternalLink size={12} />
                        <span>Xem Tủ Đồ & Trang Cá Nhân</span>
                      </a>
                    ) : (
                      <p className="text-[10px] text-stone-400 italic text-center mt-1">
                        Chưa liên kết tài khoản thành viên
                      </p>
                    )}
                  </div>

                  {/* Thông tin liên lạc */}
                  <div className="space-y-2.5 text-xs">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      Thông Tin Liên Lạc
                    </p>

                    {/* SĐT */}
                    <div className="flex items-start justify-between gap-2 p-2 rounded-lg bg-stone-50 border border-stone-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone size={13} className="text-stone-500 shrink-0" />
                        <div className="truncate">
                          <p className="text-[10px] text-stone-500">Số điện thoại</p>
                          <p className="font-mono font-bold text-stone-900 truncate text-[11.5px]">
                            {selectedTicket.customerPhone || "Chưa có"}
                          </p>
                        </div>
                      </div>
                      {selectedTicket.customerPhone && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedTicket.customerPhone!, "phone")}
                            className="p-1 text-stone-500 hover:text-stone-800 hover:bg-stone-200 rounded transition-colors cursor-pointer"
                            title="Sao chép SĐT"
                          >
                            {copiedKey === "phone" ? <Check size={12} className="text-emerald-700" /> : <Copy size={12} />}
                          </button>
                          <a
                            href={`tel:${selectedTicket.customerPhone}`}
                            className="p-1 text-[#183A2D] hover:bg-emerald-100 rounded transition-colors cursor-pointer"
                            title="Gọi điện"
                          >
                            <Phone size={12} />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Email */}
                    <div className="flex items-start justify-between gap-2 p-2 rounded-lg bg-stone-50 border border-stone-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail size={13} className="text-stone-500 shrink-0" />
                        <div className="truncate">
                          <p className="text-[10px] text-stone-500">Email</p>
                          <p className="font-medium text-stone-900 truncate text-[11px]">
                            {selectedTicket.customerEmail || "Chưa cập nhật"}
                          </p>
                        </div>
                      </div>
                      {selectedTicket.customerEmail && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedTicket.customerEmail!, "email")}
                          className="p-1 text-stone-500 hover:text-stone-800 hover:bg-stone-200 rounded transition-colors cursor-pointer shrink-0"
                          title="Sao chép Email"
                        >
                          {copiedKey === "email" ? <Check size={12} className="text-emerald-700" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>

                    {/* Địa chỉ giao nhận GHN */}
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-stone-50 border border-stone-100">
                      <MapPin size={13} className="text-stone-500 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-stone-500">Địa chỉ GHN / Nhận hàng</p>
                        <p className="font-medium text-stone-900 text-[11px] leading-relaxed">
                          {selectedTicket.customerAddress || "Chưa cập nhật địa chỉ"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Chỉ số tài khoản */}
                  <div className="space-y-2 text-xs">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      Chỉ Số Tài Khoản
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-100 space-y-0.5">
                        <div className="flex items-center gap-1 text-[10px] text-stone-500">
                          <Star size={11} className="text-amber-500" />
                          <span>Đánh giá</span>
                        </div>
                        <p className="text-xs font-bold text-stone-900 font-mono">
                          {selectedTicket.userRating ? Number(selectedTicket.userRating).toFixed(1) : "5.0"} / 5.0
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-100 space-y-0.5">
                        <div className="flex items-center gap-1 text-[10px] text-stone-500">
                          <ShoppingBag size={11} className="text-emerald-700" />
                          <span>Đơn hoàn thành</span>
                        </div>
                        <p className="text-xs font-bold text-stone-900 font-mono">
                          {selectedTicket.userCompletedOrders ?? 0} đơn
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10.5px] text-stone-600">
                        <Wallet size={12} className="text-[#183A2D]" />
                        <span>Số dư ví</span>
                      </div>
                      <span className="font-mono font-bold text-[#183A2D] text-xs">
                        {(selectedTicket.userWalletBalance ?? 0).toLocaleString("vi-VN")} đ
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
