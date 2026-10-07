"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  MapPin, Send, X, PhoneCall, MessageCircle, 
  ArrowRight, ShieldCheck, Headphones, Camera, Image as ImageIcon,
  Paperclip, Film, Loader2, ExternalLink
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { 
  getOrCreateSupportTicket, 
  getTicketMessages, 
  sendCustomerMessage, 
  MessageItem 
} from "@/app/actions/support";
import { soundAlert } from "@/lib/sound-alert";
import { parseMediaContent } from "@/lib/support-utils";

// 🌟 ICON ĐẶC TRƯNG ĐỘC BẢN: CLOOP CHATBOT (Kết hợp Chat Bubble + Đôi Mắt Infinity Loop Tuần Hoàn)
function CloopChatBotIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Antenna Signal Dot */}
      <circle cx="18" cy="3" r="1.5" fill="#34D399" />
      <path d="M18 4.5V6.5" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" />

      {/* Chat Bubble Silhouette */}
      <path
        d="M18 6.5C10.268 6.5 4 12.09 4 19C4 22.25 5.37 25.19 7.68 27.41L6.2 32.1C6.02 32.66 6.58 33.15 7.14 32.94L12.56 30.9C14.26 31.36 16.08 31.5 18 31.5C25.732 31.5 32 25.91 32 19C32 12.09 25.732 6.5 18 6.5Z"
        fill="url(#cloop_chat_bot_bg)"
        stroke="#A3E39F"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* CLOOP Infinity Loop Eyes */}
      <path
        d="M13.2 16.5C11.4 16.5 10 17.84 10 19.5C10 21.16 11.4 22.5 13.2 22.5C15.2 22.5 16.6 20.5 18 19.5C19.4 18.5 20.8 16.5 22.8 16.5C24.6 16.5 26 17.84 26 19.5C26 21.16 24.6 22.5 22.8 22.5C20.8 22.5 19.4 20.5 18 19.5C16.6 18.5 15.2 16.5 13.2 16.5Z"
        stroke="#A3E39F"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Glowing Intelligent Pupil Dots */}
      <circle cx="13.2" cy="19.5" r="1.6" fill="#FFFFFF" />
      <circle cx="22.8" cy="19.5" r="1.6" fill="#FFFFFF" />

      {/* Friendly Smile */}
      <path d="M15.5 25.5C16.3 26.3 19.7 26.3 20.5 25.5" stroke="#A3E39F" strokeWidth="1.2" strokeLinecap="round" />

      <defs>
        <linearGradient id="cloop_chat_bot_bg" x1="4" y1="6.5" x2="32" y2="31.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1C4B35" />
          <stop offset="1" stopColor="#0B2016" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// 🟢 COMPONENT 3 CHẤM CHUYỂN ĐỘNG SỐNG ĐỘNG (LIVING TYPING INDICATOR)
