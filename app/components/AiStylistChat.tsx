"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, CheckCircle2, CloudSun, MapPin, Send, ShoppingBag, Compass, X } from "lucide-react";
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
  isStreaming?: boolean;
  suggestions?: string[];
  isWeatherButton?: boolean;
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: "welcome",
    role: "ai",
    text: "Chào bạn, mình là CLOOP AI Stylist. Bạn cứ nói tự nhiên dịp sắp đi, gu màu, vóc dáng hoặc ngân sách, mình sẽ quét kho đồ thật của CLOOP và gợi ý món phù hợp nhất.",
    suggestions: ["Đi tiệc cưới ở Nghệ An", "Đi biển cần váy nhẹ", "Kỷ yếu phong cách thanh lịch"],
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
    // Giải mã Base64 hỗ trợ UTF-8 (tiếng Việt) thay vì atob() gốc của trình duyệt
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
      className="my-2 flex gap-3 rounded-2xl border border-[#E9E2D8] bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-[#2B3946] dark:bg-[#0F1720]"
    >
      <div className="relative h-[104px] w-20 shrink-0 overflow-hidden rounded-xl bg-stone-100">
        <Image src={product.image} alt={product.title} fill unoptimized className="object-cover object-top" sizes="80px" />
        <span className="absolute left-1 top-1 rounded bg-[#183A2D] px-1.5 py-0.5 text-[7px] font-bold uppercase text-white shadow-sm">
          {listingLabel}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-1 text-left">
        <div className="space-y-1">
          <h4 className="line-clamp-2 text-xs font-bold text-[#183A2D] dark:text-white">{product.title}</h4>
          <p className="text-xs font-bold text-[#6BA37A]">{product.priceText}</p>
          <p className="line-clamp-1 text-[9px] font-semibold text-stone-400">
            {product.category}
            {product.size ? ` • Size ${product.size}` : ""}
            {product.color ? ` • ${product.color}` : ""}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1 truncate text-[9px] font-semibold text-stone-400">
            <MapPin size={10} /> {product.province || "CLOOP"}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#183A2D] px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-white">
            <ShoppingBag size={9} /> Xem
          </span>
        </div>
      </div>
    </Link>
  );
}

function MessageContent({ text, products }: { text: string; products: Record<string, ProductMini> }) {
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
    <>
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
    </>
  );
}

