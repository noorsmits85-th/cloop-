"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Bot, CheckCircle2, ShoppingBag, MapPin, CloudSun } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";

// ✅ KHÔI PHỤC MẠCH THẲNG: Supabase luôn có giá trị đóng thế, xóa sổ hoàn toàn lỗi 'possibly null'
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface StructuredOutfitCard {
  intro: string;
  realProduct: {
    id: string;
    name: string;
    image: string;
    price: string;
    location: string;
    isRental: boolean;
  };
  suitability: string[];
}

interface Message {
  id: number;
  role: "user" | "ai";
  text?: string;
  isCard?: boolean;
  cardData?: StructuredOutfitCard;
  isWeatherButton?: boolean;
  suggestions?: string[]; // 🌟 Thêm mảng gợi ý nhanh để mớm lời cho khách
}

export default function AiStylistChat({ darkMode }: { darkMode: boolean }) {
  const [showChat, setShowChat] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [currentWeatherInfo, setCurrentWeatherInfo] = useState<string>("");

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "ai",
      text: "Chào cậu! Tớ là CLOOP AI Stylist. Để tớ lùng sục kho dữ liệu bóc đúng outfit có sẵn quanh khu vực của cậu, cậu ấn nút định vị dưới đây để tớ quét nhanh tình hình thời tiết thực tế nhé! 🌟"
    },
    {
      id: 2,
      role: "ai",
      isWeatherButton: true
    }
  ]);

  const handleFetchGpsAndWeather = () => {
    if (!navigator.geolocation) {
      alert("Trình duyệt không hỗ trợ định vị tọa độ.");
      return;
    }

    setIsTyping(true);
    setMessages(prev => prev.filter(m => !m.isWeatherButton));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
          );
          const data = await res.json();
          
          const temp = Math.round(data.current.temperature_2m);
          const code = data.current.weather_code;

          let weatherEmoji = "☀️";
          let weatherText = "nắng rực rỡ";
          if (code >= 1 && code <= 3) { weatherText = "trời nhiều mây mát mẻ"; weatherEmoji = "☁️"; }
          else if (code >= 51 && code <= 67) { weatherText = "trời đang có mưa ẩm"; weatherEmoji = "🌧️"; }
          else if (code >= 71) { weatherText = "trời lạnh buốt"; weatherEmoji = "❄️"; }

          const finalWeatherString = `${weatherEmoji} ${weatherText} ${temp}°C`;
          setCurrentWeatherInfo(finalWeatherString);

          setMessages(prev => [...prev, {
            id: Date.now(),
            role: "ai",
            text: `🎯 Định vị thành công! Tớ check thấy khu vực của cậu hiện tại ${finalWeatherString}. Với thời tiết này, cậu đang cần lên đồ đi đâu thế ?`,
            suggestions: ["Đi tiệc Nghệ An 🥂", "Đi làm công sở 💼", "Hẹn hò lãng mạn 🌹"] // Mớm lời ngay sau khi check thời tiết
          }]);

        } catch (err) {
          console.error(err);
          setMessages(prev => [...prev, { id: Date.now(), role: "ai", text: "Tớ đã kết nối được GPS nhưng trạm thời tiết đang bận. Cậu cứ gõ trực tiếp nhu cầu phối đồ bên dưới nhé!" }]);
        } finally {
          setIsTyping(false);
        }
      },
      () => {
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          role: "ai", 
          text: "Môi trường bảo mật tạm đóng quyền định vị tự động. Không sao hết nè, cậu chạm nhanh gợi ý hoặc gõ trực tiếp sự kiện + tỉnh thành nha nhé! 🌿",
          suggestions: ["Đi tiệc ở Nghệ An ✨", "Đi làm ở Vinh 👔", "Đi quẩy Hà Nội 💃"]
        }]);
        setIsTyping(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const handleProcessWorkflow = async (userText: string) => {
    if (!userText.trim()) return;

    const userMsg: Message = { id: Date.now(), role: "user", text: userText };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsTyping(true);

    const textLower = userText.toLowerCase();

    // 📡 MA TRẬN TỪ ĐIỂN VỊ TRÍ "VI BỘ": Quét từ viết tắt, từ ngắn
    let targetLocation = "";
    const locationMatrix = [
      { name: "Tuyên Quang", keys: ["tuyên quang", "tuyen quang", "tq"] },
      { name: "Lào Cai", keys: ["lào cai", "lao cai", "lc"] },
      { name: "Thái Nguyên", keys: ["thái nguyên", "thai nguyen", "tn"] },
      { name: "Phú Thọ", keys: ["phú thọ", "phu tho", "pt"] },
      { name: "Bắc Ninh", keys: ["bắc ninh", "bac ninh", "bn"] },
      { name: "Hưng Yên", keys: ["hưng yên", "hung yen", "hy"] },
      { name: "Hải Phòng", keys: ["hải phòng", "hai phong", "hp"] },
      { name: "Ninh Bình", keys: ["ninh bình", "ninh binh", "nb"] },
      { name: "Quảng Trị", keys: ["quảng trị", "quang tri", "qt"] },
      { name: "Đà Nẵng", keys: ["đà nẵng", "da nang", "đn", "dn"] },
      { name: "Quảng Ngãi", keys: ["quảng ngãi", "quang ngai", "qn"] },
      { name: "Gia Lai", keys: ["gia lai", "gl"] },
      { name: "Khánh Hòa", keys: ["khánh hòa", "khanh hoa", "nha trang", "kh"] },
      { name: "Điện Biên", keys: ["điện biên", "dien bien", "db"] },
      { name: "Thành phố Hà Nội", keys: ["hà nội", "hn", "ha noi"] },
      { name: "Hà Tĩnh", keys: ["hà tĩnh", "ha tinh", "ht"] },
      { name: "Lạng Sơn", keys: ["lạng sơn", "lang son", "ls"] },
      { name: "Lai Châu", keys: ["lai châu", "lai chau"] },
      { name: "Nghệ An", keys: ["nghệ an", "vinh", "nghe an", "na"] },
      { name: "Quảng Ninh", keys: ["quảng ninh", "quang ninh", "qn"] },
      { name: "Sơn La", keys: ["sơn la", "son la", "sl"] },
      { name: "Thanh Hóa", keys: ["thanh hóa", "thanh hoa", "th"] },
      { name: "Cao Bằng", keys: ["cao bằng", "cao bang", "cb"] },
      { name: "Thành phố Huế", keys: ["huế", "hue", "thừa thiên huế", "tth"] },
      { name: "Lâm Đồng", keys: ["lâm đồng", "lam dong", "đà lạt", "da lat", "ld"] },
      { name: "Đắk Lắk", keys: ["đắk lắk", "dak lak", "bmt"] },
      { name: "Thành phố Hồ Chí Minh", keys: ["hồ chí minh", "hcm", "sài gòn", "sg", "tp hcm"] },
      { name: "Đồng Nai", keys: ["đồng nai", "dong nai", "biên hòa"] },
      { name: "Tây Ninh", keys: ["tây ninh", "tay ninh"] },
      { name: "Cần Thơ", keys: ["cần thơ", "can tho", "ct"] },
      { name: "Vĩnh Long", keys: ["vĩnh long", "vinh long", "vl"] },
      { name: "Đồng Tháp", keys: ["đồng tháp", "dong thap", "đt"] },
      { name: "Cà Mau", keys: ["cà mau", "ca mau", "cm"] },
      { name: "An Giang", keys: ["an giang", "an giang", "ag"] }
    ];

    const foundLoc = locationMatrix.find(loc => loc.keys.some(k => textLower.includes(k)));
    if (foundLoc) targetLocation = foundLoc.name;

    // 📡 MA TRẬN TỪ ĐIỂN SỰ KIỆN CẢM XÚC: Quét từ đồng nghĩa, từ lóng
    let targetCategory: string[] = [];
    let eventName = "dạo phố, hẹn hò";

    const weddingKeywords = ["tiệc", "cưới", "sự kiện", "quẩy", "bar", "sinh nhật", "date", "hẹn hò", "gặp người yêu", "prom"];
    const officeKeywords = ["làm", "công sở", "văn phòng", "phỏng vấn", "sếp", "đi học", "giảng đường", "vest", "sơ mi"];

    if (weddingKeywords.some(k => textLower.includes(k))) {
      targetCategory = ["DRESSES", "VÁY", "ĐẦM"];
      eventName = "đi sự kiện, tiệc tùng sang chảnh";
    } else if (officeKeywords.some(k => textLower.includes(k))) {
      targetCategory = ["TOPS", "BOTTOMS", "OUTERWEAR", "ÁO", "QUẦN", "VEST"];
      eventName = "thanh lịch chỉn chu";
    }

    try {
      let query = supabase.from("products").select("*").order("created_at", { ascending: false });
      
      if (targetLocation) query = query.ilike("location", `%${targetLocation}%`);
      if (targetCategory.length > 0) query = query.in("category", targetCategory);

      const { data, error } = await query.limit(1);

      let responseCard: StructuredOutfitCard | null = null;
      let aiTextResponse = "";

      if (error || !data || data.length === 0) {
        aiTextResponse = `Tủ đồ tuần hoàn CLOOP hiện tại vừa mới hết sạch mẫu khớp với gu này rồi. Cậu thử đổi một từ khóa khác xem sao nhé! 🥺`;
      } else {
        const item = data[0];
        const isRental = Number(item.price_per_day || 0) > 0;
        
        responseCard = {
          intro: `Nhận diện từ khóa cậu gõ, tớ bóc ngay siêu phẩm cực hợp gu ${eventName} tại khu vực ${targetLocation || 'quanh cậu'} này nhé:`,
          realProduct: {
            id: item.id,
            name: item.name || item.title || "Trang phục CLOOP",
            image: item.images && item.images.length > 0 ? item.images[0] : "/1.1.jpg",
            price: isRental 
              ? `${Number(item.price_per_day).toLocaleString()}đ / ngày` 
              : `${Number(item.deposit_fee || 0).toLocaleString()}đ (Mua đứt)`,
            location: item.location?.split("—")[0]?.replace("Tỉnh ", "") || "Nghệ An",
            isRental: isRental
          },
          suitability: [
            `✔ Thiết kế tôn dáng, xử lý chất liệu chuẩn gu cậu cần`,
            `✔ Sẵn sàng điều phối ngay tại trạm ${item.location?.split("—")[0] || "Nghệ An"}`,
            "✔ Đã tiệt trùng, bọc túi sinh học sẵn sàng lên kệ"
          ]
        };
      }

      const aiMsg: Message = {
        id: Date.now() + 1,
        role: "ai",
        text: aiTextResponse || undefined,
        isCard: !!responseCard,
        cardData: responseCard || undefined,
        // Nếu không tìm thấy đồ, chủ động gợi ý từ khóa khác cho khách bấm liền
        suggestions: !responseCard ? ["Đi tiệc Nghệ An 🥂", "Đi làm công sở 💼"] : undefined
      };
      
      setMessages((prev) => [...prev, aiMsg]);

    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "ai", text: "Đường truyền tủ đồ đám mây bị nghẽn mạch, cậu gõ lại giúp tớ nhé! 🔄" }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleInputSendButton = () => {
    if (!chatInput.trim()) return;
    handleProcessWorkflow(chatInput);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 font-body">
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className={`w-[360px] md:w-[380px] h-[580px] rounded-[2.5rem] shadow-2xl border flex flex-col overflow-hidden backdrop-blur-md transition-colors duration-500 ${darkMode ? "bg-[#0F1720]/95 border-[#2B3946] text-white" : "bg-white/95 border-[#E9E2D8] text-[#183A2D]"}`}
          >
            {/* Header */}
            <div className={`p-5 flex items-center justify-between border-b ${darkMode ? "border-[#2B3946] bg-[#14202A]" : "border-gray-100 bg-[#FAF8F3]"}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#183A2D] dark:bg-emerald-600 rounded-full flex items-center justify-center shadow-md text-white">
                  <Sparkles size={16} className="animate-pulse" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-bold uppercase tracking-wider">CLOOP AI Stylist</h3>
                  <p className="text-[10px] text-emerald-500 dark:text-emerald-400 font-semibold flex items-center gap-1">🟢 Smart Matching Active</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowChat(false)} className={`p-1.5 rounded-full transition-colors ${darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}><X size={16} /></button>
            </div>

            {/* Nội Dung Cuộc Hội Thoại */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin text-left">
              {messages.map((m) => (
                <div key={m.id} className="space-y-2">
                  <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    {m.isWeatherButton ? (
                      <button
                        type="button"
                        onClick={handleFetchGpsAndWeather}
                        className="inline-flex items-center gap-2 bg-[#183A2D] text-white font-bold text-[10px] uppercase tracking-widest px-5 py-3 rounded-2xl shadow-sm hover:bg-[#254F3B] transition mx-auto cursor-pointer"
                      >
                        <CloudSun size={14} className="animate-pulse" /> 🎯 Xác thực thời tiết vị trí thực tế
                      </button>
                    ) : m.role === "user" ? (
                      <div className="max-w-[80%] bg-[#183A2D] dark:bg-emerald-600 text-white px-4 py-2.5 rounded-[1.25rem] rounded-tr-none text-xs font-medium shadow-sm">
                        {m.text}
                      </div>
                    ) : m.isCard && m.cardData ? (
                      <div className={`w-full max-w-[95%] p-4 rounded-[1.8rem] border shadow-md flex flex-col gap-3 ${darkMode ? "bg-[#14202A] border-[#2B3946]" : "bg-[#FAF8F3] border-[#E9E2D8]"}`}>
                        <p className="text-[11px] font-bold leading-relaxed text-[#183A2D] dark:text-emerald-400 flex items-start gap-1.5">
                          <Sparkles size={14} className="shrink-0 mt-0.5 text-amber-500" />
                          {m.cardData.intro}
                        </p>
                        
                        <Link href={`/product/${m.cardData.realProduct.id}`} className={`flex gap-3 p-2 rounded-2xl border group hover:shadow-md transition-all ${darkMode ? "bg-[#0F1720] border-[#2B3946]" : "bg-white border-gray-100"}`}>
                          <div className="relative w-20 h-[100px] rounded-xl overflow-hidden bg-gray-100 shrink-0">
                            <Image src={m.cardData.realProduct.image} alt="Sản phẩm thật" fill unoptimized className="object-cover object-top group-hover:scale-105 transition duration-500" />
                            <span className="absolute top-1 left-1 bg-[#183A2D] text-white text-[7px] font-bold uppercase px-1.5 py-0.5 rounded shadow-sm">
                              {m.cardData.realProduct.isRental ? "Thuê" : "Mua"}
                            </span>
                          </div>
                          <div className="py-1 flex flex-col justify-between">
                            <div>
                              <h4 className={`text-xs font-bold line-clamp-2 ${darkMode ? "text-white" : "text-[#183A2D]"}`}>{m.cardData.realProduct.name}</h4>
                              <p className="text-xs font-bold text-[#6BA37A] mt-1">{m.cardData.realProduct.price}</p>
                            </div>
                            <div className="flex items-center gap-1 text-[9px] text-gray-400 font-semibold">
                              <MapPin size={10} /> {m.cardData.realProduct.location}
                            </div>
                          </div>
                        </Link>

                        <div className="space-y-1 pt-1">
                          {m.cardData.suitability.map((suit, idx) => (
                            <p key={idx} className="text-[10px] text-gray-400 font-semibold flex items-center gap-1.5">
                              <CheckCircle2 size={11} className="text-emerald-500 shrink-0" /> {suit}
                            </p>
                          ))}
                        </div>

                        <Link href={`/product/${m.cardData.realProduct.id}`}>
                          <button type="button" className="mt-1 w-full h-[36px] bg-[#183A2D] dark:bg-emerald-600 text-white rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-[#254F3B] dark:hover:bg-emerald-500 transition shadow-sm">
                            <ShoppingBag size={12} /> Thuê Outfit Này Ngay
                          </button>
                        </Link>
                      </div>
                    ) : (
                      <div className={`max-w-[85%] px-4 py-2.5 rounded-[1.25rem] rounded-tl-none text-xs font-medium border shadow-sm ${darkMode ? "bg-[#14202A] border-[#2B3946]" : "bg-white border-gray-100"}`}>
                        {m.text}
                      </div>
                    )}
                  </div>

                  {/* 🎨 HIỂN THỊ CÁC CHIPS GỢI Ý NHANH (QUICK REPLIES) */}
                  {m.suggestions && m.role === "ai" && (
                    <div className="flex flex-wrap gap-2 pt-1 justify-start pl-2">
                      {m.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => handleProcessWorkflow(sug.replace(/[🥂💼🌹✨👔💃🍾]/g, "").trim())}
                          className="text-[10px] font-bold px-3 py-1.5 rounded-full border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/40 text-[#183A2D] dark:text-emerald-400 hover:bg-[#183A2D] hover:text-white transition shadow-sm cursor-pointer"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className={`px-4 py-3 rounded-[1.25rem] rounded-tl-none flex items-center gap-1 ${darkMode ? "bg-[#14202A]" : "bg-white border border-gray-100"}`}>
                    <span className="w-1.5 h-1.5 bg-[#183A2D] dark:bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-1.5 h-1.5 bg-[#183A2D] dark:bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1.5 h-1.5 bg-[#183A2D] dark:bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                </div>
              )}
            </div>

            {/* Hộp Nhập Liệu */}
            <div className={`p-4 border-t flex items-center gap-2 transition-colors ${darkMode ? "border-[#2B3946] bg-[#14202A]" : "border-gray-100 bg-white"}`}>
              <input 
                type="text" 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)} 
                onKeyDown={(e) => e.key === "Enter" && handleInputSendButton()} 
                placeholder="Gõ 'quẩy', 'đi date', 'an' xem sao nhé..." 
                className={`flex-1 px-4 py-2.5 border rounded-full text-xs font-semibold outline-none transition-all ${darkMode ? "bg-[#0F1720] border-[#2B3946] text-white focus:border-emerald-500" : "bg-[#FAF8F3] border-[#E9E2D8] text-[#183A2D] focus:border-[#183A2D]"}`} 
              />
              <button 
                type="button" 
                onClick={handleInputSendButton} 
                className="w-9 h-9 bg-[#183A2D] dark:bg-emerald-600 text-white rounded-full flex items-center justify-center hover:bg-[#254F3B] dark:hover:bg-emerald-500 transition shadow-md shrink-0"
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setShowChat(!showChat)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-2xl cursor-pointer border border-white/10 group transition-colors duration-500 ${darkMode ? "bg-emerald-600 text-white" : "bg-[#183A2D] text-white"}`}
      >
        <Bot size={22} className="group-hover:rotate-12 transition-transform duration-300" />
        <span className="text-[8px] font-bold uppercase tracking-widest mt-0.5 text-amber-300">AI Stylist</span>
      </motion.button>
    </div>
  );
}