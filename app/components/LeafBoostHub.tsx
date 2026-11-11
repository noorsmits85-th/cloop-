"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Leaf,
  TrendingUp,
  Wallet,
  QrCode,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  Award,
  Clock,
  Plus,
  ChevronRight,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import {
  createCoinTopUpPayment,
  checkCoinTopUpStatusAction,
  claimQuestRewardAction,
  getUserCoinDashboardAction,
} from "@/app/actions/coin";
import { COIN_PACKAGES, QUEST_DEFINITIONS } from "@/lib/coinPackages";
import {
  boostWithCoinsAction,
  boostWithWalletBalanceAction,
  createBoostPayOSPaymentAction,
  checkBoostPaymentStatusAction,
} from "@/app/actions/boost";

const FALLBACK_IMG =
  "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790530424/cloop_mobile_closet/pt4xccwmvrjsrnhrgnib.png";

const BOOST_PACKAGES = [
  {
    hours: 24,
    coins: 20,
    label: "Gói 24 Giờ",
    sub: "Lên đầu sàn 1 ngày",
    priceVnd: 10000,
    origPriceVnd: 12000,
    discountPercent: 17,
    tag: "Khởi đầu",
  },
  {
    hours: 72,
    coins: 50,
    label: "Gói 3 Ngày",
    sub: "Tăng x3 lượt khách thuê",
    priceVnd: 25000,
    origPriceVnd: 36000,
    discountPercent: 31,
    tag: "Phổ biến nhất",
    popular: true,
  },
  {
    hours: 168,
    coins: 100,
    label: "Gói 7 Ngày",
    sub: "Giữ vị trí VIP cả tuần",
    priceVnd: 50000,
    origPriceVnd: 84000,
    discountPercent: 40,
    tag: "Siêu tiết kiệm",
  },
];

interface LeafBoostHubProps {
  currentUser: any;
  userCoins: number;
  walletBalance: number;
  myProducts: any[];
  marketProducts: any[];
  onOpenAuth: () => void;
  onOpenCreateProduct: () => void;
  onSelectProduct: (p: any) => void;
  onBoostSuccess: (
    productId: string,
    newExpiresAt: string,
    newCoins?: number,
    addedCoins?: number
  ) => void;
  onRefreshUser: () => void;
}

