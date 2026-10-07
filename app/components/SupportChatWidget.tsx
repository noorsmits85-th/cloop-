"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  MessageCircle,
  X,
  Send,
  Headphones,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import {
  getOrCreateSupportTicket,
  getTicketMessages,
  sendCustomerMessage,
  MessageItem,
} from "@/app/actions/support";
import { soundAlert } from "@/lib/sound-alert";

export default function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [hasStartedChat, setHasStartedChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevAdminMsgCount = useRef<number>(0);

  // Khôi phục ticketId từ localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedId = localStorage.getItem("cloop_customer_ticket_id");
      const savedName = localStorage.getItem("cloop_customer_name") || "";
      const savedPhone = localStorage.getItem("cloop_customer_phone") || "";

      if (savedName) setCustomerName(savedName);
      if (savedPhone) setCustomerPhone(savedPhone);

      if (savedId) {
        setTicketId(savedId);
        setHasStartedChat(true);
        loadTicket(savedId);
      }
    }
  }, []);

  const loadTicket = async (id: string) => {
    const res = await getTicketMessages(id);
    if (res.success && res.messages) {
      setMessages(res.messages as any);
      const adminCount = res.messages.filter((m) => m.senderType === "ADMIN").length;
      prevAdminMsgCount.current = adminCount;
    }
  };

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
    }
  }, [isOpen, messages]);

  // Polling nhận tin nhắn phản hồi từ Admin mỗi 3.5 giây
  useEffect(() => {
    if (!ticketId) return;

    const interval = setInterval(async () => {
      const res = await getTicketMessages(ticketId);
      if (res.success && res.messages) {
        const newMsgs = res.messages as any[];
        setMessages(newMsgs);

        const currentAdminMsgs = newMsgs.filter((m) => m.senderType === "ADMIN").length;

        // Nếu admin vừa gửi tin nhắn mới
        if (currentAdminMsgs > prevAdminMsgCount.current) {
          soundAlert.playChime();
          if (!isOpen) {
            setUnreadCount((prev) => prev + (currentAdminMsgs - prevAdminMsgCount.current));
          }
        }
        prevAdminMsgCount.current = currentAdminMsgs;
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [ticketId, isOpen]);

  // Bắt đầu phiên chat lần đầu
  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() && !customerPhone.trim()) {
      // Cho phép chat ngay với tên Khách hàng mặc định
    }

    const name = customerName.trim() || "Khách Hàng";
    const phone = customerPhone.trim() || undefined;

    if (typeof window !== "undefined") {
      localStorage.setItem("cloop_customer_name", name);
      if (phone) localStorage.setItem("cloop_customer_phone", phone);
    }

    const res = await getOrCreateSupportTicket({
      customerName: name,
      customerPhone: phone,
    });

    if (res.success && res.ticket) {
      const newId = res.ticket.id;
      setTicketId(newId);
      if (typeof window !== "undefined") {
        localStorage.setItem("cloop_customer_ticket_id", newId);
      }
      setHasStartedChat(true);

      // Tự động gửi tin nhắn chào mừng đầu tiên nếu có
      if (inputText.trim()) {
        await doSendMessage(newId, inputText.trim(), name);
        setInputText("");
      }
    }
  };

  const doSendMessage = async (id: string, text: string, sender: string) => {
    setIsSending(true);
    const res = await sendCustomerMessage({
      ticketId: id,
      content: text,
      senderName: sender,
    });

    if (res.success && res.message) {
      setMessages((prev) => [...prev, res.message as any]);
    }
    setIsSending(false);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ticketId || !inputText.trim() || isSending) return;

    const text = inputText.trim();
    setInputText("");
    await doSendMessage(ticketId, text, customerName || "Khách Hàng");
  };

  const handleQuickQuestion = async (question: string) => {
    if (!hasStartedChat) {
      setInputText(question);
    } else if (ticketId) {
      await doSendMessage(ticketId, question, customerName || "Khách Hàng");
    }
  };

  return (
    <>
      {/* --- NÚT BONG BÓNG CHAT NỔI Ở GÓC DƯỚI BÊN PHẢI --- */}
      <div className="fixed bottom-6 right-6 z-50 select-none font-ui">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#143224] text-white shadow-[0_8px_30px_rgba(20,50,36,0.35)] hover:bg-emerald-900 hover:scale-105 active:scale-95 transition-all duration-300 border border-emerald-700/40 cursor-pointer"
          >
            {/* Chấm xanh phát sáng báo Online */}
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>

            <Headphones size={18} className="transition-transform group-hover:rotate-12" />

            <span className="text-xs font-semibold tracking-wide hidden sm:inline">
              Hỗ Trợ CSKH
            </span>

            {/* Huy hiệu tin chưa đọc từ CSKH */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce shadow-md">
                {unreadCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* --- CỬA SỔ HỘP CHAT CHÍNH (POPUP WINDOW) --- */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] sm:w-[390px] h-[540px] max-h-[85vh] bg-white rounded-3xl shadow-[0_12px_45px_rgba(0,0,0,0.2)] border border-stone-200/80 flex flex-col overflow-hidden font-ui animate-in fade-in slide-in-from-bottom-5 duration-300">
          
          {/* HEADER CHAT: SANG TRỌNG & CHUẨN THƯƠNG HIỆU CLOOP */}
          <div className="bg-[#143224] text-[#FAF9F6] p-4 flex items-center justify-between border-b border-emerald-950 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 p-1.5 flex items-center justify-center">
                <Image
                  src="/loogo.png"
                  alt="CLOOP"
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold tracking-wide">CLOOP Customer Care</h4>
                  <ShieldCheck size={13} className="text-emerald-400" />
                </div>
                <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Trực tuyến · Phản hồi trong 2 phút</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* NỘI DUNG CUỘC TRÒ CHUYỆN */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF9F6]">
            
            {/* LỜI CHÀO BAN ĐẦU */}
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-900/10 text-emerald-950 font-bold flex items-center justify-center shrink-0 border border-emerald-900/15 text-[11px]">
                C
              </div>
              <div className="bg-white p-3 rounded-2xl rounded-tl-xs border border-stone-200/70 text-xs text-stone-700 leading-relaxed shadow-2xs">
                <p className="font-semibold text-[#143224] mb-1">Chào mừng bạn đến với CLOOP! 🌿</p>
                Đội ngũ CSKH sẵn sàng hỗ trợ bạn về chọn size, giao nhận trang phục và hoàn trả tiền cọc Escrow 100%.
              </div>
            </div>

            {/* NẾU CHƯA BẮT ĐẦU: FORM NHẬP THÔNG TIN CƠ BẢN */}
            {!hasStartedChat && (
              <form
                onSubmit={handleStartConversation}
                className="bg-white p-3.5 rounded-2xl border border-emerald-900/15 shadow-sm space-y-2.5 mt-2"
              >
                <div className="text-[11px] font-semibold text-emerald-950 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-amber-500" />
                  Để CLOOP hỗ trợ bạn nhanh và chính xác nhất:
                </div>
                <input
                  type="text"
                  placeholder="Tên của bạn (VD: Thu Hà)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 focus:border-emerald-700 focus:bg-white focus:outline-hidden"
                />
                <input
                  type="tel"
                  placeholder="Số điện thoại nhận hỗ trợ (không bắt buộc)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 focus:border-emerald-700 focus:bg-white focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-[#143224] text-white rounded-xl text-xs font-semibold hover:bg-emerald-900 transition-colors shadow-2xs cursor-pointer"
                >
                  Bắt Đầu Chat Với CSKH
                </button>
              </form>
            )}

            {/* DANH SÁCH TIN NHẮN ĐÃ GỬI & NHẬN */}
            {messages.map((m) => {
              const isMe = m.senderType === "USER";

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <span className="text-[9.5px] text-stone-400 mb-0.5 px-1">
                    {isMe ? "Bạn" : "Chuyên viên CSKH"} ·{" "}
                    {new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                      isMe
                        ? "bg-[#143224] text-white rounded-tr-xs"
                        : "bg-white text-stone-800 border border-stone-200/80 rounded-tl-xs"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* GỢI Ý CÂU HỎI THƯỜNG GẶP (CHIPS) */}
          <div className="px-3 py-1.5 bg-stone-50 border-t border-stone-200 flex items-center gap-1.5 overflow-x-auto text-[10.5px]">
            <button
              type="button"
              onClick={() => handleQuickQuestion("Shop cho mình hỏi về chính sách đổi size 24h?")}
              className="px-2.5 py-1 rounded-full bg-white border border-stone-200 text-stone-600 hover:border-emerald-700 hover:text-emerald-900 whitespace-nowrap transition-colors cursor-pointer"
            >
              👗 Đổi size 24h
            </button>
            <button
              type="button"
              onClick={() => handleQuickQuestion("Tiền cọc Escrow khi nào được hoàn về ví ạ?")}
              className="px-2.5 py-1 rounded-full bg-white border border-stone-200 text-stone-600 hover:border-emerald-700 hover:text-emerald-900 whitespace-nowrap transition-colors cursor-pointer"
            >
              🛡️ Hoàn tiền cọc
            </button>
            <button
              type="button"
              onClick={() => handleQuickQuestion("Thời gian giao nhận hỏa tốc GHN là bao lâu?")}
              className="px-2.5 py-1 rounded-full bg-white border border-stone-200 text-stone-600 hover:border-emerald-700 hover:text-emerald-900 whitespace-nowrap transition-colors cursor-pointer"
            >
              🚚 Phí ship GHN
            </button>
          </div>

          {/* KHUNG NHẬP TIN NHẮN */}
          <form
            onSubmit={hasStartedChat ? handleSend : handleStartConversation}
            className="p-3 bg-white border-t border-stone-200 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Nhập câu hỏi cần hỗ trợ..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isSending}
              className="flex-1 px-3.5 py-2 text-xs bg-stone-100 rounded-xl border border-transparent focus:border-emerald-700 focus:bg-white focus:outline-hidden transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="p-2 bg-[#143224] text-white rounded-xl hover:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Send size={14} />
            </button>
          </form>

        </div>
      )}
    </>
  );
}
