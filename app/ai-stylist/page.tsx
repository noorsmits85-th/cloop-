"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { 
  Sparkles, Shirt, Compass, Smile, Sliders, 
  CheckCircle2, RefreshCw, Calendar, Palette, DollarSign, 
  Leaf, ShieldCheck, ChevronLeft, ArrowRight, User,
  CreditCard, ClipboardCheck, CheckCircle, Loader2, Upload, Camera, FileText, Send, Bot, Sparkle
} from "lucide-react";
import Link from "next/link";

// ĐỊNH NGHĨA KIỂU DỮ LIỆU ĐỒNG BỘ
type Outfit = {
  id: number;
  name: string;
  priceText: string;
  pricePerDay: number; 
  depositFee: number;   
  image: string;
  genderTarget: string;
  suitableBodies: string[];
  styleGroup: string;
  seasonTarget: string;
  colorTone: string;
  budgetGroup: string;
  occasionGroups: string[]; 
  rentalCount: number;
  carbonSaved: number;      
  waterSaved: number;
  lifeCycleExtension: number;
  isAvailable: boolean;  
  ownerName: string;
  reasonBase: string;
  initialAccessories: { shoes: string; bag: string; outer: string };
  alternatives: { shoes: string[]; bag: string[]; outer: string[] };
};

type RecommendedResult = {
  Outfit: Outfit;
  finalScore: number;
  confidence: string;
  selectedShoes: string;
  selectedBag: string;
  selectedOuter: string;
};

type ChatMessage = {
  id: string;
  role: "ai" | "user";
  text: string;
  isTyping?: boolean;
};

// KHO SEED DATA MẪU (DÙNG LÀM BỆ ĐỠ KHI DATABASE CHƯA CÓ ĐỒ MỚI ĐỂ TRANH BỊ TRỐNG TRANG)
const SEED_OUTFIT_POOL: Outfit[] = [
  {
    id: 991,
    name: "Váy dáng ngắn Sporty Black",
    priceText: "65.000đ / ngày",
    pricePerDay: 65000,
    depositFee: 150000,
    image: "/1.1.jpg",
    genderTarget: "Nữ",
    suitableBodies: ["Hourglass (Đồng hồ cát)", "Pear (Quả lê)"],
    styleGroup: "Minimalism / Sporty Chic",
    seasonTarget: "Thu Đông",
    colorTone: "Đen mờ (Matte Black)",
    budgetGroup: "<300k",
    occasionGroups: ["Quán cà phê / Hẹn hò", "Dạo phố / Night Out", "Thể thao / Gym Chic"],
    rentalCount: 48,
    carbonSaved: 2.6,
    waterSaved: 1240,
    lifeCycleExtension: 42,
    isAvailable: true,
    ownerName: "Hoàng Trang (Tủ đồ Nghệ An)",
    reasonBase: "Vibe này chuẩn bài hẹn hò năng động luôn! Phom Sporty tôn trọn đường cong cơ thể cậu, sắc đen lại hack dáng cực xịn.",
    initialAccessories: { shoes: "Sneaker trắng Chunky", bag: "Túi đeo chéo Nylon Black", outer: "Áo khoác Varsity lửng" },
    alternatives: {
      shoes: ["Sneaker trắng Chunky", "Combat Boots cổ thấp", "Giày gót nhọn kiêu kỳ"],
      bag: ["Túi đeo chéo Nylon Black", "Túi kẹp nách Canvas", "Ví cầm tay đính đá"],
      outer: ["Áo khoác Varsity lửng", "Áo Bomber đen chần bông", "Blazer dạ dáng rộng"]
    }
  },
  {
    id: 992,
    name: "Set Halter Top & Quần Suông Trendy",
    priceText: "110.000đ / ngày",
    pricePerDay: 110000,
    depositFee: 200000,
    image: "/1.1.jpg",
    genderTarget: "Nữ",
    suitableBodies: ["Pear (Quả lê)", "Hourglass (Đồng hồ cát)", "Apple (Quả táo)"],
    styleGroup: "Street Style / Modern Y2K",
    seasonTarget: "Xuân Hạ",
    colorTone: "Xám khói thời thượng",
    budgetGroup: "300k - 600k",
    occasionGroups: ["Quán cà phê / Hẹn hò", "Dạo phố / Night Out", "Chụp ảnh Lookbook / Nghệ thuật", "Du lịch biển / Resort Look"],
    rentalCount: 18,
    carbonSaved: 1.9,
    waterSaved: 950,
    lifeCycleExtension: 18,
    isAvailable: true,
    ownerName: "Khánh Linh (Kho đồ Vinh)",
    reasonBase: "Cậu kể đi chơi cần thoái mái nhưng vẫn cháy đúng không? Quần suông che khuyết điểm siêu tốt, kết hợp Halter Top khoe khéo bờ vai mảnh mai.",
    initialAccessories: { shoes: "Giày bệt Mule da mềm", bag: "Túi xách kẹp nách Silver", outer: "Cardigan lửng mỏng" },
    alternatives: {
      shoes: ["Giày bệt Mule da mềm", "Sandal dây mảnh", "Sneaker trắng Chunky"],
      bag: ["Túi xách kẹp nách Silver", "Túi Canvas quai đeo", "Túi xách công sở da"],
      outer: ["Cardigan lửng mỏng", "Áo khoác Cropped Jean", "Măng tô dạ đứng phom"]
    }
  }
];