export default function LeafBoostHub({
  currentUser,
  userCoins = 0,
  walletBalance = 0,
  myProducts = [],
  marketProducts = [],
  onOpenAuth,
  onOpenCreateProduct,
  onSelectProduct,
  onBoostSuccess,
  onRefreshUser,
}: LeafBoostHubProps) {
  const [subTab, setSubTab] = useState<"boost" | "buy_leaf" | "quests">("boost");
  const [liveCoins, setLiveCoins] = useState<number>(userCoins);
  const [liveWallet, setLiveWallet] = useState<number>(walletBalance);

  // State cho Đẩy Top
  const [selectedItemId, setSelectedItemId] = useState<string>(
    myProducts[0]?.id || ""
  );
  const [selectedBoostHours, setSelectedBoostHours] = useState<number>(72);
  const [payMethod, setPayMethod] = useState<"COINS" | "WALLET" | "VIETQR">(
    userCoins >= 50 ? "COINS" : "VIETQR"
  );
  const [isBoosting, setIsBoosting] = useState(false);
  const [boostQrData, setBoostQrData] = useState<any>(null);
  const [boostMsg, setBoostMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // State cho Mua Gói Lá
  const [selectedLeafPkg, setSelectedLeafPkg] = useState<string>("LEAF_50K");
  const [isCreatingLeafQr, setIsCreatingLeafQr] = useState(false);
  const [leafQrData, setLeafQrData] = useState<any>(null);
  const [leafPaidSuccess, setLeafPaidSuccess] = useState(false);
  const [leafErr, setLeafErr] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // State cho Nhiệm vụ & Sổ cái
  const [claimedQuests, setClaimedQuests] = useState<string[]>([]);
  const [ledgerHistory, setLedgerHistory] = useState<any[]>([]);
  const [claimingCode, setClaimingCode] = useState<string | null>(null);
  const [questToast, setQuestToast] = useState<string | null>(null);

  useEffect(() => {
    setLiveCoins(userCoins);
  }, [userCoins]);

  useEffect(() => {
    setLiveWallet(walletBalance);
  }, [walletBalance]);

  useEffect(() => {
    if (myProducts.length > 0 && !selectedItemId) {
      setSelectedItemId(myProducts[0].id);
    }
  }, [myProducts, selectedItemId]);

  // Tải dữ liệu nhiệm vụ & lịch sử Lá khi mở tab
  useEffect(() => {
    if (!currentUser) return;
    getUserCoinDashboardAction()
      .then((res) => {
        if (res.success) {
          if (typeof res.coins === "number") setLiveCoins(res.coins);
          if (typeof res.walletBalance === "number")
            setLiveWallet(res.walletBalance);
          if (res.claimedCodes) setClaimedQuests(res.claimedCodes);
          if (res.ledgerHistory) setLedgerHistory(res.ledgerHistory);
        }
      })
      .catch(() => {});
  }, [currentUser, subTab]);

  // Polling tự động khi đang mở QR Mua Lá
  useEffect(() => {
    if (!leafQrData?.orderCode || leafPaidSuccess) return;
    let active = true;
    const timer = setInterval(async () => {
      try {
        const res = await checkCoinTopUpStatusAction(leafQrData.orderCode);
        if (active && res.success && res.status === "PAID") {
          clearInterval(timer);
          setLeafPaidSuccess(true);
          if (typeof res.newBalance === "number") setLiveCoins(res.newBalance);
          onRefreshUser();
        }
      } catch {}
    }, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [leafQrData, leafPaidSuccess, onRefreshUser]);

  // Polling tự động khi đang mở QR Đẩy Top
  useEffect(() => {
    if (!boostQrData?.orderCode) return;
    let active = true;
    const timer = setInterval(async () => {
      try {
        const res = await checkBoostPaymentStatusAction(boostQrData.orderCode);
        if (active && res.success && res.status === "PAID") {
          clearInterval(timer);
          setBoostMsg({
            type: "ok",
            text: `Đã kích hoạt Đẩy Top thành công cho "${boostQrData.productTitle}"!`,
          });
          onBoostSuccess(
            selectedItemId,
            res.boostExpiresAt || new Date(Date.now() + 72 * 3600000).toISOString(),
            liveCoins,
            res.addedCoins || 50
          );
          setBoostQrData(null);
          onRefreshUser();
        }
      } catch {}
    }, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [boostQrData, selectedItemId, liveCoins, onBoostSuccess, onRefreshUser]);

  // Top 3 trang phục đang dẫn đầu bảng Đẩy Top trên sàn
  const topSpotlightItems = React.useMemo(() => {
    const sorted = [...marketProducts].sort((a, b) => {
      const aActive = Boolean(
        a.boostExpiresAt && new Date(a.boostExpiresAt) > new Date()
      );
      const bActive = Boolean(
        b.boostExpiresAt && new Date(b.boostExpiresAt) > new Date()
      );
      if (aActive !== bActive) return aActive ? -1 : 1;
      return (Number(b.boostScore) || 0) - (Number(a.boostScore) || 0);
    });
    return sorted.slice(0, 3);
  }, [marketProducts]);

  const activeBoostPkg =
    BOOST_PACKAGES.find((p) => p.hours === selectedBoostHours) ||
    BOOST_PACKAGES[1];

  const handleCopy = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1600);
  };

  // Xử lý Đẩy Top ngay tại chỗ
  const handleExecuteBoost = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!selectedItemId) {
      setBoostMsg({
        type: "err",
        text: "Bạn hãy chọn hoặc đăng 1 trang phục lên tủ đồ để đẩy Top nhé.",
      });
      return;
    }

    setBoostMsg(null);
    setIsBoosting(true);

    try {
      if (payMethod === "COINS") {
        const res = await boostWithCoinsAction({
          productId: selectedItemId,
          hours: activeBoostPkg.hours,
          clientUserId: currentUser.id,
        });
        if (res.success) {
          if (typeof res.newBalance === "number") setLiveCoins(res.newBalance);
          setBoostMsg({
            type: "ok",
            text:
              res.message ||
              `Đã đẩy Top thành công (${activeBoostPkg.label})!`,
          });
          onBoostSuccess(
            selectedItemId,
            res.boostExpiresAt || "",
            res.newBalance,
            res.addedCoins
          );
          onRefreshUser();
        } else {
          setBoostMsg({
            type: "err",
            text: res.error || "Số dư Lá chưa đủ. Bạn hãy qua tab Mua Lá nhé!",
          });
        }
      } else if (payMethod === "WALLET") {
        const res = await boostWithWalletBalanceAction({
          productId: selectedItemId,
          hours: activeBoostPkg.hours,
          clientUserId: currentUser.id,
        });
        if (res.success) {
          if (typeof res.newWalletBalance === "number")
            setLiveWallet(res.newWalletBalance);
          setBoostMsg({
            type: "ok",
            text:
              res.message ||
              `Đã đẩy Top bằng Ví thành công (${activeBoostPkg.label})!`,
          });
          onBoostSuccess(
            selectedItemId,
            res.boostExpiresAt || "",
            liveCoins,
            res.addedCoins
          );
          onRefreshUser();
        } else {
          setBoostMsg({
            type: "err",
            text: res.error || "Số dư Ví không đủ để thanh toán.",
          });
        }
      } else {
        const res = await createBoostPayOSPaymentAction({
          productId: selectedItemId,
          hours: activeBoostPkg.hours,
          clientUserId: currentUser.id,
        });
        if (res.success) {
          setBoostQrData(res);
        } else {
          setBoostMsg({
            type: "err",
            text: res.error || "Không thể khởi tạo mã VietQR.",
          });
        }
      }
    } catch {
      setBoostMsg({
        type: "err",
        text: "Kết nối tạm thời gián đoạn, vui lòng thử lại.",
      });
    } finally {
      setIsBoosting(false);
    }
  };

  // Xử lý Tạo QR Mua Gói Lá
  const handleBuyLeafPackage = async (pkgCode: string) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setSelectedLeafPkg(pkgCode);
    setLeafErr(null);
    setLeafPaidSuccess(false);
    setIsCreatingLeafQr(true);

    try {
      const res = await createCoinTopUpPayment(pkgCode);
      if (res.success) {
        const bin = res.bin || "970416";
        const acc = res.accountNumber || "LOCCASS000340028";
        const accName = res.accountName || "CLOOP VIETNAM";
        const desc = res.description || `NAP LA ${res.totalCoins}`;
        const qrImgUrl = `https://img.vietqr.io/image/${bin}-${acc}-compact2.png?amount=${res.amount}&addInfo=${encodeURIComponent(
          desc
        )}&accountName=${encodeURIComponent(accName)}`;

        setLeafQrData({
          ...res,
          qrImgUrl,
        });
      } else {
        setLeafErr(res.message || "Không thể tạo mã nạp Lá.");
      }
    } catch {
      setLeafErr("Lỗi kết nối máy chủ khi tạo mã nạp Lá.");
    } finally {
      setIsCreatingLeafQr(false);
    }
  };

  // Xử lý Nhận thưởng nhiệm vụ
  const handleClaimQuest = async (questCode: string) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setClaimingCode(questCode);
    setQuestToast(null);
    try {
      const res = await claimQuestRewardAction(questCode);
      if (res.success) {
        setClaimedQuests((prev) => [...prev, questCode]);
        if (typeof res.newBalance === "number") setLiveCoins(res.newBalance);
        setQuestToast(res.message || "Đã nhận Lá thành công!");
        onRefreshUser();
      } else {
        setQuestToast(res.message || "Chưa đủ điều kiện nhận thưởng.");
      }
    } catch {
      setQuestToast("Không thể nhận thưởng lúc này.");
    } finally {
      setClaimingCode(null);
      setTimeout(() => setQuestToast(null), 3200);
    }
  };

  const leafPackagesList = [
    COIN_PACKAGES.LEAF_10K,
    COIN_PACKAGES.LEAF_20K,
    COIN_PACKAGES.LEAF_50K,
    COIN_PACKAGES.LEAF_100K,
  ];

  return (
    <div className="px-3 pt-2.5 pb-8 space-y-3 flex-1">
      {/* 1. THẺ HERO VÍ LÁ & ĐẤU TRƯỜNG ĐẨY TOP (GAMIFIED LUXURY EMERALD CARD) */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#133225] via-[#1B4332] to-[#0F241B] text-white p-3.5 shadow-md border border-emerald-800/60">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[9.5px] font-extrabold uppercase tracking-wider">
              <Leaf size={10} className="fill-amber-300 text-amber-300" />
              Trạm Năng Lượng Lá &amp; Đẩy Top
            </span>
            <h2 className="font-brand-display text-[16px] font-bold text-white mt-1 leading-tight">
              Đưa Váy Lên Đầu Sàn &bull; x5 Lượt Thuê
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setSubTab("buy_leaf")}
            className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-[10.5px] font-extrabold shadow-xs cursor-pointer shrink-0 flex items-center gap-1"
          >
            <Plus size={12} strokeWidth={2.8} />
            <span>Nạp Lá</span>
          </button>
        </div>

        {/* Số dư Ví Lá & Ví Tiền */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/15 flex items-center justify-between">
            <div>
              <p className="text-[9.5px] text-emerald-200 font-medium">
                Số dư Điểm Lá
              </p>
              <p className="font-mono font-black text-sm text-amber-300 mt-0.5">
                {liveCoins.toLocaleString("vi-VN")} Lá
              </p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-amber-400/20 flex items-center justify-center text-amber-300">
              <Leaf size={14} />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/15 flex items-center justify-between">
            <div>
              <p className="text-[9.5px] text-emerald-200 font-medium">
                Ví Thu Nhập
              </p>
              <p className="font-mono font-black text-sm text-white mt-0.5">
                {liveWallet.toLocaleString("vi-VN")}đ
              </p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-emerald-200">
              <Wallet size={14} />
            </div>
          </div>
        </div>

        {/* Bảng Vàng Top 3 Váy Đang Đứng Đầu Sàn */}
        {topSpotlightItems.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-white/15">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-200 flex items-center gap-1">
                <TrendingUp size={11} /> Top 3 Trang Phục Đang Chiếm Sóng Đầu Sàn
              </span>
              <span className="text-[9px] text-emerald-200/90">
                Ưu tiên hiển thị #1
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {topSpotlightItems.map((item, idx) => {
                const img =
                  item.image ||
                  item.primaryImage ||
                  item.images?.[0] ||
                  FALLBACK_IMG;
                return (
                  <div
                    key={item.id || idx}
                    onClick={() => onSelectProduct(item)}
                    className="bg-black/25 hover:bg-black/40 rounded-xl p-1.5 border border-white/15 flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <div className="relative w-8 h-10 rounded-lg overflow-hidden shrink-0 bg-stone-800">
                      <Image
                        src={img}
                        alt={item.title}
                        fill
                        sizes="36px"
                        className="object-cover"
                        unoptimized
                      />
                      <span className="absolute top-0 left-0 bg-amber-400 text-stone-950 text-[8px] font-black px-1 rounded-br">
                        #{idx + 1}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-white truncate">
                        {item.title}
                      </p>
                      <p className="text-[9px] text-amber-300 font-mono font-bold">
                        {Number(item.rentalPrice || item.price || 0).toLocaleString(
                          "vi-VN"
                        )}
                        đ
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. THANH CHUYỂN 3 PHÂN KHU TRONG TRẠM LÁ */}
      <div className="bg-white p-1 rounded-xl border border-stone-200/90 shadow-2xs grid grid-cols-3 gap-1">
        <button
          type="button"
          onClick={() => setSubTab("boost")}
          className={`h-8 rounded-lg text-[11px] font-extrabold transition cursor-pointer flex items-center justify-center gap-1 ${
            subTab === "boost"
              ? "bg-[#1B4332] text-white shadow-2xs"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          <TrendingUp size={12} />
          <span>Đẩy Top Váy</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("buy_leaf")}
          className={`h-8 rounded-lg text-[11px] font-extrabold transition cursor-pointer flex items-center justify-center gap-1 ${
            subTab === "buy_leaf"
              ? "bg-[#1B4332] text-white shadow-2xs"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          <Leaf size={12} />
          <span>Mua Gói Lá</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("quests")}
          className={`h-8 rounded-lg text-[11px] font-extrabold transition cursor-pointer flex items-center justify-center gap-1 ${
            subTab === "quests"
              ? "bg-[#1B4332] text-white shadow-2xs"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          <Award size={12} />
          <span>Săn Lá 0đ</span>
        </button>
      </div>

      {/* ============================================================
          PHÂN KHU 1: ĐẨY TOP TRANG PHỤC (CHỌN VÁY + CHỌN GÓI + KÍCH HOẠT)
          ============================================================ */}
      {subTab === "boost" && (
        <div className="space-y-3">
          {/* Bước 1: Chọn trang phục trong tủ đồ của bạn */}
          <div className="bg-white rounded-2xl p-3 border border-stone-200/90 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-stone-900">
                1. Chọn trang phục cần đẩy lên đầu sàn
              </span>
              <span className="text-[10px] font-semibold text-stone-500">
                {myProducts.length} món trong tủ
              </span>
            </div>

            {myProducts.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-stone-50 border border-dashed border-stone-300 text-center space-y-2">
                <p className="text-xs font-bold text-stone-700">
                  Bạn chưa có trang phục nào trong tủ đồ cá nhân
                </p>
                <p className="text-[10.5px] text-stone-500">
                  Đăng váy dự tiệc hoặc áo dài lên sàn để bắt đầu cho thuê và đẩy Top thu hút khách ngay!
                </p>
                <button
                  type="button"
                  onClick={onOpenCreateProduct}
                  className="px-3.5 py-1.5 rounded-xl bg-[#1B4332] text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Đăng trang phục ngay</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {myProducts.map((item) => {
                  const isSelected = selectedItemId === item.id;
                  const isBoosted = Boolean(
                    item.boostExpiresAt &&
                      new Date(item.boostExpiresAt) > new Date()
                  );
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedItemId(item.id)}
                      className={`w-28 shrink-0 rounded-xl p-1.5 border text-left transition cursor-pointer ${
                        isSelected
                          ? "border-[#1B4332] bg-emerald-50/50 ring-2 ring-[#1B4332]/20"
                          : "border-stone-200 bg-white hover:bg-stone-50"
                      }`}
                    >
                      <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-stone-100">
                        <Image
                          src={item.image || FALLBACK_IMG}
                          alt={item.title}
                          fill
                          sizes="112px"
                          className="object-cover"
                          unoptimized
                        />
                        {isBoosted && (
                          <span className="absolute top-1 left-1 bg-amber-400 text-stone-950 text-[8px] font-black px-1.5 py-0.5 rounded">
                            ĐANG TOP
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] font-bold text-stone-900 truncate mt-1">
                        {item.title}
                      </p>
                      <p className="text-[9.5px] text-emerald-800 font-mono font-bold">
                        {(item.rentalPrice || item.salePrice || 0).toLocaleString(
                          "vi-VN"
                        )}
                        đ
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bước 2: Chọn gói thời gian Đẩy Top */}
          <div className="bg-white rounded-2xl p-3 border border-stone-200/90 shadow-2xs space-y-2">
            <span className="text-xs font-extrabold text-stone-900 block">
              2. Chọn gói thời gian chiếm vị trí đầu sàn
            </span>

            <div className="grid grid-cols-3 gap-2">
              {BOOST_PACKAGES.map((pkg) => {
                const isSelected = selectedBoostHours === pkg.hours;
                return (
                  <button
                    key={pkg.hours}
                    type="button"
                    onClick={() => {
                      setSelectedBoostHours(pkg.hours);
                      setBoostQrData(null);
                    }}
                    className={`relative rounded-xl p-2.5 border text-left transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-[#1B4332] bg-emerald-50/60 ring-2 ring-[#1B4332]/20"
                        : "border-stone-200 bg-white hover:bg-stone-50"
                    }`}
                  >
                    <div>
                      <span
                        className={`inline-block text-[8.5px] font-extrabold px-1.5 py-0.5 rounded mb-1 ${
                          pkg.popular
                            ? "bg-amber-400 text-stone-950"
                            : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        -{pkg.discountPercent}% &bull; {pkg.tag}
                      </span>
                      <p className="text-xs font-black text-stone-900">
                        {pkg.label}
                      </p>
                      <p className="text-[9.5px] text-stone-500 leading-tight mt-0.5">
                        {pkg.sub}
                      </p>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-stone-200/70">
                      <p className="font-mono font-black text-xs text-[#1B4332]">
                        {pkg.coins} Lá
                      </p>
                      <p className="text-[9.5px] text-stone-500 font-mono">
                        hoặc {pkg.priceVnd.toLocaleString("vi-VN")}đ
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bước 3: Chọn phương thức kích hoạt (Lá / Ví / VietQR) */}
          <div className="bg-white rounded-2xl p-3 border border-stone-200/90 shadow-2xs space-y-2.5">
            <span className="text-xs font-extrabold text-stone-900 block">
              3. Phương thức kích hoạt tức thì
            </span>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setPayMethod("COINS");
                  setBoostQrData(null);
                }}
                className={`p-2 rounded-xl border text-left cursor-pointer transition ${
                  payMethod === "COINS"
                    ? "border-[#1B4332] bg-emerald-50/70 font-bold"
                    : "border-stone-200 bg-stone-50 text-stone-600"
                }`}
              >
                <p className="text-[10.5px] font-extrabold text-stone-900">
                  Dùng Điểm Lá
                </p>
                <p className="text-[9.5px] text-emerald-800 font-mono">
                  Cần {activeBoostPkg.coins} Lá
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPayMethod("WALLET");
                  setBoostQrData(null);
                }}
                className={`p-2 rounded-xl border text-left cursor-pointer transition ${
                  payMethod === "WALLET"
                    ? "border-[#1B4332] bg-emerald-50/70 font-bold"
                    : "border-stone-200 bg-stone-50 text-stone-600"
                }`}
              >
                <p className="text-[10.5px] font-extrabold text-stone-900">
                  Trừ Ví Tiền
                </p>
                <p className="text-[9.5px] text-emerald-800 font-mono">
                  {activeBoostPkg.priceVnd.toLocaleString("vi-VN")}đ
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPayMethod("VIETQR")}
                className={`p-2 rounded-xl border text-left cursor-pointer transition ${
                  payMethod === "VIETQR"
                    ? "border-[#1B4332] bg-emerald-50/70 font-bold"
                    : "border-stone-200 bg-stone-50 text-stone-600"
                }`}
              >
                <p className="text-[10.5px] font-extrabold text-stone-900">
                  Quét VietQR
                </p>
                <p className="text-[9.5px] text-emerald-800 font-mono">
                  Tự động 5s
                </p>
              </button>
            </div>

            {boostMsg && (
              <div
                className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  boostMsg.type === "ok"
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {boostMsg.type === "ok" ? (
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle size={15} className="text-rose-600 shrink-0" />
                )}
                <span>{boostMsg.text}</span>
              </div>
            )}

            {/* Khung mã VietQR nếu khách chọn Quét QR Đẩy Top */}
            {boostQrData && (
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-2">
                <p className="text-xs font-extrabold text-stone-900">
                  Quét VietQR để kích hoạt {boostQrData.label}
                </p>
                <div className="relative w-44 h-44 mx-auto bg-white p-2 rounded-xl border border-stone-200">
                  <Image
                    src={boostQrData.qrCodeUrl}
                    alt="VietQR Boost"
                    fill
                    className="object-contain p-1"
                    unoptimized
                  />
                </div>
                <p className="text-[10.5px] text-stone-600">
                  Số tiền:{" "}
                  <strong className="font-mono text-stone-900">
                    {Number(boostQrData.amountVnd).toLocaleString("vi-VN")}đ
                  </strong>{" "}
                  &bull; Nội dung:{" "}
                  <strong className="font-mono text-emerald-800">
                    {boostQrData.description}
                  </strong>
                </p>
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-700 font-bold">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Hệ thống đang chờ xác nhận tự động...</span>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={isBoosting}
              onClick={handleExecuteBoost}
              className="w-full h-10 rounded-xl bg-[#1B4332] hover:bg-[#133225] text-white text-xs font-extrabold shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isBoosting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <TrendingUp size={14} />
                  <span>
                    Kích Hoạt Đẩy Top Ngay ({activeBoostPkg.label} &bull;{" "}
                    {payMethod === "COINS"
                      ? `${activeBoostPkg.coins} Lá`
                      : `${activeBoostPkg.priceVnd.toLocaleString("vi-VN")}đ`}
                    )
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          PHÂN KHU 2: CỬA HÀNG MUA GÓI LÁ ƯU ĐÃI (TẶNG THÊM TỚI +15% LÁ)
          ============================================================ */}
      {subTab === "buy_leaf" && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-3 border border-stone-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-extrabold text-stone-900">
                  Bảng Giá Nạp Lá Ưu Đãi
                </h3>
                <p className="text-[10.5px] text-stone-500">
                  Mua sẵn Lá vào ví để đẩy Top rẻ hơn và nhận thưởng thêm tới +15% Lá
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[9.5px] font-extrabold">
                Tặng +15%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {leafPackagesList.map((pkg) => {
                const isSelected = selectedLeafPkg === pkg.code;
                return (
                  <div
                    key={pkg.code}
                    onClick={() => handleBuyLeafPackage(pkg.code)}
                    className={`rounded-xl p-3 border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-[#1B4332] bg-emerald-50/50 ring-2 ring-[#1B4332]/20"
                        : "border-stone-200 bg-white hover:bg-stone-50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-stone-500">
                          {pkg.name}
                        </span>
                        {pkg.badge && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-400 text-stone-950 text-[8.5px] font-black">
                            {pkg.badge}
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="font-mono font-black text-base text-[#1B4332]">
                          {pkg.totalCoins.toLocaleString("vi-VN")}
                        </span>
                        <span className="text-xs font-extrabold text-emerald-800">
                          Lá
                        </span>
                      </div>

                      {pkg.bonusCoins > 0 ? (
                        <p className="text-[9.5px] text-emerald-700 font-semibold mt-0.5">
                          Gồm {pkg.baseCoins.toLocaleString("vi-VN")} + tặng{" "}
                          {pkg.bonusCoins.toLocaleString("vi-VN")} Lá
                        </p>
                      ) : (
                        <p className="text-[9.5px] text-stone-400 mt-0.5">
                          Gói nạp tiêu chuẩn
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      className="mt-2.5 w-full h-7.5 rounded-lg bg-[#1B4332] text-white text-[11px] font-extrabold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Mua {pkg.amountVnd.toLocaleString("vi-VN")}đ</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {isCreatingLeafQr && (
              <div className="p-4 text-center text-xs font-bold text-stone-600 flex items-center justify-center gap-2">
                <Loader2 size={15} className="animate-spin text-emerald-700" />
                <span>Đang khởi tạo mã VietQR nạp Lá...</span>
              </div>
            )}

            {leafErr && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
                {leafErr}
              </div>
            )}

            {leafPaidSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>
                  Nạp Lá thành công! Số dư Điểm Lá của bạn đã được cộng tự động.
                </span>
              </div>
            )}

            {/* Hiển thị mã VietQR PayOS ngay khi bấm chọn gói Lá */}
            {leafQrData && !leafPaidSuccess && (
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5 text-center">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-stone-900 flex items-center gap-1">
                    <QrCode size={14} className="text-emerald-800" />
                    Quét Mã VietQR Nhận +{Number(leafQrData.totalCoins).toLocaleString("vi-VN")} Lá
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {Number(leafQrData.amount).toLocaleString("vi-VN")}đ
                  </span>
                </div>

                <div className="relative w-44 h-44 mx-auto bg-white p-2 rounded-xl border border-stone-200 shadow-2xs">
                  <Image
                    src={leafQrData.qrImgUrl}
                    alt="VietQR Nap La"
                    fill
                    className="object-contain p-1"
                    unoptimized
                  />
                </div>

                <div className="bg-white rounded-xl p-2 border border-stone-200/80 text-left space-y-1 text-[10.5px]">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Số tài khoản:</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(leafQrData.accountNumber, "acc")
                      }
                      className="font-mono font-bold text-stone-900 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{leafQrData.accountNumber}</span>
                      {copiedField === "acc" ? (
                        <Check size={11} className="text-emerald-600" />
                      ) : (
                        <Copy size={11} className="text-stone-400" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Nội dung CK:</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(leafQrData.description, "desc")
                      }
                      className="font-mono font-bold text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{leafQrData.description}</span>
                      {copiedField === "desc" ? (
                        <Check size={11} className="text-emerald-600" />
                      ) : (
                        <Copy size={11} className="text-stone-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-emerald-700">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Hệ thống tự động cộng Lá ngay sau khi chuyển khoản</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          PHÂN KHU 3: SĂN LÁ MIỄN PHÍ (NHIỆM VỤ + LỊCH SỬ BIẾN ĐỘNG LÁ)
          ============================================================ */}
      {subTab === "quests" && (
        <div className="space-y-3">
          {questToast && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              <span>{questToast}</span>
            </div>
          )}

          <div className="bg-white rounded-2xl p-3 border border-stone-200/90 shadow-2xs space-y-2">
            <h3 className="text-xs font-extrabold text-stone-900">
              Nhiệm Vụ Săn Lá Miễn Phí
            </h3>
            <div className="space-y-2">
              {Object.values(QUEST_DEFINITIONS).map((q) => {
                const isClaimed = claimedQuests.includes(q.code);
                return (
                  <div
                    key={q.code}
                    className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-stone-900">
                          {q.title}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-mono text-[9.5px] font-extrabold">
                          +{q.rewardCoins} Lá
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        {q.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isClaimed || claimingCode === q.code}
                      onClick={() => handleClaimQuest(q.code)}
                      className={`h-7.5 px-3 rounded-lg text-[10.5px] font-extrabold shrink-0 cursor-pointer transition ${
                        isClaimed
                          ? "bg-stone-200 text-stone-500 cursor-default"
                          : "bg-[#1B4332] text-white hover:bg-[#133225]"
                      }`}
                    >
                      {isClaimed
                        ? "Đã nhận"
                        : claimingCode === q.code
                          ? "Đang nhận..."
                          : "Nhận Lá"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {ledgerHistory.length > 0 && (
            <div className="bg-white rounded-2xl p-3 border border-stone-200/90 shadow-2xs space-y-2">
              <h3 className="text-xs font-extrabold text-stone-900">
                Lịch Sử Biến Động Lá Gần Đây
              </h3>
              <div className="space-y-1.5">
                {ledgerHistory.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-[10.5px] py-1.5 border-b border-stone-100 last:border-0"
                  >
                    <span className="text-stone-700 font-medium truncate pr-2">
                      {item.description}
                    </span>
                    <span
                      className={`font-mono font-bold shrink-0 ${
                        item.amount > 0 ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      {item.amount > 0 ? `+${item.amount}` : item.amount} Lá
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