function LivingTypingDots() {
  const [statusIdx, setStatusIdx] = useState(0);
  const statuses = [
    "Đang đọc vị phong cách...",
    "Đang quét kho đồ thật...",
    "Đang chuẩn bị gợi ý..."
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % statuses.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 py-1 px-1">
      <div className="flex items-center gap-1">
        <motion.span 
          animate={{ y: [0, -5, 0], scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0 }}
          className="w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-[0_0_6px_#10B981]"
        />
        <motion.span 
          animate={{ y: [0, -5, 0], scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          className="w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-[0_0_6px_#10B981]"
        />
        <motion.span 
          animate={{ y: [0, -5, 0], scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          className="w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-[0_0_6px_#10B981]"
        />
      </div>

      <span className="text-[9.5px] font-medium text-emerald-800 font-ui tracking-wide">
        {statuses[statusIdx]}
      </span>
    </div>
  );
}

type ProductMini = {
  id: string;
  title: string;
  image: string;
  priceText: string;
  province: string;
  category: string;
  size: string;
  color: string;
  listingType: string;
};

type Message = {
  id: string;
  role: "user" | "ai";
  text: string;
  image?: string;
  subNote?: string;
  isStreaming?: boolean;
  suggestions?: string[];
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: "welcome",
    role: "ai",
    text: "Chào bạn! Mình là AI Stylist của CLOOP. Bạn chuẩn bị đi đâu, hoặc có ảnh set đồ ưng ý muốn tìm không? Nhắn hoặc gửi ảnh cho mình nhé!",
    subNote: "Nếu cần hỗ trợ đơn hàng hoặc đổi size, bạn chọn tab CSKH bên trên nhé.",
    suggestions: [
      "Đi tiệc & Sự kiện", 
      "Du lịch & Đi biển", 
      "Cà phê dạo phố",
      "Gặp nhân viên CSKH"
    ],
  },
];

function decodeCatalogChunk(chunk: string): ProductMini[] {
  try {
    const binaryString = atob(chunk);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const decoded = new TextDecoder("utf-8").decode(bytes);
    return JSON.parse(decoded);
  } catch (error) {
    console.error("Không đọc được catalog AI Stylist:", error);
    return [];
  }
}

function ProductCardMini({ 
  product, 
  onSelect 
}: { 
  product: ProductMini; 
  onSelect?: (productId: string) => void;
}) {
  const listingLabel = product.listingType === "SELL" ? "Mua" : "Thuê";

  const cardContent = (
    <div className="flex gap-2.5 items-center">
      <div className="relative h-13 w-11 shrink-0 overflow-hidden rounded-lg bg-stone-100 border border-stone-200">
        <Image 
          src={product.image} 
          alt={product.title} 
          fill 
          unoptimized 
          className="object-cover object-top transition-transform duration-300 group-hover:scale-105" 
          sizes="45px" 
        />
        <span className="absolute left-0.5 top-0.5 rounded bg-[#183A2D] px-1 py-0.2 text-[6px] font-bold uppercase text-white">
          {listingLabel}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5 space-y-0.5">
        <h4 className="text-[10.5px] font-heading font-bold text-[#142A1E] line-clamp-1 group-hover:text-emerald-800 transition-colors leading-tight">
          {product.title}
        </h4>

        <div className="flex items-center gap-1.5 text-[9.5px]">
          <span className="font-mono font-extrabold text-[#235C3A]">
            {product.priceText}
          </span>
          {product.size && (
            <span className="text-[8px] text-stone-500 font-medium">
              • Size {product.size}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-stone-100">
          <span className="flex min-w-0 items-center gap-0.5 truncate text-[8px] font-medium text-stone-500">
            <MapPin size={8} className="shrink-0 text-emerald-700" /> {product.province || "Toàn quốc"}
          </span>
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-[#183A2D] group-hover:bg-emerald-900 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-white transition-colors">
            Xem <ArrowRight size={6.5} />
          </span>
        </div>
      </div>
    </div>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(product.id)}
        className="my-1.5 block w-full rounded-xl border border-stone-200/90 bg-white p-2 shadow-2xs transition-all hover:border-[#183A2D] hover:shadow-xs group text-left cursor-pointer"
      >
        {cardContent}
      </button>
    );
  }

  return (
    <Link
      href={`/product/${product.id}`}
      className="my-1.5 block w-full rounded-xl border border-stone-200/90 bg-white p-2 shadow-2xs transition-all hover:border-[#183A2D] hover:shadow-xs group text-left"
    >
      {cardContent}
    </Link>
  );
}

function MessageContent({ 
  text, 
  subNote, 
  products, 
  onSelectProduct 
}: { 
  text: string; 
  subNote?: string; 
  products: Record<string, ProductMini>;
  onSelectProduct?: (productId: string) => void;
}) {
  const nodes = useMemo(() => {
    const parts: Array<{ type: "text"; value: string } | { type: "product"; value: string }> = [];
    const regex = /\[PRODUCT:([^\]]+)\]/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
      }
      parts.push({ type: "product", value: match[1] });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({ type: "text", value: text.slice(lastIndex) });
    }

    return parts;
  }, [text]);

  return (
    <div className="space-y-1 text-left leading-relaxed text-[#142A1E]">
      {nodes.map((part, index) => {
        if (part.type === "product") {
          const product = products[part.value];
          return product ? (
            <ProductCardMini 
              key={`${part.value}-${index}`} 
              product={product} 
              onSelect={onSelectProduct}
            />
          ) : null;
        }

        return (
          <span key={index} className="whitespace-pre-wrap">
            {part.value}
          </span>
        );
      })}

      {subNote && (
        <p className="pt-1.5 text-[9px] italic text-stone-500 border-t border-stone-200/60 mt-1">
          {subNote}
        </p>
      )}
    </div>
  );
}

export default function AiStylistChat({ 
  darkMode,
  onSelectProduct,
  isMobileApp = false,
  isOpen,
  onOpenChange
}: { 
  darkMode?: boolean;
  onSelectProduct?: (productId: string) => void;
  isMobileApp?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const [internalShowChat, setInternalShowChat] = useState(false);
  const showChat = isOpen !== undefined ? isOpen : internalShowChat;
  const setShowChat = (val: boolean) => {
    if (onOpenChange) onOpenChange(val);
    setInternalShowChat(val);
  };
  const [activeTab, setActiveTab] = useState<"stylist" | "cskh">("stylist");
  const [chatInput, setChatInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [productsById, setProductsById] = useState<Record<string, ProductMini>>({});
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stylistScrollContainerRef = useRef<HTMLDivElement | null>(null);

  // --- CSKH REALTIME CHAT STATES ---
  const [cskhTicketId, setCskhTicketId] = useState<string | null>(null);
  const [cskhMessages, setCskhMessages] = useState<MessageItem[]>([]);
  const [cskhInput, setCskhInput] = useState("");
  const [isCskhSending, setIsCskhSending] = useState(false);
  const [cskhUnreadCount, setCskhUnreadCount] = useState(0);
  const [cskhAttachment, setCskhAttachment] = useState<{
    file: File;
    previewUrl: string;
    isVideo: boolean;
    name: string;
    sizeStr: string;
  } | null>(null);
  const cskhFileInputRef = useRef<HTMLInputElement | null>(null);
  const prevAdminCountRef = useRef<number>(0);
  const cskhScrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Khôi phục ticket CSKH từ localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTicketId = localStorage.getItem("cloop_customer_ticket_id");
      if (savedTicketId) {
        setCskhTicketId(savedTicketId);
        getTicketMessages(savedTicketId).then((res) => {
          if (res.success && res.messages) {
            setCskhMessages(res.messages as any);
            const adminCount = res.messages.filter((m) => m.senderType === "ADMIN").length;
            prevAdminCountRef.current = adminCount;
            setTimeout(() => {
              if (cskhScrollContainerRef.current) {
                cskhScrollContainerRef.current.scrollTo({
                  top: cskhScrollContainerRef.current.scrollHeight,
                  behavior: "auto",
                });
              }
            }, 50);
          }
        });
      }
    }
  }, []);

  // Polling tin nhắn CSKH từ Admin mỗi 3.5 giây (chỉ cập nhật khi thực sự có tin nhắn mới)
  useEffect(() => {
    if (!cskhTicketId) return;

    const interval = setInterval(async () => {
      const res = await getTicketMessages(cskhTicketId);
      if (res.success && res.messages) {
        const newMsgs = res.messages as any[];
        setCskhMessages((prev) => {
          if (prev.length !== newMsgs.length) {
            setTimeout(() => {
              if (cskhScrollContainerRef.current) {
                cskhScrollContainerRef.current.scrollTo({
                  top: cskhScrollContainerRef.current.scrollHeight,
                  behavior: "smooth",
                });
              }
            }, 50);
            return newMsgs;
          }
          const prevLast = prev[prev.length - 1]?.id;
          const newLast = newMsgs[newMsgs.length - 1]?.id;
          if (prevLast !== newLast) {
            setTimeout(() => {
              if (cskhScrollContainerRef.current) {
                cskhScrollContainerRef.current.scrollTo({
                  top: cskhScrollContainerRef.current.scrollHeight,
                  behavior: "smooth",
                });
              }
            }, 50);
            return newMsgs;
          }
          return prev; // Giữ nguyên, không re-render, không nhảy lướt!
        });

        const currentAdminMsgs = newMsgs.filter((m) => m.senderType === "ADMIN").length;
        if (currentAdminMsgs > prevAdminCountRef.current) {
          soundAlert.playChime();
          if (activeTab !== "cskh") {
            setCskhUnreadCount((prev) => prev + (currentAdminMsgs - prevAdminCountRef.current));
          }
        }
        prevAdminCountRef.current = currentAdminMsgs;
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [cskhTicketId, activeTab]);

  useEffect(() => {
    if (activeTab === "cskh") {
      setCskhUnreadCount(0);
      setTimeout(() => {
        if (cskhScrollContainerRef.current) {
          cskhScrollContainerRef.current.scrollTo({
            top: cskhScrollContainerRef.current.scrollHeight,
            behavior: "auto",
          });
        }
      }, 50);
    }
  }, [activeTab]);

  const handleCskhFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setCskhAttachment({
      file,
      previewUrl,
      isVideo: isVid,
      name: file.name,
      sizeStr,
    });
    if (cskhFileInputRef.current) cskhFileInputRef.current.value = "";
  };

  const handleSendCskhMessage = async (textToSend?: string) => {
    const text = (textToSend || cskhInput).trim();
    if ((!text && !cskhAttachment) || isCskhSending) return;

    setIsCskhSending(true);

    let activeId = cskhTicketId;
    if (!activeId) {
      const initRes = await getOrCreateSupportTicket();
      if (initRes.success && initRes.ticket) {
        activeId = initRes.ticket.id;
        setCskhTicketId(activeId);
        if (typeof window !== "undefined") {
          localStorage.setItem("cloop_customer_ticket_id", activeId);
        }
      }
    }

    if (activeId) {
      let finalContent = text;

      // 🛡️ Tải ảnh / video lên kho Google Drive 10TB trước khi gửi tin nhắn (tiết kiệm tài nguyên Cloudinary)
      if (cskhAttachment) {
        try {
          const formData = new FormData();
          formData.append("file", cskhAttachment.file);
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
          } else {
            console.error("Lỗi upload media lên kho Drive");
          }
        } catch (upErr) {
          console.error("Ngoại lệ kết nối API kho Drive:", upErr);
        }
      }

      if (finalContent.trim()) {
        const sendRes = await sendCustomerMessage({
          ticketId: activeId,
          content: finalContent.trim(),
        });
        if (sendRes.success && sendRes.message) {
          setCskhMessages((prev) => [...prev, sendRes.message as any]);
          setCskhInput("");
          setCskhAttachment(null);
          setTimeout(() => {
            if (cskhScrollContainerRef.current) {
              cskhScrollContainerRef.current.scrollTo({
                top: cskhScrollContainerRef.current.scrollHeight,
                behavior: "smooth",
              });
            }
          }, 50);
        }
      }
    }
    setIsCskhSending(false);
  };

  const scrollToStylistBottom = (smooth = true) => {
    if (stylistScrollContainerRef.current) {
      stylistScrollContainerRef.current.scrollTo({
        top: stylistScrollContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  useEffect(() => {
    if (showChat && activeTab === "stylist") {
      scrollToStylistBottom(true);
    }
  }, [messages, isTyping, showChat, activeTab]);

  // Nén ảnh gọn nhẹ trên Canvas (< 50KB) trước khi gửi
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new (window as any).Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 600;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.8);
        setSelectedImage(compressedBase64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const mergeCatalog = (catalog: ProductMini[]) => {
    setProductsById((prev) => {
      const next = { ...prev };
      catalog.forEach((product) => {
        next[product.id] = product;
      });
      return next;
    });
  };

  const updateStreamingMessage = (id: string, text: string, done = false) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id
          ? {
              ...message,
              text,
              isStreaming: !done,
            }
          : message
      )
    );
  };

  const handleProcessWorkflow = async (rawText?: string, imageToSend?: string | null) => {
    const userText = (rawText ?? chatInput).trim();
    const currentImg = imageToSend !== undefined ? imageToSend : selectedImage;

    if ((!userText && !currentImg) || isTyping) return;

    if (userText.includes("Gặp nhân viên CSKH") || userText.includes("CSKH")) {
      setActiveTab("cskh");
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const userMessage: Message = { 
      id: crypto.randomUUID(), 
      role: "user", 
      text: userText || "Tìm đồ tương tự chiếc ảnh này",
      image: currentImg || undefined
    };
    
    const aiMessageId = crypto.randomUUID();
    const aiMessage: Message = { id: aiMessageId, role: "ai", text: "", isStreaming: true };

    setMessages((prev) => [...prev, userMessage, aiMessage]);
    setChatInput("");
    setSelectedImage(null);
    setIsTyping(true);

    try {
      const response = await fetch("/api/stylist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          image: currentImg || null,
          history: messages
            .filter((message) => message.text)
            .slice(-6)
            .map((message) => ({ role: message.role, text: message.text })),
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(errorText || "Không gọi được AI Stylist.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let visibleText = "";
      let catalogParsed = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        if (!catalogParsed) {
          const match = buffer.match(/^\[\[CATALOG:([A-Za-z0-9+/=]+)\]\]\n?/);
          if (match) {
            mergeCatalog(decodeCatalogChunk(match[1]));
            buffer = buffer.slice(match[0].length);
            catalogParsed = true;
          } else {
            continue;
          }
        }

        visibleText += buffer;
        buffer = "";
        updateStreamingMessage(aiMessageId, visibleText);
      }

      visibleText += decoder.decode();
      updateStreamingMessage(
        aiMessageId,
        visibleText || "Mình chưa tìm được món thật sự khớp. Bạn thử miêu tả thêm màu sắc hoặc size nhé.",
        true
      );
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error(error);
      updateStreamingMessage(
        aiMessageId,
        "Bộ não AI đang xử lý. Nếu cần gấp, bạn chọn tab 'CSKH' ở trên nhé.",
        true
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleInputSendButton = () => {
    handleProcessWorkflow();
  };

  return (
    <div className={
      isMobileApp 
        ? "relative isolate flex flex-col items-end gap-1.5 font-body pointer-events-auto" 
        : "fixed bottom-20 right-3.5 z-40 md:bottom-6 md:right-6 isolate flex flex-col items-end gap-1.5 font-body pointer-events-auto"
    }>
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={
              isMobileApp
                ? "absolute bottom-13 right-0 flex h-[480px] max-h-[72vh] w-[calc(100vw-28px)] max-w-[345px] sm:max-w-[360px] flex-col overflow-hidden rounded-2xl border border-stone-300/90 bg-[#FAF8F3] text-[#142A1E] shadow-[0_16px_48px_rgba(0,0,0,0.35)] z-50 mb-1"
                : "flex h-[460px] max-h-[75vh] w-[320px] sm:w-[350px] flex-col overflow-hidden rounded-2xl border border-stone-300/90 bg-[#FAF8F3] text-[#142A1E] shadow-[0_16px_48px_rgba(0,0,0,0.35)] relative z-[9999]"
            }
          >
            {/* 👑 REFINED CHRISTMAS PINE GREEN HEADER */}
            <div className="bg-[#1E5638] p-2.5 px-3 text-white border-b border-[#2D7A51] shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="relative flex h-6.5 w-6.5 items-center justify-center rounded-md bg-white/10 text-white border border-white/20 p-0.5">
                    <CloopChatBotIcon className="w-5 h-5" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-[#1E5638]" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-[11px] font-heading font-extrabold uppercase tracking-wider text-white leading-tight">
                      TRỢ LÝ CLOOP
                    </h3>
                    <p className="text-[8.5px] text-[#A3E39F] font-ui leading-tight font-medium">
                      {isTyping ? "Đang phản hồi..." : "Hoạt động 24/7 • Tìm đồ chuẩn gu"}
                    </p>
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={() => setShowChat(false)} 
                  className="w-5.5 h-5.5 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
                  title="Đóng"
                >
                  <X size={12} />
                </button>
              </div>

              {/* SLIM 2-TAB SWITCHER */}
              <div className="grid grid-cols-2 gap-1 p-0.5 rounded-md bg-black/25 text-[9.5px] font-ui font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab("stylist")}
                  className={`py-0.5 rounded transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    activeTab === "stylist"
                      ? "bg-white text-[#1E5638] shadow-2xs font-extrabold"
                      : "text-stone-300 hover:text-white"
                  }`}
                >
                  <CloopChatBotIcon className="w-3.5 h-3.5" />
                  AI Stylist
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("cskh")}
                  className={`relative py-0.5 rounded transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    activeTab === "cskh"
                      ? "bg-white text-[#1E5638] shadow-2xs font-extrabold"
                      : "text-stone-300 hover:text-white"
                  }`}
                >
                  <Headphones size={10} />
                  CSKH 24/7
                  {cskhUnreadCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  )}
                </button>
              </div>
            </div>

            {/* TAB 1: AI STYLIST CHAT STREAM */}
            {activeTab === "stylist" ? (
              <>
                <div ref={stylistScrollContainerRef} className="flex-1 space-y-2 overflow-y-auto p-2.5 text-left scrollbar-thin bg-[#FAF8F3]">
                  {messages.map((message) => (
                    <div key={message.id} className="space-y-1">
                      <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                        {message.role === "user" ? (
                          <div className="max-w-[85%] rounded-xl rounded-tr-none bg-[#183A2D] px-2.5 py-1.5 text-[10.5px] font-medium text-white shadow-2xs space-y-1">
                            {message.image && (
                              <div className="relative w-28 h-28 rounded-lg overflow-hidden border border-white/20 mb-1">
                                <img src={message.image} alt="Ảnh người dùng gửi" className="w-full h-full object-cover object-top" />
                              </div>
                            )}
                            {message.text && <div>{message.text}</div>}
                          </div>
                        ) : (
                          <div className="w-full max-w-[98%] rounded-xl rounded-tl-none border border-stone-200/90 bg-white p-2.5 text-[10.5px] font-normal leading-relaxed text-[#142A1E] shadow-2xs">
                            {message.isStreaming && !message.text ? (
                              <LivingTypingDots />
                            ) : (
                              <>
                                {message.text ? (
                                  <MessageContent 
                                    text={message.text} 
                                    subNote={message.subNote} 
                                    products={productsById} 
                                    onSelectProduct={onSelectProduct}
                                  />
                                ) : null}

                                {message.isStreaming && (
                                  <motion.span 
                                    animate={{ opacity: [1, 0, 1] }}
                                    transition={{ duration: 0.6, repeat: Infinity }}
                                    className="inline-block w-1.5 h-3 ml-1 bg-emerald-600 rounded-xs align-middle shadow-[0_0_6px_#059669]"
                                  />
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {message.suggestions && message.role === "ai" && !message.isStreaming && (
                        <div className="flex flex-wrap justify-start gap-1 pl-0.5 pt-0.5">
                          {message.suggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => handleProcessWorkflow(suggestion)}
                              className="cursor-pointer rounded-full border border-[#CDE0CB] bg-[#EBF5EA] px-2 py-0.5 text-[9px] font-semibold text-[#18422A] shadow-2xs transition hover:bg-[#183A2D] hover:text-white"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 📷 IMAGE PREVIEW STRIP (KHI ĐANG CHỌN ẢNH ĐỂ GỬI) */}
                {selectedImage && (
                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-emerald-50 border-t border-emerald-200/60">
                    <div className="flex items-center gap-2">
                      <div className="relative w-8 h-8 rounded-md overflow-hidden border border-emerald-300">
                        <img src={selectedImage} alt="Ảnh chuẩn bị gửi" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[9.5px] font-medium text-emerald-900 font-ui">Đã chọn ảnh lookbook</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedImage(null)}
                      className="w-5 h-5 rounded-full bg-emerald-200 hover:bg-emerald-300 flex items-center justify-center text-emerald-800 transition-colors cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}

                {/* COMPACT INPUT BAR CÓ NÚT GỬI ẢNH */}
                <div className="flex items-center gap-1.5 border-t border-stone-200/80 p-2 bg-white">
                  {/* Hidden File Input */}
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {/* Nút Upload Ảnh */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full text-stone-500 hover:text-[#183A2D] hover:bg-[#EBF5EA] transition-colors cursor-pointer border border-stone-200"
                    title="Gửi ảnh outfit / lookbook để AI tìm đồ tương tự"
                  >
                    <Camera size={12} />
                  </button>

                  <input
                    type="text"
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && handleInputSendButton()}
                    placeholder={selectedImage ? "Nhập yêu cầu (hoặc gửi ảnh ngay)..." : "Ví dụ: Đầm dạ hội đen size M..."}
                    className="min-w-0 flex-1 rounded-full border border-stone-300 bg-[#FAF8F3] px-3 py-1 text-[10.5px] font-medium text-[#142A1E] outline-none transition-all focus:border-[#183A2D]"
                  />

                  <button
                    type="button"
                    onClick={handleInputSendButton}
                    disabled={isTyping || (!chatInput.trim() && !selectedImage)}
                    className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-[#183A2D] text-white shadow-2xs transition hover:bg-[#2A6E46] disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                  >
                    <Send size={10} />
                  </button>
                </div>
              </>
            ) : (
              /* TAB 2: CSKH TRỰC TUYẾN CHÍNH CHỦ & MINH BẠCH */
              <div className="flex-1 flex flex-col overflow-hidden bg-[#FAF8F3] text-left">
                {/* Banner Trực Tuyến & Minh Bạch */}
                <div className="p-2.5 bg-[#EBF5EA] border-b border-[#CDE0CB] space-y-0.5 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#18422A] uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <ShieldCheck size={12} className="text-emerald-700" />
                      CSKH CLOOP Sẵn Sàng
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/90 border border-emerald-300 text-emerald-900 font-semibold font-ui">
                      Minh Bạch & Chính Chủ
                    </span>
                  </div>
                  <p className="text-[9px] text-stone-600 font-light leading-tight">
                    Kết nối trực tiếp chuyên viên CSKH trực ban. Phản hồi trong 2 phút!
                  </p>
                </div>

                {/* Danh sách tin nhắn CSKH */}
                <div ref={cskhScrollContainerRef} className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin text-xs">
                  {/* Tin nhắn chào mừng mặc định */}
                  <div className="flex items-start gap-1.5">
                    <div className="w-5.5 h-5.5 rounded-full bg-[#183A2D] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                      C
                    </div>
                    <div className="max-w-[85%] p-2.5 rounded-2xl rounded-tl-xs bg-white border border-stone-200 text-stone-700 text-[10.5px] leading-relaxed shadow-2xs">
                      <p className="font-bold text-[#183A2D] text-[10.5px] mb-0.5">CLOOP Chăm Sóc Khách Hàng</p>
                      Dạ CLOOP xin chào bạn! Đội ngũ CSKH sẵn sàng hỗ trợ bạn về chọn size, giao nhận hỏa tốc và hoàn tiền cọc Escrow 100%. Bạn cần hỗ trợ gì cứ nhắn shop nhé!
                    </div>
                  </div>

                  {/* Lịch sử tin nhắn thực giữa Khách và Admin */}
                  {cskhMessages.map((m) => {
                    const isMe = m.senderType === "USER";
                    const parsed = parseMediaContent(m.content);

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        <span className="text-[8.5px] text-stone-400 mb-0.5 px-1 font-mono">
                          {isMe ? "Bạn" : "Chuyên viên CSKH CLOOP"} ·{" "}
                          {new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <div
                          className={`max-w-[85%] p-2.5 rounded-2xl text-[10.5px] leading-relaxed shadow-2xs space-y-1.5 ${
                            isMe
                              ? "bg-[#183A2D] text-white rounded-tr-xs"
                              : "bg-white text-stone-800 border border-stone-200 rounded-tl-xs"
                          }`}
                        >
                          {/* Hiển thị hình ảnh nếu có */}
                          {parsed.images.map((imgUrl, idx) => (
                            <a
                              key={idx}
                              href={imgUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block overflow-hidden rounded-xl group/img relative border border-black/10 cursor-pointer"
                            >
                              <img
                                src={imgUrl}
                                alt="Ảnh đính kèm"
                                className="max-h-52 max-w-full rounded-xl object-cover hover:scale-102 transition-transform duration-200"
                                loading="lazy"
                              />
                              <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] px-1.5 py-0.5 rounded backdrop-blur-xs flex items-center gap-0.5 opacity-80 group-hover/img:opacity-100 transition-opacity">
                                <ExternalLink size={9} />
                                <span>Xem ảnh gốc</span>
                              </div>
                            </a>
                          ))}

                          {/* Hiển thị video nếu có */}
                          {parsed.videos.map((vidUrl, idx) => (
                            <div key={idx} className="rounded-xl overflow-hidden border border-black/10 bg-black/10">
                              <video
                                src={vidUrl}
                                controls
                                preload="metadata"
                                className="max-h-56 max-w-full rounded-xl w-full"
                              />
                            </div>
                          ))}

                          {/* Hiển thị văn bản tin nhắn nếu có */}
                          {parsed.text && (
                            <p className="whitespace-pre-wrap">{parsed.text}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Gợi ý câu hỏi nhanh (Chips) */}
                <div className="px-2 py-1 bg-white border-t border-stone-200/80 flex items-center gap-1 overflow-x-auto text-[9.5px] shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSendCskhMessage("Shop cho mình hỏi về chính sách đổi size 24h?")}
                    className="px-2 py-0.5 rounded-full bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 text-stone-600 whitespace-nowrap transition-colors cursor-pointer"
                  >
                    Đổi size 24h
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendCskhMessage("Tiền cọc Escrow khi nào được hoàn về ví của mình ạ?")}
                    className="px-2 py-0.5 rounded-full bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 text-stone-600 whitespace-nowrap transition-colors cursor-pointer"
                  >
                    Hoàn tiền cọc
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendCskhMessage("Thời gian giao hàng hỏa tốc GHN là bao lâu ạ?")}
                    className="px-2 py-0.5 rounded-full bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 text-stone-600 whitespace-nowrap transition-colors cursor-pointer"
                  >
                    Giao nhận GHN
                  </button>
                </div>

                {/* Preview tệp ảnh/video đính kèm */}
                {cskhAttachment && (
                  <div className="px-2.5 py-1.5 bg-stone-100/90 border-t border-stone-200 flex items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {cskhAttachment.isVideo ? (
                        <div className="w-6 h-6 rounded-md bg-emerald-900/10 text-[#183A2D] flex items-center justify-center shrink-0">
                          <Film size={12} />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-md overflow-hidden border border-stone-300 shrink-0">
                          <img
                            src={cskhAttachment.previewUrl}
                            alt="preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="truncate min-w-0">
                        <p className="text-[10px] font-semibold text-stone-800 truncate">
                          {cskhAttachment.name}
                        </p>
                        <p className="text-[8.5px] text-stone-500 font-mono">
                          {cskhAttachment.sizeStr} · Kho Google Drive (10TB)
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCskhAttachment(null)}
                      disabled={isCskhSending}
                      className="p-1 hover:bg-stone-200 rounded-full text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                      title="Hủy đính kèm"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )}

                {/* Khung soạn thảo & gửi tin cho CSKH */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendCskhMessage();
                  }}
                  className="p-2 bg-white border-t border-stone-200 flex items-center gap-1.5 shrink-0"
                >
                  <input
                    ref={cskhFileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleCskhFileSelect}
                  />
                  <button
                    type="button"
                    onClick={() => cskhFileInputRef.current?.click()}
                    disabled={isCskhSending}
                    title="Đính kèm ảnh hoặc video (Lưu trữ Google 10TB)"
                    className="p-1.5 text-stone-500 hover:text-[#183A2D] hover:bg-emerald-50 rounded-full transition-colors cursor-pointer shrink-0"
                  >
                    <Paperclip size={13} />
                  </button>

                  <input
                    type="text"
                    placeholder="Nhắn tin cho chuyên viên CSKH..."
                    value={cskhInput}
                    onChange={(e) => setCskhInput(e.target.value)}
                    disabled={isCskhSending}
                    className="flex-1 px-3 py-1.5 text-xs bg-stone-100 rounded-full border border-transparent focus:border-emerald-700 focus:bg-white focus:outline-hidden transition-all"
                  />
                  <button
                    type="submit"
                    disabled={(!cskhInput.trim() && !cskhAttachment) || isCskhSending}
                    className="w-7 h-7 rounded-full bg-[#183A2D] text-white flex items-center justify-center hover:bg-emerald-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
                  >
                    {isCskhSending ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Send size={11} />
                    )}
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 NÚT CHATBOT CLOOP GỌN NHỎ CHUẨN TIKTOK ASSISTANT */}
      <motion.button
        type="button"
        onClick={() => setShowChat(!showChat)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        animate={{
          scale: [1, 1.04, 1],
          boxShadow: [
            "0 4px 16px rgba(30,86,56,0.35)",
            "0 0 18px rgba(46,182,125,0.65), 0 0 6px rgba(255,255,255,0.35)",
            "0 4px 16px rgba(30,86,56,0.35)",
          ],
        }}
        transition={{
          duration: 2.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-[#1E5638] to-[#2D7A51] ring-2 ring-emerald-200/60 text-white border border-white/20 transition-all duration-200 cursor-pointer group"
        title="Trợ lý CLOOP"
      >
        <CloopChatBotIcon className="w-5.5 h-5.5 transition-transform duration-200 group-hover:scale-105" />
      </motion.button>
    </div>
  );
}