export default function AiStylistChat({ darkMode }: { darkMode: boolean }) {
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [weatherContext, setWeatherContext] = useState("");
  const [productsById, setProductsById] = useState<Record<string, ProductMini>>({});
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const abortRef = useRef<AbortController | null>(null);

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
          text: "Trình duyệt chưa hỗ trợ định vị. Bạn cứ nói rõ khu vực hoặc thời tiết trong tin nhắn, mình vẫn tư vấn được.",
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
          let weatherText = "trời nắng";

          if (code >= 1 && code <= 3) weatherText = "trời nhiều mây";
          else if (code >= 51 && code <= 67) weatherText = "trời đang mưa";
          else if (code >= 71) weatherText = "trời lạnh";

          const context = `${weatherText}, khoảng ${temp}°C`;
          setWeatherContext(context);
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "ai",
              text: `Mình đã ghi nhận thời tiết hiện tại: ${context}. Bạn định mặc cho dịp nào để mình phối sát hơn?`,
              suggestions: ["Đi tiệc tối nay", "Đi làm công sở", "Đi chơi ngoài trời"],
            },
          ]);
        } catch (error) {
          console.error(error);
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "ai",
              text: "Mình lấy được vị trí nhưng chưa đọc được thời tiết. Bạn nhắn trực tiếp dịp, tỉnh thành và gu mặc nhé.",
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
            text: "Bạn chưa bật quyền định vị. Không sao, chỉ cần nhắn kiểu: 'đi tiệc ở Vinh, thích màu đen, size M' là mình quét kho được.",
            suggestions: ["Đi tiệc ở Vinh", "Đi biển Nha Trang", "Kỷ yếu màu trắng"],
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
        "Mình chưa kết nối được bộ não AI Stylist. Bạn kiểm tra GEMINI_API_KEY rồi thử lại giúp mình nhé.",
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
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-4 font-body md:bottom-6 md:right-6">
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className={`flex h-[580px] w-[360px] flex-col overflow-hidden rounded-[2rem] border shadow-2xl backdrop-blur-md transition-colors duration-500 md:w-[390px] ${
              darkMode ? "border-[#2B3946] bg-[#0F1720]/95 text-white" : "border-[#E9E2D8] bg-white/95 text-[#183A2D]"
            }`}
          >
            <div className={`flex items-center justify-between border-b p-5 ${darkMode ? "border-[#2B3946] bg-[#14202A]" : "border-gray-100 bg-[#FAF8F3]"}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#183A2D] text-white shadow-md dark:bg-emerald-600">
                  <Bot size={18} />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-bold uppercase tracking-wider">CLOOP AI Stylist</h3>
                  <p className="flex items-center gap-1 text-[10px] font-semibold text-emerald-500 dark:text-emerald-400">
                    <CheckCircle2 size={10} /> RAG kho đồ thật
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setShowChat(false)} className={`rounded-full p-1.5 transition-colors ${darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}>
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4 text-left scrollbar-thin">
              {messages.map((message) => (
                <div key={message.id} className="space-y-2">
                  <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    {message.isWeatherButton ? (
                      <button
                        type="button"
                        onClick={handleFetchGpsAndWeather}
                        className="mx-auto inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[#183A2D] px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm transition hover:bg-[#254F3B]"
                      >
                        <CloudSun size={14} className="animate-pulse" /> Thêm ngữ cảnh thời tiết
                      </button>
                    ) : message.role === "user" ? (
                      <div className="max-w-[80%] rounded-[1.25rem] rounded-tr-none bg-[#183A2D] px-4 py-2.5 text-xs font-medium text-white shadow-sm dark:bg-emerald-600">
                        {message.text}
                      </div>
                    ) : (
                      <div className={`max-w-[92%] rounded-[1.25rem] rounded-tl-none border px-4 py-2.5 text-xs font-medium leading-relaxed shadow-sm ${darkMode ? "border-[#2B3946] bg-[#14202A]" : "border-gray-100 bg-white"}`}>
                        {message.text ? <MessageContent text={message.text} products={productsById} /> : null}
                        {message.isStreaming && <span className="ml-1 inline-block h-3 w-1 animate-pulse rounded bg-emerald-500 align-middle" />}
                      </div>
                    )}
                  </div>

                  {message.suggestions && message.role === "ai" && (
                    <div className="flex flex-wrap justify-start gap-2 pl-2 pt-1">
                      {message.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => handleProcessWorkflow(suggestion)}
                          className="cursor-pointer rounded-full border border-emerald-600/30 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-[#183A2D] shadow-sm transition hover:bg-[#183A2D] hover:text-white dark:bg-emerald-950/40 dark:text-emerald-400"
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
                  <div className={`flex items-center gap-1 rounded-[1.25rem] rounded-tl-none px-4 py-3 ${darkMode ? "bg-[#14202A]" : "border border-gray-100 bg-white"}`}>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#183A2D] dark:bg-emerald-500" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#183A2D] dark:bg-emerald-500" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#183A2D] dark:bg-emerald-500" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>

            <div className={`flex items-center gap-2 border-t p-4 transition-colors ${darkMode ? "border-[#2B3946] bg-[#14202A]" : "border-gray-100 bg-white"}`}>
              <input
                type="text"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleInputSendButton()}
                placeholder="Ví dụ: đi tiệc, size M, thích màu đen..."
                className={`min-w-0 flex-1 rounded-full border px-4 py-2.5 text-xs font-semibold outline-none transition-all ${
                  darkMode ? "border-[#2B3946] bg-[#0F1720] text-white focus:border-emerald-500" : "border-[#E9E2D8] bg-[#FAF8F3] text-[#183A2D] focus:border-[#183A2D]"
                }`}
              />
              <button
                type="button"
                onClick={handleInputSendButton}
                disabled={isTyping || !chatInput.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#183A2D] text-white shadow-md transition hover:bg-[#254F3B] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setShowChat(!showChat)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className={`flex h-12 w-12 md:h-14 md:w-14 cursor-pointer flex-col items-center justify-center rounded-full border border-white/10 shadow-2xl transition-all duration-500 opacity-80 md:opacity-100 backdrop-blur-md max-w-[15vw] md:max-w-none ${
          darkMode ? "bg-emerald-600/90 md:bg-emerald-600 text-white" : "bg-[#183A2D]/90 md:bg-[#183A2D] text-white"
        }`}
      >
        <Bot className="w-5 h-5 md:w-[22px] md:h-[22px] transition-transform duration-300 group-hover:rotate-12" />
        <span className="hidden md:block mt-0.5 text-[8px] font-bold uppercase tracking-widest text-amber-300">AI Stylist</span>
      </motion.button>
    </div>
  );
}
