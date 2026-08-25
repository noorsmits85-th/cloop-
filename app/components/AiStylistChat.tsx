"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  Bot, CheckCircle2, CloudSun, MapPin, Send, 
  ShoppingBag, X, PhoneCall, MessageCircle, 
  Sparkles, HelpCircle, ArrowRight, Clock, ShieldCheck, Headphones
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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
  subNote?: string;
  isStreaming?: boolean;
  suggestions?: string[];
  isWeatherButton?: boolean;
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: "welcome",
    role: "ai",
    text: "Chào bạn! Mình là AI Stylist của CLOOP. Bạn chuẩn bị đi đâu, phong cách thế nào? Nhắn cho mình để tìm ngay set đồ phù hợp nhé!",
    subNote: "Nếu cần hỗ trợ đơn hàng hoặc đổi size, bạn chọn tab Chat với CSKH bên trên nhé.",
    suggestions: [
      "✨ Đi tiệc & Sự kiện", 
      "🌊 Du lịch & Đi biển", 
      "☕ Cà phê dạo phố",
      "🎧 Gặp nhân viên CSKH"
    ],
  },
  {
    id: "weather",
    role: "ai",
    text: "",
    isWeatherButton: true,
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
      className="my-2.5 block w-full rounded-2xl border border-stone-200 bg-white p-3 shadow-md transition-all hover:border-[#2A6E46] hover:shadow-lg dark:border-[#2B3946] dark:bg-[#14202A] group text-left"
    >
      <div className="flex gap-3 items-center">
        {/* Product Image */}
        <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-100 border border-stone-100 dark:border-stone-800">
          <Image 
            src={product.image} 
            alt={product.title} 
            fill 
            unoptimized 
            className="object-cover object-top transition-transform duration-500 group-hover:scale-108" 
            sizes="80px" 
          />
          <span className="absolute left-1 top-1 rounded-md bg-[#183A2D] px-1.5 py-0.5 text-[7.5px] font-bold uppercase text-white shadow-xs">
            {listingLabel}
          </span>
        </div>

        {/* Product Details */}
        <div className="flex min-w-0 flex-1 flex-col justify-between space-y-1">
          <div>
            <h4 className="text-xs font-heading font-extrabold text-[#183A2D] dark:text-white line-clamp-2 group-hover:text-emerald-700 transition-colors leading-tight">
              {product.title}
            </h4>
            <p className="text-xs font-mono font-extrabold text-[#2A6E46] dark:text-[#A3E39F] mt-0.5">
              {product.priceText}
            </p>
          </div>

          <div className="flex flex-wrap gap-1 items-center text-[9px] text-stone-500 dark:text-stone-400">
            <span className="bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded font-medium">
              {product.category}
            </span>
            {product.size && (
              <span className="bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded font-medium">
                Size {product.size}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100 dark:border-stone-800">
            <span className="flex min-w-0 items-center gap-1 truncate text-[9px] font-semibold text-emerald-800 dark:text-emerald-400">
              <MapPin size={10} className="shrink-0" /> {product.province || "Toàn quốc"}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#183A2D] group-hover:bg-[#2A6E46] px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-white transition-colors">
              <ShoppingBag size={9} /> Thuê Ngay
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
    <div className="space-y-1.5 text-left leading-relaxed">
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
        <p className="pt-2 text-[10.5px] italic text-stone-400 dark:text-stone-500 border-t border-stone-100 dark:border-stone-800/60 mt-2">
          {subNote}
        </p>
      )}
    </div>
  );
}

