"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { 
  Zap, 
  X, 
  Check, 
  QrCode, 
  Leaf, 
  Wallet,
  Clock, 
  Copy, 
  CheckCircle2, 
  Loader2, 
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { 
  createBoostPayOSPaymentAction, 
  checkBoostPaymentStatusAction, 
  boostWithCoinsAction,
  boostWithWalletBalanceAction,
  getMyClosetItemsForBoostAction
} from "@/app/actions/boost";

function calculateBoostPrice(hours: number): { amountVnd: number; coins: number; label: string; discountVnd: number } {
  const safeHours = Math.max(1, Math.round(hours));
  if (safeHours === 24) {
    return { amountVnd: 10000, coins: 20, label: "Gói 24h (1 Ngày)", discountVnd: 2000 };
  }
  if (safeHours === 72) {
    return { amountVnd: 25000, coins: 50, label: "Gói 3 Ngày (72h)", discountVnd: 11000 };
  }
  if (safeHours === 168) {
    return { amountVnd: 50000, coins: 100, label: "Gói 7 Ngày (168h)", discountVnd: 34000 };
  }
  return { amountVnd: safeHours * 500, coins: safeHours, label: `${safeHours} Giờ`, discountVnd: 0 };
}

export interface BoostableItem {
  id: string;
  title: string;
  image: string;
  size?: string;
  rentalPrice?: number;
  salePrice?: number;
  boostExpiresAt?: string | null;
  isBoostActive?: boolean;
  boostRemainingHours?: number;
  boostScore?: number;
}

interface BoostListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BoostableItem[];
  preSelectedItemId?: string;
  userCoins?: number;
  walletBalance?: number;
  clientUserId?: string;
  onSuccess?: (productId: string, newExpiresAt: string, newCoins?: number, addedCoins?: number) => void;
}

const PRESET_PACKAGES = [
  { 
    hours: 24, 
    coins: 20,
    label: "24 Giờ", 
    priceVnd: 10000, 
    origPriceVnd: 12000, 
    origCoins: 24,
    discountPercent: 17, 
    discountText: "Tiết kiệm 4 Lá (2.000đ)", 
    tag: "Khởi đầu" 
  },
  { 
    hours: 72, 
    coins: 50,
    label: "3 Ngày", 
    priceVnd: 25000, 
    origPriceVnd: 36000, 
    origCoins: 72,
    discountPercent: 31, 
    discountText: "Tiết kiệm 22 Lá (11.000đ)", 
    tag: "Phổ biến" 
  },
  { 
    hours: 168, 
    coins: 100,
    label: "7 Ngày", 
    priceVnd: 50000, 
    origPriceVnd: 84000, 
    origCoins: 168,
    discountPercent: 40, 
    discountText: "Tiết kiệm 68 Lá (34.000đ)", 
    tag: "Tối ưu nhất" 
  },
];

