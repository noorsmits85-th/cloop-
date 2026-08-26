"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  MapPin, Send, X, PhoneCall, MessageCircle, 
  ArrowRight, ShieldCheck, Headphones, Camera, Image as ImageIcon
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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

function ProductCardMini({ product }: { product: ProductMini }) {
  const listingLabel = product.listingType === "SELL" ? "Mua" : "Thuê";

  return (
    <Link
      href={`/product/${product.id}`}
      className="my-1.5 block w-full rounded-xl border border-stone-200/90 bg-white p-2 shadow-2xs transition-all hover:border-[#183A2D] hover:shadow-xs group text-left"
    >
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
    </Link>
  );
}

function MessageContent({ text, subNote, products }: { text: string; subNote?: string; products: Record<string, ProductMini> }) {
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
          return product ? <ProductCardMini key={`${part.value}-${index}`} product={product} /> : null;
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

export default function AiStylistChat({ darkMode }: { darkMode?: boolean } = {}) {
  const [showChat, setShowChat] = useState(false);
  const [activeTab, setActiveTab] = useState<"stylist" | "cskh">("stylist");
  const [chatInput, setChatInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [productsById, setProductsById] = useState<Record<string, ProductMini>>({});
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (showChat) {
      scrollToBottom();
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
    <div className="fixed bottom-14 right-3 z-50 flex flex-col items-end gap-1.5 font-body md:bottom-6 md:right-6">
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex h-[445px] max-h-[72vh] w-[315px] sm:w-[335px] flex-col overflow-hidden rounded-2xl border border-stone-300 bg-[#FAF8F3] text-[#142A1E] shadow-[0_12px_36px_rgba(0,0,0,0.18)]"
          >
            {/* 👑 REFINED FOREST GREEN HEADER */}
            <div className="bg-[#122D20] p-2.5 px-3 text-white border-b border-[#1C4431] shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="relative flex h-6.5 w-6.5 items-center justify-center rounded-md bg-white/10 text-white border border-white/20 p-0.5">
                    <CloopChatBotIcon className="w-5 h-5" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-[#122D20]" />
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
                      ? "bg-white text-[#122D20] shadow-2xs font-extrabold"
                      : "text-stone-300 hover:text-white"
                  }`}
                >
                  <CloopChatBotIcon className="w-3.5 h-3.5" />
                  AI Stylist
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("cskh")}
                  className={`py-0.5 rounded transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    activeTab === "cskh"
                      ? "bg-white text-[#122D20] shadow-2xs font-extrabold"
                      : "text-stone-300 hover:text-white"
                  }`}
                >
                  <Headphones size={10} />
                  CSKH 24/7
                </button>
              </div>
            </div>

            {/* TAB 1: AI STYLIST CHAT STREAM */}
            {activeTab === "stylist" ? (
              <>
                <div className="flex-1 space-y-2 overflow-y-auto p-2.5 text-left scrollbar-thin bg-[#FAF8F3]">
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

                  <div ref={messagesEndRef} />
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
              /* TAB 2: CSKH 24/7 */
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-left bg-[#FAF8F3]">
                <div className="p-2.5 rounded-xl bg-[#EBF5EA] border border-[#CDE0CB] space-y-0.5">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-[#18422A] uppercase tracking-wider">
                    <ShieldCheck size={13} /> CSKH CLOOP Sẵn Sàng
                  </div>
                  <p className="text-[9.5px] text-stone-600 font-light leading-relaxed">
                    Hỗ trợ nhanh về đổi size, giao gấp 2H hoặc xử lý cọc. Phản hồi trong 3 phút!
                  </p>
                </div>

                <div className="space-y-1.5">
                  <a
                    href="tel:0987654321"
                    className="flex items-center justify-between p-2 rounded-xl border border-stone-200 hover:border-[#183A2D] bg-white shadow-2xs transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <PhoneCall size={12} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-stone-800 leading-tight">Hotline Khẩn Cấp</p>
                        <p className="text-[9.5px] font-mono font-bold text-emerald-700">098.765.4321</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-semibold text-stone-400 group-hover:text-[#183A2D] font-ui flex items-center gap-0.5">
                      Gọi <ArrowRight size={9} />
                    </span>
                  </a>

                  <a
                    href="https://zalo.me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded-xl border border-stone-200 hover:border-blue-600 bg-white shadow-2xs transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                        <MessageCircle size={12} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-stone-800 leading-tight">Zalo Hỗ Trợ</p>
                        <p className="text-[9px] text-stone-500">Phản hồi &lt; 3 phút</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-semibold text-blue-600 font-ui flex items-center gap-0.5">
                      Chat <ArrowRight size={9} />
                    </span>
                  </a>
                </div>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab("stylist")}
                    className="text-[10px] font-semibold text-[#183A2D] hover:underline font-ui inline-flex items-center gap-1 cursor-pointer"
                  >
                    ← Quay lại tìm đồ cùng AI
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 CHỈ ICON THỜI TRANG ĐỘC BẢN CLOOP CHATBOT */}
      <motion.button
        type="button"
        onClick={() => setShowChat(!showChat)}
        whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
        whileTap={{ scale: 0.92 }}
        className="relative flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-br from-[#1B4733] to-[#0A1F15] text-white shadow-[0_8px_25px_rgba(10,31,22,0.45)] hover:shadow-[0_12px_32px_rgba(34,197,94,0.35)] border border-[#A3E39F]/40 transition-all duration-300 cursor-pointer group"
        title="Trợ lý Chat CLOOP"
      >
        <span className="absolute -inset-0.5 rounded-full bg-emerald-400/20 animate-ping pointer-events-none" />
        <CloopChatBotIcon className="w-7 h-7 sm:w-8 sm:h-8 transition-transform duration-300 group-hover:scale-105" />
        <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#122D20] shadow-xs" />
      </motion.button>
    </div>
  );
}