export default function AiStylistChat({ darkMode }: { darkMode: boolean }) {
  const [showChat, setShowChat] = useState(false);
  const [activeTab, setActiveTab] = useState<"stylist" | "cskh">("stylist");
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [weatherContext, setWeatherContext] = useState("");
  const [productsById, setProductsById] = useState<Record<string, ProductMini>>({});
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Tự động cuộn xuống cuối khi có tin nhắn mới hoặc streaming
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (showChat) {
      scrollToBottom();
    }
  }, [messages, isTyping, showChat, activeTab]);

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

  const handleFetchGpsAndWeather = () => {
    if (!navigator.geolocation) {
      setMessages((prev) => [
        ...prev.filter((message) => !message.isWeatherButton),
        {
          id: crypto.randomUUID(),
          role: "ai",
          text: "Trình duyệt chưa hỗ trợ định vị. Bạn cứ nói rõ khu vực hoặc thời tiết trong tin nhắn, mình vẫn tư vấn được chuẩn xác.",
        },
      ]);
      return;
    }

    setIsTyping(true);
    setMessages((prev) => prev.filter((message) => !message.isWeatherButton));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
          );
          const data = await response.json();
          const temp = Math.round(data.current.temperature_2m);
          const code = data.current.weather_code;
          let weatherText = "trời nắng dịu";

          if (code >= 1 && code <= 3) weatherText = "trời nhiều mây mát mẻ";
          else if (code >= 51 && code <= 67) weatherText = "trời đang có mưa";
          else if (code >= 71) weatherText = "trời se lạnh";

          const context = `${weatherText}, khoảng ${temp}°C`;
          setWeatherContext(context);
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "ai",
              text: `Mình đã nhận diện thời tiết tại khu vực của bạn: ${context}. Bạn định đi dịp gì để mình phối đồ sát nhất nhé?`,
              suggestions: ["✨ Đi tiệc & Sự kiện", "🌊 Du lịch & Đi biển", "☕ Cà phê dạo phố"],
            },
          ]);
        } catch (error) {
          console.error(error);
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "ai",
              text: "Đã kết nối vị trí! Bạn nhắn trực tiếp dịp, tỉnh thành và gu mặc của bạn nhé.",
            },
          ]);
        } finally {
          setIsTyping(false);
        }
      },
      () => {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "ai",
            text: "Bạn chưa bật quyền định vị. Không sao cả, bạn chỉ cần nhắn dịp và sở thích là mình tìm đồ được ngay!",
            suggestions: ["✨ Đi tiệc & Sự kiện", "🌊 Du lịch & Đi biển", "☕ Cà phê dạo phố", "🎧 Gặp nhân viên CSKH"],
          },
        ]);
        setIsTyping(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const handleProcessWorkflow = async (rawText: string) => {
    const userText = rawText.trim();
    if (!userText || isTyping) return;

    // Nếu bấm nút CSKH từ suggestion chip -> chuyển thẳng qua tab CSKH
    if (userText.includes("Gặp nhân viên CSKH") || userText.includes("CSKH")) {
      setActiveTab("cskh");
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", text: userText };
    const aiMessageId = crypto.randomUUID();
    const aiMessage: Message = { id: aiMessageId, role: "ai", text: "", isStreaming: true };

    setMessages((prev) => [...prev, userMessage, aiMessage]);
    setChatInput("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/stylist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: weatherContext ? `${userText}\nNgữ cảnh thời tiết: ${weatherContext}` : userText,
          history: messages
            .filter((message) => !message.isWeatherButton && message.text)
            .slice(-8)
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
        visibleText || "Mình chưa tìm được món thật sự khớp. Bạn thử nói rõ hơn về dịp, màu sắc hoặc size nhé.",
        true
      );
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error(error);
      updateStreamingMessage(
        aiMessageId,
        "Bộ não AI đang xử lý. Nếu bạn cần hỗ trợ đơn hàng gấp, hãy chọn tab 'Chat với CSKH' ở trên nhé.",
        true
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleInputSendButton = () => {
    handleProcessWorkflow(chatInput);
  };

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3 font-body md:bottom-6 md:right-6">
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className={`flex h-[600px] max-h-[85vh] w-[92vw] sm:w-[410px] md:w-[430px] flex-col overflow-hidden rounded-[2rem] border shadow-2xl backdrop-blur-xl transition-all duration-300 ${
              darkMode 
                ? "border-[#2B3946] bg-[#0F1720]/98 text-white shadow-[0_20px_60px_rgba(0,0,0,0.8)]" 
                : "border-[#D5E5D2] bg-white/98 text-[#183A2D] shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
            }`}
          >
            {/* 👑 HEADER: REBRANDED TO 'CLOOP AI Stylist' WITH CLEAN SUBTITLE */}
            <div className={`border-b p-4 sm:p-4.5 ${darkMode ? "border-[#2B3946] bg-[#14202A]" : "border-stone-200/80 bg-[#F4F8F3]"}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-[#183A2D] text-white shadow-md">
                    <Bot size={20} className="text-[#A3E39F]" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-black animate-pulse" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xs sm:text-sm font-heading font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                      CLOOP AI Stylist
                      <span className="text-[9px] uppercase font-mono font-bold px-2 py-0.2 rounded-full bg-[#A3E39F]/20 text-[#2A6E46] dark:text-[#A3E39F] border border-[#A3E39F]/30">
                        24/7
                      </span>
                    </h3>
                    <p className="flex items-center gap-1 text-[10.5px] text-stone-500 dark:text-stone-400 font-ui">
                      <CheckCircle2 size={11} className="text-emerald-600" />
                      Hoạt động 24/7 • Sẵn sàng tìm đồ chuẩn gu cho bạn
                    </p>
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={() => setShowChat(false)} 
                  className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center text-stone-500 hover:text-stone-800 dark:text-stone-300 dark:hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* TAB SELECTOR: [ 👗 AI Stylist ] | [ 🎧 Chat với CSKH ] */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-black/30 border border-black/5 dark:border-white/5 text-[11px] font-ui font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab("stylist")}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "stylist"
                      ? "bg-white dark:bg-[#183A2D] text-[#183A2D] dark:text-white shadow-xs"
                      : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
                  }`}
                >
                  <Sparkles size={12} className="text-[#2A6E46] dark:text-[#A3E39F]" />
                  AI Stylist
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("cskh")}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "cskh"
                      ? "bg-[#183A2D] text-white shadow-xs"
                      : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
                  }`}
                >
                  <Headphones size={12} className="text-amber-300" />
                  Chat với CSKH
                </button>
              </div>
            </div>

            {/* TAB 1: AI STYLIST CHAT STREAM */}
            {activeTab === "stylist" ? (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto p-4 text-left scrollbar-thin">
                  {messages.map((message) => (
                    <div key={message.id} className="space-y-2">
                      <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                        {message.isWeatherButton ? (
                          <button
                            type="button"
                            onClick={handleFetchGpsAndWeather}
                            className="mx-auto inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#183A2D] hover:bg-[#2A6E46] px-5 py-2 text-[10.5px] font-bold uppercase tracking-widest text-white shadow-sm transition-all hover:scale-102"
                          >
                            <CloudSun size={14} className="text-[#A3E39F] animate-pulse" /> Nhận diện thời tiết khu vực bạn
                          </button>
                        ) : message.role === "user" ? (
                          <div className="max-w-[82%] rounded-2xl rounded-tr-none bg-[#183A2D] px-4 py-2.5 text-xs font-medium text-white shadow-sm">
                            {message.text}
                          </div>
                        ) : (
                          <div className={`w-full max-w-[95%] rounded-2xl rounded-tl-none border p-3.5 text-xs font-normal leading-relaxed shadow-xs ${
                            darkMode ? "border-[#2B3946] bg-[#14202A]" : "border-stone-200/90 bg-[#FAF9F6]"
                          }`}>
                            {message.text ? (
                              <MessageContent 
                                text={message.text} 
                                subNote={message.subNote} 
                                products={productsById} 
                              />
                            ) : null}
                            {message.isStreaming && (
                              <span className="ml-1 inline-block h-3.5 w-1.5 animate-pulse rounded bg-emerald-500 align-middle" />
                            )}
                          </div>
                        )}
                      </div>

                      {message.suggestions && message.role === "ai" && (
                        <div className="flex flex-wrap justify-start gap-1.5 pl-1 pt-1">
                          {message.suggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => handleProcessWorkflow(suggestion)}
                              className="cursor-pointer rounded-full border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 text-[10.5px] font-bold text-[#183A2D] dark:text-[#A3E39F] shadow-2xs transition hover:bg-[#183A2D] hover:text-white"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {isTyping && !messages.some((message) => message.isStreaming) && (
                    <div className="flex justify-start">
                      <div className={`flex items-center gap-1.5 rounded-2xl rounded-tl-none px-4 py-3 border ${
                        darkMode ? "bg-[#14202A] border-[#2B3946]" : "border-stone-200 bg-[#FAF9F6]"
                      }`}>
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#183A2D] dark:bg-emerald-400" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#183A2D] dark:bg-emerald-400" style={{ animationDelay: "150ms" }} />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#183A2D] dark:bg-emerald-400" style={{ animationDelay: "300ms" }} />
                        <span className="text-[10px] text-stone-400 ml-1">Đang tìm set đồ chuẩn gu cho bạn...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* INPUT BAR */}
                <div className={`flex items-center gap-2 border-t p-3.5 transition-colors ${
                  darkMode ? "border-[#2B3946] bg-[#14202A]" : "border-stone-200 bg-white"
                }`}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && handleInputSendButton()}
                    placeholder="Ví dụ: Mình tìm đầm dạ hội màu đen size M..."
                    className={`min-w-0 flex-1 rounded-full border px-4 py-2.5 text-xs font-semibold outline-none transition-all ${
                      darkMode 
                        ? "border-[#2B3946] bg-[#0F1720] text-white focus:border-emerald-500" 
                        : "border-stone-300 bg-[#FAF8F3] text-[#183A2D] focus:border-[#183A2D]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleInputSendButton}
                    disabled={isTyping || !chatInput.trim()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#183A2D] text-white shadow-md transition hover:bg-[#2A6E46] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </>
            ) : (
              /* TAB 2: CSKH & HOTLINE HỖ TRỢ TRỰC TIẾP */
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-left">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#183A2D] dark:text-[#A3E39F] uppercase tracking-wider">
                    <ShieldCheck size={16} /> Đội Ngũ CSKH CLOOP Sẵn Sàng
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-300 font-light leading-relaxed">
                    Bạn gặp sự cố về kích cỡ trang phục, cần giao gấp trong 2H tại 34 tỉnh thành hoặc khiếu nại cọc? Đội ngũ chúng tôi hỗ trợ ngay trong 5 phút!
                  </p>
                </div>

                {/* Contact Action Cards */}
                <div className="space-y-2.5">
                  <a
                    href="tel:0987654321"
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-stone-200 hover:border-[#183A2D] bg-white dark:bg-[#14202A] dark:border-stone-700 shadow-xs hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
                        <PhoneCall size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-stone-800 dark:text-white">Hotline Khẩn Cấp</p>
                        <p className="text-xs font-mono font-extrabold text-emerald-700 dark:text-emerald-400">098.765.4321 (24/7)</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-stone-400 group-hover:text-[#183A2D] font-ui flex items-center gap-1">
                      Gọi ngay <ArrowRight size={12} />
                    </span>
                  </a>

                  <a
                    href="https://zalo.me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-stone-200 hover:border-blue-600 bg-white dark:bg-[#14202A] dark:border-stone-700 shadow-xs hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                        <MessageCircle size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-stone-800 dark:text-white">Zalo Hỗ Trợ Đơn Hàng</p>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400">Nhắn tin nhận phản hồi &lt; 3 phút</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-blue-600 font-ui flex items-center gap-1">
                      Mở Zalo <ArrowRight size={12} />
                    </span>
                  </a>
                </div>

                {/* FAQ Quick Links */}
                <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-2">
                  <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Hỗ Trợ Thường Gặp:</p>
                  <div className="grid grid-cols-1 gap-1.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 flex items-center justify-between text-stone-700 dark:text-stone-300">
                      <span>🔄 Chính sách đổi trả size trong 24H</span>
                      <span className="text-[10px] font-bold text-emerald-700">Miễn phí</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 flex items-center justify-between text-stone-700 dark:text-stone-300">
                      <span>🧼 Tiệt trùng Ozone chuẩn Spa</span>
                      <span className="text-[10px] font-bold text-emerald-700">Cam kết 100%</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab("stylist")}
                    className="text-xs font-bold text-[#183A2D] dark:text-[#A3E39F] hover:underline font-ui inline-flex items-center gap-1"
                  >
                    ← Quay lại chat cùng AI Stylist
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 FLOATING LAUNCHER BUTTON: GỌI TÊN 'TRỢ LÝ CLOOP' DUY NHẤT */}
      <motion.button
        type="button"
        onClick={() => setShowChat(!showChat)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#183A2D] hover:bg-[#2A6E46] text-white shadow-[0_10px_30px_rgba(24,58,45,0.4)] border border-emerald-500/30 transition-all duration-300 cursor-pointer"
      >
        <div className="relative flex items-center justify-center">
          <Bot className="w-5 h-5 text-[#A3E39F]" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black animate-pulse" />
        </div>
        <div className="text-left font-ui">
          <p className="text-[11px] font-extrabold uppercase tracking-wider leading-none text-white">
            TRỢ LÝ CLOOP
          </p>
          <p className="text-[8.5px] text-[#A3E39F] font-semibold leading-none mt-0.5">
            Online 24/7 • Stylist & CSKH
          </p>
        </div>
      </motion.button>
    </div>
  );
}