const BODY_SIMILARITY: Record<string, Record<string, number>> = {
  "Hourglass (Đồng hồ cát)": { "Hourglass (Đồng hồ cát)": 1.0, "Pear (Quả lê)": 0.8, "Rectangle (Thước kẻ)": 0.6, "Apple (Quả táo)": 0.5 },
  "Apple (Quả táo)": { "Apple (Quả táo)": 1.0, "Rectangle (Thước kẻ)": 0.7, "Hourglass (Đồng hồ cát)": 0.5, "Pear (Quả lê)": 0.4 },
  "Pear (Quả lê)": { "Pear (Quả lê)": 1.0, "Hourglass (Đồng hồ cát)": 0.8, "Rectangle (Thước kẻ)": 0.5, "Apple (Quả táo)": 0.4 },
  "Rectangle (Thước kẻ)": { "Rectangle (Thước kẻ)": 1.0, "Apple (Quả táo)": 0.7, "Hourglass (Đồng hồ cát)": 0.6, "Pear (Quả lê)": 0.5 },
  "Nam / Unisex": { "Nam / Unisex": 1.0 }
};

const COLOR_COMPATIBILITY: Record<string, Record<string, number>> = {
  "Đen mờ (Matte Black)": { "Đen mờ (Matte Black)": 1.0, "Xám khói thời thượng": 0.9, "Trắng kem (Soft Cream)": 0.8 },
  "Trắng kem (Soft Cream)": { "Trắng kem (Soft Cream)": 1.0, "Xám khói thời thượng": 0.8, "Đen mờ (Matte Black)": 0.8 },
  "Xám khói thời thượng": { "Xám khói thời thượng": 1.0, "Đen mờ (Matte Black)": 0.9, "Trắng kem (Soft Cream)": 0.8 }
};

