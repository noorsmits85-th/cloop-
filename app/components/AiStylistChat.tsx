"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  Bot, CheckCircle2, CloudSun, MapPin, Send, 
  ShoppingBag, X, PhoneCall, MessageCircle, 
  ArrowRight, ShieldCheck, Headphones
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
    subNote: "Nếu cần hỗ trợ đơn hàng hoặc đổi size, bạn chọn tab CSKH bên trên nhé.",
    suggestions: [
      "Đi tiệc & Sự kiện", 
      "Du lịch & Đi biển", 
      "Cà phê dạo phố",
      "🌤️ Thêm thời tiết",
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
      className="my-1.5 block w-full rounded-xl border border-stone-200 bg-white p-2 shadow-xs transition-all hover:border-[#183A2D] hover:shadow-sm dark:border-stone-700 dark:bg-[#14202A] group text-left"
    >
      <div className="flex gap-2.5 items-center">
        {/* Product Image - Compact */}
        <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-stone-100 border border-stone-200 dark:border-stone-800">
          <Image 
            src={product.image} 
            alt={product.title} 
            fill 
            unoptimized 
            className="object-cover object-top transition-transform duration-300 group-hover:scale-105" 
            sizes="50px" 
          />
          <span className="absolute left-0.5 top-0.5 rounded bg-[#183A2D] px-1 py-0.2 text-[6.5px] font-bold uppercase text-white">
            {listingLabel}
          </span>
        </div>

        {/* Product Details - Compact */}
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5 space-y-0.5">
          <h4 className="text-[11px] font-heading font-bold text-[#183A2D] dark:text-white line-clamp-1 group-hover:text-emerald-700 transition-colors leading-tight">
            {product.title}
          </h4>

          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="font-mono font-extrabold text-[#2A6E46] dark:text-[#A3E39F]">
              {product.priceText}
            </span>
            {product.size && (
              <span className="text-[8.5px] text-stone-400 font-medium">
                • Size {product.size}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-stone-100 dark:border-stone-800/80">
            <span className="flex min-w-0 items-center gap-0.5 truncate text-[8.5px] font-medium text-stone-500 dark:text-stone-400">
              <MapPin size={8.5} className="shrink-0 text-emerald-700" /> {product.province || "Toàn quốc"}
            </span>
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-[#183A2D] group-hover:bg-emerald-800 px-1.5 py-0.5 text-[7.5px] font-bold uppercase tracking-wider text-white transition-colors">
              Xem <ArrowRight size={7} />
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
    <div className="space-y-1 text-left leading-relaxed text-[#183A2D] dark:text-stone-100">
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
        <p className="pt-1.5 text-[9.5px] italic text-stone-500 dark:text-stone-400 border-t border-stone-100 dark:border-stone-800/80 mt-1">
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
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "ai",
          text: "Trình duyệt chưa hỗ trợ định vị. Bạn cứ nhắn khu vực hoặc thời tiết trong tin nhắn nhé.",
        },
      ]);
      return;
    }

    setIsTyping(true);

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
          else if (code >= 51 && code <= 67) weatherText = "trời có mưa";
          else if (code >= 71) weatherText = "trời se lạnh";

          const context = `${weatherText}, khoảng ${temp}°C`;
          setWeatherContext(context);
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "ai",
              text: `Mình đã nhận diện thời tiết nơi bạn: ${context}. Bạn định đi dịp gì để mình phối đồ nhé?`,
              suggestions: ["Đi tiệc & Sự kiện", "Du lịch & Đi biển", "Cà phê dạo phố"],
            },
          ]);
        } catch (error) {
          console.error(error);
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "ai",
              text: "Đã kết nối vị trí! Bạn nhắn trực tiếp dịp, tỉnh thành và gu mặc nhé.",
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
            text: "Bạn chưa bật quyền định vị. Không sao cả, bạn nhắn dịp và sở thích là mình tìm đồ được ngay!",
            suggestions: ["Đi tiệc & Sự kiện", "Du lịch & Đi biển", "Cà phê dạo phố"],
          },
        ]);
        setIsTyping(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleProcessWorkflow = async (rawText: string) => {
    const userText = rawText.trim();
    if (!userText || isTyping) return;

    if (userText.includes("Gặp nhân viên CSKH") || userText.includes("CSKH")) {
      setActiveTab("cskh");
      return;
    }

    if (userText.includes("Thêm thời tiết") || userText.includes("thời tiết")) {
      handleFetchGpsAndWeather();
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
        visibleText || "Mình chưa tìm được món thật sự khớp. Bạn thử nói rõ hơn về dịp, màu sắc hoặc size nhé.",
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
    handleProcessWorkflow(chatInput);
  };

  return (
    <div className="fixed bottom-16 right-3 z-50 flex flex-col items-end gap-2 font-body md:bottom-5 md:right-5">
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`flex h-[470px] max-h-[76vh] w-[320px] sm:w-[345px] flex-col overflow-hidden rounded-2xl border shadow-2xl transition-all duration-300 ${
              darkMode 
                ? "border-stone-700 bg-[#0F1720] text-white shadow-[0_15px_40px_rgba(0,0,0,0.8)]" 
                : "border-stone-300 bg-white text-[#183A2D] shadow-[0_15px_40px_rgba(0,0,0,0.2)]"
            }`}
          >
            {/* 👑 SOLID HIGH-CONTRAST FOREST GREEN HEADER (Không bao giờ bị mờ hay mất chữ) */}
            <div className="bg-[#183A2D] p-3 px-3.5 text-white border-b border-[#0F281E] shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white border border-white/20">
                    <Bot size={15} className="text-[#A3E39F]" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#183A2D]" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xs font-heading font-extrabold uppercase tracking-wider text-white leading-tight">
                      TRỢ LÝ CLOOP
                    </h3>
                    <p className="text-[9.5px] text-[#A3E39F] font-ui leading-tight font-medium">
                      Hoạt động 24/7 • Tìm đồ chuẩn gu
                    </p>
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={() => setShowChat(false)} 
                  className="w-6 h-6 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
                  title="Đóng chat"
                >
                  <X size={13} />
                </button>
              </div>

              {/* SLIM 2-TAB SWITCHER */}
              <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-black/25 text-[10px] font-ui font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab("stylist")}
                  className={`py-1 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    activeTab === "stylist"
                      ? "bg-white text-[#183A2D] shadow-2xs font-extrabold"
                      : "text-stone-300 hover:text-white"
                  }`}
                >
                  <Bot size={11} className={activeTab === "stylist" ? "text-[#183A2D]" : "text-[#A3E39F]"} />
                  AI Stylist
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("cskh")}
                  className={`py-1 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    activeTab === "cskh"
                      ? "bg-white text-[#183A2D] shadow-2xs font-extrabold"
                      : "text-stone-300 hover:text-white"
                  }`}
                >
                  <Headphones size={11} />
                  CSKH 24/7
                </button>
              </div>
            </div>

            {/* TAB 1: AI STYLIST CHAT STREAM */}
            {activeTab === "stylist" ? (
              <>
                <div className="flex-1 space-y-2.5 overflow-y-auto p-3 text-left scrollbar-thin bg-[#FDFBF7] dark:bg-[#0C141C]">
                  {messages.map((message) => (
                    <div key={message.id} className="space-y-1.5">
                      <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                        {message.role === "user" ? (
                          <div className="max-w-[85%] rounded-xl rounded-tr-none bg-[#183A2D] px-3 py-2 text-[11px] font-medium text-white shadow-2xs">
                            {message.text}
                          </div>
                        ) : (
                          <div className={`w-full max-w-[96%] rounded-xl rounded-tl-none border p-2.5 text-[11px] font-normal leading-relaxed shadow-2xs ${
                            darkMode ? "border-stone-700 bg-[#14202A] text-stone-100" : "border-stone-200 bg-white text-[#183A2D]"
                          }`}>
                            {message.text ? (
                              <MessageContent 
                                text={message.text} 
                                subNote={message.subNote} 
                                products={productsById} 
                              />
                            ) : null}
                            {message.isStreaming && (
                              <span className="ml-1 inline-block h-3 w-1 animate-pulse rounded bg-emerald-500 align-middle" />
                            )}
                          </div>
                        )}
                      </div>

                      {message.suggestions && message.role === "ai" && (
                        <div className="flex flex-wrap justify-start gap-1 pl-0.5 pt-0.5">
                          {message.suggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => handleProcessWorkflow(suggestion)}
                              className="cursor-pointer rounded-full border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-[9.5px] font-semibold text-[#183A2D] dark:text-[#A3E39F] shadow-2xs transition hover:bg-[#183A2D] hover:text-white"
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
                      <div className={`flex items-center gap-1 rounded-xl rounded-tl-none px-3 py-2 border ${
                        darkMode ? "bg-[#14202A] border-stone-700 text-stone-300" : "border-stone-200 bg-white text-stone-600"
                      }`}>
                        <span className="h-1 w-1 animate-bounce rounded-full bg-[#183A2D] dark:bg-emerald-400" />
                        <span className="h-1 w-1 animate-bounce rounded-full bg-[#183A2D] dark:bg-emerald-400" style={{ animationDelay: "150ms" }} />
                        <span className="h-1 w-1 animate-bounce rounded-full bg-[#183A2D] dark:bg-emerald-400" style={{ animationDelay: "300ms" }} />
                        <span className="text-[9.5px] text-stone-400 ml-1 font-ui">Đang tìm đồ chuẩn gu...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* COMPACT INPUT BAR */}
                <div className={`flex items-center gap-1.5 border-t p-2.5 transition-colors ${
                  darkMode ? "border-stone-800 bg-[#14202A]" : "border-stone-200 bg-white"
                }`}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && handleInputSendButton()}
                    placeholder="Ví dụ: Đầm dạ hội đen size M..."
                    className={`min-w-0 flex-1 rounded-full border px-3 py-1.5 text-[11px] font-medium outline-none transition-all ${
                      darkMode 
                        ? "border-stone-700 bg-[#0F1720] text-white focus:border-emerald-500" 
                        : "border-stone-300 bg-[#FAF8F3] text-[#183A2D] focus:border-[#183A2D]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleInputSendButton}
                    disabled={isTyping || !chatInput.trim()}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#183A2D] text-white shadow-xs transition hover:bg-[#2A6E46] disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                  >
                    <Send size={11} />
                  </button>
                </div>
              </>
            ) : (
              /* TAB 2: CSKH 24/7 */
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-left bg-[#FDFBF7] dark:bg-[#0C141C]">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#183A2D] dark:text-[#A3E39F] uppercase tracking-wider">
                    <ShieldCheck size={14} /> CSKH CLOOP Sẵn Sàng
                  </div>
                  <p className="text-[10.5px] text-stone-600 dark:text-stone-300 font-light leading-relaxed">
                    Hỗ trợ nhanh về đổi size, giao gấp 2H hoặc xử lý cọc. Phản hồi trong 3 phút!
                  </p>
                </div>

                {/* Contact Action Cards */}
                <div className="space-y-2">
                  <a
                    href="tel:0987654321"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-stone-200 hover:border-[#183A2D] bg-white dark:bg-[#14202A] dark:border-stone-800 shadow-2xs hover:shadow-xs transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
                        <PhoneCall size={14} />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-stone-800 dark:text-white leading-tight">Hotline Khẩn Cấp</p>
                        <p className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400">098.765.4321</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-stone-400 group-hover:text-[#183A2D] font-ui flex items-center gap-0.5">
                      Gọi <ArrowRight size={10} />
                    </span>
                  </a>

                  <a
                    href="https://zalo.me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-stone-200 hover:border-blue-600 bg-white dark:bg-[#14202A] dark:border-stone-800 shadow-2xs hover:shadow-xs transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                        <MessageCircle size={14} />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-stone-800 dark:text-white leading-tight">Zalo Hỗ Trợ</p>
                        <p className="text-[9.5px] text-stone-500 dark:text-stone-400">Phản hồi &lt; 3 phút</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-600 font-ui flex items-center gap-0.5">
                      Chat <ArrowRight size={10} />
                    </span>
                  </a>
                </div>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab("stylist")}
                    className="text-[10.5px] font-semibold text-[#183A2D] dark:text-[#A3E39F] hover:underline font-ui inline-flex items-center gap-1 cursor-pointer"
                  >
                    ← Quay lại tìm đồ cùng AI
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 SLEEK COMPACT LAUNCHER BUTTON */}
      <motion.button
        type="button"
        onClick={() => setShowChat(!showChat)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 h-9 px-3 rounded-full bg-[#183A2D] hover:bg-[#2A6E46] text-white shadow-lg border border-emerald-500/20 transition-all duration-200 cursor-pointer"
      >
        <div className="relative flex items-center justify-center">
          <Bot className="w-4 h-4 text-[#A3E39F]" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <span className="text-[10.5px] font-extrabold uppercase tracking-wider font-ui">
          TRỢ LÝ CLOOP
        </span>
      </motion.button>
    </div>
  );
}