export default function BoostListingModal({
  isOpen,
  onClose,
  items = [],
  preSelectedItemId,
  userCoins = 0,
  walletBalance = 0,
  clientUserId,
  onSuccess
}: BoostListingModalProps) {
  const [displayItems, setDisplayItems] = useState<BoostableItem[]>(items || []);
  const [selectedItemId, setSelectedItemId] = useState<string>(preSelectedItemId || items[0]?.id || "");
  const [packageType, setPackageType] = useState<number | "custom">(24);
  const [customHours, setCustomHours] = useState<number>(12);

  // Mặc định chọn trừ Điểm Lá nếu tài khoản có đủ Lá (1 chạm tức thì, không cần quét)
  const [payMethod, setPayMethod] = useState<"COINS" | "WALLET" | "VIETQR">("COINS");

  // QR Screen state
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(900); // 15 mins

  const activeHours = packageType === "custom" ? Math.max(1, customHours) : Number(packageType);
  const priceInfo = calculateBoostPrice(activeHours);
  const selectedItem = displayItems.find((i) => i.id === selectedItemId);

  // Sync prop items
  useEffect(() => {
    if (items && items.length > 0) {
      setDisplayItems(items);
    }
  }, [items]);

  // Tự động tải đồ tủ thật của user nếu chưa có
  useEffect(() => {
    if (isOpen && (!displayItems || displayItems.length === 0)) {
      getMyClosetItemsForBoostAction(clientUserId).then((res) => {
        if (res.success && res.items && res.items.length > 0) {
          setDisplayItems(res.items);
          if (!selectedItemId) {
            setSelectedItemId(res.items[0].id);
          }
        }
      }).catch(() => {});
    }
  }, [isOpen, displayItems, clientUserId, selectedItemId]);

  // Sync pre-selected item & default payment method
  useEffect(() => {
    if (preSelectedItemId) {
      setSelectedItemId(preSelectedItemId);
    } else if (displayItems.length > 0 && !selectedItemId) {
      setSelectedItemId(displayItems[0].id);
    }
  }, [preSelectedItemId, displayItems, selectedItemId]);

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setPaymentData(null);
      setIsPaidSuccess(false);
      setErrorMessage(null);
      setCountdown(900);
      // Ưu tiên chọn trừ Điểm Lá nếu có sẵn trong ví
      if (userCoins >= priceInfo.coins) {
        setPayMethod("COINS");
      } else if (walletBalance >= priceInfo.amountVnd) {
        setPayMethod("WALLET");
      } else {
        setPayMethod("VIETQR");
      }
    }
  }, [isOpen, userCoins, walletBalance, priceInfo.coins, priceInfo.amountVnd]);

  // Copy to clipboard helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Real-time VietQR Polling (1.5s interval)
  useEffect(() => {
    if (!paymentData?.orderCode || isPaidSuccess) return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const res = await checkBoostPaymentStatusAction(paymentData.orderCode);
        if (isSubscribed && res.success && res.status === "PAID") {
          clearInterval(interval);
          setIsPaidSuccess(true);
          if (onSuccess && selectedItemId) {
            onSuccess(selectedItemId, res.boostExpiresAt || "", userCoins, res.addedCoins || priceInfo.coins);
          }
          setTimeout(() => {
            onClose();
          }, 2500);
        }
      } catch (err) {
        console.warn("Polling error:", err);
      }
    }, 1500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [paymentData, isPaidSuccess, selectedItemId, userCoins, priceInfo.coins, onSuccess, onClose]);

  // Countdown timer for VietQR
  useEffect(() => {
    if (!paymentData || isPaidSuccess) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [paymentData, isPaidSuccess]);

  // Handle Pay Action
  const handleProceed = async () => {
    if (!selectedItemId) {
      setErrorMessage("Vui lòng chọn 1 trang phục để đẩy.");
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);

    // 1. THANH TOÁN BẰNG ĐIỂM LÁ
    if (payMethod === "COINS") {
      try {
        const res = await boostWithCoinsAction({
          productId: selectedItemId,
          hours: activeHours,
          clientUserId
        });

        if (res.success) {
          setIsPaidSuccess(true);
          if (onSuccess) {
            onSuccess(selectedItemId, res.boostExpiresAt || "", res.newBalance, res.addedCoins || priceInfo.coins);
          }
          setTimeout(() => {
            onClose();
          }, 2000);
        } else {
          setErrorMessage(res.error || "Không đủ Lá trong ví.");
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Giao dịch lỗi.");
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // 2. THANH TOÁN BẰNG VÍ TIỀN CLOOP
    if (payMethod === "WALLET") {
      try {
        const res = await boostWithWalletBalanceAction({
          productId: selectedItemId,
          hours: activeHours,
          clientUserId
        });

        if (res.success) {
          setIsPaidSuccess(true);
          if (onSuccess) {
            onSuccess(selectedItemId, res.boostExpiresAt || "", userCoins, res.addedCoins || priceInfo.coins);
          }
          setTimeout(() => {
            onClose();
          }, 2000);
        } else {
          setErrorMessage(res.error || "Số dư ví không đủ.");
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Giao dịch lỗi.");
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // 3. TẠO MÃ VIETQR CHUYỂN KHOẢN NGÂN HÀNG
    try {
      const res = await createBoostPayOSPaymentAction({
        productId: selectedItemId,
        hours: activeHours,
        clientUserId
      });

      if (res.success) {
        setPaymentData(res);
      } else {
        setErrorMessage(res.error || "Không thể tạo mã chuyển khoản.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Lỗi khởi tạo thanh toán.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#183A2D] text-white flex items-center justify-center shadow-xs">
              <Zap size={15} />
            </div>
            <div>
              <h3 className="font-heading font-black text-sm text-[#183A2D] uppercase tracking-wide">
                Đẩy Bài Lên Top
              </h3>
              <p className="text-[10.5px] text-stone-500 font-light">
                Ưu tiên vị trí đầu trang chủ &amp; sàn đồ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-200/70 hover:bg-stone-300 text-stone-600 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
          {/* MÀN HÌNH THÀNH CÔNG */}
          {isPaidSuccess ? (
            <div className="py-8 text-center space-y-3 animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-full bg-stone-100 text-[#183A2D] flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 size={36} />
              </div>
              <h4 className="font-heading font-black text-base text-[#183A2D]">
                ĐÃ ĐẨY BÀI THÀNH CÔNG!
              </h4>
              <p className="text-xs text-stone-600 max-w-xs mx-auto">
                Món đồ <strong>{selectedItem?.title}</strong> đã được đưa lên vị trí ưu tiên đầu sàn ({priceInfo.label}).
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-100 text-[#183A2D] rounded-full font-bold text-[11px] border border-stone-200">
                <Leaf size={12} className="text-emerald-700" />
                <span>+{(priceInfo.coins)} Lá đua Top (Tổng: {(selectedItem?.boostScore || 0) + priceInfo.coins} Lá)</span>
              </div>
            </div>
          ) : paymentData ? (
            /* MÀN HÌNH CHUYỂN KHOẢN NGÂN HÀNG (VIETQR CHUẨN) */
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Trạng thái đếm lùi */}
              <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3 flex items-center justify-between text-stone-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-700" />
                  <span className="font-bold text-[11.5px] text-stone-800">
                    Đang chờ quét mã chuyển khoản
                  </span>
                </div>
                <span className="font-mono font-bold text-[11px] text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-stone-200">
                  {formatCountdown(countdown)}
                </span>
              </div>

              {/* Ảnh VietQR chuẩn nét */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col items-center justify-center">
                <div className="relative w-56 h-56 bg-white rounded-2xl p-2 border border-stone-200 shadow-sm flex items-center justify-center overflow-hidden">
                  <img
                    src={paymentData.qrCodeUrl}
                    alt="Mã VietQR Chuyển Khoản"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://img.vietqr.io/image/970416-LOCCASS000340028-compact2.png?amount=${paymentData.amountVnd}&addInfo=${encodeURIComponent(paymentData.description)}&accountName=CLOOP%20VIETNAM`;
                    }}
                  />
                </div>
                <p className="text-[10.5px] text-stone-500 mt-2 text-center">
                  Mở ứng dụng ngân hàng bất kỳ để quét mã
                </p>
              </div>

              {/* Thông tin chuyển khoản & Nút Copy */}
              <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3.5 space-y-2 text-[11px]">
                <div className="flex items-center justify-between py-1 border-b border-stone-200/60">
                  <span className="text-stone-500">Số tiền:</span>
                  <div className="flex items-center gap-1.5 font-bold font-mono text-sm text-[#183A2D]">
                    <span>{paymentData.amountVnd.toLocaleString("vi-VN")}đ</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(String(paymentData.amountVnd), "amount")}
                      className="text-stone-400 hover:text-stone-800"
                    >
                      {copiedKey === "amount" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-stone-200/60">
                  <span className="text-stone-500">Nội dung chuyển:</span>
                  <div className="flex items-center gap-1.5 font-bold font-mono text-stone-900">
                    <span>{paymentData.description}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(paymentData.description, "desc")}
                      className="text-stone-400 hover:text-stone-800"
                    >
                      {copiedKey === "desc" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-stone-200/60">
                  <span className="text-stone-500">Số tài khoản:</span>
                  <div className="flex items-center gap-1.5 font-bold font-mono text-stone-900">
                    <span>{paymentData.accountNumber}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(paymentData.accountNumber, "stk")}
                      className="text-stone-400 hover:text-stone-800"
                    >
                      {copiedKey === "stk" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-stone-500">Ngân hàng:</span>
                  <span className="font-bold text-stone-800">VietinBank ({paymentData.accountName})</span>
                </div>
              </div>

              {/* Nút thao tác nhanh */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPaymentData(null)}
                  className="py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition text-center cursor-pointer"
                >
                  Quay lại
                </button>
                {paymentData.checkoutUrl ? (
                  <a
                    href={paymentData.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 px-4 bg-[#183A2D] hover:bg-[#112a20] text-white rounded-xl font-bold transition flex items-center justify-center gap-1.5 text-center shadow-xs"
                  >
                    <ExternalLink size={13} />
                    <span>Mở App Ngân Hàng Thanh Toán</span>
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            /* SCREEN 0: CHỌN ĐỒ + CHỌN GÓI + PHƯƠNG THỨC THANH TOÁN */
            <div className="space-y-4">
              {/* 1. DÃY BÀI CẦN ĐẨY */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800 text-[11.5px] uppercase tracking-wider">
                    1. Chọn bài cần đẩy ({displayItems.length} món)
                  </span>
                  {selectedItem?.isBoostActive && (
                    <span className="text-[10px] text-[#183A2D] bg-stone-100 px-2.5 py-0.5 rounded-full font-bold border border-stone-200">
                      ⚡ Đang Top: {(selectedItem.boostScore || 0)} Lá • Còn {selectedItem.boostRemainingHours}h (sẽ cộng dồn)
                    </span>
                  )}
                </div>

                {displayItems.length === 0 ? (
                  <div className="p-4 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-center text-stone-500">
                    Tủ đồ chưa có trang phục nào để đẩy bài.
                  </div>
                ) : (
                  <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
                    {displayItems.map((item) => {
                      const isSelected = item.id === selectedItemId;
                      const hasActiveBoost = item.isBoostActive;

                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItemId(item.id)}
                          className={`relative shrink-0 w-28 rounded-2xl p-2 border transition-all cursor-pointer text-left ${
                            isSelected
                              ? "bg-emerald-50/70 border-[#183A2D] ring-2 ring-[#183A2D]/20 shadow-xs"
                              : "bg-white border-stone-200 hover:border-stone-300"
                          }`}
                        >
                          <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-stone-100 mb-1.5">
                            <Image
                              src={item.image}
                              alt={item.title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                            {hasActiveBoost && (
                              <div className="absolute top-1 left-1 bg-[#183A2D] text-white font-bold text-[8px] px-1.5 py-0.5 rounded shadow-xs tracking-wider uppercase">
                                TOP
                              </div>
                            )}
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#183A2D] text-white flex items-center justify-center">
                                <Check size={10} strokeWidth={3} />
                              </div>
                            )}
                          </div>

                          <h5 className="font-bold text-[11px] text-stone-900 truncate" title={item.title}>
                            {item.title}
                          </h5>
                          <div className="flex items-center justify-between text-[10px] mt-0.5">
                            <span className="text-emerald-800 font-bold truncate">
                              {item.rentalPrice ? `${item.rentalPrice.toLocaleString("vi-VN")}đ` : "Thuê"}
                            </span>
                            {(item.boostScore || 0) > 0 && (
                              <span className="text-[9px] font-bold text-[#183A2D] bg-stone-100 px-1 py-0.2 rounded font-mono shrink-0">
                                {item.boostScore} Lá
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. CHỌN GÓI ĐẨY - ĐIỂM NHẤN ĐẲNG CẤP & TIẾT KIỆM % MÀU ĐỎ NỔI BẬT */}
              <div className="space-y-1.5">
                <span className="font-bold text-stone-800 text-[11.5px] uppercase tracking-wider block">
                  2. Chọn gói đẩy top
                </span>

                <div className="grid grid-cols-3 gap-2">
                  {PRESET_PACKAGES.map((pkg) => {
                    const isSelected = packageType === pkg.hours;
                    return (
                      <button
                        key={pkg.hours}
                        type="button"
                        onClick={() => setPackageType(pkg.hours)}
                        className={`p-3 rounded-2xl border text-center transition cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? "bg-[#183A2D] text-white border-[#183A2D] shadow-md ring-2 ring-[#183A2D]/20"
                            : "bg-white text-stone-800 border-stone-200 hover:border-stone-300 shadow-2xs"
                        }`}
                      >
                        {/* BADGE GIẢM % MÀU ĐỎ NỔI BẬT ĐẲNG CẤP */}
                        <div className="absolute -top-2 -right-1 z-10">
                          <span className="bg-[#C92A2A] text-white font-bold text-[9px] px-1.5 py-0.5 rounded shadow-xs tracking-tight">
                            -{pkg.discountPercent}%
                          </span>
                        </div>

                        <div>
                          <span className={`text-[9px] font-bold uppercase tracking-wider block ${isSelected ? "text-stone-300" : "text-stone-400"}`}>
                            {pkg.tag}
                          </span>
                          <span className="font-heading font-black text-sm block mt-0.5">
                            {pkg.label}
                          </span>
                        </div>

                        <div className="mt-1.5">
                          <div className="flex items-center justify-center gap-1">
                            <span className={`font-mono text-[10px] line-through ${isSelected ? "text-white/60" : "text-stone-400"}`}>
                              {pkg.origPriceVnd.toLocaleString("vi-VN")}đ
                            </span>
                          </div>
                          <span className={`font-mono font-black text-sm block ${isSelected ? "text-white" : "text-[#183A2D]"}`}>
                            {pkg.coins} Lá
                          </span>
                          <span className={`text-[10px] font-bold block ${isSelected ? "text-stone-200" : "text-stone-600"}`}>
                            ({pkg.priceVnd.toLocaleString("vi-VN")}đ)
                          </span>
                          <span className={`text-[9.5px] font-medium block mt-0.5 ${isSelected ? "text-red-200" : "text-[#C92A2A]"}`}>
                            {pkg.discountText}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* TỰ NHẬP SỐ GIỜ (1H = 500Đ = 1 LÁ) */}
                <div 
                  onClick={() => setPackageType("custom")}
                  className={`mt-2 p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    packageType === "custom"
                      ? "bg-emerald-50/80 border-[#183A2D] ring-2 ring-[#183A2D]/20 shadow-xs"
                      : "bg-stone-50 border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div>
                    <span className="font-bold text-xs text-stone-900 block">
                      Tự nhập số giờ tùy ý
                    </span>
                    <span className="text-[10px] text-stone-500 font-light">
                      1 giờ = 1 Lá = 500đ (Cộng dồn đua Top)
                    </span>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        setPackageType("custom");
                        setCustomHours((prev) => Math.max(1, prev - 1));
                      }}
                      className="w-7 h-7 rounded-lg bg-white border border-stone-300 text-stone-700 font-bold flex items-center justify-center hover:bg-stone-100"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={720}
                      value={customHours}
                      onChange={(e) => {
                        setPackageType("custom");
                        setCustomHours(Math.max(1, parseInt(e.target.value) || 1));
                      }}
                      className="w-14 text-center py-1 bg-white border border-stone-300 rounded-lg font-mono font-bold text-xs text-stone-900 focus:outline-[#183A2D]"
                    />
                    <span className="text-[11px] font-bold text-stone-600">giờ</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPackageType("custom");
                        setCustomHours((prev) => prev + 1);
                      }}
                      className="w-7 h-7 rounded-lg bg-white border border-stone-300 text-stone-700 font-bold flex items-center justify-center hover:bg-stone-100"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. PHƯƠNG THỨC THANH TOÁN */}
              <div className="space-y-1.5">
                <span className="font-bold text-stone-800 text-[11.5px] uppercase tracking-wider block">
                  3. Phương thức thanh toán
                </span>

                <div className="space-y-2">
                  {/* TÙY CHỌN 1: DÙNG ĐIỂM LÁ */}
                  <button
                    type="button"
                    onClick={() => setPayMethod("COINS")}
                    className={`w-full p-3 rounded-2xl border flex items-center justify-between transition cursor-pointer text-left ${
                      payMethod === "COINS"
                        ? "bg-emerald-50 border-[#183A2D] ring-2 ring-[#183A2D]/20 shadow-xs"
                        : "bg-white border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                        <Leaf size={16} />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-stone-900 block">Ví Điểm Lá</span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          Số dư: {userCoins.toLocaleString("vi-VN")} Lá
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-xs text-emerald-800 font-mono">
                      -{priceInfo.coins} Lá
                    </span>
                  </button>

                  {/* TÙY CHỌN 2: TRỪ TỪ VÍ TIỀN CLOOP */}
                  {walletBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setPayMethod("WALLET")}
                      className={`w-full p-3 rounded-2xl border flex items-center justify-between transition cursor-pointer text-left ${
                        payMethod === "WALLET"
                          ? "bg-emerald-50 border-[#183A2D] ring-2 ring-[#183A2D]/20 shadow-xs"
                          : "bg-white border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#183A2D] text-white flex items-center justify-center shrink-0">
                          <Wallet size={16} />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-stone-900 block">Ví Tiền CLOOP</span>
                          <span className="text-[10px] text-stone-500 font-mono">
                            Số dư: {walletBalance.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      </div>
                      <span className="font-bold text-xs text-[#183A2D] font-mono">
                        -{priceInfo.amountVnd.toLocaleString("vi-VN")}đ
                      </span>
                    </button>
                  )}

                  {/* TÙY CHỌN 3: CHUYỂN KHOẢN NGÂN HÀNG (VIETQR) */}
                  <button
                    type="button"
                    onClick={() => setPayMethod("VIETQR")}
                    className={`w-full p-3 rounded-2xl border flex items-center justify-between transition cursor-pointer text-left ${
                      payMethod === "VIETQR"
                        ? "bg-emerald-50 border-[#183A2D] ring-2 ring-[#183A2D]/20 shadow-xs"
                        : "bg-white border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-stone-800 text-white flex items-center justify-center shrink-0">
                        <QrCode size={16} />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-stone-900 block">
                          Chuyển Khoản Ngân Hàng
                        </span>
                        <span className="text-[10px] text-stone-500">
                          Mã VietQR 24/7
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-xs text-stone-800 font-mono">
                      {priceInfo.amountVnd.toLocaleString("vi-VN")}đ
                    </span>
                  </button>
                </div>
              </div>

              {/* THÔNG BÁO LỖI NẾU CÓ */}
              {errorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* TỔNG KẾT & NÚT HÀNH ĐỘNG */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 block">Thanh toán:</span>
                  <div className="font-heading font-black text-base text-[#183A2D] flex items-baseline gap-1">
                    <span>
                      {payMethod === "COINS"
                        ? `${priceInfo.coins} Lá`
                        : `${priceInfo.amountVnd.toLocaleString("vi-VN")}đ`}
                    </span>
                    <span className="text-[10px] font-normal text-stone-400">({priceInfo.label})</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isProcessing || !selectedItemId}
                  onClick={handleProceed}
                  className="py-3 px-6 bg-[#183A2D] hover:bg-[#112a20] active:scale-95 disabled:opacity-50 text-white font-bold rounded-2xl shadow-sm transition flex items-center gap-2 cursor-pointer text-xs"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : payMethod === "COINS" ? (
                    <>
                      <Zap size={14} />
                      <span>Đẩy Top ({priceInfo.coins} Lá)</span>
                    </>
                  ) : payMethod === "WALLET" ? (
                    <>
                      <Wallet size={14} />
                      <span>Đẩy Top ({priceInfo.amountVnd.toLocaleString("vi-VN")}đ)</span>
                    </>
                  ) : (
                    <>
                      <QrCode size={14} />
                      <span>Tạo Mã Chuyển Khoản</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