export default function AIStylistHub() {
  const [outfitPool, setOutfitPool] = useState<Outfit[]>(SEED_OUTFIT_POOL);
  const [dbLoading, setDbLoading] = useState<boolean>(true);

  // States Ma trận ngầm (Bị Chat AI điều khiển)
  const [gender, setGender] = useState("Nữ");
  const [bodyType, setBodyType] = useState("Hourglass (Đồng hồ cát)");
  const [targetStyle, setTargetStyle] = useState("Minimalism / Sporty Chic");
  const [occasion, setOccasion] = useState("Quán cà phê / Hẹn hò");
  const [season, setSeason] = useState("Thu Đông");
  const [favColor, setFavColor] = useState("Đen mờ (Matte Black)");
  const [budget, setBudget] = useState("<300k");

  const [currentStep, setCurrentStep] = useState<"input" | "checkout" | "success">("input");
  const [showResult, setShowResult] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // AI Chat States
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [userInput, setUserInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { id: "1", role: "ai", text: "Chào cậu! Cậu cứ kể tự nhiên nhé, ví dụ: 'Cuối tuần mình đi Đà Lạt với người yêu, dáng mình hơi mũm mĩm xíu...' Mình sẽ hiểu và tự mix đồ cho cậu ngay! ✨" }
  ]);

  const [startDate, setStartDate] = useState("2026-07-01");
  const [endDate, setEndDate] = useState("2026-07-04");
  const [paymentMethod, setPaymentMethod] = useState("VietQR");
  const [isPaying, setIsPaying] = useState(false);

  const [recommendedList, setRecommendedResultList] = useState<RecommendedResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function syncRealData() {
      try {
        const res = await fetch("/api/products");
        const realProducts = await res.json();
        
        if (Array.isArray(realProducts) && realProducts.length > 0) {
          const mappedProducts: Outfit[] = realProducts.map((p: any) => {
            const tagsLower = p.tags ? p.tags.toLowerCase() : "";
            const titleLower = p.title ? p.title.toLowerCase() : "";
            
            const numericPrice = parseInt(p.price.replace(/[^0-9]/g, "")) || 50000;
            const finalPricePerDay = p.price.includes("k") && numericPrice < 1000 ? numericPrice * 1000 : numericPrice;

            const isMen = tagsLower.includes("nam") || tagsLower.includes("unisex") || titleLower.includes("nam");
            const isWinter = tagsLower.includes("đông") || tagsLower.includes("lạnh") || tagsLower.includes("vest") || tagsLower.includes("áo khoác");

            let styleGroup = "Minimalism / Sporty Chic";
            if (tagsLower.includes("y2k") || tagsLower.includes("street")) styleGroup = "Street Style / Modern Y2K";
            else if (tagsLower.includes("vintage") || tagsLower.includes("korean")) styleGroup = "Cozy Vintage / Korean Style";
            else if (tagsLower.includes("luxury") || tagsLower.includes("quiet")) styleGroup = "Classic Luxury / Quiet Luxury";

            let budgetGroup = "<300k";
            if (finalPricePerDay >= 300000 && finalPricePerDay <= 600000) budgetGroup = "300k - 600k";
            else if (finalPricePerDay > 600000) budgetGroup = ">600k";

            return {
              id: p.id,
              name: p.title,
              priceText: p.price.includes("/ ngày") ? p.price : `${p.price} / ngày`,
              pricePerDay: finalPricePerDay,
              depositFee: finalPricePerDay * 2,
              image: p.image,
              genderTarget: isMen ? "Nam / Unisex" : "Nữ",
              suitableBodies: isMen ? ["Nam / Unisex"] : ["Hourglass (Đồng hồ cát)", "Pear (Quả lê)", "Rectangle (Thước kẻ)", "Apple (Quả táo)"],
              styleGroup,
              seasonTarget: isWinter ? "Thu Đông" : "Xuân Hạ",
              colorTone: tagsLower.includes("đen") || titleLower.includes("black") ? "Đen mờ (Matte Black)" : tagsLower.includes("trắng") ? "Trắng kem (Soft Cream)" : "Xám khói thời thượng",
              budgetGroup,
              occasionGroups: ["Quán cà phê / Hẹn hò", "Dạo phố / Night Out", "Đi làm / Công sở thanh lịch", "Du lịch biển / Resort Look"],
              rentalCount: Math.floor(Math.random() * 20) + 15,
              carbonSaved: parseFloat((Math.random() * 2 + 1.5).toFixed(1)),
              waterSaved: Math.floor(Math.random() * 800) + 700,
              lifeCycleExtension: Math.floor(Math.random() * 15) + 10,
              isAvailable: p.condition !== "Maintenance",
              ownerName: "Tủ đồ thành viên CLOOP",
              reasonBase: `Vibe này chuẩn quá cậu ơi! Phom dáng sinh ra là để tối ưu cho phong cách ${styleGroup} cậu đang tìm nè.`,
              initialAccessories: { shoes: "Sneaker trắng", bag: "Túi kẹp nách", outer: "Blazer trơn" },
              alternatives: {
                shoes: ["Sneaker trắng Chunky", "Loafers da bóng", "Giày bệt Mule da mềm"],
                bag: ["Túi kẹp nách Canvas", "Túi đeo chéo Nylon Black", "Túi xách kẹp nách Silver"],
                outer: ["Blazer trơn cộc tay", "Áo khoác Varsity lửng", "Măng tô dạ đứng phom"]
              }
            };
          });

          setOutfitPool([...mappedProducts, ...SEED_OUTFIT_POOL]);
        }
      } catch (err) {
        console.error("Lỗi đồng bộ dữ liệu AI Hub, fallback về Seed Data");
      } finally {
        setDbLoading(false);
      }
    }
    syncRealData();
  }, []);

  // Tự động cuộn xuống cuối khi có tin nhắn Chat mới
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // 🟢 NÂNG CẤP LỚN: HÀM MÔ PHỎNG NLP (Trích xuất từ khóa tự động không cần Token)
  const analyzeUserStory = (text: string) => {
    const lowerText = text.toLowerCase();
    
    let newOccasion = occasion;
    let newSeason = season;
    let newBody = bodyType;
    let newStyle = targetStyle;
    
    // Nhận diện Dịp
    if (lowerText.match(/đà lạt|sapa|du lịch|biển|resort|chơi xa/)) newOccasion = "Du lịch biển / Resort Look";
    if (lowerText.match(/hẹn hò|crush|đi chơi|trà sữa|cà phê|cafe/)) newOccasion = "Quán cà phê / Hẹn hò";
    if (lowerText.match(/công ty|đi làm|thực tập|văn phòng|họp|phỏng vấn/)) newOccasion = "Đi làm / Công sở thanh lịch";
    if (lowerText.match(/bar|quẩy|pub|bay lắc|night/)) newOccasion = "Dạo phố / Night Out";

    // Nhận diện Mùa
    if (lowerText.match(/lạnh|đông|mưa|rét|đà lạt|sapa/)) newSeason = "Thu Đông";
    if (lowerText.match(/nắng|nóng|hè|oi bức|biển/)) newSeason = "Xuân Hạ";

    // Nhận diện Dáng người
    if (lowerText.match(/mập|mũm mĩm|béo|eo to|chubby|tròn/)) newBody = "Apple (Quả táo)";
    if (lowerText.match(/gầy|ốm|nhỏ con|mảnh/)) newBody = "Rectangle (Thước kẻ)";
    if (lowerText.match(/đùi to|hông to|lê/)) newBody = "Pear (Quả lê)";

    // Nhận diện Phong cách
    if (lowerText.match(/cá tính|ngầu|cháy|y2k|hiphop/)) newStyle = "Street Style / Modern Y2K";
    if (lowerText.match(/nàng thơ|bánh bèo|tiểu thư|vintage|nhẹ nhàng|thơ/)) newStyle = "Cozy Vintage / Korean Style";
    if (lowerText.match(/sang chảnh|thanh lịch|quý phái|sang/)) newStyle = "Classic Luxury / Quiet Luxury";

    // Cập nhật State ẩn (để render ra bảng tóm tắt)
    setOccasion(newOccasion);
    setSeason(newSeason);
    setBodyType(newBody);
    setTargetStyle(newStyle);

    // Xuất kho (Gửi thẳng các biến vào để tránh bị kẹt state bất đồng bộ)
    executeWeightedRecommendation(newOccasion, newSeason, newBody, newStyle, gender);
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;
    
    const textToAnalyze = userInput;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text: textToAnalyze };
    setChatHistory(prev => [...prev, userMsg]);
    setUserInput("");

    // AI Hiển thị trạng thái đang gõ
    const aiTypingId = (Date.now() + 1).toString();
    setChatHistory(prev => [...prev, { id: aiTypingId, role: "ai", text: "", isTyping: true }]);

    setTimeout(() => {
      // Bỏ trạng thái typing, thay bằng tin nhắn phản hồi
      setChatHistory(prev => prev.filter(msg => msg.id !== aiTypingId));
      
      let aiResponse = "Oke cậu ơi, gu này mình lo được! Mình đã tự động nhặt các từ khóa phong cách từ câu chuyện của cậu. Đang xuất kho kết quả mượt mà luôn ✨";
      if(textToAnalyze.toLowerCase().includes("crush") || textToAnalyze.toLowerCase().includes("hẹn hò")) {
        aiResponse = "Đi hẹn hò hả? Chuyến này phải cho crush lác mắt luôn! Mình đã chọn ra mấy bộ tông màu cực kì nịnh da và hack dáng, cậu xem bên phải nha! 🥰";
      } else if (textToAnalyze.toLowerCase().match(/đà lạt|lạnh|mưa/)) {
        aiResponse = "Trời lạnh thì mặc layer là chân ái! Mình đã mix & match mấy set đồ ấm áp nhưng lên hình check-in vẫn thơ mộng rạng ngời. Xem thử nhé! 🌲";
      } else if (textToAnalyze.toLowerCase().match(/biển|resort|nắng/)) {
        aiResponse = "Đi biển thì phải vibe bay bổng mát mẻ đúng không! Đợi mình lấy mấy set voan tơ với maxi tung bay trong gió cho cậu coi! 🌊";
      }

      setChatHistory(prev => [...prev, { id: Date.now().toString(), role: "ai", text: aiResponse }]);
      analyzeUserStory(textToAnalyze);
    }, 1800);
  };

  const handleTriggerUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // Giả lập quét ảnh AI
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setChatHistory(prev => [...prev, { id: Date.now().toString(), role: "user", text: `[Đã gửi một ảnh phân tích kiểu dáng]` }]);
      
      const aiTypingId = (Date.now() + 1).toString();
      setChatHistory(prev => [...prev, { id: aiTypingId, role: "ai", text: "", isTyping: true }]);

      setTimeout(() => {
        setChatHistory(prev => prev.filter(msg => msg.id !== aiTypingId));
        setChatHistory(prev => [...prev, { 
          id: Date.now().toString(), 
          role: "ai", 
          text: "🔍 Mắt thần AI của mình vừa quét xong ảnh cậu gửi! Dựa trên chất liệu vải, mình thiết lập ngay style Y2K cá tính cho cậu rồi. Chốt đơn bên phải nha!" 
        }]);
        setTargetStyle("Street Style / Modern Y2K");
        setOccasion("Dạo phố / Night Out");
        executeWeightedRecommendation("Dạo phố / Night Out", season, bodyType, "Street Style / Modern Y2K", gender);
      }, 2500);
    };
    reader.readAsDataURL(file);
  };

  const executeWeightedRecommendation = (
    o = occasion, s = season, b = bodyType, sty = targetStyle, g = gender
  ) => {
    const scoredOutfits = outfitPool.map(outfit => {
      const genderMatch = outfit.genderTarget === g || outfit.genderTarget === "Nam / Unisex" ? 1.0 : 0.1;
      const availabilityScore = outfit.isAvailable ? 1.0 : 0.0;

      const bodyScoreMap = BODY_SIMILARITY[b] || {};
      const bodyMatch = bodyScoreMap[outfit.suitableBodies[0]] || 0.3;
      const styleMatch = outfit.styleGroup === sty ? 1.0 : 0.3;
      const occasionMatch = outfit.occasionGroups.includes(o) ? 1.0 : 0.3;
      const seasonMatch = outfit.seasonTarget === s ? 1.0 : 0.4;

      const popularityScore = Math.min(outfit.rentalCount / 60, 1.0);

      const finalScore = availabilityScore * genderMatch * (
        (0.35 * bodyMatch) + 
        (0.20 * styleMatch) + 
        (0.25 * occasionMatch) + 
        (0.10 * seasonMatch) + 
        (0.10 * popularityScore)
      );

      return { outfit, finalScore };
    });

    scoredOutfits.sort((a, b) => b.finalScore - a.finalScore);
    const validResults = scoredOutfits.filter(item => item.finalScore > 0).slice(0, 3);

    const top3 = validResults.map(candidate => {
      return {
        Outfit: candidate.outfit,
        finalScore: candidate.finalScore,
        confidence: (candidate.finalScore * 100).toFixed(1) + "%",
        selectedShoes: candidate.outfit.initialAccessories.shoes,
        selectedBag: candidate.outfit.initialAccessories.bag,
        selectedOuter: candidate.outfit.initialAccessories.outer
      };
    });

    setRecommendedResultList(top3);
    setActiveIndex(0);
    setShowResult(true);
  };

  const swapAccessory = (type: "shoes" | "bag" | "outer", val: string) => {
    setIsRecalculating(true);
    setTimeout(() => {
      setRecommendedResultList(prevList => {
        const newList = [...prevList];
        const target = { ...newList[activeIndex] };
        target[type === "shoes" ? "selectedShoes" : type === "bag" ? "selectedBag" : "selectedOuter"] = val;
        
        const currentScore = parseFloat(target.confidence);
        const isInitial = val === target.Outfit.initialAccessories[type];
        target.confidence = Math.min(Math.max(isInitial ? currentScore + 2.1 : currentScore - 2.5, 50.0), 99.8).toFixed(1) + "%";
        
        newList[activeIndex] = target;
        return newList;
      });
      setIsRecalculating(false);
    }, 550);
  };

  const calculateDays = (start: string, end: string) => {
    const sDate = new Date(start);
    const eDate = new Date(end);
    const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  };

  const activeResult = recommendedList[activeIndex];
  const rentalDays = calculateDays(startDate, endDate);
  const subtotalPrice = activeResult ? activeResult.Outfit.pricePerDay * rentalDays : 0;
  const depositFee = activeResult ? activeResult.Outfit.depositFee : 0;
  const greenDiscount = 30000; 
  const totalPayment = subtotalPrice + depositFee - greenDiscount;

  const executePayment = () => {
    setIsPaying(true);
    setTimeout(() => {
      setIsPaying(false);
      setCurrentStep("success");
    }, 2000);
  };

  if (dbLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F3] flex flex-col items-center justify-center gap-3">
        <Loader2 size={36} className="animate-spin text-[#183A2D]" />
        <p className="text-xs font-body font-bold text-gray-400 uppercase tracking-widest">Đang kết nối kho dữ liệu AI Stylist...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF8F3] py-12 px-6 lg:px-12 text-[#183A2D] font-body selection:bg-[#183A2D] selection:text-white">
      
      <div className="max-w-[1400px] mx-auto mb-6">
        <button type="button" onClick={() => { if (currentStep !== "input") setCurrentStep("input"); }} className="inline-flex items-center gap-2 font-body text-xs font-bold text-gray-400 hover:text-[#183A2D] transition uppercase tracking-wider">
          <ChevronLeft size={14} /> {currentStep === "input" ? "Quay lại trang chủ" : "Về khung Chat AI"}
        </button>
      </div>

      <div className="max-w-[1400px] mx-auto mb-12 flex items-center justify-center gap-4 sm:gap-8 text-center text-xs font-bold uppercase tracking-wider text-gray-400">
        <div className={`flex items-center gap-2 ${currentStep === "input" ? "text-[#183A2D]" : "text-gray-400"}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${currentStep === "input" ? "bg-[#183A2D] text-white border-[#183A2D]" : "border-gray-300"}`}>1</span>
          <span>Trò chuyện cùng AI</span>
        </div>
        <div className="w-12 h-[1px] bg-gray-200" />
        <div className={`flex items-center gap-2 ${currentStep === "checkout" ? "text-[#183A2D]" : "text-gray-400"}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${currentStep === "checkout" ? "bg-[#183A2D] text-white border-[#183A2D]" : "border-gray-300"}`}>2</span>
          <span>Chọn lịch & Đặt đồ</span>
        </div>
        <div className="w-12 h-[1px] bg-gray-200" />
        <div className={`flex items-center gap-2 ${currentStep === "success" ? "text-[#183A2D]" : "text-gray-400"}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${currentStep === "success" ? "bg-[#183A2D] text-white border-[#183A2D]" : "border-gray-300"}`}>3</span>
          <span>Hóa đơn sinh thái</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {currentStep === "input" && (
          <motion.div key="input-step" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
            
            {/* 🟢 KHU VỰC KHUNG CHAT AI (THAY THẾ FORM CỨNG NHẮC CŨ) */}
            <div className="lg:col-span-5 bg-white border border-[#E9E2D8] rounded-[2.5rem] shadow-sm flex flex-col overflow-hidden" style={{ height: "640px" }}>
              <div className="bg-[#183A2D] px-6 py-5 flex items-center gap-3 text-white shadow-sm z-10">
                <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center border-2 border-emerald-500 shadow-sm relative">
                  <Bot size={20} />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-[#183A2D] rounded-full"></span>
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">CLOOP AI Stylist</h3>
                  <p className="text-[10px] text-emerald-200 font-medium tracking-widest uppercase">Trợ lý Phối đồ Cá nhân</p>
                </div>
              </div>

              {/* Chat History */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#FCFCFB] scroll-smooth" style={{ scrollbarWidth: 'none' }}>
                {chatHistory.map((msg) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    key={msg.id} 
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}
                  >
                    {msg.role === "ai" && (
                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mb-1">
                        <Sparkle size={12} className="text-emerald-700" />
                      </div>
                    )}
                    
                    {msg.isTyping ? (
                      <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1 items-center h-[42px]">
                        <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    ) : (
                      <div className={`px-5 py-3.5 rounded-2xl max-w-[85%] text-[13px] leading-relaxed shadow-sm font-medium ${
                        msg.role === "user" 
                          ? "bg-[#183A2D] text-white rounded-br-none" 
                          : "bg-white border border-gray-100 text-stone-700 rounded-bl-none"
                      }`}>
                        {msg.text}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Tóm tắt Ma Trận (Hiển thị ngầm kết quả AI đã tự bắt) */}
              <div className="px-5 py-3 bg-[#FAF8F3] border-t border-b border-gray-100 flex gap-2 overflow-x-auto items-center" style={{ scrollbarWidth: 'none' }}>
                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-2 py-1 rounded shrink-0">Tags AI thu thập:</span>
                <span className="text-[10px] text-gray-500 bg-white border px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">{occasion}</span>
                <span className="text-[10px] text-gray-500 bg-white border px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">{bodyType}</span>
                <span className="text-[10px] text-gray-500 bg-white border px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">{targetStyle}</span>
                <span className="text-[10px] text-gray-500 bg-white border px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">{season}</span>
              </div>

              {/* Input Khu vực */}
              <div className="p-4 bg-white border-t border-gray-100 flex gap-3 items-end">
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                <button onClick={handleTriggerUpload} title="Tải ảnh lên để AI quét" className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-[#183A2D] hover:bg-emerald-50 transition shrink-0 border border-gray-200">
                  <Camera size={18} />
                </button>
                <div className="flex-1 bg-gray-50 rounded-3xl border border-gray-200 p-1 flex items-end focus-within:border-[#183A2D] transition-colors shadow-inner">
                  <textarea 
                    value={userInput} 
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    placeholder="Kể cho AI nghe nhu cầu của cậu..." 
                    className="w-full bg-transparent border-none outline-none resize-none px-4 py-3.5 text-xs text-stone-700 min-h-[48px] max-h-[120px]"
                    rows={1}
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!userInput.trim()} 
                    className="w-10 h-10 bg-[#183A2D] text-white rounded-full flex items-center justify-center shrink-0 mb-1 mr-1 disabled:opacity-50 disabled:cursor-not-allowed transition hover:bg-emerald-900 shadow-md"
                  >
                    <Send size={14} className="ml-0.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* CỘT KẾT QUẢ ĐỒ TỪ SUPABASE */}
            <div className="lg:col-span-7 space-y-6">
              <div className="w-full min-h-[640px] bg-white border border-[#E9E2D8] rounded-[2.5rem] shadow-sm relative flex flex-col items-center justify-center p-8 overflow-hidden">
                
                {showResult && activeResult ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative">
                    {isRecalculating && (
                      <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-20 rounded-2xl">
                        <RefreshCw size={16} className="animate-spin text-[#183A2D]" />
                      </div>
                    )}
                    
                    <div className="md:col-span-5 space-y-3 mx-auto w-full max-w-[240px]">
                      <div className="w-full aspect-[3/4] bg-[#FAF8F3] rounded-[2rem] border border-[#E9E2D8] overflow-hidden relative shadow-sm">
                        <Image src={activeResult.Outfit.image} alt={activeResult.Outfit.name} fill className="object-cover object-top" sizes="240px" unoptimized />
                      </div>
                      <div className="text-center">
                        <span className="text-[9px] uppercase tracking-widest font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-100">{activeIndex === 0 ? "🏆 AI Đề Cử Chuẩn Nhất" : `Gợi ý thứ #${activeIndex + 1}`}</span>
                        <h5 className="text-xs font-bold text-[#183A2D] line-clamp-1 mt-2">{activeResult.Outfit.name}</h5>
                        <p className="text-[11px] font-bold text-[#6BA37A] mt-0.5">{activeResult.Outfit.priceText}</p>
                      </div>
                    </div>

                    <div className="md:col-span-7 space-y-5 text-left">
                      <div className="bg-gradient-to-br from-[#183A2D] to-emerald-900 text-white p-5 rounded-2xl shadow-md">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300 flex items-center gap-1"><Sparkles size={12} /> AI Phân Tích Logic</span>
                          <span className="text-xs font-bold font-heading text-white">{activeResult.confidence} Match</span>
                        </div>
                        <p className="text-[12px] text-emerald-50 leading-relaxed font-medium">"{activeResult.Outfit.reasonBase}"</p>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Đề xuất Mix & Match phụ kiện đi kèm</h4>
                        <div className="space-y-1">
                          <p className="text-[10px] font-medium text-gray-400">👟 Giày: <strong className="text-[#183A2D]">{activeResult.selectedShoes}</strong></p>
                          <div className="flex gap-1.5 flex-wrap">
                            {activeResult.Outfit.alternatives.shoes.map((s) => (
                              <button key={s} type="button" onClick={() => swapAccessory("shoes", s)} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition ${activeResult.selectedShoes === s ? "bg-[#183A2D] text-white border-[#183A2D] font-bold shadow-sm" : "bg-gray-50 text-gray-500 border-gray-100 hover:border-gray-300"}`}>{s}</button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-medium text-gray-400">👜 Túi xách: <strong className="text-[#183A2D]">{activeResult.selectedBag}</strong></p>
                          <div className="flex gap-1.5 flex-wrap">
                            {activeResult.Outfit.alternatives.bag.map((b) => (
                              <button key={b} type="button" onClick={() => swapAccessory("bag", b)} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition ${activeResult.selectedBag === b ? "bg-[#183A2D] text-white border-[#183A2D] font-bold shadow-sm" : "bg-gray-50 text-gray-500 border-gray-100 hover:border-gray-300"}`}>{b}</button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button type="button" onClick={() => setCurrentStep("checkout")} className="w-full bg-[#183A2D] text-white py-3.5 rounded-full font-body font-bold uppercase tracking-widest text-[10px] hover:bg-[#254F3B] transition shadow-md flex items-center justify-center gap-2">
                        Xác nhận mượn set đồ này <ArrowRight size={12} />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="text-center space-y-3 max-w-[280px]">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner border border-emerald-100">
                      <Shirt size={28} className="text-emerald-700" />
                    </div>
                    <h4 className="text-sm font-bold text-stone-800 uppercase tracking-widest">Góc Lên Đồ AI</h4>
                    <p className="text-xs font-medium text-gray-400 leading-relaxed">
                      Hãy nhắn cho AI biết cậu sắp đi đâu, vóc dáng ra sao ở khung chat bên trái. Cứ viết tự nhiên nha, AI tự bắt từ khóa đỉnh lắm đó! ✨
                    </p>
                  </div>
                )}
              </div>

              {showResult && recommendedList.length > 1 && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {recommendedList.map((res, index) => (
                    <div key={index} onClick={() => setActiveIndex(index)} className={`p-3 bg-white border rounded-2xl cursor-pointer transition flex items-center gap-3 shadow-sm ${activeIndex === index ? "border-[#183A2D] border-2 bg-emerald-50/30" : "border-[#E9E2D8] opacity-80 hover:opacity-100 hover:border-emerald-300"}`}>
                      <div className="w-10 h-12 relative bg-gray-50 rounded-lg overflow-hidden shrink-0"><Image src={res.Outfit.image} alt="Thumb" fill className="object-cover object-top" sizes="40px" unoptimized /></div>
                      <div className="truncate leading-none text-left">
                        <p className="text-[9px] font-bold text-amber-600 mb-1">{res.confidence} Match</p>
                        <h6 className="text-[10px] font-bold text-[#183A2D] truncate">{res.Outfit.name}</h6>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {currentStep === "checkout" && activeResult && (
          <motion.div key="checkout-step" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative text-left">
            
            {isPaying && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-[2.5rem]">
                <RefreshCw size={28} className="animate-spin text-[#183A2D] mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest text-[#183A2D]">Đang xác thực cổng thanh toán an toàn...</p>
              </div>
            )}

            <div className="md:col-span-6 bg-white border border-[#E9E2D8] p-8 rounded-[2.5rem] shadow-sm space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <Calendar size={16} className="text-[#6BA37A]" />
                <h3 className="text-xs font-bold uppercase tracking-wider">1. Thiết lập chu kỳ lịch thuê</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Ngày nhận đồ</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} min="2026-07-01" className="w-full px-4 py-3 border border-gray-100 bg-[#FAF8F3] rounded-xl text-xs font-bold outline-none text-[#183A2D] focus:border-[#183A2D] cursor-pointer" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Ngày trả đồ</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} className="w-full px-4 py-3 border border-gray-100 bg-[#FAF8F3] rounded-xl text-xs font-bold outline-none text-[#183A2D] focus:border-[#183A2D] cursor-pointer" />
                </div>
              </div>

              <div className="bg-[#FAFBF9] border border-[#E1EADF] p-4 rounded-xl flex items-center justify-between text-xs font-bold">
                <span className="text-gray-400 uppercase tracking-wider text-[10px]">Tổng số ngày thuê:</span>
                <span className="text-[#1B5E20] font-body bg-white border border-[#C8DCC8] px-3 py-1 rounded-md">{rentalDays} Ngày chu kỳ</span>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1"><CreditCard size={12} /> 2. Cổng thanh toán</label>
                <div className="space-y-2">
                  {[
                    { id: "VietQR", name: "Chuyển khoản nhanh quét mã VietQR", desc: "Tự động xuất mã QR ngân hàng miễn phí" },
                    { id: "MoMo", name: "Ví điện tử MoMo / ZaloPay", desc: "Ví điện tử một chạm siêu tốc" },
                    { id: "COD", name: "Thanh toán khi nhận đồ (COD)", desc: "Nhận đồ rùi gửi tiền cho Shipper nhé" }
                  ].map((pay) => (
                    <div key={pay.id} onClick={() => setPaymentMethod(pay.id)} className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between bg-white ${paymentMethod === pay.id ? "border-[#183A2D] bg-[#FAF8F3]" : "border-gray-50 hover:border-gray-200"}`}>
                      <div className="leading-tight">
                        <p className="text-xs font-bold text-[#183A2D]">{pay.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{pay.desc}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMethod === pay.id ? "border-[#183A2D]" : "border-gray-300"}`}>{paymentMethod === pay.id && <span className="w-2 h-2 rounded-full bg-[#183A2D]" />}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="md:col-span-6 bg-white border border-[#E9E2D8] p-8 rounded-[2.5rem] shadow-sm flex flex-col justify-between min-h-[480px]">
              <div>
                <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-5">
                  <ClipboardCheck size={16} className="text-[#6BA37A]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">3. Chi tiết hóa đơn thanh toán</h3>
                </div>

                <div className="flex items-center gap-4 bg-[#FAF8F3] border border-gray-100 p-4 rounded-2xl mb-6">
                  <div className="w-12 h-16 relative bg-gray-100 rounded-lg overflow-hidden border border-[#E9E2D8] shrink-0"><Image src={activeResult.Outfit.image} alt="Thumb" fill className="object-cover object-top" sizes="48px" unoptimized /></div>
                  <div className="leading-tight truncate">
                    <h4 className="text-xs font-bold text-[#183A2D] truncate">{activeResult.Outfit.name}</h4>
                    <p className="text-[10px] text-gray-400 font-semibold mt-1">Giày: {activeResult.selectedShoes} • Túi: {activeResult.selectedBag}</p>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs border-b border-gray-100 pb-5 text-gray-500 font-medium">
                  <div className="flex justify-between">
                    <span>Chi phí giá thuê cơ bản ({activeResult.Outfit.priceText} × {rentalDays} ngày)</span>
                    <span className="text-[#183A2D] font-bold">{subtotalPrice.toLocaleString()}đ</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">Tiền đặt cọc bảo đảm đồ <span className="text-[9px] font-bold text-sky-700 bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded">Hoàn lại 100%</span></span>
                    <span className="text-[#183A2D] font-bold">+{depositFee.toLocaleString()}đ</span>
                  </div>
                  <div className="flex justify-between text-[#1B5E20]">
                    <span>🌱 Voucher ưu đãi thành viên xanh</span>
                    <span className="font-bold">-{greenDiscount.toLocaleString()}đ</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 mb-8">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#183A2D]">Tổng thanh toán thực tế:</span>
                  <div className="text-right">
                    <span className="text-2xl font-heading font-bold text-[#183A2D]">{totalPayment.toLocaleString()}đ</span>
                    <p className="text-[9px] text-gray-400 mt-0.5 font-medium">(Đã bao gồm chi phí hoàn cọc bảo hiểm)</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button type="button" onClick={executePayment} className="w-full bg-[#183A2D] text-white py-4 rounded-full font-body font-bold uppercase tracking-widest text-xs hover:bg-[#254F3B] transition shadow-md flex items-center justify-center gap-2">
                  <ShieldCheck size={14} /> Xác nhận và đặt thuê outfit ngay
                </button>
                <p className="text-[10px] text-center text-gray-400 leading-normal max-w-[340px] mx-auto font-medium">Bấm đặt thuê đồng nghĩa cậu đã chấp thuận điều khoản bảo mật thông tin mã nguồn và quy chuẩn giặt ủi tuần hoàn của CLOOP.</p>
              </div>
            </div>
          </motion.div>
        )}

        {currentStep === "success" && activeResult && (
          <motion.div key="success-step" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="max-w-[500px] mx-auto bg-white border border-[#E9E2D8] p-8 rounded-[3rem] shadow-2xl text-center relative overflow-hidden group">
            
            <div className="w-16 h-16 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <CheckCircle size={32} className="animate-bounce" />
            </div>

            <h3 className="font-heading text-3xl font-bold text-[#183A2D] tracking-wide uppercase">GIAO DỊCH THÀNH CÔNG</h3>
            <p className="font-body text-[11px] font-bold text-[#6BA37A] uppercase tracking-widest mt-1">Hóa đơn xanh mã đơn: #CLP-2026-79A</p>
            
            <p className="font-body text-xs text-gray-500 mt-4 leading-relaxed max-w-[360px] mx-auto">
              Yêu cầu thuê trang phục của cậu đã được gửi tự động đến chủ tủ đồ **{activeResult.Outfit.ownerName}**. Vui lòng kiểm tra thông báo ứng dụng để nhận mã vận đơn vận chuyển.
            </p>

            <div className="bg-[#FAFBF9] border border-[#E1EADF] rounded-2xl p-5 mt-6 border-dashed text-left">
              <h4 className="text-[10px] font-bold text-[#1B5E20] uppercase tracking-wider mb-3 flex items-center gap-1"><Leaf size={12} /> Tác động tích lũy xanh của đơn hàng:</h4>
              
              <div className="space-y-2.5 text-xs text-gray-600 font-medium">
                <div className="flex justify-between items-center bg-white border border-gray-50 p-2.5 rounded-xl shadow-inner">
                  <span className="text-gray-400 font-bold text-[10px] uppercase">Lượng khí thải giảm thiểu:</span>
                  <span className="text-[#1B5E20] font-bold">-{activeResult.Outfit.carbonSaved.toFixed(1)} kg CO₂</span>
                </div>
                <div className="flex justify-between items-center bg-white border border-gray-50 p-2.5 rounded-xl shadow-inner">
                  <span className="text-gray-400 font-bold text-[10px] uppercase">Nguồn nước sạch tiết kiệm:</span>
                  <span className="text-sky-700 font-bold">-{activeResult.Outfit.waterSaved.toLocaleString()} Lít nước</span>
                </div>
                <div className="flex justify-between items-center bg-white border border-gray-50 p-2.5 rounded-xl shadow-inner">
                  <span className="text-gray-400 font-bold text-[10px] uppercase">Kéo dài vòng đời trang phục:</span>
                  <span className="text-amber-700 font-bold">+{activeResult.Outfit.lifeCycleExtension} Chu kỳ thuê tuần hoàn</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-100 flex flex-col gap-3">
              <button type="button" onClick={() => { setCurrentStep("input"); setShowResult(false); setChatHistory([{ id: "1", role: "ai", text: "Chào cậu! Cậu cứ kể tự nhiên nhé, ví dụ: 'Cuối tuần mình đi Đà Lạt với người yêu, dáng mình hơi mũm mĩm xíu...' Mình sẽ hiểu và tự mix đồ cho cậu ngay! ✨" }]); setUserInput(""); }} className="w-full bg-[#183A2D] text-white py-3.5 rounded-full font-body font-bold uppercase tracking-widest text-[10px] hover:bg-[#254F3B] transition shadow-sm">
                Quay lại Chat cùng AI Stylist
              </button>
              <Link href="/" className="font-body text-[11px] font-semibold text-gray-400 hover:text-[#183A2D] transition underline underline-offset-4">
                Quay về trang chủ mua sắm
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}